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

export function initGuideWorkflow(options = {}) {
  const els = {
    guideSetupForm: document.getElementById("guideSetupForm"),
    continueToTeamBtn: document.getElementById("continueToTeamBtn"),
    guideSetupStatus: document.getElementById("guideSetupStatus"),
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
    onGuideEdit: typeof options.onGuideEdit === "function" ? options.onGuideEdit : null
  };

  const handleContinue = (event) => {
    event?.preventDefault();

    const meta = {
      guideType: normalizeGuideType(els.guideType?.value),
      strategyName: String(els.strategyName?.value || "").trim(),
      authorName: String(els.authorName?.value || "").trim(),
      ignName: String(els.ignName?.value || "").trim(),
      description: String(els.guideDescription?.value || "").trim()
    };

    if (!meta.strategyName || !meta.description) {
      setStatus(els.guideSetupStatus, "Add strategy name and description first.", "error");
      return;
    }

    state.meta = meta;
    renderSummary(els, meta);
    els.guideSetupForm.classList.add("hidden");
    els.guideSummary.classList.remove("hidden");
    setStatus(els.guideSetupStatus);
    state.onGuideLock?.(meta);
  };

  els.guideSetupForm.addEventListener("submit", handleContinue);
  els.continueToTeamBtn?.addEventListener("click", handleContinue);

  els.editGuideBtn?.addEventListener("click", () => {
    els.guideSetupForm.classList.remove("hidden");
    els.guideSummary.classList.add("hidden");
    setStatus(els.guideSetupStatus, "Guide info unlocked for editing.");
    state.onGuideEdit?.(state.meta);
  });

  return {
    getMeta: () => (state.meta ? { ...state.meta } : null)
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
    getMeta: () => null
  };
}
