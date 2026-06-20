/**
 * useAcceptInvite — Registration-side invite resolution hook
 *
 * Used during parent/driver registration to resolve an incoming
 * deep-link invite code and pre-fill the operator binding.
 */

import { useState, useEffect } from 'react';
import {
  resolveInviteCode,
  acceptInvite,
  type ResolvedInvite,
} from '../services/invites/InviteService';
import type { InviteRole } from '../repositories/types';

interface UseAcceptInviteReturn {
  /** Resolved invite details (null if no invite or not yet resolved) */
  resolvedInvite: ResolvedInvite | null;
  /** True while resolving the invite code */
  resolving: boolean;
  /** Error message if resolution fails */
  error: string | null;
  /** Accept the resolved invite during registration */
  accept: (userId: string, role: InviteRole) => Promise<{ operatorId: string; operatorName: string }>;
}

/**
 * @param inviteCode - The short code extracted from the deep-link URL
 */
export function useAcceptInvite(inviteCode: string | null): UseAcceptInviteReturn {
  const [resolvedInvite, setResolvedInvite] = useState<ResolvedInvite | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteCode) {
      setResolvedInvite(null);
      setResolving(false);
      return;
    }

    let mounted = true;
    setResolving(true);
    setError(null);

    resolveInviteCode(inviteCode)
      .then((result) => {
        if (mounted) {
          setResolvedInvite(result);
          if (!result) {
            setError('This invite link is invalid or has expired.');
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('[useAcceptInvite] Resolution error:', err);
          setError('Failed to resolve invite');
        }
      })
      .finally(() => {
        if (mounted) setResolving(false);
      });

    return () => {
      mounted = false;
    };
  }, [inviteCode]);

  const handleAccept = async (
    userId: string,
    role: InviteRole,
  ): Promise<{ operatorId: string; operatorName: string }> => {
    if (!resolvedInvite) {
      throw new Error('No invite to accept');
    }
    return acceptInvite(resolvedInvite.inviteId, userId, role);
  };

  return {
    resolvedInvite,
    resolving,
    error,
    accept: handleAccept,
  };
}
