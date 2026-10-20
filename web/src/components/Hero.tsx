import type { MoodState } from '../hooks/useMood'
import { countdown } from '../lib/format'
import { dayLabel, moodOf, percent, svgDataUrl } from '../lib/mood'

interface Props {
  state: MoodState
  now: number
  busy: string | null
  onSnapMint: () => void
  onMint: (number: number) => void
}

export function Hero({ state, now, busy, onSnapMint, onMint }: Props) {
  const snapped = state.todayNumber > 0
  const genesis = state.snapshotCount === 0 || state.todayNumber === 1
  const mood = moodOf(state.liveAvgBps, genesis)
  const left = (state.day + 1) * 86_400 - now

  return (
    <header className="container hero" id="top">
      <div>
        <p className="status">
          <span className="dot" /> Live on Robinhood Chain
        </p>
        <h1>
          The stock market, <span>painted once a day.</span>
        </h1>
        <p className="lede">
          Every day, real prices of eight stocks become one artwork, stored fully on-chain. Green days get a bull, red
          days get a bear. Minting is free.
        </p>
        <div className="cta-row">
          {snapped ? (
            <button className="pill pill-dark pill-lg" disabled={Boolean(busy)} onClick={() => onMint(state.todayNumber)}>
              {busy ? `${busy}…` : `Mint today’s #${state.todayNumber}`}
            </button>
          ) : (
            <button className="pill pill-dark pill-lg" disabled={Boolean(busy)} onClick={onSnapMint}>
              {busy ? `${busy}…` : 'Snap today and mint'}
            </button>
          )}
          <a className="pill pill-ghost pill-lg" href="#archive">
            Browse the archive
          </a>
        </div>
        <dl className="stats">
          <div>
            <dt>{snapped ? 'Next snapshot' : 'Today'}</dt>
            <dd>{snapped ? countdown(left) : 'Not snapped'}</dd>
          </div>
          <div>
            <dt>Snapshots</dt>
            <dd>{state.snapshotCount}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>Free</dd>
          </div>
        </dl>
        {!snapped && <p className="nudge">Nobody has snapped today yet. The first person to do it freezes this day.</p>}
      </div>

      <figure className="art-card">
        <img src={svgDataUrl(state.heroSvg)} alt={`Mood Ring artwork for ${dayLabel(state.day)}`} width={1000} height={1000} />
        <figcaption>
          <span>
            <b>{snapped ? `Snapshot #${state.todayNumber}` : 'Live preview'}</b> · {dayLabel(state.day).toLowerCase()}
          </span>
          <span className="chip">
            <i /> {mood.name.toLowerCase()} {!genesis && percent(state.liveAvgBps)}
          </span>
        </figcaption>
      </figure>
    </header>
  )
}
