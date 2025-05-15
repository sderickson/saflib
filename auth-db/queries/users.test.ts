// import { describe, it, expect, beforeEach, vi } from "vitest";
// import { AuthDB } from "../instance.ts";
// import { EmailConflictError, UserNotFoundError } from "./users.ts";

// describe("users queries", () => {
//   let db: AuthDB;

//   // Create a new database instance before each test
//   beforeEach(async () => {
//     db = new AuthDB({ inMemory: true });
//   });

//   describe("getEmailAuthByUserIds", () => {
//     it("should return email auth info for specified user IDs", async () => {
//       const now = new Date();
//       now.setMilliseconds(0);
//       const user1 = await db.users.create({
//         email: "user1@test.com",
//         createdAt: now,
//       });
//       const user2 = await db.users.create({
//         email: "user2@test.com",
//         createdAt: now,
//       });
//       await db.users.create({ email: "user3@test.com", createdAt: now }); // User whose auth we don't request

//       const hash1 = Buffer.from("hash1");
//       const auth1 = await db.emailAuth.create({
//         userId: user1.id,
//         email: user1.email,
//         passwordHash: hash1,
//       });

//       const hash2 = Buffer.from("hash2");
//       const auth2 = await db.emailAuth.create({
//         userId: user2.id,
//         email: user2.email,
//         passwordHash: hash2,
//       });

//       // Request auth for user1 and user2
//       const result = await db.users.getEmailAuthByUserIds([user1.id, user2.id]);

//       expect(result).toHaveLength(2);

//       // Check results (order isn't guaranteed, so check existence)
//       expect(result).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             userId: auth1.userId,
//             email: auth1.email,
//             passwordHash: hash1,
//           }),
//           expect.objectContaining({
//             userId: auth2.userId,
//             email: auth2.email,
//             passwordHash: hash2,
//           }),
//         ]),
//       );
//     });

//     it("should return empty array if no email auth exists for the user IDs", async () => {
//       const now = new Date();
//       now.setMilliseconds(0);
//       const user1 = await db.users.create({
//         email: "user1@test.com",
//         createdAt: now,
//       });

//       const result = await db.users.getEmailAuthByUserIds([user1.id]);

//       expect(result).toHaveLength(0);
//       expect(result).toEqual([]);
//     });

//     it("should return empty array if input id list is empty", async () => {
//       const result = await db.users.getEmailAuthByUserIds([]);
//       expect(result).toEqual([]);
//     });

//     it("should only return auth for users requested in the id list", async () => {
//       const now = new Date();
//       now.setMilliseconds(0);
//       const user1 = await db.users.create({
//         email: "user1@test.com",
//         createdAt: now,
//       });
//       const user2 = await db.users.create({
//         email: "user2@test.com",
//         createdAt: now,
//       }); // Not requested

//       const hash1 = Buffer.from("hash1");
//       const auth1 = await db.emailAuth.create({
//         userId: user1.id,
//         email: user1.email,
//         passwordHash: hash1,
//       });

//       const hash2 = Buffer.from("hash2"); // Auth for user we don't request
//       await db.emailAuth.create({
//         userId: user2.id,
//         email: user2.email,
//         passwordHash: hash2,
//       });

//       const result = await db.users.getEmailAuthByUserIds([user1.id]);

//       expect(result).toHaveLength(1);
//       expect(result[0]).toMatchObject({
//         userId: auth1.userId,
//         email: auth1.email,
//         passwordHash: hash1,
//       });
//     });
//   });

// });
