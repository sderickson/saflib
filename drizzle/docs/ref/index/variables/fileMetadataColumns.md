[**@saflib/drizzle**](../../index.md)

---

# Variable: fileMetadataColumns

> `const` **fileMetadataColumns**: `object`

Common file metadata columns for tables that reference files stored in Azure Blob Storage.
Use these columns when your table stores metadata about a file (blob_name, file_original_name, mimetype, size).
Timestamps (`created_at` / `updated_at`) are not included — declare them on each table so
non-file tables and file tables share the same timestamp pattern.

## Type declaration

### blob\_name

> `readonly` **blob\_name**: `NotNull`\<`SQLiteTextBuilderInitial`\<`"blob_name"`, \[`string`, `...string[]`\], `undefined` \| `number`>>\>\>

### file\_original\_name

> `readonly` **file\_original\_name**: `NotNull`\<`SQLiteTextBuilderInitial`\<`"file_original_name"`, \[`string`, `...string[]`\], `undefined` \| `number`>>\>\>

### md5\_hash

> `readonly` **md5\_hash**: `SQLiteTextBuilderInitial`\<`"md5_hash"`, \[`string`, `...string[]`\], `undefined` \| `number`>\>

### mimetype

> `readonly` **mimetype**: `NotNull`\<`SQLiteTextBuilderInitial`\<`"mimetype"`, \[`string`, `...string[]`\], `undefined` \| `number`>>\>\>

### size

> `readonly` **size**: `NotNull`\<`SQLiteIntegerBuilderInitial`\<`"size"`>>\>\>

## Example

```ts
import { fileMetadataColumns, generateShortId } from "@saflib/drizzle";
import { integer } from "drizzle-orm/sqlite-core";

export const myFileTable = sqliteTable("my_file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateShortId()),
  ...fileMetadataColumns,
  created_at: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```
