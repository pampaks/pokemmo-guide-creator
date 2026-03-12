import { getTypeSlotNames } from "./team_slots.js";

export function serializePokemonSlot(slot) {
  const lines = [];
  const name = String(slot?.species || "").trim();
  if (!name) {
    return "";
  }

  lines.push(slot.item ? `${name} @ ${slot.item}` : name);
  if (slot.ability) {
    lines.push(`Ability: ${slot.ability}`);
  }
  if (slot.evs) {
    lines.push(`EVs: ${slot.evs}`);
  }
  if (slot.ivs) {
    lines.push(`IVs: ${slot.ivs}`);
  }
  if (slot.nature) {
    lines.push(`${slot.nature} Nature`);
  }
  if (slot.shiny) {
    lines.push("Shiny: Yes");
  }
  if (slot.moves?.length) {
    slot.moves.forEach((move) => lines.push(`- ${move}`));
  }
  if (slot.note) {
    lines.push(`Note: ${slot.note}`);
  }
  return lines.join("\n");
}

export function serializeTypeSlot(slot) {
  const typeNames = getTypeSlotNames(slot);
  if (!typeNames.length) {
    return "";
  }

  const typeLabel = typeNames.join(" / ");
  const lines = [slot.item ? `Type Slot: ${typeLabel} @ ${slot.item}` : `Type Slot: ${typeLabel}`];
  if (slot.ability) {
    lines.push(`Ability: ${slot.ability}`);
  }
  if (slot.moves?.length) {
    slot.moves.forEach((move) => lines.push(`- ${move}`));
  }
  if (slot.note) {
    lines.push(`Note: ${slot.note}`);
  }
  return lines.join("\n");
}

export function serializeTeamToRaw(team) {
  return (Array.isArray(team) ? team : [])
    .map((slot) => (slot.kind === "type" ? serializeTypeSlot(slot) : serializePokemonSlot(slot)))
    .filter(Boolean)
    .join("\n\n");
}

export function buildAllPlayersRaw(players) {
  return (Array.isArray(players) ? players : [])
    .map((player) => {
      const teamRaw = serializeTeamToRaw(player.team || []);
      return teamRaw ? `# ${player.id}\n${teamRaw}` : `# ${player.id}`;
    })
    .join("\n\n");
}

export function parseRaidSections(raw, playerIds) {
  const lines = String(raw || "").replace(/\u00a0/g, " ").split(/\r?\n/);
  const allowed = new Set((playerIds || []).map((id) => String(id).toUpperCase()));
  const sections = {};
  let currentId = "";

  lines.forEach((line) => {
    const header = String(line).match(/^\s*#\s*(P\d+)\b/i);
    if (header) {
      const nextId = String(header[1] || "").toUpperCase();
      currentId = allowed.has(nextId) ? nextId : "";
      if (currentId && !sections[currentId]) {
        sections[currentId] = [];
      }
      return;
    }

    if (currentId) {
      sections[currentId].push(line);
    }
  });

  const parsedSections = {};
  Object.keys(sections).forEach((playerId) => {
    const text = sections[playerId].join("\n").trim();
    if (text) {
      parsedSections[playerId] = text;
    }
  });

  return parsedSections;
}
