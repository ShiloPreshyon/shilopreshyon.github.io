// Point-cloud terrain shared by the wallpaper, the Now Playing screen and the Night Water portal.
// With audio playing, each row is one spectrum frame (lows on the left), so the terrain flows away
// from the viewer like a scan; without audio it falls back to a slow procedural swell.
const Cloud = (() => {
  const NX = 128, NZ = 44, N = NX * NZ;
  const JX = new Float32Array(N), JZ = new Float32Array(N), JY = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    JX[k] = (Math.random() - .5) * .018;
    JZ[k] = (Math.random() - .5) * .032;
    JY[k] = (Math.random() - .5) * .01;
  }
  const hist = new Float32Array(N); // row 0 = newest spectrum
  let bins = null, fbuf = null, moshUntil = 0;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function turbo(v) {
    const r = 34.61 + v * (1172.33 - v * (10793.56 - v * (33300.12 - v * (38394.49 - v * 14825.05))));
    const g = 23.31 + v * (557.33 + v * (1225.33 - v * (3574.96 - v * (1073.77 + v * 707.56))));
    const b = 27.2 + v * (3211.1 - v * (15327.97 - v * (27814 - v * (22569.18 - v * 6838.66))));
    const c = x => Math.max(0, Math.min(255, Math.round(x)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }
  const TURBO = Array.from({ length: 48 }, (_, k) => turbo(.1 + .85 * k / 47));

  // Push one spectrum row from an AnalyserNode, or let the history fade when nothing plays.
  function feed(an) {
    if (!an) { for (let k = 0; k < N; k++) hist[k] *= .97; return; }
    if (!bins) {
      const n = an.frequencyBinCount, ny = an.context.sampleRate / 2;
      fbuf = new Uint8Array(n);
      bins = [];
      for (let i = 0; i <= NX; i++) bins.push(Math.min(n - 1, Math.round(30 * Math.pow(16000 / 30, i / NX) / ny * n)));
    }
    an.getByteFrequencyData(fbuf);
    hist.copyWithin(NX, 0, N - NX);
    for (let i = 0; i < NX; i++) {
      let m = 0;
      for (let b = bins[i]; b <= Math.max(bins[i], bins[i + 1] - 1); b++) m = Math.max(m, fbuf[b]);
      hist[i] = Math.pow(m / 255, 1.7);
    }
  }

  function fit(cv) {
    const w = Math.round(cv.clientWidth * DPR), h = Math.round(cv.clientHeight * DPR);
    if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
    return w && h;
  }

  // o: bg, ink | mode:'turbo', alpha, cy, zoom, tilt, size, spectral (0..1), sway, mosh,
  //    px (fixed pixels per CSS px: keeps the canvas size as set, for print)
  function draw(cv, t, o) {
    if (!cv.getClientRects().length || (!o.px && !fit(cv))) return;
    const R = o.px || DPR;
    if (reduced) t *= .2;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const mosh = o.mosh && !reduced && performance.now() < moshUntil;
    ctx.globalAlpha = 1;
    if (mosh) {
      // Datamosh: drag blocks of the last frame along a smooth motion field and only faintly redraw.
      const bs = Math.round(16 * R), n = Math.floor(W * H / (bs * bs) * .05);
      for (let k = 0; k < n; k++) {
        const bx = Math.floor(Math.random() * W / bs) * bs, by = Math.floor(Math.random() * H / bs) * bs;
        const mx = Math.round(Math.sin(by * .004 + t * 1.3) * 7 * R), my = Math.round(Math.cos(bx * .005 + t) * 3 * R);
        ctx.drawImage(cv, bx, by, bs, bs, bx + mx, by + my, bs, bs);
      }
      ctx.globalAlpha = .05; ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H);
    } else { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H); }

    const yaw = Math.sin(t * .09) * (o.sway ?? .45), ca = Math.cos(yaw), sa = Math.sin(yaw);
    const tilt = o.tilt ?? .45, ct = Math.cos(tilt), st = Math.sin(tilt), D = 2.7;
    const F = Math.min(W * 1.15, H * 2.4) * (o.zoom || 1), cy = H * (o.cy || .58);
    const spec = o.spectral || 0, amp = .11 + .04 * Math.sin(t * .4);
    const aS = (o.alpha || 1) * (mosh ? .45 : 1), sz = Math.max(1, 1.1 * R * (o.size || 1));
    const turboMode = o.mode === 'turbo';
    if (!turboMode) ctx.fillStyle = o.ink;
    for (let j = 0; j < NZ; j++) {
      const z0 = (j / (NZ - 1) - .5) * 1.5;
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i, x = (i / (NX - 1) - .5) * 2.3 + JX[k], z = z0 + JZ[k];
        const e = Math.exp(-z * z * 2.6) * (.55 + .45 * Math.exp(-x * x * .8));
        const w = Math.sin(x * 11 + t * 1.6 + z * 4) * Math.sin(x * 3.1 - t * .55) * .55;
        const y = e * amp * w + hist[k] * .62 * spec + JY[k];
        const xr = x * ca - z * sa, zr = x * sa + z * ca;
        const yp = y * ct - zr * st, zp = y * st + zr * ct + D;
        const sx = W / 2 + xr / zp * F, sy = cy - yp / zp * F;
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        const near = 1 - (zp - 1.4) / 2.6;
        ctx.globalAlpha = Math.max(.05, Math.min(1, (.18 + .85 * near) * aS));
        if (turboMode) ctx.fillStyle = TURBO[Math.max(0, Math.min(47, Math.round((y + .08) / .6 * 47)))];
        const s = sz * (2.7 / zp);
        ctx.fillRect(sx, sy, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  return { feed, draw, mosh(ms) { moshUntil = performance.now() + ms; }, get moshing() { return performance.now() < moshUntil; } };
})();
