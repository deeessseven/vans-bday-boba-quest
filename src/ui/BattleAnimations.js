/**
 * animateHero — shared hero tween animations for BattleScene and BootcampScene.
 *
 * @param {Phaser.Scene} scene      Scene owning the tweens.
 * @param {Array}        sprites    heroSprites array.
 * @param {Array}        homeXArr   _heroHomeX array.
 * @param {Array}        homeYArr   _heroHomeY array.
 * @param {number}       heroIdx    Index into sprites / home arrays.
 * @param {string}       type       'attack'|'spell'|'special'|'item'|'defend'|'dodge'|'bliss'
 */
export function animateHero(scene, sprites, homeXArr, homeYArr, heroIdx, type) {
  const sprite = sprites[heroIdx];
  if (!sprite) return;
  const ox = homeXArr?.[heroIdx] ?? sprite.x;
  const oy = homeYArr?.[heroIdx] ?? sprite.y;
  const sx = sprite.scaleX, sy = sprite.scaleY;
  const reset = () => { sprite.setPosition(ox, oy); sprite.setScale(sx, sy); };

  if (type === 'attack') {
    scene.tweens.add({
      targets: sprite, x: ox + 78, duration: 120, ease: 'Cubic.Out',
      onComplete: () => scene.tweens.add({
        targets: sprite, x: ox, duration: 155, ease: 'Cubic.In', onComplete: reset
      })
    });
  } else if (type === 'spell') {
    scene.tweens.add({
      targets: sprite, y: oy - 18, scaleX: sx * 1.12, scaleY: sy * 1.12,
      duration: 175, ease: 'Sine.easeInOut', yoyo: true, onComplete: reset
    });
  } else if (type === 'special') {
    scene.tweens.add({
      targets: sprite, x: ox + 55, y: oy - 22, scaleX: sx * 1.22, scaleY: sy * 1.22,
      duration: 210, ease: 'Sine.easeInOut', yoyo: true, onComplete: reset
    });
  } else if (type === 'item') {
    scene.tweens.add({
      targets: sprite, y: oy - 22,
      duration: 160, ease: 'Sine.easeInOut', yoyo: true, onComplete: reset
    });
  } else if (type === 'defend') {
    scene.tweens.add({
      targets: sprite, x: ox - 18,
      duration: 115, ease: 'Sine.easeInOut', yoyo: true, onComplete: reset
    });
  } else if (type === 'dodge') {
    scene.tweens.add({
      targets: sprite, y: oy + 22,
      duration: 115, ease: 'Sine.easeInOut', yoyo: true, onComplete: reset
    });
  } else if (type === 'bliss') {
    scene.tweens.add({
      targets: sprite, y: oy - 105, scaleX: sx * 1.6, scaleY: sy * 1.6,
      duration: 320, ease: 'Sine.easeOut',
      onComplete: () => scene.tweens.add({
        targets: sprite, x: ox + 22,
        duration: 90, ease: 'Sine.easeInOut', yoyo: true, repeat: 5,
        onComplete: () => scene.tweens.add({
          targets: sprite, x: ox, y: oy + 22, scaleX: sx * 0.88, scaleY: sy * 0.88,
          duration: 180, ease: 'Quad.easeIn',
          onComplete: () => scene.tweens.add({
            targets: sprite, y: oy, scaleX: sx, scaleY: sy,
            duration: 220, ease: 'Back.easeOut', onComplete: reset
          })
        })
      })
    });
    const sparkColors = [0x44ff88, 0x88ffcc, 0x00ffaa, 0x66ffdd, 0xaaffee, 0x44ddff, 0x88eeff, 0x00ccff];
    for (let i = 0; i < 48; i++) {
      const g = scene.add.graphics().setDepth(sprite.depth + 1);
      const color = sparkColors[i % sparkColors.length];
      const r = 2 + Math.random() * 4;
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, r);
      g.x = ox + (Math.random() - 0.5) * 40;
      g.y = oy - Math.random() * 90;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const dist = 30 + Math.random() * 70;
      scene.tweens.add({
        targets: g,
        x: g.x + Math.cos(ang) * dist,
        y: g.y + Math.sin(ang) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 380 + Math.random() * 420,
        delay: Math.random() * 600,
        ease: 'Quad.easeOut', onComplete: () => g.destroy()
      });
    }
  }
}
