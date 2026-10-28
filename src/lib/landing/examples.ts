// Based on Glaux's docs/en/guide/getting-started.md (Luau example).
export const firstGame = `local x, y = 156, 116
local hoots = 0

function tick()
  if btn(Button.Left) then x = x - 2 end
  if btn(Button.Right) then x = x + 2 end
  if btn(Button.Up) then y = y - 2 end
  if btn(Button.Down) then y = y + 2 end
  if btnp(Button.A) then hoots = hoots + 1 end
end

function draw()
  cls(0)
  rectfill(x, y, 8, 8, 7)
  print("Presses: " .. hoots, 8, 8, 15)
end`;

// sheet.knight_run and sheet.goblin_run are from examples/signal-lost/code/sheet.luau.
export const editorCode = `local sheet = require("sheet")
local x, y = 156, 116

function tick()
  if btn(Button.Left) then x = x - 2 end
  if btn(Button.Right) then x = x + 2 end
end

function draw()
  cls(1)
  spr(sheet.knight_run[1], x, y, 2, 3)
  print("Hello, Glaux", 8, 8, 15)
end`;

export const drawCode = `function draw()
  cls(1)
  spr(sheet.knight_run[1], x, y, 2, 3)
  spr(sheet.goblin_run[1], 120, 96, 2, 2, true)
  print("SCORE 00420", 84, 3, 15)
end`;

// docs/en/api/audio/{env,tone,gate}.md
export const soundCode = `audio.env(0, 5, 80, 8, 200)
audio.tone(0, 440, 12, "square")
audio.gate(0, true)`;

export const languageExamples = {
  luau: 'audio.tone(0, 440, 12, "square")\naudio.gate(0, true)',
  rhai: 'audio::tone(0, 440, 12, "square");\naudio::gate(0, true);',
};

// The mise glaux task invokes cargo run -p glaux in Glaux's mise.toml.
export const buildCommands = '$ git clone https://github.com/Vulpix-Strix/glaux.git\n$ cd glaux\n$ mise run glaux';
