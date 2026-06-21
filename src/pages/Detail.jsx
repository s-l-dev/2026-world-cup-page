import React, { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useData, pct, bj, nm, ProbBar, ShotMap, Momentum, Zones, CompareBar, Pills, Rating } from '../lib.jsx'

// Back to the previous view (restores the list tab/filters); falls back to home on deep-link.
function BackLink({ label = '← 返回赛程' }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const onBack = e => { e.preventDefault(); (loc.key && loc.key !== 'default') ? navigate(-1) : navigate('/') }
  return <a href="/" onClick={onBack} className="back">{label}</a>
}

const luckTag = f => f.gf - f.xf >= 1 ? ' 高效' : (f.xf - f.gf >= 1 ? ' 低效' : '')
const Form = ({ list }) => list.length
  ? <div className="forms">{list.map((f, i) => <span key={i} className="formchip">vs{nm(f.opp)} <b>{f.gf}-{f.ga}</b> <em>xG{f.xf.toFixed(1)}-{f.xa.toFixed(1)}</em>{luckTag(f)}</span>)}</div>
  : <span className="dim">首战</span>

const ReportBody = ({ secs }) => secs.map((s, i) => (
  <div className="rsec" key={i}><h4>{s.t}</h4><ul>{s.b.map((b, j) => <li key={j}>{b}</li>)}</ul></div>
))

const sgn = v => (v > 0 ? '+' : '') + v
const EvCell = ({ s }) => {
  if (!s || s.ev == null) return <td className="ev">—</td>
  return <td className={`ev ${s.value ? 'pos' : s.ev < 0 ? 'neg' : ''}`}>{s.ev > 0 ? '+' : ''}{s.ev}%{s.value ? ' ✓' : ''}</td>
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
              <td className="sel">{fmtLine(r.line)}</td>
              <td>{L?.modelP != null ? pct(L.modelP) : '—'}</td><td className="best">{L?.best ?? '—'}</td><EvCell s={L} />
              <td>{R?.modelP != null ? pct(R.modelP) : '—'}</td><td className="best">{R?.best ?? '—'}</td><EvCell s={R} />
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
  const lbl = { home: nm(m.home), draw: '平局', away: nm(m.away) }
  return (
    <section className="card market">
      <h3>💰 模型 vs 市场 <span className="dim small">下注参考 · 影子模式</span></h3>
      {mk.h2h && (
        <div className="mblock">
          <div className="mlabel">胜平负 1X2 <span className="dim">· {mk.h2h.books} 家均盘</span></div>
          <div className="mtbl-wrap"><table className="mtbl">
            <thead><tr><th>选项</th><th>模型</th><th>市场无水</th><th>公平赔率</th><th>最优赔率</th><th>EV(中位)</th></tr></thead>
            <tbody>{['home', 'draw', 'away'].map(k => {
              const s = mk.h2h.sel[k]; if (!s) return null
              return (
                <tr key={k} className={s.value ? 'val' : ''}>
                  <td className="sel">{lbl[k]}</td>
                  <td>{pct(s.modelP)}</td><td>{s.novig != null ? pct(s.novig) : '—'}</td>
                  <td>{s.fair ?? '—'}</td><td className="best">{s.best}</td><EvCell s={s} />
                </tr>
              )
            })}</tbody>
          </table></div>
        </div>
      )}
      {mk.spreads && <Ladder title="让球（亚盘）" sub={`${mk.spreads.books} 家`} lines={mk.spreads.lines}
        lk="home" rk="away" llbl={`${nm(m.home)} `} rlbl={`${nm(m.away)} `}
        fmtLine={ln => `${nm(m.home)} ${sgn(ln)}`} />}
      {mk.totals && <Ladder title="总进球 大/小" sub={`${mk.totals.books} 家`} lines={mk.totals.lines}
        lk="over" rk="under" llbl="大 " rlbl="小 " fmtLine={ln => ln} />}
      <div className="note small">⚠️ 仅供分析、非下注建议（影子模式）。EV 按各家<b>中位</b>赔率算（稳健），「最优赔率」供你比价找最高价。1X2 历史上模型有微弱 CLV 优势，但 EV 大小<b>不能</b>预测盈利、勿按背离加注；让球/大小球是<b>软盘</b>，背离多为噪声，模型并不能稳定打穿收盘——其 EV 仅供参考。✓=按中位价为正期望。</div>
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
  const sc = m.scouting, p = m.prediction, o = m.odds, ts = m.teamStats
  const hist = m.predHistory || []
  const snap = hist[vi] || p
  const odds = d => d ? `${d.home} / ${d.draw} / ${d.away}` : '—'

  return (
    <div className="wrap detail">
      <BackLink />
      <header className="dhead">
        <h1 className="sr-only">{nm(m.home)} vs {nm(m.away)}</h1>
        <div className="matchmeta">{bj(m.kickoff)}（北京时间） · 组{m.group || m.stage} · {m.finished ? '已完赛' : '未开赛'}</div>
        <div className="scoreboard">
          <div className="side home">
            <span className="crest xl">{m.home}</span>
            <strong>{nm(m.home)}</strong>
          </div>
          <div className="scorebox">
            {m.finished
              ? <><b>{m.result.h}</b><span>-</span><b>{m.result.a}</b></>
              : <span className="vsmark">VS</span>}
            <small>{m.finished ? 'Full time' : 'Preview'}</small>
          </div>
          <div className="side away">
            <span className="crest xl">{m.away}</span>
            <strong>{nm(m.away)}</strong>
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
        <section className="card report">
          <h3>球探报告{m.finished && <span className="dim small"> · 赛前留存</span>}</h3>
          <ReportBody secs={sc.report} />
        </section>
      )}

      {p && (
        <section className="card prediction">
          <h3>模型预测
            {hist.length > 1 && (
              <select className="vsel" value={vi} onChange={e => setVi(+e.target.value)}>
                {hist.map((h, i) => <option key={i} value={i}>{h.at.replace('T', ' ')}{i === 0 ? ' · 最新' : ''}</option>)}
              </select>
            )}
          </h3>
          <ProbBar p={snap.x12} home={nm(m.home)} away={nm(m.away)} />
          <CompareBar label="模型预测进球 λ" h={snap.lambda.home} a={snap.lambda.away} hn={nm(m.home)} an={nm(m.away)} />
          <div className="dim small">λ = 模型赛前预测的「场均进球数」（来自球队实力评级），是预测值。区别于下方赛后的 xG（由实际射门质量算出的预期进球值）。</div>
          <div className="grid">
            <div><span className="k">最可能比分</span>{snap.topScores.slice(0, 3).map(s => `${s.score} ${pct(s.p)}`).join('，')}</div>
            <div><span className="k">大小球 2.5</span>大 {pct(p.totals.o25)} / 小 {pct(1 - p.totals.o25)}</div>
            <div><span className="k">半场 主/平/客</span>{pct(p.ht.home)} / {pct(p.ht.draw)} / {pct(p.ht.away)}</div>
            <div><span className="k">双方进球</span>{pct(p.btts)}</div>
          </div>
          {vi > 0 && <div className="dim small">↑ 历史快照（生成于 {snap.at.replace('T', ' ')}，截止 {snap.cutoff.replace('T', ' ')}）；大小球/半场/双方进球为最新值</div>}
          {hist.length > 1 && <div className="dim small">共 {hist.length} 个预测快照，默认显示最新</div>}
        </section>
      )}

      <MarketCompare m={m} />

      <section className="card intel">
        <h3>赛前情报</h3>
        <div className="row"><span className="k">{nm(m.home)} 近况</span><Form list={sc.formHome} /></div>
        <div className="row"><span className="k">{nm(m.away)} 近况</span><Form list={sc.formAway} /></div>
        <CompareBar label="场均净 xG（进攻 − 防守）" h={sc.xgFormHome} a={sc.xgFormAway} hn={nm(m.home)} an={nm(m.away)} />
        <div className="dim small">净 xG = 场均（创造的 xG − 被对手创造的 xG）。正 = 过程上压制对手、负 = 被压制；衡量「踢得好不好」，剔除运气进球。样本少时仅供参考。</div>
        {sc.common.length > 0 && (
          <div className="cobox">
            <div className="k">共同对手三角</div>
            {sc.common.map((c, i) => (
              <div className="corow" key={i}>
                <span className="coh">{nm(m.home)} {c.home.gf}-{c.home.ga}<em>xG{c.home.xf.toFixed(1)}</em></span>
                <span className="coopp">vs {nm(c.opp)}</span>
                <span className="coa"><em>xG{c.away.xf.toFixed(1)}</em>{c.away.gf}-{c.away.ga} {nm(m.away)}</span>
              </div>
            ))}
            <div className="lean">→ <b>{sc.commonLean > 0.3 ? '倾向 ' + nm(m.home) : sc.commonLean < -0.3 ? '倾向 ' + nm(m.away) : '难分'}</b></div>
          </div>
        )}
        {sc.h2h.length > 0 && <div className="row"><span className="k">近期交手</span><div className="forms">{sc.h2h.map((x, i) => <span key={i} className="formchip">{x.date.slice(0, 4)} {x.home ? '主' : '客'}{x.fh}-{x.fa}</span>)}</div></div>}
        {(sc.injHome.length > 0 || sc.injAway.length > 0) && <div className="row"><span className="k">伤停</span><div className="dim">
          {sc.injHome.length > 0 && <div>{nm(m.home)}: {sc.injHome.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
          {sc.injAway.length > 0 && <div>{nm(m.away)}: {sc.injAway.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
        </div></div>}
        <div className="oddsrow"><div><span className="k">开盘 主/平/客</span>{odds(o.opening)}</div><div><span className="k">收盘 主/平/客</span>{odds(o.closing)}</div></div>
        <div className="dim small">完整盘口（让球/大小球）与模型对比见上方「模型 vs 市场」。</div>
      </section>

      {m.finished && ts && (
        <section className="card stats">
          <h3>赛后关键数据</h3>
          {ts.home && ts.away && <>
            <CompareBar label="xG 预期进球值（按实际射门质量）" h={+(ts.home.x || 0).toFixed(2)} a={+(ts.away.x || 0).toFixed(2)} hn={nm(m.home)} an={nm(m.away)} />
            <CompareBar label="射门" h={ts.home.s || 0} a={ts.away.s || 0} hn={nm(m.home)} an={nm(m.away)} />
            <CompareBar label="控球" h={Math.round(ts.home.p || 0)} a={Math.round(ts.away.p || 0)} suffix="%" hn={nm(m.home)} an={nm(m.away)} />
          </>}
          {m.setPiece && <CompareBar label="定位球 xG" h={m.setPiece.home.sp} a={m.setPiece.away.sp} hn={nm(m.home)} an={nm(m.away)} />}
          {m.ratings && Object.entries(m.ratings).map(([tid, ps]) => (
            <div className="row" key={tid}><span className="k">{nm(tid)} 评分</span><div className="forms">{ps.map((x, i) => <span key={i} className="rchip">{x.name}<Rating r={x.r} /></span>)}</div></div>
          ))}
          {m.events?.length > 0 && <div className="row"><span className="k">进球/牌</span><div className="forms">{m.events.map((e, i) => <span key={i} className="evchip">{e.min}' {e.type === 'Goal' ? '进球' : '黄牌'} {nm(e.team)} {e.player}</span>)}</div></div>}
          <Zones zones={m.zones} home={m.home} away={m.away} />
          <ShotMap shots={m.shotmap} home={m.home} away={m.away} />
          <Momentum values={m.momentum} />
        </section>
      )}

      <footer>仅供分析 · 影子模式</footer>
    </div>
  )
}
