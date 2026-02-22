import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CdStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";
import { AddSchemaWorkflowDefinition } from "@saflib/openapi/workflows";
import { AddRouteWorkflowDefinition } from "@saflib/openapi/workflows";
import { AddHandlerWorkflowDefinition } from "@saflib/express/workflows";
import { AddSdkQueryWorkflowDefinition } from "@saflib/sdk/workflows";
import { AddSpaPageWorkflowDefinition } from "@saflib/vue/workflows";
import { AddExportWorkflowDefinition } from "@saflib/monorepo/workflows";
import { CronAddJobWorkflowDefinition } from "@saflib/cron/workflows";

import path from "path";

const input = [] as const;

interface BackupServiceWorkflowContext {}

export const BackupServiceWorkflowDefinition = defineWorkflow<
  typeof input,
  BackupServiceWorkflowContext
>({
  id: "plans/backup-service",
  description: "Project backup-service workflow",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "backup-service.spec.md"),
  },

  steps: [
    step(CdStepMachine, () => ({
      path: "./object-store",
    })),

    step(makeWorkflowMachine(AddExportWorkflowDefinition), () => ({
      name: "ObjectStore",
      path: ".",
      prompt: `Create an abstract ObjectStore class with the following interface:

1. Abstract class ObjectStore with methods:
   - uploadFile(path: string, stream: Readable, metadata?: Record<string, string>): Promise<ReturnsError<{ success: boolean; url?: string }>>
   - listFiles(prefix?: string): Promise<ReturnsError<Array<{ path: string; size?: number; metadata?: Record<string, string> }>>>
   - deleteFile(path: string): Promise<ReturnsError<{ success: boolean }>>
   - readFile(path: string): Promise<ReturnsError<Readable>>

The class should be scoped to a specific container/bucket and folder path. The constructor should accept:
- containerName: string
- folderPath: string (defaults to empty string for root)
- tier?: AccessTier (for Azure, defaults to "Hot")

The class should validate that all paths stay within the scoped folder (prevent directory traversal).`,
    })),

    step(makeWorkflowMachine(AddExportWorkflowDefinition), () => ({
      name: "AzureObjectStore",
      path: "azure",
      prompt: `Create AzureObjectStore class that extends ObjectStore:

1. Implement all abstract methods using the existing Azure blob storage functions
2. Use getBlobServiceClient with the tier from constructor
3. Prepend folderPath to all file paths when interacting with Azure
4. For listFiles, filter results to only include files within the scoped folder
5. Handle errors appropriately and return ReturnsError types
6. Export the class from azure/index.ts`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CdStepMachine, () => ({
      path: "./backup/backup-spec",
    })),

    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "backup",
      prompt: `Create a schema for a backup object with the following properties:
- id: string (the backup ID from the filename)
- type: string enum ["manual", "automatic"] (parsed from filename)
- timestamp: string (ISO 8601 timestamp parsed from filename)
- size: number (file size in bytes)
- path: string (full path to the backup file in object store)
- Optional metadata fields if needed`,
    })),

    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/backups/list.yaml",
      urlPath: "/backups",
      method: "get",
      prompt: `Create GET /backups route that lists all backups. Returns an array of backup objects. Use the backup schema for the response.`,
    })),

    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/backups/create.yaml",
      urlPath: "/backups",
      method: "post",
      prompt: `Create POST /backups route that creates a manual backup. Accepts optional metadata in request body (description?: string, tags?: string[]). Returns a backup object.`,
    })),

    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/backups/delete.yaml",
      urlPath: "/backups/{backupId}",
      method: "delete",
      prompt: `Create DELETE /backups/{backupId} route that deletes a manual backup. backupId is a path parameter. Returns success confirmation.`,
    })),

    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/backups/restore.yaml",
      urlPath: "/backups/{backupId}/restore",
      method: "post",
      prompt: `Create POST /backups/{backupId}/restore route that restores from a backup. backupId is a path parameter. Returns success status. This is synchronous since it's a single SQLite file.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-specs", "generate"],
    })),

    step(CdStepMachine, () => ({
      path: "./backup/backup-http",
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./routes/backups/list.ts",
      prompt: `Implement GET /backups handler:
- Use object store's listFiles() to get all backup files
- Parse backup metadata from filenames (backup-{timestamp}-{type}-{id}.db)
- Return array of backup objects with type, timestamp, size, id
- Use getSafContextWithAuth and check scopes includes "*"
- The router will receive backupFn and objectStore as dependencies

After all handlers are created, update http.ts to export a function that creates and returns a router with all backup routes. The function should accept:
- backupFn: () => Promise<Readable> - function that returns a backup stream
- objectStore: ObjectStore - the object store instance
Pass these dependencies to each route handler.`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./routes/backups/create.ts",
      prompt: `Implement POST /backups handler:
- Accept optional metadata in request body (description, tags)
- Call the backup function passed to the router to get a stream
- Generate backup filename: backup-{timestamp}-manual-{uuid}.db
- Upload to object store using uploadFile
- Return backup metadata
- Use getSafContextWithAuth and check scopes includes "*"
- The router will receive backupFn and objectStore as dependencies`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./routes/backups/delete.ts",
      prompt: `Implement DELETE /backups/:backupId handler:
- Extract backupId from URL
- Check if backup is manual (from filename parsing)
- If automatic, return 400 error
- Delete from object store using deleteFile
- Use getSafContextWithAuth and check scopes includes "*"
- The router will receive backupFn and objectStore as dependencies`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./routes/backups/restore.ts",
      prompt: `Implement POST /backups/:backupId/restore handler:
- First create a safety backup (same as POST /backups)
- Then read the backup file from object store
- Stream the backup file to restore the database
- Return success status
- Use getSafContextWithAuth and check scopes includes "*"
- This should be synchronous since it's a single SQLite file
- The router will receive backupFn and objectStore as dependencies`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CdStepMachine, () => ({
      path: "./backup/backup-cron",
    })),

    step(makeWorkflowMachine(CronAddJobWorkflowDefinition), () => ({
      path: "./jobs/backup/automatic.ts",
      prompt: `Create automatic backup cron job that runs daily:
- Call the backup function to get a stream
- Generate backup filename: backup-{timestamp}-automatic-{uuid}.db
- Upload to object store
- Use getSafReporters() to log success/failure
- If backup fails, log error but don't delete existing backups

The job will receive backupFn and objectStore as dependencies.`,
    })),

    step(makeWorkflowMachine(CronAddJobWorkflowDefinition), () => ({
      path: "./jobs/backup/cleanup.ts",
      prompt: `Create cleanup cron job that runs daily after backup:
- List all automatic backup files from object store
- Parse timestamps from filenames
- Delete automatic backups older than 30 days
- Only delete if backup was successful (check metadata or file existence)
- Use getSafReporters() to log cleanup actions

The job will receive backupFn and objectStore as dependencies.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CdStepMachine, () => ({
      path: "./backup/backup-sdk",
    })),

    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/backups/list.ts",
      urlPath: "/backups",
      method: "get",
      prompt: `Create listBackups() query function that calls GET /backups and returns an array of backup objects.`,
    })),

    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/backups/create.ts",
      urlPath: "/backups",
      method: "post",
      prompt: `Create createBackup() mutation function that calls POST /backups with optional metadata (description?: string, tags?: string[]) and returns a backup object.`,
    })),

    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/backups/delete.ts",
      urlPath: "/backups/{backupId}",
      method: "delete",
      prompt: `Create deleteBackup() mutation function that calls DELETE /backups/{backupId} with backupId as a parameter and returns success confirmation.`,
    })),

    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/backups/restore.ts",
      urlPath: "/backups/{backupId}/restore",
      method: "post",
      prompt: `Create restoreBackup() mutation function that calls POST /backups/{backupId}/restore with backupId as a parameter and returns success status.`,
    })),

    step(makeWorkflowMachine(AddSpaPageWorkflowDefinition), () => ({
      path: "./pages/backup-manager",
      urlPath: "/backup-manager",
      prompt: `Create a backup management page with:

1. Display list of all backups with:
   - Type (manual/automatic) badge
   - Timestamp (formatted)
   - Size
   - Actions (delete for manual, restore for all)

2. Create backup button
   - Shows loading state while creating
   - Displays success/error message

3. Delete backup button (only for manual backups)
   - Shows confirmation dialog
   - Disabled for automatic backups

4. Restore backup button
   - Shows confirmation dialog mentioning a safety backup will be created first
   - Shows loading state
   - Displays success/error message

Use the TanStack Query functions created above (listBackups, createBackup, deleteBackup, restoreBackup).`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});

export default BackupServiceWorkflowDefinition;
