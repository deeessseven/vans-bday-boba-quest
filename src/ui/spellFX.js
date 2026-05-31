import Phaser from 'phaser';

// Shared spell particle effects used by BattleScene and BootcampScene.
// `targets` is an array of objects with {x, y} (already-resolved sprites or dummies).
export function spellFX(scene, spellId, targets) {
  const safe = fn => { try { fn(); } catch(_){} };

  const spawnAt = (x, y, id) => {
    if (id === 'fire') {
      for (let i = 0; i < 14; i++) {
        const g = scene.add.graphics().setDepth(15);
        g.fillStyle(Math.random() < 0.55 ? 0xff4400 : 0xffaa00);
        const sz = 3 + Math.random() * 6;
        g.fillCircle(0, 0, sz);
        g.x = x + (Math.random() - 0.5) * 55; g.y = y + (Math.random() - 0.5) * 35 + 10;
        scene.tweens.add({ targets: g, x: g.x + (Math.random()-0.5)*35, y: g.y - 55 - Math.random()*45,
          alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 450+Math.random()*300,
          delay: Math.random()*150, ease: 'Quad.easeOut', onComplete: () => safe(() => g.destroy()) });
      }
    } else if (id === 'ice') {
      for (let i = 0; i < 12; i++) {
        const g = scene.add.graphics().setDepth(15);
        const len = 7 + Math.random() * 5;
        g.lineStyle(2, Math.random() < 0.5 ? 0x88eeff : 0xffffff);
        for (let a = 0; a < 3; a++) {
          const ang = a * Math.PI / 3;
          g.lineBetween(-Math.cos(ang)*len, -Math.sin(ang)*len, Math.cos(ang)*len, Math.sin(ang)*len);
        }
        g.x = x + (Math.random()-0.5)*80; g.y = y - 50 - Math.random()*50;
        scene.tweens.add({ targets: g, x: g.x+(Math.random()-0.5)*25, y: g.y+80+Math.random()*40,
          alpha: 0, angle: 180, duration: 600+Math.random()*250,
          delay: Math.random()*100, ease: 'Quad.easeIn', onComplete: () => safe(() => g.destroy()) });
      }
    } else if (id === 'thunder') {
      for (let b = 0; b < 3; b++) {
        const g = scene.add.graphics().setDepth(15);
        g.lineStyle(b === 0 ? 4 : 2, b === 0 ? 0xffff44 : 0xffffff);
        let cx = 0, cy = 0;
        for (let s = 0; s < 6; s++) {
          const nx = cx + (Math.random()-0.5)*18, ny = cy + 20;
          g.lineBetween(cx, cy, nx, ny); cx = nx; cy = ny;
        }
        g.x = x + (Math.random()-0.5)*50; g.y = y - 90;
        scene.tweens.add({ targets: g, alpha: 0, duration: 120,
          yoyo: true, repeat: 2, delay: b * 80, onComplete: () => safe(() => g.destroy()) });
      }
    } else if (id === 'quake') {
      for (let i = 0; i < 8; i++) {
        const g = scene.add.graphics().setDepth(15);
        const sz = 7 + Math.random() * 9;
        g.fillStyle(0x996644); g.fillRect(-sz/2,-sz/2,sz,sz);
        g.fillStyle(0x664422); g.fillRect(-sz/2+2,-sz/2+2,sz-4,sz-4);
        g.x = x + (Math.random()-0.5)*70; g.y = y - 90 - Math.random()*50;
        scene.tweens.add({ targets: g, x: g.x+(Math.random()-0.5)*20, y: g.y+110+Math.random()*40,
          angle: Math.random()*120, alpha: 0, duration: 380+Math.random()*200,
          delay: Math.random()*120, ease: 'Quad.easeIn', onComplete: () => safe(() => g.destroy()) });
      }
    }
  };

  if (spellId === 'hero2Special2') {
    const cx = scene.W * 0.5, cy = scene.H * 0.04;
    targets.forEach(sp => {
      if (!sp) return;
      for (let i = 0; i < 5; i++) {
        const offsetX = (i - 2) * 14;
        const g = scene.add.graphics().setDepth(15);
        const dx = sp.x - cx + offsetX, dy = sp.y - cy;
        const len = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        g.lineStyle(3 + (i === 2 ? 2 : 0), 0xffffff, 1);
        g.lineBetween(0, 0, len, 0);
        g.x = cx; g.y = cy; g.rotation = angle; g.setAlpha(0);
        scene.tweens.add({ targets: g, alpha: 0.95, duration: 80, delay: i*30,
          yoyo: true, hold: 120, onComplete: () => safe(() => g.destroy()) });
      }
    });
    return;
  }

  if (spellId === 'hero1Special2') {
    const slashLen = scene.W * 0.22, angle = -25;
    targets.forEach((sp, idx) => {
      if (!sp) return;
      for (let i = 0; i < 3; i++) {
        const g = scene.add.graphics().setDepth(15);
        g.lineStyle(2 + (i === 1 ? 1 : 0), 0x88ccff, 1);
        const rad = angle * Math.PI / 180;
        const hx = Math.cos(rad) * slashLen / 2, hy = Math.sin(rad) * slashLen / 2;
        g.lineBetween(-hx, -hy, hx, hy);
        g.x = sp.x + (i - 1) * 18; g.y = sp.y + (i - 1) * 10; g.setAlpha(0);
        scene.tweens.add({ targets: g, alpha: 0.9, duration: 55, delay: idx*60 + i*35,
          yoyo: true, onComplete: () => safe(() => g.destroy()) });
      }
    });
    return;
  }

  if (spellId === 'hero1Special1') {
    const sp = targets[0]; if (!sp) return;
    const g = scene.add.graphics().setDepth(15);
    g.lineStyle(7, 0x6600cc, 1); g.lineBetween(-35,-50,35,50);
    g.lineStyle(4, 0x9933ff, 0.9); g.lineBetween(-20,-50,50,50);
    g.lineStyle(3, 0xcc88ff, 0.8); g.lineBetween(-50,-50,20,50);
    g.x = sp.x; g.y = sp.y; g.setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 1, duration: 120, yoyo: true, hold: 180,
      onComplete: () => safe(() => g.destroy()) });
    return;
  }

  if (spellId === 'hero1Special3') {
    const sp = targets[0]; if (!sp) return;
    const g = scene.add.graphics().setDepth(15);
    g.lineStyle(7, 0xff8800, 1); g.lineBetween(30,-50,-30,50);
    g.lineStyle(4, 0xffcc44, 0.8); g.lineBetween(50,-50,-10,50);
    g.lineStyle(3, 0xffffff, 0.5); g.lineBetween(10,-50,-50,50);
    g.x = sp.x; g.y = sp.y; g.setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 1, duration: 100, yoyo: true, hold: 180,
      onComplete: () => safe(() => g.destroy()) });
    return;
  }

  if (spellId === 'hero1Special4') {
    const slashColors = [0xdd1100, 0xff3300, 0xff6600, 0xff9900, 0xffcc00, 0xffffff];
    targets.forEach((sp, idx) => {
      if (!sp) return;
      const beamDelay = idx * 120;
      const beamHeight = sp.y + 60;

      const beamOuter = scene.add.graphics().setDepth(14);
      beamOuter.fillStyle(0xff6600, 0.35); beamOuter.fillRect(-55, 0, 110, beamHeight);
      beamOuter.x = sp.x; beamOuter.y = 0; beamOuter.setAlpha(0);
      scene.tweens.add({ targets: beamOuter, alpha: 1, duration: 120, delay: beamDelay,
        yoyo: true, hold: 340, ease: 'Quad.easeIn', onComplete: () => safe(() => beamOuter.destroy()) });

      const beamInner = scene.add.graphics().setDepth(15);
      beamInner.fillStyle(0xff2200, 0.85); beamInner.fillRect(-18, 0, 36, beamHeight);
      beamInner.x = sp.x; beamInner.y = 0; beamInner.setAlpha(0);
      scene.tweens.add({ targets: beamInner, alpha: 1, duration: 90, delay: beamDelay,
        yoyo: true, hold: 340, ease: 'Quad.easeIn', onComplete: () => safe(() => beamInner.destroy()) });

      const beamCore = scene.add.graphics().setDepth(16);
      beamCore.fillStyle(0xffffff, 0.9); beamCore.fillRect(-6, 0, 12, beamHeight);
      beamCore.x = sp.x; beamCore.y = 0; beamCore.setAlpha(0);
      scene.tweens.add({ targets: beamCore, alpha: 1, duration: 80, delay: beamDelay,
        yoyo: true, hold: 320, ease: 'Quad.easeIn', onComplete: () => safe(() => beamCore.destroy()) });

      const flash = scene.add.graphics().setDepth(17);
      flash.fillStyle(0xffaa00, 0.9); flash.fillCircle(0, 0, 55);
      flash.x = sp.x; flash.y = sp.y; flash.setAlpha(0);
      scene.tweens.add({ targets: flash, alpha: 1, scaleX: 1.5, scaleY: 1.5,
        duration: 80, delay: beamDelay + 130, yoyo: true, hold: 80, ease: 'Quad.easeOut',
        onComplete: () => safe(() => flash.destroy()) });

      const slashStart = beamDelay + 190;
      for (let i = 0; i < 42; i++) {
        const g = scene.add.graphics().setDepth(15);
        const color = slashColors[i % slashColors.length];
        const lw = i % 7 === 0 ? 8 : i % 7 < 3 ? 5 : 3;
        g.lineStyle(lw, color, 1);
        const isCross = i % 2 === 1;
        const centerAngle = isCross ? 45 : -45;
        const ang = centerAngle + (Math.random() - 0.5) * 30;
        const rad = ang * Math.PI / 180;
        const len = 110 + Math.random() * 50;
        const hx = Math.cos(rad) * len / 2, hy = Math.sin(rad) * len / 2;
        g.lineBetween(-hx, -hy, hx, hy);
        g.x = sp.x + (Math.random() - 0.5) * 60; g.y = sp.y + (Math.random() - 0.5) * 50; g.setAlpha(0);
        scene.tweens.add({ targets: g, alpha: 1, duration: 55, delay: slashStart + i * 20,
          yoyo: true, hold: 80, onComplete: () => safe(() => g.destroy()) });
      }
    });
    return;
  }

  if (spellId === 'hero3Special3') {
    const draw4Star = (g, color, r) => {
      const pts = [];
      for (let p = 0; p < 8; p++) {
        const rad = (p * Math.PI / 4) - Math.PI / 2;
        const len = p % 2 === 0 ? r : r * 0.38;
        pts.push({ x: Math.cos(rad) * len, y: Math.sin(rad) * len });
      }
      g.fillStyle(color, 1);
      for (let p = 0; p < 8; p++) {
        const a = pts[p], b = pts[(p + 1) % 8];
        g.fillTriangle(0, 0, a.x, a.y, b.x, b.y);
      }
    };
    const starColors = [0xcc44ff, 0xaa00ff, 0xdd88ff, 0x8800cc, 0xffffff, 0xeeeeee, 0x000000, 0x111111, 0x220022];
    targets.forEach(sp => {
      if (!sp) return;
      for (let i = 0; i < 48; i++) {
        const g = scene.add.graphics().setDepth(15);
        draw4Star(g, starColors[i % starColors.length], i % 3 === 0 ? 14 + Math.random() * 14 : 5 + Math.random() * 8);
        g.x = sp.x + (Math.random() - 0.5) * 55; g.y = sp.y + (Math.random() - 0.5) * 60;
        const ang = Math.random() * Math.PI * 2;
        const dist = 45 + Math.random() * 80;
        scene.tweens.add({ targets: g,
          x: g.x + Math.cos(ang) * dist, y: g.y + Math.sin(ang) * dist,
          angle: Phaser.Math.RadToDeg((Math.random() - 0.5) * Math.PI),
          alpha: 0, scaleX: 0.05, scaleY: 0.05,
          duration: 400 + Math.random() * 500, delay: Math.random() * 500,
          ease: 'Quad.easeOut', onComplete: () => safe(() => g.destroy()) });
      }
    });
    return;
  }

  targets.forEach(sp => {
    if (!sp) return;
    spawnAt(sp.x, sp.y, spellId);
  });
}
