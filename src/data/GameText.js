// GT — all player-visible names and strings configurable via public/gametext.txt.
// Defaults match the original game. BootScene.create() calls applyText() to
// override these with values from the file before any scene uses them.
export const GT = {
  // Game title
  gameTitle: 'Generic Quest',

  // Hero names
  hero1Name: 'Hero 1', hero2Name: 'Hero 2', hero3Name: 'Hero 3',

  // Hero classes
  hero1Class: 'Warrior', hero2Class: 'White Mage', hero3Class: 'Black Mage',

  // Hero armor
  hero1Armor: 'Chain Mail', hero2Armor: 'Linen Robe', hero3Armor: 'Cloth Robe',

  // Regular enemies
  smallEnemy1Name: 'Enemy 1', smallEnemy2Name: 'Enemy 2',
  mediumEnemy1Name: 'Enemy 3', bigEnemy1Name: 'Enemy 4',

  // Bosses
  boss1Name: 'Boss 1', boss2Name: 'Boss 2', boss3Name: 'Boss 3',

  // Spell names
  spellFire: 'Flame', spellIce: 'Snow', spellThunder: 'Thunder', spellQuake: 'Quake',
  spellMend: 'Mend', spellHeal: 'Heal', spellEnchant: 'Enchant', spellAwaken: 'Awaken',
  spellRevive: 'Revive',
  spellHero1Special1: 'Charged Attack', spellHero1Special2: 'Blade Storm',
  spellHero1Special3: 'Counterattack',  spellHero1Special4: 'Rising Sun',
  spellHero2Special1: 'Mana Meditation',   spellHero2Special2: 'Light Blast',
  spellHero2Special3: 'Illuminated Drain', spellHero2Special4: 'Recuperative Bliss',
  spellHero3Special1: 'Dispel', spellHero3Special2: 'Dark Calm', spellHero3Special3: 'Sorcery Flash',

  // Enemy action names — regular enemies
  actionBasicAttack: 'Attack',
  actionSmallEnemy2Attack1: 'Slash',
  actionMediumEnemy1Attack1: 'Power Strike', actionMediumEnemy1Attack2: 'Heavy Slash',
  actionBigEnemy1Attack1: 'Rock Slam', actionBigEnemy1Attack2: 'Energy Ray', actionBigEnemy1Attack3: 'Sticky Trap',

  // Enemy action names — Boss 1
  actionBoss1MagicAttack1: 'Raging Roar', actionBoss1MagicAttack2: 'Growling Breath',
  actionBoss1PhysicalAttack1: 'Claw Strike', actionBoss1SpecialAttack1: 'Lion Mane Entanglement',
  actionBoss1Drain: 'Aura Drain',

  // Enemy action names — Boss 2
  actionBoss2PhysicalAttack1: 'Scaly Slash', actionBoss2MagicAttack1: 'Draco Ray',
  actionBoss2SpecialAttack1: 'Inferno Heat Stroke',
  actionBoss2PhysicalAttack2: 'Tail Strike', actionBoss2MagicAttack2: "Drake's Breath",
  actionBoss2Drain: 'Aura Drain',

  // Enemy action names — Boss 3
  actionBoss3MagicAttack1: 'Dark Rush', actionBoss3MagicAttack2: 'Tidal Wave',
  actionBoss3PhysicalAttack1: 'Heavy Strike',
  actionBoss3MagicAttack3: 'Dark Sleep', actionBoss3SpecialAttack1: 'Special Trap',
  actionBoss3MagicAttack4: 'Sleep Breath',
  actionBoss3Drain: 'Aura Drain',

  // Place names
  placeTown: 'The Town', placeDungeon: 'The Dungeon', placeBootcamp: 'The Bootcamp', placeWorldMap: 'World Map',

  // Story intro lines (shown on World Map first visit).
  // Placeholders: {hero1}/{hero2}/{hero3}=hero names, {boss1}/{boss2}/{boss3}=boss names, {town}/{dungeon}/{bootcamp}=place names, {theme1}/{theme2}/{theme3}=theme words.
  introLine1: 'An ancient evil has awakened...',
  introLine2: 'A great darkness has fallen upon the land.',
  introLine3: 'Three warriors rise to face the darkness.',
  introLine4: 'Visit {bootcamp} and {town} beforehand, to prepare for your quest into {dungeon}!',

  // Dungeon floor names
  floorB1Name: 'Dungeon B1', floorB2Name: 'Dungeon B2',
  floorB3Name: 'Dungeon B3', floorB4Name: 'Boss Battle 1 - B4',
  floorB5Name: 'Boss Battle 2 - B5', floorB6Name: 'Final Battle - B6',

  // Dungeon floor descriptions (shown under floor title). Placeholders: {smallEnemy1}/{smallEnemy2}/{mediumEnemy1}/{bigEnemy1}/{boss1}/{boss2}/{boss3}
  descFloor1: 'The dungeon entrance. {smallEnemy1}s and {smallEnemy2}s roam these halls.',
  descFloor2: 'Dark passages filled with {smallEnemy2}s and {mediumEnemy1}s.',
  descFloor3: 'The air grows thick. {bigEnemy1}s patrol these halls.',
  descFloor4: 'The {boss1} awaits within the depths.',
  descFloor5: 'The {boss2} lurks in the shadows.',
  descFloor6: 'The {boss3} prowls through the darkness.',

  // Item names
  itemPotion: 'Potion', itemHiPotion: 'Hi-Potion',
  itemEther: 'Ether', itemRevivalDrop: 'Revival Drop',
  itemAntidote: 'Antidote',

  // Item descriptions — shown in shop and inventory
  itemPotionDesc:     'Restores 100 HP to one ally',
  itemHiPotionDesc:   'Restores 200 HP to one ally',
  itemEtherDesc:      'Restores 50 MP to one ally',
  itemRevivalDropDesc: "Revives a knocked out (KO'd) ally with 25% HP & MP",
  itemAntidoteDesc:   'Cures Poison',

  // Hero intro story — one paragraph per hero, editable in gametext.txt.
  // Placeholders: {hero1}/{hero2}/{hero3}=hero names, {boss1}/{boss2}/{boss3}=boss names, {town}/{dungeon}/{bootcamp}=place names, {theme1}/{theme2}/{theme3}=theme words.
  hero1Story: 'A battle-hardened warrior from the outer regions. When darkness began to threaten the land, {hero1} was the first to raise a weapon. "I\'ve fought through worse," {hero1} says with a grim smile.',
  hero2Story: 'A gifted healer trained in the ancient arts. {hero2}\'s restorative magic flows as warmly as a freshly brewed potion. {hero2} joins the quest to ensure no ally falls in the darkness ahead.',
  hero3Story: 'A brilliant spellcaster who mastered the arcane arts. {hero3}\'s mastery of fire, ice, thunder, and earth has toppled empires. Now {hero3} channels all power to fight for the good of the world.',

  // Weapon names — editable in gametext.txt
  // hero1: hero1Role weapons 1-3, hero2: hero2Role weapons 1-3, hero3: hero3Role weapons 1-3
  hero1weapon1: 'Iron Sword',
  hero1weapon2: 'Steel Saber',
  hero1weapon3: 'Ultima Blade',
  hero2weapon1: 'Oak Staff',
  hero2weapon2: 'Silver Rod',
  hero2weapon3: 'Celestial Wand',
  hero3weapon1: 'Dark Chamber',
  hero3weapon2: 'Camera Obscura',
  hero3weapon3: 'Arcane Camera',

  // Weapon descriptions — shown in the shop
  hero1weapon1Desc: 'Starting sword',
  hero1weapon2Desc: 'ATK +8  ·  Finely tempered steel',
  hero1weapon3Desc: 'ATK +18  ·  A legend forged into unbreakable steel',
  hero2weapon1Desc: 'Starting staff',
  hero2weapon2Desc: 'MAG +7  ·  Pure silver amplifies light',
  hero2weapon3Desc: 'MAG +16  ·  Enchanted with ancient illumination',
  hero3weapon1Desc: 'Starting magicamera',
  hero3weapon2Desc: 'MAG +8  ·  Imbued with raw magic',
  hero3weapon3Desc: 'MAG +18  ·  Channels arcane energy',

  // Boss intro speeches (shown at start of boss battles).
  // Use \n in gametext.txt to insert line breaks.
  boss1Intro: '"I dislike those who think they can counter my attacks. Don\'t you dare!\n\nNow, I will drain your HP and MP every turn... HA HA HA!"',
  boss2Intro: '"You dare face me?! I dodge too quickly. You\'ll never hit me!\n\nAnd now, I will drain your HP and MP every turn... HO HO HO!"',
  boss3Intro: '"You made it this far, but do not think that you are immune to my attacks. I will defeat you!\n\nStarting now, I will drain your HP and MP every turn... HE HE HE!"',

  // Theme words — used as {theme1}/{theme2}/{theme3} placeholders everywhere
  theme1: 'ancient crystals',
  theme2: 'sacred relics',
  theme3: 'Magic',

  // Ending / Victory scene text — all support the full placeholder set
  endingVictory: 'VICTORY!',
  endingLine1: 'With a final cry, the {boss3} crumbled — the dark {theme1} shattering into light.',
  endingLine2: '{hero1}, {hero2}, and {hero3} stood victorious in the silence of the {dungeon}.',
  endingLine3: 'The sacred {theme2} rose from the ruins, their warmth spreading across the land.',
  endingLine4: '{town} erupted in celebration. {theme3} flowed freely once more.',
  endingLine5: 'The three heroes were never forgotten.',
  endingTheEnd: '~ THE END ~',
  endingReplay: '✦  Tap to play again  ✦',

  // Location descriptions (shown on World Map hover)
  descTown:      'A peaceful village. Visit the inn and shops. Save your game here.',
  descDungeon:   'The home of the {boss3}. Multiple floors of peril. Visitors beware!',
  descBootcamp:  'Learn the ropes! Practice every hero ability safely. No experience required.',

  // Dungeon explore flavor messages (no items found). Editable in gametext.txt.
  exploreFind1: 'You find nothing.',
  exploreFind2: 'The corridor is quiet...',
  exploreFind3: 'You hear distant footsteps.',
  exploreFind4: 'You discover a hidden alcove with nothing inside.',

  // Game-over hint text. Placeholder: {dungeon}=dungeon place name.
  gameOverHint: 'Is a boss too hard to beat? Then follow the recommended levels for heroes.\nYou can train by fighting other enemies in {dungeon} to level up the heroes.\nThe heroes learn powerful new skills as they level up!',

  // Boss floor tip suffix. Placeholder: {town}=town place name.
  tipBossSuffix: 'Make sure to Save Game before continuing!\nYou can also shop for items and weapons in {town} before proceeding.',
};

// Substitute all story placeholders in text using current GT values and party names.
export function resolveStory(text, party = []) {
  return text
    .replace(/\{hero1\}/g,    party[0]?.name ?? GT.hero1Name)
    .replace(/\{hero2\}/g,    party[1]?.name ?? GT.hero2Name)
    .replace(/\{hero3\}/g,    party[2]?.name ?? GT.hero3Name)
    .replace(/\{boss1\}/g,       GT.boss1Name)
    .replace(/\{boss2\}/g,       GT.boss2Name)
    .replace(/\{boss3\}/g,       GT.boss3Name)
    .replace(/\{smallEnemy1\}/g, GT.smallEnemy1Name)
    .replace(/\{smallEnemy2\}/g, GT.smallEnemy2Name)
    .replace(/\{mediumEnemy1\}/g,GT.mediumEnemy1Name)
    .replace(/\{bigEnemy1\}/g,   GT.bigEnemy1Name)
    .replace(/\{town\}/g,     GT.placeTown)
    .replace(/\{dungeon\}/g,  GT.placeDungeon)
    .replace(/\{bootcamp\}/g, GT.placeBootcamp)
    .replace(/\{theme1\}/g,   GT.theme1)
    .replace(/\{theme2\}/g,   GT.theme2)
    .replace(/\{theme3\}/g,   GT.theme3);
}

// Parse key=value lines from gametext.txt and update GT in place.
// Unknown keys are ignored; missing keys keep their defaults.
export function applyText(rawText) {
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/\\n/g, '\n');
    if (key && key in GT) GT[key] = val;
  }
}
