import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { SPELL_DEFS, HERO_SPECIALS } from '../data/spells.js';
import { ITEM_DEFS } from '../data/items.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { GT } from '../data/GameText.js';
import { animateHero as _animateHero } from '../ui/BattleAnimations.js';
import { spellFX } from '../ui/spellFX.js';

// Party order: hero1Role=0, hero2Role=1, hero3Role=2
const DUMMY_HP = 80;

const STEPS = [
  // ── Hero Skills intro ─────────────────────────────────────────────
  { type: 'info', fullTutorialOnly: true,
    instruction: "✨  HERO SKILLS\nEach hero has skills, some unique Magic spells, and unique Special skills. Let's practice them all!" },

  // ── Basic actions ─────────────────────────────────────────────────
  { type: 'action', heroIdx: 0, btn: 'attack',
    instruction: "⚔  ATTACK\nTap [ Attack ], then pick an enemy to strike.",
    feedback: "Direct hit! Attack costs 0 Mana Points (MP).\nPhysical damage dealt to enemies is based on the hero's ATK stat. ATK increases as heroes win battles to gain experience points (EXP) and level up." },
  { type: 'action', heroIdx: 0, btn: 'defend',
    instruction: "🛡  DEFEND\nTap [ Defend ] to guard.\nTake half damage this turn.",
    feedback: "Dummy dealt 5 (not 10)!\n[DEF] halves all incoming damage.\nIncoming damage received from enemies is based on the hero's DEF stat. DEF increases as heroes win battles to gain experience points (EXP) and level up." },
  { type: 'action', heroIdx: 0, btn: 'item',
    instruction: `🎒  ITEM\nTap [ Item ] → [ Healing Boba ], then tap any hero to restore ${ITEM_DEFS.potion.hp} Health Points (HP)!`,
    feedback: `+${ITEM_DEFS.potion.hp} Health Points (HP)!\nEach item is depleted after use. Items and Weapons can be bought with Gold in Tapioca Town. Gold is earned by winning battles.` },
  { type: 'action', heroIdx: 0, btn: 'run',
    instruction: "🏃  RUN\nTap [ Run ] to flee.\nYou can run away from most enemies, but not the final battle.",
    feedback: "Escaped! You can flee most battles — but not the final battle!\nRun success is based on the hero's Speed (SPD) stat. SPD increases as heroes win battles to gain experience points (EXP) and level up." },

  // ── Warrior spells ────────────────────────────────────────────────
  { type: 'spell', heroIdx: 0, spell: 'mend',
    instruction: "✨  MEND — David\nTap [ Magic ] → [ Mend ], then pick an ally.\nRestores their Health Points (HP).",
    feedback: "Health Points (HP) restored!\nSpells cost Mana Points (MP) to cast." },
  { type: 'spell', heroIdx: 0, spell: 'awaken',
    initState: [null, { dead: true }, { hpPercent: 0.25, mpPercent: 0.25 }],
    instruction: "💫  AWAKEN — David\nTap [ Magic ] → [ Awaken ].\nJackie is Knocked Out (KO'd)! Target the KO'd ally to revive at 30% HP & MP.",
    feedback: "Jackie revived at 30% HP & MP! Awaken only works on KO'd allies." },

  // ── Healer spells ─────────────────────────────────────────────────
  { type: 'spell', heroIdx: 1, spell: 'mend',
    instruction: "💚  MEND — Jackie\nTap [ Magic ] → [ Mend ], then pick an ally.\nQuick, cheap Health Points (HP) restore.",
    feedback: "Quick heal!\nCheap and reliable." },
  { type: 'spell', heroIdx: 1, spell: 'heal',
    initState: [{ statusId: 'poison' }, null, null],
    instruction: "💊  HEAL — Jackie\nDavid is Poisoned [PSN]!\nTap [ Magic ] → [ Heal ], then pick David.\nHeals AND cures Poison [PSN] and Sleep [SLP].",
    feedback: "Healed! [PSN] removed!\nHeal cures Poison [PSN] and Sleep [SLP] too." },
  { type: 'spell', heroIdx: 1, spell: 'enchant',
    instruction: "✨  ENCHANT — Jackie\nTap [ Magic ] → [ Enchant ], then pick an ally.\nGives 10% of Jackie's own maximum Mana Points (MP) to one ally.",
    feedback: "Mana Points (MP) shared!\nKeeps your allies' magic spells going." },
  { type: 'spell', heroIdx: 1, spell: 'revive',
    initState: [{ hpPercent: 0.25, mpPercent: 0.25 }, null, { dead: true }],
    instruction: "🌟  REVIVE — Jackie\nTap [ Magic ] → [ Revive ].\nDavid is at 25% HP & MP. Captain Ri is KO'd. Revives ALL KO'd allies at 50% HP & MP.",
    feedback: "Captain Ri revived at 50% HP & MP! A powerful skill of Jackie's!" },

  // ── Mage spells ───────────────────────────────────────────────────
  { type: 'spell', heroIdx: 2, spell: 'fire',
    instruction: "🔥  FLAME — Captain Ri\nTap [ Magic ] → [ Flame ], then pick an enemy.\nSome enemies are fire-weak!",
    feedback: "Blazing! Elemental weaknesses deal 1.5× damage.\nMagical damage is based on the hero's MAG stat. MAG increases as heroes win battles to gain experience points (EXP) and level up." },
  { type: 'spell', heroIdx: 2, spell: 'ice',
    instruction: "❄  SNOW — Captain Ri\nTap [ Magic ] → [ Snow ], then pick an enemy.\nSome enemies are ice-weak!",
    feedback: "Icy blast! Figure out each enemy's elemental weakness." },
  { type: 'spell', heroIdx: 2, spell: 'thunder',
    instruction: "⚡  THUNDER — Captain Ri\nTap [ Magic ] → [ Thunder ], then pick an enemy.\nSome enemies are lightning-weak!",
    feedback: "Shocking! Identify which enemies are weak to which elemental magic spells." },
  { type: 'spell', heroIdx: 2, spell: 'quake', reqLevel: 5,
    instruction: "🌍  QUAKE — Captain Ri\nTap [ Magic ] → [ Quake ].\nBlasts ALL enemies at once. Costs 30 Mana Points (MP)!",
    feedback: "Ground shaking!\nGreat for clearing groups." },

  // ── Warrior specials ──────────────────────────────────────────────
  { type: 'info', fullTutorialOnly: true,
    instruction: "✦  SPECIALS — David\nTap [ Special ] to see David's special moves. More unlock as David levels up!" },
  { type: 'special', heroIdx: 0, special: 'hero1Special1',
    instruction: "⚔  CHARGED ATTACK\nDavid's basic Special skill.\nDavid charges up this turn to hit harder in a future turn!",
    feedback: "David releases [CHG] (Charged Attack) and hits one enemy with 3× damage!" },
  { type: 'special', heroIdx: 0, special: 'hero1Special2', reqLevel: 3,
    instruction: "⚔  BLADE STORM\nDavid (Lv 3) Special.\nDeals 2× damage to ALL enemies at once.",
    feedback: "Blade Storm! ALL enemies take 2× attack damage." },
  { type: 'special', heroIdx: 0, special: 'hero1Special3', reqLevel: 7,
    instruction: "🔄  COUNTERATTACK\nDavid (Lv 7) Special.\nIf any enemy tries to damage David, then David will dodge the damage and strike back for 3× damage!",
    feedback: "Counterattacking! David dodges, then strikes back for 3× damage!" },
  { type: 'special', heroIdx: 0, special: 'hero1Special4', reqLevel: 10,
    instruction: "☀  RISING SUN\nDavid (Lv 10) Special.\n⚠ COSTS 65% of Warrior's max HP — NOT MP!\nDeals 7× damage to ALL enemies! ALL allies are IMMUNE [IMM] this turn.",
    feedback: "Rising Sun! ⚠ Costs 65% of Warrior's max HP (not MP).\nALL enemies receive 7× damage. ALL allies immune this turn!" },

  // ── Healer specials ───────────────────────────────────────────────
  { type: 'info', fullTutorialOnly: true,
    instruction: "✦  SPECIALS — Jackie\nTap [ Special ] to see Jackie's special moves. More unlock as Jackie levels up!" },
  { type: 'special', heroIdx: 1, special: 'hero2Special1',
    instruction: "✦  MANA MEDITATION\nJackie's basic Special skill.\nJackie skips this turn to restore 25% of max Mana Points (MP)!",
    feedback: "Meditation! Jackie restores 25% of max Mana Points (MP)." },
  { type: 'special', heroIdx: 1, special: 'hero2Special2', reqLevel: 2,
    instruction: "💡  LIGHT BLAST\nJackie (Lv 2) Special.\nDeals magic damage to ALL enemies at once.",
    feedback: "Light Blast! ALL enemies take magic damage." },
  { type: 'special', heroIdx: 1, special: 'hero2Special3', reqLevel: 6,
    instruction: "🌟  ILLUMINATED DRAIN\nJackie (Lv 6) Special.\nCosts 65% Mana Points (MP).\nTap [ Special ] → [ Illuminated Drain ].\nDrains Health Points (HP) & Mana Points (MP) from ALL enemies.",
    feedback: "Drained ~20% HP & MP from ALL enemies!\nGreat for weakening the whole enemy group, especially for enemies that use MP." },
  { type: 'special', heroIdx: 1, special: 'hero2Special4', reqLevel: 8,
    instruction: "🌿  RECUPERATIVE BLISS\nJackie (Lv 8) Special.\nCosts 25% Mana Points (MP).\nALL allies recover 23% Health Points (HP) & Mana Points (MP) per turn.\nCannot be stacked: each hero that receives this skill will heal 23% per turn no matter how many times this spell is used.",
    feedback: "Rejuvenating! ALL allies recover 23% HP & MP each turn.\nCasting again won't stack or accumulate the recovery effect." },

  // ── Mage specials ─────────────────────────────────────────────────
  { type: 'info', fullTutorialOnly: true,
    instruction: "✦  SPECIALS — Captain Ri\nTap [ Special ] to see Captain Ri's special moves. More unlock as Captain Ri levels up!" },
  { type: 'special', heroIdx: 2, special: 'hero3Special1',
    initState: [{ statusId: 'poison' }, null, null],
    instruction: "✦  DISPEL\nCaptain Ri's basic Special skill.\nDavid is Poisoned [PSN]!\nTap [ Special ] → [ Dispel ] to remove Poison [PSN] and Sleep [SLP] from ALL allies.",
    feedback: "Dispelled! [PSN] removed!\nDispel cures Poison [PSN] and Sleep [SLP] from ALL allies." },
  { type: 'special', heroIdx: 2, special: 'hero3Special2', reqLevel: 4,
    instruction: "🌑  DARK CALM\nCaptain Ri (Lv 4) Special.\nCosts 25% Mana Points (MP).\nHeals ALL allies 15% of their max Health Points (HP) & Mana Points (MP).",
    feedback: "Calming! ALL allies recover 15% of their max Health Points (HP) & Mana Points (MP)." },
  { type: 'special', heroIdx: 2, special: 'hero3Special3', reqLevel: 9,
    instruction: "💜  SORCERY FLASH\nCaptain Ri (Lv 9) Special.\nCosts 45% Mana Points (MP).\nReduces ALL enemies to 50% Health Points (HP), Mana Points (MP), & dodge. Cannot knock out (KO) an enemy.",
    feedback: "Sorcery Flash! ALL enemies reduced to 50% of current HP, MP, and dodge chance. Cannot knock out (KO) an enemy." },

  // ── Hero Statuses intro ───────────────────────────────────────────
  { type: 'info', fullTutorialOnly: true,
    instruction: "💫  HERO STATUSES\nHeroes and enemies can gain status effects during battle. Let's learn each one!" },

  // ── Status effects — enemy inflicts ───────────────────────────────
  { type: 'status_demo', heroIdx: 0, statusId: 'poison', dummyMove: 'Venom Strike',
    statusLabel: 'Poisoned',
    instruction: "☠  [PSN] — POISON\nDavid is Poisoned!\nLoses Health Points (HP) each turn.\nCure: Heal, Dispel, or Antidote Pearl." },
  { type: 'status_demo', heroIdx: 1, statusId: 'sleep', dummyMove: 'Lullaby Splash',
    statusLabel: 'Asleep',
    instruction: "💤  [SLP] — SLEEP\nJackie is Asleep!\nJackie can't act until hit or healed.\nCure: Heal or Dispel. Sleeping heroes can't dodge!" },
  { type: 'status_demo', heroIdx: 2, statusId: 'stuck', dummyMove: 'Sticky Bind',
    statusLabel: 'Stuck',
    instruction: "🕸  [STK] — STUCK\nCaptain Ri is Stuck!\nCaptain Ri skips a turn.\nNo action needed — just wait one turn, but may still receive damage this turn." },

  // ── Status effects — hero applies ─────────────────────────────────
  { type: 'status_hero', heroIdx: 0, statusId: 'defend',
    instruction: "🛡  [DEF] — DEFEND\nDefend shows [DEF] on David.\nEnemy hits deal half damage until David's next turn." },
  { type: 'status_hero', heroIdx: 0, statusId: 'hero1Special1',
    instruction: "⚡  [CHG] — CHARGE\nCharge Attack gives [CHG].\nDavid's next Attack deals 3× damage!" },

  // ── Dodge ─────────────────────────────────────────────────────────
  { type: 'info', fullTutorialOnly: true,
    instruction: "💨  DODGE\nHeroes can sometimes dodge enemy attacks. Let's learn how it works!" },
  { type: 'info', demo: null,
    instruction: "💨  DODGE\nHeroes have a 5–20% chance to dodge enemy attacks (improves as the heroes level up). Sleeping [SLP] heroes CANNOT dodge. Bosses can dodge too!\nDodge chance is based on the hero's Speed (SPD) stat. SPD increases as heroes win battles to gain experience points (EXP) and level up." },

  // ── Higher-level status badges (conditional on hero level) ────────
  { type: 'status_conditional', heroIdx: 0, statusId: 'hero1Special3', reqLevel: 7,
    unlockedInstruction: "🔄  [CTR] — COUNTER\nCounterattack shows [CTR].\nDavid dodges any attacks aimed at David this turn and strikes back 3×!" },
  { type: 'status_conditional', heroIdx: 0, statusId: 'immune', reqLevel: 10,
    unlockedInstruction: "🌟  [IMM] — IMMUNE\nRising Sun gives [IMM] to the whole party.\nDuring this turn, enemies can't deal new damage or inflict new statuses!" },
];

export class BootcampScene extends Phaser.Scene {
  constructor() { super('BootcampScene'); }

  create() {
    const { width: W, height: H } = this.scale;
    this.W = W; this.H = H;
    this._step = 0;
    this._visibleStep = 0;
    this._totalLessons = 0;
    this._dummies = [];
    this._uiZones = [];
    this._badgeSlots = [];
    this._practiceMode  = false;
    this._selectiveMode = false;
    this._selectiveSteps = [];
    this._selectivePos   = 0;
    this._heroStatusId  = ['normal', 'normal', 'normal'];
    this._heroDefending = [false, false, false];
    this._hero1Special1Active   = [false, false, false];
    this._heroStuck     = [false, false, false];
    this._hero1Special3Active   = [false, false, false];
    this._heroImmune    = new Set();

    this._savedHeroStats = GameState.party.map(h => ({ hp: h.hp, mp: h.mp, status: h.status }));
    GameState.party.forEach(h => { h.hp = Math.floor(h.maxHp * 0.75); h.mp = Math.floor(h.maxMp * 0.75); h.status = 'normal'; });

    // Build name map so tutorial instructions use actual hero/place/spell names
    const [_w, _h, _m] = GameState.party;
    const _spellMap = [
      ['Mend',               GT.spellMend],
      ['Awaken',             GT.spellAwaken],
      ['Heal',               GT.spellHeal],
      ['Enchant',            GT.spellEnchant],
      ['Revive',             GT.spellRevive],
      ['Flame',              GT.spellFire],
      ['Snow',               GT.spellIce],
      ['Thunder',            GT.spellThunder],
      ['Quake',              GT.spellQuake],
      ['Charged Attack',     GT.spellHero1Special1],
      ['Blade Storm',        GT.spellHero1Special2],
      ['Counterattack',      GT.spellHero1Special3],
      ['Rising Sun',         GT.spellHero1Special4],
      ['Mana Meditation',    GT.spellHero2Special1],
      ['Light Blast',        GT.spellHero2Special2],
      ['Illuminated Drain',  GT.spellHero2Special3],
      ['Recuperative Bliss', GT.spellHero2Special4],
      ['Dispel',             GT.spellHero3Special1],
      ['Dark Calm',          GT.spellHero3Special2],
      ['Sorcery Flash',      GT.spellHero3Special3],
    ];
    this._nameMap = [
      ['Captain Ri',    _m.name],
      ['David',         _w.name],
      ['Jackie',        _h.name],
      ['Warrior',       GT.hero1Class],
      ['Tapioca Town',  GT.placeTown],
      ['Drink Dungeon', GT.placeDungeon],
      ['Boba Bootcamp', GT.placeBootcamp],
      ['Healing Boba',    GT.itemPotion],
      ['Hi-Healing Boba', GT.itemHiPotion],
      ['Antidote Pearl',  GT.itemAntidote],
      ..._spellMap,
      ..._spellMap.map(([from, to]) => [from.toUpperCase(), to.toUpperCase()]),
    ];

    if (this.textures.exists('bg_bootcamp')) {
      this.add.image(W / 2, H / 2, 'bg_bootcamp').setDisplaySize(W, H).setDepth(0);
    } else if (this.textures.exists('bg_town')) {
      this.add.image(W / 2, H / 2, 'bg_town').setDisplaySize(W, H).setDepth(0);
    }
    const overlay = this.add.graphics().setDepth(0);
    overlay.fillStyle(0x000000, 0.78);
    overlay.fillRect(0, 0, W, H);

    MusicSystem.play('bootcamp');
    this.events.once('shutdown', this._restoreHeroToFull, this);

    this._buildTopBar();
    this._buildUI();
    this._buildCombatants();

    this.showMessage(
      "Training Dummies appeared!\nFollow each prompt to learn every move.",
      2200,
      () => {
        this.showMessage('For each lesson, ALL characters will start at 75% Health Points (HP) and 75% Mana Points (MP) for illustrative purposes.', 3000, () => this._showTutorialMenu());
      }
    );
  }

  // ── Top bar ───────────────────────────────────────────────────────

  _buildTopBar() {
    const { W, H } = this;
    const bar = this.add.graphics().setDepth(4);
    bar.fillStyle(0x000022, 0.8); bar.fillRect(0, 0, W, 36);
    bar.lineStyle(1, 0x334466, 1); bar.lineBetween(0, 36, W, 36);

    const exit = this.add.text(10, 18, '◀ Exit', {
      fontSize: '22px', color: '#6688aa', fontFamily: 'serif'
    }).setOrigin(0, 0.5).setDepth(5).setInteractive({ useHandCursor: true });
    exit.on('pointerover', () => exit.setColor('#ffffff'));
    exit.on('pointerout',  () => exit.setColor('#6688aa'));
    exit.on('pointerdown', () => this.cameras.main.fade(300, 0, 0, 0, false, (cam, p) => {
      if (p === 1) { this._restoreHeroToFull(); MusicSystem.play('overworld'); this.scene.start('WorldScene'); }
    }));

    this.add.text(W / 2, 18, GT.placeBootcamp, {
      fontSize: '22px', color: '#88eedd', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(5);

    this._stepLabel = this.add.text(W - 10, 18, '', {
      fontSize: '18px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(1, 0.5).setDepth(5);

    // ── Bottom bar: Exit Tutorial (left) | Lesson count (right) ─────────
    const btmBar = this.add.graphics().setDepth(4);
    btmBar.fillStyle(0x000022, 0.85); btmBar.fillRect(0, H - 40, W, 40);
    btmBar.lineStyle(1, 0x334466, 1);
    btmBar.lineBetween(0, H - 40, W, H - 40);
    btmBar.lineBetween(W / 2, H - 40, W / 2, H);

    this._bottomStepLabel = this.add.text(W * 3 / 4, H - 20, '', {
      fontSize: '17px', color: '#aabbcc', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    const exitBtnBg = this.add.graphics().setDepth(4);
    const drawExitBtn = (hov) => {
      exitBtnBg.clear();
      exitBtnBg.fillStyle(hov ? 0x223355 : 0x000022, 0.95);
      exitBtnBg.fillRect(0, H - 40, W / 2, 40);
    };
    drawExitBtn(false);
    const exitBtnTxt = this.add.text(W / 4, H - 26, 'Exit Tutorial', {
      fontSize: '19px', color: '#aaccee', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(5);
    const exitBtnSub = this.add.text(W / 4, H - 10, '(Come back anytime!)', {
      fontSize: '13px', color: '#aaccee', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(5);
    const exitBtnZone = this.add.zone(0, H - 40, W / 2, 40).setOrigin(0, 0).setDepth(5).setInteractive({ useHandCursor: true });
    exitBtnZone.on('pointerover',  () => { drawExitBtn(true);  exitBtnTxt.setColor('#ffffff'); exitBtnSub.setColor('#ffffff'); });
    exitBtnZone.on('pointerout',   () => { drawExitBtn(false); exitBtnTxt.setColor('#aaccee'); exitBtnSub.setColor('#aaccee'); });
    exitBtnZone.on('pointerdown',  () => this.cameras.main.fade(300, 0, 0, 0, false, (cam, p) => {
      if (p === 1) { this._restoreHeroToFull(); MusicSystem.play('overworld'); this.scene.start('WorldScene'); }
    }));
  }

  // ── Battle UI ─────────────────────────────────────────────────────

  _buildUI() {
    const { W, H } = this;

    this.msgPill = this.add.graphics().setDepth(5);
    this.msgText = this.add.text(W / 2, H * 0.52 + 64, '', {
      fontSize: '26px', color: '#ccddff', fontFamily: 'serif',
      align: 'center', wordWrap: { width: W - 40 }
    }).setOrigin(0.5).setDepth(6);
    this.msgPill.setVisible(false);
    this.msgText.setVisible(false);
    this._msgEvent        = null;
    this._msgOnDone       = null;
    this._msgDismissReady = false;

    this.input.on('pointerdown', () => {
      if (!this.msgText.visible || !this._msgDismissReady) return;
      const cb = this._msgOnDone;
      if (this._msgEvent) { this._msgEvent.remove(false); this._msgEvent = null; }
      this._msgOnDone = null; this._msgDismissReady = false;
      this.msgPill.setVisible(false); this.msgText.setVisible(false);
      if (cb) cb();
    });

    this.cmdPanel = this.add.graphics();
    this.cmdPanel.fillStyle(0x000033, 0.92);
    this.cmdPanel.fillRect(0, H * 0.52 + 88, W, H * 0.48 - 88);

    this.cmdContainer = this.add.container(0, H * 0.52 + 112);
  }

  // ── Combatants ────────────────────────────────────────────────────

  _buildCombatants() {
    const { W, H } = this;

    const areaTop = H * 0.05, areaBot = H * 0.49;
    const slotH   = (areaBot - areaTop) / 2;
    const ex      = W * 0.80;
    const BAR_W   = 80;

    for (let i = 0; i < 2; i++) {
      const ey = areaTop + slotH * (i + 0.5) - 70;
      const sprite = this.textures.exists('enemy_smallEnemy1')
        ? this.add.image(ex, ey, 'enemy_smallEnemy1').setDisplaySize(72, 72).setFlipX(true).setDepth(2)
        : this.add.rectangle(ex, ey, 48, 56, 0x44ccaa).setDepth(2);

      const nameY = ey + 43;
      const nameText = this.add.text(ex, nameY, `Dummy ${i + 1}`, {
        fontSize: '20px', color: '#66ddbb', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1);

      const barY = nameY + 16;
      const startHp = Math.floor(DUMMY_HP * 0.75);
      this.add.rectangle(ex - BAR_W / 2, barY, BAR_W, 8, 0x220000).setOrigin(0, 0.5).setDepth(1);
      const barFill = this.add.rectangle(ex - BAR_W / 2, barY, BAR_W * 0.75, 8, 0x44aa88).setOrigin(0, 0.5).setDepth(2);
      const hpTxt = this.add.text(ex - BAR_W / 2, barY + 10, `HP ${startHp}/${DUMMY_HP}`, {
        fontSize: '17px', color: '#88ddcc', fontFamily: 'monospace'
      }).setOrigin(0, 0).setDepth(1);

      this._dummies.push({ hp: startHp, maxHp: DUMMY_HP, alive: true,
        x: ex, y: ey, sprite, barFill, hpTxt, nameText, barW: BAR_W, barX: ex - BAR_W / 2, barY });
    }

    this.heroSprites   = [];
    this._heroHomeX    = [];
    this._heroHomeY    = [];
    this.heroStatTexts = [];

    GameState.party.forEach((hero, i) => {
      const hx = W * 0.14;
      const hy = H * (0.10 + i * 0.14);
      this._heroHomeX.push(hx); this._heroHomeY.push(hy);

      const key = `hero${i + 1}`;
      const sprite = this.textures.exists(key)
        ? this.add.image(hx, hy, key).setScale(1.0).setFlipX(true).setDepth(2)
        : this.add.rectangle(hx, hy, 36, 44, hero.color || 0x4488ff).setDepth(2);
      this.heroSprites.push(sprite);

      const px = W * 0.32 - 50;
      const py = H * (0.07 + i * 0.15) - 10;
      const name = this.add.text(px, py + 2,  hero.name,
        { fontSize: '24px', color: '#ffffff', fontFamily: 'monospace' }).setDepth(1);
      const hp   = this.add.text(px, py + 30, `HP ${hero.hp}/${hero.maxHp}`,
        { fontSize: '22px', color: '#88dd88', fontFamily: 'monospace' }).setDepth(1);
      const mp   = this.add.text(px, py + 56, `MP ${hero.mp}/${hero.maxMp}`,
        { fontSize: '22px', color: '#88bbff', fontFamily: 'monospace' }).setDepth(1);
      this.heroStatTexts.push({ name, hp, mp });

      const slots = [];
      for (let j = 0; j < 6; j++) {
        const bTxt = this.add.text(px + j * 52, py + 82, '', {
          fontSize: '20px', color: '#ffaa44', fontFamily: 'monospace'
        }).setDepth(3);
        slots.push(bTxt);
      }
      this._badgeSlots.push(slots);
    });

    this.turnCursor = this.add.triangle(0, 0, 0, 0, 28, 14, 0, 28, 0xffee44, 1)
      .setDepth(15).setVisible(false);
    this.tweens.add({
      targets: this.turnCursor, alpha: { from: 1, to: 0.3 },
      duration: 500, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });
  }

  _subNames(text) {
    if (!text || !this._nameMap) return text;
    const lookup = new Map();
    const parts = [];
    for (const [from, to] of this._nameMap) {
      if (to == null) continue;
      lookup.set(from, to);
      parts.push(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    if (!parts.length) return text;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${parts.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
    return text.replace(re, m => lookup.get(m) ?? m);
  }

  // ── showMessage ───────────────────────────────────────────────────

  showMessage(msg, duration, onDone) {
    msg = this._subNames(msg);
    if (this._msgEvent) { this._msgEvent.remove(false); this._msgEvent = null; }
    this._msgOnDone = null; this._msgDismissReady = false;
    this.time.delayedCall(200, () => { this._msgDismissReady = true; });

    this.msgText.setText(msg);
    const tw = this.msgText.width, th = this.msgText.height;
    const charCount = msg.replace(/\n/g, ' ').length;
    const estLines = Math.max(1, Math.round(th / 32));
    duration = Math.max(duration, 2000 + charCount * 80 + estLines * 300);
    const padX = 20, padY = 10, r = 10;
    const pw = tw + padX * 2, ph = th + padY * 2;
    const px = this.msgText.x - pw / 2, py = this.msgText.y - ph / 2;
    this.msgPill.clear();
    this.msgPill.fillStyle(0x000022, 0.9);
    this.msgPill.fillRoundedRect(px, py, pw, ph, r);
    this.msgPill.lineStyle(1, 0x334466, 1);
    this.msgPill.strokeRoundedRect(px, py, pw, ph, r);
    this.msgPill.setVisible(true); this.msgText.setVisible(true);
    if (onDone) {
      this._msgOnDone = onDone;
      this._msgEvent = this.time.delayedCall(duration, () => {
        this._msgEvent = null; this._msgOnDone = null;
        this.msgPill.setVisible(false); this.msgText.setVisible(false);
        onDone();
      });
    }
  }

  // ── Step machine ──────────────────────────────────────────────────

  _resetHeroStats() {
    GameState.party.forEach(hero => {
      hero.hp = Math.floor(hero.maxHp * 0.75);
      hero.mp = Math.floor(hero.maxMp * 0.75);
      hero.status = 'normal';
    });
    this.updateStats();
  }

  _restoreHeroToFull() {
    GameState.party.forEach((hero, i) => {
      const saved = this._savedHeroStats?.[i];
      hero.hp     = saved ? saved.hp     : hero.maxHp;
      hero.mp     = saved ? saved.mp     : hero.maxMp;
      hero.status = saved ? saved.status : 'normal';
    });
  }

  _stepMeetsLevelReq(step) {
    if (step.type === 'status_conditional') {
      const hero = GameState.party[step.heroIdx];
      return !(step.reqLevel && hero.level < step.reqLevel);
    }
    if (step.reqLevel && step.type !== 'status_demo' && step.type !== 'status_hero' && step.type !== 'info') {
      const hero = GameState.party[step.heroIdx ?? 0];
      return hero.level >= step.reqLevel;
    }
    return true;
  }

  _stepIsVisible(step) {
    if (step.fullTutorialOnly && this._practiceMode) return false;
    return this._stepMeetsLevelReq(step);
  }

  _calcTotalLessons() {
    return STEPS.filter(step => this._stepIsVisible(step)).length;
  }

  showStep(idx) {
    this._step = idx;
    if (idx >= STEPS.length) { this._showCompletion(); return; }
    this._resetHeroStats();
    this._resetDummies();
    const step = STEPS[idx];
    this.heroSprites.forEach(s => { try { s.clearTint(); s.setAlpha(1); } catch (_) {} });

    if (step.heroIdx != null) {
      this._moveCursor(step.heroIdx);
    } else {
      this.turnCursor?.setVisible(false);
    }

    // Skip steps not visible at current mode/level
    if (!this._stepIsVisible(step)) { this.showStep(this._step + 1); return; }

    // Update step counter only for steps that are actually shown
    if (this._practiceMode) {
      this._stepLabel.setText('Practice');
      this._bottomStepLabel?.setText('Practice Mode');
    } else {
      this._visibleStep++;
      this._stepLabel.setText(`Lesson ${this._visibleStep}/${this._totalLessons}`);
      this._bottomStepLabel?.setText(`Lesson #${this._visibleStep} out of ${this._totalLessons}`);
    }

    if (step.type === 'status_demo') {
      const hero = GameState.party[step.heroIdx];
      const d0   = this._dummies[0];
      this._applyHeroBadge(step.heroIdx, step.statusId);
      this._floatNum(d0.x, d0.y - 40, step.dummyMove + '!', '#ff8888', 22);
      // Enemy lunge toward hero then snap back
      this.tweens.add({
        targets: d0.sprite, x: d0.x - 22, duration: 120, ease: 'Cubic.Out',
        onComplete: () => {
          this._heroHitAnim(step.heroIdx);
          this.tweens.add({ targets: d0.sprite, x: d0.x, duration: 180, ease: 'Cubic.In' });
        }
      });
      this.showMessage(
        `Dummy 1 used ${step.dummyMove}!\n${hero.name} is ${step.statusLabel}!`,
        2000,
        () => this.showMessage(step.instruction, 5200, () => this.advanceStep())
      );

    } else if (step.type === 'status_hero') {
      this._applyHeroBadge(step.heroIdx, step.statusId);
      this.showMessage(step.instruction, 4800, () => this.advanceStep());

    } else if (step.type === 'status_conditional') {
      this._applyHeroBadge(step.heroIdx, step.statusId);
      this.showMessage(step.unlockedInstruction, 4800, () => this.advanceStep());

    } else if (step.type === 'info') {
      this.showMessage(step.instruction, 4800, () => this.advanceStep());

    } else {
      this.showMessage(step.instruction, 3600, () => {
        this._applyStepInitState(step);
        this.showHeroCommand();
      });
    }
  }

  _applyStepInitState(step) {
    if (!step.initState) return;
    step.initState.forEach((state, i) => {
      if (!state) return;
      const hero = GameState.party[i];
      if (state.dead) {
        hero.hp = 0; hero.mp = 0; hero.status = 'dead';
        this._heroStatusId[i] = 'dead';
        try { this.heroSprites[i].setAlpha(0.9).setTint(0x262626); } catch (_) {}
      } else if (state.statusId !== undefined) {
        this._applyHeroBadge(i, state.statusId);
      } else {
        if (state.hpPercent !== undefined) hero.hp = Math.floor(hero.maxHp * state.hpPercent);
        if (state.mpPercent !== undefined) hero.mp = Math.floor(hero.maxMp * state.mpPercent);
      }
      this._updateStatusBadges(i);
    });
    this.updateStats();
  }

  advanceStep() {
    this._resetHeroStats();
    this._resetDummies();
    this.heroSprites.forEach(s => { try { s.clearTint(); s.setAlpha(1); } catch (_) {} });
    if (this._practiceMode) { this._showPracticeMenu(); return; }
    if (this._selectiveMode) {
      this._selectivePos++;
      if (this._selectivePos >= this._selectiveSteps.length) {
        this._showSelectiveCompletion(); return;
      }
      this.clearContainers();
      this.time.delayedCall(250, () => this.showStep(this._selectiveSteps[this._selectivePos]));
      return;
    }
    this.clearContainers();
    this.time.delayedCall(250, () => this.showStep(this._step + 1));
  }

  // ── Hero animation ────────────────────────────────────────────────

  animateHero(heroIdx, type) {
    _animateHero(this, this.heroSprites, this._heroHomeX, this._heroHomeY, heroIdx, type);
  }

  // ── Hero hit / heal tints (mirrors BattleScene) ───────────────────

  _heroHitAnim(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp?.setTint) return;
    const homeX = this._heroHomeX[heroIdx] ?? sp.x;
    sp.x = homeX;
    sp.setTint(0xff0000);
    this.tweens.add({
      targets: sp, x: homeX + 8, duration: 55, ease: 'Sine.easeInOut',
      yoyo: true, repeat: 2,
      onComplete: () => { sp.x = homeX; this._restoreHeroTint(heroIdx); }
    });
  }

  _restoreHeroTint(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp) return;
    try {
      if (this._hero1Special3Active[heroIdx])                sp.setTint(0xffaa22);
      else if (this._hero1Special1Active[heroIdx])           sp.setTint(0xaa44ff);
      else if (this._heroDefending[heroIdx])         sp.setTint(0x4488ff);
      else if (this._heroImmune.has(heroIdx))        sp.setTint(0xff3300);
      else if (this._heroStatusId[heroIdx] === 'poison') sp.setTint(0x448844);
      else if (this._heroStatusId[heroIdx] === 'sleep')  sp.setTint(0x888800);
      else if (this._heroStuck[heroIdx])             sp.setTint(0x888888);
      else                                           sp.clearTint();
    } catch (_) {}
  }

  _heroHealSetTint(heroIdx, color, duration) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp?.setTint) return;
    try { sp.setTint(color); } catch (_) {}
    this.time.delayedCall(duration, () => { this._restoreHeroTint(heroIdx); });
  }

  _reviveTintFlash(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp?.setTintFill) return;
    try { sp.setTintFill(0xffffff); } catch (_) {}
    this.time.delayedCall(700, () => { this._restoreHeroTint(heroIdx); });
  }

  _heroHealTint(heroIdx, healedHp, healedMp) {
    if (healedHp > 0) {
      this._heroHealSetTint(heroIdx, 0x44ff44, 600);
      if (healedMp > 0) this.time.delayedCall(650, () => this._heroHealSetTint(heroIdx, 0x88bbff, 500));
    } else if (healedMp > 0) {
      this._heroHealSetTint(heroIdx, 0x88bbff, 600);
    }
  }

  // ── updateStats ───────────────────────────────────────────────────

  updateStats() {
    GameState.party.forEach((hero, i) => {
      const t = this.heroStatTexts[i];
      if (!t) return;
      const isDead = this._heroStatusId[i] === 'dead';
      const dim = '#555555';
      t.name.setColor(isDead ? dim : '#ffffff');
      t.hp.setText(`HP ${hero.hp}/${hero.maxHp}`);
      t.hp.setColor(isDead ? dim : (hero.hp <= hero.maxHp * 0.3 ? '#ff6666' : hero.hp <= hero.maxHp * 0.7 ? '#ffee44' : '#88dd88'));
      t.mp.setText(`MP ${hero.mp}/${hero.maxMp}`);
      t.mp.setColor(isDead ? dim : '#88bbff');
    });
  }

  // ── Status badge helpers ──────────────────────────────────────────

  _applyHeroBadge(heroIdx, statusId) {
    const tints = {
      poison: 0x448844, sleep: 0x888800, stuck: 0x888888,
      defend: 0x4488ff, hero1Special1: 0xaa44ff, hero1Special3: 0xffaa22, immune: 0xff3300,
    };
    try { this.heroSprites[heroIdx].setTint(tints[statusId] || 0xffffff); } catch (_) {}

    switch (statusId) {
      case 'poison':  this._heroStatusId[heroIdx] = 'poison'; break;
      case 'sleep':   this._heroStatusId[heroIdx] = 'sleep';  break;
      case 'stuck':   this._heroStuck[heroIdx]    = true; break;
      case 'defend':  this._heroDefending[heroIdx] = true; break;
      case 'hero1Special1':  this._hero1Special1Active[heroIdx]   = true; break;
      case 'hero1Special3': this._hero1Special3Active[heroIdx]   = true; break;
      case 'immune':  this._heroImmune.add(heroIdx); break;
    }
    this._updateStatusBadges(heroIdx);
  }

  _updateStatusBadges(heroIdx) {
    const slots = this._badgeSlots[heroIdx];
    if (!slots) return;
    const s = [];
    if (this._heroStatusId[heroIdx] === 'dead')   s.push({ text: '[KO]',  color: '#ff6666' });
    if (this._heroStuck[heroIdx])                  s.push({ text: '[STK]', color: '#888888' });
    if (this._heroDefending[heroIdx])              s.push({ text: '[DEF]', color: '#4488ff' });
    if (this._hero1Special1Active[heroIdx])                s.push({ text: '[CHG]', color: '#aa44ff' });
    if (this._hero1Special3Active[heroIdx])                s.push({ text: '[CTR]', color: '#ffaa22' });
    if (this._heroImmune.has(heroIdx))             s.push({ text: '[IMM]', color: '#ff3300' });
    if (this._heroStatusId[heroIdx] === 'poison')  s.push({ text: '[PSN]', color: '#448844' });
    if (this._heroStatusId[heroIdx] === 'sleep')   s.push({ text: '[SLP]', color: '#ffff44' });
    slots.forEach((txt, j) => {
      if (j < s.length) { txt.setText(s[j].text).setColor(s[j].color).setVisible(true); }
      else               { txt.setText('').setVisible(false); }
    });
  }

  _clearAllBadges() {
    this._heroStatusId  = ['normal', 'normal', 'normal'];
    this._heroDefending = [false, false, false];
    this._hero1Special1Active   = [false, false, false];
    this._heroStuck     = [false, false, false];
    this._hero1Special3Active   = [false, false, false];
    this._heroImmune    = new Set();
    for (let i = 0; i < 3; i++) this._updateStatusBadges(i);
  }

  // ── Next button ───────────────────────────────────────────────────

  showNextButton(onNext) {
    this.clearContainers();
    const { W } = this;
    this.cmdContainer.add(this.makeCmdButton(8, 8, '▶  Got it, Next!', W - 16, 46,
      () => {
        if (this._msgEvent) { this._msgEvent.remove(false); this._msgEvent = null; }
        this.msgPill?.setVisible(false);
        this.msgText?.setVisible(false);
        if (onNext) { onNext(); } else { this.advanceStep(); }
      }, '#aaffcc', true));
  }

  _clearStepLabels() {
    this._stepLabel?.setText('');
    this._bottomStepLabel?.setText('');
  }

  // ── Tutorial entry menu ───────────────────────────────────────────

  _showTutorialMenu() {
    this.clearContainers();
    this._clearStepLabels();
    const { W } = this;

    this.cmdContainer.add(this.add.text(W / 2, -4, 'How would you like to train?', {
      fontSize: '21px', color: '#88aacc', fontFamily: 'serif', align: 'center',
      wordWrap: { width: W - 20 }
    }).setOrigin(0.5, 0));

    this.cmdContainer.add(this.makeCmdButton(8, 28, '▶  Full Tutorial', W - 16, 46,
      () => {
        this._practiceMode = false;
        this._selectiveMode = false;
        this._visibleStep = 0;
        this._totalLessons = this._calcTotalLessons();
        this.clearContainers();
        this.showStep(0);
      }, '#aaffcc', false));

    this.cmdContainer.add(this.makeCmdButton(8, 82, '🎯  Selective Tutorial', W - 16, 46,
      () => this._showSelectiveTutorialMenu(), '#aaddff', false));

    this.cmdContainer.add(this.makeCmdButton(8, 136, '🔍  Learn/Practice a Skill', W - 16, 46,
      () => this._showPracticeMenu(), '#ffeeaa', false));
  }

  _categorizeStep(step) {
    if (step.type === 'action') return 'common';
    if (step.type === 'spell')  return 'magic';
    if (step.type === 'special') return 'specials';
    if (step.type === 'info' && step.instruction && step.instruction.includes('SPECIALS')) return 'specials';
    if (step.type === 'info' && step.instruction && step.instruction.includes('HERO STATUSES')) return 'statuses';
    if (step.type === 'info' && step.instruction && step.instruction.includes('DODGE')) return 'dodge';
    if (step.type === 'status_demo' || step.type === 'status_hero' || step.type === 'status_conditional') return 'statuses';
    return null;
  }

  _buildSelectiveSteps(category) {
    const indices = STEPS.reduce((acc, step, idx) => {
      if (this._categorizeStep(step) !== category) return acc;
      if (!this._stepMeetsLevelReq(step)) return acc;
      acc.push(idx);
      return acc;
    }, []);

    // Prepend the "Hero Skills" intro for Common Skills and Magic Skills categories
    if (category === 'common' || category === 'magic') {
      const heroSkillsIdx = STEPS.findIndex(s =>
        s.type === 'info' && s.instruction && s.instruction.includes('HERO SKILLS')
      );
      if (heroSkillsIdx >= 0) indices.unshift(heroSkillsIdx);
    }

    return indices;
  }

  _showSelectiveTutorialMenu() {
    this.clearContainers();
    this._clearStepLabels();
    const { W } = this;

    this.cmdContainer.add(this.add.text(8, -20, 'Select a Skill Group:', {
      fontSize: '22px', color: '#88aacc', fontFamily: 'serif', fontStyle: 'bold'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -26, () => this._showTutorialMenu()));

    const cats = [
      { id: 'common',   label: '⚔  Common Skills'     },
      { id: 'magic',    label: '✨  Magic Skills'      },
      { id: 'specials', label: '✦  Special Skills'    },
      { id: 'statuses', label: '💫  Statuses / Effects' },
      { id: 'dodge',    label: '💨  Dodge'             },
    ];
    cats.forEach(({ id, label }, i) => {
      const steps = this._buildSelectiveSteps(id);
      const hasSteps = steps.length > 0;
      this.cmdContainer.add(this.makeCmdButton(8, 8 + i * 50, label, W - 16, 42,
        () => {
          if (!hasSteps) {
            this.showMessage('No lessons unlocked yet for this skill group!\nLevel up to unlock more.', 2200,
              () => this._showSelectiveTutorialMenu());
            return;
          }
          this._practiceMode = false;
          this._selectiveMode = true;
          this._selectiveSteps = steps;
          this._selectivePos = 0;
          this._visibleStep = 0;
          this._totalLessons = steps.length;
          this.clearContainers();
          this.showStep(steps[0]);
        }, hasSteps ? '#ccddff' : '#443355', false));
    });
  }

  _showSelectiveCompletion() {
    this._selectiveMode = false;
    this._clearStepLabels();
    this.showMessage('✓ Section Complete!\nTap to return to the lesson menu.', 3500,
      () => this._showSelectiveTutorialMenu());
  }

  _showPracticeMenu() {
    this.clearContainers();
    this._clearStepLabels();
    const { W } = this;

    this.cmdContainer.add(this.add.text(8, -20, 'Learn/Practice a Skill:', {
      fontSize: '24px', color: '#ffee88', fontFamily: 'serif', fontStyle: 'bold'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -26, () => this._showTutorialMenu()));

    const btns = [
      { id: 'attack',  label: '⚔ Attack'  },
      { id: 'special', label: '✦ Special' },
      { id: 'magic',   label: '✨ Magic'  },
      { id: 'item',    label: '🎒 Item'   },
      { id: 'defend',  label: '🛡 Defend' },
      { id: 'run',     label: '🏃 Run'    },
    ];
    btns.forEach((b, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = col * (W / 2) + 8, by = 8 + row * 48;
      this.cmdContainer.add(this.makeCmdButton(bx, by, b.label, W / 2 - 16, 38,
        () => this._onPracticeBtn(b.id), '#aaccff', false));
    });
  }

  _onPracticeBtn(btnId) {
    if (btnId === 'magic')   { this._showPracticeHeroPicker('spell');   return; }
    if (btnId === 'special') { this._showPracticeHeroPicker('special'); return; }
    const idx = STEPS.findIndex(s => s.type === 'action' && s.btn === btnId);
    if (idx >= 0) { this._practiceMode = true; this.clearContainers(); this.showStep(idx); }
  }

  _showPracticeHeroPicker(type) {
    this.clearContainers();
    this._clearStepLabels();
    const { W } = this;
    const title = type === 'spell' ? '✨ Magic' : '✦ Special';

    this.cmdContainer.add(this.add.text(8, -20, title, {
      fontSize: '24px', color: '#ffee88', fontFamily: 'serif', fontStyle: 'bold'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -26, () => this._showPracticeMenu()));

    GameState.party.forEach((hero, i) => {
      if (!STEPS.some(s => s.heroIdx === i && s.type === type)) return;
      this.cmdContainer.add(this.makeCmdButton(8, 8 + i * 52, hero.name, W - 16, 44,
        () => this._showPracticeStepList(type, i), '#ddeeff', false));
    });
  }

  _showPracticeStepList(type, heroIdx) {
    this.clearContainers();
    this._clearStepLabels();
    const { W } = this;
    const hero  = GameState.party[heroIdx];
    const steps = STEPS.reduce((acc, s, idx) => {
      if (s.heroIdx === heroIdx && s.type === type) acc.push({ ...s, idx });
      // Status badge lessons: only include when no interactive special step covers the same badge
      if (type === 'special' && s.heroIdx === heroIdx && s.type === 'status_conditional') {
        const covered =
          (s.statusId === 'hero1Special3' && STEPS.some(t => t.heroIdx === heroIdx && t.type === 'special' && t.special === 'hero1Special3')) ||
          (s.statusId === 'immune'  && STEPS.some(t => t.heroIdx === heroIdx && t.type === 'special' && t.special === 'hero1Special4'));
        if (!covered) acc.push({ ...s, idx });
      }
      return acc;
    }, []);

    this.cmdContainer.add(this.add.text(8, -20, hero.name, {
      fontSize: '24px', color: '#ffee88', fontFamily: 'serif', fontStyle: 'bold'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -26,
      () => this._showPracticeHeroPicker(type)));

    steps.forEach((step, i) => {
      let name;
      if (step.type === 'status_conditional') {
        name = step.statusId === 'hero1Special3' ? '[CTR] Counter Badge'
             : step.statusId === 'immune'  ? '[IMM] Immune Badge'
             : step.statusId;
      } else {
        name = SPELL_DEFS[step.spell || step.special]?.name || (step.spell || step.special);
      }
      const locked = step.reqLevel != null && (hero.level ?? 1) < step.reqLevel;
      const label  = locked ? `🔒 ${name}  (Lv ${step.reqLevel}+)` : name;
      this.cmdContainer.add(this.makeCmdButton(8, 8 + i * 52, label, W - 16, 44,
        () => { if (!locked) { this._practiceMode = true; this.clearContainers(); this.showStep(step.idx); } },
        locked ? '#443366' : '#ddeeff', false));
    });
  }

  // ── Command panel ─────────────────────────────────────────────────

  showHeroCommand() {
    this.clearContainers();
    const { W } = this;
    const step = STEPS[this._step];
    if (!step) return;
    const hero = GameState.party[step.heroIdx ?? 0];
    const expectedBtn = step.type === 'spell'   ? 'magic'
                      : step.type === 'special' ? 'special'
                      : (step.btn || 'attack');

    this.cmdContainer.add(this.add.text(8, -20, hero.name, {
      fontSize: '28px', color: '#ffee88', fontFamily: 'serif', fontStyle: 'bold'
    }));
    this._moveCursor(step.heroIdx ?? 0);

    const btns = [
      { id: 'attack',  label: '⚔ Attack'  },
      { id: 'special', label: '✦ Special' },
      { id: 'magic',   label: '✨ Magic'  },
      { id: 'item',    label: '🎒 Item'   },
      { id: 'defend',  label: '🛡 Defend' },
      { id: 'run',     label: '🏃 Run'    },
    ];
    btns.forEach((b, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = col * (W / 2) + 8, by = 30 + row * 48;
      const isHL = b.id === expectedBtn;
      this.cmdContainer.add(this.makeCmdButton(bx, by, b.label, W / 2 - 16, 38,
        () => this._onBtnTap(b.id), '#aaccff', isHL));
    });
  }

  _onBtnTap(btnId) {
    const step = STEPS[this._step];
    if (!step) return;

    if (step.type === 'action' && btnId === step.btn) {
      if (step.btn === 'item') { this.showItemList(GameState.party[step.heroIdx]); return; }
      if (step.btn === 'attack') {
        this.clearContainers();
        this.showTargetSelect('enemy', (ti) => this._execAction(step, ti));
        return;
      }
      this.clearContainers();
      this._execAction(step);
      return;
    }
    if (step.type === 'spell' && btnId === 'magic') {
      this.showSpellList(GameState.party[step.heroIdx]); return;
    }
    if (step.type === 'special' && btnId === 'special') {
      this.showSpecialList(GameState.party[step.heroIdx], step.special); return;
    }
    if (btnId === 'special') {
      this.showMessage('Specials unlock as heroes level up! Focus on the highlighted button for now.', 1800,
        () => this.showHeroCommand()); return;
    }
    const needed = step.type === 'spell'   ? '[ Magic ]'
                 : step.type === 'special' ? '[ Special ]'
                 : { attack: '[ Attack ]', defend: '[ Defend ]', item: '[ Item ]', run: '[ Run ]' }[step.btn] || '[ ??? ]';
    this.showMessage(`Not quite — tap ${needed}!`, 1800, () => this.showHeroCommand());
  }

  // ── Spell list ────────────────────────────────────────────────────

  showSpellList(hero) {
    this.clearContainers();
    const { W } = this;
    const step    = STEPS[this._step];
    const targetId = step?.spell;
    const spells  = (hero.spells || []).map(id => SPELL_DEFS[id]).filter(Boolean);

    this.cmdContainer.add(this.add.text(8, -16, 'Choose Spell:', {
      fontSize: '24px', color: '#88aadd', fontFamily: 'serif'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22, () => this.showHeroCommand()));

    const heroIdx = GameState.party.indexOf(hero);
    spells.forEach((spell, i) => {
      const spellStep = STEPS.find(s => s.type === 'spell' && s.spell === spell.id && s.heroIdx === heroIdx);
      const locked = spellStep?.reqLevel != null && hero.level < spellStep.reqLevel;
      const isHL = spell.id === targetId && !locked;
      const row  = this.add.container(4, 22 + i * 54);
      const bg   = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(locked ? 0x0a0d12 : (hov ? 0x223355 : 0x111833), 0.9);
        bg.fillRoundedRect(0, 0, W - 8, 52, 4);
        bg.lineStyle(isHL ? 2 : 1, isHL ? 0xffdd44 : (locked ? 0x1e1e2a : (hov ? 0x6699cc : 0x334466)), 1);
        bg.strokeRoundedRect(0, 0, W - 8, 52, 4);
      };
      draw(false);
      const heroMp = hero.maxMp || 80;
      const costPct = spell.mpCostPercent || 0;
      const spellCost = spell.mpCost ?? Math.floor(costPct * heroMp);
      const mpStr     = spell.mpCost > 0 ? `${spell.mpCost} MP`
                      : spell.mpCostPercent  ? `${spellCost} MP` : '0 MP';
      const costCol   = locked ? '#332233' : (hero.mp >= spellCost ? '#88aaff' : '#aa4444');
      const nTxt = this.add.text(6, 5, spell.name,
        { fontSize: '22px', color: locked ? '#444466' : (isHL ? '#ffdd88' : '#ccddff'), fontFamily: 'serif' });
      row.add([bg, nTxt,
        this.add.text(W - 96, 5, mpStr, { fontSize: '18px', color: costCol, fontFamily: 'monospace' }),
        this.add.text(6, 29, locked ? `🔒 Unlock at Lv ${spellStep.reqLevel}` : this._spellDesc(spell, hero),
          { fontSize: '15px', color: locked ? '#332244' : '#667799', fontFamily: 'serif', wordWrap: { width: W - 20 } })
      ]);
      if (isHL) this.tweens.add({ targets: nTxt, alpha: { from: 1, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
      this.cmdContainer.add(row);

      const zone = this._makeUIZone(4, 22 + i * 54, W - 8, 52);
      zone.on('pointerover', () => { if (!locked) draw(true); });
      zone.on('pointerout',  () => draw(false));
      zone.on('pointerdown', () => {
        if (locked) {
          this.showMessage(
            `Come back to ${GT.placeBootcamp}\nwhen ${hero.name} reaches Level ${spellStep.reqLevel}\nto unlock ${spell.name}!`,
            2800, () => this.showSpellList(hero));
          return;
        }
        if (spell.id !== targetId) {
          const t = SPELL_DEFS[targetId];
          this.showMessage(`Tap [ ${t?.name || targetId} ] for this step!`, 1800,
            () => this.showSpellList(hero));
          return;
        }
        this.clearContainers();
        const needsEnemy = spell.type === 'damage' && spell.target !== 'all';
        const needsAlly  = spell.type === 'heal' || spell.type === 'mp_transfer' ||
                           (spell.type === 'revive' && spell.target !== 'all_ally');
        const onlyKO = spell.type === 'revive' && spell.target === 'single_ally';
        if (needsEnemy)     this.showTargetSelect('enemy', (ti) => this._execSpell(step, spell, ti));
        else if (needsAlly) {
          const excludeIdx = (spell.type === 'mp_transfer' || onlyKO) ? step.heroIdx : undefined;
          const showAllyPicker = () => this.showTargetSelect('ally', (ti) => {
            if (spell.id === 'heal' && ti !== 0) {
              const wName = GameState.party[0].name;
              this.showMessage(
                `${wName} is Poisoned [PSN]!\nTap [ Heal ] on ${wName} to heal AND cure the poison.`,
                2800, showAllyPicker);
              return;
            }
            this._execSpell(step, spell, ti);
          }, excludeIdx, undefined, onlyKO);
          showAllyPicker();
        } else              this._execSpell(step, spell);
      });
    });
  }

  // ── Special list ──────────────────────────────────────────────────

  showSpecialList(hero, targetId) {
    this.clearContainers();
    const { W } = this;
    const specialIds = HERO_SPECIALS[hero.id] || [];
    const specials   = specialIds.map(id => SPELL_DEFS[id]).filter(Boolean);

    this.cmdContainer.add(this.add.text(8, -16, 'Special Moves:', {
      fontSize: '24px', color: '#ffcc88', fontFamily: 'serif'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22, () => this.showHeroCommand()));

    specials.forEach((spell, i) => {
      const locked = spell.levelReq && hero.level < spell.levelReq;
      const isHL   = spell.id === targetId && !locked;
      const row    = this.add.container(4, 22 + i * 54);
      const bg     = this.add.graphics();
      const draw   = (hov) => {
        bg.clear();
        bg.fillStyle(locked ? 0x0a0d12 : (hov ? 0x2a2a44 : 0x141428), 0.92);
        bg.fillRoundedRect(0, 0, W - 8, 52, 4);
        bg.lineStyle(isHL ? 2 : 1, isHL ? 0xffdd44 : (locked ? 0x1e1e2a : (hov ? 0x6655cc : 0x2a2a55)), 1);
        bg.strokeRoundedRect(0, 0, W - 8, 52, 4);
      };
      draw(false);
      const mpStr = spell.hpCostPercent ? `${Math.round(spell.hpCostPercent * 100)}% HP`
                  : spell.mpCost > 0    ? `${spell.mpCost} MP`
                  : spell.mpCostPercent  ? `${Math.round(spell.mpCostPercent * 100)}% MP` : '0 MP';
      const costColor = locked ? '#332233' : spell.hpCostPercent ? '#ff8800' : '#aa88ff';
      const nTxt = this.add.text(6, 5, spell.name,
        { fontSize: '22px', color: locked ? '#444466' : (isHL ? '#ffdd88' : '#ddbeff'), fontFamily: 'serif' });
      row.add([bg, nTxt,
        this.add.text(W - 96, 5, mpStr,
          { fontSize: '17px', color: costColor, fontFamily: 'monospace' }),
        this.add.text(6, 29, locked ? `🔒 Unlock at Lv ${spell.levelReq}` : this._spellDesc(spell, hero),
          { fontSize: '14px', color: locked ? '#332244' : '#556677', fontFamily: 'serif', wordWrap: { width: W - 20 } })
      ]);
      if (isHL) this.tweens.add({ targets: nTxt, alpha: { from: 1, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
      this.cmdContainer.add(row);

      const zone = this._makeUIZone(4, 22 + i * 54, W - 8, 52);
      zone.on('pointerover', () => { if (!locked) draw(true); });
      zone.on('pointerout',  () => draw(false));
      zone.on('pointerdown', () => {
        if (locked) {
          this.showMessage(
            `Come back to ${GT.placeBootcamp}\nwhen ${hero.name} reaches Level ${spell.levelReq}\nto unlock ${spell.name}!`,
            2800, () => this.showSpecialList(hero, targetId));
          return;
        }
        if (spell.id === targetId) {
          this.clearContainers();
          this._execSpecial(STEPS[this._step], spell);
        } else {
          this.showMessage(`Tap [ ${SPELL_DEFS[targetId]?.name || targetId} ] for this step!`, 1800,
            () => this.showSpecialList(hero, targetId));
        }
      });
    });
  }

  // ── Item list ─────────────────────────────────────────────────────

  showItemList(hero) {
    this.clearContainers();
    const { W } = this;
    const step = STEPS[this._step];

    this.cmdContainer.add(this.add.text(8, -16, 'Choose Item:', {
      fontSize: '24px', color: '#88aadd', fontFamily: 'serif'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22, () => this.showHeroCommand()));

    const row = this.add.container(4, 22);
    const bg  = this.add.graphics();
    const draw = (hov) => {
      bg.clear();
      bg.fillStyle(hov ? 0x223344 : 0x111822, 0.9);
      bg.fillRoundedRect(0, 0, W - 8, 52, 4);
      bg.lineStyle(2, hov ? 0xffdd44 : 0x559966, 1);
      bg.strokeRoundedRect(0, 0, W - 8, 52, 4);
    };
    draw(false);
    const nTxt = this.add.text(6, 5, GT.itemPotion,
      { fontSize: '22px', color: '#aaddcc', fontFamily: 'serif' });
    row.add([bg, nTxt,
      this.add.text(W - 96, 5, 'x3', { fontSize: '18px', color: '#aaaaaa', fontFamily: 'monospace' }),
      this.add.text(6, 29, ITEM_DEFS.potion.description,
        { fontSize: '15px', color: '#558866', fontFamily: 'serif' })
    ]);
    this.tweens.add({ targets: nTxt, alpha: { from: 1, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
    this.cmdContainer.add(row);

    const zone = this._makeUIZone(4, 22, W - 8, 52);
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerdown', () => {
      this.clearContainers();
      this.showTargetSelect('ally', (ti) => {
        this.animateHero(STEPS[this._step].heroIdx, 'item');
        const hero = GameState.party[ti];
        const healed = Math.min(hero.maxHp, hero.hp + ITEM_DEFS.potion.hp) - hero.hp;
        hero.hp += healed;
        this._floatNum(this._heroHomeX[ti] + 60, this._heroHomeY[ti] - 24, `+${healed} HP`, '#88ff88', 28);
        this._heroHealTint(ti, healed, 0);
        this.updateStats();
        this.showMessage(step.feedback, 3200, () => this.advanceStep());
      });
    });
  }

  // ── Target selector ───────────────────────────────────────────────

  showTargetSelect(type, onSelect, excludeIdx, onBack, onlyKO = false) {
    this.clearContainers();
    const { W } = this;

    if (type === 'enemy') {
      this.cmdContainer.add(this.add.text(8, -16, 'Select enemy:', {
        fontSize: '24px', color: '#ffccaa', fontFamily: 'serif'
      }));
      this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22, () => onBack ? onBack() : this.showHeroCommand()));

      this._dummies.forEach((d, i) => {
        const rowH = 46;
        const row  = this.add.container(4, 22 + i * 52);
        const bg   = this.add.graphics();
        const draw = (hov) => {
          bg.clear();
          bg.fillStyle(d.alive ? (hov ? 0x331111 : 0x200a0a) : 0x0a0505, 0.92);
          bg.fillRoundedRect(0, 0, W - 8, rowH, 4);
          bg.lineStyle(1, d.alive ? (hov ? 0xcc5544 : 0x553333) : 0x221e1e, 1);
          bg.strokeRoundedRect(0, 0, W - 8, rowH, 4);
        };
        draw(false);
        row.add([bg,
          this.add.text(8, 10, `Dummy ${i + 1}`, {
            fontSize: '22px', color: d.alive ? '#ffcccc' : '#445555', fontFamily: 'serif' }),
          this.add.text(W - 12, 10, d.alive ? `HP ${d.hp}/${d.maxHp}` : "KO'd", {
            fontSize: '18px', color: d.alive ? '#cc8888' : '#553333', fontFamily: 'monospace' }).setOrigin(1, 0)
        ]);
        this.cmdContainer.add(row);

        const zone = this._makeUIZone(4, 22 + i * 52, W - 8, rowH);
        zone.on('pointerover', () => { if (d.alive) { draw(true); this._flashDummy(i, false); } });
        zone.on('pointerout',  () => draw(false));
        zone.on('pointerdown', () => { if (!d.alive) return; this.clearContainers(); onSelect(i); });
      });

    } else {
      this.cmdContainer.add(this.add.text(8, -16, 'Select ally:', {
        fontSize: '24px', color: '#aaffcc', fontFamily: 'serif'
      }));
      this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22, () => onBack ? onBack() : this.showHeroCommand()));

      GameState.party.forEach((hero, i) => {
        const isKOd    = this._heroStatusId[i] === 'dead';
        const excluded = excludeIdx != null && i === excludeIdx;
        const disabled = excluded || (onlyKO && !isKOd);
        const rowH = 58;
        const row  = this.add.container(4, 22 + i * 62);
        const bg   = this.add.graphics();
        const draw = (hov) => {
          bg.clear();
          bg.fillStyle(disabled ? 0x0a0a0a : (hov ? 0x0a2a1a : 0x051510), 0.92);
          bg.fillRoundedRect(0, 0, W - 8, rowH, 4);
          bg.lineStyle(1, disabled ? 0x222222 : (hov ? 0x44aa66 : 0x224433), 1);
          bg.strokeRoundedRect(0, 0, W - 8, rowH, 4);
        };
        draw(false);
        const hpMpStr  = isKOd ? 'KO\'d' : `HP ${hero.hp}/${hero.maxHp}  MP ${hero.mp}/${hero.maxMp}`;
        const subLabel = excluded ? '(caster — cannot target self)'
                       : (onlyKO && !isKOd) ? '(alive — use on KO\'d allies only)'
                       : hpMpStr;
        row.add([bg,
          this.add.text(8, 8, hero.name, {
            fontSize: '22px', color: disabled ? '#444444' : '#aaffcc', fontFamily: 'serif' }),
          this.add.text(8, 34, subLabel, {
            fontSize: '16px', color: disabled ? '#333333' : (isKOd ? '#ff6666' : '#88bbaa'), fontFamily: 'monospace' })
        ]);
        this.cmdContainer.add(row);

        const zone = this._makeUIZone(4, 22 + i * 62, W - 8, rowH);
        zone.on('pointerover', () => { if (!disabled) draw(true); });
        zone.on('pointerout',  () => draw(false));
        zone.on('pointerdown', () => { if (disabled) return; this.clearContainers(); onSelect(i); });
      });
    }
  }

  // ── Action execution ──────────────────────────────────────────────

  _execAction(step, targetIdx) {
    const hero = GameState.party[step.heroIdx];
    if (step.btn === 'attack') {
      const dmg = Math.max(1, hero.atk + Math.floor(Math.random() * 6));
      const t   = targetIdx !== undefined ? targetIdx : this._dummies.findIndex(d => d.alive);
      this.animateHero(step.heroIdx, 'attack');
      if (t >= 0) { this._hitDummy(t, dmg, '#ffdd44'); }
    } else if (step.btn === 'defend') {
      this._applyHeroBadge(step.heroIdx, 'defend');
      this.animateHero(step.heroIdx, 'defend');
      this._heroHealSetTint(step.heroIdx, 0x4488ff, 2500);
      this._floatNum(this._heroHomeX[step.heroIdx] + 60, this._heroHomeY[step.heroIdx] - 24,
        '[DEF]!', '#4488ff', 26);
      const d0 = this._dummies[0];
      this.time.delayedCall(450, () => {
        this._floatNum(d0.x, d0.y - 40, 'Attacks!', '#ff8888', 20);
        this.tweens.add({
          targets: d0.sprite, x: d0.x - 22, duration: 120, ease: 'Cubic.Out',
          onComplete: () => {
            this._heroHitAnim(step.heroIdx);
            this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 50,
              '10→5 ½', '#88ccff', 24);
            GameState.party[step.heroIdx].hp = Math.max(0, GameState.party[step.heroIdx].hp - 5);
            this.updateStats();
            this.tweens.add({ targets: d0.sprite, x: d0.x, duration: 180, ease: 'Cubic.In' });
            this.time.delayedCall(400, () => {
              this.showMessage(step.feedback, 3200, () => this.advanceStep());
            });
          }
        });
      });
      return;
    } else if (step.btn === 'run') {
      this.heroSprites.forEach((s, i) => {
        this.tweens.add({ targets: s, x: this._heroHomeX[i] - 60, alpha: 0,
          duration: 400, delay: i * 60, ease: 'Cubic.In',
          onComplete: () => { try { s.setPosition(this._heroHomeX[i], this._heroHomeY[i]); s.setAlpha(1); } catch(_){} }
        });
      });
    }
    this.showMessage(step.feedback, 3200, () => this.advanceStep());
  }

  _execSpell(step, spell, targetIdx) {
    const hero = GameState.party[step.heroIdx];
    this.animateHero(step.heroIdx, 'spell');

    // Deduct MP cost
    const mpUsed = spell.mpCost != null ? spell.mpCost : Math.floor((hero.maxMp || 40) * (spell.mpCostPercent || 0));
    if (mpUsed > 0) hero.mp = Math.max(0, hero.mp - mpUsed);

    if (spell.type === 'damage') {
      const dmg = Math.max(1, Math.floor(hero.mag * (spell.power || 1.5)));
      const col = spell.element === 'fire' ? '#ff8844' : spell.element === 'ice' ? '#88eeff'
                : spell.element === 'lightning' ? '#ffff66' : '#aaffcc';
      if (spell.target === 'all') {
        const allIdxs = this._dummies.map((_, i) => i);
        allIdxs.forEach(i => this._hitDummy(i, dmg, col));
        spellFX(this, spell.id, allIdxs.map(i => this._dummies[i]));
      } else {
        const t = targetIdx !== undefined ? targetIdx : this._dummies.findIndex(d => d.alive);
        if (t >= 0) { this._hitDummy(t, dmg, col); spellFX(this, spell.id, [this._dummies[t]]); }
      }
    } else if (spell.type === 'heal') {
      const ti = targetIdx !== undefined ? targetIdx : step.heroIdx;
      const healAmt = Math.floor((spell.power || 12) + hero.mag * 0.8);
      this._floatNum(this._heroHomeX[ti] + 60, this._heroHomeY[ti] - 24,
        `+${healAmt} HP`, '#88ff88', 28);
      this._heroHealTint(ti, healAmt, 0);
      GameState.party[ti].hp = Math.min(GameState.party[ti].maxHp, GameState.party[ti].hp + healAmt);
      if (spell.id === 'heal' && ['poison', 'sleep'].includes(this._heroStatusId[ti])) {
        GameState.party[ti].status = 'normal';
        this._heroStatusId[ti] = 'normal';
        this._updateStatusBadges(ti);
      }
    } else if (spell.type === 'mp_transfer') {
      const ti = targetIdx !== undefined ? targetIdx : step.heroIdx;
      const mp = Math.floor((hero.maxMp || 40) * (spell.amountPercent || 0.10));
      this._floatNum(this._heroHomeX[ti] + 60, this._heroHomeY[ti] - 24, `+${mp} MP`, '#88aaff', 24);
      this._heroHealTint(ti, 0, mp);
      GameState.party[ti].mp = Math.min(GameState.party[ti].maxMp, GameState.party[ti].mp + mp);
    } else if (spell.type === 'revive') {
      if (spell.target === 'all_ally') {
        GameState.party.forEach((h, i) => {
          if (this._heroStatusId[i] === 'dead') {
            h.hp = Math.floor(h.maxHp * spell.healPercent);
            if (spell.mpRestorePercent) h.mp = Math.floor(h.maxMp * spell.mpRestorePercent);
            h.status = 'normal';
            this._heroStatusId[i] = 'normal';
            try { this.heroSprites[i].setAlpha(1); } catch (_) {}
            this._updateStatusBadges(i);
            this._reviveTintFlash(i);
          }
        });
        this._floatNum(this.W / 2, this._heroHomeY[step.heroIdx] - 24, 'Party Revived!', '#ffffaa', 24);
      } else {
        const ti = targetIdx !== undefined ? targetIdx : step.heroIdx;
        const th = GameState.party[ti];
        th.hp = Math.floor(th.maxHp * spell.healPercent);
        if (spell.mpRestorePercent) th.mp = Math.floor(th.maxMp * spell.mpRestorePercent);
        th.status = 'normal';
        this._heroStatusId[ti] = 'normal';
        try { this.heroSprites[ti].setAlpha(1); } catch (_) {}
        this._updateStatusBadges(ti);
        this._reviveTintFlash(ti);
        this._floatNum(this._heroHomeX[ti] + 60, this._heroHomeY[ti] - 24, 'Revived!', '#ffffaa', 24);
      }
    }
    this.updateStats();
    this.showMessage(step.feedback, 3200, () => this.advanceStep());
  }

  _execSpecial(step, spell) {
    const hero     = GameState.party[step.heroIdx];
    const allIdxs  = this._dummies.map((_, i) => i);
    const firstAlive = this._dummies.findIndex(d => d.alive);
    this.animateHero(step.heroIdx, 'special');

    switch (spell.type) {
      case 'hero1Special1':
        this._applyHeroBadge(step.heroIdx, 'hero1Special1');
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 40, 'Charging!', '#ffff44', 28);
        this.time.delayedCall(700, () => {
          this.showMessage("Charged up! On David's next turn, tap [ Charged Attack ] to deal 3× damage to one enemy!", 3600,
            () => this._showChargedFollowUp(step));
        });
        return;
      case 'hero2Special1': {
        const mpGain = Math.floor((hero.maxMp || 40) * 0.25);
        hero.mp = Math.min(hero.maxMp, hero.mp + mpGain);
        this._heroHealTint(step.heroIdx, 0, mpGain);
        this._floatNum(this._heroHomeX[step.heroIdx] + 60, this._heroHomeY[step.heroIdx] - 24, `+${mpGain} MP`, '#88aaff', 30);
        break;
      }
      case 'hero3Special1':
        hero.mp = Math.max(0, hero.mp - 5);
        this.heroSprites.forEach((s, i) => {
          try { s.setTint(0xffbbdd); } catch (_) {}
          this._floatNum(this._heroHomeX[i] + 30, this._heroHomeY[i] - 30, '✓', '#ffbbdd', 28);
        });
        this.time.delayedCall(700, () => this.heroSprites.forEach((s, i) => {
          try { s.clearTint(); } catch (_) {}
          if (['poison', 'sleep'].includes(this._heroStatusId[i])) {
            this._heroStatusId[i] = 'normal';
            this._updateStatusBadges(i);
          }
        }));
        break;
      case 'hero1Special2': {
        hero.mp = Math.max(0, hero.mp - 7);
        const dmg = Math.max(1, Math.floor(hero.atk * 2));
        this._dummies.forEach((_, i) => this._hitDummy(i, dmg, '#ffaa44'));
        spellFX(this, 'hero1Special2', allIdxs.map(i => this._dummies[i]));
        break;
      }
      case 'hero1Special3': {
        hero.mp = Math.max(0, hero.mp - 5);
        this.updateStats();
        this._applyHeroBadge(step.heroIdx, 'hero1Special3');
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 40, '[CTR]!', '#ffaa22', 28);
        const _d0 = this._dummies[0];
        this.time.delayedCall(900, () => {
          this._floatNum(_d0.x, _d0.y - 40, 'Attacks!', '#ff8888', 22);
          this.tweens.add({
            targets: _d0.sprite, x: _d0.x - 40, duration: 130, ease: 'Cubic.Out',
            onComplete: () => {
              this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 50, 'Dodged!', '#ffffff', 26);
              this.tweens.add({ targets: _d0.sprite, x: _d0.x, duration: 180, ease: 'Cubic.In' });
              this.time.delayedCall(280, () => {
                const hero1Role = GameState.party[step.heroIdx];
                const dmg = Math.max(1, Math.floor(hero1Role.atk * 3));
                this.animateHero(step.heroIdx, 'attack');
                this._hitDummy(0, dmg, '#ffaa22');
                spellFX(this, 'hero1Special3', [this._dummies[0]]);
                this._hero1Special3Active[step.heroIdx] = false;
                this._restoreHeroTint(step.heroIdx);
                this._updateStatusBadges(step.heroIdx);
                this.time.delayedCall(600, () => {
                  this.showMessage(step.feedback, 3200, () => this.advanceStep());
                });
              });
            }
          });
        });
        return;
      }
      case 'hero1Special4': {
        const hpCostPct = hero.level > 10 ? Math.max(0.20, 0.65 - (hero.level - 10) * 0.025) : 0.65;
        const hpCost = Math.floor(hero.maxHp * hpCostPct);
        hero.hp = Math.max(1, hero.hp - hpCost);
        this._heroHitAnim(step.heroIdx);
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 52, `-${hpCost} HP`, '#ff8888', 24);
        const dmg = Math.max(1, Math.floor(hero.atk * 7));
        this._dummies.forEach((_, i) => this._hitDummy(i, dmg, '#ffdd88'));
        this._floatNum(this.W * 0.78, (this._dummies[0]?.y ?? 80) - 65, `${dmg} dmg!`, '#ffee88', 24);
        spellFX(this, 'hero1Special4', allIdxs.map(i => this._dummies[i]));
        GameState.party.forEach((_, i) => {
          this._applyHeroBadge(i, 'immune');
          this._floatNum(this._heroHomeX[i] + 40, this._heroHomeY[i] - 24, '[IMM]!', '#ffdd88', 20);
        });
        break;
      }
      case 'hero2Special2': {
        hero.mp = Math.max(0, hero.mp - 5);
        const dmg = Math.max(1, Math.floor(hero.mag * 1.5));
        this._dummies.forEach((_, i) => this._hitDummy(i, dmg, '#ffdd88'));
        spellFX(this, 'hero2Special2', allIdxs.map(i => this._dummies[i]));
        break;
      }
      case 'hero3Special2': {
        const mpCost = Math.floor((hero.maxMp || 40) * 0.25);
        hero.mp = Math.max(0, hero.mp - mpCost);
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 52, `-${mpCost} MP`, '#aa88ff', 22);
        GameState.party.forEach((h, i) => {
          const hpGain = Math.min(Math.floor(h.maxHp * 0.15), h.maxHp - h.hp);
          const mpGain = Math.min(Math.floor(h.maxMp * 0.15), h.maxMp - h.mp);
          if (hpGain > 0) h.hp += hpGain;
          if (mpGain > 0) h.mp += mpGain;
          this._heroHealTint(i, hpGain, mpGain);
          this._floatNum(this._heroHomeX[i] + 40, this._heroHomeY[i] - 24, `+${hpGain} HP\n+${mpGain} MP`, '#88dd88', 20);
        });
        break;
      }
      case 'hero2Special3': {
        const mpCost = Math.floor((hero.maxMp || 40) * 0.65);
        hero.mp = Math.max(0, hero.mp - mpCost);
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 52, `-${mpCost} MP`, '#ffeeaa', 22);
        const effectivePct = spell.percent + hero.mag * 0.001;
        const drainAmt = Math.max(1, Math.floor(DUMMY_HP * effectivePct));
        const _drainIdxs = this._dummies.map((_, i) => i);
        _drainIdxs.forEach(i => this._hitDummy(i, drainAmt, '#ffeeaa'));
        this._floatNum(this._heroHomeX[step.heroIdx] + 40, this._heroHomeY[step.heroIdx] - 30, 'Drained!', '#ffeeaa', 24);
        const _drainSteps = [0xffffff, 0xdddddd, 0xaaaaaa, 0x777777, 0x444444, 0x111111, 0x000000];
        _drainSteps.forEach((tint, si) => {
          this.time.delayedCall(si * 110, () => _drainIdxs.forEach(i => {
            const s = this._dummies[i]?.sprite;
            if (s?.setTintFill) s.setTintFill(tint); else if (s?.setTint) s.setTint(tint);
          }));
        });
        this.time.delayedCall(_drainSteps.length * 110 + 120, () => _drainIdxs.forEach(i => {
          const s = this._dummies[i]?.sprite; if (s?.clearTint) s.clearTint();
        }));
        break;
      }
      case 'hero2Special4': {
        const mpCost = Math.floor((hero.maxMp || 40) * 0.25);
        hero.mp = Math.max(0, hero.mp - mpCost);
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 52, `-${mpCost} MP`, '#88ffcc', 22);
        GameState.party.forEach((h, i) => {
          const hpGain = Math.floor(h.maxHp * 0.23);
          const mpGain = Math.floor(h.maxMp * 0.23);
          h.hp = Math.min(h.maxHp, h.hp + hpGain);
          h.mp = Math.min(h.maxMp, h.mp + mpGain);
          this._floatNum(this._heroHomeX[i] + 40, this._heroHomeY[i] - 24, `+${hpGain} HP  +${mpGain} MP`, '#88ffcc', 20);
          const sp = this.heroSprites[i];
          if (sp?.setTint) {
            const obj = { t: 0 };
            this.tweens.add({
              targets: obj, t: 1, duration: 700, yoyo: true, hold: 100, repeat: 2,
              ease: 'Sine.easeInOut',
              onUpdate: () => { try { const rv = Math.round(0xff - obj.t * 0x77); sp.setTint((rv << 16) | (0xff << 8) | 0xff); } catch (_) {} },
              onComplete: () => { try { this._restoreHeroTint(i); } catch (_) {} }
            });
          }
        });
        this.updateStats();
        this.showMessage(step.feedback, 3200, () => this.advanceStep());
        return;
      }
      case 'hero3Special3': {
        const mpCost = Math.floor((hero.maxMp || 40) * 0.45);
        hero.mp = Math.max(0, hero.mp - mpCost);
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 52, `-${mpCost} MP`, '#ff88ff', 22);
        // Reduces each dummy to 50% HP; cannot KO
        this._dummies.forEach((d, i) => {
          if (!d.alive) return;
          d.hp = Math.max(1, Math.floor(d.hp / 2));
          d.alive = true;
          this._updateDummyBar(i);
          this._floatNum(d.x, d.y - 40, 'HP Halved!', '#ff88ff', 28);
          try { d.sprite.setTint(0xff88ff); } catch (_) {}
          this.tweens.add({
            targets: d.sprite, x: d.x + 6, duration: 60, yoyo: true, repeat: 3,
            onComplete: () => { try { d.sprite.clearTint(); } catch (_) {} }
          });
        });
        spellFX(this, 'hero3Special3', allIdxs.map(i => this._dummies[i]));
        break;
      }
      default:
        if (firstAlive >= 0) spellFX(this, 'hero1Special1', [this._dummies[firstAlive]]);
        this._floatNum(this._heroHomeX[step.heroIdx], this._heroHomeY[step.heroIdx] - 40, '✦ Special!', '#ffcc66', 26);
    }
    // Restore tints after animation (preserves status tints like [CHG] purple)
    if (spell.type !== 'hero3Special1') {
      this.time.delayedCall(300, () => this.heroSprites.forEach((_, i) => { try { this._restoreHeroTint(i); } catch (_) {} }));
    }
    this.updateStats();
    this.showMessage(step.feedback, 3200, () => this.advanceStep());
  }

  _showChargedFollowUp(step) {
    this.clearContainers();
    const { W } = this;
    const hero = GameState.party[step.heroIdx];
    this.cmdContainer.add(this.add.text(8, -20, hero.name, {
      fontSize: '28px', color: '#ffee88', fontFamily: 'serif', fontStyle: 'bold'
    }));
    this._moveCursor(step.heroIdx);
    const btns = [
      { id: 'attack',  label: '⚔ Charged Attack' },
      { id: 'special', label: '✦ Special' },
      { id: 'magic',   label: '✨ Magic'  },
      { id: 'item',    label: '🎒 Item'   },
      { id: 'defend',  label: '🛡 Defend' },
      { id: 'run',     label: '🏃 Run'    },
    ];
    btns.forEach((b, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = col * (W / 2) + 8, by = 30 + row * 48;
      const isAttack = b.id === 'attack';
      const btnColor = isAttack ? '#cc88ff' : '#aaccff';
      const btn = this.makeCmdButton(bx, by, b.label, W / 2 - 16, 38,
        () => {
          if (!isAttack) {
            this.showMessage('Tap [ Charged Attack ] to release the 3× hit!', 1800, () => this._showChargedFollowUp(step));
            return;
          }
          this.showTargetSelect('enemy', (ti) => {
            const hero1Role = GameState.party[step.heroIdx];
            const dmg = Math.max(1, Math.floor(hero1Role.atk * 3));
            this.animateHero(step.heroIdx, 'attack');
            this._hitDummy(ti, dmg, '#cc88ff');
            spellFX(this, 'hero1Special1', [this._dummies[ti]]);
            this._hero1Special1Active[step.heroIdx] = false;
            this._restoreHeroTint(step.heroIdx);
            this._updateStatusBadges(step.heroIdx);
            this.showMessage(step.feedback, 3200, () => this.advanceStep());
          }, undefined, () => this._showChargedFollowUp(step));
        }, btnColor, false);
      this.cmdContainer.add(btn);
      if (isAttack) {
        this.tweens.add({ targets: btn, alpha: { from: 1, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
      }
    });
  }

  // ── Dummy HP ──────────────────────────────────────────────────────

  _hitDummy(i, amount, color) {
    const d = this._dummies[i];
    if (!d.alive) return;
    d.hp = Math.max(0, d.hp - amount);
    if (d.hp <= 0) { d.hp = 0; d.alive = false; }
    this._updateDummyBar(i);
    this._floatNum(d.x, d.y - 40, `${amount}`, color, 32);
    try { d.sprite.setTint(0xff0000); } catch (_) {}
    this.tweens.add({
      targets: d.sprite, x: d.x + 6, duration: 60, yoyo: true, repeat: 3,
      onComplete: () => {
        try {
          if (!d.alive) { d.sprite.setTint(0x334455); d.sprite.setAlpha(0.45); }
          else           { d.sprite.clearTint(); }
        } catch (_) {}
      }
    });
  }

  _flashDummy(i, tint = true) {
    const d = this._dummies[i];
    if (!d || !d.alive) return;
    if (tint) { try { d.sprite.setTint(0xff0000); } catch (_) {} }
    this.tweens.add({
      targets: d.sprite, x: d.x + 6, duration: 60, yoyo: true, repeat: 1,
      onComplete: () => {
        try { d.sprite.setX(d.x); if (tint) d.sprite.clearTint(); } catch (_) {}
      }
    });
  }

  _updateDummyBar(i) {
    const d = this._dummies[i];
    if (d.alive) {
      const pct = Math.max(0, d.hp / d.maxHp);
      const col = pct > 0.5 ? 0x44aa88 : pct > 0.25 ? 0xaaaa33 : 0xaa3333;
      d.barFill.setSize(d.barW * pct, 8).setFillStyle(col);
      if (d.nameText) d.nameText.setColor('#66ddbb');
      d.hpTxt.setText(`HP ${d.hp}/${d.maxHp}`).setColor('#88ddcc');
    } else {
      d.barFill.setSize(0, 8).setFillStyle(0x444444);
      if (d.nameText) d.nameText.setColor('#555555');
      d.hpTxt.setText("KO'd").setColor('#555555');
    }
  }

  _resetDummies() {
    this._dummies.forEach((d, i) => {
      d.hp = Math.floor(d.maxHp * 0.75); d.alive = true;
      try { d.sprite.clearTint(); d.sprite.setAlpha(1).setX(d.x); } catch (_) {}
      this._updateDummyBar(i);
    });
    this._clearAllBadges();
    this.heroSprites.forEach(s => { try { s.clearTint(); } catch (_) {} });
  }

  // ── Floating number ───────────────────────────────────────────────

  _floatNum(x, y, text, color, size) {
    const txt = this.add.text(x, y, text, {
      fontSize: `${size || 30}px`, color, fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: txt, y: y - 55, alpha: { from: 1, to: 0 }, duration: 950,
      ease: 'Cubic.easeOut', onComplete: () => { try { txt.destroy(); } catch (_) {} }
    });
  }

  // ── Completion overlay ────────────────────────────────────────────

  _showCompletion() {
    this.clearContainers();
    this.msgPill.setVisible(false); this.msgText.setVisible(false);
    this.turnCursor.setVisible(false);
    const { W, H } = this;
    // Measure body text first so the box height fits the content
    const bodyTxt = this.add.text(W / 2, 0, this._subNames("You now know all the skills available at your heroes' current levels!\nStock up at Tapioca Town, then brave the Drink Dungeon.\nReturn to Boba Bootcamp as your heroes level up to learn and practice newly unlocked skills!\nGood luck, heroes!"), {
      fontSize: '24px', color: '#ccddff', fontFamily: 'serif',
      align: 'center', wordWrap: { width: W - 100 }
    }).setOrigin(0.5, 0).setDepth(31);
    const btnH = 44;
    const boxH = 74 + bodyTxt.height + 24 + btnH + 20;
    const boxY = H / 2 - boxH / 2;

    const boxBg = this.add.graphics().setDepth(30);
    boxBg.fillStyle(0x00011e, 0.97);
    boxBg.fillRoundedRect(30, boxY, W - 60, boxH, 12);
    boxBg.lineStyle(2, 0x44ffaa, 1);
    boxBg.strokeRoundedRect(30, boxY, W - 60, boxH, 12);

    this.add.text(W / 2, boxY + 34, '🎓 Bootcamp Complete!', {
      fontSize: '30px', color: '#ffdd88', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(31);
    bodyTxt.setY(boxY + 74);

    const btnW = 220, btnX = W / 2 - btnW / 2, btnY = boxY + 74 + bodyTxt.height + 24;
    const btnBg = this.add.graphics().setDepth(31);
    const drawBtn = (hov) => {
      btnBg.clear();
      btnBg.fillStyle(hov ? 0x003322 : 0x001a11, 0.97);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
      btnBg.lineStyle(2, 0x44aa77, 1);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 8);
    };
    drawBtn(false);
    const btnTxt = this.add.text(W / 2, btnY + btnH / 2, '↩ World Map', {
      fontSize: '30px', color: '#55ffcc', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(32);
    const btnZone = this.add.zone(W / 2, btnY + btnH / 2, btnW, btnH)
      .setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });
    btnZone.on('pointerover',  () => { drawBtn(true);  btnTxt.setColor('#ffffff'); });
    btnZone.on('pointerout',   () => { drawBtn(false); btnTxt.setColor('#55ffcc'); });
    btnZone.on('pointerdown',  () => this.cameras.main.fade(350, 0, 0, 0, false, (cam, p) => {
      if (p === 1) { this._restoreHeroToFull(); MusicSystem.play('overworld'); this.scene.start('WorldScene'); }
    }));
  }

  // ── Cursor ────────────────────────────────────────────────────────

  _moveCursor(heroIdx) {
    const sprite = this.heroSprites?.[heroIdx];
    if (!sprite || !this.turnCursor) return;
    this.turnCursor.setPosition(Math.max(4, sprite.x - 58), sprite.y + 16).setVisible(true);
  }

  // ── Button helpers ────────────────────────────────────────────────

  makeCmdButton(x, y, label, w, h, fn, color = '#aaccff', highlighted = false) {
    const c  = this.add.container(x, y);
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x223355 : 0x111833, 0.95);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(highlighted ? 2.5 : 1, highlighted ? 0xffdd44 : (hover ? 0x6699cc : 0x334466), 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };
    draw(false);
    const txt = this.add.text(w / 2, h / 2, label, {
      fontSize: '28px', color: highlighted ? '#ffdd88' : color, fontFamily: 'serif'
    }).setOrigin(0.5);
    c.add([bg, txt]);
    if (highlighted) {
      this.tweens.add({ targets: txt, alpha: { from: 1, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
    }
    const zone = this._makeUIZone(x, y, w, h);
    zone.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
    zone.on('pointerout',   () => { draw(false); txt.setColor(highlighted ? '#ffdd88' : color); });
    zone.on('pointerdown',  fn);
    return c;
  }

  _spellDesc(spell, hero) {
    let desc = spell.description || '';
    if (desc.includes('{mpGive}')) {
      desc = desc.replace('{mpGive}', Math.floor((hero?.maxMp || 0) * 0.10));
    }
    return desc;
  }

  makeBackBtn(x, y, fn) {
    const c  = this.add.container(x + 30, y);
    const bg = this.add.graphics();
    const w  = this.W / 2 - 46, h = 40;
    const draw = (hov) => {
      bg.clear();
      bg.fillStyle(hov ? 0x223355 : 0x111833, 0.95);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(1, hov ? 0x6699cc : 0x334466, 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };
    draw(false);
    const txt = this.add.text(w / 2, h / 2, '← Back', {
      fontSize: '28px', color: '#aaccff', fontFamily: 'serif'
    }).setOrigin(0.5);
    c.add([bg, txt]);
    const zone = this._makeUIZone(x + 30, y, w, h);
    zone.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
    zone.on('pointerout',   () => { draw(false); txt.setColor('#aaccff'); });
    zone.on('pointerdown',  fn);
    return c;
  }

  clearContainers() {
    this.cmdContainer.removeAll(true);
    if (this._uiZones) {
      this._uiZones.forEach(z => { try { z.destroy(); } catch (_) {} });
      this._uiZones = [];
    }
  }

  _makeUIZone(lx, ly, w, h) {
    const zone = this.add.zone(
      this.cmdContainer.x + lx, this.cmdContainer.y + ly, w, h
    ).setOrigin(0, 0)
     .setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
     .setDepth(200);
    this._uiZones = this._uiZones || [];
    this._uiZones.push(zone);
    return zone;
  }
}
