const STEPS = [
  {
    title: 'Snap the day',
    body: 'Once per UTC day, anyone can take the snapshot. The contract reads the live prices of NVDA, TSLA, AAPL, AMZN, MSFT, GOOGL, META and SPY.',
    facts: [
      ['Cost', 'Gas only'],
      ['Per day', 'Once'],
    ],
  },
  {
    title: 'The market paints',
    body: 'Each snapshot is compared with the one before. The colour is the mood, the ring is every stock’s move, and a bull or a bear sits in the middle.',
    facts: [
      ['Renderer', 'On-chain'],
      ['Servers', 'None'],
    ],
  },
  {
    title: 'Mint it free',
    body: 'Mint any day in the archive, as many times as you like. Every piece wakes a personal agent you can name and question.',
    facts: [
      ['Price', 'Free'],
      ['Limit', 'None'],
    ],
  },
]

const MOODS = [
  { name: 'Euphoric', range: '≥ +2%', color: '#D4FF3A' },
  { name: 'Bullish', range: '≥ +0.3%', color: '#B8F5D2' },
  { name: 'Flat', range: '±0.3%', color: '#5B2EFF' },
  { name: 'Bearish', range: '< −0.3%', color: '#FF8A3D' },
  { name: 'Panic', range: '≤ −2%', color: '#FF3B30' },
]

export function HowItWorks() {
  return (
    <section className="section" id="how" aria-labelledby="how-h">
      <div className="wrap">
        <div className="section-head" data-reveal>
          <span className="kicker">03 · How it works</span>
          <h2 id="how-h">
            Three moves. <em>No money</em> involved.
          </h2>
          <p>No deposits and no admin. Nothing in the contract can be changed after launch.</p>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel" data-reveal style={{ '--delay': `${i * 110}ms` } as React.CSSProperties}>
              <span className="step-n mono">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <dl>
                {s.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="kicker">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
        <div className="moods" data-reveal>
          <span className="kicker">Five moods</span>
          {MOODS.map((m) => (
            <span key={m.name} className="mood-chip" style={{ '--mood': m.color } as React.CSSProperties}>
              <i /> {m.name} <small className="mono">{m.range}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
