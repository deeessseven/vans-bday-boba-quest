import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { ITEM_DEFS, SHOP_STOCK } from '../data/items.js';
import { WEAPON_DEFS, getWeaponsByChar } from '../data/weapons.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { GT } from '../data/GameText.js';

const INN_COST = 60;

export class TownScene extends Phaser.Scene {
  constructor() { super('TownScene'); }

  create() {
    MusicSystem.play('town');
    const { width, height } = this.scale;

    if (BackgroundStore.hasCustom('bg_town')) {
      this.add.image(width / 2, height / 2, 'bg_town').setDisplaySize(width, height);
    } else {
      this.bg(width, height);
      this.drawBuildings(width, height);
    }

    // Title
    this.add.text(width / 2, 58, GT.placeTown, {
      fontSize: '48px', color: '#ffdd88', fontFamily: 'serif',
      stroke: '#331100', strokeThickness: 4
    }).setOrigin(0.5);

    // Menu options
    const menuItems = [
      { label: '⚔️  Weapon Shop', sub: 'Upgrade your weapons',                fn: () => this.openWeaponShop() },
      { label: '🎒  Item Shop',   sub: 'Buy potions and supplies',            fn: () => this.openShop() },
      { label: '🏨  Inn',          sub: 'Rest and recover', fn: () => this.openInn() },
      { label: '💾  Save Game',    sub: 'Save your progress',                 fn: () => this.saveGame() },
      { label: '🗺  World Map',    sub: 'Return to the world map',            fn: () => this.leave() }
    ];

    const startY = height * 0.28;
    menuItems.forEach((item, i) => {
      this.createEntry(width, startY + i * 100, item);
    });

    // Party status
    this.drawPartyStatus(width, height);

    // Gold — dark pill behind text
    const goldPill = this.add.graphics();
    goldPill.fillStyle(0x000022, 0.82);
    goldPill.fillRoundedRect(4, height - 31, 180, 32, 6);
    this.goldText = this.add.text(12, height - 3, `💰 ${GameState.gold} Gold`, {
      fontSize: '26px', color: '#ffdd88', fontFamily: 'monospace'
    }).setOrigin(0, 1);

    // Menu button (top right) — dark pill behind button
    const menuPill = this.add.graphics().setDepth(9);
    menuPill.fillStyle(0x000022, 0.82);
    menuPill.fillRoundedRect(width - 130, 6, 126, 34, 6);
    const menuBtn = this.add.text(width - 12, 22, '≡ MENU', {
      fontSize: '28px', color: '#88aacc', fontFamily: 'serif'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    menuBtn.on('pointerdown', () => this.scene.launch('MenuScene', { returnScene: 'TownScene' }));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#88aacc'));

    // Overlay container (for shop / inn / dialogs)
    this.overlay = this.add.container(0, 0).setDepth(50).setVisible(false);
  }

  bg(w, h) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x223344, 0x223344, 0x112233, 0x112233, 1);
    g.fillRect(0, 0, w, h);
  }

  drawBuildings(w, h) {
    const g = this.add.graphics();
    const buildings = [
      { x: 0.12, y: 0.20, ww: 0.16, hh: 0.14, color: 0x886644 },
      { x: 0.36, y: 0.18, ww: 0.20, hh: 0.16, color: 0x997755 },
      { x: 0.64, y: 0.22, ww: 0.18, hh: 0.12, color: 0x775533 },
      { x: 0.82, y: 0.19, ww: 0.14, hh: 0.15, color: 0x886644 }
    ];
    for (const b of buildings) {
      // Body
      g.fillStyle(b.color);
      g.fillRect(b.x*w, b.y*h, b.ww*w, b.hh*h);
      // Roof
      g.fillStyle(0x553322);
      g.fillTriangle(b.x*w - 4, b.y*h, (b.x + b.ww/2)*w, (b.y - 0.06)*h, (b.x+b.ww)*w + 4, b.y*h);
      // Door
      g.fillStyle(0x332211);
      g.fillRect((b.x + b.ww/2 - 0.02)*w, (b.y + b.hh - 0.06)*h, 0.04*w, 0.06*h);
      // Window
      g.fillStyle(0xffdd88, 0.8);
      g.fillRect((b.x + 0.03)*w, (b.y + 0.03)*h, 0.04*w, 0.04*h);
    }
    // Ground
    g.fillStyle(0x446633, 0.6);
    g.fillRect(0, h*0.34, w, h*0.66);
    g.fillStyle(0x335522, 0.4);
    g.fillRect(0, h*0.34, w, 3);
  }

  createEntry(w, y, item) {
    const btn = this.add.graphics();
    const draw = (hover) => {
      btn.clear();
      btn.fillStyle(hover ? 0x223355 : 0x111833, 0.92);
      btn.fillRoundedRect(20, y - 42, w - 40, 86, 8);
      btn.lineStyle(1.5, hover ? 0x6699cc : 0x334466, 1);
      btn.strokeRoundedRect(20, y - 42, w - 40, 86, 8);
    };
    draw(false);

    this.add.text(32, y - 24, item.label, {
      fontSize: '34px', color: '#ccddff', fontFamily: 'serif'
    });
    this.add.text(32, y + 12, item.sub, {
      fontSize: '24px', color: '#667799', fontFamily: 'serif', fontStyle: 'italic'
    });

    btn.setInteractive(
      new Phaser.Geom.Rectangle(20, y - 42, w - 40, 86),
      Phaser.Geom.Rectangle.Contains
    );
    btn.on('pointerover',  () => draw(true));
    btn.on('pointerout',   () => draw(false));
    btn.on('pointerdown',  () => item.fn());
  }

  drawPartyStatus(w, h) {
    const g = this.add.graphics();
    const barY = h - 110;
    g.fillStyle(0x000022, 0.85);
    g.fillRect(0, barY, w, 84);
    g.lineStyle(1, 0x334466, 1);
    g.lineBetween(0, barY, w, barY);

    const colW = w / 3;
    this._partyStatTexts = [];
    GameState.party.forEach((hero, i) => {
      const cx = i * colW + colW / 2;
      this.add.text(cx, barY + 8, hero.name, {
        fontSize: '22px', color: '#aaccff', fontFamily: 'monospace'
      }).setOrigin(0.5, 0);
      const hpTxt = this.add.text(cx, barY + 34, `HP ${hero.hp}/${hero.maxHp}`, {
        fontSize: '20px', color: hero.hp <= hero.maxHp * 0.3 ? '#ff4444' : hero.hp <= hero.maxHp * 0.7 ? '#ffee44' : '#88dd88',
        fontFamily: 'monospace'
      }).setOrigin(0.5, 0);
      const mpTxt = this.add.text(cx, barY + 58, `MP ${hero.mp}/${hero.maxMp}`, {
        fontSize: '20px', color: '#88aaff', fontFamily: 'monospace'
      }).setOrigin(0.5, 0);
      this._partyStatTexts.push({ hero, hpTxt, mpTxt });
    });
  }

  _refreshPartyStatus() {
    if (!this._partyStatTexts) return;
    this._partyStatTexts.forEach(({ hero, hpTxt, mpTxt }) => {
      hpTxt.setText(`HP ${hero.hp}/${hero.maxHp}`);
      hpTxt.setColor(hero.hp <= hero.maxHp * 0.3 ? '#ff4444' : hero.hp <= hero.maxHp * 0.7 ? '#ffee44' : '#88dd88');
      mpTxt.setText(`MP ${hero.mp}/${hero.maxMp}`);
    });
  }

  refreshStatusBar() {
    this._refreshPartyStatus();
  }

  // ── Weapon Shop ───────────────────────────────────────────────────────
  openWeaponShop() {
    const { width } = this.scale;
    this.showOverlay('⚔  Weapon Shop', (container, close) => {
      const innerW = width - 64; // container starts at x=32
      let rowY = 0;

      const goldTxt = this.add.text(0, rowY, `Your Gold: ${GameState.gold}`, {
        fontSize: '26px', color: '#ffdd88', fontFamily: 'monospace'
      });
      container.add(goldTxt);
      rowY += 36;

      getWeaponsByChar().forEach(({ heroId, heroName, heroClass, weapons }) => {
        const heroIdx = GameState.party.findIndex(h => h.id === heroId);
        const hero    = GameState.party[heroIdx];

        // Section header
        const hdr = this.add.graphics();
        hdr.fillStyle(0x1a2a3a, 1);
        hdr.fillRect(0, rowY, innerW, 28);
        hdr.lineStyle(1, 0x4466aa, 1);
        hdr.lineBetween(0, rowY + 28, innerW, rowY + 28);
        container.add(hdr);
        container.add(this.add.text(4, rowY + 4, `${hero.name}  (${heroClass})`, {
          fontSize: '24px', color: '#88aadd', fontFamily: 'serif', fontStyle: 'bold'
        }));
        rowY += 34;

        weapons.forEach(wid => {
          const w          = WEAPON_DEFS[wid];
          const isEquipped = hero.weaponId === wid;
          const isOwned    = GameState.hasWeapon(wid);
          const isFree     = w.buyPrice === 0;
          const canAfford  = GameState.gold >= w.buyPrice;

          // Weapon name (line 1)
          container.add(this.add.text(6, rowY, w.name, {
            fontSize: '26px', color: isEquipped ? '#ffdd88' : '#ccddff', fontFamily: 'serif'
          }));
          // Description (line 2)
          container.add(this.add.text(6, rowY + 24, w.description, {
            fontSize: '18px', color: '#667799', fontFamily: 'serif'
          }));

          if (isEquipped) {
            container.add(this.add.text(innerW, rowY + 8, '[EQUIPPED]', {
              fontSize: '22px', color: '#ffdd44', fontFamily: 'monospace'
            }).setOrigin(1, 0));

          } else if (isOwned) {
            const equipBtn = this.add.text(innerW, rowY + 8, '[EQUIP]', {
              fontSize: '22px', color: '#88ddff', fontFamily: 'monospace'
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
            equipBtn.on('pointerover', () => equipBtn.setColor('#ffffff'));
            equipBtn.on('pointerout',  () => equipBtn.setColor('#88ddff'));
            equipBtn.on('pointerdown', () => {
              GameState.equipWeapon(heroIdx, w);
              close();
              this.openWeaponShop();
            });
            container.add(equipBtn);

          } else if (!isFree) {
            container.add(this.add.text(innerW - 130, rowY + 8, `${w.buyPrice}G`, {
              fontSize: '22px', color: canAfford ? '#ffdd88' : '#aa5555',
              fontFamily: 'monospace'
            }));

            const buyBtn = this.add.text(innerW, rowY + 8, '[BUY]', {
              fontSize: '22px', color: canAfford ? '#88ffaa' : '#556655',
              fontFamily: 'monospace'
            }).setOrigin(1, 0);
            if (canAfford) {
              buyBtn.setInteractive({ useHandCursor: true });
              buyBtn.on('pointerover', () => buyBtn.setColor('#ffffff'));
              buyBtn.on('pointerout',  () => buyBtn.setColor('#88ffaa'));
              buyBtn.on('pointerdown', () => {
                GameState.addGold(-w.buyPrice);
                GameState.addWeapon(wid);
                GameState.equipWeapon(heroIdx, w);
                this._refreshGold();
                close();
                this.openWeaponShop();
              });
            }
            container.add(buyBtn);
          }

          rowY += 46;
        });
        rowY += 6;
      });
    }, width / 2 - 80);
  }

  // ── Item Shop ─────────────────────────────────────────────────────────
  openShop() {
    const { width } = this.scale;
    this.showOverlay('🎒  Item Shop', (container, close) => {
      const items = SHOP_STOCK.town.map(id => ITEM_DEFS[id]);
      const INV_X = width - 220;  // "×N" qty column
      const BUY_X = width - 138;  // [BUY] column

      // ── Gold display ───────────────────────────────────────────────────
      const goldT = this.add.text(0, 0, `Your Gold: ${GameState.gold}`, {
        fontSize: '26px', color: '#ffdd88', fontFamily: 'monospace'
      });
      container.add(goldT);

      // ── Column headers ─────────────────────────────────────────────────
      const headerStyle = { fontSize: '20px', color: '#8899bb', fontFamily: 'monospace' };
      const hdrItem = this.add.text(0,     36, 'Item',      headerStyle);
      const hdrInv  = this.add.text(INV_X, 36, 'Inventory', headerStyle);
      const divider = this.add.graphics();
      divider.lineStyle(1, 0x334466, 0.8);
      divider.lineBetween(0, 56, width - 64, 56);
      container.add([hdrItem, hdrInv, divider]);

      // ── Item rows ──────────────────────────────────────────────────────
      const ROW_H = 88;
      items.forEach((item, i) => {
        const rowY = 64 + i * ROW_H;

        const nameT = this.add.text(0, rowY + 2, item.name, {
          fontSize: '24px', color: '#ccddff', fontFamily: 'serif'
        });
        const priceT = this.add.text(0, rowY + 32, `${item.buyPrice}G`, {
          fontSize: '17px', color: '#ffdd88', fontFamily: 'monospace'
        });
        const descT = this.add.text(0, rowY + 52, item.description, {
          fontSize: '16px', color: '#8899aa', fontFamily: 'serif', fontStyle: 'italic'
        });

        const qtyT = this.add.text(INV_X, rowY + 30, `×${GameState.inventory[item.id] || 0}`, {
          fontSize: '26px', color: '#ffffff', fontFamily: 'monospace'
        });

        const buyBtn = this.add.text(BUY_X, rowY + 30, '[BUY]', {
          fontSize: '24px', color: '#88ffaa', fontFamily: 'monospace'
        }).setInteractive({ useHandCursor: true });
        buyBtn.on('pointerover', () => buyBtn.setColor('#ffffff'));
        buyBtn.on('pointerout',  () => buyBtn.setColor('#88ffaa'));
        buyBtn.on('pointerdown', () => {
          if (GameState.gold >= item.buyPrice) {
            GameState.addGold(-item.buyPrice);
            GameState.addItem(item.id, 1);
            goldT.setText(`Your Gold: ${GameState.gold}`);
            this._refreshGold();
            qtyT.setText(`×${GameState.inventory[item.id] || 0}`);
            qtyT.setColor('#aaffaa');
            this.time.delayedCall(400, () => qtyT.setColor('#ffffff'));
          } else {
            buyBtn.setColor('#ff4444');
            this.time.delayedCall(600, () => buyBtn.setColor('#88ffaa'));
          }
        });

        container.add([nameT, priceT, descT, qtyT, buyBtn]);
      });
    }, width / 2 - 60);
  }

  // ── Inn ───────────────────────────────────────────────────────────────
  openInn() {
    this.showOverlay('🏨  Inn', (container, close) => {
      const { width } = this.scale;
      const partyFull = GameState.party.every(h => h.status === 'normal' && h.hp >= h.maxHp && h.mp >= h.maxMp);
      const hasKOd = GameState.party.some(h => h.status === 'dead');
      const msg = partyFull
        ? 'The party is already fully rested!'
        : GameState.gold >= INN_COST
          ? `Rest the night for ${INN_COST} Gold?\nFully restores HP and MP.\nAlso revives any KO'd allies.`
          : hasKOd
            ? `Not enough Gold! (need ${INN_COST})\nA hero is KO'd — rest to revive them.`
            : `Not enough Gold!\nYou need ${INN_COST} Gold.`;

      const txt = this.add.text(0, 10, msg, {
        fontSize: '30px', color: '#ccddff', fontFamily: 'serif',
        lineSpacing: 6, wordWrap: { width: width - 64 }
      });
      container.add(txt);

      if (!partyFull && GameState.gold >= INN_COST) {
        const btnW = 160, btnH = 52, btnY = 140;
        const yesX = 10, noX = yesX + btnW + 40;

        const yesPill = this.add.graphics();
        yesPill.fillStyle(0x0a2a1a, 0.95);
        yesPill.fillRoundedRect(yesX, btnY, btnW, btnH, 8);
        yesPill.lineStyle(2, 0x44aa66, 1);
        yesPill.strokeRoundedRect(yesX, btnY, btnW, btnH, 8);
        yesPill.setInteractive(new Phaser.Geom.Rectangle(yesX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);

        const noPill = this.add.graphics();
        noPill.fillStyle(0x2a0a0a, 0.95);
        noPill.fillRoundedRect(noX, btnY, btnW, btnH, 8);
        noPill.lineStyle(2, 0xaa4444, 1);
        noPill.strokeRoundedRect(noX, btnY, btnW, btnH, 8);
        noPill.setInteractive(new Phaser.Geom.Rectangle(noX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);

        const yes = this.add.text(yesX + btnW / 2, btnY + btnH / 2, 'Yes, rest', {
          fontSize: '30px', color: '#88ffaa', fontFamily: 'serif'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const no  = this.add.text(noX  + btnW / 2, btnY + btnH / 2, 'No thanks', {
          fontSize: '30px', color: '#ff8888', fontFamily: 'serif'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        yesPill.on('pointerover',  () => yes.setColor('#ffffff'));
        yesPill.on('pointerout',   () => yes.setColor('#88ffaa'));
        noPill.on('pointerover',   () => no.setColor('#ffffff'));
        noPill.on('pointerout',    () => no.setColor('#ff8888'));

        const doYes = () => {
          const hadKO = GameState.party.some(h => h.status === 'dead');
          GameState.addGold(-INN_COST);
          GameState.healParty();
          const restMsg = hadKO
            ? 'You rested well!\nHP and MP fully restored.\nKO\'d allies have been revived.'
            : 'You rested well!\nHP and MP fully restored.';
          this.showMessage(restMsg, () => { close(); this._refreshPartyStatus(); this.goldText.setText(`💰 ${GameState.gold} Gold`); });
        };
        yesPill.on('pointerdown', doYes);
        yes.on('pointerdown', doYes);
        noPill.on('pointerdown', close);
        no.on('pointerdown', close);

        container.add([yesPill, noPill, yes, no]);
      }
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveGame() {
    GameState._currentScene = 'TownScene';
    GameState._currentFloor = undefined;
    this.scene.start('SaveLoadScene', { mode: 'save', returnScene: 'TownScene' });
  }

  leave() {
    this.cameras.main.fade(400, 0, 0, 0, false, (cam, p) => {
      if (p === 1) this.scene.start('WorldScene');
    });
  }

  // ── Overlay helpers ───────────────────────────────────────────────────
  showOverlay(title, buildFn, titleX) {
    const { width, height } = this.scale;
    this.overlay.setVisible(true).removeAll(true);

    const bg = this.add.graphics();
    bg.fillStyle(0x000033, 0.97);
    bg.fillRect(0, 0, width, height);
    bg.lineStyle(2, 0x4488cc, 1);
    bg.strokeRect(16, 50, width - 32, height - 100);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.overlay.add(bg);

    const titleTxt = this.add.text(titleX !== undefined ? titleX : width / 2, 68, title, {
      fontSize: '40px', color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5);
    this.overlay.add(titleTxt);

    const inner = this.add.container(32, 100);
    this.overlay.add(inner);

    const close = () => { this.overlay.setVisible(false); this.overlay.removeAll(true); };
    buildFn(inner, close);

    const closeBtn = this.add.text(width - 30, 68, '✕ Close', {
      fontSize: '28px', color: '#cc6666', fontFamily: 'monospace'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', close);
    this.overlay.add(closeBtn);
  }

  _refreshGold() {
    if (this.goldText) this.goldText.setText(`💰 ${GameState.gold} Gold`);
  }

  showMessage(msg, onDone) {
    const { width, height } = this.scale;
    const padX = 40, padY = 28;
    const txt = this.add.text(width / 2, -2000, msg, {
      fontSize: '30px', color: '#ccddff', fontFamily: 'serif',
      align: 'center', lineSpacing: 6, wordWrap: { width: width - 80 - padX * 2 }
    }).setOrigin(0.5).setDepth(61);
    const boxW = width - 80;
    const boxH = txt.height + padY * 2;
    const boxX = 40;
    const boxY = height / 2 - boxH / 2;
    txt.setY(height / 2);
    const box = this.add.graphics().setDepth(60);
    box.fillStyle(0x001133, 0.97);
    box.fillRect(boxX, boxY, boxW, boxH);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRect(boxX, boxY, boxW, boxH);
    this.time.delayedCall(1800, () => {
      box.destroy(); txt.destroy();
      if (onDone) onDone();
    });
  }


}
