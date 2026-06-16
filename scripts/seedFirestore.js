// Run with: node scripts/seedFirestore.js
// This will MERGE documents, not overwrite
// Use setDoc with merge:true for all writes

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    doc,
    setDoc,
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

const seedData = [
    {
        collection: 'operators',
        id: 'operator-akhilesh',
        data: {
            name: 'Akhilesh Travels',
            code: 'AKHILESH',
            phone: '+919876543210',
            email: 'akhilesh@coolbus.in',
            address: 'Shirgaon, Badlapur',
            busIds: ['bus-001', 'bus-002', 'bus-003'],
            driverIds: [],
        },
    },
    {
        collection: 'operators',
        id: 'operator-sanskruti',
        data: {
            name: 'Sanskruti Travels',
            code: 'SANSKRUTI',
            phone: '+919876543211',
            email: 'sanskruti@coolbus.in',
            address: 'Badlapur West',
            busIds: ['bus-004', 'bus-005', 'bus-006'],
            driverIds: [],
        },
    },

    // Bus 001 - Akhilesh, Morning
    {
        collection: 'buses',
        id: 'bus-001',
        data: {
            operatorId: 'operator-akhilesh',
            busNumber: 'MH05BL1234',
            routeName: 'Raut Arcade → Carmel (Morning)',
            shift: 'morning',
            capacity: 40,
            isActive: false,
            driverId: '',
            speed: 0,
            currentLocation: {
                latitude: 19.1885,
                longitude: 73.1940,
            },
            lastUpdated: Timestamp.now(),
            stops: [
                {order: 1, name: "Raut Arcade, Shirgaon", lat: 19.1885, lng: 73.1940},
                {order: 2, name: "Digione", lat: 19.1860, lng: 73.1920},
                {order: 3, name: "Nagarpalika", lat: 19.1840, lng: 73.1900},
                {order: 4, name: "Old DP Road", lat: 19.1820, lng: 73.1885},
                {order: 5, name: "MCD", lat: 19.1800, lng: 73.1870},
                {order: 6, name: "Carmel Convent High School", lat: 19.1785, lng: 73.1855}
            ],
            visitedStops: [],
        },
    },

    // Bus 002 - Akhilesh, Afternoon
    {
        collection: 'buses',
        id: 'bus-002',
        data: {
            operatorId: 'operator-akhilesh',
            busNumber: 'MH05BL2345',
            routeName: 'Raut Arcade → Carmel (Afternoon)',
            shift: 'afternoon',
            capacity: 40,
            isActive: false,
            driverId: '',
            speed: 0,
            currentLocation: {
                latitude: 19.1885,
                longitude: 73.1940,
            },
            lastUpdated: Timestamp.now(),
            stops: [
                {order: 1, name: "Raut Arcade, Shirgaon", lat: 19.1885, lng: 73.1940},
                {order: 2, name: "Digione", lat: 19.1860, lng: 73.1920},
                {order: 3, name: "Nagarpalika", lat: 19.1840, lng: 73.1900},
                {order: 4, name: "Old DP Road", lat: 19.1820, lng: 73.1885},
                {order: 5, name: "MCD", lat: 19.1800, lng: 73.1870},
                {order: 6, name: "Carmel Convent High School", lat: 19.1785, lng: 73.1855}
            ],
            visitedStops: [],
        },
    },

    // Bus 003 - Akhilesh, Morning
    {
        collection: 'buses',
        id: 'bus-003',
        data: {
            operatorId: 'operator-akhilesh',
            busNumber: 'MH05BL3456',
            routeName: 'Fire Brigade → Carmel (Morning)',
            shift: 'morning',
            capacity: 40,
            isActive: false,
            driverId: '',
            speed: 0,
            currentLocation: {
                latitude: 19.1765,
                longitude: 73.2000,
            },
            lastUpdated: Timestamp.now(),
            stops: [
                {order: 1, name: "Fire Brigade, Badlapur East", lat: 19.1765, lng: 73.2000},
                {order: 2, name: "Shabri Hotel", lat: 19.1780, lng: 73.1985},
                {order: 3, name: "Shivaji Chowk", lat: 19.1795, lng: 73.1970},
                {order: 4, name: "Gandhi Chowk", lat: 19.1805, lng: 73.1955},
                {order: 5, name: "Anupam Bookstore", lat: 19.1815, lng: 73.1940},
                {order: 6, name: "Amdar Misal", lat: 19.1825, lng: 73.1925},
                {order: 7, name: "Nagarpalika", lat: 19.1840, lng: 73.1900},
                {order: 8, name: "New DP Road", lat: 19.1825, lng: 73.1880},
                {order: 9, name: "MCD", lat: 19.1800, lng: 73.1870},
                {order: 10, name: "Carmel Convent High School", lat: 19.1785, lng: 73.1855}
            ],
            visitedStops: [],
        },
    },

    // Bus 004 - Sanskruti, Morning
    {
        collection: 'buses',
        id: 'bus-004',
        data: {
            operatorId: 'operator-sanskruti',
            busNumber: 'MH05BL4567',
            routeName: 'Katrap Gaon → Carmel (Morning)',
            shift: 'morning',
            capacity: 45,
            isActive: false,
            driverId: '',
            speed: 0,
            currentLocation: {
                latitude: 19.1910,
                longitude: 73.1760,
            },
            lastUpdated: Timestamp.now(),
            stops: [
                {order: 1, name: "Katrap Gaon", lat: 19.1910, lng: 73.1760},
                {order: 2, name: "Bhoirwadi", lat: 19.1890, lng: 73.1785},
                {order: 3, name: "Badlapur Railway Station (West)", lat: 19.1860, lng: 73.1810},
                {order: 4, name: "Shiv Mandir Road", lat: 19.1840, lng: 73.1830},
                {order: 5, name: "Jijamata Chowk", lat: 19.1820, lng: 73.1845},
                {order: 6, name: "MCD", lat: 19.1800, lng: 73.1870},
                {order: 7, name: "Carmel Convent High School", lat: 19.1785, lng: 73.1855}
            ],
            visitedStops: [],
        },
    },

    // Bus 005 - Sanskruti, Afternoon
    {
        collection: 'buses',
        id: 'bus-005',
        data: {
            operatorId: 'operator-sanskruti',
            busNumber: 'MH05BL5678',
            routeName: 'Katrap Gaon → Carmel (Afternoon)',
            shift: 'afternoon',
            capacity: 45,
            isActive: false,
            driverId: '',
            speed: 0,
            currentLocation: {
                latitude: 19.1910,
                longitude: 73.1760,
            },
            lastUpdated: Timestamp.now(),
            stops: [
                {order: 1, name: "Katrap Gaon", lat: 19.1910, lng: 73.1760},
                {order: 2, name: "Bhoirwadi", lat: 19.1890, lng: 73.1785},
                {order: 3, name: "Badlapur Railway Station (West)", lat: 19.1860, lng: 73.1810},
                {order: 4, name: "Shiv Mandir Road", lat: 19.1840, lng: 73.1830},
                {order: 5, name: "Jijamata Chowk", lat: 19.1820, lng: 73.1845},
                {order: 6, name: "MCD", lat: 19.1800, lng: 73.1870},
                {order: 7, name: "Carmel Convent High School", lat: 19.1785, lng: 73.1855}
            ],
            visitedStops: [],
        },
    },

    // Bus 006 - Sanskruti, Morning
    {
        collection: 'buses',
        id: 'bus-006',
        data: {
            operatorId: 'operator-sanskruti',
            busNumber: 'MH05BL6789',
            routeName: 'Manjarli Gaon → Carmel (Morning)',
            shift: 'morning',
            capacity: 45,
            isActive: false,
            driverId: '',
            speed: 0,
            currentLocation: {
                latitude: 19.1710,
                longitude: 73.1730,
            },
            lastUpdated: Timestamp.now(),
            stops: [
                {order: 1, name: "Manjarli Gaon", lat: 19.1710, lng: 73.1730},
                {order: 2, name: "Belavali Phata", lat: 19.1740, lng: 73.1755},
                {order: 3, name: "Chikhlol Phata", lat: 19.1770, lng: 73.1780},
                {order: 4, name: "Gove Colony", lat: 19.1795, lng: 73.1805},
                {order: 5, name: "Don Bosco School Road", lat: 19.1810, lng: 73.1830},
                {order: 6, name: "Carmel Convent High School", lat: 19.1785, lng: 73.1855}
            ],
            visitedStops: [],
        },
    },

    {
        collection: 'students',
        id: 'student-001',
        data: {
            name: 'Aarav Patil',
            grade: '4th Standard',
            gender: 'Male',
            parentId: 'parent-001',
            operatorId: 'operator-akhilesh',
            busId: 'bus-001',
            stopOrder: 1,
            stopLocation: {
                latitude: 19.1885,
                longitude: 73.194,
                label: 'Raut Arcade, Shirgaon',
            },
        },
    },

    {
        collection: 'students',
        id: 'student-002',
        data: {
            name: 'Ananya Joshi',
            grade: '3rd Standard',
            gender: 'Female',
            parentId: 'parent-002',
            operatorId: 'operator-sanskruti',
            busId: 'bus-004',
            stopOrder: 3,
            stopLocation: {
                latitude: 19.186,
                longitude: 73.181,
                label: 'Badlapur Railway Station (West)',
            },
        },
    },

    {
        collection: 'fees',
        id: 'fee-001',
        data: {
            parentId: 'parent-001',
            studentId: 'student-001',
            operatorId: 'operator-akhilesh',
            status: 'TRIAL',
            month: '2026-06',
            total: 0,
            trialUsed: true,
            trialExpiry: Timestamp.fromDate(
                new Date('2026-06-16')
            ),
            paidAt: null,
            paymentMethod: null,
        },
    },

    {
        collection: 'fees',
        id: 'fee-002',
        data: {
            parentId: 'parent-002',
            studentId: 'student-002',
            operatorId: 'operator-sanskruti',
            status: 'PAID',
            month: '2026-06',
            total: 530,
            trialUsed: false,
            trialExpiry: null,
            paidAt: Timestamp.fromDate(
                new Date('2026-06-01')
            ),
            paymentMethod: 'UPI',
        },
    },
];

async function seed() {
    for (const item of seedData) {
        await setDoc(
            doc(db, item.collection, item.id),
            item.data,
            { merge: true }
        );
        console.log(
            `✓ ${item.collection}/${item.id}`
        );
    }

    console.log('✅ Firestore seeded');
}

seed().catch(console.error);
