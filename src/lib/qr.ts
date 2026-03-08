import QRCode from 'qrcode'

export async function generateQRDataURL(assetId: string): Promise<string> {
  return QRCode.toDataURL(assetId, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}

export function printQR(assetId: string, assetName: string, dataUrl: string): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QR — ${assetName}</title>
  <style>
    body { display:flex; flex-direction:column; align-items:center; justify-content:center;
           font-family:sans-serif; padding:24px; }
    img { width:280px; height:280px; }
    p { margin-top:12px; font-size:14px; color:#333; text-align:center; }
    small { font-size:11px; color:#999; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="QR ${assetName}">
  <p><strong>${assetName}</strong></p>
  <small>${assetId}</small>
  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`)
  win.document.close()
}
