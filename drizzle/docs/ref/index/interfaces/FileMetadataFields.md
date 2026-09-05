[**@saflib/drizzle**](../../index.md)

---

# Interface: FileMetadataFields

TypeScript interface for file metadata fields.
Use this in your Entity interface when your table includes fileMetadataColumns.
Add `created_at` / `updated_at` on the entity itself (not via this interface).

## Example

```ts
import type { FileMetadataFields } from "@saflib/drizzle/types/file-metadata";

export interface MyFileEntity extends FileMetadataFields {
  id: string;
  created_at: Date;
  updated_at: Date;
  // other fields...
}
```

## Properties

### blob\_name

> **blob\_name**: `string`

---

### file\_original\_name

> **file\_original\_name**: `string`

---

### md5\_hash

> **md5\_hash**: `null` \| `string`

---

### mimetype

> **mimetype**: `string`

---

### size

> **size**: `number`
