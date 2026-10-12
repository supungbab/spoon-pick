<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import ChoiceScene from './ChoiceScene.vue';
import SpoonScene, { type TimeOfDay } from './SpoonScene.vue';
import { PIXEL_FLAGS } from './lib/flags';
import {
  type Life,
  type StepResult,
  FORKS,
  STAT_MAX,
  born,
  choose,
  formatWon,
  titleOf,
  topPercent,
} from './lib/life';

type Phase = 'intro' | 'born' | 'fork' | 'outcome' | 'end';

interface Log extends StepResult {
  label: string;
  /** 이 갈림길 직전 재산 — 증감을 표시할 때 쓴다 */
  before: number;
}

const phase = ref<Phase>('intro');
const life = ref<Life | null>(null);
const start = ref(0);
const logs = ref<Log[]>([]);
const rolls = ref(0);
const copied = ref(false);

const step = computed(() => logs.value.length);
const fork = computed(() => FORKS[step.value]);
const last = computed(() => logs.value[logs.value.length - 1]);
const top = computed(() => (life.value ? topPercent(life.value.wealth) : 0));
const rare = computed(() => (life.value?.spoon.inherit ?? 0) >= 100000);
/** 갈림길을 하나 지날 때마다 그 시기 햇수만큼 나이를 먹는다 */
const age = computed(() => {
  if (!life.value) return null;
  if (phase.value === 'born') return 0;
  return 20 + logs.value.reduce((s, _, i) => s + (FORKS[i]?.years ?? 0), 0);
});
/** 인생을 하루로: 태어나기 전·결산은 밤, 태어나면 새벽, 20·30·40대는 아침·낮·노을 */
const time = computed<TimeOfDay>(() => {
  if (phase.value === 'born') return 'dawn';
  // 결과 화면에서는 방금 지난 갈림길이 이미 logs 에 들어가 있다
  const i = phase.value === 'outcome' ? step.value - 1 : step.value;
  if (phase.value === 'fork' || phase.value === 'outcome') return (['morning', 'noon', 'evening'] as const)[i] ?? 'night';
  return 'night';
});
const stats = computed(() =>
  life.value
    ? [
        { name: '머리', v: life.value.stats.smart },
        { name: '근성', v: life.value.stats.grit },
        { name: '운', v: life.value.stats.luck },
      ]
    : [],
);

// 대화창 타자 효과. 대화창을 누르면 남은 글자를 한 번에 표시한다.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// 국기 이모지처럼 여러 코드포인트로 된 글자가 반쪽만 나오지 않도록 글자(grapheme) 단위로 자른다.
const segmenter = new Intl.Segmenter('ko');
const full = ref<string[]>([]);
const shown = ref(0);
const typing = computed(() => shown.value < full.value.length);
let timer: number | undefined;

/** delay 동안은 빈 대화창으로 기다린 뒤 한 글자씩 표시한다. 그동안 typing 은 true 다. */
function say(text: string, delay = 0) {
  full.value = Array.from(segmenter.segment(text), (s) => s.segment);
  window.clearTimeout(timer);
  window.clearInterval(timer);
  if (reduced) {
    shown.value = full.value.length;
    return;
  }
  shown.value = 0;
  timer = window.setTimeout(() => {
    timer = window.setInterval(() => {
      if (++shown.value >= full.value.length) window.clearInterval(timer);
    }, 32);
  }, delay);
}
function skip() {
  window.clearTimeout(timer);
  window.clearInterval(timer);
  shown.value = full.value.length;
}
say('수저통에서 수저를 하나 뽑으면\n그 수저를 물고 다시 태어난다.');
onBeforeUnmount(() => skip());

// iOS Safari 는 vibrate 를 지원하지 않는다 — 지원하는 브라우저에서만 진동한다.
const vibrate = (p: number | number[]) => navigator.vibrate?.(p);

function onPull() {
  const l = born();
  life.value = l;
  start.value = l.wealth;
  logs.value = [];
  rolls.value++;
  phase.value = 'born';
  vibrate(rare.value ? [20, 60, 20, 60, 20] : 20);
  window.scrollTo({ top: 0 });
  // 수저가 다 올라온 뒤 대화를 시작한다
  say(`${l.country.flag} ${l.country.name}에서\n${l.spoon.name}${rare.value ? '!!' : ''}로 태어났다.`, 700);
}

function toFork() {
  const f = fork.value;
  if (!f) return;
  phase.value = 'fork';
  say(f.title);
}

function onChoose(i: number) {
  const f = fork.value;
  const c = f?.choices[i];
  if (!life.value || !f || !c) return;
  const r = choose(life.value, f, c);
  vibrate(r.won ? 20 : [40, 30, 40]);
  logs.value.push({ ...r, label: c.label, before: life.value.wealth });
  life.value = r.life;
  phase.value = 'outcome';
  say(`${r.won ? '성공!' : '실패...'}\n${r.text}.`);
}

function onNext() {
  if (fork.value) return toFork();
  phase.value = 'end';
  say(`예순다섯 살이 되었다.\n칭호 획득: ${titleOf(top.value)}`);
}

async function onShare() {
  const l = life.value;
  if (!l) return;
  const path = logs.value.map((x) => `${x.label}${x.won ? '⭕' : '❌'}`).join(' → ');
  const text =
    `[수저 뽑기] ${l.country.flag} ${l.country.name}에서 ${l.spoon.name}로 태어나\n${path}\n` +
    `예순다섯 살 재산 ${formatWon(l.wealth)}, 상위 ${top.value}% ${titleOf(top.value)}\n너는 무슨 수저야?`;
  const url = location.origin + location.pathname;
  if (navigator.share) {
    // 공유 시트를 닫으면 AbortError 가 발생한다 — 무시한다.
    await navigator.share({ text, url }).catch(() => {});
    return;
  }
  await navigator.clipboard.writeText(`${text}\n${url}`);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 2000);
}

const signed = (v: number) => (v > 0 ? `+${formatWon(v)}` : formatWon(v));
</script>

<template>
  <main>
    <h1>수저 뽑기</h1>

    <div class="hud" :class="{ off: !life }">
      <span>나이 <b>{{ age ?? '-' }}</b>살</span>
      <span>재산 <b>{{ life ? formatWon(life.wealth) : '-' }}</b></span>
    </div>

    <div class="screen">
      <SpoonScene
        :key="rolls"
        :time="time"
        :metal="life?.spoon.metal ?? null"
        :rare="rare"
        :flag="life ? PIXEL_FLAGS[life.country.code] : undefined"
      />
      <!-- 수저통 장면은 그대로 두고 위에 덮어야 다시 돌아왔을 때 뽑기 애니메이션이 재생되지 않는다 -->
      <ChoiceScene v-if="phase === 'outcome' && last" :key="'c' + step" class="over" :label="last.label" :won="last.won" />
      <p v-if="life && phase === 'born'" :key="'n' + rolls" class="spoon-tag" :style="{ color: life.spoon.metal[1] }">
        {{ life.spoon.name }}
      </p>
      <p
        v-if="phase === 'outcome' && last"
        :key="'d' + step"
        class="delta"
        :class="last.life.wealth >= last.before ? 'up' : 'down'"
      >
        {{ signed(last.life.wealth - last.before) }}
      </p>
    </div>

    <div class="dialog" @click="skip">
      <p aria-hidden="true">{{ full.slice(0, shown).join('') }}<span v-if="!typing" class="more">▼</span></p>
      <p class="sr" role="status">{{ full.join('') }}</p>
    </div>

    <div v-if="!typing" class="controls">
      <template v-if="phase === 'intro'">
        <button class="btn" @click="onPull">수저 뽑기</button>
      </template>

      <template v-else-if="phase === 'born' && life">
        <dl class="status">
          <div>
            <dt>물려받은 재산</dt>
            <dd>{{ formatWon(start) }}</dd>
          </div>
          <div>
            <dt>재능</dt>
            <dd>{{ life.talent.name }}</dd>
          </div>
          <div v-for="s in stats" :key="s.name">
            <dt>{{ s.name }}</dt>
            <dd class="bar" role="img" :aria-label="`${s.v} / ${STAT_MAX}`">
              <i v-for="n in STAT_MAX" :key="n" :class="{ on: n <= s.v }" />
            </dd>
          </div>
        </dl>
        <button class="btn" @click="toFork">스무 살이 되었다</button>
      </template>

      <ul v-else-if="phase === 'fork' && fork && life" class="choices">
        <li v-for="(c, i) in fork.choices" :key="c.label">
          <button class="choice" @click="onChoose(i)">
            <span class="choice-name">{{ c.label }}</span>
            <span class="choice-chance">{{ Math.round(c.chance(life.stats) * 100) }}%</span>
            <span class="choice-desc">{{ c.desc }}</span>
          </button>
        </li>
      </ul>

      <template v-else-if="phase === 'outcome'">
        <button class="btn" @click="onNext">{{ fork ? `${fork.age}가 되었다` : '인생 결산 보기' }}</button>
      </template>

      <template v-else-if="phase === 'end' && life">
        <section class="tally" aria-label="인생 결산">
          <h2>인생 결산</h2>
          <table>
            <tbody>
              <tr>
                <th>{{ life.country.name }} {{ life.spoon.name }}</th>
                <td>{{ formatWon(start) }}</td>
              </tr>
              <tr v-for="(l, i) in logs" :key="i">
                <th>
                  {{ FORKS[i]?.age }} {{ l.label }}
                  <em :class="l.won ? 'up' : 'down'">{{ l.won ? '성공' : '실패' }}</em>
                </th>
                <td :class="l.life.wealth >= l.before ? 'up' : 'down'">{{ signed(l.life.wealth - l.before) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th>최종 재산</th>
                <td>{{ formatWon(life.wealth) }}</td>
              </tr>
            </tfoot>
          </table>
          <p class="rank">
            <span>한국 가구 중 상위 {{ top }}%</span>
            <b>{{ titleOf(top) }}</b>
          </p>
        </section>
        <button class="btn" @click="onShare">{{ copied ? '복사했어요' : '친구에게 자랑하기' }}</button>
        <button class="btn ghost" @click="onPull">다시 태어나기</button>
      </template>
    </div>
  </main>
</template>
