/**
 * 수저 뽑기 엔진 — 태어나기(랜덤) → 갈림길 3번(선택) → 최종 재산.
 * 금액 단위는 만원(한국 기준). 나라별 소득 배수는 체감용 대략치다.
 * 수저(물려받는 재산)는 어느 나라든 같은 금액이고, 나라는 연봉에만 반영한다.
 * 모든 랜덤은 rng 인자로 주입해 테스트에서 고정할 수 있다.
 */

export type Rng = () => number;

export interface Country {
  name: string;
  /** ISO 3166-1 alpha-2 — 도트 국기(flags.ts)를 찾을 때 쓴다 */
  code: string;
  flag: string;
  /** 한국 대비 소득 배수 — 연봉에만 곱한다 */
  factor: number;
  /** 태어날 가중치(대략 인구 비례) */
  weight: number;
}

export interface Spoon {
  name: string;
  /** 도트 수저의 재질 색 [하이라이트, 본색, 그림자] */
  metal: [string, string, string];
  /** 물려받는 재산(만원) — 나라와 무관하게 같다 */
  inherit: number;
  /** 연봉 배수 */
  incomeMul: number;
  weight: number;
}

export interface Stats {
  smart: number;
  grit: number;
  luck: number;
}

export interface Talent {
  name: string;
  bonus: Partial<Stats>;
}

export interface Life {
  country: Country;
  spoon: Spoon;
  talent: Talent;
  stats: Stats;
  /** 현재 연봉(만원) */
  income: number;
  /** 현재 재산(만원) */
  wealth: number;
}

export const COUNTRIES: Country[] = [
  { name: '대한민국', code: 'KR', flag: '🇰🇷', factor: 1, weight: 5 },
  { name: '미국', code: 'US', flag: '🇺🇸', factor: 1.9, weight: 4 },
  { name: '일본', code: 'JP', flag: '🇯🇵', factor: 0.9, weight: 3 },
  { name: '중국', code: 'CN', flag: '🇨🇳', factor: 0.35, weight: 14 },
  { name: '인도', code: 'IN', flag: '🇮🇳', factor: 0.07, weight: 14 },
  { name: '독일', code: 'DE', flag: '🇩🇪', factor: 1.4, weight: 2 },
  { name: '영국', code: 'GB', flag: '🇬🇧', factor: 1.3, weight: 2 },
  { name: '프랑스', code: 'FR', flag: '🇫🇷', factor: 1.2, weight: 2 },
  { name: '브라질', code: 'BR', flag: '🇧🇷', factor: 0.25, weight: 4 },
  { name: '인도네시아', code: 'ID', flag: '🇮🇩', factor: 0.15, weight: 5 },
  { name: '나이지리아', code: 'NG', flag: '🇳🇬', factor: 0.06, weight: 5 },
  { name: '베트남', code: 'VN', flag: '🇻🇳', factor: 0.12, weight: 3 },
  { name: '멕시코', code: 'MX', flag: '🇲🇽', factor: 0.3, weight: 3 },
  { name: '에티오피아', code: 'ET', flag: '🇪🇹', factor: 0.03, weight: 3 },
  { name: '스위스', code: 'CH', flag: '🇨🇭', factor: 2.3, weight: 1 },
  { name: '싱가포르', code: 'SG', flag: '🇸🇬', factor: 2, weight: 1 },
  { name: '호주', code: 'AU', flag: '🇦🇺', factor: 1.6, weight: 1 },
  { name: '사우디아라비아', code: 'SA', flag: '🇸🇦', factor: 0.9, weight: 1 },
];

export const SPOONS: Spoon[] = [
  { name: '흙수저', metal: ['#C08A5A', '#8A5A3A', '#5A3A26'], inherit: 0, incomeMul: 0.8, weight: 40 },
  { name: '동수저', metal: ['#EF7D57', '#B5562E', '#7A3A1E'], inherit: 3000, incomeMul: 1, weight: 30 },
  { name: '은수저', metal: ['#F4F4F4', '#C2D3DE', '#94B0C2'], inherit: 15000, incomeMul: 1.1, weight: 18 },
  { name: '금수저', metal: ['#FFF1B8', '#FFCD75', '#D9902E'], inherit: 100000, incomeMul: 1.3, weight: 10 },
  { name: '다이아수저', metal: ['#E6FDFF', '#73EFF7', '#41A6F6'], inherit: 1000000, incomeMul: 1.5, weight: 2 },
];

export const TALENTS: Talent[] = [
  { name: '공부머리', bonus: { smart: 2 } },
  { name: '사업 수완', bonus: { grit: 2 } },
  { name: '타고난 운', bonus: { luck: 2 } },
  { name: '끈기', bonus: { smart: 1, grit: 1 } },
  { name: '말솜씨', bonus: { grit: 1, luck: 1 } },
  { name: '눈치', bonus: { smart: 1, luck: 1 } },
  { name: '없음', bonus: {} },
];

/** 능력치 최댓값(기본 0~2 + 재능 보너스 최대 2) */
export const STAT_MAX = 4;

/** 한국 평균 연봉(만원) */
const BASE_INCOME = 3500;
/** 연봉 중 모이는 비율 */
const SAVE_RATE = 0.3;

function pick<T extends { weight: number }>(list: T[], rng: Rng): T {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of list) {
    r -= x.weight;
    if (r < 0) return x;
  }
  return list[list.length - 1]!;
}

export function born(rng: Rng = Math.random): Life {
  const country = pick(COUNTRIES, rng);
  const spoon = pick(SPOONS, rng);
  const talent = TALENTS[Math.floor(rng() * TALENTS.length)]!;
  const base = () => Math.floor(rng() * 3); // 0~2
  const stats: Stats = {
    smart: base() + (talent.bonus.smart ?? 0),
    grit: base() + (talent.bonus.grit ?? 0),
    luck: base() + (talent.bonus.luck ?? 0),
  };
  return {
    country,
    spoon,
    talent,
    stats,
    income: Math.round(BASE_INCOME * country.factor * spoon.incomeMul),
    wealth: spoon.inherit,
  };
}

/** 선택 결과. 배수는 곱하고 addIncomeYears 는 '현재 연봉 × n'만큼 더한다. */
export interface Effect {
  incomeMul?: number;
  wealthMul?: number;
  addIncomeYears?: number;
  text: string;
}

export interface Choice {
  label: string;
  desc: string;
  chance: (s: Stats) => number;
  win: Effect;
  lose: Effect;
}

export interface Fork {
  age: string;
  title: string;
  /** 이 시기에 연봉을 모으는 햇수 */
  years: number;
  choices: Choice[];
}

const clamp = (p: number) => Math.min(0.95, Math.max(0.05, p));

export const FORKS: Fork[] = [
  {
    age: '20대',
    title: '스무 살, 어떤 길로 갈까요?',
    years: 10,
    choices: [
      {
        label: '명문대 도전',
        desc: '붙으면 연봉이 크게 오르고, 떨어지면 시간만 쓴다',
        chance: (s) => clamp(0.25 + s.smart * 0.1),
        win: { incomeMul: 1.6, text: '합격! 좋은 회사에 들어갔다' },
        lose: { incomeMul: 0.9, text: '삼수 끝에 포기했다' },
      },
      {
        label: '바로 취업',
        desc: '무난하게 사회생활 시작',
        chance: () => 0.95,
        win: { incomeMul: 1.1, text: '성실하게 경력을 쌓았다' },
        lose: { incomeMul: 0.9, text: '첫 회사가 망했다' },
      },
      {
        label: '창업',
        desc: '대박 아니면 빚',
        chance: (s) => clamp(0.1 + s.grit * 0.08),
        win: { incomeMul: 3, text: '스타트업이 투자를 받았다' },
        lose: { incomeMul: 0.8, addIncomeYears: -1, text: '폐업하고 빚이 생겼다' },
      },
    ],
  },
  {
    age: '30대',
    title: '서른, 회사에서 승부를 볼까요?',
    years: 15,
    choices: [
      {
        label: '버티기',
        desc: '승진하며 안정적으로',
        chance: () => 0.85,
        win: { incomeMul: 1.3, text: '팀장이 됐다' },
        lose: { incomeMul: 1, text: '만년 과장이다' },
      },
      {
        label: '이직 승부',
        desc: '연봉 점프를 노린다',
        chance: (s) => clamp(0.4 + s.luck * 0.08),
        win: { incomeMul: 1.7, text: '연봉 70% 올려 이직했다' },
        lose: { incomeMul: 0.85, text: '옮긴 회사가 별로였다' },
      },
      {
        label: '내 사업',
        desc: '회사를 나와 사장님으로',
        chance: (s) => clamp(0.15 + s.grit * 0.08),
        win: { incomeMul: 2.5, addIncomeYears: 3, text: '가게가 체인점이 됐다' },
        lose: { incomeMul: 0.7, wealthMul: 0.5, text: '권리금만 날렸다' },
      },
    ],
  },
  {
    age: '40대',
    title: '모은 돈, 어디에 넣을까요?',
    years: 20,
    choices: [
      {
        label: '예금',
        desc: '잃지 않는 게 이기는 것',
        chance: () => 0.99,
        win: { wealthMul: 1.6, text: '이자로 조금씩 불렸다' },
        lose: { wealthMul: 1, text: '은행이 문을 닫았다' },
      },
      {
        label: '부동산',
        desc: '결국 집값은 오른다?',
        chance: (s) => clamp(0.55 + s.smart * 0.05),
        win: { wealthMul: 3, text: '산 동네가 뜨기 시작했다' },
        lose: { wealthMul: 1.1, text: '20년째 그 가격이다' },
      },
      {
        label: '주식',
        desc: '장기투자는 배신하지 않는다',
        chance: (s) => clamp(0.45 + s.smart * 0.05),
        win: { wealthMul: 4, text: '10루타 종목을 잡았다' },
        lose: { wealthMul: 0.7, text: '물타다 물렸다' },
      },
      {
        label: '코인 몰빵',
        desc: '인생은 한 방',
        chance: (s) => clamp(0.08 + s.luck * 0.05),
        win: { wealthMul: 20, text: '떡상! 경제적 자유를 얻었다' },
        lose: { wealthMul: 0.1, text: '상장폐지됐다' },
      },
    ],
  },
];

export interface StepResult {
  won: boolean;
  text: string;
  life: Life;
}

/** 갈림길 하나를 진행한다. 결과를 반영한 뒤 그 시기 동안 연봉을 모은다. */
export function choose(life: Life, fork: Fork, choice: Choice, rng: Rng = Math.random): StepResult {
  const won = rng() < choice.chance(life.stats);
  const e = won ? choice.win : choice.lose;
  const income = Math.round(life.income * (e.incomeMul ?? 1));
  let wealth = life.wealth * (e.wealthMul ?? 1) + income * (e.addIncomeYears ?? 0);
  wealth += income * fork.years * SAVE_RATE;
  return { won, text: e.text, life: { ...life, income, wealth: Math.round(wealth) } };
}

// 한국 가구 순자산 분포를 로그정규로 근사(중앙값 2.5억). 체감용.
const MEDIAN = 25000;
const SIGMA = 1.3;

/** 표준정규 누적분포 근사(Abramowitz-Stegun) */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** 상위 몇 %인지 (0.1 ~ 99.9) */
export function topPercent(wealth: number): number {
  if (wealth <= 0) return 99.9;
  const top = (1 - normCdf(Math.log(wealth / MEDIAN) / SIGMA)) * 100;
  return Math.min(99.9, Math.max(0.1, Math.round(top * 10) / 10));
}

export function titleOf(top: number): string {
  if (top <= 1) return '전설의 재벌';
  if (top <= 5) return '자산가';
  if (top <= 20) return '여유로운 부자';
  if (top <= 50) return '든든한 중산층';
  if (top <= 80) return '평범한 서민';
  return '파란만장 인생';
}

/** 만원 → "12억 3,400만원" */
export function formatWon(manwon: number): string {
  const v = Math.round(manwon);
  if (v <= 0) return v === 0 ? '0원' : `-${formatWon(-v)}`;
  const eok = Math.floor(v / 10000);
  const man = v % 10000;
  const parts: string[] = [];
  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
  return `${parts.join(' ')}원`;
}
