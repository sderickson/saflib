// Shared mock data for __group-name__ fake handlers.
//
// All fake handlers in this group should import mock data arrays from this
// file so that operations affect one another (e.g. create adds to the array,
// so subsequent list queries return the new resource).
//
// These arrays are re-exported from the root fakes.ts, so tests in other
// packages can import them to set up and verify backend state:
//
//   import { mock__GroupName__ } from "package-name/fakes";

// BEGIN SORTED WORKFLOW AREA mock-arrays FOR sdk/add-query sdk/add-mutation
// END WORKFLOW AREA
