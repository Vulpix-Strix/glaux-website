// Glaux's README and docs/en/guide/getting-started.md are the source of truth.
// These machine facts are independent of translated editorial descriptions.
export const consoleFacts = [
  { id: 'display', value: '320×240' },
  { id: 'refreshRate', value: '60' },
  { id: 'palette', value: '256' },
  { id: 'audio', value: '4' },
] as const;

export const cartridgeFiles = [
  { id: 'manifest', name: 'cartridge.ron' },
  { id: 'entry', name: 'code/main.luau' },
  { id: 'module', name: 'code/sheet.luau' },
  { id: 'sprites', name: 'sprites.bin' },
  { id: 'palette', name: 'palette.bin' },
  { id: 'objectPalettes', name: 'obp.bin' },
] as const;
