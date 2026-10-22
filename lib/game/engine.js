/* 감자 달려 · 게임 엔진 (캔버스 손그림 렌더링 + 물리)
   화면(UI)과 저장은 React가 맡고, 여기서는 달리기·그리기만 해요. */

export function createGame(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const FONT = opts.font || "Gaegu, 'Nanum Pen Script', cursive";
  const hud = opts.hud || {};
  const cache = {};
  const loadImg = (src) => {
    if (!cache[src]) { const i = new Image(); i.src = src; cache[src] = i; }
    return cache[src];
  };
  const calmImg = loadImg(opts.images.calm), cryImg = loadImg(opts.images.cry);
  let outfit = []; // [{calm:Image, cry:Image}]

  /* ---------- 화면 모드 ---------- */
  let PAPER = '#ffffff', INK = '#000000', DARK = false;
  function refreshTheme() {
    const cs = getComputedStyle(document.documentElement);
    PAPER = cs.getPropertyValue('--paper').trim() || '#ffffff';
    INK = cs.getPropertyValue('--ink').trim() || '#000000';
    DARK = PAPER.toLowerCase() !== '#ffffff' && PAPER.toLowerCase() !== '#fff';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', PAPER);
  }
  refreshTheme();
  function glowOf(img) { // 어두운 배경에서 묻히지 않게 밝은 테두리용 실루엣
    if (img.__glow) return img.__glow;
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#f2efe8'; g.fillRect(0, 0, c.width, c.height); return (img.__glow = c);
  }

  let W, H, DPR, S, VW, VH;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    S = Math.min(H / 620, W / 560); VW = W / S; VH = H / S;
  }
  resize();

  /* ---------- 결정적 난수 & 손그림 선 ---------- */
  function R(a, b) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  let boil = 0; // 선이 살짝 떨리는 '보일' 프레임
  const LW = 3.1;
  function jpath(pts, seed, closed, j) {
    const out = [], n = pts.length, m = closed ? n : n - 1;
    for (let e = 0; e < m; e++) {
      const [x1, y1] = pts[e], [x2, y2] = pts[(e + 1) % n];
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, k = Math.max(1, Math.round(L / 16));
      const nx = -dy / L, ny = dx / L;
      for (let i = 0; i < k; i++) { const t = i / k, r = (R(seed, e * 97 + i) - .5) * 2 * j; out.push([x1 + dx * t + nx * r, y1 + dy * t + ny * r]); }
    }
    if (!closed) { const [x, y] = pts[n - 1]; out.push([x + (R(seed, 999) - .5) * j, y + (R(seed, 998) - .5) * j]); }
    return out;
  }
  function trace(p, closed) {
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    if (closed) ctx.closePath();
  }
  function sketch(pts, seed, o = {}) {
    const s = seed * 13 + boil * 7919, p = jpath(pts, s, !!o.closed, o.j ?? 1.15);
    if (o.fill) { trace(p, !!o.closed); ctx.fillStyle = PAPER; ctx.fill(); }
    trace(p, !!o.closed); ctx.lineWidth = o.w ?? LW; ctx.stroke();
  }
  function sline(x1, y1, x2, y2, seed, o = {}) { // 끝이 살짝 삐져나오는 선
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, s = seed * 13 + boil * 7919;
    const a = (R(s, 1) - .35) * 5, b = (R(s, 2) - .35) * 5;
    sketch([[x1 - ux * a, y1 - uy * a], [x2 + ux * b, y2 + uy * b]], seed, o);
  }
  function blob(cx, cy, r, seed, bumps, o = {}) { // 뭉게뭉게 나무/구름
    const pts = [], N = bumps * 5, ph = R(seed, 5) * 6;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, rr = r * (.84 + .18 * Math.abs(Math.sin(a * bumps / 2 + ph))); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (o.squash ?? 1)]); }
    sketch(pts, seed, { closed: true, fill: true, ...o });
  }
  function circ(cx, cy, r, seed, o = {}) {
    const pts = [], N = Math.max(10, Math.round(r * 1.2));
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    sketch(pts, seed, { closed: true, ...o });
  }

  /* ---------- 세계 ---------- */
  const G = 2300, JUMP = 840, HW = 22, HH = 36, SPR_H = 98;
  let blds, anchors, fars, clouds, lastX, lastTop, farX, cloudX, nB, bills = [], billN = 0, pops = [];
  let p, camX, camY, state = 'title', held = false, pressed = false, t = 0, tears = [], dusts = [], shownHint, spLevel = 0, spAt = -9;
  const mkBill = (x, y) => ({ x, y, s: (Math.random() * 1e9) | 0, ph: Math.random() * 6, got: false });
  const rnd = (a, b) => a + Math.random() * (b - a);

  function reset() {
    blds = []; anchors = []; fars = []; clouds = []; tears = []; dusts = []; nB = 0; shownHint = false;
    spLevel = 0; spAt = -9; bills = []; billN = 0; pops = [];
    addB(-400, 1100, 430);
    farX = -600; cloudX = -400;
    p = { x: 60, y: 430 - HH, vx: 0, vy: 0, ground: true, rope: null, L: 0, rot: 0, dead: false, maxX: 60 };
    camX = p.x - VW * .28; camY = p.y - VH * .58;
  }
  function addB(x, w, top) {
    const seed = (Math.random() * 1e9) | 0;
    const deco = []; const k = R(seed, 1);
    if (w > 220 && k < .45) { const n = 1 + ((R(seed, 2) * 3) | 0); for (let i = 0; i < n; i++) deco.push({ t: 'tree', x: x + 30 + R(seed, 10 + i) * (w - 60), h: 38 + R(seed, 20 + i) * 40, r: 24 + R(seed, 30 + i) * 16, s: seed + i }); }
    else if (k < .62) deco.push({ t: 'tank', x: x + 40 + R(seed, 3) * (w - 110), s: seed });
    else if (k < .78) deco.push({ t: 'ant', x: x + 30 + R(seed, 4) * (w - 60), s: seed });
    else if (k < .9) deco.push({ t: 'rail', s: seed });
    blds.push({ x, w, top, seed, deco, idx: nB++ }); lastX = x + w; lastTop = top;
  }
  function gen() {
    while (lastX < camX + VW + 700) {
      const d = Math.min(1, Math.max(0, lastX - 1500) / 9000);
      const wire = nB > 2 && Math.random() < .28 + .32 * d;
      const gap = wire ? rnd(250, 330 + 90 * d) : rnd(70, 130 + 80 * d);
      let top = lastTop + rnd(-100, 100) + (400 - lastTop) * .35;
      if (gap > 120 && top < lastTop - 80) top = lastTop - 80;
      top = Math.max(270, Math.min(520, top));
      const w = rnd(220 - 60 * d, 520 - 200 * d);
      if (gap > 190) {
        const ax = lastX + gap * .5 + rnd(-30, 30), ay = Math.min(lastTop, top) - rnd(175, 235);
        anchors.push({ x: ax, y: ay, s: (Math.random() * 1e9) | 0, first: !anchors.some(a => a.gap), gap: true });
      } else if (Math.random() < .18) {
        anchors.push({ x: lastX + gap + w * rnd(.3, .7), y: top - rnd(190, 240), s: (Math.random() * 1e9) | 0 });
      }
      // 지폐: 줄 틈은 그네 궤도(U), 점프 틈은 포물선(n), 지붕 위는 한 줄
      if (gap > 190) {
        const a = anchors[anchors.length - 1], Rr = Math.min(230, Math.max(150, (Math.min(lastTop, top) - a.y) * .85));
        for (let i = 0; i < 5; i++) { const ang = 2.2 - i * .33; bills.push(mkBill(a.x + Math.cos(ang) * Rr, a.y + Math.sin(ang) * Rr)); }
      } else if (nB > 1 && Math.random() < .55) {
        const x0 = lastX - 30, span = gap + 60, n = Math.max(3, Math.min(5, Math.floor(span / 50)));
        for (let i = 0; i < n; i++) { const tt = i / (n - 1); bills.push(mkBill(x0 + span * tt, Math.min(lastTop, top) - 75 - 80 * Math.sin(Math.PI * tt))); }
      }
      if (nB > 1 && Math.random() < .45) {
        const n = Math.min(3 + ((Math.random() * 3) | 0), Math.floor(w * .7 / 46)), bx = lastX + gap + w * .15;
        for (let i = 0; i < n; i++) bills.push(mkBill(bx + i * 46, top - 40));
      }
      addB(lastX + gap, w, top);
    }
    while (blds.length && blds[0].x + blds[0].w < camX - 400) blds.shift();
    while (anchors.length && anchors[0].x < camX - 500) anchors.shift();
    while (bills.length && bills[0].x < camX - 300) bills.shift();
    const fx = camX * .45; // 먼 배경(시차)
    while (farX < fx + VW + 400) { const w = rnd(90, 220); fars.push({ x: farX, w, top: rnd(250, 400), s: (Math.random() * 1e9) | 0, tree: Math.random() < .35 }); farX += w + rnd(10, 70); }
    while (fars.length && fars[0].x + fars[0].w < fx - 300) fars.shift();
    const cx = camX * .15;
    while (cloudX < cx + VW + 400) { clouds.push({ x: cloudX, y: rnd(60, 200), r: rnd(26, 44), s: (Math.random() * 1e9) | 0 }); cloudX += rnd(260, 520); }
    while (clouds.length && clouds[0].x < cx - 300) clouds.shift();
  }

  /* ---------- 입력 (게임 중에만) ---------- */
  const isUi = (e) => e.target && e.target.closest && e.target.closest('button, input, a, [data-ui]');
  function onDown(e) { if (state !== 'play' || isUi(e)) return; held = true; pressed = true; }
  function onUp() { held = false; }
  function onKeyDown(e) {
    if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (state !== 'play') return;
    e.preventDefault(); if (e.repeat) return; held = true; pressed = true;
  }
  function onKeyUp(e) { if (e.code === 'Space' || e.code === 'ArrowUp') held = false; }
  window.addEventListener('resize', resize);
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function start() { reset(); state = 'play'; held = false; pressed = false; }

  /* ---------- 물리 ---------- */
  function candidate() {
    let bestA = null, bd = 1e9; const hx = p.x, hy = p.y;
    for (const a of anchors) { const dx = a.x - hx, dy = a.y - hy; if (dx > -40 && dx < 400 && dy < -50) { const d = Math.hypot(dx, dy); if (d < 440 && d < bd) { bd = d; bestA = a; } } }
    return bestA;
  }
  function step(dt) {
    const lv = Math.min(7, Math.floor(p.maxX / 40 / 120)); // 120m마다 속도 UP
    if (lv > spLevel && state === 'play') { spLevel = lv; spAt = t; }
    const run = 380 + spLevel * 45;
    if (p.dead) { p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; return; }
    if (pressed && p.ground) { p.vy = -JUMP; p.ground = false; }
    pressed = false;
    if (held && !p.ground && !p.rope) { const a = candidate(); if (a) { p.rope = a; p.L = Math.hypot(p.x - a.x, p.y - a.y); } }
    if (!held && p.rope) { p.rope = null; if (p.vy < 0) p.vy -= 60; }
    if (p.ground) {
      p.vx += (run - p.vx) * Math.min(1, dt * 8); p.vy = 0;
      const b = blds.find(b => p.x + HW * .5 > b.x && p.x - HW * .5 < b.x + b.w && Math.abs(b.top - (p.y + HH)) < 2);
      if (!b) p.ground = false;
    }
    if (!p.ground) p.vy += G * dt;
    const prevB = p.y + HH;
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.x > p.maxX) p.maxX = p.x;
    if (p.rope) {
      const a = p.rope, dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
      if (d > p.L) { p.x = a.x + nx * p.L; p.y = a.y + ny * p.L; const vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= vr * nx; p.vy -= vr * ny; } }
      let tx = -ny, ty = nx; if (tx < 0) { tx = -tx; ty = -ty; }
      if (dy > 0) { const vt = p.vx * tx + p.vy * ty, want = run * 1.15; if (vt < want) { const add = (want - vt) * Math.min(1, dt * 3); p.vx += tx * add; p.vy += ty * add; } }
    }
    if (!p.ground) {
      for (const b of blds) {
        const bottom = p.y + HH;
        if (p.vy >= 0 && prevB <= b.top + 6 && bottom >= b.top && p.x + HW * .6 > b.x && p.x - HW * .6 < b.x + b.w) {
          p.y = b.top - HH; p.vy = 0; p.ground = true; p.rope = null; p.vx = Math.max(p.vx * .7, run * .8);
          for (let i = 0; i < 3; i++) dusts.push({ x: p.x - 14 + i * 14, y: b.top - 4, r: 4, life: .45, s: (Math.random() * 1e9) | 0 });
          break;
        }
        if (p.x + HW > b.x && p.x < b.x + 8 && bottom > b.top + 12) { crash(); return; }
      }
    }
    if (p.y > 1150) fall();
    for (const b of bills) { // 지폐 줍기
      if (!b.got && Math.abs(b.x - p.x) < 36 && Math.abs(b.y - p.y) < 54) { b.got = true; billN++; pops.push({ x: b.x, y: b.y, life: .7, s: b.s, ph: b.ph }); }
    }
    if (!p.ground && Math.random() < dt * 14) { // 눈물
      const side = Math.random() < .5 ? -1 : 1;
      tears.push({ x: p.x + side * 12, y: p.y - 18, vx: -p.vx * .25 + side * rnd(40, 120), vy: rnd(-260, -120), life: .9, s: (Math.random() * 1e9) | 0 });
    }
  }
  function crash() { p.dead = true; p.rope = null; p.vx = -140; p.vy = -380; endGame('감자 부딪혔어.. 나 안아..'); }
  function fall() { p.dead = true; endGame('으앙, 떨어졌어요'); }
  function endGame(message) {
    if (state !== 'play') return;
    state = 'over';
    const distance = Math.max(0, Math.floor(p.maxX / 40));
    if (opts.onEnd) opts.onEnd({ distance, bills: billN, message });
  }

  /* ---------- 그리기 ---------- */
  function drawFar() {
    const ox = camX * .45, oy = camY * .6;
    ctx.save(); ctx.globalAlpha = .32;
    for (const f of fars) {
      const x = f.x - ox + camX, top = f.top + camY - oy;
      if (f.tree) {
        sline(x + f.w * .5, top + 60, x + f.w * .5, camY + VH + 20, f.s, { w: 2.4 });
        blob(x + f.w * .5, top + 30, f.w * .32, f.s + 1, 7, { w: 2.4 });
      } else {
        ctx.fillStyle = PAPER; ctx.fillRect(x, top, f.w, camY + VH + 40 - top);
        sline(x, top, x + f.w, top, f.s, { w: 2.4 }); sline(x, top, x, camY + VH + 30, f.s + 1, { w: 2.4 }); sline(x + f.w, top, x + f.w, camY + VH + 30, f.s + 2, { w: 2.4 });
        for (let yy = top + 26; yy < camY + VH; yy += 46) for (let xx = x + 16; xx < x + f.w - 24; xx += 34) if (R(f.s, xx * 7 + yy) < .55) sketch([[xx, yy], [xx + 14, yy], [xx + 14, yy + 18], [xx, yy + 18]], f.s + xx + yy, { closed: true, w: 2 });
      }
    }
    ctx.restore();
  }
  function drawSky() {
    const ox = camX * .15, oy = camY * .2;
    for (const c of clouds) { const x = c.x - ox + camX, y = c.y - oy + camY; ctx.save(); ctx.globalAlpha = .55; blob(x, y, c.r, c.s, 6, { squash: .55, w: 2.4 }); ctx.restore(); }
    const sx = camX + VW - 110, sy = camY + 160;
    if (DARK) { // 달과 별
      ctx.save(); ctx.globalAlpha = .75;
      circ(sx, sy, 30, 7, { w: 2.6, fill: true });
      circ(sx + 14, sy - 9, 26, 8, { w: 2.2, fill: true });
      ctx.globalAlpha = .55;
      for (let i = 0; i < 9; i++) {
        const x = camX + VW * R(i, 31), y = camY + 40 + R(i, 32) * Math.min(260, VH * .3), k = 4 + R(i, 33) * 3;
        sline(x - k, y, x + k, y, 60 + i, { w: 2 }); sline(x, y - k, x, y + k, 70 + i, { w: 2 });
      }
      ctx.restore();
    } else { // 해
      ctx.save(); ctx.globalAlpha = .6;
      circ(sx, sy, 30, 7, { w: 2.6, fill: true });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2; sline(sx + Math.cos(a) * 42, sy + Math.sin(a) * 42, sx + Math.cos(a) * 56, sy + Math.sin(a) * 56, 50 + i, { w: 2.4 }); }
      ctx.restore();
    }
  }
  function drawBuilding(b) {
    const bot = camY + VH + 30;
    if (b.x > camX + VW + 50 || b.x + b.w < camX - 50) return;
    for (const d of b.deco) {
      if (d.t === 'tree') { sline(d.x - 4, b.top, d.x - 3, b.top - d.h, d.s, {}); sline(d.x + 5, b.top, d.x + 4, b.top - d.h, d.s + 1, {}); blob(d.x, b.top - d.h - d.r * .6, d.r, d.s + 2, 7); }
      if (d.t === 'tank') {
        sline(d.x + 8, b.top, d.x + 10, b.top - 26, d.s); sline(d.x + 52, b.top, d.x + 50, b.top - 26, d.s + 1);
        sketch([[d.x, b.top - 26], [d.x + 60, b.top - 26], [d.x + 60, b.top - 70], [d.x, b.top - 70]], d.s + 2, { closed: true, fill: true });
        sline(d.x, b.top - 48, d.x + 60, b.top - 48, d.s + 3, { w: 2 });
      }
      if (d.t === 'ant') { sline(d.x, b.top, d.x, b.top - 80, d.s); sline(d.x - 16, b.top - 60, d.x + 16, b.top - 62, d.s + 1); sline(d.x - 10, b.top - 74, d.x + 10, b.top - 75, d.s + 2); }
      if (d.t === 'rail') { sline(b.x + 6, b.top - 22, b.x + b.w - 6, b.top - 22, d.s, { w: 2.4 }); for (let xx = b.x + 10; xx < b.x + b.w - 6; xx += 26) sline(xx, b.top, xx, b.top - 22, d.s + xx, { w: 2.2 }); }
    }
    ctx.fillStyle = PAPER; ctx.fillRect(b.x, b.top, b.w, bot - b.top);
    sline(b.x - 3, b.top, b.x + b.w + 3, b.top, b.seed);
    sline(b.x, b.top, b.x, bot, b.seed + 1); sline(b.x + b.w, b.top, b.x + b.w, bot, b.seed + 2);
    sline(b.x + 4, b.top + 10, b.x + b.w - 4, b.top + 11, b.seed + 3, { w: 1.8 });
    const cols = Math.max(1, Math.floor((b.w - 36) / 58)), gx = (b.w - cols * 30) / (cols + 1);
    const r0 = Math.max(0, Math.floor((camY - b.top - 40) / 72));
    for (let r = r0; ; r++) {
      const y = b.top + 42 + r * 72; if (y > bot) break;
      for (let c = 0; c < cols; c++) {
        const x = b.x + gx + c * (30 + gx), h = R(b.seed, r * 31 + c);
        if (h < .12) continue;
        if (DARK && h > .55 && h < .72) { ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = INK; ctx.fillRect(x, y, 30, 38); ctx.restore(); }
        sketch([[x, y], [x + 30, y], [x + 30, y + 38], [x, y + 38]], b.seed + r * 101 + c, { closed: true, w: 2.3 });
        if (h > .7) sline(x + 15, y, x + 15, y + 38, b.seed + r * 7 + c, { w: 1.8 });
        if (h < .24) { for (let k = 0; k < 3; k++) sline(x + 5 + k * 8, y + 34, x + 12 + k * 8, y + 24, b.seed + k + r, { w: 1.5 }); }
      }
    }
  }
  function drawAnchor(a, cand) {
    sline(a.x, a.y - 14, a.x, a.y - 34, a.s + 3, { w: 2.2 });
    circ(a.x, a.y, 9, a.s, { fill: true });
    if (cand) { ctx.save(); ctx.setLineDash([5, 7]); circ(a.x, a.y, 20 + Math.sin(t * 8) * 2, a.s + 1, { w: 2 }); ctx.restore(); }
    if (a.first && !shownHint) { ctx.font = `700 30px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('꾹!', a.x, a.y - 46); }
  }
  function drawTear(q) {
    const ang = Math.atan2(q.vy, q.vx) + Math.PI / 2;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
    sketch([[0, -9], [5, 0], [4, 5], [0, 7], [-4, 5], [-5, 0]], q.s, { closed: true, fill: true, w: 2, j: .5 });
    ctx.restore();
  }
  function pose() {
    const air = !p.ground || p.dead; let rot = 0, bob = 0, sy = 1;
    if (!air) { const ph = t * (state === 'play' ? 17 : 5); bob = -Math.abs(Math.sin(ph)) * 7; rot = Math.sin(ph) * .06; sy = 1 - .04 * Math.cos(ph * 2); }
    else if (p.rope) { rot = Math.max(-.6, Math.min(.6, Math.atan2(p.rope.x - p.x, p.y - p.rope.y))); }
    else rot = Math.max(-.35, Math.min(.35, p.vy / 2400));
    if (p.dead) rot = p.rot;
    return { air, rot: rot + (R(boil, 77) - .5) * .03, bob, sy };
  }
  function drawGamja(ps) {
    const img = ps.air ? cryImg : calmImg;
    if (!img.complete || !img.naturalWidth) return;
    const w = SPR_H * img.naturalWidth / img.naturalHeight * (ps.air ? .82 : 1); // 우는 감자는 가로를 좁게
    const accs = outfit.map(o => (ps.air ? o.cry : o.calm)).filter(a => a.complete && a.naturalWidth);
    ctx.save(); ctx.translate(p.x, p.y + ps.bob); ctx.rotate(ps.rot); ctx.scale(1, ps.sy);
    if (DARK) {
      const d = 2.2;
      for (const im of [img, ...accs]) {
        const gl = glowOf(im);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.drawImage(gl, -w / 2 + Math.cos(a) * d, HH - SPR_H + Math.sin(a) * d, w, SPR_H); }
      }
    }
    ctx.drawImage(img, -w / 2, HH - SPR_H, w, SPR_H);
    for (const a of accs) ctx.drawImage(a, -w / 2, HH - SPR_H, w, SPR_H);
    ctx.restore();
  }
  function oval(cx, cy, rx, ry, seed, w) {
    const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    sketch(pts, seed, { closed: true, w, j: .45 });
  }
  function drawBill(x, y, seed, ph, sc = 1) {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(-.12 + Math.sin(t * 3 + ph) * .16);
    ctx.scale(sc * (.72 + .28 * Math.abs(Math.cos(t * 2.6 + ph))), sc); // 팔랑팔랑
    sketch([[-21, -10], [19, -13], [22, 11], [-18, 14]], seed, { closed: true, fill: true, w: 2.6, j: .8 });
    sline(-11, -5, -11, 6, seed + 1, { w: 2.2, j: .5 });
    oval(-1, .5, 3.6, 5.6, seed + 2, 2.1);
    oval(9, 0, 3.6, 5.6, seed + 3, 2.1);
    ctx.restore();
  }
  function drawSpeedUp() {
    const e = t - spAt; if (state !== 'play' || e > 1.5) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const a = e < 1.1 ? 1 : 1 - (e - 1.1) / .4, pop = e < .18 ? .6 + e / .18 * .5 : (e < .3 ? 1.1 - (e - .18) / .12 * .1 : 1);
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    for (let i = 0; i < 9; i++) {
      const y = H * .12 + i * H * .09, len = 40 + R(i, boil) * 70, x = W - ((e * 1400 + i * 137) % (W + 200)) + 100;
      sline(x, y, x + len, y, 300 + i, { w: 2.4 });
    }
    ctx.translate(W / 2, H * .3); ctx.rotate(-.06 + (R(boil, 5) - .5) * .02); ctx.scale(pop, pop);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.round(Math.min(72, W * .14));
    ctx.font = `700 ${fs}px ${FONT}`;
    ctx.lineWidth = 10; ctx.strokeStyle = PAPER; ctx.strokeText('속도 UP!', 0, 0);
    ctx.fillStyle = INK; ctx.fillText('속도 UP!', 0, 0);
    ctx.font = `700 ${Math.round(fs * .4)}px ${FONT}`;
    ctx.fillText(`${spLevel}단계`, 0, fs * .72);
    ctx.strokeStyle = INK;
    sline(-fs * 1.6, fs * .48, -fs * .55, fs * .52, 410, { w: 2.6 });
    sline(fs * .55, fs * .52, fs * 1.6, fs * .48, 411, { w: 2.6 });
    ctx.restore();
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(DPR * S, 0, 0, DPR * S, -camX * DPR * S, -camY * DPR * S);
    ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    drawSky(); drawFar();
    for (const b of blds) drawBuilding(b);
    const cand = (state === 'play' && !p.rope) ? candidate() : null;
    for (const a of anchors) if (a.x > camX - 60 && a.x < camX + VW + 60) drawAnchor(a, a === cand && !p.ground);
    for (const b of bills) if (!b.got && b.x > camX - 40 && b.x < camX + VW + 40) drawBill(b.x, b.y, b.s, b.ph);
    const ps = pose();
    if (p.rope) {
      const hx = p.x + Math.sin(ps.rot) * 24, hy = p.y - Math.cos(ps.rot) * 24;
      sketch([[p.rope.x, p.rope.y + 9], [(p.rope.x + hx) / 2, (p.rope.y + hy) / 2], [hx, hy]], p.rope.s + 9, { w: 2.6, j: 1.4 });
    }
    if (p.rope && !p.dead) for (let i = 0; i < 3; i++) { const y = p.y - 20 + i * 18; sline(p.x - 60 - i * 10, y, p.x - 30 - i * 6, y, i + 40, { w: 2 }); }
    for (const d of dusts) { ctx.save(); ctx.globalAlpha = Math.max(0, d.life / .45); circ(d.x, d.y, d.r, d.s, { w: 2 }); ctx.restore(); }
    drawGamja(ps);
    for (const q of tears) drawTear(q);
    for (const q of pops) {
      const k = 1 - q.life / .7; ctx.save(); ctx.globalAlpha = Math.max(0, q.life / .7);
      drawBill(q.x + k * 20, q.y - k * 70, q.s, q.ph, 1 - k * .4);
      ctx.font = `700 26px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'center';
      ctx.fillText('+1', q.x + k * 20, q.y - k * 70 - 26); ctx.restore();
    }
    drawSpeedUp();
  }

  /* ---------- 루프 ---------- */
  let last = performance.now(), boilT = 0, raf = 0, lastDist = '', lastBills = '';
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now; t += dt;
    boilT += dt; if (boilT > .12) { boilT = 0; boil = (boil + 1) % 3; }
    if (state === 'play' || state === 'over') {
      for (let i = 0; i < 4; i++) step(dt / 4);
      if (state === 'play' && anchors.some(a => a.first && p.rope === a)) shownHint = true;
    }
    for (const q of tears) { q.vy += G * .5 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    tears = tears.filter(q => q.life > 0);
    for (const d of dusts) { d.r += dt * 30; d.life -= dt; } dusts = dusts.filter(d => d.life > 0);
    for (const q of pops) q.life -= dt; pops = pops.filter(q => q.life > 0);
    if (!p.dead) camX += (p.x - VW * .28 - camX) * Math.min(1, dt * 10);
    const ty = Math.min(p.y - VH * .58, 560 - VH * .42);
    if (!p.dead) camY += (ty - camY) * Math.min(1, dt * 4);
    gen();
    const dist = Math.max(0, Math.floor(p.maxX / 40)) + 'm', bl = String(billN);
    if (hud.dist && dist !== lastDist) { hud.dist.textContent = dist; lastDist = dist; }
    if (hud.bills && bl !== lastBills) { hud.bills.textContent = bl; lastBills = bl; }
    render();
    raf = requestAnimationFrame(frame);
  }
  reset();
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  let destroyed = false;
  fontsReady.then(() => { if (!destroyed) raf = requestAnimationFrame(frame); });

  return {
    start,
    setOutfit(list) { outfit = list.map(o => ({ calm: loadImg(o.calm), cry: loadImg(o.cry) })); },
    refreshTheme,
    getState: () => state,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
