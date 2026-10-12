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
  wav: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M3 1.5h7l3 3v10H3z" fill="#fff" stroke="#000"/><path d="M5 9v1M7 7v5M9 8v3M11 6v6" stroke="#1d3a52"/></svg>',
  moon: '<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="#000" stroke="#7fd0ff"/><path d="M9.5 3.5a4.5 4.5 0 1 0 3 7.5a3.6 3.6 0 1 1-3-7.5z" fill="#dbe8f0"/><path d="M3 13h10" stroke="#7fd0ff" stroke-dasharray="1 1"/></svg>',
};

/* ---------------- player ---------------- */
// Lossless FLAC decoded into an AudioBuffer and played straight to the output:
// no gain stage or processing in the path. The analyser only listens (it isn't upstream of anything).
const P = { ac: null, an: null, cache: new Map(), src: null, buffer: null, coll: null, idx: -1,
  startAt: 0, offset: 0, playing: false, loading: false, error: false, loop: true };
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
    const p = fetch(`audio/${coll.id}/${item.id}.flac`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => ctx().decodeAudioData(a));
    p.catch(() => P.cache.delete(item.id));
    P.cache.set(item.id, p);
  }
  return P.cache.get(item.id);
}
async function select(coll, idx, autoplay = true) {
  const g = ++gen;
  ctx().resume();
  stopSrc();
  Object.assign(P, { coll, idx, offset: 0, playing: false, loading: true, error: false, buffer: null });
  if (moshPref) Cloud.mosh(3000);
  setHash(`#/work/${coll.id}/${coll.items[idx].id}`);
  ui();
  let b;
  try { b = await getBuf(coll.items[idx], coll); } catch (e) { if (g === gen) { P.loading = false; P.error = true; ui(); } return; }
  if (g !== gen) return; // a newer selection superseded this one
  P.loading = false; P.buffer = b;
  if (autoplay) start(0); else ui();
  const nx = coll.items[idx + 1]; if (nx) getBuf(nx, coll); // warm the next one
}
function start(off) {
  const ac = ctx(); ac.resume();
  stopSrc();
  const s = ac.createBufferSource();
  s.buffer = P.buffer; s.loop = P.loop;
  s.connect(ac.destination); s.connect(P.an);
  s.onended = () => {
    if (P.src !== s) return;
    P.src = null; P.playing = false; P.offset = 0;
    if (P.idx + 1 < P.coll.items.length) select(P.coll, P.idx + 1); else ui();
  };
  s.start(0, off);
  P.src = s; P.startAt = ac.currentTime - off; P.playing = true;
  ui();
}
function stopSrc() { if (P.src) { const s = P.src; P.src = null; try { s.stop(); } catch (e) {} } }
function pos() {
  if (!P.buffer) return 0;
  if (!P.playing) return P.offset;
  const p = P.ac.currentTime - P.startAt, d = P.buffer.duration;
  return P.loop ? p % d : Math.min(p, d);
}
function toggle() {
  if (!P.coll) return select(S.collections[0], 0);
  if (P.loading) return;
  if (!P.buffer) return select(P.coll, P.idx);
  if (P.playing) { P.offset = pos(); stopSrc(); P.playing = false; ui(); } else start(P.offset);
}
function stop() { stopSrc(); P.playing = false; P.offset = 0; ui(); }
function step(d) {
  if (!P.coll) return select(S.collections[0], 0);
  const n = P.coll.items.length;
  select(P.coll, (P.idx + d + n) % n);
}
function setLoop(v) {
  if (P.src) { const p = pos(); P.src.loop = v; P.startAt = P.ac.currentTime - p; }
  P.loop = v; ui();
}
function seek(frac) {
  if (!P.buffer) return;
  const off = Math.max(0, Math.min(.999, frac)) * P.buffer.duration;
  if (P.playing) start(off); else { P.offset = off; ui(); }
}

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
  set('w-play', Math.max(112, Math.min(112 + dw - 120, W - pw - 24)), Math.max(140, Math.min(352, H - 30 - 300)), pw);
  set('w-about', 150, 70, Math.min(440, W - 180));
  set('w-mail', 190, 130, 320);
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
function row(icon, cells, onClick, sel) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="name">${ICO[icon]}<span></span></td>` + cells.slice(1).map(() => '<td></td>').join('');
  tr.querySelector('span').textContent = cells[0];
  cells.slice(1).forEach((c, i) => tr.children[i + 1].textContent = c);
  tr.onclick = onClick;
  if (sel) tr.classList.add('sel');
  return tr;
}
function renderDir() {
  const rows = $('dirRows'); rows.innerHTML = '';
  const c = dirPath && findColl(dirPath);
  $('dirUp').disabled = !c;
  if (!c) {
    $('dirTitle').textContent = 'The Beautiful Research Directory — Work';
    $('dirAddr').textContent = 'C:\\Work';
    $('dirHead').innerHTML = '<th>Name</th><th>Items</th><th>Year</th><th>Type</th>';
    S.collections.forEach(k => rows.appendChild(row('folder', [`${k.title} — ${k.sub}`, k.items.length, k.year, 'File folder'], () => openDir(k.id))));
    $('dirCount').textContent = `${S.collections.length} object(s)`;
    $('dirNote').textContent = S.name;
    return;
  }
  $('dirTitle').textContent = `${c.title} — ${c.sub}`;
  $('dirAddr').textContent = `C:\\Work\\${c.title} — ${c.sub}`;
  $('dirHead').innerHTML = '<th>Name</th><th>Date</th><th>Length</th><th>Type</th>';
  c.items.forEach((it, i) => rows.appendChild(row('wav', [it.title, it.date, fmt(it.len), 'FLAC audio'], () => {
    openWin('w-play'); select(c, i);
  }, P.coll === c && P.idx === i)));
  rows.appendChild(row('moon', [`${c.title} — Night Water`, '', '', 'Portal'], () => openPortal(c)));
  $('dirCount').textContent = `${c.items.length + 1} object(s)`;
  $('dirNote').textContent = c.note;
}
$('dirUp').onclick = () => openDir(null);

/* ---------------- desktop, start menu ---------------- */
const latest = S.collections[0];
const launch = {
  work: () => openDir(dirPath ?? latest.id),
  about: () => { openWin('w-about'); setHash('#/about'); },
  contact: () => { openWin('w-mail'); setHash('#/contact'); },
  portal: () => openPortal(P.coll || latest),
  cv: () => open(S.files.cv, '_blank', 'noopener'),
  bio: () => open(S.files.bio, '_blank', 'noopener'),
};
const icons = [['Work', 'cd', 'work'], ['About.txt', 'doc', 'about'], ['CV.pdf', 'pdf', 'cv'], ['Bio.pdf', 'pdf', 'bio'],
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
$('aboutTxt').textContent = `${S.name.toUpperCase()}\n${S.tagline}\n\n${S.about}\n\n— CV.pdf and Bio.pdf are on the desktop.`;
$('mailLink').href = 'mailto:' + S.email; $('mailLink').textContent = S.email;
document.querySelector('[data-ico=mail]').innerHTML = ICO.mail;

/* ---------------- player window ---------------- */
$('bPlay').onclick = toggle; $('bStop').onclick = stop;
$('bPrev').onclick = () => step(-1); $('bNext').onclick = () => step(1);
$('cLoop').onchange = e => setLoop(e.target.checked);
$('cMosh').checked = moshPref;
$('cMosh').onchange = e => { moshPref = e.target.checked; try { localStorage.setItem('mosh', moshPref ? '1' : '0'); } catch (x) {} };
$('prog').onclick = e => { const r = $('prog').getBoundingClientRect(); seek((e.clientX - r.left) / r.width); };

function ui() {
  const it = P.coll && P.coll.items[P.idx];
  $('playTitle').textContent = it ? `Now Playing — ${it.title}` : 'Now Playing';
  $('screenLbl').textContent = !it ? 'NO SIGNAL' : P.error ? 'READ ERROR' : P.loading ? `LOADING ▸ ${it.title.toUpperCase()}` :
    `CH1 ▸ ${it.title.toUpperCase()}${P.playing ? '' : '  ❚❚'}`;
  $('bPlay').textContent = P.playing ? '❚❚' : '▶';
  $('cLoop').checked = P.loop;
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
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); toggle(); }
});

/* ---------------- routing ---------------- */
// Every window has an address, so a client can be sent straight to one loop: #/work/<collection>/<item>
let routing = false;
function setHash(h) { if (!routing && location.hash !== h) history.replaceState(null, '', h); }
function route() {
  routing = true;
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (p[0] === 'about') launch.about();
  else if (p[0] === 'contact') launch.contact();
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
  Cloud.feed(P.playing ? P.an : null);
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
if (location.hash.length > 2) route(); else openDir(latest.id);
addEventListener('hashchange', route);
ui(); tick(); setInterval(tick, 10000);
requestAnimationFrame(frame);
