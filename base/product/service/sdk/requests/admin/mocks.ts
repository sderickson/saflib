import type { KratosIdentity } from "@saflib/base-spec/schemas/KratosIdentity";

export const mockKratosIdentities: KratosIdentity[] = [
  {
    id: "22222222-2222-2222-2222-222222222222",
    schema_id: "default",
    traits: { email: "lookup-user@example.com" },
    state: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  },
];

const initialMockKratosIdentities = JSON.parse(
  JSON.stringify(mockKratosIdentities),
) as KratosIdentity[];

/** Restore mock identities. Call from tests (e.g. afterEach) if they mutate the mocks. */
export function resetMocks(): void {
  mockKratosIdentities.length = 0;
  mockKratosIdentities.push(
    ...JSON.parse(JSON.stringify(initialMockKratosIdentities)),
  );
}
