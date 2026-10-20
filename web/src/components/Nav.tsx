import { useScrollY } from '../hooks/useInView'
import type { WalletState } from '../hooks/useWallet'
import { Logo } from './Logo'
import { WalletMenu } from './WalletMenu'

export function Nav({ wallet, showWallet }: { wallet: WalletState; showWallet: boolean }) {
  const scrolled = useScrollY() > 8
  return (
    <nav className={`nav ${scrolled ? 'nav-solid' : ''}`} aria-label="Main">
      <div className="nav-inner">
        <a href="#top" className="brand" aria-label="Mood Ring home">
          <Logo size={26} />
          <span className="word">Mood Ring</span>
        </a>
        <div className="nav-links">
          <a href="#today">Today</a>
          <a href="#agent">Agent</a>
          <a href="#how">How it works</a>
          <a href="#archive">Archive</a>
          <a href="#proof">Proof</a>
        </div>
        <div className="nav-actions">
          {showWallet && <WalletMenu wallet={wallet} />}
        </div>
      </div>
    </nav>
  )
}
