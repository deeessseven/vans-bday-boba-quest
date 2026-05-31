import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { GT, resolveStory } from '../data/GameText.js';

// One intro card per hero — indexed to match GameState.party order
function getIntros() { return [
  { textureKey: 'hero1', classLabel: GT.hero1Class, story: resolveStory(GT.hero1Story, GameState.party) },
  { textureKey: 'hero2', classLabel: GT.hero2Class, story: resolveStory(GT.hero2Story, GameState.party) },
  { textureKey: 'hero3', classLabel: GT.hero3Class, story: resolveStory(GT.hero3Story, GameState.party) },
];}

export class HeroIntroScene extends Phaser.Scene {
  constructor() { super('HeroIntroScene'); }

  init(data) {
    this.heroIdx = data.heroIdx || 0;
    this._advancing = false;
  }

  create() {
    const { width: W, height: H } = this.scale;
    const INTROS = getIntros();
    const intro  = INTROS[this.heroIdx];
    const hero   = GameState.party[this.heroIdx];

    // ── Background ────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000011, 0x000011, 0x000033, 0x000033, 1);
    bg.fillRect(0, 0, W, H);

    // ── Hero sprite at 3× scale ───────────────────────────────────────────
    const spriteY = H * 0.20;
    const sprite = this.add.image(W / 2, spriteY, intro.textureKey)
      .setScale(3)
      .setFlipX(true)
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    // Fade sprite in
    this.tweens.add({
      targets: sprite, alpha: 1,
      duration: 700, ease: 'Sine.easeIn'
    });

    // Subtle glow behind sprite
    const glow = this.add.graphics();
    const heroColor = Phaser.Display.Color.IntegerToColor(
      hero ? (hero.color || 0x4488ff) : 0x4488ff
    );
    glow.fillStyle(
      Phaser.Display.Color.GetColor(heroColor.r, heroColor.g, heroColor.b),
      0.15
    );
    glow.fillCircle(W / 2, spriteY, 160);
    glow.setDepth(-1);

    // ── Text card ─────────────────────────────────────────────────────────
    const cardY = H * 0.44;
    const cardH = H - cardY - 10;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x000022, 0.90);
    cardBg.fillRoundedRect(16, cardY, W - 32, cardH, 12);
    cardBg.lineStyle(1.5, 0x334477, 1);
    cardBg.strokeRoundedRect(16, cardY, W - 32, cardH, 12);

    // Hero name
    const heroName = hero ? hero.name : intro.classLabel;
    this.add.text(W / 2, cardY + 18, heroName, {
      fontSize: '42px', color: '#ffffff', fontFamily: 'serif', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    this.add.text(W / 2, cardY + 64, `— ${hero ? hero.class : intro.classLabel} —`, {
      fontSize: '24px', color: '#8899bb', fontFamily: 'serif', fontStyle: 'italic'
    }).setOrigin(0.5, 0);

    // Story paragraph — auto-shrink font until it fits above the button
    const textY = cardY + 104;
    const storyTxt = this.add.text(W / 2, textY, intro.story, {
      fontSize: '24px', color: '#aabbdd', fontFamily: 'serif',
      align: 'center', wordWrap: { width: W - 64 },
      lineSpacing: 6
    }).setOrigin(0.5, 0);
    let fs = 24;
    while (storyTxt.height > (H - 116) - textY && fs > 13) {
      fs -= 1;
      storyTxt.setFontSize(fs);
    }

    // ── Progress dots ─────────────────────────────────────────────────────
    const dotsY = H - 62;
    INTROS.forEach((_, i) => {
      const dx = W / 2 + (i - 1) * 28;
      this.add.circle(dx, dotsY, 7, i === this.heroIdx ? 0xaaddff : 0x334466);
    });

    // ── Continue button ───────────────────────────────────────────────────
    const isLast = this.heroIdx >= INTROS.length - 1;
    const btnLabel = isLast ? 'Begin Adventure!' : 'Continue ›';
    const btnW = isLast ? 340 : 260;
    const btnX = W / 2 - btnW / 2;
    const btnY = H - 100;
    const btnH = 64;

    const btnBg = this.add.graphics();
    const drawBtn = (hov) => {
      btnBg.clear();
      btnBg.fillStyle(hov ? 0x1a3a66 : 0x111833, 0.97);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
      btnBg.lineStyle(hov ? 2 : 1.5, hov ? 0x88ccff : 0x4488cc, 1);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 10);
    };
    drawBtn(false);

    const btnTxt = this.add.text(W / 2, btnY + btnH / 2, btnLabel, {
      fontSize: '38px', color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5);

    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );
    btnBg.on('pointerover', () => { drawBtn(true);  btnTxt.setColor('#ffffff'); });
    btnBg.on('pointerout',  () => { drawBtn(false); btnTxt.setColor('#aaddff'); });
    btnBg.on('pointerdown', () => this._advance(isLast));

  }

  _advance(isLast) {
    if (this._advancing) return;
    this._advancing = true;
    this.cameras.main.fade(300, 0, 0, 0, false, (_cam, p) => {
      if (p < 1) return;
      if (isLast) {
        this.scene.start('WorldScene');
      } else {
        this.scene.start('HeroIntroScene', { heroIdx: this.heroIdx + 1 });
      }
    });
  }
}
