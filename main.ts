// The Passport Page of a Country That Isn't There
// make.fun bounty: the-passport-page-of-a-countr-2-20261121-0318
// Republic of Vestermark — an invented passport spread, rendered procedurally.
// Pure Node standard library only. No fonts, no assets, no network.
// Deterministic: same bytes on every run.
//
// Run:  node main.ts [output-path]
// Default output: /output/entry.png (grader path), falling back to ./output/entry.png.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------- utilities

type RGB = [number, number, number];

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Deterministic PRNG (mulberry32) — no Math.random anywhere.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- bitmap font
// Clean 5x7 pixel font, authored as code data. Each glyph = 7 rows of 5 bits
// (MSB = leftmost column). Uppercase + digits + punctuation only; all
// rendered text is uppercase, which is authentic for a passport anyway.

const FONT: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '"': [0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "*": [0x00, 0x04, 0x15, 0x0e, 0x15, 0x04, 0x00],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  "-": [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  ";": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x04, 0x08],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  "=": [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
};

// ---------------------------------------------------------------- canvas

class C {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint8Array; // RGBA

  constructor(w: number, h: number, fill: RGB | null = [255, 255, 255]) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 4);
    if (fill) {
      for (let i = 0; i < w * h; i++) {
        this.buf[i * 4] = fill[0];
        this.buf[i * 4 + 1] = fill[1];
        this.buf[i * 4 + 2] = fill[2];
        this.buf[i * 4 + 3] = 255;
      }
    }
  }

  // Source-over blend of one pixel.
  px(x: number, y: number, c: RGB, a = 1): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    if (a <= 0) return;
    const i = (iy * this.w + ix) * 4;
    if (a >= 1) {
      this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
      this.buf[i + 3] = 255;
      return;
    }
    const da = this.buf[i + 3] / 255;
    const sa = a;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    this.buf[i] = Math.round((c[0] * sa + this.buf[i] * da * (1 - sa)) / oa);
    this.buf[i + 1] = Math.round((c[1] * sa + this.buf[i + 1] * da * (1 - sa)) / oa);
    this.buf[i + 2] = Math.round((c[2] * sa + this.buf[i + 2] * da * (1 - sa)) / oa);
    this.buf[i + 3] = Math.round(oa * 255);
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.px(xx, yy, c, a);
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1, lw = 1): void {
    this.fillRect(x, y, w, lw, c, a);
    this.fillRect(x, y + h - lw, w, lw, c, a);
    this.fillRect(x, y, lw, h, c, a);
    this.fillRect(x + w - lw, y, lw, h, c, a);
  }

  // Bresenham line; lw>1 draws parallel offsets.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1, lw = 1): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) { this.px(x0, y0, c, a); return; }
    const nx = -dy / steps;
    const ny = dx / steps;
    const half = (lw - 1) / 2;
    for (let s = 0; s <= steps; s++) {
      const bx = x0 + (dx * s) / steps;
      const by = y0 + (dy * s) / steps;
      for (let k = -Math.floor(half); k <= Math.ceil(half); k++) {
        this.px(bx + nx * k, by + ny * k, c, a);
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB, filled = true, a = 1): void {
    if (filled) {
      for (let y = -r; y <= r; y++) {
        const dx = Math.sqrt(Math.max(0, r * r - y * y));
        this.fillRect(cx - dx, cy + y, dx * 2, 1, c, a);
      }
    } else {
      const steps = Math.max(24, Math.floor(2 * Math.PI * r));
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        this.px(cx + Math.cos(t) * r, cy + Math.sin(t) * r, c, a);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, filled = true, a = 1): void {
    if (filled) {
      for (let y = -ry; y <= ry; y++) {
        const t = 1 - (y * y) / (ry * ry);
        if (t < 0) continue;
        const dx = rx * Math.sqrt(t);
        this.fillRect(cx - dx, cy + y, dx * 2, 1, c, a);
      }
    } else {
      const steps = Math.max(32, Math.floor(2 * Math.PI * Math.max(rx, ry)));
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        this.px(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, c, a);
      }
    }
  }

  // Scanline polygon fill.
  poly(pts: [number, number][], c: RGB, a = 1): void {
    if (pts.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % pts.length];
        if ((p0[1] <= y && p1[1] > y) || (p1[1] <= y && p0[1] > y)) {
          const t = (y - p0[1]) / (p1[1] - p0[1]);
          xs.push(p0[0] + t * (p1[0] - p0[0]));
        }
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.fillRect(xs[k], y, xs[k + 1] - xs[k], 1, c, a);
      }
    }
  }

  polyLine(pts: [number, number][], c: RGB, a = 1, lw = 1, closed = false): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, a, lw);
    }
    if (closed && pts.length > 2) {
      this.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], c, a, lw);
    }
  }

  // Quadratic bezier sampled as a polyline.
  quad(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, c: RGB, a = 1, lw = 1): void {
    const pts: [number, number][] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      pts.push([
        u * u * x0 + 2 * u * t * cx + t * t * x1,
        u * u * y0 + 2 * u * t * cy + t * t * y1,
      ]);
    }
    this.polyLine(pts, c, a, lw);
  }

  // Vertical linear gradient fill.
  vGrad(x: number, y: number, w: number, h: number, top: RGB, bottom: RGB, a = 1): void {
    for (let yy = 0; yy < h; yy++) {
      const t = h <= 1 ? 0 : yy / (h - 1);
      const c: RGB = [
        Math.round(top[0] + (bottom[0] - top[0]) * t),
        Math.round(top[1] + (bottom[1] - top[1]) * t),
        Math.round(top[2] + (bottom[2] - top[2]) * t),
      ];
      this.fillRect(x, y + yy, w, 1, c, a);
    }
  }

  // Radial shading: colour lerps from `inner` at centre to `outer` at the
  // ellipse edge (and stays `outer` outside). Blended at alpha `a`.
  radialShade(cx: number, cy: number, rx: number, ry: number, inner: RGB, outer: RGB, a = 1): void {
    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + ry));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = (xx - cx) / rx;
        const dy = (yy - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        const t = d;
        const c: RGB = [
          Math.round(inner[0] + (outer[0] - inner[0]) * t),
          Math.round(inner[1] + (outer[1] - inner[1]) * t),
          Math.round(inner[2] + (outer[2] - inner[2]) * t),
        ];
        this.px(xx, yy, c, a);
      }
    }
  }

  // ---- text ---------------------------------------------------------------
  textWidth(s: string, scale: number, cell?: number): number {
    const adv = cell !== undefined ? cell : 6 * scale;
    if (s.length === 0) return 0;
    return s.length * adv - (cell !== undefined ? cell - 5 * scale : scale);
  }

  text(s: string, x: number, y: number, scale: number, c: RGB, opts?: {
    bold?: boolean; align?: "left" | "center" | "right"; a?: number; cell?: number;
  }): void {
    const str = s.toUpperCase();
    const adv = opts?.cell !== undefined ? opts.cell : 6 * scale;
    const alpha = opts?.a !== undefined ? opts.a : 1;
    let sx = x;
    const w = this.textWidth(str, scale, opts?.cell);
    if (opts?.align === "center") sx = x - w / 2;
    else if (opts?.align === "right") sx = x - w;
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]] || FONT[" "];
      const gx = sx + i * adv;
      for (let row = 0; row < 7; row++) {
        const bits = g[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            this.fillRect(gx + col * scale, y + row * scale, scale, scale, c, alpha);
            if (opts?.bold) this.fillRect(gx + col * scale + 1, y + row * scale, scale, scale, c, alpha);
          }
        }
      }
    }
  }
}

// Blit a source canvas rotated by `angleDeg` around its centre onto `dst`
// centred at (cx, cy). Nearest neighbour; source alpha is honoured.
function blitRot(dst: C, src: C, cx: number, cy: number, angleDeg: number): void {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const diag = Math.ceil(Math.sqrt(src.w * src.w + src.h * src.h));
  const x0 = Math.floor(cx - diag / 2);
  const x1 = Math.ceil(cx + diag / 2);
  const y0 = Math.floor(cy - diag / 2);
  const y1 = Math.ceil(cy + diag / 2);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // inverse rotation
      const sx = Math.round(dx * cos + dy * sin + src.w / 2);
      const sy = Math.round(-dx * sin + dy * cos + src.h / 2);
      if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
      const i = (sy * src.w + sx) * 4;
      const sa = src.buf[i + 3] / 255;
      if (sa <= 0) continue;
      dst.px(x, y, [src.buf[i], src.buf[i + 1], src.buf[i + 2]], sa);
    }
  }
}

// ---------------------------------------------------------------- PNG encoder

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(cv: C): Buffer {
  const w = cv.w;
  const h = cv.h;
  // Build raw scanlines, filter 0 and filter 1 (Sub); keep the smaller.
  const raw0 = Buffer.alloc(h * (1 + w * 3));
  const raw1 = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const o0 = y * (1 + w * 3);
    const o1 = o0;
    raw0[o0] = 0;
    raw1[o1] = 1;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const r = cv.buf[si];
      const g = cv.buf[si + 1];
      const b = cv.buf[si + 2];
      raw0[o0 + 1 + x * 3] = r;
      raw0[o0 + 1 + x * 3 + 1] = g;
      raw0[o0 + 1 + x * 3 + 2] = b;
      const lr = x > 0 ? cv.buf[si - 4] : 0;
      const lg = x > 0 ? cv.buf[si - 3] : 0;
      const lb = x > 0 ? cv.buf[si - 2] : 0;
      raw1[o1 + 1 + x * 3] = (r - lr) & 255;
      raw1[o1 + 1 + x * 3 + 1] = (g - lg) & 255;
      raw1[o1 + 1 + x * 3 + 2] = (b - lb) & 255;
    }
  }
  const d0 = zlib.deflateSync(raw0, { level: 9 });
  const d1 = zlib.deflateSync(raw1, { level: 9 });
  const idat = d0.length <= d1.length ? d0 : d1;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- MRZ (ICAO 9303)
// Check digits use the 7-3-1 weighted sum; '<' = 0, A-Z = 10-35.

function mrzValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0;
}

function mrzCheck(s: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += mrzValue(s[i]) * w[i % 3];
  return sum % 10;
}

function buildMRZ(): [string, string] {
  const docNo = "V0482911"; // 8 chars, padded to 9 with '<'
  const docField = (docNo + "<").slice(0, 9);
  const docChk = mrzCheck(docField);
  const nat = "VMR";
  const dob = "881022"; // 22 OCT 1988
  const dobChk = mrzCheck(dob);
  const sex = "F";
  const exp = "310513"; // 13 MAY 2031
  const expChk = mrzCheck(exp);
  const optional = "<".repeat(15);
  // Composite check covers: doc+check, dob+check, exp+check, optional data.
  const composite = mrzCheck(docField + String(docChk) + dob + String(dobChk) + exp + String(expChk) + optional);
  const line1 = ("P<" + nat + "LINDQVIST<<MAJA<ASTRID").padEnd(44, "<");
  const line2 = docField + String(docChk) + nat + dob + String(dobChk) + sex + exp + String(expChk) + optional + String(composite);
  if (line1.length !== 44 || line2.length !== 44) {
    throw new Error("MRZ length wrong: " + line1.length + " / " + line2.length);
  }
  return [line1, line2];
}

// ---------------------------------------------------------------- palette

const PAPER = hex("#EAE4D2");      // security paper, warm
const PAPER_LT = hex("#F0EBDB");   // lighter paper tint (MRZ band)
const INK = hex("#141416");        // carbon data ink
const NAVY = hex("#111C28");       // spine / margins / header ink
const NAVY2 = hex("#1B2A3A");      // dark turtleneck
const GUIL_CYAN = hex("#506A7C");  // guilloche cyan-grey
const GUIL_SALMON = hex("#C88E84");// guilloche pale salmon
const STAMP_BLUE = hex("#1D3B68");
const STAMP_RED = hex("#782424");
const STAMP_GREEN = hex("#22522E");
const LABEL = hex("#4A4A44");      // small label grey
const SKIN = hex("#D8B49A");
const SKIN_LT = hex("#E8CDB6");
const SKIN_SH = hex("#B98F72");
const HAIR = hex("#2A2320");

// ---------------------------------------------------------------- portrait
// Maja Astrid Lindqvist, 33 — neutral biometric photo, pulled-back hair,
// dark turtleneck. Drawn inside box (bx,by,w,h) on the given canvas.
// Restrained duotone grey-blue security tint + laser-etched interlace lines
// and biometric crosshairs on the pupils / nasal bridge.

function drawPortrait(cv: C, bx: number, by: number, w: number, h: number): void {
  const cx = bx + w / 2;
  // Photo background: muted grey-blue vertical gradient.
  cv.vGrad(bx, by, w, h, hex("#BCC7CF"), hex("#98A5B0"));

  // Shoulders / dark turtleneck.
  cv.poly(
    [
      [bx + 8, by + h], [bx + 22, by + 152], [bx + 52, by + 138],
      [bx + w - 52, by + 138], [bx + w - 22, by + 152], [bx + w - 8, by + h],
    ],
    NAVY2,
  );
  // Turtleneck collar: two arcs hugging the neck.
  cv.ellipse(cx, by + 142, 22, 7, hex("#0F1826"), true);
  cv.ellipse(cx, by + 139, 17, 5, hex("#23364C"), true);
  // Collar fold highlight.
  cv.quad(bx + 56, by + 150, bx + 66, by + 142, bx + 74, by + 146, hex("#2E4358"), 0.8, 2);
  cv.quad(bx + w - 56, by + 150, bx + w - 66, by + 142, bx + w - 74, by + 146, hex("#2E4358"), 0.8, 2);

  // Neck.
  cv.fillRect(cx - 10, by + 118, 20, 26, SKIN);
  cv.fillRect(cx - 10, by + 118, 3, 26, SKIN_SH, 0.5);
  cv.fillRect(cx + 7, by + 118, 3, 26, SKIN_SH, 0.5);
  // Chin shadow under the jaw.
  cv.ellipse(cx, by + 122, 15, 5, SKIN_SH, true, 0.5);

  // Ears (small, tucked behind the hair).
  cv.ellipse(bx + 44, by + 84, 3, 6, SKIN);
  cv.ellipse(bx + w - 44, by + 84, 3, 6, SKIN);

  // Head: skin ellipse, longer and narrower than round, then jaw shaping.
  cv.ellipse(cx, by + 80, 30, 42, SKIN);
  // Soft edge around the face so it does not read as a hard cut-out.
  cv.ellipse(cx, by + 80, 30, 42, SKIN_SH, false, 0.5);
  // Cheekbone + forehead light, jaw shadow — soft radial shading.
  cv.radialShade(cx - 11, by + 74, 16, 11, SKIN_LT, SKIN, 0.5);
  cv.radialShade(cx + 11, by + 74, 16, 11, SKIN_LT, SKIN, 0.5);
  cv.radialShade(cx, by + 52, 15, 9, SKIN_LT, SKIN, 0.45);
  cv.radialShade(cx - 27, by + 92, 9, 17, SKIN_SH, SKIN, 0.4);
  cv.radialShade(cx + 27, by + 92, 9, 17, SKIN_SH, SKIN, 0.4);
  cv.radialShade(cx, by + 116, 17, 8, SKIN_SH, SKIN, 0.3);
  // Soft shadow under the cheekbones + a hint of cheek warmth.
  cv.radialShade(cx - 14, by + 100, 12, 6, SKIN_SH, SKIN, 0.22);
  cv.radialShade(cx + 14, by + 100, 12, 6, SKIN_SH, SKIN, 0.22);
  cv.radialShade(cx - 15, by + 98, 9, 5, hex("#D9A08C"), SKIN, 0.14);
  cv.radialShade(cx + 15, by + 98, 9, 5, hex("#D9A08C"), SKIN, 0.14);

  // Hair: pulled back — mass over the crown, swept to the sides, hairline
  // arc across the forehead, side strands down to the jaw.
  cv.poly(
    [
      [cx - 31, by + 88], [cx - 32, by + 62], [cx - 26, by + 46],
      [cx - 12, by + 38], [cx + 12, by + 38], [cx + 26, by + 46],
      [cx + 32, by + 62], [cx + 31, by + 88], [cx + 28, by + 66],
      [cx + 20, by + 54], [cx + 8, by + 50], [cx - 8, by + 50],
      [cx - 20, by + 54], [cx - 28, by + 66],
    ],
    HAIR,
  );
  // Hair sheen strokes.
  cv.quad(cx - 24, by + 54, cx - 12, by + 44, cx + 2, by + 44, hex("#4A3E35"), 0.8, 2);
  cv.quad(cx + 24, by + 54, cx + 12, by + 44, cx - 2, by + 44, hex("#4A3E35"), 0.8, 2);
  // A few loose strands breaking the hard hairline at the temples.
  cv.line(cx - 24, by + 56, cx - 26, by + 66, HAIR, 0.6, 1);
  cv.line(cx + 24, by + 56, cx + 26, by + 66, HAIR, 0.6, 1);
  // Side strands framing the face.
  cv.poly([[cx - 32, by + 66], [cx - 28, by + 66], [cx - 27, by + 104], [cx - 31, by + 104]], HAIR);
  cv.poly([[cx + 32, by + 66], [cx + 28, by + 66], [cx + 27, by + 104], [cx + 31, by + 104]], HAIR);
  // Centre part at the hairline.
  cv.line(cx, by + 40, cx, by + 45, hex("#4A3E35"), 0.9, 1);

  // Eyebrows: thin, straight, neutral.
  cv.quad(cx - 22, by + 70, cx - 15, by + 67, cx - 8, by + 69, HAIR, 0.9, 1);
  cv.quad(cx + 8, by + 69, cx + 15, by + 67, cx + 22, by + 70, HAIR, 0.9, 1);

  // Eyes: small almond whites, dark irises, catch-lights, upper lash line.
  const eyeY = by + 81;
  const eyeL = cx - 15;
  const eyeR = cx + 15;
  for (const ex of [eyeL, eyeR]) {
    cv.ellipse(ex, eyeY, 4, 2, hex("#F2EFE8")); // white
    cv.circle(ex, eyeY, 2, hex("#2E3A45")); // iris
    cv.fillRect(ex - 1, eyeY - 1, 2, 2, hex("#0A0A0A")); // pupil
    cv.px(ex + 1, eyeY - 1, hex("#FFFFFF")); // catch-light
    // Upper lash line.
    cv.quad(ex - 4, eyeY - 2, ex, eyeY - 3, ex + 4, eyeY - 2, hex("#1A1A1A"), 0.9, 1);
    // Lower lid line, faint.
    cv.quad(ex - 4, eyeY + 3, ex, eyeY + 4, ex + 4, eyeY + 3, SKIN_SH, 0.5, 1);
  }

  // Nose: bridge highlight + shadow strokes + nostril base.
  cv.line(cx + 1, by + 76, cx + 1, by + 92, SKIN_LT, 0.5, 1);
  cv.line(cx - 1, by + 72, cx - 2, by + 88, SKIN_SH, 0.35, 1);
  cv.line(cx - 2, by + 88, cx - 3, by + 102, SKIN_SH, 0.7, 1);
  cv.line(cx + 3, by + 90, cx + 4, by + 102, SKIN_SH, 0.55, 1);
  cv.line(cx - 4, by + 104, cx + 4, by + 104, SKIN_SH, 0.65, 1);

  // Mouth: neutral, closed, straight, with a faint lower-lip highlight.
  cv.line(cx - 9, by + 120, cx + 9, by + 120, hex("#7A4A3A"), 0.9, 2);
  cv.fillRect(cx - 5, by + 123, 10, 1, SKIN_LT, 0.6);

  // Security overlay: horizontal laser-etched interlace lines.
  for (let y = by + 2; y < by + h; y += 3) {
    cv.fillRect(bx, y, w, 1, hex("#33465A"), 0.07);
  }
  // Biometric crosshairs on pupils and nasal bridge.
  const cross = (px: number, py: number): void => {
    const cc = hex("#3E6B8A");
    cv.line(px - 4, py, px + 4, py, cc, 0.45, 1);
    cv.line(px, py - 4, px, py + 4, cc, 0.45, 1);
  };
  cross(eyeL, eyeY);
  cross(eyeR, eyeY);
  cross(cx, by + 96);
}

// ---------------------------------------------------------------- crest
// National crest: double sea-eagle wings over an anchor, ringed, with a
// four-point star — drawn as a simple vector emblem.

function drawCrest(cv: C, cx: number, cy: number): void {
  cv.circle(cx, cy, 34, NAVY, false, 1);
  cv.circle(cx, cy, 30, NAVY, false, 0.8);
  // Four-point star at the top.
  cv.poly(
    [[cx, cy - 27], [cx + 2, cy - 21], [cx + 7, cy - 19], [cx + 2, cy - 17],
     [cx, cy - 11], [cx - 2, cy - 17], [cx - 7, cy - 19], [cx - 2, cy - 21]],
    GUIL_SALMON, 0.95,
  );
  // Wing arcs flanking the shield.
  cv.quad(cx - 28, cy - 2, cx - 24, cy - 12, cx - 16, cy - 12, NAVY, 0.95, 2);
  cv.quad(cx - 28, cy + 2, cx - 22, cy - 4, cx - 16, cy - 6, NAVY, 0.95, 2);
  cv.quad(cx + 28, cy - 2, cx + 24, cy - 12, cx + 16, cy - 12, NAVY, 0.95, 2);
  cv.quad(cx + 28, cy + 2, cx + 22, cy - 4, cx + 16, cy - 6, NAVY, 0.95, 2);
  // Shield outline.
  cv.polyLine(
    [[cx - 14, cy - 10], [cx + 14, cy - 10], [cx + 14, cy + 6], [cx, cy + 18], [cx - 14, cy + 6]],
    NAVY, 1, 2, true,
  );
  // Anchor inside the shield: shank, stock, ring, flukes.
  cv.line(cx, cy - 8, cx, cy + 13, NAVY, 1, 2);
  cv.line(cx - 6, cy - 3, cx + 6, cy - 3, NAVY, 1, 2);
  cv.circle(cx, cy - 7, 2, NAVY, false, 1);
  cv.quad(cx - 9, cy + 4, cx - 9, cy + 12, cx, cy + 14, NAVY, 1, 2);
  cv.quad(cx + 9, cy + 4, cx + 9, cy + 12, cx, cy + 14, NAVY, 1, 2);
  cv.line(cx - 11, cy + 3, cx - 7, cy + 9, NAVY, 1, 2);
  cv.line(cx + 11, cy + 3, cx + 7, cy + 9, NAVY, 1, 2);
  // Waves under the shield.
  cv.quad(cx - 14, cy + 25, cx - 7, cy + 22, cx, cy + 25, GUIL_CYAN, 0.8, 1);
  cv.quad(cx, cy + 25, cx + 7, cy + 22, cx + 14, cy + 25, GUIL_CYAN, 0.8, 1);
}

// ---------------------------------------------------------------- stamps
// A rubber stamp is drawn on its own transparent canvas, then blit rotated
// onto the spread. `lines` are drawn centred, top to bottom.

interface StampLine { s: string; scale: number; bold?: boolean }

function makeStamp(w: number, h: number, ink: RGB, lines: StampLine[], shape: "rect" | "oval", seed: number): C {
  const cv = new C(w, h, null);
  const a = 0.88;
  if (shape === "rect") {
    cv.rect(3, 3, w - 6, h - 6, ink, a, 3);
    cv.rect(8, 8, w - 16, h - 16, ink, a * 0.8, 1);
  } else {
    cv.ellipse(w / 2, h / 2, w / 2 - 3, h / 2 - 3, ink, false, a);
    cv.ellipse(w / 2, h / 2, w / 2 - 8, h / 2 - 8, ink, false, a * 0.8);
  }
  // Text lines, vertically centred as a block. Scale-2 text uses a tighter
  // 11px advance so long stamp legends fit inside the border.
  const lineH = lines.map((l) => 7 * l.scale + 6);
  const total = lineH.reduce((s, v) => s + v, 0);
  let y = (h - total) / 2;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    cv.text(l.s, w / 2, y, l.scale, ink, {
      bold: l.bold !== false, align: "center", a,
      cell: l.scale === 2 ? 11 : undefined,
    });
    y += lineH[i];
  }
  // Rubber-stamp distress: deterministic punch-outs so the ink is uneven.
  const r = rng(seed);
  for (let i = 0; i < 55; i++) {
    const px = Math.floor(r() * w);
    const py = Math.floor(r() * h);
    const rad = 1;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const ii = ((py + dy) * w + (px + dx)) * 4;
        if (px + dx >= 0 && px + dx < w && py + dy >= 0 && py + dy < h && ii >= 0 && ii < cv.buf.length) {
          cv.buf[ii + 3] = 0;
        }
      }
    }
  }
  return cv;
}

// ---------------------------------------------------------------- the spread

const W = 1024;
const H = 1024;
const GUTTER = 512;
const PAGE_L = 48;   // spread left edge
const PAGE_R = 976;  // spread right edge
const PAGE_T = 110;  // spread top edge
const PAGE_B = 914;  // spread bottom edge

function drawSpread(): C {
  const cv = new C(W, H, NAVY);

  // --- paper ----------------------------------------------------------------
  cv.fillRect(PAGE_L, PAGE_T, PAGE_R - PAGE_L, PAGE_B - PAGE_T, PAPER);
  // Subtle vertical lightening towards the centre of each page.
  cv.vGrad(PAGE_L, PAGE_T, GUTTER - PAGE_L, PAGE_B - PAGE_T, hex("#EDE8D6"), hex("#E4DECB"), 0.35);
  cv.vGrad(GUTTER, PAGE_T, PAGE_R - GUTTER, PAGE_B - PAGE_T, hex("#EDE8D6"), hex("#E4DECB"), 0.35);
  // Paper grain: deterministic speckles.
  const gr = rng(20261121);
  for (let i = 0; i < 2600; i++) {
    const x = PAGE_L + Math.floor(gr() * (PAGE_R - PAGE_L));
    const y = PAGE_T + Math.floor(gr() * (PAGE_B - PAGE_T));
    cv.px(x, y, gr() > 0.5 ? hex("#CFC8B0") : hex("#F4EFE0"), 0.16);
  }
  // Guilloche: faint wavy lines along the top and bottom edges of the spread.
  for (let pass = 0; pass < 3; pass++) {
    const yBase = PAGE_T + 14 + pass * 5;
    const col = pass % 2 === 0 ? GUIL_CYAN : GUIL_SALMON;
    for (let x = PAGE_L + 6; x < PAGE_R - 6; x++) {
      const y = yBase + Math.round(2.2 * Math.sin((x / 26) + pass));
      cv.px(x, y, col, 0.16);
    }
    const yBase2 = PAGE_B - 14 - pass * 5;
    for (let x = PAGE_L + 6; x < PAGE_R - 6; x++) {
      const y = yBase2 + Math.round(2.2 * Math.sin((x / 26) + pass));
      cv.px(x, y, col, 0.16);
    }
  }
  // Outer edge shadow of the open book + page border.
  cv.rect(PAGE_L, PAGE_T, PAGE_R - PAGE_L, PAGE_B - PAGE_T, hex("#8F8871"), 0.9, 2);
  cv.line(PAGE_L, PAGE_B, PAGE_R, PAGE_B, hex("#6E6752"), 0.5, 3);
  // Gutter: fold shadow + stitching.
  cv.fillRect(GUTTER - 3, PAGE_T, 6, PAGE_B - PAGE_T, hex("#C9C2AC"), 0.9);
  cv.fillRect(GUTTER - 1, PAGE_T, 2, PAGE_B - PAGE_T, hex("#A89F83"), 0.9);
  for (const ky of [260, 420, 600, 760]) {
    cv.line(GUTTER, PAGE_T + 8, GUTTER, PAGE_B - 8, hex("#F7F3E6"), 0.85, 1);
    cv.circle(GUTTER, ky, 3, hex("#F7F3E6"), true, 0.95);
    cv.circle(GUTTER, ky, 1, hex("#B9B198"), true, 0.9);
  }

  // ============================================================ LEFT PAGE ===
  const LCX = (PAGE_L + GUTTER) / 2; // 280, centre of left page

  // Crest + country header.
  drawCrest(cv, LCX, 168);
  cv.text("REPUBLIKEN VESTERMARK", LCX, 218, 2, NAVY, { bold: true, align: "center" });
  cv.text("PASSPOR / PASSPORT", LCX, 240, 2, NAVY, { bold: true, align: "center" });
  cv.line(70, 264, 490, 264, NAVY, 1, 2);
  cv.line(70, 268, 490, 268, GUIL_SALMON, 0.9, 1);

  // Photo box with micro-line border + corner registration marks.
  const PH_X = 78;
  const PH_Y = 282;
  const PH_W = 150;
  const PH_H = 196;
  cv.rect(PH_X - 4, PH_Y - 4, PH_W + 8, PH_H + 8, NAVY, 1, 2);
  cv.rect(PH_X - 1, PH_Y - 1, PH_W + 2, PH_H + 2, NAVY, 0.7, 1);
  drawPortrait(cv, PH_X, PH_Y, PH_W, PH_H);
  for (const [mx, my, dx, dy] of [
    [PH_X - 4, PH_Y - 4, 1, 1], [PH_X + PH_W + 4, PH_Y - 4, -1, 1],
    [PH_X - 4, PH_Y + PH_H + 4, 1, -1], [PH_X + PH_W + 4, PH_Y + PH_H + 4, -1, -1],
  ] as [number, number, number, number][]) {
    cv.line(mx, my, mx + dx * 10, my, NAVY, 1, 1);
    cv.line(mx, my, mx, my + dy * 10, NAVY, 1, 1);
  }

  // Signature under the photo.
  cv.quad(86, 504, 98, 490, 112, 503, hex("#1E2A38"), 0.95, 2);
  cv.quad(112, 503, 122, 492, 134, 504, hex("#1E2A38"), 0.95, 2);
  cv.quad(134, 504, 148, 494, 162, 502, hex("#1E2A38"), 0.95, 2);
  cv.quad(162, 502, 176, 496, 196, 500, hex("#1E2A38"), 0.95, 2);
  cv.circle(202, 502, 1, hex("#1E2A38"), true, 0.95);
  cv.line(78, 512, 228, 512, INK, 0.9, 1);
  cv.text("SIGNATURE / UNDERSKRIFT", 153, 518, 1, LABEL, { align: "center" });

  // Extra bio-data under the photo (fills the lower-left block).
  cv.text("HEIGHT / LANGD", 78, 556, 1, LABEL);
  cv.text("172 CM", 78, 567, 2, INK, { bold: true });
  cv.text("EYES / OGON", 78, 600, 1, LABEL);
  cv.text("BLUE", 78, 611, 2, INK, { bold: true });
  cv.text("HAIR / HAR", 78, 644, 1, LABEL);
  cv.text("BROWN", 78, 655, 2, INK, { bold: true });

  // Data fields, two columns right of the photo.
  const DX = 252;
  const field = (label: string, value: string, x: number, y: number, vscale = 2): void => {
    cv.text(label, x, y, 1, LABEL);
    cv.text(value, x, y + 11, vscale, INK, { bold: true });
  };
  // Top row: type / code / number.
  cv.text("TYPE / TYP", DX, 286, 1, LABEL);
  cv.text("P", DX, 297, 2, INK, { bold: true });
  cv.text("CODE / KOD", DX + 62, 286, 1, LABEL);
  cv.text("VMR", DX + 62, 297, 2, INK, { bold: true });
  cv.text("PASSPORT NO. / NR.", DX + 128, 286, 1, LABEL);
  cv.text("V0482911", DX + 128, 297, 2, INK, { bold: true });
  cv.line(DX, 318, 496, 318, hex("#B9B198"), 0.7, 1);

  field("SURNAME / EFTERNAMN", "LINDQVIST", DX, 332);
  field("GIVEN NAMES / FORNAMN", "MAJA ASTRID", DX, 374);
  field("NATIONALITY / NATIONALITET", "VESTERMARKISK", DX, 416);
  field("DATE OF BIRTH / FODSELSDATO", "22 OKT 1988", DX, 458);
  cv.text("SEX / KON", DX, 500, 1, LABEL);
  cv.text("F", DX, 511, 2, INK, { bold: true });
  field("PLACE OF BIRTH / FODESTED", "KRONSBORG", DX + 68, 500);
  field("DATE OF ISSUE / UTSTEDELSESDATO", "14 MAJ 2021", DX, 542);
  field("DATE OF EXPIRY / UTGARSDATO", "13 MAJ 2031", DX, 584);
  field("AUTHORITY / MYNDIGHET", "POLISMYNDIGHETEN", DX, 626);
  cv.text("KRONSBORG", DX, 649, 2, INK, { bold: true });

  // MRZ band (two lines, fixed pitch, check digits computed by buildMRZ).
  const [mrz1, mrz2] = buildMRZ();
  cv.fillRect(60, 692, GUTTER - 60 - 8, 100, PAPER_LT, 0.9);
  cv.line(60, 692, GUTTER - 8, 692, hex("#B9B198"), 0.8, 1);
  cv.line(60, 792, GUTTER - 8, 792, hex("#B9B198"), 0.8, 1);
  cv.text(mrz1, 68, 712, 2, INK, { cell: 10 });
  cv.text(mrz2, 68, 748, 2, INK, { cell: 10 });

  // Property line at the foot of the bio page.
  cv.text("THIS PASSPORT REMAINS THE PROPERTY OF THE", LCX, 830, 1, LABEL, { align: "center" });
  cv.text("REPUBLIC OF VESTERMARK", LCX, 842, 1, LABEL, { align: "center" });

  // =========================================================== RIGHT PAGE ===
  const RCX = (GUTTER + PAGE_R) / 2; // 744, centre of right page

  cv.text("VISERINGAR / VISAS / OBSERVATIONS", RCX, 148, 2, NAVY, { bold: true, align: "center" });
  cv.line(540, 176, 948, 176, NAVY, 1, 2);
  cv.line(540, 180, 948, 180, GUIL_SALMON, 0.9, 1);

  // Watermark: compass rose + bathymetric depth contours, ~8% opacity.
  const WCX = RCX;
  const WCY = 470;
  const wm = (a: number): void => {
    cv.circle(WCX, WCY, 170, GUIL_CYAN, false, a);
    cv.circle(WCX, WCY, 128, GUIL_CYAN, false, a);
    cv.circle(WCX, WCY, 88, GUIL_CYAN, false, a);
    cv.circle(WCX, WCY, 48, GUIL_CYAN, false, a);
    // 8-point star.
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      const len = k % 2 === 0 ? 165 : 110;
      cv.line(
        WCX + Math.cos(ang) * 52, WCY + Math.sin(ang) * 52,
        WCX + Math.cos(ang) * len, WCY + Math.sin(ang) * len,
        GUIL_CYAN, a, 1,
      );
    }
    // Wobbly bathymetric rings.
    for (const [r0, ph] of [[62, 0], [104, 2.1], [148, 4.4]] as [number, number][]) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 72; i++) {
        const t = (i / 72) * 2 * Math.PI;
        const r = r0 + 5 * Math.sin(3 * t + ph) + 2 * Math.sin(7 * t + ph * 2);
        pts.push([WCX + Math.cos(t) * r, WCY + Math.sin(t) * r]);
      }
      cv.polyLine(pts, GUIL_CYAN, a, 1, true);
    }
  };
  wm(0.09);

  // --- stamps: one coherent journey, all dated AFTER issue 14 MAY 2021 ---
  // (1) Departure, home port.
  blitRot(cv, makeStamp(190, 105, STAMP_GREEN, [
    { s: "GRANSPOLIS", scale: 2 },
    { s: "KRONSBORG HAVN", scale: 1 },
    { s: "UTRESA - EXIT", scale: 2 },
    { s: "02.06.2021", scale: 2 },
  ], "rect", 11), 640, 268, -4);
  // (2) Entry, neighbouring port Bergen (Norgate) — crosses the page edge.
  blitRot(cv, makeStamp(185, 100, STAMP_BLUE, [
    { s: "BERGEN", scale: 2 },
    { s: "NORGATE", scale: 1 },
    { s: "INNRESA - ENTRY", scale: 2 },
    { s: "14.07.2021", scale: 2 },
  ], "rect", 22), 892, 272, 3);
  // (3) Ferry / sea route.
  blitRot(cv, makeStamp(200, 95, STAMP_BLUE, [
    { s: "NORDSJOFERJA", scale: 2 },
    { s: "SEA ROUTE 7", scale: 1 },
    { s: "28.09.2021", scale: 2 },
  ], "rect", 33), 652, 432, -2);
  // (4) Return / re-entry home.
  blitRot(cv, makeStamp(185, 105, STAMP_RED, [
    { s: "KRONSBORG HAVN", scale: 2 },
    { s: "INNRESA - ENTRY", scale: 2 },
    { s: "09.11.2021", scale: 2 },
  ], "rect", 44), 858, 448, 5);
  // (5) Third neighbour, Tromso — oval entry stamp.
  blitRot(cv, makeStamp(200, 105, STAMP_BLUE, [
    { s: "TROMSO", scale: 2 },
    { s: "NORGATE - ENTRY", scale: 2 },
    { s: "11.02.2022", scale: 2 },
  ], "oval", 55), 744, 602, -6);

  // --- Weather Protocol box (the telling paperwork detail) ---------------
  const WB_X = 545;
  const WB_Y = 700;
  const WB_W = 400;
  const WB_H = 92;
  cv.fillRect(WB_X, WB_Y, WB_W, WB_H, PAPER_LT, 0.95);
  cv.rect(WB_X, WB_Y, WB_W, WB_H, NAVY, 1, 2);
  cv.fillRect(WB_X, WB_Y, WB_W, 24, NAVY);
  cv.text("WEATHER PROTOCOL 7", WB_X + WB_W / 2, WB_Y + 5, 2, hex("#F0EBDB"), { bold: true, align: "center" });
  cv.text("ENTRY PERMITTED 0600-1800 ONLY", WB_X + WB_W / 2, WB_Y + 34, 2, INK, { align: "center", cell: 11 });
  cv.text("HARBOURMASTER CLEARANCE REQUIRED", WB_X + WB_W / 2, WB_Y + 54, 2, INK, { align: "center", cell: 11 });
  cv.text("STORM SURGE LEVY - PAID 40 KR", WB_X + WB_W / 2, WB_Y + 72, 2, STAMP_RED, { bold: true, align: "center", cell: 11 });

  // Fee stamp: clear of the box text, bottom-right of the visa page.
  blitRot(cv, makeStamp(112, 56, STAMP_RED, [
    { s: "PAID", scale: 2 },
    { s: "40 KR", scale: 2 },
    { s: "11.02.2022", scale: 1 },
  ], "rect", 66), 880, 850, -8);

  // Observation line + page number.
  cv.text("OBS: HOLDER AUTHORISED FOR OFFSHORE PLATFORM ACCESS - CAT. B", WB_X, 812, 1, INK, { bold: true });
  cv.text("3", 952, 868, 2, NAVY, { bold: true, align: "right" });

  return cv;
}

// ---------------------------------------------------------------- main

function main(): void {
  const [mrz1, mrz2] = buildMRZ();
  console.log("MRZ line 1:", mrz1);
  console.log("MRZ line 2:", mrz2);

  const cv = drawSpread();
  const png = encodePNG(cv);
  console.log("PNG bytes:", png.length, "limit: 1048576, within limit:", png.length <= 1048576);

  let out = process.argv[2];
  if (!out) {
    const preferred = "/output/entry.png";
    try {
      fs.mkdirSync("/output", { recursive: true });
      fs.writeFileSync(preferred, png);
      out = preferred;
    } catch {
      const local = path.join(process.cwd(), "output", "entry.png");
      fs.mkdirSync(path.dirname(local), { recursive: true });
      fs.writeFileSync(local, png);
      out = local;
    }
  } else {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, png);
  }
  console.log("Wrote:", out, `(${cv.w}x${cv.h})`);
}

main();
