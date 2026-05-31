import { GT } from './GameText.js';

// Purchasable weapons. Each character starts with a free base weapon (bonus: 0).
// stat: 'atk' for warriors, 'mag' for mages/healers.
// buyPrice correlates linearly with bonus magnitude.

export const WEAPON_DEFS = {

  // ── Hero 1 (Warrior) — boosts ATK ────────────────────────────────────
  hero1Weapon1: {
    id: 'hero1Weapon1', get name() { return GT.hero1weapon1; },
    forId: 'hero1Role', stat: 'atk', bonus: 0,
    buyPrice: 0,
    get description() { return GT.hero1weapon1Desc; }
  },
  hero1Weapon2: {
    id: 'hero1Weapon2', get name() { return GT.hero1weapon2; },
    forId: 'hero1Role', stat: 'atk', bonus: 8,
    buyPrice: 155,
    get description() { return GT.hero1weapon2Desc; }
  },
  hero1Weapon3: {
    id: 'hero1Weapon3', get name() { return GT.hero1weapon3; },
    forId: 'hero1Role', stat: 'atk', bonus: 18,
    buyPrice: 485,
    get description() { return GT.hero1weapon3Desc; }
  },

  // ── Hero 2 (White Mage) — boosts MAG (scales heals) ──────────────────
  hero2Weapon1: {
    id: 'hero2Weapon1', get name() { return GT.hero2weapon1; },
    forId: 'hero2Role', stat: 'mag', bonus: 0,
    buyPrice: 0,
    get description() { return GT.hero2weapon1Desc; }
  },
  hero2Weapon2: {
    id: 'hero2Weapon2', get name() { return GT.hero2weapon2; },
    forId: 'hero2Role', stat: 'mag', bonus: 7,
    buyPrice: 155,
    get description() { return GT.hero2weapon2Desc; }
  },
  hero2Weapon3: {
    id: 'hero2Weapon3', get name() { return GT.hero2weapon3; },
    forId: 'hero2Role', stat: 'mag', bonus: 16,
    buyPrice: 445,
    get description() { return GT.hero2weapon3Desc; }
  },

  // ── Hero 3 (Black Mage) — boosts MAG ─────────────────────────────────
  hero3Weapon1: {
    id: 'hero3Weapon1', get name() { return GT.hero3weapon1; },
    forId: 'hero3Role', stat: 'mag', bonus: 0,
    buyPrice: 0,
    get description() { return GT.hero3weapon1Desc; }
  },
  hero3Weapon2: {
    id: 'hero3Weapon2', get name() { return GT.hero3weapon2; },
    forId: 'hero3Role', stat: 'mag', bonus: 8,
    buyPrice: 175,
    get description() { return GT.hero3weapon2Desc; }
  },
  hero3Weapon3: {
    id: 'hero3Weapon3', get name() { return GT.hero3weapon3; },
    forId: 'hero3Role', stat: 'mag', bonus: 18,
    buyPrice: 535,
    get description() { return GT.hero3weapon3Desc; }
  }
};

// Weapons grouped by character for shop display — reads GT at call time.
export function getWeaponsByChar() {
  return [
    { heroId: 'hero1Role', heroName: GT.hero1Name, heroClass: GT.hero1Class, weapons: ['hero1Weapon1', 'hero1Weapon2', 'hero1Weapon3'] },
    { heroId: 'hero2Role',  heroName: GT.hero2Name, heroClass: GT.hero2Class, weapons: ['hero2Weapon1', 'hero2Weapon2', 'hero2Weapon3'] },
    { heroId: 'hero3Role',    heroName: GT.hero3Name, heroClass: GT.hero3Class, weapons: ['hero3Weapon1', 'hero3Weapon2', 'hero3Weapon3'] },
  ];
}
