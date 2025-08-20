import { create } from "./create.ts";
import { getAll } from "./get-all.ts";
import { getById } from "./get-by-id.ts";
import { getByEmail } from "./get-by-email.ts";
import { updateProfile } from "./update-profile.ts";
import { updateLastLogin } from "./update-last-login.ts";

/**
 * Database queries for the users table. The users table contains profile information about the users,
 * similar to the OIDC Standard Claims.
 */
export const usersDb = {
  create,
  getAll,
  getById,
  getByEmail,
  updateProfile,
  updateLastLogin,
};
