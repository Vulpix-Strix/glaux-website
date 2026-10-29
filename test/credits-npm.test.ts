import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildNpm,
  chooseEntries,
  familyOf,
  installsOnReference,
  legalFiles,
  parseOverrides,
  readComponents,
  readLockfile,
} from '../src/lib/credits/npm.ts';
import type { Component, Lockfile } from '../src/lib/credits/npm.ts';
import { tempDir, writeTree } from './helpers.ts';

const component = (name: string, version: string, license: string, extra: Partial<Component> = {}): Component => ({
  name, version, license, scope: 'runtime', direct: false, dir: '/nowhere', ...extra,
});

test('the variants of a native package share one family name', () => {
  assert.equal(familyOf('@esbuild/darwin-arm64'), '@esbuild/<platform>');
  assert.equal(familyOf('@esbuild/linux-x64'), '@esbuild/<platform>');
  assert.equal(familyOf('lightningcss-win32-x64-msvc'), 'lightningcss-<platform>');
  assert.equal(familyOf('@img/sharp-libvips-linuxmusl-arm64'), '@img/sharp-libvips-<platform>');
  assert.equal(familyOf('@rolldown/binding-wasm32-wasi'), '@rolldown/binding-<platform>');
  assert.equal(familyOf('@cloudflare/workerd-windows-64'), '@cloudflare/workerd-<platform>');
  assert.equal(familyOf('fsevents'), 'fsevents');
  assert.equal(familyOf('react'), 'react');
});

test('a package is part of the reference platform when pnpm would install it on linux x64 glibc', () => {
  assert.ok(installsOnReference({ os: ['linux'], cpu: ['x64'], libc: ['glibc'] }));
  assert.ok(installsOnReference({ os: ['linux'], cpu: ['x64'] }));
  assert.ok(installsOnReference({ os: ['!win32'] }));
  assert.ok(!installsOnReference({ os: ['linux'], cpu: ['x64'], libc: ['musl'] }));
  assert.ok(!installsOnReference({ os: ['linux'], cpu: ['arm64'], libc: ['glibc'] }));
  assert.ok(!installsOnReference({ os: ['darwin'] }));
  assert.ok(!installsOnReference({ os: ['!linux'] }));
});

// esbuild and sharp as the lockfile describes them: one package per platform, optional
// dependencies of the package that uses them, and libvips below sharp's own binaries.
const lockfile: Lockfile = {
  packages: {
    '@esbuild/darwin-arm64@1.0.0': { os: ['darwin'], cpu: ['arm64'] },
    '@esbuild/linux-x64@1.0.0': { os: ['linux'], cpu: ['x64'] },
    '@img/sharp-darwin-arm64@2.0.0': { os: ['darwin'], cpu: ['arm64'] },
    '@img/sharp-linux-x64@2.0.0': { os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
    '@img/sharp-libvips-darwin-arm64@3.0.0': { os: ['darwin'], cpu: ['arm64'] },
    '@img/sharp-libvips-linux-x64@3.0.0': { os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
    'fsevents@2.3.3': { os: ['darwin'] },
    'esbuild@1.0.0': {},
  },
  snapshots: {
    'esbuild@1.0.0': { optionalDependencies: { '@esbuild/darwin-arm64': '1.0.0', '@esbuild/linux-x64': '1.0.0' } },
    'sharp@2.0.0(peer@1.0.0)': { optionalDependencies: { '@img/sharp-darwin-arm64': '2.0.0', '@img/sharp-linux-x64': '2.0.0' } },
    '@img/sharp-darwin-arm64@2.0.0': { optionalDependencies: { '@img/sharp-libvips-darwin-arm64': '3.0.0' } },
    '@img/sharp-linux-x64@2.0.0': { optionalDependencies: { '@img/sharp-libvips-linux-x64': '3.0.0' } },
  },
};

const mac = (): Component[] => [
  component('esbuild', '1.0.0', 'MIT'),
  component('@esbuild/darwin-arm64', '1.0.0', 'MIT', { dir: '/mac/esbuild' }),
  component('sharp', '2.0.0', 'Apache-2.0'),
  component('@img/sharp-darwin-arm64', '2.0.0', 'Apache-2.0'),
  component('@img/sharp-libvips-darwin-arm64', '3.0.0', 'LGPL-3.0-or-later'),
  component('fsevents', '2.3.3', 'MIT'),
];
const linux = (): Component[] => [
  component('esbuild', '1.0.0', 'MIT'),
  component('@esbuild/linux-x64', '1.0.0', 'MIT', { dir: '/linux/esbuild' }),
  component('sharp', '2.0.0', 'Apache-2.0'),
  component('@img/sharp-linux-x64', '2.0.0', 'Apache-2.0'),
  component('@img/sharp-libvips-linux-x64', '3.0.0', 'LGPL-3.0-or-later'),
];

const shape = (components: Component[]) => {
  const { entries, omitted } = chooseEntries(components, lockfile);
  return { omitted, entries: entries.map(({ name, version, binaries }) => ({ name, version, binaries })) };
};

test('native packages are folded into the package that uses them when the license is the same', () => {
  assert.deepEqual(shape(linux()), {
    omitted: ['fsevents@2.3.3'],
    entries: [
      { name: '@img/sharp-libvips-<platform>', version: '3.0.0', binaries: [] },
      { name: 'esbuild', version: '1.0.0', binaries: ['@esbuild/<platform>'] },
      { name: 'sharp', version: '2.0.0', binaries: ['@img/sharp-<platform>'] },
    ],
  });
});

test('the inventory is the same whichever platform installed it', () => {
  assert.deepEqual(shape(mac()), shape(linux()));
  // What linux never installs is reported even where it is installed, and even where it is not.
  assert.deepEqual(shape(mac()).omitted, ['fsevents@2.3.3']);
  assert.deepEqual(shape(linux()).omitted, ['fsevents@2.3.3']);
});

test('a native package with a different license keeps its own entry', () => {
  const entries = chooseEntries(linux(), lockfile).entries;
  const libvips = entries.find((entry) => entry.name === '@img/sharp-libvips-<platform>');
  assert.equal(libvips?.rep.license, 'LGPL-3.0-or-later');
  assert.ok(!entries.find((entry) => entry.name === 'sharp')!.binaries.includes('@img/sharp-libvips-<platform>'));
});

test('a native package installed on the reference platform must be installed here to be read', () => {
  assert.throws(() => chooseEntries([component('esbuild', '1.0.0', 'MIT')], lockfile), /@esbuild\/<platform>@1\.0\.0 is installed on the reference platform but no variant/);
});

test('legal files are found by name; a README is never one', () => {
  const dir = writeTree(tempDir(), {
    'LICENSE-MIT': 'MIT text\r\n\r\n',
    'LICENSE-APACHE': 'Apache text',
    NOTICE: 'Notice text',
    'README.md': 'Licensed under MIT',
    'licenses/other.txt': 'not a file here',
    'LICENSEE.txt': 'not a license file name',
    EMPTY_LICENSE: '',
    LICENSE_EMPTY: '  \n',
  });
  assert.deepEqual(legalFiles(dir), [
    { file: 'LICENSE-APACHE', kind: 'license', content: 'Apache text' },
    { file: 'LICENSE-MIT', kind: 'license', content: 'MIT text' },
    { file: 'NOTICE', kind: 'notice', content: 'Notice text' },
  ]);
});

const packageWith = (files: Record<string, string>) => writeTree(tempDir(), files);

test('texts are collected once per distinct content and tagged with the license the package declares', () => {
  const a = packageWith({ LICENSE: 'Copyright A\nMIT body' });
  const b = packageWith({ LICENSE: 'Copyright A\nMIT body' });
  const c = packageWith({ LICENSE: 'Copyright C\nMIT body', NOTICE: 'extra' });
  const { entries, texts } = buildNpm(
    [component('a', '1.0.0', 'MIT', { dir: a }), component('b', '1.0.0', 'MIT', { dir: b }), component('c', '1.0.0', 'MIT', { dir: c })],
    { packages: {}, snapshots: {} }, {}, () => '',
  );
  assert.deepEqual(entries.map((entry) => entry.text_ids), [[0], [0], [1, 2]]);
  assert.equal(texts.length, 3);
  assert.equal(texts[0].spdx, 'MIT');
  assert.equal(texts[2].spdx, undefined, 'a notice is not a license');
  assert.equal(entries[2].text_ids.length, 2);
});

const overrides = parseOverrides(
  JSON.stringify({ npm: { 'bare@1.0.0': [{ kind: 'license', title: 'LICENSE', spdx: 'MIT', file: 'bare.txt', source: 'https://example.com/LICENSE' }] } }),
);

test('a package without a license text takes the override, with its source', () => {
  const { entries, texts } = buildNpm([component('bare', '1.0.0', 'MIT', { dir: packageWith({ 'README.md': 'x' }) })], { packages: {}, snapshots: {} }, overrides, (file) => `from ${file}\n`);
  assert.deepEqual(entries[0].text_ids, [0]);
  assert.deepEqual(texts[0], { kind: 'license', title: 'LICENSE', spdx: 'MIT', content: 'from bare.txt', source: 'https://example.com/LICENSE' });
});

test('no entry may end without a license text, and the error names it', () => {
  const bare = component('bare', '2.0.0', 'MIT', { dir: packageWith({ 'README.md': 'Licensed under MIT' }) });
  assert.throws(() => buildNpm([bare], { packages: {}, snapshots: {} }, {}, () => ''), /no license text for bare@2\.0\.0/);
});

test('an override cannot outlive the package it was written for', () => {
  const own = component('bare', '1.0.0', 'MIT', { dir: packageWith({ LICENSE: 'now ships its own' }) });
  assert.throws(() => buildNpm([own], { packages: {}, snapshots: {} }, overrides, () => ''), /bare@1\.0\.0 ships its own license text/);
  const newer = component('bare', '1.1.0', 'MIT', { dir: packageWith({ LICENSE: 'text' }) });
  assert.throws(() => buildNpm([newer], { packages: {}, snapshots: {} }, overrides, () => ''), /overrides for bare@1\.0\.0 match no package/);
});

test('overrides need a kind, a title, a file and an official https source', () => {
  const text = { kind: 'license', title: 'L', file: 'l.txt', source: 'https://example.com/l' };
  const parse = (override: object) => parseOverrides(JSON.stringify({ npm: { 'p@1.0.0': [override] } }));
  assert.doesNotThrow(() => parse(text));
  assert.throws(() => parse({ ...text, source: '' }), /without `source`/);
  assert.throws(() => parse({ ...text, source: 'http://example.com/l' }), /must be an https URL/);
  assert.throws(() => parse({ ...text, kind: 'template' }), /unknown kind/);
  assert.throws(() => parseOverrides(JSON.stringify({ npm: { 'p@1.0.0': [] } })), /at least one text/);
});

test('the SBOM tells runtime from dev and direct from transitive', () => {
  const sbom = JSON.stringify({
    metadata: { component: { 'bom-ref': 'root' } },
    dependencies: [{ ref: 'root', dependsOn: ['pkg:a', 'pkg:dev'] }],
    components: [
      { name: 'a', version: '1.0.0', 'bom-ref': 'pkg:a', licenses: [{ license: { id: 'MIT' } }], authors: [{ name: 'Ann' }], externalReferences: [{ type: 'vcs', url: 'git+https://github.com/x/a.git' }] },
      { name: 'b', group: '@s', version: '2.0.0', 'bom-ref': 'pkg:b', licenses: [{ expression: '(MIT OR Apache-2.0)' }], externalReferences: [{ type: 'website', url: 'https://b.dev' }] },
      { name: 'dev', version: '3.0.0', 'bom-ref': 'pkg:dev', scope: 'excluded', licenses: [{ license: { id: 'ISC' } }], externalReferences: [{ type: 'vcs', url: 'git@github.com:x/dev.git' }] },
    ],
  });
  const dirs = JSON.stringify({ MIT: [{ name: 'a', versions: ['1.0.0'], paths: ['/p/a'] }], '(MIT OR Apache-2.0)': [{ name: '@s/b', versions: ['2.0.0'], paths: ['/p/b'] }], ISC: [{ name: 'dev', versions: ['3.0.0'], paths: ['/p/dev'] }] });
  assert.deepEqual(readComponents(sbom, dirs), [
    { name: 'a', version: '1.0.0', license: 'MIT', author: 'Ann', repository: 'https://github.com/x/a', scope: 'runtime', direct: true, dir: '/p/a' },
    { name: '@s/b', version: '2.0.0', license: 'MIT OR Apache-2.0', repository: 'https://b.dev', scope: 'runtime', direct: false, dir: '/p/b' },
    { name: 'dev', version: '3.0.0', license: 'ISC', repository: 'https://github.com/x/dev', scope: 'dev', direct: true, dir: '/p/dev' },
  ]);
  assert.throws(() => readComponents(sbom, '{}'), /does not know where it is installed/);
});

test("the lockfile is read from the project's document, not pnpm's own", () => {
  const lock = readLockfile(`---
lockfileVersion: '9.0'
importers:
  .:
    dependencies: {}
snapshots:
  '@pnpm/exe@1.0.0': {}
---
lockfileVersion: '9.0'
importers:
  .:
    dependencies: {}
packages:
  'fsevents@2.3.3':
    os: [darwin]
snapshots:
  'fsevents@2.3.3': {}
`);
  assert.deepEqual(Object.keys(lock.packages), ['fsevents@2.3.3']);
  assert.deepEqual(lock.packages['fsevents@2.3.3'].os, ['darwin']);
});
