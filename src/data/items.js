export const ITEM_DEFS = {
  potion: {
    id: 'potion', name: 'Potion',
    buyPrice: 50, sellPrice: 25,
    type: 'heal', hp: 100,
    description: 'Restores 100 HP to one ally',
    target: 'single_ally', usableInBattle: true
  },
  hiPotion: {
    id: 'hiPotion', name: 'Hi-Potion',
    buyPrice: 75, sellPrice: 37,
    type: 'heal', hp: 200,
    description: 'Restores 200 HP to one ally',
    target: 'single_ally', usableInBattle: true
  },
  ether: {
    id: 'ether', name: 'Ether',
    buyPrice: 100, sellPrice: 50,
    type: 'mp', mp: 50,
    description: 'Restores 50 MP to one ally',
    target: 'single_ally', usableInBattle: true
  },
  revivalDrop: {
    id: 'revivalDrop', name: 'Revival Drop',
    buyPrice: 200, sellPrice: 100,
    type: 'revive', healPercent: 0.25, mpRestorePercent: 0.25,
    description: 'Revives a knocked out (KO\'d) ally with 25% HP & MP',
    target: 'single_ally', usableInBattle: true
  },
  antidote: {
    id: 'antidote', name: 'Antidote',
    buyPrice: 40, sellPrice: 20,
    type: 'cure_status', cures: ['poison'],
    description: 'Cures Poison',
    target: 'single_ally', usableInBattle: true
  },
};

export const SHOP_STOCK = {
  town: ['potion', 'hiPotion', 'ether', 'revivalDrop', 'antidote']
};

export function useItem(item, target) {
  const result = { message: '', healed: 0 };
  if (item.type === 'heal') {
    const actual = Math.min(item.hp, target.maxHp - target.hp);
    target.hp += actual;
    result.healed = actual;
    result.message = `${target.name} restored ${actual} HP!`;
  } else if (item.type === 'mp') {
    const actual = Math.min(item.mp, target.maxMp - target.mp);
    target.mp += actual;
    result.message = `${target.name} restored ${actual} MP!`;
  } else if (item.type === 'revive') {
    if (target.status === 'dead') {
      target.hp = Math.floor(target.maxHp * item.healPercent);
      if (item.mpRestorePercent) target.mp = Math.floor(target.maxMp * item.mpRestorePercent);
      target.status = 'normal';
      result.message = `${target.name} was revived!`;
    }
  } else if (item.type === 'cure_status') {
    if (item.cures.includes(target.status)) {
      const cured = target.status;
      target.status = 'normal';
      result.message = `${target.name}'s ${cured} was cured!`;
    } else {
      result.message = `${target.name} isn't affected by that.`;
    }
  }
  return result;
}
