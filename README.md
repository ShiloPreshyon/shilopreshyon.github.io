# shilopreshyon.com

Static site, no build step: `index.html`, `style.css`, `cloud.js` (point-cloud renderer), `app.js` (windows,
player, routing), `content.js` (all text and the list of works).

## Preview locally

```
python3 -m http.server 8642
```

then open http://localhost:8642 (audio needs a server; opening the file directly won't load it).

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

## Publishing

Live at https://shilopreshyon.github.io (GitHub Pages from `main` of the public repo
ShiloPreshyon/shilopreshyon.github.io). Commit and `git push`; it updates within a minute or two.
