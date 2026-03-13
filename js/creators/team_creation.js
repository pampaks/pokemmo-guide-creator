import {
  extractPokepasteId,
  getTypeMetadataList,
  parseRawTeam
} from "../lib/pokemon.js";
import { hydrateTeamTypes } from "../lib/team_slots.js";
import { buildAllPlayersRaw, parseRaidSections, serializeTeamToRaw } from "../lib/team_raw.js";
import { renderTeamBoard } from "../lib/team_render.js";

const MAX_TEAM_SIZE = 6;
const RAID_PLAYER_IDS = ["P1", "P2", "P3", "P4"];
const EXAMPLE_PASTE_ID = "966581e37222b555";
const EV_STAT_LIMIT = 252;
const IV_STAT_LIMIT = 31;
const EV_TOTAL_LIMIT = 510;
const IMPORT_FIELD_MAX = 160;
const IMPORT_NOTE_MAX = 300;
const EXAMPLE_RAW_TEAM = `Pelipper @ Damp Rock
Ability: Drizzle
EVs: 248 HP / 252 Def / 8 SpD
Bold Nature
- Hurricane
- Scald
- Roost
- U-turn

Kingdra @ Choice Specs
Ability: Swift Swim
EVs: 4 Def / 252 SpA / 252 Spe
Modest Nature
- Surf
- Draco Meteor
- Ice Beam
- Hydro Pump`;

export function initTeamCreation(options = {}) {
  const els = {
    teamStep: document.getElementById("team-step"),
    playerFlow: document.getElementById("playerFlow"),
    playerFlowStatus: document.getElementById("playerFlowStatus"),
    teamInputTabs: Array.from(document.querySelectorAll("[data-team-input-tab]")),
    teamInputPanels: Array.from(document.querySelectorAll("[data-team-input-panel]")),
    teamHelpSections: Array.from(document.querySelectorAll("[data-team-help-section]")),
    playerTabs: document.getElementById("playerTabs"),
    teamCreatorInfoBtn: document.getElementById("teamCreatorInfoBtn"),
    teamCreatorInfoModal: document.getElementById("teamCreatorInfoModal"),
    teamCreatorInfoCloseBtn: document.getElementById("teamCreatorInfoCloseBtn"),
    pokepasteInput: document.getElementById("pokepasteInput"),
    loadPokepasteBtn: document.getElementById("loadPokepasteBtn"),
    exampleTeamBtn: document.getElementById("exampleTeamBtn"),
    teamInputStatus: document.getElementById("teamInputStatus"),
    manualBuilderStatus: document.getElementById("manualBuilderStatus"),
    rawTeamInput: document.getElementById("rawTeamInput"),
    renderRawBtn: document.getElementById("renderRawBtn"),
    renderAllRawBtn: document.getElementById("renderAllRawBtn"),
    copyRawBtn: document.getElementById("copyRawBtn"),
    copyAllRawBtn: document.getElementById("copyAllRawBtn"),
    clearTeamBtn: document.getElementById("clearTeamBtn"),
    slotMode: document.getElementById("slotMode"),
    slotPokemonRow: document.getElementById("slotPokemonRow"),
    slotTypeRow: document.getElementById("slotTypeRow"),
    pokemonInput: document.getElementById("pokemonInput"),
    abilityInput: document.getElementById("abilityInput"),
    natureInput: document.getElementById("natureInput"),
    evHpInput: document.getElementById("evHpInput"),
    evAtkInput: document.getElementById("evAtkInput"),
    evDefInput: document.getElementById("evDefInput"),
    evSpAInput: document.getElementById("evSpAInput"),
    evSpDInput: document.getElementById("evSpDInput"),
    evSpeInput: document.getElementById("evSpeInput"),
    ivHpInput: document.getElementById("ivHpInput"),
    ivAtkInput: document.getElementById("ivAtkInput"),
    ivDefInput: document.getElementById("ivDefInput"),
    ivSpAInput: document.getElementById("ivSpAInput"),
    ivSpDInput: document.getElementById("ivSpDInput"),
    ivSpeInput: document.getElementById("ivSpeInput"),
    typeSelect: document.getElementById("typeSelect"),
    typeSelectSecondary: document.getElementById("typeSelectSecondary"),
    typeAbilityInput: document.getElementById("typeAbilityInput"),
    typeBadgePreview: document.getElementById("typeBadgePreview"),
    itemInput: document.getElementById("itemInput"),
    move1Input: document.getElementById("move1Input"),
    move2Input: document.getElementById("move2Input"),
    move3Input: document.getElementById("move3Input"),
    move4Input: document.getElementById("move4Input"),
    slotNoteInput: document.getElementById("slotNoteInput"),
    addSlotBtn: document.getElementById("addSlotBtn"),
    removeLastSlotBtn: document.getElementById("removeLastSlotBtn"),
    teamBoardTitle: document.getElementById("teamBoardTitle"),
    teamMeta: document.getElementById("teamMeta"),
    teamBoard: document.getElementById("teamBoard")
  };

  if (!els.teamBoard || !els.teamMeta) {
    return createEmptyController();
  }

  const state = {
    guideType: "Raid",
    players: buildPlayers(),
    currentPlayerId: "P1",
    activeInputTab: "pokepaste",
    types: getTypeMetadataList(),
    onTeamChange: typeof options.onTeamChange === "function" ? options.onTeamChange : null
  };

  renderTypeSelect(els.typeSelect, state.types, "Select Type");
  renderTypeSelect(els.typeSelectSecondary, state.types, "None");
  syncTypeSecondaryState(els);
  renderTypePreview(els, state);
  renderTeamInputTabs(els, state);
  syncSlotModeVisibility(els);
  renderPlayerFlow(els, state);
  renderCurrentPlayerTeam(els, state);
  bindManualInputNormalization(els);

  if (options.startHidden && els.teamStep) {
    els.teamStep.classList.add("hidden");
  }

  bindEvents(els, state);

  return {
    setVisible: (visible) => {
      if (!els.teamStep) {
        return;
      }
      els.teamStep.classList.toggle("hidden", !visible);
    },
    getSnapshot: () => buildSnapshot(state),
    setOnChange: (handler) => {
      state.onTeamChange = typeof handler === "function" ? handler : null;
      notifyTeamChange(state);
    },
    loadSnapshot: (snapshot) => {
      applySnapshot(els, state, snapshot);
    },
    configureGuide: (guideType) => {
      state.guideType = normalizeGuideType(guideType);
      state.players = buildPlayers();
      state.currentPlayerId = state.players[0].id;
      state.activeInputTab = "pokepaste";
      renderTeamInputTabs(els, state);
      renderPlayerFlow(els, state);
      renderCurrentPlayerTeam(els, state);
      clearStatus(els.teamInputStatus);
      clearStatus(els.manualBuilderStatus);
      openTeamCreatorInfoModal(els, state);
    }
  };
}

function createEmptyController() {
  return {
    setVisible: () => {},
    getSnapshot: () => ({
      guideType: "Raid",
      currentPlayerId: "P1",
      title: "P1 TEAM",
      team: [],
      raw: "",
      players: []
    }),
    setOnChange: () => {},
    loadSnapshot: () => {},
    configureGuide: () => {}
  };
}

function normalizeGuideType(_guideType) {
  return "Raid";
}

function buildPlayers() {
  return RAID_PLAYER_IDS.map((id) => ({ id, label: id, team: [], completed: false }));
}

function getCurrentPlayer(state) {
  return state.players.find((player) => player.id === state.currentPlayerId) || state.players[0];
}

function notifyTeamChange(state) {
  if (typeof state.onTeamChange !== "function") {
    return;
  }
  state.onTeamChange(buildSnapshot(state));
}

function buildSnapshot(state) {
  const current = getCurrentPlayer(state);
  const players = state.players.map((player) => {
    const team = cloneTeam(player.team);
    return {
      id: player.id,
      label: player.label,
      completed: player.completed,
      team,
      raw: serializeTeamToRaw(team)
    };
  });

  return {
    guideType: state.guideType,
    currentPlayerId: current?.id || "P1",
    title: `${current?.id || "P1"} TEAM`,
    team: cloneTeam(current?.team || []),
    raw: serializeTeamToRaw(current?.team || []),
    players
  };
}

function cloneTeam(team) {
  return (Array.isArray(team) ? team : []).map((slot) => ({
    ...slot,
    typeNames: Array.isArray(slot?.typeNames) ? slot.typeNames.filter(Boolean).slice(0, 2) : slot?.typeNames,
    moves: [...(slot?.moves || [])]
  }));
}

function applySnapshot(els, state, snapshot) {
  const normalizedGuideType = normalizeGuideType(snapshot?.guideType);
  const defaults = buildPlayers();
  const incomingPlayers = Array.isArray(snapshot?.players) ? snapshot.players : [];
  const playerMap = new Map(
    incomingPlayers
      .filter((player) => player?.id)
      .map((player) => [
        String(player.id).toUpperCase(),
        {
          ...player,
          team: sanitizeImportedTeam(player.team, state.types)
        }
      ])
  );

  state.guideType = normalizedGuideType;
  state.players = defaults.map((player) => {
    const imported = playerMap.get(player.id);
    const team = imported?.team || [];
    return {
      ...player,
      team,
      completed: Boolean(imported?.completed) || team.length > 0
    };
  });

  const nextCurrentPlayerId = String(snapshot?.currentPlayerId || "").toUpperCase();
  state.currentPlayerId = state.players.some((player) => player.id === nextCurrentPlayerId)
    ? nextCurrentPlayerId
    : state.players[0].id;
  state.activeInputTab = "pokepaste";

  renderTeamInputTabs(els, state);
  renderPlayerFlow(els, state);
  renderCurrentPlayerTeam(els, state);
  clearStatus(els.teamInputStatus);
  clearStatus(els.manualBuilderStatus);
}

function sanitizeImportedTeam(team, types) {
  const sanitized = (Array.isArray(team) ? team : [])
    .slice(0, MAX_TEAM_SIZE)
    .map((slot) => sanitizeImportedSlot(slot, types))
    .filter(Boolean);

  return hydrateTeamTypes(sanitized, types);
}

function sanitizeImportedSlot(slot, types) {
  if (slot?.kind === "type") {
    return sanitizeImportedTypeSlot(slot, types);
  }
  return sanitizeImportedPokemonSlot(slot);
}

function sanitizeImportedPokemonSlot(slot) {
  const species = sanitizeImportedText(slot?.species, 80);
  if (!species) {
    return null;
  }

  return {
    kind: "pokemon",
    species,
    item: sanitizeImportedText(slot?.item, IMPORT_FIELD_MAX),
    ability: sanitizeImportedText(slot?.ability, IMPORT_FIELD_MAX),
    nature: sanitizeImportedText(slot?.nature, 40),
    evs: sanitizeImportedText(slot?.evs, IMPORT_FIELD_MAX),
    ivs: sanitizeImportedText(slot?.ivs, IMPORT_FIELD_MAX),
    moves: sanitizeImportedMoves(slot?.moves),
    note: sanitizeImportedText(slot?.note, IMPORT_NOTE_MAX),
    shiny: slot?.shiny === true
  };
}

function sanitizeImportedTypeSlot(slot, types) {
  const typeNames = sanitizeImportedTypeNames(slot, types);
  if (!typeNames.length) {
    return null;
  }

  return {
    kind: "type",
    typeName: typeNames[0],
    typeNames,
    ability: sanitizeImportedText(slot?.ability, IMPORT_FIELD_MAX),
    item: sanitizeImportedText(slot?.item, IMPORT_FIELD_MAX),
    moves: sanitizeImportedMoves(slot?.moves),
    note: sanitizeImportedText(slot?.note, IMPORT_NOTE_MAX)
  };
}

function sanitizeImportedTypeNames(slot, types) {
  const typeMap = new Map((types || []).map((type) => [String(type.name).toLowerCase(), type.name]));
  const requested = [
    ...(Array.isArray(slot?.typeNames) ? slot.typeNames : []),
    slot?.typeName
  ];

  return requested
    .map((value) => sanitizeImportedText(value, 32))
    .filter(Boolean)
    .map((value) => typeMap.get(value.toLowerCase()) || "")
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 2);
}

function sanitizeImportedMoves(moves) {
  return (Array.isArray(moves) ? moves : [])
    .map((move) => sanitizeImportedText(move, 80))
    .filter(Boolean)
    .slice(0, 4);
}

function sanitizeImportedText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function bindEvents(els, state) {
  els.teamInputTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveInputTab(els, state, String(tab.dataset.teamInputTab || "")));
  });

  els.teamCreatorInfoBtn?.addEventListener("click", () => openTeamCreatorInfoModal(els, state));
  els.teamCreatorInfoCloseBtn?.addEventListener("click", () => closeTeamCreatorInfoModal(els));
  els.teamCreatorInfoModal?.addEventListener("click", (event) => {
    if (event.target === els.teamCreatorInfoModal) {
      closeTeamCreatorInfoModal(els);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.teamCreatorInfoModal?.classList.contains("hidden")) {
      closeTeamCreatorInfoModal(els);
    }
  });

  els.slotMode?.addEventListener("change", () => {
    syncSlotModeVisibility(els);
    syncTypeSecondaryState(els);
    renderTypePreview(els, state);
  });
  els.typeSelect?.addEventListener("change", () => {
    syncTypeSecondaryState(els);
    renderTypePreview(els, state);
  });
  els.typeSelectSecondary?.addEventListener("change", () => renderTypePreview(els, state));

  els.loadPokepasteBtn?.addEventListener("click", () => loadFromPokepaste(els, state));
  els.renderRawBtn?.addEventListener("click", () => renderFromRawInput(els, state));
  els.renderAllRawBtn?.addEventListener("click", () => loadAllPlayersFromRawInput(els, state));
  els.copyRawBtn?.addEventListener("click", () => copyCurrentRaw(els, state));
  els.copyAllRawBtn?.addEventListener("click", () => copyAllPlayersRaw(els, state));
  els.clearTeamBtn?.addEventListener("click", () => clearTeam(els, state));
  els.exampleTeamBtn?.addEventListener("click", () => loadExampleTeam(els, state));
  els.addSlotBtn?.addEventListener("click", () => addCustomSlot(els, state));
  els.removeLastSlotBtn?.addEventListener("click", () => removeLastSlot(els, state));
  els.teamBoard?.addEventListener("click", (event) => {
    const button = event.target.closest(".slot-remove-btn");
    if (!button) {
      return;
    }
    removeSlotAt(els, state, Number(button.dataset.slotIndex));
  });

  els.playerTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest(".player-tab");
    if (!tab) {
      return;
    }
    setCurrentPlayer(els, state, String(tab.dataset.playerId || ""));
  });
}

function setActiveInputTab(els, state, tabName) {
  const normalized = ["pokepaste", "manual", "raw"].includes(tabName) ? tabName : "pokepaste";
  state.activeInputTab = normalized;
  renderTeamInputTabs(els, state);
  syncTeamCreatorHelpSections(els, state);
}

function renderTeamInputTabs(els, state) {
  els.teamInputTabs.forEach((tab) => {
    const isActive = tab.dataset.teamInputTab === state.activeInputTab;
    tab.setAttribute("aria-selected", String(isActive));
    tab.classList.toggle("active", isActive);
  });

  els.teamInputPanels.forEach((panel) => {
    const isActive = panel.dataset.teamInputPanel === state.activeInputTab;
    panel.classList.toggle("hidden", !isActive);
  });
}

function syncTeamCreatorHelpSections(els, state) {
  els.teamHelpSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.teamHelpSection === state.activeInputTab);
  });
}

function openTeamCreatorInfoModal(els, state) {
  if (!els.teamCreatorInfoModal) {
    return;
  }
  syncTeamCreatorHelpSections(els, state);
  els.teamCreatorInfoModal.classList.remove("hidden");
  els.teamCreatorInfoCloseBtn?.focus();
}

function closeTeamCreatorInfoModal(els) {
  if (!els.teamCreatorInfoModal) {
    return;
  }
  els.teamCreatorInfoModal.classList.add("hidden");
  els.teamCreatorInfoBtn?.focus();
}

function setCurrentPlayer(els, state, playerId) {
  const exists = state.players.some((player) => player.id === playerId);
  if (!exists) {
    return;
  }
  state.currentPlayerId = playerId;
  renderPlayerFlow(els, state);
  renderCurrentPlayerTeam(els, state);
}

function renderPlayerFlow(els, state) {
  if (!els.playerFlow || !els.playerTabs) {
    return;
  }
  els.playerFlow.classList.remove("hidden");

  const current = getCurrentPlayer(state);
  if (els.playerFlowStatus && current) {
    els.playerFlowStatus.textContent = `Currently editing ${current.id}.`;
  }

  els.playerTabs.innerHTML = "";
  state.players.forEach((player) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "player-tab";
    if (player.id === current?.id) {
      tab.classList.add("active");
    }
    if (player.completed) {
      tab.classList.add("done");
    }
    tab.dataset.playerId = player.id;

    const name = document.createElement("strong");
    name.textContent = player.id;
    tab.appendChild(name);

    const status = document.createElement("small");
    status.textContent = player.completed ? "Done" : `${player.team.length}/6 slots`;
    tab.appendChild(status);

    els.playerTabs.appendChild(tab);
  });
}

function renderCurrentPlayerTeam(els, state) {
  const current = getCurrentPlayer(state);
  if (!current) {
    return;
  }

  const title = `${current.id} TEAM`;
  renderTeamBoard(els.teamBoard, title, current.team);
  if (els.teamBoardTitle) {
    els.teamBoardTitle.textContent = `Player ${current.id} Team Preview`;
  }
  els.teamMeta.textContent = `${current.id}: ${current.team.length} / ${MAX_TEAM_SIZE} slots`;
  if (els.rawTeamInput) {
    els.rawTeamInput.value = serializeTeamToRaw(current.team);
  }
  notifyTeamChange(state);
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

function clearStatus(el) {
  setStatus(el, "");
}

function setInputStatus(els, message, variant = "", options = {}) {
  const { manual = false } = options;
  setStatus(els.teamInputStatus, message, variant);
  if (manual) {
    setStatus(els.manualBuilderStatus, message, variant);
    return;
  }
  clearStatus(els.manualBuilderStatus);
}

function syncSlotModeVisibility(els) {
  const mode = els.slotMode?.value || "pokemon";
  const showPokemon = mode === "pokemon";
  els.slotPokemonRow?.classList.toggle("hidden", !showPokemon);
  els.slotTypeRow?.classList.toggle("hidden", showPokemon);
}

function renderTypeSelect(selectEl, types, placeholderLabel = "") {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = "";
  if (placeholderLabel) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholderLabel;
    selectEl.appendChild(option);
  }
  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.name;
    option.textContent = type.name;
    selectEl.appendChild(option);
  });
}

function getSelectedType(state, typeName) {
  return state.types.find((type) => type.name === typeName) || null;
}

function getSelectedTypes(els, state) {
  const primary = getSelectedType(state, els.typeSelect?.value || "");
  const secondary = getSelectedType(state, els.typeSelectSecondary?.value || "");
  return [primary, secondary]
    .filter(Boolean)
    .filter((type, index, list) => list.findIndex((entry) => entry.name === type.name) === index);
}

function syncTypeSecondaryState(els) {
  if (!els.typeSelectSecondary) {
    return;
  }
  const hasPrimary = Boolean(String(els.typeSelect?.value || "").trim());
  els.typeSelectSecondary.disabled = !hasPrimary;
  if (!hasPrimary) {
    els.typeSelectSecondary.value = "";
  }
}

function makeTypeBadge(type) {
  const badge = document.createElement("span");
  badge.className = "type-pill";
  if (type?.accentColor) {
    badge.style.setProperty("--type-accent", type.accentColor);
  }

  if (type?.iconUrl) {
    const icon = document.createElement("img");
    icon.src = type.iconUrl;
    icon.alt = `${type.name} icon`;
    icon.className = "type-pill-icon";
    icon.loading = "lazy";
    badge.appendChild(icon);
  }

  const label = document.createElement("span");
  label.textContent = type?.name || "";
  badge.appendChild(label);
  return badge;
}

function renderTypePreview(els, state) {
  if (!els.typeBadgePreview) {
    return;
  }
  els.typeBadgePreview.innerHTML = "";
  getSelectedTypes(els, state).forEach((type) => {
    els.typeBadgePreview.appendChild(makeTypeBadge(type));
  });
}

function getManualMoves(els) {
  return [els.move1Input?.value, els.move2Input?.value, els.move3Input?.value, els.move4Input?.value]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizePokemonSpecies(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s\-:.])([a-z])/g, (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function bindManualInputNormalization(els) {
  els.pokemonInput?.addEventListener("blur", () => {
    els.pokemonInput.value = normalizePokemonSpecies(els.pokemonInput.value);
  });

  getEvStatInputs(els).forEach((stat) => {
    stat.input?.addEventListener("input", () => handleEvInput(els, stat.input));
    stat.input?.addEventListener("blur", () => handleEvInput(els, stat.input));
  });

  getIvStatInputs(els).forEach((stat) => {
    stat.input?.addEventListener("input", () => handleBoundedStatInput(els, stat.input, IV_STAT_LIMIT));
    stat.input?.addEventListener("blur", () => handleBoundedStatInput(els, stat.input, IV_STAT_LIMIT));
  });
}

function getEvStatInputs(els) {
  return [
    { label: "HP", input: els.evHpInput },
    { label: "Atk", input: els.evAtkInput },
    { label: "Def", input: els.evDefInput },
    { label: "SpA", input: els.evSpAInput },
    { label: "SpD", input: els.evSpDInput },
    { label: "Spe", input: els.evSpeInput }
  ];
}

function getIvStatInputs(els) {
  return [
    { label: "HP", input: els.ivHpInput },
    { label: "Atk", input: els.ivAtkInput },
    { label: "Def", input: els.ivDefInput },
    { label: "SpA", input: els.ivSpAInput },
    { label: "SpD", input: els.ivSpDInput },
    { label: "Spe", input: els.ivSpeInput }
  ];
}

function normalizeUnsignedIntegerInput(input, maxValue) {
  if (!input) {
    return null;
  }

  const raw = String(input.value || "").trim();
  if (!raw) {
    input.value = "";
    return null;
  }

  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric)) {
    input.value = "";
    return null;
  }

  const bounded = Math.min(maxValue, Math.max(0, numeric));
  input.value = String(bounded);
  return bounded;
}

function handleBoundedStatInput(els, input, maxValue) {
  const value = normalizeUnsignedIntegerInput(input, maxValue);
  clearStatus(els.manualBuilderStatus);
  return value;
}

function handleEvInput(els, changedInput) {
  const changedValue = normalizeUnsignedIntegerInput(changedInput, EV_STAT_LIMIT);
  if (changedValue === null) {
    clearStatus(els.manualBuilderStatus);
    return;
  }

  const otherTotal = getEvStatInputs(els).reduce((total, stat) => {
    if (stat.input === changedInput) {
      return total;
    }
    return total + (Number.parseInt(stat.input?.value || "", 10) || 0);
  }, 0);

  if (otherTotal + changedValue <= EV_TOTAL_LIMIT) {
    clearStatus(els.manualBuilderStatus);
    return;
  }

  const allowedValue = Math.max(0, EV_TOTAL_LIMIT - otherTotal);
  changedInput.value = allowedValue ? String(allowedValue) : "";
  setInputStatus(els, "EV total is capped at 510.", "error", { manual: true });
}

function parseManualStatValue(input, maxValue) {
  const raw = String(input?.value || "").trim();
  if (!raw) {
    return { value: null };
  }

  if (!/^\d+$/.test(raw)) {
    return { error: `Use a whole number between 0 and ${maxValue}.` };
  }

  const numeric = Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > maxValue) {
    return { error: `Use a whole number between 0 and ${maxValue}.` };
  }

  return { value: numeric };
}

function collectStatSpread(statInputs, maxValue) {
  const values = [];

  for (const stat of statInputs) {
    const parsed = parseManualStatValue(stat.input, maxValue);
    if (parsed.error) {
      return { error: `${stat.label} must be between 0 and ${maxValue}.` };
    }
    values.push({ label: stat.label, value: parsed.value });
  }

  return { values };
}

function buildStatSpread(statValues) {
  return statValues
    .filter((stat) => stat.value !== null)
    .map((stat) => `${stat.value} ${stat.label}`)
    .join(" / ");
}

function sumStatSpread(statValues) {
  return statValues.reduce((total, stat) => total + (stat.value || 0), 0);
}

function legacyCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) {
    return false;
  }

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to legacy copy below.
    }
  }

  return legacyCopyText(value);
}

async function copyCurrentRaw(els, state) {
  const current = getCurrentPlayer(state);
  const raw = serializeTeamToRaw(current?.team || []);
  if (!raw) {
    setInputStatus(els, "Current player has no raw team to copy.", "error");
    return;
  }

  const copied = await copyTextToClipboard(raw);
  setInputStatus(
    els,
    copied ? `Copied ${current.id} raw team.` : "Copy failed. Browser blocked clipboard access.",
    copied ? "success" : "error"
  );
}

async function copyAllPlayersRaw(els, state) {
  const raw = buildAllPlayersRaw(state.players);
  if (!raw.trim()) {
    setInputStatus(els, "No player raw data available to copy.", "error");
    return;
  }

  const copied = await copyTextToClipboard(raw);
  setInputStatus(
    els,
    copied ? "Copied all player raw teams." : "Copy failed. Browser blocked clipboard access.",
    copied ? "success" : "error"
  );
}

function applyCurrentTeam(els, state, team) {
  const current = getCurrentPlayer(state);
  if (!current) {
    return;
  }
  current.team = hydrateTeamTypes(team.slice(0, MAX_TEAM_SIZE), state.types);
  renderPlayerFlow(els, state);
  renderCurrentPlayerTeam(els, state);
}

async function loadFromPokepaste(els, state) {
  const pasteId = extractPokepasteId(els.pokepasteInput?.value);
  if (!pasteId) {
    setInputStatus(els, "Enter a valid Pokepaste URL or ID.", "error");
    return;
  }

  const rawUrl = `https://pokepast.es/${pasteId}/raw`;
  setInputStatus(els, "Fetching Pokepaste raw text...");
  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error(`Pokepaste returned ${response.status}`);
    }
    const raw = await response.text();
    const parsed = parseRawTeam(raw).slice(0, MAX_TEAM_SIZE);
    if (!parsed.length) {
      throw new Error("Could not parse team from this Pokepaste.");
    }
    applyCurrentTeam(els, state, parsed);
    setInputStatus(els, "Pokepaste imported.", "success");
  } catch {
    setInputStatus(
      els,
      "Fetch failed. Paste raw text manually (Pokepaste can block browser requests).",
      "error"
    );
  }
}

function renderFromRawInput(els, state) {
  const raw = els.rawTeamInput?.value || "";
  const parsed = parseRawTeam(raw).slice(0, MAX_TEAM_SIZE);
  if (!parsed.length) {
    setInputStatus(els, "No valid Pokemon sets found in raw input.", "error");
    return;
  }
  applyCurrentTeam(els, state, parsed);
  setInputStatus(els, "Rendered from raw Showdown text.", "success");
}

function loadAllPlayersFromRawInput(els, state) {
  const raw = String(els.rawTeamInput?.value || "").trim();
  if (!raw) {
    setInputStatus(els, "Paste exported raw first.", "error");
    return;
  }

  const sections = parseRaidSections(
    raw,
    state.players.map((player) => player.id)
  );
  const sectionIds = Object.keys(sections);
  if (!sectionIds.length) {
    setInputStatus(els, "No player headers found. Use format: # P1, # P2, # P3, # P4.", "error");
    return;
  }

  let loaded = 0;
  const failed = [];
  let firstLoadedPlayerId = "";

  state.players.forEach((player) => {
    const section = sections[player.id];
    if (!section) {
      return;
    }
    const parsedTeam = parseRawTeam(section).slice(0, MAX_TEAM_SIZE);
    if (!parsedTeam.length) {
      failed.push(player.id);
      return;
    }
    player.team = hydrateTeamTypes(parsedTeam, state.types);
    player.completed = player.team.length > 0;
    if (!firstLoadedPlayerId) {
      firstLoadedPlayerId = player.id;
    }
    loaded += 1;
  });

  if (!loaded) {
    setInputStatus(els, "Player sections found, but no valid team sets were parsed.", "error");
    return;
  }

  state.currentPlayerId = firstLoadedPlayerId || state.currentPlayerId;
  renderPlayerFlow(els, state);
  renderCurrentPlayerTeam(els, state);

  const suffix = failed.length ? ` Skipped: ${failed.join(", ")}.` : "";
  setInputStatus(els, `Loaded ${loaded} player team(s) from exported raw.${suffix}`, "success");
}

function clearTeam(els, state) {
  applyCurrentTeam(els, state, []);
  setInputStatus(els, "Current player team cleared.");
}

function loadExampleTeam(els, state) {
  if (els.pokepasteInput) {
    els.pokepasteInput.value = `https://pokepast.es/${EXAMPLE_PASTE_ID}`;
  }
  if (els.rawTeamInput) {
    els.rawTeamInput.value = EXAMPLE_RAW_TEAM;
  }
  applyCurrentTeam(els, state, parseRawTeam(EXAMPLE_RAW_TEAM));
  setInputStatus(els, "Example loaded into current player.", "success");
}

function addCustomSlot(els, state) {
  const current = getCurrentPlayer(state);
  if (!current) {
    return;
  }
  if (current.team.length >= MAX_TEAM_SIZE) {
    setInputStatus(els, "Team is full. Remove a slot or clear first.", "error", { manual: true });
    return;
  }

  const mode = els.slotMode?.value || "pokemon";
  const item = String(els.itemInput?.value || "").trim();
  const moves = getManualMoves(els);
  const note = String(els.slotNoteInput?.value || "").trim();
  let slot;

  if (mode === "type") {
    const selectedType = getSelectedType(state, els.typeSelect?.value || "");
    if (!selectedType) {
      setInputStatus(els, "Choose a type slot first.", "error", { manual: true });
      return;
    }
    const selectedTypes = getSelectedTypes(els, state);
    const ability = String(els.typeAbilityInput?.value || "").trim();
    slot = {
      kind: "type",
      typeName: selectedTypes[0].name,
      typeNames: selectedTypes.map((type) => type.name),
      iconUrl: selectedTypes[0].iconUrl || "",
      accentColor: selectedTypes[0].accentColor || "",
      secondaryIconUrl: selectedTypes[1]?.iconUrl || "",
      secondaryAccentColor: selectedTypes[1]?.accentColor || "",
      ability,
      item,
      moves,
      note
    };
  } else {
    const species = normalizePokemonSpecies(els.pokemonInput?.value || "");
    if (!species) {
      setInputStatus(els, "Enter a Pokemon name first.", "error", { manual: true });
      return;
    }
    if (els.pokemonInput) {
      els.pokemonInput.value = species;
    }

    const ability = String(els.abilityInput?.value || "").trim();
    const nature = String(els.natureInput?.value || "").trim();
    const evSpread = collectStatSpread(getEvStatInputs(els), EV_STAT_LIMIT);
    if (evSpread.error) {
      setInputStatus(els, evSpread.error, "error", { manual: true });
      return;
    }

    const evTotal = sumStatSpread(evSpread.values);
    if (evTotal > EV_TOTAL_LIMIT) {
      setInputStatus(els, "EV total cannot exceed 510.", "error", { manual: true });
      return;
    }

    const ivSpread = collectStatSpread(getIvStatInputs(els), IV_STAT_LIMIT);
    if (ivSpread.error) {
      setInputStatus(els, ivSpread.error, "error", { manual: true });
      return;
    }

    slot = {
      kind: "pokemon",
      species,
      item,
      ability,
      nature,
      evs: buildStatSpread(evSpread.values),
      ivs: buildStatSpread(ivSpread.values),
      moves,
      note,
      shiny: false
    };
  }

  applyCurrentTeam(els, state, [...current.team, slot]);
  clearManualInputs(els);
  setInputStatus(els, `Slot added to ${current.id}.`, "success", { manual: true });
}

function clearManualInputs(els) {
  [els.pokemonInput, els.itemInput, els.abilityInput, els.typeAbilityInput, els.natureInput, els.slotNoteInput].forEach((input) => {
    if (input) {
      input.value = "";
    }
  });
  [els.typeSelect, els.typeSelectSecondary].forEach((select) => {
    if (select) {
      select.value = "";
    }
  });

  [
    els.evHpInput,
    els.evAtkInput,
    els.evDefInput,
    els.evSpAInput,
    els.evSpDInput,
    els.evSpeInput,
    els.ivHpInput,
    els.ivAtkInput,
    els.ivDefInput,
    els.ivSpAInput,
    els.ivSpDInput,
    els.ivSpeInput,
    els.move1Input,
    els.move2Input,
    els.move3Input,
    els.move4Input
  ].forEach((input) => {
    if (input) {
      input.value = "";
    }
  });

  syncTypeSecondaryState(els);
  if (els.typeBadgePreview) {
    els.typeBadgePreview.innerHTML = "";
  }
}

function removeLastSlot(els, state) {
  const current = getCurrentPlayer(state);
  if (!current || !current.team.length) {
    setInputStatus(els, "Current team is already empty.", "", { manual: true });
    return;
  }
  applyCurrentTeam(els, state, current.team.slice(0, -1));
  setInputStatus(els, "Last slot removed.", "success", { manual: true });
}

function removeSlotAt(els, state, index) {
  const current = getCurrentPlayer(state);
  if (!current || !Number.isInteger(index) || index < 0 || index >= current.team.length) {
    return;
  }
  applyCurrentTeam(
    els,
    state,
    current.team.filter((_, i) => i !== index)
  );
  setInputStatus(els, "Slot removed.", "success", { manual: true });
}
