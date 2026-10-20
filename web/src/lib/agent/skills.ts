import { STOCKS } from '../../config/stocks'
import { dayLabel, moodOf, percent } from '../mood'
import type { SkillId } from './router'

export interface MarketData {
  tickers: string[]
  /** Live Chainlink prices in USD, same order as `tickers`. */
  prices: number[]
  /** Moves since the last snapshot, basis points. */
  bps: number[]
  avgBps: number
  hasBaseline: boolean
  genesis: boolean
  snapshotCount: number
}

export interface WalletData {
  eth: number
  txCount: number
  gasGwei: number
  /** Stock token balances (whole tokens), same order as the market tickers. */
  amounts: number[]
}

export interface OwnedPiece {
  tokenId: number
  number: number
  day: number
  avgBps: number
  mintedOfSnapshot: number
}

export interface DayMood {
  number: number
  day: number
  avgBps: number
}

export interface AgentContext {
  agentName: string
  market: MarketData
  wallet?: WalletData
  pieces?: OwnedPiece[]
  /** Recent snapshots, newest first. */
  history?: DayMood[]
}

export interface Answer {
  lines: string[]
  rows?: [string, string][]
}

const FLAT_BPS = 30

export const usd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const signedUsd = (n: number) => `${n < 0 ? '-' : '+'}${usd(Math.abs(n))}`
const eth = (n: number) => `${Number(n.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 })} ETH`
const nameOf = (t: string) => STOCKS[t]?.name ?? t
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function ranked(m: MarketData) {
  return m.tickers.map((t, i) => ({ t, bps: m.bps[i] ?? 0, price: m.prices[i] ?? 0 })).sort((a, b) => b.bps - a.bps)
}

function holdings(m: MarketData, w: WalletData) {
  return m.tickers
    .map((t, i) => ({ t, amount: w.amounts[i] ?? 0, price: m.prices[i] ?? 0, bps: m.bps[i] ?? 0 }))
    .map((h) => ({ ...h, value: h.amount * h.price }))
    .filter((h) => h.amount > 0)
    .sort((a, b) => b.value - a.value)
}

const NEED_WALLET: Answer = { lines: ['Connect your wallet and I can look at what it holds.'] }

function market(c: AgentContext): Answer {
  const m = c.market
  if (!m.hasBaseline) {
    return {
      lines: [
        'No snapshot has been taken yet, so there is no baseline to measure moves against.',
        'Whoever snaps first sets the baseline and freezes today as the Genesis piece.',
      ],
    }
  }
  const mood = moodOf(m.avgBps, m.genesis)
  const order = ranked(m)
  const best = order[0]
  const worst = order[order.length - 1]
  const up = order.filter((o) => o.bps >= FLAT_BPS).length
  const down = order.filter((o) => o.bps <= -FLAT_BPS).length
  return {
    lines: [
      `The market reads ${mood.name} right now: the eight stocks average ${percent(m.avgBps)} since the last snapshot.`,
      `${best.t} leads at ${percent(best.bps)}, while ${worst.t} trails at ${percent(worst.bps)}.`,
      `${up} up, ${down} down and ${8 - up - down} roughly flat.`,
    ],
  }
}

function portfolio(c: AgentContext): Answer {
  const w = c.wallet
  if (!w) return NEED_WALLET
  const hs = holdings(c.market, w)
  if (hs.length === 0) {
    return { lines: [`You hold ${eth(w.eth)} and no Robinhood stock tokens from the eight I track.`] }
  }
  const total = hs.reduce((s, h) => s + h.value, 0)
  const top = hs[0]
  return {
    lines: [
      `Your eight-stock bag is worth ${usd(total)} at live Chainlink prices, plus ${eth(w.eth)}.`,
      `${top.t} is your biggest position at ${Math.round((top.value / total) * 100)}% of the bag.`,
    ],
    rows: hs.map((h) => [`${h.t} · ${h.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}`, usd(h.value)]),
  }
}

function pnl(c: AgentContext): Answer {
  const w = c.wallet
  if (!w) return NEED_WALLET
  if (!c.market.hasBaseline) return { lines: ['There is no snapshot yet, so I have nothing to compare against.'] }
  const hs = holdings(c.market, w)
  if (hs.length === 0) return { lines: ['You hold none of the eight stock tokens, so nothing moved for you.'] }
  const changes = hs.map((h) => ({ ...h, change: h.value - h.value / (1 + h.bps / 10_000) }))
  const total = changes.reduce((s, h) => s + h.change, 0)
  const best = [...changes].sort((a, b) => b.change - a.change)[0]
  if (changes.every((h) => Math.abs(h.change) < 0.005)) {
    return { lines: ['Nothing has moved since the last snapshot yet, so your stock tokens are flat. Ask me again after the market moves.'] }
  }
  return {
    lines: [
      `Since the last snapshot your stock tokens moved about ${signedUsd(total)}.`,
      `${best.t} did the most work for you at ${signedUsd(best.change)}.`,
    ],
    rows: changes.map((h) => [`${h.t} ${percent(h.bps)}`, signedUsd(h.change)]),
  }
}

function leaders(c: AgentContext): Answer {
  if (!c.market.hasBaseline) return market(c)
  return {
    lines: ['Here is the leaderboard since the last snapshot:'],
    rows: ranked(c.market).map((o, i) => [`${i + 1}. ${o.t} · ${nameOf(o.t)}`, percent(o.bps)]),
  }
}

function history(c: AgentContext): Answer {
  const h = c.history ?? []
  if (h.length === 0) return { lines: ['There are no snapshots yet. Today could be the first.'] }
  const colour = (bps: number) => (bps >= FLAT_BPS ? 'green' : bps <= -FLAT_BPS ? 'red' : 'flat')
  const first = colour(h[0].avgBps)
  let streak = 0
  while (streak < h.length && colour(h[streak].avgBps) === first) streak++
  const best = [...h].sort((a, b) => b.avgBps - a.avgBps)[0]
  const worst = [...h].sort((a, b) => a.avgBps - b.avgBps)[0]
  const lines = [
    `Over the last ${plural(h.length, 'snapshot')}, the market is on ${streak} ${first} ${streak === 1 ? 'day' : 'days'} in a row.`,
  ]
  if (h.length > 1) {
    lines.push(`Best day: #${best.number} at ${percent(best.avgBps)}. Worst day: #${worst.number} at ${percent(worst.avgBps)}.`)
  }
  return {
    lines,
    rows: h.map((d) => [`#${d.number} · ${dayLabel(d.day).toLowerCase()}`, `${moodOf(d.avgBps, d.number === 1).name.toLowerCase()}`]),
  }
}

function collection(c: AgentContext): Answer {
  const p = c.pieces ?? []
  if (p.length === 0) return { lines: ['You don’t hold any Mood Ring pieces yet. Mint one and I’ll keep track of it.'] }
  const rarest = [...p].sort((a, b) => a.mintedOfSnapshot - b.mintedOfSnapshot)[0]
  const genesis = p.some((x) => x.number === 1)
  return {
    lines: [
      `You hold ${plural(p.length, 'piece')}${genesis ? ', including the Genesis day' : ''}.`,
      `The rarest is #${rarest.number}: only ${plural(rarest.mintedOfSnapshot, 'copy')} minted.`,
    ],
    rows: p.map((x) => [
      `#${x.number} · ${dayLabel(x.day).toLowerCase()}`,
      `${moodOf(x.avgBps, x.number === 1).name.toLowerCase()}${x.number === 1 ? '' : ` ${percent(x.avgBps)}`}`,
    ]),
  }
}

function wallet(c: AgentContext): Answer {
  const w = c.wallet
  if (!w) return NEED_WALLET
  return {
    lines: [`This wallet has sent ${plural(w.txCount, 'transaction')} on Robinhood Chain and holds ${eth(w.eth)}.`],
    rows: [
      ['Gas price now', `${w.gasGwei.toLocaleString('en-US', { maximumFractionDigits: 4 })} gwei`],
      ['Transactions sent', w.txCount.toLocaleString('en-US')],
    ],
  }
}

function stock(c: AgentContext, ticker?: string): Answer {
  const i = ticker ? c.market.tickers.indexOf(ticker) : -1
  if (i < 0) return help(c)
  const bps = c.market.bps[i] ?? 0
  const rank = ranked(c.market).findIndex((o) => o.t === ticker) + 1
  const held = c.wallet?.amounts[i] ?? 0
  const lines = [`${nameOf(ticker!)} (${ticker}) trades at ${usd(c.market.prices[i] ?? 0)} on Chainlink right now.`]
  if (c.market.hasBaseline) {
    lines.push(
      bps === 0
        ? 'It hasn’t moved since the last snapshot.'
        : `It is ${percent(bps)} since the last snapshot, number ${rank} of 8 today.`,
    )
  }
  if (held > 0) lines.push(`You hold ${held.toLocaleString('en-US', { maximumFractionDigits: 4 })}, worth ${usd(held * (c.market.prices[i] ?? 0))}.`)
  return { lines }
}

function help(c: AgentContext): Answer {
  return {
    lines: [
      `I’m ${c.agentName}, your Mood Ring agent. I read Robinhood Chain live and never touch your funds.`,
      'Ask me about the market, your stock tokens, your gains since the last snapshot, the mood history, your pieces, or any of the eight stocks by name.',
    ],
  }
}

export function answer(skill: SkillId, c: AgentContext, arg?: string): Answer {
  switch (skill) {
    case 'market':
      return market(c)
    case 'portfolio':
      return portfolio(c)
    case 'pnl':
      return pnl(c)
    case 'leaders':
      return leaders(c)
    case 'history':
      return history(c)
    case 'collection':
      return collection(c)
    case 'wallet':
      return wallet(c)
    case 'stock':
      return stock(c, arg)
    case 'help':
      return help(c)
  }
}
