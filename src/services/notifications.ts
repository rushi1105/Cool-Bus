/**
 * Notifications Service — Mock
 *
 * Simulates expo-notifications for push notifications and in-app alerts.
 */

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'sos';
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

// ─── Mock Notifications ──────────────────────────────────────────────

const mockNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Bus Started',
    body: 'Bus KA-01-AB-1234 has started its morning route.',
    type: 'info',
    timestamp: new Date('2026-06-13T07:30:00'),
    read: true,
  },
  {
    id: 'notif-2',
    title: 'Arriving Soon',
    body: 'Bus is 5 minutes away from Koramangala Stop.',
    type: 'success',
    timestamp: new Date('2026-06-13T08:10:00'),
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Fee Reminder',
    body: 'Your June bus fee of ₹2,500 is pending. Pay now to continue tracking.',
    type: 'warning',
    timestamp: new Date('2026-06-12T10:00:00'),
    read: false,
  },
  {
    id: 'notif-4',
    title: 'Trial Expiring',
    body: 'Your free trial expires in 5 days. Subscribe to continue tracking.',
    type: 'warning',
    timestamp: new Date('2026-06-11T09:00:00'),
    read: true,
  },
  {
    id: 'notif-5',
    title: 'Payment Received',
    body: 'Payment of ₹2,500 received for May 2026. Thank you!',
    type: 'success',
    timestamp: new Date('2026-05-05T14:30:00'),
    read: true,
  },
];

export const notificationService = {
  /**
   * Request notification permissions
   */
  requestPermissions: async (): Promise<boolean> => {
    return true;
  },

  /**
   * Get all notifications
   */
  getAll: async (): Promise<AppNotification[]> => {
    return [...mockNotifications].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  },

  /**
   * Get unread count
   */
  getUnreadCount: async (): Promise<number> => {
    return mockNotifications.filter((n) => !n.read).length;
  },

  /**
   * Mark as read
   */
  markRead: async (notifId: string): Promise<void> => {
    const notif = mockNotifications.find((n) => n.id === notifId);
    if (notif) notif.read = true;
  },

  /**
   * Mark all as read
   */
  markAllRead: async (): Promise<void> => {
    mockNotifications.forEach((n) => (n.read = true));
  },

  /**
   * Send local notification (mock)
   */
  sendLocal: async (title: string, body: string, type: AppNotification['type'] = 'info'): Promise<void> => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      body,
      type,
      timestamp: new Date(),
      read: false,
    };
    mockNotifications.unshift(notif);
  },

  /**
   * Send SOS alert
   */
  sendSOSAlert: async (
    driverName: string,
    busNumber: string,
    location: { latitude: number; longitude: number },
  ): Promise<void> => {
    const notif: AppNotification = {
      id: `notif-sos-${Date.now()}`,
      title: '🚨 SOS Alert!',
      body: `Emergency alert from ${driverName} (${busNumber}). Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      type: 'sos',
      timestamp: new Date(),
      read: false,
      data: { driverName, busNumber, location },
    };
    mockNotifications.unshift(notif);
  },

  /**
   * Send fee reminder
   */
  sendFeeReminder: async (parentName: string, amount: number, month: string): Promise<void> => {
    const notif: AppNotification = {
      id: `notif-fee-${Date.now()}`,
      title: 'Fee Reminder',
      body: `Hi ${parentName}, your ${month} bus fee of ₹${amount.toLocaleString()} is pending.`,
      type: 'warning',
      timestamp: new Date(),
      read: false,
    };
    mockNotifications.unshift(notif);
  },
};

export default notificationService;
