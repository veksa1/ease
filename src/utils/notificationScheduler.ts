/**
 * Notification Scheduler - Ticket 028
 * 
 * Browser notification scheduler for tomorrow's risk alerts
 */

export class NotificationScheduler {
  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('[NotificationScheduler] Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('[NotificationScheduler] Permission:', permission);
    return permission === 'granted';
  }

  /**
   * Schedule tomorrow risk notification
   */
  async scheduleTomorrowNotification(
    risk: number,
    eventCount: number,
    time: Date
  ): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.log('[NotificationScheduler] No permission for notifications');
      return;
    }

    const now = new Date();
    const delay = time.getTime() - now.getTime();

    if (delay <= 0) {
      console.log('[NotificationScheduler] Time already passed, skipping notification');
      return; // Time already passed
    }

    console.log(`[NotificationScheduler] ⏰ Scheduling notification for ${time.toLocaleString()}`);
    
    setTimeout(() => {
      this.sendNotification(risk, eventCount);
    }, delay);
  }

  /**
   * Send browser notification
   */
  private sendNotification(risk: number, eventCount: number): void {
    const riskPercent = Math.round(risk * 100);
    const title = "Tomorrow's Migraine Risk";
    const body = `High risk (${riskPercent}%) • ${eventCount} event${eventCount !== 1 ? 's' : ''} scheduled`;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/badge.png',
        tag: 'tomorrow-risk',
        requireInteraction: true,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('[NotificationScheduler] ✅ Notification sent');
    } catch (error) {
      console.error('[NotificationScheduler] Error sending notification:', error);
    }
  }

  /**
   * Test notification immediately (for debugging)
   */
  async testNotification(): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.log('[NotificationScheduler] No permission for test notification');
      return;
    }

    this.sendNotification(0.72, 4);
  }

  /**
   * Check if notifications are supported and permitted
   */
  async isAvailable(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    // Permission is default, try to request it
    return await this.requestPermission();
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();
