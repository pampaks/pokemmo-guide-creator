import {
  buildForumPasteHtml,
  buildMarkdownExport,
  buildMainExportHtml,
  buildPreviewMarkup,
  copyRichContentToClipboard,
  downloadBlob,
  exportElementAsImage,
  normalizeFilename
} from "../lib/raid_export.js";

const IMPORT_TURN_ROWS_MAX = 50;
const META_NAME_MAX = 120;
const META_IGN_MAX = 80;
const META_DESCRIPTION_MAX = 2000;

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
    copyForumHtmlBtn: document.getElementById("copyForumHtmlBtn"),
    exportWebpBtn: document.getElementById("exportWebpBtn"),
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
    turnRows: createPlannerRows(["P1", "P2", "P3", "P4"], 6),
    exportInFlight: false
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
    setStatus(
      els.exportStatus,
      "Preview ready. Export the guide as WebP or copy the PokeMMO-forum post when you're done.",
      "success"
    );
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

  els.exportWebpBtn?.addEventListener("click", async () => {
    await handleImageExport("webp");
  });

  els.copyForumHtmlBtn?.addEventListener("click", async () => {
    if (!state.meta) {
      setStatus(els.exportStatus, "Complete Step 1 first.", "error");
      return;
    }
    const html = buildForumPasteHtml(
      state.meta,
      state.teamSnapshot,
      state.plannerColumns,
      state.turnRows
    );
    const text = buildMarkdownExport(state.meta, state.teamSnapshot, state.plannerColumns, state.turnRows);
    try {
      const mode = await copyRichContentToClipboard(html, text);
      setStatus(
        els.exportStatus,
        mode === "html"
          ? "Forum HTML copied. Paste it directly into the PokeMMO editor."
          : "Clipboard only supports plain text here. Markdown fallback copied instead.",
        "success"
      );
    } catch (error) {
      console.error("Forum HTML copy failed:", error);
      setStatus(els.exportStatus, "Could not copy forum HTML.", "error");
    }
  });

  async function handleImageExport(format) {
    if (!state.meta) {
      setStatus(els.exportStatus, "Complete Step 1 first.", "error");
      return;
    }

    if (state.exportInFlight) {
      setStatus(els.exportStatus, "Another export is already running.", "error");
      return;
    }

    const exportPreview = createImageExportPreview(
      state,
      Math.max(Math.ceil(els.guidePreview?.getBoundingClientRect().width || 0), 1)
    );
    const previewElement = exportPreview.querySelector(".preview-guide");
    if (!(previewElement instanceof HTMLElement)) {
      exportPreview.remove();
      setStatus(els.exportStatus, "Preview is not ready yet.", "error");
      return;
    }

    state.exportInFlight = true;
    setExportButtonsDisabled(els, true);
    setStatus(els.exportStatus, `Rendering ${format.toUpperCase()} export...`);

    try {
      const baseName = normalizeFilename(state.meta.strategyName);
      const extension = format === "webp" ? "webp" : "jpg";
      await exportElementAsImage(previewElement, format, `${baseName}.${extension}`);
      setStatus(
        els.exportStatus,
        `${format.toUpperCase()} export downloaded. Some external sprites may be replaced with placeholders if their host blocks embedding.`,
        "success"
      );
    } catch (error) {
      console.error(`${format} export failed:`, error);
      setStatus(
        els.exportStatus,
        `Could not export ${format.toUpperCase()}. Try reloading the preview and exporting again.`,
        "error"
      );
    } finally {
      exportPreview.remove();
      state.exportInFlight = false;
      setExportButtonsDisabled(els, false);
    }
  }

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
    getState: () => ({
      meta: state.meta ? { ...state.meta } : null,
      teamSnapshot: cloneTeamSnapshot(state.teamSnapshot),
      plannerColumns: [...state.plannerColumns],
      turnRows: cloneTurnRows(state.turnRows)
    }),
    prepareImportedState: (payload) => prepareImportedRaidState(payload),
    loadState: (payload) => {
      const prepared = prepareImportedRaidState(payload);
      state.meta = prepared.meta;

      teamController?.configureGuide?.(prepared.meta.guideType);
      teamController?.loadSnapshot?.({
        guideType: prepared.teamSnapshot.guideType,
        currentPlayerId: prepared.teamSnapshot.currentPlayerId,
        players: prepared.teamSnapshot.players
      });

      state.teamSnapshot = teamController?.getSnapshot?.() || state.teamSnapshot;
      state.plannerColumns = prepared.plannerColumns;
      state.turnRows = ensurePlannerColumns(prepared.turnRows, state.plannerColumns);

      setTeamStepVisible(teamController, true);
      setTurnPlannerStepVisible(true);
      setPreviewExportStepVisible(true);
      renderPlannerTable(els.turnPlannerTable, state.plannerColumns, state.turnRows);
      renderPreview(els.guidePreview, state);
    },
    deactivate: () => {
      state.meta = null;
      setTeamStepVisible(teamController, false);
      setTurnPlannerStepVisible(false);
      setPreviewExportStepVisible(false);
      renderEmptyPreview(els.guidePreview);
      setStatus(els.exportStatus, "");
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
    strategyName: sanitizeImportedText(meta?.strategyName, META_NAME_MAX),
    authorName: sanitizeImportedText(meta?.authorName, META_NAME_MAX),
    ignName: sanitizeImportedText(meta?.ignName, META_IGN_MAX),
    description: sanitizeImportedText(meta?.description, META_DESCRIPTION_MAX)
  };
}

function setExportButtonsDisabled(els, disabled) {
  [els.exportHtmlBtn, els.copyForumHtmlBtn, els.exportWebpBtn].forEach((button) => {
    if (button) {
      button.disabled = disabled;
    }
  });
}

function createImageExportPreview(state, width) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-100000px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  container.style.pointerEvents = "none";
  container.style.width = `${width}px`;
  container.style.padding = "0";
  container.style.margin = "0";
  container.style.opacity = "0";
  container.innerHTML = buildPreviewMarkup(
    state.meta,
    state.teamSnapshot,
    state.plannerColumns,
    state.turnRows,
    { staticPlayerTeams: true }
  );
  document.body.appendChild(container);
  return container;
}

function createEmptyRaidCreator() {
  return {
    activate: () => {},
    getState: () => ({
      meta: null,
      teamSnapshot: null,
      plannerColumns: [],
      turnRows: []
    }),
    prepareImportedState: () => {
      throw new Error("Raid creator is not available.");
    },
    loadState: () => {},
    deactivate: () => {}
  };
}

function cloneTurnRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    turn: row?.turn || `T${index + 1}`,
    actions: { ...(row?.actions || {}) },
    notes: String(row?.notes || "")
  }));
}

function cloneTeamSnapshot(snapshot) {
  if (!snapshot) {
    return null;
  }

  return {
    ...snapshot,
    team: cloneTeam(snapshot.team),
    players: (Array.isArray(snapshot.players) ? snapshot.players : []).map((player) => ({
      ...player,
      team: cloneTeam(player.team)
    }))
  };
}

function cloneTeam(team) {
  return (Array.isArray(team) ? team : []).map((slot) => ({
    ...slot,
    typeNames: Array.isArray(slot?.typeNames) ? slot.typeNames.filter(Boolean).slice(0, 2) : slot?.typeNames,
    moves: [...(slot?.moves || [])]
  }));
}

function prepareImportedRaidState(payload) {
  const meta = sanitizeMeta(payload?.meta);
  if (!meta.strategyName || !meta.description) {
    throw new Error("Guide JSON must include strategy name and description.");
  }

  const teamSnapshot = sanitizeImportedTeamSnapshot(payload?.teamSnapshot);
  const plannerColumns = getPlannerColumns(teamSnapshot);
  const turnRows = sanitizeImportedTurnRows(payload?.turnRows, plannerColumns);

  return {
    meta,
    teamSnapshot,
    plannerColumns,
    turnRows: turnRows.length ? turnRows : createPlannerRows(plannerColumns, 6)
  };
}

function sanitizeImportedTeamSnapshot(snapshot) {
  const players = Array.isArray(snapshot?.players)
    ? snapshot.players
        .filter((player) => player?.id)
        .map((player) => ({
          id: String(player.id).toUpperCase(),
          team: cloneTeam(player.team)
        }))
    : [];

  const currentPlayerId = String(snapshot?.currentPlayerId || "P1").toUpperCase();

  return {
    guideType: "Raid",
    currentPlayerId,
    players
  };
}

function sanitizeImportedTurnRows(rows, columns) {
  return (Array.isArray(rows) ? rows : [])
    .slice(0, IMPORT_TURN_ROWS_MAX)
    .map((row, index) => ({
      turn: row?.turn || `T${index + 1}`,
      actions: sanitizeImportedActions(row?.actions, columns),
      notes: sanitizeImportedText(row?.notes, 300)
    }));
}

function sanitizeImportedActions(actions, columns) {
  const safeActions = {};
  (Array.isArray(columns) ? columns : []).forEach((column) => {
    safeActions[column] = sanitizeImportedText(actions?.[column], 200);
  });
  return safeActions;
}

function sanitizeImportedText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
