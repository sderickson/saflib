import { emailAuth, users } from "./schema.ts";

export type NewUser = Omit<typeof users.$inferInsert, "createdAt">;
export type SelectUser = typeof users.$inferSelect;

export type NewEmailAuth = typeof emailAuth.$inferInsert;
export type SelectEmailAuth = typeof emailAuth.$inferSelect;
