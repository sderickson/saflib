export const address_form_strings = {
  // Field labels
  addressFormattedLabel: "Formatted Address",
  addressStreetLabel: "Street Address",
  addressLocalityLabel: "City/Town",
  addressRegionLabel: "State/Region",
  addressCountryLabel: "Country",
  addressPostalCodeLabel: "Postal Code",

  // Field placeholders
  addressFormattedPlaceholder: "Enter complete formatted address",
  addressStreetPlaceholder: "Enter street address",
  addressLocalityPlaceholder: "Enter city or town",
  addressRegionPlaceholder: "Enter state or region",
  addressCountryPlaceholder: "Enter country",
  addressPostalCodePlaceholder: "Enter postal code",

  // Validation messages
  addressFormattedTooLong: "Formatted address must be 500 characters or less",
  addressStreetTooLong: "Street address must be 200 characters or less",
  addressLocalityTooLong: "City/Town must be 100 characters or less",
  addressRegionTooLong: "State/Region must be 100 characters or less",
  addressCountryTooLong: "Country must be 100 characters or less",
  addressPostalCodeTooLong: "Postal code must be 20 characters or less",
} as const;