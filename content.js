// Everything the site says lives here. Add a collection by encoding its WAVs with
// tools/encode.sh into audio/<collection-id>/ and adding an entry below.
window.SITE = {
  name: "Shilo Preshyon",
  tagline: "sound · research",
  email: "spsounddirectory@proton.me", // TODO: move to an address on the site's own domain

  // The desktop's Readme.txt: a guide to the site. {email} is filled in from above.
  readme: `THE BEAUTIFUL RESEARCH DIRECTORY
Shilo Preshyon · sound · research

Welcome. This is a working archive of sound: field recordings, studio sessions, tape experiments and improvised material, gathered over many years and opened here one folder at a time.


WHAT'S HERE

Work          collections of sound, a folder each
Playlist      your own sequence of loops
Night Water   a dark, full-screen listening room
CV.pdf        for applications and paperwork
Bio.pdf       the short version
Contact       write to Shilo


HOW TO LISTEN

· Click any file in a Work folder to play it. Loops repeat seamlessly until you choose something else; untick Loop to hear each once.
· ↑ ↓ arrow keys move through the files, playing each one as you go. ← → move within a sound.
· Space bar plays and pauses. ⏮ ⏭ step through the folder. Click the progress bar to move within a sound.
· Press + beside a loop to add it to your Playlist. Choose how many times each one repeats, then Play all. "Copy share link" sends your arrangement to someone else.
· Open a .portal file, or the Night Water icon, to hear a collection in the dark. Esc brings you back.
· Windows can be dragged around and closed. The taskbar brings them back.
· Headphones or good speakers are best.


ABOUT THE SOUND

Every file is lossless, 24-bit / 48 kHz FLAC, played straight from the file with nothing added along the way: no streaming service, no lossy compression, no processing.

The picture in Now Playing is the sound itself. Each row of points is a moment of its spectrum, low frequencies on the left, drifting away from you as it plays. Untick Datamosh if you'd like it to stay still between files.


ABOUT SHILO

Shilo Preshyon is a sound artist, collage practitioner and audio engineer based in Yellow Point, BC, on unceded Stz’uminus territory. Their practice works through collage, asking what an artist owes the sounds they gather. The full bio and CV are on the desktop.


CONTACT

{email}

No ads, no analytics, no accounts. Your playlist is kept only in your own browser.`,


  // PDFs made from docs/*.html with tools/make-pdfs.swift; the viewer window shows the HTML page.
  docs: {
    cv: { title: "CV.pdf", pdf: "files/Shilo-Preshyon-CV.pdf", page: "docs/cv.html", pages: 3 },
    bio: { title: "Bio.pdf", pdf: "files/Shilo-Preshyon-Bio.pdf", page: "docs/bio.html", pages: 1 },
  },

  collections: [
    {
      id: "small-loops-2026",
      title: "Small Loops",
      sub: "LĒNA Residency · JOYA: AiR, 2026",
      year: 2026,
      note: "Small loops from LĒNA Residency (Galiano Island, June 10–12) and JOYA: AiR (Andalucía, June 19), 2026.",
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
