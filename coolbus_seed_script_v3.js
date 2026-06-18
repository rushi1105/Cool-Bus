const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, serverTimestamp, Timestamp } = require('firebase/firestore');

// ============================================
// CoolBus Firestore Seed Script (ARCHITECTURE_v3)
// ============================================
// Run this in a Node.js environment with Firebase Admin SDK
// or use Firebase Console to import.
//
// IMPORTANT: This script is IDEMPOTENT. Running it multiple times
// will overwrite with the same data (same IDs), not duplicate.
//
// BEFORE RUNNING: Ensure your Firebase project is ready.
// AFTER RUNNING: Update your React Native app to use the new schema.
//
// Changes from v2 → v3:
//  - Dates stored as Timestamps (not strings)
//  - Stops have IDs (stop-XXX) for stable references
//  - Routes have version field
//  - Buses have activeAssignmentId, activeTripId, enriched GPS fields, and refined statuses
//  - Assignments use updated status vocabulary (assigned→accepted→started→completed→cancelled)
//  - Assignments store direction (pickup | drop)
//  - Trips store both routeSnapshot and assignmentSnapshot
//  - Drivers have availability field
//  - Students use stopId instead of stopOrder
//  - SCHEMA_VERSION constant used throughout
//  - Edge-case seeds added (maintenance bus, on_leave driver, cancelled assignment, etc.)
// ============================================

// Single source of truth for schema version
const SCHEMA_VERSION = 3;

// Firebase config - REPLACE with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyC0S9-Qm_lbhcDZrvalUMDxraM44ksSU9E",
  authDomain: "coolbus-1db23.firebaseapp.com",
  projectId: "coolbus-1db23",
  storageBucket: "coolbus-1db23.firebasestorage.app",
  messagingSenderId: "216763252688",
  appId: "1:216763252688:web:ccbfce5773732f982043d5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper: convert a JS Date to a Firestore Timestamp
// Use this for all date fields so queries like where("date", ">=", startOfToday) work correctly
function toTimestamp(date) {
  return Timestamp.fromDate(date);
}

// ============================================
// 1. ROUTE DEFINITIONS (extracted from buses)
// ============================================
// Each route has embedded stops with stable IDs.
// Stops use { id, order, name, landmark, latitude, longitude }.
// Students and other docs reference stopId, never stopOrder —
// so inserting a stop never invalidates existing references.
// Routes carry a version field so trip snapshots can record which
// version of the route was in use.

const routes = {
  "route-ambernath-carmel": {
    schemaVersion: SCHEMA_VERSION,
    version: 1,  // Increment when operator edits the route; trips can snapshot routeVersion
    operatorId: "operator-akhilesh",
    name: "Ambernath → Carmel",
    description: "From Ambernath Railway Station area to Carmel Convent High School via Badlapur",
    stops: [
      { id: "stop-amb-001", order: 1, name: "Oyo Hotel Amber", landmark: "Oyo Hotel Amber", latitude: 19.2143126, longitude: 73.18386373 },
      { id: "stop-amb-002", order: 2, name: "Frozen Bottle", landmark: "Frozen Bottle", latitude: 19.21312472, longitude: 73.18420705 },
      { id: "stop-amb-003", order: 3, name: "Hutatma Chowk", landmark: "Hutatma Chowk", latitude: 19.20917981, longitude: 73.18236705 },
      { id: "stop-amb-004", order: 4, name: "Fitness House", landmark: "Fitness House", latitude: 19.20610104, longitude: 73.18280841 },
      { id: "stop-amb-005", order: 5, name: "Swami Samarth Chowk", landmark: "Swami Samarth Chowk", latitude: 19.20429584, longitude: 73.18180559 },
      { id: "stop-amb-006", order: 6, name: "Shipra's Restaurant", landmark: "Shipra's Restaurant", latitude: 19.20391125, longitude: 73.18255385 },
      { id: "stop-amb-007", order: 7, name: "Jagrut Galli", landmark: "Jagrut Galli", latitude: 19.20176074, longitude: 73.18419462 },
      { id: "stop-amb-008", order: 8, name: "Dominos Kansai Section", landmark: "Dominos Kansai Section", latitude: 19.20268402, longitude: 73.18659788 },
      { id: "stop-amb-009", order: 9, name: "Ambernath Marine Drive", landmark: "Ambernath Marine Drive", latitude: 19.19820855, longitude: 73.18584271 },
      { id: "stop-amb-010", order: 10, name: "Lok Nagri School", landmark: "Lok Nagri School", latitude: 19.19398791, longitude: 73.18494102 },
      { id: "stop-amb-011", order: 11, name: "Lok Nagri Ground", landmark: "Lok Nagri Ground", latitude: 19.19090319, longitude: 73.18597635 },
      { id: "stop-amb-012", order: 12, name: "Hindustan Petroleum", landmark: "Hindustan Petroleum", latitude: 19.18845938, longitude: 73.18747972 },
      { id: "stop-amb-013", order: 13, name: "Mahanagar CNG Station", landmark: "Mahanagar CNG Station", latitude: 19.19022686, longitude: 73.19647156 },
      { id: "stop-amb-014", order: 14, name: "Pipeline Road", landmark: "Pipeline Road", latitude: 19.18883014, longitude: 73.20200456 },
      { id: "stop-amb-015", order: 15, name: "Badlapur Katai Road", landmark: "Maitri Katta", latitude: 19.18767606, longitude: 73.20494384 },
      { id: "stop-amb-016", order: 16, name: "House of Fusion", landmark: "House of Fusion", latitude: 19.18562933, longitude: 73.20999273 },
      { id: "stop-amb-017", order: 17, name: "Dmart", landmark: "Dmart", latitude: 19.18367791, longitude: 73.21460328 },
      { id: "stop-amb-018", order: 18, name: "Indian Oil Petrol Pump", landmark: "Indian Oil Petrol Pump", latitude: 19.18151924, longitude: 73.21797031 },
      { id: "stop-amb-019", order: 19, name: "Carmel Convent High School", landmark: "Carmel Convent High School", latitude: 19.1801893, longitude: 73.218766 }
    ],
    estimatedDuration: 45, // minutes
    createdAt: null,
    updatedAt: null
  },

  "route-shivaji-carmel": {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    operatorId: "operator-akhilesh",
    name: "Shivaji Chowk → Carmel",
    description: "From Shivaji Chowk area to Carmel Convent High School via Katrap",
    stops: [
      { id: "stop-shv-001", order: 1, name: "Shivaji Chowk", landmark: "Shivaji Chowk", latitude: 19.15996757, longitude: 73.23913262 },
      { id: "stop-shv-002", order: 2, name: "Herambh Medical", landmark: "Sanjeevni Hospital", latitude: 19.15989875, longitude: 73.23814218 },
      { id: "stop-shv-003", order: 3, name: "12 O'Clock Cake Shop", landmark: "12 O'Clock Cake Shop", latitude: 19.15903664, longitude: 73.23634973 },
      { id: "stop-shv-004", order: 4, name: "Shabri Hotel", landmark: "Shabri Hotel", latitude: 19.15824957, longitude: 73.23563648 },
      { id: "stop-shv-005", order: 5, name: "Aptewadi Naka", landmark: "Aptewadi Naka", latitude: 19.15868631, longitude: 73.23503389 },
      { id: "stop-shv-006", order: 6, name: "Aptewadi Shirgaon Road", landmark: "HBD Cakes", latitude: 19.15839138, longitude: 73.23392846 },
      { id: "stop-shv-007", order: 7, name: "Pendulkar Udyan", landmark: "Pendulkar Udyan", latitude: 19.15949988, longitude: 73.23317626 },
      { id: "stop-shv-008", order: 8, name: "Sai Akshata Apartment", landmark: "Sai Akshata Apartment", latitude: 19.16012569, longitude: 73.23283026 },
      { id: "stop-shv-009", order: 9, name: "Maratha Cafe", landmark: "Maratha Cafe", latitude: 19.16119139, longitude: 73.23182912 },
      { id: "stop-shv-010", order: 10, name: "Alpha Fitness", landmark: "More Mangal Karyalaya", latitude: 19.16016179, longitude: 73.22950365 },
      { id: "stop-shv-011", order: 11, name: "Mohan Palms", landmark: "Wellness Forever", latitude: 19.15931719, longitude: 73.22713299 },
      { id: "stop-shv-012", order: 12, name: "Raut Chowk", landmark: "Balaji Multispeciality Hospital", latitude: 19.15991766, longitude: 73.22885765 },
      { id: "stop-shv-013", order: 13, name: "Ambedkar Kaman", landmark: "Ambedkar Colony", latitude: 19.1618179, longitude: 73.23320718 },
      { id: "stop-shv-014", order: 14, name: "Maharana Pratap Chowk", landmark: "Digi One", latitude: 19.16146066, longitude: 73.23379727 },
      { id: "stop-shv-015", order: 15, name: "Siddhanath Apla Bazar", landmark: "Siddhanath Apla Bazar", latitude: 19.16175709, longitude: 73.2353905 },
      { id: "stop-shv-016", order: 16, name: "Talathi Office", landmark: "Amdar Misal", latitude: 19.1621954, longitude: 73.23693009 },
      { id: "stop-shv-017", order: 17, name: "KSJB Bank", landmark: "Adarsh School Back Gate", latitude: 19.16465741, longitude: 73.2355863 },
      { id: "stop-shv-018", order: 18, name: "East West Bridge", landmark: "Dubey Hospital", latitude: 19.16603249, longitude: 73.23557691 },
      { id: "stop-shv-019", order: 19, name: "Vijay Sales", landmark: "Vijay Sales", latitude: 19.16678432, longitude: 73.23470654 },
      { id: "stop-shv-020", order: 20, name: "Old DP Road", landmark: "Saraswat Bank", latitude: 19.1678598, longitude: 73.2330087 },
      { id: "stop-shv-021", order: 21, name: "Garva Old DP Road", landmark: "Garva Old DP Road", latitude: 19.16813848, longitude: 73.23119821 },
      { id: "stop-shv-022", order: 22, name: "Unity Small Finance Bank", landmark: "Tarangan Pan Shop", latitude: 19.16906288, longitude: 73.22941026 },
      { id: "stop-shv-023", order: 23, name: "Sweets Junction", landmark: "Sweets Junction", latitude: 19.17115617, longitude: 73.22815767 },
      { id: "stop-shv-024", order: 24, name: "Burger King", landmark: "Burger King", latitude: 19.17378651, longitude: 73.2261715 },
      { id: "stop-shv-025", order: 25, name: "MR DIY", landmark: "CROMA", latitude: 19.17485371, longitude: 73.2253038 },
      { id: "stop-shv-026", order: 26, name: "NEXA", landmark: "NEXA", latitude: 19.17703803, longitude: 73.22369161 },
      { id: "stop-shv-027", order: 27, name: "Ashta Vinayak Vastu Prakalpa", landmark: "Ashta Vinayak Vastu Prakalpa", latitude: 19.17888801, longitude: 73.22172823 },
      { id: "stop-shv-028", order: 28, name: "Carmel Convent High School", landmark: "Carmel Convent High School", latitude: 19.1801893, longitude: 73.218766 }
    ],
    estimatedDuration: 55,
    createdAt: null,
    updatedAt: null
  },

  "route-mohan-carmel": {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    operatorId: "operator-akhilesh",
    name: "Mohan Palms → Carmel",
    description: "From Mohan Palms area to Carmel Convent High School via Katrap Road",
    stops: [
      { id: "stop-moh-001", order: 1, name: "Mohan Palms", landmark: "Opposite Wellness Forever", latitude: 19.15932987, longitude: 73.22709341 },
      { id: "stop-moh-002", order: 2, name: "Raut Chowk", landmark: "Opposite Raut Arcade", latitude: 19.15992645, longitude: 73.22887007 },
      { id: "stop-moh-003", order: 3, name: "More Mangal Karyalaya", landmark: "Opposite Alpha Fitness", latitude: 19.16060438, longitude: 73.22999284 },
      { id: "stop-moh-004", order: 4, name: "Chaitanya Sankul", landmark: "Chaitanya Sankul", latitude: 19.16138276, longitude: 73.23058497 },
      { id: "stop-moh-005", order: 5, name: "Parth Complex Road", landmark: "Alok Apartment", latitude: 19.1618584, longitude: 73.23055637 },
      { id: "stop-moh-006", order: 6, name: "TV Tower", landmark: "MaxCare Multispeciality", latitude: 19.16287472, longitude: 73.22953876 },
      { id: "stop-moh-007", order: 7, name: "TV Tower Road", landmark: "Moment Maker Studio", latitude: 19.16335249, longitude: 73.23048412 },
      { id: "stop-moh-008", order: 8, name: "Cafe Golden Hour", landmark: "Cafe Golden Hour", latitude: 19.16376911, longitude: 73.23082282 },
      { id: "stop-moh-009", order: 9, name: "Registrar Office Badlapur", landmark: "Registrar Office Badlapur", latitude: 19.16351601, longitude: 73.23000993 },
      { id: "stop-moh-010", order: 10, name: "Sai Shraddha Complex", landmark: "Sai Shraddha Complex", latitude: 19.16356578, longitude: 73.22942887 },
      { id: "stop-moh-011", order: 11, name: "Mandar Arts", landmark: "Mandar Arts", latitude: 19.16455259, longitude: 73.22925124 },
      { id: "stop-moh-012", order: 12, name: "Jay Ambe Apartment", landmark: "Jay Ambe Apartment", latitude: 19.16506304, longitude: 73.22964433 },
      { id: "stop-moh-013", order: 13, name: "Vatsalya Maternity Hospital", landmark: "Vatsalya Maternity Hospital", latitude: 19.16544814, longitude: 73.23081646 },
      { id: "stop-moh-014", order: 14, name: "Vivek Vines Signal", landmark: "Dominos", latitude: 19.16619553, longitude: 73.23064748 },
      { id: "stop-moh-015", order: 15, name: "Old Katrap Turn", landmark: "Aarti Chinese Corner", latitude: 19.16791918, longitude: 73.22997508 },
      { id: "stop-moh-016", order: 16, name: "Katrap School Road", landmark: "Food Garage", latitude: 19.16861194, longitude: 73.22939526 },
      { id: "stop-moh-017", order: 17, name: "SBI Bank", landmark: "Vicky Vines", latitude: 19.16905252, longitude: 73.2293692 },
      { id: "stop-moh-018", order: 18, name: "Ganesh Ghat", landmark: "Baskin Robbins", latitude: 19.17130404, longitude: 73.22809494 },
      { id: "stop-moh-019", order: 19, name: "HP Petrol Pump", landmark: "HP Petrol Pump", latitude: 19.17339859, longitude: 73.22641442 },
      { id: "stop-moh-020", order: 20, name: "KFC Signal", landmark: "Croma", latitude: 19.17491338, longitude: 73.22528096 },
      { id: "stop-moh-021", order: 21, name: "MCD", landmark: "Jhanvi Lawns", latitude: 19.1763926, longitude: 73.22420735 },
      { id: "stop-moh-022", order: 22, name: "Sawali Dhaba", landmark: "Sawali Dhaba", latitude: 19.1778792, longitude: 73.22297478 },
      { id: "stop-moh-023", order: 23, name: "Carmel Convent High School", landmark: "Carmel Convent High School", latitude: 19.18017127, longitude: 73.21874128 }
    ],
    estimatedDuration: 40,
    createdAt: null,
    updatedAt: null
  }
};

// Duplicate routes for SANSKRUTI operator
routes["route-ambernath-carmel-sanskruti"] = {
  ...routes["route-ambernath-carmel"],
  operatorId: "operator-sanskruti",
};
routes["route-shivaji-carmel-sanskruti"] = {
  ...routes["route-shivaji-carmel"],
  operatorId: "operator-sanskruti",
};
routes["route-mohan-carmel-sanskruti"] = {
  ...routes["route-mohan-carmel"],
  operatorId: "operator-sanskruti",
};

// ============================================
// 2. BUS DEFINITIONS (cleaned per ARCHITECTURE_v3)
// ============================================
// status: 'available' | 'assigned' | 'in_trip' | 'maintenance' | 'retired'
// activeAssignmentId: set when operator assigns a driver; null otherwise
// activeTripId: set when driver presses START TRIP; null otherwise
// currentLocation includes accuracy, heading, speed, lastUpdated (from Expo Location)

const buses = {
  "bus-001": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL1234",
    operatorId: "operator-akhilesh",
    defaultRouteId: "route-ambernath-carmel",
    activeAssignmentId: "asgn-001-afternoon", // Set when assigned; null when idle
    activeTripId: null,                        // Set when driver starts a trip
    capacity: 40,
    isActive: false,
    status: "assigned", // available | assigned | in_trip | maintenance | retired
    currentLocation: {
      latitude: 19.2143126,
      longitude: 73.18386373,
      accuracy: null,   // metres (from Expo Location)
      heading: null,    // degrees 0–360
      speed: 0,         // m/s
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  },
  "bus-002": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL2345",
    operatorId: "operator-akhilesh",
    defaultRouteId: "route-shivaji-carmel",
    activeAssignmentId: "asgn-002-afternoon", // O(1) driver-screen lookup
    activeTripId: null,
    capacity: 40,
    isActive: false,
    status: "assigned",
    currentLocation: {
      latitude: 19.15996757,
      longitude: 73.23913262,
      accuracy: null,
      heading: null,
      speed: 0,
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  },
  "bus-003": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL3456",
    operatorId: "operator-akhilesh",
    defaultRouteId: "route-mohan-carmel",
    activeAssignmentId: "asgn-003-afternoon",
    activeTripId: null,
    capacity: 40,
    isActive: false,
    status: "assigned",
    currentLocation: {
      latitude: 19.15932987,
      longitude: 73.22709341,
      accuracy: null,
      heading: null,
      speed: 0,
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  },
  "bus-004": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL4567",
    operatorId: "operator-sanskruti",
    defaultRouteId: "route-shivaji-carmel",
    activeAssignmentId: "asgn-004-morning",  // O(1) driver-screen lookup
    activeTripId: null,
    capacity: 45,
    isActive: true,
    status: "assigned",
    currentLocation: {
      latitude: 19.15996757,
      longitude: 73.23913262,
      accuracy: null,
      heading: null,
      speed: 0,
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  },
  "bus-005": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL5678",
    operatorId: "operator-sanskruti",
    defaultRouteId: "route-ambernath-carmel",
    activeAssignmentId: "asgn-005-morning",  // O(1) driver-screen lookup
    activeTripId: null,
    capacity: 45,
    isActive: true,
    status: "assigned",
    currentLocation: {
      latitude: 19.2143126,
      longitude: 73.18386373,
      accuracy: null,
      heading: null,
      speed: 0,
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  },
  "bus-006": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL6789",
    operatorId: "operator-sanskruti",
    defaultRouteId: "route-mohan-carmel",
    activeAssignmentId: "asgn-006-morning",
    activeTripId: null,
    capacity: 45,
    isActive: true,
    status: "assigned",
    currentLocation: {
      latitude: 19.15932987,
      longitude: 73.22709341,
      accuracy: null,
      heading: null,
      speed: 0,
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  },
  // Edge case: bus in maintenance (useful for testing operator UI)
  "bus-007": {
    schemaVersion: SCHEMA_VERSION,
    busNumber: "MH05BL7890",
    operatorId: "operator-akhilesh",
    defaultRouteId: "route-ambernath-carmel",
    activeAssignmentId: null,
    activeTripId: null,
    capacity: 40,
    isActive: false,
    status: "maintenance",
    currentLocation: {
      latitude: 19.18,
      longitude: 73.22,
      accuracy: null,
      heading: null,
      speed: 0,
      lastUpdated: null
    },
    lastUpdated: null,
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 3. DRIVER USER RECORDS (in /users collection)
// ============================================
// availability: 'available' | 'assigned' | 'driving' | 'on_leave' | 'offline'
// This powers the operator dashboard — no extra queries needed to find free drivers.

const driverUsers = {
  "v2hL6xKap6V0MdhoPdqSG7vTfXy2": {
    schemaVersion: SCHEMA_VERSION,
    uid: "v2hL6xKap6V0MdhoPdqSG7vTfXy2",
    role: "driver",
    name: "Lucky",
    phone: "+919876543210", // Replace with actual
    email: null,
    operatorId: "operator-akhilesh",
    avatarUrl: null,
    isActive: true,
    availability: "assigned", // available | assigned | driving | on_leave | offline
    activeAssignmentId: "asgn-001-afternoon", // O(1) driver-screen lookup — set when assigned, null when idle
    createdAt: null,
    updatedAt: null
  },
  "driver-rajesh-001": {
    schemaVersion: SCHEMA_VERSION,
    uid: "driver-rajesh-001",
    role: "driver",
    name: "Rajesh",
    phone: "+919876543211",
    email: null,
    operatorId: "operator-akhilesh",
    avatarUrl: null,
    isActive: true,
    availability: "assigned",
    activeAssignmentId: "asgn-002-afternoon", // O(1) driver-screen lookup
    createdAt: null,
    updatedAt: null
  },
  "driver-suresh-001": {
    schemaVersion: SCHEMA_VERSION,
    uid: "driver-suresh-001",
    role: "driver",
    name: "Suresh",
    phone: "+919876543212",
    email: null,
    operatorId: "operator-sanskruti",
    avatarUrl: null,
    isActive: true,
    availability: "assigned",
    activeAssignmentId: "asgn-004-morning",  // O(1) driver-screen lookup
    createdAt: null,
    updatedAt: null
  },
  "driver-mahesh-001": {
    schemaVersion: SCHEMA_VERSION,
    uid: "driver-mahesh-001",
    role: "driver",
    name: "Mahesh",
    phone: "+919876543213",
    email: null,
    operatorId: "operator-sanskruti",
    avatarUrl: null,
    isActive: true,
    availability: "assigned",
    activeAssignmentId: "asgn-005-morning",  // O(1) driver-screen lookup
    createdAt: null,
    updatedAt: null
  },
  // Edge case: driver on leave (useful for testing operator dashboard graying-out)
  "driver-vinod-001": {
    schemaVersion: SCHEMA_VERSION,
    uid: "driver-vinod-001",
    role: "driver",
    name: "Vinod",
    phone: "+919876543214",
    email: null,
    operatorId: "operator-akhilesh",
    avatarUrl: null,
    isActive: true,
    availability: "on_leave",
    activeAssignmentId: null,
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 4. ASSIGNMENTS (The heart of the system)
// ============================================
// Daily assignments linking driver + bus + route + shift.
// date is stored as a Firestore Timestamp so range queries work:
//   where("date", ">=", startOfToday), where("date", "<", tomorrow)
//
// status vocabulary (separate from trip vocabulary):
//   assigned → accepted → started → completed → cancelled
//
// direction: 'pickup' (Home→School) | 'drop' (School→Home)
//   The app traverses stops normally for pickup, and stops.reverse() for drop.
//   This avoids duplicating routes for morning vs afternoon.

function getTodayTimestamp() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

function getFutureTimestamp(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

const todayTs = getTodayTimestamp();
const tomorrowTs = getFutureTimestamp(1);

const assignments = {
  // Akhilesh's buses – afternoon drop (School→Home)
  "asgn-001-afternoon": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    driverId: "v2hL6xKap6V0MdhoPdqSG7vTfXy2", // Lucky
    conductorId: null,
    busId: "bus-001",
    routeId: "route-ambernath-carmel",
    date: todayTs,       // Timestamp, not string — enables date-range queries
    shift: "afternoon",
    direction: "drop",   // 'pickup' | 'drop' — app uses stops.reverse() for drop
    status: "assigned",  // assigned | accepted | started | completed | cancelled
    assignedBy: "operator-akhilesh",
    createdAt: null,
    updatedAt: null
  },
  "asgn-002-afternoon": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    driverId: "driver-rajesh-001",
    conductorId: null,
    busId: "bus-002",
    routeId: "route-shivaji-carmel",
    date: todayTs,
    shift: "afternoon",
    direction: "drop",
    status: "assigned",
    assignedBy: "operator-akhilesh",
    createdAt: null,
    updatedAt: null
  },
  "asgn-003-afternoon": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    driverId: "driver-rajesh-001",
    conductorId: null,
    busId: "bus-003",
    routeId: "route-mohan-carmel",
    date: todayTs,
    shift: "afternoon",
    direction: "drop",
    status: "assigned",
    assignedBy: "operator-akhilesh",
    createdAt: null,
    updatedAt: null
  },

  // Sanskruti's buses – morning pickup (Home→School)
  "asgn-004-morning": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-sanskruti",
    driverId: "driver-suresh-001",
    conductorId: null,
    busId: "bus-004",
    routeId: "route-shivaji-carmel",
    date: todayTs,
    shift: "morning",
    direction: "pickup",
    status: "assigned",
    assignedBy: "operator-sanskruti",
    createdAt: null,
    updatedAt: null
  },
  "asgn-005-morning": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-sanskruti",
    driverId: "driver-mahesh-001",
    conductorId: null,
    busId: "bus-005",
    routeId: "route-ambernath-carmel",
    date: todayTs,
    shift: "morning",
    direction: "pickup",
    status: "assigned",
    assignedBy: "operator-sanskruti",
    createdAt: null,
    updatedAt: null
  },
  "asgn-006-morning": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-sanskruti",
    driverId: "driver-suresh-001",
    conductorId: null,
    busId: "bus-006",
    routeId: "route-mohan-carmel",
    date: todayTs,
    shift: "morning",
    direction: "pickup",
    status: "assigned",
    assignedBy: "operator-sanskruti",
    createdAt: null,
    updatedAt: null
  },

  // Edge case: cancelled assignment (useful for testing cancellation UI)
  "asgn-007-cancelled": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    driverId: "driver-vinod-001",
    conductorId: null,
    busId: "bus-001",
    routeId: "route-ambernath-carmel",
    date: getFutureTimestamp(-1), // Yesterday
    shift: "morning",
    direction: "pickup",
    status: "cancelled",
    assignedBy: "operator-akhilesh",
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 5. OPERATORS (Updated per v3 schema)
// ============================================

const operators = {
  "operator-akhilesh": {
    schemaVersion: SCHEMA_VERSION,
    name: "Akhilesh Travels",
    code: "AKHILESH",
    phone: "+919876543210",
    email: "akhilesh@coolbus.demo",
    address: "Badlapur, Maharashtra",
    location: {
      latitude: 19.18,
      longitude: 73.22,
      geohash: "tdr1v9s5z"
    },
    serviceRadius: 15, // km
    subscriptionTier: "free",
    parentCount: 0,
    maxBuses: 10,
    commissionRate: 0,
    billingCycle: "monthly",
    isActive: true,
    createdAt: null,
    updatedAt: null
  },
  "operator-sanskruti": {
    schemaVersion: SCHEMA_VERSION,
    name: "Sanskruti Transport",
    code: "SANSKRUTI",
    phone: "+919876543211",
    email: "sanskruti@coolbus.demo",
    address: "Badlapur, Maharashtra",
    location: {
      latitude: 19.16,
      longitude: 73.23,
      geohash: "tdr1v9s5z"
    },
    serviceRadius: 15,
    subscriptionTier: "free",
    parentCount: 0,
    maxBuses: 10,
    commissionRate: 0,
    billingCycle: "monthly",
    isActive: true,
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 6. STUDENTS (Sample data for testing)
// ============================================
// Students reference their pickup/drop stop by stopId (stable) rather than
// only stopOrder (fragile — breaks if operator inserts a stop above theirs).
// stopOrder is kept as a convenience for display; stopId is the source of truth.

const students = {
  "student-001": {
    schemaVersion: SCHEMA_VERSION,
    parentId: "parent-sanskruti-test",
    operatorId: "operator-sanskruti",
    busId: "bus-004",
    routeId: "route-shivaji-carmel",
    stopId: "stop-shv-005",    // Stable ID — survives route edits
    stopOrder: 5,              // Kept for display convenience only
    stopLocation: {
      latitude: 19.15868631,
      longitude: 73.23503389,
      label: "Aptewadi Naka"
    },
    stopOverrides: [],
    name: "Rohan Sharma",
    grade: "5th",
    gender: "male",
    createdAt: null,
    updatedAt: null
  },
  "student-002": {
    schemaVersion: SCHEMA_VERSION,
    parentId: "parent-sanskruti-test",
    operatorId: "operator-sanskruti",
    busId: "bus-005",
    routeId: "route-ambernath-carmel",
    stopId: "stop-amb-010",    // Lok Nagri School
    stopOrder: 10,
    stopLocation: {
      latitude: 19.19398791,
      longitude: 73.18494102,
      label: "Lok Nagri School"
    },
    stopOverrides: [],
    name: "Priya Patel",
    grade: "7th",
    gender: "female",
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 7. FEES (Mock data for testing)
// ============================================
// Operator pays model. Edge cases included: TRIAL, PAID, OVERDUE.
// trialExpiry stored as Timestamp for consistent date queries.

const fees = {
  "fee-operator-akhilesh-2026-06": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    parentId: null,
    studentId: null,
    type: "platform",
    status: "TRIAL",
    amount: 0,
    month: "2026-06",
    paidAt: null,
    trialExpiry: toTimestamp(new Date("2026-07-01")), // Timestamp for range queries
    createdAt: null,
    updatedAt: null
  },
  "fee-operator-sanskruti-2026-06": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-sanskruti",
    parentId: null,
    studentId: null,
    type: "platform",
    status: "TRIAL",
    amount: 0,
    month: "2026-06",
    paidAt: null,
    trialExpiry: toTimestamp(new Date("2026-07-01")),
    createdAt: null,
    updatedAt: null
  },
  // Edge case: paid fee (for testing paid-state UI)
  "fee-operator-akhilesh-2026-05": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    parentId: null,
    studentId: null,
    type: "platform",
    status: "PAID",
    amount: 999,
    month: "2026-05",
    paidAt: toTimestamp(new Date("2026-05-03")),
    trialExpiry: null,
    createdAt: null,
    updatedAt: null
  },
  // Edge case: overdue fee (for testing overdue-state UI)
  "fee-operator-sanskruti-2026-04": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-sanskruti",
    parentId: null,
    studentId: null,
    type: "platform",
    status: "OVERDUE",
    amount: 999,
    month: "2026-04",
    paidAt: null,
    trialExpiry: null,
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 8. SAMPLE COMPLETED TRIP (edge case)
// ============================================
// A historical completed trip with both routeSnapshot and assignmentSnapshot.
// Historical trips must always display the driver/bus details from the time
// of the trip, even if records have since been edited.

const trips = {
  "trip-completed-001": {
    schemaVersion: SCHEMA_VERSION,
    operatorId: "operator-akhilesh",
    driverId: "driver-rajesh-001",
    assignmentId: "asgn-007-cancelled", // linked to yesterday's cancelled asgn for demo
    busId: "bus-001",
    routeId: "route-ambernath-carmel",
    routeVersion: 1, // snapshot of which route version was active
    direction: "pickup",
    status: "completed",  // Trip vocabulary: active | completed | cancelled
    startedAt: toTimestamp(new Date("2026-06-17T06:30:00")),
    completedAt: toTimestamp(new Date("2026-06-17T07:15:00")),
    // Immutable snapshot of assignment details at trip time.
    // If Rajesh is renamed later, this trip still shows "Rajesh".
    assignmentSnapshot: {
      driverName: "Rajesh",
      driverPhone: "+919876543211",
      busNumber: "MH05BL1234",
      routeName: "Ambernath → Carmel",
      conductorName: null
    },
    // Immutable snapshot of route stops at trip time
    routeSnapshot: {
      name: "Ambernath → Carmel",
      version: 1,
      stopCount: 19
    },
    createdAt: null,
    updatedAt: null
  }
};

// ============================================
// 9. PARENT USERS (Test accounts)
// ============================================

const parentUsers = {
  "parent-sanskruti-test": {
    schemaVersion: SCHEMA_VERSION,
    uid: "parent-sanskruti-test",
    role: "parent",
    name: "Test Parent (Sanskruti)",
    phone: "+919876543999",
    email: "testparent@sanskruti.demo",
    operatorId: "operator-sanskruti",
    avatarUrl: null,
    isActive: true,
    createdAt: null,  // injected at write time
    updatedAt: null
  }
};

// ============================================
// SEED FUNCTION
// ============================================

async function seedDatabase() {
  console.log("🚀 Starting CoolBus v3 seed...");

  // Single server timestamp for the entire batch — all docs get the same createdAt/updatedAt.
  // This is set here (not in the static objects above) so that re-running the script
  // produces a fresh timestamp each time rather than baking in a stale value.
  const now = serverTimestamp();

  // Helper: inject { createdAt, updatedAt } into a data object at write time.
  // No merge — batch.set() replaces the document completely so no stale fields survive.
  // For production migrations swap to batch.set(ref, ts(data), { merge: true }).
  function ts(data) {
    return { ...data, createdAt: now, updatedAt: now };
  }

  const batch = writeBatch(db);
  const logs = [];

  // Seed operators
  Object.entries(operators).forEach(([id, data]) => {
    const ref = doc(db, "operators", id);
    batch.set(ref, ts(data));
    logs.push(`[operators] ${id} → ${data.name}`);
  });

  // Seed routes (with stop IDs and version)
  Object.entries(routes).forEach(([id, data]) => {
    const ref = doc(db, "routes", id);
    batch.set(ref, ts(data));
    logs.push(`[routes] ${id} → ${data.name} v${data.version} (${data.stops.length} stops)`);
  });

  // Seed buses (with activeAssignmentId, activeTripId, enriched GPS)
  Object.entries(buses).forEach(([id, data]) => {
    const ref = doc(db, "buses", id);
    batch.set(ref, ts(data));
    logs.push(`[buses] ${id} → ${data.busNumber} status:${data.status}`);
  });

  // Seed driver users (with availability)
  Object.entries(driverUsers).forEach(([id, data]) => {
    const ref = doc(db, "users", id);
    batch.set(ref, ts(data));
    logs.push(`[users/drivers] ${id} → ${data.name} (${data.availability})`);
  });

  // Seed parent users
  Object.entries(parentUsers).forEach(([id, data]) => {
    const ref = doc(db, "users", id);
    batch.set(ref, ts(data));
    logs.push(`[users/parents] ${id} → ${data.name}`);
  });

  // Seed assignments (date as Timestamp, direction, updated status vocab)
  Object.entries(assignments).forEach(([id, data]) => {
    const ref = doc(db, "assignments", id);
    batch.set(ref, ts(data));
    logs.push(`[assignments] ${id} → ${data.driverId} × ${data.busId} × ${data.shift} (${data.direction}) [${data.status}]`);
  });

  // Seed students (stopId + stopOrder)
  Object.entries(students).forEach(([id, data]) => {
    const ref = doc(db, "students", id);
    batch.set(ref, ts(data));
    logs.push(`[students] ${id} → ${data.name} stopId:${data.stopId}`);
  });

  // Seed fees (Timestamp trialExpiry, edge cases: TRIAL / PAID / OVERDUE)
  Object.entries(fees).forEach(([id, data]) => {
    const ref = doc(db, "fees", id);
    batch.set(ref, ts(data));
    logs.push(`[fees] ${id} → ${data.status}`);
  });

  // Seed completed trip (with routeSnapshot + assignmentSnapshot)
  Object.entries(trips).forEach(([id, data]) => {
    const ref = doc(db, "trips", id);
    batch.set(ref, ts(data));
    logs.push(`[trips] ${id} → ${data.status} (driver: ${data.assignmentSnapshot.driverName})`);
  });

  await batch.commit();

  console.log("\n✅ Seed complete!\n");
  console.log("Collections seeded:");
  console.log(`  Routes      : ${Object.keys(routes).length}`);
  console.log(`  Buses       : ${Object.keys(buses).length}`);
  console.log(`  Assignments : ${Object.keys(assignments).length}`);
  console.log(`  Operators   : ${Object.keys(operators).length}`);
  console.log(`  Drivers     : ${Object.keys(driverUsers).length}`);
  console.log(`  Parents     : ${Object.keys(parentUsers).length}`);
  console.log(`  Students    : ${Object.keys(students).length}`);
  console.log(`  Fees        : ${Object.keys(fees).length}`);
  console.log(`  Trips       : ${Object.keys(trips).length}`);
  console.log("\n--- DOCUMENT LOG ---");
  logs.forEach(l => console.log(l));

  return logs;
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, routes, buses, assignments, operators, parentUsers, SCHEMA_VERSION };
