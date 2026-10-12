// Everything the site says lives here. Add a collection by encoding its WAVs with
// tools/encode.sh into audio/<collection-id>/ and adding an entry below.
window.SITE = {
  name: "Shilo Preshyon",
  tagline: "sound · research",
  email: "spsounddirectory@proton.me", // TODO: move to an address on the site's own domain

  // The desktop's Ethos.txt, in Shilo's words.
  ethos: `ETHOS

RECIPROCITY WITH MATERIALS AND PROCESS
Sound is gathered from places, people and moments, and something is given back in the making. Nothing here is a resource to be used up. Every recorded moment has its own value, whether or not it becomes a piece.

PLAY WITHOUT ATTACHMENT
The work starts by letting go of what it should be. Materials are arranged, rearranged and left to sit beside each other. Collage doesn't resolve; it lets the space between things speak.

SPIRIT IS EVERYWHERE
In a field recording, in tape hiss, in a loop that won't line up. Playing with the arrangement of materials is a way of unveiling it.

The past speaks through the archive. The present listens in the making. The future listener meets what remains, and finds their own relationship to it.

That is why the samples here are free: so the play can continue with you.`,

  // The desktop's Readme.txt: a guide to the site. {email} is filled in from above.
  readme: `THE BEAUTIFUL RESEARCH DIRECTORY
Shilo Preshyon · sound · research

Welcome. This is a working archive of sound: field recordings, studio sessions, tape experiments and improvised material, gathered over many years and opened here one folder at a time.


WHAT'S HERE

Personal Works      pieces and projects
Collage Materials   samples: free to download (⤓) and use
Collaborations      work made with other artists
Playlist            your own sequence of sounds
Collage             layer up to four sounds at once
Night Water         a dark, full-screen listening room
CV.pdf              for applications and paperwork
Bio.pdf             the short version
Ethos.txt           why the work is made this way
Contact             write to Shilo


HOW TO LISTEN

· Open a folder and click any file to play it. Loops repeat seamlessly until you choose something else; untick Loop to hear each once.
· In Collage Materials, ⤓ downloads a lossless copy of any sample. They're free to use: see License.txt.
· ↑ ↓ arrow keys move through the files, playing each one as you go. ← → move within a sound.
· Space bar plays and pauses. ⏮ ⏭ step through the folder. Click the progress bar to move within a sound.
· Press + beside any sound to add it to your Playlist. Choose how many times each one repeats, then Play all. "Copy share link" sends your arrangement to someone else.
· Press ⧉ beside any sound to layer it in the Collage window. Up to four play at once, each looping on its own clock, so they drift in and out of phase. Set each layer's volume, pan, tone (darker or brighter) and pitch, in semitones plus a fine slider for tuning layers to each other. Fade eases layers in and out, Random start begins each one somewhere new, and Drift lets the pitch wander like tape. Record saves the next 30 seconds as a WAV.
· Open a .portal file, or the Night Water icon, to hear a collection in the dark. Esc brings you back.
· Windows can be dragged around and closed. The taskbar brings them back.
· Headphones or good speakers are best.


ABOUT THE SOUND

Loops are lossless 24-bit / 48 kHz FLAC. Longer pieces are high-quality 256k AAC so they can start playing straight away. Everything plays straight from the file with nothing added along the way: no streaming service, no processing. The one exception is Level match in Now Playing, a plain volume change that keeps pieces at a similar loudness; untick it to hear every file exactly as it is.

The picture in Now Playing is the sound itself. Each row of points is a moment of its spectrum, low frequencies on the left, drifting away from you as it plays. Untick Datamosh if you'd like it to stay still between files.


ABOUT SHILO

Shilo Preshyon is a sound artist, collage practitioner and audio engineer based in Yellow Point, BC, on unceded Stz’uminus territory. Their practice works through collage, asking what an artist owes the sounds they gather. Ethos.txt says why; the full bio and CV are on the desktop.


CONTACT

{email}

No ads, no analytics, no accounts. Your playlist and collage are kept only in your own browser.`,


  // PDFs made from docs/*.html with tools/make-pdfs.swift; the viewer window shows the HTML page.
  docs: {
    cv: { title: "CV.pdf", pdf: "files/Shilo-Preshyon-CV.pdf", page: "docs/cv.html", pages: 3 },
    bio: { title: "Bio.pdf", pdf: "files/Shilo-Preshyon-Bio.pdf", page: "docs/bio.html", pages: 1 },
  },

  // The audio library (folders and sounds) is in library.js, generated from Shilo's folder by tools/sync.mjs.
  licenses: {
    samples: `COLLAGE MATERIALS: PERSONAL SAMPLES
Shilo Preshyon

Free for any use: sample it, flip it, release it.
Why free? See Ethos.txt on the desktop.

Send Shilo what you make. Let's talk about it.
{email}

Downloads (⤓) are lossless FLAC at each recording's own sample rate, up to 96 kHz,
so there's room to pitch things down. What plays on the site are listening copies.`,
  },
};
