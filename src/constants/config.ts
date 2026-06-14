/**
 * BusTrack App Configuration
 */

export const Config = {
  app: {
    name: 'BusTrack',
    version: '1.0.0',
    buildNumber: 1,
  },

  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  },

  razorpay: {
    keyId: 'PLACEHOLDER_RAZORPAY_KEY',
    currency: 'INR',
  },

  fees: {
    platformFee: 99,
    trialDays: 30,
  },

  coupon: {
    format: /^[A-Z]+-FREE-\d{4}$/,
    freeMonths: 1,
  },

  location: {
    updateIntervalMs: 5000,
    distanceFilterMeters: 10,
  },

  sos: {
    cooldownMs: 30000,
  },

  roles: {
    DRIVER: 'driver',
    PARENT: 'parent',
    OPERATOR: 'operator',
  } as const,

  feeStatus: {
    PAID: 'PAID',
    UNPAID: 'UNPAID',
    TRIAL: 'TRIAL',
  } as const,

  tripStatus: {
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  } as const,

  shifts: ['Morning', 'Evening', 'Both'] as const,
} as const;

export type UserRole = (typeof Config.roles)[keyof typeof Config.roles];
export type FeeStatus = (typeof Config.feeStatus)[keyof typeof Config.feeStatus];
export type TripStatus = (typeof Config.tripStatus)[keyof typeof Config.tripStatus];
export type Shift = (typeof Config.shifts)[number];

export default Config;
