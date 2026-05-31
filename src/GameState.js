import { createHero, levelUp } from './data/characters.js';
import { ITEM_DEFS } from './data/items.js';
import { GT } from './data/GameText.js';

const SLOT_PREFIX     = 'genericQuest_save_slot_';
export const SLOT_COUNT = 10;

function defaultState() {
  return {
    party: [
      createHero('hero1Role'),
      createHero('hero2Role'),
      createHero('hero3Role')
    ],
    inventory: { potion: 1, hiPotion: 1, ether: 1, revivalDrop: 1, antidote: 1 },
    // Weapons the player has purchased (base weapons are free and pre-owned)
    ownedWeapons: ['hero1Weapon1', 'hero3Weapon1', 'hero2Weapon1'],
    gold: 200,
    progress: {
      boss1Defeated: false,  // true when Boss 1 is defeated
      boss2Defeated: false,  // true when Boss 2 is defeated
      boss3Defeated: false,  // true when final Boss 3 is defeated
      worldIntroSeen: false,
      l1TutorialSeen: false,
      l1GoFurtherHintSeen: false,
      l4TutorialSeen: false,
      l5TutorialSeen: false,
      l6TutorialSeen: false,
      floorsCleared: {}     // win counts per floor index
    },
    enemyMult: 1.5         // damage multiplier for all enemy attacks (Easy=0.85, Normal=1.5, Hard=2.0)
  };
}

export const GameState = {
  data: null,

  init() {
    this.data = defaultState();
    this._currentScene = 'WorldScene';
    this._currentFloor = undefined;
  },

  // ── Multi-slot save / load ────────────────────────────────────────────

  saveToSlot(n) {
    try {
      const floorNames = [GT.floorB1Name, GT.floorB2Name, GT.floorB3Name, GT.floorB4Name, GT.floorB5Name, GT.floorB6Name];
      const locationLabel =
        this._currentScene === 'DungeonScene' ? (floorNames[this._currentFloor] || GT.placeDungeon) :
        this._currentScene === 'TownScene'    ? GT.placeTown : GT.placeWorldMap;
      const payload = {
        ...this.data,
        _savedAt: Date.now(),
        _location: locationLabel,
        _savedAtScene: this._currentScene || 'WorldScene',
        _savedAtFloor: this._currentFloor
      };
      localStorage.setItem(`${SLOT_PREFIX}${n}`, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  },

  loadFromSlot(n) {
    try {
      const raw = localStorage.getItem(`${SLOT_PREFIX}${n}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // Capture return destination before stripping meta fields
      this._loadScene = parsed._savedAtScene || 'WorldScene';
      this._loadFloor = parsed._savedAtFloor;
      delete parsed._savedAt;
      delete parsed._location;
      delete parsed._savedAtScene;
      delete parsed._savedAtFloor;
      if (parsed.progress?.bossDefeated !== undefined && parsed.progress.boss3Defeated === undefined) {
        parsed.progress.boss3Defeated = parsed.progress.bossDefeated;
        delete parsed.progress.bossDefeated;
      }
      this.data = parsed;
      return true;
    } catch {
      return false;
    }
  },

  getSlotInfo(n) {
    try {
      const raw = localStorage.getItem(`${SLOT_PREFIX}${n}`);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return {
        slot:       n,
        party:      d.party.map(h => ({ name: h.name, level: h.level })),
        gold:       d.gold,
        location:   d._location || 'World Map',
        scene:      d._savedAtScene || 'WorldScene',
        floor:      d._savedAtFloor,
        savedAt:    d._savedAt || 0,
        difficulty: d.enemyMult ?? 1.5
      };
    } catch {
      return null;
    }
  },

  hasSave() {
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (localStorage.getItem(`${SLOT_PREFIX}${i}`)) return true;
    }
    return false;
  },

  get party() { return this.data.party; },
  get inventory() { return this.data.inventory; },
  get gold() { return this.data.gold; },
  get progress() { return this.data.progress; },
  get enemyMult() { return this.data.enemyMult ?? 1.5; },
  setDifficulty(mult) { this.data.enemyMult = mult; },
  getDifficultyLabel(mult) { const m = mult ?? this.enemyMult; return m <= 1.0 ? 'Easy' : m <= 1.5 ? 'Normal' : 'Hard'; },
  getDifficultyColor(mult) { const m = mult ?? this.enemyMult; return m <= 1.0 ? '#88ff88' : m <= 1.5 ? '#aaddff' : '#ffaaaa'; },

  addGold(amount) {
    this.data.gold = Math.max(0, this.data.gold + amount);
  },

  addItem(id, qty = 1) {
    this.data.inventory[id] = (this.data.inventory[id] || 0) + qty;
  },

  removeItem(id, qty = 1) {
    if (!this.data.inventory[id]) return false;
    this.data.inventory[id] -= qty;
    if (this.data.inventory[id] <= 0) delete this.data.inventory[id];
    return true;
  },

  getItemList() {
    return Object.entries(this.data.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: ITEM_DEFS[id], qty }));
  },

  healParty() {
    for (const hero of this.data.party) {
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
      hero.status = 'normal';
    }
  },

  reviveParty() {
    for (const hero of this.data.party) {
      if (hero.status === 'dead') hero.status = 'normal';
    }
  },

  isPartyAlive() {
    return this.data.party.some(h => h.status !== 'dead');
  },

  // ── Weapon ownership ─────────────────────────────────────────────────
  hasWeapon(id) {
    return (this.data.ownedWeapons || []).includes(id);
  },

  addWeapon(id) {
    if (!this.data.ownedWeapons) this.data.ownedWeapons = [];
    if (!this.data.ownedWeapons.includes(id)) this.data.ownedWeapons.push(id);
  },

  // Equip a weapon on a party member. Adjusts the relevant stat in-place.
  equipWeapon(heroIdx, weaponDef) {
    const hero = this.data.party[heroIdx];
    const oldBonus = hero.weaponBonus || 0;
    hero[weaponDef.stat] = hero[weaponDef.stat] - oldBonus + weaponDef.bonus;
    hero.weaponId    = weaponDef.id;
    hero.weaponBonus = weaponDef.bonus;
  },

  awardExp(expAmount, goldAmount) {
    const results = [];
    this.addGold(goldAmount);
    for (const hero of this.data.party) {
      if (hero.status === 'dead') continue;
      hero.exp += expAmount;
      let leveled = false;
      while (hero.exp >= hero.expNext) {
        if (hero.level >= 99) { hero.exp = 0; break; }
        hero.exp -= hero.expNext;
        levelUp(hero);
        leveled = true;
      }
      if (leveled) results.push({ hero, leveledUp: true });
    }
    return results;
  }
};
