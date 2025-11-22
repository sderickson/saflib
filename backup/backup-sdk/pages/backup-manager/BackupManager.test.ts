import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import BackupManagerAsync from "./BackupManagerAsync.vue";
import { backup_manager_page as strings } from "./BackupManager.strings.ts";
import { mountTestApp, testAppHandlers } from "../../test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { backupStubs } from "../../requests/backups/list.fake.ts";

describe("BackupManager", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getSubtitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.subtitle);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  const getIdLabel = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.backup_id_label);
  };

  const getTypeLabel = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.backup_type_label);
  };

  const getTimestampLabel = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.backup_timestamp_label);
  };

  const getSizeLabel = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.backup_size_label);
  };

  const getPathLabel = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.backup_path_label);
  };

  const getMetadataLabel = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.backup_metadata_label);
  };

  it("should render the backup manager page correctly", async () => {
    const wrapper = mountTestApp(BackupManagerAsync);
    await vi.waitFor(() => getTitle(wrapper).exists());

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getTitle(wrapper).text()).toBe(strings.title);

    expect(getSubtitle(wrapper).exists()).toBe(true);
    expect(getSubtitle(wrapper).text()).toBe(strings.subtitle);

    expect(getDescription(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).text()).toBe(strings.description);

    expect(getIdLabel(wrapper).exists()).toBe(true);
    expect(getIdLabel(wrapper).text()).toBe(strings.backup_id_label);

    expect(getTypeLabel(wrapper).exists()).toBe(true);
    expect(getTypeLabel(wrapper).text()).toBe(strings.backup_type_label);

    expect(getTimestampLabel(wrapper).exists()).toBe(true);
    expect(getTimestampLabel(wrapper).text()).toBe(strings.backup_timestamp_label);

    expect(getSizeLabel(wrapper).exists()).toBe(true);
    expect(getSizeLabel(wrapper).text()).toBe(strings.backup_size_label);

    expect(getPathLabel(wrapper).exists()).toBe(true);
    expect(getPathLabel(wrapper).text()).toBe(strings.backup_path_label);

    expect(getMetadataLabel(wrapper).exists()).toBe(true);
    expect(getMetadataLabel(wrapper).text()).toBe(strings.backup_metadata_label);

    for (const backup of backupStubs) {
      expect(wrapper.text()).toContain(backup.id);
      expect(wrapper.text()).toContain(backup.path);

      const typeLabel =
        backup.type === "manual" ? strings.type_manual : strings.type_automatic;
      expect(wrapper.text()).toContain(typeLabel);
    }
  });
});
