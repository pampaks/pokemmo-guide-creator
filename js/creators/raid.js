import {
  buildMainExportHtml,
  buildPreviewMarkup,
  downloadBlob,
  normalizeFilename
} from "../lib/raid_export.js";

function getPlannerColumns(snapshot) {
  const raidPlayers = snapshot?.players?.map((player) => player.id).filter(Boolean);
  return raidPlayers?.length ? raidPlayers : ["P1", "P2", "P3", "P4"];
}

function createPlannerRow(index, columns) {
  const actions = {};
  columns.forEach((column) => {
    actions[column] = "";
  });
  return {
    turn: `T${index + 1}`,
    actions,
    notes: ""
  };
}

function createPlannerRows(columns, count = 6) {
  return Array.from({ length: count }, (_, index) => createPlannerRow(index, columns));
}

function ensurePlannerColumns(rows, columns) {
  return rows.map((row, index) => {
    const nextActions = {};
    columns.forEach((column) => {
      nextActions[column] = String(row.actions?.[column] || "");
    });
    return {
      turn: row.turn || `T${index + 1}`,
      actions: nextActions,
      notes: String(row.notes || "")
    };
  });
}

function renderPlannerTable(tableEl, columns, rows) {
  if (!tableEl) {
    return;
  }

  const desktopTable = document.createElement("table");
  desktopTable.className = "planner-table planner-table-desktop";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["T", ...columns, "FF / Notes"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  const mobileList = document.createElement("div");
  mobileList.className = "planner-mobile-list";

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    const turnCell = document.createElement("td");
    turnCell.className = "planner-turn";
    turnCell.textContent = row.turn;
    tr.appendChild(turnCell);

    columns.forEach((column) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "planner-cell-input";
      input.value = row.actions?.[column] || "";
      input.placeholder = `${column} action`;
      input.dataset.rowIndex = String(rowIndex);
      input.dataset.col = column;
      td.appendChild(input);
      tr.appendChild(td);
    });

    const notesCell = document.createElement("td");
    const notesInput = document.createElement("input");
    notesInput.type = "text";
    notesInput.className = "planner-cell-input";
    notesInput.value = row.notes || "";
    notesInput.placeholder = "Forfeit, condition, or extra note";
    notesInput.dataset.rowIndex = String(rowIndex);
    notesInput.dataset.col = "notes";
    notesCell.appendChild(notesInput);
    tr.appendChild(notesCell);

    tbody.appendChild(tr);

    const mobileRow = document.createElement("article");
    mobileRow.className = "planner-mobile-row";

    const mobileHead = document.createElement("div");
    mobileHead.className = "planner-mobile-head";
    mobileHead.textContent = row.turn;
    mobileRow.appendChild(mobileHead);

    const mobileGrid = document.createElement("div");
    mobileGrid.className = "planner-mobile-grid";

    columns.forEach((column) => {
      mobileGrid.appendChild(buildPlannerMobileField(column, row.actions?.[column] || "", rowIndex, column));
    });

    mobileGrid.appendChild(buildPlannerMobileField("FF / Notes", row.notes || "", rowIndex, "notes"));
    mobileRow.appendChild(mobileGrid);
    mobileList.appendChild(mobileRow);
  });

  desktopTable.appendChild(thead);
  desktopTable.appendChild(tbody);

  tableEl.innerHTML = "";
  tableEl.appendChild(desktopTable);
  tableEl.appendChild(mobileList);
}

function buildPlannerMobileField(label, value, rowIndex, column) {
  const field = document.createElement("label");
  field.className = "planner-mobile-field";

  const text = document.createElement("span");
  text.className = "planner-mobile-label";
  text.textContent = label;
  field.appendChild(text);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "planner-cell-input";
  input.value = value;
  input.placeholder = column === "notes" ? "Forfeit, condition, or extra note" : `${label} action`;
  input.dataset.rowIndex = String(rowIndex);
  input.dataset.col = column;
  field.appendChild(input);

  return field;
}

function setStatus(el, message, variant = "") {
  if (!el) {
    return;
  }
  el.textContent = message || "";
  el.classList.remove("error", "success");
  if (variant) {
    el.classList.add(variant);
  }
}

function setTeamStepVisible(teamController, visible) {
  teamController?.setVisible?.(visible);
  document.getElementById("team-step")?.classList.toggle("hidden", !visible);
}

function setTurnPlannerStepVisible(visible) {
  document.getElementById("turn-planner-step")?.classList.toggle("hidden", !visible);
}

function setPreviewExportStepVisible(visible) {
  document.getElementById("preview-export-step")?.classList.toggle("hidden", !visible);
}

function renderEmptyPreview(previewEl) {
  if (!previewEl) {
    return;
  }
  previewEl.innerHTML = '<p class="preview-empty">Complete previous steps to generate preview.</p>';
}

export function initRaidCreator(teamController) {
  const els = {
    teamStep: document.getElementById("team-step"),
    turnPlannerStep: document.getElementById("turn-planner-step"),
    previewExportStep: document.getElementById("preview-export-step"),
    continueToPlannerBtn: document.getElementById("continueToPlannerBtn"),
    continueToExportBtn: document.getElementById("continueToExportBtn"),
    guidePreview: document.getElementById("guidePreview"),
    addTurnRowBtn: document.getElementById("addTurnRowBtn"),
    turnPlannerTable: document.getElementById("turnPlannerTable"),
    exportHtmlBtn: document.getElementById("exportHtmlBtn"),
    exportStatus: document.getElementById("exportStatus")
  };

  if (!els.teamStep || !els.turnPlannerStep || !els.previewExportStep || !els.guidePreview) {
    return createEmptyRaidCreator();
  }

  const state = {
    meta: null,
    teamSnapshot: teamController?.getSnapshot?.() || {
      guideType: "Raid",
      currentPlayerId: "P1",
      title: "P1 TEAM",
      team: [],
      raw: "",
      players: []
    },
    plannerColumns: ["P1", "P2", "P3", "P4"],
    turnRows: createPlannerRows(["P1", "P2", "P3", "P4"], 6)
  };

  setTeamStepVisible(teamController, false);
  setTurnPlannerStepVisible(false);
  setPreviewExportStepVisible(false);
  renderEmptyPreview(els.guidePreview);

  teamController?.setOnChange((snapshot) => {
    state.teamSnapshot = snapshot || state.teamSnapshot;
    if (!state.meta) {
      return;
    }
    state.plannerColumns = getPlannerColumns(state.teamSnapshot);
    state.turnRows = ensurePlannerColumns(state.turnRows, state.plannerColumns);
    renderPlannerTable(els.turnPlannerTable, state.plannerColumns, state.turnRows);
    renderPreview(els.guidePreview, state);
  });

  els.continueToPlannerBtn?.addEventListener("click", () => {
    if (!state.meta) {
      setStatus(els.exportStatus, "Complete Step 1 first.", "error");
      return;
    }
    setTurnPlannerStepVisible(true);
    renderPlannerTable(els.turnPlannerTable, state.plannerColumns, state.turnRows);
    els.turnPlannerStep.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.continueToExportBtn?.addEventListener("click", () => {
    if (!state.meta) {
      setStatus(els.exportStatus, "Complete Step 1 first.", "error");
      return;
    }
    setPreviewExportStepVisible(true);
    renderPreview(els.guidePreview, state);
    setStatus(els.exportStatus, "Preview ready. Export the guide as HTML when you're done.", "success");
    els.previewExportStep.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.turnPlannerTable?.addEventListener("input", (event) => {
    const input = event.target.closest(".planner-cell-input");
    if (!input || !state.meta) {
      return;
    }

    const rowIndex = Number(input.dataset.rowIndex);
    const column = String(input.dataset.col || "");
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= state.turnRows.length) {
      return;
    }

    if (column === "notes") {
      state.turnRows[rowIndex].notes = input.value;
    } else {
      state.turnRows[rowIndex].actions[column] = input.value;
    }
    renderPreview(els.guidePreview, state);
  });

  els.addTurnRowBtn?.addEventListener("click", () => {
    if (!state.meta) {
      setStatus(els.exportStatus, "Complete Step 1 first.", "error");
      return;
    }
    state.turnRows.push(createPlannerRow(state.turnRows.length, state.plannerColumns));
    renderPlannerTable(els.turnPlannerTable, state.plannerColumns, state.turnRows);
    renderPreview(els.guidePreview, state);
  });

  els.exportHtmlBtn?.addEventListener("click", () => {
    if (!state.meta) {
      setStatus(els.exportStatus, "Complete Step 1 first.", "error");
      return;
    }
    const html = buildMainExportHtml(state.meta, state.teamSnapshot, state.plannerColumns, state.turnRows);
    downloadBlob(
      new Blob([html], { type: "text/html;charset=utf-8" }),
      `${normalizeFilename(state.meta.strategyName)}.html`
    );
    setStatus(els.exportStatus, "HTML export downloaded.", "success");
  });

  return {
    activate: (meta) => {
      const wasActive = Boolean(state.meta);
      state.meta = sanitizeMeta(meta);

      if (!wasActive) {
        teamController?.configureGuide?.(state.meta.guideType);
        state.teamSnapshot = teamController?.getSnapshot?.() || state.teamSnapshot;
        state.plannerColumns = getPlannerColumns(state.teamSnapshot);
        state.turnRows = createPlannerRows(state.plannerColumns, 6);

        setTeamStepVisible(teamController, true);
        setTurnPlannerStepVisible(false);
        setPreviewExportStepVisible(false);
        document.getElementById("team-creator")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        state.teamSnapshot = teamController?.getSnapshot?.() || state.teamSnapshot;
        state.plannerColumns = getPlannerColumns(state.teamSnapshot);
        state.turnRows = ensurePlannerColumns(state.turnRows, state.plannerColumns);
        setTeamStepVisible(teamController, true);
      }

      renderPlannerTable(els.turnPlannerTable, state.plannerColumns, state.turnRows);
      renderPreview(els.guidePreview, state);
      setStatus(
        els.exportStatus,
        wasActive ? "Guide info updated." : "Guide info locked. Complete each next step to export.",
        "success"
      );
    },
    deactivate: () => {
      state.meta = null;
      setTeamStepVisible(teamController, false);
      setTurnPlannerStepVisible(false);
      setPreviewExportStepVisible(false);
      renderEmptyPreview(els.guidePreview);
      setStatus(els.exportStatus, "Guide info unlocked for editing.");
    }
  };
}

function renderPreview(previewEl, state) {
  previewEl.innerHTML = buildPreviewMarkup(
    state.meta,
    state.teamSnapshot,
    state.plannerColumns,
    state.turnRows
  );
}

function sanitizeMeta(meta) {
  return {
    guideType: "Raid",
    strategyName: String(meta?.strategyName || "").trim(),
    authorName: String(meta?.authorName || "").trim(),
    ignName: String(meta?.ignName || "").trim(),
    description: String(meta?.description || "").trim()
  };
}

function createEmptyRaidCreator() {
  return {
    activate: () => {},
    deactivate: () => {}
  };
}
