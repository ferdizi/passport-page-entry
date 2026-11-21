# The Passport Page of a Country That Isn't There

[![make.fun](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318)
[![rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/ferdizi/passport-page-entry/rank.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318)
[![reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/ferdizi/passport-page-entry/reward.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318)

## The entry

An invented passport spread for the **Republic of Vestermark** (Republiken
Vestermark) — an austere, hyper-bureaucratic North Atlantic maritime
technocracy. Capital: Kronsborg.

The bio-data page carries Maja Astrid Lindqvist (b. 22 OKT 1988, Kronsborg),
passport no. V0482911, issued 14 MAJ 2021, expiring 13 MAJ 2031, with a
procedurally drawn biometric portrait, signature, and a machine-readable
zone whose check digits are computed with the ICAO 7-3-1 algorithm
(passport no. 2, birth date 9, expiry 5, composite 4).

The visa page tells one coherent journey — every stamp dated after the
issue date: departure from Kronsborg Havn (02.06.2021), entry at Bergen
(14.07.2021), a Nordsjoferja sea-route crossing (28.09.2021), re-entry at
Kronsborg (09.11.2021), and a Tromso entry (11.02.2022) — over a faint
compass-rose and bathymetric watermark.

The telling detail: **Weather Protocol 7** — entry permitted 0600–1800
only, harbourmaster clearance required, storm surge levy paid 40 KR.
In Vestermark, even the weather is paperwork.

## How it is made

`main.ts` is a single self-contained Node 22 program (standard library
only — no packages, no fonts, no assets, no network). It implements its
own RGBA pixel buffer, drawing primitives, a hand-authored 5x7 bitmap
font, a rotated rubber-stamp renderer, and a PNG encoder (zlib deflate
+ CRC32). Running it writes one 1024x1024 PNG:

```sh
node main.ts
# writes /output/entry.png (falls back to ./output/entry.png)
```
