// Procedural sound effects via Web Audio API — no external files needed
import { MusicSystem } from './MusicSystem.js';

export const SoundSystem = {
  _sfxGain: null,
  _noiseBuffer: null,
  _volume: 0.55,
  _sfxMuted: false,

  get ctx() { return MusicSystem.ctx; },

  get sfxGain() {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (!this._sfxGain) {
      this._sfxGain = ctx.createGain();
      this._sfxGain.gain.value = this._volume;
      this._sfxGain.connect(ctx.destination);
    }
    return this._sfxGain;
  },

  _getNoiseBuffer() {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (!this._noiseBuffer) {
      const len = ctx.sampleRate;
      this._noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this._noiseBuffer;
  },

  play(id) {
    if (this._sfxMuted || document.hidden) return;
    const fn = this[`_${id}`];
    if (fn) fn.call(this);
  },

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._sfxGain && !this._sfxMuted) this._sfxGain.gain.value = this._volume;
  },

  getSfxMuted() { return this._sfxMuted; },

  toggleSfxMute() {
    this._sfxMuted = !this._sfxMuted;
    if (this._sfxGain) {
      this._sfxGain.gain.value = this._sfxMuted ? 0 : this._volume;
    }
    return this._sfxMuted;
  },

  // ── Primitives ────────────────────────────────────────────────────────

  _tone(freq, dur, type, gain, atk, rel, at) {
    const ctx = this.ctx; const sfx = this.sfxGain;
    if (!ctx || !sfx) return;
    const t = at ?? ctx.currentTime;
    const a = atk ?? 0.008;
    const r = rel ?? Math.min(0.05, dur * 0.15);
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    g.gain.setValueAtTime(gain, t + dur - r);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g); g.connect(sfx);
    osc.start(t); osc.stop(t + dur + 0.01);
  },

  _sweep(f0, f1, dur, type, gain, at) {
    const ctx = this.ctx; const sfx = this.sfxGain;
    if (!ctx || !sfx) return;
    const t = at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f0, t);
    const fEnd = Math.max(f1, 0.5);
    if (f0 > 0.5 && fEnd > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    } else {
      osc.frequency.linearRampToValueAtTime(fEnd, t + dur);
    }
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(sfx);
    osc.start(t); osc.stop(t + dur + 0.01);
  },

  _noise(dur, centerF, Q, gain, at) {
    const ctx = this.ctx; const sfx = this.sfxGain;
    if (!ctx || !sfx) return;
    const buf = this._getNoiseBuffer();
    if (!buf) return;
    const t = at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = centerF || 1000;
    filt.Q.value = Q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(sfx);
    src.start(t); src.stop(t + dur + 0.01);
  },

  // ── Physical attacks ──────────────────────────────────────────────────

  _attack_hero() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.08, 2200, 1.5, 0.15, t);
    this._sweep(380, 80, 0.16, 'square', 0.24, t + 0.07);
    this._noise(0.13, 220, 1.2, 0.16, t + 0.07);
  },

  _hit_physical() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(280, 65, 0.17, 'sine', 0.30, t);
    this._noise(0.14, 280, 1.3, 0.18, t);
  },

  _hit_magic() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(720, 260, 0.19, 'sine', 0.22, t);
    this._noise(0.16, 2800, 2.5, 0.10, t);
  },

  // ── Enemy actions ─────────────────────────────────────────────────────

  _enemy_attack() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(260, 68, 0.18, 'square', 0.24, t);
    this._noise(0.14, 190, 1.2, 0.17, t);
  },

  _enemy_smallEnemy2Attack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.07, 2600, 2.0, 0.25, t);
    this._sweep(720, 210, 0.18, 'sawtooth', 0.23, t + 0.04);
  },

  _enemy_mediumEnemy1Attack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(160, 38, 0.32, 'sawtooth', 0.28, t);
    this._noise(0.22, 200, 0.8, 0.20, t);
    this._tone(55, 0.36, 'sawtooth', 0.15, 0.02, 0.30, t + 0.10);
  },

  _enemy_bigEnemy1Attack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(210, 26, 0.34, 'sine', 0.40, t);
    this._noise(0.28, 120, 0.7, 0.28, t);
  },

  _enemy_bigEnemy1Attack2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(1600, 4800, 0.32, 'sine', 0.22, t);
    this._noise(0.30, 6500, 4.0, 0.12, t);
    this._tone(3520, 0.22, 'sine', 0.16, 0.005, 0.18, t + 0.10);
  },

  _enemy_bigEnemy1Attack3() {
    const t = this.ctx?.currentTime ?? 0;
    // Impact splat
    this._sweep(600, 180, 0.18, 'sine', 0.22, t);
    this._noise(0.22, 900, 2.5, 0.12, t);
    this._sweep(400, 900, 0.14, 'sine', 0.16, t + 0.10);
    this._noise(0.16, 400, 1.8, 0.10, t + 0.18);
  },

  _enemy_boss3SpecialAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    // Four heavy detonations + concussive seal
    for (let i = 0; i < 4; i++) {
      this._sweep(540 + i * 80, 120, 0.22, 'sine', 0.30, t + i * 0.09);
      this._noise(0.16, 740 + i * 100, 2.0, 0.20, t + i * 0.09);
    }
    this._noise(0.44, 580, 1.5, 0.30, t + 0.36);
    this._sweep(300, 55, 0.46, 'square', 0.34, t + 0.46);
    this._tone(62, 0.40, 'sine', 0.22, 0.015, 0.36, t + 0.52);
  },

  // Boss 1 — Growling Breath: deep lion growl exhale that induces sleep
  _enemy_boss1MagicAttack2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(300, 54, 0.64, 'square', 0.40, t);
    this._noise(0.72, 160, 0.65, 0.34, t);
    [110, 82, 65].forEach((f, i) =>
      this._tone(f, 0.60, 'square', 0.26, 0.015, 0.54, t + 0.12 + i * 0.10)
    );
    this._noise(0.52, 380, 1.0, 0.28, t + 0.22);
    this._sweep(200, 44, 0.56, 'sine', 0.34, t + 0.28);
    this._noise(0.38, 600, 1.2, 0.22, t + 0.44);
    this._tone(55, 0.62, 'sawtooth', 0.20, 0.025, 0.56, t + 0.40);
  },

  // Boss 1 — Lion Mane Entanglement: mane whips out and snares all heroes
  _enemy_boss1SpecialAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(180, 1600, 0.28, 'sawtooth', 0.36, t);
    this._noise(0.16, 3400, 1.8, 0.28, t + 0.06);
    for (let i = 0; i < 3; i++) {
      this._sweep(900 + i * 120, 180, 0.22, 'sawtooth', 0.30, t + 0.14 + i * 0.10);
      this._noise(0.14, 600, 1.2, 0.20, t + 0.16 + i * 0.10);
    }
    this._sweep(260, 48, 0.52, 'square', 0.36, t + 0.46);
    this._noise(0.42, 180, 0.8, 0.28, t + 0.48);
    this._tone(58, 0.52, 'sawtooth', 0.22, 0.020, 0.46, t + 0.52);
  },

  // Boss 2 — Tail Strike: colossal tail slam crashing into all heroes
  _enemy_boss2PhysicalAttack2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(500, 34, 0.64, 'sawtooth', 0.50, t);
    this._noise(0.22, 3800, 1.4, 0.40, t + 0.04);
    for (let i = 0; i < 3; i++) {
      this._sweep(420 - i * 70, 24, 0.48, 'square', 0.48, t + 0.14 + i * 0.11);
      this._noise(0.28, 140, 0.7, 0.38, t + 0.16 + i * 0.11);
    }
    this._tone(32, 0.66, 'sine', 0.40, 0.010, 0.60, t + 0.50);
    this._noise(0.44, 260, 0.6, 0.30, t + 0.60);
  },

  // Boss 3 wave: massive surge drowning all heroes
  _enemy_boss3MagicAttack2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(80, 500, 0.76, 'sawtooth', 0.46, t);
    this._noise(0.42, 380, 0.7, 0.40, t + 0.08);
    this._sweep(500, 2400, 0.46, 'sawtooth', 0.36, t + 0.20);
    this._noise(0.20, 5200, 2.5, 0.34, t + 0.28);
    this._noise(0.68, 620, 0.8, 0.44, t + 0.34);
    this._sweep(1800, 40, 0.80, 'sawtooth', 0.50, t + 0.44);
    this._noise(0.60, 200, 0.65, 0.38, t + 0.58);
    this._tone(38, 0.66, 'sine', 0.34, 0.012, 0.60, t + 0.66);
    this._sweep(400, 26, 0.52, 'square', 0.42, t + 0.80);
    this._noise(0.36, 300, 0.5, 0.28, t + 0.88);
  },

  // Boss 2 breath: hissing sleep-inducing exhale
  _enemy_boss2MagicAttack2() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.60, 2800, 0.9, 0.44, t);
    this._noise(0.46, 1200, 1.4, 0.36, t + 0.10);
    this._sweep(440, 58, 0.52, 'sine', 0.36, t + 0.08);
    this._tone(58, 0.62, 'sine', 0.24, 0.03, 0.56, t + 0.26);
    this._noise(0.30, 600, 1.0, 0.26, t + 0.40);
    this._sweep(220, 38, 0.46, 'sawtooth', 0.26, t + 0.20);
    this._noise(0.38, 400, 0.8, 0.22, t + 0.54);
  },

  // Boss 3 — Straw Strike: sharp high whoosh into crushing heavy impact
  _enemy_boss3PhysicalAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(2600, 360, 0.36, 'sawtooth', 0.28, t);
    this._noise(0.26, 2600, 1.6, 0.22, t);
    this._sweep(400, 22, 0.72, 'sawtooth', 0.54, t + 0.06);
    this._noise(0.58, 150, 0.65, 0.46, t + 0.08);
    this._tone(38, 0.42, 'sine', 0.36, 0.005, 0.36, t + 0.10);
    this._noise(0.32, 380, 0.9, 0.28, t + 0.34);
    this._sweep(180, 28, 0.36, 'square', 0.30, t + 0.42);
  },

  // Boss 3 sleep: eerie descending tones + oppressive dreamy weight
  _enemy_boss3MagicAttack3() {
    const t = this.ctx?.currentTime ?? 0;
    [880, 660, 495, 370].forEach((f, i) =>
      this._tone(f, 0.56, 'sine', 0.22, 0.02, 0.50, t + i * 0.13)
    );
    this._noise(0.24, 900, 1.8, 0.34, t);
    this._sweep(440, 88, 0.38, 'sine', 0.32, t + 0.18);
    this._noise(0.20, 500, 1.2, 0.26, t + 0.42);
    this._tone(55, 0.68, 'sine', 0.30, 0.020, 0.62, t + 0.30);
  },

  // Boss 1 — Raging Roar: thunderous all-party bestial roar burst
  _enemy_boss1MagicAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(180, 1400, 0.38, 'sawtooth', 0.40, t);
    this._noise(0.52, 280, 0.60, 0.44, t);
    this._sweep(1400, 220, 0.52, 'square', 0.38, t + 0.10);
    this._noise(0.36, 600, 1.0, 0.30, t + 0.18);
    [147, 110, 82].forEach((f, i) =>
      this._tone(f, 0.46, 'square', 0.30, 0.012, 0.40, t + 0.28 + i * 0.08)
    );
    this._noise(0.30, 200, 0.5, 0.24, t + 0.50);
  },

  // Boss 1 — Claw Strike: sharp slashing impact
  _enemy_boss1PhysicalAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.06, 3200, 2.0, 0.34, t);
    this._sweep(1600, 140, 0.28, 'sawtooth', 0.40, t + 0.02);
    this._sweep(360, 40, 0.36, 'square', 0.44, t + 0.06);
    this._noise(0.24, 240, 0.8, 0.32, t + 0.08);
    this._tone(82, 0.32, 'square', 0.24, 0.008, 0.26, t + 0.14);
  },

  // Boss 2 — Scaly Slash: slash with acidic poison edge
  _enemy_boss2PhysicalAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.07, 2800, 1.8, 0.30, t);
    this._sweep(1200, 120, 0.26, 'sawtooth', 0.36, t + 0.02);
    this._sweep(300, 36, 0.32, 'sine', 0.38, t + 0.06);
    this._noise(0.28, 180, 0.7, 0.28, t + 0.08);
    this._noise(0.20, 900, 1.5, 0.18, t + 0.20);
    this._tone(73, 0.34, 'sine', 0.20, 0.010, 0.28, t + 0.16);
  },

  // Boss 2 — Draco Ray: piercing beam of energy hitting all heroes
  _enemy_boss2MagicAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(400, 4000, 0.32, 'sine', 0.36, t);
    this._noise(0.10, 5500, 2.0, 0.26, t + 0.06);
    this._sweep(4000, 800, 0.36, 'sawtooth', 0.30, t + 0.14);
    this._noise(0.24, 3200, 1.6, 0.22, t + 0.20);
    this._tone(880, 0.28, 'sine', 0.18, 0.005, 0.24, t + 0.32);
    this._sweep(800, 200, 0.28, 'sine', 0.26, t + 0.40);
  },

  // Boss 2 — Inferno Heat Stroke: scorching fire blast that paralyzes all
  _enemy_boss2SpecialAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.60, 650, 0.85, 0.38, t);
    this._sweep(280, 1200, 0.50, 'sawtooth', 0.30, t);
    this._noise(0.30, 3200, 1.4, 0.22, t + 0.10);
    this._sweep(1200, 320, 0.44, 'sawtooth', 0.26, t + 0.18);
    this._noise(0.36, 500, 0.9, 0.28, t + 0.28);
    this._sweep(320, 44, 0.40, 'square', 0.34, t + 0.42);
    this._noise(0.28, 200, 0.6, 0.22, t + 0.52);
  },

  // Boss 3 — Dark Rush: dark energy surge poisoning all heroes
  _enemy_boss3MagicAttack1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(600, 44, 0.48, 'sawtooth', 0.38, t);
    this._noise(0.12, 4000, 1.4, 0.28, t + 0.04);
    this._sweep(44, 800, 0.40, 'sawtooth', 0.30, t + 0.12);
    this._noise(0.44, 320, 0.75, 0.36, t + 0.18);
    [220, 165].forEach((f, i) =>
      this._tone(f, 0.40, 'sawtooth', 0.18, 0.010, 0.34, t + 0.28 + i * 0.10)
    );
    this._noise(0.28, 600, 1.2, 0.24, t + 0.44);
    this._tone(55, 0.44, 'sine', 0.22, 0.012, 0.38, t + 0.54);
  },

  // Boss 3 — Sleep Breath: heavy exhale dragging all heroes into sleep
  _enemy_boss3MagicAttack4() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.70, 2400, 0.85, 0.40, t);
    this._noise(0.54, 800, 1.2, 0.34, t + 0.08);
    this._sweep(380, 48, 0.58, 'sine', 0.32, t + 0.06);
    [660, 494, 370, 277].forEach((f, i) =>
      this._tone(f, 0.54, 'sine', 0.20, 0.018, 0.48, t + 0.16 + i * 0.14)
    );
    this._noise(0.34, 500, 1.0, 0.26, t + 0.46);
    this._sweep(200, 36, 0.50, 'sawtooth', 0.28, t + 0.38);
    this._tone(48, 0.66, 'sine', 0.26, 0.016, 0.60, t + 0.50);
  },

  _enemy_mediumEnemy1Attack2() {
    const t = this.ctx?.currentTime ?? 0;
    // Heavy Slash — heavier impact than Attack1, distinct from smallEnemy2 light slash
    this._noise(0.45, 300, 0.6, 0.22, t);
    this._sweep(180, 40, 0.38, 'sawtooth', 0.30, t);
    this._noise(0.18, 1800, 1.8, 0.16, t + 0.05);
    this._tone(110, 0.28, 'square', 0.12, 0.018, 0.35, t + 0.08);
  },

  _hero_hurt() {
    const t = this.ctx?.currentTime ?? 0;
    // Short personal impact — body thud + quick pitch drop
    this._sweep(320, 80, 0.14, 'sine', 0.28, t);
    this._noise(0.10, 500, 1.2, 0.14, t);
    this._sweep(200, 55, 0.12, 'square', 0.18, t + 0.04);
  },

  _defend_hero() {
    const t = this.ctx?.currentTime ?? 0;
    // Shield brace: low thud + metallic ring
    this._sweep(240, 80, 0.22, 'square', 0.28, t);
    this._noise(0.10, 3200, 3.0, 0.12, t + 0.04);
    this._tone(440, 0.28, 'sine', 0.14, 0.005, 0.24, t + 0.08);
  },

  // ── Spells ────────────────────────────────────────────────────────────

  _spell_fire() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.42, 600, 1.0, 0.20, t);
    this._sweep(200, 750, 0.46, 'sawtooth', 0.16, t);
    this._sweep(750, 200, 0.30, 'sine', 0.10, t + 0.16);
  },

  _spell_ice() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.32, 5200, 3.5, 0.10, t);
    [2637, 3136, 3729].forEach((f, i) =>
      this._tone(f, 0.36, 'sine', 0.18, 0.004, 0.30, t + i * 0.07)
    );
  },

  _spell_thunder() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.06, 4200, 0.6, 0.38, t);
    this._sweep(1300, 280, 0.20, 'sawtooth', 0.30, t + 0.02);
    this._tone(55, 0.34, 'sine', 0.24, 0.01, 0.28, t + 0.06);
  },

  _spell_quake() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.65, 6500, 2.5, 0.14, t);
    for (let i = 0; i < 7; i++) {
      const f = 1200 + Math.random() * 3000;
      this._tone(f, 0.52, 'sine', 0.16, 0.004, 0.46, t + i * 0.065);
    }
    this._sweep(880, 2400, 0.58, 'sawtooth', 0.10, t);
  },

  // Arthur – Blade Storm: rapid physical slashes across all enemies
  _spell_hero1Special2() {
    const t = this.ctx?.currentTime ?? 0;
    for (let i = 0; i < 4; i++) {
      this._noise(0.06, 2400, 2.0, 0.22, t + i * 0.07);
      this._sweep(420, 100, 0.14, 'square', 0.20, t + i * 0.07 + 0.02);
    }
    this._sweep(800, 180, 0.30, 'sawtooth', 0.18, t + 0.30);
  },

  // Lyra – Dark Calm: eerie, soothing chord wash
  _spell_hero3Special2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(220, 440, 0.50, 'sine', 0.16, t);
    [330, 415, 494].forEach((f, i) =>
      this._tone(f, 0.60, 'sine', 0.14, 0.015, 0.52, t + i * 0.10)
    );
    this._noise(0.40, 800, 3.0, 0.07, t + 0.20);
  },

  // Serra – Illuminated Drain: vampiric descending pull from all enemies
  _spell_hero2Special3() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(1200, 80, 0.55, 'sawtooth', 0.28, t);
    this._noise(0.12, 2000, 2.5, 0.16, t + 0.10);
    [440, 330, 220, 110].forEach((f, i) =>
      this._tone(f, 0.44, 'sine', 0.14, 0.015, 0.38, t + 0.14 + i * 0.10)
    );
    this._sweep(80, 40, 0.40, 'sine', 0.18, t + 0.52);
  },

  // Serra – Recuperative Bliss: warm regeneration glow for all allies
  _spell_hero2Special4() {
    const t = this.ctx?.currentTime ?? 0;
    [392, 494, 587, 784].forEach((f, i) =>
      this._tone(f, 0.60, 'sine', 0.16, 0.015, 0.54, t + i * 0.12)
    );
    this._sweep(300, 900, 0.50, 'sine', 0.14, t + 0.24);
    this._noise(0.18, 3000, 4.0, 0.07, t + 0.40);
    this._tone(1175, 0.46, 'sine', 0.10, 0.012, 0.42, t + 0.60);
  },

  // Serra – Light Blast: bright divine burst hitting all foes
  _spell_hero2Special2() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.08, 5500, 1.5, 0.30, t);
    this._sweep(900, 3600, 0.28, 'sine', 0.26, t + 0.04);
    [1760, 2217, 2637].forEach((f, i) =>
      this._tone(f, 0.36, 'sine', 0.20, 0.005, 0.30, t + 0.12 + i * 0.06)
    );
    this._sweep(3600, 900, 0.30, 'sine', 0.14, t + 0.32);
  },

  _spell_hero1Special1() {
    const t = this.ctx?.currentTime ?? 0;
    // Energy building up: rising sweep + crackle
    this._sweep(110, 880, 0.55, 'sawtooth', 0.22, t);
    this._noise(0.20, 3000, 2.0, 0.12, t + 0.20);
    this._tone(440, 0.38, 'square', 0.14, 0.010, 0.32, t + 0.28);
    this._sweep(880, 1760, 0.22, 'square', 0.16, t + 0.40);
  },

  _spell_hero1Special3() {
    const t = this.ctx?.currentTime ?? 0;
    // Alert stance: sharp click + rising brace tone
    this._noise(0.06, 4000, 1.5, 0.28, t);
    this._sweep(180, 620, 0.28, 'square', 0.22, t + 0.04);
    this._tone(330, 0.34, 'sine', 0.18, 0.006, 0.28, t + 0.14);
  },

  _hero1Special3_hit() {
    const t = this.ctx?.currentTime ?? 0;
    // High whoosh — sword cutting air
    this._noise(0.08, 4500, 1.8, 0.28, t);
    // Broad slash arc — sawtooth for edge/grit
    this._sweep(1800, 180, 0.28, 'sawtooth', 0.32, t + 0.02);
    // Heavy impact thud — strike landing with weight
    this._sweep(480, 55, 0.32, 'square', 0.36, t + 0.06);
    this._noise(0.22, 320, 0.9, 0.24, t + 0.08);
    // Metallic blade resonance
    this._tone(880, 0.24, 'sine', 0.16, 0.003, 0.20, t + 0.10);
  },

  _spell_hero1Special4() {
    const t = this.ctx?.currentTime ?? 0;
    // Epic rising sun: orchestral swell + bright burst
    this._sweep(110, 2200, 0.68, 'sawtooth', 0.24, t);
    this._noise(0.14, 6000, 2.5, 0.20, t + 0.32);
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      this._tone(f, 0.52, 'sine', 0.18, 0.006, 0.46, t + 0.36 + i * 0.06)
    );
    this._sweep(2200, 4400, 0.28, 'square', 0.18, t + 0.50);
    this._noise(0.22, 8000, 3.0, 0.14, t + 0.60);
  },

  _spell_hero3Special3() {
    const t = this.ctx?.currentTime ?? 0;
    // Dark arcane explosion: deep boom + dissonant burst
    this._sweep(880, 55, 0.44, 'sawtooth', 0.32, t);
    this._noise(0.10, 5500, 1.2, 0.36, t + 0.02);
    this._sweep(55, 1320, 0.36, 'sine', 0.20, t + 0.12);
    [220, 277, 330, 415].forEach((f, i) =>
      this._tone(f, 0.44, 'square', 0.16, 0.008, 0.38, t + 0.20 + i * 0.05)
    );
    this._noise(0.30, 2800, 2.0, 0.14, t + 0.40);
  },

  _spell_hero3Special1() {
    const t = this.ctx?.currentTime ?? 0;
    // Cleansing purification — rising tones + sparkle wash
    this._sweep(300, 1800, 0.38, 'sine', 0.20, t);
    [880, 1108, 1318].forEach((f, i) =>
      this._tone(f, 0.44, 'sine', 0.16, 0.008, 0.38, t + 0.12 + i * 0.08)
    );
    this._noise(0.22, 4500, 3.5, 0.08, t + 0.28);
  },

  _spell_hero2Special1() {
    const t = this.ctx?.currentTime ?? 0;
    // Quiet meditative restore — soft descending tone
    [1319, 1047, 784, 659].forEach((f, i) =>
      this._tone(f, 0.52, 'sine', 0.14, 0.012, 0.46, t + i * 0.12)
    );
    this._tone(523, 0.70, 'sine', 0.12, 0.015, 0.64, t + 0.50);
  },

  _spell_mend() {
    const t = this.ctx?.currentTime ?? 0;
    [523, 659, 784].forEach((f, i) =>
      this._tone(f, 0.52, 'sine', 0.20, 0.010, 0.46, t + i * 0.09)
    );
  },

  _spell_heal() {
    const t = this.ctx?.currentTime ?? 0;
    [523, 659, 784, 1047].forEach((f, i) =>
      this._tone(f, 0.56, 'sine', 0.22, 0.010, 0.50, t + i * 0.08)
    );
    this._tone(2093, 0.42, 'sine', 0.10, 0.010, 0.36, t + 0.32);
  },

  _spell_guard() {
    const t = this.ctx?.currentTime ?? 0;
    this._tone(200, 0.30, 'square', 0.14, 0.020, 0.25, t);
    this._sweep(300, 750, 0.34, 'sine', 0.20, t);
    this._noise(0.22, 3800, 3.0, 0.08, t + 0.12);
  },

  _spell_awaken() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(110, 1320, 0.62, 'sine', 0.22, t);
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._tone(f, 0.66, 'sine', 0.18, 0.010, 0.60, t + 0.36 + i * 0.07)
    );
  },

  // ── Items ─────────────────────────────────────────────────────────────

  _item_heal() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.20, 1100, 2.0, 0.14, t);
    [523, 659].forEach((f, i) =>
      this._tone(f, 0.48, 'sine', 0.18, 0.010, 0.42, t + i * 0.10)
    );
  },

  _item_mp() {
    const t = this.ctx?.currentTime ?? 0;
    [1047, 1319, 1568].forEach((f, i) =>
      this._tone(f, 0.40, 'sine', 0.16, 0.005, 0.34, t + i * 0.06)
    );
  },

  _item_revive()       { this._spell_awaken(); },
  _item_cure_status() {
    const t = this.ctx?.currentTime ?? 0;
    [880, 1108].forEach((f, i) =>
      this._tone(f, 0.40, 'sine', 0.16, 0.008, 0.34, t + i * 0.10)
    );
  },

  // ── Battle events ─────────────────────────────────────────────────────

  _enemy_defeated() {
    const t = this.ctx?.currentTime ?? 0;
    [330, 247, 185, 147].forEach((f, i) =>
      this._tone(f, 0.17, 'square', 0.14, 0.005, 0.14, t + i * 0.08)
    );
  },

  _level_up() {
    const t = this.ctx?.currentTime ?? 0;
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._tone(f, 0.20, 'square', 0.20, 0.010, 0.18, t + i * 0.09)
    );
    this._tone(1319, 0.52, 'sine', 0.20, 0.010, 0.46, t + 0.46);
  },

  _secret_passage() {
    const t = this.ctx?.currentTime ?? 0;
    // Shimmering rising pentatonic sparkle: C5-E5-G5-B5-D6
    [523, 659, 784, 988, 1175].forEach((f, i) =>
      this._tone(f, 0.14, 'sine', 0.16, 0.005, 0.12, t + i * 0.06)
    );
    // Soft trailing shimmer
    this._tone(1568, 0.28, 'sine', 0.10, 0.008, 0.26, t + 0.34);
  },

  _item_found() {
    const t = this.ctx?.currentTime ?? 0;
    [523, 659, 784, 1047].forEach((f, i) =>
      this._tone(f, 0.12, 'sine', 0.18, 0.005, 0.10, t + i * 0.07)
    );
    this._tone(1319, 0.22, 'sine', 0.20, 0.005, 0.18, t + 0.30);
  },

  _run_success() {
    const t = this.ctx?.currentTime ?? 0;
    [392, 523, 659, 784].forEach((f, i) =>
      this._tone(f, 0.10, 'square', 0.14, 0.005, 0.08, t + i * 0.055)
    );
  },

  _run_fail() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(440, 220, 0.24, 'square', 0.22, t);
  },

  _party_ko() {
    const t = this.ctx?.currentTime ?? 0;
    [440, 330, 247, 185].forEach((f, i) =>
      this._tone(f, 0.22, 'square', 0.14, 0.008, 0.20, t + i * 0.13)
    );
    this._noise(0.30, 320, 1.0, 0.10, t + 0.10);
  },

  _poison_tick() {
    const t = this.ctx?.currentTime ?? 0;
    this._tone(220, 0.12, 'sine', 0.08, 0.005, 0.10, t);
    this._tone(165, 0.10, 'sine', 0.06, 0.004, 0.08, t + 0.05);
  },

  _battle_intro() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.12, 1300, 1.0, 0.28, t);
    [330, 247, 196].forEach((f, i) =>
      this._tone(f, 0.46, 'square', 0.16, 0.010, 0.42, t + 0.06 + i * 0.02)
    );
  },

  // ── Victory jingle (FF7-inspired fanfare) ────────────────────────────

  _battle_win() {
    const ctx = this.ctx; const sfx = this.sfxGain;
    if (!ctx || !sfx) return;
    const t = ctx.currentTime;

    // Timing: ~326 BPM  →  16th = 0.046 s  (50% shorter than original)
    const s = 0.046;

    // Note frequencies (Bb major)
    const Bb2=116.54, F3=174.61, Bb3=233.08, D4=293.66, F4=349.23,
          G4=392.00, Ab4=415.30, A4=440.00, Bb4=466.16, C5=523.25,
          D5=587.33, Eb5=622.25, F5=698.46, G5=783.99, Bb5=932.33;

    // Melody voice: punchy square wave (brass-like)
    const m = (freq, dur, gain, at) =>
      this._tone(freq, dur * 0.80, 'square', gain, 0.004, dur * 0.18, at);

    // Harmony voice: softer sawtooth a third below
    const h = (freq, dur, gain, at) =>
      this._tone(freq, dur * 0.75, 'sawtooth', gain * 0.45, 0.006, dur * 0.22, at);

    // Bass voice: triangle
    const b = (freq, dur, gain, at) =>
      this._tone(freq, dur * 0.88, 'triangle', gain, 0.010, dur * 0.28, at);

    // ── Part A: Ascending arpeggio fanfare × 2 ─────────────────────
    // First run: Bb3 D4 F4 → Bb4 (held)
    m(Bb3, s,      0.30, t);
    m(D4,  s,      0.30, t + s);
    m(F4,  s,      0.30, t + s * 2);
    m(Bb4, s * 3,  0.35, t + s * 3);
    b(Bb2, s * 5,  0.20, t);
    b(F3,  s * 5,  0.16, t);

    // Short gap then second run: Bb3 D4 F4 → Bb4 (held longer)
    const r2 = t + s * 6.5;
    m(Bb3, s,      0.30, r2);
    m(D4,  s,      0.30, r2 + s);
    m(F4,  s,      0.30, r2 + s * 2);
    m(Bb4, s * 4,  0.36, r2 + s * 3);
    h(G4,  s * 7,  0.20, r2);        // harmony support
    b(Bb2, s * 7,  0.20, r2);

    // ── Part B: Stepping melody (the bouncy celebration section) ────
    const p2 = r2 + s * 7.5;

    // Phrase 1: G4 Ab4 A4 Bb4 stepping up
    m(G4,  s * 2, 0.28, p2);
    m(Ab4, s * 2, 0.28, p2 + s * 2);
    m(A4,  s * 2, 0.28, p2 + s * 4);
    m(Bb4, s * 3, 0.32, p2 + s * 6);
    h(D4,  s * 9, 0.18, p2);
    b(Bb2, s * 9, 0.18, p2);

    // Phrase 2: Ab4 A4 Bb4 C5 stepping up
    const p3 = p2 + s * 9.5;
    m(Ab4, s * 2, 0.27, p3);
    m(A4,  s * 2, 0.27, p3 + s * 2);
    m(Bb4, s * 2, 0.29, p3 + s * 4);
    m(C5,  s * 3, 0.31, p3 + s * 6);
    h(Eb5, s * 9, 0.17, p3);
    b(Bb2, s * 9, 0.18, p3);

    // Phrase 3: Bb4 C5 D5 → F5 resolution
    const p4 = p3 + s * 10;
    m(Bb4, s * 2, 0.29, p4);
    m(C5,  s * 2, 0.30, p4 + s * 2);
    m(D5,  s * 2, 0.32, p4 + s * 4);
    m(F5,  s * 4, 0.34, p4 + s * 6);
    h(D5,  s * 10, 0.18, p4);
    b(F3,  s * 10, 0.20, p4);

    // ── Big ending chord: Bb5 held ──────────────────────────────────
    const end = p4 + s * 10.5;
    m(Bb5, s * 9, 0.36, end);
    h(D5,  s * 9, 0.22, end);
    h(F5,  s * 9, 0.18, end);
    b(Bb2, s * 9, 0.24, end);
    // Sparkle noise burst at top note hit
    this._noise(0.18, 6000, 3.5, 0.10, end);
  },

  // Boss hit-received sounds — scale in weight by boss tier
  _boss_impact_1() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(400, 64, 0.34, 'square', 0.44, t);
    this._noise(0.30, 300, 0.9, 0.38, t);
    this._sweep(180, 40, 0.28, 'sine', 0.32, t + 0.08);
    this._noise(0.22, 180, 0.7, 0.26, t + 0.14);
    this._tone(82, 0.38, 'square', 0.22, 0.015, 0.32, t + 0.18);
  },

  _boss_impact_2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(540, 52, 0.48, 'sawtooth', 0.56, t);
    this._noise(0.16, 4000, 1.6, 0.40, t);
    this._noise(0.36, 340, 0.9, 0.50, t + 0.02);
    this._sweep(230, 34, 0.40, 'square', 0.42, t + 0.10);
    this._noise(0.30, 140, 0.7, 0.38, t + 0.16);
    this._tone(65, 0.48, 'sawtooth', 0.30, 0.012, 0.42, t + 0.22);
  },

  _boss_impact_3() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(620, 38, 0.60, 'sawtooth', 0.66, t);
    this._noise(0.16, 5000, 1.8, 0.50, t);
    this._noise(0.48, 300, 0.8, 0.58, t + 0.04);
    this._sweep(280, 26, 0.50, 'square', 0.54, t + 0.12);
    this._noise(0.40, 128, 0.6, 0.50, t + 0.18);
    this._tone(48, 0.60, 'sawtooth', 0.42, 0.010, 0.54, t + 0.26);
    this._tone(32, 0.54, 'sine', 0.34, 0.020, 0.48, t + 0.36);
    this._noise(0.28, 580, 1.0, 0.32, t + 0.48);
  },

  _boss_intro() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(650, 38, 0.58, 'sawtooth', 0.34, t);
    this._noise(0.46, 420, 0.6, 0.28, t + 0.20);
    [220, 165, 131].forEach((f, i) =>
      this._tone(f, 0.52, 'square', 0.18, 0.020, 0.46, t + 0.40 + i * 0.10)
    );
  },

  // Boss 1 roar: mid-low bestial snarl (square-wave buzz, lion character)
  _boss_roar_1() {
    const t = this.ctx?.currentTime ?? 0;
    this._noise(0.70, 190, 0.50, 0.44, t);
    this._sweep(320, 72, 0.66, 'square', 0.38, t);
    this._sweep(220, 55, 0.56, 'square', 0.30, t + 0.14);
    this._noise(0.48, 420, 0.8, 0.26, t + 0.20);
    [147, 110, 82].forEach((f, i) =>
      this._tone(f, 0.50, 'square', 0.24, 0.010, 0.44, t + 0.28 + i * 0.09)
    );
    this._noise(0.34, 240, 0.5, 0.20, t + 0.48);
  },

  // Boss 2 — Drink Dragon: piercing screech dropping to heavy chest rumble
  _boss_roar_2() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(2800, 100, 0.58, 'sawtooth', 0.32, t);
    this._sweep(1800, 180, 0.46, 'sawtooth', 0.26, t + 0.04);
    this._noise(0.58, 380, 0.60, 0.36, t + 0.06);
    this._sweep(380, 52, 0.58, 'sine', 0.30, t + 0.18);
    this._noise(0.44, 700, 1.0, 0.24, t + 0.30);
    [130, 98, 73].forEach((f, i) =>
      this._tone(f, 0.54, 'sawtooth', 0.24, 0.014, 0.48, t + 0.38 + i * 0.10)
    );
    this._noise(0.30, 280, 0.7, 0.20, t + 0.66);
  },

  // Boss 3 roar: sub-bass oppressive surge — deepest, longest, most overwhelming
  _boss_roar_3() {
    const t = this.ctx?.currentTime ?? 0;
    this._sweep(200, 28, 0.88, 'sawtooth', 0.52, t);
    this._noise(0.76, 200, 0.55, 0.46, t);
    this._sweep(1800, 55, 0.64, 'sawtooth', 0.36, t + 0.06);
    this._noise(0.64, 480, 0.9, 0.36, t + 0.18);
    [88, 66, 52, 41].forEach((f, i) =>
      this._tone(f, 0.66, 'sawtooth', 0.32, 0.014, 0.60, t + 0.30 + i * 0.10)
    );
    this._sweep(520, 44, 0.58, 'square', 0.34, t + 0.48);
    this._noise(0.46, 280, 0.6, 0.28, t + 0.62);
    this._tone(28, 0.54, 'sine', 0.28, 0.020, 0.48, t + 0.72);
  }
};
