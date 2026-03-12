// credits to https://www.deviantart.com/jormxdos
export const TYPE_METADATA = [
  {
    name: "Support",
    accentColor: "#646464",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/4709/4709000.png"

  },
  {
    name: "Normal",
    accentColor: "#9FA19F",
    iconUrl: "assets/types/normal.png"
  },
  {
    name: "Fire",
    accentColor: "#E62829",
    iconUrl: "assets/types/fire.png"
  },
  {
    name: "Water",
    accentColor: "#2980EF",
    iconUrl: "assets/types/water.png"
  },
  {
    name: "Electric",
    accentColor: "#FAC000",
    iconUrl: "assets/types/electric.png"
  },
  {
    name: "Grass",
    accentColor: "#3FA129",
    iconUrl: "assets/types/grass.png"
  },
  {
    name: "Ice",
    accentColor: "#3DCEF3",
    iconUrl: "assets/types/ice.png"
  },
  {
    name: "Fighting",
    accentColor: "#FF8000",
    iconUrl: "assets/types/fighting.png"
  },
  {
    name: "Poison",
    accentColor: "#9141CB",
    iconUrl: "assets/types/poison.png"
  },
  {
    name: "Ground",
    accentColor: "#915121",
    iconUrl: "assets/types/ground.png"
  },
  {
    name: "Flying",
    accentColor: "#81B9EF",
    iconUrl: "assets/types/flying.png"
  },
  {
    name: "Psychic",
    accentColor: "#EF4179",
    iconUrl: "assets/types/psychic.png"
  },
  {
    name: "Bug",
    accentColor: "#91A119",
    iconUrl: "assets/types/bug.png"
  },
  {
    name: "Rock",
    accentColor: "#AFA981",
    iconUrl: "assets/types/rock.png"
  },
  {
    name: "Ghost",
    accentColor: "#704170",
    iconUrl: "assets/types/ghost.png"
  },
  {
    name: "Dragon",
    accentColor: "#5060E1",
    iconUrl: "assets/types/dragon.png"
  },
  {
    name: "Dark",
    accentColor: "#624D4E",
    iconUrl: "assets/types/dark.png"
  },
  {
    name: "Steel",
    accentColor: "#60A1B8",
    iconUrl: "assets/types/steel.png"
  },
  {
    name: "Fairy",
    accentColor: "#EF70EF",
    iconUrl: "assets/types/fairy.png"
  }
];

const POKEMON_SUGGESTIONS = [
  "Amoonguss",
  "Arcanine",
  "Blissey",
  "Breloom",
  "Chandelure",
  "Conkeldurr",
  "Crobat",
  "Dragonite",
  "Excadrill",
  "Ferrothorn",
  "Garchomp",
  "Gengar",
  "Gliscor",
  "Gyarados",
  "Hydreigon",
  "Infernape",
  "Jellicent",
  "Kingdra",
  "Krookodile",
  "Lucario",
  "Magnezone",
  "Mamoswine",
  "Metagross",
  "Milotic",
  "Pelipper",
  "Porygon-Z",
  "Roserade",
  "Rotom-Wash",
  "Salamence",
  "Scizor",
  "Skarmory",
  "Slowbro",
  "Snorlax",
  "Starmie",
  "Swampert",
  "Togekiss",
  "Tyranitar",
  "Volcarona",
  "Weavile"
];

const SPECIAL_SLUGS = {
  Shaymin: "shaymin-land",
  "Mr. Mime": "mr-mime",
  "Mime Jr.": "mime-jr",
  "Farfetch'd": "farfetchd",
  "Nidoran-F": "nidoran-f",
  "Nidoran-M": "nidoran-m",
  "Nidoran Female": "nidoran-f",
  "Nidoran Male": "nidoran-m",
  "Type: Null": "type-null",
  "Jangmo-o": "jangmo-o",
  "Hakamo-o": "hakamo-o",
  "Kommo-o": "kommo-o",
  "Tapu Koko": "tapu-koko",
  "Tapu Lele": "tapu-lele",
  "Tapu Bulu": "tapu-bulu",
  "Tapu Fini": "tapu-fini",
  "Mr. Rime": "mr-rime",
  "Flabe\u00e9": "flabebe",
  "Zygarde 10%": "zygarde-10",
  "Zygarde 50%": "zygarde-50",
  "Zygarde Complete": "zygarde-complete",
  "Ho-Oh": "ho-oh",
  "Porygon-Z": "porygon-z",
  "Rockruff (Own Tempo)": "rockruff-own-tempo",
  "Lycanroc (Midday)": "lycanroc-midday",
  "Lycanroc (Midnight)": "lycanroc-midnight",
  "Lycanroc (Dusk)": "lycanroc-dusk",
  "Rotom-Wash": "rotom-wash"
};

export function getTypeMetadataList() {
  return TYPE_METADATA.map((type) => ({ ...type }));
}

export function allKnownPokemon() {
  return [...POKEMON_SUGGESTIONS].sort();
}

export function pokemonDbSlug(name) {
  if (!name) {
    return "";
  }

  let n = String(name).trim();
  n = n.replace(/\u2019/g, "'");
  n = n.replace(/\u2640/g, "-F").replace(/\u2642/g, "-M");

  if (SPECIAL_SLUGS[n]) {
    return SPECIAL_SLUGS[n];
  }

  let slug = n.toLowerCase();
  slug = slug.replace(/\u00e9/g, "e");
  slug = slug.replace(/\./g, "");
  slug = slug.replace(/'/g, "");
  slug = slug.replace(/\u2640/g, "-f");
  slug = slug.replace(/\u2642/g, "-m");
  slug = slug.replace(/\s+/g, "-");
  slug = slug.replace(/[^a-z0-9-]/g, "");
  slug = slug.replace(/--+/g, "-");
  return slug;
}

export function pokemonDbSpriteUrl(pokemonName, isShiny = false) {
  const slug = pokemonDbSlug(pokemonName);
  if (!slug) {
    return "";
  }
  const folder = isShiny ? "shiny" : "normal";
  return `https://img.pokemondb.net/sprites/black-white/${folder}/${slug}.png`;
}

export function showdownSpriteUrl(pokemonName) {
  const slug = pokemonDbSlug(pokemonName);
  if (!slug) {
    return "";
  }
  return `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`;
}

export function extractPokepasteId(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (/^[a-z0-9]{6,}$/i.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (!/pokepast\.es$/i.test(url.hostname)) {
      return "";
    }
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length ? parts[0] : "";
  } catch {
    return "";
  }
}

function parseTypeSlotNames(value) {
  return String(value || "")
    .split(/\s*(?:\/|\bor\b)\s*/i)
    .map(sanitizeLine)
    .filter(Boolean)
    .filter((typeName, index, list) => list.findIndex((entry) => entry.toLowerCase() === typeName.toLowerCase()) === index)
    .slice(0, 2);
}

function sanitizeLine(line) {
  return String(line || "").replace(/\s+/g, " ").trim();
}

function parseLeadLine(leadLine) {
  let item = "";
  let left = sanitizeLine(leadLine);
  const splitAt = left.lastIndexOf(" @ ");
  if (splitAt >= 0) {
    item = left.slice(splitAt + 3).trim();
    left = left.slice(0, splitAt).trim();
  }

  left = left.replace(/\s+\((M|F)\)$/i, "").trim();
  let nickname = "";
  let species = left;
  const nicknameMatch = left.match(/^(.*?)\s+\(([^()]+)\)$/);
  if (nicknameMatch) {
    nickname = nicknameMatch[1].trim();
    species = nicknameMatch[2].trim();
  }

  return {
    nickname,
    species,
    displayName: nickname || species,
    item
  };
}

function parseSetBlock(blockText) {
  const lines = String(blockText || "")
    .split(/\r?\n/)
    .map(sanitizeLine)
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const typeLead = lines[0].match(/^Type Slot:\s*(.+?)(?:\s*@\s*(.+))?$/i);
  if (typeLead) {
    const typeNames = parseTypeSlotNames(typeLead[1]);
    const typeName = typeNames[0] || String(typeLead[1] || "").trim();
    const item = String(typeLead[2] || "").trim();
    const typeMeta = TYPE_METADATA.find((type) => type.name.toLowerCase() === typeName.toLowerCase());
    const typeSet = {
      kind: "type",
      typeName,
      typeNames,
      item,
      ability: "",
      iconUrl: typeMeta?.iconUrl || "",
      accentColor: typeMeta?.accentColor || "",
      moves: [],
      note: ""
    };

    lines.slice(1).forEach((line) => {
      if (/^Ability:/i.test(line)) {
        typeSet.ability = line.replace(/^Ability:\s*/i, "").trim();
      } else if (/^- /.test(line)) {
        typeSet.moves.push(line.replace(/^- /, "").trim());
      } else if (/^Note:/i.test(line)) {
        typeSet.note = line.replace(/^Note:\s*/i, "").trim();
      }
    });

    return typeSet;
  }

  const lead = parseLeadLine(lines[0]);
  const set = {
    kind: "pokemon",
    name: lead.displayName,
    species: lead.species,
    item: lead.item,
    ability: "",
    nature: "",
    evs: "",
    ivs: "",
    moves: [],
    note: "",
    shiny: false
  };

  lines.slice(1).forEach((line) => {
    if (/^Ability:/i.test(line)) {
      set.ability = line.replace(/^Ability:\s*/i, "").trim();
    } else if (/^Nature:/i.test(line)) {
      set.nature = line.replace(/^Nature:\s*/i, "").trim();
    } else if (/ Nature$/i.test(line)) {
      set.nature = line.replace(/\s*Nature$/i, "").trim();
    } else if (/^EVs:/i.test(line)) {
      set.evs = line.replace(/^EVs:\s*/i, "").trim();
    } else if (/^IVs:/i.test(line)) {
      set.ivs = line.replace(/^IVs:\s*/i, "").trim();
    } else if (/^Shiny:\s*Yes$/i.test(line)) {
      set.shiny = true;
    } else if (/^Note:/i.test(line)) {
      set.note = line.replace(/^Note:\s*/i, "").trim();
    } else if (/^- /.test(line)) {
      set.moves.push(line.replace(/^- /, "").trim());
    }
  });

  return set;
}

export function parseRawTeam(rawText) {
  const normalized = String(rawText || "").replace(/\u00a0/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map(parseSetBlock).filter(Boolean);
}
