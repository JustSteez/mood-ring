# Mood Ring brand kit

The stock market, painted once a day.

Dark edition, matching the live site: black, Geist type, one italic serif accent word, a silver ring whose stone glows in the day's mood colour.

## Logo

The mark is a ring with a stone: one solid colour, no gradient.

| File | Use |
|---|---|
| `svg/mark-white.svg`, `png/mark-white-1024.png` | Mark on black or dark photos (primary) |
| `svg/mark-black.svg`, `png/mark-black-1024.png` | Mark on white |
| `svg/app-icon.svg`, `png/app-icon-1024.png` | App icon / favicon (white ring on a black tile) |
| `svg/lockup-white.svg`, `png/lockup-on-black.png` | Mark + MOOD RING on dark (primary) |
| `svg/lockup-black.svg`, `png/lockup-on-white.png` | Mark + MOOD RING on white |

The wordmark is set in capitals with wide letter spacing, like the site's nav. Keep clear space around the logo at least the height of the stone. Don't recolour the mark or add outlines or shadows to it.

## Social

| File | Size | Use |
|---|---|---|
| `png/x-avatar.png` | 400×400 | X / Discord / Telegram profile photo |
| `png/x-banner.png` | 1500×500 | X header (text sits high, clear of the profile photo) |
| `png/og-image.png` | 1200×630 | Link preview |
| `posts/launch-post.png` | 1600×900 | Launch announcement |
| `posts/agent-post.png` | 1600×900 | Personal agent announcement |

The artwork is real output from the contract's renderer. Pieces other than #1 are example days from a test run, and the agent post shows an example conversation.

## Colours

See `png/palette.png`.

- Black `#000000`, Panel `#0B0B0C`, Line `#2A2A2E`, Ink `#F4F4F2`, Muted `#8A8A90`, Live `#7EE0B0`
- Moods (art and the ring's stone): Euphoric `#D4FF3A`, Bullish `#B8F5D2`, Flat / Genesis `#5B2EFF`, Bearish `#FF8A3D`, Panic `#FF3B30`

## Type

All free on Google Fonts.

- **Geist** Medium for headlines, tight letter spacing. Regular for body.
- **Instrument Serif Italic** for one accent word per headline ("*painted*", "*agent*"), in silver.
- **Geist Mono** in small caps with wide spacing for labels ("LIVE ON ROBINHOOD CHAIN").

## Copy

- Name: Mood Ring
- Tagline: The stock market, painted once a day.
- X bio: The stock market, painted once a day. Free daily on-chain art from 8 real stock prices on Robinhood Chain. Every piece wakes a personal agent.

## Rebuild

```
npm install
npm run build
```
