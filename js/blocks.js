// BLForge — definisi blok Blockly + serializer blok → DSL
// Semua blok "line" punya previousStatement/nextStatement (chaining).
// Blok value = expression atom untuk kondisi.

const BLF = { blocks: {} };

BLF.CAT = {
  mod:  '#5c6f93', item: '#ff8f4d', npc: '#ff5d7a',
  proj: '#4da3ff', tile: '#9d7bff', fx: '#37e6a5', logic: '#ffd166',
};

// ---------- helpers ----------
function line(name, msg, colour, fields) {
  Blockly.Blocks[name] = {
    init() {
      this.setColour(colour);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      const inp = this.appendDummyInput();
      inp.appendField(msg);
      (fields || []).forEach(f => {
        if (f.d) inp.appendField(new Blockly.FieldDropdown(f.d), f.n);
        else if (f.t) inp.appendField(new Blockly.FieldTextInput(String(f.t)), f.n);
        else inp.appendField(new Blockly.FieldNumber(f.v !== undefined ? f.v : 0, f.min, f.max, f.step), f.n);
      });
      this.setTooltip(msg);
    }
  };
}
function val(name, msg, colour, out, fields) {
  Blockly.Blocks[name] = {
    init() {
      this.setColour(colour);
      this.setOutput(true, out);
      const inp = this.appendDummyInput();
      inp.appendField(msg);
      (fields || []).forEach(f => {
        if (f.d) inp.appendField(new Blockly.FieldDropdown(f.d), f.n);
        else if (f.t) inp.appendField(new Blockly.FieldTextInput(String(f.t)), f.n);
        else inp.appendField(new Blockly.FieldNumber(f.v !== undefined ? f.v : 0, f.min, f.max, f.step), f.n);
      });
    }
  };
}

// ---------- CASE (easy) ----------
Blockly.Blocks['case_block'] = {
  init() {
    this.setColour(BLF.CAT.mod);
    this.appendDummyInput()
      .appendField('CASE')
      .appendField(new Blockly.FieldDropdown([['item','item'],['npc','npc'],['proj','proj'],['tile','tile'],['world','world']]), 'KIND')
      .appendField(new Blockly.FieldTextInput('MyThing'), 'NAME');
    this.appendStatementInput('DO').setCheck(null);
    this.setTooltip('Satu case = satu object mod (class).');
  }
};
Blockly.Blocks['case_code'] = {
  init() {
    this.setColour('#33415e');
    this.appendDummyInput()
      .appendField('CASE')
      .appendField(new Blockly.FieldDropdown([['item','item'],['npc','npc'],['proj','proj'],['tile','tile'],['world','world']]), 'KIND')
      .appendField(new Blockly.FieldTextInput('MyThing'), 'NAME');
    this.appendDummyInput('CODEIN')
      .appendField(new Blockly.FieldMultilineInput('damage 10\n'), 'CODE');
    this.setTooltip('Case hardmode: tulis DSL langsung. Dok lengkap di tab Dok.');
    this.setDeletable(true);
  }
};
Blockly.Blocks['blf_comment'] = {
  init() {
    this.setColour(BLF.CAT.mod);
    this.appendDummyInput().appendField('📝 catatan')
      .appendField(new Blockly.FieldTextInput('...'), 'T');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};

// ---------- ITEM props ----------
line('it_damage',  'damage',        BLF.CAT.item, [{n:'N', v:10, min:0}]);
line('it_usetime', 'use time',      BLF.CAT.item, [{n:'N', v:20, min:1}]);
line('it_useanim', 'use animation', BLF.CAT.item, [{n:'N', v:20, min:1}]);
line('it_knockback','knockback',    BLF.CAT.item, [{n:'N', v:4, min:0, step:0.5}]);
line('it_defense', 'defense',       BLF.CAT.item, [{n:'N', v:0, min:0}]);
line('it_value',   'value (g s c)', BLF.CAT.item, [{n:'G', v:0, min:0},{n:'S', v:0, min:0},{n:'C', v:0, min:0}]);
line('it_rare',    'rare',          BLF.CAT.item, [{n:'R', d:[['white','white'],['blue','blue'],['green','green'],['orange','orange'],['light red','lightred'],['pink','pink'],['light purple','lightpurple'],['lime','lime'],['yellow','yellow'],['cyan','cyan'],['red','red'],['rainbow','rainbow']]}]);
line('it_size',    'size (w h)',    BLF.CAT.item, [{n:'W', v:24, min:4},{n:'H', v:24, min:4}]);
line('it_maxstack','max stack',     BLF.CAT.item, [{n:'N', v:99, min:1}]);
line('it_sound',   'use sound #',   BLF.CAT.item, [{n:'N', v:1, min:1, max:105}]);
line('it_autoswing','autoswing',    BLF.CAT.item, []);
line('it_material','material',      BLF.CAT.item, []);
line('it_shoot',   'shoot proj',    BLF.CAT.item, [{n:'P', t:'MyShot'},{n:'S', v:10, min:0, step:0.5}]);
line('it_tooltip', 'tooltip',       BLF.CAT.item, [{n:'T', t:'...'}]);
line('it_recipe',  'recipe',        BLF.CAT.item, [
  {n:'ING', t:'ironbar x10'},
  {n:'ST',  d:[['workbench','workbench'],['anvil','anvil'],['furnace','furnace'],['hellforge','hellforge'],['altar','altar'],['bookcase','bookcase'],['crystal ball','crystalball']]},
  {n:'CNT', v:1, min:1}
]);
Blockly.Blocks['ev_use'] = {
  init() { this.setColour(BLF.CAT.item);
    this.appendDummyInput().appendField('⟳ on use');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};
Blockly.Blocks['ev_shoot'] = {
  init() { this.setColour(BLF.CAT.item);
    this.appendDummyInput().appendField('☄ on shoot');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};

// ---------- NPC ----------
line('npc_life',    'life',          BLF.CAT.npc, [{n:'N', v:50, min:1}]);
line('npc_damage',  'damage',        BLF.CAT.npc, [{n:'N', v:12, min:0}]);
line('npc_defense', 'defense',       BLF.CAT.npc, [{n:'N', v:5, min:0}]);
line('npc_kb',      'knockback resist', BLF.CAT.npc, [{n:'N', v:0.4, min:0, max:1, step:0.1}]);
line('npc_size',    'size',          BLF.CAT.npc, [{n:'N', v:24, min:8}]);
line('npc_boss',    'boss',          BLF.CAT.npc, []);
line('npc_aistyle', 'ai style',      BLF.CAT.npc, [{n:'A', d:[['slime','slime'],['walker','walker'],['flyer','flyer'],['bat','bat'],['worm','worm'],['angka…','custom']]}]);
line('npc_aistyle2','ai style #',    BLF.CAT.npc, [{n:'N', v:1, min:0}]);
line('npc_hitsound','hit sound #',   BLF.CAT.npc, [{n:'N', v:1, min:1, max:65}]);
line('npc_deathsound','death sound #', BLF.CAT.npc, [{n:'N', v:1, min:1, max:65}]);
line('npc_value',   'value (g s c)', BLF.CAT.npc, [{n:'G', v:0, min:0},{n:'S', v:0, min:0},{n:'C', v:0, min:0}]);
line('npc_spawnchance','spawn chance 0..1', BLF.CAT.npc, [{n:'F', v:0.03, min:0, max:1, step:0.01}]);
Blockly.Blocks['ev_ai'] = {
  init() { this.setColour(BLF.CAT.npc);
    this.appendDummyInput().appendField('🧠 on ai');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};
Blockly.Blocks['ev_death'] = {
  init() { this.setColour(BLF.CAT.npc);
    this.appendDummyInput().appendField('☠ on death (drop/efek)');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};
Blockly.Blocks['ev_spawn'] = {
  init() { this.setColour(BLF.CAT.npc);
    this.appendDummyInput().appendField('✦ on spawn (rate)');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};

// ---------- PROJ ----------
line('pj_damage', 'damage',  BLF.CAT.proj, [{n:'N', v:15, min:0}]);
line('pj_speed',  'speed',   BLF.CAT.proj, [{n:'N', v:10, min:0, step:0.5}]);
line('pj_size',   'size',    BLF.CAT.proj, [{n:'N', v:16, min:4}]);
line('pj_pierce', 'pierce (-1 nembus terus)', BLF.CAT.proj, [{n:'N', v:1, min:-1}]);
line('pj_aistyle','ai style',BLF.CAT.proj, [{n:'A', d:[['straight','straight'],['arrow','arrow'],['boomerang','boomerang'],['falling','falling'],['angka…','custom']]}]);
line('pj_aistyle2','ai style #', BLF.CAT.proj, [{n:'N', v:0, min:0}]);
line('pj_light',  'light 0..1', BLF.CAT.proj, [{n:'N', v:0.5, min:0, max:1, step:0.1}]);
line('pj_timeleft','time left (tick)', BLF.CAT.proj, [{n:'N', v:600, min:1}]);
Blockly.Blocks['pj_gravity'] = {
  init() { this.setColour(BLF.CAT.proj);
    this.appendDummyInput().appendField('gravity')
      .appendField(new Blockly.FieldCheckbox('TRUE'), 'ON');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};
Blockly.Blocks['pj_notilecollide'] = {
  init() { this.setColour(BLF.CAT.proj);
    this.appendDummyInput().appendField('nembus tile')
      .appendField(new Blockly.FieldCheckbox('TRUE'), 'ON');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};
Blockly.Blocks['ev_pai'] = {
  init() { this.setColour(BLF.CAT.proj);
    this.appendDummyInput().appendField('🧠 on ai');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};

// ---------- TILE ----------
Blockly.Blocks['tl_solid'] = {
  init() { this.setColour(BLF.CAT.tile);
    this.appendDummyInput().appendField('solid')
      .appendField(new Blockly.FieldCheckbox('TRUE'), 'ON');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  }
};
line('tl_hardness',  'hardness (pick power)', BLF.CAT.tile, [{n:'N', v:50, min:0}]);
line('tl_mapcolor',  'map color r g b', BLF.CAT.tile, [{n:'R', v:60, min:0, max:255},{n:'G', v:230, min:0, max:255},{n:'B', v:170, min:0, max:255}]);
line('tl_light',     'light r g b',     BLF.CAT.tile, [{n:'R', v:0, min:0, max:1, step:0.1},{n:'G', v:0, min:0, max:1, step:0.1},{n:'B', v:0, min:0, max:1, step:0.1}]);

// ---------- FX / CMD ----------
line('cmd_dust',  'dust',  BLF.CAT.fx, [{n:'N', v:8, min:1},{n:'ID', v:6, min:1},{n:'SP', v:3, min:0, step:0.5}]);
line('cmd_light', 'light', BLF.CAT.fx, [{n:'R', v:1, min:0, max:1, step:0.1},{n:'G', v:1, min:0, max:1, step:0.1},{n:'B', v:1, min:0, max:1, step:0.1}]);
line('cmd_say',   'say',   BLF.CAT.fx, [{n:'T', t:'Hello!'}]);
line('cmd_dash',  'dash power', BLF.CAT.fx, [{n:'N', v:10, min:1, max:40}]);
line('cmd_heal',  'heal',  BLF.CAT.fx, [{n:'N', v:20, min:1}]);
line('cmd_hurt',  'hurt',  BLF.CAT.fx, [{n:'N', v:5, min:1}]);
line('cmd_drop',  'drop',  BLF.CAT.fx, [{n:'I', t:'MyItem'},{n:'MN', v:1, min:1},{n:'MX', v:1, min:1}]);
line('cmd_spawn', 'spawn npc id', BLF.CAT.fx, [{n:'ID', v:1, min:1},{n:'N', v:1, min:1}]);
line('cmd_rate',  'rate 0..1', BLF.CAT.fx, [{n:'F', v:0.05, min:0, max:1, step:0.01}]);
line('cmd_set',   'set var', BLF.CAT.fx, [{n:'K', t:'x'},{n:'V', t:'0'}]);

// ---------- LOGIC ----------
Blockly.Blocks['ctrl_if'] = {
  init() { this.setColour(BLF.CAT.logic);
    this.appendValueInput('COND').setCheck(null).appendField('if');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null); this.setNextStatement(true, null);
    this.appendDummyInput('TAILIN').appendField(new Blockly.FieldDropdown([['—','none'],['+ else','else'],['+ elif','elif']]), 'TAIL')
      .appendField('', 'PAD');
    this.updateShape_();
  },
  mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('tail', this.getFieldValue('TAIL')); return c; },
  domToMutation(xml) { this.updateShape_(xml.getAttribute('tail') || 'none'); },
  updateShape_(tail) {
    this.removeInput('COND2', true); this.removeInput('DO2', true); this.removeInput('ELSEDO', true);
    if (tail === 'elif') {
      this.appendValueInput('COND2').setCheck(null).appendField('elif');
      this.appendStatementInput('DO2');
    } else if (tail === 'else') {
      this.appendStatementInput('ELSEDO').appendField('else');
    }
  }
};
val('val_num', '', BLF.CAT.logic, 'Number', [{n:'N', t:'0'}]);
val('val_text', '', BLF.CAT.logic, 'String', [{n:'T', t:'teks'}]);
val('val_hp',   'hp (0..1)', BLF.CAT.logic, 'Boolean', []);
val('val_life', 'life',      BLF.CAT.logic, 'Number', []);
val('val_time', 'time',      BLF.CAT.logic, 'Number', []);
val('val_day',  'day?',      BLF.CAT.logic, 'Boolean', []);
val('val_night','night?',    BLF.CAT.logic, 'Boolean', []);
val('val_var',  'var',       BLF.CAT.logic, null, [{n:'K', t:'x'}]);
val('val_cmp',  '', BLF.CAT.logic, 'Boolean', [{n:'A', t:'hp'},{n:'OP', d:[['<','<'],['>','>'],['<=','<='],['>=','>='],['==','=='],['!=','!=']]},{n:'B', t:'0.5'}]);
val('val_math', '', BLF.CAT.logic, 'Number', [{n:'A', t:'1'},{n:'OP', d:[['+','+'],['-','-'],['×','*'],['÷','/']]},{n:'B', t:'1'}]);
val('val_logic','', BLF.CAT.logic, 'Boolean', [{n:'A', t:'hp > 0.5'},{n:'OP', d:[['and','and'],['or','or']]},{n:'B', t:'night'}]);
val('val_not',  'not', BLF.CAT.logic, 'Boolean', [{n:'A', t:'night'}]);
val('val_random','random', BLF.CAT.logic, 'Number', [{n:'A', t:'0'},{n:'B', t:'1'}]);
val('val_func', '', BLF.CAT.logic, 'Number', [{n:'F', d:[['sqrt','sqrt'],['abs','abs'],['min','min'],['max','max'],['sin','sin'],['cos','cos']]},{n:'A', t:'x'},{n:'B', t:'y'}]);

// ---------- TOOLBOX ----------
BLF.toolboxEasy = { kind: 'categoryToolbox', contents: [
  { kind:'category', name:'MOD', colour:BLF.CAT.mod, contents:[
    { kind:'label', text:'1 case = 1 object' },
    { kind:'block', type:'case_block' },
    { kind:'block', type:'blf_comment' } ]},
  { kind:'category', name:'ITEM', colour:BLF.CAT.item, contents:[
    { kind:'block', type:'it_damage' },{ kind:'block', type:'it_usetime' },{ kind:'block', type:'it_useanim' },
    { kind:'block', type:'it_knockback' },{ kind:'block', type:'it_defense' },{ kind:'block', type:'it_value' },
    { kind:'block', type:'it_rare' },{ kind:'block', type:'it_size' },{ kind:'block', type:'it_maxstack' },
    { kind:'block', type:'it_sound' },{ kind:'block', type:'it_autoswing' },{ kind:'block', type:'it_material' },
    { kind:'block', type:'it_shoot' },{ kind:'block', type:'it_tooltip' },{ kind:'block', type:'it_recipe' },
    { kind:'sep', gap:'32' },
    { kind:'block', type:'ev_use' },{ kind:'block', type:'ev_shoot' } ]},
  { kind:'category', name:'NPC', colour:BLF.CAT.npc, contents:[
    { kind:'block', type:'npc_life' },{ kind:'block', type:'npc_damage' },{ kind:'block', type:'npc_defense' },
    { kind:'block', type:'npc_kb' },{ kind:'block', type:'npc_size' },{ kind:'block', type:'npc_boss' },
    { kind:'block', type:'npc_aistyle' },{ kind:'block', type:'npc_aistyle2' },{ kind:'block', type:'npc_hitsound' },
    { kind:'block', type:'npc_deathsound' },{ kind:'block', type:'npc_value' },{ kind:'block', type:'npc_spawnchance' },
    { kind:'sep', gap:'32' },
    { kind:'block', type:'ev_ai' },{ kind:'block', type:'ev_death' },{ kind:'block', type:'ev_spawn' } ]},
  { kind:'category', name:'PROJ', colour:BLF.CAT.proj, contents:[
    { kind:'block', type:'pj_damage' },{ kind:'block', type:'pj_speed' },{ kind:'block', type:'pj_size' },
    { kind:'block', type:'pj_pierce' },{ kind:'block', type:'pj_aistyle' },{ kind:'block', type:'pj_aistyle2' },
    { kind:'block', type:'pj_light' },{ kind:'block', type:'pj_timeleft' },{ kind:'block', type:'pj_gravity' },
    { kind:'block', type:'pj_notilecollide' },
    { kind:'sep', gap:'32' },
    { kind:'block', type:'ev_pai' } ]},
  { kind:'category', name:'TILE', colour:BLF.CAT.tile, contents:[
    { kind:'block', type:'tl_solid' },{ kind:'block', type:'tl_hardness' },{ kind:'block', type:'tl_mapcolor' },{ kind:'block', type:'tl_light' } ]},
  { kind:'category', name:'AKSI / FX', colour:BLF.CAT.fx, contents:[
    { kind:'block', type:'cmd_dust' },{ kind:'block', type:'cmd_light' },{ kind:'block', type:'cmd_say' },
    { kind:'block', type:'cmd_dash' },{ kind:'block', type:'cmd_heal' },{ kind:'block', type:'cmd_hurt' },
    { kind:'block', type:'cmd_drop' },{ kind:'block', type:'cmd_spawn' },{ kind:'block', type:'cmd_rate' },
    { kind:'block', type:'cmd_set' } ]},
  { kind:'category', name:'LOGIKA', colour:BLF.CAT.logic, custom:'BLF_VALS', contents:[] },
]};

BLF.toolboxHard = { kind: 'categoryToolbox', contents: [
  { kind:'category', name:'CASE (code)', colour:'#33415e', contents:[
    { kind:'label', text:'isi pakai DSL — tab Dok' },
    { kind:'block', type:'case_code' } ]},
  { kind:'category', name:'MOD', colour:BLF.CAT.mod, contents:[
    { kind:'block', type:'blf_comment' } ]},
]};

// value blocks shortcut category (flyout auto via callbacks)
BLF.valFlyout = function(ws) {
  return [
    { kind:'label', text:'kondisi & expresi' },
    { kind:'block', type:'ctrl_if' },
    { kind:'sep', gap:'24' },
    { kind:'block', type:'val_cmp' },{ kind:'block', type:'val_math' },{ kind:'block', type:'val_logic' },
    { kind:'block', type:'val_not' },
    { kind:'sep', gap:'24' },
    { kind:'block', type:'val_hp' },{ kind:'block', type:'val_life' },{ kind:'block', type:'val_time' },
    { kind:'block', type:'val_day' },{ kind:'block', type:'val_night' },
    { kind:'sep', gap:'24' },
    { kind:'block', type:'val_num' },{ kind:'block', type:'val_text' },{ kind:'block', type:'val_var' },
    { kind:'block', type:'val_random' },{ kind:'block', type:'val_func' },
  ];
};

// ---------- SERIALIZER: blok → DSL ----------
BLF.expr = function(block, inputName) {
  const v = block.getInputTargetBlock(inputName);
  return v ? BLF.exprOf(v) : 'true';
};
BLF.exprOf = function(b) {
  const F = (n, dflt) => (b.getFieldValue(n) !== null && b.getFieldValue(n) !== undefined ? b.getFieldValue(n) : (dflt || ''));
  switch (b.type) {
    case 'val_num':    return String(Number(F('N','0')) || 0);
    case 'val_text':   return '"' + F('T','') + '"';
    case 'val_hp':     return 'hp';
    case 'val_life':   return 'life';
    case 'val_time':   return 'time';
    case 'val_day':    return 'day';
    case 'val_night':  return 'night';
    case 'val_var':    return F('K','x');
    case 'val_cmp':    return F('A','0') + ' ' + F('OP','<') + ' ' + F('B','0');
    case 'val_math':   return '(' + F('A','0') + ' ' + F('OP','+') + ' ' + F('B','0') + ')';
    case 'val_logic':  return '(' + F('A','true') + ' ' + F('OP','and') + ' ' + F('B','true') + ')';
    case 'val_not':    return 'not (' + F('A','true') + ')';
    case 'val_random': return 'random(' + F('A','0') + ', ' + F('B','1') + ')';
    case 'val_func':   { const f=F('F','sqrt'); const a=F('A','x'); const bb=F('B','y');
                         return ['min','max'].includes(f) ? f+'('+a+', '+bb+')' : f+'('+a+')'; }
    default:           return 'true';
  }
};

BLF.LINE_TABLE = {
  it_damage:  b => 'damage ' + (b.getFieldValue('N')||0),
  it_usetime: b => 'usetime ' + (b.getFieldValue('N')||20),
  it_useanim: b => 'useanimation ' + (b.getFieldValue('N')||20),
  it_knockback: b => 'knockback ' + (b.getFieldValue('N')||0),
  it_defense: b => 'defense ' + (b.getFieldValue('N')||0),
  it_value:   b => 'value ' + b.getFieldValue('G') + ' ' + b.getFieldValue('S') + ' ' + b.getFieldValue('C'),
  it_rare:    b => 'rare ' + b.getFieldValue('R'),
  it_size:    b => 'size ' + b.getFieldValue('W') + ' ' + b.getFieldValue('H'),
  it_maxstack: b => 'maxstack ' + b.getFieldValue('N'),
  it_sound:   b => 'sound ' + b.getFieldValue('N'),
  it_autoswing: () => 'autoswing',
  it_material: () => 'material',
  it_shoot:   b => 'shoot ' + (b.getFieldValue('P')||'MyShot') + '\nshootspeed ' + (b.getFieldValue('S')||10),
  it_tooltip: b => 'tooltip "' + (b.getFieldValue('T')||'') + '"',
  it_recipe:  b => 'recipe: ' + (b.getFieldValue('ING')||'') + ' @ ' + b.getFieldValue('ST') + ' x' + b.getFieldValue('CNT'),
  npc_life:   b => 'life ' + b.getFieldValue('N'),
  npc_damage: b => 'damage ' + b.getFieldValue('N'),
  npc_defense:b => 'defense ' + b.getFieldValue('N'),
  npc_kb:     b => 'kb ' + b.getFieldValue('N'),
  npc_size:   b => 'size ' + b.getFieldValue('N'),
  npc_boss:   () => 'boss',
  npc_aistyle: b => b.getFieldValue('A') === 'custom' ? null : 'aistyle ' + b.getFieldValue('A'),
  npc_aistyle2: b => 'aistyle ' + b.getFieldValue('N'),
  npc_hitsound: b => 'hitsound ' + b.getFieldValue('N'),
  npc_deathsound: b => 'deathsound ' + b.getFieldValue('N'),
  npc_value:  b => 'value ' + b.getFieldValue('G') + ' ' + b.getFieldValue('S') + ' ' + b.getFieldValue('C'),
  npc_spawnchance: b => 'spawnchance ' + b.getFieldValue('F'),
  pj_damage:  b => 'damage ' + b.getFieldValue('N'),
  pj_speed:   b => 'speed ' + b.getFieldValue('N'),
  pj_size:    b => 'size ' + b.getFieldValue('N'),
  pj_pierce:  b => 'pierce ' + b.getFieldValue('N'),
  pj_aistyle: b => b.getFieldValue('A') === 'custom' ? null : 'aistyle ' + b.getFieldValue('A'),
  pj_aistyle2: b => 'aistyle ' + b.getFieldValue('N'),
  pj_light:   b => 'light ' + b.getFieldValue('N'),
  pj_timeleft: b => 'timeleft ' + b.getFieldValue('N'),
  pj_gravity: b => 'gravity' + (b.getFieldValue('ON') === 'TRUE' ? '' : ' off'),
  pj_notilecollide: b => 'notilecollide' + (b.getFieldValue('ON') === 'TRUE' ? '' : ' off'),
  tl_solid:   b => 'solid' + (b.getFieldValue('ON') === 'TRUE' ? '' : ' off'),
  tl_hardness: b => 'hardness ' + b.getFieldValue('N'),
  tl_mapcolor: b => 'mapcolor ' + b.getFieldValue('R') + ' ' + b.getFieldValue('G') + ' ' + b.getFieldValue('B'),
  tl_light:   b => 'light ' + b.getFieldValue('R') + ' ' + b.getFieldValue('G') + ' ' + b.getFieldValue('B'),
  cmd_dust:   b => 'dust ' + b.getFieldValue('N') + ' ' + b.getFieldValue('ID') + ' speed ' + b.getFieldValue('SP'),
  cmd_light:  b => 'light ' + b.getFieldValue('R') + ' ' + b.getFieldValue('G') + ' ' + b.getFieldValue('B'),
  cmd_say:    b => 'say "' + (b.getFieldValue('T')||'') + '"',
  cmd_dash:   b => 'dash ' + b.getFieldValue('N'),
  cmd_heal:   b => 'heal ' + b.getFieldValue('N'),
  cmd_hurt:   b => 'hurt ' + b.getFieldValue('N'),
  cmd_drop:   b => 'drop "' + (b.getFieldValue('I')||'') + '" ' + b.getFieldValue('MN') + ' ' + b.getFieldValue('MX'),
  cmd_spawn:  b => 'spawn ' + b.getFieldValue('ID') + ' ' + b.getFieldValue('N'),
  cmd_rate:   b => 'rate ' + b.getFieldValue('F'),
  cmd_set:    b => 'set ' + (b.getFieldValue('K')||'x') + ' ' + (b.getFieldValue('V')||'0'),
};

BLF.EVENT_NAMES = { ev_use:'use', ev_shoot:'shoot', ev_ai:'ai', ev_death:'death', ev_spawn:'spawn', ev_pai:'ai' };

BLF.chain = function(first, indent, out) {
  let b = first;
  while (b) {
    BLF.blockLine(b, indent, out);
    b = b.getNextBlock();
  }
};

BLF.blockLine = function(b, indent, out) {
  const pad = '  '.repeat(indent);
  if (b.type === 'blf_comment') { out.push(pad + '# ' + (b.getFieldValue('T')||'')); return; }
  if (BLF.LINE_TABLE[b.type]) {
    const l = BLF.LINE_TABLE[b.type](b);
    if (l) out.push(pad + l);
    return;
  }
  if (BLF.EVENT_NAMES[b.type]) {
    out.push(pad + 'on ' + BLF.EVENT_NAMES[b.type] + ':');
    BLF.chain(b.getInputTargetBlock('DO'), indent + 1, out);
    return;
  }
  if (b.type === 'ctrl_if') {
    out.push(pad + 'if ' + BLF.expr(b, 'COND') + ':');
    BLF.chain(b.getInputTargetBlock('DO'), indent + 1, out);
    const tail = b.getFieldValue('TAIL');
    if (tail === 'elif') {
      out.push(pad + 'elif ' + BLF.expr(b, 'COND2') + ':');
      BLF.chain(b.getInputTargetBlock('DO2'), indent + 1, out);
    } else if (tail === 'else') {
      out.push(pad + 'else:');
      BLF.chain(b.getInputTargetBlock('ELSEDO'), indent + 1, out);
    }
    return;
  }
};

// semua case top-level → array {kind, name, code, easy:boolean}
BLF.serializeCases = function(workspace) {
  const cases = [];
  workspace.getTopBlocks(true).forEach(b => {
    if (b.type === 'case_block') {
      const out = [];
      BLF.chain(b.getInputTargetBlock('DO'), 1, out);
      cases.push({ kind: b.getFieldValue('KIND'), name: b.getFieldValue('NAME'), code: out.join('\n'), easy: true, block: b });
    } else if (b.type === 'case_code') {
      const code = (b.getFieldValue('CODE') || '').split('\n').map(s => s.replace(/^  /, ' ')).join('\n');
      cases.push({ kind: b.getFieldValue('KIND'), name: b.getFieldValue('NAME'), code: code, easy: false, block: b });
    }
  });
  return cases;
};
