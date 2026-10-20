import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-top">
        <div>
          <a className="brand" href="#top">
            <Logo size={26} />
            <span className="word">Mood Ring</span>
          </a>
          <p>The stock market, painted once a day.</p>
        </div>
        <div className="foot-links">
          <span className="kicker">Explore</span>
          <a href="#today">Today</a>
          <a href="#agent">Your agent</a>
          <a href="#how">How it works</a>
          <a href="#archive">Archive</a>
        </div>
        <div className="foot-links">
          <span className="kicker">Trust</span>
          <a href="#proof">Proof</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="foot-links">
          <span className="kicker">Network</span>
          <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">
            Robinhood Chain ↗
          </a>
          <a href="#proof">Chainlink feeds</a>
        </div>
      </div>

      <p className="foot-note">
        Mood Ring is independent software. Not affiliated with Robinhood or Chainlink. Art is generated from public
        price data and is not financial advice.
      </p>
      <div className="foot-word" aria-hidden="true">
        Mood Ring
      </div>
    </footer>
  )
}
