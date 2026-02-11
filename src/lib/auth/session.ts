// Stub — real implementation in Step 2

export type Session = {
  userId?: string;
  role?: string;
};

export async function getSession(): Promise<Session | null> {
  return null;
}

export async function login(_username: string, _password: string) {
  throw new Error("login not implemented yet (Step 2)");
}

export async function logout() {
  throw new Error("logout not implemented yet (Step 2)");
}
