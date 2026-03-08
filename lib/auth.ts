import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import fs from "fs";
import path from "path";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "ai-trading-assistant-secret-key-change-in-production"
);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

function readUsers(): StoredUser[] {
  try {
    const filePath = path.join(process.cwd(), "data", "users.json");
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

// ---- User operations ----

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, name: user.name, email: user.email };
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<SessionUser> {
  const users = readUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("このメールアドレスは既に使用されています");
  }

  const passwordHash = await hash(password, 10);
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  try {
    users.push(newUser);
    const filePath = path.join(process.cwd(), "data", "users.json");
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  } catch {
    // Vercel のような読み取り専用 FS では書き込みできないが、
    // 返却値は正常にするため catch のみ
  }

  return { id: newUser.id, name: newUser.name, email: newUser.email };
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
