/**
 * Format phone number for display (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");

  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);

  if (limitedDigits.length === 0) return "";
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

/**
 * Convert display format to E.164 format
 */
export const toE164 = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return "";
};

/**
 * Convert E.164 format to display format
 */
export const fromE164 = (value: string): string => {
  if (value.startsWith("+1") && value.length === 12) {
    return formatPhoneNumber(value.slice(2));
  }
  return "";
};

/**
 * Validate US/Canada phone number
 */
export const isValidUSPhoneNumber = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
};

/**
 * Get phone number validation rules for Vuetify
 */
export const getPhoneValidationRules = (required = false) => {
  return [
    (value: string) => {
      if (required && !value) {
        return "Phone number is required";
      }
      if (value && value.length > 0 && !isValidUSPhoneNumber(value)) {
        return "Please enter a valid 10-digit phone number";
      }
      return true;
    },
  ];
};
