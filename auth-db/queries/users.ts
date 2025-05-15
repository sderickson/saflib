// import { users, emailAuth } from "../../schema.ts";
// import { AuthDatabaseError } from "../../errors.ts";
// import { queryWrapper } from "@saflib/drizzle-sqlite3";
// import { eq, inArray } from "drizzle-orm";
// import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
// import * as schema from "../../schema.ts";

// export function createUserQueries(db: BetterSQLite3Database<typeof schema>) {
//   return {
//     getEmailAuthByUserIds: queryWrapper(
//       async (ids: number[]): Promise<SelectEmailAuth[]> => {
//         if (ids.length === 0) {
//           return [];
//         }
//         const result = await db
//           .select()
//           .from(emailAuth)
//           .where(inArray(emailAuth.userId, ids))
//           .execute();

//         return result;
//       },
//     ),
//   };
// }
