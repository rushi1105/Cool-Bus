import { collection, addDoc } from 'firebase/firestore';
import { db, serverTimestamp } from './baseRepository';

export async function createAlert(data: {
  driverId?: string;
  busId: string;
  location: { latitude: number; longitude: number } | null;
  status: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'alerts'), {
    ...data,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
