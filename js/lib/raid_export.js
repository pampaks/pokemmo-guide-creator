import { pokemonDbSpriteUrl, showdownSpriteUrl } from "./pokemon.js";
import { getTypeSlotLabel, getTypeSlotNames, getTypeSlotPokemonText } from "./team_slots.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nonEmpty(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function resolveExportAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (/^(?:https?:)?\/\//i.test(raw) || /^data:/i.test(raw)) {
    return raw;
  }
  try {
    if (typeof window !== "undefined" && /^https?:$/i.test(window.location.protocol)) {
      return new URL(raw, window.location.href).href;
    }
  } catch {
    return raw;
  }
  return raw;
}

export function normalizeFilename(value) {
  return String(value || "guide")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "guide";
}

export function buildPreviewMarkup(meta, snapshot, columns, rows, options = {}) {
  const players = Array.isArray(options.players) ? options.players : snapshot?.players;
  return `
    <section class="preview-guide">
      <header class="preview-header-card">
        <h3>${escapeHtml(meta.strategyName)}</h3>
        <p class="preview-meta">
          <span>${escapeHtml(meta.guideType)}</span>
          <span>Author: ${escapeHtml(nonEmpty(meta.authorName, "N/A"))}</span>
          <span>IGN: ${escapeHtml(nonEmpty(meta.ignName, "N/A"))}</span>
        </p>
        <p class="preview-description">${escapeHtml(meta.description)}</p>
      </header>

      <section>
        <h4 class="preview-section-title">Player Teams</h4>
        ${renderPlayerTeamSections(players)}
      </section>

      <section>
        <h4 class="preview-section-title">Turn-by-Turn Plan</h4>
        <div class="planner-table-wrap">
          ${renderPlannerHtml(columns, rows)}
        </div>
      </section>

      <p class="preview-watermark-subtle">Pokemmo Guide Creator - pampaks</p>
    </section>
  `;
}

export function buildMainExportHtml(meta, snapshot, columns, rows) {
  const players = getExportPlayers(snapshot);
  const markup = buildPreviewMarkup(meta, snapshot, columns, rows, { players });
  const raw = escapeHtml(players.map((player) => `# ${player.id}\n${player.raw || ""}`).join("\n\n"));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.strategyName)} - Main Guide</title>
  <style>${buildThemeCss()}</style>
</head>
<body>
  ${markup}
  <details class="raw-wrap">
    <summary class="raw-summary">Raw Team Data</summary>
    <div class="raw-body">
      <div class="raw-tools">
        <button type="button" class="raw-copy-btn" data-copy-target="rawDataMain">Copy Raw</button>
      </div>
      <pre id="rawDataMain">${raw}</pre>
    </div>
  </details>
  ${buildExportCopyScript()}
</body>
</html>`;
}

function renderPlannerHtml(columns, rows) {
  const compactRows = getRenderablePlannerRows(columns, rows);
  if (!compactRows.length) {
    return `<p class="preview-empty">No turn actions added yet.</p>`;
  }

  const header = ["T", ...columns]
    .map((label) => `<th>${escapeHtml(label)}</th>`)
    .join("");
  const body = compactRows
    .map((row) => {
      const actionCells = columns
        .map((column) => `<td>${escapeHtml(row.actions?.[column] || "-")}</td>`)
        .join("");
      const noteRow = hasValue(row.notes)
        ? `<tr class="planner-note-row"><td colspan="${columns.length + 1}"><div class="planner-note-wrap"><span class="planner-note-label">Note for ${escapeHtml(
            row.turn
          )}</span><span class="planner-note-text">${escapeHtml(row.notes)}</span></div></td></tr>`
        : "";
      return `<tr><td class="planner-turn">${escapeHtml(row.turn)}</td>${actionCells}</tr>${noteRow}`;
    })
    .join("");
  return `<table class="planner-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function getRenderablePlannerRows(columns, rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => rowHasPlannerContent(row, columns))
    .map((row, index) => ({
      ...row,
      turn: `T${index + 1}`
    }));
}

function rowHasPlannerContent(row, columns) {
  if (hasValue(row?.notes)) {
    return true;
  }

  return (Array.isArray(columns) ? columns : []).some((column) => hasValue(row?.actions?.[column]));
}

function renderPlayerTeamCards(team) {
  const slots = Array.isArray(team) ? team : [];
  if (!slots.length) {
    return `<p class="preview-empty">No slots configured for this player.</p>`;
  }

  const cards = slots
    .map((slot) => {
      if (slot.kind === "type") {
        const accent = escapeHtml(slot.accentColor || "#6176d8");
        const secondaryAccent = escapeHtml(slot.secondaryAccentColor || "#2c355f");
        const hasDualType = Boolean(slot.secondaryIconUrl);
        const primaryIconUrl = escapeHtml(resolveExportAssetUrl(slot.iconUrl));
        const secondaryIconUrl = escapeHtml(resolveExportAssetUrl(slot.secondaryIconUrl));
        const icon = hasDualType
          ? `<img class="preview-type-icon preview-type-icon-primary" src="${primaryIconUrl}" alt="${escapeHtml(slot.typeName)} icon" loading="lazy"><img class="preview-type-icon preview-type-icon-secondary" src="${secondaryIconUrl}" alt="${escapeHtml(getTypeSlotNames(slot)[1] || "Secondary")} icon" loading="lazy">`
          : slot.iconUrl
            ? `<img class="preview-type-icon" src="${primaryIconUrl}" alt="${escapeHtml(slot.typeName)} icon" loading="lazy">`
            : `<span class="preview-type-fallback">${escapeHtml((slot.typeName || "?").slice(0, 1).toUpperCase())}</span>`;
        return `
          <article class="preview-slot preview-slot-type" style="--slot-accent:${accent};--slot-accent-secondary:${secondaryAccent}">
            <div class="preview-slot-head">
              <span class="preview-type-avatar${hasDualType ? " preview-type-avatar-dual" : ""}">${icon}</span>
              <div>
                <h4>${escapeHtml(getTypeSlotLabel(slot))}</h4>
              </div>
            </div>
            <p><strong>Pokemon:</strong> ${escapeHtml(getTypeSlotPokemonText(slot))}</p>
            ${hasValue(slot.ability) ? `<p><strong>Ability:</strong> ${escapeHtml(slot.ability)}</p>` : ""}
            ${hasValue(slot.item) ? `<p><strong>Item:</strong> ${escapeHtml(slot.item)}</p>` : ""}
            ${hasValue(slot.note) ? `<p><strong>Note:</strong> ${escapeHtml(slot.note)}</p>` : ""}
            ${slot.moves?.length ? `<ul>${slot.moves.map((move) => `<li>${escapeHtml(move)}</li>`).join("")}</ul>` : ""}
          </article>
        `;
      }

      const species = slot.species || "Unknown";
      const primary = escapeHtml(pokemonDbSpriteUrl(species, slot.shiny));
      const fallback = escapeHtml(showdownSpriteUrl(species));
      return `
        <article class="preview-slot">
          <div class="preview-slot-head">
            <img class="preview-slot-sprite" src="${primary}" alt="${escapeHtml(species)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}';">
            <div>
              <h4>${escapeHtml(species)}</h4>
              <p class="slot-subtitle">${escapeHtml(slot.item ? `@ ${slot.item}` : "@ No item")}</p>
            </div>
          </div>
          ${hasValue(slot.ability) ? `<p><strong>Ability:</strong> ${escapeHtml(slot.ability)}</p>` : ""}
          ${hasValue(slot.nature) ? `<p><strong>Nature:</strong> ${escapeHtml(slot.nature)}</p>` : ""}
          ${hasValue(slot.evs) ? `<p><strong>EVs:</strong> ${escapeHtml(slot.evs)}</p>` : ""}
          ${hasValue(slot.ivs) ? `<p><strong>IVs:</strong> ${escapeHtml(slot.ivs)}</p>` : ""}
          ${hasValue(slot.note) ? `<p><strong>Note:</strong> ${escapeHtml(slot.note)}</p>` : ""}
          ${slot.moves?.length ? `<ul>${slot.moves.map((move) => `<li>${escapeHtml(move)}</li>`).join("")}</ul>` : ""}
        </article>
      `;
    })
    .join("");

  return `<div class="preview-team-grid">${cards}</div>`;
}

function renderPlayerTeamSections(players) {
  const list = Array.isArray(players) ? players : [];
  if (!list.length) {
    return `<p class="preview-empty">No player teams configured yet.</p>`;
  }

  const sections = list
    .map((player) => {
      const slots = player.team?.length || 0;
      return `
        <details class="preview-player-team">
          <summary class="preview-player-team-head">
            <span class="preview-player-team-title">${escapeHtml(player.id)} Team</span>
            <span class="preview-player-team-count">${slots} / 6 slots</span>
          </summary>
          <div class="preview-player-team-body">
            ${renderPlayerTeamCards(player.team)}
          </div>
        </details>
      `;
    })
    .join("");

  return `<div class="preview-player-teams">${sections}</div>`;
}

function getExportPlayers(snapshot) {
  const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
  const withTeam = players.filter((player) => (player.team?.length || 0) > 0);
  return withTeam.length ? withTeam : players;
}

function buildThemeCss() {
  return `
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      color: #f5f7ff;
      background:
        radial-gradient(circle at 18% 16%, rgba(190, 210, 255, 0.12) 0%, rgba(190, 210, 255, 0) 26%),
        radial-gradient(circle at 82% 14%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 20%),
        linear-gradient(180deg, #171b23 0%, #0b0d12 100%);
      padding: 28px;
    }
    .preview-guide {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(66, 74, 89, 0.34) 0%, rgba(29, 34, 43, 0.52) 100%);
      box-shadow:
        0 30px 70px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(28px) saturate(140%);
      -webkit-backdrop-filter: blur(28px) saturate(140%);
      padding: 16px;
    }
    .preview-header-card {
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(78, 86, 105, 0.34) 0%, rgba(35, 40, 52, 0.54) 100%);
      box-shadow:
        0 18px 44px rgba(0, 0, 0, 0.24),
        inset 0 1px 0 rgba(255, 255, 255, 0.14);
      padding: 18px 20px;
    }
    .preview-header-card h3 {
      margin: 0;
      font-size: 28px;
      color: #ffffff;
    }
    .preview-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 8px 0 10px;
      color: #b8c4de;
    }
    .preview-description {
      margin: 0;
      color: #b8c4de;
    }
    .preview-section-title {
      margin: 14px 0 8px;
      color: #ffffff;
    }
    .preview-player-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .preview-player-card {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(70, 77, 94, 0.26) 0%, rgba(28, 33, 44, 0.5) 100%);
      box-shadow:
        0 22px 60px rgba(0, 0, 0, 0.26),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      padding: 10px;
      backdrop-filter: blur(24px) saturate(132%);
      -webkit-backdrop-filter: blur(24px) saturate(132%);
    }
    .preview-player-card h4 {
      margin: 0;
      color: #ffffff;
    }
    .preview-player-card p {
      margin: 4px 0 0;
      color: #b8c4de;
    }
    .preview-player-link {
      color: inherit;
      text-decoration: none;
    }
    .preview-player-card .preview-player-link {
      display: block;
    }
    .preview-player-teams {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr;
    }
    .preview-player-team {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(70, 77, 94, 0.26) 0%, rgba(28, 33, 44, 0.5) 100%);
      box-shadow:
        0 22px 60px rgba(0, 0, 0, 0.26),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      padding: 10px;
      backdrop-filter: blur(24px) saturate(132%);
      -webkit-backdrop-filter: blur(24px) saturate(132%);
    }
    .preview-player-team[open] {
      border-color: rgba(255, 255, 255, 0.26);
    }
    .preview-player-team-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      cursor: pointer;
      list-style: none;
    }
    .preview-player-team-head::-webkit-details-marker {
      display: none;
    }
    .preview-player-team-head::after {
      content: "+";
      font-weight: 700;
      color: rgba(255, 255, 255, 0.82);
    }
    .preview-player-team[open] .preview-player-team-head::after {
      content: "-";
    }
    .preview-player-team-title {
      margin: 0;
      font-size: 16px;
      color: #ffffff;
    }
    .preview-player-team-count {
      margin: 0;
      color: #b8c4de;
    }
    .preview-player-team-body {
      margin-top: 8px;
    }
    .preview-player-team-link-wrap {
      margin: 0 0 8px;
    }
    .preview-team-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
    .planner-table-wrap {
      overflow-x: auto;
    }
    .planner-table {
      width: 100%;
      border-collapse: collapse;
      background: linear-gradient(180deg, rgba(66, 73, 90, 0.2) 0%, rgba(24, 29, 40, 0.44) 100%);
    }
    .planner-table th,
    .planner-table td {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px;
      vertical-align: top;
    }
    .planner-table th {
      background: rgba(255, 255, 255, 0.08);
      color: #fafcff;
      text-align: left;
    }
    .planner-turn {
      font-weight: 700;
      color: #fafcff;
    }
    .planner-note-row td {
      background: rgba(255, 255, 255, 0.04);
      padding: 10px 12px;
    }
    .planner-note-wrap {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding-left: 12px;
      border-left: 2px solid rgba(255, 255, 255, 0.18);
    }
    .planner-note-label {
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
      min-height: 25px;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #fafcff;
    }
    .planner-note-text {
      display: inline-block;
      padding-top: 3px;
      color: #d6dfef;
    }
    .preview-slot {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(70, 77, 94, 0.26) 0%, rgba(28, 33, 44, 0.5) 100%);
      box-shadow:
        0 22px 60px rgba(0, 0, 0, 0.26),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      padding: 10px;
      color: #ecf5f3;
      backdrop-filter: blur(24px) saturate(132%);
      -webkit-backdrop-filter: blur(24px) saturate(132%);
    }
    .preview-slot-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .preview-slot-sprite {
      width: 58px;
      height: 58px;
      object-fit: contain;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
    }
    .preview-type-avatar {
      width: 58px;
      height: 58px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      background: rgba(255, 255, 255, 0.08);
    }
    .preview-type-avatar-dual {
      position: relative;
    }
    .preview-type-icon {
      width: 42px;
      height: 42px;
      object-fit: contain;
    }
    .preview-type-avatar-dual .preview-type-icon {
      position: absolute;
      width: 24px;
      height: 24px;
    }
    .preview-type-icon-primary {
      top: 9px;
      left: 9px;
    }
    .preview-type-icon-secondary {
      right: 9px;
      bottom: 9px;
    }
    .preview-type-fallback {
      display: inline-block;
    }
    .preview-slot-type {
      border-color: rgba(255, 255, 255, 0.14);
    }
    .preview-slot h4 {
      margin: 0;
      color: #ffffff;
    }
    .slot-subtitle {
      margin: 4px 0 8px;
      color: #b8c4de;
    }
    .preview-slot p {
      margin: 3px 0;
      color: #b8c4de;
      font-size: 13px;
    }
    .preview-slot ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    .preview-slot li {
      font-size: 13px;
      line-height: 1.3;
    }
    .preview-watermark-subtle {
      margin: 12px 0 0;
      text-align: right;
      font-size: 11px;
      letter-spacing: 0.05em;
      color: rgba(173, 192, 229, 0.72);
    }
    .raw-wrap {
      margin-top: 14px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(70, 77, 94, 0.26) 0%, rgba(28, 33, 44, 0.5) 100%);
      box-shadow:
        0 22px 60px rgba(0, 0, 0, 0.26),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      padding: 12px;
      backdrop-filter: blur(24px) saturate(132%);
      -webkit-backdrop-filter: blur(24px) saturate(132%);
    }
    .raw-summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-weight: 700;
      color: #ffffff;
    }
    .raw-summary::-webkit-details-marker {
      display: none;
    }
    .raw-summary::after {
      content: "+";
      color: rgba(255, 255, 255, 0.82);
    }
    .raw-wrap[open] .raw-summary::after {
      content: "-";
    }
    .raw-body {
      margin-top: 8px;
    }
    .raw-tools {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    .raw-copy-btn {
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      padding: 5px 9px;
      background: linear-gradient(180deg, rgba(252, 253, 255, 0.94) 0%, rgba(229, 235, 246, 0.9) 100%);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      color: #151821;
    }
    .raw-copy-btn:hover {
      border-color: rgba(255, 255, 255, 0.4);
    }
    pre {
      margin: 0;
      overflow-x: auto;
      white-space: pre-wrap;
      background: linear-gradient(180deg, rgba(66, 73, 90, 0.2) 0%, rgba(24, 29, 40, 0.44) 100%);
      border-radius: 8px;
      padding: 10px;
      color: #f5f7ff;
    }
    .preview-empty {
      color: #b8c4de;
    }
    @media (max-width: 980px) {
      .preview-player-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .preview-team-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 760px) {
      .preview-team-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 680px) {
      .preview-team-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function buildExportCopyScript() {
  return `<script>
  (function () {
    function legacyCopy(text) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.focus();
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      area.remove();
      return ok;
    }

    function copyText(text) {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () {
          return legacyCopy(text);
        });
      }
      return Promise.resolve(legacyCopy(text));
    }

    document.querySelectorAll(".raw-copy-btn").forEach(function (copyButton) {
      copyButton.addEventListener("click", function () {
        var targetId = copyButton.getAttribute("data-copy-target");
        var target = targetId ? document.getElementById(targetId) : null;
        if (!target) return;
        var text = target.textContent || "";
        copyText(text).then(function (ok) {
          var original = copyButton.textContent;
          copyButton.textContent = ok ? "Copied" : "Copy Failed";
          setTimeout(function () {
            copyButton.textContent = original;
          }, 1200);
        });
      });
    });
  })();
  </script>`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
