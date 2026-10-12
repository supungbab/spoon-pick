<script setup lang="ts">
/**
 * 갈림길을 고른 뒤의 도트 장면. 선택지별 소품(scenes.ts) 위에 결과에 맞는 날씨를 표시한다.
 * 성공이면 맑은 하늘과 떨어지는 색종이, 실패면 흐린 하늘과 비.
 */
import { computed } from 'vue';
import { SCENES, shaded, sun, tone } from './lib/scenes';

const props = defineProps<{ label: string; won: boolean }>();

const rects = computed(() => shaded(SCENES[props.label]?.(props.won) ?? []));

const ground = computed(() => (props.won ? '#38B764' : '#257179'));
// 잔디 결(어두운 도트)과 위로 솟은 풀잎(밝은 도트)
const tufts = [-6, -1, 5, 11, 18, 27, 33, 40, 46, 52].map((x, i) => [x, 40 + (i % 3) * 2] as const);
const blades = [-4, 3, 9, 16, 30, 37, 44, 50];

const SUN = sun(45, 5);

const confetti = [
  [-4, '#B13E53', 0],
  [6, '#FFCD75', 0.4],
  [14, '#A7F070', 0.9],
  [30, '#73EFF7', 0.2],
  [38, '#EF7D57', 0.7],
  [50, '#F4F4F4', 0.5],
] as const;
const rain = [-5, 1, 7, 13, 19, 25, 31, 37, 43, 49, 54].map((x, i) => [x, (i * 0.37) % 1] as const);
</script>

<template>
  <svg class="scene" viewBox="-8 -4 64 50" shape-rendering="crispEdges" role="img" :aria-label="`${label} 장면`">
    <rect x="-8" y="-4" width="64" height="50" :fill="won ? '#41A6F6' : '#333C57'" />

    <template v-if="won">
      <rect v-for="(r, i) in SUN" :key="'u' + i" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" :fill="r[4]" />
    </template>
    <g v-else>
      <!-- 구름: 밝은 윗면, 어두운 아랫면 -->
      <g fill="#566C86">
        <rect x="-4" y="0" width="16" height="4" />
        <rect x="-2" y="-2" width="10" height="2" />
        <rect x="36" y="2" width="18" height="4" />
        <rect x="40" y="0" width="10" height="2" />
      </g>
      <g fill="#94B0C2">
        <rect x="-2" y="-2" width="10" height="1" />
        <rect x="-4" y="0" width="2" height="1" />
        <rect x="8" y="0" width="4" height="1" />
        <rect x="40" y="0" width="10" height="1" />
        <rect x="36" y="2" width="4" height="1" />
        <rect x="50" y="2" width="4" height="1" />
      </g>
      <g fill="#3F4966">
        <rect x="-4" y="3" width="16" height="1" />
        <rect x="36" y="5" width="18" height="1" />
      </g>
    </g>

    <rect x="-8" y="38" width="64" height="8" :fill="ground" />
    <rect x="-8" y="38" width="64" height="1" :fill="tone(ground, 0.35)" />
    <rect v-for="([x, y], i) in tufts" :key="'t' + i" :x="x" :y="y" width="2" height="1" :fill="tone(ground, -0.3)" />
    <template v-if="won">
      <rect v-for="x in blades" :key="'b' + x" :x="x" y="37" width="1" height="1" fill="#A7F070" />
    </template>
    <template v-else>
      <!-- 빗물 웅덩이 -->
      <rect x="2" y="42" width="6" height="1" fill="#29366F" />
      <rect x="38" y="43" width="7" height="1" fill="#29366F" />
    </template>

    <rect v-for="(r, i) in rects" :key="i" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" :fill="r[4]" />

    <g v-if="won">
      <rect
        v-for="([x, c, d], i) in confetti"
        :key="'c' + i"
        class="fall"
        :x="x"
        y="-4"
        width="2"
        height="1"
        :fill="c"
        :style="{ animationDelay: `${d}s` }"
      />
    </g>
    <g v-else fill="#94B0C2">
      <rect
        v-for="([x, d], i) in rain"
        :key="'r' + i"
        class="rain"
        :x="x"
        y="4"
        width="1"
        height="2"
        :style="{ animationDelay: `${d}s` }"
      />
    </g>
  </svg>
</template>

<style scoped>
.scene {
  display: block;
  width: 100%;
  height: auto;
}

/* 한 칸씩 끊어서 떨어진다 */
.fall {
  animation: fall 2.4s steps(24, end) infinite;
}
.rain {
  animation: rain 0.8s steps(8, end) infinite;
}
@keyframes fall {
  to {
    transform: translateY(44px);
  }
}
@keyframes rain {
  to {
    transform: translateY(34px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fall,
  .rain {
    animation: none;
  }
}
</style>
