/**
 * The eight stocks (same order as the contract): display name, Chainlink price feed and the
 * Robinhood stock token ERC-20 (18 decimals). Token addresses verified on-chain 2026-10-20.
 */
export const STOCKS: Record<string, { name: string; feed: `0x${string}`; token: `0x${string}` }> = {
  NVDA: {
    name: 'NVIDIA',
    feed: '0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15',
    token: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC',
  },
  TSLA: {
    name: 'Tesla',
    feed: '0x4A1166a659A55625345e9515b32adECea5547C38',
    token: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d',
  },
  AAPL: {
    name: 'Apple',
    feed: '0x6B22A786bAa607d76728168703a39Ea9C99f2cD0',
    token: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9',
  },
  AMZN: {
    name: 'Amazon',
    feed: '0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C',
    token: '0x12f190a9F9d7D37a250758b26824B97CE941bF54',
  },
  MSFT: {
    name: 'Microsoft',
    feed: '0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E',
    token: '0xe93237C50D904957Cf27E7B1133b510C669c2e74',
  },
  GOOGL: {
    name: 'Alphabet',
    feed: '0xF6f373a037c30F0e5010d854385cA89185AE638b',
    token: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3',
  },
  META: {
    name: 'Meta',
    feed: '0x7C38C00C30BEe9378381E7B6135d7283356D71b1',
    token: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35',
  },
  SPY: {
    name: 'S&P 500 ETF',
    feed: '0x319724394D3A0e3669269846abE664Cd621f9f6A',
    token: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C',
  },
}

/** Block the Mood Ring contract was deployed in; log scans start here. */
export const MOOD_RING_DEPLOY_BLOCK = 93_104_904n
