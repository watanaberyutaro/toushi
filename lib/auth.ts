import { SignJWT, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "ai-trading-assistant-secret-key-change-in-production"
);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

// ---- Supabase clients (server-side only) ----

function getAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ---- User operations ----

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<SessionUser> {
  const admin = getServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  return { id: data.user.id, name, email: data.user.email! };
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const client = getAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    name: (data.user.user_metadata?.name as string) || "",
    email: data.user.email!,
  };
}

// ---- JWT ----

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "auth_token";
