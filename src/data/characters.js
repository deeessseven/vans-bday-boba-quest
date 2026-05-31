export const CHARACTER_DEFS = {
  hero1Role: {
    id: 'hero1Role',
    name: 'Hero 1',
    class: 'Warrior',
    color: 0x4488ff,
    baseStats: { hp: 120, mp: 40, atk: 18, def: 14, mag: 6, spd: 10 },
    growths:   { hp: 24,  mp: 3,  atk: 3,  def: 2,  mag: 1, spd: 1 },
    spells: ['mend', 'awaken'],
    weaponId: 'hero1Weapon1',
    armor: 'Chain Mail'
  },
  hero2Role: {
    id: 'hero2Role',
    name: 'Hero 2',
    class: 'White Mage',
    color: 0xffee44,
    baseStats: { hp: 90, mp: 80, atk: 10, def: 10, mag: 18, spd: 12 },
    growths:   { hp: 18, mp: 13, atk: 1,  def: 2,  mag: 3,  spd: 1 },
    spells: ['mend', 'heal', 'enchant', 'revive'],
    weaponId: 'hero2Weapon1',
    armor: 'Linen Robe'
  },
  hero3Role: {
    id: 'hero3Role',
    name: 'Hero 3',
    class: 'Black Mage',
    color: 0xaa44ff,
    baseStats: { hp: 80, mp: 80, atk: 8, def: 6, mag: 22, spd: 14 },
    growths:   { hp: 11, mp: 15, atk: 1, def: 1, mag: 4,  spd: 2 },
    spells: ['fire', 'ice', 'thunder', 'quake'],
    weaponId: 'hero3Weapon1',
    armor: 'Cloth Robe'
  }
};

export function createHero(defId) {
  const def = CHARACTER_DEFS[defId];
  return {
    ...def,
    spells: [...def.spells],
    level: 1,
    exp: 0,
    expNext: 100,
    maxHp: def.baseStats.hp,
    maxMp: def.baseStats.mp,
    hp: def.baseStats.hp,
    mp: def.baseStats.mp,
    atk: def.baseStats.atk,
    def: def.baseStats.def,
    mag: def.baseStats.mag,
    spd: def.baseStats.spd,
    weaponId:    def.weaponId,   // current equipped weapon key
    weaponBonus: 0,              // stat bonus currently applied above base
    status: 'normal' // normal | poison | sleep | dead
  };
}

export function levelUp(hero) {
  if (hero.level >= 99) return hero;
  const def = CHARACTER_DEFS[hero.id];
  hero.level++;
  hero.expNext = Math.floor(hero.expNext * 1.26);

  const g = def.growths;
  hero.maxHp  += g.hp  + Math.floor(Math.random() * 4);
  hero.maxMp  += g.mp  + Math.floor(Math.random() * 3);
  hero.atk    += g.atk + (Math.random() < 0.5 ? 1 : 0);
  hero.def    += g.def + (Math.random() < 0.4 ? 1 : 0);
  hero.mag    += g.mag + (Math.random() < 0.5 ? 1 : 0);
  hero.spd    += g.spd + (Math.random() < 0.3 ? 1 : 0);

  hero.hp = hero.maxHp;
  hero.mp = hero.maxMp;
  return hero;
}
