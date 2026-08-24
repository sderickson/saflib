// Upsert source for express/add-handler and express/init — not the runnable app.
// Live http.ts owns concrete wiring; CopyStep merges these workflow areas only.

// BEGIN WORKFLOW AREA cron-imports FOR cron/init
// END WORKFLOW AREA
// BEGIN WORKFLOW AREA jobs-router-imports FOR jobs/init
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./handlers/__group-name__/index.ts";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA offshoot-router-imports FOR express/init
import { create__OffshootName__Router } from "@saflib/base-__offshoot-name__-http";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler
    { kind: "router", createRouter: create__GroupName__Router },
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA offshoot-router-mounts FOR express/init
    { kind: "router", createRouter: create__OffshootName__Router },
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA jobs-router FOR jobs/init
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA cron-router FOR cron/init
// END WORKFLOW AREA
