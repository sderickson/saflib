let mockCounter = 0;

export function makeUserHeaders(
  userId: string = `${mockCounter++}`,
  email: string = `user${mockCounter}@example.com`,
): Record<string, string> {
  return {
    "x-user-id": userId,
    "x-user-email": email,
    "x-user-email-verified": "true",
    "x-user-scopes": "none",
    "x-requested-with": "XMLHttpRequest",
  };
}

export function makeAdminHeaders(
  userId: string = `${mockCounter++}`,
  email: string = `admin${mockCounter}@example.com`,
): Record<string, string> {
  return {
    "x-user-id": userId,
    "x-user-email": email,
    "x-user-email-verified": "true",
    "x-user-scopes": "*",
    "x-requested-with": "XMLHttpRequest",
  };
}
