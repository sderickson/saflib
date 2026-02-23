// Shared mock data for __group-name__ fake handlers.
//
// All fake handlers in this group (and perhaps other groups) should use the shared mock array from this
// file so that operations affect one another (e.g. create adds to the array,
// so subsequent list queries return the new resource).
//
// Export resetMocks() so tests that mutate this array can restore initial state (e.g. in afterEach).

export const mock__GroupName__ = []; // TODO: import and use the appropriate type from the spec package

const initialMock__GroupName__ = JSON.parse(JSON.stringify(mock__GroupName__));

/** Restore mock array to its initial state. Call from tests (e.g. afterEach) if they mutate the mocks. */
export function resetMocks(): void {
  mock__GroupName__.length = 0;
  mock__GroupName__.push(...JSON.parse(JSON.stringify(initialMock__GroupName__)));
}
