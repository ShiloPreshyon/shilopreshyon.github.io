// Turns Shilo's website folder into the site's audio library.
//   node tools/sync.mjs             convert what's new or changed, upload it, write library.js
//   node tools/sync.mjs --no-upload convert and write library.js only
// Each section folder in library.json becomes a desktop icon; its subfolders become folders on the site.
// For every audio file:
//   listening copy  FLAC 48 kHz for loop folders (gapless in the browser), else 256k AAC; MP3s are used as they are
//   download copy   (sections with downloads) FLAC at the file's own rate, 24-bit; float files go through tools/prep
//   loudness        BS.1770 via tools/measure, then a playback gain per folder (Level match)
//   upload          to Bunny under versioned names, so the CDN never serves a stale copy; old versions are removed
// Shilo's files are only ever read. Work lives in ~/.cache/listening-water so re-runs only redo what changed.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'library.json'), 'utf8'));
const UPLOAD = !process.argv.includes('--no-upload');
const CACHE = join(homedir(), '.cache/listening-water');
const BIN = join(CACHE, 'bin'), FILES = join(CACHE, 'files'), MANIFEST = join(CACHE, 'manifest.json');
const AUDIO = new Set(['.wav', '.aif', '.aiff', '.flac', '.mp3', '.m4a']);
const LOSSY = new Set(['.mp3', '.m4a']);
const TARGET = -16, CEILING = -1; // Level match: -16 LUFS, never raised past -1 dBTP
for (const d of [BIN, FILES]) mkdirSync(d, { recursive: true });

const slug = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const run = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 1 << 28 }).toString();
const log = (...a) => console.log(...a);

// Swift helpers, built once.
function tool(name) {
  const out = join(BIN, name), src = join(ROOT, 'tools', `${name}.swift`);
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) { log(`building ${name}…`); run('swiftc', ['-O', src, '-o', out]); }
  return out;
}
const PREP = tool('prep'), MEASURE = tool('measure');

function info(file) {
  const t = run('afinfo', [file]);
  return {
    rate: +(/(\d+) Hz/.exec(t) || [])[1],
    float: /Float32|Float64/.test(t),
    len: +(/estimated duration: ([\d.]+)/.exec(t) || [])[1],
  };
}

let manifest = {};
try { manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch (e) {}
const saveManifest = () => writeFileSync(MANIFEST, JSON.stringify(manifest));

// ---- scan the folder ------------------------------------------------------------------------------------
const sections = [];
for (const sec of cfg.sections) {
  const dir = join(cfg.source, sec.folder);
  if (!existsSync(dir)) continue;
  const groups = new Map(); // subfolder ('' = files directly in the section) -> files
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name.startsWith('.')) continue;
    if (statSync(p).isDirectory()) {
      const files = readdirSync(p).filter(f => !f.startsWith('.') && AUDIO.has(extname(f).toLowerCase())).sort(natural);
      if (files.length) groups.set(name, files.map(f => join(p, f)));
    } else if (AUDIO.has(extname(name).toLowerCase())) {
      if (!groups.has('')) groups.set('', []);
      groups.get('').push(p);
    }
  }
  const colls = [...groups].map(([sub, files]) => {
    const key = sub ? `${sec.folder}/${sub}` : sec.folder, o = cfg.folders[key] || {};
    return { key, sub, files: files.sort(natural), o, id: o.id || slug(sub || sec.folder), title: o.title || sub || sec.folder };
  }).sort((a, b) => (a.o.order ?? 1) - (b.o.order ?? 1) || natural(a.title, b.title));
  if (colls.length) sections.push({ sec, colls });
}

// ---- convert ---------------------------------------------------------------------------------------------
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}
const jobs = [];
for (const { sec, colls } of sections) for (const c of colls) for (const f of c.files) jobs.push({ sec, c, f });

function afconvert(args) {
  return new Promise((res, rej) => {
    const p = spawn('afconvert', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => err += d);
    p.on('close', code => code === 0 ? res() : rej(new Error(`afconvert ${args.join(' ')}: ${err}`)));
  });
}

let done = 0;
await pool(jobs, 3, async ({ sec, c, f }) => {
  const rel = f.slice(cfg.source.length + 1), st = statSync(f), sig = `${st.size}-${Math.round(st.mtimeMs)}`;
  const ext = extname(f).toLowerCase(), base = basename(f, extname(f));
  const id = slug(base), v = createHash('sha1').update(rel + sig).digest('hex').slice(0, 8);
  const work = join(FILES, c.id, v); mkdirSync(work, { recursive: true });
  const m = manifest[rel] && manifest[rel].sig === sig ? manifest[rel] : { sig, v, uploaded: {} };
  const old = manifest[rel] && manifest[rel].sig !== sig ? manifest[rel] : null;
  const src = info(f);
  // 24-bit integer source for lossless copies (float files are turned down only if they'd clip)
  let lossless = f, prep = null;
  if (src.float && !LOSSY.has(ext)) {
    lossless = join(work, 'prep.wav');
    if (!existsSync(lossless)) prep = JSON.parse(run(PREP, [f, lossless]));
    else prep = m.prep || null;
  }
  // listening copy
  let lext;
  if (LOSSY.has(ext)) { lext = ext.slice(1); const out = join(work, `listen.${lext}`); if (!existsSync(out)) copyFileSync(f, out); }
  else if (c.o.listen === 'flac') {
    lext = 'flac'; const out = join(work, 'listen.flac');
    if (!existsSync(out)) await afconvert(['-f', 'flac', '-d', src.rate === 48000 ? 'flac' : 'flac@48000', '--src-complexity', 'bats', '-r', '127', lossless, out]);
  } else {
    lext = 'm4a'; const out = join(work, 'listen.m4a');
    if (!existsSync(out)) await afconvert(['-f', 'm4af', '-d', 'aac@48000', '-b', '256000', '-q', '127', '-s', '0', '--src-complexity', 'bats', '-r', '127', lossless, out]);
  }
  // download copy
  let dl = null;
  if (sec.downloads && !LOSSY.has(ext)) {
    const out = join(work, `${base}.flac`);
    if (!existsSync(out)) await afconvert(['-f', 'flac', '-d', 'flac', lossless, out]);
    dl = { name: `${base}.flac`, size: statSync(out).size, rate: src.rate };
  }
  // loudness of what visitors hear
  const lpath = join(work, `listen.${lext}`);
  const blocksFile = join(work, 'blocks.json');
  if (!existsSync(blocksFile)) writeFileSync(blocksFile, run(MEASURE, [lpath]));
  const meas = JSON.parse(readFileSync(blocksFile, 'utf8'));
  Object.assign(m, { rel, sec: sec.id, coll: c.id, id, base, lext, len: src.len, rate: src.rate, dl, prep, lufs: meas.lufs, tp: meas.tp, work, old });
  manifest[rel] = m;
  done++;
  log(`[${done}/${jobs.length}] ${rel}${prep && prep.gain ? `  (float peak ${prep.peak} dBFS: turned down ${prep.gain} dB)` : ''}`);
  saveManifest();
});

// ---- level match: one gain per folder (per track for studio folders) ---------------------------------------
const lufs = z => -0.691 + 10 * Math.log10(z);
function gated(blocks) {
  const abs = blocks.filter(z => z > 0 && lufs(z) > -70);
  if (!abs.length) return -Infinity;
  const rel = lufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const kept = abs.filter(z => lufs(z) > rel);
  return lufs(kept.reduce((a, b) => a + b, 0) / kept.length);
}
const gains = {};
for (const { sec, colls } of sections) for (const c of colls) {
  const ms = c.files.map(f => manifest[f.slice(cfg.source.length + 1)]);
  const studio = (c.o.kind || sec.kind) === 'studio';
  for (const g of studio ? ms.map(m => [m]) : [ms]) {
    const L = gated(g.flatMap(m => JSON.parse(readFileSync(join(m.work, 'blocks.json'), 'utf8')).blocks));
    const tp = Math.max(...g.map(m => m.tp));
    let gain = TARGET - L;
    if (gain > 0) gain = Math.max(0, Math.min(gain, CEILING - tp));
    gain = Math.round(gain * 10) / 10 || 0;
    for (const m of g) gains[m.rel] = gain;
  }
}

// ---- upload --------------------------------------------------------------------------------------------
const TYPES = { flac: 'audio/flac', m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' };
const enc = p => p.split('/').map(encodeURIComponent).join('/');
const listenPath = m => `listen/${m.coll}/${m.id}.${m.v}.${m.lext}`;
const dlPath = m => `download/${m.v}/${enc(m.rel.replace(/\.[^.]+$/, '.flac'))}`;
if (UPLOAD) {
  const key = readFileSync(cfg.storage.keyFile.replace(/^~/, homedir()), 'utf8').trim();
  const base = `https://${cfg.storage.host}/${cfg.storage.zone}/`;
  const curl = args => new Promise((res, rej) => {
    const p = spawn('curl', ['-sS', '--fail', '--retry', '3', '-H', `AccessKey: ${key}`, ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => err += d);
    p.on('close', code => code === 0 ? res() : rej(new Error(err.trim())));
  });
  const put = (file, path, type) => curl(['-T', file, '-H', `Content-Type: ${type}`, base + path]);
  const del = path => curl(['-X', 'DELETE', base + path]).catch(() => {});
  const todo = Object.values(manifest).filter(m => jobs.some(j => j.f.slice(cfg.source.length + 1) === m.rel));
  let up = 0;
  await pool(todo, 3, async m => {
    if (!m.uploaded.listen) { await put(join(m.work, `listen.${m.lext}`), listenPath(m), TYPES[m.lext]); m.uploaded.listen = true; saveManifest(); }
    if (m.dl && !m.uploaded.dl) { await put(join(m.work, m.dl.name), dlPath(m), TYPES.flac); m.uploaded.dl = true; saveManifest(); }
    if (m.old) { // remove the superseded version
      if (m.old.uploaded?.listen) await del(listenPath(m.old));
      if (m.old.uploaded?.dl) await del(dlPath(m.old));
      delete m.old; saveManifest();
    }
    up++;
    log(`uploaded [${up}/${todo.length}] ${m.rel}`);
  });
}

// ---- write library.js --------------------------------------------------------------------------------------
const lib = {
  cdn: cfg.cdn,
  sections: sections.map(({ sec, colls }) => ({
    id: sec.id, title: sec.folder, icon: sec.icon || 'folder', downloads: !!sec.downloads,
    collections: colls.map(c => ({
      id: c.id, title: c.title, sub: c.o.sub || '', note: c.o.note || '', section: sec.id,
      kind: c.o.kind || sec.kind || (sec.downloads ? 'samples' : 'works'), loop: !!c.o.loop,
      license: sec.license || null, aliases: c.o.aliases || [],
      items: c.files.map(f => {
        const m = manifest[f.slice(cfg.source.length + 1)], o = (c.o.items || {})[m.base] || {};
        return {
          id: m.id, title: o.title || m.base, len: Math.round(m.len * 100) / 100, ext: m.lext, file: listenPath(m),
          stream: m.lext !== 'flac', gain: gains[m.rel], lufs: m.lufs, rate: m.rate,
          dl: m.dl ? { path: dlPath(m), name: m.dl.name, size: m.dl.size, rate: m.dl.rate } : null,
          ...(o.artist && { artist: o.artist }), ...(o.release && { release: o.release }),
          ...(o.role && { role: o.role }), ...(o.year && { year: o.year }), aliases: o.aliases || [],
        };
      }),
    })),
  })),
};
writeFileSync(join(ROOT, 'library.js'), `// Generated by tools/sync.mjs from Shilo's website folder. Don't edit by hand:
// change the folder or library.json, then run: node tools/sync.mjs
window.LIBRARY = ${JSON.stringify(lib, null, 1)};
`);
const n = sections.reduce((a, s) => a + s.colls.reduce((b, c) => b + c.files.length, 0), 0);
log(`library.js: ${sections.length} sections, ${sections.reduce((a, s) => a + s.colls.length, 0)} folders, ${n} sounds`);
