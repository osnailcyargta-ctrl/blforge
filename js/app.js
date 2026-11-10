// BLForge — glue UI, preview, export .bl, texture/icon generator
/* global Blockly, JSZip, SFX, BLF, DSL */

const APP = {
  mode: 'easy',
  ws: null,
  pvFiles: [],
  pvSel: 0,
  dirty: true,
};

// ---------- util ----------
const $ = id => document.getElementById(id);
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' ? ' err' : type === 'warn' ? ' warn' : '');
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 3400);
}
function hueShift(hex, dh) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.max(0, r + dh)); g = Math.min(255, Math.max(0, g + dh)); b = Math.min(255, Math.max(0, b + dh));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

// ---------- Blockly ----------
function initBlockly() {
  const dark = Blockly.Theme.defineTheme('blfDark', {
    base: Blockly.Themes.Zelos === undefined ? Blockly.Themes.Classic : Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#0a0f1c',
      toolboxBackgroundColour: '#0b1120',
      toolboxForegroundColour: '#9fb2d8',
      flyoutBackgroundColour: '#0d1322',
      flyoutForegroundColour: '#9fb2d8',
      flyoutOpacity: 0.98,
      scrollbarColour: '#1d2a45',
      scrollbarOpacity: 0.7,
      insertionMarkerColour: '#37e6a5',
      insertionMarkerOpacity: 0.6,
      markerColour: '#37e6a5',
      cursorColour: '#37e6a5',
      selectedGlowColour: '#37e6a5',
      replacingColour: '#37e6a5',
    },
    fontStyle: { family: '"Segoe UI", Roboto, sans-serif', size: 12, weight: '600' },
  });
  APP.ws = Blockly.inject('blocklyDiv', {
    toolbox: BLF.toolboxEasy,
    renderer: 'zelos',
    theme: dark,
    grid: { spacing: 26, length: 3, colour: '#16213a', snap: true },
    zoom: { controls: true, wheel: true, pinch: true, startScale: 0.9, minScale: 0.4, maxScale: 1.6 },
    trashcan: true,
    move: { drag: true, wheel: true },
    sounds: false,
    media: 'https://unpkg.com/blockly@10.4.3/media/',
  });
  APP.ws.registerToolboxCategoryCallback('BLF_VALS', BLF.valFlyout);

  let snapT = null;
  APP.ws.addChangeListener(ev => {
    if (ev.type === Blockly.Events.BLOCK_MOVE && !ev.isShadowMove) {
      if (!SFX._lastSnap || Date.now() - SFX._lastSnap > 120) { SFX.play('snap'); SFX._lastSnap = Date.now(); }
    }
    if (ev.type === Blockly.Events.BLOCK_CHANGE || ev.type === Blockly.Events.BLOCK_MOVE ||
        ev.type === Blockly.Events.BLOCK_DELETE || ev.type === Blockly.Events.BLOCK_CREATE) {
      APP.dirty = true;
      clearTimeout(snapT);
      snapT = setTimeout(refreshAll, 350);
      clearTimeout(saveT);
      saveT = setTimeout(saveWS, 1200);
    }
  });
}
let saveT = null;
function saveWS() {
  try { localStorage.setItem('blf_ws', JSON.stringify(Blockly.serialization.workspace.save(APP.ws))); } catch (e) {}
}
function loadWS() {
  try {
    const s = localStorage.getItem('blf_ws');
    if (!s) return false;
    Blockly.serialization.workspace.sanitizeJson;
    Blockly.serialization.workspace.load(JSON.parse(s), APP.ws);
    return true;
  } catch (e) { return false; }
}

// ---------- demo awal ----------
function loadDemo() {
  const mk = (type, x, y) => { const b = APP.ws.newBlock(type); b.initSvg && b.initSvg(); b.render(); b.moveBy(x, y); return b; };
  const c = mk('case_block', 30, 30);
  c.getField('KIND').setValue('item');
  c.getField('NAME').setValue('NovaBlade');
  const d = mk('it_damage', 60, 130); d.getField('N').setValue(42);
  const r = mk('it_rare', 60, 175); r.getField('R').setValue('orange');
  const eu = mk('ev_use', 60, 220);
  const dash = mk('cmd_dash', 90, 270); dash.getField('N').setValue(11);
  const say = mk('cmd_say', 90, 315); say.getField('T').setValue('Dashing!');
  // connect
  c.getInput('DO').connection.connect(d.previousConnection);
  d.nextConnection.connect(r.previousConnection);
  r.nextConnection.connect(eu.previousConnection);
  eu.getInput('DO').connection.connect(dash.previousConnection);
  dash.nextConnection.connect(say.previousConnection);

  const c2 = mk('case_block', 380, 30);
  c2.getField('KIND').setValue('npc');
  c2.getField('NAME').setValue('DummyKing');
  const lf = mk('npc_life', 410, 130); lf.getField('N').setValue(500);
  const bo = mk('npc_boss', 410, 175);
  const ed = mk('ev_death', 410, 220);
  const dp = mk('cmd_drop', 440, 270); dp.getField('I').setValue('NovaBlade');
  c2.getInput('DO').connection.connect(lf.previousConnection);
  lf.nextConnection.connect(bo.previousConnection);
  bo.nextConnection.connect(ed.previousConnection);
  ed.getInput('DO').connection.connect(dp.previousConnection);
  APP.ws.scrollCenter();
}

// ---------- mode ----------
function setMode(mode) {
  if (mode === APP.mode) return;
  if (mode === 'hard') {
    const cases = BLF.serializeCases(APP.ws).filter(c => c.easy);
    if (cases.length) {
      cases.forEach(c => {
        const b = c.block;
        const nb = APP.ws.newBlock('case_code');
        nb.initSvg(); nb.render();
        nb.getField('KIND').setValue(c.kind);
        nb.getField('NAME').setValue(c.name);
        nb.getField('CODE').setValue(c.code);
        nb.moveBy(b.getRelativeToSurfaceXY().x, b.getRelativeToSurfaceXY().y);
        b.dispose(false);
      });
      toast('Mode HARDMODE: blok diubah jadi kode DSL. Satu arah — rebuild kalau mau balik ke EASY.', 'warn');
    }
    APP.ws.options.toolbox = BLF.toolboxHard;
    $('wsHint').textContent = 'HARDMODE: drag CASE → tulis DSL di dalamnya. Referensi perintah: tab Dok.';
  } else {
    APP.ws.options.toolbox = BLF.toolboxEasy;
    $('wsHint').textContent = 'Klik kategori di kiri → drag blok ke workspace. Satu case = satu object mod.';
  }
  APP.ws.updateToolbox(APP.ws.options.toolbox);
  APP.ws.scrollCenter();
  APP.mode = mode;
  document.querySelectorAll('.mode-switch .pill').forEach(p => p.classList.toggle('on', p.dataset.mode === mode));
  SFX.play('mode');
  refreshAll();
}

// ---------- compile & preview ----------
function compileNow() {
  const cases = BLF.serializeCases(APP.ws);
  const dslText = cases.map(c => c.kind + (c.name ? ' ' + c.name : '') + ':\n' + c.code).join('\n\n');
  const parsed = DSL.parse(dslText);
  const meta = readMeta();
  const res = DSL.emitMod(parsed.cases, meta);
  const allErr = parsed.errors.concat(res.errors);
  APP.lastResult = res;
  APP.lastErrors = allErr;
  APP.pvFiles = res.files.map(f => ({ path: f.path, content: f.content }));
  return res;
}

function refreshAll() {
  if (!APP.ws) return;
  const cases = BLF.serializeCases(APP.ws);
  $('st_cases').textContent = cases.length;
  $('st_blocks').textContent = APP.ws.getAllBlocks(false).length;
  compileNow();
  renderPreview();
}

function renderPreview() {
  const wrap = $('pvFiles');
  wrap.innerHTML = '';
  APP.pvFiles.forEach((f, i) => {
    const b = document.createElement('button');
    b.textContent = f.path.replace('content/', '');
    b.className = i === APP.pvSel ? 'on' : '';
    b.onclick = () => { APP.pvSel = i; renderPreview(); SFX.play('tick'); };
    wrap.appendChild(b);
  });
  const el = $('pvCode');
  if (APP.lastErrors && APP.lastErrors.length) {
    const errs = APP.lastErrors.map(e => '// ⚠ baris ' + (e.line || '?') + ': ' + e.msg).join('\n');
    el.textContent = errs + '\n\n' + (APP.pvFiles[APP.pvSel] ? APP.pvFiles[APP.pvSel].content : '');
  } else {
    el.textContent = APP.pvFiles[APP.pvSel] ? APP.pvFiles[APP.pvSel].content : '// workspace kosong';
  }
}

// ---------- meta ----------
function modId(name) { return String(name || 'MyMod').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'mymod'; }
function readMeta() {
  const name = $('f_name').value.trim() || 'MyMod';
  const id = modId(name);
  let uid;
  try {
    uid = localStorage.getItem('blf_uid_' + id);
    if (!uid) { uid = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); localStorage.setItem('blf_uid_' + id, uid); }
  } catch (e) { uid = '00000000-0000-4000-8000-000000000000'; }
  return {
    name, id, uid,
    cls: name.replace(/[^A-Za-z0-9_]/g, '') || 'MyMod',
    author: $('f_author').value.trim() || 'Anon',
    version: $('f_version').value.trim() || '1.0.0',
    summary: $('f_summary').value.trim() || 'Mod buatan BLForge.',
    category: $('f_cat').value,
    color: $('f_color').value,
  };
}

// ---------- texture & icon generator ----------
function texCanvas(kind, name, color) {
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const g = cv.getContext('2d');
  const h = hashStr(name);
  const c1 = color, c2 = hueShift(color, (h % 90) - 45), dark = 'rgba(10,10,20,0.85)';
  g.imageSmoothingEnabled = false;
  if (kind === 'npc') {
    // slime blob
    g.fillStyle = c2; g.beginPath();
    g.moveTo(4, 27); g.quadraticCurveTo(2, 12, 16, 9); g.quadraticCurveTo(30, 12, 28, 27); g.closePath(); g.fill();
    g.strokeStyle = dark; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#fff';
    g.fillRect(11, 16, 3, 4); g.fillRect(19, 16, 3, 4);
    g.fillStyle = '#0b0b12';
    g.fillRect(12, 17, 2, 2); g.fillRect(20, 17, 2, 2);
  } else if (kind === 'proj') {
    // orb + glow
    const gr = g.createRadialGradient(16, 16, 2, 16, 16, 14);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, c1); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 4, 0, 7); g.fill();
  } else if (kind === 'tile' || kind === 'tileitem') {
    // ore chunks
    g.fillStyle = c2;
    const chunks = kind === 'tile' ? [[4, 6, 10, 8], [16, 4, 11, 9], [7, 18, 9, 9], [18, 17, 10, 10]] : [[8, 10, 16, 12]];
    chunks.forEach(q => { g.fillRect(q[0], q[1], q[2], q[3]); g.strokeStyle = dark; g.strokeRect(q[0] + 1, q[1] + 1, q[2] - 2, q[3] - 2); });
    g.fillStyle = c1;
    chunks.forEach(q => { g.fillRect(q[0] + 2, q[1] + 2, 3, 3); g.fillRect(q[0] + q[2] - 6, q[1] + q[3] - 6, 3, 3); });
  } else {
    // item: sword kalau namanya kyk pedang, selain itu ingot/gem
    if (/sword|blade|edge|cutter/i.test(name)) {
      g.strokeStyle = dark; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(6, 26); g.lineTo(24, 6); g.stroke();
      g.strokeStyle = c1; g.lineWidth = 2;
      g.beginPath(); g.moveTo(7, 25); g.lineTo(24, 7); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, 22); g.lineTo(23, 8); g.stroke();
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(9, 29); g.lineTo(4, 24); g.stroke();
      g.strokeStyle = dark; g.lineWidth = 1;
      g.beginPath(); g.moveTo(3, 21); g.lineTo(11, 29); g.stroke();
    } else if (/potion|flask|elixir/i.test(name)) {
      g.fillStyle = dark; g.fillRect(12, 4, 8, 5);
      g.fillStyle = c2; g.beginPath(); g.arc(16, 20, 9, 0, 7); g.fill();
      g.strokeStyle = dark; g.lineWidth = 2; g.stroke();
      g.fillStyle = c1; g.beginPath(); g.arc(16, 21, 6, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillRect(13, 15, 2, 6);
    } else {
      g.fillStyle = c2; g.beginPath();
      g.moveTo(16, 4); g.lineTo(27, 12); g.lineTo(23, 26); g.lineTo(9, 26); g.lineTo(5, 12);
      g.closePath(); g.fill();
      g.strokeStyle = dark; g.lineWidth = 2; g.stroke();
      g.fillStyle = c1; g.fillRect(12, 12, 8, 8);
      g.fillStyle = '#fff'; g.fillRect(13, 13, 3, 3);
    }
  }
  return cv;
}

function canvasBlob(cv) {
  return new Promise(res => cv.toBlob(async b => res(new Uint8Array(await b.arrayBuffer())), 'image/png'));
}

async function iconCanvas(size, meta) {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d');
  const r = size * 0.22;
  const gr = g.createLinearGradient(0, 0, size, size);
  gr.addColorStop(0, meta.color); gr.addColorStop(1, hueShift(meta.color, -70));
  g.beginPath();
  g.moveTo(r, 0); g.arcTo(size, 0, size, size, r); g.arcTo(size, size, 0, size, r);
  g.arcTo(0, size, 0, 0, r); g.arcTo(0, 0, size, 0, r); g.closePath();
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(2, size / 48); g.stroke();
  const init = (meta.name || 'BL').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'BL';
  g.fillStyle = '#04121c';
  g.font = '900 ' + (size * 0.42) + 'px "Segoe UI", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(init, size / 2, size / 2 + size * 0.02);
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.font = '900 ' + (size * 0.42) + 'px "Segoe UI", Arial, sans-serif';
  g.fillText(init, size / 2 - size * 0.012, size / 2 + size * 0.008);
  return cv;
}

// ---------- export ----------
async function exportBL() {
  const meta = readMeta();
  const res = compileNow();
  if (APP.lastErrors.length) {
    SFX.play('error');
    toast(APP.lastErrors.length + ' error DSL — cek tab Code di kanan.', 'err');
    switchTab('preview');
    renderPreview();
    return;
  }
  if (res.files.length <= 1) {
    SFX.play('error');
    toast('Workspace kosong — bikin minimal 1 case dulu.', 'err');
    return;
  }
  SFX.play('click');
  const zip = new JSZip();
  // manifest
  zip.file('manifest.json', JSON.stringify({
    uid: meta.uid,
    id: meta.id,
    name: meta.name,
    version: meta.version,
    category: meta.category,
    summary: meta.summary,
    updated: new Date().toISOString().slice(0, 10),
    blVersion: 2,
    gameVersion: [301720, 301720],
    entry: 'main.js',
    dependencies: [],
    authors: [{ name: meta.author, role: 'Owner', color: meta.color }],
    license: 'All rights reserved',
  }, null, 2));
  // code
  res.files.forEach(f => zip.file(f.path, f.content));
  // textures per class
  for (const f of res.files) {
    if (!f.cls || f.kind === 'entry') continue;
    if (f.kind === 'tile') {
      zip.file('content/Tiles/' + f.cls + '.png', await canvasBlob(texCanvas('tile', f.cls, meta.color)));
      zip.file('content/Tiles/' + f.cls + 'Item.png', await canvasBlob(texCanvas('tileitem', f.cls + 'Item', meta.color)));
    } else {
      const folder = f.kind === 'item' ? 'Items' : f.kind === 'npc' ? 'NPCs' : 'Projectiles';
      zip.file('content/' + folder + '/' + f.cls + '.png', await canvasBlob(texCanvas(f.kind, f.cls, meta.color)));
    }
  }
  // icon & dok
  zip.file('icon.png', await canvasBlob(await iconCanvas(128, meta)));
  zip.file('icon_small.png', await canvasBlob(await iconCanvas(64, meta)));
  zip.file('description.md', '# ' + meta.name + '\n\n' + meta.summary + '\n\nDibuat dengan BLForge — mod JS untuk BunnyLoader 0.4.0 (format 2).\n');
  zip.file('license.md', 'All rights reserved — ' + meta.author + '\n');
  zip.file('changelog.md', '# Changelog\n\n## ' + meta.version + '\n- Build pertama (BLForge)\n');

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = meta.id + '-' + meta.version + '.bl';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  SFX.play('export');
  toast('✔ ' + a.download + ' terdownload (' + res.count + ' object). Taruh di folder mods BunnyLoader 0.4.0.');
}

// ---------- tabs / UI wiring ----------
function switchTab(tab) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-' + tab));
}

function initUI() {
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { switchTab(b.dataset.tab); SFX.play('tick'); });
  document.querySelectorAll('.mode-switch .pill').forEach(p => p.onclick = () => setMode(p.dataset.mode));
  $('btnExport').onclick = exportBL;
  $('btnHelp').onclick = () => { $('helpModal').classList.add('on'); SFX.play('tick'); };
  $('helpClose').onclick = () => $('helpModal').classList.remove('on');
  $('helpModal').onclick = e => { if (e.target === $('helpModal')) $('helpModal').classList.remove('on'); };
  $('btnSfx').onclick = () => {
    SFX.enabled = !SFX.enabled;
    $('btnSfx').textContent = SFX.enabled ? '🔊' : '🔇';
    $('btnSfx').classList.toggle('muted', !SFX.enabled);
    if (SFX.enabled) SFX.play('ping');
  };
  $('panelToggle').onclick = () => { $('side').classList.toggle('open'); SFX.play('tick'); };
  ['f_name', 'f_author', 'f_version', 'f_summary', 'f_cat', 'f_color'].forEach(id => {
    $(id).addEventListener('input', () => { drawIconPrev(); refreshAll(); });
  });
  document.querySelectorAll('button.btn').forEach(b => {
    b.addEventListener('mouseenter', () => SFX.play('hover'));
    b.addEventListener('click', () => { if (b.id !== 'btnExport') SFX.play('tap'); });
  });
  drawIconPrev();
}

function drawIconPrev() {
  const meta = readMeta();
  iconCanvas(72, meta).then(cv => {
    const ctx = $('iconPrev').getContext('2d');
    ctx.clearRect(0, 0, 72, 72);
    ctx.drawImage(cv, 0, 0);
  });
}

// ---------- bg particles ----------
function initBg() {
  const cv = $('bgfx'), g = cv.getContext('2d');
  let W, H; const P = [];
  function rs() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
  rs(); addEventListener('resize', rs);
  for (let i = 0; i < 64; i++) P.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 2.2 + 0.6, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, a: Math.random() * 0.5 + 0.15 });
  (function loop() {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#37e6a5';
    P.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      g.globalAlpha = p.a * 0.5;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
    });
    g.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();
}

// ---------- boot ----------
window.addEventListener('load', () => {
  try {
    initBlockly();
    if (!loadWS()) loadDemo();
    initUI();
    initBg();
    refreshAll();
  } catch (e) {
    document.body.innerHTML = '<div style="padding:30px;font-family:sans-serif;color:#fff">Gagal init: <pre>' + (e && e.stack || e) + '</pre></div>';
  }
});
