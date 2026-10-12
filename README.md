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

## Long pieces and samples

Items with `stream: true` play through an `<audio>` element as they download instead of being decoded whole,
so long pieces start at once and don't fill memory. Midi Art uses these: 256k AAC listening copies made with
`afconvert -f m4af -d aac@48000 -b 256000 -q 127 --src-complexity bats -r 127 in.wav out.m4a`.
A collection's `license` text appears as License.txt at the top of its folder.

## Adding a collection

1. `tools/encode.sh audio/<collection-id> /path/to/*.wav` — lossless FLAC, same bit depth and rate.
2. Add an entry to `collections` in `content.js` (ids match the FLAC file names it printed).

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
