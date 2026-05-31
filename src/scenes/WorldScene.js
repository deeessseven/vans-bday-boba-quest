import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { GT, resolveStory } from '../data/GameText.js';
import { showQuitConfirm } from '../ui/QuitConfirm.js';

function getLocations() {
  return [
    {
      id: 'town', name: GT.placeTown,
      x: 0.302, y: 0.439,
      color: 0xffdd88, icon: '🏘',
      description: resolveStory(GT.descTown)
    },
    {
      id: 'dungeon', name: GT.placeDungeon,
      x: 0.659, y: 0.562,
      color: 0x8844ff, icon: '⛏',
      description: resolveStory(GT.descDungeon)
    },
    {
      id: 'bootcamp', name: GT.placeBootcamp,
      x: 0.669, y: 0.400,
      color: 0x44ffcc, icon: '🎓',
      description: resolveStory(GT.descBootcamp)
    }
  ];
}

export class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  create() {
    const { width, height } = this.scale;

    // Background map — use custom image if uploaded, otherwise procedural terrain
    if (BackgroundStore.hasCustom('bg_world')) {
      this.add.image(width / 2, height / 2, 'bg_world').setDisplaySize(width, height);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x1a3a1a, 0x1a3a1a, 0x0a2a0a, 0x0a2a0a, 1);
      bg.fillRect(0, 0, width, height);
      this.drawTerrain(bg, width, height);
    }

    // Title bar
    const titleBar = this.add.graphics();
    titleBar.fillStyle(0x000022, 0.85);
    titleBar.fillRect(0, 0, width, 44);
    titleBar.lineStyle(1, 0x334466, 1);
    titleBar.lineBetween(0, 44, width, 44);

    this.add.text(width / 2, 22, GT.placeWorldMap, {
      fontSize: '40px', color: '#aaccff', fontFamily: 'serif'
    }).setOrigin(0.5);

    // Gold / party status bar (bottom)
    this.statusBar = this.add.graphics();
    this.drawStatusBar(width, height);

    // Location nodes
    this._locations = getLocations();
    for (const loc of this._locations) {
      this.createLocationNode(loc, width, height);
    }

    // Menu button (top right)
    const menuBtn = this.add.text(width - 12, 22, '≡ MENU', {
      fontSize: '28px', color: '#88aacc', fontFamily: 'serif'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.launch('MenuScene', { returnScene: 'WorldScene' }));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#88aacc'));

    // Quit button (top left)
    const quitBtn = this.add.text(12, 22, '✕ QUIT', {
      fontSize: '28px', color: '#886677', fontFamily: 'serif'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    quitBtn.on('pointerdown', () => showQuitConfirm(this, () => this.scene.start('TitleScene', {})));
    quitBtn.on('pointerover', () => quitBtn.setColor('#ffaaaa'));
    quitBtn.on('pointerout',  () => quitBtn.setColor('#886677'));

    // Info panel (hidden until hover)
    this.infoBg = this.add.graphics().setDepth(10).setVisible(false);
    this.infoText = this.add.text(0, 0, '', {
      fontSize: '26px', color: '#ffffff', fontFamily: 'serif',
      padding: { x: 10, y: 8 }
    }).setDepth(11).setVisible(false);

    MusicSystem.play('overworld');

    // Resume music hint
    if (!GameState.progress.worldIntroSeen) {
      this.showIntroDialog();
    }
  }

  drawTerrain(g, w, h) {
    // Ocean
    g.fillStyle(0x0a2255, 0.7);
    g.fillEllipse(w * 0.80, h * 0.25, 160, 100);
    g.fillEllipse(w * 0.10, h * 0.70, 100, 80);
    // Mountains
    g.fillStyle(0x443322, 0.6);
    for (const [mx, my] of [[0.48,0.32],[0.52,0.28],[0.56,0.34],[0.44,0.36]]) {
      g.fillTriangle(mx*w, my*h + 40, (mx-0.04)*w, (my+0.08)*h, (mx+0.04)*w, (my+0.08)*h);
    }
    // Forest patches
    g.fillStyle(0x1a4a1a, 0.7);
    g.fillCircle(w*0.18, h*0.52, 28);
    g.fillCircle(w*0.24, h*0.56, 22);
    g.fillCircle(w*0.84, h*0.72, 24);
    // Roads
    g.lineStyle(3, 0x887755, 0.5);
    g.lineBetween(w*0.28, h*0.38, w*0.68, h*0.55);
  }

  refreshStatusBar() {
    const { width, height } = this.scale;
    this.drawStatusBar(width, height);
  }

  drawStatusBar(w, h) {
    this.statusBar.clear();
    this.statusBar.fillStyle(0x000022, 0.88);
    this.statusBar.fillRect(0, h - 48, w, 48);
    this.statusBar.lineStyle(1, 0x334466, 1);
    this.statusBar.lineBetween(0, h - 48, w, h - 48);

    if (this.goldText) this.goldText.destroy();
    if (this.partyTexts) this.partyTexts.forEach(t => t.destroy());
    this.partyTexts = [];

    this.goldText = this.add.text(10, h - 42, `💰 ${GameState.gold} Gold`, {
      fontSize: '20px', color: '#ffdd88', fontFamily: 'monospace'
    });

    const heroAreaX = 160;
    const heroColW = Math.floor((w - heroAreaX - 10) / 3);
    GameState.party.forEach((hero, i) => {
      const cx = heroAreaX + i * heroColW + heroColW / 2;
      const nameColor = hero.status === 'dead' ? '#ff6666' : '#aaccff';
      const hpColor = hero.hp <= hero.maxHp * 0.3 ? '#ff4444' : hero.hp <= hero.maxHp * 0.7 ? '#ffee44' : '#88cc88';
      const t1 = this.add.text(cx, h - 44, hero.name, {
        fontSize: '16px', color: nameColor, fontFamily: 'monospace'
      }).setOrigin(0.5, 0);
      const t2 = this.add.text(cx, h - 28, `${hero.hp}/${hero.maxHp}`, {
        fontSize: '14px', color: hpColor, fontFamily: 'monospace'
      }).setOrigin(0.5, 0);
      this.partyTexts.push(t1, t2);
    });
  }

  createLocationNode(loc, w, h) {
    const x = loc.x * w;
    const y = loc.y * h;

    // Glow ring
    const ring = this.add.circle(x, y, 20, loc.color, 0.2);
    this.tweens.add({
      targets: ring,
      scaleX: { from: 1, to: 1.5 },
      scaleY: { from: 1, to: 1.5 },
      alpha: { from: 0.4, to: 0 },
      duration: 1600, repeat: -1
    });

    // Icon — custom uploaded image or default circle + symbol
    let hitTarget;
    const iconKey = `icon_${loc.id}`;
    if (BackgroundStore.hasCustom(iconKey)) {
      hitTarget = this.add.image(x, y, iconKey)
        .setDisplaySize(40, 40)
        .setInteractive({ useHandCursor: true });
    } else {
      hitTarget = this.add.circle(x, y, 12, loc.color, 1).setInteractive({ useHandCursor: true });
      this.add.text(x, y, loc.icon, {
        fontSize: '28px', color: '#ffffff'
      }).setOrigin(0.5);
    }

    // Border around icon
    const border = this.add.graphics();
    border.lineStyle(4, 0x44ccff, 1);
    border.strokeRect(x - 22, y - 22, 44, 44);

    this.add.text(x, y + 37, loc.name, {
      fontSize: '34px', color: '#dddddd', fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    hitTarget.on('pointerover', () => this.showInfo(loc, x, y, w, h));
    hitTarget.on('pointerout',  () => this.hideInfo());
    hitTarget.on('pointerdown', () => this.travelTo(loc));
  }

  showInfo(loc, nx, ny, w, h) {
    const pw = 220;
    let px = nx + 16;
    if (px + pw > w) px = nx - pw - 16;

    // Position text first to measure height
    this.infoText.setPosition(px + 10, 0)
      .setText(loc.description)
      .setWordWrapWidth(200);
    const ph = this.infoText.height + 20;

    let py = ny - ph - 8;
    if (py < 50) py = ny + 24;

    this.infoBg.clear();
    this.infoBg.fillStyle(0x111133, 0.95);
    this.infoBg.fillRoundedRect(px, py, pw, ph, 6);
    this.infoBg.lineStyle(1, 0x4466aa, 1);
    this.infoBg.strokeRoundedRect(px, py, pw, ph, 6);
    this.infoBg.setVisible(true);

    this.infoText.setPosition(px + 10, py + 8).setVisible(true);
  }

  hideInfo() {
    this.infoBg.setVisible(false);
    this.infoText.setVisible(false);
  }

  travelTo(loc) {
    if (this._introActive) return;
    if (this._tourActive) {
      if (this._tourTimer) { this._tourTimer.remove(false); this._tourTimer = null; }
      this.input.off('pointerdown', this._tourNext);
      this.hideInfo();
      this._tourActive = false;
    }
    this.cameras.main.fade(400, 0, 0, 0, false, (cam, progress) => {
      if (progress === 1) {
        if (loc.id === 'town') {
          this.scene.start('TownScene');
        } else if (loc.id === 'dungeon') {
          this.scene.start('DungeonScene');
        } else if (loc.id === 'bootcamp') {
          this.scene.start('BootcampScene');
        }
      }
    });
  }

  showIntroDialog() {
    // Mark seen immediately so navigating away won't re-show the dialog
    GameState.progress.worldIntroSeen = true;
    this._introActive = true;

    const { width, height } = this.scale;
    const boxH = 180;
    const boxY = height / 2 - boxH / 2;
    const box = this.add.graphics().setDepth(20);
    box.fillStyle(0x000033, 0.96);
    box.fillRect(20, boxY, width - 40, boxH);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRect(20, boxY, width - 40, boxH);

    const lines = [
      resolveStory(GT.introLine1, GameState.party),
      resolveStory(GT.introLine2, GameState.party),
      resolveStory(GT.introLine3, GameState.party),
      resolveStory(GT.introLine4, GameState.party),
    ];
    let lineIdx = 0;
    let autoTimer = null;

    const txt = this.add.text(32, boxY + 12, '', {
      fontSize: '28px', color: '#ccddff', fontFamily: 'serif',
      wordWrap: { width: width - 80 }
    }).setDepth(21);

    const dismiss = this.add.text(width - 30, boxY + boxH - 20, '▶ Tap', {
      fontSize: '24px', color: '#8899bb', fontFamily: 'serif'
    }).setOrigin(1, 0.5).setDepth(21);

    const close = () => {
      if (autoTimer) { autoTimer.remove(false); autoTimer = null; }
      this.input.off('pointerdown', advance);
      this._introActive = false;
      box.destroy(); txt.destroy(); dismiss.destroy();
      this.showLocationTour();
    };

    const advance = () => {
      if (autoTimer) { autoTimer.remove(false); autoTimer = null; }
      if (lineIdx < lines.length) {
        txt.setText(lines[lineIdx++]);
        const delay = 5000;
        autoTimer = this.time.delayedCall(delay, advance);
      } else {
        close();
      }
    };
    advance();

    this.input.on('pointerdown', advance);
  }

  showLocationTour() {
    const { width, height } = this.scale;
    const allLocs = this._locations;
    const order = ['bootcamp', 'town', 'dungeon'];
    const locs = order.map(id => allLocs.find(l => l.id === id));
    let idx = 0;
    this._tourTimer = null;
    this._tourActive = true;

    this._tourNext = () => {
      if (this._tourTimer) { this._tourTimer.remove(false); this._tourTimer = null; }
      if (idx < locs.length) {
        const loc = locs[idx++];
        this.showInfo(loc, loc.x * width, loc.y * height, width, height);
        this._tourTimer = this.time.delayedCall(5000, this._tourNext);
      } else {
        this.hideInfo();
        this._tourActive = false;
        this.input.off('pointerdown', this._tourNext);
      }
    };

    this.input.on('pointerdown', this._tourNext);
    this._tourNext();
  }
}
