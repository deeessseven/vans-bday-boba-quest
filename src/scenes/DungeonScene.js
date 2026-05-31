import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { getRandomEncounter } from '../data/enemies.js';
import { ITEM_DEFS } from '../data/items.js';
import { SoundSystem } from '../audio/SoundSystem.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { levelUp } from '../data/characters.js';
import { GT, resolveStory } from '../data/GameText.js';

function getFloors() {
  return [
    { id: 1, name: GT.floorB1Name, zone: 'dungeon1', bgKey: 'bg_dungeon1', color: 0x221133,
      desc: resolveStory(GT.descFloor1) },
    { id: 2, name: GT.floorB2Name, zone: 'dungeon2', bgKey: 'bg_dungeon2', color: 0x110022,
      desc: resolveStory(GT.descFloor2) },
    { id: 3, name: GT.floorB3Name, zone: 'dungeon3', bgKey: 'bg_dungeon3', color: 0x110000,
      desc: resolveStory(GT.descFloor3) },
    { id: 4, name: GT.floorB4Name, zone: 'boss1', exploreZone: 'dungeon4', bgKey: 'bg_dungeon4', color: 0x110000, isBossFloor: true,
      desc: resolveStory(GT.descFloor4) },
    { id: 5, name: GT.floorB5Name, zone: 'boss2', exploreZone: 'dungeon5', bgKey: 'bg_dungeon5', color: 0x110000, isBossFloor: true,
      desc: resolveStory(GT.descFloor5) },
    { id: 6, name: GT.floorB6Name, zone: 'boss3', bgKey: 'bg_dungeon6', color: 0x110000, isBossFloor: true,
      desc: resolveStory(GT.descFloor6) }
  ];
}

const ENCOUNTER_CHANCE = 0.30; // per room

export class DungeonScene extends Phaser.Scene {
  constructor() { super('DungeonScene'); }

  create() {
    this.FLOORS = getFloors();
    this.floor = GameState._dungeonReturnFloor !== undefined ? GameState._dungeonReturnFloor : 0;
    GameState._dungeonReturnFloor = undefined;
    this.isBattling = false;
    this.buildFloor();

    // When BattleScene resumes this sleeping scene, update the floor and
    // always rebuild so the UI is fresh and isBattling is reset.
    this.events.off('wake');
    this.events.on('wake', (_sys, data) => {
      if (data && data.bossDefeated) {
        if (data.floor === 3) {
          GameState.progress.boss1Defeated = true;
          this.floor = 4;
          this.buildFloor();
        } else if (data.floor === 4) {
          GameState.progress.boss2Defeated = true;
          this.floor = 5;
          this.buildFloor();
        } else if (data.floor === 5) {
          GameState.progress.boss3Defeated = true;
          this.scene.start('EndingScene');
        }
        return;
      }
      if (data && data.floor !== undefined) this.floor = data.floor;
      this.buildFloor();
    });
  }

  buildFloor(skipTutorials = false) {
    this.isBattling = false;   // reset after every battle / floor change
    this._secretCooldown = false; // reset so play-again doesn't leave it stuck
    MusicSystem.play('dungeon');
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const floorDef = this.FLOORS[this.floor] || this.FLOORS[2];
    // Background — use custom image if uploaded, otherwise procedural dungeon room
    if (BackgroundStore.hasCustom(floorDef.bgKey)) {
      this.add.image(width / 2, height / 2, floorDef.bgKey).setDisplaySize(width, height);
    } else {
      const g = this.add.graphics();
      g.fillStyle(floorDef.color);
      g.fillRect(0, 0, width, height);
      this.drawDungeonRoom(g, width, height, floorDef.color);
    }

    // Header
    const header = this.add.graphics();
    header.fillStyle(0x000000, 0.85);
    header.fillRect(0, 0, width, 48);
    header.lineStyle(1, 0x443355, 1);
    header.lineBetween(0, 48, width, 48);

    const floorTitle = this.add.text(width / 2 - 30, 24, floorDef.name, {
      fontSize: '36px', color: '#cc88ff', fontFamily: 'serif'
    }).setOrigin(0.5);
    { let fs = 36; while ((width / 2 - 30) + floorTitle.width / 2 > width - 114 && fs > 16) { fs--; floorTitle.setFontSize(fs); } }

    // Floor description with dark background pill
    const descText = this.add.text(width / 2, 68, floorDef.desc, {
      fontSize: '20px', color: '#ccaaff', fontFamily: 'serif', fontStyle: 'italic',
      align: 'center', wordWrap: { width: width - 40 }
    }).setOrigin(0.5, 0).setDepth(2);
    const descBg = this.add.graphics().setDepth(1);
    descBg.fillStyle(0x000000, 0.65);
    descBg.fillRoundedRect(width * 0.04, 62, width * 0.92, descText.height + 12, 5);

    // Mini-map dots — placed below description text
    const mmY = Math.max(116, 68 + descText.height + 14);
    this.drawMiniMap(width, mmY);

    // Save button — shown on all dungeon floors
    this._saveBtnCenter = { x: 10 + 110, y: mmY + 34 };
    {
      const bx = 10, by = mmY, bw = 220, bh = 68;
      const btn = this.add.graphics().setDepth(3);
      const draw = (hover) => {
        btn.clear();
        btn.fillStyle(hover ? 0x2a1a3a : 0x1a0a2a, 0.92);
        btn.fillRoundedRect(bx, by, bw, bh, 7);
        btn.lineStyle(1.5, hover ? 0x9966cc : 0x553377, 1);
        btn.strokeRoundedRect(bx, by, bw, bh, 7);
      };
      draw(false);
      const cx = bx + bw / 2;
      this.add.text(cx, by + 18, 'Save Game', {
        fontSize: '28px', color: '#cc88ff', fontFamily: 'serif'
      }).setOrigin(0.5).setDepth(4);
      this.add.text(cx, by + 48, 'Save your progress', {
        fontSize: '18px', color: '#775588', fontFamily: 'serif'
      }).setOrigin(0.5).setDepth(4);
      btn.setInteractive(
        new Phaser.Geom.Rectangle(bx, by, bw, bh),
        Phaser.Geom.Rectangle.Contains
      );
      btn.on('pointerover', () => draw(true));
      btn.on('pointerout',  () => draw(false));
      btn.on('pointerdown', () => {
        GameState._currentScene = 'DungeonScene';
        GameState._currentFloor = this.floor;
        GameState._dungeonReturnFloor = this.floor;
        this.scene.start('SaveLoadScene', { mode: 'save', returnScene: 'DungeonScene' });
      });
    }

    // Encounter area label (only for regular floors)
    this.encLabel = this.add.text(width / 2, height * 0.38, '', {
      fontSize: '26px', color: '#cc88ff', fontFamily: 'serif', fontStyle: 'italic',
      align: 'center', wordWrap: { width: width - 48 }
    }).setOrigin(0.5).setDepth(10);

    // Party status bar + gold (always shown)
    this.drawPartyBar(width, height);
    this.add.text(10, height - 3, `💰 ${GameState.gold} Gold`, {
      fontSize: '22px', color: '#ffdd88', fontFamily: 'monospace'
    }).setOrigin(0, 1);

    // Left secret zone — advance floor or skip to boss fight (double-tap/click)
    let _secretLastTap = 0;
    const secret = this.add.zone(0, height / 2, 27, 27).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    secret.on('pointerdown', () => {
      if (this.isBattling || this._secretCooldown) return;
      const now = Date.now();
      if (now - _secretLastTap > 400) { _secretLastTap = now; return; }
      _secretLastTap = 0;
      this._secretCooldown = true;
      this.time.delayedCall(1000, () => { this._secretCooldown = false; });
      if (this.floor === this.FLOORS.length - 1) {
        SoundSystem.play('secret_passage');
        this.encLabel.setText('🔍 Secret Passage Found!\nEscape complete!');
        this.time.delayedCall(900, () => { this.scene.start('EndingScene'); });
      } else if (this.floor < this.FLOORS.length - 1) {
        SoundSystem.play('secret_passage');
        this.encLabel.setText('🔍 Secret Passage Found!\nProceeding further!');
        this.time.delayedCall(900, () => { if (this.floor < this.FLOORS.length - 1) { this.floor++; this.buildFloor(true); } });
      }
    });

    // Right-edge cheat zone: triple-tap = +1 level & +500 gold
    this._addCheatZone(width, height);

    // Menu button (top right)
    const menuBtn = this.add.text(width - 12, 24, '≡ MENU', {
      fontSize: '28px', color: '#88aacc', fontFamily: 'serif'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    menuBtn.on('pointerdown', () => this.scene.launch('MenuScene', { returnScene: 'DungeonScene' }));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#88aacc'));

    this.buildNavButtons(width, height, floorDef);

    const btnCy = height * 0.56;
    // Save-button hints fire on first visit regardless of how the floor was entered
    if (this.floor === 3 && !GameState.progress.l4TutorialSeen) {
      GameState.progress.l4TutorialSeen = true;
      const sc = this._saveBtnCenter;
      if (!skipTutorials) {
        this._showFingerHint(sc.x, sc.y, 1, () => {
          this._showFingerHint(width / 2, btnCy, 1);       // Go Further button
        });
      } else {
        this._showFingerHint(sc.x, sc.y, 1);
      }
    }
    if (this.floor === 4 && !GameState.progress.l5TutorialSeen) {
      GameState.progress.l5TutorialSeen = true;
      const sc = this._saveBtnCenter;
      this._showFingerHint(sc.x, sc.y, 1);
    }
    if (this.floor === 5 && !GameState.progress.l6TutorialSeen) {
      GameState.progress.l6TutorialSeen = true;
      const sc = this._saveBtnCenter;
      this._showFingerHint(sc.x, sc.y, 1);
    }
    if (!skipTutorials) {
      if (this.floor === 0 && !GameState.progress.l1TutorialSeen) {
        GameState.progress.l1TutorialSeen = true;
        this._showFingerHint(width / 2, btnCy + 90, 3);   // Explore button
      }
      const l1Wins = (GameState.progress.floorsCleared || {})[0] || 0;
      if (this.floor === 0 && l1Wins >= 3 && !GameState.progress.l1GoFurtherHintSeen) {
        GameState.progress.l1GoFurtherHintSeen = true;
        this._showFingerHint(width / 2, btnCy, 1);         // Go Further button
      }
    }
  }

  _addCheatZone(width, height) {
    let _cheatClicks = 0;
    let _cheatTimer = null;
    let _curBg  = null;
    let _curTxt = null;
    let _buildTimer = null; // tracked so rapid uses don't stack multiple buildFloor() calls
    const cheatZone = this.add.zone(width, height / 2, 27, 27).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    const _fireCheat = () => {
      if (_curBg)  { try { _curBg.destroy();  } catch(e) {} _curBg  = null; }
      if (_curTxt) { try { _curTxt.destroy(); } catch(e) {} _curTxt = null; }
      if (_buildTimer) { try { _buildTimer.remove(false); } catch(e) {} _buildTimer = null; }

      GameState.party.forEach(hero => levelUp(hero));
      GameState.addGold(500);
      SoundSystem.play('level_up');
      const lvls = GameState.party.map(h => `${h.name} Lv.${h.level}`).join('\n');
      const msg = `🔓 Secret Code Unlocked!\n✨ +1 Level & +500 Gold!\n\n${lvls}\n\n💰 ${GameState.gold} Gold total`;
      const boxTop = height * 0.18, boxH = height * 0.62;
      const oBg = this.add.graphics().setDepth(20);
      oBg.fillStyle(0x000022, 1);
      oBg.fillRoundedRect(width * 0.1, boxTop, width * 0.8, boxH, 12);
      oBg.lineStyle(2, 0xffdd88, 1);
      oBg.strokeRoundedRect(width * 0.1, boxTop, width * 0.8, boxH, 12);
      const oTxt = this.add.text(width / 2, boxTop + boxH / 2, msg, {
        fontSize: '22px', color: '#ffdd88', fontFamily: 'serif',
        align: 'center', wordWrap: { width: width * 0.72 }
      }).setOrigin(0.5).setDepth(21);
      _curBg  = oBg;
      _curTxt = oTxt;
      _buildTimer = this.time.delayedCall(3000, () => {
        if (_curBg  === oBg)  { try { oBg.destroy();  } catch(e) {} _curBg  = null; }
        if (_curTxt === oTxt) { try { oTxt.destroy(); } catch(e) {} _curTxt = null; }
        _buildTimer = null;
        this.buildFloor();
      });
    };
    cheatZone.on('pointerdown', () => {
      if (this.isBattling) return;
      _cheatClicks++;
      if (_cheatTimer) { _cheatTimer.remove(false); _cheatTimer = null; }
      if (_cheatClicks >= 3) {
        _cheatClicks = 0;
        _fireCheat();
      } else {
        // Reset counter if no further taps within 800ms
        _cheatTimer = this.time.delayedCall(800, () => { _cheatClicks = 0; _cheatTimer = null; });
      }
    });
  }

  drawDungeonRoom(g, w, h, color) {
    // Stone floor tiles
    g.lineStyle(1, 0x333333, 0.5);
    for (let x = 0; x < w; x += 32) g.lineBetween(x, 48, x, h);
    for (let y = 48; y < h; y += 32) g.lineBetween(0, y, w, y);
    // Torches
    const torchColor = 0xff8800;
    for (const tx of [40, w - 40]) {
      g.fillStyle(torchColor, 0.8);
      g.fillRect(tx - 4, 60, 8, 16);
      g.fillStyle(0xffff00, 0.6);
      g.fillTriangle(tx, 56, tx - 6, 72, tx + 6, 72);
    }
    // Doorways
    g.fillStyle(0x000000);
    g.fillRect(w/2 - 24, 48, 48, 20);  // top (up/down)
    g.fillRect(0, h/2 - 20, 20, 40);   // left
    g.fillRect(w - 20, h/2 - 20, 20, 40); // right
  }

  drawMiniMap(w, y) {
    const g = this.add.graphics();
    const totalFloors = this.FLOORS.length;
    const sw = 132, sh = 20, sx = w - sw - 4;
    g.fillStyle(0x000000, 0.7);
    g.fillRect(sx, y, sw, sh);
    const floorW = sw / totalFloors;
    for (let i = 0; i < totalFloors; i++) {
      const cleared = i < this.floor;
      const active  = i === this.floor;
      g.fillStyle(cleared ? 0x6644aa : (active ? 0xaa66ff : 0x333333));
      g.fillRect(sx + i * floorW + 1, y + 2, floorW - 2, sh - 4);
    }
    this.add.text(sx + sw / 2, y + sh / 2, `L${this.floor + 1}`, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  buildNavButtons(w, h, floorDef) {
    const btnCy = h * 0.56;
    const isBoss = !!floorDef.isBossFloor;
    const boss1Done = GameState.progress.boss1Defeated;
    const boss2Done = GameState.progress.boss2Defeated;
    const bossSubs = {
      3: boss1Done ? 'Go to L5' : `Face the ${GT.boss1Name}!`,
      4: boss2Done ? 'Go to L6' : `Face the ${GT.boss2Name}!`,
      5: `Face the ${GT.boss3Name}!`
    };

    const hasExplore = !isBoss || !!floorDef.exploreZone;
    const buttons = [
      {
        label: this.floor < 5 ? '↑ Go Further' : '⚔ Fight Boss',
        sub: isBoss ? (bossSubs[this.floor] || 'Challenge the boss!') : `Go to L${this.floor + 2}`,
        x: w / 2, y: btnCy,
        fn: () => {
          if (!isBoss) { this.tryAdvance(); return; }
          const alreadyDefeated =
            (this.floor === 3 && GameState.progress.boss1Defeated) ||
            (this.floor === 4 && GameState.progress.boss2Defeated);
          if (alreadyDefeated) { this.floor++; this.buildFloor(); }
          else this._showBossConfirm(this.floor);
        }
      },
      ...(hasExplore ? [{
        label: 'Explore',
        sub: 'Search for encounters',
        x: w / 2, y: btnCy + 90,
        fn: () => this.explore()
      }] : []),
      {
        label: '↓ Retreat',
        sub: this.floor > 0 ? `Return to L${this.floor}` : 'Return to World Map',
        x: w / 2, y: btnCy + 180,
        fn: () => this.retreat()
      }
    ];

    for (const b of buttons) {
      const btn = this.add.graphics();
      const draw = (hover) => {
        btn.clear();
        btn.fillStyle(hover ? 0x2a1a3a : 0x1a0a2a, 0.92);
        btn.fillRoundedRect(b.x - 140, b.y - 36, 280, 72, 7);
        btn.lineStyle(1.5, hover ? 0x9966cc : 0x553377, 1);
        btn.strokeRoundedRect(b.x - 140, b.y - 36, 280, 72, 7);
      };
      draw(false);
      this.add.text(b.x, b.y - 14, b.label, {
        fontSize: '32px', color: '#cc88ff', fontFamily: 'serif'
      }).setOrigin(0.5);
      this.add.text(b.x, b.y + 16, b.sub, {
        fontSize: '20px', color: '#775588', fontFamily: 'serif'
      }).setOrigin(0.5);

      btn.setInteractive(
        new Phaser.Geom.Rectangle(b.x - 140, b.y - 36, 280, 72),
        Phaser.Geom.Rectangle.Contains
      );
      btn.on('pointerover', () => draw(true));
      btn.on('pointerout',  () => draw(false));
      btn.on('pointerdown', b.fn);
    }
  }

  drawPartyBar(w, h) {
    const g = this.add.graphics();
    const by = h - 88;
    g.fillStyle(0x000000, 0.88);
    g.fillRect(0, by, w, 80);
    g.lineStyle(1, 0x443355, 1);
    g.lineBetween(0, by, w, by);
    const cw = w / 3;
    this._partyBarTexts = [];
    GameState.party.forEach((hero, i) => {
      const cx = i * cw + cw / 2;
      const color = hero.status === 'dead' ? '#ff4444' : '#cc88ff';
      this.add.text(cx, by + 8, hero.name, { fontSize: '22px', color, fontFamily: 'monospace' }).setOrigin(0.5);
      const hpTxt = this.add.text(cx, by + 32, `HP ${hero.hp}/${hero.maxHp}`, {
        fontSize: '20px', color: hero.hp <= hero.maxHp * 0.3 ? '#ff6666' : hero.hp <= hero.maxHp * 0.7 ? '#ffee44' : '#88cc88',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
      const mpTxt = this.add.text(cx, by + 54, `MP ${hero.mp}/${hero.maxMp}`, {
        fontSize: '20px', color: '#7788cc', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this._partyBarTexts.push({ hero, hpTxt, mpTxt });
    });
  }

  refreshStatusBar() {
    if (!this._partyBarTexts) return;
    this._partyBarTexts.forEach(({ hero, hpTxt, mpTxt }) => {
      hpTxt.setText(`HP ${hero.hp}/${hero.maxHp}`);
      hpTxt.setColor(hero.hp <= hero.maxHp * 0.3 ? '#ff6666' : hero.hp <= hero.maxHp * 0.7 ? '#ffee44' : '#88cc88');
      mpTxt.setText(`MP ${hero.mp}/${hero.maxMp}`);
    });
  }

  _launchBattle(config) {
    this.isBattling = true;
    this.time.removeAllEvents();   // clear any stale delayed callbacks
    this.scene.launch('BattleScene', { ...config, dungeonFloor: this.floor });
    this.scene.sleep();
  }

  _encounterCount() {
    const wins = (GameState.progress.floorsCleared || {})[this.floor] || 0;
    return wins < 3 ? wins + 1 : undefined; // 1st→1, 2nd→2, 3rd→3, after→random
  }

  explore() {
    if (this.isBattling) return;
    if (Math.random() < ENCOUNTER_CHANCE) {
      this.isBattling = true;      // block any further clicks immediately
      const floorDef = this.FLOORS[this.floor];
      const zone    = floorDef.exploreZone || floorDef.zone;
      const enemies = getRandomEncounter(zone, this._encounterCount());
      this.encLabel.setText('⚔ Enemies appear!');
      this.time.delayedCall(500, () => this._launchBattle({
        enemies,
        zone,
        bgKey: this.FLOORS[this.floor].bgKey,
        returnScene: 'DungeonScene',
        returnData: { floor: this.floor }
      }));
    } else {
      // Item find chances (independent rolls)
      const itemFinds = [
        { id: 'potion',      chance: 0.020 },
        { id: 'ether',       chance: 0.010 },
        { id: 'hiPotion',    chance: 0.010 },
        { id: 'antidote',    chance: 0.005 },
        { id: 'revivalDrop', chance: 0.002 },
      ];
      const found = itemFinds.filter(f => Math.random() < f.chance);
      if (found.length > 0) {
        found.forEach(f => GameState.addItem(f.id, 1));
        SoundSystem.play('item_found');
        const names = found.map(f => ITEM_DEFS[f.id].name).join(', ');
        this.encLabel.setText(`You found: ${names}!`);
      } else {
        const finds = [GT.exploreFind1, GT.exploreFind2, GT.exploreFind3, GT.exploreFind4];
        this.encLabel.setText(finds[Math.floor(Math.random() * finds.length)]);
      }
      this.time.delayedCall(2000, () => this.encLabel.setText(''));
    }
  }

  tryAdvance() {
    if (this.isBattling) return;

    // Must win 3 battles on this floor before going deeper
    const fc = GameState.progress.floorsCleared || {};
    const wins = fc[this.floor] || 0;
    const needed = 3;
    if (wins < needed) {
      const remaining = needed - wins;
      this.encLabel.setText(`Win ${remaining} more battle${remaining > 1 ? 's' : ''} here before going further!`);
      this.time.delayedCall(2500, () => this.encLabel.setText(''));
      return;
    }

    // No random battle when advancing directly to a boss floor
    if (this.FLOORS[this.floor + 1]?.isBossFloor) {
      this.floor++;
      this.buildFloor();
      return;
    }

    // 50% chance of a random battle before descending; winning advances to next floor
    if (Math.random() < 0.5) {
      const zone = this.FLOORS[this.floor].zone;
      this._launchBattle({
        enemies: getRandomEncounter(zone, this._encounterCount()),
        zone,
        bgKey: this.FLOORS[this.floor].bgKey,
        returnScene: 'DungeonScene',
        returnData: { floor: this.floor + 1 }
      });
    } else {
      this.floor++;
      this.buildFloor(); // boss floors auto-show their confirm dialog
    }
  }

  _startBossFight(bossFloor) {
    const cfg = this._bossConfig(bossFloor);
    if (!cfg) return;
    this.isBattling = true;
    if (this.encLabel) this.encLabel.setText(cfg.startMsg);
    this.time.delayedCall(1000, () => {
      this.time.removeAllEvents();
      this.scene.launch('BattleScene', {
        enemies: getRandomEncounter(cfg.zone),
        zone: cfg.zone, bgKey: cfg.bgKey,
        returnScene: 'DungeonScene',
        returnData: cfg.returnData,
        dungeonFloor: -1
      });
      this.scene.sleep();
    });
  }

  _bossConfig(bossFloor) {
    const TIP_SUFFIX = '\n\n' + GT.tipBossSuffix.replace('{town}', GT.placeTown);
    return {
      3: { title: GT.floorB4Name, sub: `${GT.boss1Name} awaits...`, levelRec: 8,
           zone: 'boss1', bgKey: 'bg_dungeon4', returnData: { floor: 3 },
           startMsg: `The ${GT.boss1Name} rises from the depths!`,
           tip: `Recommended: Lv. 8+ for all heroes.${TIP_SUFFIX}` },
      4: { title: GT.floorB5Name, sub: `${GT.boss2Name} lurks in the shadows...`, levelRec: 9,
           zone: 'boss2', bgKey: 'bg_dungeon5', returnData: { floor: 4 },
           startMsg: `The ${GT.boss2Name} descends from the cavern ceiling!`,
           tip: `Recommended: Lv. 9+ for all heroes.${TIP_SUFFIX}` },
      5: { title: GT.floorB6Name, sub: `${GT.boss3Name} prowls through the darkness...`, levelRec: 10,
           zone: 'boss3', bgKey: 'bg_dungeon6', returnData: { floor: 5 },
           startMsg: `The ${GT.boss3Name} awakens! The true final battle begins!`,
           tip: `Recommended: Lv. 10+ for all heroes.${TIP_SUFFIX}` },
    }[bossFloor];
  }

  _showBossConfirm(bossFloor) {
    const cfg = this._bossConfig(bossFloor);
    if (!cfg) return;
    this.isBattling = true; // block secret zones during the confirm dialog
    const { width: W, height: H } = this.scale;

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(50);
    const boxW = W * 0.84, boxH = 360;
    const box = this.add.graphics().setDepth(51);
    box.fillStyle(0x110022, 1);
    box.fillRoundedRect((W - boxW) / 2, H / 2 - boxH / 2, boxW, boxH, 12);
    box.lineStyle(2, 0xaa66ff, 1);
    box.strokeRoundedRect((W - boxW) / 2, H / 2 - boxH / 2, boxW, boxH, 12);

    const prompt = this.add.text(W / 2, H / 2 - 148, cfg.title, {
      fontSize: '26px', color: '#ffeecc', fontFamily: 'serif', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);
    const sub = this.add.text(W / 2, H / 2 - 112, cfg.sub, {
      fontSize: '18px', color: '#aa88cc', fontFamily: 'serif', fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(52);
    const tip = this.add.text(W / 2, H / 2 - 68, cfg.tip, {
      fontSize: '19px', color: '#ffdd88', fontFamily: 'serif',
      align: 'center', wordWrap: { width: boxW - 24 }
    }).setOrigin(0.5, 0).setDepth(52);

    let yesBtn, yesLabel, yesZone, noBtn, noLabel, noZone;
    const dismiss = () => {
      [overlay, box, prompt, sub, tip, yesBtn, yesLabel, yesZone, noBtn, noLabel, noZone].forEach(o => o.destroy());
      this.isBattling = false;
    };

    yesBtn = this.add.graphics().setDepth(51);
    yesBtn.fillStyle(0x336633, 1);
    yesBtn.fillRoundedRect(W / 2 - boxW / 2 + 20, H / 2 + 118, boxW / 2 - 30, 48, 8);
    yesLabel = this.add.text(W / 2 - boxW / 4, H / 2 + 142, 'Yes, let\'s fight!', {
      fontSize: '22px', color: '#aaffaa', fontFamily: 'serif', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);
    yesZone = this.add.zone(W / 2 - boxW / 4, H / 2 + 142, boxW / 2 - 30, 48)
      .setInteractive({ cursor: 'pointer' }).setDepth(53);
    yesZone.on('pointerdown', () => { dismiss(); this._startBossFight(bossFloor); });

    noBtn = this.add.graphics().setDepth(51);
    noBtn.fillStyle(0x663333, 1);
    noBtn.fillRoundedRect(W / 2 + 10, H / 2 + 118, boxW / 2 - 30, 48, 8);
    noLabel = this.add.text(W / 2 + boxW / 4, H / 2 + 142, 'No, not yet', {
      fontSize: '20px', color: '#ffaaaa', fontFamily: 'serif', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);
    noZone = this.add.zone(W / 2 + boxW / 4, H / 2 + 142, boxW / 2 - 30, 48)
      .setInteractive({ cursor: 'pointer' }).setDepth(53);
    noZone.on('pointerdown', () => { dismiss(); this.buildFloor(); });
  }

  _showFingerHint(x, btnCenterY, taps, onDone) {
    const baseY = btnCenterY + 26;
    const finger = this.add.text(x, baseY, '👆', {
      fontSize: '52px'
    }).setOrigin(0.5, 0).setDepth(20).setAlpha(0);
    this.tweens.add({
      targets: finger, alpha: 1, duration: 250,
      onComplete: () => this._doFingerTap(finger, baseY, btnCenterY + 6, taps, 0, onDone)
    });
  }

  _doFingerTap(finger, baseY, pressY, totalTaps, done, onDone) {
    if (!finger.active) return;
    if (done >= totalTaps) {
      this.tweens.add({ targets: finger, alpha: 0, duration: 300, onComplete: () => {
        finger.destroy();
        if (onDone) onDone();
      }});
      return;
    }
    this.tweens.add({
      targets: finger, y: pressY, duration: 130, ease: 'Quad.easeOut',
      onComplete: () => {
        if (!finger.active) return;
        this.tweens.add({
          targets: finger, y: baseY, duration: 130, ease: 'Quad.easeIn',
          onComplete: () => {
            this.time.delayedCall(500, () => this._doFingerTap(finger, baseY, pressY, totalTaps, done + 1, onDone));
          }
        });
      }
    });
  }

  retreat() {
    if (this.isBattling) return;
    if (this.floor > 0) {
      this.floor--;
      this.buildFloor();
    } else {
      this.cameras.main.fade(400, 0, 0, 0, false, (cam, p) => {
        if (p === 1) this.scene.start('WorldScene');
      });
    }
  }
}
