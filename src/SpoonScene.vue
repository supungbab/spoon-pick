<script setup lang="ts">
/**
 * 도트 수저통 장면. metal 이 들어오면 가운데 수저가 위로 튀어 올라 그 재질 색으로 바뀐다.
 * 다시 뽑을 때는 부모가 key 를 바꿔 다시 마운트해 애니메이션을 처음부터 재생한다.
 * 스프라이트는 문자 격자로 그린다: h=하이라이트, m=본색, d=그림자, o=구멍.
 */
import { computed } from 'vue';
import { type Rect, disc, sun } from './lib/scenes';

/** 인생을 하루로 본다: 태어나면 새벽, 나이를 먹을수록 아침·낮·노을, 결산은 밤 */
export type TimeOfDay = 'night' | 'dawn' | 'morning' | 'noon' | 'evening';

const props = defineProps<{
  time: TimeOfDay;
  metal: [string, string, string] | null;
  rare?: boolean;
  /** 태어난 나라의 도트 국기(flags.ts). 수저통 오른쪽 깃대에 단다. */
  flag?: { pal: string[]; rows: string[] };
}>();

const STEEL: [string, string, string] = ['#94B0C2', '#566C86', '#333C57'];
const TIN = { h: '#F4F4F4', m: '#94B0C2', d: '#566C86', o: '#333C57' };

const SPOON = [
  '.mmm.',
  'mhhmd',
  'mhmmd',
  'mmmmd',
  'mmmdd',
  '.mdd.',
  ...Array<string>(12).fill('..m..'),
  '.mmd.',
  '.mdd.',
];

// 24×16 수저통: 윗테두리 → 그림자 → 구멍 뚫린 몸통
const HOLDER = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 24 }, (_, x) => {
    if (y === 0) return x === 0 || x === 23 ? 'm' : 'h';
    if (y === 1) return 'd';
    if (x >= 22 || y === 15) return 'd';
    if (x === 1) return 'h';
    return x % 3 === 2 && y % 3 === 0 && y < 14 && x > 3 && x < 21 ? 'o' : 'm';
  }).join(''),
);

type Px = { x: number; y: number; c: string };

function draw(rows: string[], colors: Record<string, string>, ox = 0, oy = 0): Px[] {
  const out: Px[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = colors[ch];
      if (c) out.push({ x: ox + x, y: oy + y, c });
    }),
  );
  return out;
}

const tones = ([h, m, d]: [string, string, string]) => ({ h, m, d });

// 가운데(뽑히는 수저)를 뺀 나머지 수저의 위치
const others = [
  { x: 11, y: 13 },
  { x: 16, y: 11 },
  { x: 26, y: 12 },
  { x: 31, y: 14 },
].flatMap((p) => draw(SPOON, tones(STEEL), p.x, p.y));

const holder = draw(HOLDER, TIN, 12, 28);
const steelSpoon = draw(SPOON, tones(STEEL), 21, 10);
const flagPx = computed(() => {
  const f = props.flag;
  if (!f) return [];
  return draw(f.rows, Object.fromEntries(f.pal.map((c, i) => [i.toString(36), c])), 41, 0);
});

const metalSpoon = computed(() => (props.metal ? draw(SPOON, tones(props.metal), 21, 10) : []));

// 희귀 수저 주변에서 깜빡이는 반짝이(+ 모양)
const sparkles = [
  { x: 16, y: -1, d: 0 },
  { x: 30, y: 2, d: 0.3 },
  { x: 17, y: 11, d: 0.6 },
  { x: 29, y: 14, d: 0.15 },
];

// 하늘: 위에서부터 [시작 y, 색] 띠. 도트 그림답게 그라데이션 대신 계단식 띠로 칠한다.
const SKY: Record<TimeOfDay, [number, string][]> = {
  night: [[-4, '#29366F']],
  dawn: [
    [-4, '#29366F'],
    [18, '#5D275D'],
    [32, '#B13E53'],
    [39, '#EF7D57'],
  ],
  morning: [
    [-4, '#41A6F6'],
    [26, '#8FD3FF'],
  ],
  noon: [[-4, '#41A6F6']],
  evening: [
    [-4, '#5D275D'],
    [12, '#B13E53'],
    [28, '#EF7D57'],
    [38, '#FFCD75'],
  ],
};
const sky = computed(() =>
  SKY[props.time].map(([y, c], i, all): Rect => [-8, y, 64, (all[i + 1]?.[0] ?? 46) - y, c]),
);

// 해는 오른쪽 아래에서 떠서(아침) 높이 오른 뒤(낮) 왼쪽 지평선으로 진다(노을, 아랫부분은 바닥에 가린다).
const sunRects = computed(() => {
  if (props.time === 'morning') return sun(49, 30);
  if (props.time === 'noon') return sun(4, 4);
  if (props.time === 'evening') return sun(0, 39, '#B13E53', '#EF7D57', '#5D275D');
  return [];
});

// 밤에는 왼쪽 아래 달: 오른쪽 아래 그림자와 분화구
const moon: Rect[] = [...disc(2, 30, 4, '#FFF1B8'), [0, 29, 1, 1, '#FFCD75'], [3, 31, 2, 1, '#FFCD75'], [1, 32, 1, 1, '#FFCD75']];

// 배경 별
const stars: [number, number][] = [
  [-4, 0],
  [3, 14],
  [9, 4],
  [40, 1],
  [46, 18],
  [52, 6],
  [50, 34],
];
</script>

<template>
  <svg
    class="scene"
    :class="{ pulled: metal }"
    viewBox="-8 -4 64 50"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="metal ? '수저통에서 뽑혀 나온 수저' : '수저가 꽂힌 수저통'"
  >
    <defs>
      <clipPath id="above-rim">
        <rect x="-8" y="-4" width="64" height="32" />
      </clipPath>
    </defs>

    <rect v-for="(r, i) in sky" :key="'k' + i" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" :fill="r[4]" />
    <template v-if="time === 'night' || time === 'dawn'">
      <!-- 새벽에는 위쪽 하늘의 별만 남는다 -->
      <rect
        v-for="([x, y], i) in stars.filter(([, y]) => time === 'night' || y < 10)"
        :key="'s' + i"
        :x="x"
        :y="y"
        width="1"
        height="1"
        fill="#3B5DC9"
      />
    </template>
    <template v-if="time === 'night'">
      <rect v-for="(r, i) in moon" :key="'m' + i" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" :fill="r[4]" />
    </template>
    <rect v-for="(r, i) in sunRects" :key="'u' + i" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" :fill="r[4]" />
    <rect x="-8" y="44" width="64" height="2" fill="#333C57" />
    <rect x="-8" y="44" width="64" height="1" fill="#566C86" />

    <rect v-for="(p, i) in others" :key="'o' + i" :x="p.x" :y="p.y" width="1" height="1" :fill="p.c" />
    <rect v-for="(p, i) in holder" :key="'h' + i" :x="p.x" :y="p.y" width="1" height="1" :fill="p.c" />

    <g clip-path="url(#above-rim)">
      <g class="lift">
        <g class="bob">
          <rect v-for="(p, i) in steelSpoon" :key="'a' + i" :x="p.x" :y="p.y" width="1" height="1" :fill="p.c" />
          <g class="metal">
            <rect v-for="(p, i) in metalSpoon" :key="'b' + i" :x="p.x" :y="p.y" width="1" height="1" :fill="p.c" />
          </g>
        </g>
      </g>
    </g>

    <g v-if="flagPx.length" class="flag">
      <rect x="40" y="-1" width="1" height="45" fill="#94B0C2" />
      <rect x="39" y="-2" width="3" height="1" fill="#FFCD75" />
      <rect v-for="(p, i) in flagPx" :key="'f' + i" :x="p.x" :y="p.y" width="1" height="1" :fill="p.c" />
    </g>

    <g v-if="metal && rare" class="sparkles" fill="#FFF1B8">
      <g v-for="(s, i) in sparkles" :key="i" :style="{ animationDelay: `${0.9 + s.d}s` }">
        <rect :x="s.x" :y="s.y - 1" width="1" height="3" />
        <rect :x="s.x - 1" :y="s.y" width="3" height="1" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.scene {
  display: block;
  width: 100%;
  height: auto;
}

.metal,
.sparkles g {
  opacity: 0;
}
.flag {
  animation: raise 0.5s 0.9s steps(5, end) both;
}
@keyframes raise {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  1% {
    opacity: 1;
  }
}

/* 픽셀 단위로 끊어서 올라온다 */
.pulled .lift {
  animation: pull 0.6s steps(9, end) both;
}
.pulled .bob {
  animation: bob 1.2s 0.9s steps(2, jump-none) infinite;
}
.pulled .metal {
  animation: on 0s 0.6s both;
}
.sparkles g {
  animation: blink 0.8s steps(1, end) infinite;
}

@keyframes pull {
  to {
    transform: translateY(-12px);
  }
}
@keyframes bob {
  50% {
    transform: translateY(-1px);
  }
}
@keyframes on {
  to {
    opacity: 1;
  }
}
@keyframes blink {
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulled .lift {
    animation: none;
    transform: translateY(-12px);
  }
  .pulled .bob,
  .sparkles g {
    animation: none;
  }
  .pulled .metal,
  .sparkles g {
    animation: none;
    opacity: 1;
  }
}
</style>
