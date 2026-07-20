import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

const DEFAULT_TOKEN_SECRET = "fizzion-social-dev-secret-change-me";
const DEFAULT_APP_BASE_URL = "http://localhost:3000";

function getEncryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || process.env.SESSION_ENCRYPTION_KEY || DEFAULT_TOKEN_SECRET;
  return createHash("sha256").update(raw).digest();
}

function getStateSigningKey() {
  const raw = process.env.NEXTAUTH_SECRET || process.env.SESSION_ENCRYPTION_KEY || DEFAULT_TOKEN_SECRET;
  return createHash("sha256").update(`social-state:${raw}`).digest();
}

export function encryptSocialToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptSocialToken(value: string) {
  const [ivHex, tagHex, cipherHex] = value.split(".");
  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error("Invalid encrypted token format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function buildAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_APP_BASE_URL
  ).replace(/\/$/, "");
}

export function buildSignedOAuthState(payload: {
  provider: string;
  mode: "live" | "sandbox";
  accountInput: string;
}) {
  const nonce = randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString();
  const body = JSON.stringify({
    ...payload,
    nonce,
    expiresAt,
  });

  const signature = createHash("sha256")
    .update(Buffer.concat([getStateSigningKey(), Buffer.from(body, "utf8")]))
    .digest("hex");

  return {
    token: Buffer.from(JSON.stringify({ body, signature }), "utf8").toString("base64url"),
    expiresAt,
  };
}

export function verifySignedOAuthState(token: string) {
  const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
    body: string;
    signature: string;
  };
  const expected = createHash("sha256")
    .update(Buffer.concat([getStateSigningKey(), Buffer.from(decoded.body, "utf8")]))
    .digest("hex");

  if (decoded.signature !== expected) {
    throw new Error("OAuth state signature is invalid.");
  }

  const payload = JSON.parse(decoded.body) as {
    provider: string;
    mode: "live" | "sandbox";
    accountInput: string;
    nonce: string;
    expiresAt: string;
  };

  if (new Date(payload.expiresAt).getTime() < Date.now()) {
    throw new Error("OAuth state has expired.");
  }

  return payload;
}

export async function persistOAuthState(input: {
  provider: string;
  mode: "live" | "sandbox";
  accountInput: string;
  organizationId?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const state = buildSignedOAuthState({
    provider: input.provider,
    mode: input.mode,
    accountInput: input.accountInput,
  });

  await supabase.from("social_oauth_states").insert({
    organization_id: input.organizationId ?? null,
    provider: input.provider,
    state_token: state.token,
    mode: input.mode,
    redirect_uri: `${buildAppBaseUrl()}/social/oauth/callback/${input.provider}`,
    expires_at: state.expiresAt,
    metadata_json: {
      accountInput: input.accountInput,
    },
  });

  return state;
}

export async function consumeOAuthState(stateToken: string) {
  const supabase = getSupabaseAdminClient();
  const verified = verifySignedOAuthState(stateToken);
  const lookup = await supabase
    .from("social_oauth_states")
    .select("*")
    .eq("state_token", stateToken)
    .limit(1)
    .maybeSingle();

  if (!lookup.data) {
    throw new Error("OAuth state record was not found.");
  }

  if (lookup.data.used_at) {
    throw new Error("OAuth state has already been used.");
  }

  await supabase
    .from("social_oauth_states")
    .update({
      used_at: new Date().toISOString(),
    })
    .eq("id", lookup.data.id);

  return {
    ...verified,
    organizationId: lookup.data.organization_id as string | null,
    metadata: (lookup.data.metadata_json ?? {}) as Record<string, unknown>,
  };
}
