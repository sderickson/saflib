export type ProfileFormValues = {
  displayName: string;
  marketingEmailsOptIn: boolean;
};

/** Wire UserConfig shape from getMine / putMine (snake_case). */
export type UserConfigWire = {
  display_name: string;
  marketing_emails_opt_in: boolean;
};

export function profileFormValuesFromUserConfig(
  userConfig: UserConfigWire,
): ProfileFormValues {
  return {
    displayName: userConfig.display_name,
    marketingEmailsOptIn: userConfig.marketing_emails_opt_in,
  };
}

export function isDisplayNameValid(displayName: string): boolean {
  return displayName.trim().length > 0;
}

export function isProfileFormValid(values: ProfileFormValues): boolean {
  return isDisplayNameValid(values.displayName);
}

export function buildPutMineUserConfigsBody(values: ProfileFormValues): {
  display_name: string;
  marketing_emails_opt_in: boolean;
} {
  return {
    display_name: values.displayName.trim(),
    marketing_emails_opt_in: values.marketingEmailsOptIn,
  };
}
