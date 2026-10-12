// Shared setup for the printable documents.
// URL hash flags: "pdf" drops the on-screen page gaps (used by tools/make-pdfs),
// "amounts" adds grant dollar amounts to the CV,
// "full" swaps in the application contact details from contact-private.js, which is gitignored
// so the phone number never ships with the site.
const FLAGS = location.hash.slice(1).split(',');
if (FLAGS.includes('pdf')) document.documentElement.classList.add('pdf');
if (FLAGS.includes('embed')) document.documentElement.classList.add('embed');
const CONTACT = FLAGS.includes('full') && window.PRIVATE_CONTACT ? window.PRIVATE_CONTACT : 'spsounddirectory@proton.me';

const FOLDER = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 3.5h5l1.5 2H15v8H1z" fill="#e6e6e6" stroke="#000"/><path d="M1 6.5h14" stroke="#000"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function finish(docName) {
  document.querySelectorAll('[data-contact]').forEach(e => e.textContent = CONTACT);
  const pages = [...document.querySelectorAll('.page')];
  pages.forEach((p, i) => {
    const st = document.createElement('div');
    st.className = 'status';
    st.innerHTML = `<div>Shilo Preshyon — ${esc(docName)}</div><div>2026</div><div>Page ${i + 1} of ${pages.length}</div>`;
    p.appendChild(st);
  });
  await document.fonts.ready;
  // Bands are drawn at a fixed 3 px per CSS px so they print sharp.
  document.querySelectorAll('.band canvas').forEach((cv, i) => {
    cv.width = cv.clientWidth * 3; cv.height = cv.clientHeight * 3;
    const thin = cv.parentElement.classList.contains('thin');
    for (let k = 0; k < 40; k++) Cloud.feed(null);
    Cloud.draw(cv, 37 + i * 11, { px: 3, bg: '#05070a', mode: 'turbo', alpha: .95, cy: thin ? .75 : .62,
      zoom: thin ? 1.6 : 1.12, tilt: thin ? .2 : .5, size: .85, sway: .5 });
  });
  // Flag any page whose content doesn't fit, so overflow is never silently clipped.
  pages.forEach(p => { const f = p.querySelector('.flow'); if (f && f.scrollHeight > f.clientHeight + 1) p.classList.add('overflow'); });
  // In the site's viewer window, scale whole pages down to the window's width.
  if (FLAGS.includes('embed')) {
    const fitPages = () => { const z = Math.min(1, (innerWidth - 16) / 816); pages.forEach(p => p.style.zoom = z); };
    fitPages(); addEventListener('resize', fitPages);
  }
  document.body.dataset.ready = pages.filter(p => p.classList.contains('overflow')).length ? 'overflow' : 'ok';
}
