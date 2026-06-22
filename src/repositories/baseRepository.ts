import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SCHEMA_VERSION } from '../constants/schema';

export { db, serverTimestamp, Timestamp };
export { SCHEMA_VERSION };

export function withMetadata(data: Record<string, unknown>, requiredFields?: string[]): Record<string, unknown> {
  if (requiredFields) {
    for (const field of requiredFields) {
      const val = data[field];
      if (val === undefined || val === null || val === '') {
        throw new Error(`Validation failed: '${field}' is required but was ${JSON.stringify(val)}`);
      }
    }
  }
  return {
    ...data,
    schemaVersion: SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}


