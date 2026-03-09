export async function requestNotificationPermission(): Promise<void> {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

export function notifyFalla(assetName: string): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification('Nueva falla reportada', { body: assetName })
}
