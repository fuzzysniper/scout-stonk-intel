/** Bounded JSON decoder with duplicate-key/depth checks. No financial normalization. */
export function strictJson(text: string): unknown {
  let pos = 0, nodes = 0;
  const fail = (): never => { throw new Error("source_json"); };
  const space = () => { while (/[\x20\t\r\n]/.test(text[pos] ?? "!")) pos++; };
  function string(): string {
    const start = pos++;
    while (pos < text.length) {
      const c = text[pos++];
      if (c === "\\") { pos++; continue; }
      if (c === '"') {
        try { return JSON.parse(text.slice(start, pos)); } catch { return fail(); }
      }
    }
    return fail();
  }
  function value(depth: number): unknown {
    if (depth > 24 || ++nodes > 40000) return fail();
    space();
    if (text[pos] === '"') return string();
    if (text[pos] === "{") {
      pos++; space();
      const out: Record<string, unknown> = Object.create(null), keys = new Set<string>();
      if (text[pos] === "}") { pos++; return out; }
      while (pos < text.length) {
        space(); if (text[pos] !== '"') return fail();
        const key = string(); if (keys.has(key)) return fail(); keys.add(key);
        space(); if (text[pos++] !== ":") return fail(); out[key] = value(depth + 1);
        space(); const separator = text[pos++];
        if (separator === "}") return out;
        if (separator !== ",") return fail();
      }
      return fail();
    }
    if (text[pos] === "[") {
      pos++; space(); const out: unknown[] = [];
      if (text[pos] === "]") { pos++; return out; }
      while (pos < text.length) {
        out.push(value(depth + 1)); space(); const separator = text[pos++];
        if (separator === "]") return out;
        if (separator !== ",") return fail();
      }
      return fail();
    }
    const token = /^(?:null|true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
    if (!token) return fail(); pos += token[0].length;
    const result: unknown = JSON.parse(token[0]);
    if (typeof result === "number" && !Number.isFinite(result)) return fail();
    return result;
  }
  const out = value(0); space(); if (pos !== text.length) return fail(); return out;
}
