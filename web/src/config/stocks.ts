/** Display names and Chainlink feeds for the eight stocks (same order as the contract). */
export const STOCKS: Record<string, { name: string; feed: `0x${string}` }> = {
  NVDA: { name: 'NVIDIA', feed: '0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15' },
  TSLA: { name: 'Tesla', feed: '0x4A1166a659A55625345e9515b32adECea5547C38' },
  AAPL: { name: 'Apple', feed: '0x6B22A786bAa607d76728168703a39Ea9C99f2cD0' },
  AMZN: { name: 'Amazon', feed: '0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C' },
  MSFT: { name: 'Microsoft', feed: '0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E' },
  GOOGL: { name: 'Alphabet', feed: '0xF6f373a037c30F0e5010d854385cA89185AE638b' },
  META: { name: 'Meta', feed: '0x7C38C00C30BEe9378381E7B6135d7283356D71b1' },
  SPY: { name: 'S&P 500 ETF', feed: '0x319724394D3A0e3669269846abE664Cd621f9f6A' },
}
