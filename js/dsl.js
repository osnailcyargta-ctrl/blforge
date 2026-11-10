// BLForge — DSL parser + emitter JS mod BunnyLoader 0.4.0 (format 2, QuickJS)
// API patterns diverifikasi dari paket Split (split.bl) yang jalan di 0.4.0.

const DSL = {};

// ---------- tabel referensi ----------
DSL.MAT = {
  wood: 9, stone: 3, gel: 23, lens: 43, torch: 8,
  ironbar: 22, copperbar: 21, silverbar: 20, goldbar: 19,
  ironore: 14, copperore: 12, silverore: 15, goldore: 16,
  dirt: 0, sand: 169, clay: 40,
};
DSL.STATION = { workbench: 18, anvil: 16, furnace: 17, hellforge: 77, altar: 26, bookcase: 101, crystalball: 125 };
DSL.RARE = {
  white: 'White', blue: 'Blue', green: 'Green', orange: 'Orange', lightred: 'LightRed',
  pink: 'Pink', lightpurple: 'LightPurple', lime: 'Lime', yellow: 'Yellow', cyan: 'Cyan',
  red: 'Red', purple: 'Purple', rainbow: 'Rainbow',
};
DSL.NPC_AI = { slime: 1, walker: 3, flyer: 6, bat: 14, worm: 2 };
DSL.PROJ_AI = { straight: 0, arrow: 1, boomerang: 3, falling: 2 };

// ---------- parser ----------
// AST: {t:'case',kind,name,body:[...]} {t:'ev',name,body:[]}
//      {t:'if',cond,body,elif:{cond,body}|null,else:null|[]}
//      {t:'cmd',name,args,line}
DSL.parse = function (text) {
  const errors = [];
  const raw = String(text || '').split('\n');
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    let s = raw[i], inStr = false, cut = s.length;
    for (let j = 0; j < s.length; j++) {
      const ch = s[j];
      if (ch === '"') inStr = !inStr;
      else if (ch === '#' && !inStr) { cut = j; break; }
    }
    s = s.slice(0, cut).replace(/\t/g, '    ');
    const ind = (s.match(/^ */) || [''])[0].length;
    s = s.trim();
    if (s) lines.push({ ind, s, n: i + 1 });
  }

  function parseBody(pos, indent) {
    const nodes = [];
    while (pos < lines.length) {
      const L = lines[pos];
      if (L.ind < indent) break;
      if (L.ind > indent) { errors.push({ line: L.n, msg: 'indentasi aneh: "' + L.s + '"' }); pos++; continue; }

      let m;
      if ((m = L.s.match(/^(item|npc|proj|tile)\s+([A-Za-z0-9_]+?):?$/))) {
        const node = { t: 'case', kind: m[1], name: m[2], body: [], line: L.n };
        const sub = parseBody(pos + 1, deeper(lines, pos));
        node.body = sub.nodes; pos = sub.pos;
        nodes.push(node); continue;
      }
      if (/^world:?/.test(L.s) && (L.s === 'world:' || L.s === 'world')) {
        const node = { t: 'case', kind: 'world', name: '', body: [], line: L.n };
        const sub = parseBody(pos + 1, deeper(lines, pos));
        node.body = sub.nodes; pos = sub.pos;
        nodes.push(node); continue;
      }
      if ((m = L.s.match(/^on\s+(\w+):?$/))) {
        const node = { t: 'ev', name: m[1], body: [], line: L.n };
        const sub = parseBody(pos + 1, deeper(lines, pos));
        node.body = sub.nodes; pos = sub.pos;
        nodes.push(node); continue;
      }
      if ((m = L.s.match(/^if\s+(.+?):$/))) {
        const node = { t: 'if', cond: m[1], body: [], elif: null, else: null, line: L.n };
        const sub = parseBody(pos + 1, deeper(lines, pos));
        node.body = sub.nodes; pos = sub.pos;
        while (pos < lines.length && lines[pos].ind === indent) {
          const L2 = lines[pos];
          let m2;
          if ((m2 = L2.s.match(/^elif\s+(.+?):$/))) {
            const e = { t: 'if', cond: m2[1], body: [], elif: null, else: null, line: L2.n };
            const s2 = parseBody(pos + 1, deeper(lines, pos));
            e.body = s2.nodes; pos = s2.pos;
            if (!node.elif) node.elif = e; else { let tail = node.elif; while (tail.elif) tail = tail.elif; tail.elif = e; }
            continue;
          }
          if (/^else:?/.test(L2.s) && L2.s.replace(/:$/, '') === 'else') {
            const s2 = parseBody(pos + 1, deeper(lines, pos));
            node.else = s2.nodes; pos = s2.pos;
            continue;
          }
          break;
        }
        nodes.push(node); continue;
      }
      // command
      const sp = L.s.indexOf(' ');
      let name = sp < 0 ? L.s : L.s.slice(0, sp);
      name = name.replace(/:$/, '');
      const args = sp < 0 ? '' : L.s.slice(sp + 1).trim();
      nodes.push({ t: 'cmd', name, args, line: L.n });
      pos++;
    }
    return { nodes, pos };
  }
  function deeper(lines, pos) {
    return pos + 1 < lines.length && lines[pos + 1].ind > lines[pos].ind ? lines[pos + 1].ind : 9999;
  }
  const root = parseBody(0, 0);
  return { cases: root.nodes.filter(n => n.t === 'case'), errors, stray: root.nodes.filter(n => n.t !== 'case') };
};

// ---------- emitter ----------
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
function num(v, dflt) { const n = Number(v); return Number.isFinite(n) ? n : dflt; }

const SIG = {
  NewDust: "Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)']",
  AddLight: "Terraria.Lighting['void AddLight(Vector2 position, float r, float g, float b)']",
  NewText: "Terraria.Main['void NewText(string newText, byte R, byte G, byte B, bool onlyCurrentPlayer)']",
  NewNPC: "Terraria.NPC['int NewNPC(IEntitySource source, int X, int Y, int Type, int Start, float ai0, float ai1, float ai2, float ai3, int Target)']",
  DropCommon: "Terraria.GameContent.ItemDropRules.ItemDropRule['IItemDropRule Common(int itemId, int chanceDenominator, int minimumDropped, int maximumDropped)']",
};

function makeFile(name) {
  return { name, used: {}, out: [] };
}
function use(f, k) { f.used[k] = true; }
function header(f) {
  const parts = ['// Generated by BLForge — BunnyLoader 0.4.0 (format 2)'];
  if (f.used.NewDust) parts.push('const NewDust = ' + SIG.NewDust + ';');
  if (f.used.AddLight) parts.push('const AddLight = ' + SIG.AddLight + ';');
  if (f.used.NewText) parts.push('const NewText = ' + SIG.NewText + ';');
  if (f.used.NewNPC) parts.push('const NewNPC = ' + SIG.NewNPC + ';');
  if (f.used.DropCommon) parts.push('const DropCommon = ' + SIG.DropCommon + ';');
  if (f.used.rand) parts.push('const BLFrand = (a, b) => a + Math.random() * (b - a);');
  return parts.join('\n');
}

// ---------- expresi ----------
function ctxExpr(ctx) {
  // {what, ent}
  if (ctx.what === 'npc') return { ent: 'npc', hp: '(Number(npc.life) / Math.max(1, Number(npc.lifeMax)))', life: 'Number(npc.life)' };
  if (ctx.what === 'proj') return { ent: 'proj', hp: '(Number(proj.timeLeft) / 600)', life: 'Number(proj.timeLeft)' };
  if (ctx.what === 'item') return { ent: 'player', hp: '(Number(player.statLife) / Math.max(1, Number(player.statLifeMax2)))', life: 'Number(player.statLife)' };
  return { ent: null, hp: '1', life: '1' };
}

DSL.translateExpr = function (expr, ctx) {
  const c = ctxExpr(ctx);
  const strs = [];
  let s = String(expr).replace(/"([^"]*)"|'([^']*)'/g, m => { strs.push(m); return '\u0001' + (strs.length - 1) + '\u0001'; });
  s = s.replace(/\band\b/gi, '&&').replace(/\bor\b/gi, '||').replace(/\bnot\s+/gi, '! ');
  s = s.replace(/\bsqrt\s*\(/gi, 'Math.sqrt(').replace(/\babs\s*\(/gi, 'Math.abs(')
       .replace(/\bmin\s*\(/gi, 'Math.min(').replace(/\bmax\s*\(/gi, 'Math.max(')
       .replace(/\bsin\s*\(/gi, 'Math.sin(').replace(/\bcos\s*\(/gi, 'Math.cos(')
       .replace(/\brandom\s*\(/gi, 'BLFrand(');
  // protect member access setelah titik: .statLife .X dst.
  s = s.replace(/\.([A-Za-z_][A-Za-z0-9_]*)/g, '.\u0002$1');
  s = s.replace(/\bhp\b/gi, c.hp).replace(/\blife\b/gi, c.life)
       .replace(/\btime\b/gi, 'Number(Terraria.Main.time)')
       .replace(/\bday\b/gi, '(Number(Terraria.Main.dayTime) !== 0)')
       .replace(/\bnight\b/gi, '(Number(Terraria.Main.dayTime) === 0)')
       .replace(/\btrue\b/gi, 'true').replace(/\bfalse\b/gi, 'false');
  s = s.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, word, off) => {
    const prev = off > 0 ? s[off - 1] : '';
    if (prev === '.' || prev === '\u0002') return m; // anggota object, jangan diubah
    if (/^(v|player|npc|proj|item|info|position|velocity|type|damage|knockBack|npcLoot|hitDirection|Math|BLFrand|Terraria|Number|true|false|null|NewDust|NewText|AddLight|NewNPC|DropCommon)$/.test(m)) return m;
    return 'v.' + m;
  });
  s = s.replace(/\u0002([A-Za-z0-9_]*)/g, '$1');
  s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => strs[Number(i)]);
  return s;
};

function resolveItemId(name) {
  const s = String(name).trim().replace(/^["']|["']$/g, '');
  if (/^\d+$/.test(s)) return String(Number(s));
  const k = s.toLowerCase().replace(/\s+/g, '');
  if (DSL.MAT[k] !== undefined) return String(DSL.MAT[k]);
  return 'ModContent.ItemType("' + s.replace(/[^A-Za-z0-9_]/g, '') + '")';
}

// ---------- perintah ----------
function emitCmd(node, ctx, f, out, indent) {
  const pad = '    '.repeat(indent);
  const c = ctxExpr(ctx);
  const E = c.ent; // 'player' | 'npc' | 'proj' | null
  const ent = E;   // nama var entitas
  const needEnt = ['dust', 'light', 'heal', 'hurt', 'dash', 'spawn'].includes(node.name);
  if (needEnt && !E) { f.err.push({ line: node.line, msg: '"' + node.name + '" butuh event punya entitas (bukan di world)' }); out.push(pad + '// BLForge: skip "' + node.name + '" (tidak ada entitas)'); return; }

  switch (node.name) {
    case 'dust': {
      const a = node.args.match(/^(\d+)\s+(\d+)(?:\s+speed\s+([\d.]+))?/i);
      if (!a) { f.err.push({ line: node.line, msg: 'dust N id [speed N]' }); break; }
      use(f, 'NewDust');
      const sp = num(a[3], 3);
      out.push(pad + 'for (let i = 0; i < ' + a[1] + '; i++) {');
      out.push(pad + '    NewDust(' + ent + '.Center, ' + ent + '.width, ' + ent + '.height, ' + a[2] + ',');
      out.push(pad + '        (Math.random() - 0.5) * ' + sp + ', (Math.random() - 0.5) * ' + sp + ', 0, Color.new(255, 255, 255, 255), 1);');
      out.push(pad + '}');
      break;
    }
    case 'light': {
      const a = node.args.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
      if (!a) { f.err.push({ line: node.line, msg: 'light r g b (0..1)' }); break; }
      use(f, 'AddLight');
      out.push(pad + 'AddLight(' + ent + '.Center, ' + a[1] + ', ' + a[2] + ', ' + a[3] + ');');
      break;
    }
    case 'say': {
      const m = node.args.match(/^"(.*)"/) || node.args.match(/^'(.*)'/);
      const t = m ? m[1] : node.args;
      use(f, 'NewText');
      out.push(pad + 'NewText("' + esc(t) + '", 255, 255, 255, false);');
      break;
    }
    case 'dash': {
      if (ctx.what !== 'item') { f.err.push({ line: node.line, msg: 'dash cuma di item on use/shoot' }); break; }
      const p = num(node.args, 10);
      out.push(pad + '{');
      out.push(pad + '    const ddx = Number(Terraria.Main.MouseWorld.X) - Number(player.MountedCenter.X);');
      out.push(pad + '    const ddy = Number(Terraria.Main.MouseWorld.Y) - Number(player.MountedCenter.Y);');
      out.push(pad + '    const dlen = Math.max(0.001, Math.sqrt(ddx * ddx + ddy * ddy));');
      out.push(pad + '    player.velocity = Vector2.new(ddx / dlen * ' + p + ', ddy / dlen * ' + p + ');');
      out.push(pad + '}');
      break;
    }
    case 'heal': case 'hurt': {
      const n = num(node.args, 0) * (node.name === 'hurt' ? -1 : 1);
      if (ctx.what === 'proj') { f.err.push({ line: node.line, msg: node.name + ' gak berlaku di proj' }); break; }
      if (ctx.what === 'npc') out.push(pad + ent + '.life = Math.min(Number(' + ent + '.lifeMax), Number(' + ent + '.life) + ' + n + ');');
      else out.push(pad + ent + '.statLife = Math.min(Number(' + ent + '.statLifeMax2), Number(' + ent + '.statLife) + ' + n + ');');
      break;
    }
    case 'dash2': break;
    case 'drop': {
      if (!(ctx.what === 'npc' && ctx.ev === 'death')) { f.err.push({ line: node.line, msg: 'drop cuma di npc on death' }); break; }
      const a = node.args.match(/^"([^"]+)"(?:\s+(\d+)\s+(\d+))?/) || node.args.match(/^'([^']+)'(?:\s+(\d+)\s+(\d+))?/);
      if (!a) { f.err.push({ line: node.line, msg: 'drop "Item" min max' }); break; }
      use(f, 'DropCommon');
      const id = resolveItemId(a[1]);
      const mn = num(a[2], 1), mx = num(a[3], mn);
      out.push(pad + 'npcLoot.Add(DropCommon(' + id + ', 1, ' + mn + ', ' + mx + '));');
      break;
    }
    case 'spawn': {
      const a = node.args.match(/^(\d+)(?:\s+(\d+))?/);
      if (!a) { f.err.push({ line: node.line, msg: 'spawn <npcID vanilla> [jumlah]' }); break; }
      use(f, 'NewNPC');
      const cnt = num(a[2], 1);
      out.push(pad + 'for (let i = 0; i < ' + cnt + '; i++) {');
      out.push(pad + '    NewNPC(' + ent + '.GetSource_FromAI(), Math.floor(Number(' + ent + '.Center.X)), Math.floor(Number(' + ent + '.Center.Y)), ' + a[1] + ', 0);');
      out.push(pad + '}');
      break;
    }
    case 'rate': {
      if (!(ctx.what === 'npc' && ctx.ev === 'spawn')) { f.err.push({ line: node.line, msg: 'rate cuma di npc on spawn' }); break; }
      ctx.spawnRate = num(node.args, 0);
      break;
    }
    case 'set': {
      const a = node.args.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
      if (!a) { f.err.push({ line: node.line, msg: 'set nama nilai' }); break; }
      out.push(pad + 'v.' + a[1] + ' = ' + DSL.translateExpr(a[2], ctx) + ';');
      break;
    }
    case 'return': {
      out.push(pad + 'return ' + DSL.translateExpr(node.args || 'true', ctx) + ';');
      break;
    }
    default:
      f.err.push({ line: node.line, msg: 'command gak dikenal: "' + node.name + '"' });
      out.push(pad + '// BLForge: command gak dikenal: ' + node.name);
  }
}

function emitBody(nodes, ctx, f, out, indent) {
  out.push('    '.repeat(indent) + 'const v = {};');
  for (const n of nodes) {
    if (n.t === 'cmd') { emitCmd(n, ctx, f, out, indent); continue; }
    if (n.t === 'if') { emitIf(n, ctx, f, out, indent); continue; }
    if (n.t === 'ev' || n.t === 'case') { f.err.push({ line: n.line, msg: '"' + (n.name || n.kind) + '" gak boleh di dalam event' }); continue; }
  }
}

function emitIf(node, ctx, f, out, indent) {
  const pad = '    '.repeat(indent);
  out.push(pad + 'if (' + DSL.translateExpr(node.cond, ctx) + ') {');
  emitInner(node.body, ctx, f, out, indent + 1);
  let tail = node.elif;
  while (tail) {
    out.push(pad + '} else if (' + DSL.translateExpr(tail.cond, ctx) + ') {');
    emitInner(tail.body, ctx, f, out, indent + 1);
    tail = tail.elif;
  }
  if (node.else) {
    out.push(pad + '} else {');
    emitInner(node.else, ctx, f, out, indent + 1);
  }
  out.push(pad + '}');
}
function emitInner(nodes, ctx, f, out, indent) {
  for (const n of nodes) {
    if (n.t === 'cmd') emitCmd(n, ctx, f, out, indent);
    else if (n.t === 'if') emitIf(n, ctx, f, out, indent);
    else f.err.push({ line: n.line, msg: 'nested "' + (n.name || n.kind) + '" di dalam if belum didukung' });
  }
}

// ---------- case → file ----------
DSL.emitCase = function (cs, meta) {
  const f = makeFile(cs.name || 'World');
  f.err = [];
  const cls = cs.name || 'World';
  const lines = [];
  const evs = {};
  cs.body.forEach(n => {
    if (n.t === 'ev') evs[n.name] = (evs[n.name] || []).concat(n.body);
  });
  const props = cs.body.filter(n => n.t === 'cmd');

  if (cs.kind === 'world') return emitWorld(cs, meta, f);

  if (cs.kind === 'item') {
    use(f, 'none');
    lines.push('export class ' + cls + ' extends ModItem {');
    lines.push('    constructor() {');
    lines.push('        super();');
    lines.push("        this.Texture = 'Items/" + cls + "';");
    lines.push('    }');
    lines.push('');
    lines.push('    SetDefaults() {');
    lines.push('        const item = this.Item;');
    let hasRecipe = false, tooltip = '';
    for (const p of props) {
      const a = p.args;
      switch (p.name) {
        case 'damage': lines.push('        item.damage = ' + num(a, 10) + ';'); break;
        case 'usetime': lines.push('        item.useTime = ' + num(a, 20) + ';'); break;
        case 'useanimation': lines.push('        item.useAnimation = ' + num(a, 20) + ';'); break;
        case 'knockback': lines.push('        item.knockBack = ' + num(a, 4) + ';'); break;
        case 'defense': lines.push('        item.defense = ' + num(a, 0) + ';'); break;
        case 'value': { const q = a.split(/\s+/).map(x => num(x, 0)); lines.push('        item.value = Terraria.Item.sellPrice(' + (q[0]||0) + ', ' + (q[1]||0) + ', ' + (q[2]||0) + ');'); break; }
        case 'rare': { const r = DSL.RARE[a.trim().toLowerCase()] || a.trim(); lines.push('        item.rare = ItemRarityID.' + r + ';'); break; }
        case 'size': { const q = a.split(/\s+/).map(x => num(x, 24)); lines.push('        item.width = ' + (q[0]||24) + ';'); lines.push('        item.height = ' + (q[1]||24) + ';'); break; }
        case 'maxstack': lines.push('        item.maxStack = ' + num(a, 99) + ';'); break;
        case 'sound': lines.push('        item.UseSound = SoundID.Item' + num(a, 1) + ';'); break;
        case 'autoswing': lines.push('        item.autoReuse = true;'); break;
        case 'material': lines.push('        item.material = true;'); break;
        case 'shoot': lines.push('        item.shoot = ModContent.ProjectileType("' + a.replace(/[^A-Za-z0-9_]/g, '') + '");'); break;
        case 'shootspeed': lines.push('        item.shootSpeed = ' + num(a, 10) + ';'); break;
        case 'tooltip': tooltip = a; lines.push('        // tooltip: ' + a); break;
        case 'recipe': hasRecipe = p; break;
        case 'speed': break;
        default: f.err.push({ line: p.line, msg: 'prop item gak dikenal: "' + p.name + '"' });
      }
    }
    lines.push('    }');
    if (hasRecipe) {
      const m = hasRecipe.args.match(/^:?\s*(.*?)\s*@\s*([a-zA-Z]+)/);
      const cntM = hasRecipe.args.match(/\bx\s*(\d+)\s*$/);
      const ings = m ? m[1] : hasRecipe.args;
      const st = m ? m[2].toLowerCase() : 'workbench';
      const cnt = cntM ? num(cntM[1], 1) : 1;
      lines.push('');
      lines.push('    AddRecipes() {');
      lines.push('        this.CreateRecipe(' + cnt + ')');
      ings.split(',').forEach(g => {
        g = g.trim(); if (!g) return;
        const im = g.match(/^(.*?)\s*(?:x\s*(\d+))?$/i);
        const nm = (im[1] || '').trim().replace(/^["']|["']$/g, '');
        const q = num(im[2], 1);
        lines.push('            .AddIngredient(' + resolveItemId(nm) + (q > 1 ? ', ' + q : '') + ')');
      });
      lines.push('            .AddTile(' + (DSL.STATION[st] !== undefined ? DSL.STATION[st] : num(st, 18)) + ')');
      lines.push('            .Register();');
      lines.push('    }');
    }
    if (evs.use) {
      lines.push('');
      lines.push('    CanUseItem(item, player) {');
      emitBody(evs.use, { what: 'item', ev: 'use' }, f, lines, 2);
      lines.push('        return true;');
      lines.push('    }');
    }
    if (evs.shoot) {
      lines.push('');
      lines.push('    Shoot(item, player, position, velocity, type, damage, knockBack) {');
      emitBody(evs.shoot, { what: 'item', ev: 'shoot' }, f, lines, 2);
      lines.push('        return true;');
      lines.push('    }');
    }
    lines.push('}');
  }

  if (cs.kind === 'npc') {
    lines.push('export class ' + cls + ' extends ModNPC {');
    lines.push('    constructor() {');
    lines.push('        super();');
    lines.push("        this.Texture = 'NPCs/" + cls + "';");
    lines.push('    }');
    lines.push('');
    const boss = props.some(p => p.name === 'boss');
    if (boss) {
      lines.push('    SetStaticDefaults() {');
      lines.push('        Terraria.Main.npcSlots[this.Type] = 10;');
      lines.push('        this.Banner = this.Type;');
      lines.push('    }');
      lines.push('');
    }
    lines.push('    SetDefaults() {');
    lines.push('        const npc = this.NPC;');
    let ai = 1, spawnCh = null;
    for (const p of props) {
      const a = p.args;
      switch (p.name) {
        case 'life': lines.push('        npc.lifeMax = ' + num(a, 50) + ';'); break;
        case 'damage': lines.push('        npc.damage = ' + num(a, 12) + ';'); break;
        case 'defense': lines.push('        npc.defense = ' + num(a, 5) + ';'); break;
        case 'kb': lines.push('        npc.knockBackResist = ' + num(a, 0.4) + ';'); break;
        case 'size': { const n = num(a, 24); lines.push('        npc.width = ' + n + ';'); lines.push('        npc.height = ' + n + ';'); break; }
        case 'boss': lines.push('        npc.boss = true;'); break;
        case 'aistyle': { const k = a.trim().toLowerCase(); ai = DSL.NPC_AI[k] !== undefined ? DSL.NPC_AI[k] : num(a, 1); lines.push('        npc.aiStyle = ' + ai + ';'); break; }
        case 'hitsound': lines.push('        npc.HitSound = SoundID.NPCHit' + num(a, 1) + ';'); break;
        case 'deathsound': lines.push('        npc.DeathSound = SoundID.NPCDeath' + num(a, 1) + ';'); break;
        case 'value': { const q = a.split(/\s+/).map(x => num(x, 0)); lines.push('        npc.value = ModNPC.NPCValue(' + (q[0]||0) + ', ' + (q[1]||0) + ', ' + (q[2]||0) + ');'); break; }
        case 'spawnchance': spawnCh = num(a, 0); break;
        default: f.err.push({ line: p.line, msg: 'prop npc gak dikenal: "' + p.name + '"' });
      }
    }
    lines.push('    }');
    if (evs.ai) {
      lines.push('');
      lines.push('    AI(npc) {');
      emitBody(evs.ai, { what: 'npc', ev: 'ai' }, f, lines, 2);
      lines.push('    }');
    }
    if (evs.death) {
      const drops = evs.death.filter(n => n.t === 'cmd' && n.name === 'drop');
      const rest = evs.death.filter(n => !(n.t === 'cmd' && n.name === 'drop'));
      if (drops.length) {
        lines.push('');
        lines.push('    ModifyNPCLoot(npcLoot) {');
        emitInner(drops, { what: 'npc', ev: 'death' }, f, lines, 2);
        lines.push('    }');
      }
      if (rest.length) {
        lines.push('');
        lines.push('    HitEffect(npc, hitDirection, damage) {');
        lines.push('        if (npc.life > 0) {');
        lines.push('            return;');
        lines.push('        }');
        emitInner(rest, { what: 'npc', ev: 'death' }, f, lines, 2);
        lines.push('    }');
      }
    }
    if (evs.spawn || spawnCh !== null) {
      lines.push('');
      lines.push('    SpawnChance(info) {');
      const ctx = { what: 'npc', ev: 'spawn' };
      if (evs.spawn) {
        emitInner(evs.spawn, ctx, f, lines, 2);
        // skip invalid cmds (dust dll.) — err dicatat
      }
      lines.push('        return ' + (ctx.spawnRate !== undefined ? ctx.spawnRate : (spawnCh !== null ? spawnCh : 0)) + ';');
      lines.push('    }');
    }
    lines.push('}');
  }

  if (cs.kind === 'proj') {
    lines.push('export class ' + cls + ' extends ModProjectile {');
    lines.push('    constructor() {');
    lines.push('        super();');
    lines.push("        this.Texture = 'Projectiles/" + cls + "';");
    lines.push('    }');
    lines.push('');
    lines.push('    SetDefaults(proj) {');
    lines.push('        proj.friendly = true;');
    lines.push('        proj.hostile = false;');
    for (const p of props) {
      const a = p.args;
      switch (p.name) {
        case 'damage': lines.push('        proj.damage = ' + num(a, 15) + ';'); break;
        case 'speed': lines.push('        // speed: ' + a + ' (kecepatan dari item.shootSpeed)'); break;
        case 'size': { const n = num(a, 16); lines.push('        proj.width = ' + n + ';'); lines.push('        proj.height = ' + n + ';'); break; }
        case 'pierce': lines.push('        proj.penetrate = ' + num(a, 1) + ';'); break;
        case 'aistyle': { const k = a.trim().toLowerCase(); lines.push('        proj.aiStyle = ' + (DSL.PROJ_AI[k] !== undefined ? DSL.PROJ_AI[k] : num(a, 0)) + ';'); break; }
        case 'light': lines.push('        proj.light = ' + num(a, 0.5) + ';'); break;
        case 'timeleft': lines.push('        proj.timeLeft = ' + num(a, 600) + ';'); break;
        case 'gravity': lines.push('        // gravity: ' + a + ' (gravitasi tergantung aiStyle)'); break;
        case 'notilecollide': lines.push('        proj.tileCollide = ' + (!/^off$/i.test(a.trim()) ? 'false' : 'true') + ';'); break;
        default: f.err.push({ line: p.line, msg: 'prop proj gak dikenal: "' + p.name + '"' });
      }
    }
    lines.push('    }');
    if (evs.ai) {
      lines.push('');
      lines.push('    AI(proj) {');
      emitBody(evs.ai, { what: 'proj', ev: 'ai' }, f, lines, 2);
      lines.push('    }');
    }
    lines.push('}');
  }

  if (cs.kind === 'tile') {
    lines.push('export class ' + cls + ' extends ModTile {');
    lines.push('    constructor() {');
    lines.push('        super();');
    lines.push("        this.Texture = 'Tiles/" + cls + "';");
    lines.push('    }');
    lines.push('');
    lines.push('    SetStaticDefaults() {');
    let solid = true, mc = null, hard = 50, lightWarn = null;
    for (const p of props) {
      const a = p.args;
      switch (p.name) {
        case 'solid': solid = !/^off$/i.test(a.trim()); break;
        case 'hardness': hard = num(a, 50); break;
        case 'mapcolor': { const q = a.split(/\s+/).map(x => num(x, 128)); mc = q; break; }
        case 'light': lightWarn = a; break;
        default: f.err.push({ line: p.line, msg: 'prop tile gak dikenal: "' + p.name + '"' });
      }
    }
    lines.push('        Terraria.Main.tileSolid[this.Type] = ' + solid + ';');
    lines.push('        this.MinPick = ' + hard + ';');
    lines.push('        this.MineResist = ' + Math.max(0, Math.min(15, hard / 25)) + ';');
    if (mc) lines.push('        this.AddMapEntry(Color.new(' + mc[0] + ', ' + mc[1] + ', ' + mc[2] + ', 255));');
    if (lightWarn) f.err.push({ line: 0, msg: 'tile light belum didukung (skip): ' + lightWarn });
    lines.push('    }');
    lines.push('}');
    lines.push('');
    lines.push('export class ' + cls + 'Item extends ModItem {');
    lines.push('    constructor() {');
    lines.push('        super();');
    lines.push("        this.Texture = 'Tiles/" + cls + "Item';");
    lines.push('    }');
    lines.push('');
    lines.push('    SetDefaults() {');
    lines.push('        const item = this.Item;');
    lines.push('        this.DefaultToPlaceableTile(ModContent.TileType("' + cls + '"));');
    lines.push('        item.width = 12;');
    lines.push('        item.height = 12;');
    lines.push('    }');
    lines.push('}');
  }

  f.name = cls;
  f.path = 'content/Code/' + cs.kind.charAt(0).toUpperCase() + cs.kind.slice(1) + '/' + cls + '.js';
  f.content = header(f) + '\n\n' + lines.join('\n') + '\n';
  return f;
};

function emitWorld(cs, meta, f) {
  const lines = [];
  lines.push('// Generated by BLForge — entry mod');
  lines.push('export default class ' + meta.cls + ' extends Mod {');
  lines.push('    PostSetupContent() {');
  lines.push("        bl.log('" + esc(meta.name) + ' v' + esc(meta.version) + " loaded');");
  // event "on load:" di dalam case world
  const evs = {};
  cs.body.forEach(n => { if (n.t === 'ev') evs[n.name] = (evs[n.name] || []).concat(n.body); });
  const loadBody = (evs.load || []).concat(evs.start || []);
  const ctx = { what: 'world', ev: 'load' };
  emitInner(loadBody, ctx, f, lines, 2);
  lines.push('    }');
  lines.push('}');
  f.name = meta.cls;
  f.path = 'content/main.js';
  f.content = header(f) + '\n\n' + lines.join('\n') + '\n';
  return f;
}

// ---------- emit seluruh mod ----------
DSL.emitMod = function (cases, meta) {
  const files = [];
  const errors = [];
  const seen = {};
  let worldFile = null;
  let count = 0;
  for (const cs of cases) {
    if (cs.kind !== 'world') {
      if (!cs.name) { errors.push({ line: cs.line, msg: 'case tanpa nama' }); continue; }
      if (seen[cs.name]) { errors.push({ line: cs.line, msg: 'nama dobel: ' + cs.name }); continue; }
      seen[cs.name] = true;
    }
    const f = DSL.emitCase(cs, meta);
    (f.err || []).forEach(e => errors.push(e));
    if (f.path === 'content/main.js') { worldFile = f; continue; }
    files.push({ path: f.path, content: f.content, cls: f.name, kind: cs.kind });
    count++;
  }
  if (!worldFile) {
    worldFile = emitWorld({ body: [] }, meta, makeFile('Main'));
    (worldFile.err || []).forEach(e => errors.push(e));
  }
  files.unshift({ path: 'content/main.js', content: worldFile.content, cls: meta.cls, kind: 'entry' });
  return { files, errors, count };
};
