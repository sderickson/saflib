// TODO: Export all Tanstack functions, Vue components, and other shared code used in production
// Since these packages can be large and shared, it's important to export everything independently,
// rather than grouping them in an object and exporting that object, so they can be properly tree-shaken.

// BEGIN SORTED WORKFLOW AREA query-group-exports FOR sdk/add-query sdk/add-mutation
export * from "./requests/__group-name__/index.ts";
// END WORKFLOW AREA

// BEGIN SORTED WORKFLOW AREA component-exports FOR sdk/add-component
export * from "./__prefix-name__/__target-name__/__TargetName__.vue";
// END WORKFLOW AREA
