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
