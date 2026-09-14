/** 六爻结果渲染 */

import { esc, chip, secTitle, tag, hexSymbol, yaoSymbol, narrative, narrativeText } from './ui.js';
import { hexagramText } from '../core/liuyao.js';
import { readLiuyao } from '../core/read.js';

export function renderLiuyao(r) {
  const parts = [];

  parts.push(`<div class="meta-bar">
    ${chip('起卦时间', r.castDate.toLocaleString('zh-CN', { hour12: false }))}
    ${chip('日建', r.dayGanZhi, true)}
    ${chip('旬空', r.xunKong.join(''))}
    ${chip('本卦', r.name, true)}
    ${r.changedName ? chip('变卦', r.changedName, true) : chip('变卦', '无（静卦）')}
  </div>`);

  if (r.question) {
    parts.push(`<div class="text-block" style="border-left-color:var(--cinnabar)">占问：${esc(r.question)}</div>`);
  }

  parts.push(secTitle('卦象与爻位'));
  parts.push(`<div class="gua-grid">
    <div class="gua-col">
      <div class="gua-head">
        <div class="gua-name">${esc(r.name)}</div>
        <div class="gua-sub">${esc(r.upperTrigram.name)}上 ${esc(r.lowerTrigram.name)}下 · ${esc(r.palace)}宫 ${esc(r.palaceType)}</div>
      </div>
      <div class="yao-list">${r.yaos.map((y) => yaoRow(y, r)).join('')}</div>
    </div>
    <div class="gua-arrow">➜</div>
    <div class="gua-col">
      <div class="gua-head">
        <div class="gua-name">${esc(r.changedName || r.name)}</div>
        <div class="gua-sub">${r.changedName ? `${esc(r.changedUpperTrigram?.name || '')}上 ${esc(r.changedLowerTrigram?.name || '')}下 · 变卦` : '六爻皆静，以本卦断'}</div>
      </div>
      <div class="yao-list">${r.yaos.map((y) => changedYaoRow(y)).join('')}</div>
    </div>
  </div>`);

  // 伏神
  if (r.fushen.length) {
    parts.push(secTitle('伏神'));
    parts.push(`<div class="lesson-list">${r.fushen.map((f) => `
      <div class="lesson">
        <div class="l-name">${esc(f.pos)}爻伏神</div>
        <div class="l-upper">${esc(f.ganZhi)}</div>
        <div class="l-lower">${esc(f.relative)} · ${esc(f.god)}</div>
        <div class="l-gen">${esc(f.branchElement)}</div>
      </div>`).join('')}</div>`);
  }

  // 卦辞
  const txt = hexagramText(r.name);
  if (txt) {
    parts.push(secTitle('卦辞（象传）'));
    parts.push(`<div class="text-block">${esc(txt)}</div>`);
  }

  parts.push(secTitle('白话解读'));
  parts.push(narrative(readLiuyao(r)));

  parts.push(secTitle('排盘说明'));
  parts.push(`<ul class="notes">
    <li><b>本卦</b>为所占之事当前状态，<b>变卦</b>为事情发展趋向。</li>
    <li><b>动爻</b>（老阳○、老阴×）是断卦关键，静卦则取世爻与用神。</li>
    <li><b>世爻</b>代表自己，<b>应爻</b>代表对方或事情；六亲中以「用神」对应所问之事。</li>
    <li><b>六神</b>（青龙、朱雀、勾陈、螣蛇、白虎、玄武）按日干起，初爻为起点。</li>
    <li><b>旬空</b>之爻暂时无力，待出空之日方可应事。</li>
  </ul>`);

  return parts.join('');
}

function yaoRow(y, r) {
  const cls = ['yao', y.isShi ? 'is-shi' : '', y.isYing ? 'is-ying' : '', y.moving ? 'is-moving' : ''].filter(Boolean).join(' ');
  const tags = [];
  if (y.role) tags.push(tag(y.role, y.isShi ? 'shi' : 'ying'));
  if (y.moving) tags.push(tag(`动${y.mark}`, 'move'));
  if (y.kong) tags.push(tag('空', 'kong'));
  return `<div class="${cls}">
    <div class="y-info">
      <span class="y-gz">${esc(y.ganZhi)}</span>
      <span class="y-meta">${esc(y.god)} · ${esc(y.relative)} · ${esc(y.branchElement)}</span>
    </div>
    <div style="display:flex;justify-content:center">${yaoSymbol(y.yang)}</div>
    <div class="y-tags">${tags.join('')}</div>
  </div>`;
}

function changedYaoRow(y) {
  const yang = y.moving ? !y.yang : y.yang;
  return `<div class="yao" style="grid-template-columns:1fr auto;opacity:${y.moving ? 1 : .55}">
    <div class="y-info"><span class="y-meta">${esc(y.pos)}爻${y.moving ? '（变）' : ''}</span></div>
    <div style="display:flex;justify-content:center">${yaoSymbol(yang)}</div>
  </div>`;
}

/** 纯文本导出 */
export function liuyaoText(r) {
  const lines = [];
  lines.push(`起卦时间：${r.castDate.toLocaleString('zh-CN', { hour12: false })}`);
  if (r.question) lines.push(`占问：${r.question}`);
  lines.push(`日建：${r.dayGanZhi}　旬空：${r.xunKong.join('')}`);
  lines.push(`本卦：${r.name}（${r.palace}宫 ${r.palaceType}）`);
  lines.push(`变卦：${r.changedName || '无（静卦）'}`);
  lines.push('');
  lines.push('爻位\t六神\t六亲\t纳甲\t世应\t动静');
  r.yaos.forEach((y) => {
    lines.push([`${y.pos}爻`, y.god, y.relative, y.ganZhi, y.role || '', y.moving ? `动${y.mark}` : '静'].join('\t'));
  });
  if (r.fushen.length) {
    lines.push('');
    lines.push('伏神：');
    r.fushen.forEach((f) => lines.push(`  ${f.pos}爻 ${f.ganZhi} ${f.relative} ${f.god}`));
  }
  const t = hexagramText(r.name);
  if (t) { lines.push(''); lines.push(`卦辞：${t}`); }
  lines.push('');
  lines.push(...narrativeText(readLiuyao(r)));
  return lines.join('\n');
}