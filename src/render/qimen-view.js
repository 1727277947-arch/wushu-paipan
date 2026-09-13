/** 奇门遁甲结果渲染 */

import { esc, chip, secTitle, tag } from './ui.js';

/** 九宫在 3x3 网格中的位置（洛书方位：上南下北，左东右西） */
const GRID_POS = {
  // 传统排盘：巽四 离九 坤二 / 震三 中五 兑七 / 艮八 坎一 乾六
  4: [1, 1], 9: [1, 2], 2: [1, 3],
  3: [2, 1], 5: [2, 2], 7: [2, 3],
  8: [3, 1], 1: [3, 2], 6: [3, 3],
};

export function renderQimen(r) {
  const parts = [];

  parts.push(`<div class="meta-bar">
    ${chip('时间', r.solarText)}
    ${chip('四柱', `${r.dayGanZhi}日 ${r.hourGanZhi}时`, true)}
    ${chip('局数', r.juName, true)}
    ${chip('节气', `${r.termName}·${r.yuan}`)}
    ${chip('旬首', `${r.xunShou}（${r.xunShouStem}）`)}
    ${chip('值符', r.zhifuStar, true)}
    ${chip('值使', r.zhishiDoor, true)}
    ${chip('旬空', r.xunKong.join(''))}
  </div>`);

  parts.push(secTitle('九宫排盘'));
  const byPos = {};
  r.palaces.forEach((p) => { byPos[p.palace] = p; });

  const cells = [];
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      const palace = Object.keys(GRID_POS).find(
        (k) => GRID_POS[k][0] === row && GRID_POS[k][1] === col,
      );
      cells.push(palaceCell(byPos[palace], r));
    }
  }
  parts.push(`<div class="qimen-grid">${cells.join('')}</div>`);

  parts.push(secTitle('三奇六仪与门星神'));
  parts.push(`<table class="pillar-table"><thead><tr>
    <th>宫位</th><th>方位</th><th>地盘干</th><th>天盘干</th><th>九星</th><th>八门</th><th>八神</th>
  </tr></thead><tbody>`);
  r.palaces.forEach((p) => {
    parts.push(`<tr>
      <td>${esc(p.name)}</td>
      <td style="font-size:12px;color:var(--ink-faint)">${esc(p.direction)}</td>
      <td><span class="tag">${esc(p.earthStem || '—')}</span></td>
      <td><span class="tag move">${esc(p.skyStem || '—')}</span></td>
      <td>${p.isZhifu ? tag(p.star, 'shi') : esc(p.star)}</td>
      <td>${p.isZhishi ? tag(p.door, 'ying') : esc(p.door)}</td>
      <td>${esc(p.god || '—')}</td>
    </tr>`);
  });
  parts.push('</tbody></table>');

  parts.push(secTitle('排盘说明'));
  parts.push(`<ul class="notes">
    <li><b>局数</b>由节气与日干支的元（上中下元）决定，共阴阳二遁十八局。</li>
    <li><b>地盘</b>三奇六仪按戊己庚辛壬癸丁丙乙顺序，阳遁顺布、阴遁逆布。</li>
    <li><b>值符</b>为旬首所临之九星，加于时干落宫；<b>值使</b>为其对应之门。</li>
    <li><b>八神</b>以值符为首，阳遁顺行、阴遁逆行。</li>
    <li>奇门主要用于<b>择时、布局、趋避</b>，与八字命理分工不同。</li>
  </ul>`);

  return parts.join('');
}

function palaceCell(p, r) {
  if (!p) return '<div class="qm-cell"></div>';
  const cls = ['qm-cell', p.palace === 5 ? 'center' : '', p.isZhifu ? 'is-zhifu' : '', p.isZhishi ? 'is-zhishi' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}">
    <div class="qm-top">
      <span class="qm-palace">${esc(p.name)}</span>
      <span class="qm-dir">${esc(p.direction)}</span>
    </div>
    <div class="qm-stars">
      <span class="qm-star">${esc(p.star)}</span>
      ${p.isZhifu ? tag('值符', 'shi') : ''}
    </div>
    <div class="qm-stars">
      <span class="qm-door">${esc(p.door || '—')}</span>
      ${p.isZhishi ? tag('值使', 'ying') : ''}
    </div>
    <div class="qm-god">${esc(p.god || '')}</div>
    <div class="qm-stems">
      <span><span class="lbl">地</span> <span class="s-earth">${esc(p.earthStem || '—')}</span></span>
      <span><span class="lbl">天</span> <span class="s-sky">${esc(p.skyStem || '—')}</span></span>
    </div>
  </div>`;
}

/** 纯文本导出 */
export function qimenText(r) {
  const lines = [];
  lines.push(`时间：${r.solarText}`);
  lines.push(`四柱：${r.dayGanZhi}日 ${r.hourGanZhi}时`);
  lines.push(`局数：${r.juName}（${r.termName}·${r.yuan}）`);
  lines.push(`旬首：${r.xunShou}（${r.xunShouStem}）　值符：${r.zhifuStar}　值使：${r.zhishiDoor}`);
  lines.push(`旬空：${r.xunKong.join('')}`);
  lines.push('');
  lines.push('九宫：');
  const order = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const rows = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
  rows.forEach((row) => {
    const line = row.map((pos) => {
      const p = r.palaces.find((x) => x.palace === pos);
      if (!p) return '';
      return `${p.name} ${p.star}${p.door !== '—' ? p.door : ''}${p.god || ''} 地${p.earthStem}天${p.skyStem}`;
    });
    lines.push(line.join(' | '));
  });
  return lines.join('\n');
}