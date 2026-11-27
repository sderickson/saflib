/**
 * Vuetify defaults for admin pages, applied by {@link AdminScope}. Pages
 * shouldn't pick their own variants for inputs, cards and tables: these keep
 * every admin page on the same compact, outlined, white-surface look.
 */
const field = {
  variant: "outlined",
  density: "compact",
  hideDetails: "auto",
} as const;

export const adminDefaults = {
  VTextField: field,
  VTextarea: field,
  VSelect: field,
  VAutocomplete: field,
  VCombobox: field,
  VNumberInput: field,
  VCard: { variant: "flat" },
  VTable: { density: "compact" },
  VDataTable: { density: "compact", hover: true },
  VDataTableServer: { density: "compact", hover: true },
  VExpansionPanels: { variant: "accordion", flat: true },
  VAlert: { variant: "tonal", density: "compact" },
};
