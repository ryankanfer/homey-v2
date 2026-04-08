/**
 * Signed JWT preview tokens for the agent invitation teaser page.
 *
 * Scope: non-sensitive buyer fields only (territory, budget tier, timeline).
 * Does NOT include: readiness score, fear context, full name, vault.
 * Expiry: 48 hours. Single-use enforcement is out of scope for Phase 1.
 */
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.PREVIEW_TOKEN_SECRET ?? 'dev-preview-secret-change-in-prod',
);

export interface PreviewPayload {
  clientId: string;
  territory: string[];
  budgetTier: string;
  timeline: string;
  mode: 'Buy' | 'Rent';
}

export async function signPreviewToken(payload: PreviewPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('48h')
    .setIssuedAt()
    .sign(secret);
}

export async function verifyPreviewToken(token: string): Promise<PreviewPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as PreviewPayload;
  } catch {
    return null;
  }
}
