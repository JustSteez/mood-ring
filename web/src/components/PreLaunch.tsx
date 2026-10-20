const SAMPLES = [
  { src: './samples/genesis.png', label: 'Genesis' },
  { src: './samples/euphoric.png', label: 'Euphoric day' },
  { src: './samples/bearish.png', label: 'Bearish day' },
  { src: './samples/panic.png', label: 'Panic day' },
]

/** Shown before the contract is deployed. */
export function PreLaunch() {
  return (
    <header className="container hero" id="top">
      <div>
        <p className="status">
          <span className="dot" /> Launching on Robinhood Chain
        </p>
        <h1>
          The stock market, <span>painted once a day.</span>
        </h1>
        <p className="lede">
          Every day, real prices of eight stocks become one artwork, stored fully on-chain. Green days get a bull, red
          days get a bear. Minting is free.
        </p>
      </div>
      <div className="samples">
        {SAMPLES.map((s) => (
          <figure key={s.src}>
            <img src={s.src} alt={`Example artwork: ${s.label}`} width={800} height={800} />
            <figcaption>{s.label}</figcaption>
          </figure>
        ))}
      </div>
    </header>
  )
}
