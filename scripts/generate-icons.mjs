/**
 * Genera iconos PNG sólidos de color para PWA usando solo Node.js built-ins.
 * Color: #F97316 (naranja primario del design system GMAO)
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

// Color naranja GMAO: #F97316 = R=249, G=115, B=22
const R = 249, G = 115, B = 22

function uint32BE(n) {
  const b = Buffer.allocUnsafe(4)
  b.writeUInt32BE(n, 0)
  return b
}

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      t[i] = c
    }
    return t
  })()
  let crc = 0xFFFFFFFF
  for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = uint32BE(data.length)
  const crcBuf = uint32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function makePNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.concat([
    uint32BE(size),   // width
    uint32BE(size),   // height
    Buffer.from([8, 2, 0, 0, 0]), // bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
  ])

  // Raw image data: each row = filter byte (0) + RGB for each pixel
  const rowSize = 1 + size * 3
  const raw = Buffer.allocUnsafe(size * rowSize)
  for (let y = 0; y < size; y++) {
    const off = y * rowSize
    raw[off] = 0 // filter type None
    for (let x = 0; x < size; x++) {
      raw[off + 1 + x * 3] = R
      raw[off + 2 + x * 3] = G
      raw[off + 3 + x * 3] = B
    }
  }

  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const sizes = [192, 512]
for (const size of sizes) {
  const png = makePNG(size)
  const file = join(outDir, `icon-${size}x${size}.png`)
  writeFileSync(file, png)
  console.log(`✓ ${file} (${(png.length / 1024).toFixed(1)} KB)`)
}

// apple-touch-icon (180x180)
const apple = makePNG(180)
writeFileSync(join(outDir, 'apple-touch-icon.png'), apple)
console.log(`✓ apple-touch-icon.png (${(apple.length / 1024).toFixed(1)} KB)`)

console.log('Iconos generados correctamente.')
