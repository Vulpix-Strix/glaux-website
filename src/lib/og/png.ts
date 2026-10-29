const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from the IHDR chunk, or undefined when the bytes are not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 24 || signature.some((byte, index) => bytes[index] !== byte)) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
