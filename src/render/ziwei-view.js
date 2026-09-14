/** 紫微斗数结果渲染 */

import { esc, chip, secTitle, tag, narrative, narrativeText } from './ui.js';
import { readZiwei, METHOD_NOTE } from '../core/read.js';

/**
 * 十二宫在地支盘上的坐标：row 自上而下 1-4，col 自左而右 1-4。
 * 巳午未申 / 辰…酉 / 卯…戌 / 寅丑子亥，中宫空出。
 */
const GRID = [
  { branch: '巳', row: 1, col: 1 }, { branch: '午', row: 1, col: 2 },
  { branch: '未', row: 1, col: 3 }, { branch: '申', row: 1, col: 4 },
  { branch: '辰', row: 2, col: 1 }, { branch: '酉', row: 2, col: 4 },
  { branch: '卯', row: 3, col: 1 }, { branch: '戌', row: 3, col: 4 },
  { branch: '寅', row: 4, col: 1 }, { branch: '丑', row: 4, col: 2 },
  { branch: '子', row: 4, col: 3 }, { branch: '亥', row: 4, col: 4 },
];

export function renderZiwei(r) {
  const parts = [];

  parts.push(`<div class="meta-bar">
    ${chip('农历', r.lunarText)}
    ${chip('年柱', `${r.yearGanZhi}（${r.yearStem}）`, true)}
    ${chip('五行局', r.juName, true)}
    ${chip('命宫', r.mingBranch)}
    ${chip('身宫', r.shenBranch)}
    ${chip('紫微', r.ziweiBranch)}
    ${chip('天府', r.tianfuBranch)}
    ${chip('性别', r.gender)}
  </div>`);

  parts.push(secTitle('十二宫星盘'));
  const byBranch = {};
  r.palaces.forEach((p) => { byBranch[p.branch] = p; });

  const cells = GRID.map((g) => {
    const p = byBranch[g.branch];
    return { ...g, html: p ? palaceCell(p, r) : '<div></div>' };
  });
  // 中宫
  cells.push({ row: 2, col: 2, span: '2/2/4/4', html: centerCell(r) });

  const gridHtml = cells.map((c) => {
    const area = c.span ? c.span : `${c.row}/${c.col}`;
    return `<div style="grid-area:${area}">${c.html}</div>`;
  }).join('');

  parts.push(`<div class="ziwei-grid">${gridHtml}</div>`);

  parts.push(secTitle('四化星'));
  parts.push(`<div class="lesson-list">${r.sihua.map((h) => `
    <div class="lesson">
      <div class="l-name">${esc(h.type)}</div>
      <div class="l-upper">${esc(h.star)}</div>
      <div class="l-lower">${esc(h.palace)}</div>
      <div class="l-gen">${esc(h.branch)}宫</div>
    </div>`).join('')}</div>`);

  parts.push(secTitle('十二宫详表'));
  parts.push('<table class="pillar-table"><thead><tr><th>宫位</th><th>宫干支</th><th>主星</th><th>辅星 / 四化</th><th>长生</th><th>大限</th></tr></thead><tbody>');
  r.palaces.forEach((p) => {
    parts.push(`<tr>
      <td>${esc(p.name)}${p.isMing ? ' ★' : ''}${p.isShen ? ' ◆' : ''}</td>
      <td>${esc(p.ganZhi)}</td>
      <td>${p.mainStars.map((s) => tag(s, 'ten')).join(' ') || '<span style="color:var(--line-strong)">—</span>'}</td>
      <td style="font-size:12px;color:var(--ink-faint)">${p.auxStars.join('、') || '—'}${p.sihua.length ? ' ' + p.sihua.map((s) => tag(s, 'hua')).join('') : ''}</td>
      <td style="font-size:12.5px">${esc(p.changsheng || '—')}</td>
      <td style="font-size:12.5px">${esc(p.daxian)}</td>
    </tr>`);
  });
  parts.push('</tbody></table>');

  parts.push(secTitle('白话解读'));
  parts.push(narrative(readZiwei(r)));
  parts.push('<p class="method-note">' + esc(METHOD_NOTE) + '</p>');

  parts.push(secTitle('排盘说明'));
  parts.push(`<ul class="notes">
    <li><b>命宫</b>由生月与生时定，<b>身宫</b>为后天着力之处。★ 为命宫，◆ 为身宫。</li>
    <li><b>五行局</b>由命宫纳音定（水二、木三、金四、土五、火六），决定紫微起星。</li>
    <li><b>紫微星</b>按五行局与生日定位，其余十三主星依固定相对位置排布。</li>
    <li><b>大限</b>自命宫起，每宫十年；阳男阴女顺行，阴男阳女逆行。本次为${r.daxianForward ? '顺行' : '逆行'}，起于 ${r.daxianStart} 岁。</li>
  </ul>`);

  return parts.join('');
}

function palaceCell(p, r) {
  if (!p) return '<div></div>';
  const cls = ['zw-cell', p.isMing ? 'is-ming' : '', p.isShen ? 'is-shen' : ''].filter(Boolean).join(' ');
  const hua = p.sihua.map((s) => tag(s, 'hua')).join('');
  return `<div class="${cls}">
    <div class="zw-head">
      <span class="zw-branch">${esc(p.branch)}</span>
      <span class="zw-name">${esc(p.name)}${p.isShen ? ' 身' : ''}</span>
    </div>
    <div class="zw-main">${p.mainStars.map((s) => esc(s)).join(' ') || '<span style="color:var(--line-strong)">　</span>'}${hua}</div>
    <div class="zw-aux">${p.auxStars.join(' ') || ''}</div>
    <div class="zw-foot"><span>${esc(p.ganZhi)}</span><span>${esc(p.changsheng || '')}</span></div>
    <div class="zw-foot"><span>${esc(p.daxian)}</span><span></span></div>
  </div>`;
}

function centerCell(r) {
  return `<div class="zw-cell" style="grid-area:2/2/4/4;min-height:auto;background:var(--paper-2);justify-content:center;align-items:center;text-align:center;gap:8px">
    <div style="font-family:var(--font-serif);font-size:15px;letter-spacing:.1em">紫微斗数</div>
    <div style="font-size:12px;color:var(--ink-soft)">${esc(r.yearGanZhi)}年　${esc(r.juName)}</div>
    <div style="font-size:12px;color:var(--ink-soft)">命宫${esc(r.mingBranch)}　身宫${esc(r.shenBranch)}</div>
    <div style="font-size:11.5px;color:var(--ink-faint)">${esc(r.lunarText)}</div>
  </div>`;
}

/** 纯文本导出 */
export function ziweiText(r) {
  const lines = [];
  lines.push(`农历：${r.lunarText}`);
  lines.push(`年柱：${r.yearGanZhi}　五行局：${r.juName}`);
  lines.push(`命宫：${r.mingBranch}　身宫：${r.shenBranch}　紫微：${r.ziweiBranch}　天府：${r.tianfuBranch}`);
  lines.push('');
  lines.push('宫位\t宫干支\t主星\t辅星\t四化\t长生\t大限');
  r.palaces.forEach((p) => {
    lines.push([
      p.name, p.ganZhi,
      p.mainStars.join(',') || '—',
      p.auxStars.join(',') || '—',
      p.sihua.join(',') || '—',
      p.changsheng || '—',
      p.daxian,
    ].join('\t'));
  });
  lines.push('');
  lines.push('四化：' + r.sihua.map((h) => `${h.star}${h.type}（${h.palace}）`).join('　'));
  lines.push('');
  lines.push(...narrativeText(readZiwei(r)));
  return lines.join('\n');
}