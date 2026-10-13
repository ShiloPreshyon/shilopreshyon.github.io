// Everything the site says lives here. Add a collection by encoding its WAVs with
// tools/encode.sh into audio/<collection-id>/ and adding an entry below.
window.SITE = {
  name: "Shilo Preshyon",
  tagline: "sound · research",
  email: "spsounddirectory@proton.me", // TODO: move to an address on the site's own domain

  // Write Me letters are delivered by Web3Forms (web3forms.com), which keeps Shilo's address on its side. This key
  // is public by design; it only lets the form send to that address. Empty = no Send button.
  writeMeKey: "",

  // The Start menu's Keys window.
  keys: `KEYS

↑ ↓      files
← →      within a file
space    play / pause
+        playlist
⧉        collage
⤓        keep

{email}`,


  // PDFs made from docs/*.html with tools/make-pdfs.swift; the viewer window shows the HTML page.
  docs: {
    cv: { title: "CV.pdf", pdf: "files/Shilo-Preshyon-CV.pdf", page: "docs/cv.html", pages: 3 },
    bio: { title: "Bio.pdf", pdf: "files/Shilo-Preshyon-Bio.pdf", page: "docs/bio.html", pages: 1 },
  },

  // The audio library (folders and sounds) is in library.js, generated from Shilo's folder by tools/sync.mjs.
  licenses: {
    samples: `Free for any use.
Send me what you make. Let's talk about it.

{email}

⤓ is lossless, at the recording's own rate (up to 96 kHz).`,
  },
};
