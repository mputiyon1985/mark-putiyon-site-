# Mark Putiyon headshot

Reusable copies of the 7 November 2026 portrait. The site keeps the filename `headshot.png` at the repository root. The page image, the Open Graph `og:image` tag, and the JSON-LD `image` property all point at `https://mark.putiyon.net/headshot.png`. Do not rename that file.

`headshot.png` is the optimized 1024×1024 PNG. It is the same bytes as `mark-putiyon-headshot-1024.png`.

## Files

Dimensions below were read from each file.

| File | Pixels | Role |
| --- | --- | --- |
| `mark-putiyon-headshot-2026-11-07-original.png` | 1254×1254 | Source original. Not used by the page. |
| `mark-putiyon-headshot-1024.png` | 1024×1024 | Optimized PNG. Same file as `/headshot.png`. |
| `mark-putiyon-headshot-1024.webp` | 1024×1024 | WebP copy. |
| `mark-putiyon-headshot-512.png` | 512×512 | PNG copy. |
| `mark-putiyon-headshot-512.webp` | 512×512 | WebP copy. |
| `mark-putiyon-headshot-256.png` | 256×256 | PNG copy. |
| `mark-putiyon-headshot-256.webp` | 256×256 | WebP copy. |

## Hashes

`manifest.json` records the repo path, pixel size, byte length, and SHA-256 of every file in the table, plus the site file `headshot.png`.

From the repository root:

```
sha256sum -c assets/mark/SHA256SUMS
```

The source original is 2,190,746 bytes (about 2.1 MB). That is over the site check's 2 MB limit, so `scripts/check-site.mjs` allows this one path, and `.vercelignore` keeps it out of the Vercel upload. The file remains in git for reuse. Every other copy, including `headshot.png`, is under 2 MB.
