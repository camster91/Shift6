import { LocalNotifications } from '@capacitor/local-notifications';

let permissionAsked = false;

export async function requestNotificationPermission() {
  if (permissionAsked) return false;
  permissionAsked = true;
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    return false;
  }
}

export async function checkNotificationPermission() {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (e) {
    return false;
  }
}

export async function scheduleWorkoutReminder(hour = 7, minute = 0) {
  try {
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return false;

    // Cancel existing daily reminders
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: 'Shift6 — Time to train',
        body: 'Your muscles are waiting. Knock out a quick set.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
      }]
    });
    return true;
  } catch (e) {
    console.error('Notification schedule failed:', e);
    return false;
  }
}

export async function cancelWorkoutReminder() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch (e) {}
}

export async function sendImmediateNotification(title, body) {
  try {
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return false;
    await LocalNotifications.schedule({
      notifications: [{ id: Date.now(), title, body, schedule: { at: new Date(Date.now() + 1000) }, sound: 'default' }]
    });
    return true;
  } catch (e) {
    return false;
  }
}
