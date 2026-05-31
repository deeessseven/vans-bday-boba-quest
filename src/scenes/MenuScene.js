import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { ITEM_DEFS, useItem } from '../data/items.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { SoundSystem } from '../audio/SoundSystem.js';
import { AvatarStore } from '../data/AvatarStore.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { WEAPON_DEFS } from '../data/weapons.js';
import { GT } from '../data/GameText.js';
import { showQuitConfirm } from '../ui/QuitConfirm.js';

function getAvatarList() {
  return [
    { key: 'hero1',       label: GT.hero1Name,   sub: GT.hero1Class },
    { key: 'hero2',        label: GT.hero2Name,   sub: GT.hero2Class },
    { key: 'hero3',          label: GT.hero3Name,   sub: GT.hero3Class },
    { key: 'enemy_smallEnemy1',        label: GT.smallEnemy1Name,  sub: 'Enemy' },
    { key: 'enemy_smallEnemy2',       label: GT.smallEnemy2Name,  sub: 'Enemy' },
    { key: 'enemy_mediumEnemy1',  label: GT.mediumEnemy1Name, sub: 'Enemy' },
    { key: 'enemy_bigEnemy1',   label: GT.bigEnemy1Name,    sub: 'Enemy' },
    { key: 'enemy_boss1',        label: GT.boss1Name,   sub: 'Boss 1' },
    { key: 'enemy_boss2',        label: GT.boss2Name,   sub: 'Boss 2' },
    { key: 'enemy_boss3',        label: GT.boss3Name,   sub: 'Final Boss' },
  ];
}

// Canonical display order for items in the Items tab
const ITEM_DISPLAY_ORDER = ['potion', 'hiPotion', 'ether', 'revivalDrop', 'antidote'];

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  init(data) {
    this.returnScene = data.returnScene || 'WorldScene';
    this.activeTab = 'party';
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    // Dark overlay behind menu — also interactive to block taps reaching the scene underneath
    this.add.rectangle(width / 2, height / 2, width, height, 0x000022, 0.97)
      .setInteractive();

    // Disable the underlying scene's input so taps can't reach it through the menu
    const underlying = this.scene.get(this.returnScene);
    if (underlying) underlying.input.enabled = false;
    this.events.once('shutdown', () => {
      const ul = this.scene.get(this.returnScene);
      if (ul) {
        ul.input.enabled = true;
        ul.refreshStatusBar?.();
      }
    });

    this.add.text(width / 2, 20, 'MENU', {
      fontSize: '32px', color: '#aaccff', fontFamily: 'serif'
    }).setOrigin(0.5);

    // Tabs
    const tabs = [
      { id: 'party',   label: 'Party' },
      { id: 'items',   label: 'Items' },
      { id: 'avatars', label: 'Avatars' },
      { id: 'bgs',     label: 'Backgrounds' }
    ];
    this.tabBtns = {};
    const tabPad = 8;
    tabs.forEach((tab, i) => {
      const x = tabPad + (i + 0.5) * ((width - tabPad * 2) / tabs.length);
      const btn = this.add.text(x, 32, tab.label, {
        fontSize: '19px', fontFamily: 'serif',
        color: this.activeTab === tab.id ? '#ffffff' : '#556699'
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.switchTab(tab.id));
      this.tabBtns[tab.id] = btn;
    });

    this.contentContainer = this.add.container(0, 64);
    this.renderTab();

    // Quit button (top left)
    const qBx = 8, qBy = 3, qBw = 72, qBh = 28;
    const quitBg = this.add.graphics();
    const drawQuit = (hov) => {
      quitBg.clear();
      quitBg.fillStyle(hov ? 0x3a1122 : 0x1a0a0f, 0.95);
      quitBg.fillRoundedRect(qBx, qBy, qBw, qBh, 5);
      quitBg.lineStyle(1, hov ? 0xff8899 : 0x664455, 1);
      quitBg.strokeRoundedRect(qBx, qBy, qBw, qBh, 5);
    };
    drawQuit(false);
    const quitBtn = this.add.text(qBx + qBw / 2, qBy + qBh / 2, 'QUIT', {
      fontSize: '20px', color: '#cc8899', fontFamily: 'serif'
    }).setOrigin(0.5);
    quitBg.setInteractive(new Phaser.Geom.Rectangle(qBx, qBy, qBw, qBh), Phaser.Geom.Rectangle.Contains);
    quitBg.on('pointerdown', () => showQuitConfirm(this, () => {
      this.scene.stop(this.returnScene);
      this.scene.start('TitleScene', {});
    }));
    quitBg.on('pointerover',  () => { drawQuit(true);  quitBtn.setColor('#ffbbcc'); });
    quitBg.on('pointerout',   () => { drawQuit(false); quitBtn.setColor('#cc8899'); });

    // Difficulty label (between MENU title and close X)
    const diffLabel = GameState.getDifficultyLabel();
    const diffColor = GameState.getDifficultyColor();
    this.add.text((width / 2 + (width - 14)) / 2, 22, diffLabel, {
      fontSize: '22px', color: diffColor, fontFamily: 'serif', fontStyle: 'italic'
    }).setOrigin(0.5, 0.5);

    // Close
    const closeBtn = this.add.text(width - 14, 22, '✕', {
      fontSize: '40px', color: '#cc6666'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.scene.stop('MenuScene');
    });

    // Bottom bar: gold (left), SFX toggle (right-center), Music toggle (right)
    this.add.text(14, height - 14, `💰 ${GameState.gold} Gold`, {
      fontSize: '20px', color: '#ffdd88', fontFamily: 'monospace'
    }).setOrigin(0, 1);

    const muteBtn = this.add.text(width - 14, height - 14,
      MusicSystem.getMuted() ? '🔇 Music Off' : '🔊 Music On', {
        fontSize: '20px', color: '#8899bb', fontFamily: 'monospace'
      }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      const muted = MusicSystem.toggleMute();
      muteBtn.setText(muted ? '🔇 Music Off' : '🔊 Music On');
      sfxBtn.setX(width - 14 - muteBtn.width - 16);
    });

    const sfxBtn = this.add.text(width - 14 - muteBtn.width - 16, height - 14,
      SoundSystem.getSfxMuted() ? '🔇 SFX Off' : '🔊 SFX On', {
        fontSize: '20px', color: '#8899bb', fontFamily: 'monospace'
      }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    sfxBtn.on('pointerdown', () => {
      const muted = SoundSystem.toggleSfxMute();
      sfxBtn.setText(muted ? '🔇 SFX Off' : '🔊 SFX On');
    });
  }

  switchTab(id) {
    this.activeTab = id;
    Object.entries(this.tabBtns).forEach(([tid, btn]) => {
      btn.setColor(tid === id ? '#ffffff' : '#556699');
    });
    this.contentContainer.removeAll(true);
    this.renderTab();
  }

  renderTab() {
    if      (this.activeTab === 'party')   this.renderParty();
    else if (this.activeTab === 'items')   this.renderItems();
    else if (this.activeTab === 'avatars') this.renderAvatars();
    else if (this.activeTab === 'bgs')     this.renderBackgrounds();
  }

  renderParty() {
    const { W } = this;
    const CARD_H  = 242;
    const CARD_W  = W - 16;
    const SPACING = 250;
    const BX      = 12;
    const BAR_W   = CARD_W - 48;

    const STATUS_META = {
      dead:   { label: 'KO',  fill: 0xcc2200, text: '#ffffff' },
      poison: { label: 'PSN', fill: 0x228833, text: '#aaffaa' },
      sleep:  { label: 'SLP', fill: 0x224499, text: '#aaccff' }
    };

    GameState.party.forEach((hero, i) => {
      const card = this.add.container(8, i * SPACING);
      const isDead    = hero.status === 'dead';
      const hasStatus = hero.status !== 'normal';
      const hpPct  = hero.maxHp  > 0 ? hero.hp  / hero.maxHp  : 0;
      const expPct = hero.expNext > 0 ? hero.exp / hero.expNext : 0;

      const accentCol = isDead ? 0xaa2200 : 0x4488ff;
      const borderCol = isDead ? 0x771100 : hasStatus ? 0xaa7700 : 0x2a4070;
      const hpBarCol  = hpPct > 0.7 ? 0x22cc55 : hpPct > 0.3 ? 0xddcc00 : 0xff3322;

      // ── Card background ─────────────────────────────────────────────
      const bg = this.add.graphics();
      bg.fillStyle(isDead ? 0x180808 : 0x0c1224, 0.96);
      bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 8);
      bg.lineStyle(2, borderCol, 1);
      bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 8);
      bg.fillStyle(accentCol, isDead ? 0.35 : 0.85);
      bg.fillRect(0, 8, 4, CARD_H - 16);
      card.add(bg);

      // ── Header row: Name | Weapon | Class · Lv ──────────────────────
      card.add(this.add.text(BX + 6, 8, hero.name, {
        fontSize: '26px', color: isDead ? '#ff6666' : '#e8f2ff',
        fontFamily: 'serif', fontStyle: 'bold'
      }));

      const weapDef = WEAPON_DEFS[hero.weaponId];
      const weapLabel = weapDef
        ? `⚔ ${weapDef.name}${weapDef.bonus > 0 ? ` (+${weapDef.bonus})` : ''}`
        : `⚔ ${hero.weapon || '—'}`;
      card.add(this.add.text(238, 12, weapLabel, {
        fontSize: '18px', color: '#7799bb', fontFamily: 'monospace'
      }));

      const classLvLabel = `${hero.class}  ·  Lv.${hero.level}`;
      const classCol = isDead ? '#aa4444' : hasStatus ? '#ccaa44' : '#6688aa';
      card.add(this.add.text(BX + 6, 36, classLvLabel, {
        fontSize: '19px', color: classCol, fontFamily: 'monospace'
      }));

      // ── HP bar ───────────────────────────────────────────────────────
      this._statBar(card, BX, 64, BAR_W, 'HP', hero.hp, hero.maxHp, 0x112211, hpBarCol, '#e8ffe8');

      // ── MP bar ───────────────────────────────────────────────────────
      this._statBar(card, BX, 96, BAR_W, 'MP', hero.mp, hero.maxMp, 0x0a0a22, 0x2255ee, '#aaaaff');

      // ── Stat row ─────────────────────────────────────────────────────
      const STATS = [
        { label: 'ATK', val: hero.atk, col: '#ffaa55' },
        { label: 'DEF', val: hero.def, col: '#55aaff' },
        { label: 'MAG', val: hero.mag, col: '#cc77ff' },
        { label: 'SPD', val: hero.spd, col: '#55ffcc' }
      ];
      const SW = (CARD_W - BX * 2) / 4;
      const STAT_GAP = SW * 0.5; // 50% tighter spacing between stats
      STATS.forEach((s, si) => {
        const sx = BX + 6 + si * STAT_GAP;
        card.add(this.add.text(sx, 120, s.label, {
          fontSize: '18px', color: '#445566', fontFamily: 'monospace'
        }));
        card.add(this.add.text(sx, 139, String(s.val), {
          fontSize: '27px', color: s.col, fontFamily: 'monospace', fontStyle: 'bold'
        }));
      });
      // Status badge at far right of stat row
      if (hasStatus) {
        const statusMeta = STATUS_META[hero.status] || { label: hero.status.slice(0,3).toUpperCase(), fill: 0x886600, text: '#ffee88' };
        const sbg = this.add.graphics();
        sbg.fillStyle(statusMeta.fill, 0.9);
        sbg.fillRoundedRect(CARD_W - 62, 120, 54, 40, 4);
        card.add(sbg);
        card.add(this.add.text(CARD_W - 35, 140, statusMeta.label, {
          fontSize: '22px', color: statusMeta.text, fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5));
      }

      // ── Divider ──────────────────────────────────────────────────────
      const div = this.add.graphics();
      div.lineStyle(1, borderCol, 0.35);
      div.lineBetween(BX, 178, CARD_W - 8, 178);
      card.add(div);

      // ── EXP section ──────────────────────────────────────────────────
      const EY = 183;
      card.add(this.add.text(BX + 6, EY, 'EXP', {
        fontSize: '17px', color: '#664499', fontFamily: 'monospace', fontStyle: 'bold'
      }));
      card.add(this.add.text(CARD_W - 8, EY, `${hero.exp} / ${hero.expNext}`, {
        fontSize: '17px', color: '#886699', fontFamily: 'monospace'
      }).setOrigin(1, 0));

      const EXP_BAR_Y = EY + 20;
      const EXP_W = CARD_W - 22;
      const expFill = Math.max(expPct > 0 ? 6 : 0, EXP_W * expPct);
      const expG = this.add.graphics();
      expG.fillStyle(0x110a1e, 1);
      expG.fillRoundedRect(BX + 2, EXP_BAR_Y, EXP_W, 16, 3);
      if (expFill > 0) {
        expG.fillStyle(0x4a1a88, 1);
        expG.fillRoundedRect(BX + 2, EXP_BAR_Y, expFill, 16, 3);
        expG.fillStyle(0x8844ff, 1);
        expG.fillRoundedRect(BX + 2, EXP_BAR_Y, expFill, 7, { tl:3, tr: expFill >= EXP_W ? 3 : 0, bl:0, br:0 });
      }
      expG.lineStyle(1, 0x1a0a30, 0.7);
      [0.25, 0.5, 0.75].forEach(p => {
        const tx = BX + 2 + EXP_W * p;
        expG.lineBetween(tx, EXP_BAR_Y, tx, EXP_BAR_Y + 16);
      });
      expG.lineStyle(1, 0x331155, 0.6);
      expG.strokeRoundedRect(BX + 2, EXP_BAR_Y, EXP_W, 16, 3);
      card.add(expG);

      card.add(this.add.text(BX + 2 + EXP_W / 2, EXP_BAR_Y + 8, `${Math.floor(expPct * 100)}%`, {
        fontSize: '19px', color: '#ccaaff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5));

      this.contentContainer.add(card);
    });
  }

  // Shared bar renderer used by HP and MP
  _statBar(card, bx, by, barW, label, cur, max, trackCol, fillCol, textCol) {
    const pct = max > 0 ? Math.min(1, cur / max) : 0;
    const fill = Math.max(pct > 0 ? 5 : 0, barW * pct);
    card.add(this.add.text(bx + 6, by + 1, label, {
      fontSize: '20px', color: '#445566', fontFamily: 'monospace', fontStyle: 'bold'
    }));
    const g = this.add.graphics();
    g.fillStyle(trackCol, 1);
    g.fillRoundedRect(bx + 33, by, barW, 16, 3);
    if (fill > 0) {
      g.fillStyle(fillCol, 1);
      g.fillRoundedRect(bx + 33, by, fill, 16, 3);
      // Highlight stripe on top half
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(bx + 33, by, fill, 7, { tl:3, tr: fill >= barW ? 3:0, bl:0, br:0 });
    }
    card.add(g);
    card.add(this.add.text(bx + 37, by - 3, `${cur} / ${max}`, {
      fontSize: '22px', color: textCol, fontFamily: 'monospace'
    }));
  }

  renderItems() {
    const { W } = this;
    const rawItems = GameState.getItemList().filter(({ item }) => item);
    // Sort by canonical display order
    const items = rawItems.slice().sort((a, b) => {
      const ai = ITEM_DISPLAY_ORDER.indexOf(a.item.id);
      const bi = ITEM_DISPLAY_ORDER.indexOf(b.item.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    if (items.length === 0) {
      this.contentContainer.add(this.add.text(10, 10, 'No items in inventory.', {
        fontSize: '28px', color: '#667799', fontFamily: 'serif'
      }));
      return;
    }

    items.forEach(({ item, qty }, i) => {
      const ry = i * 66;

      // Flat layout — objects added directly to contentContainer to avoid
      // Phaser nested-container hit-area transform bugs blocking the tab buttons.
      const bg = this.add.graphics();
      const draw = (h) => {
        bg.clear();
        bg.fillStyle(h ? 0x1a2a1a : 0x111822, 0.9);
        bg.fillRoundedRect(8, ry, W - 16, 62, 5);
        bg.lineStyle(1, h ? 0x448844 : 0x334455, 1);
        bg.strokeRoundedRect(8, ry, W - 16, 62, 5);
      };
      draw(false);
      this.contentContainer.add(bg);
      this.contentContainer.add(
        this.add.text(16, ry + 6, item.name, { fontSize: '26px', color: '#aaddcc', fontFamily: 'serif' })
      );
      this.contentContainer.add(
        this.add.text(16, ry + 38, item.description, { fontSize: '17px', color: '#556677', fontFamily: 'serif', fontStyle: 'italic' })
      );
      this.contentContainer.add(
        this.add.text(W - 52, ry - 2, `x${qty}`, { fontSize: '24px', color: '#aaaaaa', fontFamily: 'monospace' })
      );

      if (item.usableInBattle) {
        const useBtn = this.add.text(W - 16, ry + 18, '[USE]', {
          fontSize: '20px', color: '#88ffaa', fontFamily: 'monospace'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        useBtn.on('pointerdown', () => {
          if (item.type === 'revive' && !GameState.party.some(h => h.status === 'dead')) {
            this._showToast('Unusable —\nno knocked out (KO\'d) allies.');
            return;
          }
          const alive = GameState.party.filter(h => h.status !== 'dead');
          if (item.type === 'heal' && alive.every(h => h.hp >= h.maxHp)) {
            this._showToast('Unusable — ALL allies have full HP.');
            return;
          }
          if (item.type === 'mp' && alive.every(h => h.mp >= h.maxMp)) {
            this._showToast('Unusable — ALL allies have full MP.');
            return;
          }
          if (item.type === 'cure_status' && item.cures?.includes('poison') && !alive.some(h => h.status === 'poison')) {
            this._showToast('Unusable — no ally is poisoned.');
            return;
          }
          this._showHeroSelector(item);
        });
        this.contentContainer.add(useBtn);
      }
    });
  }

  _showToast(msg) {
    const { W, H } = this;
    const txt = this.add.text(W / 2, H * 0.85, msg, {
      fontSize: '26px', color: '#ffaa44', fontFamily: 'serif',
      backgroundColor: '#000022', padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(1800, () => txt.destroy());
  }

  _showHeroSelector(item) {
    // Overlay for selecting which hero to use an item on
    const { W, H } = this;
    const overlay = this.add.container(0, 0).setDepth(20);

    // Dim background
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.75);
    dim.fillRect(0, 0, W, H);
    overlay.add(dim);

    // Panel
    const panelW = W - 40, panelH = 320;
    const panelX = 20, panelY = H / 2 - panelH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x0a1428, 0.98);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0x4488cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    overlay.add(panel);

    overlay.add(this.add.text(W / 2, panelY + 18, `Use ${item.name} on:`, {
      fontSize: '24px', color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5, 0));

    GameState.party.forEach((hero, i) => {
      const btnY = panelY + 52 + i * 74;
      const isDead = hero.status === 'dead';
      const canUse = item.type === 'revive'
        ? isDead
        : !isDead
          && !(item.type === 'heal' && hero.hp >= hero.maxHp)
          && !(item.type === 'mp'   && hero.mp >= hero.maxMp)
          && !(item.type === 'cure_status' && !item.cures?.includes(hero.status));

      const btnBg = this.add.graphics();
      const drawBtn = (hov) => {
        btnBg.clear();
        btnBg.fillStyle(hov && canUse ? 0x1a3a66 : (canUse ? 0x0d1f3a : 0x1a0a0a), 0.95);
        btnBg.fillRoundedRect(panelX + 10, btnY, panelW - 20, 64, 6);
        btnBg.lineStyle(1, canUse ? (hov ? 0x88ccff : 0x336699) : 0x442222, 1);
        btnBg.strokeRoundedRect(panelX + 10, btnY, panelW - 20, 64, 6);
      };
      drawBtn(false);
      overlay.add(btnBg);

      // Hero name (line 1)
      overlay.add(this.add.text(panelX + 18, btnY + 6, hero.name, {
        fontSize: '22px', color: isDead ? '#ff6666' : '#aaddff', fontFamily: 'serif'
      }));

      // Status badge (top-right)
      const statusStr = isDead ? "[KO'd]" : (hero.status !== 'normal' ? `[${hero.status.toUpperCase()}]` : '');
      if (statusStr) {
        overlay.add(this.add.text(panelX + panelW - 28, btnY + 6, statusStr, {
          fontSize: '18px', color: isDead ? '#ff4444' : '#ffaa44', fontFamily: 'monospace'
        }).setOrigin(1, 0));
      }

      // HP and MP (line 2)
      const hpMpStr = isDead ? '' : `HP ${hero.hp}/${hero.maxHp}   MP ${hero.mp}/${hero.maxMp}`;
      overlay.add(this.add.text(panelX + 18, btnY + 34, hpMpStr, {
        fontSize: '18px', color: '#778899', fontFamily: 'monospace'
      }));

      if (canUse) {
        btnBg.setInteractive(
          new Phaser.Geom.Rectangle(panelX + 10, btnY, panelW - 20, 64),
          Phaser.Geom.Rectangle.Contains
        );
        btnBg.on('pointerover', () => drawBtn(true));
        btnBg.on('pointerout',  () => drawBtn(false));
        btnBg.on('pointerdown', () => {
          overlay.destroy();
          GameState.removeItem(item.id, 1);
          const result = useItem(item, hero);
          SoundSystem.play('item_' + item.type);
          if (result?.message) this._showToast(result.message);
          this.contentContainer.removeAll(true);
          this.renderTab();
        });
      }
    });

    // Cancel button
    const cancelBtn = this.add.text(W / 2, panelY + panelH - 22, '[ Cancel ]', {
      fontSize: '22px', color: '#aa6666', fontFamily: 'monospace'
    }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', () => overlay.destroy());
    overlay.add(cancelBtn);
  }

  // ── Avatars tab ───────────────────────────────────────────────────────

  renderAvatars() {
    const { W } = this;
    const ROW_H = 56;
    const CUSTOM_X = 260;

    this.contentContainer.add(this.add.text(8, -10, 'Upload an image to replace a character', {
      fontSize: '18px', color: '#556677', fontFamily: 'monospace', fontStyle: 'italic'
    }));

    getAvatarList().forEach((def, i) => {
      const ry   = 12 + i * ROW_H;
      const isPlayerCustom = AvatarStore.get(def.key) !== null;

      // Row background
      const bg = this.add.graphics();
      bg.fillStyle(isPlayerCustom ? 0x0d1f0d : 0x0d1020, 0.9);
      bg.fillRoundedRect(4, ry, W - 12, ROW_H - 4, 5);
      bg.lineStyle(1, isPlayerCustom ? 0x336633 : 0x223344, 1);
      bg.strokeRoundedRect(4, ry, W - 12, ROW_H - 4, 5);
      this.contentContainer.add(bg);

      // Sprite preview
      if (this.textures.exists(def.key)) {
        const prev = this.add.image(34, ry + (ROW_H - 4) / 2, def.key);
        const maxDim = Math.max(prev.width, prev.height);
        const scale  = Math.min(36 / prev.width, 40 / prev.height, 40 / maxDim);
        prev.setScale(scale);
        // All avatar textures (bundled and uploaded) are stored battle-flipped;
        // un-flip here so the preview shows the natural-facing image.
        prev.setFlipX(true);
        this.contentContainer.add(prev);
      }

      // Name — for hero entries use the live party name (respects custom names)
      const heroId = ['hero1', 'hero2', 'hero3'].includes(def.key) ? def.key + 'Role' : null;
      const heroMember = heroId ? GameState.party.find(h => h.id === heroId) : null;
      const displayName = heroMember ? heroMember.name : def.label;
      this.contentContainer.add(this.add.text(64, ry + 6, displayName, {
        fontSize: '21px', color: isPlayerCustom ? '#aaffaa' : '#aaccff', fontFamily: 'serif'
      }));
      // ✓ Custom badge — column-aligned at fixed X, same line as name
      if (isPlayerCustom) {
        this.contentContainer.add(this.add.text(CUSTOM_X, ry + 9, '✓ Custom', {
          fontSize: '14px', color: '#55aa55', fontFamily: 'monospace'
        }));
      }
      // Sub label + pixel dimensions
      this.contentContainer.add(this.add.text(64, ry + 30, def.sub, {
        fontSize: '15px', color: '#667788', fontFamily: 'monospace'
      }));
      const { w: sw, h: sh } = this._spriteSize(def.key);
      this.contentContainer.add(this.add.text(W - 110, ry + 30, `${sw} × ${sh} px`, {
        fontSize: '15px', color: '#445566', fontFamily: 'monospace'
      }).setOrigin(1, 0));

      // [Upload] button
      const uploadBtn = this.add.text(W - 14, ry + 6, '[Upload]', {
        fontSize: '19px', color: '#88aaff', fontFamily: 'monospace'
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      uploadBtn.on('pointerover', () => uploadBtn.setColor('#ffffff'));
      uploadBtn.on('pointerout',  () => uploadBtn.setColor('#88aaff'));
      uploadBtn.on('pointerdown', () => this._uploadAvatar(def.key));
      this.contentContainer.add(uploadBtn);

      // [Reset] button — only if a custom image is saved
      if (isPlayerCustom) {
        const resetBtn = this.add.text(W - 14, ry + 30, '[Reset]', {
          fontSize: '19px', color: '#aa6644', fontFamily: 'monospace'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        resetBtn.on('pointerover', () => resetBtn.setColor('#ff8866'));
        resetBtn.on('pointerout',  () => resetBtn.setColor('#aa6644'));
        resetBtn.on('pointerdown', () => this._resetAvatar(def.key));
        this.contentContainer.add(resetBtn);
      }
    });
  }

  // Target pixel dimensions for uploaded avatars — 2× the procedural sprite size
  _spriteSize(key) {
    if (key === 'enemy_bigEnemy1')  return { w: 128, h: 128 };
    if (key === 'enemy_boss1')      return { w: 256, h: 256 };
    if (key === 'enemy_boss2')      return { w: 256, h: 256 };
    if (key === 'enemy_boss3')      return { w: 256, h: 256 };
    return                                 { w: 128, h: 128 };
  }

  // Resize a data-URL to exact pixel dimensions using an offscreen canvas
  _resizeImage(dataUrl, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  _forceResume() {
    // Wake the RAF loop first (game.loop.sleep() was called by Phaser's
    // visibility handler when the OS file picker stole window focus).
    // game.resume() then clears the paused flag, and setActive/setVisible
    // restore the scene manager state.
    this.game.loop.wake();
    this.game.resume();
    this.scene.setActive(true);
    this.scene.setVisible(true);
  }

  _showUploadConfirm(onYes, onNo) {
    const { width, height } = this.scale;
    const boxW = width - 60, boxH = 180, boxX = 30, boxY = height / 2 - boxH / 2;

    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    const box = this.add.graphics().setDepth(51);
    box.fillStyle(0x0a0a22, 0.97);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 10);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 10);

    const msg = this.add.text(width / 2, boxY + 44, 'Uploading will reload the game.', {
      fontSize: '26px', color: '#ccddff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(52);

    const sub = this.add.text(width / 2, boxY + 82, 'Unsaved progress will be lost. Continue?', {
      fontSize: '20px', color: '#778899', fontFamily: 'serif', fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(52);

    const btnY = boxY + boxH - 38;
    const halfW = boxW / 2;
    const btnH = 48;
    const noX = boxX + 16;          const noW = halfW - 28;
    const yesX = boxX + halfW + 12; const yesW = halfW - 28;

    let noBg, noLbl, noHit, yesBg, yesLbl, yesHit;
    const destroy = () => {
      overlay.destroy(); box.destroy(); msg.destroy(); sub.destroy();
      noBg.destroy(); noLbl.destroy(); noHit.destroy();
      yesBg.destroy(); yesLbl.destroy(); yesHit.destroy();
    };

    noBg  = this.add.graphics().setDepth(52);
    noLbl = this.add.text(noX + noW / 2, btnY, 'Cancel', {
      fontSize: '28px', color: '#aaccff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(53);
    const drawNo = (hover) => {
      noBg.clear();
      noBg.fillStyle(hover ? 0x223355 : 0x111833, 1);
      noBg.fillRoundedRect(noX, btnY - btnH / 2, noW, btnH, 6);
      noBg.lineStyle(1.5, hover ? 0x6699cc : 0x334466, 1);
      noBg.strokeRoundedRect(noX, btnY - btnH / 2, noW, btnH, 6);
    };
    drawNo(false);
    noHit = this.add.rectangle(noX + noW / 2, btnY, noW, btnH)
      .setOrigin(0.5).setDepth(54).setInteractive({ useHandCursor: true });
    noHit.on('pointerover', () => { drawNo(true);  noLbl.setColor('#ffffff'); });
    noHit.on('pointerout',  () => { drawNo(false); noLbl.setColor('#aaccff'); });
    noHit.on('pointerdown', () => { destroy(); onNo(); });

    yesBg  = this.add.graphics().setDepth(52);
    yesLbl = this.add.text(yesX + yesW / 2, btnY, 'Upload', {
      fontSize: '28px', color: '#88ffaa', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(53);
    const drawYes = (hover) => {
      yesBg.clear();
      yesBg.fillStyle(hover ? 0x225533 : 0x112211, 1);
      yesBg.fillRoundedRect(yesX, btnY - btnH / 2, yesW, btnH, 6);
      yesBg.lineStyle(1.5, hover ? 0x66cc99 : 0x336644, 1);
      yesBg.strokeRoundedRect(yesX, btnY - btnH / 2, yesW, btnH, 6);
    };
    drawYes(false);
    yesHit = this.add.rectangle(yesX + yesW / 2, btnY, yesW, btnH)
      .setOrigin(0.5).setDepth(54).setInteractive({ useHandCursor: true });
    yesHit.on('pointerover', () => { drawYes(true);  yesLbl.setColor('#ffffff'); });
    yesHit.on('pointerout',  () => { drawYes(false); yesLbl.setColor('#88ffaa'); });
    yesHit.on('pointerdown', () => { destroy(); onYes(); });
  }

  _uploadAvatar(key) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/bmp,image/gif,image/webp';
    input.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0;pointer-events:none;';
    document.body.appendChild(input);

    const cleanup = () => {
      if (input.parentNode) document.body.removeChild(input);
    };

    // Restore Phaser as soon as the window regains focus (picker closed).
    // Use a native setTimeout — Phaser timers are frozen while the loop sleeps.
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      this._forceResume();
    };
    window.addEventListener('focus', onFocus);

    input.onchange = async (e) => {
      cleanup();
      window.removeEventListener('focus', onFocus);
      this._forceResume();

      const file = e.target.files[0];
      if (!file) return;

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = evt => resolve(evt.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { w, h } = this._spriteSize(key);
        const resized   = await this._resizeImage(dataUrl, w, h);

        const saved = AvatarStore.set(key, resized);
        if (!saved) { this._showAvatarMsg('Image too large to store.', '#ff6666'); return; }

        // Persist the texture key so BootScene reloads it on next start
        // then do a full page reload — the most reliable way to restore
        // Phaser's WebGL context after the OS file picker paused the game.
        window.location.reload();

      } catch {
        this._showAvatarMsg('Failed to process image.', '#ff6666');
      }
    };

    // cancel fires on modern browsers when picker is dismissed without a file
    input.addEventListener('cancel', () => {
      cleanup();
      window.removeEventListener('focus', onFocus);
      this._forceResume();
    });

    this._showUploadConfirm(
      () => input.click(),
      () => { cleanup(); window.removeEventListener('focus', onFocus); }
    );
  }

  _resetAvatar(key) {
    AvatarStore.remove(key);
    // Restore the procedural texture by removing the custom one and re-generating
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    if (key === 'hero1') { this._regenHeroSprite(g, key, 0x4488ff, 0x2244aa); }
    else if (key === 'hero3')    { this._regenHeroSprite(g, key, 0xaa44ff, 0x661188); }
    else if (key === 'hero2')  { this._regenHeroSprite(g, key, 0xffee44, 0xcc9900); }
    else { this._regenEnemySprite(g, key); }
    g.destroy();
    this.contentContainer.removeAll(true);
    this.renderAvatars();
  }

  _regenHeroSprite(g, key, bodyColor, shadowColor) {
    const W = 64, H = 64;
    const tmpKey = key + '__regen';
    g.clear();
    g.fillStyle(shadowColor); g.fillEllipse(W/2, H-4, 40, 10);
    g.fillStyle(bodyColor);   g.fillRect(16, 26, 32, 26);
    g.fillStyle(0xffccaa);    g.fillCircle(W/2, 20, 14);
    g.fillStyle(bodyColor);   g.fillRect(8, 28, 10, 20); g.fillRect(46, 28, 10, 20);
    g.fillStyle(0x223355);    g.fillRect(18, 52, 10, 12); g.fillRect(36, 52, 10, 12);
    g.fillStyle(0xffffff, 0.6); g.fillRect(2, 24, 5, 20);
    g.generateTexture(tmpKey, W, H);
    const src = this.textures.getFrame(tmpKey).source.image;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0, W, H);
    this.textures.remove(tmpKey);
    this.textures.addCanvas(key, canvas);
  }

  _regenEnemySprite(g, key) {
    g.clear();
    if (key === 'enemy_smallEnemy1') {
      g.fillStyle(0x44cc44); g.fillEllipse(32,36,48,36);
      g.fillStyle(0xffffff,0.3); g.fillEllipse(24,28,14,10);
      g.fillStyle(0x000000); g.fillCircle(26,30,3); g.fillCircle(38,30,3);
      g.generateTexture(key, 64, 64);
    } else if (key === 'enemy_smallEnemy2') {
      const c = 0xff6622;
      g.fillStyle(c); g.fillRect(20,28,24,24); g.fillCircle(32,22,14);
      g.fillStyle(0x000000); g.fillCircle(26,20,3); g.fillCircle(38,20,3);
      g.fillStyle(c); g.fillRect(10,30,10,16); g.fillRect(44,30,10,16);
      g.fillRect(22,52,8,10); g.fillRect(34,52,8,10);
      g.fillStyle(0xaaaaaa); g.fillRect(54,10,4,40);
      g.generateTexture(key, 64, 64);
    } else if (key === 'enemy_mediumEnemy1') {
      const c = 0x334488;
      g.fillStyle(c); g.fillRect(14,20,36,36);
      g.fillStyle(0x556677); g.fillRect(18,14,28,20);
      g.fillStyle(0xff4400,0.8); g.fillRect(22,22,20,4);
      g.fillStyle(c); g.fillRect(6,22,8,24); g.fillRect(50,22,8,24);
      g.fillRect(18,56,10,8); g.fillRect(36,56,10,8);
      g.fillStyle(0xcccccc); g.fillRect(56,8,5,36);
      g.fillStyle(0x884400); g.fillRect(52,22,14,4);
      g.generateTexture(key, 64, 64);
    } else if (key === 'enemy_bigEnemy1') {
      const c = 0x88ddff;
      g.fillStyle(c); g.fillRect(10,16,44,44); g.fillRect(16,8,32,20);
      g.fillStyle(0x004488); g.fillRect(20,14,8,8); g.fillRect(36,14,8,8);
      g.fillStyle(c); g.fillRect(0,20,10,28); g.fillRect(54,20,10,28);
      g.fillRect(14,60,14,10); g.fillRect(36,60,14,10);
      g.fillStyle(0xffffff,0.4); g.fillRect(14,20,36,6);
      g.generateTexture(key, 64, 80);
    } else if (key === 'enemy_boss1') {
      const c = 0xcc2200;
      g.fillStyle(c); g.fillEllipse(64,56,80,50); g.fillEllipse(108,30,44,32);
      g.fillRect(116,34,24,14);
      g.fillStyle(0xffff00); g.fillCircle(112,26,5);
      g.fillStyle(0x000000); g.fillCircle(113,26,3);
      g.fillStyle(c); g.fillTriangle(10,20,50,50,30,70);
      g.fillTriangle(70,10,100,50,40,60);
      g.fillEllipse(18,68,30,16); g.fillEllipse(6,72,14,10);
      g.fillStyle(0xaa0000); g.fillRect(46,74,6,10); g.fillRect(58,76,6,10); g.fillRect(70,74,6,10);
      g.generateTexture(key, 140, 140);
    } else if (key === 'enemy_boss2') {
      const c = 0x44ccff;
      g.fillStyle(c, 0.9);
      g.fillTriangle(70,10,40,55,100,55); g.fillTriangle(70,130,40,85,100,85);
      g.fillRect(42,50,56,38);
      g.fillStyle(0xffffff,0.3); g.fillTriangle(70,22,54,52,86,52);
      g.fillStyle(c, 0.85);
      g.fillTriangle(10,48,42,58,30,80); g.fillTriangle(130,48,98,58,110,80);
      g.fillStyle(0xffff00); g.fillCircle(58,66,5); g.fillCircle(82,66,5);
      g.fillStyle(0x000000); g.fillCircle(59,66,3); g.fillCircle(83,66,3);
      g.generateTexture(key, 140, 140);
    } else if (key === 'enemy_boss3') {
      const c = 0x8800cc;
      g.fillStyle(0x110011); g.fillTriangle(70,130,20,60,120,60);
      g.fillStyle(c, 0.9); g.fillRect(42,40,56,60);
      g.fillStyle(0x220022); g.fillCircle(70,32,22);
      g.fillStyle(c);
      g.fillTriangle(50,16,44,0,58,14); g.fillTriangle(70,10,63,0,77,0); g.fillTriangle(90,16,82,14,96,0);
      g.fillStyle(0xff0000); g.fillCircle(60,30,6); g.fillCircle(80,30,6);
      g.fillStyle(0xffff00,0.8); g.fillCircle(60,30,3); g.fillCircle(80,30,3);
      g.fillStyle(c, 0.7); g.fillCircle(105,80,14);
      g.fillStyle(0xffffff,0.4); g.fillCircle(100,75,5);
      g.generateTexture(key, 140, 140);
    }
  }

  _showAvatarMsg(msg, color) {
    const { W, H } = this;
    const box = this.add.graphics().setDepth(10);
    box.fillStyle(0x001133, 0.97);
    box.fillRoundedRect(W/2 - 110, H/2 - 22, 220, 44, 7);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRoundedRect(W/2 - 110, H/2 - 22, 220, 44, 7);
    const txt = this.add.text(W/2, H/2, msg, {
      fontSize: '26px', color, fontFamily: 'serif', align: 'center'
    }).setOrigin(0.5).setDepth(11);
    this.time.delayedCall(1400, () => { box.destroy(); txt.destroy(); });
  }

  // ── Backgrounds tab ───────────────────────────────────────────────────

  renderBackgrounds() {
    const { W } = this;
    const ROW_H = 52;
    const CUSTOM_X = 260;
    const BG_LIST = [
      { key: 'bg_title',    label: 'Title Screen',                      sub: 'Title scene',        w: 480, h: 854 },
      { key: 'bg_world',    label: 'World Map',                         sub: 'Exploration scene',  w: 480, h: 854 },
      { key: 'bg_bootcamp', label: GT.placeBootcamp,                    sub: 'Tutorial scene',     w: 480, h: 854 },
      { key: 'bg_town',     label: GT.placeTown,                        sub: 'Town scene',         w: 480, h: 854 },
      { key: 'bg_dungeon1', label: GT.floorB1Name,                      sub: 'Dungeon scene',      w: 480, h: 854 },
      { key: 'bg_dungeon2', label: GT.floorB2Name,                      sub: 'Dungeon scene',      w: 480, h: 854 },
      { key: 'bg_dungeon3', label: GT.floorB3Name,                      sub: 'Dungeon scene',      w: 480, h: 854 },
      { key: 'bg_dungeon4', label: GT.floorB4Name,                      sub: 'Dungeon scene',      w: 480, h: 854 },
      { key: 'bg_dungeon5', label: GT.floorB5Name,                      sub: 'Dungeon scene',      w: 480, h: 854 },
      { key: 'bg_dungeon6', label: GT.floorB6Name,                      sub: 'Dungeon scene',      w: 480, h: 854 },
      { key: 'icon_bootcamp', label: 'Bootcamp Icon',                     sub: 'World Map icon',     w: 64,  h: 64  },
      { key: 'icon_town',     label: 'Town Icon',                        sub: 'World Map icon',     w: 64,  h: 64  },
      { key: 'icon_dungeon',  label: 'Dungeon Icon',                     sub: 'World Map icon',     w: 64,  h: 64  },
    ];

    this.contentContainer.add(this.add.text(8, -10, 'Upload an image to replace a background', {
      fontSize: '18px', color: '#556677', fontFamily: 'monospace', fontStyle: 'italic'
    }));

    BG_LIST.forEach((def, i) => {
      const ry = 12 + i * ROW_H;
      const isPlayerCustom = BackgroundStore.get(def.key) !== null;

      const bg = this.add.graphics();
      bg.fillStyle(isPlayerCustom ? 0x0d1f0d : 0x0d1020, 0.9);
      bg.fillRoundedRect(4, ry, W - 12, ROW_H - 4, 5);
      bg.lineStyle(1, isPlayerCustom ? 0x336633 : 0x223344, 1);
      bg.strokeRoundedRect(4, ry, W - 12, ROW_H - 4, 5);
      this.contentContainer.add(bg);

      // Thumbnail
      if (this.textures.exists(def.key)) {
        const prev = this.add.image(34, ry + (ROW_H - 4) / 2, def.key);
        const scale = Math.min(36 / prev.width, 40 / prev.height);
        prev.setScale(scale);
        this.contentContainer.add(prev);
      }

      // Label
      this.contentContainer.add(this.add.text(64, ry + 6, def.label, {
        fontSize: '21px', color: isPlayerCustom ? '#aaffaa' : '#aaccff', fontFamily: 'serif'
      }));
      // ✓ Custom badge — column-aligned at fixed X, same line as label
      if (isPlayerCustom) {
        this.contentContainer.add(this.add.text(CUSTOM_X, ry + 9, '✓ Custom', {
          fontSize: '14px', color: '#55aa55', fontFamily: 'monospace'
        }));
      }
      // Sub label + pixel dimensions
      this.contentContainer.add(this.add.text(64, ry + 27, def.sub, {
        fontSize: '15px', color: '#667788', fontFamily: 'monospace'
      }));
      this.contentContainer.add(this.add.text(W - 110, ry + 27, `${def.w} × ${def.h} px`, {
        fontSize: '15px', color: '#445566', fontFamily: 'monospace'
      }).setOrigin(1, 0));

      // [Upload] button
      const uploadBtn = this.add.text(W - 14, ry + 6, '[Upload]', {
        fontSize: '19px', color: '#88aaff', fontFamily: 'monospace'
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      uploadBtn.on('pointerover', () => uploadBtn.setColor('#ffffff'));
      uploadBtn.on('pointerout',  () => uploadBtn.setColor('#88aaff'));
      uploadBtn.on('pointerdown', () => this._uploadBackground(def.key, def.w || 480, def.h || 854));
      this.contentContainer.add(uploadBtn);

      // [Reset] button — only if a custom is saved
      if (isPlayerCustom) {
        const resetBtn = this.add.text(W - 14, ry + 27, '[Reset]', {
          fontSize: '19px', color: '#aa6644', fontFamily: 'monospace'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        resetBtn.on('pointerover', () => resetBtn.setColor('#ff8866'));
        resetBtn.on('pointerout',  () => resetBtn.setColor('#aa6644'));
        resetBtn.on('pointerdown', () => this._resetBackground(def.key));
        this.contentContainer.add(resetBtn);
      }
    });
  }

  _uploadBackground(key, targetW = 480, targetH = 854) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/bmp,image/gif,image/webp';
    input.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0;pointer-events:none;';
    document.body.appendChild(input);

    const cleanup = () => { if (input.parentNode) document.body.removeChild(input); };
    const onFocus = () => { window.removeEventListener('focus', onFocus); this._forceResume(); };
    window.addEventListener('focus', onFocus);

    input.onchange = async (e) => {
      cleanup();
      window.removeEventListener('focus', onFocus);
      this._forceResume();
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = evt => resolve(evt.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        // Resize to game dimensions (no horizontal flip for backgrounds)
        const resized = await this._resizeBgImage(dataUrl, targetW, targetH);
        const saved = BackgroundStore.set(key, resized);
        if (!saved) { this._showAvatarMsg('Image too large to store.', '#ff6666'); return; }
        window.location.reload();
      } catch {
        this._showAvatarMsg('Failed to process image.', '#ff6666');
      }
    };
    input.addEventListener('cancel', () => {
      cleanup();
      window.removeEventListener('focus', onFocus);
      this._forceResume();
    });

    this._showUploadConfirm(
      () => input.click(),
      () => { cleanup(); window.removeEventListener('focus', onFocus); }
    );
  }

  _resetBackground(key) {
    BackgroundStore.remove(key);
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Icon keys get a small circular marker; bg keys get a gradient swatch
    if (key.startsWith('icon_')) {
      const ICON_COLORS = { icon_town: 0xffdd88, icon_dungeon: 0x8844ff, icon_bootcamp: 0x44ffcc };
      const col = ICON_COLORS[key] || 0xaaaaaa;
      g.clear();
      g.fillStyle(col, 1); g.fillCircle(32, 32, 28);
      g.fillStyle(0x000000, 0.3); g.fillCircle(32, 34, 28);
      g.fillStyle(col, 1); g.fillCircle(32, 30, 26);
      g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(32, 30, 26);
      g.generateTexture(key, 64, 64);
    } else {
      const BG_COLORS = {
        bg_title:    [0x000022, 0x001144], bg_world:    [0x1a3a1a, 0x0a2a0a],
        bg_town:     [0x221a00, 0x332200], bg_bootcamp: [0x112233, 0x223344],
        bg_dungeon1: [0x1a1133, 0x2a1144], bg_dungeon2: [0x110022, 0x220033],
        bg_dungeon3: [0x110011, 0x220011],
        bg_dungeon4: [0x001122, 0x002244], bg_dungeon5: [0x000022, 0x001133],
        bg_dungeon6: [0x000011, 0x000022]
      };
      const [top, bot] = BG_COLORS[key] || [0x111122, 0x222233];
      g.clear();
      g.fillStyle(top); g.fillRect(0, 0, 480, 120);
      g.fillStyle(bot); g.fillRect(0, 120, 480, 200);
      g.lineStyle(2, 0xffffff, 0.3); g.lineBetween(0, 120, 480, 120);
      g.generateTexture(key, 480, 320);
    }
    g.destroy();
    this.contentContainer.removeAll(true);
    this.renderBackgrounds();
  }

  // Resize a data-URL to exact pixel dimensions (no flip — for backgrounds)
  _resizeBgImage(dataUrl, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

}
