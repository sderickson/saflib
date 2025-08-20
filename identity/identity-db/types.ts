import { emailAuth, users } from "./schemas/index.ts";

export type NewUser = Omit<typeof users.$inferInsert, "createdAt">;
export type User = typeof users.$inferSelect;
export type UpdateProfileParams = Pick<
  typeof users.$inferInsert,
  "name" | "givenName" | "familyName"
>;

export type NewEmailAuth = typeof emailAuth.$inferInsert;
export type SelectEmailAuth = typeof emailAuth.$inferSelect;
export type UpdateEmailParams = {
  userId: number;
  newEmail: string;
};
