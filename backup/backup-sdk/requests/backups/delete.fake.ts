import { backupHandler } from "../../typed-fake.ts";
import { backupStubs } from "./list.fake.ts";

export const deleteBackupHandler = backupHandler({
  verb: "delete",
  path: "/backups/{backupId}",
  status: 200,
  handler: async ({ params }) => {
    const backupId = params.backupId;
    const index = backupStubs.findIndex((stub) => stub.id === backupId);
    if (index !== -1) {
      backupStubs.splice(index, 1);
    }
    return {
      success: true,
      message: "Backup deleted successfully",
    };
  },
});
