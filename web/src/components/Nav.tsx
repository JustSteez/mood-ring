import { Logo } from './Logo'
import { useScrollY } from '../hooks/useInView'
import type { WalletState } from '../hooks/useWallet'
import { WalletMenu } from './WalletMenu'

export function Nav({ wallet, showWallet }: { wallet: WalletState; showWallet: boolean }) {
  const scrolled = useScrollY() > 8
  return (
    <nav className={`nav ${scrolled ? 'nav-solid' : ''}`} aria-label="Main">
      <div className="container nav-inner">
        <a href="#top" className="nav-logo">
          <Logo />
          Mood Ring
        </a>
        <div className="nav-links">
          <a href="#today">Today</a>
          <a href="#how">How it works</a>
          <a href="#archive">Archive</a>
        </div>
        <div className="nav-actions">{showWallet && <WalletMenu wallet={wallet} />}</div>
      </div>
    </nav>
  )
}
