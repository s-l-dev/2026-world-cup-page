import React, { useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useData, pct, bj, nm, tn, ProbBar, ShotMap, Momentum, Zones, CompareBar, Pills, Rating, Crest, TeamName } from '../lib.jsx'

// Back to the previous view (restores the list tab/filters); falls back to home on deep-link.
function BackLink({ label = '← 返回赛程' }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const onBack = e => { e.preventDefault(); (loc.key && loc.key !== 'default') ? navigate(-1) : navigate('/') }
  return <a href="/" onClick={onBack} className="back">{label}</a>
}

const luckTag = f => f.gf - f.xf >= 1 ? ' 高效' : (f.xf - f.gf >= 1 ? ' 低效' : '')
const Form = ({ list }) => list.length
  ? <div className="forms">{list.map((f, i) => <span key={i} className="formchip">vs{tn(f.opp)} <b>{f.gf}-{f.ga}</b> <em>xG{f.xf.toFixed(1)}-{f.xa.toFixed(1)}</em>{luckTag(f)}</span>)}</div>
  : <span className="dim">首战</span>

const cell = (value, className = '') => ({ value, className })
const num = value => cell(value ?? '—', 'num')
const signed = value => cell(value ?? '—', `num ${String(value || '').trim().startsWith('+') ? 'pos' : String(value || '').trim().startsWith('-') ? 'neg' : ''}`)

const statFrom = (text, key) => text.match(new RegExp(`${key}([+-]?\\d+(?:\\.\\d+)?)`))?.[1] ?? '—'
const goalsFrom = text => text.match(/(\d+)球/)?.[1] ?? '0'
const ratingFrom = text => text.match(/评分([+-]?\d+(?:\.\d+)?)/)?.[1] ?? '—'
const teamClass = i => i === 0 ? 'home' : i === 1 ? 'away' : ''

function ReportTable({ columns, rows, compact = false }) {
  if (!rows?.length) return null
  return (
    <div className="rtbl-wrap">
      <table className={`rtbl${compact ? ' compact' : ''}`}>
        <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => {
            const cells = Array.isArray(row) ? row : row.cells
            return (
              <tr key={i} className={Array.isArray(row) ? '' : row.className || ''}>
                {cells.map((c, j) => {
                  const v = typeof c === 'object' && c !== null ? c.value : c
                  const cls = typeof c === 'object' && c !== null ? c.className : ''
                  return <td key={j} className={cls} data-label={columns[j] || ''}>{v}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const FallbackBullets = ({ lines }) => (
  <ul>{lines.map((b, j) => <li key={j}>{b}</li>)}</ul>
)

const ReportNotes = ({ lines }) => lines?.length ? (
  <ul className="rnotes">{lines.map((b, j) => <li key={j}>{b}</li>)}</ul>
) : null

const ReportCallouts = ({ lines }) => lines?.length ? (
  <div className="rcallouts">
    {lines.map((b, j) => {
      const cls = b.startsWith('✅') ? 'pos' : b.startsWith('❌') ? 'neg' : b.startsWith('⚑') ? 'warn' : ''
      return <div className={`rcallout ${cls}`} key={j}>{b}</div>
    })}
  </div>
) : null

function parsePlayerToken(team, raw, cls = '') {
  const m = raw.trim().match(/^(.+?)\((.+)\)$/)
  if (!m) return null
  return {
    className: cls,
    cells: [
      cell(tn(team), 'sel'),
      cell(m[1], 'player'),
      num(goalsFrom(m[2])),
      num(statFrom(m[2], 'xG')),
      num(statFrom(m[2], 'xA')),
      num(ratingFrom(m[2])),
    ],
  }
}

function renderModelJudgment(lines) {
  const first = lines.find(x => x.startsWith('模型：'))
  const m = first?.match(/^模型：(.+?) 胜 ([\d.]+)% \/ 平 ([\d.]+)% \/ (.+?) 胜 ([\d.]+)%，最可能 ([^（]+)（λ (.+?) ([\d.]+) - ([\d.]+) (.+?)）。/)
  if (!m) return null
  const [, home, hp, dp, away, ap, topScore, , hl, al] = m
  const notes = lines.filter(x => x !== first && !x.startsWith('注意：'))
  const callouts = lines.filter(x => x.startsWith('注意：'))
  return (
    <>
      <div className="rsummary">
        <span><b>最可能比分</b><strong>{topScore.trim()}</strong></span>
        <span><b>模型进球 λ</b><strong>{tn(home)} {hl} - {al} {tn(away)}</strong></span>
      </div>
      <ReportTable columns={['选项', '概率', '模型进球']} rows={[
        { className: 'home', cells: [cell(`${tn(home)} 胜`, 'sel team home'), num(`${hp}%`), num(hl)] },
        { className: 'draw', cells: [cell('平局', 'sel team draw'), num(`${dp}%`), num('—')] },
        { className: 'away', cells: [cell(`${tn(away)} 胜`, 'sel team away'), num(`${ap}%`), num(al)] },
      ]} />
      <ReportNotes lines={notes} />
      <ReportCallouts lines={callouts} />
    </>
  )
}

function renderRecentForm(lines) {
  const teamRows = []
  const notes = []
  lines.forEach(line => {
    // handles both '样本仅 1 场，参考价值低' and '（N 场）'; parses ALL opponents
    const rich = line.match(/^(.+?)（(?:样本仅 )?(\d+) 场(?:，([^）]+))?）：场均 xG 攻 ([\d.]+) \/ 防 ([\d.]+)；对手 (.+?)。$/)
    const empty = line.match(/^([^：]+)：本届尚未有可用过程数据/)
    if (rich) {
      const [, team, sample, caveat, xgf, xga, oppsRaw] = rich
      const items = oppsRaw.split('、').map((t, k) => {
        const mm = t.match(/^(.+?)\(([^,]+),xG([\d.]+)-([\d.]+)\)$/)
        if (!mm) return <span className="oppitem" key={k}>{t}</span>
        const [s1, s2] = mm[2].split('-')  // 本队进球 - 对手进球
        const res = +s1 > +s2 ? 'w' : +s1 < +s2 ? 'l' : 'd'
        return (
          <span className="oppitem" key={k}>
            <span className="vs">vs</span> <b>{tn(mm[1])}</b>
            <span className={`fres ${res}`}>{mm[2]}</span>
            <em>xG {mm[3]}-{mm[4]}</em>
          </span>
        )
      })
      const opps = <span className="oppslist">{items}</span>
      teamRows.push({ team, sample, xgf, xga, opps, caveat: caveat || '—' })
    } else if (empty) {
      teamRows.push({ team: empty[1], sample: '0', xgf: '—', xga: '—', opps: '暂无过程数据', caveat: '首战或缺失' })
    } else {
      notes.push(line)
    }
  })
  if (!teamRows.length) return null
  // 球队顺序固定为主、客 → teamClass by row index
  const rows = teamRows.map((r, i) => ({
    className: teamClass(i),
    cells: [cell(tn(r.team), `sel team ${teamClass(i)}`), num(r.sample), num(r.xgf), num(r.xga), cell(r.opps), cell(r.caveat)],
  }))
  return (
    <>
      <ReportTable columns={['球队', '样本', 'xG攻', 'xG防', '对手 / 最近比赛', '备注']} rows={rows} />
      <ReportNotes lines={notes} />
    </>
  )
}

function renderAttackDefense(lines) {
  const modelLine = lines.find(x => x.startsWith('结论（模型校正后）'))
  const model = modelLine?.match(/模型预测进球 (.+?) ([\d.]+) - ([\d.]+) (.+?)[，。](.*)/)
  const meanLine = lines.find(x => x.startsWith('本届均值'))
  const mean = meanLine?.match(/：(.+?) 进攻([\d.]+) vs (.+?) 防守([\d.]+)（差([+-]?[\d.]+)）｜ (.+?) 进攻([\d.]+) vs (.+?) 防守([\d.]+)（差([+-]?[\d.]+)）/)
  const attackLine = lines.find(x => x.startsWith('进攻区域：'))
  const attack = attackLine?.match(/^进攻区域：(.+?) 偏([^()]+)\((\d+)%\)、(.+?) 偏([^()]+)\((\d+)%\)。/)
  const weakLine = lines.find(x => x.startsWith('防守软肋：'))
  const weak = weakLine?.match(/^防守软肋：(.+?) 在([^()]+)偏松\((\d+)%\)、(.+?) 在([^()]+)偏松\((\d+)%\)。/)
  const used = new Set([modelLine, meanLine, attackLine, weakLine].filter(Boolean))
  const callouts = lines.filter(x => x.startsWith('⚑'))
  callouts.forEach(x => used.add(x))
  const notes = lines.filter(x => !used.has(x))
  const tables = []
  const modelCallouts = []
  if (model) {
    const [, home, hl, al, away, verdict] = model
    tables.push(<ReportTable key="model" columns={['模型校正', '预测进球']} rows={[
      { className: 'home', cells: [cell(tn(home), 'sel team home'), num(hl)] },
      { className: 'away', cells: [cell(tn(away), 'sel team away'), num(al)] },
    ]} compact />)
    if (verdict) modelCallouts.push(`模型校正后：${verdict}`)
  }
  if (mean) {
    tables.push(<ReportTable key="mean" columns={['本届对位', '进攻xG', '对手防守xG', '差值']} rows={[
      [cell(`${tn(mean[1])} 进攻 vs ${tn(mean[3])} 防守`, 'sel'), num(mean[2]), num(mean[4]), signed(mean[5])],
      [cell(`${tn(mean[6])} 进攻 vs ${tn(mean[8])} 防守`, 'sel'), num(mean[7]), num(mean[9]), signed(mean[10])],
    ]} compact />)
  }
  if (attack || weak) {
    const lanes = new Map()
    if (attack) {
      lanes.set(attack[1], { team: attack[1], atk: `${attack[2]} ${attack[3]}%` })
      lanes.set(attack[4], { team: attack[4], atk: `${attack[5]} ${attack[6]}%` })
    }
    if (weak) {
      lanes.set(weak[1], { ...(lanes.get(weak[1]) || { team: weak[1] }), weak: `${weak[2]} ${weak[3]}%` })
      lanes.set(weak[4], { ...(lanes.get(weak[4]) || { team: weak[4] }), weak: `${weak[5]} ${weak[6]}%` })
    }
    tables.push(<ReportTable key="lanes" columns={['球队', '进攻倾向', '防守软肋']} rows={[...lanes.values()].map((x, i) => ({ className: teamClass(i), cells: [cell(tn(x.team), `sel team ${teamClass(i)}`), cell(x.atk || '—'), cell(x.weak || '—')] }))} compact />)
  }
  if (!tables.length) return null
  return <>{tables}<ReportCallouts lines={[...modelCallouts, ...callouts]} /><ReportNotes lines={notes} /></>
}

function renderKeyPlayers(lines) {
  const rows = []
  const callouts = []
  const notes = []
  let teamIdx = -1
  lines.forEach(line => {
    const fire = line.match(/^(.+?) 火力点：(.+)。/)
    if (fire) {
      teamIdx++  // home=0, away=1 by appearance order (not row count, which breaks if tokens fail)
      const cls = teamClass(teamIdx)
      fire[2].split('、').forEach(raw => {
        const parsed = parsePlayerToken(fire[1], raw, cls)
        if (parsed) rows.push(parsed)
      })
    } else if (line.trim().startsWith('→') || line.startsWith('⚑')) {
      callouts.push(line)
    } else {
      notes.push(line)
    }
  })
  if (!rows.length) return null
  return (
    <>
      <ReportTable columns={['球队', '球员', '进球', 'xG', 'xA', '评分']} rows={rows} />
      <ReportCallouts lines={callouts} />
      <ReportNotes lines={notes} />
    </>
  )
}

function renderTactics(lines) {
  const teams = []
  const byTeam = new Map()
  const used = new Set()
  lines.forEach(line => {
    const setup = line.match(/^([^：]+)：阵型 ([^，]+)，(.+?)（控球 ([\d.]+)\/直接 ([\d.]+)，防线 (.+?)）。/)
    if (setup) {
      const [, team, shape, style, control, direct, lineHeight] = setup
      const row = { team, shape, style, control, direct, lineHeight }
      byTeam.set(team, row)
      teams.push(team)
      used.add(line)
      return
    }
    const press = line.match(/^\s*(.+?) 压迫倾向.*?：对方半场触球占比 ([\d.]+)%、PPDA≈([\d.]+).*?→ (.+?)。/)
    if (press) {
      const [, team, territory, ppda, label] = press
      byTeam.set(team, { ...(byTeam.get(team) || { team }), press: `${label} · ${territory}% · PPDA ${ppda}` })
      if (!teams.includes(team)) teams.push(team)
      used.add(line)
    }
  })
  const rows = teams.map((team, i) => {
    const x = byTeam.get(team)
    return {
      className: teamClass(i),
      cells: [
        cell(tn(team), `sel team ${teamClass(i)}`),
        cell(x.shape || '—'),
        cell(x.style || '—'),
        num(x.control),
        num(x.direct),
        cell(x.lineHeight || '—'),
        cell(x.press || '—'),
      ],
    }
  })
  if (!rows.length) return null
  return (
    <>
      <ReportTable columns={['球队', '阵型', '主要风格', '控球', '直接', '防线', '压迫']} rows={rows} />
      <ReportCallouts lines={lines.filter(x => !used.has(x) && x.includes('→'))} />
      <ReportNotes lines={lines.filter(x => !used.has(x) && !x.includes('→'))} />
    </>
  )
}

function renderLuck(lines) {
  const rows = []
  const notes = []
  lines.forEach((line, i) => {
    const m = line.match(/^([^：]+)：进球-xG ([^ ]+)\/场 → ([^；]+)；xG-form ([^。]+)。/)
    if (m) rows.push({ className: teamClass(i), cells: [cell(tn(m[1]), `sel team ${teamClass(i)}`), signed(m[2]), cell(m[3]), signed(m[4])] })
    else notes.push(line)
  })
  if (!rows.length) return null
  return <><ReportTable columns={['球队', '进球-xG/场', '效率解读', 'xG-form']} rows={rows} compact /><ReportNotes lines={notes} /></>
}

function renderPostResult(lines) {
  const final = lines.find(x => x.startsWith('终场 '))
  const xgLine = lines.find(x => x.startsWith('xG '))
  const f = final?.match(/^终场 (.+?) ([\d]+)-([\d]+) (.+?)。(.+)。/)
  const xg = xgLine?.match(/^xG (.+?) ([\d.]+) - ([\d.]+) (.+?)。/)
  if (!f && !xg) return null
  const rows = []
  if (f) rows.push([cell('比分', 'sel'), cell(`${tn(f[1])} ${f[2]}`, 'num'), cell(`${f[3]} ${tn(f[4])}`, 'num'), cell(f[5])])
  if (xg) rows.push([cell('xG', 'sel'), cell(`${tn(xg[1])} ${xg[2]}`, 'num'), cell(`${xg[3]} ${tn(xg[4])}`, 'num'), cell('实际射门质量')])
  return (
    <>
      <ReportTable columns={['指标', '主队', '客队', '备注']} rows={rows} compact />
      <ReportCallouts lines={lines.filter(x => x !== final && x !== xgLine)} />
    </>
  )
}

function renderModelReview(lines) {
  const first = lines.find(x => x.startsWith('赛前模型：'))
  const m = first?.match(/^赛前模型：(.+?) ([\d.]+)% \/ 平 ([\d.]+)% \/ (.+?) ([\d.]+)%，最看好「(.+?)」。/)
  if (!m) return null
  const [, home, hp, dp, away, ap, pick] = m
  return (
    <>
      <div className="rsummary single"><span><b>赛前首选</b><strong>{pick}</strong></span></div>
      <ReportTable columns={['选项', '赛前概率']} rows={[
        { className: 'home', cells: [cell(tn(home), 'sel team home'), num(`${hp}%`)] },
        { className: 'draw', cells: [cell('平局', 'sel team draw'), num(`${dp}%`)] },
        { className: 'away', cells: [cell(tn(away), 'sel team away'), num(`${ap}%`)] },
      ]} compact />
      <ReportCallouts lines={lines.filter(x => x !== first)} />
    </>
  )
}

function renderPostKeyPeople(lines) {
  const playerRows = []
  const goalRows = []
  const notes = []
  lines.forEach((line, i) => {
    const p = line.match(/^([^：]+)：(.+?)（(.+?)）。/)
    if (p) {
      playerRows.push({
        className: teamClass(i),
        cells: [
          cell(tn(p[1]), `sel team ${teamClass(i)}`),
          cell(p[2], 'player'),
          num(goalsFrom(p[3])),
          num(statFrom(p[3], 'xG')),
          num(statFrom(p[3], 'xA')),
        ],
      })
      return
    }
    if (line.startsWith('进球：')) {
      line.replace(/^进球：/, '').split('，').forEach(raw => {
        const g = raw.trim().match(/^([\d+']+)\s+([A-Z]{3})\s+(.+)$/)
        if (g) goalRows.push([cell(g[1], 'num'), cell(tn(g[2]), 'sel'), cell(g[3], 'player')])
        else notes.push(raw.trim())
      })
      return
    }
    notes.push(line)
  })
  if (!playerRows.length && !goalRows.length) return null
  return (
    <>
      <ReportTable columns={['球队', '关键球员', '进球', 'xG', 'xA']} rows={playerRows} compact />
      <ReportTable columns={['时间', '球队', '进球者']} rows={goalRows} compact />
      <ReportNotes lines={notes} />
    </>
  )
}

function renderReportSection(sec) {
  const lines = sec.b || []
  if (sec.t === '模型判断') return renderModelJudgment(lines)
  if (sec.t === '近期状态（小样本）') return renderRecentForm(lines)
  if (sec.t === '进攻防守对位') return renderAttackDefense(lines)
  if (sec.t === '关键球员与软肋') return renderKeyPlayers(lines)
  if (sec.t === '打法与球队结构') return renderTactics(lines)
  if (sec.t === '运气与回归') return renderLuck(lines)
  if (sec.t === '结果与过程') return renderPostResult(lines)
  if (sec.t === '模型对照') return renderModelReview(lines)
  if (sec.t === '关键人物与进球') return renderPostKeyPeople(lines)
  return null
}

function ReportSection({ sec }) {
  const rendered = renderReportSection(sec)
  return (
    <div className={`rsec${rendered ? ' has-table' : ''}`}>
      <h4>{sec.t}</h4>
      {rendered || <FallbackBullets lines={sec.b || []} />}
    </div>
  )
}

const ReportBody = ({ secs }) => secs.map((s, i) => <ReportSection sec={s} key={i} />)

const sgn = v => (v > 0 ? '+' : '') + v
const EvCell = ({ s, label = 'EV' }) => {
  if (!s || s.ev == null) return <td className="ev" data-label={label}>—</td>
  return <td className={`ev ${s.value ? 'pos' : s.ev < 0 ? 'neg' : ''}`} data-label={label}>{s.ev > 0 ? '+' : ''}{s.ev}%{s.value ? ' ✓' : ''}</td>
}

// generic two-side line ladder (handicap / totals): model% · best price · EV per side
function Ladder({ title, sub, lines, lk, rk, llbl, rlbl, fmtLine }) {
  return (
    <div className="mblock">
      <div className="mlabel">{title}{sub && <span className="dim"> · {sub}</span>}</div>
      <div className="mtbl-wrap"><table className="mtbl">
        <thead><tr><th>线</th><th>{llbl}模型</th><th>最优</th><th>EV</th><th>{rlbl}模型</th><th>最优</th><th>EV</th></tr></thead>
        <tbody>{lines.map((r, i) => {
          const L = r[lk], R = r[rk]
          return (
            <tr key={i}>
              <td className="sel" data-label="线">{fmtLine(r.line)}</td>
              <td data-label={`${llbl}模型`}>{L?.modelP != null ? pct(L.modelP) : '—'}</td><td className="best" data-label={`${llbl}最优`}>{L?.best ?? '—'}</td><EvCell s={L} label={`${llbl}EV`} />
              <td data-label={`${rlbl}模型`}>{R?.modelP != null ? pct(R.modelP) : '—'}</td><td className="best" data-label={`${rlbl}最优`}>{R?.best ?? '—'}</td><EvCell s={R} label={`${rlbl}EV`} />
            </tr>
          )
        })}</tbody>
      </table></div>
    </div>
  )
}

function MarketCompare({ m }) {
  const mk = m.market
  if (!mk) return null
  const lbl = { home: tn(m.home), draw: '平局', away: tn(m.away) }
  return (
    <section className="card market">
      <h3>💰 模型 vs 市场 <span className="dim small">下注参考 · 影子模式</span>
        <Link className="oddslink" to={`/odds/${m.id}`} target="_blank" rel="noopener">逐家赔率 →</Link></h3>
      {mk.h2h && (
        <div className="mblock">
          <div className="mlabel">胜平负 1X2 <span className="dim">· {mk.h2h.books} 家均盘</span></div>
          <div className="mtbl-wrap"><table className="mtbl">
            <thead><tr><th>选项</th><th>模型</th><th>市场无水</th><th>公平赔率</th><th>最优赔率</th><th>EV(中位)</th></tr></thead>
            <tbody>{['home', 'draw', 'away'].map(k => {
              const s = mk.h2h.sel[k]; if (!s) return null
              return (
                <tr key={k} className={s.value ? 'val' : ''}>
                  <td className="sel" data-label="选项">{lbl[k]}</td>
                  <td data-label="模型">{pct(s.modelP)}</td><td data-label="市场无水">{s.novig != null ? pct(s.novig) : '—'}</td>
                  <td data-label="公平赔率">{s.fair ?? '—'}</td><td className="best" data-label="最优赔率">{s.best}</td><EvCell s={s} label="EV(中位)" />
                </tr>
              )
            })}</tbody>
          </table></div>
        </div>
      )}
      {mk.spreads && <Ladder title="让球（亚盘）" sub={`${mk.spreads.books} 家`} lines={mk.spreads.lines}
        lk="home" rk="away" llbl={`${tn(m.home)} `} rlbl={`${tn(m.away)} `}
        fmtLine={ln => `${tn(m.home)} ${sgn(ln)}`} />}
      {mk.totals && <Ladder title="总进球 大/小" sub={`${mk.totals.books} 家`} lines={mk.totals.lines}
        lk="over" rk="under" llbl="大 " rlbl="小 " fmtLine={ln => ln} />}
      <div className="note small">⚠️ 仅供分析、非下注建议（影子模式）。<b>对比基准 = 开盘价</b>（市场无水 = 各家去水概率的均值；EV 按各家<b>中位</b>赔率算、稳健；「最优赔率」= 各家最高价、供你比价）。收盘价见下方「盘口走势」。1X2 历史上模型有微弱 CLV 优势，但 EV 大小<b>不能</b>预测盈利、勿按背离加注；让球/大小球是<b>软盘</b>，背离多为噪声、模型并不能稳定打穿收盘——其 EV 仅供参考。✓=按中位价为正期望。</div>
    </section>
  )
}

// raw price board: opening → closing (各家中位价) for 1X2 / handicap / totals
function OddsBoard({ m }) {
  const o = m.odds || {}, od = m.oddsDetail || {}
  const has3 = o.opening || o.closing
  const mergeLines = (ok, ck) => {
    const map = new Map()
    ;(ok || []).forEach(r => map.set(r.line, { line: r.line, o: r }))
    ;(ck || []).forEach(r => { const e = map.get(r.line) || { line: r.line }; e.c = r; map.set(r.line, e) })
    return [...map.values()].sort((a, b) => a.line - b.line)
  }
  const sp = mergeLines(od.opening?.spreads, od.closing?.spreads)
  const to = mergeLines(od.opening?.totals, od.closing?.totals)
  if (!has3 && !sp.length && !to.length) return null
  const c3 = d => d ? `${d.home} / ${d.draw} / ${d.away}` : '—'
  return (
    <div className="oddsboard">
      <div className="k">盘口走势（开盘 → 收盘）<span className="dim small"> · 各家中位价</span></div>
      {has3 && (
        <div className="mtbl-wrap"><table className="mtbl otbl">
          <thead><tr><th>胜平负</th><th>主</th><th>平</th><th>客</th></tr></thead>
          <tbody>
            <tr><td className="sel" data-label="">开盘</td><td data-label="主">{o.opening?.home ?? '—'}</td><td data-label="平">{o.opening?.draw ?? '—'}</td><td data-label="客">{o.opening?.away ?? '—'}</td></tr>
            <tr><td className="sel" data-label="">收盘</td><td data-label="主">{o.closing?.home ?? '—'}</td><td data-label="平">{o.closing?.draw ?? '—'}</td><td data-label="客">{o.closing?.away ?? '—'}</td></tr>
          </tbody>
        </table></div>
      )}
      {sp.length > 0 && (
        <div className="mtbl-wrap"><table className="mtbl otbl">
          <thead><tr><th>让球线</th><th>开盘 主/客</th><th>收盘 主/客</th></tr></thead>
          <tbody>{sp.map((r, i) => (
            <tr key={i}><td className="sel" data-label="线">{tn(m.home)} {sgn(r.line)}</td>
              <td data-label="开盘">{r.o ? `${r.o.home} / ${r.o.away}` : '—'}</td>
              <td data-label="收盘">{r.c ? `${r.c.home} / ${r.c.away}` : '—'}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      {to.length > 0 && (
        <div className="mtbl-wrap"><table className="mtbl otbl">
          <thead><tr><th>总进球线</th><th>开盘 大/小</th><th>收盘 大/小</th></tr></thead>
          <tbody>{to.map((r, i) => (
            <tr key={i}><td className="sel" data-label="线">{r.line}</td>
              <td data-label="开盘">{r.o ? `${r.o.over} / ${r.o.under}` : '—'}</td>
              <td data-label="收盘">{r.c ? `${r.c.over} / ${r.c.under}` : '—'}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <div className="dim small">各家中位价；让球以主队为基准（负=主队让球）。"—"表示该时点未捕获该线（如未到收盘）。完整模型对比见上方「模型 vs 市场」。</div>
    </div>
  )
}

// collapsible card: clickable header toggles the body (info layering for the long detail page)
function Collapse({ title, sub, cls = '', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`card collapse ${cls} ${open ? 'open' : 'closed'}`}>
      <button type="button" className="collapse-h" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ct">{title}{sub && <span className="dim small"> {sub}</span>}</span>
        <span className="chev">{open ? '收起 ▾' : '展开 ▸'}</span>
      </button>
      {open && <div className="collapse-b">{children}</div>}
    </section>
  )
}

export default function Detail() {
  const { id } = useParams()
  const data = useData()
  const [vi, setVi] = useState(0)
  if (!data) return <div className="wrap"><div className="loading">加载…</div></div>
  const m = data.matches.find(x => x.id === id)
  if (!m) return <div className="wrap"><BackLink label="← 返回" /><p>未找到</p></div>
  const sc = m.scouting, p = m.prediction, ts = m.teamStats
  const hist = m.predHistory || []
  const snap = hist[vi] || p

  return (
    <div className="wrap detail">
      <BackLink />
      <header className="dhead">
        <h1 className="sr-only">{nm(m.home)} vs {nm(m.away)}</h1>
        <div className="matchmeta">{bj(m.kickoff)}（北京时间） · 组{m.group || m.stage} · {m.finished ? '已完赛' : '未开赛'}</div>
        <div className="scoreboard">
          <div className="side home">
            <Crest code={m.home} className="xl" />
            <strong><TeamName code={m.home} /></strong>
          </div>
          <div className="scorebox">
            {m.finished
              ? <><b>{m.result.h}</b><span>-</span><b>{m.result.a}</b></>
              : <span className="vsmark">VS</span>}
            <small>{m.finished ? 'Full time' : 'Preview'}</small>
          </div>
          <div className="side away">
            <Crest code={m.away} className="xl" />
            <strong><TeamName code={m.away} /></strong>
          </div>
        </div>
      </header>

      {m.finished && sc.postReport && (
        <section className="card report">
          <h3>赛后复盘</h3>
          <ReportBody secs={sc.postReport} />
        </section>
      )}

      {sc.report && (
        <Collapse title="球探报告" sub={m.finished ? '· 赛前留存' : ''} cls="report" defaultOpen={!m.finished}>
          <ReportBody secs={sc.report} />
        </Collapse>
      )}

      {p && (
        <section className="card prediction">
          <h3><span>模型预测</span>
            {hist.length > 1 && (
              <select className="vsel" value={vi} onChange={e => setVi(+e.target.value)}>
                {hist.map((h, i) => <option key={i} value={i}>{bj(h.at)}{i === 0 ? ' · 最新' : ''}</option>)}
              </select>
            )}
          </h3>
          <ProbBar p={snap.x12} home={tn(m.home)} away={tn(m.away)} />
          <CompareBar label="模型预测进球 λ" h={snap.lambda.home} a={snap.lambda.away} hn={nm(m.home)} an={nm(m.away)} />
          <div className="dim small">λ = 模型赛前预测的「场均进球数」（来自球队实力评级），是预测值。区别于下方赛后的 xG（由实际射门质量算出的预期进球值）。</div>
          <div className="grid">
            <div><span className="k">最可能比分</span>{snap.topScores.slice(0, 3).map(s => `${s.score} ${pct(s.p)}`).join('，')}</div>
            <div><span className="k">大小球 2.5</span>大 {pct(p.totals.o25)} / 小 {pct(1 - p.totals.o25)}</div>
            <div><span className="k">半场 主/平/客</span>{pct(p.ht.home)} / {pct(p.ht.draw)} / {pct(p.ht.away)}</div>
            <div><span className="k">双方进球</span>{pct(p.btts)}</div>
          </div>
          {p.scoreProbs && p.scoreProbs.length > 0 && (
            <div className="scoreodds">
              <div className="k">比分概率（模型）</div>
              <div className="soGrid">{p.scoreProbs.map((s, i) => (
                <div className="soCell" key={i}><b>{s.score}</b><em>{pct(s.p)}</em></div>
              ))}</div>
              <div className="dim small">模型对各比分的发生概率（前 12 高）。我们的盘口源不含正确比分市场，故只给概率、不给赔率。</div>
            </div>
          )}
          {vi > 0 && <div className="dim small">↑ 历史快照（生成于 {bj(snap.at)}，截止 {bj(snap.cutoff)}，北京时间）；比分概率/大小球/半场/双方进球为最新值</div>}
          {hist.length > 1 && <div className="dim small">共 {hist.length} 个预测快照，默认显示最新</div>}
        </section>
      )}

      <MarketCompare m={m} />

      <Collapse title="赛前情报" cls="intel" defaultOpen={false}>
        <div className="row"><span className="k">{tn(m.home)} 近况</span><Form list={sc.formHome} /></div>
        <div className="row"><span className="k">{tn(m.away)} 近况</span><Form list={sc.formAway} /></div>
        <CompareBar label="场均净 xG（进攻 − 防守）" h={sc.xgFormHome} a={sc.xgFormAway} hn={nm(m.home)} an={nm(m.away)} />
        <div className="dim small">净 xG = 场均（创造的 xG − 被对手创造的 xG）。正 = 过程上压制对手、负 = 被压制；衡量「踢得好不好」，剔除运气进球。样本少时仅供参考。</div>
        {sc.common.length > 0 && (
          <div className="cobox">
            <div className="k">共同对手三角</div>
            {sc.common.map((c, i) => (
              <div className="corow" key={i}>
                <span className="coh">{tn(m.home)} {c.home.gf}-{c.home.ga}<em>xG{c.home.xf.toFixed(1)}</em></span>
                <span className="coopp">vs {tn(c.opp)}</span>
                <span className="coa"><em>xG{c.away.xf.toFixed(1)}</em>{c.away.gf}-{c.away.ga} {tn(m.away)}</span>
              </div>
            ))}
            <div className="lean">→ <b>{sc.commonLean > 0.3 ? '倾向 ' + tn(m.home) : sc.commonLean < -0.3 ? '倾向 ' + tn(m.away) : '难分'}</b></div>
          </div>
        )}
        {sc.h2h.length > 0 && <div className="row"><span className="k">近期交手</span><div className="forms">{sc.h2h.map((x, i) => <span key={i} className="formchip">{x.date.slice(0, 4)} {x.home ? '主' : '客'}{x.fh}-{x.fa}</span>)}</div></div>}
        {(sc.injHome.length > 0 || sc.injAway.length > 0) && <div className="row"><span className="k">伤停</span><div className="dim">
          {sc.injHome.length > 0 && <div>{tn(m.home)}: {sc.injHome.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
          {sc.injAway.length > 0 && <div>{tn(m.away)}: {sc.injAway.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
        </div></div>}
        <OddsBoard m={m} />
      </Collapse>

      {m.finished && ts && (
        <Collapse title="赛后关键数据" cls="stats" defaultOpen={false}>
          {ts.home && ts.away && <>
            <CompareBar label="xG 预期进球值（按实际射门质量）" h={+(ts.home.x || 0).toFixed(2)} a={+(ts.away.x || 0).toFixed(2)} hn={nm(m.home)} an={nm(m.away)} />
            <CompareBar label="射门" h={ts.home.s || 0} a={ts.away.s || 0} hn={nm(m.home)} an={nm(m.away)} />
            <CompareBar label="控球" h={Math.round(ts.home.p || 0)} a={Math.round(ts.away.p || 0)} suffix="%" hn={nm(m.home)} an={nm(m.away)} />
          </>}
          {m.setPiece && <CompareBar label="定位球 xG" h={m.setPiece.home.sp} a={m.setPiece.away.sp} hn={nm(m.home)} an={nm(m.away)} />}
          {m.ratings && Object.entries(m.ratings).map(([tid, ps]) => (
            <div className="row" key={tid}><span className="k">{tn(tid)} 评分</span><div className="forms">{ps.map((x, i) => <span key={i} className="rchip">{x.name}<Rating r={x.r} /></span>)}</div></div>
          ))}
          {m.events?.length > 0 && <div className="row"><span className="k">进球/牌</span><div className="forms">{m.events.map((e, i) => <span key={i} className="evchip">{e.min}' {e.type === 'Goal' ? '进球' : '黄牌'} {tn(e.team)} {e.player}</span>)}</div></div>}
          <Zones zones={m.zones} home={m.home} away={m.away} />
          <ShotMap shots={m.shotmap} home={m.home} away={m.away} />
          <Momentum values={m.momentum} />
        </Collapse>
      )}

      <footer>仅供分析 · 影子模式</footer>
    </div>
  )
}
