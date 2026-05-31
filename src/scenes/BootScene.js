import Phaser from 'phaser';
import { AvatarStore } from '../data/AvatarStore.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import BUNDLED_ART from 'virtual:custom-art';
import { GT, applyText } from '../data/GameText.js';
import { CHARACTER_DEFS } from '../data/characters.js';
import { ENEMY_DEFS } from '../data/enemies.js';
import { SPELL_DEFS, ENEMY_ACTIONS } from '../data/spells.js';
import { ITEM_DEFS } from '../data/items.js';

// Draws all sprites procedurally — no external assets needed.
// Custom avatars/backgrounds saved by the player override procedural ones.
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.load.text('gametext', 'gametext.txt');

    const AVATAR_MAP = [
      ['hero1', 'hero1'],
      ['hero2', 'hero2'],
      ['hero3', 'hero3'],
      ['enemy_smallEnemy1',  'smallEnemy1'],
      ['enemy_smallEnemy2',  'smallEnemy2'],
      ['enemy_mediumEnemy1', 'mediumEnemy1'],
      ['enemy_bigEnemy1',    'bigEnemy1'],
      ['enemy_boss1',        'boss1'],
      ['enemy_boss2',        'boss2'],
      ['enemy_boss3',        'boss3'],
    ];
    const BG_MAP = [
      ['bg_title',    'title'],
      ['bg_world',    'world'],
      ['bg_town',     'town'],
      ['bg_dungeon1', 'b1'],
      ['bg_dungeon2', 'b2'],
      ['bg_dungeon3', 'b3'],
      ['bg_dungeon4', 'b4'],
      ['bg_dungeon5', 'b5'],
      ['bg_dungeon6', 'b6'],
      ['icon_town',      'townIcon'],
      ['icon_dungeon',   'dungeonIcon'],
      ['bg_bootcamp',    'bootcamp'],
      ['icon_bootcamp',  'bootcampIcon'],
    ];

    // Bundled base64 images are the guaranteed default (no network needed).
    // We also try loading from custom-art/<file>.png at runtime so a Netlify
    // public-folder upload can override any image without a rebuild.
    // The __net keys hold the URL attempt; create() swaps them in if they loaded.
    this._netOverrideKeys = [];

    for (const [key, file] of AVATAR_MAP) {
      const saved = AvatarStore.get(key);
      if (saved) {
        this.load.image(key, saved);        // player's custom upload
      } else {
        this.load.image(key, BUNDLED_ART[`${file}.png`]);  // bundled default
        this.load.image(`${key}__net`, `custom-art/${file}.png`);  // Netlify override attempt
        AvatarStore.markBundled(key);       // needs resize+flip in create()
        this._netOverrideKeys.push(key);
      }
    }
    for (const [key, file] of BG_MAP) {
      const saved = BackgroundStore.get(key);
      if (saved) {
        this.load.image(key, saved);        // player's custom upload
      } else {
        this.load.image(key, BUNDLED_ART[`${file}.png`]);  // bundled default
        this.load.image(`${key}__net`, `custom-art/${file}.png`);  // Netlify override attempt
        BackgroundStore.markBundled(key);   // needs resize in create()
        this._netOverrideKeys.push(key);
      }
    }
  }

  create() {
    // Swap in Netlify override if the URL loaded (404 leaves the bundled default in place)
    for (const key of (this._netOverrideKeys || [])) {
      const netKey = `${key}__net`;
      if (!this.textures.exists(netKey)) continue;
      const img = this.textures.getFrame(netKey).source.image;
      this.textures.remove(key);
      this.textures.addImage(key, img);
      this.textures.remove(netKey);
    }

    // Apply gametext.txt overrides (if the file loaded; 404 is silently ignored)
    const rawGT = this.cache.text.get('gametext');
    if (rawGT) applyText(rawGT);
    document.title = GT.gameTitle;

    // Patch data DEFs so all scenes read the configured names at runtime
    CHARACTER_DEFS.hero1Role.name  = GT.hero1Name;
    CHARACTER_DEFS.hero1Role.class = GT.hero1Class;
    CHARACTER_DEFS.hero1Role.armor = GT.hero1Armor;
    CHARACTER_DEFS.hero2Role.name   = GT.hero2Name;
    CHARACTER_DEFS.hero2Role.class  = GT.hero2Class;
    CHARACTER_DEFS.hero2Role.armor  = GT.hero2Armor;
    CHARACTER_DEFS.hero3Role.name     = GT.hero3Name;
    CHARACTER_DEFS.hero3Role.class    = GT.hero3Class;
    CHARACTER_DEFS.hero3Role.armor    = GT.hero3Armor;

    ENEMY_DEFS.smallEnemy1.name  = GT.smallEnemy1Name;
    ENEMY_DEFS.smallEnemy2.name  = GT.smallEnemy2Name;
    ENEMY_DEFS.mediumEnemy1.name = GT.mediumEnemy1Name;
    ENEMY_DEFS.bigEnemy1.name    = GT.bigEnemy1Name;
    ENEMY_DEFS.boss1.name       = GT.boss1Name;
    ENEMY_DEFS.boss2.name       = GT.boss2Name;
    ENEMY_DEFS.boss3.name       = GT.boss3Name;

    SPELL_DEFS.fire.name               = GT.spellFire;
    SPELL_DEFS.ice.name                = GT.spellIce;
    SPELL_DEFS.thunder.name            = GT.spellThunder;
    SPELL_DEFS.quake.name              = GT.spellQuake;
    SPELL_DEFS.mend.name               = GT.spellMend;
    SPELL_DEFS.heal.name               = GT.spellHeal;
    SPELL_DEFS.enchant.name            = GT.spellEnchant;
    SPELL_DEFS.awaken.name             = GT.spellAwaken;
    SPELL_DEFS.revive.name             = GT.spellRevive;
    SPELL_DEFS.hero1Special1.name      = GT.spellHero1Special1;
    SPELL_DEFS.hero1Special2.name      = GT.spellHero1Special2;
    SPELL_DEFS.hero1Special3.name      = GT.spellHero1Special3;
    SPELL_DEFS.hero1Special4.name      = GT.spellHero1Special4;
    SPELL_DEFS.hero2Special1.name      = GT.spellHero2Special1;
    SPELL_DEFS.hero2Special2.name      = GT.spellHero2Special2;
    SPELL_DEFS.hero2Special3.name      = GT.spellHero2Special3;
    SPELL_DEFS.hero2Special4.name      = GT.spellHero2Special4;
    SPELL_DEFS.hero3Special1.name      = GT.spellHero3Special1;
    SPELL_DEFS.hero3Special2.name      = GT.spellHero3Special2;
    SPELL_DEFS.hero3Special3.name      = GT.spellHero3Special3;

    ITEM_DEFS.potion.name      = GT.itemPotion;
    ITEM_DEFS.hiPotion.name    = GT.itemHiPotion;
    ITEM_DEFS.ether.name       = GT.itemEther;
    ITEM_DEFS.revivalDrop.name = GT.itemRevivalDrop;
    ITEM_DEFS.antidote.name    = GT.itemAntidote;

    ITEM_DEFS.potion.description      = GT.itemPotionDesc;
    ITEM_DEFS.hiPotion.description    = GT.itemHiPotionDesc;
    ITEM_DEFS.ether.description       = GT.itemEtherDesc;
    ITEM_DEFS.revivalDrop.description = GT.itemRevivalDropDesc;
    ITEM_DEFS.antidote.description    = GT.itemAntidoteDesc;

    ENEMY_ACTIONS.attack.name                = GT.actionBasicAttack;
    ENEMY_ACTIONS.smallEnemy2Attack1.name   = GT.actionSmallEnemy2Attack1;
    ENEMY_ACTIONS.mediumEnemy1Attack1.name  = GT.actionMediumEnemy1Attack1;
    ENEMY_ACTIONS.mediumEnemy1Attack2.name  = GT.actionMediumEnemy1Attack2;
    ENEMY_ACTIONS.bigEnemy1Attack1.name     = GT.actionBigEnemy1Attack1;
    ENEMY_ACTIONS.bigEnemy1Attack2.name     = GT.actionBigEnemy1Attack2;
    ENEMY_ACTIONS.bigEnemy1Attack3.name     = GT.actionBigEnemy1Attack3;
    ENEMY_ACTIONS.boss1MagicAttack1.name    = GT.actionBoss1MagicAttack1;
    ENEMY_ACTIONS.boss1MagicAttack2.name    = GT.actionBoss1MagicAttack2;
    ENEMY_ACTIONS.boss1PhysicalAttack1.name = GT.actionBoss1PhysicalAttack1;
    ENEMY_ACTIONS.boss1SpecialAttack1.name  = GT.actionBoss1SpecialAttack1;
    ENEMY_ACTIONS.boss1Drain.name           = GT.actionBoss1Drain;
    ENEMY_ACTIONS.boss2PhysicalAttack1.name = GT.actionBoss2PhysicalAttack1;
    ENEMY_ACTIONS.boss2MagicAttack1.name    = GT.actionBoss2MagicAttack1;
    ENEMY_ACTIONS.boss2SpecialAttack1.name  = GT.actionBoss2SpecialAttack1;
    ENEMY_ACTIONS.boss2PhysicalAttack2.name = GT.actionBoss2PhysicalAttack2;
    ENEMY_ACTIONS.boss2MagicAttack2.name    = GT.actionBoss2MagicAttack2;
    ENEMY_ACTIONS.boss2Drain.name           = GT.actionBoss2Drain;
    ENEMY_ACTIONS.boss3MagicAttack1.name    = GT.actionBoss3MagicAttack1;
    ENEMY_ACTIONS.boss3MagicAttack2.name    = GT.actionBoss3MagicAttack2;
    ENEMY_ACTIONS.boss3PhysicalAttack1.name = GT.actionBoss3PhysicalAttack1;
    ENEMY_ACTIONS.boss3MagicAttack3.name    = GT.actionBoss3MagicAttack3;
    ENEMY_ACTIONS.boss3SpecialAttack1.name  = GT.actionBoss3SpecialAttack1;
    ENEMY_ACTIONS.boss3MagicAttack4.name    = GT.actionBoss3MagicAttack4;
    ENEMY_ACTIONS.boss3Drain.name           = GT.actionBoss3Drain;

    this._processBundledTextures();
    this.generateTextures();

    // Try to start music immediately (works when autoplay is permitted).
    // If the AudioContext is suspended (incognito / strict autoplay policy),
    // tryStart resumes it on first gesture and restarts the scheduler.
    MusicSystem.play('title');
    const tryStart = () => {
      const wasSuspended = MusicSystem._ctx && MusicSystem._ctx.state === 'suspended';
      if (wasSuspended || !MusicSystem.currentTrackId) {
        MusicSystem.forcePlay('title');
      }
    };
    document.addEventListener('pointerdown', tryStart, { once: true });
    document.addEventListener('keydown',     tryStart, { once: true });

    this.scene.start('TitleScene', {});
  }

  _processBundledTextures() {
    const AVATAR_SIZES = {
      'hero1':        { w: 128, h: 128 },
      'hero2':         { w: 128, h: 128 },
      'hero3':           { w: 128, h: 128 },
      'enemy_smallEnemy1':   { w: 128, h: 128 },
      'enemy_smallEnemy2':   { w: 128, h: 128 },
      'enemy_mediumEnemy1':  { w: 128, h: 128 },
      'enemy_bigEnemy1':     { w: 128, h: 128 },
      'enemy_boss1':   { w: 256, h: 256 },
      'enemy_boss2': { w: 256, h: 256 },
      'enemy_boss3':    { w: 256, h: 256 },
    };
    const BG_SIZES = {
      'bg_title':    { w: 480, h: 854 },
      'bg_world':    { w: 480, h: 854 },
      'bg_town':     { w: 480, h: 854 },
      'bg_dungeon1': { w: 480, h: 854 },
      'bg_dungeon2': { w: 480, h: 854 },
      'bg_dungeon3': { w: 480, h: 854 },
      'bg_dungeon4': { w: 480, h: 854 },
      'bg_dungeon5': { w: 480, h: 854 },
      'bg_dungeon6': { w: 480, h: 854 },
      'icon_town':      { w: 64,  h: 64  },
      'icon_dungeon':   { w: 64,  h: 64  },
      'bg_bootcamp':    { w: 480, h: 854 },
      'icon_bootcamp':  { w: 64,  h: 64  },
    };

    for (const [key, { w, h }] of Object.entries(AVATAR_SIZES)) {
      if (!AvatarStore._bundled.has(key)) continue;
      if (!this.textures.exists(key)) continue;
      const src = this.textures.getFrame(key).source.image;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, 0, 0, w, h);
      this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
      // Keep key in _bundled set — hasCustom() uses it; no localStorage write needed
    }

    for (const [key, { w, h }] of Object.entries(BG_SIZES)) {
      if (!BackgroundStore._bundled.has(key)) continue;
      if (!this.textures.exists(key)) continue;
      const src = this.textures.getFrame(key).source.image;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(src, 0, 0, w, h);
      this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
      // Keep key in _bundled set — hasCustom() uses it; no localStorage write needed
    }
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // ── Hero sprites (48×64) ──────────────────────────────────────────────
    this.heroSprite(g, 'hero1', 0x4488ff, 0x2244aa);
    this.heroSprite(g, 'hero2', 0xffee44, 0xcc9900);
    this.heroSprite(g, 'hero3', 0xaa44ff, 0x661188);

    // ── Enemy sprites ────────────────────────────────────────────────────
    this.smallEnemy1Sprite(g, 'enemy_smallEnemy1',  0x44cc44);
    this.smallEnemy2Sprite(g, 'enemy_smallEnemy2',  0xff6622);
    this.mediumEnemy1Sprite(g,'enemy_mediumEnemy1', 0x334488);
    this.bigEnemy1Sprite(g,   'enemy_bigEnemy1',    0x88ddff);
    this.boss1Sprite(g,     'enemy_boss1',0xcc2200);
    this.boss2Sprite(g,'enemy_boss2', 0x44ccff);
    this.boss3Sprite(g,   'enemy_boss3',    0x8800cc);

    // ── UI elements ──────────────────────────────────────────────────────
    this.panelTexture(g, 'panel_dark',  0x111122, 0x445588, 200, 60);
    this.panelTexture(g, 'panel_gold',  0x221100, 0xaa6600, 200, 60);
    this.panelTexture(g, 'panel_battle',0x0a0a1a, 0x224488, 320, 80);

    // ── World map tiles ──────────────────────────────────────────────────
    this.tileTexture(g, 'tile_grass',  0x226633);
    this.tileTexture(g, 'tile_water',  0x1144aa);
    this.tileTexture(g, 'tile_mtn',    0x665544);
    this.tileTexture(g, 'tile_dungeon',0x332222);

    // ── Battle backgrounds ───────────────────────────────────────────────
    this.battleBg(g, 'bg_field',    0x112244, 0x225511);
    this.battleBg(g, 'bg_dungeon1', 0x1a1133, 0x2a1144); // B1 — purple-blue
    this.battleBg(g, 'bg_dungeon2', 0x110022, 0x220033); // B2 — deep violet
    this.battleBg(g, 'bg_dungeon3', 0x110011, 0x220011); // B3 — crimson-dark
    this.battleBg(g, 'bg_dungeon4', 0x001122, 0x002244); // B4 — deep blue
    this.battleBg(g, 'bg_dungeon5', 0x000022, 0x001133); // B5 — dark navy
    this.battleBg(g, 'bg_dungeon6', 0x000011, 0x000022); // B6 — near black
    // ── Scene backgrounds (used as fallback preview + custom bg target) ──
    this.battleBg(g, 'bg_world',    0x1a3a1a, 0x0a2a0a); // World Map
    this.battleBg(g, 'bg_town',     0x221a00, 0x332200); // Town

    // ── World map location icons ──────────────────────────────────────────
    this.locationIcon(g, 'icon_town',    0xffdd88, '⌂');
    this.locationIcon(g, 'icon_dungeon', 0x8844ff, '◆');

    g.destroy();
  }

  heroSprite(g, key, bodyColor, shadowColor) {
    if (this.textures.exists(key)) return;
    const W = 64, H = 64;
    g.clear();
    // Shadow
    g.fillStyle(shadowColor);
    g.fillEllipse(W/2, H - 4, 40, 10);
    // Body
    g.fillStyle(bodyColor);
    g.fillRect(16, 26, 32, 26);
    // Head
    g.fillStyle(0xffccaa);
    g.fillCircle(W/2, 20, 14);
    // Arms
    g.fillStyle(bodyColor);
    g.fillRect(8, 28, 10, 20);
    g.fillRect(46, 28, 10, 20);
    // Legs
    g.fillStyle(0x223355);
    g.fillRect(18, 52, 10, 12);
    g.fillRect(36, 52, 10, 12);
    // Weapon glow
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(2, 24, 5, 20);

    g.generateTexture(key, W, H);
  }

  smallEnemy1Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(color);
    g.fillEllipse(32, 36, 48, 36);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(24, 28, 14, 10);
    g.fillStyle(0x000000);
    g.fillCircle(26, 30, 3);
    g.fillCircle(38, 30, 3);
    g.generateTexture(key, 64, 64);
  }

  smallEnemy2Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(color);
    g.fillRect(20, 28, 24, 24);
    g.fillCircle(32, 22, 14);
    g.fillStyle(0x000000);
    g.fillCircle(26, 20, 3);
    g.fillCircle(38, 20, 3);
    g.fillStyle(color);
    g.fillRect(10, 30, 10, 16);
    g.fillRect(44, 30, 10, 16);
    g.fillRect(22, 52, 8, 10);
    g.fillRect(34, 52, 8, 10);
    // Spear
    g.fillStyle(0xaaaaaa);
    g.fillRect(54, 10, 4, 40);
    g.generateTexture(key, 64, 64);
  }

  mediumEnemy1Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(color);
    g.fillRect(14, 20, 36, 36);
    g.fillStyle(0x556677);
    g.fillRect(18, 14, 28, 20); // helmet
    g.fillStyle(0xff4400, 0.8);
    g.fillRect(22, 22, 20, 4);  // visor
    g.fillStyle(color);
    g.fillRect(6, 22, 8, 24);
    g.fillRect(50, 22, 8, 24);
    g.fillRect(18, 56, 10, 8);
    g.fillRect(36, 56, 10, 8);
    // Sword
    g.fillStyle(0xcccccc);
    g.fillRect(56, 8, 5, 36);
    g.fillStyle(0x884400);
    g.fillRect(52, 22, 14, 4);
    g.generateTexture(key, 64, 64);
  }

  bigEnemy1Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(color);
    g.fillRect(10, 16, 44, 44);
    g.fillRect(16, 8, 32, 20);
    g.fillStyle(0x004488);
    g.fillRect(20, 12, 8, 8);
    g.fillRect(36, 12, 8, 8);
    g.fillStyle(color);
    g.fillRect(0, 20, 10, 28);
    g.fillRect(54, 20, 10, 28);
    g.fillRect(14, 60, 14, 10);
    g.fillRect(36, 60, 14, 10);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(14, 20, 36, 6);
    g.generateTexture(key, 64, 80);
  }

  boss1Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(color);
    // Body
    g.fillEllipse(64, 56, 80, 50);
    // Head
    g.fillEllipse(108, 30, 44, 32);
    // Snout
    g.fillRect(116, 34, 24, 14);
    // Eye
    g.fillStyle(0xffff00);
    g.fillCircle(112, 26, 5);
    g.fillStyle(0x000000);
    g.fillCircle(113, 26, 3);
    // Wing left
    g.fillStyle(color);
    g.fillTriangle(10, 20, 50, 50, 30, 70);
    // Wing right (upper)
    g.fillTriangle(70, 10, 100, 50, 40, 60);
    // Tail
    g.fillStyle(color);
    g.fillEllipse(18, 68, 30, 16);
    g.fillEllipse(6, 72, 14, 10);
    // Claws
    g.fillStyle(0xaa0000);
    g.fillRect(46, 74, 6, 10);
    g.fillRect(58, 76, 6, 10);
    g.fillRect(70, 74, 6, 10);
    g.generateTexture(key, 140, 140);
  }

  boss2Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    // Crystalline body — stacked diamond shapes
    g.fillStyle(color, 0.9);
    g.fillTriangle(70, 10, 40, 55, 100, 55); // top crystal spike
    g.fillTriangle(70, 130, 40, 85, 100, 85); // bottom
    g.fillRect(42, 50, 56, 38);               // mid body
    // Inner glow
    g.fillStyle(0xffffff, 0.3);
    g.fillTriangle(70, 22, 54, 52, 86, 52);
    // Side spikes
    g.fillStyle(color, 0.85);
    g.fillTriangle(10, 48, 42, 58, 30, 80);
    g.fillTriangle(130, 48, 98, 58, 110, 80);
    // Eyes
    g.fillStyle(0xffff00);
    g.fillCircle(58, 66, 5);
    g.fillCircle(82, 66, 5);
    g.fillStyle(0x000000);
    g.fillCircle(59, 66, 3);
    g.fillCircle(83, 66, 3);
    g.generateTexture(key, 140, 140);
  }

  boss3Sprite(g, key, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    // Cape / silhouette
    g.fillStyle(0x110011);
    g.fillTriangle(70, 130, 20, 60, 120, 60);
    // Body
    g.fillStyle(color, 0.9);
    g.fillRect(42, 40, 56, 60);
    // Head
    g.fillStyle(0x220022);
    g.fillCircle(70, 32, 22);
    // Crown horns
    g.fillStyle(color);
    g.fillTriangle(50, 16, 44, 0, 58, 14);
    g.fillTriangle(70, 10, 63, 0, 77, 0);
    g.fillTriangle(90, 16, 82, 14, 96, 0);
    // Eyes — glowing red
    g.fillStyle(0xff0000);
    g.fillCircle(60, 30, 6);
    g.fillCircle(80, 30, 6);
    g.fillStyle(0xffff00, 0.8);
    g.fillCircle(60, 30, 3);
    g.fillCircle(80, 30, 3);
    // Orb weapon
    g.fillStyle(color, 0.7);
    g.fillCircle(105, 80, 14);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(100, 75, 5);
    g.generateTexture(key, 140, 140);
  }

  panelTexture(g, key, bg, border, w, h) {
    g.clear();
    g.fillStyle(bg, 0.92);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, border, 1);
    g.strokeRect(1, 1, w - 2, h - 2);
    g.generateTexture(key, w, h);
  }

  tileTexture(g, key, color) {
    g.clear();
    g.fillStyle(color);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture(key, 32, 32);
  }

  locationIcon(g, key, color, symbol) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(color, 1);
    g.fillCircle(32, 32, 28);
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(32, 34, 28);
    g.fillStyle(color, 1);
    g.fillCircle(32, 30, 26);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(32, 30, 26);
    g.generateTexture(key, 64, 64);
  }

  battleBg(g, key, topColor, botColor) {
    if (this.textures.exists(key)) return;
    g.clear();
    // Sky / ceiling gradient approximation
    g.fillStyle(topColor);
    g.fillRect(0, 0, 480, 120);
    g.fillStyle(botColor);
    g.fillRect(0, 120, 480, 200);
    // Ground line
    g.lineStyle(2, 0xffffff, 0.3);
    g.lineBetween(0, 120, 480, 120);
    g.generateTexture(key, 480, 320);
  }
}
