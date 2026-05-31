import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { GT } from '../data/GameText.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const { width, height } = this.scale;

    // Background — custom upload or procedural starfield
    if (BackgroundStore.hasCustom('bg_title')) {
      this.add.image(width / 2, height / 2, 'bg_title')
        .setDisplaySize(width, height)
        .setDepth(-1);
    } else {
      // Starfield
      for (let i = 0; i < 120; i++) {
        this.add.circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          Phaser.Math.FloatBetween(0.5, 2),
          0xffffff,
          Phaser.Math.FloatBetween(0.3, 1)
        );
      }
      // Gradient background
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x000022, 0x000022, 0x001144, 0x001144, 1);
      bg.fillRect(0, 0, width, height);
      bg.setDepth(-1);
    }

    const crystal = this.add.graphics();
    crystal.fillStyle(0x5c3317, 0.9);
    crystal.fillCircle(width/2, height*0.17, 28);
    crystal.fillStyle(0x3d1f0a, 0.95);
    crystal.fillCircle(width/2 - 8, height*0.165, 7);
    crystal.fillCircle(width/2 + 8, height*0.165, 7);
    crystal.fillCircle(width/2, height*0.18, 7);
    crystal.fillStyle(0x8b5e3c, 0.5);
    crystal.fillCircle(width/2 - 9, height*0.15, 3);
    crystal.fillCircle(width/2 + 6, height*0.14, 3);

    this.tweens.add({
      targets: crystal,
      alpha: { from: 0.6, to: 1 },
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Title text — split on first space so "Generic Quest" → "GENERIC" / "QUEST"
    const titleWords = GT.gameTitle.split(' ');
    const titleLine1 = titleWords[0].toUpperCase();
    const titleLine2 = titleWords.slice(1).join(' ').toUpperCase();

    const t1 = this.add.text(width / 2, height * 0.32 + 170, titleLine1, {
      fontFamily: 'serif',
      fontSize: '104px',
      color: '#aaddff',
      stroke: '#002255',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000044', blur: 8, fill: true }
    }).setOrigin(0.5);
    const maxTitleW = width * 0.92;
    if (t1.width > maxTitleW) t1.setScale(maxTitleW / t1.width);

    if (titleLine2) {
      const t2 = this.add.text(width / 2, height * 0.42 + 170, titleLine2, {
        fontFamily: 'serif',
        fontSize: '80px',
        color: '#ffdd88',
        stroke: '#553300',
        strokeThickness: 5,
        shadow: { offsetX: 2, offsetY: 2, color: '#331100', blur: 6, fill: true }
      }).setOrigin(0.5);
      if (t2.width > maxTitleW) t2.setScale(maxTitleW / t2.width);
    }

    this.add.text(width / 2, height * 0.53 + 150, `~ ${GT.gameTitle} ~`, {
      fontFamily: 'serif',
      fontSize: '28px',
      color: '#8899bb',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Menu buttons
    const menuY = height * 0.65 + 70;
    const hasSave = GameState.hasSave();

    this.newGameBtn = this.createMenuButton(width / 2, menuY, 'NEW GAME', () => this.showDifficultyMenu());
    if (hasSave) {
      this.contBtn = this.createMenuButton(width / 2, menuY + 80, 'CONTINUE', () => this.openLoadScreen());
    }

    // Footer
    this.add.text(width / 2, height - 16, `© 2026 ${GT.gameTitle}`, {
      fontSize: '22px', color: '#88bbff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    MusicSystem.play('title');

    // Floating particles
    this.time.addEvent({
      delay: 400, loop: true, callback: this.spawnParticle, callbackScope: this
    });

    if (this.scene.settings.data?.showDifficulty) this.showDifficultyMenu();
  }

  createMenuButton(x, y, label, callback) {
    const btn = this.add.graphics();
    btn.fillStyle(0x112244, 0.9);
    btn.fillRoundedRect(-110, -30, 220, 60, 10);
    btn.lineStyle(2, 0x4488cc, 1);
    btn.strokeRoundedRect(-110, -30, 220, 60, 10);
    btn.setPosition(x, y).setInteractive(
      new Phaser.Geom.Rectangle(-110, -30, 220, 60),
      Phaser.Geom.Rectangle.Contains
    );

    const txt = this.add.text(x, y, label, {
      fontSize: '40px', color: '#aaddff',
      fontFamily: 'serif',
      shadow: { offsetX: 1, offsetY: 1, color: '#000044', blur: 4, fill: true }
    }).setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x224488, 1);
      btn.fillRoundedRect(-110, -30, 220, 60, 10);
      btn.lineStyle(2, 0x88ccff, 1);
      btn.strokeRoundedRect(-110, -30, 220, 60, 10);
      txt.setColor('#ffffff');
    });
    btn.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x112244, 0.9);
      btn.fillRoundedRect(-110, -30, 220, 60, 10);
      btn.lineStyle(2, 0x4488cc, 1);
      btn.strokeRoundedRect(-110, -30, 220, 60, 10);
      txt.setColor('#aaddff');
    });
    btn.on('pointerdown', () => {
      this.cameras.main.flash(300, 255, 255, 255, false, () => callback());
    });

    return btn;
  }

  spawnParticle() {
    const { width, height } = this.scale;
    const x = Phaser.Math.Between(0, width);
    const p = this.add.circle(x, height + 4, Phaser.Math.Between(2, 5), 0x4488ff, 0.7);
    this.tweens.add({
      targets: p,
      y: -10,
      x: x + Phaser.Math.Between(-30, 30),
      alpha: 0,
      duration: Phaser.Math.Between(2000, 4000),
      ease: 'Cubic.Out',
      onComplete: () => p.destroy()
    });
  }

  showDifficultyMenu() {
    const { width, height } = this.scale;
    const menuItems = [];

    // Dim overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000011, 1).setDepth(10);
    menuItems.push(overlay);

    // Panel
    const panelW = 300, panelH = 460;
    const px = width / 2, py = height / 2;
    const panel = this.add.graphics().setDepth(11);
    panel.fillStyle(0x0a1833, 1);
    panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, 0x4488cc, 1);
    panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 12);
    menuItems.push(panel);

    const titleTxt = this.add.text(px, py - 130, 'Select Difficulty', {
      fontSize: '28px', color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(12);
    menuItems.push(titleTxt);

    const options = [
      { label: 'Easy',   mult: 0.85, color: 0x44cc44, textColor: '#88ff88' },
      { label: 'Normal', mult: 1.5, color: 0x4488cc, textColor: '#aaddff' },
      { label: 'Hard',   mult: 2.0, color: 0xcc4444, textColor: '#ffaaaa' }
    ];

    options.forEach(({ label, mult, color, textColor }, i) => {
      const by = py - 60 + i * 72;
      const bg = this.add.graphics().setDepth(12);
      const draw = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? color : 0x112244, hover ? 0.9 : 0.8);
        bg.fillRoundedRect(px - 100, by - 24, 200, 48, 8);
        bg.lineStyle(2, color, 1);
        bg.strokeRoundedRect(px - 100, by - 24, 200, 48, 8);
      };
      draw(false);
      const txt = this.add.text(px, by, label, {
        fontSize: '32px', color: textColor, fontFamily: 'serif'
      }).setOrigin(0.5).setDepth(13);
      menuItems.push(bg, txt);
      bg.setInteractive(new Phaser.Geom.Rectangle(px - 100, by - 24, 200, 48), Phaser.Geom.Rectangle.Contains);
      bg.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
      bg.on('pointerout',   () => { draw(false); txt.setColor(textColor); });
      bg.on('pointerdown',  () => this.startNewGame(mult));
    });

    // Back button — placed inside the panel, away from OS home indicator / nav bar
    const backY = py + panelH / 2 - 36;
    const backBg = this.add.graphics().setDepth(12);
    const drawBack = (hover) => {
      backBg.clear();
      backBg.fillStyle(hover ? 0x334466 : 0x1a2233, hover ? 1 : 0.9);
      backBg.fillRoundedRect(px - 80, backY - 22, 160, 44, 8);
      backBg.lineStyle(2, 0x6688aa, 1);
      backBg.strokeRoundedRect(px - 80, backY - 22, 160, 44, 8);
    };
    drawBack(false);
    const backTxt = this.add.text(px, backY, 'Back', {
      fontSize: '28px', color: '#99bbdd', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(13);
    backBg.setInteractive(new Phaser.Geom.Rectangle(px - 80, backY - 22, 160, 44), Phaser.Geom.Rectangle.Contains);
    backBg.on('pointerover',  () => { drawBack(true);  backTxt.setColor('#ffffff'); });
    backBg.on('pointerout',   () => { drawBack(false); backTxt.setColor('#99bbdd'); });
    backBg.on('pointerdown',  () => this.scene.start('TitleScene', {}));
    menuItems.push(backBg, backTxt);

    // Block taps from passing through to title buttons below
    overlay.setInteractive();
  }

  startNewGame(mult = 1.5) {
    GameState.init();
    GameState.setDifficulty(mult);
    this.scene.start('NameInputScene');
  }

  openLoadScreen() {
    this.scene.start('SaveLoadScene', { mode: 'load', returnScene: 'TitleScene' });
  }
}
