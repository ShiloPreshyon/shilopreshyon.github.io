const S = window.SITE;
const $ = id => document.getElementById(id);
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const narrow = () => innerWidth <= 720;
const findColl = id => S.collections.find(c => c.id === id);
let moshPref = true;
try { moshPref = localStorage.getItem('mosh') !== '0'; } catch (e) {}

const ICO = {
  cd: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><circle cx="8" cy="8" r="6.5" fill="#d8dee2" stroke="#000"/><path d="M4 6.5a4.5 4.5 0 0 1 3-3" stroke="#7fd0ff" fill="none"/><circle cx="8" cy="8" r="1.6" fill="#000"/></svg>',
  folder: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 3.5h5l1.5 2H15v8H1z" fill="#e6e6e6" stroke="#000"/><path d="M1 6.5h14" stroke="#000"/></svg>',
  doc: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M3 1.5h7l3 3v10H3z" fill="#fff" stroke="#000"/><path d="M5 6.5h6M5 8.5h6M5 10.5h6M5 12.5h4" stroke="#000"/></svg>',
  mail: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1.5" y="3.5" width="13" height="9" fill="#fff" stroke="#000"/><path d="M1.5 3.5l6.5 5.5 6.5-5.5" fill="none" stroke="#000"/></svg>',
  pdf: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M3 1.5h7l3 3v10H3z" fill="#fff" stroke="#000"/><path d="M10 1.5v3h3" fill="none" stroke="#000"/><rect x="4" y="9" width="8" height="4" fill="#1d3a52"/><path d="M5 6.5h5" stroke="#000"/></svg>',
  layers: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1.5" y="1.5" width="9" height="7" fill="#fff" stroke="#000"/><rect x="3.5" y="4.5" width="9" height="7" fill="#dbe8f0" stroke="#000"/><rect x="5.5" y="7.5" width="9" height="7" fill="#1d3a52" stroke="#000"/></svg>',
  list: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#000"/><path d="M4 5h1M4 8h1M4 11h1M7 5h5M7 8h5M7 11h5" stroke="#1d3a52"/></svg>',
  wav: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M3 1.5h7l3 3v10H3z" fill="#fff" stroke="#000"/><path d="M5 9v1M7 7v5M9 8v3M11 6v6" stroke="#1d3a52"/></svg>',
  moon: '<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="#000" stroke="#7fd0ff"/><path d="M9.5 3.5a4.5 4.5 0 1 0 3 7.5a3.6 3.6 0 1 1-3-7.5z" fill="#dbe8f0"/><path d="M3 13h10" stroke="#7fd0ff" stroke-dasharray="1 1"/></svg>',
};

/* ---------------- player ---------------- */
// Lossless FLAC decoded into an AudioBuffer and played straight to the output:
// no gain stage or processing in the path. The analyser only listens (it isn't upstream of anything).
const P = { ac: null, an: null, cache: new Map(), src: null, buffer: null, coll: null, idx: -1,
  startAt: 0, offset: 0, playing: false, loading: false, error: false, loop: true,
  lpos: null }; // lpos: index into the visitor's playlist while playing from it, else null
let gen = 0;

function ctx() {
  if (!P.ac) {
    try { P.ac = new AudioContext({ sampleRate: 48000 }); } catch (e) { P.ac = new AudioContext(); }
    P.an = P.ac.createAnalyser();
    P.an.fftSize = 2048; P.an.smoothingTimeConstant = .55; P.an.minDecibels = -95; P.an.maxDecibels = -15;
  }
  return P.ac;
}
function getBuf(item, coll) {
  if (!P.cache.has(item.id)) {
    const p = fetch(`audio/${coll.id}/${item.id}.${item.ext || 'flac'}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => ctx().decodeAudioData(a));
    p.catch(() => P.cache.delete(item.id));
    P.cache.set(item.id, p);
  }
  return P.cache.get(item.id);
}
async function select(coll, idx, autoplay = true, lpos = null) {
  const g = ++gen;
  ctx().resume();
  stopSrc();
  if (coll !== P.coll) P.loop = coll.loop !== false; // loops repeat by default, Studio tracks play through
  if (C.playing) collageStop();
  Object.assign(P, { coll, idx, lpos, offset: 0, playing: false, loading: true, error: false, buffer: null });
  if (moshPref) Cloud.mosh(3000);
  if (lpos === null) setHash(`#/work/${coll.id}/${coll.items[idx].id}`);
  ui();
  let b;
  try { b = await getBuf(coll.items[idx], coll); } catch (e) { if (g === gen) { P.loading = false; P.error = true; ui(); } return; }
  if (g !== gen) return; // a newer selection superseded this one
  P.loading = false; P.buffer = b;
  if (autoplay) start(0); else ui();
  // warm the next one
  const nx = lpos === null ? (coll.items[idx + 1] && { coll, idx: idx + 1 }) : resolve(PL.entries[lpos + 1]);
  if (nx) getBuf(nx.coll.items[nx.idx], nx.coll);
}
function start(off) {
  const ac = ctx(); ac.resume();
  if (C.playing) collageStop();
  stopSrc();
  const s = ac.createBufferSource();
  const d = P.buffer.duration, inList = P.lpos !== null;
  s.buffer = P.buffer; s.loop = inList || P.loop;
  s.connect(ac.destination); s.connect(P.an);
  s.onended = () => {
    if (P.src !== s) return;
    P.src = null; P.playing = false; P.offset = 0;
    if (inList) listNext();
    else if (P.idx + 1 < P.coll.items.length) select(P.coll, P.idx + 1); else ui();
  };
  // In a playlist, off counts from the first repeat; the loop runs seamlessly and stops after the last one.
  s.start(0, off % d);
  if (inList) s.stop(ac.currentTime + Math.max(0, PL.reps * d - off));
  P.src = s; P.startAt = ac.currentTime - off; P.playing = true;
  ui();
}
function stopSrc() { if (P.src) { const s = P.src; P.src = null; try { s.stop(); } catch (e) {} } }
function elapsed() { return P.playing ? P.ac.currentTime - P.startAt : P.offset; }
function pos() {
  if (!P.buffer) return 0;
  const p = elapsed(), d = P.buffer.duration;
  if (P.lpos !== null) return p % d;
  if (!P.playing) return P.offset;
  return P.loop ? p % d : Math.min(p, d);
}
function toggle() {
  if (!P.coll) return select(S.collections[0], 0);
  if (P.loading) return;
  if (!P.buffer) return select(P.coll, P.idx);
  if (P.playing) { P.offset = P.lpos !== null ? elapsed() : pos(); stopSrc(); P.playing = false; ui(); } else start(P.offset);
}
function stop() { stopSrc(); P.playing = false; P.offset = 0; ui(); }
function step(d) {
  if (P.lpos !== null) return listPlay((P.lpos + d + PL.entries.length) % PL.entries.length);
  if (!P.coll) return select(S.collections[0], 0);
  const n = P.coll.items.length;
  select(P.coll, (P.idx + d + n) % n);
}
function setLoop(v) {
  if (P.src && P.lpos === null) { const p = pos(); P.src.loop = v; P.startAt = P.ac.currentTime - p; }
  P.loop = v; ui();
}
function seek(frac) {
  if (!P.buffer) return;
  const d = P.buffer.duration;
  const off = Math.max(0, Math.min(.999, frac)) * d + (P.lpos !== null ? Math.floor(elapsed() / d) * d : 0);
  if (P.playing) start(off); else { P.offset = off; ui(); }
}

/* ---------------- visitor playlist ---------------- */
// Lives in the visitor's own browser (and in share links), never on a server.
// Entries are {u: unique key, c: collection id, i: item id}; each plays PL.reps times, seamlessly.
let PL = { entries: [], reps: 2 };
try { const v = JSON.parse(localStorage.getItem('playlist')); if (v && Array.isArray(v.entries)) PL = v; } catch (e) {}
let uid = Date.now();
const saveList = () => { try { localStorage.setItem('playlist', JSON.stringify(PL)); } catch (e) {} };
function resolve(e) {
  const coll = e && findColl(e.c), idx = coll ? coll.items.findIndex(x => x.id === e.i) : -1;
  return idx >= 0 ? { coll, idx } : null;
}
PL.entries = PL.entries.filter(resolve);
function listPlay(n) {
  const r = resolve(PL.entries[n]); if (!r) return;
  openWin('w-play');
  select(r.coll, r.idx, true, n);
}
function listNext() {
  if (P.lpos + 1 < PL.entries.length) listPlay(P.lpos + 1);
  else { P.lpos = null; ui(); }
}
let listMsg = '';
function addToList(coll, idx) {
  PL.entries.push({ u: (uid++).toString(36), c: coll.id, i: coll.items[idx].id });
  saveList();
  listMsg = `Added ${coll.items[idx].title}`;
  renderList();
  document.querySelectorAll('.task').forEach(b => { if (b.textContent === 'Playlist') { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 600); } });
  if ($('w-list').classList.contains('hide')) openWin('w-list');
}
function removeAt(n) {
  PL.entries.splice(n, 1);
  if (P.lpos !== null) { if (n < P.lpos) P.lpos--; else if (n === P.lpos) P.lpos = null; }
  saveList(); renderList(); ui();
}
function moveAt(n, d) {
  const m = n + d; if (m < 0 || m >= PL.entries.length) return;
  [PL.entries[n], PL.entries[m]] = [PL.entries[m], PL.entries[n]];
  if (P.lpos === n) P.lpos = m; else if (P.lpos === m) P.lpos = n;
  saveList(); renderList(); ui();
}
function shareLink() {
  return `${location.origin}${location.pathname}#/playlist/${PL.reps}/${PL.entries.map(e => `${e.c}~${e.i}`).join(',')}`;
}
function renderList() {
  const rows = $('listRows'); rows.innerHTML = '';
  let total = 0;
  PL.entries.forEach((e, n) => {
    const r = resolve(e), it = r.coll.items[r.idx];
    total += it.len * PL.reps;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="num">${n + 1}</td><td class="name">${ICO.wav}<span></span></td><td></td><td>${fmt(it.len)}</td>` +
      `<td class="ctl"><button class="mini" title="Move up">▲</button><button class="mini" title="Move down">▼</button><button class="mini" title="Remove">✕</button></td>`;
    tr.querySelector('span').textContent = it.title;
    tr.children[2].textContent = r.coll.title;
    const [up, dn, rm] = tr.querySelectorAll('button');
    up.onclick = ev => { ev.stopPropagation(); moveAt(n, -1); };
    dn.onclick = ev => { ev.stopPropagation(); moveAt(n, 1); };
    rm.onclick = ev => { ev.stopPropagation(); removeAt(n); };
    tr.onclick = () => listPlay(n);
    if (P.lpos === n) tr.classList.add('sel');
    rows.appendChild(tr);
  });
  if (!PL.entries.length) rows.innerHTML = '<tr><td colspan="5" class="empty">Empty. Press + next to any loop in the Work window to add it here.</td></tr>';
  $('listCount').textContent = `${PL.entries.length} item(s) · ${fmt(total)}`;
  $('listMsg').textContent = listMsg;
  $('listReps').value = String(PL.reps);
  $('listPlay').disabled = $('listShare').disabled = $('listClear').disabled = !PL.entries.length;
}
$('listPlay').onclick = () => listPlay(0);
$('listClear').onclick = () => { PL.entries = []; P.lpos = null; saveList(); listMsg = ''; renderList(); ui(); };
$('listReps').onchange = e => { PL.reps = +e.target.value; saveList(); renderList(); };
$('listShare').onclick = async () => {
  const url = shareLink();
  try { await navigator.clipboard.writeText(url); listMsg = 'Link copied'; } catch (e) { prompt('Copy this link:', url); listMsg = ''; }
  renderList();
};

/* ---------------- collage ---------------- */
// Up to four sounds layered at once. Each loops on its own clock, so layers drift in and out of phase.
// Per layer: source -> gain -> pan -> collage bus -> output (and the analyser, for the picture).
const MAX_LAYERS = 4;
let CL = { layers: [] }; // layers: {u, c: collection id, i: item id, vol, pan, semi, mute}
try { const v = JSON.parse(localStorage.getItem('collage')); if (v && Array.isArray(v.layers)) CL = v; } catch (e) {}
CL.layers = CL.layers.filter(resolve).slice(0, MAX_LAYERS);
const saveCollage = () => { try { localStorage.setItem('collage', JSON.stringify(CL)); } catch (e) {} };
const C = { playing: false, bus: null, nodes: new Map(), gen: 0 };
let collMsg = '';
const layerBuf = L => { const r = resolve(L); return getBuf(r.coll.items[r.idx], r.coll); };

function layerGraph(ac, out, L, buf, when) {
  const src = ac.createBufferSource();
  src.buffer = buf; src.loop = true;
  src.playbackRate.value = Math.pow(2, L.semi / 12);
  const g = ac.createGain(); g.gain.value = L.mute ? 0 : L.vol;
  const p = ac.createStereoPanner(); p.pan.value = L.pan;
  src.connect(g); g.connect(p); p.connect(out);
  src.start(when);
  return { src, g, p };
}
async function collagePlay() {
  if (!CL.layers.length) return;
  const ac = ctx(); ac.resume();
  stop(); P.lpos = null; // one thing at a time: the collage takes over from the player
  collageStop();
  const g = ++C.gen;
  collMsg = 'Loading…'; renderCollage();
  let bufs;
  try { bufs = await Promise.all(CL.layers.map(layerBuf)); }
  catch (e) { if (g === C.gen) { collMsg = 'Could not load a sound'; renderCollage(); } return; }
  if (g !== C.gen) return;
  C.bus = ac.createGain(); C.bus.connect(ac.destination); C.bus.connect(P.an);
  const t0 = ac.currentTime + .05; // all layers start together
  CL.layers.forEach((L, n) => C.nodes.set(L.u, layerGraph(ac, C.bus, L, bufs[n], t0)));
  C.playing = true; collMsg = '';
  if (moshPref) Cloud.mosh(3000);
  renderCollage();
}
function collageStop() {
  C.gen++;
  C.nodes.forEach(n => { try { n.src.stop(); } catch (e) {} });
  C.nodes.clear();
  if (C.bus) { C.bus.disconnect(); C.bus = null; }
  if (C.playing) { C.playing = false; renderCollage(); }
}
async function addLayer(coll, idx) {
  openWin('w-coll');
  if (CL.layers.length >= MAX_LAYERS) { collMsg = `Full: remove a layer first (${MAX_LAYERS} max)`; renderCollage(); return; }
  const L = { u: (uid++).toString(36), c: coll.id, i: coll.items[idx].id, vol: .8, pan: 0, semi: 0, mute: false };
  CL.layers.push(L); saveCollage();
  collMsg = `Added ${coll.items[idx].title}`;
  renderCollage();
  if (C.playing) { // join the running collage straight away
    const g = C.gen, buf = await layerBuf(L);
    if (C.playing && g === C.gen && CL.layers.includes(L)) C.nodes.set(L.u, layerGraph(P.ac, C.bus, L, buf, P.ac.currentTime));
  }
}
function removeLayer(u) {
  const n = C.nodes.get(u);
  if (n) { try { n.src.stop(); } catch (e) {} C.nodes.delete(u); }
  CL.layers = CL.layers.filter(L => L.u !== u); saveCollage(); collMsg = '';
  if (!CL.layers.length) collageStop();
  renderCollage();
}
function setLayer(L, k, v) {
  L[k] = v; saveCollage();
  const n = C.nodes.get(L.u); if (!n) return;
  const t = P.ac.currentTime; // short glides, so moving a control never clicks
  if (k === 'vol' || k === 'mute') n.g.gain.setTargetAtTime(L.mute ? 0 : L.vol, t, .02);
  if (k === 'pan') n.p.pan.setTargetAtTime(L.pan, t, .02);
  if (k === 'semi') n.src.playbackRate.setTargetAtTime(Math.pow(2, L.semi / 12), t, .02);
}
// Bounce: render the collage offline to a 24-bit / 48 kHz WAV the visitor can keep.
function wav24(b) {
  const ch = [b.getChannelData(0), b.getChannelData(1)], n = b.length;
  let peak = 0;
  for (const c of ch) for (let k = 0; k < n; k++) { const a = Math.abs(c[k]); if (a > peak) peak = a; }
  const g = peak > .999 ? .999 / peak : 1; // never clips: the whole bounce is turned down instead
  const bytes = n * 6, v = new DataView(new ArrayBuffer(44 + bytes));
  const str = (o, t) => { for (let k = 0; k < t.length; k++) v.setUint8(o + k, t.charCodeAt(k)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, b.sampleRate, true);
  v.setUint32(28, b.sampleRate * 6, true); v.setUint16(32, 6, true); v.setUint16(34, 24, true);
  str(36, 'data'); v.setUint32(40, bytes, true);
  let o = 44;
  for (let k = 0; k < n; k++) for (const c of ch) {
    const x = Math.round(Math.max(-1, Math.min(1, c[k] * g)) * 8388607);
    v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255); o += 3;
  }
  return new Blob([v], { type: 'audio/wav' });
}
async function collageBounce(seconds = 30) {
  if (!CL.layers.length) return;
  collMsg = 'Bouncing…'; renderCollage();
  try {
    const bufs = await Promise.all(CL.layers.map(layerBuf));
    const sr = 48000, off = new OfflineAudioContext(2, sr * seconds, sr);
    CL.layers.forEach((L, n) => layerGraph(off, off.destination, L, bufs[n], 0));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(wav24(await off.startRendering()));
    a.download = 'Shilo Preshyon - collage.wav';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    collMsg = `Saved ${seconds} s as WAV`;
  } catch (e) { collMsg = 'Bounce failed'; }
  renderCollage();
}
function renderCollage() {
  const rows = $('collRows'); rows.innerHTML = '';
  CL.layers.forEach((L, n) => {
    const r = resolve(L), it = r.coll.items[r.idx];
    const tr = document.createElement('tr');
    const semis = Array.from({ length: 25 }, (_, k) => k - 12).map(s => `<option value="${s}">${s > 0 ? '+' : ''}${s}</option>`).join('');
    tr.innerHTML = `<td class="num">${n + 1}</td><td class="name">${ICO.wav}<span></span></td>` +
      `<td><input type="range" min="0" max="1" step="0.01" aria-label="Volume"></td>` +
      `<td><input type="range" min="-1" max="1" step="0.05" aria-label="Pan"></td>` +
      `<td><select aria-label="Pitch in semitones">${semis}</select></td>` +
      `<td class="ctl"><button class="mini" title="Mute">M</button><button class="mini" title="Remove">✕</button></td>`;
    tr.querySelector('span').textContent = it.title;
    const [vol, pan] = tr.querySelectorAll('input'), semi = tr.querySelector('select'), [mute, rm] = tr.querySelectorAll('button');
    vol.value = L.vol; pan.value = L.pan; semi.value = String(L.semi);
    vol.oninput = () => setLayer(L, 'vol', +vol.value);
    pan.oninput = () => setLayer(L, 'pan', +pan.value);
    pan.ondblclick = () => { pan.value = 0; setLayer(L, 'pan', 0); };
    semi.onchange = () => setLayer(L, 'semi', +semi.value);
    mute.classList.toggle('on', L.mute);
    mute.onclick = () => { setLayer(L, 'mute', !L.mute); mute.classList.toggle('on', L.mute); };
    rm.onclick = () => removeLayer(L.u);
    rows.appendChild(tr);
  });
  if (!CL.layers.length) rows.innerHTML = `<tr><td colspan="6" class="empty">Empty. Press ⧉ next to any sound in the Work window to layer it here. Up to ${MAX_LAYERS} play at once, each looping on its own clock.</td></tr>`;
  $('collCount').textContent = `${CL.layers.length} of ${MAX_LAYERS} layers`;
  $('collMsg').textContent = collMsg || (C.playing ? 'Playing: layers drift in and out of phase' : '');
  $('collPlay').disabled = !CL.layers.length || C.playing;
  $('collStop').disabled = !C.playing;
  $('collShare').disabled = $('collBounce').disabled = $('collClear').disabled = !CL.layers.length;
  ui();
}
$('collPlay').onclick = collagePlay;
$('collStop').onclick = collageStop;
$('collBounce').onclick = () => collageBounce(30);
$('collClear').onclick = () => { collageStop(); CL.layers = []; saveCollage(); collMsg = ''; renderCollage(); };
$('collShare').onclick = async () => {
  const url = `${location.origin}${location.pathname}#/collage/` + CL.layers.map(L => [L.c, L.i, L.vol, L.pan, L.semi, L.mute ? 1 : 0].join('~')).join(',');
  try { await navigator.clipboard.writeText(url); collMsg = 'Link copied'; } catch (e) { prompt('Copy this link:', url); collMsg = ''; }
  renderCollage();
};

/* ---------------- windows ---------------- */
let zTop = 10;
function focusWin(w) {
  document.querySelectorAll('.win').forEach(x => x.classList.toggle('inactive', x !== w));
  w.style.zIndex = ++zTop;
  renderTasks();
}
function openWin(id) {
  const w = $(id);
  const was = w.classList.contains('hide');
  w.classList.remove('hide');
  focusWin(w);
  if (was && narrow()) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return w;
}
function placeWindows() {
  if (narrow()) return;
  const W = innerWidth, H = innerHeight;
  const set = (id, l, t, w) => Object.assign($(id).style, { left: l + 'px', top: t + 'px', width: w + 'px' });
  const dw = Math.min(580, W - 140);
  set('w-dir', 112, 28, dw);
  const pw = Math.min(460, W - 140);
  set('w-play', 160, Math.max(140, Math.min(400, H - 30 - 310)), pw); // under the Work folder, clear of the Readme
  const rw = Math.min(460, W - 140);
  set('w-about', Math.max(150, W - rw - 24), 28, rw);
  set('w-mail', 190, 130, 320);
  set('w-doc', 140, 14, Math.min(720, W - 160));
  const lw = Math.min(440, W - 140);
  set('w-list', Math.max(112, W - lw - 24), 28, lw);
  set('w-coll', 140, 60, Math.min(620, W - 160));
}
document.querySelectorAll('.win').forEach(w => {
  w.addEventListener('pointerdown', () => focusWin(w));
  w.querySelectorAll('[data-close]').forEach(b => b.onclick = e => {
    e.stopPropagation(); w.classList.add('hide'); renderTasks();
    if (w.id === 'w-play') stop();
  });
  const tb = w.querySelector('.tb');
  tb.addEventListener('pointerdown', e => {
    if (e.target.tagName === 'BUTTON' || narrow()) return;
    const ox = e.clientX - w.offsetLeft, oy = e.clientY - w.offsetTop;
    tb.setPointerCapture(e.pointerId);
    const mv = ev => {
      w.style.left = Math.max(60 - w.offsetWidth, Math.min(innerWidth - 60, ev.clientX - ox)) + 'px';
      w.style.top = Math.max(0, Math.min(innerHeight - 60, ev.clientY - oy)) + 'px';
    };
    const up = () => { tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); };
    tb.addEventListener('pointermove', mv); tb.addEventListener('pointerup', up);
  });
});
function renderTasks() {
  const el = $('tasks'); el.innerHTML = '';
  document.querySelectorAll('.win:not(.hide)').forEach(w => {
    const b = document.createElement('button');
    b.className = 'btn98 task' + (w.classList.contains('inactive') ? '' : ' on');
    b.textContent = w.dataset.title; b.onclick = () => focusWin(w);
    el.appendChild(b);
  });
}

/* ---------------- explorer ---------------- */
let dirPath = null; // null = Work root, else a collection id
function openDir(id) {
  dirPath = id && findColl(id) ? id : null;
  openWin('w-dir');
  renderDir();
  if (!P.coll || !dirPath || P.coll.id !== dirPath) setHash(dirPath ? `#/work/${dirPath}` : '#/work');
}
function row(icon, cells, onClick, sel, onAdd, onLayer) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="name">${ICO[icon]}<span></span></td>` + cells.slice(1).map(() => '<td></td>').join('');
  tr.querySelector('span').textContent = cells[0];
  cells.slice(1).forEach((c, i) => tr.children[i + 1].textContent = c);
  tr.onclick = onClick;
  if (sel) tr.classList.add('sel');
  const add = document.createElement('td');
  add.className = 'add';
  if (onAdd) {
    const b = document.createElement('button');
    b.className = 'mini'; b.textContent = '+'; b.title = 'Add to playlist';
    b.onclick = e => { e.stopPropagation(); onAdd(); };
    add.appendChild(b);
  }
  if (onLayer) {
    const b = document.createElement('button');
    b.className = 'mini'; b.textContent = '⧉'; b.title = 'Add to collage';
    b.onclick = e => { e.stopPropagation(); onLayer(); };
    add.appendChild(b);
  }
  tr.appendChild(add);
  return tr;
}
function renderDir() {
  const rows = $('dirRows'); rows.innerHTML = '';
  const c = dirPath && findColl(dirPath);
  $('dirUp').disabled = !c;
  if (!c) {
    $('dirTitle').textContent = 'The Beautiful Research Directory — Work';
    $('dirAddr').textContent = 'C:\\Work';
    $('dirHead').innerHTML = '<th>Name</th><th>Items</th><th>Year</th><th>Type</th><th></th>';
    S.collections.forEach(k => rows.appendChild(row('folder', [`${k.title} — ${k.sub}`, k.items.length, k.year, 'File folder'], () => openDir(k.id))));
    $('dirCount').textContent = `${S.collections.length} object(s)`;
    $('dirNote').textContent = S.name;
    return;
  }
  $('dirTitle').textContent = `${c.title} — ${c.sub}`;
  $('dirAddr').textContent = `C:\\Work\\${c.title} — ${c.sub}`;
  const studio = c.kind === 'studio';
  const addTh = '<th title="+ add to playlist · ⧉ add to collage">+ ⧉</th>';
  $('dirHead').innerHTML = studio ? `<th>Name</th><th>Artist</th><th>Role</th><th>Year</th><th>Length</th>${addTh}`
    : `<th>Name</th><th>Date</th><th>Length</th><th>Type</th>${addTh}`;
  c.items.forEach((it, i) => rows.appendChild(row('wav', studio ? [it.title, it.artist, it.role, it.year, fmt(it.len)] : [it.title, it.date, fmt(it.len), 'FLAC audio'], () => {
    openWin('w-play'); select(c, i);
  }, P.coll === c && P.idx === i, () => addToList(c, i), () => addLayer(c, i))));
  rows.appendChild(row('moon', [`${c.title} — Night Water`, '', '', ...(studio ? ['', ''] : ['Portal'])], () => openPortal(c)));
  $('dirCount').textContent = `${c.items.length + 1} object(s)`;
  $('dirNote').textContent = c.note;
}
$('dirUp').onclick = () => openDir(null);

/* ---------------- desktop, start menu ---------------- */
const latest = S.collections[0];
const launch = {
  work: () => openDir(dirPath ?? latest.id),
  about: () => { openWin('w-about'); setHash('#/readme'); },
  contact: () => { openWin('w-mail'); setHash('#/contact'); },
  portal: () => openPortal(P.coll || latest),
  playlist: () => { openWin('w-list'); renderList(); setHash('#/playlist'); },
  collage: () => { openWin('w-coll'); renderCollage(); setHash('#/collage'); },
  cv: () => openDoc('cv'),
  bio: () => openDoc('bio'),
};
const icons = [['Work', 'cd', 'work'], ['Readme.txt', 'doc', 'about'], ['CV.pdf', 'pdf', 'cv'], ['Bio.pdf', 'pdf', 'bio'],
  ['Playlist', 'list', 'playlist'], ['Collage', 'layers', 'collage'],
  ['Contact', 'mail', 'contact'], ['Night Water', 'moon', 'portal']];
icons.forEach(([n, ic, k]) => {
  const d = document.createElement('button');
  d.className = 'icon'; d.innerHTML = ICO[ic] + '<span></span>'; d.querySelector('span').textContent = n;
  d.onclick = () => { document.querySelectorAll('.icon').forEach(x => x.classList.toggle('sel', x === d)); launch[k](); };
  $('icons').appendChild(d);
  const m = document.createElement('button');
  m.innerHTML = ICO[ic] + '<span></span>'; m.querySelector('span').textContent = n;
  m.onclick = () => { $('startMenu').classList.add('hide'); $('bStart').classList.remove('on'); launch[k](); };
  $('smItems').appendChild(m);
});
$('bStart').onclick = e => { e.stopPropagation(); $('bStart').classList.toggle('on', $('startMenu').classList.toggle('hide') === false); };
document.addEventListener('pointerdown', e => {
  if (!$('startMenu').contains(e.target) && e.target !== $('bStart')) { $('startMenu').classList.add('hide'); $('bStart').classList.remove('on'); }
});
$('aboutTxt').textContent = S.readme.replace('{email}', S.email);
$('mailLink').href = 'mailto:' + S.email; $('mailLink').textContent = S.email;
document.querySelector('[data-ico=mail]').innerHTML = ICO.mail;

/* ---------------- document viewer ---------------- */
// CV and bio open in a window (the same page the PDF is made from, scaled to fit), with the PDF one click away.
let docOpen = null;
function openDoc(k) {
  const d = S.docs[k];
  if (docOpen !== k) {
    $('docFrame').src = `${d.page}#embed`;
    $('docTitle').textContent = `${d.title} — Viewer`;
    $('w-doc').dataset.title = d.title;
    $('docOpen').href = d.pdf;
    $('docDl').href = d.pdf;
    $('docDl').setAttribute('download', d.pdf.split('/').pop());
    $('docName').textContent = d.title;
    $('docPages').textContent = `${d.pages} page${d.pages > 1 ? 's' : ''}`;
    docOpen = k;
  }
  openWin('w-doc');
  setHash(`#/${k}`);
}

/* ---------------- player window ---------------- */
$('bPlay').onclick = toggle; $('bStop').onclick = stop;
$('bPrev').onclick = () => step(-1); $('bNext').onclick = () => step(1);
$('cLoop').onchange = e => setLoop(e.target.checked);
$('cMosh').checked = moshPref;
$('cMosh').onchange = e => { moshPref = e.target.checked; try { localStorage.setItem('mosh', moshPref ? '1' : '0'); } catch (x) {} };
$('prog').onclick = e => { const r = $('prog').getBoundingClientRect(); seek((e.clientX - r.left) / r.width); };

function ui() {
  const it = P.coll && P.coll.items[P.idx];
  const inList = P.lpos !== null ? ` (playlist ${P.lpos + 1}/${PL.entries.length})` : '';
  $('playTitle').textContent = it ? `Now Playing — ${it.title}${inList}` : 'Now Playing';
  $('screenLbl').textContent = C.playing ? `COLLAGE ▸ ${C.nodes.size} LAYER${C.nodes.size === 1 ? '' : 'S'}` : !it ? 'NO SIGNAL' : P.error ? 'READ ERROR' : P.loading ? `LOADING ▸ ${it.title.toUpperCase()}` :
    `CH1 ▸ ${it.title.toUpperCase()}${P.playing ? '' : '  ❚❚'}`;
  $('bPlay').textContent = P.playing ? '❚❚' : '▶';
  $('cLoop').checked = P.loop;
  document.querySelectorAll('#listRows tr').forEach((r, n) => r.classList.toggle('sel', P.lpos === n));
  if (dirPath) document.querySelectorAll('#dirRows tr').forEach((r, i) => r.classList.toggle('sel', !!P.coll && P.coll.id === dirPath && P.idx === i));
  document.querySelectorAll('#pList button').forEach((b, i) => b.classList.toggle('on', !!P.coll && P.coll === portalColl && P.idx === i));
}

/* ---------------- Night Water portal ---------------- */
let portalColl = null;
function openPortal(c) {
  portalColl = c;
  $('pName').textContent = c.title.toUpperCase();
  $('pSub').textContent = `${S.name.toLowerCase()} · ${c.sub}`;
  const l = $('pList'); l.innerHTML = '';
  c.items.forEach((it, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><span></span>`;
    b.querySelector('span').textContent = it.title.replace(/ 2026/, '');
    b.onclick = () => (P.coll === c && P.idx === i) ? toggle() : select(c, i);
    l.appendChild(b);
  });
  $('portal').classList.remove('hide');
  setHash(`#/portal/${c.id}`);
  ui();
}
function closePortal() { $('portal').classList.add('hide'); portalColl = null; setHash(dirPath ? `#/work/${dirPath}` : '#/'); }
$('pClose').onclick = closePortal;
addEventListener('keydown', e => {
  if (e.key === 'Escape' && portalColl) closePortal();
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey;
  if (typing) return;
  // Space always means play/pause; blur a focused button first so it isn't also clicked on key-up.
  if (e.key === ' ') { e.preventDefault(); if (/^(BUTTON|A)$/.test(e.target.tagName)) e.target.blur(); toggle(); }
  // Arrow keys surf: up/down play the previous/next file (stopping at the ends), left/right move within it.
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); surf(e.key === 'ArrowDown' ? 1 : -1); }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && P.buffer) {
    e.preventDefault();
    const d = P.buffer.duration;
    seek(Math.max(0, Math.min(.999, pos() / d + (e.key === 'ArrowRight' ? .1 : -.1))));
  }
});
function surf(d) {
  if (P.lpos !== null) { const n = P.lpos + d; if (n >= 0 && n < PL.entries.length) listPlay(n); return; }
  const c = P.coll || (dirPath && findColl(dirPath)) || latest;
  const n = P.coll ? P.idx + d : (d > 0 ? 0 : c.items.length - 1);
  if (n < 0 || n >= c.items.length) return;
  if (!portalColl) openWin('w-play');
  select(c, n);
  // keep the playing row in view in the Work window
  if (dirPath === c.id) { const r = document.querySelectorAll('#dirRows tr')[n]; if (r) r.scrollIntoView({ block: 'nearest' }); }
}

/* ---------------- routing ---------------- */
// Every window has an address, so a client can be sent straight to one loop: #/work/<collection>/<item>
let routing = false;
function setHash(h) { if (!routing && location.hash !== h) history.replaceState(null, '', h); }
function route() {
  routing = true;
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (p[0] === 'readme' || p[0] === 'about') launch.about();
  else if (p[0] === 'contact') launch.contact();
  else if (S.docs[p[0]]) openDoc(p[0]);
  else if (p[0] === 'collage') {
    if (p[1]) {
      const layers = p[1].split(',').map(x => {
        const [c, i, vol, pan, semi, mute] = decodeURIComponent(x).split('~');
        const n = (v, lo, hi, d) => Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d;
        return { u: (uid++).toString(36), c, i, vol: n(vol, 0, 1, .8), pan: n(pan, -1, 1, 0), semi: Math.round(n(semi, -12, 12, 0)), mute: mute === '1' };
      }).filter(resolve).slice(0, MAX_LAYERS);
      if (layers.length) { collageStop(); CL = { layers }; saveCollage(); collMsg = 'Shared collage loaded: press Play'; }
    }
    launch.collage();
  }
  else if (p[0] === 'playlist') {
    // a shared playlist replaces this visitor's own (theirs is a click away from being rebuilt anyway)
    if (p[2]) {
      const entries = p[2].split(',').map(x => { const [c, i] = decodeURIComponent(x).split('~'); return { u: (uid++).toString(36), c, i }; }).filter(resolve);
      if (entries.length) { PL = { entries, reps: Math.max(1, Math.min(16, +p[1] || 2)) }; saveList(); listMsg = 'Shared playlist loaded'; }
    }
    launch.playlist();
  }
  else if (p[0] === 'portal' && findColl(p[1])) openPortal(findColl(p[1]));
  else if (p[0] === 'work') {
    openDir(p[1] || null);
    const c = findColl(p[1]), i = c ? c.items.findIndex(x => x.id === p[2]) : -1;
    if (i >= 0) { openWin('w-play'); select(c, i, false); } // browsers block sound until a click
  }
  routing = false;
}

/* ---------------- frame loop ---------------- */
const wall = $('wall'), screen = $('screen'), pcv = $('pcv');
function frame(now) {
  const t = now / 1000;
  Cloud.feed(P.playing || C.playing ? P.an : null);
  if (!portalColl) {
    Cloud.draw(wall, t * .6, { bg: '#05070a', mode: 'turbo', alpha: .8, cy: .62, zoom: 1.05, tilt: .5, spectral: .4 });
    Cloud.draw(screen, t, { bg: '#000', mode: 'turbo', mosh: true, cy: .64, zoom: 1.15, tilt: .5, size: .9, spectral: 1, sway: .3 });
  } else {
    Cloud.draw(pcv, t, { bg: '#050608', ink: '#dbe8f0', mosh: true, cy: .5, zoom: 1, tilt: .42, spectral: 1 });
    const it = P.coll && P.coll.items[P.idx];
    $('pReadout').textContent = (it ? `${P.playing ? '▶' : '❚❚'} ${it.title}   ${fmt(pos())} / ${fmt(P.buffer ? P.buffer.duration : it.len)}` : 'select a loop ↓') +
      `\nSR ${P.ac ? P.ac.sampleRate : 48000}   BIT 24   FLAC   ${P.loop ? 'LOOP' : 'ONCE'}   ${Cloud.moshing ? 'MOSH ▓▓▓' : 'MOSH ---'}`;
  }
  const d = P.buffer ? P.buffer.duration : 0, p = pos();
  $('progBar').style.width = d ? (p / d * 100) + '%' : '0';
  $('time').textContent = `${fmt(p)} / ${fmt(d || (P.coll ? P.coll.items[P.idx].len : 0))}`;
  requestAnimationFrame(frame);
}
const tick = () => { const n = new Date(); $('clock').textContent = n.getHours() + ':' + String(n.getMinutes()).padStart(2, '0'); };

placeWindows();
addEventListener('resize', placeWindows);
openWin('w-play');
// First visit: the Readme opens beside the Work folder.
let seen = true;
try { seen = !!localStorage.getItem('seen'); localStorage.setItem('seen', '1'); } catch (e) {}
if (location.hash.length > 2) route();
else { if (!seen) openWin('w-about'); openDir(latest.id); }
addEventListener('hashchange', route);
renderList(); renderCollage(); ui(); tick(); setInterval(tick, 10000);
requestAnimationFrame(frame);
