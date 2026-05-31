export const ENEMY_DEFS = {
  smallEnemy1: {
    id: 'smallEnemy1',
    name: 'Enemy 1',
    color: 0x44cc44,
    hp: 80, maxHp: 80, mp: 0,
    atk: 18, def: 4, mag: 2, spd: 6,
    exp: 20, gold: 10,
    actions: ['attack'],
    weakTo: ['fire'],
    status: 'normal'
  },
  smallEnemy2: {
    id: 'smallEnemy2',
    name: 'Enemy 2',
    color: 0xff6622,
    hp: 120, maxHp: 120, mp: 10,
    atk: 21, def: 7, mag: 4, spd: 10,
    exp: 40, gold: 18,
    actions: ['attack', 'attack', 'smallEnemy2Attack1'],
    weakTo: ['ice'],
    status: 'normal'
  },
  mediumEnemy1: {
    id: 'mediumEnemy1',
    name: 'Enemy 3',
    color: 0x333366,
    hp: 240, maxHp: 240, mp: 20,
    atk: 25, def: 16, mag: 8, spd: 8,
    exp: 80, gold: 35,
    actions: ['attack', 'mediumEnemy1Attack2', 'mediumEnemy1Attack1'],
    weakTo: ['lightning'],
    status: 'normal'
  },
  bigEnemy1: {
    id: 'bigEnemy1',
    name: 'Enemy 4',
    color: 0x88ddff,
    hp: 400, maxHp: 400, mp: 30,
    atk: 28, def: 22, mag: 12, spd: 6,
    exp: 200, gold: 60,
    actions: ['attack', 'bigEnemy1Attack1', 'bigEnemy1Attack2', 'bigEnemy1Attack3'],
    weakTo: ['earth'],
    status: 'normal'
  },
  boss1: {
    id: 'boss1',
    name: 'Boss 1',
    color: 0xcc0000,
    hp: 1500, maxHp: 1500, mp: 200, maxMp: 200,
    atk: 70, def: 70, mag: 40, spd: 13,
    exp: 500, gold: 500,
    // boss_aura drain actions (boss1Drain etc.) are excluded from this pool —
    // BattleScene triggers them directly via _triggerBossAura(), not random selection.
    actions: ['attack', 'boss1MagicAttack1', 'boss1MagicAttack2', 'boss1PhysicalAttack1', 'boss1SpecialAttack1'],
    weakTo: ['fire'],
    dodgePct: 0.02,
    isBoss: true,
    status: 'normal'
  },
  boss2: {
    id: 'boss2',
    name: 'Boss 2',
    color: 0x44ccff,
    hp: 2000, maxHp: 2000, mp: 400, maxMp: 400,
    atk: 75, def: 75, mag: 50, spd: 14,
    exp: 600, gold: 1200,
    actions: ['attack', 'boss2PhysicalAttack1', 'boss2MagicAttack1', 'boss2SpecialAttack1', 'boss2PhysicalAttack2', 'boss2MagicAttack2'],
    weakTo: ['ice'],
    dodgePct: 0.75,
    isBoss: true,
    status: 'normal'
  },
  boss3: {
    id: 'boss3',
    name: 'Boss 3',
    color: 0x8800cc,
    hp: 3000, maxHp: 3000, mp: 600, maxMp: 600,
    atk: 80, def: 80, mag: 58, spd: 15,
    exp: 700, gold: 2500,
    actions: ['attack', 'boss3MagicAttack1', 'boss3MagicAttack2', 'boss3PhysicalAttack1', 'boss3MagicAttack3', 'boss3SpecialAttack1'],
    weakTo: ['lightning'],
    dodgePct: 0.50,
    isBoss: true,
    status: 'normal'
  }
};

// Weighted enemy pools per zone.
// B1: smallEnemy1 + smallEnemy2 equal.
// B2: smallEnemy1 rare, smallEnemy2 + mediumEnemy1.
// B3: no smallEnemy1, smallEnemy2 very rare (5%), mostly mediumEnemy1 + bigEnemy1.
export const ZONE_ENEMIES = {
  field:    [{ id: 'smallEnemy1', w: 3 }, { id: 'smallEnemy2', w: 3 }],
  dungeon1: [{ id: 'smallEnemy1', w: 3 }, { id: 'smallEnemy2', w: 3 }],
  dungeon2: [{ id: 'smallEnemy1', w: 1 }, { id: 'smallEnemy2', w: 3 }, { id: 'mediumEnemy1', w: 3 }],
  dungeon3: [{ id: 'smallEnemy2', w: 1 }, { id: 'mediumEnemy1', w: 9 }, { id: 'bigEnemy1', w: 10 }],
  dungeon4: [{ id: 'bigEnemy1', w: 3 }, { id: 'mediumEnemy1', w: 1 }],
  dungeon5: [{ id: 'bigEnemy1', w: 1 }],
  boss1:    [{ id: 'boss1', w: 1 }],
  boss2:    [{ id: 'boss2', w: 1 }],
  boss3:    [{ id: 'boss3', w: 1 }]
};

function weightedPick(pool) {
  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.w;
    if (r <= 0) return entry.id;
  }
  return pool[pool.length - 1].id;
}

export function cloneEnemy(id) {
  const def = ENEMY_DEFS[id];
  return { ...def, hp: def.maxHp, mp: def.mp ?? 0, maxMp: def.maxMp ?? def.mp ?? 0, status: 'normal' };
}

export function getRandomEncounter(zone, forceCount) {
  // B1 first battle: always one smallEnemy1
  if (zone === 'dungeon1' && forceCount === 1) {
    return [cloneEnemy('smallEnemy1')];
  }
  // B5: always 3 bigEnemy1s
  if (zone === 'dungeon5') {
    return [cloneEnemy('bigEnemy1'), cloneEnemy('bigEnemy1'), cloneEnemy('bigEnemy1')];
  }
  // B3: 20% chance of a full 3-bigEnemy1 encounter (3rd battle onwards)
  if (zone === 'dungeon3' && (forceCount === undefined || forceCount >= 3) && Math.random() < 0.20) {
    return [cloneEnemy('bigEnemy1'), cloneEnemy('bigEnemy1'), cloneEnemy('bigEnemy1')];
  }
  const pool = ZONE_ENEMIES[zone] || ZONE_ENEMIES.field;
  const isDungeon = zone.startsWith('dungeon');
  const count = forceCount !== undefined ? forceCount
    : zone.startsWith('boss') ? 1
    : zone === 'dungeon4' ? Math.floor(Math.random() * 2) + 2  // 2–3 for B4
    : isDungeon
    ? Math.floor(Math.random() * 3) + 1   // 1–3 for dungeon floors
    : Math.floor(Math.random() * 2) + 1;  // 1–2 for field
  const enemies = [];
  for (let i = 0; i < count; i++) {
    enemies.push(cloneEnemy(weightedPick(pool)));
  }
  return enemies;
}
