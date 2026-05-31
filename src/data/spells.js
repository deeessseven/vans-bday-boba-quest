export const SPELL_DEFS = {
  fire: {
    id: 'fire', name: 'Flame', mpCost: 8,
    type: 'damage', element: 'fire',
    power: 1.5, target: 'single',
    color: 0xff4400, description: 'Deals fire damage to one enemy'
  },
  ice: {
    id: 'ice', name: 'Snow', mpCost: 8,
    type: 'damage', element: 'ice',
    power: 1.5, target: 'single',
    color: 0x88eeff, description: 'Deals ice damage to one enemy'
  },
  thunder: {
    id: 'thunder', name: 'Thunder', mpCost: 8,
    type: 'damage', element: 'lightning',
    power: 1.5, target: 'single',
    color: 0xffff00, description: 'Deals lightning damage to one enemy'
  },
  quake: {
    id: 'quake', name: 'Quake', mpCost: 30, levelReq: 5,
    type: 'damage', element: 'earth',
    power: 2.5, target: 'all',
    color: 0x0088ff, description: 'Deals heavy earth damage to ALL enemies'
  },
  mend: {
    id: 'mend', name: 'Mend', mpCost: 8,
    type: 'heal', power: 12,
    target: 'single_ally',
    color: 0x88ff88, description: 'Restores a little HP to one ally'
  },
  heal: {
    id: 'heal', name: 'Heal', mpCost: 15,
    type: 'heal', power: 36,
    target: 'single_ally',
    color: 0x44ff44, description: 'Restores more HP to one ally. Removes Poison & Sleep'
  },
  enchant: {
    id: 'enchant', name: 'Enchant', mpCostPercent: 0.12,
    type: 'mp_transfer', amountPercent: 0.10,
    target: 'single_ally',
    color: 0xffffaa, description: 'Gives {mpGive} of own MP to one ally'
  },
  awaken: {
    id: 'awaken', name: 'Awaken', mpCost: 10,
    type: 'revive', healPercent: 0.3, mpRestorePercent: 0.3,
    target: 'single_ally',
    color: 0xffffff, description: 'Revives a knocked out (KO\'d) ally with 30% HP & MP'
  },
  revive: {
    id: 'revive', name: 'Revive', mpCost: 30,
    type: 'revive', healPercent: 0.5, mpRestorePercent: 0.5,
    target: 'all_ally',
    color: 0xffffcc, description: 'Revives ALL allies with 50% HP & MP'
  },
  hero1Special2: {
    id: 'hero1Special2', name: 'Blade Storm', mpCost: 7, levelReq: 3,
    type: 'hero1Special2', power: 2.0,
    target: 'all',
    color: 0x88ccff, description: 'Deals 2x damage to ALL enemies'
  },
  hero1Special1: {
    id: 'hero1Special1', name: 'Charged Attack', mpCost: 0,
    type: 'hero1Special1',
    target: 'self',
    color: 0xffaa00, description: 'Skips turn, next normal Attack deals 3x damage'
  },
  hero1Special3: {
    id: 'hero1Special3', name: 'Counterattack', mpCost: 5, levelReq: 7,
    type: 'hero1Special3',
    target: 'self',
    color: 0xff8844, description: 'Dodges attacks, if any, this turn and strikes back 3x damage'
  },
  hero3Special2: {
    id: 'hero3Special2', name: 'Dark Calm', mpCostPercent: 0.25, levelReq: 4,
    type: 'hero3Special2',
    target: 'all_ally',
    color: 0xaa66ff, description: 'Heals ALL allies by 15% of max HP & MP'
  },
  hero2Special2: {
    id: 'hero2Special2', name: 'Light Blast', mpCost: 5, levelReq: 2,
    type: 'hero2Special2', power: 1.0,
    target: 'all',
    color: 0xffffaa, description: 'Deals magic damage to ALL enemies'
  },
  hero2Special1: {
    id: 'hero2Special1', name: 'Mana Meditation', mpCost: 0,
    type: 'hero2Special1',
    target: 'self',
    color: 0x88ccff, description: 'Skips turn to restore 25% max MP'
  },
  hero2Special3: {
    id: 'hero2Special3', name: 'Illuminated Drain', mpCostPercent: 0.65, levelReq: 6,
    type: 'hero2Special3', percent: 0.20,
    target: 'all',
    color: 0xffeeaa, description: 'Drains ~20% of max HP & MP from ALL enemies'
  },
  hero2Special4: {
    id: 'hero2Special4', name: 'Recuperative Bliss', mpCostPercent: 0.25, levelReq: 8,
    type: 'hero2Special4',
    target: 'all_ally',
    color: 0x88ffcc, description: 'ALL allies gain non-stackable 23% HP & MP each turn'
  },
  hero3Special1: {
    id: 'hero3Special1', name: 'Dispel', mpCost: 5,
    type: 'hero3Special1',
    target: 'all_ally',
    color: 0xaaffee, description: 'Removes Poison & Sleep from ALL allies'
  },
  hero1Special4: {
    id: 'hero1Special4', name: 'Rising Sun', mpCost: 0, hpCostPercent: 0.65, levelReq: 10,
    type: 'hero1Special4', power: 7.0,
    target: 'all',
    color: 0xffdd88, description: '7x damage to ALL enemies. ALL allies immune this turn.'
  },
  hero3Special3: {
    id: 'hero3Special3', name: 'Sorcery Flash', mpCostPercent: 0.45, levelReq: 9,
    type: 'hero3Special3',
    target: 'all',
    color: 0xff88ff, description: "Halves HP, MP, & dodge % for ALL enemies. Can't KO enemies"
  }
};

// Special lists per hero (shown in the Special panel)
export const HERO_SPECIALS = {
  hero1Role: ['hero1Special1', 'hero1Special2', 'hero1Special3', 'hero1Special4'],
  hero2Role: ['hero2Special1', 'hero2Special2', 'hero2Special3', 'hero2Special4'],
  hero3Role: ['hero3Special1', 'hero3Special2', 'hero3Special3']
};

// Enemy special actions
export const ENEMY_ACTIONS = {
  attack:              { name: 'Attack',       type: 'physical', power: 1.0 },
  smallEnemy2Attack1:  { name: 'Slash',        type: 'physical', power: 1.4 },
  mediumEnemy1Attack2: { name: 'Heavy Slash',  type: 'physical', power: 1.4 },
  mediumEnemy1Attack1: { name: 'Power Strike', type: 'physical', power: 1.6, effect: 'poison' },
  bigEnemy1Attack1:    { name: 'Rock Slam',    type: 'physical', power: 1.8 },
  bigEnemy1Attack2:    { name: 'Energy Ray',   type: 'magic',    power: 2.0 },
  bigEnemy1Attack3:    { name: 'Sticky Trap',  type: 'special', effect: 'stuck', target: 'single' },
  boss3SpecialAttack1: { name: 'Tapioca Trap', type: 'special', effect: 'stuck', target: 'all', mpCost: 35 },

  // Boss 1
  boss1MagicAttack1:    { name: 'Raging Roar',           type: 'magic',    power: 2.8, target: 'all', mpCost: 21 },
  boss1MagicAttack2:    { name: 'Growling Breath',        type: 'magic',    power: 1.8, effect: 'sleep', mpCost: 20 },
  boss1PhysicalAttack1: { name: 'Claw Strike',            type: 'physical', power: 2.8 },
  boss1SpecialAttack1:  { name: 'Lion Mane Entanglement', type: 'special',  effect: 'stuck', target: 'all', mpCost: 3 },

  // Boss 2
  boss2PhysicalAttack1: { name: 'Scaly Slash',        type: 'physical', power: 2.2, effect: 'poison' },
  boss2MagicAttack1:    { name: 'Draco Ray',           type: 'magic',    power: 2.0, target: 'all', mpCost: 12 },
  boss2SpecialAttack1:  { name: 'Inferno Heat Stroke', type: 'special',  effect: 'stuck', target: 'all', mpCost: 8 },
  boss2PhysicalAttack2: { name: 'Tail Strike',         type: 'physical', power: 2.8, target: 'all', mpCost: 30 },
  boss2MagicAttack2:    { name: "Drake's Breath",      type: 'magic',    power: 1.8, effect: 'sleep', mpCost: 3 },

  // Boss aura skills (one-time use each)
  boss1Drain: { name: "Den's Intimidation", type: 'boss_aura', auraId: 'boss1', drainPct: 0.30 },
  boss2Drain: { name: 'Draconic Drain',     type: 'boss_aura', auraId: 'boss2', drainPct: 0.31 },
  boss3Drain: { name: 'Pearl Pain',         type: 'boss_aura', auraId: 'boss3', drainPct: 0.32 },

  // Boss 3
  boss3MagicAttack1:    { name: 'Black Sugar Rush',  type: 'magic',    power: 2.4, target: 'all', mpCost: 50, effect: 'poison' },
  boss3MagicAttack2:    { name: 'Milk Tea Tsunami',  type: 'magic',    power: 2.9, target: 'all', mpCost: 75 },
  boss3PhysicalAttack1: { name: 'Straw Strike',      type: 'physical', power: 2.8 },
  boss3MagicAttack3:    { name: 'Boba Coma',         type: 'magic',    power: 2.0, effect: 'sleep', mpCost: 25 },
  boss3MagicAttack4:    { name: 'Bubble Breath',     type: 'magic',    power: 2.2, effect: 'sleep', mpCost: 50 }
};
