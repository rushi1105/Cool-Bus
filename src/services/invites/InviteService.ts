/**
 * InviteService — Invite business logic
 *
 * Handles invite generation, validation, acceptance, and revocation.
 * Uses inviteRepository for Firestore persistence.
 * Screens consume this via useInvites / useAcceptInvite hooks.
 */

import * as Crypto from 'expo-crypto';
import {
  createInvite,
  getInviteByCode,
  getInviteById,
  acceptInviteDoc,
  revokeInvite as revokeInviteDoc,
  checkCodeExists,
} from '../../repositories/inviteRepository';
import type { Invite, InviteRole } from '../../repositories/types';

// ─── Constants ────────────────────────────────────────────────────────

/** Default invite expiry: 7 days */
const DEFAULT_EXPIRY_DAYS = 7;

/** Short code length for deep-link path */
const CODE_LENGTH = 6;

/** Maximum retries for generating a unique code */
const MAX_CODE_RETRIES = 5;

// ─── Code Generation ──────────────────────────────────────────────────

/**
 * Generate a short unique alphanumeric code for the invite deep-link.
 * Checks Firestore for collisions and retries up to MAX_CODE_RETRIES.
 */
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const uuid = Crypto.randomUUID();
    const code = uuid.replace(/-/g, '').slice(0, CODE_LENGTH).toUpperCase();
    const exists = await checkCodeExists(code);
    if (!exists) return code;
  }
  // Extremely unlikely fallback: use full UUID prefix
  return Crypto.randomUUID().replace(/-/g, '').slice(0, CODE_LENGTH + 2).toUpperCase();
}

// ─── Invite Generation ───────────────────────────────────────────────

/**
 * Generate a new invite link for a parent or driver.
 * Returns the created Invite with its code and deep-link URL.
 */
export async function generateInvite(
  operatorId: string,
  operatorName: string,
  role: InviteRole,
): Promise<{ inviteId: string; code: string; deepLink: string }> {
  if (!operatorId || !operatorName) {
    throw new Error('operatorId and operatorName are required to generate an invite');
  }

  const code = await generateUniqueCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

  const inviteId = await createInvite(
    operatorId,
    operatorName,
    role,
    code,
    expiresAt,
  );

  const deepLink = `coolbus://invite/${code}`;

  return { inviteId, code, deepLink };
}

// ─── Invite Resolution ───────────────────────────────────────────────

export interface ResolvedInvite {
  inviteId: string;
  operatorId: string;
  operatorName: string;
  role: InviteRole;
}

/**
 * Resolve an invite code from a deep-link.
 * Returns the resolved invite details or null if invalid/expired/revoked.
 */
export async function resolveInviteCode(
  code: string,
): Promise<ResolvedInvite | null> {
  if (!code) return null;

  const invite = await getInviteByCode(code);
  if (!invite) return null;

  // Check expiry
  if (invite.expiresAt) {
    const expiryDate = invite.expiresAt.toDate
      ? invite.expiresAt.toDate()
      : new Date(invite.expiresAt);
    if (expiryDate < new Date()) {
      return null;
    }
  }

  return {
    inviteId: invite.id,
    operatorId: invite.operatorId,
    operatorName: invite.operatorName,
    role: invite.role,
  };
}

// ─── Invite Acceptance ───────────────────────────────────────────────

/**
 * Accept an invite. Validates that:
 * 1. The invite exists and is pending.
 * 2. The invite has not expired.
 * 3. The invite role matches the registration role.
 *
 * Throws on validation failure.
 */
export async function acceptInvite(
  inviteId: string,
  userId: string,
  registrationRole: InviteRole,
): Promise<{ operatorId: string; operatorName: string }> {
  const invite = await getInviteById(inviteId);

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.status !== 'pending') {
    throw new Error(`Invite has already been ${invite.status}`);
  }

  // Check expiry
  if (invite.expiresAt) {
    const expiryDate = invite.expiresAt.toDate
      ? invite.expiresAt.toDate()
      : new Date(invite.expiresAt);
    if (expiryDate < new Date()) {
      throw new Error('Invite has expired');
    }
  }

  // Role mismatch check
  if (invite.role !== registrationRole) {
    throw new Error(
      `This invite is for a ${invite.role}, but you are registering as a ${registrationRole}`,
    );
  }

  await acceptInviteDoc(inviteId, userId);

  return {
    operatorId: invite.operatorId,
    operatorName: invite.operatorName,
  };
}

// ─── Invite Revocation ───────────────────────────────────────────────

/**
 * Revoke a pending invite. Only pending invites can be revoked.
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  const invite = await getInviteById(inviteId);

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.status !== 'pending') {
    throw new Error(`Cannot revoke an invite that is ${invite.status}`);
  }

  await revokeInviteDoc(inviteId);
}
