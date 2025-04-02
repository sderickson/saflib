import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import * as argon2 from "argon2";
import type { User } from "./types.ts";
import { AuthDB } from "@saflib/auth-db";

export const setupPassport = (db: AuthDB) => {
  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.users.getById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
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
          try {
            user = await db.users.getByEmail(email);
          } catch (err) {
            if (err instanceof db.users.UserNotFoundError) {
              return done(null, false, { message: "Invalid credentials" });
            }
            return done(err);
          }

          let auth;
          try {
            console.log("getting auth", email);
            auth = await db.emailAuth.getByEmail(email);
          } catch (err) {
            if (err instanceof db.emailAuth.EmailAuthNotFoundError) {
              return done(null, false, { message: "Invalid credentials" });
            }
            return done(err);
          }

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
          const updatedUser = await db.users.updateLastLogin(user.id);

          return done(null, updatedUser);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
};
