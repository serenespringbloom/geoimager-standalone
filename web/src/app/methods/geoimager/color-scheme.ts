// Layout for backend: after .reverse() + list_offset = len-levels-1,
// most-weathered grade → original[len-2], freshest → original[1].
// So original[1..6] = W1(freshest)..W6(most weathered).
export const DEFAULT_COLOR_SCHEME = [
  [0,   0,   0,   255], // [0] padding
  [0,   0,   0,   255], // [1] W1 — freshest  #000000
  [0,   0,   255, 255], // [2] W2             #0000ff
  [0,   204, 0,   255], // [3] W3             #00cc00
  [255, 255, 0,   255], // [4] W4             #ffff00
  [255, 140, 0,   255], // [5] W5             #ff8c00
  [255, 0,   0,   255], // [6] W6 — most weathered #ff0000
  [0,   0,   0,   255], // [7] padding
];
