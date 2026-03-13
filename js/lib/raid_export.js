import { pokemonDbSlug, pokemonSpriteCandidates } from "./pokemon.js";
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
  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "pokedb.org" && parsed.pathname === "/_next/image") {
      return parsed.searchParams.get("url") || raw;
    }
  } catch {
    // Fall through to the existing resolution logic for relative URLs.
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

const FORUM_APP_URL = "https://pampaks.github.io/pokemmo-guide-creator/";

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
        ${renderPlayerTeamSections(players, options)}
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

export function buildMarkdownExport(meta, snapshot, columns, rows) {
  const players = getExportPlayers(snapshot);
  const plannerRows = getRenderablePlannerRows(columns, rows);
  const parts = [
    `# ${escapeMarkdownText(meta?.strategyName || "Raid Guide")}`,
    "",
    `**Guide Type:** ${escapeMarkdownText(nonEmpty(meta?.guideType, "Raid"))}  `,
    `**Author:** ${escapeMarkdownText(nonEmpty(meta?.authorName, "N/A"))}  `,
    `**IGN:** ${escapeMarkdownText(nonEmpty(meta?.ignName, "N/A"))}`,
    "",
    `> ${escapeMarkdownBlock(meta?.description || "No description provided.")}`,
    "",
    "## Player Teams",
    ""
  ];

  if (!players.length) {
    parts.push("No player teams configured yet.");
    parts.push("");
  } else {
    parts.push(...buildMarkdownTeamTable(players));
    parts.push("");
  }

  parts.push("## Turn-by-Turn Plan");
  parts.push("");
  parts.push(...buildMarkdownPlanner(columns, plannerRows));
  parts.push("");
  parts.push(`For more creations: [PokeMMO Guide Creator](${FORUM_APP_URL})`);

  return `${parts.join("\n").trim()}\n`;
}

export function buildForumPasteHtml(meta, snapshot, columns, rows) {
  const players = getExportPlayers(snapshot);
  const plannerRows = getRenderablePlannerRows(columns, rows);
  const parts = [
    `<h1>${escapeHtml(meta?.strategyName || "Raid Guide")}</h1>`,
    `<p><strong>Guide Type:</strong> ${escapeHtml(nonEmpty(meta?.guideType, "Raid"))}<br><strong>Author:</strong> ${escapeHtml(
      nonEmpty(meta?.authorName, "N/A")
    )}<br><strong>IGN:</strong> ${escapeHtml(nonEmpty(meta?.ignName, "N/A"))}</p>`,
    `<blockquote><p>${escapeHtml(nonEmpty(meta?.description, "No description provided.")).replace(/\n/g, "<br>")}</p></blockquote>`,
    "<h2>Player Teams</h2>",
    buildForumPasteTeamTable(players),
    "<h2>Turn-by-Turn Plan</h2>",
    buildForumPastePlannerTable(columns, plannerRows),
    `<p>For more creations: <a href="${escapeHtml(FORUM_APP_URL)}">PokeMMO Guide Creator</a></p>`
  ];
  return parts.join("\n");
}

export async function copyRichContentToClipboard(html, text) {
  const safeHtml = String(html || "");
  const safeText = String(text || "");

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    const item = new ClipboardItem({
      "text/html": new Blob([safeHtml], { type: "text/html" }),
      "text/plain": new Blob([safeText], { type: "text/plain" })
    });
    await navigator.clipboard.write([item]);
    return "html";
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(safeText);
    return "text";
  }

  const area = document.createElement("textarea");
  area.value = safeText;
  area.setAttribute("readonly", "true");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) {
    throw new Error("Clipboard copy is not available in this browser.");
  }
  return "text";
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
        const primaryCandidates = getTypeIconExportCandidates(slot.iconUrl, slot.typeName);
        const secondaryCandidates = getTypeIconExportCandidates(
          slot.secondaryIconUrl,
          getTypeSlotNames(slot)[1] || ""
        );
        const primaryIconUrl = escapeHtml(primaryCandidates[0] || "");
        const secondaryIconUrl = escapeHtml(secondaryCandidates[0] || "");
        const primaryExportCandidates = escapeHtml(primaryCandidates.join("\n"));
        const secondaryExportCandidates = escapeHtml(secondaryCandidates.join("\n"));
        const icon = hasDualType
          ? `<img class="preview-type-icon preview-type-icon-primary" src="${primaryIconUrl}" data-export-candidates="${primaryExportCandidates}" alt="${escapeHtml(slot.typeName)} icon" loading="lazy"><img class="preview-type-icon preview-type-icon-secondary" src="${secondaryIconUrl}" data-export-candidates="${secondaryExportCandidates}" alt="${escapeHtml(getTypeSlotNames(slot)[1] || "Secondary")} icon" loading="lazy">`
          : primaryCandidates.length
            ? `<img class="preview-type-icon" src="${primaryIconUrl}" data-export-candidates="${primaryExportCandidates}" alt="${escapeHtml(slot.typeName)} icon" loading="lazy">`
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
      const spriteCandidates = pokemonSpriteCandidates(species, slot.shiny).map(resolveExportAssetUrl);
      const primary = escapeHtml(spriteCandidates[0] || "");
      const fallback = escapeHtml(spriteCandidates[1] || "");
      const exportCandidates = escapeHtml(spriteCandidates.join("\n"));
      return `
        <article class="preview-slot">
          <div class="preview-slot-head">
            <img
              class="preview-slot-sprite"
              src="${primary}"
              data-export-candidates="${exportCandidates}"
              data-export-fallback-src="${fallback}"
              data-export-pokemon-species="${escapeHtml(species)}"
              data-export-pokemon-shiny="${slot.shiny ? "true" : "false"}"
              alt="${escapeHtml(species)}"
              loading="lazy"
              onerror="this.onerror=null;this.src='${fallback}';"
            >
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

function getTypeIconExportCandidates(iconUrl, typeName) {
  return [buildLocalTypeAssetUrl(typeName), resolveExportAssetUrl(iconUrl)].filter(
    (url, index, list) => url && list.indexOf(url) === index
  );
}

function buildLocalTypeAssetUrl(typeName) {
  const slug = String(typeName || "")
    .trim()
    .toLowerCase();
  if (!slug || slug === "support") {
    return "";
  }
  return `./assets/types/${slug}.png`;
}

function renderPlayerTeamSections(players, options = {}) {
  const list = Array.isArray(players) ? players : [];
  if (!list.length) {
    return `<p class="preview-empty">No player teams configured yet.</p>`;
  }

  const staticTeams = Boolean(options.staticPlayerTeams);

  const sections = list
    .map((player) => {
      const slots = player.team?.length || 0;
      if (staticTeams) {
        return `
          <div class="preview-player-team preview-player-team-static">
            <div class="preview-player-team-head preview-player-team-head-static">
              <span class="preview-player-team-title">${escapeHtml(player.id)} Team</span>
              <span class="preview-player-team-count">${slots} / 6 slots</span>
            </div>
            <div class="preview-player-team-body">
              ${renderPlayerTeamCards(player.team)}
            </div>
          </div>
        `;
      }

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

function buildMarkdownTeamTable(players) {
  const safePlayers = Array.isArray(players) ? players : [];
  if (!safePlayers.length) {
    return ["No player teams configured yet."];
  }

  const headers = ["Player", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6"];
  const parts = [
    `| ${headers.map((header) => escapeMarkdownTableCell(header)).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`
  ];

  safePlayers.forEach((player) => {
    const slots = Array.isArray(player?.team) ? player.team.slice(0, 6) : [];
    const row = [escapeMarkdownTableCell(player?.id || "Player")];
    for (let index = 0; index < 6; index += 1) {
      row.push(buildMarkdownCompactSlotCell(slots[index]));
    }
    parts.push(`| ${row.join(" | ")} |`);
  });

  return parts;
}

function buildForumPasteTeamTable(players) {
  const safePlayers = Array.isArray(players) ? players : [];
  if (!safePlayers.length) {
    return "<p>No player teams configured yet.</p>";
  }

  const headerCells = ["Player", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6"]
    .map((label) => `<th ${buildForumPasteCellStyle(true)}>${escapeHtml(label)}</th>`)
    .join("");
  const bodyRows = safePlayers
    .map((player) => {
      const slots = Array.isArray(player?.team) ? player.team.slice(0, 6) : [];
      const cells = [`<td ${buildForumPasteCellStyle()}><strong>${escapeHtml(player?.id || "Player")}</strong></td>`];
      for (let index = 0; index < 6; index += 1) {
        cells.push(`<td ${buildForumPasteCellStyle()}>${buildForumPasteSlotHtml(slots[index])}</td>`);
      }
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");
  return `<table ${buildForumPasteTableStyle()}><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function buildMarkdownPlanner(columns, rows) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  if (!rows.length) {
    return ["No turn actions added yet."];
  }

  const parts = [
    `| ${["T", ...safeColumns, "FF / Notes"].map((value) => escapeMarkdownTableCell(value)).join(" | ")} |`,
    `| ${["---", ...safeColumns.map(() => "---"), "---"].join(" | ")} |`
  ];

  rows.forEach((row) => {
    const cells = [
      escapeMarkdownTableCell(row.turn || "-"),
      ...safeColumns.map((column) => escapeMarkdownTableCell(row.actions?.[column] || "-")),
      escapeMarkdownTableCell(row.notes || "-")
    ];
    parts.push(`| ${cells.join(" | ")} |`);
  });
  return parts;
}

function buildForumPastePlannerTable(columns, rows) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  if (!rows.length) {
    return "<p>No turn actions added yet.</p>";
  }

  const headers = ["T", ...safeColumns, "FF / Notes"]
    .map((label) => `<th ${buildForumPasteCellStyle(true)}>${escapeHtml(label)}</th>`)
    .join("");
  const bodyRows = rows
    .map((row) => {
      const cells = [
        `<td ${buildForumPasteCellStyle()}><strong>${escapeHtml(row.turn || "-")}</strong></td>`,
        ...safeColumns.map(
          (column) => `<td ${buildForumPasteCellStyle()}>${escapeHtml(row.actions?.[column] || "-")}</td>`
        ),
        `<td ${buildForumPasteCellStyle()}>${escapeHtml(row.notes || "-")}</td>`
      ];
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");
  return `<table ${buildForumPasteTableStyle()}><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function buildMarkdownCompactSlotCell(slot) {
  if (!slot) {
    return escapeMarkdownTableCell("-");
  }

  if (slot.kind === "type") {
    const lines = [
      buildMarkdownTypeSpriteHtml(slot),
      `<strong>${escapeHtml(getTypeSlotLabel(slot))}</strong>`,
      `<sub>${escapeHtml(getTypeSlotPokemonText(slot))}</sub>`
    ].filter(Boolean);
    return lines.join("<br>");
  }

  const species = String(slot?.species || "").trim();
  if (!species) {
    return escapeMarkdownTableCell("-");
  }

  const lines = [
    buildMarkdownPokemonSpriteHtml(slot),
    `<strong>${escapeHtml(species)}</strong>`
  ];
  if (hasValue(slot?.item)) {
    lines.push(`<sub>@ ${escapeHtml(slot.item)}</sub>`);
  }
  return lines.join("<br>");
}

function buildForumPasteSlotHtml(slot) {
  if (!slot) {
    return "-";
  }

  if (slot.kind === "type") {
    const lines = [
      `<strong>${escapeHtml(getTypeSlotLabel(slot))}</strong>`,
      `<sub>${escapeHtml(getTypeSlotPokemonText(slot))}</sub>`
    ].filter(Boolean);
    return lines.join("<br>");
  }

  const species = String(slot?.species || "").trim();
  if (!species) {
    return "-";
  }

  const lines = [
    buildMarkdownPokemonSpriteHtml(slot),
    `<strong>${escapeHtml(species)}</strong>`
  ];
  if (hasValue(slot?.item)) {
    lines.push(`<sub>@ ${escapeHtml(slot.item)}</sub>`);
  }
  return lines.join("<br>");
}

function buildForumPasteTableStyle() {
  return 'style="border-collapse:collapse;width:100%;margin:0 0 16px 0;"';
}

function buildForumPasteCellStyle(isHeader = false) {
  const background = isHeader ? "#f3f4f6" : "#ffffff";
  const align = isHeader ? "center" : "center";
  return `style="border:1px solid #d1d5db;padding:8px;vertical-align:top;text-align:${align};background:${background};"`;
}

function buildMarkdownPokemonSpriteHtml(slot) {
  const species = String(slot?.species || "").trim();
  if (!species) {
    return "";
  }

  const spriteUrl = pokemonSpriteCandidates(species, slot?.shiny)
    .map(resolveExportAssetUrl)
    .find(Boolean);
  if (!spriteUrl) {
    return "";
  }
  return `<img src="${escapeHtml(spriteUrl)}" alt="${escapeHtml(species)}" width="40" height="40">`;
}

function buildMarkdownTypeSpriteHtml(slot) {
  const urls = [slot?.iconUrl, slot?.secondaryIconUrl]
    .map(resolveExportAssetUrl)
    .filter(Boolean);
  if (!urls.length) {
    return "";
  }

  const typeNames = getTypeSlotNames(slot);
  return urls
    .map(
      (url, index) =>
        `<img src="${escapeHtml(url)}" alt="${escapeHtml(typeNames[index] || `Type ${index + 1}`)}" height="18">`
    )
    .join(" ");
}

function escapeMarkdownText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/([\\`*_{}\[\]()#+|])/g, "\\$1")
    .trim();
}

function escapeMarkdownTableCell(value) {
  return String(value || "-")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => escapeMarkdownText(line))
    .join("<br>")
    .replace(/\|/g, "\\|")
    .trim() || "-";
}

function escapeMarkdownBlock(value) {
  const lines = String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => escapeMarkdownText(line))
    .filter((line, index, list) => line.length > 0 || index < list.length - 1);
  return (lines.length ? lines : ["No description provided."]).join("\n> ");
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
      overflow: hidden;
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      background: rgba(255, 255, 255, 0.08);
    }
    .preview-type-avatar-dual {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .preview-type-icon {
      width: 42px;
      height: 42px;
      object-fit: contain;
    }
    .preview-type-avatar-dual .preview-type-icon {
      width: 22px;
      height: 22px;
      flex: 0 0 auto;
    }
    .preview-type-icon-primary {
      transform: translateY(-3px);
    }
    .preview-type-icon-secondary {
      transform: translateY(3px);
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

const EXPORT_IMAGE_PLACEHOLDER_BG = "#1f2530";
const EXPORT_IMAGE_PLACEHOLDER_FG = "#f5f7ff";
const EXPORT_IMAGE_BACKGROUND_BASE = "#0b0d12";
const EXPORT_IMAGE_BACKGROUND_TOP = "#171b23";
const EXPORT_IMAGE_BACKGROUND_GLOW = "rgba(190, 210, 255, 0.12)";
const EXPORT_IMAGE_DEFAULT_SCALE = 2;
const EXPORT_IMAGE_CACHE = new Map();
const EXPORT_POKEAPI_SPRITE_CACHE = new Map();

export async function exportElementAsImage(element, format, filename, options = {}) {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Preview element is not available.");
  }

  const exportFormat = normalizeExportImageFormat(format);
  if (!exportFormat) {
    throw new Error("Unsupported image format.");
  }

  await document.fonts?.ready;

  const rect = element.getBoundingClientRect();
  const baseWidth = Math.max(Math.ceil(rect.width), Math.ceil(element.scrollWidth), 1);
  const scale = clampExportScale(options.scale);

  const clone = element.cloneNode(true);
  prepareCloneForImageExport(element, clone, { width: baseWidth });
  flattenDetailsForImageExport(clone);
  const { width, height } = measureCloneSize(clone, baseWidth);
  await inlineCloneImages(clone);

  const svgMarkup = buildSvgMarkup(clone, width, height);
  const image = await loadSvgImage(svgMarkup);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas export is not supported in this browser.");
  }

  context.scale(scale, scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  paintExportBackground(context, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(
    canvas,
    exportFormat.mime,
    typeof options.quality === "number" ? options.quality : exportFormat.quality
  );

  downloadBlob(blob, filename);
}

function normalizeExportImageFormat(format) {
  const value = String(format || "").trim().toLowerCase();
  if (value === "webp") {
    return {
      extension: "webp",
      mime: "image/webp",
      quality: 0.96
    };
  }
  if (value === "jpeg" || value === "jpg") {
    return {
      extension: "jpg",
      mime: "image/jpeg",
      quality: 0.92
    };
  }
  return null;
}

function clampExportScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return EXPORT_IMAGE_DEFAULT_SCALE;
  }
  return Math.min(Math.max(numeric, 1), 3);
}

function prepareCloneForImageExport(source, clone, size) {
  const pairs = [[source, clone]];

  while (pairs.length) {
    const [sourceNode, cloneNode] = pairs.pop();
    if (!(sourceNode instanceof HTMLElement) || !(cloneNode instanceof HTMLElement)) {
      continue;
    }

    inlineComputedStyle(sourceNode, cloneNode);

    if (cloneNode instanceof HTMLDetailsElement) {
      cloneNode.open = true;
      cloneNode.setAttribute("open", "");
    }

    if (cloneNode.matches(".planner-table-wrap, .preview-player-team-body")) {
      cloneNode.style.overflow = "visible";
    }

    if (cloneNode.matches(".preview-guide")) {
      cloneNode.style.width = `${size.width}px`;
    }

    const sourceChildren = Array.from(sourceNode.children);
    const cloneChildren = Array.from(cloneNode.children);
    for (let index = sourceChildren.length - 1; index >= 0; index -= 1) {
      pairs.push([sourceChildren[index], cloneChildren[index]]);
    }
  }
}

function measureCloneSize(clone, baseWidth) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.zIndex = "-1";
  wrapper.style.pointerEvents = "none";
  wrapper.style.visibility = "hidden";
  wrapper.style.width = `${baseWidth}px`;
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const width = Math.max(
      Math.ceil(baseWidth),
      Math.ceil(clone.scrollWidth),
      Math.ceil(wrapper.scrollWidth),
      1
    );
    const height = Math.max(
      Math.ceil(clone.scrollHeight),
      Math.ceil(wrapper.scrollHeight),
      1
    );
    return { width, height };
  } finally {
    wrapper.remove();
  }
}

function flattenDetailsForImageExport(root) {
  const detailNodes = Array.from(root.querySelectorAll("details"));
  detailNodes.forEach((detailNode) => {
    const replacement = document.createElement("div");
    copyElementPresentation(detailNode, replacement);
    replacement.style.display = "block";

    Array.from(detailNode.childNodes).forEach((child) => {
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        child instanceof HTMLElement &&
        child.tagName.toLowerCase() === "summary"
      ) {
        const summaryReplacement = document.createElement("div");
        copyElementPresentation(child, summaryReplacement);
        summaryReplacement.style.display = summaryReplacement.style.display || "flex";
        Array.from(child.childNodes).forEach((summaryChild) => {
          summaryReplacement.appendChild(summaryChild);
        });
        replacement.appendChild(summaryReplacement);
        return;
      }

      replacement.appendChild(child);
    });

    detailNode.replaceWith(replacement);
  });
}

function copyElementPresentation(source, target) {
  for (const attribute of Array.from(source.attributes)) {
    if (attribute.name === "open") {
      continue;
    }
    target.setAttribute(attribute.name, attribute.value);
  }
  target.style.cssText = source.style.cssText;
}

function inlineComputedStyle(sourceNode, cloneNode) {
  const computed = window.getComputedStyle(sourceNode);
  for (const property of computed) {
    cloneNode.style.setProperty(
      property,
      computed.getPropertyValue(property),
      computed.getPropertyPriority(property)
    );
  }
  cloneNode.style.setProperty("animation", "none");
  cloneNode.style.setProperty("transition", "none");
  cloneNode.style.setProperty("caret-color", "transparent");
}

async function inlineCloneImages(cloneRoot) {
  const images = Array.from(cloneRoot.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const candidates = await getImageExportCandidates(img);

      if (!candidates.length) {
        img.src = buildPlaceholderImageDataUrl(img.alt || "?");
        return;
      }

      for (const candidateUrl of candidates) {
        try {
          img.src = await imageUrlToDataUrl(candidateUrl);
          return;
        } catch {
          // Try the next candidate before falling back to a placeholder.
        }
      }

      img.src = buildPlaceholderImageDataUrl(img.alt || "?");
    })
  );
}

async function getImageExportCandidates(img) {
  const attributeCandidates = String(img.getAttribute("data-export-candidates") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const pokemonSpecies = String(img.getAttribute("data-export-pokemon-species") || "").trim();
  const pokemonApiCandidates = pokemonSpecies
    ? await getPokemonApiSpriteCandidates(
        pokemonSpecies,
        String(img.getAttribute("data-export-pokemon-shiny") || "").trim() === "true"
      )
    : [];

  return [
    ...pokemonApiCandidates,
    ...attributeCandidates,
    String(img.currentSrc || img.src || "").trim(),
    String(img.getAttribute("data-export-fallback-src") || "").trim()
  ].filter((url, index, list) => url && list.indexOf(url) === index);
}

async function getPokemonApiSpriteCandidates(species, isShiny) {
  const slug = pokemonDbSlug(species);
  if (!slug) {
    return [];
  }

  const cacheKey = `${slug}:${isShiny ? "shiny" : "normal"}`;
  if (EXPORT_POKEAPI_SPRITE_CACHE.has(cacheKey)) {
    return EXPORT_POKEAPI_SPRITE_CACHE.get(cacheKey);
  }

  const promise = (async () => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(slug)}`, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache"
    });
    if (!response.ok) {
      throw new Error(`PokeAPI sprite lookup failed: ${response.status}`);
    }

    const data = await response.json();
    const blackWhiteSprites = data?.sprites?.versions?.["generation-v"]?.["black-white"];
    const defaultSprite = isShiny ? blackWhiteSprites?.front_shiny : blackWhiteSprites?.front_default;
    const animatedSprite = isShiny
      ? blackWhiteSprites?.animated?.front_shiny
      : blackWhiteSprites?.animated?.front_default;
    const fallbackSprite = isShiny ? data?.sprites?.front_shiny : data?.sprites?.front_default;

    return [defaultSprite, animatedSprite, fallbackSprite].filter(
      (url, index, list) => url && list.indexOf(url) === index
    );
  })();

  EXPORT_POKEAPI_SPRITE_CACHE.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    EXPORT_POKEAPI_SPRITE_CACHE.delete(cacheKey);
    throw error;
  }
}

async function imageUrlToDataUrl(url) {
  if (/^data:/i.test(url)) {
    return url;
  }

  if (EXPORT_IMAGE_CACHE.has(url)) {
    return EXPORT_IMAGE_CACHE.get(url);
  }

  const promise = (async () => {
    const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }
    const blob = await response.blob();
    return blobToDataUrl(blob);
  })();

  EXPORT_IMAGE_CACHE.set(url, promise);

  try {
    return await promise;
  } catch (error) {
    EXPORT_IMAGE_CACHE.delete(url);
    throw error;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read image blob."));
    reader.readAsDataURL(blob);
  });
}

function buildPlaceholderImageDataUrl(label) {
  const text = escapeXml(getPlaceholderLabel(label));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="18" fill="${EXPORT_IMAGE_PLACEHOLDER_BG}"/>
      <text
        x="60"
        y="68"
        text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="30"
        font-weight="700"
        fill="${EXPORT_IMAGE_PLACEHOLDER_FG}"
      >${text}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getPlaceholderLabel(label) {
  const tokens = String(label || "")
    .replace(/\s+icon$/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return "?";
  }

  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function buildSvgMarkup(clone, width, height) {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.style.background = `linear-gradient(180deg, ${EXPORT_IMAGE_BACKGROUND_TOP} 0%, ${EXPORT_IMAGE_BACKGROUND_BASE} 100%)`;
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `.trim();
}

function paintExportBackground(context, width, height) {
  const fill = context.createLinearGradient(0, 0, 0, Math.max(height, 1));
  fill.addColorStop(0, EXPORT_IMAGE_BACKGROUND_TOP);
  fill.addColorStop(1, EXPORT_IMAGE_BACKGROUND_BASE);
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.18, height * 0.16, 0, width * 0.18, height * 0.16, width * 0.3);
  glow.addColorStop(0, EXPORT_IMAGE_BACKGROUND_GLOW);
  glow.addColorStop(1, "rgba(190, 210, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function loadSvgImage(svgMarkup) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to render preview as an image."));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Failed to generate image export."));
      },
      type,
      quality
    );
  });
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
