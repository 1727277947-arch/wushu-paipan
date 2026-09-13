/** 应用主控：术数切换、表单生成、排盘调度 */

import { computeBazi } from './core/bazi.js';
import { buildHexagram, tossCoins, timeCast, YONGSHEN_TOPICS } from './core/liuyao.js';
import { buildLiuRen, MONTH_GENERALS } from './core/liuren.js';
import { buildZiwei } from './core/ziwei.js';
import { buildQimen } from './core/qimen.js';
import { interpretDream, DREAM_SAMPLES } from './core/jiemeng.js';
import { solarToLunar } from './core/lunar-convert.js';
import { solarTermsOfYear, jiaziName, dayPillarIndex } from './core/lunar.js';

import { renderBazi, baziText } from './render/bazi-view.js';
import { interpretBazi } from './core/interpret.js';
import { renderInterpretation, interpretText } from './render/interpret-view.js';
import { renderLiuyao, liuyaoText } from './render/liuyao-view.js';
import { renderLiuren, liurenText } from './render/liuren-view.js';
import { renderZiwei, ziweiText } from './render/ziwei-view.js';
import { renderQimen, qimenText } from './render/qimen-view.js';
import { renderJiemeng, jiemengText } from './render/jiemeng-view.js';
import { copyText } from './render/ui.js';

/** 五种术数定义 */
const SYSTEMS = [
  {
    id: 'interpret',
    name: '命理解读',
    sub: '论命 · 走向',
    title: '命理解读 · 人生论断',
    hint: '由八字推出命局类型、财禄官运、一生行运走势，以及能否转运与何时转运。请填出生年月日与时辰。',
    fields: ['birth', 'gender'],
    cast: castInterpret,
    render: renderInterpretation,
    text: interpretText,
  },

  {
    id: 'bazi',
    name: '八字',
    sub: '四柱 · 命',
    title: '八字排盘 · 四柱命理',
    hint: '以立春换年、以十二节换月，排出年月日时四柱、十神与大运。',
    fields: ['birth', 'gender'],
    cast: castBazi,
    render: renderBazi,
    text: baziText,
  },
  {
    id: 'liuyao',
    name: '六爻',
    sub: '纳甲 · 事',
    title: '六爻排盘 · 纳甲筮法',
    hint: '三枚铜钱摇六次成卦，或按时间起卦；排出纳甲、六亲、六神、世应与变卦。起卦时刻已默认当下，无需改动。',
    fields: ['method', 'question', 'moment'],
    cast: castLiuyao,
    render: renderLiuyao,
    text: liuyaoText,
  },
  {
    id: 'liuren',
    name: '大六壬',
    sub: '四课 · 三传',
    title: '大六壬排盘 · 四课三传',
    hint: '术数界公认的卜筮巅峰。以月将加时起天地盘，布四课、取三传、配十二天将。时刻已默认当下。',
    fields: ['moment'],
    cast: castLiuren,
    render: renderLiuren,
    text: liurenText,
  },
  {
    id: 'ziwei',
    name: '紫微斗数',
    sub: '星盘 · 命',
    title: '紫微斗数排盘 · 十二宫',
    hint: '以生月生时定命身宫与五行局，安十四主星、辅星与四化，分十二宫论命。',
    fields: ['birth', 'gender'],
    cast: castZiwei,
    render: renderZiwei,
    text: ziweiText,
  },
  {
    id: 'qimen',
    name: '奇门遁甲',
    sub: '时家 · 择时',
    title: '奇门遁甲排盘 · 时家转盘',
    hint: '按节气定阴阳遁局数，布三奇六仪、九星、八门、八神，用于择时布局。时刻已默认当下，也可改成要择的时间。',
    fields: ['moment'],
    cast: castQimen,
    render: renderQimen,
    text: qimenText,
  },

  {
    id: 'jiemeng',
    name: '解梦',
    sub: '梦象 · 吉凶',
    title: '解梦 · 周公梦象',
    hint: '把梦讲一遍，拆出梦中的「象」，依五行象义断吉凶，并给出可照做的建议。做梦时刻已默认当下。',
    fields: ['dream', 'mood', 'moment'],
    cast: castJiemeng,
    render: renderJiemeng,
    text: jiemengText,
  },
];

let current = SYSTEMS[0];
let lastResult = null;

/* ---------------- 表单 ---------------- */

const $ = (id) => document.getElementById(id);

/** 十二时辰（含早子、晚子），hour 为该时辰用于起盘的代表小时 */
const SHICHEN = [
  { key: 'zaozi', label: '早子', range: '00-01', hour: 0, full: '早子时' },
  { key: 'chou', label: '丑', range: '01-03', hour: 2, full: '丑时' },
  { key: 'yin', label: '寅', range: '03-05', hour: 4, full: '寅时' },
  { key: 'mao', label: '卯', range: '05-07', hour: 6, full: '卯时' },
  { key: 'chen', label: '辰', range: '07-09', hour: 8, full: '辰时' },
  { key: 'si', label: '巳', range: '09-11', hour: 10, full: '巳时' },
  { key: 'wu', label: '午', range: '11-13', hour: 12, full: '午时' },
  { key: 'wei', label: '未', range: '13-15', hour: 14, full: '未时' },
  { key: 'shen', label: '申', range: '15-17', hour: 16, full: '申时' },
  { key: 'you', label: '酉', range: '17-19', hour: 18, full: '酉时' },
  { key: 'xu', label: '戌', range: '19-21', hour: 20, full: '戌时' },
  { key: 'hai', label: '亥', range: '21-23', hour: 22, full: '亥时' },
  { key: 'wanzi', label: '晚子', range: '23-24', hour: 23, full: '晚子时' },
];

/** 表单状态：切换术数时保留已填内容，避免反复录入 */
const formState = {
  birth: { year: 1990, month: 6, day: 15, shichen: 'wu' },
  moment: null, // null 表示取「此刻」
  gender: '男',
  mood: '平静',
  dream: '',
  method: 'coins',
  question: '',
  manual: '7,8,8,7,8,8',
};

function nowParts() {
  const n = new Date();
  return {
    year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate(),
    hour: n.getHours(), minute: n.getMinutes(),
  };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** 年 / 月 / 日 三格，年份可直接键入，避免日期控件逐月翻页 */
function ymdHtml() {
  return `
    <div class="ymd-row">
      <input type="number" id="f-year" inputmode="numeric" min="1902" max="2099" placeholder="年">
      <span class="unit">年</span>
      <select id="f-month" aria-label="月"></select>
      <span class="unit">月</span>
      <select id="f-day" aria-label="日"></select>
      <span class="unit">日</span>
    </div>`;
}

function fieldHtml(field) {
  if (field === 'birth') {
    return `
      <div class="field full">
        <label>出生日期（公历）</label>
        ${ymdHtml()}
      </div>
      <div class="field full">
        <label>出生时辰 <span class="lbl-note">记不清可选午时</span></label>
        <div class="shichen-grid" id="f-shichen"></div>
        <p class="sc-note" id="f-sc-note"></p>
      </div>`;
  }
  if (field === 'moment') {
    return `
      <div class="field full">
        <label>占测时刻 <span class="lbl-note">默认此刻，通常不用改</span></label>
        ${ymdHtml()}
        <div class="ymd-row tight">
          <input type="number" id="f-hour" inputmode="numeric" min="0" max="23" placeholder="时">
          <span class="unit">时</span>
          <input type="number" id="f-minute" inputmode="numeric" min="0" max="59" placeholder="分">
          <span class="unit">分</span>
        </div>
      </div>`;
  }
  if (field === 'gender') {
    return `
      <div class="field full">
        <label>性别 <span class="lbl-note">定大运顺逆</span></label>
        <div class="seg">
          <label><input type="radio" name="f-gender" value="男"><span>男</span></label>
          <label><input type="radio" name="f-gender" value="女"><span>女</span></label>
        </div>
      </div>`;
  }
  if (field === 'method') {
    return `
      <div class="field full">
        <label>起卦方式</label>
        <select id="f-method">
          <option value="coins">三枚铜钱（随机摇卦）</option>
          <option value="time">时间起卦（梅花易数）</option>
          <option value="manual">手动指定爻象</option>
        </select>
      </div>
      <div class="field full" id="manualWrap" style="display:none">
        <label>六爻（自下而上，7=少阳 8=少阴 9=老阳 6=老阴）</label>
        <input type="text" id="f-manual" placeholder="如 7,8,8,7,8,8">
      </div>`;
  }
  if (field === 'dream') {
    return `
      <div class="field full">
        <label for="f-dream">梦见什么 <span class="lbl-note">越具体越准</span></label>
        <textarea id="f-dream" placeholder="如：梦见在河边钓鱼，钓上来一条很大的鱼，旁边还有喜鹊在叫。"></textarea>
      </div>
      <div class="field full">
        <label>没有头绪？点一个现成的梦例</label>
        <div class="sample-row" id="dreamSamples"></div>
      </div>`;
  }
  if (field === 'mood') {
    return `
      <div class="field full">
        <label>梦里什么心情</label>
        <div class="seg">
          <label><input type="radio" name="f-mood" value="平静"><span>平静</span></label>
          <label><input type="radio" name="f-mood" value="喜悦"><span>喜悦</span></label>
          <label><input type="radio" name="f-mood" value="害怕"><span>害怕</span></label>
          <label><input type="radio" name="f-mood" value="悲伤"><span>悲伤</span></label>
          <label><input type="radio" name="f-mood" value="愤怒"><span>愤怒</span></label>
        </div>
      </div>`;
  }
  if (field === 'question') {
    return `
      <div class="field full">
        <label for="f-question">占问事由 <span class="lbl-note">选填</span></label>
        <input type="text" id="f-question" placeholder="如：本月财运如何">
      </div>`;
  }
  return '';
}

function buildForm() {
  const form = $('inputForm');
  form.innerHTML = current.fields.map(fieldHtml).join('');
  $('panelTitle').textContent = current.title;
  $('formHint').textContent = current.hint;

  const isBirth = current.fields.includes('birth');
  if (isBirth || current.fields.includes('moment')) wireDate(isBirth);
  if (isBirth) wireShichen();

  document.querySelectorAll('input[name="f-gender"]').forEach((el) => {
    el.checked = el.value === formState.gender;
    el.addEventListener('change', () => { formState.gender = el.value; });
  });
  document.querySelectorAll('input[name="f-mood"]').forEach((el) => {
    el.checked = el.value === formState.mood;
    el.addEventListener('change', () => { formState.mood = el.value; });
  });

  const sampleBox = $('dreamSamples');
  if (sampleBox) {
    sampleBox.innerHTML = DREAM_SAMPLES.map((d, i) => `<button type="button" class="sample-chip" data-i="${i}">梦例 ${i + 1}</button>`).join('');
    sampleBox.querySelectorAll('.sample-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('f-dream').value = DREAM_SAMPLES[Number(btn.dataset.i)];
        formState.dream = $('f-dream').value;
      });
    });
  }
  const dreamEl = $('f-dream');
  if (dreamEl) {
    dreamEl.value = formState.dream || '';
    dreamEl.addEventListener('input', () => { formState.dream = dreamEl.value; });
  }

  const sel = $('f-method');
  if (sel) {
    sel.value = formState.method;
    $('manualWrap').style.display = sel.value === 'manual' ? '' : 'none';
    sel.addEventListener('change', () => {
      formState.method = sel.value;
      $('manualWrap').style.display = sel.value === 'manual' ? '' : 'none';
    });
  }
  const man = $('f-manual');
  if (man) {
    man.value = formState.manual;
    man.addEventListener('input', () => { formState.manual = man.value; });
  }
  const q = $('f-question');
  if (q) {
    q.value = formState.question || '';
    q.addEventListener('input', () => { formState.question = q.value; });
  }

  // 按钮按用途显隐：占测类不需要「随机示例」，出生类不需要「此刻」
  const hasBirth = current.fields.includes('birth');
  const hasMoment = current.fields.includes('moment');
  const hasDream = current.fields.includes('dream');
  const randomBtn = $('randomBtn');
  const nowBtn = $('nowBtn');
  if (randomBtn) randomBtn.style.display = (hasBirth || hasDream) ? '' : 'none';
  if (nowBtn) nowBtn.style.display = hasMoment ? '' : 'none';
}

/** 年月日联动：换年月时重算当月天数，并把已填内容存入状态 */
function wireDate(isBirth) {
  const yEl = $('f-year');
  const mEl = $('f-month');
  const dEl = $('f-day');
  if (!yEl) return;

  const src = isBirth ? formState.birth : (formState.moment || nowParts());

  mEl.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');

  const syncDays = () => {
    const y = Number(yEl.value) || src.year;
    const m = Number(mEl.value) || src.month;
    const n = daysInMonth(y, m);
    const keep = Number(dEl.value) || src.day;
    dEl.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    dEl.value = Math.min(keep, n);
  };

  yEl.value = src.year;
  mEl.value = src.month;
  syncDays();
  dEl.value = src.day;

  const hEl = $('f-hour');
  const miEl = $('f-minute');

  const save = () => {
    const v = { year: Number(yEl.value), month: Number(mEl.value), day: Number(dEl.value) };
    if (isBirth) {
      formState.birth = { ...formState.birth, ...v };
    } else {
      formState.moment = {
        ...v,
        hour: hEl ? Number(hEl.value || 0) : 12,
        minute: miEl ? Number(miEl.value || 0) : 0,
      };
    }
  };

  yEl.addEventListener('input', () => { syncDays(); save(); });
  mEl.addEventListener('change', () => { syncDays(); save(); });
  dEl.addEventListener('change', save);

  if (!isBirth) {
    if (hEl) { hEl.value = src.hour; hEl.addEventListener('input', save); }
    if (miEl) { miEl.value = src.minute; miEl.addEventListener('input', save); }
  }
}

/** 十二时辰选择 */
function wireShichen() {
  const box = $('f-shichen');
  if (!box) return;
  const note = $('f-sc-note');

  const render = () => {
    box.innerHTML = SHICHEN.map((s) => `
      <button type="button" class="sc-btn${formState.birth.shichen === s.key ? ' active' : ''}" data-key="${s.key}">
        <b>${s.label}</b><i>${s.range}</i>
      </button>`).join('');
    const cur = SHICHEN.find((s) => s.key === formState.birth.shichen);
    if (note && cur) {
      note.textContent = `${cur.full}（${cur.range.replace('-', ':00 - ')}:00），按 ${String(cur.hour).padStart(2, '0')}:00 起盘`;
    }
    box.querySelectorAll('.sc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState.birth.shichen = btn.dataset.key;
        render();
      });
    });
  };
  render();
}

function readDatetime() {
  const yEl = $('f-year');
  if (!yEl) throw new Error('请填写日期');

  const year = Number(yEl.value);
  const month = Number($('f-month').value);
  const day = Number($('f-day').value);
  if (!Number.isInteger(year) || year < 1902 || year > 2099) throw new Error('年份需在 1902 - 2099 之间');
  if (!(month >= 1 && month <= 12)) throw new Error('月份不正确');
  if (!(day >= 1 && day <= daysInMonth(year, month))) throw new Error('该月没有这一天');

  let hour = 12;
  let minute = 0;
  const scBox = $('f-shichen');
  if (scBox) {
    const item = SHICHEN.find((s) => s.key === formState.birth.shichen) || SHICHEN[6];
    hour = item.hour;
  } else {
    const hEl = $('f-hour');
    const miEl = $('f-minute');
    hour = hEl ? Number(hEl.value) : 12;
    minute = miEl ? Number(miEl.value || 0) : 0;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('小时需在 0 - 23 之间');
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) throw new Error('分钟需在 0 - 59 之间');
  }

  return { year, month, day, hour, minute, date: new Date(year, month - 1, day, hour, minute) };
}
/* ---------------- 各术数排盘 ---------------- */

function castBazi() {
  const dt = readDatetime();
  const gender = document.querySelector('input[name="f-gender"]:checked')?.value || '男';
  return computeBazi({ ...dt, gender });
}

function castInterpret() {
  const dt = readDatetime();
  const gender = document.querySelector('input[name="f-gender"]:checked')?.value || '男';
  const b = computeBazi({ ...dt, gender });
  return interpretBazi(b, { currentYear: new Date().getFullYear() });
}

function castLiuyao() {
  const dt = readDatetime();
  const method = $('f-method').value;
  const question = $('f-question')?.value || '';

  let values = [];
  if (method === 'coins') {
    values = tossCoins().map((r) => r.yao.value);
  } else if (method === 'manual') {
    const raw = ($('f-manual').value || '').split(/[,,\s]+/).filter(Boolean).map(Number);
    if (raw.length !== 6 || raw.some((n) => ![6, 7, 8, 9].includes(n))) {
      throw new Error('请填写 6 个数字，取值 6 / 7 / 8 / 9，用逗号分隔');
    }
    values = raw;
  } else {
    const t = timeCast(dt.date);
    // 由上下卦与动爻构造六爻
    const bits = {
      乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
      巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
    };
    const lower = bits[t.lower];
    const upper = bits[t.upper];
    const all = [...lower, ...upper];
    values = all.map((bit, i) => {
      const isMoving = i + 1 === t.moving;
      if (isMoving) return bit ? 9 : 6;
      return bit ? 7 : 8;
    });
  }

  return buildHexagram(values, dt.date, question);
}

function castLiuren() {
  const dt = readDatetime();
  const terms = [
    ...solarTermsOfYear(dt.year - 1),
    ...solarTermsOfYear(dt.year),
    ...solarTermsOfYear(dt.year + 1),
  ];
  const mg = monthGeneralFromTerms(terms, dt);
  return buildLiuRen(dt.date, { monthGeneral: mg });
}

/** 按节气取月将：雨水后亥将、春分后戌将…（依次逆推） */
function monthGeneralFromTerms(terms, dt) {
  const boundaries = MONTH_GENERALS.slice().sort((a, b) => 0); // 已按节气顺序
  const list = terms.filter((t) => boundaries.some((b) => b.term === t.name))
    .sort((a, b) => a.jd - b.jd);
  const curJD = jdOf(dt);
  let found = boundaries[0];
  list.forEach((t) => {
    const b = boundaries.find((x) => x.term === t.name);
    if (b && t.jd <= curJD) found = b;
  });
  return found;
}

function jdOf({ year, month, day, hour, minute }) {
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const frac = (hour * 3600 + minute * 60) / 86400;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + frac - 8 / 24;
}

function castZiwei() {
  const dt = readDatetime();
  const gender = document.querySelector('input[name="f-gender"]:checked')?.value || '男';
  const lunar = solarToLunar(dt.year, dt.month, dt.day);
  // 年干支以立春为界
  const terms = solarTermsOfYear(dt.year);
  const lichun = terms.find((t) => t.name === '立春');
  const curJD = jdOf(dt);
  let gzYear = dt.year;
  if (lichun && curJD < lichun.jd) gzYear -= 1;
  const yearGanZhiIdx = ((gzYear - 1984) % 60 + 60) % 60;

  return buildZiwei({
    lunarYear: lunar.year,
    lunarMonth: lunar.month,
    lunarDay: lunar.day,
    hour: dt.hour,
    gender,
    yearGanZhiIdx,
  });
}

function castJiemeng() {
  const dt = readDatetime();
  const dream = ($('f-dream')?.value || '').trim();
  if (dream.length < 2) throw new Error('请先把梦见的内容写下来（至少几个字）');
  const mood = document.querySelector('input[name="f-mood"]:checked')?.value || '平静';
  return interpretDream(dream, dt, { mood });
}

function castQimen() {
  const dt = readDatetime();
  const terms = solarTermsOfYear(dt.year);
  const curJD = jdOf(dt);
  // 取当前所处的「节」
  const jieNames = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
  const jieList = [
    ...solarTermsOfYear(dt.year - 1), ...solarTermsOfYear(dt.year), ...solarTermsOfYear(dt.year + 1),
  ].filter((t) => jieNames.includes(t.name)).sort((a, b) => a.jd - b.jd);

  let curJie = jieList[0];
  jieList.forEach((t) => { if (t.jd <= curJD) curJie = t; });
  // 局数用所属「节气」：立春起用立春表，惊蛰用惊蛰表…（简化：直接用节名查表）
  const termName = curJie ? curJie.name : '冬至';

  const dpIdx = dayPillarIndex(dt.year, dt.month, dt.day);
  return buildQimen(dt.date, { termName, dayJiaziIdx: dpIdx });
}

/* ---------------- 交互 ---------------- */

async function doCast() {
  try {
    $('formHint').textContent = current.hint;
    const result = current.cast();
    lastResult = result;
    $('result').innerHTML = current.render(result);
  } catch (err) {
    $('result').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><p>${err.message || '排盘失败，请检查输入'}</p></div>`;
  }
}

function renderTabs() {
  $('tabs').innerHTML = SYSTEMS.map((s) => `
    <button class="tab${s.id === current.id ? ' active' : ''}" data-id="${s.id}" role="tab">
      ${s.name}<span class="tab-sub">${s.sub}</span>
    </button>`).join('');
  $('tabs').querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      current = SYSTEMS.find((s) => s.id === btn.dataset.id);
      lastResult = null;
      renderTabs();
      buildForm();
      $('result').innerHTML = `<div class="empty-state">
        <div class="empty-icon">${iconOf(current.id)}</div>
        <p>${current.title}</p>
        <p class="empty-sub">${current.hint}</p>
      </div>`;
    });
  });
}

function iconOf(id) {
  return { interpret: '论断', bazi: '干支', liuyao: '䷀', liuren: '壬', ziwei: '星', qimen: '奇', jiemeng: '梦' }[id] || '☯';
}

function randomize() {
  if (current.fields.includes('birth')) {
    const y = 1950 + Math.floor(Math.random() * 70);
    const m = 1 + Math.floor(Math.random() * 12);
    const d = 1 + Math.floor(Math.random() * daysInMonth(y, m));
    const sc = SHICHEN[Math.floor(Math.random() * 12)];
    formState.birth = { year: y, month: m, day: d, shichen: sc.key };
    formState.gender = Math.random() < 0.5 ? '男' : '女';
    buildForm();
  } else if (current.fields.includes('moment')) {
    formState.moment = null;
    buildForm();
  }
  if ($('f-dream')) {
    $("f-dream").value = DREAM_SAMPLES[Math.floor(Math.random() * DREAM_SAMPLES.length)];
    formState.dream = $('f-dream').value;
  }
}

function setNow() {
  if (current.fields.includes('moment')) {
    formState.moment = null;
  } else {
    const n = nowParts();
    formState.birth = { ...formState.birth, year: n.year, month: n.month, day: n.day };
  }
  buildForm();
}

function init() {
  renderTabs();
  buildForm();
  $('castBtn').addEventListener('click', doCast);
  $('randomBtn').addEventListener('click', randomize);
  $('nowBtn').addEventListener('click', setNow);
  $('inputForm').addEventListener('submit', (e) => { e.preventDefault(); doCast(); });
  $('inputForm').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); doCast(); }
  });
  $('copyBtn').addEventListener('click', async () => {
    if (!lastResult) { $('copyBtn').textContent = '暂无结果'; setTimeout(() => { $('copyBtn').textContent = '复制文本'; }, 1200); return; }
    const ok = await copyText(current.text(lastResult));
    $('copyBtn').textContent = ok ? '已复制 ✓' : '复制失败';
    setTimeout(() => { $('copyBtn').textContent = '复制文本'; }, 1400);
  });
}

document.addEventListener('DOMContentLoaded', init);