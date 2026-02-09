import { text, integer } from "drizzle-orm/sqlite-core";

/**
 * Common file metadata columns for tables that reference files stored in Azure Blob Storage.
 * Use these columns when your table stores metadata about a file (blob_name, file_original_name, mimetype, size).
 *
 * @example
 * ```ts
 * import { fileMetadataColumns } from "@saflib/drizzle/types/file-metadata";
 *
 * export const myFileTable = sqliteTable("my_file", {
 *   id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
 *   ...fileMetadataColumns,
 *   // other columns...
 * });
 * ```
 */
export const fileMetadataColumns = {
  blob_name: text("blob_name").notNull(),
  file_original_name: text("file_original_name").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
} as const;

/**
 * TypeScript interface for file metadata fields.
 * Use this in your Entity interface when your table includes fileMetadataColumns.
 *
 * @example
 * ```ts
 * import type { FileMetadataFields } from "@saflib/drizzle/types/file-metadata";
 *
 * export interface MyFileEntity extends FileMetadataFields {
 *   id: string;
 *   // other fields...
 * }
 * ```
 */
export interface FileMetadataFields {
  blob_name: string;
  file_original_name: string;
  mimetype: string;
  size: number;
  created_at: string;
  updated_at: string;
}
