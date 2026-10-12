/**
 * 갈림길 선택지마다의 도트 장면. 좌표는 장면 격자(가로 -8~56, 세로 -4~46) 기준이다.
 * 하늘·땅·날씨는 ChoiceScene 이 그리고, 여기서는 선택지별 소품만 [x, y, w, h, 색] 사각형으로 반환한다.
 */

export type Rect = [x: number, y: number, w: number, h: number, color: string];

const C = {
  night: '#1A1C2C',
  plum: '#5D275D',
  red: '#B13E53',
  orange: '#EF7D57',
  yellow: '#FFCD75',
  lime: '#A7F070',
  green: '#38B764',
  navy: '#29366F',
  blue: '#3B5DC9',
  sky: '#41A6F6',
  cyan: '#73EFF7',
  white: '#F4F4F4',
  steel: '#94B0C2',
  slate: '#566C86',
  dusk: '#333C57',
  wood: '#8A5A3A',
  pink: '#F4A6B8',
};

/** k>0 이면 흰색 쪽으로, k<0 이면 밤색 쪽으로 섞는다(0~1). 하이라이트·그림자 도트 색을 만든다. */
export function tone(hex: string, k: number): string {
  const to = k > 0 ? [0xf4, 0xf4, 0xf4] : [0x1a, 0x1c, 0x2c];
  const a = Math.abs(k);
  const ch = [1, 3, 5].map((i, j) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - a) + to[j]! * a));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 빛이 왼쪽 위에서 온다고 보고, 3×3 이상인 덩어리마다 윗줄은 밝게·오른쪽 열과 아랫줄은 어둡게 한 칸씩 찍는다.
 * 각 덩어리 바로 뒤에 넣어야 나중에 그린 소품이 그 위를 덮는다.
 */
export function shaded(rects: Rect[]): Rect[] {
  return rects.flatMap(([x, y, w, h, c]): Rect[] =>
    w >= 3 && h >= 3
      ? [
          [x, y, w, h, c],
          [x, y, w, 1, tone(c, 0.35)],
          [x + w - 1, y, 1, h, tone(c, -0.3)],
          [x, y + h - 1, w, 1, tone(c, -0.3)],
        ]
      : [[x, y, w, h, c]],
  );
}

/** 가로 cols × 세로 rows 개의 2×2 창문 */
function windows(x: number, y: number, cols: number, rows: number, gapX: number, gapY: number, c: string): Rect[] {
  const out: Rect[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push([x + i * gapX, y + j * gapY, 2, 2, c]);
  return out;
}

/** 계단식 원. 오른쪽 가장자리·아랫줄에 그림자, 왼쪽 위에 반사광 도트를 찍는다. */
export function disc(cx: number, cy: number, r: number, c: string): Rect[] {
  const out: Rect[] = [];
  const dark = tone(c, -0.3);
  for (let y = -r; y < r; y++) {
    const w = Math.round(Math.sqrt(r * r - (y + 0.5) ** 2));
    out.push([cx - w, cy + y, w * 2, 1, y === r - 1 ? dark : c]);
    if (w > 1 && y < r - 1) out.push([cx + w - 1, cy + y, 1, 1, dark]);
  }
  if (r >= 3) {
    const hl = tone(c, 0.5);
    const o = Math.round(r / 2);
    out.push([cx - o, cy - o, 2, 1, hl], [cx - o, cy - o + 1, 1, 1, hl]);
  }
  return out;
}

// 해 몸통: 중심 기준 [dx, dy, 너비] 줄 단위 9×9 원
const SUN_BODY = [
  [-2, -4, 5],
  [-3, -3, 7],
  [-4, -2, 9],
  [-4, -1, 9],
  [-4, 0, 9],
  [-4, 1, 9],
  [-4, 2, 9],
  [-3, 3, 7],
  [-2, 4, 5],
] as const;
// 광선: 몸통에 붙은 쪽은 3칸, 끝은 1칸으로 가늘어진다. 대각선은 두 칸 굵기에서 한 칸으로.
const SUN_RAYS = [
  [-1, -5, 3, 1], [0, -7, 1, 2],
  [-1, 5, 3, 1], [0, 6, 1, 2],
  [-5, -1, 1, 3], [-7, 0, 2, 1],
  [5, -1, 1, 3], [6, 0, 2, 1],
  [3, -4, 1, 1], [4, -3, 1, 1], [4, -4, 1, 1], [5, -5, 1, 1],
  [-3, -4, 1, 1], [-4, -3, 1, 1], [-4, -4, 1, 1], [-5, -5, 1, 1],
  [3, 4, 1, 1], [4, 3, 1, 1], [4, 4, 1, 1], [5, 5, 1, 1],
  [-3, 4, 1, 1], [-4, 3, 1, 1], [-4, 4, 1, 1], [-5, 5, 1, 1],
] as const;

/** 뾰족한 광선이 달린 도트 해. 왼쪽 위 반사광, 오른쪽 아래 그림자. 노을 해는 색을 바꿔 쓴다. */
export function sun(cx: number, cy: number, body = '#FFCD75', light = '#FFF1B8', dark = '#EF7D57'): Rect[] {
  return [
    ...SUN_RAYS.map(([dx, dy, w, h]): Rect => [cx + dx, cy + dy, w, h, body]),
    ...SUN_BODY.map(([dx, dy, w]): Rect => [cx + dx, cy + dy, w, 1, body]),
    [cx - 2, cy - 3, 2, 1, light],
    [cx - 3, cy - 2, 2, 1, light],
    [cx - 3, cy - 1, 1, 1, light],
    [cx + 4, cy - 1, 1, 4, dark],
    [cx + 3, cy + 3, 1, 1, dark],
    [cx - 1, cy + 4, 4, 1, dark],
  ];
}

/** 위(up) 또는 아래를 가리키는 계단식 화살표 */
function arrow(x: number, y: number, up: boolean, c: string): Rect[] {
  const head: Rect[] = [0, 1, 2, 3].map((i) => [x - i, up ? y + i : y + 9 - i, 2 + i * 2, 1, c]);
  return [...head, [x, up ? y + 4 : y, 2, 6, c]];
}

const univ = (won: boolean): Rect[] => [
  [20, 12, 8, 2, C.red],
  [16, 14, 16, 2, C.red],
  [12, 16, 24, 2, C.red],
  [8, 18, 32, 2, C.red],
  [6, 20, 36, 18, C.white],
  ...[9, 16, 23, 30, 37].map((x): Rect => [x, 22, 3, 14, C.steel]),
  [21, 30, 6, 8, C.plum],
  [4, 36, 40, 2, C.steel],
  ...(won
    ? ([
        [20, 2, 10, 2, C.night],
        [22, 4, 6, 3, C.night],
        [29, 4, 1, 4, C.yellow],
      ] as Rect[])
    : []),
];

const job = (won: boolean): Rect[] => [
  [14, 4, 20, 34, C.slate],
  ...windows(17, 7, 4, 7, 4, 4, won ? C.yellow : C.navy),
  [22, 33, 4, 5, C.night],
  [36, 18, 12, 20, C.dusk],
  ...windows(38, 21, 3, 4, 3, 4, won ? C.yellow : C.navy),
  [0, 24, 10, 14, C.dusk],
  ...windows(2, 27, 2, 3, 4, 4, C.navy),
];

const startup = (won: boolean): Rect[] =>
  won
    ? [
        [23, 0, 2, 2, C.red],
        [22, 2, 4, 2, C.red],
        [21, 4, 6, 20, C.white],
        [22, 8, 4, 4, C.sky],
        [18, 18, 3, 6, C.red],
        [27, 18, 3, 6, C.red],
        [22, 24, 4, 3, C.orange],
        [23, 27, 2, 4, C.yellow],
        [14, 36, 20, 2, C.slate],
      ]
    : [
        [10, 32, 18, 6, C.white],
        [28, 33, 3, 4, C.red],
        [14, 33, 3, 3, C.sky],
        [8, 30, 3, 3, C.red],
        [8, 37, 3, 2, C.red],
        ...disc(32, 28, 3, C.steel),
        ...disc(36, 22, 4, C.slate),
        ...disc(41, 15, 3, C.steel),
      ];

const stay = (won: boolean): Rect[] => [
  [6, 28, 32, 2, C.wood],
  [8, 30, 2, 8, C.wood],
  [34, 30, 2, 8, C.wood],
  [16, 16, 14, 10, C.night],
  [17, 17, 12, 8, won ? C.sky : C.slate],
  [22, 26, 2, 2, C.night],
  [40, 22, 6, 2, C.plum],
  [40, 24, 2, 14, C.plum],
  ...(won
    ? ([
        [21, 6, 4, 4, C.yellow],
        [19, 8, 8, 1, C.yellow],
        [22, 4, 2, 2, C.yellow],
      ] as Rect[])
    : ([
        [8, 18, 6, 10, C.white],
        [9, 16, 6, 2, C.steel],
      ] as Rect[])),
];

const hop = (won: boolean): Rect[] => [
  [0, 20, 12, 18, C.dusk],
  ...windows(2, 23, 3, 3, 3, 4, C.navy),
  ...(won
    ? ([[34, 12, 16, 26, C.blue], ...windows(37, 15, 4, 5, 3, 4, C.cyan)] as Rect[])
    : ([[34, 22, 14, 16, C.slate], ...windows(36, 25, 3, 3, 4, 4, C.navy), [40, 29, 2, 2, C.night]] as Rect[])),
  [15, 24, 12, 4, won ? C.yellow : C.orange],
  [27, 22, 2, 8, won ? C.yellow : C.orange],
  [29, 23, 2, 6, won ? C.yellow : C.orange],
  [31, 25, 2, 2, won ? C.yellow : C.orange],
];

const store = (x: number, w: number, open: boolean): Rect[] => [
  [x, 20, w, 18, C.white],
  ...Array.from({ length: Math.ceil(w / 4) }, (_, i): Rect => [x + i * 4, 15, Math.min(4, w - i * 4), 5, i % 2 ? C.white : C.red]),
  [x + 2, 24, Math.floor(w / 2) - 2, 8, open ? C.sky : C.steel],
  [x + Math.floor(w / 2) + 2, 25, Math.floor(w / 2) - 4, 13, open ? C.plum : C.steel],
  ...(open ? [] : Array.from({ length: 4 }, (_, i): Rect => [x + 2, 26 + i * 3, w - 4, 1, C.slate])),
];

const shop = (won: boolean): Rect[] =>
  won ? [...store(-6, 12, true), ...store(12, 24, true), ...store(42, 12, true)] : store(10, 28, false);

const deposit = (won: boolean): Rect[] => [
  ...disc(24, 27, 10, C.pink),
  [33, 24, 4, 6, C.pink],
  [35, 26, 1, 2, C.red],
  [14, 34, 3, 4, C.pink],
  [28, 34, 3, 4, C.pink],
  [20, 18, 6, 1, C.night],
  [29, 22, 2, 2, C.night],
  ...(won ? [...disc(23, 10, 4, C.yellow), [22, 8, 2, 4, C.orange] as Rect] : ([[16, 22, 1, 3, C.red], [17, 25, 1, 3, C.red], [16, 28, 1, 3, C.red]] as Rect[])),
];

const apt = (won: boolean): Rect[] => [
  [2, 6, 16, 32, C.white],
  ...Array.from({ length: 10 }, (_, i): Rect => [2, 8 + i * 3, 15, 1, C.steel]),
  [24, 12, 18, 26, C.white],
  ...Array.from({ length: 8 }, (_, i): Rect => [24, 14 + i * 3, 17, 1, C.steel]),
  [2, 6, 15, 1, C.blue],
  [24, 12, 17, 1, C.blue],
  ...arrow(48, 16, won, won ? C.red : C.slate),
];

const stock = (won: boolean): Rect[] => {
  // 한국 증시 관례: 상승은 빨강, 하락은 파랑. 오른쪽 위 해를 가리지 않게 화면을 왼쪽에 둔다.
  const up = won ? C.red : C.blue;
  const ys = won ? [30, 26, 28, 22, 17, 12] : [14, 17, 16, 23, 26, 30];
  return [
    [0, 8, 36, 28, C.night],
    [2, 10, 32, 24, C.dusk],
    ...ys.flatMap((y, i): Rect[] => [
      [6 + i * 5, y - 1, 1, 6, C.steel],
      [5 + i * 5, y, 3, 3, i % 3 === 1 ? (won ? C.blue : C.red) : up],
    ]),
    [15, 36, 6, 2, C.slate],
    [11, 38, 14, 1, C.slate],
  ];
};

const coin = (won: boolean): Rect[] =>
  won
    ? [
        ...disc(22, 22, 9, C.orange),
        ...disc(22, 22, 7, C.yellow),
        [20, 17, 2, 10, C.orange],
        [22, 17, 3, 2, C.orange],
        [22, 21, 3, 2, C.orange],
        [22, 25, 3, 2, C.orange],
        [25, 18, 1, 3, C.orange],
        [25, 22, 1, 3, C.orange],
        [10, 32, 4, 2, C.orange],
        [6, 35, 4, 2, C.yellow],
      ]
    : [
        ...disc(22, 32, 7, C.slate),
        ...disc(22, 32, 5, C.steel),
        [21, 26, 2, 3, C.night],
        [22, 29, 2, 3, C.night],
        [21, 32, 2, 3, C.night],
        [22, 35, 2, 3, C.night],
        ...arrow(40, 8, false, C.blue),
      ];

export const SCENES: Record<string, (won: boolean) => Rect[]> = {
  '명문대 도전': univ,
  '바로 취업': job,
  창업: startup,
  버티기: stay,
  '이직 승부': hop,
  '내 사업': shop,
  예금: deposit,
  부동산: apt,
  주식: stock,
  '코인 몰빵': coin,
};
