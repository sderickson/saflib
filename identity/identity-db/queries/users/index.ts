import { create } from "./create.ts";
import { getAll } from "./get-all.ts";
import { getById } from "./get-by-id.ts";
import { getByEmail } from "./get-by-email.ts";
import { updateProfile } from "./update-profile.ts";
import { updateLastLogin } from "./update-last-login.ts";

export const usersDb = {
  create,
  getAll,
  getById,
  getByEmail,
  updateProfile,
  updateLastLogin,
};
