import type { Piece } from '../hooks/useArchive'
import { dayLabel, moodOf, percent, svgDataUrl } from '../lib/mood'

interface Props {
  pieces: Piece[]
  total: number
  loading: boolean
  busy: string | null
  onMint: (number: number) => void
  onMore: () => void
}

export function Archive({ pieces, total, loading, busy, onMint, onMore }: Props) {
  return (
    <section className="section" id="archive" aria-labelledby="archive-h">
      <div className="wrap">
        <div className="section-head" data-reveal>
          <span className="kicker">04 · Archive</span>
          <h2 id="archive-h">
            Every day, <em>kept</em> forever.
          </h2>
          <p>Each snapshot stays mintable for good. Newest first.</p>
        </div>
        {total === 0 ? (
          <p className="empty panel" data-reveal>
            The first snapshot hasn’t been taken yet. Snap today to own #1, the Genesis piece.
          </p>
        ) : (
          <>
            <div className="grid">
              {pieces.map((p, i) => {
                const mood = moodOf(p.avgBps, p.number === 1)
                return (
                  <article
                    key={p.number}
                    className="piece panel"
                    data-reveal
                    style={{ '--delay': `${(i % 4) * 80}ms`, '--mood': mood.bg } as React.CSSProperties}
                  >
                    <img
                      src={svgDataUrl(p.svg)}
                      alt={`Mood Ring #${p.number}, ${dayLabel(p.day)}`}
                      width={1000}
                      height={1000}
                      loading="lazy"
                    />
                    <div className="piece-meta">
                      <div className="piece-row">
                        <b>#{p.number}</b>
                        <span className="kicker">{dayLabel(p.day)}</span>
                      </div>
                      <div className="piece-row">
                        <span className="mood-chip">
                          <i /> {mood.name.toLowerCase()} {p.number === 1 ? '' : percent(p.avgBps)}
                        </span>
                      </div>
                      <div className="piece-foot">
                        <span className="kicker">{p.minted} minted</span>
                        <button className="pill pill-ghost pill-sm" disabled={Boolean(busy)} onClick={() => onMint(p.number)}>
                          Mint <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            {pieces.length < total && (
              <button className="pill pill-ghost more" disabled={loading} onClick={onMore}>
                {loading ? 'Loading…' : 'Show older days'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
