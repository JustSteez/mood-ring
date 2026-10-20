import { percent } from '../lib/mood'

/** Each stock's live move since the last snapshot. */
export function Movers({ tickers, bps, hasBaseline }: { tickers: string[]; bps: number[]; hasBaseline: boolean }) {
  const order = tickers.map((t, i) => ({ t, v: bps[i] ?? 0 })).sort((a, b) => b.v - a.v)
  return (
    <section className="section" id="today" aria-labelledby="today-h">
      <div className="container">
        <p className="eyebrow">Today</p>
        <h2 id="today-h">{hasBaseline ? 'Moves since the last snapshot' : 'The eight stocks in every piece'}</h2>
        <p className="section-lede">Prices come straight from Chainlink feeds on Robinhood Chain and update live.</p>
        <div className="movers">
          {order.map(({ t, v }) => (
            <div key={t} className={`mover ${hasBaseline ? (v > 4 ? 'up' : v < -4 ? 'down' : '') : ''}`}>
              <b>{t}</b>
              <span>{hasBaseline ? percent(v) : 'Tracked'}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
