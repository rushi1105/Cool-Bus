// Incremental route update script — Phase 1.6B
// Creates/updates routes for operators that are missing them.
// Idempotent: safe to run multiple times.
// Preserves: users, operators, buses, assignments, trips, students, fees, coupons, alerts, notifications.
//
// Usage: node scripts/updateRoutes.js

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SCHEMA_VERSION = 3;

// Route definitions indexed by operatorId
// Only add routes IF the operator exists AND has no routes yet
const ROUTE_DEFS = {
  'operator-sanskruti': [
    {
      id: 'route-ambernath-carmel-sanskruti',
      name: 'Ambernath → Carmel',
      description: 'Ambernath to Carmel Convent High School (Sanskruti)',
      stops: [
        { order: 0, name: 'Ambernath Station East', latitude: 19.183022, longitude: 73.192509, landmark: 'Near Railway Station' },
        { order: 1, name: 'Shivaji Chowk', latitude: 19.183501, longitude: 73.195362, landmark: 'Shivaji Statue' },
        { order: 2, name: 'Mohan Palms', latitude: 19.182963, longitude: 73.197403, landmark: 'Near Hotel Sai Palace' },
        { order: 3, name: 'Carmel Convent High School', latitude: 19.178706, longitude: 73.185620, landmark: 'Main Gate' },
      ],
    },
    {
      id: 'route-shivaji-carmel-sanskruti',
      name: 'Shivaji Chowk → Carmel',
      description: 'Shivaji Chowk to Carmel Convent High School (Sanskruti)',
      stops: [
        { order: 0, name: 'Shivaji Chowk', latitude: 19.183501, longitude: 73.195362, landmark: 'Shivaji Statue' },
        { order: 1, name: 'Mohan Palms', latitude: 19.182963, longitude: 73.197403, landmark: 'Near Hotel Sai Palace' },
        { order: 2, name: 'Carmel Convent High School', latitude: 19.178706, longitude: 73.185620, landmark: 'Main Gate' },
      ],
    },
    {
      id: 'route-mohan-carmel-sanskruti',
      name: 'Mohan Palms → Carmel',
      description: 'Mohan Palms to Carmel Convent High School (Sanskruti)',
      stops: [
        { order: 0, name: 'Mohan Palms', latitude: 19.182963, longitude: 73.197403, landmark: 'Near Hotel Sai Palace' },
        { order: 1, name: 'Carmel Convent High School', latitude: 19.178706, longitude: 73.185620, landmark: 'Main Gate' },
      ],
    },
  ],
  'operator-akhilesh': [
    {
      id: 'route-ambernath-carmel',
      name: 'Ambernath → Carmel',
      description: 'Ambernath to Carmel Convent High School (Akhilesh)',
      stops: [
        { order: 0, name: 'Ambernath Station East', latitude: 19.183022, longitude: 73.192509, landmark: 'Near Railway Station' },
        { order: 1, name: 'Shivaji Chowk', latitude: 19.183501, longitude: 73.195362, landmark: 'Shivaji Statue' },
        { order: 2, name: 'Mohan Palms', latitude: 19.182963, longitude: 73.197403, landmark: 'Near Hotel Sai Palace' },
        { order: 3, name: 'Carmel Convent High School', latitude: 19.178706, longitude: 73.185620, landmark: 'Main Gate' },
      ],
    },
    {
      id: 'route-shivaji-carmel',
      name: 'Shivaji Chowk → Carmel',
      description: 'Shivaji Chowk to Carmel Convent High School (Akhilesh)',
      stops: [
        { order: 0, name: 'Shivaji Chowk', latitude: 19.183501, longitude: 73.195362, landmark: 'Shivaji Statue' },
        { order: 1, name: 'Mohan Palms', latitude: 19.182963, longitude: 73.197403, landmark: 'Near Hotel Sai Palace' },
        { order: 2, name: 'Carmel Convent High School', latitude: 19.178706, longitude: 73.185620, landmark: 'Main Gate' },
      ],
    },
    {
      id: 'route-mohan-carmel',
      name: 'Mohan Palms → Carmel',
      description: 'Mohan Palms to Carmel Convent High School (Akhilesh)',
      stops: [
        { order: 0, name: 'Mohan Palms', latitude: 19.182963, longitude: 73.197403, landmark: 'Near Hotel Sai Palace' },
        { order: 1, name: 'Carmel Convent High School', latitude: 19.178706, longitude: 73.185620, landmark: 'Main Gate' },
      ],
    },
  ],
};

async function operatorExists(operatorId) {
  const snap = await getDoc(doc(db, 'operators', operatorId));
  return snap.exists();
}

async function hasRoutes(operatorId) {
  const q = query(collection(db, 'routes'), where('operatorId', '==', operatorId));
  const snap = await getDocs(q);
  return !snap.empty;
}

async function updateRoutes() {
  console.log('🔍 Checking operators and routes...\n');

  for (const [operatorId, routes] of Object.entries(ROUTE_DEFS)) {
    const exists = await operatorExists(operatorId);
    if (!exists) {
      console.log(`  ⏭️  ${operatorId} — operator not found, skipping`);
      continue;
    }

    const hasR = await hasRoutes(operatorId);
    if (hasR) {
      console.log(`  ✅ ${operatorId} — already has routes, skipping`);
      continue;
    }

    console.log(`  📝 ${operatorId} — creating ${routes.length} routes...`);
    for (const route of routes) {
      await setDoc(doc(db, 'routes', route.id), {
        operatorId,
        name: route.name,
        description: route.description,
        stops: route.stops,
        totalDistance: 0,
        estimatedDuration: 0,
        isActive: true,
        schemaVersion: SCHEMA_VERSION,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`    ✓ routes/${route.id}`);
    }
  }

  console.log('\n✅ Route update complete');
}

updateRoutes().catch(err => {
  console.error('❌ Update failed:', err);
  process.exit(1);
});
