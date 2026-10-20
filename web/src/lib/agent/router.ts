import { STOCKS } from '../../config/stocks'

export type SkillId = 'market' | 'portfolio' | 'pnl' | 'leaders' | 'history' | 'collection' | 'wallet' | 'stock' | 'help'

export interface Route {
  skill: SkillId | 'unknown'
  arg?: string
}

/** Checked in order: the first rule whose pattern matches wins. */
const RULES: [SkillId, RegExp][] = [
  ['history', /\b(history|lately|recent days|this week|last week|streak|past|yesterday)\b/],
  ['collection', /\b(pieces?|nfts?|collection|my art|mints?|minted)\b/],
  ['leaders', /\b(top|leader|leading|best|worst|gainers?|losers?|winners?|rank|ranking)\b/],
  ['pnl', /\b(pnl|p&l|profit|loss|money|made|lost|up or down|performance)\b/],
  ['wallet', /\b(wallet|gas|activity|transactions?|txs?|nonce|fees?)\b/],
  ['portfolio', /\b(hold|holding|holdings|portfolio|bag|balances?|stocks i own|what i own|my tokens)\b/],
  ['market', /\b(market|today|now|mood|vibe|overall|sentiment)\b/],
  // Greetings last, so "hi, how's the market?" still gets a market answer.
  ['help', /\b(hi|hello|hey|help|what can you|who are you|gm)\b/],
]

/** Maps a typed question to a skill, matching a ticker or company name first. */
export function route(question: string, tickers: string[]): Route {
  const q = question.toLowerCase()
  for (const t of tickers) {
    const name = STOCKS[t]?.name.toLowerCase()
    const byTicker = new RegExp(`\\b${t.toLowerCase()}\\b`).test(q)
    const byName = name ? new RegExp(`\\b${name.split(' ')[0].replace(/[^a-z0-9]/g, '')}\\b`).test(q) : false
    if (byTicker || byName) return { skill: 'stock', arg: t }
  }
  for (const [skill, pattern] of RULES) {
    if (pattern.test(q)) return { skill }
  }
  return { skill: 'unknown' }
}
