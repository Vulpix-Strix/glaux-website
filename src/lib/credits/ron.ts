/**
 * A reader for the subset of RON that `rom/credits.ron` uses: strings, lists, maps, structs
 * and tuple variants, with `//` and block comments. Anything else is an error, so a change in
 * Glaux's format shows up here instead of being read wrongly.
 */
export type Ron =
  | string
  | Ron[]
  | { map: [string, Ron][] }
  | { name?: string; fields: Record<string, Ron> }
  | { name: string; args: Ron[] };

export interface Editorial {
  sections: { title: string; items: EditorialItem[] }[];
  /** Who made each piece of bundled art, by the name of its inventory entry. */
  authors: Record<string, string>;
}

export type EditorialItem = { type: 'person'; role: string; name: string } | { type: 'message'; text: string };

class Reader {
  at = 0;
  text: string;
  constructor(text: string) {
    this.text = text;
  }

  fail(message: string): never {
    const before = this.text.slice(0, this.at);
    const line = before.split('\n').length;
    throw new Error(`credits.ron:${line}: ${message}`);
  }

  skip() {
    for (;;) {
      const rest = this.text.slice(this.at);
      const space = /^\s+/.exec(rest);
      if (space) this.at += space[0].length;
      else if (rest.startsWith('//')) this.at += (rest.indexOf('\n') + 1 || rest.length);
      else if (rest.startsWith('/*')) {
        const end = rest.indexOf('*/');
        if (end < 0) this.fail('unterminated comment');
        this.at += end + 2;
      } else return;
    }
  }

  peek() {
    this.skip();
    return this.text[this.at];
  }

  eat(char: string) {
    if (this.peek() !== char) this.fail(`expected \`${char}\`, found ${this.text[this.at] ? `\`${this.text[this.at]}\`` : 'the end'}`);
    this.at += 1;
  }

  ident(): string | undefined {
    this.skip();
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.text.slice(this.at));
    if (match) this.at += match[0].length;
    return match?.[0];
  }

  string(): string {
    this.eat('"');
    let out = '';
    for (;;) {
      const char = this.text[this.at++];
      if (char === undefined) this.fail('unterminated string');
      if (char === '"') return out;
      if (char !== '\\') {
        out += char;
        continue;
      }
      const escape = this.text[this.at++];
      const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", '0': '\0' };
      if (escape in simple) out += simple[escape];
      else if (escape === 'u' && this.text[this.at] === '{') {
        const end = this.text.indexOf('}', this.at);
        out += String.fromCodePoint(parseInt(this.text.slice(this.at + 1, end), 16));
        this.at = end + 1;
      } else this.fail(`unsupported escape \`\\${escape}\``);
    }
  }

  /** `a, b, c,` up to `close`. A trailing comma is allowed. */
  list<T>(close: string, item: () => T): T[] {
    const out: T[] = [];
    while (this.peek() !== close) {
      out.push(item());
      if (this.peek() === ',') this.at += 1;
      else if (this.peek() !== close) this.fail(`expected \`,\` or \`${close}\``);
    }
    this.at += 1;
    return out;
  }

  value(): Ron {
    const char = this.peek();
    if (char === '"') return this.string();
    if (char === '[') {
      this.at += 1;
      return this.list(']', () => this.value());
    }
    if (char === '{') {
      this.at += 1;
      return { map: this.list('}', () => {
        const key = this.string();
        this.eat(':');
        return [key, this.value()] as [string, Ron];
      }) };
    }
    const name = char === '(' ? undefined : this.ident();
    if (name === undefined && char !== '(') this.fail(`unexpected ${char ? `\`${char}\`` : 'end of file'}`);
    if (this.peek() !== '(') return { name: name!, args: [] };
    this.at += 1;
    // A named value is a struct when it starts with `field:` and a tuple variant otherwise.
    // An unnamed one can only be a struct.
    const probe = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*:/.test(this.text.slice(this.at));
    if (name !== undefined && !probe) return { name, args: this.list(')', () => this.value()) };
    const fields: Record<string, Ron> = {};
    for (const [key, value] of this.list(')', () => {
      const field = this.ident();
      if (!field) this.fail('expected a field name');
      this.eat(':');
      return [field, this.value()] as const;
    })) {
      if (key in fields) this.fail(`field \`${key}\` is set twice`);
      fields[key] = value;
    }
    return name === undefined ? { fields } : { name, fields };
  }
}

export function parseRon(text: string): Ron {
  const reader = new Reader(text);
  const value = reader.value();
  if (reader.peek() !== undefined) reader.fail('unexpected text after the value');
  return value;
}

const isStruct = (value: Ron): value is { name?: string; fields: Record<string, Ron> } =>
  typeof value === 'object' && !Array.isArray(value) && 'fields' in value;

function struct(value: Ron, allowed: string[], where: string) {
  if (!isStruct(value)) throw new Error(`credits.ron: ${where} must be a struct`);
  for (const key of Object.keys(value.fields)) {
    if (!allowed.includes(key)) throw new Error(`credits.ron: unknown field \`${key}\` in ${where}`);
  }
  return value;
}

function text(value: Ron | undefined, where: string): string {
  if (typeof value !== 'string') throw new Error(`credits.ron: ${where} must be a string`);
  return value;
}

/**
 * Reads `rom/credits.ron` with the rules Glaux applies: unknown fields are rejected and
 * `sections` and `authors` may be left out.
 */
export function parseEditorial(source: string): Editorial {
  const root = struct(parseRon(source), ['sections', 'authors'], 'the file');
  const sections = root.fields.sections ?? [];
  if (!Array.isArray(sections)) throw new Error('credits.ron: `sections` must be a list');
  const authors = root.fields.authors ?? { map: [] };
  if (typeof authors !== 'object' || Array.isArray(authors) || !('map' in authors)) {
    throw new Error('credits.ron: `authors` must be a map');
  }

  return {
    sections: sections.map((section, index) => {
      const where = `sections[${index}]`;
      const { fields } = struct(section, ['title', 'items'], where);
      const items = fields.items ?? [];
      if (!Array.isArray(items)) throw new Error(`credits.ron: ${where}.items must be a list`);
      return {
        title: text(fields.title, `${where}.title`),
        items: items.map((item, at): EditorialItem => {
          const label = `${where}.items[${at}]`;
          if (typeof item !== 'object' || Array.isArray(item) || !('name' in item) || item.name === undefined) {
            throw new Error(`credits.ron: ${label} must be Person(...) or Message(...)`);
          }
          if (item.name === 'Message' && 'args' in item && item.args.length === 1) {
            return { type: 'message', text: text(item.args[0], label) };
          }
          if (item.name === 'Person' && 'fields' in item) {
            const person = struct(item, ['role', 'name'], label);
            return { type: 'person', role: text(person.fields.role, `${label}.role`), name: text(person.fields.name, `${label}.name`) };
          }
          throw new Error(`credits.ron: ${label} must be Person(role, name) or Message(text)`);
        }),
      };
    }),
    authors: Object.fromEntries(authors.map.map(([name, author]) => [name, text(author, `authors["${name}"]`)])),
  };
}
