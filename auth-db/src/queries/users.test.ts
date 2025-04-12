import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthDB } from "../instance.ts";
import { EmailConflictError, UserNotFoundError } from "./users.ts";

describe("users queries", () => {
  let db: AuthDB;

  // Create a new database instance before each test
  beforeEach(async () => {
    db = new AuthDB({ inMemory: true });
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const newUser = {
        email: "test@example.com",
        createdAt: new Date(),
      };

      const result = await db.users.create(newUser);

      expect(result).toMatchObject({
        ...newUser,
        id: expect.any(Number),
        createdAt: expect.any(Date),
      });
      expect(result.lastLoginAt).toBeNull();
    });

    it("should throw EmailConflictError for duplicate email", async () => {
      const user = {
        email: "test@example.com",
        createdAt: new Date(),
      };

      await db.users.create(user);

      await expect(db.users.create(user)).rejects.toThrow(EmailConflictError);
    });
  });

  describe("getAll", () => {
    it("should return all users", async () => {
      const testUsers = [
        {
          name: "Test User 1",
          email: "test1@example.com",
          createdAt: new Date(),
        },
        {
          name: "Test User 2",
          email: "test2@example.com",
          createdAt: new Date(),
        },
      ];

      await Promise.all(testUsers.map((user) => db.users.create(user)));

      const result = await db.users.getAll();
      expect(result).toHaveLength(2);
      expect(result.map((u) => u.email)).toEqual(
        expect.arrayContaining(testUsers.map((u) => u.email)),
      );
    });

    it("should return empty array when no users exist", async () => {
      const result = await db.users.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("getByEmail", () => {
    it("should return user by email", async () => {
      const user = {
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
      };

      const created = await db.users.create(user);
      const result = await db.users.getByEmail(user.email);

      expect(result).toEqual(created);
    });

    it("should throw UserNotFoundError when email not found", async () => {
      await expect(
        db.users.getByEmail("nonexistent@example.com"),
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("getById", () => {
    it("should return user by id", async () => {
      const user = {
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
      };

      const created = await db.users.create(user);
      const result = await db.users.getById(created.id);

      expect(result).toEqual(created);
    });

    it("should throw UserNotFoundError when id not found", async () => {
      await expect(db.users.getById(999)).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("getEmailAuthByUserIds", () => {
    it("should return email auth info for specified user IDs", async () => {
      const now = new Date();
      now.setMilliseconds(0);
      const user1 = await db.users.create({
        email: "user1@test.com",
        createdAt: now,
      });
      const user2 = await db.users.create({
        email: "user2@test.com",
        createdAt: now,
      });
      await db.users.create({ email: "user3@test.com", createdAt: now }); // User whose auth we don't request

      const hash1 = Buffer.from("hash1");
      const auth1 = await db.emailAuth.create({
        userId: user1.id,
        email: user1.email,
        passwordHash: hash1,
      });

      const hash2 = Buffer.from("hash2");
      const auth2 = await db.emailAuth.create({
        userId: user2.id,
        email: user2.email,
        passwordHash: hash2,
      });

      // Request auth for user1 and user2
      const result = await db.users.getEmailAuthByUserIds([user1.id, user2.id]);

      expect(result).toHaveLength(2);

      // Check results (order isn't guaranteed, so check existence)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: auth1.userId,
            email: auth1.email,
            passwordHash: hash1,
          }),
          expect.objectContaining({
            userId: auth2.userId,
            email: auth2.email,
            passwordHash: hash2,
          }),
        ]),
      );
    });

    it("should return empty array if no email auth exists for the user IDs", async () => {
      const now = new Date();
      now.setMilliseconds(0);
      const user1 = await db.users.create({
        email: "user1@test.com",
        createdAt: now,
      });

      const result = await db.users.getEmailAuthByUserIds([user1.id]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it("should return empty array if input id list is empty", async () => {
      const result = await db.users.getEmailAuthByUserIds([]);
      expect(result).toEqual([]);
    });

    it("should only return auth for users requested in the id list", async () => {
      const now = new Date();
      now.setMilliseconds(0);
      const user1 = await db.users.create({
        email: "user1@test.com",
        createdAt: now,
      });
      const user2 = await db.users.create({
        email: "user2@test.com",
        createdAt: now,
      }); // Not requested

      const hash1 = Buffer.from("hash1");
      const auth1 = await db.emailAuth.create({
        userId: user1.id,
        email: user1.email,
        passwordHash: hash1,
      });

      const hash2 = Buffer.from("hash2"); // Auth for user we don't request
      await db.emailAuth.create({
        userId: user2.id,
        email: user2.email,
        passwordHash: hash2,
      });

      const result = await db.users.getEmailAuthByUserIds([user1.id]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId: auth1.userId,
        email: auth1.email,
        passwordHash: hash1,
      });
    });
  });

  describe("updateLastLogin", () => {
    it("should update last login timestamp", async () => {
      vi.useFakeTimers();
      const user = {
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
      };

      const created = await db.users.create(user);
      const now = new Date();
      vi.setSystemTime(now.setDate(now.getDate() + 1));
      const result = await db.users.updateLastLogin(created.id);
      expect(result).toBeDefined();
      expect(result?.lastLoginAt).toBeInstanceOf(Date);
      expect(result?.lastLoginAt?.getTime()).toBeGreaterThan(
        created.createdAt.getTime(),
      );
      vi.useRealTimers();
    });

    it("should throw UserNotFoundError when id not found", async () => {
      await expect(db.users.updateLastLogin(999)).rejects.toThrow(
        UserNotFoundError,
      );
    });
  });
});
