// Everything the site says lives here. Add a collection by encoding its WAVs with
// tools/encode.sh into audio/<collection-id>/ and adding an entry below.
window.SITE = {
  name: "Shilo Preshyon",
  tagline: "sound · image · research",
  email: "spsounddirectory@proton.me", // TODO: move to an address on the site's own domain

  about: `Shilo Preshyon is a sound artist, collage practitioner, and audio engineer of mixed Lebanese, Mi'kmaq, and Acadian heritage, based in Yellow Point, BC on unceded Stz'uminus territory. Their practice centers on a decade-long personal sound archive drawn from field recordings, studio sessions, tape experiments, and improvised material accumulated across many contexts and collaborations. Working through collage as a primary method, Shilo investigates what it means to develop a relationship to place and its materials that is reciprocal rather than extractive, asking what the artist owes the sounds they gather, and what those sounds carry into the work.

Shilo operates Risque Disque Studios in Yellow Point, a shared space with Fifthline Management and Headwater Music, where they work as engineer, producer, and mentor to emerging artists. Professional credits include Cameron Whitcomb, Crack Cloud, Spencer Krug, Hope Slide, and Backseat Lovers. Active collage and sound design projects include a small sounder, Bronfree Films, and Soup Du Jour. Shilo has received funding from Canada Council for the Arts and Creative BC across multiple cycles, and holds mentorship from composer Jonathan Scherk, an artist on the Berlin-based label Fatiche.`,

  // Made from docs/cv.html and docs/bio.html with tools/make-pdfs.swift
  files: { cv: "files/Shilo-Preshyon-CV.pdf", bio: "files/Shilo-Preshyon-Bio.pdf" },

  collections: [
    {
      id: "small-loops-2026",
      title: "Small Loops",
      sub: "Residencies, 2026",
      year: 2026,
      note: "Small loops from residencies in 2026.",
      loop: true,
      items: [
        { id: "june-10-2026-1", title: "June 10 2026 #1", date: "2026-06-10", len: 10.99 },
        { id: "june-11-2026-1", title: "June 11 2026 #1", date: "2026-06-11", len: 4.93 },
        { id: "june-11-2026-2", title: "June 11 2026 #2", date: "2026-06-11", len: 6.02 },
        { id: "june-11-2026-3", title: "June 11 2026 #3", date: "2026-06-11", len: 4.40 },
        { id: "june-12-2026-1", title: "June 12 2026 #1", date: "2026-06-12", len: 19.37 },
        { id: "june-12-2026-2", title: "June 12 2026 #2", date: "2026-06-12", len: 8.28 },
        { id: "june-12-2026-3", title: "June 12 2026 #3", date: "2026-06-12", len: 11.15 },
        { id: "june-19-2026-1", title: "June 19 2026 #1", date: "2026-06-19", len: 14.60 },
        { id: "june-19-2026-2", title: "June 19 2026 #2", date: "2026-06-19", len: 60.34 },
      ],
    },
  ],
};
