/**
 * Invite Repository
 *
 * Firestore CRUD for the /invites collection.
 * Used by InviteService for business logic; screens never import this directly.
 */

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, withMetadata } from './baseRepository';
import type { Invite, InviteRole } from './types';

/**
 * Create a new invite document.
 * Returns the generated invite ID.
 */
export async function createInvite(
  operatorId: string,
  operatorName: string,
  role: InviteRole,
  code: string,
  expiresAt: Date,
): Promise<string> {
  const inviteRef = doc(collection(db, 'invites'));
  const data = withMetadata(
    {
      operatorId,
      operatorName,
      role,
      code,
      status: 'pending',
      expiresAt: Timestamp.fromDate(expiresAt),
    } as Record<string, unknown>,
    ['operatorId', 'operatorName', 'role', 'code'],
  );
  await setDoc(inviteRef, data);
  return inviteRef.id;
}

/**
 * Resolve a deep-link invite code to an Invite document.
 * Returns null if no pending invite matches.
 */
export async function getInviteByCode(code: string): Promise<Invite | null> {
  const q = query(
    collection(db, 'invites'),
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Invite;
}

/**
 * Get a single invite by its document ID.
 */
export async function getInviteById(inviteId: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, 'invites', inviteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invite;
}

/**
 * Mark an invite as accepted.
 */
export async function acceptInviteDoc(
  inviteId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), {
    status: 'accepted',
    acceptedBy: userId,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Revoke a pending invite.
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), {
    status: 'revoked',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all invites for a given operator.
 */
export async function getInvitesByOperator(
  operatorId: string,
): Promise<Invite[]> {
  const q = query(
    collection(db, 'invites'),
    where('operatorId', '==', operatorId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invite));
}

/**
 * Listen to invites for an operator in real-time.
 */
export function onInvitesSnapshot(
  operatorId: string,
  onData: (invites: Invite[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'invites'),
    where('operatorId', '==', operatorId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const invites = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Invite),
      );
      onData(invites);
    },
    (err) => {
      console.error('[inviteRepository] onInvitesSnapshot error:', err);
      onError?.(err);
    },
  );
}

/**
 * Check if a short invite code already exists in the system.
 */
export async function checkCodeExists(code: string): Promise<boolean> {
  const q = query(
    collection(db, 'invites'),
    where('code', '==', code.toUpperCase()),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
