export const profile_intro = {
  title: "Settings",
  description:
    "Your display name and email preferences. This data lives in the product database — Kratos handles sign-in only.",
};

export const profile_form = {
  displayNameSectionTitle: "Profile",
  displayName: {
    label: "Display name",
    placeholder: "How you appear to others",
  },
  displayNameRequired: "Enter a display name",
  emailSectionTitle: "Email preferences",
  marketingEmailsOptIn: "Send me product and marketing emails",
  marketingEmailsOptInHelper:
    "Occasional product updates. You can change this anytime.",
  save: "Save",
  saveSuccess: "Saved",
  saveErrorFallback: "Could not save. Try again.",
};

/** Page-level strings for Async document title and i18n registration. */
export const profile = {
  documentTitle: "Settings",
  ...profile_intro,
};
