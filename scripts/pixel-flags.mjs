/**
 * src/lib/life.ts 의 나라 코드마다 country-flag-icons(MIT) 3:2 SVG 를 15×10 도트 격자로 변환해
 * src/lib/flags.ts 를 생성한다. 칸마다 원본 색상표에서 가장 많이 나온 색을 고르므로 경계가 번지지 않는다.
 * 나라를 추가했으면 `npm run flags` 로 다시 생성한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import * as F from 'country-flag-icons/string/3x2';

const W = 15;
const H = 10;
const K = 8; // 칸 하나를 K×K 픽셀로 렌더링해 표본을 세다
const NAMED = { red: '#FF0000', white: '#FFFFFF', black: '#000000' };

const codes = [...readFileSync('src/lib/life.ts', 'utf8').matchAll(/code: '([A-Z]{2})'/g)].map((m) => m[1]);
const hex = (h) => {
  h = h.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return `#${h.toUpperCase()}`;
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

let out = `/**
 * 15×10 도트 국기. scripts/pixel-flags.mjs 가 생성한다 — 직접 수정하지 않는다.
 * 원본: country-flag-icons(MIT). rows 의 각 글자는 pal 의 인덱스(36진수)다.
 */
export const PIXEL_FLAGS: Record<string, { pal: string[]; rows: string[] }> = {
`;
for (const c of codes) {
  const svg = F[c].replace(/fill="(red|white|black)"/g, (_, n) => `fill="${NAMED[n]}"`);
  const pal = [...new Set(svg.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g).map(hex))].map((h) => [h, rgb(h)]);
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: W * K } }).render();
  const { pixels: d, width: pw, height: ph } = img;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const count = pal.map(() => 0);
      for (let yy = Math.floor((y * ph) / H); yy < Math.floor(((y + 1) * ph) / H); yy++)
        for (let xx = x * K; xx < (x + 1) * K; xx++) {
          const i = (yy * pw + xx) * 4;
          let best = 0;
          let bd = Infinity;
          pal.forEach(([, [r, g, b]], j) => {
            const dd = (r - d[i]) ** 2 + (g - d[i + 1]) ** 2 + (b - d[i + 2]) ** 2;
            if (dd < bd) [bd, best] = [dd, j];
          });
          count[best]++;
        }
      row += count.indexOf(Math.max(...count)).toString(36);
    }
    rows.push(row);
  }
  out += `  ${c}: {\n    pal: [${pal.map(([h]) => `'${h}'`).join(', ')}],\n    rows: [\n${rows.map((r) => `      '${r}',`).join('\n')}\n    ],\n  },\n`;
}
writeFileSync('src/lib/flags.ts', `${out}};\n`);
console.log(`flags.ts: ${codes.length}개 나라`);
