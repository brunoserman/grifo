// Generates placeholder PWA icons with no image dependencies: a dark square
// with an amber bar across it, evoking a highlight (grifo). Re-run with
// `node frontend/scripts/generate-icons.mjs` to regenerate.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const outDir = fileURLToPath(new URL('../public/', import.meta.url))
mkdirSync(outDir, { recursive: true })

// Standard CRC32 for PNG chunks.
const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePng(size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0) // width
  ihdr.writeUInt32BE(size, 4) // height
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  // remaining bytes (compression, filter, interlace) stay 0

  const rowBytes = 1 + size * 3
  const raw = Buffer.alloc(size * rowBytes)
  const margin = size * 0.22 // keeps the mark inside the maskable safe zone
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowBytes
    raw[rowStart] = 0 // filter type: none
    for (let x = 0; x < size; x++) {
      const i = rowStart + 1 + x * 3
      const inBar =
        x > margin && x < size - margin && y > size * 0.42 && y < size * 0.58
      // Dark background (#171717) with an amber bar (#f59e0b).
      raw[i] = inBar ? 0xf5 : 0x17
      raw[i + 1] = inBar ? 0x9e : 0x17
      raw[i + 2] = inBar ? 0x0b : 0x17
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, `file://${outDir}`), makePng(size))
  console.log(`wrote public/icon-${size}.png`)
}
