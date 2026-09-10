export const settings_tabs = {
  general: "General",
  password: "Password",
  totp: "Authenticator app (TOTP)",
  passkey: "Passkeys",
  sessions: "Sessions",
  /** `aria-label` for the settings section nav (sidebar). */
  nav_aria_label: "Settings sections",
};

export const settings_sessions = {
  table_device: "Device",
  table_ip: "IP address",
  table_signed_in: "Signed in",
  table_actions: "Actions",
  badge_this_device: "This device",
  sign_out_this: "Sign out",
  revoke: "Revoke",
  sign_out_others: "Sign out of all other devices",
  load_failed: "Could not load sessions.",
  action_failed: "Something went wrong. Try again.",
};

export const settings_page = {
  settings_failed: "Could not save settings. Check your input and try again.",
};

/** Shown instead of Kratos copy for message id 1060001 (post-recovery password prompt). */
export const settings_password_recovery = {
  prompt: "Please update your password.",
};

export const settings_group_empty = {
  no_profile_fields: "No profile fields are available for this account.",
  no_password_fields: "Password update is not available for this account.",
  no_totp_fields: "Authenticator app setup is not available for this account.",
  no_passkey_fields: "Passkey management is not available for this account.",
};
