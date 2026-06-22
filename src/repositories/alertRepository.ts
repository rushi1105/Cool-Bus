import { collection, addDoc } from 'firebase/firestore';
import { db, withMetadata } from './baseRepository';

export async function createAlert(data: {
  driverId?: string;
  busId: string;
  operatorId: string;
  location: { latitude: number; longitude: number } | null;
  status: string;
}): Promise<string> {
  const ref = await addDoc(
    collection(db, 'alerts'),
    withMetadata(data as Record<string, unknown>, ['driverId', 'busId', 'operatorId']),
  );
  return ref.id;
}
