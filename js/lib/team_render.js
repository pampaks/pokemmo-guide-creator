import { pokemonDbSpriteUrl, showdownSpriteUrl } from "./pokemon.js";
import { getTypeSlotLabel, getTypeSlotNames, getTypeSlotPokemonText } from "./team_slots.js";

export function renderTeamBoard(container, title, team) {
  container.innerHTML = "";
  if (!team.length) {
    const empty = document.createElement("p");
    empty.className = "empty-board";
    empty.textContent =
      "No slots loaded yet. Import Pokepaste, paste raw sets, or add custom Pokemon/type slots.";
    container.appendChild(empty);
    return;
  }

  const heading = document.createElement("h3");
  heading.className = "team-title";
  heading.textContent = title;
  container.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "team-grid";
  team.forEach((slot, index) => {
    const card = slot.kind === "type" ? renderTypeCard(slot) : renderPokemonCard(slot);
    card.appendChild(buildRemoveButton(index));
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

function renderLine(label, value) {
  if (!value) {
    return null;
  }
  const line = document.createElement("p");
  line.className = "mon-line";
  line.textContent = `${label}: ${value}`;
  return line;
}

function renderMoves(moves, fallbackText) {
  const moveList = document.createElement("ul");
  moveList.className = "moves";
  if (moves?.length) {
    moves.forEach((move) => {
      const li = document.createElement("li");
      li.textContent = `- ${move}`;
      moveList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = fallbackText;
    moveList.appendChild(li);
  }
  return moveList;
}

function renderTypeAvatar(slot) {
  const avatar = document.createElement("div");
  avatar.className = "type-avatar";
  if (slot.accentColor) {
    avatar.style.setProperty("--type-accent", slot.accentColor);
  }
  if (slot.secondaryAccentColor) {
    avatar.classList.add("type-avatar-dual");
    avatar.style.setProperty("--type-accent-secondary", slot.secondaryAccentColor);
  }

  if (slot.secondaryIconUrl) {
    const primaryIcon = document.createElement("img");
    primaryIcon.src = slot.iconUrl || "";
    primaryIcon.alt = `${slot.typeName} icon`;
    primaryIcon.loading = "lazy";
    primaryIcon.className = "type-avatar-icon type-avatar-icon-primary";
    avatar.appendChild(primaryIcon);

    const secondaryIcon = document.createElement("img");
    secondaryIcon.src = slot.secondaryIconUrl;
    secondaryIcon.alt = `${getTypeSlotNames(slot)[1] || "Secondary"} icon`;
    secondaryIcon.loading = "lazy";
    secondaryIcon.className = "type-avatar-icon type-avatar-icon-secondary";
    avatar.appendChild(secondaryIcon);
  } else if (slot.iconUrl) {
    const icon = document.createElement("img");
    icon.src = slot.iconUrl;
    icon.alt = `${slot.typeName} icon`;
    icon.loading = "lazy";
    avatar.appendChild(icon);
  } else {
    avatar.textContent = (slot.typeName || "?").slice(0, 1).toUpperCase();
  }

  return avatar;
}

function renderTypeCard(slot) {
  const card = document.createElement("article");
  card.className = "mon-card type-slot";
  if (slot.accentColor) {
    card.style.setProperty("--type-accent", slot.accentColor);
  }

  const head = document.createElement("div");
  head.className = "mon-head";
  head.appendChild(renderTypeAvatar(slot));

  const info = document.createElement("div");
  const name = document.createElement("h4");
  name.className = "mon-name";
  name.textContent = getTypeSlotLabel(slot);
  info.appendChild(name);

  head.appendChild(info);
  card.appendChild(head);

  card.appendChild(renderLine("Pokemon", getTypeSlotPokemonText(slot)));
  if (slot.ability) {
    card.appendChild(renderLine("Ability", slot.ability));
  }
  card.appendChild(renderLine("Item", slot.item || "No item"));
  if (slot.note) {
    card.appendChild(renderLine("Note", slot.note));
  }
  card.appendChild(renderMoves(slot.moves, "- Add 1-4 moves"));
  return card;
}

function renderPokemonCard(slot) {
  const card = document.createElement("article");
  card.className = "mon-card";

  const head = document.createElement("div");
  head.className = "mon-head";

  const sprite = document.createElement("img");
  sprite.className = "mon-sprite";
  sprite.loading = "lazy";
  sprite.alt = slot.species || "Pokemon";
  sprite.src = pokemonDbSpriteUrl(slot.species, slot.shiny);
  sprite.onerror = () => {
    sprite.onerror = null;
    sprite.src = showdownSpriteUrl(slot.species);
  };
  head.appendChild(sprite);

  const info = document.createElement("div");
  const name = document.createElement("h4");
  name.className = "mon-name";
  name.textContent = slot.species || "Unknown";
  info.appendChild(name);

  const item = document.createElement("p");
  item.className = "mon-item";
  item.textContent = slot.item ? `@ ${slot.item}` : "@ No item";
  info.appendChild(item);

  head.appendChild(info);
  card.appendChild(head);

  [
    renderLine("Ability", slot.ability),
    renderLine("Nature", slot.nature),
    renderLine("EVs", slot.evs),
    renderLine("IVs", slot.ivs),
    renderLine("Note", slot.note)
  ]
    .filter(Boolean)
    .forEach((line) => card.appendChild(line));

  card.appendChild(renderMoves(slot.moves, "- Add 1-4 moves"));
  return card;
}

function buildRemoveButton(index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "slot-remove-btn";
  button.dataset.slotIndex = String(index);
  button.setAttribute("aria-label", "Remove slot");
  button.textContent = "x";
  return button;
}
