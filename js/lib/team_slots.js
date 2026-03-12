export function getTypeSlotNames(slot) {
  if (Array.isArray(slot?.typeNames) && slot.typeNames.length) {
    return slot.typeNames.filter(Boolean).slice(0, 2);
  }
  return [String(slot?.typeName || "").trim()].filter(Boolean);
}

export function getTypeSlotLabel(slot) {
  const names = getTypeSlotNames(slot);
  return names.length ? names.join(" / ") : "Type";
}

export function getTypeSlotPokemonText(slot) {
  const names = getTypeSlotNames(slot);
  if (!names.length) {
    return "Any type";
  }
  if (names.length === 1) {
    return `Any ${names[0]}-type`;
  }
  return `Any ${names[0]}- or ${names[1]}-type`;
}

export function hydrateTeamTypes(team, types) {
  const safeTeam = Array.isArray(team) ? team : [];
  const typeMap = new Map((types || []).map((type) => [type.name, type]));

  return safeTeam.map((slot) => {
    if (slot.kind !== "type") {
      return slot;
    }

    const typeNames = getTypeSlotNames(slot);
    const primaryTypeName = typeNames[0] || "";
    const secondaryTypeName = typeNames[1] || "";
    const primaryType = typeMap.get(primaryTypeName);
    const secondaryType = typeMap.get(secondaryTypeName);

    return {
      ...slot,
      typeName: primaryTypeName,
      typeNames,
      iconUrl: slot.iconUrl || primaryType?.iconUrl || "",
      accentColor: slot.accentColor || primaryType?.accentColor || "",
      secondaryIconUrl: slot.secondaryIconUrl || secondaryType?.iconUrl || "",
      secondaryAccentColor: slot.secondaryAccentColor || secondaryType?.accentColor || ""
    };
  });
}
