import Phaser from 'phaser';
import { GameState, SLOT_COUNT } from '../GameState.js';
const SLOT_H     = 72;   // height of each slot row
const HEADER_H   = 52;
const PADDING    = 8;

export class SaveLoadScene extends Phaser.Scene {
  constructor() { super('SaveLoadScene'); }

  init(data) {
    this.mode        = data.mode        || 'save';
    this.returnScene = data.returnScene || 'TitleScene';
  }

  create() {
    const { width, height } = this.scale;
    const W = width;

    // Background
    this.add.rectangle(W / 2, height / 2, W, height, 0x000022, 0.98);

    // Title bar
    const titleCol = this.mode === 'save' ? '#ffdd88' : '#88ddff';
    const titleTxt = this.mode === 'save' ? '💾  SAVE GAME' : '📂  LOAD GAME';
    this.add.text(W / 2, 26, titleTxt, {
      fontSize: '38px', color: titleCol, fontFamily: 'serif'
    }).setOrigin(0.5);

    const div = this.add.graphics();
    div.lineStyle(1, 0x334466, 0.8);
    div.lineBetween(PADDING, 44, W - PADDING, 44);

    // Slot rows
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.buildSlotRow(i, W);
    }

    // Back button
    const backY = HEADER_H + SLOT_COUNT * SLOT_H + 14;
    const back = this.add.text(W / 2, backY, '← Back', {
      fontSize: '30px', color: '#8899bb', fontFamily: 'serif'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover',  () => back.setColor('#ffffff'));
    back.on('pointerout',   () => back.setColor('#8899bb'));
    back.on('pointerdown',  () => this.scene.start(this.returnScene, {}));

    // Overlay container for confirm dialogs / flash messages
    this.overlay = this.add.container(0, 0).setDepth(20).setVisible(false);
  }

  buildSlotRow(slotIdx, W) {
    const info    = GameState.getSlotInfo(slotIdx);
    const isEmpty = !info;
    const y       = HEADER_H + slotIdx * SLOT_H;
    const h       = SLOT_H - 4;

    const bg = this.add.graphics();
    const drawBg = (hover) => {
      bg.clear();
      const fill = isEmpty
        ? (hover ? 0x141428 : 0x0a0a18)
        : (hover ? 0x152035 : 0x0d1828);
      bg.fillStyle(fill, 0.96);
      bg.fillRoundedRect(PADDING, y, W - PADDING * 2, h, 5);
      bg.lineStyle(1, isEmpty ? (hover ? 0x2a2a3a : 0x181828) : (hover ? 0x5588cc : 0x2a4060), 1);
      bg.strokeRoundedRect(PADDING, y, W - PADDING * 2, h, 5);
    };
    drawBg(false);

    // Slot number badge
    const badgeFill = isEmpty ? 0x111122 : 0x1a3060;
    const badgeG = this.add.graphics();
    badgeG.fillStyle(badgeFill, 1);
    badgeG.fillRoundedRect(PADDING + 4, y + h / 2 - 14, 30, 28, 4);
    this.add.text(PADDING + 19, y + h / 2, String(slotIdx + 1), {
      fontSize: '26px', color: isEmpty ? '#334455' : '#88aaff',
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const contentX = PADDING + 42;

    if (isEmpty) {
      this.add.text(contentX, y + h / 2, '— Empty —', {
        fontSize: '24px', color: '#2a3a4a', fontFamily: 'serif', fontStyle: 'italic'
      }).setOrigin(0, 0.5);

      if (this.mode === 'save') {
        this.add.text(W - PADDING - 8, y + h / 2, '[SAVE HERE]', {
          fontSize: '20px', color: '#446655', fontFamily: 'monospace'
        }).setOrigin(1, 0.5);
      }
    } else {
      // Party line — split across two lines to avoid overflow
      const partyLine1 = info.party.slice(0, 2).map(p => `${p.name} Lv.${p.level}`).join('  ');
      const partyLine2 = info.party.slice(2).map(p => `${p.name} Lv.${p.level}`).join('  ');
      this.add.text(contentX, y + 5, partyLine1, {
        fontSize: '17px', color: '#aaccff', fontFamily: 'monospace'
      });
      if (partyLine2) {
        this.add.text(contentX, y + 22, partyLine2, {
          fontSize: '17px', color: '#aaccff', fontFamily: 'monospace'
        });
      }
      // Gold + location
      const locLabel = info.location || 'World Map';
      this.add.text(contentX, y + 41, `💰 ${info.gold}  ·  ${locLabel}`, {
        fontSize: '15px', color: '#7788aa', fontFamily: 'monospace'
      });

      // Right column — diff label (top), date (middle), action (bottom)
      const diffMult = info.difficulty ?? 1.5;
      const diffLabel = GameState.getDifficultyLabel(diffMult);
      const diffColor = GameState.getDifficultyColor(diffMult);
      this.add.text(W - PADDING - 8, y + 5, diffLabel, {
        fontSize: '13px', color: diffColor, fontFamily: 'monospace'
      }).setOrigin(1, 0);

      const dateStr = info.savedAt
        ? new Date(info.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      this.add.text(W - PADDING - 8, y + 22, dateStr, {
        fontSize: '12px', color: '#556677', fontFamily: 'monospace'
      }).setOrigin(1, 0);

      // Mode label on right (bottom of slot)
      const actionLabel = this.mode === 'save' ? '[OVERWRITE]' : '[LOAD]';
      const actionColor = this.mode === 'save' ? '#aa6633' : '#33aa66';
      this.add.text(W - PADDING - 8, y + h - 6, actionLabel, {
        fontSize: '18px', color: actionColor, fontFamily: 'monospace'
      }).setOrigin(1, 1);
    }

    // Hit area
    bg.setInteractive(
      new Phaser.Geom.Rectangle(PADDING, y, W - PADDING * 2, h),
      Phaser.Geom.Rectangle.Contains
    );
    bg.on('pointerover',  () => drawBg(true));
    bg.on('pointerout',   () => drawBg(false));
    bg.on('pointerdown',  () => this.handleSlotClick(slotIdx, isEmpty));
  }

  handleSlotClick(slotIdx, isEmpty) {
    if (this.mode === 'save') {
      if (!isEmpty) {
        this.showConfirm(`Overwrite Slot ${slotIdx + 1}?`, () => this.doSave(slotIdx));
      } else {
        this.doSave(slotIdx);
      }
    } else {
      if (isEmpty) {
        this.flashMessage('No data in this slot.', '#ff6666');
      } else {
        this.doLoad(slotIdx);
      }
    }
  }

  doSave(slotIdx) {
    const ok = GameState.saveToSlot(slotIdx);
    this.flashMessage(
      ok ? `Game saved to Slot ${slotIdx + 1}!` : 'Save failed!',
      ok ? '#88ffaa' : '#ff4444',
      () => { if (ok) this.scene.start(this.returnScene); }
    );
  }

  doLoad(slotIdx) {
    const ok = GameState.loadFromSlot(slotIdx);
    if (ok) {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, p) => {
        if (p === 1) {
          const scene = GameState._loadScene || 'WorldScene';
          if (scene === 'DungeonScene') {
            GameState._dungeonReturnFloor = GameState._loadFloor;
            this.scene.start('DungeonScene');
          } else if (scene === 'TownScene') {
            this.scene.start('TownScene');
          } else {
            this.scene.start('WorldScene');
          }
        }
      });
    } else {
      this.flashMessage('Load failed!', '#ff4444');
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────

  showConfirm(msg, onYes) {
    const { width, height } = this.scale;
    this.overlay.setVisible(true).removeAll(true);

    const dimmer = this.add.graphics();
    dimmer.fillStyle(0x000000, 0.65);
    dimmer.fillRect(0, 0, width, height);
    this.overlay.add(dimmer);

    const bw = 280, bh = 120;
    const bx = (width - bw) / 2, by = (height - bh) / 2;
    const box = this.add.graphics();
    box.fillStyle(0x001133, 0.98);
    box.fillRoundedRect(bx, by, bw, bh, 8);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 8);
    this.overlay.add(box);

    this.overlay.add(this.add.text(width / 2, by + 32, msg, {
      fontSize: '28px', color: '#ccddff', fontFamily: 'serif', align: 'center'
    }).setOrigin(0.5));

    const yes = this.add.text(width / 2 - 54, by + 78, 'Yes', {
      fontSize: '32px', color: '#88ffaa', fontFamily: 'serif'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const no = this.add.text(width / 2 + 54, by + 78, 'No', {
      fontSize: '32px', color: '#ff8888', fontFamily: 'serif'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    yes.on('pointerover', () => yes.setColor('#ffffff'));
    yes.on('pointerout',  () => yes.setColor('#88ffaa'));
    no.on('pointerover',  () => no.setColor('#ffffff'));
    no.on('pointerout',   () => no.setColor('#ff8888'));

    yes.on('pointerdown', () => { this.overlay.setVisible(false); onYes(); });
    no.on('pointerdown',  () => this.overlay.setVisible(false));

    this.overlay.add([yes, no]);
  }

  flashMessage(msg, color, onDone) {
    const { width, height } = this.scale;
    this.overlay.setVisible(true).removeAll(true);

    const bw = 280, bh = 54;
    const bx = (width - bw) / 2, by = (height - bh) / 2;
    const box = this.add.graphics();
    box.fillStyle(0x001133, 0.97);
    box.fillRoundedRect(bx, by, bw, bh, 8);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 8);
    this.overlay.add(box);

    this.overlay.add(this.add.text(width / 2, height / 2, msg, {
      fontSize: '26px', color, fontFamily: 'serif', align: 'center'
    }).setOrigin(0.5));

    this.time.delayedCall(1200, () => {
      this.overlay.setVisible(false);
      if (onDone) onDone();
    });
  }
}
