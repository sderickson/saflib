// Export your public API from here
export const greet = (name: string): string => `Hello, ${name}!`;

export const meaningOfLife = 42;

// BEGIN WORKFLOW AREA exports FOR monorepo/add-export
export { __targetName__ } from "./__target-name__.ts";
// END WORKFLOW AREA
