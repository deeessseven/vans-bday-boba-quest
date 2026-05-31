import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { SPELL_DEFS, ENEMY_ACTIONS, HERO_SPECIALS } from '../data/spells.js';
import { ITEM_DEFS, useItem } from '../data/items.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { SoundSystem } from '../audio/SoundSystem.js';
import { levelUp } from '../data/characters.js';
import { GT, resolveStory } from '../data/GameText.js';
import { animateHero as _animateHero } from '../ui/BattleAnimations.js';
import { spellFX } from '../ui/spellFX.js';

const STATE = { INTRO: 'intro', PLAYER_TURN: 'player', ENEMY_TURN: 'enemy', WIN: 'win', LOSE: 'lose', ANIM: 'anim' };


export class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  init(data) {
    this.enemies      = data.enemies || [];
    this.zone         = data.zone || 'field';
    this.bgKey        = data.bgKey || 'bg_field';
    this.returnScene  = data.returnScene || 'WorldScene';
    this.returnData   = data.returnData || {};
    this.isBoss       = this.enemies.some(e => e.isBoss);
    this.prevTrackId  = MusicSystem.currentTrackId;
    this.dungeonFloor = data.dungeonFloor !== undefined ? data.dungeonFloor : -1;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    // Background
    this.add.image(width / 2, height / 2, this.bgKey).setDisplaySize(width, height);

    MusicSystem.play(this.isBoss
      ? (this.zone === 'boss3' ? 'boss3' : this.zone === 'boss2' ? 'boss2' : 'boss1')
      : (this.dungeonFloor === 2 ? 'battle2' : 'battle'));
    SoundSystem.play(this.isBoss ? 'boss_intro' : 'battle_intro');

    // State
    this.battleState  = STATE.INTRO;
    this.activeHeroIdx = 0;
    this.actionQueue  = [];   // { actor, action, target }
    this.turnOrder    = [];
    this.selectMode   = null; // null | 'spell' | 'item' | 'target_enemy' | 'target_ally'
    this.pendingAction = null;
    this.heroDefending      = GameState.party.map(() => false);
    this._hero1Special1State        = GameState.party.map(() => false);
    this.heroStuck          = GameState.party.map(() => false);
    this._hero1Special3State  = GameState.party.map(() => false);
    this._boss1TauntBonus   = 0;
    this._runDisabled       = false;
    this._runAttempted      = GameState.party.map(() => false);
    this._hero2Special4Active  = false;
    this._hero1Special4Active    = null;
    this._bossAura          = null; // { pct, name } — persistent drain aura
    this._heroReviveCount   = 0;   // total heroes revived this battle
    this._auraDeathSet      = new Set(); // hero indices that have been KO'd at least once
    this._auraGlows         = GameState.party.map(() => null); // persistent purple glow per hero
    this._hero2Special4Timers   = GameState.party.map(() => null); // Recuperative Bliss blink timers
    this._hero2Special4Heroes       = GameState.party.map(() => false); // true only while hero has active Bliss

    this.buildUI();
    this.buildCombatants();
    this.showMessage(this.isBoss
      ? `${this.enemies[0].name} rises!\nPrepare for ${this.zone === 'boss3' ? 'the final battle' : this.zone === 'boss2' ? 'a grueling battle' : 'a tough battle'}!`
      : `${this.enemies.map(e => e.name).join(' and ')} appeared!`,
      1800,
      () => {
        if (this.zone === 'boss1') {
          this.showMessage(
            `${this.enemies[0].name}: ${GT.boss1Intro}`,
            4000,
            () => this._triggerBossAura(() => this.startTurn())
          );
        } else if (this.zone === 'boss2') {
          this.showMessage(
            `${this.enemies[0].name}: ${GT.boss2Intro}`,
            4000,
            () => this._triggerBossAura(() => this.startTurn())
          );
        } else if (this.zone === 'boss3') {
          this.showMessage(
            `${this.enemies[0].name}: ${GT.boss3Intro}`,
            4500,
            () => this._triggerBossAura(() => this.startTurn())
          );
        } else if (this.isBoss) {
          this._triggerBossAura(() => this.startTurn());
        } else {
          this.startTurn();
        }
      }
    );

    // Left-edge secret zone (35×35): instantly win the battle
    const secret = this.add.rectangle(0, height / 2, 35, 35, 0x000000, 0)
      .setOrigin(0, 0.5)
      .setInteractive({ cursor: 'pointer' });
    let _secretCooldown = false;
    let _secretLastTap = 0;
    secret.on('pointerdown', () => {
      if (_secretCooldown) return;
      if (this.battleState === STATE.WIN || this.battleState === STATE.LOSE) return;
      const now = Date.now();
      if (now - _secretLastTap < 400) {
        _secretCooldown = true;
        this.endBattle(true);
      } else {
        _secretLastTap = now;
      }
    });

  }

  // ── Layout ────────────────────────────────────────────────────────────
  buildUI() {
    const { W, H } = this;

    // Message pill (dynamic, resizes to fit text)
    this.msgPill = this.add.graphics().setDepth(5);
    this.msgText = this.add.text(W / 2, H * 0.52 + 154, '', {
      fontSize: '26px', color: '#ccddff', fontFamily: 'serif',
      align: 'center', wordWrap: { width: W - 40 }
    }).setOrigin(0.5).setDepth(6);
    this.msgPill.setVisible(false);
    this.msgText.setVisible(false);
    this._msgEvent        = null;
    this._msgOnDone       = null;
    this._msgDismissReady = false;

    // Tapping anywhere dismisses the message early — only after a short cooldown
    // so the tap that triggered the action doesn't immediately dismiss its own message
    this.input.on('pointerdown', () => {
      if (!this.msgText.visible || !this._msgDismissReady) return;
      const cb = this._msgOnDone;
      if (this._msgEvent) { this._msgEvent.remove(false); this._msgEvent = null; }
      this._msgOnDone       = null;
      this._msgDismissReady = false;
      this.msgPill.setVisible(false);
      this.msgText.setVisible(false);
      if (cb) cb();
    });

    // Command panel
    this.cmdPanel = this.add.graphics();
    this.cmdPanel.fillStyle(0x000033, 0.92);
    this.cmdPanel.fillRect(0, H * 0.52 + 88, W, H * 0.48 - 88);

    // Command buttons container
    // subContainer sits immediately below the Defend/Run row (row 2 bottom = offset 172, +6 gap)
    this.cmdContainer = this.add.container(0, H * 0.52 + 112);
    this.subContainer = this.add.container(0, H * 0.52 + 94 + 178); // spells/items list, below main buttons
    this.targetContainer = this.add.container(0, 0);           // target selection

    // Secret cheat zone: triple-tap right edge → all heroes +1 level
    let _cheatClicks = 0;
    let _cheatTimer = null;
    let _curBg  = null;
    let _curTxt = null;
    const _fireCheat = () => {
      if (_curBg)  { try { _curBg.destroy();  } catch(e) {} _curBg  = null; }
      if (_curTxt) { try { _curTxt.destroy(); } catch(e) {} _curTxt = null; }
      GameState.party.forEach(hero => levelUp(hero));
      GameState.addGold(500);
      SoundSystem.play('level_up');
      this.updateStats();
      const lvls = GameState.party.map(h => `${h.name} Lv.${h.level}`).join('\n');
      const msg = `🔓 Secret Code Unlocked!\n✨ +1 Level & +500 Gold!\n\n${lvls}\n\n💰 ${GameState.gold} Gold total`;
      const oTxt = this.add.text(W / 2, 0, msg, {
        fontSize: '22px', color: '#ffdd88', fontFamily: 'serif',
        align: 'center', wordWrap: { width: W * 0.72 }
      }).setOrigin(0.5).setDepth(51);
      const pad = 40;
      const boxH = oTxt.height + pad * 2;
      const boxTop = H / 2 - boxH / 2;
      oTxt.setY(H / 2);
      const oBg = this.add.graphics().setDepth(50);
      oBg.fillStyle(0x000022, 1);
      oBg.fillRoundedRect(W * 0.1, boxTop, W * 0.8, boxH, 12);
      oBg.lineStyle(2, 0xffdd88, 1);
      oBg.strokeRoundedRect(W * 0.1, boxTop, W * 0.8, boxH, 12);
      _curBg = oBg; _curTxt = oTxt;
      this.time.delayedCall(3000, () => {
        if (_curBg  === oBg)  { try { oBg.destroy();  } catch(e) {} _curBg  = null; }
        if (_curTxt === oTxt) { try { oTxt.destroy(); } catch(e) {} _curTxt = null; }
      });
    };
    const cheatZone = this.add.zone(W, H / 2, 35, 35).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(20);
    cheatZone.on('pointerdown', () => {
      _cheatClicks++;
      if (_cheatTimer) { _cheatTimer.remove(false); _cheatTimer = null; }
      if (_cheatClicks >= 3) {
        _cheatClicks = 0;
        _fireCheat();
      } else {
        _cheatTimer = this.time.delayedCall(800, () => { _cheatClicks = 0; _cheatTimer = null; });
      }
    });
  }

  buildCombatants() {
    const { W, H } = this;
    this.enemySprites = [];
    this.heroSprites  = [];
    this.enemyHpBars  = [];
    this.heroHpBars   = [];

    // Enemies (right side, stacked vertically)
    const eCount   = this.enemies.length;
    const compact  = eCount >= 3;
    const areaTop  = compact ? H * 0.042 : H * 0.05;
    const areaBot  = compact ? H * 0.635 : H * 0.49;
    const slotH    = (areaBot - areaTop) / eCount;
    const ex       = W * 0.80;
    const BAR_W    = compact ? 65 : 80;
    const sprScale = 1.0;
    const nameFsz  = compact ? '17px' : '20px';
    const hpFsz    = compact ? '14px' : '18px';
    const yOffset  = 70; // approx half displayHeight (same scale for all counts)

    this.enemies.forEach((enemy, i) => {
      const ey = areaTop + slotH * (i + 0.5) - yOffset;
      const key = `enemy_${enemy.id}`;
      const sprite = this.textures.exists(key)
        ? this.add.image(ex, ey, key).setScale(sprScale).setDepth(2)
        : this.add.rectangle(ex, ey, 48, 56, enemy.color).setDepth(2);
      // All enemy sprites face right by default; flip them so they face the party (left).
      if (sprite.setFlipX) sprite.setFlipX(true);
      // Clamp x so the right edge of the sprite stays within the screen
      const halfSprW = (sprite.displayWidth ?? 48) / 2;
      if (ex + halfSprW > W - 4) sprite.setX(W - 4 - halfSprW);
      // Shift large sprites down 30px in 3-enemy encounters
      if (compact && (sprite.displayHeight ?? 0) >= 100) sprite.setY(ey + 30);
      this.enemySprites.push(sprite);

      // Name below sprite — use actual sprite position in case it was clamped/shifted
      const sx = sprite.x;
      const actualEy = sprite.y;
      const spriteH = sprite.displayHeight ?? (compact ? 38 : 56);
      const nameY = actualEy + spriteH * 0.5 + 7;
      const nameText = this.add.text(sx, nameY, enemy.name, {
        fontSize: nameFsz, color: '#ffcccc', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1);

      // HP bar below name
      const barY  = nameY + (compact ? 14 : 16);
      const barBg = this.add.rectangle(sx - BAR_W / 2, barY, BAR_W, 8, 0x440000).setOrigin(0, 0.5).setDepth(1);
      const barFill = this.add.rectangle(sx - BAR_W / 2, barY, BAR_W, 8, 0xff0000).setOrigin(0, 0.5).setDepth(1);
      const colX = sx - BAR_W / 2;
      const hpText = this.add.text(colX, barY + (compact ? 4 : 11), `HP ${enemy.hp}/${enemy.maxHp}`, {
        fontSize: hpFsz, color: '#ffaaaa', fontFamily: 'monospace'
      }).setOrigin(0, 0).setDepth(1);
      let mpText = null;
      if (enemy.isBoss) {
        const mpY = barY + (compact ? 4 : 11) + 19;
        mpText = this.add.text(colX, mpY, `MP ${enemy.mp}/${enemy.maxMp || enemy.mp}`, {
          fontSize: hpFsz, color: '#88aaff', fontFamily: 'monospace'
        }).setOrigin(0, 0).setDepth(1);
      }
      this.enemyHpBars.push({ barFill, barW: BAR_W, hpText, mpText, nameText, enemy, sprite });
    });

    // Heroes (bottom-left area)
    const allParty = GameState.party;
    this._heroHomeX = [];
    this._heroHomeY = [];
    allParty.forEach((hero, i) => {
      const x = W * 0.14;
      const y = H * (0.10 + i * 0.14);
      this._heroHomeX.push(x);
      this._heroHomeY.push(y);
      const key = `hero${i + 1}`;
      const sprite = this.textures.exists(key)
        ? this.add.image(x, y, key).setScale(1.0).setFlipX(true).setDepth(2)
        : this.add.rectangle(x, y, 36, 44, hero.color).setDepth(2);
      this.heroSprites.push(sprite);
      this.heroHpBars.push({ sprite, hero });
    });

    // Turn cursor — small arrow to the left of the active hero sprite
    this.turnCursor = this.add.triangle(0, 0, 0, 0, 28, 14, 0, 28, 0xffee44, 1)
      .setDepth(15).setVisible(false);
    this.tweens.add({
      targets: this.turnCursor, alpha: { from: 1, to: 0.3 },
      duration: 500, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Hero status panel (right side of bottom arena) — depth 1 so sprites (depth 2) sit in front
    this.heroStatTexts = [];
    allParty.forEach((hero, i) => {
      const px = W * 0.32 - 50;
      const py = H * (0.07 + i * 0.15) - 10;
      const name = this.add.text(px, py + 2, hero.name, {
        fontSize: '24px', color: '#ffffff', fontFamily: 'monospace'
      }).setDepth(1);
      const hp = this.add.text(px, py + 30, `HP ${hero.hp}/${hero.maxHp}`, {
        fontSize: '22px', color: this._hpColor(hero.hp, hero.maxHp), fontFamily: 'monospace'
      }).setDepth(1);
      const mp = this.add.text(px, py + 56, `MP ${hero.mp}/${hero.maxMp}`, {
        fontSize: '22px', color: '#88bbff', fontFamily: 'monospace'
      }).setDepth(1);
      const sta = Array.from({ length: 6 }, () =>
        this.add.text(px, py + 82, '', { fontSize: '20px', color: '#ffaa44', fontFamily: 'monospace' }).setDepth(1)
      );
      this.heroStatTexts.push({ name, hp, mp, sta, baseX: px, staY: py + 82 });
    });
  }

  // ── Turn management ───────────────────────────────────────────────────
  startTurn() {
    this.battleState = STATE.PLAYER_TURN;
    this.actionQueue = [];
    // Clear counter/run flags; heroDefending cleared per-hero in showHeroCommand
    this._hero1Special3State = GameState.party.map(() => false);
    this._runAttempted     = GameState.party.map(() => false);
    this.heroSprites.forEach((s, i) => {
      if (!s.clearTint) return;
      if (GameState.party[i]?.status === 'dead') { s.setAlpha(0.9); s.setTint(0x262626); }
      else this._restoreTint(i);
    });
    // Aura drains at the start of heroes' turn, then Recuperative Bliss heals
    this._applyAuraDrain(() => {
      this._hero1Special4Active = null;
      if (this._hero2Special4Active) {
        const blissLines = ['Recuperative Bliss:'];
        GameState.party.forEach((h, hi) => {
          if (h.status === 'dead' || !this._hero2Special4Heroes[hi]) return;
          const hpGain = Math.floor(h.maxHp * 0.23);
          const mpGain = Math.floor(h.maxMp * 0.23);
          h.hp = Math.min(h.maxHp, h.hp + hpGain);
          h.mp = Math.min(h.maxMp, h.mp + mpGain);
          blissLines.push(`${h.name} +${hpGain}HP +${mpGain}MP`);
          this._heroHealTint(hi, hpGain, mpGain);
        });
        if (blissLines.length > 1) {
          this.updateBars();
          this.showMessage(blissLines.join('\n'), 900, () => {
            this.activeHeroIdx = this.nextLivingHeroIdx(-1);
            this.updateStats();
            this.showHeroCommand(GameState.party[this.activeHeroIdx]);
          });
          return;
        }
      }
      this.activeHeroIdx = this.nextLivingHeroIdx(-1);
      this.updateStats();
      this.showHeroCommand(GameState.party[this.activeHeroIdx]);
    });
  }

  nextLivingHeroIdx(from) {
    const party = GameState.party;
    for (let i = from + 1; i < party.length; i++) {
      if (party[i].status !== 'dead') return i;
    }
    return -1;
  }

  // Move the blinking cursor to point at the active hero sprite
  _moveCursor(heroIdx) {
    const sprite = this.heroSprites[heroIdx];
    if (!sprite || !this.turnCursor) return;
    this.turnCursor.setPosition(Math.max(4, sprite.x - 58), sprite.y + 16)
      .setVisible(true);
  }

  showHeroCommand(hero) {
    // Clear this hero's defend flag and blue tint at the start of their turn
    const _heroIdx = GameState.party.indexOf(hero);
    if (_heroIdx >= 0 && this.heroDefending[_heroIdx]) {
      this.heroDefending[_heroIdx] = false;
      const _sp = this.heroSprites[_heroIdx];
      if (_sp?.clearTint && hero.status !== 'dead') this._restoreTint(_heroIdx);
      this.updateStats();
    }


    // Sleeping heroes lose their turn
    if (hero.status === 'sleep') {
      const livingHeroes = GameState.party.filter(h => h.status !== 'dead');
      const allAsleep = livingHeroes.length > 1 && livingHeroes.every(h => h.status === 'sleep');
      this.clearContainers();
      this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
      if (allAsleep) {
        this.showMessage('All heroes are asleep!\n(Will wake up when actively hit)', 800, () => this.enemyTurn());
        return;
      }
      const heroIdx = GameState.party.indexOf(hero);
      this._moveCursor(heroIdx);
      this.showMessage(`${hero.name} is asleep!\n(Will wake up when actively hit)`, 800, () => this.afterHeroAction());
      return;
    }

    // Stuck heroes lose their turn
    const stuckIdx = GameState.party.indexOf(hero);
    if (this.heroStuck[stuckIdx]) {
      const livingHeroes = GameState.party.filter(h => h.status !== 'dead');
      const allStuck = livingHeroes.length > 1 && livingHeroes.every(h => this.heroStuck[GameState.party.indexOf(h)]);
      if (allStuck) {
        livingHeroes.forEach(h => { this.heroStuck[GameState.party.indexOf(h)] = false; });
        this.clearContainers();
        this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
        this.updateStats();
        this.showMessage('All heroes are stuck and skip this turn!', 800, () => this.enemyTurn());
        return;
      }
      this.heroStuck[stuckIdx] = false;
      this.clearContainers();
      this._moveCursor(stuckIdx);
      this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
      this.updateStats();
      this.showMessage(`${hero.name} is stuck and skips this turn!`, 800, () => this.afterHeroAction());
      return;
    }

    this.clearContainers();
    this.selectMode = null;
    const { W, H } = this;
    const py = 0;

    // Hero name label before buttons
    this.cmdContainer.add(this.add.text(8, py - 20, hero.name, {
      fontSize: '28px', color: '#ffee88', fontFamily: 'serif', fontStyle: 'bold'
    }));

    // Move cursor to active hero; keep all sprites at full alpha
    const heroIdx = GameState.party.indexOf(hero);
    this._moveCursor(heroIdx);
    this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));

    const isCharged = this._hero1Special1State[heroIdx];
    const btns = [
      { label: isCharged ? '⚔ Charged Attack' : '⚔ Attack', color: isCharged ? '#aa44ff' : '#aaccff', fn: () => this.selectEnemyTarget(hero, 'attack') },
      { label: '✦ Special', fn: () => this.executeSpecial(hero) },
      { label: '✨ Magic',   fn: () => this.showSpellList(hero) },
      { label: '🎒 Item',    fn: () => this.showItemList(hero) },
      { label: '🛡 Defend',  fn: () => this.executeDefend(hero) },
      { label: '🏃 Run',    fn: () => this.tryRun() }
    ];

    btns.forEach((b, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = col * (W / 2) + 8, by = py + 30 + row * 48;
      const btn = this.makeCmdButton(bx, by, b.label, W / 2 - 16, 38, b.fn, b.color);
      this.cmdContainer.add(btn);
    });
  }

  makeBackBtn(x, y, fn) {
    const c = this.add.container(x + 30, y);
    const bg = this.add.graphics();
    const w = this.W / 2 - 46, h = 40;
    const draw = (hov) => {
      bg.clear();
      bg.fillStyle(hov ? 0x223355 : 0x111833, 0.95);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(1, hov ? 0x6699cc : 0x334466, 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };
    draw(false);
    const txt = this.add.text(w / 2, h / 2, '← Back', {
      fontSize: '28px', color: '#aaccff', fontFamily: 'serif'
    }).setOrigin(0.5);
    c.add([bg, txt]);
    const zone = this._makeUIZone(x + 30, y, w, h);
    zone.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
    zone.on('pointerout',   () => { draw(false); txt.setColor('#aaccff'); });
    zone.on('pointerdown',  fn);
    return c;
  }

  makeCmdButton(x, y, label, w, h, fn, color = '#aaccff') {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x223355 : 0x111833, 0.95);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(1, hover ? 0x6699cc : 0x334466, 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };
    draw(false);
    const txt = this.add.text(w / 2, h / 2, label, {
      fontSize: '28px', color, fontFamily: 'serif'
    }).setOrigin(0.5);
    c.add([bg, txt]);
    const zone = this._makeUIZone(x, y, w, h);
    zone.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
    zone.on('pointerout',   () => { draw(false); txt.setColor(color); });
    zone.on('pointerdown',  fn);
    return c;
  }

  showSpellList(hero) {
    this.clearContainers();
    this.selectMode = 'spell';
    const { W } = this;
    const spells = hero.spells || [];

    this.cmdContainer.add(this.add.text(8, -16, 'Choose Spell:', {
      fontSize: '24px', color: '#88aadd', fontFamily: 'serif'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22,() => this.showHeroCommand(hero)));

    if (spells.length === 0) {
      this.cmdContainer.add(this.add.text(8, 22, 'No spells!', { fontSize: '22px', color: '#aa6666', fontFamily: 'serif' }));
      return;
    }

    spells.forEach((sid, i) => {
      const spell = SPELL_DEFS[sid];
      if (!spell) return;
      const locked = spell.levelReq && hero.level < spell.levelReq;
      const reviveLocked = spell.type === 'revive' && !GameState.party.some(h => h.status === 'dead');
      const healCuresStatus = spell.id === 'heal';
      const healLocked = spell.type === 'heal' && GameState.party.every(h =>
        h.status === 'dead' ||
        (h.hp >= h.maxHp && !(healCuresStatus && (h.status === 'poison' || h.status === 'sleep')))
      );
      const mpTransferLocked = spell.type === 'mp_transfer' && GameState.party.filter(h => h !== hero && h.status !== 'dead').every(h => h.mp >= h.maxMp);
      const isDisabled = locked || reviveLocked || healLocked || mpTransferLocked;
      const row = this.add.container(4, 22 + i * 54);
      const bg  = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(isDisabled ? 0x0d0d1a : (hov ? 0x223355 : 0x111833), 0.9);
        bg.fillRoundedRect(0, 0, W - 8, 52, 4);
        bg.lineStyle(1, isDisabled ? 0x222233 : (hov ? 0x6699cc : 0x334466), 1);
        bg.strokeRoundedRect(0, 0, W - 8, 52, 4);
      };
      draw(false);
      const spellCost = this.getSpellCost(spell, hero);
      const costColor = hero.mp >= spellCost ? '#88aaff' : '#aa4444';
      const reviveMsg = () => this.showMessage('Unusable — no ally is KO\'d.', 1400, () => this.showSpellList(hero));
      if (locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 148, 5, `Lv.${spell.levelReq}`, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, `Unlocks at level ${spell.levelReq}`, { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (reviveLocked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, `${spellCost} MP`, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'No ally is KO\'d', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (healLocked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, `${spellCost} MP`, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'All allies are at full HP', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (mpTransferLocked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, `${spellCost} MP`, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'All allies MP is already full', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#ccddff', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, `${spellCost} MP`, { fontSize: '18px', color: costColor, fontFamily: 'monospace' }),
          this.add.text(6, 29, this._spellDesc(spell, hero), { fontSize: '15px', color: '#667799', fontFamily: 'serif', wordWrap: { width: W - 20 } })
        ]);
      }
      this.cmdContainer.add(row);
      const spellZone = this._makeUIZone(4, 22 + i * 54, W - 8, 52);
      spellZone.on('pointerover', () => { if (!isDisabled) draw(true); });
      spellZone.on('pointerout',  () => draw(false));
      spellZone.on('pointerdown', () => {
        if (locked) { this.showMessage(`Unlocks at level ${spell.levelReq}.`, 1400, () => this.showSpellList(hero)); return; }
        if (reviveLocked) { reviveMsg(); return; }
        if (healLocked) { this.showMessage('All allies are at full HP.', 1400, () => this.showSpellList(hero)); return; }
        if (mpTransferLocked) { this.showMessage('All allies MP is already full.', 1400, () => this.showSpellList(hero)); return; }
        if (hero.mp < this.getSpellCost(spell, hero)) {
          this.showMessage('Not enough MP!', 900, () => this.showHeroCommand(hero));
          return;
        }
        this.pendingAction = { type: 'spell', spell, actor: hero };
        if (spell.target === 'all' || spell.target === 'all_ally') {
          this.executeSpell(hero, spell, null);
        } else if (spell.target === 'single_ally') {
          this.selectAllyTarget(hero, spell);
        } else {
          this.selectEnemyTarget(hero, 'spell', spell);
        }
      });
    });
  }

  showItemList(hero) {
    this.clearContainers();
    this.selectMode = 'item';
    const { W } = this;
    const items = GameState.getItemList().filter(({ item }) => item && item.usableInBattle);

    this.cmdContainer.add(this.add.text(8, -16, 'Choose Item:', {
      fontSize: '24px', color: '#88aadd', fontFamily: 'serif'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22,() => this.showHeroCommand(hero)));

    if (items.length === 0) {
      this.cmdContainer.add(this.add.text(8, 22, 'No items!', { fontSize: '22px', color: '#aa6666', fontFamily: 'serif' }));
      return;
    }

    items.forEach(({ item, qty }, i) => {
      const alive = GameState.party.filter(h => h.status !== 'dead');
      const reviveLocked    = item.type === 'revive' && !GameState.party.some(h => h.status === 'dead');
      const healLocked      = item.type === 'heal' && alive.every(h => h.hp >= h.maxHp);
      const mpLocked        = item.type === 'mp' && alive.every(h => h.mp >= h.maxMp);
      const statusLocked    = item.type === 'cure_status' && item.cures?.includes('poison') && !alive.some(h => h.status === 'poison');
      const isDisabled      = reviveLocked || healLocked || mpLocked || statusLocked;
      const disabledReason  = reviveLocked ? 'No ally is KO\'d'
        : healLocked   ? 'All allies HP is already full'
        : mpLocked     ? 'All allies MP is already full'
        : statusLocked ? 'No ally is poisoned'
        : '';

      const row = this.add.container(4, 22 + i * 54);
      const bg = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(isDisabled ? 0x0d0d1a : (hov ? 0x223344 : 0x111822), 0.9);
        bg.fillRoundedRect(0, 0, W - 8, 52, 4);
        bg.lineStyle(1, isDisabled ? 0x222233 : (hov ? 0x559966 : 0x334455), 1);
        bg.strokeRoundedRect(0, 0, W - 8, 52, 4);
      };
      draw(false);
      row.add([bg,
        this.add.text(6, 5, item.name, { fontSize: '22px', color: isDisabled ? '#445566' : '#aaddcc', fontFamily: 'serif' }),
        this.add.text(W - 96, 5, `x${qty}`, { fontSize: '18px', color: isDisabled ? '#334455' : '#aaaaaa', fontFamily: 'monospace' }),
        this.add.text(6, 29, isDisabled ? disabledReason : item.description, { fontSize: '15px', color: isDisabled ? '#334455' : '#558866', fontFamily: 'serif', wordWrap: { width: W - 20 } })
      ]);
      this.cmdContainer.add(row);
      const itemZone = this._makeUIZone(4, 22 + i * 54, W - 8, 52);
      itemZone.on('pointerover', () => { if (!isDisabled) draw(true); });
      itemZone.on('pointerout',  () => draw(false));
      itemZone.on('pointerdown', () => {
        if (isDisabled) return;
        this.pendingAction = { type: 'item', item, actor: hero };
        if (item.target === 'single_ally') {
          this.selectAllyTarget(hero, null, item);
        } else {
          this.executeItem(hero, item, null);
        }
      });
    });
  }

  // ── Target selection ──────────────────────────────────────────────────
  selectEnemyTarget(hero, actionType, spellDef) {
    this.clearContainers();
    this.selectMode = 'target_enemy';
    const { W } = this;

    const targetHeader = spellDef ? `${spellDef.name}, Select enemy:` : 'Select enemy:';
    this.cmdContainer.add(this.add.text(8, -16, targetHeader, {
      fontSize: '24px', color: '#ffccaa', fontFamily: 'serif'
    }));
    const backFn = () => actionType === 'spell' ? this.showSpellList(hero) : this.showHeroCommand(hero);
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22,backFn));

    this.enemies.forEach((enemy, i) => {
      if (enemy.hp <= 0) return;
      const row = this.add.container(4, 22 + i * 52);
      const bg = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(hov ? 0x331111 : 0x200a0a, 0.9);
        bg.fillRoundedRect(0, 0, W - 8, 46, 4);
        bg.lineStyle(1, hov ? 0xcc5544 : 0x553333, 1);
        bg.strokeRoundedRect(0, 0, W - 8, 46, 4);
      };
      draw(false);
      row.add([bg,
        this.add.text(8, 10, enemy.name, { fontSize: '26px', color: '#ffcccc', fontFamily: 'serif' }),
        this.add.text(W - 148, 10, `HP ${enemy.hp}/${enemy.maxHp}`, { fontSize: '20px', color: '#cc8888', fontFamily: 'monospace' })
      ]);
      this.cmdContainer.add(row);
      const eZone = this._makeUIZone(4, 22 + i * 52, W - 8, 46);
      eZone.on('pointerover', () => { draw(true); this.flashEnemy(i, false); });
      eZone.on('pointerout',  () => draw(false));
      eZone.on('pointerdown', () => {
        if (actionType === 'attack') {
          this.executeAttack(hero, enemy, i);
        } else if (actionType === 'spell') {
          this.executeSpell(hero, spellDef, enemy, i);
        }
      });
    });
  }

  selectAllyTarget(hero, spellDef, itemDef) {
    this.clearContainers();
    this.selectMode = 'target_ally';
    const { W } = this;

    const allyHeader = spellDef ? `${spellDef.name}, Select ally:` : 'Select ally:';
    this.cmdContainer.add(this.add.text(8, -16, allyHeader, {
      fontSize: '24px', color: '#aaffcc', fontFamily: 'serif'
    }));
    const backFn = () => spellDef ? this.showSpellList(hero) : this.showItemList(hero);
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22,backFn));

    GameState.party.forEach((target, i) => {
      if (spellDef && spellDef.type !== 'revive' && target.status === 'dead') return;
      if (spellDef && spellDef.type === 'revive' && target.status !== 'dead') return;
      if (spellDef && spellDef.type === 'mp_transfer' && target === hero) return;
      if (spellDef && spellDef.type === 'mp_transfer' && target.mp >= target.maxMp) return;
      if (spellDef && spellDef.type === 'heal' && target.hp >= target.maxHp) {
        if (spellDef.id !== 'heal' || !['poison', 'sleep'].includes(target.status)) return;
      }
      if (itemDef && itemDef.type !== 'revive' && target.status === 'dead') return;
      if (itemDef && itemDef.type === 'revive' && target.status !== 'dead') return;
      if (itemDef && itemDef.type === 'heal' && target.hp >= target.maxHp) return;
      if (itemDef && itemDef.type === 'mp' && target.mp >= target.maxMp) return;
      if (itemDef && itemDef.type === 'cure_status' && !itemDef.cures?.includes(target.status)) return;

      const row = this.add.container(4, 22 + i * 62);
      const bg = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(hov ? 0x0a2a1a : 0x051510, 0.9);
        bg.fillRoundedRect(0, 0, W - 8, 58, 4);
        bg.lineStyle(1, hov ? 0x44aa66 : 0x224433, 1);
        bg.strokeRoundedRect(0, 0, W - 8, 58, 4);
      };
      draw(false);
      const isDead = target.status === 'dead';
      const statusStr = isDead ? 'KO' : (target.status !== 'normal' ? `[${target.status.toUpperCase()}]` : '');
      const hpMpStr = isDead ? '' : `HP ${target.hp}/${target.maxHp}  MP ${target.mp}/${target.maxMp}`;
      row.add([bg,
        this.add.text(8, 4, target.name, { fontSize: '24px', color: isDead ? '#ff6666' : '#aaffcc', fontFamily: 'serif' }),
        this.add.text(8, 32, hpMpStr, { fontSize: '17px', color: '#aaaaaa', fontFamily: 'monospace' }),
        this.add.text(W - 148, 4, statusStr, { fontSize: '17px', color: isDead ? '#ff6666' : '#ffaa44', fontFamily: 'monospace' })
      ]);
      this.cmdContainer.add(row);
      const aZone = this._makeUIZone(4, 22 + i * 62, W - 8, 58);
      aZone.on('pointerover', () => draw(true));
      aZone.on('pointerout',  () => draw(false));
      aZone.on('pointerdown', () => {
        if (spellDef) this.executeSpell(hero, spellDef, target, i);
        else if (itemDef) this.executeItem(hero, itemDef, target, i);
      });
    });
  }

  // ── Combat execution ─────────────────────────────────────────────────
  executeDefend(hero) {
    const heroIdx = GameState.party.indexOf(hero);
    this.heroDefending[heroIdx] = true;
    if (this.heroSprites[heroIdx]?.setTint) this.heroSprites[heroIdx].setTint(0x4488ff);
    this.battleState = STATE.ANIM;
    this.clearContainers();
    this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
    this.animateHero(heroIdx, 'defend');
    SoundSystem.play('defend_hero');
    this.updateStats();
    this.showMessage(`${hero.name} takes a defensive stance!`, 800, () => this.afterHeroAction());
  }

  executeSpecial(hero) {
    const specialIds = HERO_SPECIALS[hero.id] || [];
    const spells = specialIds.map(id => SPELL_DEFS[id]).filter(Boolean);

    this.clearContainers();
    this.selectMode = 'spell';
    const { W } = this;

    this.cmdContainer.add(this.add.text(8, -16, 'Special:', {
      fontSize: '24px', color: '#88aadd', fontFamily: 'serif'
    }));
    this.cmdContainer.add(this.makeBackBtn(W / 2 + 8, -22,() => this.showHeroCommand(hero)));

    if (spells.length === 0) {
      this.cmdContainer.add(this.add.text(8, 22, 'No special available.', {
        fontSize: '26px', color: '#aa6666', fontFamily: 'serif'
      }));
      return;
    }

    spells.forEach((spell, si) => {
      const locked = spell.levelReq && hero.level < spell.levelReq;
      const isCharge = spell.type === 'hero1Special1';
      const heroIdx = GameState.party.indexOf(hero);
      const hero1Special1Locked = isCharge && this._hero1Special1State[heroIdx];
      const hero2Special4Locked = spell.type === 'hero2Special4' &&
        this._hero2Special4Active &&
        GameState.party.every((h, hi) => h.status === 'dead' || this._hero2Special4Heroes[hi]);
      const hero2Special1Locked = spell.type === 'hero2Special1' && hero.mp >= hero.maxMp;
      const hero3Special2Locked = spell.type === 'hero3Special2' &&
        GameState.party.every(h => h.status === 'dead' || (h.hp >= h.maxHp && h.mp >= h.maxMp));
      const hero3Special1Locked = spell.type === 'hero3Special1' &&
        !GameState.party.some(h => h.status !== 'dead' && ['poison', 'sleep'].includes(h.status));
      const isSpecialDisabled = locked || hero1Special1Locked || hero2Special4Locked || hero2Special1Locked || hero3Special2Locked || hero3Special1Locked;
      const row = this.add.container(4, 22 + si * 54);
      const bg = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(isSpecialDisabled ? 0x0d0d1a : (hov ? 0x223355 : 0x111833), 0.9);
        bg.fillRoundedRect(0, 0, W - 8, 52, 4);
        bg.lineStyle(1, isSpecialDisabled ? 0x222233 : (hov ? 0x6699cc : 0x334466), 1);
        bg.strokeRoundedRect(0, 0, W - 8, 52, 4);
      };
      draw(false);
      const isHero3Special3 = spell.type === 'hero3Special3';
      const isHero1Special4 = spell.type === 'hero1Special4';
      const specialCost = this.getSpellCost(spell, hero);
      const hpCost = isHero1Special4 ? Math.floor(hero.maxHp * this._scaledCostPct(0.65, hero, 0.025, 0.20)) : 0;
      const hasEnoughHp = !isHero1Special4 || hero.hp > hpCost;
      const isFree = isCharge;
      const costColor = isFree ? '#88aaff' : isHero3Special3 ? (hero.mp >= specialCost ? '#88aaff' : '#aa4444') : isHero1Special4 ? (hasEnoughHp ? '#ff8888' : '#aa4444') : (hero.mp >= specialCost ? '#88aaff' : '#aa4444');
      const costLabel = isFree ? ' 0 MP' : isHero1Special4 ? ` ${hpCost} HP` : ` ${specialCost} MP`;
      const hero1Special1Msg = () => this.showMessage('Already charged up! Attack normally to unleash it!', 1400, () => this.executeSpecial(hero));
      const hero2Special4Msg   = () => this.showMessage('ALL allies already have Recuperative Bliss.', 1400, () => this.executeSpecial(hero));
      if (locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 148, 5, `Lv.${spell.levelReq}`, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, `Unlocks at level ${spell.levelReq}`, { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (hero1Special1Locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, costLabel, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'Already charged, use normal Attack to unleash!', { fontSize: '15px', color: '#334455', fontFamily: 'serif', wordWrap: { width: W - 20 } })
        ]);
      } else if (hero2Special4Locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, costLabel, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'ALL allies already have Recuperative Bliss', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (hero2Special1Locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, costLabel, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'MP is already full', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (hero3Special2Locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, costLabel, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'All allies HP & MP are already full', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else if (hero3Special1Locked) {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#445566', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, costLabel, { fontSize: '18px', color: '#445566', fontFamily: 'monospace' }),
          this.add.text(6, 29, 'No ally has Poison or Sleep', { fontSize: '15px', color: '#334455', fontFamily: 'serif' })
        ]);
      } else {
        row.add([bg,
          this.add.text(6, 5, spell.name, { fontSize: '22px', color: '#ccddff', fontFamily: 'serif' }),
          this.add.text(W - 96, 5, costLabel, { fontSize: '18px', color: costColor, fontFamily: 'monospace' }),
          this.add.text(6, 29, this._spellDesc(spell, hero), { fontSize: '15px', color: '#667799', fontFamily: 'serif', wordWrap: { width: W - 20 } })
        ]);
      }
      this.cmdContainer.add(row);
      const spZone = this._makeUIZone(4, 22 + si * 54, W - 8, 52);
      // Charged Attack: show "already charged" msg only on tap, not hover
      spZone.on('pointerover', () => { if (!isSpecialDisabled) draw(true); });
      spZone.on('pointerout',  () => draw(false));
      spZone.on('pointerdown', () => {
        if (locked) { this.showMessage(`Unlocks at level ${spell.levelReq}.`, 1400, () => this.executeSpecial(hero)); return; }
        if (hero1Special1Locked)   { hero1Special1Msg(); return; }
        if (hero2Special4Locked)     { hero2Special4Msg();   return; }
        if (hero2Special1Locked) {
          this.showMessage(`${hero.name}'s MP is already full!`, 900, () => this.executeSpecial(hero));
          return;
        }
        if (hero3Special2Locked) { this.showMessage('All allies HP & MP are already full.', 1400, () => this.executeSpecial(hero)); return; }
        if (hero3Special1Locked) { this.showMessage('No ally has Poison or Sleep to Dispel.', 1000, () => this.executeSpecial(hero)); return; }
        if (isCharge) {
          // Charged Attack: skip turn, mark next attack as x3
          if (this._hero1Special1State[heroIdx]) {
            this.showMessage('Already charged up! Attack normally to unleash it!', 900, () => this.executeSpecial(hero));
            return;
          }
          this._hero1Special1State[heroIdx] = true;
          if (this.heroSprites[heroIdx]?.setTint) this.heroSprites[heroIdx].setTint(0xaa44ff);
          this.updateStats();
          this.battleState = STATE.ANIM;
          this.clearContainers();
          this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
          this.animateHero(heroIdx, 'defend');
          SoundSystem.play('spell_hero1Special1');
          this.showMessage(`${hero.name} charges up! Next Attack deals 3x damage!`, 1000, () => this.afterHeroAction());
          return;
        }
        if (spell.type === 'hero1Special3') {
          const mpCost = this.getSpellCost(spell, hero);
          if (hero.mp < mpCost) {
            this.showMessage('Not enough MP!', 900, () => this.executeSpecial(hero));
            return;
          }
          hero.mp = Math.max(0, hero.mp - mpCost);
          this._hero1Special3State[heroIdx] = true;
          if (heroIdx === 0 && this.enemies[0]?.id === 'boss1') {
            this._boss1TauntBonus = Math.min((this._boss1TauntBonus || 0) + 0.10, 0.70);
          }
          if (this.heroSprites[heroIdx]?.setTint) this.heroSprites[heroIdx].setTint(0xffaa22);
          this.updateStats();
          this.battleState = STATE.ANIM;
          this.clearContainers();
          this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
          this.animateHero(heroIdx, 'defend');
          SoundSystem.play('spell_hero1Special3');
          this.showMessage(`${hero.name} takes a counterattack stance! Will dodge and strike back!`, 1000, () => this.afterHeroAction());
          return;
        }
        if (spell.type === 'hero1Special4') {
          const hpCostRising = Math.floor(hero.maxHp * this._scaledCostPct(0.65, hero, 0.025, 0.20));
          if (hero.hp <= hpCostRising) {
            this.showMessage('Not enough HP!', 900, () => this.executeSpecial(hero));
            return;
          }
          hero.hp -= hpCostRising;
          this._hero1Special4Active = new Set(GameState.party.map((h, i) => h.status !== 'dead' ? i : -1).filter(i => i >= 0));
          this.updateBars();
          // Golden tint on all living allies
          this.heroSprites.forEach((s, i) => {
            if (GameState.party[i]?.status !== 'dead' && s.setTint) s.setTint(0xff3300);
          });
          this.battleState = STATE.ANIM;
          this.clearContainers();
          this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
          // Extreme solar leap: crouch → rocket up-forward huge → overshoot back → settle
          { const _sp = this.heroSprites[heroIdx];
            if (_sp) {
              const _ox = this._heroHomeX?.[heroIdx] ?? _sp.x, _oy = this._heroHomeY?.[heroIdx] ?? _sp.y;
              const _sx = _sp.scaleX, _sy = _sp.scaleY;
              // 1. Deep crouch + squish
              this.tweens.add({ targets: _sp, y: _oy + 20, scaleX: _sx * 1.25, scaleY: _sy * 0.65, duration: 100, ease: 'Quad.easeIn',
                onComplete: () =>
                // 2. Rocket high-forward, massive scale surge
                this.tweens.add({ targets: _sp, x: _ox + 145, y: _oy - 130, scaleX: _sx * 1.85, scaleY: _sy * 1.85, duration: 260, ease: 'Quad.easeOut',
                  onComplete: () =>
                  // 3. Slam down past home (overshoot forward-low)
                  this.tweens.add({ targets: _sp, x: _ox + 30, y: _oy + 18, scaleX: _sx * 0.90, scaleY: _sy * 0.90, duration: 130, ease: 'Quad.easeIn',
                    onComplete: () =>
                    // 4. Snap back to home
                    this.tweens.add({ targets: _sp, x: _ox, y: _oy, scaleX: _sx, scaleY: _sy, duration: 160, ease: 'Back.easeOut' })
                  })
                })
              });
            }
          }
          SoundSystem.play('spell_hero1Special4');
          // 360ms = end of crouch (100ms) + rocket (260ms) — slam impact
          this.time.delayedCall(360, () => {
            const rsIdxs = this.enemies.map((_, i) => i);
            this.flashAll(rsIdxs);
            spellFX(this, 'hero1Special4', rsIdxs.map(i => this.enemySprites[i]));
            SoundSystem.play('hit_physical');
            GameState.party.forEach((h, hi) => {
              if (h.status === 'dead') return;
              if (['poison', 'sleep'].includes(h.status)) h.status = 'normal';
              this.heroStuck[hi] = false;
            });
            this.updateStats();
            const msgs = [`${hero.name} unleashes ${spell.name}!`];
            const wasAlive = this.enemies.map(e => e.hp > 0);
            this.enemies.forEach((e, i) => {
              if (e.hp <= 0) return;
              const dmg = this.calcPhysicalDmg(hero.atk, e.def, spell.power);
              e.hp = Math.max(0, e.hp - dmg);
              msgs.push(`${e.name} takes ${dmg} damage!`);
            });
            this.updateBars();
            this.enemies.forEach((e, i) => { if (e.hp <= 0 && wasAlive[i]) { SoundSystem.play('enemy_defeated'); this.enemySprites[i]?.setAlpha(0.9).setTint(0x262626); } });
            msgs.push('ALL ill effects on allies removed!', 'ALL allies immune to negative statuses this turn!');
            this.showMessage(msgs.join('\n'), 1100, () => { this.afterHeroAction(); });
          });
          return;
        }
        if (spell.type === 'hero3Special3') {
          const mpCost = this.getSpellCost(spell, hero);
          if (hero.mp < mpCost) {
            this.showMessage('Not enough MP!', 900, () => this.executeSpecial(hero));
            return;
          }
          hero.mp = Math.max(0, hero.mp - mpCost);
          this.battleState = STATE.ANIM;
          this.clearContainers();
          this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
          // Dramatic dark surge: pull back and swell → blast forward compressing → snap back
          const _sfFire = () => {
            const sfIdxs = this.enemies.map((_, i) => i);
            this.flashAll(sfIdxs);
            spellFX(this, 'hero3Special3', sfIdxs.map(i => this.enemySprites[i]));
            SoundSystem.play('hit_magic');
            const sfMsgs = [`${hero.name} unleashes ${spell.name}!`];
            this.enemies.forEach(e => {
              if (e.hp <= 0) return;
              e.hp = Math.max(1, Math.floor(e.hp / 2));
              if (e.mp !== undefined) e.mp = Math.max(0, Math.floor((e.mp || 0) / 2));
              if (e.dodgePct !== undefined) e.dodgePct = Math.max(0, e.dodgePct / 2);
              sfMsgs.push(`${e.name}: HP, MP, & dodge halved!`);
            });
            this.updateBars();
            this.showMessage(sfMsgs.join('\n'), 1200, () => this.afterHeroAction());
          };
          { const _sp = this.heroSprites[heroIdx];
            if (_sp) {
              const _ox = this._heroHomeX?.[heroIdx] ?? _sp.x, _oy = this._heroHomeY?.[heroIdx] ?? _sp.y;
              const _sx = _sp.scaleX, _sy = _sp.scaleY;
              this.tweens.add({ targets: _sp, x: _ox - 32, scaleX: _sx * 1.45, scaleY: _sy * 1.45, duration: 145, ease: 'Quad.easeOut',
                onComplete: () => this.tweens.add({ targets: _sp, x: _ox + 105, scaleX: _sx * 0.55, scaleY: _sy * 0.55, duration: 105, ease: 'Quad.easeIn',
                  onComplete: () => this.tweens.add({ targets: _sp, x: _ox, scaleX: _sx, scaleY: _sy, duration: 185, ease: 'Sine.easeOut',
                    onComplete: _sfFire })
                })
              });
            } else {
              _sfFire();
            }
          }
          SoundSystem.play('spell_hero3Special3');
          return;
        }
        if (spell.type === 'hero2Special1') {
          const mpGain = Math.floor(hero.maxMp * 0.25);
          hero.mp = Math.min(hero.maxMp, hero.mp + mpGain);
          this.battleState = STATE.ANIM;
          this.clearContainers();
          this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
          this.animateHero(heroIdx, 'defend');
          SoundSystem.play('spell_hero2Special1');
          this._heroHealTint(heroIdx, 0, mpGain);
          this.updateStats();
          this.showMessage(`${hero.name} meditates! +${mpGain} MP restored!`, 1000, () => this.afterHeroAction());
          return;
        }
        if (!isHero1Special4 && !isHero3Special3 && hero.mp < this.getSpellCost(spell, hero)) {
          this.showMessage('Not enough MP!', 900, () => this.executeSpecial(hero));
          return;
        }
        if (spell.type === 'hero2Special4') {
          this.executeSpell(hero, spell, null, undefined, 'bliss');
          return;
        }
        this.executeSpell(hero, spell, null, undefined, 'special');
      });
    });
  }

  // ── Hero movement animations ──────────────────────────────────────────
  animateHero(heroIdx, type) {
    _animateHero(this, this.heroSprites, this._heroHomeX, this._heroHomeY, heroIdx, type);
  }

  executeAttack(hero, enemy, enemyIdx) {
    this.battleState = STATE.ANIM;
    this.clearContainers();
    this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));

    const heroIdx = GameState.party.indexOf(hero);
    const charged = this._hero1Special1State[heroIdx];
    if (charged) {
      this._hero1Special1State[heroIdx] = false;
      this._restoreTint(heroIdx);
      this.updateStats();
    }
    SoundSystem.play('attack_hero');
    this.animateHero(heroIdx, charged ? 'special' : 'attack');
    const atkMsg = charged
      ? `${hero.name} unleashes a Charged Attack on ${enemy.name}!`
      : `${hero.name} attacks ${enemy.name}!`;
    const impactDelay = charged ? 210 : 120;
    this.time.delayedCall(impactDelay, () => {
      if (enemy.dodgePct && Math.random() < enemy.dodgePct) {
        this._enemyDodgeAnim(enemyIdx);
        SoundSystem.play('run_fail');
        this.showMessage(`${atkMsg}\n${enemy.name} dodged the attack!`, 700, () => this.afterHeroAction());
        return;
      }
      const dmg = this.calcPhysicalDmg(hero.atk, enemy.def, charged ? 3.0 : 1.0);
      this.flashEnemy(enemyIdx);
      if (charged) spellFX(this, 'hero1Special1', [this.enemySprites[enemyIdx]]);
      SoundSystem.play('hit_physical');
      enemy.hp = Math.max(0, enemy.hp - dmg);
      this.updateBars();
      if (enemy.hp <= 0) { SoundSystem.play('enemy_defeated'); this.enemySprites[enemyIdx]?.setAlpha(0.9).setTint(0x262626); }
      this.showMessage(`${atkMsg}\n${enemy.name} takes ${dmg} damage!`, 700, () => this.afterHeroAction());
    });
  }

  executeSpell(hero, spell, target, targetIdx, animType = 'spell') {
    this.battleState = STATE.ANIM;
    this.clearContainers();
    this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
    hero.mp -= this.getSpellCost(spell, hero);
    this.animateHero(GameState.party.indexOf(hero), animType);

    if (spell.type === 'damage') {
      const targets = spell.target === 'all' ? this.enemies : [target];
      SoundSystem.play('spell_' + spell.id);
      this.time.delayedCall(175, () => {
        SoundSystem.play('hit_magic');
        const msgs = [`${hero.name} casts ${spell.name}!`];
        const hitIdxs = [];
        const wasAlive = targets.map(e => e.hp > 0);
        for (let i = 0; i < targets.length; i++) {
          const e = targets[i];
          if (e.hp <= 0) continue;
          const eIdx = spell.target === 'all' ? i : targetIdx;
          if (e.dodgePct && Math.random() < e.dodgePct) {
            this._enemyDodgeAnim(this.enemies.indexOf(e));
            msgs.push(`${e.name} dodged the spell!`);
            continue;
          }
          hitIdxs.push(eIdx);
          const rawDmg = this.calcMagicDmg(hero.mag, spell.power, e.def);
          const isWeak = !!(spell.element && e.weakTo?.includes(spell.element));
          const dmg = isWeak ? Math.floor(rawDmg * 1.5) : rawDmg;
          e.hp = Math.max(0, e.hp - dmg);
          msgs.push(`${e.name} takes ${dmg} damage!${isWeak ? `\nFound ${e.name}'s Elemental Weakness!` : ''}`);
        }
        if (hitIdxs.length > 0) { this.flashAll(hitIdxs); spellFX(this, spell.id, hitIdxs.map(i => this.enemySprites[i])); }
        this.updateBars();
        targets.forEach((e, i) => { if (e.hp <= 0 && wasAlive[i]) { SoundSystem.play('enemy_defeated'); this.enemySprites[spell.target === 'all' ? i : targetIdx]?.setAlpha(0.9).setTint(0x262626); } });
        this.showMessage(msgs.join('\n'), 900, () => { this.afterHeroAction(); });
      });
    } else if (spell.type === 'heal') {
      const heal = Math.floor(spell.power + hero.mag * 0.8) + Math.floor(Math.random() * 20);
      const actual = Math.min(heal, target.maxHp - target.hp);
      target.hp += actual;
      const ti = GameState.party.indexOf(target);
      this._heroHealSetTint(ti, 0x44ff44, 700);
      if (spell.id === 'heal') {
        this.time.delayedCall(750, () => this._heroHealSetTint(ti, 0xffbbdd, 600));
      }
      SoundSystem.play('spell_' + spell.id);
      const healMsgs = [`${hero.name} casts ${spell.name}!\n${target.name} restored ${actual} HP!`];
      if (spell.id === 'heal' && ['poison', 'sleep'].includes(target.status)) {
        healMsgs.push(`${target.name}'s ${target.status} was cured!`);
        target.status = 'normal';
      }
      this.updateStats();
      this.showMessage(healMsgs.join('\n'), 1200, () => {
        this.afterHeroAction();
      });
    } else if (spell.type === 'revive') {
      if (spell.target === 'all_ally') {
        // Revive ALL dead allies (e.g. Revive spell)
        SoundSystem.play('spell_awaken');
        const revived = [];
        const revivedIdxs = [];
        GameState.party.forEach((member, mi) => {
          if (member.status === 'dead') {
            member.hp = Math.floor(member.maxHp * spell.healPercent);
            member.status = 'normal';
            if (spell.mpRestorePercent) member.mp = Math.floor(member.maxMp * spell.mpRestorePercent);
            this._clearHeroStatus(mi);
            revivedIdxs.push(mi);
            revived.push(member.name);
            if (this.heroSprites[mi]) this.heroSprites[mi].setAlpha(1);
            this._reviveTintFlash(mi);
          }
        });
        this._heroReviveCount += revived.length;
        const rMsg = revived.length > 0
          ? `${hero.name} casts ${spell.name}!\n${revived.join(', ')} revived!`
          : `${hero.name} casts ${spell.name}!\nNo allies to revive.`;
        this.showMessage(rMsg, 1200, () => {
          this.updateStats();
          if (revived.length > 0) {
            this._triggerBossAura(() => this.afterHeroAction(), revivedIdxs);
          } else {
            this.afterHeroAction();
          }
        });
      } else if (target.status === 'dead') {
        // Single-target revive (e.g. Awaken spell)
        target.hp = Math.floor(target.maxHp * spell.healPercent);
        target.status = 'normal';
        if (spell.mpRestorePercent) target.mp = Math.floor(target.maxMp * spell.mpRestorePercent);
        const ti = GameState.party.indexOf(target);
        this._clearHeroStatus(ti);
        if (this.heroSprites[ti]) this.heroSprites[ti].setAlpha(1);
        this._reviveTintFlash(ti);
        this._heroReviveCount++;
        SoundSystem.play('spell_awaken');
        this.showMessage(`${hero.name} casts ${spell.name}!\n${target.name} revived!`, 1200, () => {
          this.updateStats();
          this._triggerBossAura(() => this.afterHeroAction(), [ti]);
        });
      }
    } else if (spell.type === 'mp_transfer') {
      const give = Math.floor(hero.maxMp * (spell.amountPercent ?? 0.10));
      target.mp = Math.min(target.maxMp, target.mp + give);
      SoundSystem.play('spell_guard');
      const casterIdx = GameState.party.indexOf(hero);
      const enchantTgtIdx = GameState.party.indexOf(target);
      this._heroHealSetTint(casterIdx, 0x88bbff, 500);
      this.time.delayedCall(350, () => { this._heroHealSetTint(enchantTgtIdx, 0x88bbff, 600); });
      this.updateBars();
      this.showMessage(`${hero.name} gives ${give} MP to ${target.name}!`, 1000, () => {
        this.updateStats();
        this.afterHeroAction();
      });

    } else if (spell.type === 'hero1Special2') {
      // Blade Storm: physical damage × power to all enemies
      SoundSystem.play('spell_hero1Special2');
      this.time.delayedCall(175, () => {
        SoundSystem.play('hit_physical');
        const msgs = [`${hero.name} uses ${spell.name}!`];
        const bsIdxs = [];
        const wasAlive = this.enemies.map(e => e.hp > 0);
        this.enemies.forEach((e, i) => {
          if (e.hp <= 0) return;
          if (e.dodgePct && Math.random() < e.dodgePct) { this._enemyDodgeAnim(i); msgs.push(`${e.name} dodged the attack!`); return; }
          bsIdxs.push(i);
          const dmg = this.calcPhysicalDmg(hero.atk, e.def, spell.power);
          e.hp = Math.max(0, e.hp - dmg);
          msgs.push(`${e.name} takes ${dmg} damage!`);
        });
        if (bsIdxs.length > 0) { this.flashAll(bsIdxs); spellFX(this, 'hero1Special2', bsIdxs.map(i => this.enemySprites[i])); }
        this.updateBars();
        this.enemies.forEach((e, i) => { if (e.hp <= 0 && wasAlive[i]) { SoundSystem.play('enemy_defeated'); this.enemySprites[i]?.setAlpha(0.9).setTint(0x262626); } });
        this.showMessage(msgs.join('\n'), 900, () => { this.afterHeroAction(); });
      });

    } else if (spell.type === 'hero2Special2') {
      // Light Blast: magic damage × power to all enemies
      SoundSystem.play('spell_hero2Special2');
      this.time.delayedCall(175, () => {
        SoundSystem.play('hit_magic');
        const msgs = [`${hero.name} casts ${spell.name}!`];
        const hitIdxs = [];
        const wasAlive = this.enemies.map(e => e.hp > 0);
        this.enemies.forEach((e, i) => {
          if (e.hp <= 0) return;
          if (e.dodgePct && Math.random() < e.dodgePct) { this._enemyDodgeAnim(i); msgs.push(`${e.name} dodged the spell!`); return; }
          hitIdxs.push(i);
          const dmg = this.calcMagicDmg(hero.mag, spell.power, e.def);
          e.hp = Math.max(0, e.hp - dmg);
          msgs.push(`${e.name} takes ${dmg} damage!`);
        });
        if (hitIdxs.length > 0) { this.flashAll(hitIdxs); spellFX(this, 'hero2Special2', hitIdxs.map(i => this.enemySprites[i])); }
        this.updateBars();
        this.enemies.forEach((e, i) => { if (e.hp <= 0 && wasAlive[i]) { SoundSystem.play('enemy_defeated'); this.enemySprites[i]?.setAlpha(0.9).setTint(0x262626); } });
        this.showMessage(msgs.join('\n'), 900, () => { this.afterHeroAction(); });
      });

    } else if (spell.type === 'hero3Special2') {
      SoundSystem.play('spell_hero3Special2');
      const castMsgs = [`${hero.name} casts ${spell.name}!`];
      GameState.party.forEach((h, hi) => {
        if (h.status === 'dead') return;
        const hpGain = Math.min(Math.floor(h.maxHp * 0.15), h.maxHp - h.hp);
        const mpGain = Math.min(Math.floor(h.maxMp * 0.15), h.maxMp - h.mp);
        if (hpGain > 0) h.hp += hpGain;
        if (mpGain > 0) h.mp += mpGain;
        castMsgs.push(`${h.name} +${hpGain} HP, +${mpGain} MP`);
        this._heroHealTint(hi, hpGain, mpGain);
      });
      this.updateBars();
      this.showMessage(castMsgs.join('\n'), 1200, () => {
        this.updateStats();
        this.afterHeroAction();
      });

    } else if (spell.type === 'hero2Special4') {
      SoundSystem.play('spell_hero2Special4');
      this._hero2Special4Active = true;
      const blissLines = [`${hero.name} casts ${spell.name}!`];
      GameState.party.forEach((h, hi) => {
        if (h.status === 'dead') return;
        this._hero2Special4Heroes[hi] = true;
        const hpGain = Math.floor(h.maxHp * 0.23);
        const mpGain = Math.floor(h.maxMp * 0.23);
        h.hp = Math.min(h.maxHp, h.hp + hpGain);
        h.mp = Math.min(h.maxMp, h.mp + mpGain);
        this._startBlissTint(hi);
        blissLines.push(`${h.name} +${hpGain}HP +${mpGain}MP`);
      });
      this.showMessage(blissLines.join('\n'), 1200, () => {
        this.updateStats();
        this.afterHeroAction();
      });

    } else if (spell.type === 'hero3Special1') {
      // Dispel: remove Poison and Sleep from all living allies
      SoundSystem.play('spell_hero3Special1');
      const HARMFUL = ['poison', 'sleep'];
      const cured = [];
      GameState.party.forEach((member, mi) => {
        if (member.status === 'dead') return;
        this._heroHealSetTint(mi, 0xffbbdd, 700);
        if (HARMFUL.includes(member.status)) {
          cured.push(`${member.name} (${member.status})`);
          member.status = 'normal';
        }
      });
      const msg = cured.length > 0
        ? `${hero.name} casts ${spell.name}!\nCured: ${cured.join(', ')}`
        : `${hero.name} casts ${spell.name}!\nNo statuses to remove.`;
      this.updateStats();
      this.showMessage(msg, 1200, () => {
        this.afterHeroAction();
      });

    } else if (spell.type === 'hero2Special3') {
      // Illuminated Drain: deal % of each enemy's max HP and drain MP
      SoundSystem.play('spell_hero2Special3');
      this.time.delayedCall(175, () => {
        SoundSystem.play('hit_magic');
        const msgs = [`${hero.name} casts ${spell.name}!`];
        const hitIdxs = [];
        const wasAlive = this.enemies.map(e => e.hp > 0);
        this.enemies.forEach((e, i) => {
          if (e.hp <= 0) return;
          if (e.dodgePct && Math.random() < e.dodgePct) { this._enemyDodgeAnim(i); msgs.push(`${e.name} dodged the spell!`); return; }
          hitIdxs.push(i);
          const effectivePct = spell.percent + hero.mag * 0.001;
          const dmg = Math.max(1, Math.floor(e.maxHp * effectivePct));
          e.hp = Math.max(0, e.hp - dmg);
          msgs.push(`${e.name} takes ${dmg} damage!`);
          const effectiveMax = e.maxMp ?? 0;
          const mpDrain = effectiveMax > 0 ? Math.max(1, Math.floor(effectiveMax * 0.20)) : 0;
          e.mp = Math.max(0, (e.mp || 0) - mpDrain);
          if (mpDrain > 0) msgs.push(`${e.name} loses ${mpDrain} MP!`);
        });
        if (hitIdxs.length > 0) {
          const drainSteps = [0xffffff, 0xdddddd, 0xaaaaaa, 0x777777, 0x444444, 0x111111, 0x000000];
          drainSteps.forEach((tint, si) => {
            this.time.delayedCall(si * 110, () => hitIdxs.forEach(i => { const s = this.enemySprites[i]; if (s?.setTintFill) s.setTintFill(tint); }));
          });
          this.time.delayedCall(drainSteps.length * 110 + 120, () => {
            hitIdxs.forEach(i => {
              const s = this.enemySprites[i];
              if (!s) return;
              if (this.enemies[i].hp <= 0 && wasAlive[i]) {
                SoundSystem.play('enemy_defeated');
                s.setAlpha(0.9).setTint(0x262626);
              } else if (s.clearTint) {
                s.clearTint();
              }
            });
          });
        }
        this.updateBars();
        this.showMessage(msgs.join('\n'), 900, () => { this.afterHeroAction(); });
      });
    }
  }

  executeItem(hero, item, target, targetIdx) {
    this.battleState = STATE.ANIM;
    this.clearContainers();
    GameState.removeItem(item.id, 1);
    this.animateHero(GameState.party.indexOf(hero), 'item');
    SoundSystem.play('item_' + item.type);

    const ti = target ? GameState.party.indexOf(target) : -1;
    const wasDeadBefore = target?.status === 'dead';
    const hpBefore = target ? target.hp : 0;
    const mpBefore = target ? target.mp : 0;

    const result = target ? useItem(item, target) : { message: 'Used item.' };

    if (ti >= 0 && target) {
      const hpGain = target.hp - hpBefore;
      const mpGain = target.mp - mpBefore;
      if (item.type === 'revive' && wasDeadBefore) {
        this._clearHeroStatus(ti);
        if (this.heroSprites[ti]) this.heroSprites[ti].setAlpha(1);
        this._reviveTintFlash(ti);
        this._heroReviveCount++;
      } else if (item.type === 'heal' || item.type === 'mp') {
        this._heroHealTint(ti, hpGain, mpGain);
      } else if (item.type === 'cure_status') {
        this._heroHealSetTint(ti, 0xffbbdd, 700);
      }
    }

    this.showMessage(result.message || 'Used item.', 1100, () => {
      this.updateStats();
      if (wasDeadBefore && item.type === 'revive') {
        this._triggerBossAura(() => this.afterHeroAction(), [ti]);
      } else {
        this.afterHeroAction();
      }
    });
  }

  afterHeroAction() {
    if (this.checkWin()) return;
    const next = this.nextLivingHeroIdx(this.activeHeroIdx);
    if (next >= 0) {
      this.activeHeroIdx = next;
      this.battleState = STATE.PLAYER_TURN;
      this.showHeroCommand(GameState.party[next]);
    } else {
      this.enemyTurn();
    }
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────
  enemyTurn() {
    this.battleState = STATE.ENEMY_TURN;
    if (this.turnCursor) this.turnCursor.setVisible(false);
    this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));
    let idx = 0;
    const doNextEnemy = () => {
      if (idx >= this.enemies.length) { this.afterEnemyTurn(); return; }
      const enemy = this.enemies[idx++];
      if (enemy.hp <= 0 || enemy.status === 'dead') { doNextEnemy(); return; }

      // Boss1 diminishing dodge: 2% turn 1, 1% turn 2, 0% thereafter
      if (enemy.id === 'boss1') {
        enemy._boss1TurnCount = (enemy._boss1TurnCount || 0) + 1;
        if (enemy._boss1TurnCount === 2) enemy.dodgePct = 0.01;
        else if (enemy._boss1TurnCount >= 3) enemy.dodgePct = 0;
      }

      // Status effects (skipped when resuming after a pending aura fires)
      if (enemy._skipStatusThisTurn) {
        enemy._skipStatusThisTurn = false;
      } else {
        if (enemy.status === 'sleep') {
          if (Math.random() < 0.3) enemy.status = 'normal';
          this.showMessage(`${enemy.name} is asleep.`, 500, doNextEnemy);
          return;
        }
        if (enemy.status === 'poison') {
          const pdmg = Math.floor(enemy.maxHp * 0.10);
          enemy.hp = Math.max(1, enemy.hp - pdmg);
          this.updateBars();
          SoundSystem.play('poison_tick');
        }
      }

      // 2nd+ aura fires at the start of boss's turn, then boss takes normal action
      if (enemy.isBoss && enemy._pendingAura) {
        enemy._pendingAura = false;
        enemy._skipStatusThisTurn = true;
        idx--;
        const _d = this._bossAura;
        const pctDisp = Math.round(_d.pct * 100);
        SoundSystem.play(_d.sound);
        this._bossIntroShake(enemy.id);
        const auraMsg = `${enemy.name} uses ${_d.name}!\nAll heroes lose ${pctDisp}% max HP & MP each turn!`;
        this.showMessage(auraMsg, 1400, () => { this._startAuraGlows(); doNextEnemy(); });
        return;
      }

      const rawPool = enemy.actions || ['attack'];
      const actionPool = rawPool.length > 0 ? rawPool : ['attack'];
      let aKey;
      if (enemy.id === 'boss2') {
        const dodge = enemy.dodgePct || 0;
        // If last action was Inferno Heat Stroke, dodge²+dodge³ chance (~98% at 75%) to force Tail Strike
        if (enemy._lastAction === 'boss2SpecialAttack1' && actionPool.includes('boss2PhysicalAttack2')) {
          const tailChance = dodge * dodge + dodge * dodge * dodge;
          if (Math.random() < tailChance) aKey = 'boss2PhysicalAttack2';
        }
        if (!aKey) {
          // Inferno Heat Stroke gets boosted weight (base + base*dodge)
          const weights = actionPool.map(a => a === 'boss2SpecialAttack1' ? 1 + dodge + dodge * dodge : 1);
          const total = weights.reduce((s, w) => s + w, 0);
          let r = Math.random() * total;
          aKey = actionPool[weights.findIndex(w => { r -= w; return r <= 0; })];
          if (!aKey) aKey = actionPool[actionPool.length - 1];
        }
      } else {
        aKey = actionPool[Math.floor(Math.random() * actionPool.length)];
      }
      let actionDef = ENEMY_ACTIONS[aKey] || ENEMY_ACTIONS.attack;

      // Boss 3: first time HP ≤ 33% (maxHp/3) → guaranteed Bubble Breath; afterwards 50% chance
      if (enemy.id === 'boss3' && enemy.hp <= enemy.maxHp / 3) {
        if (!enemy._boss3MagicAttack4ThresholdTriggered) {
          enemy._boss3MagicAttack4ThresholdTriggered = true;
          aKey = 'boss3MagicAttack4';
          actionDef = ENEMY_ACTIONS.boss3MagicAttack4;
        } else if (Math.random() < 0.5) {
          aKey = 'boss3MagicAttack4';
          actionDef = ENEMY_ACTIONS.boss3MagicAttack4;
        }
      }

      // If action has an MP cost and enemy can't afford it, fall back to basic attack
      if (actionDef.mpCost && (enemy.mp ?? 0) < actionDef.mpCost) {
        aKey = 'attack';
        actionDef = ENEMY_ACTIONS.attack;
      }
      if (actionDef.mpCost) enemy.mp = Math.max(0, (enemy.mp ?? 0) - actionDef.mpCost);
      enemy._lastAction = aKey;

      // Pick target (living hero)
      const living = GameState.party.filter(h => h.status !== 'dead');
      if (living.length === 0) { this.endBattle(false); return; }

      let singleTarget;
      if (actionDef.target !== 'all' && this._boss1TauntBonus > 0 && enemy.id === 'boss1') {
        const hero1 = GameState.party[0];
        const hero1Alive = hero1 && hero1.status !== 'dead';
        if (hero1Alive && Math.random() < this._boss1TauntBonus) {
          singleTarget = hero1;
        } else {
          const others = living.filter(h => h !== hero1);
          const pool = others.length > 0 ? others : living;
          singleTarget = pool[Math.floor(Math.random() * pool.length)];
        }
      } else {
        singleTarget = living[Math.floor(Math.random() * living.length)];
      }
      const targets = actionDef.target === 'all' ? living : [singleTarget];

      // Play enemy action sound
      SoundSystem.play('enemy_' + aKey);

      // Lunge animation: enemy shifts left toward the party then snaps back
      const enemyIdx = idx - 1;
      const es = this.enemySprites[enemyIdx];
      if (es) {
        const ox = es.x;
        this.tweens.add({
          targets: es, x: ox - 22,
          duration: 120, ease: 'Cubic.Out',
          onComplete: () => this.tweens.add({
            targets: es, x: ox,
            duration: 180, ease: 'Cubic.In'
          })
        });
      }

      // Impact fires at lunge peak — hero hit animations and combined message
      this.time.delayedCall(120, () => {
        const actionAnn = `${enemy.name} uses ${actionDef.name}!`;

        // Sleep Breath: sleep all heroes + self-heal (Boss 3 ≤ 33% HP)
        if (aKey === 'boss3MagicAttack4') {
          if (!enemy._boss3MagicAttack4Count) enemy._boss3MagicAttack4Count = 0;
          enemy._boss3MagicAttack4Count++;
          const healPct = enemy._boss3MagicAttack4Count === 1 ? 0.70
            : enemy._boss3MagicAttack4Count === 2 ? 0.40
            : 0.10;
          const hpHeal = Math.floor(enemy.maxHp * healPct);
          const mpHeal = Math.floor(enemy.maxMp * healPct * 0.5);
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + hpHeal);
          enemy.mp = Math.min(enemy.maxMp, (enemy.mp || 0) + mpHeal);
          const sleepChance = enemy._boss3MagicAttack4Count === 1 ? 1.0
            : enemy._boss3MagicAttack4Count === 2 ? 0.5 : 0.3;

          // Phase 1: damage
          const dmgMsgs = [];
          const survivors = [];
          living.forEach(h => {
            const hIdx = GameState.party.indexOf(h);
            if (h.status === 'dead') return;
            if (this._hero1Special4Active?.has(hIdx)) { dmgMsgs.push(`${h.name} is immune!`); return; }
            const wasSleeping = h.status === 'sleep';
            const bbDmg = Math.floor(this.calcMagicDmg(enemy.mag, 2.2, h.def) * this._effectiveMult());
            h.hp = Math.max(0, h.hp - bbDmg);
            if (hIdx >= 0) this._heroHitAnim(hIdx);
            dmgMsgs.push(`${h.name} takes ${bbDmg} damage!`);
            if (wasSleeping && bbDmg > 0) { h.status = 'normal'; if (h.hp > 0) dmgMsgs.push(`${h.name} woke up!`); }
            if (h.hp === 0) {
              h.status = 'dead'; h.mp = 0;
              if (hIdx >= 0) this._clearHeroStatus(hIdx);
              dmgMsgs.push(`${h.name} was ${this._koLabel()}!`);
              if (hIdx >= 0 && this.heroSprites[hIdx]) { this.heroSprites[hIdx].setAlpha(0.9).setTint(0x262626); }
              return;
            }
            survivors.push(h);
          });

          // Phase 2: sleep only
          const sleepMsgs = [];
          survivors.forEach(h => {
            if (Math.random() < sleepChance) { h.status = 'sleep'; const _ssi = GameState.party.indexOf(h); if (_ssi >= 0) this._restoreTint(_ssi); sleepMsgs.push(`${h.name} fell asleep!\n(Will wake up when actively hit)`); }
          });

          this.updateBars();

          const sequence = [
            actionAnn + (dmgMsgs.length ? '\n' + dmgMsgs.join('\n') : ''),
            sleepMsgs.join('\n'),
            `${enemy.name} restored ${hpHeal} HP and ${mpHeal} MP!`,
          ].filter(m => m.trim());
          const showNext = (i) => {
            if (i >= sequence.length) { doNextEnemy(); return; }
            this.showMessage(sequence[i], 1200, () => showNext(i + 1));
          };
          showNext(0);
          return;
        }

        // Special non-damage actions
        if (actionDef.type === 'special') {
          let hitChance = aKey === 'bigEnemy1Attack3' ? 0.65 : 0.5;
          if (aKey === 'boss2SpecialAttack1') { const d = enemy.dodgePct || 0; hitChance = hitChance + hitChance * (d * d); }
          const hit = Math.random() < hitChance;
          const msgs = [actionAnn];
          if (hit && actionDef.effect === 'stuck') {
            const stuckTargets = actionDef.target === 'all' ? living : [targets[0]];
            const hpDmg = Math.floor(enemy.atk / 4 * this._effectiveMult());
            const mpDmg = Math.floor(enemy.mag / 4 * this._effectiveMult());
            stuckTargets.forEach(t => {
              const hi = GameState.party.indexOf(t);
              if (this._hero1Special4Active?.has(hi)) { msgs.push(`${t.name} is immune!`); return; }
              // Counterattack fires on STUCK damage too — but Warrior is still caught
              if (hi >= 0 && this._hero1Special3State[hi]) {
                this.animateHero(hi, 'dodge');
                this.time.delayedCall(230, () => this.animateHero(hi, 'attack'));
                const ctrDmg = this.calcPhysicalDmg(t.atk, enemy.def, 3.0);
                enemy.hp = Math.max(0, enemy.hp - ctrDmg);
                const ei = this.enemies.indexOf(enemy);
                this.time.delayedCall(510, () => { this.updateBars(); this.flashEnemy(ei); spellFX(this, 'hero1Special3', [this.enemySprites[ei]]); });
                SoundSystem.play('hero1Special3_hit');
                if (enemy.hp <= 0) { if (ei >= 0 && this.enemySprites[ei]) this.enemySprites[ei].setAlpha(0.9).setTint(0x262626); SoundSystem.play('enemy_defeated'); }
                else SoundSystem.play('hit_physical');
                msgs.push(`${t.name} counters!\n${enemy.name} takes ${ctrDmg} damage!`);
                this.heroStuck[hi] = true; this.heroDefending[hi] = false;
                msgs.push(`${t.name} is stuck this turn!`);
                return; // HP/MP damage dodged, but stuck status applied above
              }
              if (hi >= 0) { this.heroStuck[hi] = true; this.heroDefending[hi] = false; }
              const wasSleepingTrap = t.status === 'sleep';
              if (wasSleepingTrap) t.status = 'normal';
              t.hp = Math.max(0, t.hp - hpDmg);
              t.mp = Math.max(0, t.mp - mpDmg);
              if (hi >= 0) this._heroHitAnim(hi);
              if (wasSleepingTrap && t.hp > 0) msgs.push(`${t.name} woke up!`);
              msgs.push(`${t.name} is stuck! -${hpDmg} HP, -${mpDmg} MP`);
              if (t.hp === 0) {
                t.status = 'dead';
                t.mp = 0;
                if (hi >= 0) this._clearHeroStatus(hi);
                msgs.push(`${t.name} was ${this._koLabel()}!`);
                if (hi >= 0 && this.heroSprites[hi]) {
                  this.heroSprites[hi].setAlpha(0.9).setTint(0x262626);
                }
                if (hi >= 0) { this._stopAuraGlow(hi); this._stopBlissTint(hi); this._hero2Special4Heroes[hi] = false; }
                SoundSystem.play('party_ko');
              }
            });
          } else {
            msgs.push('But it had no effect!');
          }
          this.updateStats();
          this.showMessage(msgs.join('\n'), 900, () => { if (this.checkWin()) return; doNextEnemy(); });
          return;
        }

        let msgs = [actionAnn];
        for (const t of targets) {
          // Counterattack: guaranteed 100% dodge + strike back — checked before random dodge
          const heroIdxCtr = GameState.party.indexOf(t);
          if (heroIdxCtr >= 0 && this._hero1Special3State[heroIdxCtr]) {
            this.animateHero(heroIdxCtr, 'dodge');
            this.time.delayedCall(230, () => this.animateHero(heroIdxCtr, 'attack'));
            const ctrDmg = this.calcPhysicalDmg(t.atk, enemy.def, 3.0);
            enemy.hp = Math.max(0, enemy.hp - ctrDmg);
            const ei = this.enemies.indexOf(enemy);
            // Both HP bar update and flash fire together after dodge (~230ms) + attack lunge+snap (~275ms)
            this.time.delayedCall(510, () => {
              this.updateBars();
              this.flashEnemy(ei);
              spellFX(this, 'hero1Special3', [this.enemySprites[ei]]);
            });
            SoundSystem.play('hero1Special3_hit');
            if (enemy.hp <= 0) {
              if (ei >= 0 && this.enemySprites[ei]) this.enemySprites[ei].setAlpha(0.9).setTint(0x262626);
              SoundSystem.play('enemy_defeated');
            } else {
              SoundSystem.play('hit_physical');
            }
            msgs.push(`${t.name} counters!\n${enemy.name} takes ${ctrDmg} damage!`);
            continue;
          }

          const heroIdx = GameState.party.indexOf(t);
          // Random dodge chance: 5% at level 1, 20% at level 10
          let dodgeChance = Math.min(0.20, 0.05 + ((t.level || 1) - 1) * (0.15 / 9));
          // Tail Strike: dodge reduced by dodge²×1.5 of boss2's dodge%
          if (aKey === 'boss2PhysicalAttack2') { const d = enemy.dodgePct || 0; dodgeChance = Math.max(0, dodgeChance - d * d * dodgeChance * 1.5); }
          // Milk Tea Tsunami: subtract boss3.dodgePct / 10 from hero dodge for this attack
          if (aKey === 'boss3MagicAttack2') dodgeChance = Math.max(0, dodgeChance - (enemy.dodgePct || 0) / 10);
          if (t.status !== 'sleep' && Math.random() < dodgeChance) {
            if (heroIdx >= 0) this.animateHero(heroIdx, 'dodge');
            msgs.push(`${t.name} dodged the attack!`);
            continue;
          }

          if (this._hero1Special4Active?.has(heroIdx)) { msgs.push(`${t.name} is immune!`); continue; }

          let dmg = 0;
          if (actionDef.type === 'physical') {
            dmg = this.calcPhysicalDmg(enemy.atk, t.def, actionDef.power);
          } else {
            dmg = this.calcMagicDmg(enemy.mag || enemy.atk, actionDef.power || 1.5, t.def);
          }
          dmg = Math.floor(dmg * this._effectiveMult());
          if (aKey === 'boss2PhysicalAttack2') {
            const dodge = enemy.dodgePct || 0;
            dmg = Math.floor(dmg * (1 + dodge * dodge));
          }
          if (heroIdx >= 0 && this.heroDefending[heroIdx]) dmg = Math.floor(dmg * 0.5);
          // Wake from sleep when hit
          const wasSleeping = t.status === 'sleep';
          t.hp = Math.max(0, t.hp - dmg);
          SoundSystem.play(enemy.isBoss ? `boss_impact_${enemy.id.replace('boss', '')}` : actionDef.type === 'physical' ? 'hero_hurt' : 'hit_magic');
          msgs.push(`${t.name} takes ${dmg} damage!`);
          if (wasSleeping && dmg > 0) {
            t.status = 'normal';
            if (t.hp > 0) msgs.push(`${t.name} woke up!`);
          }

          if (heroIdx >= 0) this._heroHitAnim(heroIdx);

          if (t.hp === 0) {
            t.status = 'dead';
            t.hp = 0; t.mp = 0;
            const si = GameState.party.indexOf(t);
            if (si >= 0) this._clearHeroStatus(si);
            msgs.push(`${t.name} was ${this._koLabel()}!`);
            if (si >= 0 && this.heroSprites[si]) {
              this.heroSprites[si].setAlpha(0.9).setTint(0x262626);
            }
            if (si >= 0) { this._stopAuraGlow(si); this._stopBlissTint(si); this._hero2Special4Heroes[si] = false; }
            SoundSystem.play('party_ko');
          }
          // Pearl Ray: drain 10% of target's max MP
          if (aKey === 'bigEnemy1Attack2' && t.mp > 0) {
            const mpDrain = Math.max(1, Math.floor(t.maxMp * 0.10));
            t.mp = Math.max(0, t.mp - mpDrain);
            msgs.push(`${t.name} lost ${mpDrain} MP!`);
          }

          // Apply effect (blocked by Rising Sun)
          if (actionDef.effect && Math.random() < 0.3 && t.status !== 'dead' && t.status !== actionDef.effect && !wasSleeping && !this._hero1Special4Active?.has(GameState.party.indexOf(t))) {
            t.status = actionDef.effect;
            const _tIdx = GameState.party.indexOf(t);
            if (_tIdx >= 0) this._restoreTint(_tIdx);
            const effectLabel = actionDef.effect === 'poison' ? 'poisoned' : actionDef.effect;
            msgs.push(`${t.name} is ${effectLabel}!${actionDef.effect === 'sleep' ? '\n(Will wake up when actively hit)' : ''}`);
          }
        }
        this.updateBars();
        this.showMessage(msgs.join('\n'), 900, () => {
          if (this.checkWin()) return;
          if (!GameState.isPartyAlive()) { this.endBattle(false); return; }
          doNextEnemy();
        });
      });
    };
    doNextEnemy();
  }

  afterEnemyTurn() {
    const tickMsgs = [];

    let hadPoison = false;

    // Poison tick — 10% max HP damage, can kill (blocked by Rising Sun)
    GameState.party.forEach((h, i) => {
      if (h.status === 'poison' && !this._hero1Special4Active?.has(i)) {
        hadPoison = true;
        const pdmg = Math.max(1, Math.floor(h.maxHp * 0.10));
        h.hp = Math.max(0, h.hp - pdmg);
        this._heroHitAnim(i);
        tickMsgs.push(`${h.name} takes ${pdmg} poison damage!`);
        if (h.hp === 0) {
          h.status = 'dead';
          h.hp = 0; h.mp = 0;
          this._clearHeroStatus(i);
          tickMsgs.push(`${h.name} was ${this._koLabel()}!`);
          if (this.heroSprites[i]) {
            this.heroSprites[i].setAlpha(0.9).setTint(0x262626);
          }
          this._stopAuraGlow(i); this._stopBlissTint(i); this._hero2Special4Heroes[i] = false;
          SoundSystem.play('party_ko');
        }
      }
    });
    if (hadPoison) SoundSystem.play('poison_tick');

    this.updateBars();
    if (tickMsgs.length > 0) {
      this.showMessage(tickMsgs.join('\n'), 900, () => {
        if (!GameState.isPartyAlive()) { this.endBattle(false); return; }
        this.startTurn();
      });
      return;
    }
    if (!GameState.isPartyAlive()) { this.endBattle(false); return; }
    this.startTurn();
  }

  // ── Win / Lose ────────────────────────────────────────────────────────
  checkWin() {
    if (this.enemies.every(e => e.hp <= 0)) {
      this.endBattle(true);
      return true;
    }
    return false;
  }

  endBattle(won) {
    this.battleState = won ? STATE.WIN : STATE.LOSE;
    this.clearContainers();

    // Record floor cleared on win (non-boss dungeon floors only)
    if (won && !this.isBoss && this.dungeonFloor >= 0) {
      const fc = GameState.progress.floorsCleared || {};
      fc[this.dungeonFloor] = (fc[this.dungeonFloor] || 0) + 1;
      GameState.progress.floorsCleared = fc;
    }

    if (won) {
      const totalExp  = this.enemies.reduce((s, e) => s + e.exp,  0);
      const totalGold = this.enemies.reduce((s, e) => s + e.gold, 0);
      const lvlResults = GameState.awardExp(totalExp, totalGold);

      // Stop battle music and play victory jingle
      MusicSystem.stop();
      this.time.delayedCall(120, () => SoundSystem.play('battle_win'));

      let msg = `Victory!\n+${totalExp} EXP  +${totalGold} Gold`;
      if (lvlResults.length > 0) {
        msg += '\n' + lvlResults.map(r => `${r.hero.name} reached Lv.${r.hero.level}!`).join('\n');
        this.time.delayedCall(900, () => SoundSystem.play('level_up'));
        const unlockMsgs = [];
        for (const r of lvlResults) {
          const hero = r.hero;
          const allIds = [...(hero.spells || []), ...(HERO_SPECIALS[hero.id] || [])];
          for (const sid of allIds) {
            const sp = SPELL_DEFS[sid];
            if (sp?.levelReq && sp.levelReq === hero.level) {
              unlockMsgs.push(`${hero.name} unlocked ${sp.name}!`);
            }
          }
        }
        if (unlockMsgs.length > 0) msg += '\n' + unlockMsgs.join('\n') + `\n(Learn more in ${GT.placeBootcamp})`;
      }
      if (GameState.party.some(h => h.status === 'dead')) msg += '\n(KO\'d allies earn no EXP)';
      this.showMessage(msg, 2200, () => this.returnToCaller(true));
    } else {
      this.showMessage('The party has been defeated...', 2000, () => this.showGameOver());
    }
  }

  showGameOver() {
    const { W, H } = this;
    MusicSystem.stop();
    MusicSystem.play('gameover');

    // Dark overlay
    const overlay = this.add.graphics().setDepth(40);
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, W, H);

    this.add.text(W / 2, H * 0.35, 'GAME OVER', {
      fontSize: '64px', color: '#cc2222', fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(41);

    this.add.text(W / 2, H * 0.54,
      resolveStory(GT.gameOverHint, GameState.party),
      {
        fontSize: '20px', color: '#ddcc88', fontFamily: 'serif',
        align: 'center', wordWrap: { width: W * 0.78 }
      }
    ).setOrigin(0.5).setDepth(41);

    const sub = this.add.text(W / 2, H * 0.76, 'Tap to return to Title Screen', {
      fontSize: '28px', color: '#aaaaaa', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(41);

    // Pulse the prompt
    this.tweens.add({
      targets: sub, alpha: { from: 1, to: 0.3 },
      duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    this.input.once('pointerdown', () => {
      GameState.reviveParty();
      GameState.party.forEach(h => { h.hp = Math.floor(h.maxHp * 0.25); h.mp = Math.floor(h.maxMp * 0.25); });
      this.cameras.main.fade(400, 0, 0, 0, false, (cam, progress) => {
        if (progress === 1) this.scene.start('TitleScene', {});
      });
    });
  }

  tryRun() {
    if (this._runDisabled) return;
    if (this._runAttempted[this.activeHeroIdx]) {
      this.showMessage('Already attempted to run this turn!', 700, () => this.showHeroCommand(GameState.party[this.activeHeroIdx]));
      return;
    }
    if (this.zone === 'boss3') {
      this.showMessage(`You cannot run from ${this.enemies[0].name}!`, 1000, () => this.showHeroCommand(GameState.party[this.activeHeroIdx]));
      return;
    }
    this._runAttempted[this.activeHeroIdx] = true;
    this.battleState = STATE.ANIM;
    this.clearContainers();
    this.heroSprites.forEach((s, i) => s.setAlpha(GameState.party[i]?.status === 'dead' ? 0.9 : 1));

    const hero = GameState.party[this.activeHeroIdx];
    const chance = 0.35 + ((hero.level || 1) - 1) * (0.15 / 9);
    if (Math.random() < chance) {
      this._runDisabled = true;
      SoundSystem.play('run_success');
      this.showMessage('Escaped successfully!', 1000, () => this.returnToCaller(false));
      // All hero sprites flee toward the bottom-left
      GameState.party.forEach((_, i) => {
        const s = this.heroSprites[i];
        if (!s) return;
        this.tweens.add({
          targets: s,
          x: s.x - 140,
          y: s.y + 180,
          alpha: 0,
          duration: 600,
          ease: 'Cubic.In',
          delay: i * 60
        });
      });
    } else {
      SoundSystem.play('run_fail');
      this.showMessage('Couldn\'t escape!', 700, () => this.afterHeroAction());
      const s = this.heroSprites[this.activeHeroIdx];
      if (s) {
        const ox = s.x, oy = s.y;
        this.tweens.add({
          targets: s, x: ox - 40, y: oy + 50, duration: 200, ease: 'Cubic.Out',
          onComplete: () => this.tweens.add({
            targets: s, x: ox, y: oy, duration: 250, ease: 'Cubic.In'
          })
        });
      }
    }
  }

  returnToCaller(won) {
    if (this._hero2Special4Timers) this._hero2Special4Timers.forEach((_, i) => this._stopBlissTint(i));

    const returnData  = { ...this.returnData };
    const returnScene = this.returnScene;
    const prevTrack   = this.prevTrackId;
    if (won && this.isBoss) returnData.bossDefeated = true;

    this.cameras.main.fade(400, 0, 0, 0, false, (cam, p) => {
      if (p === 1) {
        if (prevTrack) MusicSystem.play(prevTrack);
        // Hide this scene immediately so its black camera doesn't overlay the
        // returning scene during the one-frame window before stop() takes effect.
        this.scene.setVisible(false);
        const mgr    = this.scene;
        const caller = mgr.get(returnScene);
        if (caller && mgr.isSleeping(returnScene)) {
          mgr.wake(returnScene, returnData);
          mgr.stop('BattleScene');
        } else {
          mgr.start(returnScene, returnData);
        }
      }
    });
  }

  // ── Calculations ──────────────────────────────────────────────────────
  _hpColor(hp, maxHp) {
    const pct = hp / maxHp;
    return pct <= 0.3 ? '#ff6666' : pct <= 0.7 ? '#ffee44' : '#88dd88';
  }

  // Scales a base % cost down by `reduction` per level above 10, capped at `floor`
  _scaledCostPct(basePct, hero, reduction, floor) {
    if (hero.level <= 10) return basePct;
    return Math.max(floor, basePct - (hero.level - 10) * reduction);
  }

  // Returns the actual MP cost of a spell for a given hero (supports percent-based costs)
  getSpellCost(spell, hero) {
    if (spell.mpCostPercent) {
      let pct = spell.mpCostPercent;
      if (['hero2Special3', 'hero3Special3'].includes(spell.id))
        pct = this._scaledCostPct(pct, hero, 0.025, 0.20);
      else if (spell.id === 'hero3Special2')
        pct = this._scaledCostPct(pct, hero, 0.005, 0.10);
      return Math.floor(hero.maxMp * pct);
    }
    return spell.mpCost ?? 0;
  }

  _clearHeroStatus(idx) {
    this.heroStuck[idx] = false;
    this.heroDefending[idx] = false;
    this._hero1Special1State[idx] = false;
    this._hero1Special3State[idx] = false;
  }

  _heroActiveTint(heroIdx) {
    if (GameState.party[heroIdx]?.status === 'dead') return 0x262626;
    if (this._hero1Special3State?.[heroIdx]) return 0xffaa22;
    if (this._hero1Special1State?.[heroIdx])       return 0xaa44ff;
    if (this.heroDefending?.[heroIdx])     return 0x4488ff;
    if (this._hero1Special4Active?.has(heroIdx) && GameState.party[heroIdx]?.status !== 'dead') return 0xff3300;
    const status = GameState.party[heroIdx]?.status;
    if (status === 'poison') return 0x448844;
    if (status === 'sleep')  return 0x888800;
    return null;
  }

  _reviveTintFlash(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp?.setTintFill) return;
    sp.setTintFill(0xffffff);
    this.time.delayedCall(700, () => { try { this._restoreTint(heroIdx); } catch(e){} });
  }

  _restoreTint(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp) return;
    const t = this._heroActiveTint(heroIdx);
    try { if (t !== null) sp.setTint(t); else sp.clearTint(); } catch(e){}
  }

  _heroHitAnim(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp?.setTint) return;
    const homeX = this._heroHomeX?.[heroIdx] ?? sp.x;
    sp.x = homeX; // snap to true home before shaking — corrects any mid-animation drift
    sp.setTint(0xff0000);
    this.tweens.add({
      targets: sp, x: homeX + 8, duration: 55, ease: 'Sine.easeInOut',
      yoyo: true, repeat: 2,
      onComplete: () => { sp.x = homeX; this._restoreTint(heroIdx); }
    });
  }

  _heroHealTint(heroIdx, healedHp, healedMp) {
    if (healedHp > 0) {
      this._heroHealSetTint(heroIdx, 0x44ff44, 600);
      if (healedMp > 0) this.time.delayedCall(650, () => this._heroHealSetTint(heroIdx, 0x88bbff, 500));
    } else if (healedMp > 0) {
      this._heroHealSetTint(heroIdx, 0x88bbff, 600);
    }
  }

  // Purple spark burst underneath a hero sprite (boss aura tick visual)
  _colorAuraSparks(heroIdx) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp) return;
    const cx = sp.x;
    const baseY = sp.y + (sp.displayHeight ?? 44) * 0.5 + 4;
    for (let i = 0; i < 10; i++) {
      const g = this.add.graphics().setDepth(sp.depth + 2);
      const color = Math.random() < 0.6 ? 0xaa44ff : 0xdd88ff;
      const sz = 2 + Math.random() * 3;
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, sz);
      g.x = cx + (Math.random() - 0.5) * 36;
      g.y = baseY + Math.random() * 8;
      this.tweens.add({
        targets: g,
        x: g.x + (Math.random() - 0.5) * 24,
        y: g.y + 18 + Math.random() * 18,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 380 + Math.random() * 200,
        delay: Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => { try { g.destroy(); } catch(e){} }
      });
    }
  }

  // Dramatic shake of the boss sprite when it activates its aura — 4-direction rumble
  _applyAuraDrain(onDone) {
    if (!this._bossAura) { onDone(); return; }
    GameState.party.forEach((h, hi) => { if (h.status === 'dead') this._auraDeathSet.add(hi); });
    if (this._auraDeathSet.size >= GameState.party.length) { onDone(); return; }
    const auraLines = [this._bossAura.name + ':'];
    let anyDrained = false;
    GameState.party.forEach((h, hi) => {
      if (h.status === 'dead' || this._auraDeathSet.has(hi)) return;
      if (this._hero1Special4Active?.has(hi)) { auraLines.push(`${h.name} is immune!`); return; }
      anyDrained = true;
      const hpDrain = Math.max(1, Math.floor(h.maxHp * this._bossAura.pct));
      const mpDrain = Math.max(1, Math.floor(h.maxMp * this._bossAura.pct));
      h.hp = Math.max(0, h.hp - hpDrain);
      h.mp = Math.max(0, h.mp - mpDrain);
      this._heroHitAnim(hi);
      auraLines.push(`${h.name} -${hpDrain}HP -${mpDrain}MP`);
      if (h.hp === 0) {
        h.status = 'dead';
        h.mp = 0;
        this._auraDeathSet.add(hi);
        this._clearHeroStatus(hi);
        auraLines.push(`${h.name} was ${this._koLabel()}!`);
        if (this.heroSprites[hi]) {
          this.heroSprites[hi].setAlpha(0.9).setTint(0x262626);
        }
        this._stopAuraGlow(hi); this._stopBlissTint(hi); this._hero2Special4Heroes[hi] = false;
        SoundSystem.play('party_ko');
      }
    });
    if (!anyDrained) { onDone(); return; }
    this.updateBars();
    this.showMessage(auraLines.join('\n'), 900, () => {
      if (!GameState.isPartyAlive()) { this.endBattle(false); return; }
      onDone();
    });
  }

  _triggerBossAura(onDone, revivedHeroIndices = []) {
    const AURA_MAX  = { boss1: 4, boss2: 5, boss3: 7 };
    const AURA_DATA = {
      boss1: { pct: 0.30, name: GT.actionBoss1Drain, sound: 'boss_roar_1' },
      boss2: { pct: 0.31, name: GT.actionBoss2Drain,     sound: 'boss_roar_2' },
      boss3: { pct: 0.32, name: GT.actionBoss3Drain,          sound: 'boss_roar_3' }
    };
    const boss = this.enemies.find(e => e.isBoss && e.hp > 0);
    if (!boss || !AURA_MAX[boss.id]) { onDone(); return; }
    const maxUses = AURA_MAX[boss.id];
    if ((boss._auraUseCount || 0) >= maxUses) { onDone(); return; } // max uses reached — keep exemptions
    boss._auraUseCount = (boss._auraUseCount || 0) + 1;
    // Aura is confirmed to fire — safe to un-exempt revived heroes now
    revivedHeroIndices.forEach(i => this._auraDeathSet.delete(i));
    const data = AURA_DATA[boss.id];
    if (!this._bossAura) this._bossAura = { pct: data.pct, name: data.name, sound: data.sound };
    if (boss._auraUseCount === 1) {
      // First use: fire immediately at battle start, then heroes go
      const pctDisplay = Math.round(data.pct * 100);
      SoundSystem.play(data.sound);
      this._bossIntroShake(boss.id);
      const msg = `${boss.name} uses ${data.name}!\nAll heroes lose ${pctDisplay}% max HP & MP each turn!`;
      this.showMessage(msg, 1400, () => { this._startAuraGlows(); onDone(); });
    } else {
      // 2nd+ use: queue to fire at the start of boss's next turn
      boss._pendingAura = true;
      onDone();
    }
  }

  _bossIntroShake(bossId) {
    const sp = this.enemySprites?.[0];
    if (!sp) return;
    const ox = sp.x, oy = sp.y;
    const cfg = {
      boss1: { hx: 30, hd: 55, hr: 7,  vy: 22, vd: 50, vr: 5  },
      boss2: { hx: 44, hd: 46, hr: 10, vy: 32, vd: 42, vr: 8  },
      boss3: { hx: 58, hd: 38, hr: 14, vy: 44, vd: 34, vr: 11 },
    }[bossId] ?? { hx: 30, hd: 55, hr: 7, vy: 22, vd: 50, vr: 5 };
    this.tweens.add({
      targets: sp, x: ox + cfg.hx, duration: cfg.hd, ease: 'Sine.easeInOut',
      yoyo: true, repeat: cfg.hr,
      onComplete: () => {
        sp.x = ox;
        this.tweens.add({
          targets: sp, y: oy - cfg.vy, duration: cfg.vd, ease: 'Sine.easeInOut',
          yoyo: true, repeat: cfg.vr,
          onComplete: () => { sp.x = ox; sp.y = oy; }
        });
      }
    });
  }

  // Start persistent blinking aura glow on all living heroes, color keyed to current boss
  _startAuraGlows() {
    const boss = this.enemies.find(e => e.isBoss && e.hp > 0);
    const PALETTES = {
      boss1: [0xffffff, 0xbbbbbb, 0x777777],   // white / gray / dark gray
      boss2: [0xff6600, 0xffaa00, 0xff3300],    // fiery orange / amber / deep orange
      boss3: [0xaa44ff, 0xdd88ff]               // purple (original)
    };
    const palette = (boss && PALETTES[boss.id]) ? PALETTES[boss.id] : PALETTES.boss3;
    GameState.party.forEach((h, hi) => {
      if (h.status !== 'dead') this._startHeroAuraGlow(hi, palette);
    });
  }

  // Create a looping glow under one hero sprite that persists until stopped
  _startHeroAuraGlow(heroIdx, palette = [0xaa44ff, 0xdd88ff]) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp) return;
    this._stopAuraGlow(heroIdx);
    const cx = sp.x;
    const baseY = sp.y + (sp.displayHeight ?? 44) * 0.5 + 6;
    const dots = [];
    for (let i = 0; i < 7; i++) {
      const g = this.add.graphics().setDepth(sp.depth + 2);
      const color = palette[i % palette.length];
      const sz = 2.5 + Math.random() * 2.5;
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, sz);
      g.x = cx + (i - 3) * 9 + (Math.random() - 0.5) * 5;
      g.y = baseY + (Math.random() - 0.5) * 8;
      g.setAlpha(0.1);
      this.tweens.add({
        targets: g,
        alpha: { from: 0.1, to: 0.85 },
        y: g.y - 5 - Math.random() * 5,
        duration: 350 + i * 55 + Math.random() * 180,
        delay: i * 70,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      dots.push(g);
    }
    this._auraGlows[heroIdx] = dots;
  }

  // Kill and remove the persistent aura glow for one hero
  _stopAuraGlow(heroIdx) {
    const dots = this._auraGlows?.[heroIdx];
    if (!dots) return;
    dots.forEach(g => { try { this.tweens.killTweensOf(g); g.destroy(); } catch(e) {} });
    this._auraGlows[heroIdx] = null;
  }

  // Smooth green tint pulse on a hero while Recuperative Bliss is active
  _startBlissTint(heroIdx) {
    this._stopBlissTint(heroIdx);
    const hero = GameState.party[heroIdx];
    const sp = this.heroSprites?.[heroIdx];
    if (!sp || !this._hero2Special4Active || !this._hero2Special4Heroes?.[heroIdx] || hero?.status === 'dead') return;
    const obj = { t: 0 };
    const tween = this.tweens.add({
      targets: obj, t: 1,
      duration: 900, yoyo: true, hold: 150, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const h = GameState.party[heroIdx];
        const s = this.heroSprites?.[heroIdx];
        if (!s || !this._hero2Special4Active || !this._hero2Special4Heroes?.[heroIdx] || h?.status === 'dead') {
          this._stopBlissTint(heroIdx); return;
        }
        try {
          const r = Math.round(0xff - obj.t * 0x77);
          s.setTint((r << 16) | (0xff << 8) | 0xff);
        } catch(e) {}
      }
    });
    this._hero2Special4Timers[heroIdx] = { _obj: obj, _tween: tween };
  }

  _stopBlissTint(heroIdx) {
    const entry = this._hero2Special4Timers?.[heroIdx];
    if (!entry) return;
    this._hero2Special4Timers[heroIdx] = null;
    try {
      if (entry._tween) this.tweens.killTweensOf(entry._obj);
    } catch(e) {}
    try { this._restoreTint(heroIdx); } catch(e) {}
  }

  // Apply a tint color then restore the hero's priority tint after `duration` ms.
  // Pauses Recuperative Bliss tween so the temp color is visible, then resumes it.
  _heroHealSetTint(heroIdx, color, duration) {
    const sp = this.heroSprites?.[heroIdx];
    if (!sp?.setTint) return;
    const hadBliss = !!this._hero2Special4Timers?.[heroIdx];
    if (hadBliss) this._stopBlissTint(heroIdx);
    sp.setTint(color);
    this.time.delayedCall(duration, () => {
      try {
        if (hadBliss && this._hero2Special4Active && this._hero2Special4Heroes?.[heroIdx] && GameState.party[heroIdx]?.status !== 'dead') {
          this._startBlissTint(heroIdx);
        } else {
          this._restoreTint(heroIdx);
        }
      } catch(e) {}
    });
  }

  // Resolves dynamic placeholders in spell descriptions
  _spellDesc(spell, hero) {
    let desc = spell.description || '';
    if (desc.includes('{mpGive}')) {
      desc = desc.replace('{mpGive}', Math.floor((hero?.maxMp || 0) * 0.10));
    }
    return desc;
  }

  calcPhysicalDmg(atk, def, power = 1.0) {
    const base = Math.max(1, atk * power - def * 0.5);
    return Math.max(1, Math.floor(base * (0.85 + Math.random() * 0.3)));
  }

  _effectiveMult() {
    if (this.zone === 'boss1' || this.zone === 'boss2' || this.zone === 'boss3') {
      const m = GameState.enemyMult;
      if (m >= 2.0) return 1.5;
      if (m >= 1.5) return 1.2;
      return m;   // Easy: 0.85 (reduced boss damage)
    }
    return GameState.enemyMult;   // regular enemies scale with difficulty
  }

  calcMagicDmg(mag, power, def) {
    const base = Math.max(1, mag * power - def * 0.5);
    return Math.max(1, Math.floor(base * (0.85 + Math.random() * 0.3)));
  }

  _koLabel() { return 'Knocked Out (KO\'d)'; }

  // Returns 0 instead of NaN/null/undefined for safe display
  _safe(v) { return (Number.isFinite(v) ? v : 0); }

  // ── UI helpers ────────────────────────────────────────────────────────
  showMessage(msg, duration, onDone) {
    // Cancel any previous pending message
    if (this._msgEvent) { this._msgEvent.remove(false); this._msgEvent = null; }
    this._msgOnDone       = null;
    this._msgDismissReady = false;
    this.time.delayedCall(200, () => { this._msgDismissReady = true; });

    this.msgText.setText(msg);
    const tw = this.msgText.width;
    const th = this.msgText.height;
    duration = Math.max(duration, 900 + Math.floor(msg.length / 10) * 700);
    const padX = 20, padY = 10, r = 10;
    const pw = tw + padX * 2;
    const ph = th + padY * 2;
    const px = this.msgText.x - pw / 2;
    const py = this.msgText.y - ph / 2;
    this.msgPill.clear();
    this.msgPill.fillStyle(0x000022, 0.9);
    this.msgPill.fillRoundedRect(px, py, pw, ph, r);
    this.msgPill.lineStyle(1, 0x334466, 1);
    this.msgPill.strokeRoundedRect(px, py, pw, ph, r);
    this.msgPill.setVisible(true);
    this.msgText.setVisible(true);
    if (onDone) {
      this._msgOnDone = onDone;
      this._msgEvent  = this.time.delayedCall(duration, () => {
        this._msgEvent  = null;
        this._msgOnDone = null;
        this.msgPill.setVisible(false);
        this.msgText.setVisible(false);
        onDone();
      });
    }
  }

  // ── Visual FX ────────────────────────────────────────────────────────
  _heroGlowFlash(heroIdx, color, duration) {
    const sprite = this.heroSprites?.[heroIdx];
    if (!sprite) return;
    const g = this.add.graphics().setDepth(sprite.depth + 1);
    g.fillStyle(color, 0.5);
    g.fillEllipse(0, 0, 68, 78);
    g.lineStyle(2, color, 0.9);
    g.strokeEllipse(0, 0, 68, 78);
    g.x = sprite.x; g.y = sprite.y;
    this.tweens.add({
      targets: g, alpha: 0,
      duration, ease: 'Quad.easeOut',
      onComplete: () => { try { g.destroy(); } catch(e) {} }
    });
  }

  _enemyDodgeAnim(enemyIdx) {
    const sp = this.enemySprites?.[enemyIdx];
    if (!sp) return;
    const ox = sp.x, oy = sp.y;

    // Ghost afterimage: fading copy at current position
    const ghost = this.add.graphics().setDepth(sp.depth - 1);
    const hw = (sp.displayWidth ?? 48) / 2, hh = (sp.displayHeight ?? 56) / 2;
    ghost.fillStyle(0xffffff, 0.55);
    ghost.fillRect(ox - hw, oy - hh, hw * 2, hh * 2);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 280, onComplete: () => ghost.destroy() });

    // White flash
    try { sp.setTint(0xffffff); } catch(e) {}
    this.time.delayedCall(90, () => { try { sp.clearTint(); } catch(e) {} });

    // Phase 1: dash far right + x-squish
    this.tweens.add({
      targets: sp, x: ox + 120, scaleX: 0.55, duration: 75, ease: 'Cubic.Out',
      onComplete: () => {
        // Phase 2: snap past origin (overshoot left)
        this.tweens.add({
          targets: sp, x: ox - 25, scaleX: 1.2, duration: 110, ease: 'Cubic.In',
          onComplete: () => {
            // Phase 3: bounce settle back to origin
            this.tweens.add({
              targets: sp, x: ox, scaleX: 1.0, y: oy - 10, duration: 80, ease: 'Cubic.Out',
              onComplete: () => {
                this.tweens.add({ targets: sp, y: oy, duration: 60, ease: 'Bounce.Out' });
              }
            });
          }
        });
      }
    });
  }

  flashEnemy(idx, tint = true) {
    const s = this.enemySprites[idx];
    if (!s) return;
    if (tint && s.setTint) s.setTint(0xff0000);
    this.tweens.add({
      targets: s, x: s.x + 6, duration: 60, yoyo: true, repeat: 3,
      onComplete: () => {
        if (!tint || !s.clearTint) return;
        if ((this.enemies[idx]?.hp ?? 1) <= 0) { s.setAlpha(0.9); s.setTint(0x262626); }
        else s.clearTint();
      }
    });
  }

  flashAll(indices) {
    indices.forEach(i => {
      if (this.enemies[i]?.hp > 0) this.flashEnemy(i);
    });
  }

  updateBars() {
    this.enemyHpBars.forEach(({ barFill, barW, hpText, mpText, nameText, enemy }) => {
      const hp = this._safe(enemy.hp);
      const maxHp = this._safe(enemy.maxHp) || 1;
      const pct = Math.max(0, hp / maxHp);
      barFill.setSize(barW * pct, 8);
      const isDead = hp <= 0;
      barFill.setFillStyle(isDead ? 0x444444 : 0xff0000);
      if (nameText) nameText.setColor(isDead ? '#555555' : '#ffcccc');
      if (hpText) { hpText.setText(`HP ${hp}/${maxHp}`); hpText.setColor(isDead ? '#555555' : '#ffaaaa'); }
      if (mpText) { mpText.setText(`MP ${this._safe(enemy.mp)}/${this._safe(enemy.maxMp || enemy.mp)}`); mpText.setColor(isDead ? '#555555' : '#88aaff'); }
    });
    this.updateStats();
  }

  updateStats() {
    GameState.party.forEach((hero, i) => {
      const t = this.heroStatTexts[i];
      if (!t) return;
      const hp = this._safe(hero.hp);
      const maxHp = this._safe(hero.maxHp);
      const mp = this._safe(hero.mp);
      const maxMp = this._safe(hero.maxMp);
      const isDead = hero.status === 'dead';
      const dim = '#555555';
      t.name.setColor(isDead ? dim : '#ffffff');
      t.hp.setText(`HP ${hp}/${maxHp}`);
      t.hp.setColor(isDead ? dim : this._hpColor(hp, maxHp));
      t.mp.setText(`MP ${mp}/${maxMp}`);
      t.mp.setColor(isDead ? dim : '#88bbff');
      const statuses = [];
      if (hero.status === 'dead') {
        statuses.push({ text: '[KO]',     color: '#ff6666' });
      } else {
        if (this.heroStuck[i])            statuses.push({ text: '[STK]', color: '#888888' });
        if (this.heroDefending[i])        statuses.push({ text: '[DEF]', color: '#4488ff' });
        if (this._hero1Special1State[i])          statuses.push({ text: '[CHG]', color: '#aa44ff' });
        if (this._hero1Special3State[i])    statuses.push({ text: '[CTR]', color: '#ffaa22' });
        if (this._hero1Special4Active?.has(i)) statuses.push({ text: '[IMM]', color: '#ff3300' });
        if (hero.status === 'poison')     statuses.push({ text: '[PSN]', color: '#448844' });
        if (hero.status === 'sleep')      statuses.push({ text: '[SLP]', color: '#ffff44' });
      }
      let xCursor = t.baseX;
      t.sta.forEach((s, idx) => {
        if (statuses[idx]) {
          s.setPosition(xCursor, t.staY);
          s.setText(statuses[idx].text);
          s.setColor(statuses[idx].color);
          xCursor += s.width + 6;
        } else {
          s.setText('');
        }
      });

      const shouldBlink = this._hero2Special4Active && hero.status !== 'dead' && this._hero2Special4Heroes?.[i];
      if (shouldBlink && !this._hero2Special4Timers?.[i]) this._startBlissTint(i);
      else if (!shouldBlink && this._hero2Special4Timers?.[i]) this._stopBlissTint(i);
    });
  }

  clearContainers() {
    this.cmdContainer.removeAll(true);
    this.clearSub();
    if (this._uiZones) { this._uiZones.forEach(z => { try { z.destroy(); } catch(e) {} }); this._uiZones = []; }
  }

  clearSub() {
    this.subContainer.removeAll(true);
    this.targetContainer.removeAll(true);
  }

  // Adds a scene-level hit zone at (cmdContainer.x + lx, cmdContainer.y + ly) sized (w×h).
  // Tracked in _uiZones; destroyed on clearContainers().
  _makeUIZone(lx, ly, w, h) {
    const zone = this.add.zone(
      this.cmdContainer.x + lx,
      this.cmdContainer.y + ly,
      w, h
    ).setOrigin(0, 0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
      .setDepth(200);
    this._uiZones = this._uiZones || [];
    this._uiZones.push(zone);
    return zone;
  }
}
