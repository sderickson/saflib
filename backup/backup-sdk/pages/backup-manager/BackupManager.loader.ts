import { useQuery } from "@tanstack/vue-query";
import { listBackups } from "../../requests/backups/list.ts";

export function useBackupManagerLoader() {
  return {
    backupsQuery: useQuery(listBackups()),
  };
}
