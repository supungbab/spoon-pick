import { expect, test } from 'vitest';
import { COUNTRIES, FORKS, STAT_MAX, born, choose, formatWon, topPercent } from './life';
import { PIXEL_FLAGS } from './flags';
import { SCENES } from './scenes';

/** 고정 시퀀스 rng */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};

test('태어나기 → 갈림길 3번 → 재산이 유한한 숫자', () => {
  for (let n = 0; n < 500; n++) {
    let life = born();
    for (const s of Object.values(life.stats)) expect(s).toBeLessThanOrEqual(STAT_MAX);
    for (const fork of FORKS) {
      const choice = fork.choices[n % fork.choices.length]!;
      life = choose(life, fork, choice).life;
    }
    expect(Number.isFinite(life.wealth)).toBe(true);
    expect(life.income).toBeGreaterThan(0);
  }
});

test('물려받는 재산은 나라와 무관하게 수저로만 정해진다', () => {
  for (let n = 0; n < 200; n++) {
    const life = born();
    expect(life.wealth).toBe(life.spoon.inherit);
  }
});

test('성공·실패는 chance 기준으로 정해진다', () => {
  const life = born(seq(0));
  const fork = FORKS[2]!;
  const coin = fork.choices[3]!;
  expect(choose(life, fork, coin, seq(0)).won).toBe(true);
  expect(choose(life, fork, coin, seq(0.99)).won).toBe(false);
});

test('상위 % 는 재산이 많을수록 작다', () => {
  expect(topPercent(25000)).toBeCloseTo(50, 0);
  expect(topPercent(1000000)).toBeLessThan(topPercent(10000));
  expect(topPercent(-5)).toBe(99.9);
});

test('금액 표기', () => {
  expect(formatWon(123400)).toBe('12억 3,400만원');
  expect(formatWon(5000)).toBe('5,000만원');
  expect(formatWon(0)).toBe('0원');
  expect(formatWon(-3000)).toBe('-3,000만원');
});

test('모든 나라에 도트 국기가, 모든 선택지에 장면이 있다', () => {
  for (const c of COUNTRIES) expect(PIXEL_FLAGS[c.code], c.name).toBeDefined();
  for (const f of FORKS) for (const ch of f.choices) expect(SCENES[ch.label], ch.label).toBeDefined();
});

test('건물 안의 창문·줄무늬가 건물 오른쪽 그림자 열을 덮지 않는다', () => {
  for (const [label, scene] of Object.entries(SCENES))
    for (const won of [true, false]) {
      const rects = scene(won);
      rects.forEach(([bx, by, bw, bh], i) => {
        if (bw < 3 || bh < 3) return;
        for (const [x, y, w, h] of rects.slice(i + 1)) {
          const inside = x >= bx && y >= by && x + w <= bx + bw && y + h <= by + bh;
          if (inside) expect(x + w, `${label} ${won ? '성공' : '실패'} [${x},${y},${w},${h}]`).toBeLessThan(bx + bw);
        }
      });
    }
});
