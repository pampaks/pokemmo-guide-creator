function nonEmpty(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeGuideType(_value) {
  return "Raid";
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

const IMPORT_JSON_MAX_BYTES = 512 * 1024;
const META_NAME_MAX = 120;
const META_IGN_MAX = 80;
const META_DESCRIPTION_MAX = 2000;

export function initGuideWorkflow(options = {}) {
  const els = {
    guideSetupForm: document.getElementById("guideSetupForm"),
    continueToTeamBtn: document.getElementById("continueToTeamBtn"),
    exportGuideJsonBtn: document.getElementById("exportGuideJsonBtn"),
    importGuideJsonBtn: document.getElementById("importGuideJsonBtn"),
    exportGuideJsonSummaryBtn: document.getElementById("exportGuideJsonSummaryBtn"),
    importGuideJsonSummaryBtn: document.getElementById("importGuideJsonSummaryBtn"),
    exportGuideJsonBottomBtn: document.getElementById("exportGuideJsonBottomBtn"),
    importGuideJsonBottomBtn: document.getElementById("importGuideJsonBottomBtn"),
    guideJsonInput: document.getElementById("guideJsonInput"),
    guideSetupStatus: document.getElementById("guideSetupStatus"),
    guideJsonBottomStatus: document.getElementById("guideJsonBottomStatus"),
    guideSummary: document.getElementById("guideSummary"),
    editGuideBtn: document.getElementById("editGuideBtn"),
    guideType: document.getElementById("guideType"),
    strategyName: document.getElementById("strategyName"),
    authorName: document.getElementById("authorName"),
    ignName: document.getElementById("ignName"),
    guideDescription: document.getElementById("guideDescription"),
    summaryGuideType: document.getElementById("summaryGuideType"),
    summaryStrategyName: document.getElementById("summaryStrategyName"),
    summaryAuthorName: document.getElementById("summaryAuthorName"),
    summaryIgnName: document.getElementById("summaryIgnName"),
    summaryDescription: document.getElementById("summaryDescription")
  };

  if (!els.guideSetupForm || !els.guideSummary) {
    return createEmptyWorkflow();
  }

  const state = {
    meta: null,
    onGuideLock: typeof options.onGuideLock === "function" ? options.onGuideLock : null,
    onGuideEdit: typeof options.onGuideEdit === "function" ? options.onGuideEdit : null,
    buildGuideJson: typeof options.buildGuideJson === "function" ? options.buildGuideJson : null,
    onImportGuideJson: typeof options.onImportGuideJson === "function" ? options.onImportGuideJson : null,
    prepareGuideJsonImport:
      typeof options.prepareGuideJsonImport === "function" ? options.prepareGuideJsonImport : null
  };

  const handleContinue = (event) => {
    event?.preventDefault();

    const meta = readFormMeta(els);
    if (!isValidMeta(meta)) {
      setWorkflowStatus(els, "Add strategy name and description first.", "error");
      return;
    }

    lockGuide(els, state, meta);
  };

  els.guideSetupForm.addEventListener("submit", handleContinue);
  els.continueToTeamBtn?.addEventListener("click", handleContinue);
  [els.exportGuideJsonBtn, els.exportGuideJsonSummaryBtn, els.exportGuideJsonBottomBtn].forEach((button) => {
    button?.addEventListener("click", () => handleGuideJsonExport(els, state));
  });
  [els.importGuideJsonBtn, els.importGuideJsonSummaryBtn, els.importGuideJsonBottomBtn].forEach((button) => {
    button?.addEventListener("click", () => {
      if (!els.guideJsonInput) {
        setWorkflowStatus(els, "JSON import is not available.", "error");
        return;
      }
      els.guideJsonInput.value = "";
      els.guideJsonInput.click();
    });
  });
  els.guideJsonInput?.addEventListener("change", async () => {
    const file = els.guideJsonInput.files?.[0];
    if (!file) {
      return;
    }
    await handleGuideJsonImport(els, state, file);
  });

  els.editGuideBtn?.addEventListener("click", () => {
    els.guideSetupForm.classList.remove("hidden");
    els.guideSummary.classList.add("hidden");
    setWorkflowStatus(els, "Guide info unlocked for editing.");
    state.onGuideEdit?.(state.meta);
  });

  return {
    getMeta: () => (state.meta ? { ...state.meta } : null),
    getDraftMeta: () => readFormMeta(els),
    setMeta: (meta, settings = {}) => {
      const normalized = normalizeMeta(meta);
      applyMetaToForm(els, normalized);
      if (settings.locked === false) {
        state.meta = null;
        els.guideSetupForm.classList.remove("hidden");
        els.guideSummary.classList.add("hidden");
        return;
      }
      lockGuide(els, state, normalized, { notify: settings.notify !== false });
    }
  };
}

function renderSummary(els, meta) {
  els.summaryGuideType.textContent = meta.guideType;
  els.summaryStrategyName.textContent = meta.strategyName;
  els.summaryAuthorName.textContent = nonEmpty(meta.authorName);
  els.summaryIgnName.textContent = nonEmpty(meta.ignName);
  els.summaryDescription.textContent = meta.description;
}

function createEmptyWorkflow() {
  return {
    getMeta: () => null,
    getDraftMeta: () => null,
    setMeta: () => {}
  };
}

function readFormMeta(els) {
  return normalizeMeta({
    guideType: els.guideType?.value,
    strategyName: els.strategyName?.value,
    authorName: els.authorName?.value,
    ignName: els.ignName?.value,
    description: els.guideDescription?.value
  });
}

function normalizeMeta(meta) {
  return {
    guideType: normalizeGuideType(meta?.guideType),
    strategyName: sanitizeMetaText(meta?.strategyName, META_NAME_MAX),
    authorName: sanitizeMetaText(meta?.authorName, META_NAME_MAX),
    ignName: sanitizeMetaText(meta?.ignName, META_IGN_MAX),
    description: sanitizeMetaText(meta?.description, META_DESCRIPTION_MAX)
  };
}

function sanitizeMetaText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isValidMeta(meta) {
  return Boolean(meta?.strategyName && meta?.description);
}

function applyMetaToForm(els, meta) {
  if (els.guideType) {
    els.guideType.value = meta.guideType;
  }
  if (els.strategyName) {
    els.strategyName.value = meta.strategyName;
  }
  if (els.authorName) {
    els.authorName.value = meta.authorName;
  }
  if (els.ignName) {
    els.ignName.value = meta.ignName;
  }
  if (els.guideDescription) {
    els.guideDescription.value = meta.description;
  }
}

function lockGuide(els, state, meta, options = {}) {
  state.meta = normalizeMeta(meta);
  renderSummary(els, state.meta);
  els.guideSetupForm.classList.add("hidden");
  els.guideSummary.classList.remove("hidden");
  setWorkflowStatus(els);
  if (options.notify !== false) {
    state.onGuideLock?.(state.meta);
  }
}

async function handleGuideJsonExport(els, state) {
  const meta = state.meta || readFormMeta(els);
  if (!isValidMeta(meta)) {
    setWorkflowStatus(els, "Add strategy name and description first.", "error");
    return;
  }

  const payload = state.buildGuideJson?.(meta);
  if (!payload) {
    setWorkflowStatus(els, "Guide JSON export is not available.", "error");
    return;
  }

  const filename = normalizeJsonFilename(meta.strategyName);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${filename}.json`);
  setWorkflowStatus(els, "Guide JSON exported.", "success");
}

async function handleGuideJsonImport(els, state, file) {
  try {
    if (Number(file?.size || 0) > IMPORT_JSON_MAX_BYTES) {
      throw new Error("Guide JSON is too large.");
    }
    const text = await file.text();
    const payload = JSON.parse(text);
    const meta = normalizeMeta(payload?.meta || payload);
    const preparedPayload = state.prepareGuideJsonImport
      ? await state.prepareGuideJsonImport(payload, meta)
      : payload;
    const preparedMeta = normalizeMeta(preparedPayload?.meta || meta);

    if (!isValidMeta(preparedMeta)) {
      throw new Error("Guide JSON must include strategy name and description.");
    }

    applyMetaToForm(els, preparedMeta);
    lockGuide(els, state, preparedMeta, { notify: false });
    await state.onImportGuideJson?.(preparedPayload, preparedMeta);
    setWorkflowStatus(els, "Guide JSON imported.", "success");
  } catch (error) {
    console.error("Guide JSON import failed:", error);
    setWorkflowStatus(
      els,
      error instanceof Error ? error.message : "Could not import guide JSON.",
      "error"
    );
  }
}

function setWorkflowStatus(els, message = "", variant = "") {
  const setupVisible = !els.guideSetupForm?.classList.contains("hidden");
  const summaryVisible = !els.guideSummary?.classList.contains("hidden");
  const bottomVisible = Boolean(els.guideJsonBottomStatus?.offsetParent);

  if (bottomVisible && !setupVisible && summaryVisible) {
    setStatus(els.guideSetupStatus, "");
    setStatus(els.guideJsonBottomStatus, message, variant);
    return;
  }

  setStatus(els.guideSetupStatus, message, variant);
  setStatus(els.guideJsonBottomStatus, "");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeJsonFilename(value) {
  return String(value || "guide")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "guide";
}
