import { STOCKS } from '../config/stocks'
import type { MoodState } from '../hooks/useMood'
import { dayLabel, moodOf, percent, svgDataUrl } from '../lib/mood'

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Section 01: today's artwork beside the live price ledger it was painted from. */
export function Movers({ state }: { state: MoodState }) {
  const snapped = state.todayNumber > 0
  const hasBaseline = state.snapshotCount > 0
  const genesis = state.snapshotCount === 0 || state.todayNumber === 1
  const mood = moodOf(state.liveAvgBps, genesis)
  const rows = state.tickers.map((t, i) => ({ t, price: state.prices[i] ?? 0, bps: state.liveBps[i] ?? 0 }))

  return (
    <section className="section" id="today" aria-labelledby="today-h">
      <div className="wrap">
        <div className="section-head" data-reveal>
          <span className="kicker">01 · Today</span>
          <h2 id="today-h">
            Today’s <em>mood</em>, read live.
          </h2>
          <p>
            Eight Chainlink price feeds on Robinhood Chain, read straight from the contract. The first person to snap
            today freezes this picture forever.
          </p>
        </div>

        <div className="today-grid">
          <figure className="art-card" data-reveal>
            <img
              src={svgDataUrl(state.heroSvg)}
              alt={`Mood Ring artwork for ${dayLabel(state.day)}`}
              width={1000}
              height={1000}
            />
            <figcaption>
              <span className="kicker">{snapped ? `Snapshot #${state.todayNumber} · frozen` : 'Live preview'}</span>
              <span className="mood-chip" style={{ '--mood': mood.bg } as React.CSSProperties}>
                <i /> {mood.name.toLowerCase()}
              </span>
            </figcaption>
          </figure>

          <div className="ledger panel" data-reveal style={{ '--delay': '120ms' } as React.CSSProperties}>
            <div className="ledger-head">
              <div>
                <span className="kicker">Average move</span>
                <b className="mono">{hasBaseline ? percent(state.liveAvgBps) : '—'}</b>
              </div>
              <div className="right">
                <span className="kicker">{dayLabel(state.day)}</span>
                <b style={{ color: mood.bg }}>{mood.name}</b>
              </div>
            </div>
            <ul>
              {rows.map(({ t, price, bps }) => (
                <li key={t}>
                  <span className="tk mono">{t}</span>
                  <span className="nm">{STOCKS[t]?.name ?? t}</span>
                  <span className="px mono">{price > 0 ? usd(price) : '—'}</span>
                  <span className={`mv mono ${hasBaseline ? (bps > 4 ? 'up' : bps < -4 ? 'down' : '') : ''}`}>
                    {hasBaseline ? percent(bps) : 'base'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="ledger-foot kicker">
              {hasBaseline ? 'Moves since the last snapshot' : 'First snapshot sets the baseline'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
