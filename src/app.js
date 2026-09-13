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
    hint: '由八字推出命局类型、财禄官运、一生行运走势，以及能否转运与何时转运。',
    fields: ['datetime', 'gender'],
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
    fields: ['datetime', 'gender'],
    cast: castBazi,
    render: renderBazi,
    text: baziText,
  },
  {
    id: 'liuyao',
    name: '六爻',
    sub: '纳甲 · 事',
    title: '六爻排盘 · 纳甲筮法',
    hint: '三枚铜钱摇六次成卦，或按时间起卦；排出纳甲、六亲、六神、世应与变卦。',
    fields: ['method', 'question', 'datetime'],
    cast: castLiuyao,
    render: renderLiuyao,
    text: liuyaoText,
  },
  {
    id: 'liuren',
    name: '大六壬',
    sub: '四课 · 三传',
    title: '大六壬排盘 · 四课三传',
    hint: '术数界公认的卜筮巅峰。以月将加时起天地盘，布四课、取三传、配十二天将。',
    fields: ['datetime'],
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
    fields: ['datetime', 'gender'],
    cast: castZiwei,
    render: renderZiwei,
    text: ziweiText,
  },
  {
    id: 'qimen',
    name: '奇门遁甲',
    sub: '时家 · 择时',
    title: '奇门遁甲排盘 · 时家转盘',
    hint: '按节气定阴阳遁局数，布三奇六仪、九星、八门、八神，用于择时布局。',
    fields: ['datetime'],
    cast: castQimen,
    render: renderQimen,
    text: qimenText,
  },

  {
    id: 'jiemeng',
    name: '解梦',
    sub: '梦象 · 吉凶',
    title: '解梦 · 周公梦象',
    hint: '把梦讲一遍，拆出梦中的「象」，依五行象义断吉凶，并给出可照做的建议。',
    fields: ['dream', 'mood', 'datetime'],
    cast: castJiemeng,
    render: renderJiemeng,
    text: jiemengText,
  },
];

let current = SYSTEMS[0];
let lastResult = null;

/* ---------------- 表单 ---------------- */

const $ = (id) => document.getElementById(id);

function fieldHtml(field) {
  if (field === 'datetime') {
    return `
      <div class="field full">
        <label for="f-date">公历日期</label>
        <input type="date" id="f-date" required>
      </div>
      <div class="field">
        <label for="f-hour">时（0-23）</label>
        <input type="number" id="f-hour" min="0" max="23" value="12" required>
      </div>
      <div class="field">
        <label for="f-minute">分</label>
        <input type="number" id="f-minute" min="0" max="59" value="0">
      </div>`;
  }
  if (field === 'gender') {
    return `
      <div class="field full">
        <label>性别（定大运顺逆）</label>
        <div class="seg">
          <label><input type="radio" name="f-gender" value="男" checked><span>男</span></label>
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
        <input type="text" id="f-manual" value="7,8,8,7,8,8" placeholder="如 7,8,8,7,8,8">
      </div>`;
  }
  if (field === 'dream') {
    return `
      <div class="field full">
        <label for="f-dream">梦见什么（把梦尽量讲全，越具体越准）</label>
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
          <label><input type="radio" name="f-mood" value="平静" checked><span>平静</span></label>
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
        <label for="f-question">占问事由（选填）</label>
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

  // 默认时间
  const now = new Date();
  $('f-date').value = toDateInput(now);
  if ($('f-hour')) $('f-hour').value = now.getHours();

  const sampleBox = $('dreamSamples');
  if (sampleBox) {
    sampleBox.innerHTML = DREAM_SAMPLES.map((d, i) => `<button type="button" class="sample-chip" data-i="${i}">梦例 ${i + 1}</button>`).join('');
    sampleBox.querySelectorAll('.sample-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('f-dream').value = DREAM_SAMPLES[Number(btn.dataset.i)];
        $('f-dream').focus();
      });
    });
  }

  const sel = $('f-method');
  if (sel) {
    sel.addEventListener('change', () => {
      $('manualWrap').style.display = sel.value === 'manual' ? '' : 'none';
    });
  }
}

function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readDatetime() {
  const v = $('f-date').value;
  if (!v) throw new Error('请填写公历日期');
  const [y, m, d] = v.split('-').map(Number);
  const hour = Number($('f-hour').value || 0);
  const minute = Number($('f-minute').value || 0);
  if (!(y > 1901 && y < 2100)) throw new Error('年份需在 1902 - 2099 之间');
  if (hour < 0 || hour > 23) throw new Error('小时需在 0 - 23 之间');
  return { year: y, month: m, day: d, hour, minute, date: new Date(y, m - 1, d, hour, minute) };
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
  const y = 1950 + Math.floor(Math.random() * 70);
  const m = 1 + Math.floor(Math.random() * 12);
  const d = 1 + Math.floor(Math.random() * 28);
  $('f-date').value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  $('f-hour').value = Math.floor(Math.random() * 24);
  if ($('f-minute')) $('f-minute').value = Math.floor(Math.random() * 60);
  const g = Math.random() < 0.5 ? '男' : '女';
  const radio = document.querySelector(`input[name="f-gender"][value="${g}"]`);
  if (radio) radio.checked = true;
  if ($('f-dream')) $('f-dream').value = DREAM_SAMPLES[Math.floor(Math.random() * DREAM_SAMPLES.length)];
}

function setNow() {
  const now = new Date();
  $('f-date').value = toDateInput(now);
  $('f-hour').value = now.getHours();
  if ($('f-minute')) $('f-minute').value = now.getMinutes();
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