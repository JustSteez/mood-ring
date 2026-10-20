import { parseAbi } from 'viem'

export const moodRingAbi = parseAbi([
  'function snap() returns (uint256)',
  'function mint(uint256 number) returns (uint256)',
  'function snapAndMint() returns (uint256)',
  'function currentDay() view returns (uint256)',
  'function snapshotCount() view returns (uint256)',
  'function snapshotOfDay(uint256 day) view returns (uint256)',
  'function mintedPerSnapshot(uint256 number) view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function getSnapshot(uint256 number) view returns ((uint64 takenAt, uint32 day, int64[8] prices))',
  'function moves(uint256 number) view returns (int256[8] bps, int256 avgBps)',
  'function liveMoves() view returns (int256[8] bps, int256 avgBps)',
  'function tickers() view returns (string[8])',
  'function svg(uint256 number) view returns (string)',
  'function previewSvg() view returns (string)',
  'event Minted(uint256 indexed tokenId, uint256 indexed number, address indexed to)',
  'error AlreadySnappedToday(uint256 number)',
  'error NoSuchSnapshot(uint256 number)',
])
