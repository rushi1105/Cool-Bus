/**
 * useInvites — Operator invite management hook
 *
 * Provides real-time invite listing, generation, and revocation
 * for the operator's InviteManager screen.
 */

import { useState, useEffect, useCallback } from 'react';
import { onInvitesSnapshot, onInviteAcceptancesSnapshot } from '../repositories/inviteRepository';
import {
  getPermanentInvite,
  regenerateInvite,
  revokeInvite,
} from '../services/invites/InviteService';
import type { Invite, InviteRole, InviteAcceptance } from '../repositories/types';

interface UseInvitesReturn {
  /** All invites for this operator */
  invites: Invite[];
  /** Historical acceptances for these invites */
  acceptances: InviteAcceptance[];
  /** True during initial load */
  loading: boolean;
  /** Error message if snapshot fails */
  error: string | null;
  /** Get or create a permanent invite link */
  getPermanent: (role: InviteRole) => Promise<{ code: string; deepLink: string; inviteId: string }>;
  /** Explicitly regenerate a permanent invite link (revoking the old one) */
  regeneratePermanent: (role: InviteRole, oldInviteId?: string) => Promise<{ code: string; deepLink: string }>;
  /** Revoke a pending invite */
  revoke: (inviteId: string) => Promise<void>;
  /** True while generating an invite */
  generating: boolean;
}

export function useInvites(
  operatorId: string | null,
  operatorName: string,
): UseInvitesReturn {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [acceptances, setAcceptances] = useState<InviteAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!operatorId) {
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribeInvites = onInvitesSnapshot(
      operatorId,
      (data) => {
        setInvites(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useInvites] Snapshot error:', err);
        setError('Failed to load invites');
        setLoading(false);
      },
    );

    const unsubscribeAcceptances = onInviteAcceptancesSnapshot(
      operatorId,
      (data) => {
        setAcceptances(data);
      },
      (err) => {
        console.error('[useInvites] Acceptances snapshot error:', err);
      }
    );

    return () => {
      unsubscribeInvites();
      unsubscribeAcceptances();
    };
  }, [operatorId]);

  const getPermanent = useCallback(
    async (role: InviteRole) => {
      if (!operatorId) {
        throw new Error('No operator ID available');
      }
      setGenerating(true);
      try {
        return await getPermanentInvite(operatorId, operatorName, role);
      } finally {
        setGenerating(false);
      }
    },
    [operatorId, operatorName],
  );

  const regeneratePermanent = useCallback(
    async (role: InviteRole, oldInviteId?: string) => {
      if (!operatorId) {
        throw new Error('No operator ID available');
      }
      setGenerating(true);
      try {
        return await regenerateInvite(operatorId, operatorName, role, oldInviteId);
      } finally {
        setGenerating(false);
      }
    },
    [operatorId, operatorName],
  );

  const revoke = useCallback(async (inviteId: string) => {
    await revokeInvite(inviteId);
  }, []);

  return { invites, acceptances, loading, error, getPermanent, regeneratePermanent, revoke, generating };
}
