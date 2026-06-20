#!/usr/bin/env node
/**
 * migrateBusesToRoutes.js
 *
 * One-time migration script for Phase 2B.
 * Extracts legacy embedded `stops[]` from /buses documents into standalone
 * /routes documents, sets `bus.defaultRouteId`, and removes `stops[]` from
 * the bus document.
 *
 * Prerequisites:
 *   1. `npm install firebase-admin`
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS or have a service-account JSON.
 *   3. Run: node scripts/migrateBusesToRoutes.js
 */

const admin = require('firebase-admin');

// ---------------------------------------------------------------------------
// Initialize Firebase Admin
// ---------------------------------------------------------------------------
// Option A: Set GOOGLE_APPLICATION_CREDENTIALS env var to your SA key path.
// Option B: Inline a service-account object below (not recommended for committed code).
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('[migrate] Firebase Admin initialized (application default).');
  } catch (err) {
    console.error('[migrate] Failed to initialize Firebase Admin.', err.message);
    console.error('[migrate]   Set GOOGLE_APPLICATION_CREDENTIALS or pass a service account.');
    process.exit(1);
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
async function migrate() {
  const busesSnap = await db.collection('buses').get();
  const totalBuses = busesSnap.size;
  console.log(`[migrate] Found ${totalBuses} bus(es).`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const busDoc of busesSnap.docs) {
    const bus = { id: busDoc.id, ...busDoc.data() };

    // Skip buses without embedded stops
    if (!bus.stops || !Array.isArray(bus.stops) || bus.stops.length === 0) {
      console.log(`[migrate]   Skipping bus "${bus.busNumber}" — no embedded stops.`);
      skippedCount++;
      continue;
    }

    // Skip if already migrated (defaultRouteId set)
    if (bus.defaultRouteId) {
      console.log(`[migrate]   Skipping bus "${bus.busNumber}" — already has defaultRouteId.`);
      skippedCount++;
      continue;
    }

    console.log(`[migrate]   Migrating bus "${bus.busNumber}" (${bus.stops.length} stops)...`);

    // Create a route from the embedded stops
    const routeData = {
      operatorId: bus.operatorId,
      name: `${bus.busNumber} — Legacy Route`,
      stops: bus.stops.map((s, i) => ({
        id: s.id || `legacy-${bus.id}-${i}`,
        name: s.name || `Stop ${i + 1}`,
        latitude: s.latitude,
        longitude: s.longitude,
        landmark: s.landmark || null,
        address: s.address || null,
      })),
      version: 1,
      isActive: true,
      schemaVersion: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const routeRef = await db.collection('routes').add(routeData);
    console.log(`[migrate]     Created route "${routeData.name}" (${routeRef.id})`);

    // Update the bus: set defaultRouteId, remove stops[]
    await db.collection('buses').doc(bus.id).update({
      defaultRouteId: routeRef.id,
      stops: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[migrate]     Updated bus "${bus.busNumber}" -> defaultRouteId set, stops removed.`);
    migratedCount++;
  }

  console.log(`[migrate] Done. ${migratedCount} bus(es) migrated, ${skippedCount} skipped.`);
}

migrate().catch((err) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});
