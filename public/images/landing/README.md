# Landing assets

The reference HTML is visual guidance only. No assets were extracted from it.

Supply these original, lossless PNG files in this directory, without frames,
resizing or smoothing:

| File | Pixels | Content |
| --- | --- | --- |
| signal-lost-gameplay.png | 320 × 240 | The hero's Signal Lost dungeon arena gameplay and HUD |
| glaux-shell.png | 320 × 240 | Glaux shell with `new my-game` and `run` |
| signal-lost-title.png | 320 × 240 | Signal Lost title screen and Press Z to start |
| master-palette.png | 16 × 16 | Original 256-color master palette grid |

The page reserves their space and shows a localized message if an image fails
to load. It will use these files automatically once supplied. Missing original
images prevent a definitive visual fidelity comparison.

Reused unchanged from sibling projects:
- `glaux-intro/public/font/PixelCode.woff2` → `public/fonts/pixel-code-regular.woff2`
- `glaux/examples/signal-lost/sprites.png` → `signal-lost-sprites.png`
- `glaux/examples/sprites/sprites.png` → `micro-asset-pack.png`
- `glaux/examples/palettes/sprites.png` → `palettes-sprites.png`
- `glaux/rom/ui/icons/{code,sprites,map,sfx,music}.png` → `icons/`

Fontsource supplies Hanken Grotesk and JetBrains Mono locally through Vite.
See `/ASSET-CREDITS.txt` and `public/fonts/LICENSE-*.txt` for attribution/licenses.
