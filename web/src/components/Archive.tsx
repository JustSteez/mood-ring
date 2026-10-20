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
      <div className="container">
        <p className="eyebrow">Archive</p>
        <h2 id="archive-h">Every day so far</h2>
        <p className="section-lede">Each snapshot stays mintable forever.</p>
        {total === 0 ? (
          <p className="empty">The first snapshot hasn’t been taken yet. Snap today to own #1, the Genesis piece.</p>
        ) : (
          <>
            <div className="grid">
              {pieces.map((p) => {
                const mood = moodOf(p.avgBps, p.number === 1)
                return (
                  <article key={p.number} className="piece">
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
                        <span>{dayLabel(p.day).toLowerCase()}</span>
                      </div>
                      <div className="piece-sub">
                        {mood.name.toLowerCase()} {p.number === 1 ? '' : percent(p.avgBps)}
                      </div>
                      <div className="piece-foot">
                        <span className="piece-sub">{p.minted} minted</span>
                        <button className="pill pill-ghost" disabled={Boolean(busy)} onClick={() => onMint(p.number)}>
                          Mint
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
