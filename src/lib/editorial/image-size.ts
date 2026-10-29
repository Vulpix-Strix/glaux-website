export interface ImageSize {
  width: number;
  height: number;
}

function png(bytes: Uint8Array, view: DataView): ImageSize | undefined {
  if (bytes.length < 24 || view.getUint32(0) !== 0x89504e47) return;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpeg(bytes: Uint8Array, view: DataView): ImageSize | undefined {
  if (view.getUint16(0) !== 0xffd8) return;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return;
    const marker = bytes[offset + 1];
    // SOF0 to SOF15 carry the frame size, except DHT (c4), JPG (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
    offset += 2 + view.getUint16(offset + 2);
  }
}

function webp(bytes: Uint8Array, view: DataView): ImageSize | undefined {
  const tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 30 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return;
  const kind = tag(12);
  if (kind === 'VP8 ')
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  if (kind === 'VP8L') {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X')
    return {
      width: (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1,
      height: (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1,
    };
}

/** Reads the pixel size from the file header. Other formats (SVG, GIF, AVIF) return undefined. */
export function imageSize(bytes: Uint8Array): ImageSize | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    const size = png(bytes, view) ?? jpeg(bytes, view) ?? webp(bytes, view);
    return size && size.width > 0 && size.height > 0 ? size : undefined;
  } catch {
    return undefined;
  }
}
