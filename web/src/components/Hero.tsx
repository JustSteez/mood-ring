import type { MoodState } from '../hooks/useMood'
import { countdown } from '../lib/format'
import { dayLabel, moodOf, percent } from '../lib/mood'
import { CountUp } from './CountUp'

interface Props {
  state: MoodState
  now: number
  busy: string | null
  onSnapMint: () => void
  onMint: (number: number) => void
}

const TRUST = ['Art stored on-chain', 'Free mint', 'Personal agent', 'Chainlink prices']

export function Hero({ state, now, busy, onSnapMint, onMint }: Props) {
  const snapped = state.todayNumber > 0
  const genesis = state.snapshotCount === 0 || state.todayNumber === 1
  const mood = moodOf(state.liveAvgBps, genesis)
  const left = (state.day + 1) * 86_400 - now

  return (
    <header className="hero" id="top">
      <div className="hero-strip">
        <span className="kicker">Daily on-chain art · Robinhood Chain</span>
        <span className="kicker hide-sm">{dayLabel(state.day)}</span>
      </div>

      <div className="hero-copy">
        <p className="kicker live intro" style={{ '--d': '0ms' } as React.CSSProperties}>
          <span className="pulse" /> Live on Robinhood Chain
        </p>
        <h1 className="intro" style={{ '--d': '90ms' } as React.CSSProperties}>
          The stock market, <em>painted</em> once a day.
        </h1>
        <p className="lede intro" style={{ '--d': '180ms' } as React.CSSProperties}>
          Every day the real prices of eight stocks become one artwork, drawn and stored entirely on-chain. Green days
          get a bull. Red days get a bear. Minting is free.
        </p>
        <div className="cta-row intro" style={{ '--d': '270ms' } as React.CSSProperties}>
          {snapped ? (
            <button className="pill pill-lime pill-lg" disabled={Boolean(busy)} onClick={() => onMint(state.todayNumber)}>
              {busy ? `${busy}…` : `Mint today’s #${state.todayNumber}`} <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button className="pill pill-lime pill-lg" disabled={Boolean(busy)} onClick={onSnapMint}>
              {busy ? `${busy}…` : 'Snap today and mint'} <span aria-hidden="true">→</span>
            </button>
          )}
          <a className="pill pill-ghost pill-lg" href="#how">
            How it works
          </a>
        </div>
        <ul className="trust intro" style={{ '--d': '360ms' } as React.CSSProperties}>
          {TRUST.map((t) => (
            <li key={t}>
              <i /> {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="hero-mood intro" style={{ '--d': '450ms' } as React.CSSProperties}>
        <span className="kicker">Today’s mood</span>
        <b style={{ color: mood.bg }}>{mood.name}</b>
        <span className="mono">{genesis ? 'first snapshot' : percent(state.liveAvgBps)}</span>
      </div>

      <div className="scroll-hint kicker" aria-hidden="true">
        Scroll to see today
      </div>

      <dl className="stats">
        <div>
          <dt className="kicker">Snapshots taken</dt>
          <dd>
            <CountUp value={state.snapshotCount} />
          </dd>
        </div>
        <div>
          <dt className="kicker">Pieces minted</dt>
          <dd>
            <CountUp value={state.totalMinted} />
          </dd>
        </div>
        <div>
          <dt className="kicker">Mint price</dt>
          <dd>Free</dd>
        </div>
        <div>
          <dt className="kicker">{snapped ? 'Next snapshot' : 'Today'}</dt>
          <dd className="mono">{snapped ? countdown(left) : 'Open now'}</dd>
        </div>
        <div>
          <dt className="kicker">Latest block</dt>
          <dd className="mono">{state.blockNumber.toLocaleString('en-US')}</dd>
        </div>
      </dl>
    </header>
  )
}
