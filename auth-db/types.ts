import { emailAuth, users, userPermissions } from "./schema.ts";

export type NewUser = Omit<typeof users.$inferInsert, "createdAt">;
export type SelectUser = typeof users.$inferSelect;

export type NewEmailAuth = typeof emailAuth.$inferInsert;
export type SelectEmailAuth = typeof emailAuth.$inferSelect;

export type UserPermissions = typeof userPermissions.$inferSelect;
