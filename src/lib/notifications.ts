export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return await Notification.requestPermission()
}

export function notifyFalla(assetName: string): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification('Nueva falla reportada', { body: assetName })
}
