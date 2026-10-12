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
Midi Art      personal samples, free for any use (inside Work)
Studio        productions and mixes (inside Work)
Playlist      your own sequence of loops
Collage       layer up to four sounds at once
Night Water   a dark, full-screen listening room
CV.pdf        for applications and paperwork
Bio.pdf       the short version
Contact       write to Shilo


HOW TO LISTEN

· Click any file in a Work folder to play it. Loops repeat seamlessly until you choose something else; untick Loop to hear each once.
· ↑ ↓ arrow keys move through the files, playing each one as you go. ← → move within a sound.
· Space bar plays and pauses. ⏮ ⏭ step through the folder. Click the progress bar to move within a sound.
· Press + beside a loop to add it to your Playlist. Choose how many times each one repeats, then Play all. "Copy share link" sends your arrangement to someone else.
· Press ⧉ beside any sound to layer it in the Collage window. Up to four play at once, each looping on its own clock, so they drift in and out of phase. Set each layer's volume, pan and pitch; Record saves the next 30 seconds as a WAV.
· Open a .portal file, or the Night Water icon, to hear a collection in the dark. Esc brings you back.
· Windows can be dragged around and closed. The taskbar brings them back.
· Headphones or good speakers are best.


ABOUT THE SOUND

Loops are lossless 24-bit / 48 kHz FLAC. Longer pieces are high-quality 256k AAC so they can start playing straight away. Everything plays straight from the file with nothing added along the way: no streaming service, no processing.

The picture in Now Playing is the sound itself. Each row of points is a moment of its spectrum, low frequencies on the left, drifting away from you as it plays. Untick Datamosh if you'd like it to stay still between files.


ABOUT SHILO

Shilo Preshyon is a sound artist, collage practitioner and audio engineer based in Yellow Point, BC, on unceded Stz’uminus territory. Their practice works through collage, asking what an artist owes the sounds they gather. The full bio and CV are on the desktop.


CONTACT

{email}

No ads, no analytics, no accounts. Your playlist and collage are kept only in your own browser.`,


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
    {
      // Shilo's own samples. stream: too long to load whole, so it plays as it downloads.
      id: "midi-art",
      title: "Midi Art",
      sub: "Personal samples",
      kind: "samples",
      year: 2025,
      note: "Free for any use. Send Shilo what you make, let's talk about it.",
      license: `MIDI ART: PERSONAL SAMPLES
Shilo Preshyon

Free for any use: sample it, flip it, release it.

Send Shilo what you make. Let's talk about it.
{email}

Originals are 96 kHz WAV; downloads are coming soon.
What plays here are high-quality AAC listening copies.`,
      loop: false,
      items: [
        { id: "midi-art-1", title: "Midi Art 1", len: 95.04, ext: "m4a", stream: true },
        { id: "midi-art-2", title: "Midi Art 2", len: 386.82, ext: "m4a", stream: true },
        { id: "midi-art-3", title: "Midi Art 3", len: 35.01, ext: "m4a", stream: true },
        { id: "midi-art-4", title: "Midi Art 4", len: 71.36, ext: "m4a", stream: true },
        { id: "midi-art-5", title: "Midi Art 5", len: 26.18, ext: "m4a", stream: true },
        { id: "midi-art-6", title: "Midi Art 6", len: 381.70, ext: "m4a", stream: true },
        { id: "midi-art-7", title: "Midi Art 7", len: 388.61, ext: "m4a", stream: true },
        { id: "midi-art-8", title: "Midi Art 8", len: 183.38, ext: "m4a", stream: true },
        { id: "midi-art-9", title: "Midi Art 9", len: 973.57, ext: "m4a", stream: true },
        { id: "midi-art-10", title: "Midi Art 10", len: 282.62, ext: "m4a", stream: true },
        { id: "midi-art-11", title: "Midi Art 11", len: 133.80, ext: "m4a", stream: true },
        { id: "midi-art-12", title: "Midi Art 12", len: 1709.70, ext: "m4a", stream: true },
        { id: "midi-art-13", title: "Midi Art 13", len: 176.03, ext: "m4a", stream: true },
        { id: "midi-art-14", title: "Midi Art 14", len: 203.71, ext: "m4a", stream: true },
        { id: "midi-art-15", title: "Midi Art 15", len: 511.68, ext: "m4a", stream: true },
      ],
    },
    {
      // Productions and mixes. Items play through once (loop: false); ext: the file type when it isn't flac.
      id: "studio",
      title: "Studio",
      sub: "Production & engineering",
      kind: "studio",
      year: 2019,
      note: "Selected productions and mixes.",
      loop: false,
      items: [
        { id: "cartoon-lizard-neighbouring-hotels", title: "Neighbouring Hotels", artist: "Cartoon Lizard",
          release: "Sentinels EP", year: 2019, role: "Producer, Audio Engineer", len: 221.52, ext: "mp3" },
      ],
    },
  ],
};
