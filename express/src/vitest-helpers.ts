let mockCounter = 0;

export function makeUserHeaders(
  userId: string = `${mockCounter++}`,
  email: string = `user${mockCounter}@example.com`,
): Record<string, string> {
  return {
    "x-user-id": userId,
    "x-user-email": email,
    "x-user-email-verified": "true",
    "x-user-is-admin": "false",
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
    "x-user-is-admin": "true",
    "x-requested-with": "XMLHttpRequest",
  };
}
