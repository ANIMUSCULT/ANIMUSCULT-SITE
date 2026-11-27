// OUIJA CAT MUSIC MACHINE — skins.
// Every skin does the same job. Positions are in image pixels (all images 2000 x 1120).
// Panel kinds:
//   matrix  dot-matrix LED panel (spectrum, runes, title, VU; it cycles)
//   list    song list in red pixel type
//   rays    radial light rays from a centre point (cx, cy)
//   runes   a row of runes that light up in step with the beat
//   text    small display: scrolling title / time
// eyes: the cat's eyes (glow on the beat; click = cat)
// play: the round button that plays / pauses
window.OC_SKINS = [
  {
    // A moving skin: Eva's film of the V1 console with a hologram player in front of the cat.
    // The film plays once from the start, then loops from loopFrom (after the player has appeared).
    // The buttons in the film are live: each `hots` entry is a click area with an action.
    id: 'hologram', name: 'HOLOGRAM', video: 'assets/machine/skins/hologram.mp4', videoLite: 'assets/machine/skins/hologram-lite.mp4',
    img: 'assets/machine/skins/hologram-poster.webp', loopFrom: 3.7,
    panels: [
      { kind: 'matrix', x: 352, y: 0, w: 118, h: 200, pitch: 22, mode: 'vu' },
      { kind: 'matrix', x: 1398, y: 0, w: 235, h: 200, pitch: 22 },
      { kind: 'matrix', x: 360, y: 612, w: 240, h: 248, pitch: 22 },
      { kind: 'matrix', x: 1392, y: 617, w: 240, h: 243, pitch: 22 },
    ],
    eyes: [ { x: 984, y: 516, r: 30 }, { x: 734, y: 719, r: 40 }, { x: 1180, y: 719, r: 40 } ],
    hots: [
      { x: 992, y: 914, r: 62, act: 'toggle', label: 'Play or pause' },
      { x: 852, y: 914, r: 42, act: 'prev', label: 'Previous' },
      { x: 1128, y: 914, r: 42, act: 'next', label: 'Next' },
      { x: 683, y: 912, r: 42, act: 'shuffle', label: 'Shuffle' },
      { x: 1289, y: 912, r: 42, act: 'repeat', label: 'Repeat' },
      { x: 662, y: 628, r: 46, act: 'play', label: 'Play' },
      { x: 981, y: 628, r: 46, act: 'pause', label: 'Pause' },
      { x: 786, y: 628, r: 36, act: 'prev', label: 'Previous' },
      { x: 1162, y: 628, r: 38, act: 'next', label: 'Next' },
      { x: 1308, y: 628, r: 36, act: 'skin', label: 'Change skin' },
      { x: 984, y: 508, r: 46, act: 'cat', label: 'Cat' },
    ],
    seek: { x: 630, y: 714, w: 700, h: 40 },
  },
  {
    // moving skin, view only (no live buttons). A soft red glow pulses on the beat.
    id: 'device-1', name: 'DEVICE I', video: 'assets/machine/skins/device-1.mp4', videoLite: 'assets/machine/skins/device-1-lite.mp4',
    img: 'assets/machine/skins/device-1-poster.webp', loopFrom: 3.5, pulse: true, panels: [], eyes: [],
  },
  {
    // moving skin, view only (no live buttons). A soft red glow pulses on the beat.
    id: 'device-2', name: 'DEVICE II', video: 'assets/machine/skins/device-2.mp4', videoLite: 'assets/machine/skins/device-2-lite.mp4',
    img: 'assets/machine/skins/device-2-poster.webp', loopFrom: 3.5, pulse: true, panels: [], eyes: [],
  },
  {
    // moving skin, view only (no live buttons). A soft red glow pulses on the beat.
    id: 'device-3', name: 'DEVICE III', video: 'assets/machine/skins/device-3.mp4', videoLite: 'assets/machine/skins/device-3-lite.mp4',
    img: 'assets/machine/skins/device-3-poster.webp', loopFrom: 3.5, pulse: true, panels: [], eyes: [],
  },
  {
    // moving skin, view only (no live buttons). A soft red glow pulses on the beat.
    id: 'device-4', name: 'DEVICE IV', video: 'assets/machine/skins/device-4.mp4', videoLite: 'assets/machine/skins/device-4-lite.mp4',
    img: 'assets/machine/skins/device-4-poster.webp', loopFrom: 0, pulse: true, panels: [], eyes: [],
  },
  {
    id: 'rune-gate', name: 'RUNE GATE', img: 'assets/machine/skins/rune-gate.webp',
    panels: [
      { kind: 'rays', x: 575, y: 145, w: 850, h: 655, cx: 1000, cy: 470 },
      { kind: 'runes', x: 670, y: 92, w: 650, h: 52 },
      { kind: 'runes', x: 670, y: 800, w: 660, h: 50 },
      { kind: 'list', x: 1550, y: 300, w: 350, h: 236 },
      { kind: 'matrix', x: 1580, y: 560, w: 60, h: 90, pitch: 10, mode: 'vu' },
      { kind: 'matrix', x: 1785, y: 560, w: 60, h: 90, pitch: 10, mode: 'vu' },
    ],
    eyes: [ { x: 1012, y: 485, r: 34 }, { x: 900, y: 577, r: 40 }, { x: 1125, y: 577, r: 40 } ],
    play: { x: 1010, y: 930, r: 78 },
  },
  {
    id: 'v1', name: 'OUIJA CAT V1', img: 'assets/machine/skins/v1.webp',
    panels: [
      { kind: 'matrix', x: 345, y: 0, w: 250, h: 200, pitch: 22 },
      { kind: 'matrix', x: 1390, y: 0, w: 255, h: 200, pitch: 22 },
      { kind: 'matrix', x: 345, y: 610, w: 255, h: 250, pitch: 22 },
      { kind: 'matrix', x: 1385, y: 610, w: 255, h: 250, pitch: 22 },
      { kind: 'matrix', x: 350, y: 1035, w: 250, h: 85, pitch: 11, mode: 'title' },
      { kind: 'matrix', x: 1385, y: 1035, w: 255, h: 85, pitch: 11, mode: 'time' },
      { kind: 'runes', x: 720, y: 225, w: 500, h: 90 },
    ],
    eyes: [ { x: 955, y: 528, r: 50 }, { x: 740, y: 705, r: 62 }, { x: 1162, y: 705, r: 62 } ],
  },
  {
    id: 'mirror-coven', name: 'MIRROR COVEN', img: 'assets/machine/skins/mirror-coven.webp',
    panels: [
      { kind: 'matrix', x: 335, y: 885, w: 300, h: 110, pitch: 8, mode: 'title' },
      { kind: 'matrix', x: 1400, y: 885, w: 280, h: 110, pitch: 8, mode: 'time' },
      { kind: 'matrix', x: 880, y: 0, w: 240, h: 72, pitch: 9, mode: 'spectrum' },
    ],
    eyes: [ { x: 1000, y: 395, r: 48 }, { x: 815, y: 545, r: 56 }, { x: 1185, y: 545, r: 56 } ],
  },
  {
    id: 'rune-grid', name: 'RUNE GRID', img: 'assets/machine/skins/rune-grid.webp',
    panels: [
      { kind: 'matrix', x: 50, y: 55, w: 475, h: 400, pitch: 19 },
      { kind: 'matrix', x: 1475, y: 55, w: 470, h: 400, pitch: 19 },
      { kind: 'matrix', x: 40, y: 850, w: 480, h: 270, pitch: 19, mode: 'title' },
      { kind: 'matrix', x: 1490, y: 850, w: 470, h: 270, pitch: 19, mode: 'spectrum' },
      { kind: 'matrix', x: 840, y: 990, w: 320, h: 130, pitch: 16, mode: 'vu' },
    ],
    eyes: [ { x: 980, y: 445, r: 44 }, { x: 830, y: 595, r: 44 }, { x: 1140, y: 592, r: 44 } ],
    lamps: [ { x: 115, y: 545, r: 32 }, { x: 432, y: 545, r: 32 }, { x: 1560, y: 545, r: 32 }, { x: 1870, y: 545, r: 32 } ],
  },
];
