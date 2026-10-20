const STEPS = [
  {
    title: 'Snap the day',
    body: 'Once per day, anyone can take the snapshot. The contract reads the live prices of NVDA, TSLA, AAPL, AMZN, MSFT, GOOGL, META and SPY.',
  },
  {
    title: 'The market paints',
    body: 'Each snapshot is compared with the previous one. The colour shows the mood, the ring shows every stock’s move, and a bull or a bear sits in the middle.',
  },
  {
    title: 'Mint it for free',
    body: 'Mint any day, as many times as you like. You only pay network gas. The artwork lives fully on-chain, with no servers and no IPFS.',
  },
]

const MOODS = [
  { name: 'Euphoric', range: 'above +2%', color: '#D4FF3A' },
  { name: 'Bullish', range: 'above +0.3%', color: '#6EE7B7' },
  { name: 'Flat', range: 'within ±0.3%', color: '#5B2EFF' },
  { name: 'Bearish', range: 'below −0.3%', color: '#FB923C' },
  { name: 'Panic', range: 'below −2%', color: '#EF4444' },
]

export function HowItWorks() {
  return (
    <section className="section" id="how" aria-labelledby="how-h">
      <div className="container">
        <p className="eyebrow">How it works</p>
        <h2 id="how-h">Three steps, no money involved</h2>
        <p className="section-lede">No token, no deposits and no admin. The contract can’t be changed after launch.</p>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="moods" aria-label="Moods">
          {MOODS.map((m) => (
            <span key={m.name}>
              <i style={{ background: m.color }} />
              {m.name} <small>{m.range}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
