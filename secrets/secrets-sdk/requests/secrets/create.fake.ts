import { secretsHandler } from "../../typed-fake.ts";
import { secretStubs } from "./list.fake.ts";
import type { Secret } from "@saflib/secrets-spec";

export const createSecretsHandler = secretsHandler({
  verb: "post",
  path: "/secrets",
  status: 201,
  handler: async ({ body }) => {
    const newSecret: Secret = {
      id: `secret-${Date.now()}`, // Generate unique ID
      name: body.name,
      description: body.description,
      masked_value: "new_secret***",
      created_at: Date.now(),
      updated_at: Date.now(),
      is_active: true,
    };

    // Add to in-memory list
    secretStubs.push(newSecret);
    console.log("secretStubs after create", secretStubs);

    return newSecret;
  },
});
