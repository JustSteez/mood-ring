import { describe, expect, it } from 'vitest'
import { answer, type AgentContext } from './skills'
import { route } from './router'

const TICKERS = ['NVDA', 'TSLA', 'AAPL', 'AMZN', 'MSFT', 'GOOGL', 'META', 'SPY']

function ctx(over: Partial<AgentContext> = {}): AgentContext {
  return {
    agentName: 'Nova',
    market: {
      tickers: TICKERS,
      prices: [200, 400, 250, 220, 500, 300, 700, 650],
      bps: [310, -120, 40, 0, 15, -260, 90, 25],
      avgBps: 12,
      hasBaseline: true,
      genesis: false,
      snapshotCount: 5,
    },
    ...over,
  }
}

const text = (a: { lines: string[]; rows?: [string, string][] }) =>
  [...a.lines, ...(a.rows ?? []).map((r) => r.join(' '))].join('\n')

describe('market skill', () => {
  it('names the mood and the best and worst movers', () => {
    const out = text(answer('market', ctx()))
    expect(out).toContain('FLAT')
    expect(out).toContain('NVDA')
    expect(out).toContain('+3.10%')
    expect(out).toContain('GOOGL')
    expect(out).toContain('-2.60%')
  })

  it('explains that the first snapshot sets the baseline', () => {
    const out = text(answer('market', ctx({ market: { ...ctx().market, hasBaseline: false, snapshotCount: 0 } })))
    expect(out.toLowerCase()).toContain('baseline')
  })
})

describe('portfolio skill', () => {
  it('values stock token holdings with live prices and finds the biggest position', () => {
    const out = text(
      answer(
        'portfolio',
        ctx({
          wallet: {
            eth: 0.5,
            txCount: 12,
            gasGwei: 0.01,
            amounts: [2, 0, 0, 0, 0, 0, 1, 0],
          },
        }),
      ),
    )
    expect(out).toContain('$1,100.00') // 2 × 200 + 1 × 700
    expect(out).toContain('META')
    expect(out).toContain('64%') // 700 / 1100
    expect(out).toContain('0.5 ETH')
  })

  it('says so when the wallet holds no stock tokens', () => {
    const out = text(answer('portfolio', ctx({ wallet: { eth: 0.1, txCount: 1, gasGwei: 0, amounts: Array(8).fill(0) } })))
    expect(out.toLowerCase()).toContain('no robinhood stock tokens')
  })

  it('asks for a wallet when none is loaded', () => {
    expect(text(answer('portfolio', ctx())).toLowerCase()).toContain('connect')
  })
})

describe('pnl skill', () => {
  it('estimates the dollar change since the last snapshot', () => {
    // NVDA: 2 × $200 = $400 now, +3.10% since snapshot → was 400 / 1.031 → change ≈ +$12.03
    const out = text(
      answer('pnl', ctx({ wallet: { eth: 0, txCount: 0, gasGwei: 0, amounts: [2, 0, 0, 0, 0, 0, 0, 0] } })),
    )
    expect(out).toContain('+$12.03')
  })
})

describe('history skill', () => {
  it('counts the current streak and finds the best and worst day', () => {
    const out = text(
      answer(
        'history',
        ctx({
          history: [
            { number: 5, day: 20_000, avgBps: 45 },
            { number: 4, day: 19_999, avgBps: 210 },
            { number: 3, day: 19_998, avgBps: -50 },
            { number: 2, day: 19_997, avgBps: -230 },
          ],
        }),
      ),
    )
    expect(out).toContain('2 green')
    expect(out).toContain('#4')
    expect(out).toContain('#2')
  })
})

describe('collection skill', () => {
  it('summarises owned pieces and the rarest one', () => {
    const out = text(
      answer(
        'collection',
        ctx({
          pieces: [
            { tokenId: 1, number: 1, day: 20_000, avgBps: 0, mintedOfSnapshot: 3 },
            { tokenId: 7, number: 3, day: 20_002, avgBps: -250, mintedOfSnapshot: 12 },
          ],
        }),
      ),
    )
    expect(out).toContain('2 pieces')
    expect(out).toContain('Genesis')
    expect(out).toContain('#1')
  })
})

describe('stock skill', () => {
  it('reports one stock with its price and move', () => {
    const out = text(answer('stock', ctx(), 'TSLA'))
    expect(out).toContain('Tesla')
    expect(out).toContain('$400.00')
    expect(out).toContain('-1.20%')
  })
})

describe('router', () => {
  it.each([
    ['how is the market today?', 'market'],
    ['what do I hold', 'portfolio'],
    ['did I make money?', 'pnl'],
    ['who is the top gainer', 'leaders'],
    ['mood history this week', 'history'],
    ['show my pieces', 'collection'],
    ['check my wallet activity', 'wallet'],
    ['hello', 'help'],
  ])('%s → %s', (q, skill) => {
    expect(route(q, TICKERS).skill).toBe(skill)
  })

  it('finds a ticker or company name', () => {
    expect(route('how is nvidia doing', TICKERS)).toEqual({ skill: 'stock', arg: 'NVDA' })
    expect(route('TSLA?', TICKERS)).toEqual({ skill: 'stock', arg: 'TSLA' })
  })

  it('falls back to unknown', () => {
    expect(route('what is the meaning of life', TICKERS).skill).toBe('unknown')
  })
})
