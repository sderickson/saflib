// Seed table for this offshoot — outside the add-schema area so init keeps it.
export * from "./schemas/__offshoot-name__.ts";

// Empty markers only — drizzle/update-schema upserts from service/db/schema.ts.
// BEGIN WORKFLOW AREA schema-exports FOR drizzle/update-schema
// END WORKFLOW AREA

// Empty: nested drizzle/init can re-export further offshoot schemas here.
// BEGIN WORKFLOW AREA offshoot-schema-exports FOR drizzle/init
// END WORKFLOW AREA
