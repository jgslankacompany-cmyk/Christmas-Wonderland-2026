(() => {
'use strict';
const $ = s => document.querySelector(s), R = Math.random, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const fx = $('#fx'), f = fx.getContext('2d'), tc = $('#tree'), t = tc.getContext('2d');
if (!f || !t) { document.body.classList.remove('intro'); return; }

let W, H, dpr, TW, TH, snowOn = true, boost = 0, mx = 0, finaleSeen = false, lightMode = 0, fwTimer = 0;
const t0 = performance.now() - (reduce ? 9000 : 0);
const mobile = innerWidth < 700;

/* ---------- state ---------- */
const snow = Array.from({ length: mobile ? 150 : 300 }, () => ({ x: R(), y: R(), r: .6 + R() * 2.6, ph: R() * TAU }));
const gold = Array.from({ length: mobile ? 40 : 80 }, () => ({ x: R(), y: R(), r: .6 + R() * 1.8, v: .15 + R() * .4, z: .1 + R() * .5, ph: R() * TAU }));
let sparks = [];
const shades = Array.from({ length: 10 }, (_, i) => `hsl(150,55%,${7 + i * 3.2}%)`);
const rad = (h, Rm) => { const k = h * 6, i = Math.floor(k), fr = k - i; return Rm * (i + .35 + fr * .65) / 6.35; };
const pts = Array.from({ length: mobile ? 800 : 1500 }, () => {
  const h = Math.sqrt(R()); return { h, a: R() * TAU, s: .55 + .45 * Math.sqrt(R()), sn: R() < .1 && (h * 6) % 1 > .5 };
});
const bulbs = Array.from({ length: 56 }, (_, i) => ({ h: .08 + R() * .86, a: R() * TAU, hue: [0, 45, 140, 200, 320][i % 5] }));
const orbs = Array.from({ length: 15 }, (_, i) => ({ h: .14 + (i / 15) * .78, a: i * 2.4, c: ['#d92b3f', '#f4d58d', '#2fb67f', '#4aa3ff', '#e86bd0'][i % 5], kick: 0, i }));
const orbit = Array.from({ length: 40 }, () => ({ a: R() * TAU, v: .4 + R() * .8, h: R(), e: .6 + R() * .5 }));
let hits = [];

/* ---------- sizing ---------- */
function size() {
  dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
  fx.width = W * dpr; fx.height = H * dpr;
  const r = tc.getBoundingClientRect(); TW = r.width; TH = r.height;
  tc.width = TW * dpr; tc.height = TH * dpr;
}
addEventListener('resize', size); size();

/* ---------- effects ---------- */
function burst(x, y, n = 40, cols = ['#f4d58d', '#fff3c4', '#ffffff'], sp = 5) {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, v = (.3 + R()) * sp;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, d: .008 + R() * .014, c: cols[i % cols.length], s: 1 + R() * 2, g: .05 });
  }
}
function firework(x = R() * W, y = H * (.15 + R() * .4)) {
  const h = R() * 360; burst(x, y, 70, [`hsl(${h},100%,65%)`, `hsl(${h + 40},100%,75%)`, '#fff3c4'], 6);
}
function glowDot(c, x, y, r, a) { c.globalAlpha = a; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }

/* ---------- main fx layer ---------- */
function drawFx(T) {
  f.setTransform(dpr, 0, 0, dpr, 0, 0); f.clearRect(0, 0, W, H);
  const sy = scrollY, ga = clamp(T / 2);
  f.globalCompositeOperation = 'lighter';
  // light rays from star
  const rect = tc.getBoundingClientRect();
  if (rect.bottom > 0) {
    const sx = rect.left + TW / 2, sY = rect.top + TH * .07, ra = clamp((T - 1.8) / 2.5) * .16;
    for (let i = 0; i < 14; i++) {
      const a = T * .05 + i * TAU / 14, w = .06;
      const g = f.createRadialGradient(sx, sY, 0, sx, sY, H * 1.1); g.addColorStop(0, `rgba(255,230,160,${ra})`); g.addColorStop(1, 'rgba(255,230,160,0)');
      f.fillStyle = g; f.beginPath(); f.moveTo(sx, sY); f.lineTo(sx + Math.cos(a - w) * H * 1.2, sY + Math.sin(a - w) * H * 1.2); f.lineTo(sx + Math.cos(a + w) * H * 1.2, sY + Math.sin(a + w) * H * 1.2); f.fill();
    }
  }
  // floating gold particles (parallax)
  f.fillStyle = '#ffd77a';
  for (const p of gold) {
    p.y -= p.v / H * .6; if (p.y < -.02) p.y = 1.02;
    const yy = (((p.y * H - sy * p.z) % H) + H) % H, xx = p.x * W + Math.sin(T * .6 + p.ph) * 20;
    glowDot(f, xx, yy, p.r * 1.8, ga * (.25 + .5 * Math.sin(T * 2 + p.ph) ** 2));
  }
  f.globalCompositeOperation = 'source-over';
  // snow
  const vis = snowOn ? Math.floor(snow.length * clamp((T - 2.5) / 3) * Math.min(1, .55 + boost * .45)) : 0;
  f.fillStyle = '#fff';
  for (let i = 0; i < vis; i++) {
    const p = snow[i], sp = (.3 + p.r * .45) * (1 + boost * 2.2);
    p.y += sp / H; p.x += (Math.sin(T * .8 + p.ph) * .25 + .08 + boost * .3) / W * (p.r * .6);
    if (p.y > 1.02) { p.y = -.02; p.x = R(); } if (p.x > 1.02) p.x = -.02;
    glowDot(f, p.x * W, p.y * H, p.r, .35 + p.r * .2);
  }
  f.globalAlpha = 1;
  // sparks
  f.globalCompositeOperation = 'lighter';
  sparks = sparks.filter(s => s.l > 0);
  for (const s of sparks) {
    s.x += s.vx; s.y += s.vy; s.vy += s.g; s.vx *= .985; s.vy *= .985; s.l -= s.d;
    f.fillStyle = s.c; glowDot(f, s.x, s.y, s.s * (.5 + s.l), Math.max(0, s.l));
  }
  f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1;
  if (finaleSeen && !reduce && T > fwTimer) { firework(); fwTimer = T + .8 + R(); }
  boost = Math.max(0, boost - .0035);
}

/* ---------- tree layer ---------- */
function drawStar(cx, cy, r, rot, T) {
  t.save(); t.translate(cx, cy);
  t.globalCompositeOperation = 'lighter';
  const g = t.createRadialGradient(0, 0, 0, 0, 0, r * 4); g.addColorStop(0, 'rgba(255,230,150,.9)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  t.fillStyle = g; t.beginPath(); t.arc(0, 0, r * 4, 0, TAU); t.fill();
  t.rotate(rot * .5); t.fillStyle = 'rgba(255,235,170,.35)';
  for (let i = 0; i < 12; i++) { t.rotate(TAU / 12); t.beginPath(); t.moveTo(0, 0); t.lineTo(-2, -r * (3 + (i % 2) * 1.8)); t.lineTo(2, -r * (3 + (i % 2) * 1.8)); t.fill(); }
  t.globalCompositeOperation = 'source-over'; t.rotate(-rot * .5 - Math.PI / 2); t.fillStyle = '#ffe9a0'; t.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r; t.lineTo(Math.cos(i * Math.PI / 5) * rr, Math.sin(i * Math.PI / 5) * rr); }
  t.fill(); t.restore();
}
function drawTree(T) {
  t.setTransform(dpr, 0, 0, dpr, 0, 0); t.clearRect(0, 0, TW, TH);
  const cx = TW / 2, top = TH * .13, Hh = TH * .8, Rm = TW * .42, rot = T * .35 + mx * .9;
  const rev = clamp((T - 3.2) / 3), ease = 1 - (1 - rev) ** 3;
  const P = (h, a, s = 1) => { const r = rad(h, Rm) * s, x = r * Math.cos(a + rot), z = r * Math.sin(a + rot);
    return { x: cx + x * (1 + z / (Rm * 7)) + Math.sin(T + h * 3) * h * 2, y: top + h * Hh + (1 - Math.cos(a + rot)) * 0, z: z / Rm }; };
  drawStar(cx, top - 6, 13 * clamp((T - 1) / 1.5) * (1 + .06 * Math.sin(T * 3)), T, T);
  // trunk
  if (rev > 0) { t.fillStyle = '#3b2314'; t.fillRect(cx - Rm * .07, top + Hh * .98, Rm * .14, TH * .06); }
  // foliage, back then front
  for (let pass = 0; pass < 2; pass++) for (const p of pts) {
    if (p.h > ease) continue; const q = P(p.h, p.a, p.s); if ((q.z >= 0) !== !!pass) continue;
    t.fillStyle = p.sn && q.z > -.2 ? 'rgba(255,255,255,.85)' : shades[Math.min(9, Math.floor((q.z + 1) * 4.9))];
    const s = 2 + (q.z + 1) * 1.1; t.fillRect(q.x, q.y + (1 - p.s) * 14, s, s);
  }
  t.globalCompositeOperation = 'lighter';
  // garland
  for (let i = 0; i < 180; i++) { const u = .1 + i / 180 * .88; if (u > ease) break; const q = P(u, u * TAU * 7, 1.03);
    t.fillStyle = '#ffd77a'; glowDot(t, q.x, q.y, 1.4 + (q.z + 1) * .8, .25 + (q.z + 1) * .3); }
  // lights
  bulbs.forEach((b, i) => {
    if (b.h > ease) return; const q = P(b.h, b.a, 1.04);
    const on = lightMode === 2 ? 1 : lightMode === 1 ? (Math.sin(T * 4 - b.h * 14) > .2 ? 1 : .15) : .5 + .5 * Math.sin(T * 3 + i * 1.7);
    t.fillStyle = `hsl(${b.hue},100%,${b.hue ? 62 : 58}%)`; const k = (q.z + 1.2) / 2.2;
    glowDot(t, q.x, q.y, 9 * k, .18 * on); glowDot(t, q.x, q.y, 2.6 * k, .55 + .45 * on);
  });
  // orbiting particles
  for (const o of orbit) {
    const a = o.a + T * o.v, x = cx + Math.cos(a) * Rm * (.9 + o.e * .5), z = Math.sin(a), y = top + o.h * Hh + Math.sin(T + o.a) * 12;
    t.fillStyle = '#ffe9a0'; glowDot(t, x, y, 1.6 + z * .8, .5 + z * .3);
  }
  t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1;
  // ornaments
  hits = [];
  const os = orbs.filter(o => o.h <= ease).map(o => ({ o, q: P(o.h, o.a, 1.02) })).sort((a, b) => a.q.z - b.q.z);
  for (const { o, q } of os) {
    o.kick *= .94; const r = (6 + (q.z + 1) * 3.5) * (1 + o.kick * .5), y = q.y + 10 + Math.sin(o.kick * 20) * o.kick * 8;
    const g = t.createRadialGradient(q.x - r * .35, y - r * .35, r * .1, q.x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(.25, o.c); g.addColorStop(1, '#00000099');
    t.fillStyle = g; t.globalAlpha = .55 + (q.z + 1) * .22; t.beginPath(); t.arc(q.x, y, r, 0, TAU); t.fill();
    if (q.z > -.2) hits.push({ x: q.x, y, r, o });
  }
  t.globalAlpha = 1;
}

/* ---------- loop ---------- */
const bars = [...document.querySelectorAll('.viz i')];
function loop(now) {
  const T = (now - t0) / 1000; drawFx(T); drawTree(T);
  if (analyser && playing) { analyser.getByteFrequencyData(freq); bars.forEach((b, i) => b.style.transform = `scaleY(${.15 + freq[i * 3 + 1] / 255 * .85})`); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- audio (synthesised, no assets) ---------- */
let ac, master, analyser, freq, playing = false, timer, nextT = 0, ni = 0;
const song = [[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[62,1],[62,1],[64,1],[62,2],[67,2]];
function audio() {
  if (ac) return ac;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0;
    analyser = ac.createAnalyser(); analyser.fftSize = 64; freq = new Uint8Array(32);
    const dl = ac.createDelay(); dl.delayTime.value = .28; const fb = ac.createGain(); fb.gain.value = .35; dl.connect(fb); fb.connect(dl);
    master.connect(analyser); master.connect(dl); dl.connect(analyser); analyser.connect(ac.destination);
  } catch (e) { ac = null; }
  return ac;
}
function bell(m, when, dur = .9, vol = .25) {
  const fr = 440 * 2 ** ((m - 69) / 12), g = ac.createGain();
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + .01); g.gain.exponentialRampToValueAtTime(.001, when + dur + .6);
  g.connect(master);
  [[1, 1], [2.76, .25], [5.4, .08]].forEach(([k, a]) => { const o = ac.createOscillator(), h = ac.createGain(); o.type = 'sine'; o.frequency.value = fr * k; h.gain.value = a; o.connect(h); h.connect(g); o.start(when); o.stop(when + dur + .7); });
}
function schedule() {
  while (nextT < ac.currentTime + .4) { const [m, b] = song[ni]; bell(m + 12, nextT); if (ni % 5 === 0) bell(m - 12, nextT, 1.4, .12); nextT += b * .4; if (++ni >= song.length) { ni = 0; nextT += .8; } }
}
function setMusic(on) {
  if (!audio()) return toast('Audio is not supported here');
  ac.resume(); playing = on; $('#musicBtn').setAttribute('aria-pressed', on); $('#musicBtn').classList.toggle('on', on);
  master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(on ? +$('#vol').value : 0, ac.currentTime, .4);
  clearInterval(timer);
  if (on) { nextT = ac.currentTime + .1; timer = setInterval(schedule, 100); }
  else bars.forEach(b => b.style.transform = 'scaleY(.2)');
}
function chime(n = 0) { if (!audio()) return; ac.resume(); if (master.gain.value < .01) master.gain.value = +$('#vol').value; [0, 4, 7, 12, 16].forEach((s, i) => bell(72 + n + s, ac.currentTime + i * .09, 1.2, .18)); }
$('#musicBtn').onclick = () => setMusic(!playing);
$('#vol').oninput = e => { if (ac && playing) master.gain.setTargetAtTime(+e.target.value, ac.currentTime, .1); };

/* ---------- UI ---------- */
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2200); }
$('#enter').onclick = e => {
  document.body.classList.remove('intro'); const r = e.target.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top, 90, undefined, 7); [0, 250, 500].forEach(d => setTimeout(() => firework(), d));
  setTimeout(() => $('#greeting').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 1500);
};
$('#snowBtn').onclick = e => { snowOn = !snowOn; e.currentTarget.classList.toggle('on', snowOn); e.currentTarget.setAttribute('aria-pressed', snowOn); };
tc.addEventListener('pointerdown', e => {
  const r = tc.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const h = hits.filter(k => Math.hypot(k.x - x, k.y - y) < k.r * 1.8).sort((a, b) => a.o.i - b.o.i)[0];
  if (h) { h.o.kick = 1; burst(r.left + h.x, r.top + h.y, 30, [h.o.c, '#fff3c4'], 4); chime(h.o.i % 7 - 3); }
  else { lightMode = (lightMode + 1) % 3; burst(e.clientX, e.clientY, 14, undefined, 3); toast(['Twinkling lights', 'Chasing lights', 'Steady glow'][lightMode]); }
});
addEventListener('pointermove', e => {
  mx = (e.clientX / W - .5) * 2;
  if (!reduce && !document.body.classList.contains('intro') || e.clientY) { sparks.push({ x: e.clientX, y: e.clientY, vx: (R() - .5) * 1.2, vy: (R() - .5) * 1.2, l: 1, d: .03, c: R() < .5 ? '#f4d58d' : '#fff', s: 1 + R() * 2, g: .02 }); }
  if (sparks.length > 700) sparks.splice(0, 100);
}, { passive: true });
addEventListener('scroll', () => { tc.style.transform = `translateY(${Math.min(scrollY, H) * .25}px)`; }, { passive: true });

// greeting personalisation
const qs = new URLSearchParams(location.search), nameIn = $('#name'), textIn = $('#text');
nameIn.value = qs.get('from') || ''; textIn.value = qs.get('msg') || '';
const DEF = 'Wishing you a Christmas full of warmth, wonder and everything you love.';
function sync() { $('#who').textContent = nameIn.value.trim() || 'With love'; $('#msg').textContent = textIn.value.trim() || DEF; }
nameIn.oninput = textIn.oninput = sync; sync();

// gift
const gift = $('#gift');
gift.onclick = () => {
  if (gift.classList.contains('open')) return;
  gift.classList.add('open'); const r = gift.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * .4;
  burst(x, y, 140, ['#f4d58d', '#fff3c4', '#d92b3f', '#2fb67f', '#fff'], 9); setTimeout(() => burst(x, y, 80, undefined, 6), 300);
  boost = 1; chime(); setTimeout(() => $('#surprise').classList.add('show'), 300);
  setTimeout(() => $('#surprise').scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
};

// share
$('#shareBtn').onclick = async () => {
  const u = new URL(location.href.split('?')[0]); if (nameIn.value) u.searchParams.set('from', nameIn.value); if (textIn.value) u.searchParams.set('msg', textIn.value);
  const text = `${textIn.value.trim() || DEF} — ${nameIn.value.trim() || 'Merry Christmas 2026'}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Christmas Wonderland 2026', text, url: u.href });
    else { await navigator.clipboard.writeText(`${text} ${u.href}`); toast('Greeting copied to clipboard'); }
  } catch (e) { if (e.name !== 'AbortError') toast('Could not share — copy the link manually'); }
};

// reveal on scroll + finale
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); if (e.target.id === 'finale') finaleSeen = e.isIntersecting; }), { threshold: .3 });
document.querySelectorAll('.rv, #finale').forEach(el => io.observe(el));
$('#finale').addEventListener('pointerdown', e => { firework(e.clientX, e.clientY); chime(-5); });
if (reduce) document.body.classList.remove('intro');
})();
