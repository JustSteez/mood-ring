// Builds the Mood Ring brand kit (dark edition, matching the live site): SVGs with outlined
// text, plus PNG renders. Run: npm install && npm run build   (inside brand/)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import opentype from 'opentype.js'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = { svg: resolve(here, 'svg'), png: resolve(here, 'png'), posts: resolve(here, 'posts') }
Object.values(OUT).forEach((d) => mkdirSync(d, { recursive: true }))

const SITE = 'moodring.top'

// Same tokens as web/src/styles/app.css
const C = {
  bg: '#000000',
  panel: '#0b0b0c',
  panel2: '#111113',
  line: '#1d1d20',
  line2: '#2a2a2e',
  ink: '#f4f4f2',
  ink2: '#c9c9cc',
  muted: '#8a8a90',
  good: '#7ee0b0',
  ember: '#ff5a36',
  genesis: '#5B2EFF',
}

// Mood colours, as painted by the contract (MoodArt.sol)
const MOODS = [
  ['Euphoric', '#D4FF3A'],
  ['Bullish', '#B8F5D2'],
  ['Flat', '#5B2EFF'],
  ['Bearish', '#FF8A3D'],
  ['Panic', '#FF3B30'],
]

// ---------------------------------------------------------------- text as outlines

const font = (pkg, file) => opentype.loadSync(resolve(here, `node_modules/@fontsource/${pkg}/files/${file}`))
const F = {
  sans: font('geist-sans', 'geist-sans-latin-400-normal.woff'),
  sansMed: font('geist-sans', 'geist-sans-latin-500-normal.woff'),
  sansSemi: font('geist-sans', 'geist-sans-latin-600-normal.woff'),
  sansBlack: font('geist-sans', 'geist-sans-latin-800-normal.woff'),
  mono: font('geist-mono', 'geist-mono-latin-400-normal.woff'),
  serif: font('instrument-serif', 'instrument-serif-latin-400-italic.woff'),
}

function measure(f, str, size, spacing = 0) {
  return [...str].reduce((w, ch) => w + f.getAdvanceWidth(ch, size) + spacing, 0) - spacing
}

function text(f, str, x, y, size, fill, { anchor = 'start', spacing = 0, extra = '' } = {}) {
  const width = measure(f, str, size, spacing)
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
  let d = ''
  for (const ch of str) {
    d += f.getPath(ch, cx, y, size).toPathData(2)
    cx += f.getAdvanceWidth(ch, size) + spacing
  }
  return `<path d="${d}" fill="${fill}"${extra}/>`
}

/** Mono uppercase label, like the site's .kicker. */
const kicker = (str, x, y, size, fill = C.muted) => text(F.mono, str.toUpperCase(), x, y, size, fill, { spacing: size * 0.14 })

/** Segments on one baseline: [[font, str, fill, spacing?], ...]. */
function runs(parts, x, y, size) {
  let cx = x
  let out = ''
  for (const [f, str, fill, sp = 0] of parts) {
    out += text(f, str, cx, y, size, fill, { spacing: size * sp })
    cx += measure(f, str, size, size * sp)
  }
  return out
}

const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  DEFS +
  (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') +
  body +
  '</svg>'

const DEFS =
  '<defs>' +
  '<linearGradient id="silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9cbd0"/><stop offset="1" stop-color="#8d9097"/></linearGradient>' +
  '<linearGradient id="band" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#b9bcc3"/><stop offset=".6" stop-color="#6d7079"/><stop offset=".85" stop-color="#e6e7ea"/><stop offset="1" stop-color="#9a9da5"/></linearGradient>' +
  '<radialGradient id="vignette" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
  '<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="0.6"/></filter>' +
  '</defs>'

// ---------------------------------------------------------------- the mark

/** The ring: a band with a stone, on a 32-unit grid (same as the site's Logo.tsx). */
function mark(x, y, size, fill) {
  const k = size / 32
  return (
    `<g transform="translate(${x} ${y}) scale(${k})">` +
    `<circle cx="16" cy="19" r="9.5" fill="none" stroke="${fill}" stroke-width="3.5"/>` +
    `<circle cx="16" cy="7.5" r="5.5" fill="${fill}"/></g>`
  )
}

/** App icon / favicon: white ring on an ink tile (same as web/public/favicon.svg). */
function tile(x, y, size) {
  const k = size / 32
  return (
    `<g transform="translate(${x} ${y}) scale(${k})"><rect width="32" height="32" rx="8" fill="#0a0a0a"/>` +
    `<circle cx="16" cy="19" r="7.5" fill="none" stroke="#fff" stroke-width="3"/>` +
    `<circle cx="16" cy="9.5" r="4.5" fill="#fff"/></g>`
  )
}

/** Mark + letter-spaced "MOOD RING", like the site's nav. Returns { body, width }. */
function lockupBody(x, y, size, fill) {
  const m = size * 1.7
  const gap = size * 0.8
  const word = text(F.sansMed, 'MOOD RING', x + m + gap, y + size * 0.86, size, fill, { spacing: size * 0.34 })
  const width = m + gap + measure(F.sansMed, 'MOOD RING', size, size * 0.34)
  return { body: mark(x, y + (size - m) / 2 - size * 0.05, m, fill) + word, width }
}

function lockup(fill, bg) {
  const size = 56
  const pad = 56
  const { body, width } = lockupBody(pad, pad + 10, size, fill)
  return svg(Math.round(width + pad * 2), Math.round(size + pad * 2 + 20), body, bg)
}

// ---------------------------------------------------------------- scenery

/** Deterministic starfield. */
function stars(w, h, count, seed = 7) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  let out = ''
  for (let i = 0; i < count; i++) {
    const r = rnd() < 0.08 ? 1.6 : rnd() < 0.4 ? 1 : 0.6
    out += `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h).toFixed(1)}" r="${r}" fill="#fff" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`
  }
  return out
}

let gid = 0
/** The hero ring: silver band, faceted glowing stone and two orbit lines. */
function ring(cx, cy, r, color, tilt = -12) {
  const id = `g${gid++}`
  const sw = r * 0.2
  const stoneY = cy - r - sw * 0.35
  const s = r * 0.32
  const facet = (pts, op) => `<polygon points="${pts.map(([a, b]) => `${(cx + a * s).toFixed(1)},${(stoneY + b * s).toFixed(1)}`).join(' ')}" fill="#fff" opacity="${op}"/>`
  return (
    `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".95"/><stop offset=".35" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>` +
    `<g transform="rotate(${tilt} ${cx} ${cy})">` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${r * 2.2}" ry="${r * 0.62}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${r * 2.7}" ry="${r * 0.95}" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="1" transform="rotate(24 ${cx} ${cy})"/>` +
    `</g>` +
    `<circle cx="${cx}" cy="${stoneY}" r="${r * 1.5}" fill="url(#${id})"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2b2c30" stroke-width="${sw + 6}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#band)" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r - sw * 0.3}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${sw * 0.12}"/>` +
    `<polygon points="${[[-1, -0.15], [-0.55, -0.85], [0.55, -0.85], [1, -0.15], [0, 1]].map(([a, b]) => `${(cx + a * s).toFixed(1)},${(stoneY + b * s).toFixed(1)}`).join(' ')}" fill="${color}"/>` +
    facet([[-0.55, -0.85], [0.55, -0.85], [0.3, -0.15], [-0.3, -0.15]], 0.35) +
    facet([[-1, -0.15], [-0.3, -0.15], [0, 1]], 0.12) +
    facet([[0.3, -0.15], [1, -0.15], [0, 1]], 0.22) +
    facet([[-0.2, -0.75], [0.05, -0.75], [-0.12, -0.35]], 0.85)
  )
}

const sample = (name) =>
  `data:image/png;base64,${readFileSync(resolve(here, '../web/public/samples', `${name}.png`)).toString('base64')}`
const ART = Object.fromEntries(['genesis', 'euphoric', 'bearish', 'panic'].map((n) => [n, sample(n)]))

let clipId = 0
/** A dark glass card holding one artwork. */
function card(name, x, y, size, rotate = 0) {
  const id = `c${clipId++}`
  const pad = size * 0.035
  const inner = size - pad * 2
  return (
    `<g transform="rotate(${rotate} ${x + size / 2} ${y + size / 2})">` +
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.05}" fill="${C.panel}" stroke="${C.line2}" filter="url(#sh)"/>` +
    `<clipPath id="${id}"><rect x="${x + pad}" y="${y + pad}" width="${inner}" height="${inner}" rx="${size * 0.03}"/></clipPath>` +
    `<image href="${ART[name]}" x="${x + pad}" y="${y + pad}" width="${inner}" height="${inner}" clip-path="url(#${id})"/></g>`
  )
}

/** "The stock market, / painted once a day." with the serif accent, like the site's h1. */
function headline(x, y, size) {
  const sp = -0.045
  return (
    text(F.sansMed, 'The stock market,', x, y, size, C.ink, { spacing: size * sp }) +
    runs([[F.serif, 'painted ', 'url(#silver)', -0.01], [F.sansMed, 'once a day.', C.ink, sp]], x, y + size * 1.02, size)
  )
}

const backdrop = (w, h, n) => stars(w, h, n) + `<rect width="${w}" height="${h}" fill="url(#vignette)"/>`
const liveKicker = (x, y, size) =>
  `<circle cx="${x + size * 0.3}" cy="${y - size * 0.35}" r="${size * 0.3}" fill="${C.good}"/>` +
  kicker('Live on Robinhood Chain', x + size * 1.2, y, size, C.good)

// ---------------------------------------------------------------- compositions

function avatar() {
  const S = 400
  return svg(S, S, backdrop(S, S, 40) + mark(80, 80, 240, C.ink), C.bg)
}

function banner() {
  const W = 1500
  const H = 500
  let body = backdrop(W, H, 220)
  // X puts the profile photo over the lower-left, so the text sits high and the ring sits right.
  body += kicker('Daily on-chain art · Robinhood Chain', 90, 96, 16)
  body += headline(88, 196, 76)
  body += text(F.sans, 'Free daily art from eight real stock prices. Every piece wakes an agent.', 90, 330, 24, C.ink2)
  body += ring(1170, 270, 120, C.genesis)
  return svg(W, H, body, C.bg)
}

function og() {
  const W = 1200
  const H = 630
  let body = backdrop(W, H, 160)
  body += lockupBody(72, 62, 22, C.ink).body
  body += liveKicker(72, 196, 15)
  body += headline(70, 290, 68)
  body += text(F.sans, 'Free mint. Fully on-chain. A personal agent with every piece.', 72, 420, 22, C.ink2)
  body += kicker(SITE, 72, 560, 15, C.muted)
  body += ring(930, 350, 125, C.genesis)
  return svg(W, H, body, C.bg)
}

function launchPost() {
  const W = 1600
  const H = 900
  let body = backdrop(W, H, 260)
  body += lockupBody(96, 76, 24, C.ink).body
  body += liveKicker(96, 214, 17)
  body += headline(92, 330, 86)
  const facts = [
    ['01', 'Snap the day, once per day'],
    ['02', 'The market paints the art on-chain'],
    ['03', 'Mint free, wake your own agent'],
  ]
  facts.forEach(([n, f], i) => {
    const y = 545 + i * 64
    body += text(F.mono, n, 96, y, 20, C.ember)
    body += text(F.sans, f, 150, y, 30, C.ink)
  })
  body += kicker(SITE, 96, 820, 17)
  const s = 300
  body += card('genesis', 900, 110, s, -3)
  body += card('euphoric', 1230, 140, s, 3)
  body += card('bearish', 900, 450, s, 2)
  body += card('panic', 1230, 480, s, -2)
  return svg(W, H, body, C.bg)
}

/** Chat bubble with wrapped text. Returns { svg, height }. */
function bubble(x, y, w, lines, { you = false } = {}) {
  const size = 22
  const lh = size * 1.45
  const h = lines.length * lh + 36
  const fill = you ? C.ink : 'rgba(255,255,255,0.05)'
  const stroke = you ? 'none' : C.line2
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}" stroke="${stroke}"/>`
  lines.forEach((l, i) => {
    out += text(F.sans, l, x + 24, y + 18 + size + i * lh - 2, size, you ? '#000' : C.ink2)
  })
  return { svg: out, height: h }
}

function agentPost() {
  const W = 1600
  const H = 900
  let body = backdrop(W, H, 240)
  body += lockupBody(96, 76, 24, C.ink).body
  body += kicker('New · Your agent', 96, 214, 17, C.good)
  body += text(F.sansMed, 'Every piece wakes', 92, 330, 86, C.ink, { spacing: -86 * 0.045 })
  body += runs([[F.sansMed, 'an ', C.ink, -0.045], [F.serif, 'agent.', 'url(#silver)', -0.01]], 92, 418, 86)
  body += text(F.sans, 'Mint any day and name your agent. Ask it about the', 96, 520, 28, C.ink2)
  body += text(F.sans, 'market, your stock tokens and your pieces. It reads', 96, 560, 28, C.ink2)
  body += text(F.sans, 'Robinhood Chain live and never touches your funds.', 96, 600, 28, C.ink2)
  body += kicker(SITE, 96, 820, 17)

  // Chat panel (example conversation).
  const px = 900
  const py = 120
  body += `<rect x="${px}" y="${py}" width="600" height="660" rx="22" fill="${C.panel}" stroke="${C.line2}" filter="url(#sh)"/>`
  body += `<circle cx="${px + 52}" cy="${py + 56}" r="24" fill="${C.panel2}" stroke="${C.line2}"/>` + mark(px + 36, py + 40, 32, C.ink)
  body += text(F.sansSemi, 'Nova', px + 92, py + 52, 24, C.ink)
  body += `<circle cx="${px + 98}" cy="${py + 72}" r="4" fill="${C.good}"/>` + kicker('Online', px + 110, py + 77, 12, C.good)
  body += `<line x1="${px}" y1="${py + 104}" x2="${px + 600}" y2="${py + 104}" stroke="${C.line}"/>`
  let y = py + 132
  const b1 = bubble(px + 196, y, 374, ['How’s the market right now?'], { you: true })
  body += b1.svg
  y += b1.height + 18
  const b2 = bubble(px + 30, y, 500, ['The market reads BULLISH. The eight', 'stocks average +0.84% since the last', 'snapshot. NVDA leads at +2.31%.'])
  body += b2.svg
  y += b2.height + 18
  const b3 = bubble(px + 310, y, 260, ['What do I hold?'], { you: true })
  body += b3.svg
  y += b3.height + 18
  const b4 = bubble(px + 30, y, 500, ['Your bag is worth $1,240 at live', 'Chainlink prices. NVDA is your', 'biggest position at 58%.'])
  body += b4.svg
  body += kicker('Example conversation', px + 30, py + 632, 12, C.faint ?? C.muted)
  return svg(W, H, body, C.bg)
}

function palette() {
  const W = 1500
  const H = 600
  let body = kicker('Mood Ring', 80, 80, 14) + text(F.sansMed, 'Colours', 80, 140, 52, C.ink, { spacing: -52 * 0.04 })
  const ui = [
    ['Black', C.bg],
    ['Panel', C.panel],
    ['Line', C.line2],
    ['Ink', C.ink],
    ['Muted', C.muted],
    ['Live', C.good],
  ]
  ui.forEach(([n, hex], i) => {
    const x = 80 + i * 228
    body += `<rect x="${x}" y="190" width="200" height="130" rx="14" fill="${hex}" stroke="${C.line2}"/>`
    body += text(F.sansMed, n, x, 356, 20, C.ink)
    body += kicker(hex, x, 382, 13)
  })
  body += kicker('Daily moods · art backgrounds and the ring’s stone', 80, 460, 13)
  MOODS.forEach(([n, hex], i) => {
    const x = 80 + i * 272
    body += `<rect x="${x}" y="484" width="240" height="56" rx="12" fill="${hex}"/>`
    body += text(F.sansSemi, `${n}  ${hex}`, x + 16, 519, 17, n === 'Flat' ? '#fff' : '#0e0e10')
  })
  return svg(W, H, body, C.bg)
}

// ---------------------------------------------------------------- write

const assets = {
  'mark-white': svg(32, 32, mark(0, 0, 32, C.ink)),
  'mark-black': svg(32, 32, mark(0, 0, 32, '#0a0a0a')),
  'app-icon': svg(32, 32, tile(0, 0, 32)),
  'lockup-white': lockup(C.ink),
  'lockup-black': lockup('#0a0a0a'),
}
const pngs = {
  'mark-white-1024': [assets['mark-white'], 1024],
  'mark-black-1024': [assets['mark-black'], 1024],
  'app-icon-1024': [assets['app-icon'], 1024],
  'app-icon-512': [assets['app-icon'], 512],
  'lockup-on-black': [lockup(C.ink, C.bg), 1600],
  'lockup-on-white': [lockup('#0a0a0a', '#ffffff'), 1600],
  'lockup-white': [assets['lockup-white'], 1600],
  'x-avatar': [avatar(), 400],
  'x-banner': [banner(), 1500],
  'og-image': [og(), 1200],
  palette: [palette(), 1500],
}
const posts = { 'launch-post': [launchPost(), 1600], 'agent-post': [agentPost(), 1600] }

const render = (src, width) => new Resvg(src, { fitTo: { mode: 'width', value: width } }).render().asPng()

for (const [name, src] of Object.entries(assets)) writeFileSync(resolve(OUT.svg, `${name}.svg`), src)
for (const [name, [src, w]] of Object.entries(pngs)) writeFileSync(resolve(OUT.png, `${name}.png`), render(src, w))
for (const [name, [src, w]] of Object.entries(posts)) writeFileSync(resolve(OUT.posts, `${name}.png`), render(src, w))
console.log(`built ${Object.keys(assets).length} svg, ${Object.keys(pngs).length} png, ${Object.keys(posts).length} posts`)
