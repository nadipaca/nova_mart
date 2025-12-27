import { createHmac } from "crypto";

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signJwtHS256(params: {
  secret: string;
  issuer: string;
  audience: string;
  subject: string;
  expiresInSeconds: number;
  claims?: Record<string, unknown>;
}): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    iss: params.issuer,
    aud: params.audience,
    sub: params.subject,
    iat: nowSeconds,
    exp: nowSeconds + params.expiresInSeconds,
    ...(params.claims ?? {}),
  };

  const header = { alg: "HS256", typ: "JWT" } as const;
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const signature = createHmac("sha256", params.secret)
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

