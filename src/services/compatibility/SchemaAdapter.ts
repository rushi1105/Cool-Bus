/**
 * SchemaAdapter — Compatibility Layer
 *
 * Bridges old and new data schemas during the migration from mock data
 * to real Firestore. Isolates deprecated logic so the rest of the codebase
 * can be cleaned without breaking screens that still depend on the old shape.
 *
 * Lifecycle:
 * 1. Created in Phase 2D.0 with all needed translations.
 * 2. Each adapter method is emptied as its consumers migrate.
 * 3. Deleted entirely after Phase 2D completes.
 *
 * Every adapter method logs a deprecation warning when called.
 */

import type { Bus, Assignment, RouteStop } from '../../repositories/types';

// ─── Deprecation Warning ──────────────────────────────────────────────

const warned = new Set<string>();

function warnDeprecated(method: string): void {
  if (!warned.has(method)) {
    warned.add(method);
    console.warn(
      `[SchemaAdapter] DEPRECATED: ${method}() — migrate consumer to use the new data path.`,
    );
  }
}

// ─── Bus → Route Stop Extraction ──────────────────────────────────────

/**
 * Extract embedded stops from a legacy bus document.
 * Legacy buses stored stops[] directly; modern buses reference a routeId.
 */
export function busToRouteStops(bus: Bus & { stops?: RouteStop[] }): RouteStop[] {
  warnDeprecated('busToRouteStops');
  return bus.stops ?? [];
}

// ─── Bus → Assignment Resolution ──────────────────────────────────────

/**
 * Resolve driverId from a bus document.
 * Legacy: bus.driverId
 * Modern: resolved via /assignments query
 */
export function resolveDriverId(bus: Bus & { assignedDriverId?: string }): string {
  warnDeprecated('resolveDriverId');
  return bus.assignedDriverId ?? bus.driverId ?? '';
}

// ─── Operator Array Fields ────────────────────────────────────────────

/**
 * Legacy operators store busIds[] and driverIds[] directly on the document.
 * Modern approach queries /buses and /users by operatorId.
 * This adapter returns the embedded arrays for backward compat.
 */
export function getOperatorBusIds(
  operator: { busIds?: string[] },
): string[] {
  warnDeprecated('getOperatorBusIds');
  return operator.busIds ?? [];
}

export function getOperatorDriverIds(
  operator: { driverIds?: string[] },
): string[] {
  warnDeprecated('getOperatorDriverIds');
  return operator.driverIds ?? [];
}

// ─── Schema Version Normalization ─────────────────────────────────────

/**
 * Normalize schemaVersion across documents.
 * Some legacy docs have version 1, 2, 3, or undefined.
 * Returns the normalized version number.
 */
export function normalizeSchemaVersion(doc: { schemaVersion?: number }): number {
  warnDeprecated('normalizeSchemaVersion');
  return doc.schemaVersion ?? 1;
}

// ─── User Role Helpers ────────────────────────────────────────────────

/**
 * Check if a user has a specific role, considering both the legacy
 * single-role field and the new roles[] array.
 */
export function userHasRole(
  user: { role: string; roles?: string[] },
  targetRole: string,
): boolean {
  // No deprecation warning — this is the transition helper, not a legacy shim
  if (user.roles && user.roles.includes(targetRole)) {
    return true;
  }
  return user.role === targetRole;
}
