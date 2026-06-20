import { addNotification } from '../../repositories/notificationRepository';

export interface SendFeeReminderParams {
  parentId: string;
  parentName: string;
  operatorId: string;
  studentName: string;
  amount: number;
  month: string;
}

export const NotificationService = {
  async sendFeeReminder(params: SendFeeReminderParams): Promise<string | null> {
    try {
      const id = await addNotification({
        userId: params.parentId,
        type: 'fee_reminder',
        title: 'Fee Reminder',
        message: `Hi ${params.parentName}, your ${params.month} bus fee for ${params.studentName} of $${params.amount.toFixed(2)} is pending.`,
        read: false,
        metadata: {
          operatorId: params.operatorId,
          amount: params.amount,
          month: params.month,
        },
      });
      return id;
    } catch (err) {
      console.error('[NotificationService] sendFeeReminder error:', err);
      return null;
    }
  },

  async sendStopChangeApproved(
    parentId: string,
    studentName: string,
    stopName: string,
  ): Promise<string | null> {
    try {
      const id = await addNotification({
        userId: parentId,
        type: 'stop_change',
        title: 'Stop Change Approved',
        message: `Your request to change ${studentName}'s stop to ${stopName} has been approved.`,
        read: false,
      });
      return id;
    } catch (err) {
      console.error('[NotificationService] sendStopChangeApproved error:', err);
      return null;
    }
  },

  async sendStopChangeRejected(
    parentId: string,
    studentName: string,
  ): Promise<string | null> {
    try {
      const id = await addNotification({
        userId: parentId,
        type: 'stop_change',
        title: 'Stop Change Rejected',
        message: `Your request to change ${studentName}'s stop was not approved. Please contact your operator.`,
        read: false,
      });
      return id;
    } catch (err) {
      console.error('[NotificationService] sendStopChangeRejected error:', err);
      return null;
    }
  },
};
