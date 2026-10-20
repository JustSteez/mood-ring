// Builds the Mood Ring brand kit: SVGs with outlined text, plus PNG renders.
// Run: npm install && npm run build   (inside brand/)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = { svg: resolve(here, 'svg'), png: resolve(here, 'png'), posts: resolve(here, 'posts') };
Object.values(OUT).forEach((d) => mkdirSync(d, { recursive: true }));

const SITE = 'mood-ring-flax.vercel.app';

// Same tokens as web/src/styles/app.css
const C = { bg: '#fafaf9', surface: '#ffffff', ink: '#0a0a0a', muted: '#6b7280', line: '#e7e5e4', white: '#ffffff' };

// Mood colours, as painted by the contract (MoodArt.sol)
const MOODS = [
  ['Euphoric', '#D4FF3A', 'above +2%'],
  ['Bullish', '#B8F5D2', 'above +0.3%'],
  ['Flat', '#5B2EFF', 'within ±0.3%'],
  ['Bearish', '#FF8A3D', 'below −0.3%'],
  ['Panic', '#FF3B30', 'below −2%'],
];

// ---------------------------------------------------------------- text as outlines

const inter = (w) => opentype.loadSync(resolve(here, `node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff`));
const F = { regular: inter(400), medium: inter(500), semi: inter(600), bold: inter(700), black: inter(800) };

function measure(f, str, size, spacing = 0) {
  return [...str].reduce((w, ch) => w + f.getAdvanceWidth(ch, size) + spacing, 0) - spacing;
}

function text(f, str, x, y, size, fill, { anchor = 'start', spacing = 0 } = {}) {
  const width = measure(f, str, size, spacing);
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  for (const ch of str) {
    d += f.getPath(ch, cx, y, size).toPathData(2);
    cx += f.getAdvanceWidth(ch, size) + spacing;
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') +
  body +
  '</svg>';

// ---------------------------------------------------------------- the mark

/** The ring: a band with a stone. Drawn on a 32-unit grid, same as the site's Logo.tsx. */
function mark(x, y, size, fill) {
  const k = size / 32;
  return (
    `<g transform="translate(${x} ${y}) scale(${k})">` +
    `<circle cx="16" cy="19" r="9.5" fill="none" stroke="${fill}" stroke-width="3.5"/>` +
    `<circle cx="16" cy="7.5" r="5.5" fill="${fill}"/></g>`
  );
}

/** App icon / favicon: white ring on an ink tile (same geometry as web/public/favicon.svg). */
function tile(x, y, size) {
  const k = size / 32;
  return (
    `<g transform="translate(${x} ${y}) scale(${k})"><rect width="32" height="32" rx="8" fill="${C.ink}"/>` +
    `<circle cx="16" cy="19" r="7.5" fill="none" stroke="${C.white}" stroke-width="3"/>` +
    `<circle cx="16" cy="9.5" r="4.5" fill="${C.white}"/></g>`
  );
}

const WORD = 'Mood Ring';
const wordSpacing = (size) => -size * 0.02;
const wordmark = (x, y, size, fill) => text(F.bold, WORD, x, y, size, fill, { spacing: wordSpacing(size) });
const wordWidth = (size) => measure(F.bold, WORD, size, wordSpacing(size));

/** Mark + wordmark side by side. Returns { body, width }. */
function lockupBody(x, y, size, fill) {
  const m = size * 1.15;
  const gap = size * 0.3;
  const body = mark(x, y + (size - m) / 2 - size * 0.02, m, fill) + wordmark(x + m + gap, y + size * 0.86, size, fill);
  return { body, width: m + gap + wordWidth(size) };
}

function lockup(fill, bg) {
  const size = 96;
  const pad = 48;
  const { body, width } = lockupBody(pad, pad, size, fill);
  return svg(Math.round(width + pad * 2), Math.round(size + pad * 2), body, bg);
}

// ---------------------------------------------------------------- art cards

const sample = (name) =>
  `data:image/png;base64,${readFileSync(resolve(here, '../web/public/samples', `${name}.png`)).toString('base64')}`;
const ART = Object.fromEntries(['genesis', 'euphoric', 'bearish', 'panic'].map((n) => [n, sample(n)]));

let clipId = 0;
const SHADOW =
  '<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%">' +
  '<feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.14"/></filter></defs>';

/** A white card holding one artwork, optionally rotated. */
function card(name, x, y, size, { rotate = 0, pad = size * 0.035 } = {}) {
  const id = `c${clipId++}`;
  const r = size * 0.06;
  const inner = size - pad * 2;
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    `<g transform="rotate(${rotate} ${cx} ${cy})">` +
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${C.surface}" stroke="${C.line}" filter="url(#sh)"/>` +
    `<clipPath id="${id}"><rect x="${x + pad}" y="${y + pad}" width="${inner}" height="${inner}" rx="${r * 0.6}"/></clipPath>` +
    `<image href="${ART[name]}" x="${x + pad}" y="${y + pad}" width="${inner}" height="${inner}" clip-path="url(#${id})"/></g>`
  );
}

/** Small rounded label, e.g. a status pill. */
function pill(str, x, y, size, { fill = C.surface, color = C.ink, dot } = {}) {
  const h = size * 2.2;
  const padX = size * 1.0;
  const dotW = dot ? size * 1.1 : 0;
  const w = measure(F.medium, str, size) + padX * 2 + dotW;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${C.line}"/>`;
  if (dot) out += `<circle cx="${x + padX + size * 0.3}" cy="${y + h / 2}" r="${size * 0.3}" fill="${dot}"/>`;
  out += text(F.medium, str, x + padX + dotW, y + h / 2 + size * 0.36, size, color);
  return { svg: out, width: w, height: h };
}

/** Headline in two tones: "The stock market," / "painted once a day." */
function headline(x, y, size) {
  const sp = -size * 0.03;
  return (
    text(F.black, 'The stock market,', x, y, size, C.ink, { spacing: sp }) +
    text(F.black, 'painted once a day.', x, y + size * 1.08, size, C.muted, { spacing: sp })
  );
}

// ---------------------------------------------------------------- compositions

function avatar(dark) {
  const S = 400;
  return dark ? svg(S, S, mark(80, 80, 240, C.white), C.ink) : svg(S, S, mark(80, 80, 240, C.ink), C.bg);
}

function banner() {
  const W = 1500;
  const H = 500;
  // X puts the profile photo over the lower-left, so the text sits high and the art sits right.
  let body = SHADOW;
  body += headline(90, 170, 74);
  body += text(F.regular, 'Daily on-chain art from eight real stock prices.', 92, 320, 28, C.muted);
  body += card('euphoric', 900, 120, 270, { rotate: -6 });
  body += card('panic', 1150, 150, 270, { rotate: 5 });
  body += card('genesis', 1030, 90, 290, { rotate: 0 });
  return svg(W, H, body, C.bg);
}

function og() {
  const W = 1200;
  const H = 630;
  let body = SHADOW;
  body += lockupBody(72, 64, 40, C.ink).body;
  body += headline(72, 280, 66);
  body += text(F.regular, 'Free mint. Fully on-chain. Robinhood Chain.', 74, 420, 26, C.muted);
  body += text(F.semi, SITE, 74, 556, 24, C.ink);
  body += card('genesis', 700, 130, 420, { rotate: 3 });
  return svg(W, H, body, C.bg);
}

function launchPost() {
  const W = 1600;
  const H = 900;
  let body = SHADOW;
  body += lockupBody(96, 80, 44, C.ink).body;
  body += pill('Live on Robinhood Chain', 96, 200, 22, { dot: '#059669' }).svg;
  body += headline(96, 360, 84);
  const facts = ['Snap the day, once per day', 'The market paints the art', 'Mint free, forever on-chain'];
  facts.forEach((f, i) => {
    const y = 560 + i * 62;
    body += `<circle cx="${110}" cy="${y - 10}" r="7" fill="${C.ink}"/>`;
    body += text(F.medium, f, 134, y, 30, C.ink);
  });
  body += text(F.semi, SITE, 96, 820, 26, C.muted);
  const s = 300;
  body += card('genesis', 900, 110, s, { rotate: -3 });
  body += card('euphoric', 1230, 140, s, { rotate: 3 });
  body += card('bearish', 900, 450, s, { rotate: 2 });
  body += card('panic', 1230, 480, s, { rotate: -2 });
  return svg(W, H, body, C.bg);
}

function palette() {
  const W = 1500;
  const H = 560;
  let body = text(F.bold, 'Mood Ring colours', 80, 110, 44, C.ink, { spacing: -0.9 });
  const ui = [
    ['Ink', C.ink],
    ['Muted', C.muted],
    ['Line', C.line],
    ['Paper', C.bg],
  ];
  const sw = (x, y, w, name, hex, sub) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="150" rx="16" fill="${hex}" stroke="${C.line}"/>`;
    s += text(F.semi, name, x, y + 190, 24, C.ink);
    s += text(F.regular, sub ? `${hex.toUpperCase()}  ·  ${sub}` : hex.toUpperCase(), x, y + 222, 20, C.muted);
    return s;
  };
  ui.forEach(([n, h], i) => (body += sw(80 + i * 340, 160, 300, n, h)));
  body += text(F.semi, 'Daily moods (art backgrounds)', 80, 470, 22, C.muted);
  MOODS.forEach(([n, h, r], i) => {
    const x = 80 + i * 272;
    body += `<rect x="${x}" y="490" width="240" height="40" rx="10" fill="${h}"/>`;
    body += text(F.semi, `${n}  ${h}`, x + 12, 517, 18, n === 'Flat' || n === 'Panic' ? C.white : C.ink);
    void r;
  });
  return svg(W, H + 20, body, C.surface);
}

// ---------------------------------------------------------------- write

const assets = {
  'mark-black': svg(32, 32, mark(0, 0, 32, C.ink)),
  'mark-white': svg(32, 32, mark(0, 0, 32, C.white)),
  'app-icon': svg(32, 32, tile(0, 0, 32)),
  'lockup-black': lockup(C.ink),
  'lockup-white': lockup(C.white),
};
const pngs = {
  'mark-black-1024': [assets['mark-black'], 1024],
  'mark-white-1024': [assets['mark-white'], 1024],
  'app-icon-1024': [assets['app-icon'], 1024],
  'app-icon-512': [assets['app-icon'], 512],
  'lockup-black': [assets['lockup-black'], 1600],
  'lockup-white': [assets['lockup-white'], 1600],
  'lockup-on-paper': [lockup(C.ink, C.bg), 1600],
  'lockup-on-ink': [lockup(C.white, C.ink), 1600],
  'x-avatar-dark': [avatar(true), 400],
  'x-avatar-light': [avatar(false), 400],
  'x-banner': [banner(), 1500],
  'og-image': [og(), 1200],
  palette: [palette(), 1500],
};
const posts = { 'launch-post': [launchPost(), 1600] };

const render = (src, width) => new Resvg(src, { fitTo: { mode: 'width', value: width } }).render().asPng();

for (const [name, src] of Object.entries(assets)) writeFileSync(resolve(OUT.svg, `${name}.svg`), src);
for (const [name, [src, w]] of Object.entries(pngs)) writeFileSync(resolve(OUT.png, `${name}.png`), render(src, w));
for (const [name, [src, w]] of Object.entries(posts)) writeFileSync(resolve(OUT.posts, `${name}.png`), render(src, w));
console.log(`built ${Object.keys(assets).length} svg, ${Object.keys(pngs).length} png, ${Object.keys(posts).length} posts`);
