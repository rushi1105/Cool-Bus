/**
 * useInvites — Operator invite management hook
 *
 * Provides real-time invite listing, generation, and revocation
 * for the operator's InviteManager screen.
 */

import { useState, useEffect, useCallback } from 'react';
import { onInvitesSnapshot } from '../repositories/inviteRepository';
import {
  generateInvite,
  revokeInvite,
} from '../services/invites/InviteService';
import type { Invite, InviteRole } from '../repositories/types';

interface UseInvitesReturn {
  /** All invites for this operator */
  invites: Invite[];
  /** True during initial load */
  loading: boolean;
  /** Error message if snapshot fails */
  error: string | null;
  /** Generate a new invite link */
  generate: (role: InviteRole) => Promise<{ code: string; deepLink: string }>;
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

    const unsubscribe = onInvitesSnapshot(
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

    return () => unsubscribe();
  }, [operatorId]);

  const generate = useCallback(
    async (role: InviteRole) => {
      if (!operatorId) {
        throw new Error('No operator ID available');
      }
      setGenerating(true);
      try {
        const result = await generateInvite(operatorId, operatorName, role);
        return { code: result.code, deepLink: result.deepLink };
      } finally {
        setGenerating(false);
      }
    },
    [operatorId, operatorName],
  );

  const revoke = useCallback(async (inviteId: string) => {
    await revokeInvite(inviteId);
  }, []);

  return { invites, loading, error, generate, revoke, generating };
}
