# shilopreshyon.com

Static site, no build step: `index.html`, `style.css`, `cloud.js` (point-cloud renderer), `app.js` (windows,
player, routing), `content.js` (all text and the list of works).

## Preview locally

```
python3 -m http.server 8642
```

then open http://localhost:8642 (audio needs a server; opening the file directly won't load it).

## Visitor playlist

The + button next to any loop adds it to the visitor's Playlist window. Each loop repeats seamlessly 1–16 times,
then the next one starts. It's saved only in their browser; "Copy share link" makes a link like
`#/playlist/<repeats>/<collection>~<item>,…` that loads the same playlist anywhere.

## Collage

⧉ next to any sound adds it as a layer in the Collage window (up to 4). Layers loop on their own clocks, each with
volume, pan, tone (one knob: low-pass left, high-pass right, filter out of the path at centre) and pitch (±12 semitones plus ±100 cents fine).
Global: master volume, fade in/out time, random start points, and drift (a few cents of slow pitch wander). Record captures the next 30 s as it plays to a 24-bit WAV, turned down rather
than clipped if the layers sum over full scale. Share links: `#/collage/<collection>~<item>~<vol>~<pan>~<semi>~<mute>,…`.

## Adding work: `node tools/sync.mjs`

Shilo's folder (`/Users/jonathanscherk/Documents/Shilo Website Files`) is the master copy, and the site mirrors it.
Each top-level folder listed in `library.json` is a desktop icon, and its subfolders are folders on the site. Add, rename
or replace audio there, then run `node tools/sync.mjs` and commit the new `library.js`. The tool:

- makes listening copies: 48 kHz FLAC for loop folders (gapless), 256k AAC for everything else (MP3s used as they are)
- makes download copies for sections with `"downloads": true`: FLAC at the file's own rate, 24-bit. Float WAVs
  go through `tools/prep.swift`, which turns a file down only if it would clip (plain gain, never limiting)
- measures loudness (`tools/measure.swift`, ITU-R BS.1770; `--selftest` checks it) and sets Level match gains:
  each folder as a whole (studio folders track by track) to -16 LUFS, raised only while true peak stays at or under -1 dBTP
- uploads to Bunny (`listening-water.b-cdn.net`) under versioned names, so stale copies are never served, and
  removes superseded versions. The storage key is read from `~/.config/listening-water/bunny-storage-key` (never
  commit it)
- only reads Shilo's files, and keeps its work in `~/.cache/listening-water`, so re-runs only redo what changed

Titles, subtitles, notes, loop folders, credits (artist / role / year) and old ids kept as aliases go in
`library.json` under `folders`.

## Addresses

Every view has a link: `#/work/<collection>`, `#/work/<collection>/<item>`, `#/portal/<collection>`,
`#/about`, `#/contact`.

## CV and bio PDFs

Edit `docs/cv.html` / `docs/bio.html` (preview them at http://localhost:8642/docs/cv.html; a page that
overflows gets a red outline), then with the server running:

```
swiftc -O tools/make-pdfs.swift -o /tmp/make-pdfs
/tmp/make-pdfs "http://localhost:8642/docs/cv.html#pdf" files/Shilo-Preshyon-CV.pdf "http://localhost:8642/docs/bio.html#pdf" files/Shilo-Preshyon-Bio.pdf
```

Add `,full` after `#pdf` for application copies with the phone and Gmail from `docs/contact-private.js`
(gitignored, so those details never go online). The site's copies show only the public email.
Add `,amounts` for a CV with grant dollar amounts (for business-side applications), e.g. `#pdf,full,amounts`.

## Publishing

Live at https://shilopreshyon.github.io (GitHub Pages from `main` of the public repo
ShiloPreshyon/shilopreshyon.github.io). Commit and `git push`; it updates within a minute or two.
