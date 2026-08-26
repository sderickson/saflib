// BEGIN WORKFLOW AREA schema-exports FOR drizzle/update-schema
export * from "./schemas/__group-name__.ts";
// END WORKFLOW AREA

// Product seed table — outside the update-schema area so offshoot upserts
// (which copy this file's area as the template) do not pull it in.
export * from "./schemas/user-config.ts";

// BEGIN WORKFLOW AREA offshoot-schema-exports FOR drizzle/init
export * from "@saflib/base-__offshoot-name__-db/schema";
// END WORKFLOW AREA
