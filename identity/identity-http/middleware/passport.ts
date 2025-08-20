import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import * as argon2 from "argon2";
import type { User } from "../types.ts";
import {
  EmailAuthNotFoundError,
  emailAuthDb,
  UserNotFoundError,
  usersDb,
} from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";

export const setupPassport = () => {
  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const { dbKey } = authServiceStorage.getStore()!;
      const { result, error } = await usersDb.getById(dbKey, id);
      if (error instanceof UserNotFoundError) {
        return done(null, false);
      }
      done(null, result);
    } catch (err) {
      done(err);
    }
  });

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Get the user and their email auth
          let user;
          const { dbKey } = authServiceStorage.getStore()!;
          const { result, error } = await usersDb.getByEmail(dbKey, email);
          if (error instanceof UserNotFoundError) {
            return done(null, false, { message: "Invalid credentials" });
          }
          user = result;

          let auth;
          const { result: authResult, error: authError } =
            await emailAuthDb.getByEmail(dbKey, email);
          if (authError instanceof EmailAuthNotFoundError) {
            return done(null, false, { message: "Invalid credentials" });
          }
          auth = authResult;

          if (!auth || !user) {
            // should never happen? Shushing typescript.
            return done(null, false, { message: "Invalid credentials" });
          }

          // Convert the password hash to a string for argon2 verification
          const passwordHash = Buffer.from(
            auth.passwordHash as Uint8Array,
          ).toString("utf-8");

          // Check password using argon2
          const isValid = await argon2.verify(passwordHash, password);
          if (!isValid) {
            return done(null, false, { message: "Invalid credentials" });
          }

          // Update last login time
          const { result: updatedUser, error: updateError } =
            await usersDb.updateLastLogin(dbKey, user.id);
          if (updateError) {
            return done(updateError);
          }

          return done(null, updatedUser);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
};
