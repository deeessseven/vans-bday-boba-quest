import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { SoundSystem } from '../audio/SoundSystem.js';
import { GT, resolveStory } from '../data/GameText.js';

// ─────────────────────────────────────────────────────────────────────────────
//  EndingScene — 14 tappable phases after the final boss is defeated
//
//  Tap  1  VICTORY! text + confetti          (skips 500ms)
//  Tap  2  Hero sprites + name plates rise   (skips 1900ms)
//  Tap  3  Gold collected label              (skips 1100ms)
//  Tap  4  Fireworks salvo                   (skips 600ms)
//  Tap  5  Epilogue line 1                   (skips 2000ms)
//  Tap  6  Epilogue line 2                   (skips 480ms)
//  Tap  7  Epilogue line 3                   (skips 480ms)
//  Tap  8  Epilogue line 4                   (skips 480ms)
//  Tap  9  Epilogue line 5                   (skips 480ms)
//  Tap 10  Dark overlay sweeps in            (skips 1400ms)
//  Tap 11  "~ THE END ~" text                (skips 800ms)
//  Tap 12  Final firework salvo              (skips 1000ms)
//  Tap 13  "Tap to play again" prompt        (skips 2200ms)
//  Tap 14  Fade to title screen
// ─────────────────────────────────────────────────────────────────────────────

export class EndingScene extends Phaser.Scene {
  constructor() { super('EndingScene'); }

  create() {
    const { width: W, height: H } = this.scale;
    this.W = W; this.H = H;

    MusicSystem.play('celebration');

    // ── Background ────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000011, 0x000011, 0x110033, 0x110033, 1);
    bg.fillRect(0, 0, W, H);

    for (let i = 0; i < 120; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.72),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9)
      );
      this.tweens.add({
        targets: star, alpha: { from: star.alpha, to: star.alpha * 0.2 },
        duration: Phaser.Math.Between(800, 2400), yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }

    // ── Tap-to-advance system ─────────────────────────────────────────────
    this._pendingPhase = null;
    this._lastSkipAt = 0;
    this.input.on('pointerdown', () => { this._skipPendingPhase(); });

    // ── Phase 0: White flash (immediate, no tap needed) ───────────────────
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1).setDepth(100);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => flash.destroy() });

    // Pre-create VICTORY! text hidden
    this._victoryText = this.add.text(W / 2, H * 0.12 - 50, GT.endingVictory, {
      fontSize: '88px', color: '#ffdd44', fontFamily: 'serif', fontStyle: 'bold',
      stroke: '#773300', strokeThickness: 6,
      shadow: { offsetX: 4, offsetY: 4, color: '#ff8800', blur: 18, fill: true }
    }).setOrigin(0.5).setAlpha(0).setScale(2.5);

    // Story data — resolve placeholders at display time
    const resolve = (text) => resolveStory(text, GameState.party);

    this._story = [
      { text: resolve(GT.endingLine1), color: '#ccddff', offset: -10 },
      { text: resolve(GT.endingLine2), color: '#ffeecc', offset: 15 },
      { text: resolve(GT.endingLine3), color: '#aaffcc', offset: 40 },
      { text: resolve(GT.endingLine4), color: '#ffdd88', offset: 50 },
      { text: resolve(GT.endingLine5), color: '#ffffff', style: 'italic', offset: 30 },
    ];

    // ── Tap 1: VICTORY! + confetti (skips 500ms) ─────────────────────────
    this._schedPhase(500, () => {
      SoundSystem.play('battle_win');
      this.tweens.add({ targets: this._victoryText, alpha: 1, scaleX: 1, scaleY: 1, duration: 420, ease: 'Back.Out' });
      this.time.delayedCall(500, () => {
        this.tweens.add({ targets: this._victoryText, scaleX: 1.06, scaleY: 1.06, duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
      });
      this._burstConfetti();

      // ── Tap 2: Heroes rise (skips 1900ms) ──────────────────────────────
      this._schedPhase(1900, () => {
        this._spawnHeroes();

        // ── Tap 3: Gold label (skips 1100ms) ───────────────────────────
        this._schedPhase(1100, () => {
          const groundY = H * 0.41 - 40;
          const goldLabel = this.add.text(W / 2, groundY + 27, `💰  ${GameState.gold} Gold collected`, {
            fontSize: '24px', color: '#cc9944', fontFamily: 'monospace'
          }).setOrigin(0.5).setAlpha(0).setDepth(10);
          this.tweens.add({ targets: goldLabel, alpha: 1, duration: 500 });

          // ── Tap 4: Fireworks salvo (skips 600ms) ─────────────────────
          this._schedPhase(600, () => {
            this._launchFireworks();

            // ── Tap 5: Epilogue line 1 (skips 2000ms) ──────────────────
            this._schedPhase(2000, () => this._epilogueLine(0));
          });
        });
      });
    });
  }

  // ── Schedule next tappable phase ─────────────────────────────────────────
  _schedPhase(delay, fn) {
    const timer = this.time.delayedCall(delay, () => { this._pendingPhase = null; fn(); });
    this._pendingPhase = { timer, fn };
  }

  // ── Consume current pending phase immediately (tap-to-skip) ──────────────
  _skipPendingPhase() {
    if (!this._pendingPhase) return;
    const { timer, fn } = this._pendingPhase;
    this._pendingPhase = null;
    this._lastSkipAt = Date.now();
    timer.remove(false);
    fn();
  }

  // ── Epilogue lines 1-5, then overlay → THE END → fireworks → replay ──────
  _epilogueLine(i) {
    const { W, H } = this;
    const entry = this._story[i];
    const ty = H * 0.50 + i * 66 + (entry.offset || 0);
    const t = this.add.text(W / 2, ty, entry.text, {
      fontSize: '21px', color: entry.color || '#ccddff',
      fontFamily: 'serif', fontStyle: entry.style || 'normal',
      align: 'center', wordWrap: { width: W * 0.82 }, lineSpacing: 4
    }).setOrigin(0.5).setAlpha(0).setDepth(9);
    this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 700, ease: 'Cubic.Out' });

    if (i < this._story.length - 1) {
      // ── Taps 6-9: next epilogue lines (skips 480ms each) ───────────────
      this._schedPhase(480, () => this._epilogueLine(i + 1));
    } else {
      // ── Tap 10: Dark overlay (skips 1400ms) ────────────────────────────
      this._schedPhase(1400, () => {
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000011, 0).setDepth(20);
        this.tweens.add({ targets: overlay, alpha: 0.72, duration: 1200, ease: 'Cubic.In' });

        // ── Tap 11: THE END text (skips 800ms) ───────────────────────────
        this._schedPhase(800, () => {
          const endText = this.add.text(W / 2, H * 0.86 + 35, GT.endingTheEnd, {
            fontSize: '76px', color: '#ffdd88', fontFamily: 'serif', fontStyle: 'bold',
            stroke: '#553300', strokeThickness: 5,
            shadow: { offsetX: 3, offsetY: 3, color: '#ff8800', blur: 14, fill: true }
          }).setOrigin(0.5).setAlpha(0).setDepth(22);
          this.tweens.add({ targets: endText, alpha: 1, duration: 900, ease: 'Cubic.Out' });
          this.tweens.add({ targets: endText, scaleX: 1.04, scaleY: 1.04, duration: 1400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 1000 });

          // ── Tap 12: Final firework salvo (skips 1000ms) ───────────────
          this._schedPhase(1000, () => {
            for (let k = 0; k < 6; k++) {
              this.time.delayedCall(k * 300, () => this._firework(
                Phaser.Math.Between(W * 0.1, W * 0.9), Phaser.Math.Between(H * 0.05, H * 0.38)
              ));
            }

            // ── Tap 13: Replay prompt (skips 2200ms) ─────────────────────
            this._schedPhase(2200, () => {
              const replay = this.add.text(W / 2, H * 0.93 + 30, GT.endingReplay, {
                fontSize: '32px', color: '#aabbdd', fontFamily: 'serif', fontStyle: 'italic'
              }).setOrigin(0.5).setAlpha(0).setDepth(22);
              this.tweens.add({ targets: replay, alpha: 1, duration: 700 });
              this.tweens.add({ targets: replay, alpha: 0.25, duration: 1000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 800 });

              // ── Tap 14: Fade to title ─────────────────────────────────
              let _titleFired = false;
              this.input.on('pointerdown', () => {
                if (_titleFired || Date.now() - this._lastSkipAt < 200) return;
                _titleFired = true;
                this.cameras.main.fade(600, 0, 0, 0, false, (cam, p) => {
                  if (p === 1) { GameState.init(); this.scene.start('TitleScene', {}); }
                });
              });
            });
          });
        });
      });
    }
  }

  // ── Hero sprites + name plates ────────────────────────────────────────────
  _spawnHeroes() {
    const { W, H } = this;
    const groundY = H * 0.41 - 40;
    const positions = [W * 0.22, W * 0.50, W * 0.78];
    const heroColors = [0x4488ff, 0xffee44, 0xaa44ff];

    GameState.party.forEach((hero, i) => {
      const tx = positions[i];
      const key = `hero${i + 1}`;
      let sprite;
      if (this.textures.exists(key)) {
        sprite = this.add.image(tx, groundY + 100, key).setScale(2.0).setFlipX(true).setAlpha(0).setDepth(10);
      } else {
        sprite = this.add.rectangle(tx, groundY + 100, 96, 128, hero.color || heroColors[i]).setAlpha(0).setDepth(10);
      }
      const landedY = groundY - sprite.displayHeight * 0.5 - 50;
      this.tweens.add({ targets: sprite, y: landedY, alpha: 1, duration: 600, ease: 'Back.Out', delay: i * 220 });

      const plate = this.add.text(tx, groundY - 36, hero.name, {
        fontSize: '28px', color: '#ffeecc', fontFamily: 'serif', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      this.tweens.add({ targets: plate, alpha: 1, duration: 400, delay: i * 220 + 400 });

      const lvlText = this.add.text(tx, groundY - 4, `Lv. ${hero.level}`, {
        fontSize: '22px', color: '#aabbcc', fontFamily: 'monospace'
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      this.tweens.add({ targets: lvlText, alpha: 1, duration: 400, delay: i * 220 + 550 });

      this.time.delayedCall(i * 220 + 700, () => {
        const t = this._spawnSparkles(tx, landedY);
        this.events.once('shutdown', () => t.remove(false));
      });
    });
  }

  // ── Fireworks salvo (hero phase) ──────────────────────────────────────────
  _launchFireworks() {
    const { W, H } = this;
    [[W*0.15,H*0.12],[W*0.85,H*0.16],[W*0.50,H*0.08],[W*0.28,H*0.22],
     [W*0.72,H*0.18],[W*0.10,H*0.30],[W*0.90,H*0.26],[W*0.55,H*0.34]].forEach(([fx, fy]) => {
      this.time.delayedCall(Phaser.Math.Between(300, 2200), () => this._firework(fx, fy));
    });
    this.time.addEvent({
      delay: 700, repeat: 8,
      callback: () => this._firework(Phaser.Math.Between(W*0.08, W*0.92), Phaser.Math.Between(H*0.04, H*0.38))
    });
  }

  // ── Confetti burst ────────────────────────────────────────────────────────
  _burstConfetti() {
    const { W, H } = this;
    const colors = [0xffdd44, 0xff6688, 0x66ddff, 0xaaff66, 0xff99cc, 0xffffff];
    const cx = W / 2, cy = H * 0.18;
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2, speed = Phaser.Math.Between(80, 260);
      const dot = this.add.circle(cx, cy, Phaser.Math.Between(3, 6), colors[i % colors.length], 1).setDepth(5);
      this.tweens.add({ targets: dot, x: cx + Math.cos(angle) * speed, y: cy + Math.sin(angle) * speed * 0.55 - Phaser.Math.Between(20, 80), alpha: 0, duration: Phaser.Math.Between(700, 1300), ease: 'Cubic.Out', delay: Phaser.Math.Between(0, 250), onComplete: () => dot.destroy() });
    }
    this.time.delayedCall(400, () => {
      for (let i = 0; i < 48; i++) {
        const angle = Math.random() * Math.PI * 2, speed = Phaser.Math.Between(60, 200);
        const dot = this.add.circle(cx + Phaser.Math.Between(-60, 60), cy + Phaser.Math.Between(-20, 20), Phaser.Math.Between(2, 5), colors[Phaser.Math.Between(0, colors.length - 1)], 1).setDepth(5);
        this.tweens.add({ targets: dot, x: dot.x + Math.cos(angle) * speed, y: dot.y + Math.sin(angle) * speed * 0.5 - Phaser.Math.Between(0, 60), alpha: 0, duration: Phaser.Math.Between(600, 1100), ease: 'Cubic.Out', delay: Phaser.Math.Between(0, 300), onComplete: () => dot.destroy() });
      }
    });
  }

  // ── Single firework burst ─────────────────────────────────────────────────
  _firework(x, y) {
    const colors = [0xffdd44, 0xff6688, 0x66ddff, 0xaaff66, 0xffffff, 0xff99cc];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2, speed = Phaser.Math.Between(50, 130);
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 1).setDepth(6);
      this.tweens.add({ targets: dot, x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed, alpha: 0, duration: Phaser.Math.Between(500, 900), ease: 'Cubic.Out', onComplete: () => dot.destroy() });
    }
  }

  // ── Sparkle halo ─────────────────────────────────────────────────────────
  _spawnSparkles(cx, cy) {
    const fire = () => {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2, r = Phaser.Math.Between(28, 48);
        const dot = this.add.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, Phaser.Math.Between(1, 3), 0xffee88, 1).setDepth(7);
        this.tweens.add({ targets: dot, y: dot.y - Phaser.Math.Between(18, 36), alpha: 0, duration: Phaser.Math.Between(500, 900), ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    };
    return this.time.addEvent({ delay: 250, callback: fire, loop: true });
  }
}
