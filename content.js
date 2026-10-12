// Everything the site says lives here. Add a collection by encoding its WAVs with
// tools/encode.sh into audio/<collection-id>/ and adding an entry below.
window.SITE = {
  name: "Shilo Preshyon",
  tagline: "sound · image · research",
  email: "spsounddirectory@proton.me", // TODO: move to an address on the site's own domain

  // TODO: real bio and statement
  about: `Short bio goes here: two or three sentences in third person,
the version a grant panel reads first.

Artist statement goes here: what the work listens for, and why.`,

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
