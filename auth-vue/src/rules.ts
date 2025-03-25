export const emailRules = [
  (value: string) => !!value || "Email is required",
  (value: string) => /.+@.+\..+/.test(value) || "Email must be valid",
];

export const passwordRules = [
  (value: string) => !!value || "Password is required",
  (value: string) =>
    value.length >= 8 || "Password must be at least 8 characters",
];
