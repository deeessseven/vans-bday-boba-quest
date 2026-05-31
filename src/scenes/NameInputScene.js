import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { GT } from '../data/GameText.js';
const BOX_COLORS = [0x4488ff, 0xffee44, 0xaa44ff];

export class NameInputScene extends Phaser.Scene {
  constructor() { super('NameInputScene'); }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this._classes = [GT.hero1Class, GT.hero2Class, GT.hero3Class];
    this._defaults = [GT.hero1Name, GT.hero2Name, GT.hero3Name];
    this.names  = [...this._defaults];
    this.active = 0;
    this.cursorOn = true;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000022, 0x000022, 0x001144, 0x001144, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 40, 'Name Your Party', {
      fontSize: '40px', color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5);

    this.add.text(width / 2, 79, 'Tap a box to select · type to rename\nEnter / Tab for next', {
      fontSize: '20px', color: '#445566', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5);

    // Input boxes
    this._boxGraphics = [];
    this._nameTexts   = [];
    this._boxes       = [];

    this._defaults.forEach((_, i) => {
      const bx = width * 0.08;
      const bw = width * 0.84;
      const bh = 86;
      const by = 100 + i * 100;

      const g = this.add.graphics();
      this._boxGraphics.push(g);

      // Class label inside box
      const hex = '#' + BOX_COLORS[i].toString(16).padStart(6, '0');
      this.add.text(bx + 12, by + 10, this._classes[i], {
        fontSize: '20px', color: hex, fontFamily: 'monospace'
      });

      // Name text
      const txt = this.add.text(bx + 16, by + 34, this.names[i], {
        fontSize: '40px', color: '#ffffff', fontFamily: 'serif'
      });
      this._nameTexts.push(txt);

      // Interactive hit zone
      const zone = this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.setActive(i));
      this._boxes.push({ x: bx, y: by, w: bw, h: bh, col: BOX_COLORS[i] });
    });

    this.redrawBoxes();

    // Cursor blink timer
    this.time.addEvent({
      delay: 530, loop: true,
      callback: () => { this.cursorOn = !this.cursorOn; this.redrawBoxes(); }
    });

    // Keyboard input (physical keyboard)
    this.input.keyboard.on('keydown', this.onKey, this);

    // Mobile keyboard: hidden HTML input that captures native keyboard
    this._mobileInput = document.createElement('input');
    this._mobileInput.type = 'text';
    this._mobileInput.autocomplete = 'off';
    this._mobileInput.autocorrect = 'off';
    this._mobileInput.autocapitalize = 'words';
    this._mobileInput.spellcheck = false;
    this._mobileInput.setAttribute('aria-hidden', 'true');
    this._mobileInput.tabIndex = -1;
    Object.assign(this._mobileInput.style, {
      position: 'fixed', opacity: '0', pointerEvents: 'none',
      top: '-200px', left: '0', width: '200px', height: '40px', fontSize: '16px'
    });
    document.body.appendChild(this._mobileInput);

    this._composing = false;
    this._mobileInput.addEventListener('compositionstart', () => {
      this._composing = true;
    });
    this._mobileInput.addEventListener('compositionend', () => {
      this._composing = false;
      this._syncFromInput();
    });
    this._mobileInput.addEventListener('input', () => {
      if (this._composing) return;
      this._syncFromInput();
    });
    this._mobileInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.setActive((this.active + 1) % this._defaults.length);
        this._mobileInput.focus();
      }
    });
    // Cleanup on scene shutdown
    this.events.once('shutdown', () => {
      if (this._mobileInput && this._mobileInput.parentNode) {
        this._mobileInput.parentNode.removeChild(this._mobileInput);
      }
    });

    // ── Start Adventure button ────────────────────────────────────────
    const btnY = 100 + 3 * 100 + 24;
    this._drawBtn(width / 2 - 140, btnY, 280, 62, 'Start Adventure', () => {
      this.applyNames();
      this.cameras.main.fade(400, 0, 0, 0, false, (cam, p) => {
        if (p === 1) this.scene.start('HeroIntroScene', { heroIdx: 0 });
      });
    });

    this.add.text(width / 2, btnY + 90, 'Leave a box empty to keep\nthe default name', {
      fontSize: '20px', color: '#334455', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5);

    // ── Back button ──────────────────────────────────────────────────
    this._drawBtn(width / 2 - 105, btnY + 150, 210, 47, '◀ Back', () => {
      this.scene.start('TitleScene', { showDifficulty: true });
    }, '27px');
  }

  setActive(i) {
    this.active  = i;
    this.cursorOn = true;
    this.redrawBoxes();
    if (this._mobileInput) {
      const name = this.names[i];
      this._mobileInput.value = name;
      this._mobileInput.focus();
      // Force cursor to end — mobile browsers can default to position 0,
      // causing characters to insert before existing text (appears backwards).
      // setTimeout needed because iOS applies selection asynchronously after focus.
      const len = name.length;
      this._mobileInput.setSelectionRange(len, len);
      setTimeout(() => this._mobileInput.setSelectionRange(len, len), 0);
    }
  }

  _syncFromInput() {
    const val = this._mobileInput.value.slice(0, 12);
    this.names[this.active] = val;
    if (this._mobileInput.value.length > 12) {
      this._mobileInput.value = val;
    }
    this.cursorOn = true;
    this.redrawBoxes();
  }

  redrawBoxes() {
    this._boxes.forEach(({ x, y, w, h, col }, i) => {
      const g  = this._boxGraphics[i];
      const on = i === this.active;
      g.clear();
      g.fillStyle(on ? 0x0e1e33 : 0x080d18, 0.97);
      g.fillRoundedRect(x, y, w, h, 8);
      g.lineStyle(on ? 2 : 1, on ? col : 0x2a3a55, 1);
      g.strokeRoundedRect(x, y, w, h, 8);

      const cursor = (on && this.cursorOn) ? '|' : '';
      this._nameTexts[i].setText(this.names[i] + cursor);
    });
  }

  onKey(event) {
    if (document.activeElement === this._mobileInput) return;
    const i = this.active;
    if (event.key === 'Backspace') {
      this.names[i] = [...this.names[i]].slice(0, -1).join('');
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault?.();
      this.setActive((i + 1) % this._defaults.length);
      return;
    } else if (event.key.length === 1 && this.names[i].length < 12) {
      this.names[i] += event.key;
    }
    this.cursorOn = true;
    this.redrawBoxes();
  }

  applyNames() {
    this.names.forEach((name, i) => {
      GameState.party[i].name = name.trim() || this._defaults[i];
    });
  }

  _drawBtn(x, y, w, h, label, fn, fontSize = '36px') {
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x1a3a66 : 0x111833, 0.97);
      bg.fillRoundedRect(x, y, w, h, 8);
      bg.lineStyle(hover ? 2 : 1.5, hover ? 0x88ccff : 0x4488cc, 1);
      bg.strokeRoundedRect(x, y, w, h, 8);
    };
    draw(false);
    const txt = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize, color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
    bg.on('pointerout',   () => { draw(false); txt.setColor('#aaddff'); });
    bg.on('pointerdown',  fn);
  }
}
