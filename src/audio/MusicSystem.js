// Procedural chiptune music via Web Audio API — no external files needed

const SCHEDULE_AHEAD = 0.15;  // seconds to look ahead
const SCHEDULE_INTERVAL = 75; // ms between scheduler runs

// ── Frequency table ───────────────────────────────────────────────────
const FREQ = (() => {
  const t = {};
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  for (let oct = 1; oct <= 7; oct++) {
    names.forEach((name, i) => {
      const midi = (oct + 1) * 12 + i;
      t[`${name}${oct}`] = 440 * Math.pow(2, (midi - 69) / 12);
    });
  }
  // Flat aliases
  for (let oct = 1; oct <= 7; oct++) {
    t[`Bb${oct}`] = t[`A#${oct}`];
    t[`Eb${oct}`] = t[`D#${oct}`];
    t[`Ab${oct}`] = t[`G#${oct}`];
    t[`Db${oct}`] = t[`C#${oct}`];
    t[`Gb${oct}`] = t[`F#${oct}`];
  }
  return t;
})();

// ── Track definitions (8 bars × 16 sixteenth-notes = 128 per voice) ──
const TRACKS = {

  title: { id: 'title', bpm: 72, voices: [
    { wave: 'square', gain: 0.16, sequence: [
      // Bar 1-2
      ['E4',4],['D4',2],['C4',2],['A3',8],
      ['A3',4],['R',4],['E4',4],['D4',4],
      // Bar 3-4
      ['A4',4],['G4',2],['E4',2],['A4',8],
      ['A4',4],['R',4],['E4',8],
      // Bar 5-6
      ['C5',4],['B4',2],['A4',2],['E5',8],
      ['E5',4],['R',4],['D5',4],['C5',4],
      // Bar 7-8
      ['D5',2],['C5',2],['B4',2],['A4',2],['G4',4],['A4',4],
      ['A4',12],['R',4]
    ]},
    { wave: 'triangle', gain: 0.22, sequence: [
      ['A2',4],['E3',4],['A2',4],['E3',4],  // bar 1
      ['A2',4],['E3',4],['A2',4],['E3',4],  // bar 2
      ['A2',4],['E3',4],['A2',4],['E3',4],  // bar 3
      ['A2',4],['E3',4],['A2',4],['E3',4],  // bar 4
      ['F2',4],['C3',4],['F2',4],['C3',4],  // bar 5
      ['F2',4],['C3',4],['F2',4],['C3',4],  // bar 6
      ['G2',4],['D3',4],['G2',4],['D3',4],  // bar 7
      ['A2',16]                               // bar 8
    ]}
  ]},

  overworld: { id: 'overworld', bpm: 120, voices: [
    { wave: 'square', gain: 0.15, sequence: [
      ['G4',4],['E4',2],['G4',2],['A4',4],['G4',4],
      ['C5',4],['B4',2],['A4',2],['G4',8],
      ['E4',4],['G4',2],['A4',2],['B4',4],['A4',4],
      ['G4',4],['E4',2],['C4',2],['C4',8],
      ['A4',4],['B4',2],['C5',2],['D5',4],['C5',4],
      ['E5',4],['D5',2],['C5',2],['B4',8],
      ['C5',4],['B4',2],['A4',2],['G4',4],['E4',4],
      ['C4',12],['R',4]
    ]},
    { wave: 'triangle', gain: 0.20, sequence: [
      ['C3',4],['G3',4],['C3',4],['G3',4],
      ['C3',4],['G3',4],['C3',4],['G3',4],
      ['F3',4],['C3',4],['F3',4],['C3',4],
      ['F3',4],['G3',4],['F3',4],['G3',4],
      ['A2',4],['E3',4],['A2',4],['E3',4],
      ['A2',4],['E3',4],['A2',4],['E3',4],
      ['G2',4],['D3',4],['G2',4],['D3',4],
      ['C3',16]
    ]}
  ]},

  town: { id: 'town', bpm: 100, voices: [
    { wave: 'square', gain: 0.14, sequence: [
      ['F4',4],['G4',2],['A4',2],['G4',4],['F4',4],
      ['A4',4],['G4',2],['F4',2],['C5',8],
      ['D4',4],['E4',2],['F4',2],['E4',4],['D4',4],
      ['C4',4],['D4',2],['E4',2],['F4',8],
      ['F4',4],['A4',2],['C5',2],['A4',4],['F4',4],
      ['G4',4],['F4',2],['E4',2],['D4',8],
      ['E4',4],['F4',2],['G4',2],['A4',4],['A#4',4],
      ['C5',12],['R',4]
    ]},
    { wave: 'triangle', gain: 0.20, sequence: [
      ['F2',4],['C3',4],['F2',4],['C3',4],
      ['F2',4],['C3',4],['F2',4],['C3',4],
      ['A#2',4],['F3',4],['A#2',4],['F3',4],
      ['F2',4],['C3',4],['F2',4],['C3',4],
      ['F2',4],['C3',4],['A2',4],['E3',4],
      ['G2',4],['D3',4],['G2',4],['D3',4],
      ['C3',4],['G3',4],['C3',4],['G3',4],
      ['F2',16]
    ]}
  ]},

  dungeon: { id: 'dungeon', bpm: 88, voices: [
    { wave: 'square', gain: 0.16, sequence: [
      ['D5',4],['R',4],['F5',4],['E5',4],
      ['D5',6],['C5',2],['D5',8],
      ['A4',4],['R',4],['C5',4],['A#4',4],
      ['A4',8],['R',8],
      ['F4',4],['G4',4],['A4',4],['A#4',4],
      ['A4',6],['G4',2],['F4',4],['E4',4],
      ['F4',4],['R',4],['G4',4],['A4',4],
      ['D4',12],['R',4]
    ]},
    { wave: 'triangle', gain: 0.24, sequence: [
      ['D2',8], ['A2',8],
      ['D2',16],
      ['F2',8], ['C3',8],
      ['D2',16],
      ['A#2',8],['F3',8],
      ['A2',16],
      ['G2',8], ['D3',8],
      ['D2',16]
    ]}
  ]},

  bootcamp: { id: 'bootcamp', bpm: 130, voices: [
    { wave: 'square', gain: 0.16, sequence: [
      // Bar 1 — opening march descent
      ['E5',4],['D5',2],['B4',2],['A4',4],['G4',4],
      // Bar 2 — rising answer
      ['A4',4],['B4',4],['E5',4],['D5',4],
      // Bar 3 — high push
      ['E5',2],['G5',2],['A5',4],['G5',4],['E5',4],
      // Bar 4 — breathe & reset
      ['B4',4],['R',4],['E4',4],['G4',4],
      // Bar 5 — variation phrase
      ['D5',4],['F#5',4],['D5',4],['C5',4],
      // Bar 6 — ascending climb
      ['G4',4],['B4',4],['D5',4],['G5',4],
      // Bar 7 — final build
      ['A4',2],['B4',2],['C5',4],['B4',4],['A4',4],
      // Bar 8 — big resolve
      ['E5',8],['R',4],['E4',4]
    ]},
    { wave: 'triangle', gain: 0.24, sequence: [
      ['E2',4],['E3',4],['E2',4],['B2',4],   // bar 1
      ['A2',4],['E3',4],['A2',4],['E3',4],   // bar 2
      ['E2',4],['B2',4],['A2',4],['E3',4],   // bar 3
      ['B2',4],['R',4],['B2',4],['R',4],     // bar 4
      ['D2',4],['A2',4],['D2',4],['A2',4],   // bar 5
      ['G2',4],['D3',4],['G2',4],['D3',4],   // bar 6
      ['A2',4],['E3',4],['A2',4],['C3',4],   // bar 7
      ['E2',8],['E3',8]                        // bar 8
    ]},
    { wave: 'sawtooth', gain: 0.10, sequence: [
      ['E4',4],['G4',4],['E4',4],['G4',4],   // bar 1
      ['A3',4],['E4',4],['A3',4],['E4',4],   // bar 2
      ['E4',4],['G4',4],['A4',4],['G4',4],   // bar 3
      ['B3',8],['E4',8],                       // bar 4
      ['D4',4],['F#4',4],['D4',4],['F4',4],  // bar 5
      ['G3',4],['D4',4],['G3',4],['D4',4],   // bar 6
      ['A3',4],['C4',4],['E4',4],['A4',4],   // bar 7
      ['E4',4],['G4',4],['E4',8]              // bar 8
    ]}
  ]},

  battle: { id: 'battle', bpm: 170, voices: [
    { wave: 'square', gain: 0.20, sequence: [
      // Bar 1 — charging run down E minor
      ['E5',2],['G5',2],['E5',2],['D5',2],['B4',2],['A4',2],['B4',2],['G4',2],
      // Bar 2 — ascending drive
      ['A4',2],['C5',2],['A4',2],['B4',2],['E4',2],['G4',2],['E4',2],['G4',2],
      // Bar 3 — high run
      ['E5',2],['G5',2],['A5',2],['G5',2],['E5',2],['D5',2],['C5',2],['B4',2],
      // Bar 4 — climax & resolve
      ['E5',2],['G5',2],['E5',2],['B4',2],['D5',2],['B4',2],['G4',2],['R',2],
      // Bar 5 — variation
      ['D5',2],['F5',2],['D5',2],['C5',2],['A4',2],['F4',2],['A4',2],['C5',2],
      // Bar 6 — counter-run
      ['G4',2],['B4',2],['D5',2],['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],
      // Bar 7 — final push
      ['A4',2],['C5',2],['E5',2],['A5',2],['G5',2],['F#5',2],['E5',2],['D5',2],
      // Bar 8 — big close
      ['E5',2],['G5',2],['B5',2],['G5',2],['E5',4],['R',4]
    ]},
    { wave: 'triangle', gain: 0.27, sequence: [
      // Relentless bass ostinato — on-beat E2 with off-beat E3 fill
      ['E2',2],['E3',2],['E2',2],['B3',2],['E2',2],['E3',2],['B2',2],['E3',2],
      ['A2',2],['A3',2],['A2',2],['E3',2],['A2',2],['A3',2],['A2',2],['E3',2],
      ['E2',2],['E3',2],['E2',2],['B3',2],['A2',2],['B2',2],['A2',2],['B2',2],
      ['B2',2],['B3',2],['B2',2],['D3',2],['B2',2],['D3',2],['B2',2],['R',2],
      ['D2',2],['D3',2],['D2',2],['A3',2],['D2',2],['D3',2],['F2',2],['D3',2],
      ['G2',2],['D3',2],['G2',2],['D3',2],['G2',2],['D3',2],['G2',2],['D3',2],
      ['A2',2],['C3',2],['A2',2],['E3',2],['A2',2],['C3',2],['E2',2],['A3',2],
      ['E3',2],['E3',2],['E3',2],['E3',2],['E2',4],['R',4]
    ]},
    { wave: 'sawtooth', gain: 0.12, sequence: [
      // Quarter-note harmony fill — no rests, always moving
      ['E4',4],['G4',4],['E4',4],['G4',4],
      ['A3',4],['E4',4],['A3',4],['E4',4],
      ['E4',4],['G4',4],['A4',4],['B4',4],
      ['B3',4],['D4',4],['B3',4],['D4',4],
      ['D4',4],['F4',4],['D4',4],['F4',4],
      ['G3',4],['D4',4],['G3',4],['D4',4],
      ['A3',4],['C4',4],['E4',4],['G4',4],
      ['E4',4],['G4',4],['E4',8]
    ]}
  ]},

  battle2: { id: 'battle2', bpm: 158, voices: [
    { wave: 'square', gain: 0.18, sequence: [
      // Bar 1 — dark D-minor drive
      ['D5',2],['R',2],['F5',2],['D5',2],['A#4',2],['D5',2],['C5',2],['R',2],
      // Bar 2 — A-minor answer
      ['A4',2],['C5',2],['E5',2],['C5',2],['A4',2],['R',2],['A4',2],['G4',2],
      // Bar 3 — chromatic descent
      ['F5',2],['E5',2],['D5',2],['C5',2],['A#4',2],['A4',2],['G4',2],['F4',2],
      // Bar 4 — held resolve
      ['D5',4],['R',4],['A4',4],['F4',4],
      // Bar 5 — raised tension (Eb)
      ['D#5',2],['R',2],['F5',2],['D#5',2],['C5',2],['D#5',2],['D5',2],['R',2],
      // Bar 6 — counter-phrase
      ['A#4',2],['D5',2],['F5',2],['D5',2],['A#4',2],['R',2],['G4',2],['A4',2],
      // Bar 7 — final climb
      ['A#4',2],['C5',2],['D5',2],['F5',2],['A5',2],['G5',2],['F5',2],['E5',2],
      // Bar 8 — big close
      ['D5',4],['F5',4],['D5',4],['R',4]
    ]},
    { wave: 'triangle', gain: 0.26, sequence: [
      ['D2',2],['D3',2],['D2',2],['F2',2],['D2',2],['D3',2],['A2',2],['D3',2],
      ['A2',2],['A3',2],['A2',2],['E3',2],['A2',2],['A3',2],['C3',2],['E3',2],
      ['F2',2],['C3',2],['F2',2],['C3',2],['F2',2],['A2',2],['F2',2],['C3',2],
      ['D2',4],['A2',4],['D2',4],['A2',4],
      ['D#2',2],['D#3',2],['D#2',2],['A#2',2],['D#2',2],['D#3',2],['G2',2],['A#2',2],
      ['A#2',2],['F3',2],['A#2',2],['F3',2],['A#2',2],['F3',2],['A#2',2],['F3',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['G2',2],['D3',2],['F2',2],['C3',2],
      ['D2',4],['D3',4],['D2',8]
    ]},
    { wave: 'sawtooth', gain: 0.11, sequence: [
      ['D4',4],['F4',4],['A4',4],['F4',4],
      ['A3',4],['E4',4],['A3',4],['E4',4],
      ['F3',4],['C4',4],['F3',4],['C4',4],
      ['D4',8],['A3',8],
      ['D#4',4],['G4',4],['A#4',4],['G4',4],
      ['A#3',4],['F4',4],['A#3',4],['F4',4],
      ['A3',4],['E4',4],['G3',4],['D4',4],
      ['D4',8],['D3',8]
    ]}
  ]},

  // B5 — slightly more intense than B4: faster (168 BPM), D minor, 3 voices
  boss2: { id: 'boss2', bpm: 168, voices: [
    { wave: 'square', gain: 0.18, sequence: [
      // Bar 1 — D minor drive, all 8ths
      ['D5',2],['F5',2],['A5',2],['F5',2],['D5',2],['E5',2],['F5',2],['A5',2],
      // Bar 2 — descending answer
      ['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],['D5',2],['E5',2],['F5',2],
      // Bar 3 — high chromatic run
      ['A5',2],['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],['Bb4',2],['A4',2],
      // Bar 4 — held tension
      ['D5',4],['R',4],['F5',4],['E5',4],
      // Bar 5 — counter-phrase with Bb
      ['Bb4',2],['C5',2],['D5',2],['F5',2],['G5',2],['F5',2],['E5',2],['D5',2],
      // Bar 6 — descending climax
      ['C5',2],['Bb4',2],['A4',2],['G4',2],['A4',2],['C5',2],['E5',2],['A5',2],
      // Bar 7 — ascending to peak
      ['F5',2],['G5',2],['A5',2],['Bb5',2],['A5',2],['G5',2],['F5',2],['E5',2],
      // Bar 8 — bold resolve
      ['D5',4],['A5',4],['D5',8]
    ]},
    { wave: 'triangle', gain: 0.25, sequence: [
      ['D2',2],['D3',2],['D2',2],['A2',2],['D2',2],['D3',2],['F2',2],['D3',2],
      ['G2',2],['D3',2],['G2',2],['D3',2],['C3',2],['G2',2],['C3',2],['G2',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['A2',2],['G2',2],['F2',2],['E2',2],
      ['D2',4],['A2',4],['D2',4],['F2',4],
      ['Bb2',2],['F3',2],['Bb2',2],['F3',2],['C3',2],['G2',2],['C3',2],['G2',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['A2',2],['C3',2],['E3',2],['A3',2],
      ['F2',2],['C3',2],['F2',2],['C3',2],['G2',2],['D3',2],['G2',2],['D3',2],
      ['D2',4],['D3',4],['D2',8]
    ]},
    { wave: 'sawtooth', gain: 0.11, sequence: [
      ['D4',4],['F4',4],['A4',4],['F4',4],
      ['G3',4],['D4',4],['G3',4],['D4',4],
      ['A3',4],['E4',4],['A3',4],['E4',4],
      ['D4',8],['F4',8],
      ['Bb3',4],['F4',4],['Bb3',4],['F4',4],
      ['A3',4],['E4',4],['A3',4],['E4',4],
      ['F3',4],['C4',4],['G3',4],['D4',4],
      ['D4',8],['A3',8]
    ]}
  ]},

  // B6 — most intense: fastest (176 BPM), E minor chromatic, relentless 16ths
  boss3: { id: 'boss3', bpm: 176, voices: [
    { wave: 'square', gain: 0.19, sequence: [
      // Bar 1 — relentless 16th run
      ['E5',2],['F5',2],['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],['B4',2],
      // Bar 2 — rising chromatic tension
      ['A4',2],['B4',2],['C5',2],['D5',2],['Eb5',2],['E5',2],['F5',2],['G5',2],
      // Bar 3 — volatile high run
      ['A5',2],['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],['B4',2],['Bb4',2],
      // Bar 4 — hammered power riff
      ['A4',2],['E5',2],['A4',2],['E5',2],['G4',2],['D5',2],['G4',2],['D5',2],
      // Bar 5 — chromatic descent
      ['F5',2],['E5',2],['Eb5',2],['D5',2],['Db5',2],['C5',2],['B4',2],['Bb4',2],
      // Bar 6 — counter surge
      ['A4',2],['C5',2],['E5',2],['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],
      // Bar 7 — frantic climax
      ['B4',2],['C5',2],['D5',2],['E5',2],['F5',2],['G5',2],['A5',2],['B5',2],
      // Bar 8 — epic close
      ['E5',2],['G5',2],['B5',2],['G5',2],['E5',4],['R',4]
    ]},
    { wave: 'triangle', gain: 0.26, sequence: [
      ['E2',2],['B2',2],['E2',2],['B2',2],['E2',2],['B2',2],['E2',2],['G2',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['A2',2],['E3',2],['A2',2],['E3',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['G2',2],['D3',2],['G2',2],['D3',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['G2',2],['D3',2],['G2',2],['D3',2],
      ['F2',2],['C3',2],['F2',2],['C3',2],['F2',2],['C3',2],['F2',2],['C3',2],
      ['A2',2],['E3',2],['A2',2],['E3',2],['G2',2],['D3',2],['F2',2],['C3',2],
      ['B2',2],['F#3',2],['B2',2],['F#3',2],['B2',2],['G3',2],['B2',2],['G3',2],
      ['E2',4],['E3',4],['E2',8]
    ]},
    { wave: 'sawtooth', gain: 0.12, sequence: [
      ['E4',4],['G4',4],['B4',4],['G4',4],
      ['A3',4],['E4',4],['A3',4],['E4',4],
      ['A3',4],['E4',4],['G3',4],['D4',4],
      ['A3',4],['E4',4],['G3',4],['D4',4],
      ['F3',4],['C4',4],['F3',4],['C4',4],
      ['A3',4],['E4',4],['G3',4],['D4',4],
      ['B3',4],['F#4',4],['B3',4],['G4',4],
      ['E4',8],['E3',8]
    ]}
  ]},

  boss1: { id: 'boss1', bpm: 160, voices: [
    { wave: 'square', gain: 0.17, sequence: [
      ['A4',2],['B4',2],['C5',2],['B4',2],['A4',4],['R',4],
      ['E5',2],['D5',2],['C5',2],['B4',2],['A4',4],['R',4],
      ['F5',2],['E5',2],['D5',2],['C5',2],['B4',4],['R',4],
      ['A5',4],['G5',4],['E5',8],
      ['C5',2],['D5',2],['E5',2],['D5',2],['C5',4],['R',4],
      ['A4',2],['B4',2],['C5',2],['D5',2],['E5',4],['R',4],
      ['F5',2],['G5',2],['A5',2],['G5',2],['F5',2],['E5',2],['D5',2],['C5',2],
      ['A5',6],['R',2],['A5',4],['R',4]
    ]},
    { wave: 'triangle', gain: 0.24, sequence: [
      ['A2',4],['E3',4],['A2',4],['E3',4],
      ['A2',4],['E3',4],['A2',4],['E3',4],
      ['F2',4],['C3',4],['F2',4],['C3',4],
      ['E3',4],['E3',4],['E3',4],['E3',4],
      ['C3',4],['G3',4],['C3',4],['G3',4],
      ['A2',4],['E3',4],['A2',4],['E3',4],
      ['F2',4],['C3',4],['F2',4],['C3',4],
      ['A2',8],['A3',8]
    ]}
  ]},

  celebration: { id: 'celebration', bpm: 136, voices: [
    { wave: 'square', gain: 0.16, sequence: [
      // A — bright ascending fanfare
      ['C5',2],['E5',2],['G5',2],['C6',4],['B5',2],['A5',2],['G5',4],['R',2],
      ['E5',2],['G5',2],['A5',2],['C6',4],['A5',2],['G5',2],['E5',4],['R',2],
      ['D5',2],['F5',2],['A5',2],['D6',4],['C6',2],['A5',2],['F5',4],['R',2],
      ['G5',2],['A5',2],['B5',2],['C6',8],['R',4],
      // B — joyful dance phrase
      ['C5',2],['D5',2],['E5',2],['G5',2],['A5',2],['G5',2],['E5',2],['D5',2],
      ['C5',2],['E5',2],['G5',4],['A5',2],['G5',2],['E5',4],['R',2],
      ['F5',2],['G5',2],['A5',2],['C6',2],['A5',2],['G5',2],['F5',2],['E5',2],
      ['D5',2],['E5',2],['G5',4],['C6',8],['R',4]
    ]},
    { wave: 'triangle', gain: 0.18, sequence: [
      // Bass A
      ['C3',4],['G3',4],['A3',4],['E3',4],
      ['A2',4],['E3',4],['C3',4],['G2',4],
      ['D3',4],['A3',4],['F3',4],['C3',4],
      ['G2',4],['D3',4],['G3',8],
      // Bass B
      ['C3',4],['G2',4],['A2',4],['E3',4],
      ['F2',4],['C3',4],['G2',4],['D3',4],
      ['F2',4],['C3',4],['A2',4],['E3',4],
      ['G2',4],['D3',4],['C3',8],['R',4]
    ]},
    { wave: 'sine', gain: 0.10, sequence: [
      // Harmony fill A
      ['E4',4],['G4',4],['C5',4],['E5',4],
      ['A4',4],['C5',4],['E4',4],['A4',4],
      ['D4',4],['F4',4],['A4',4],['D5',4],
      ['G4',4],['B4',4],['G4',8],
      // Harmony fill B
      ['E4',4],['G4',4],['C5',8],['E5',4],
      ['F4',4],['A4',4],['C5',8],['A4',4],
      ['F4',4],['A4',4],['C5',8],['E4',4],
      ['G4',4],['B4',4],['C5',8],['R',4]
    ]}
  ]},

  gameover: { id: 'gameover', bpm: 52, voices: [
    { wave: 'triangle', gain: 0.18, sequence: [
      // Descending minor lament
      ['A4',8],['G4',4],['R',4],
      ['F4',8],['E4',4],['R',4],
      ['D4',8],['C4',4],['R',4],
      ['A3',12],['R',4],
      ['E4',6],['D4',2],['C4',4],['R',4],
      ['F4',6],['E4',2],['D4',4],['R',4],
      ['C4',6],['B3',2],['A3',4],['R',4],
      ['A3',12],['R',4]
    ]},
    { wave: 'sine', gain: 0.14, sequence: [
      ['A2',8],['R',8],
      ['F2',8],['R',8],
      ['D2',8],['R',8],
      ['A2',16],
      ['C3',8],['R',8],
      ['F2',8],['R',8],
      ['E2',8],['R',8],
      ['A2',16]
    ]},
    { wave: 'square', gain: 0.07, sequence: [
      ['A3',4],['R',4],['E3',4],['R',4],
      ['F3',4],['R',4],['C3',4],['R',4],
      ['D3',4],['R',4],['A2',4],['R',4],
      ['A2',16],
      ['C3',4],['R',4],['G2',4],['R',4],
      ['F3',4],['R',4],['C3',4],['R',4],
      ['E3',4],['R',4],['B2',4],['R',4],
      ['A2',16]
    ]}
  ]}
};

// ── Music System singleton ────────────────────────────────────────────
export const MusicSystem = {
  _ctx: null,
  _masterGain: null,
  _currentTrackId: null,
  _sessionId: 0,
  _scheduleTimer: null,
  _voicePositions: [],
  _voiceNextTimes: [],
  _volume: 0.175,
  _muted: false,
  _visibilityListenerAdded: false,
  _currentTrack: null,

  get currentTrackId() { return this._currentTrackId; },

  get ctx() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this._volume;
        this._masterGain.connect(this._ctx.destination);
      } catch(e) {
        return null;
      }
      if (!this._visibilityListenerAdded) {
        this._visibilityListenerAdded = true;
        const suspend = () => {
          clearTimeout(this._scheduleTimer);
          if (this._ctx) this._ctx.suspend().catch(() => {});
        };
        const resume = () => {
          if (!this._ctx || document.hidden) return;
          this._ctx.resume().catch(() => {});
          if (this._currentTrack) {
            const now = this._ctx.currentTime;
            this._voiceNextTimes = this._voiceNextTimes.map(t => Math.max(t, now + 0.05));
            this._tick(this._currentTrack, this._sessionId);
          }
        };
        document.addEventListener('visibilitychange', () => {
          document.hidden ? suspend() : resume();
        });
        window.addEventListener('blur', suspend);
        window.addEventListener('focus', resume);
        window.addEventListener('pagehide', suspend);
        window.addEventListener('pageshow', resume);
        // Re-suspend if the AudioContext auto-resumes while the screen is still locked
        this._ctx.addEventListener('statechange', () => {
          if (this._ctx && this._ctx.state === 'running' && document.hidden) {
            clearTimeout(this._scheduleTimer);
            this._ctx.suspend().catch(() => {});
          }
        });
      }
    }
    if (this._ctx.state === 'suspended' && !document.hidden) this._ctx.resume().catch(() => {});
    return this._ctx;
  },

  play(trackId) {
    if (!trackId || this._currentTrackId === trackId) return;
    const track = TRACKS[trackId];
    if (!track) return;
    const ctx = this.ctx;
    if (!ctx) return;

    // Fade out old gain node, create fresh one
    clearTimeout(this._scheduleTimer);
    if (this._masterGain) {
      const old = this._masterGain;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      setTimeout(() => { try { old.disconnect(); } catch(e) {} }, 1200);
    }
    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 0;
    this._masterGain.connect(ctx.destination);
    this._masterGain.gain.setTargetAtTime(
      this._muted ? 0 : this._volume,
      ctx.currentTime + 0.12, 0.25
    );

    // Start scheduler for new track
    this._currentTrackId = trackId;
    this._currentTrack = track;
    this._sessionId++;
    const sid = this._sessionId;
    const start = ctx.currentTime + 0.15;
    this._voicePositions = track.voices.map(() => 0);
    this._voiceNextTimes = track.voices.map(() => start);
    this._tick(track, sid);
  },

  stop() {
    clearTimeout(this._scheduleTimer);
    this._sessionId++;
    this._currentTrackId = null;
    this._currentTrack = null;
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(0, this._ctx?.currentTime ?? 0, 0.3);
    }
  },

  forcePlay(trackId) { this._currentTrackId = null; this.play(trackId); },

  getMuted() { return this._muted; },

  toggleMute() {
    this._muted = !this._muted;
    const ctx = this.ctx;
    if (this._masterGain && ctx) {
      this._masterGain.gain.setTargetAtTime(
        this._muted ? 0 : this._volume, ctx.currentTime, 0.1
      );
    }
    return this._muted;
  },

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain && !this._muted) {
      this._masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }
  },

  _tick(track, sid) {
    if (this._sessionId !== sid) return;
    if (document.hidden) return;
    const ctx = this.ctx;
    if (!ctx) return;

    const until = ctx.currentTime + SCHEDULE_AHEAD;
    const sixteenth = 60 / track.bpm / 4;

    for (let vi = 0; vi < track.voices.length; vi++) {
      const voice = track.voices[vi];
      while (this._voiceNextTimes[vi] < until) {
        const idx = this._voicePositions[vi];
        const [note, dur] = voice.sequence[idx];
        const dur_s = dur * sixteenth;
        if (note !== 'R' && FREQ[note]) {
          this._playNote(FREQ[note], this._voiceNextTimes[vi], dur_s, voice);
        }
        this._voiceNextTimes[vi] += dur_s;
        this._voicePositions[vi] = (idx + 1) % voice.sequence.length;
      }
    }

    this._scheduleTimer = setTimeout(() => this._tick(track, sid), SCHEDULE_INTERVAL);
  },

  _playNote(freq, startTime, duration, voice) {
    const ctx = this.ctx;
    if (!ctx || !this._masterGain) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = voice.wave || 'square';
    osc.frequency.value = freq;

    const atk     = 0.008;
    const noteDur = duration * 0.88;
    const rel     = Math.min(0.04, noteDur * 0.12);
    const peak    = voice.gain || 0.18;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + atk);
    gain.gain.setValueAtTime(peak, startTime + noteDur - rel);
    gain.gain.linearRampToValueAtTime(0, startTime + noteDur);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(startTime);
    osc.stop(startTime + noteDur + 0.01);
  }
};
