import { assert, expect, test } from 'vitest';
import path from 'node:path';
import { build } from 'vite';
import { imageSize } from '@/lib/editorial/image-size';
import { editorialPlugin } from '@/lib/editorial/vite';
import { tempDir, writeTree, root } from './helpers.ts';

function png(width: number, height: number) {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}
function jpeg(width: number, height: number) {
  // SOI, an APP0 segment to skip, then SOF0 with the frame size.
  const bytes = Buffer.alloc(2 + 4 + 2 + 19);
  bytes.writeUInt16BE(0xffd8, 0);
  bytes.writeUInt16BE(0xffe0, 2);
  bytes.writeUInt16BE(4, 4);
  bytes.writeUInt16BE(0xffc0, 8);
  bytes.writeUInt16BE(17, 10);
  bytes.writeUInt16BE(height, 13);
  bytes.writeUInt16BE(width, 15);
  return bytes;
}
function webp(kind: 'VP8 ' | 'VP8L' | 'VP8X', width: number, height: number) {
  const bytes = Buffer.alloc(40);
  bytes.write('RIFF', 0);
  bytes.write('WEBP', 8);
  bytes.write(kind, 12);
  if (kind === 'VP8 ') {
    bytes.writeUInt16LE(width, 26);
    bytes.writeUInt16LE(height, 28);
  } else if (kind === 'VP8L') {
    bytes.writeUInt32LE(((width - 1) | ((height - 1) << 14)) >>> 0, 21);
  } else {
    bytes.writeUIntLE(width - 1, 24, 3);
    bytes.writeUIntLE(height - 1, 27, 3);
  }
  return bytes;
}

test('image sizes are read from PNG, JPEG and WebP headers', () => {
  expect(imageSize(png(320, 240))).toStrictEqual({ width: 320, height: 240 });
  expect(imageSize(jpeg(640, 480))).toStrictEqual({ width: 640, height: 480 });
  expect(imageSize(webp('VP8 ', 800, 600))).toStrictEqual({ width: 800, height: 600 });
  expect(imageSize(webp('VP8L', 800, 600))).toStrictEqual({ width: 800, height: 600 });
  expect(imageSize(webp('VP8X', 800, 600))).toStrictEqual({ width: 800, height: 600 });
});

test('other or damaged files have no size instead of failing', () => {
  expect(imageSize(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(undefined);
  expect(imageSize(Buffer.from('GIF89a'))).toBe(undefined);
  expect(imageSize(Buffer.alloc(0))).toBe(undefined);
  expect(imageSize(png(320, 240).subarray(0, 12))).toBe(undefined);
  expect(imageSize(jpeg(1, 1).subarray(0, 10))).toBe(undefined);
});

const article = (body: string, status = 'published\ndate: 2000-01-01') =>
  `---\nid: fixture\ntitle: Images\ndescription: Build test\nstatus: ${status}\ncategories: [announcements]\n---\n\n${body}\n`;

async function compiled(files: Record<string, string>) {
  const dir = writeTree(tempDir(), files);
  const workspace = writeTree(tempDir(), {
    'entry.ts': "export { articles, articleModules } from 'virtual:editorial';\n",
  });
  const result = await build({
    root,
    configFile: false,
    plugins: [editorialPlugin(dir)],
    logLevel: 'silent',
    build: { ssr: path.join(workspace, 'entry.ts'), write: false, emitAssets: true, target: 'esnext', minify: false },
  });
  assert(!Array.isArray(result) && 'output' in result);
  return result.output;
}

test('Markdown images and ArticleFigure resolve local assets and get their size automatically', async () => {
  const output = await compiled({
    'en/blog/images.mdx': article(
      [
        '![Shell](asset:fixture/shell.png)',
        '<ArticleFigure src="asset:fixture/shell.png" alt="Auto" />',
        '<ArticleFigure src="asset:fixture/shell.png" alt="Explicit" width={100} height={50} caption="Kept" />',
      ].join('\n\n'),
    ),
    'assets/fixture/shell.png': png(320, 240) as unknown as string,
  });
  const code = output.map((item) => (item.type === 'chunk' ? item.code : '')).join('\n');
  expect(code).toMatch(/src: "\/editorial-assets\/[a-f0-9]+-shell\.png"/);
  expect(code.match(/width: "?320"?/g)?.length).toBe(2);
  expect(code.match(/height: "?240"?/g)?.length).toBe(2);
  expect(code).toMatch(/width: 100/);
  expect(code).toMatch(/caption: "Kept"/);
  expect(output.filter((item) => item.type === 'asset').length).toBe(1);
});

test('assets used only by drafts are not emitted, shared ones are', async () => {
  const output = await compiled({
    'en/blog/public.mdx': article('![Shared](asset:fixture/shared.png)'),
    'en/blog/private.mdx': article('![Shared](asset:fixture/shared.png)\n\n![Own](asset:fixture/own.png)', 'draft').replace(
      'id: fixture',
      'id: private',
    ),
    'assets/fixture/shared.png': png(10, 10) as unknown as string,
    'assets/fixture/own.png': png(20, 20) as unknown as string,
  });
  const names = output.filter((item) => item.type === 'asset').map((item) => item.fileName);
  expect(names.length).toBe(1);
  expect(names[0]).toMatch(/shared\.png$/);
});
