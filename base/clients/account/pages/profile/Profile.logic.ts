export type ProfileFormValues = {
  displayName: string;
  marketingEmailsOptIn: boolean;
};

export function profileFormValuesFromUserConfig(userConfig: {
  displayName: string;
  marketingEmailsOptIn: boolean;
}): ProfileFormValues {
  return {
    displayName: userConfig.displayName,
    marketingEmailsOptIn: userConfig.marketingEmailsOptIn,
  };
}

export function isDisplayNameValid(displayName: string): boolean {
  return displayName.trim().length > 0;
}

export function isProfileFormValid(values: ProfileFormValues): boolean {
  return isDisplayNameValid(values.displayName);
}

export function buildPutMineUserConfigsBody(values: ProfileFormValues): {
  displayName: string;
  marketingEmailsOptIn: boolean;
} {
  return {
    displayName: values.displayName.trim(),
    marketingEmailsOptIn: values.marketingEmailsOptIn,
  };
}
