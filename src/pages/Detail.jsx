import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData, pct, bj, ProbBar, ShotMap, Momentum, Zones, CompareBar, Pills, Rating } from '../lib.jsx'

const luckTag = f => f.gf - f.xf >= 1 ? '🔥' : (f.xf - f.gf >= 1 ? '🥶' : '')
const Form = ({ list }) => list.length
  ? <div className="forms">{list.map((f, i) => <span key={i} className="formchip">vs{f.opp} <b>{f.gf}-{f.ga}</b> <em>xG{f.xf.toFixed(1)}-{f.xa.toFixed(1)}</em>{luckTag(f)}</span>)}</div>
  : <span className="dim">首战</span>

export default function Detail() {
  const { id } = useParams()
  const data = useData()
  if (!data) return <div className="wrap"><div className="loading">加载…</div></div>
  const m = data.matches.find(x => x.id === id)
  if (!m) return <div className="wrap"><Link to="/" className="back">← 返回</Link><p>未找到</p></div>
  const sc = m.scouting, p = m.prediction, o = m.odds, ts = m.teamStats
  const odds = d => d ? `${d.home} / ${d.draw} / ${d.away}` : '—'

  return (
    <div className="wrap detail">
      <Link to="/" className="back">← 返回赛程</Link>
      <header className="dhead">
        <h1>{m.home} <span className="dim">vs</span> {m.away}</h1>
        <div className="sub">{bj(m.kickoff)}（北京时间）· 组{m.group || m.stage} · {m.finished ? '已完赛' : '未开赛'}</div>
        {m.finished && <div className="bigscore">{m.result.h} <span>:</span> {m.result.a}</div>}
      </header>

      {sc.report && (
        <section className="card report">
          <h3>{m.finished ? '📝 赛后复盘' : '🔍 球探报告'}</h3>
          {sc.report.map((s, i) => (
            <div className="rsec" key={i}><h4>{s.t}</h4><ul>{s.b.map((b, j) => <li key={j}>{b}</li>)}</ul></div>
          ))}
        </section>
      )}

      {p && (
        <section className="card">
          <h3>📈 模型预测</h3>
          <ProbBar p={p.x12} home={m.home} away={m.away} />
          <CompareBar label="预期进球 λ" h={p.lambda.home} a={p.lambda.away} hn={m.home} an={m.away} />
          <div className="grid">
            <div><span className="k">最可能比分</span>{p.topScores.slice(0, 3).map(s => `${s.score} ${pct(s.p)}`).join('，')}</div>
            <div><span className="k">大小球 2.5</span>大 {pct(p.totals.o25)} / 小 {pct(1 - p.totals.o25)}</div>
            <div><span className="k">半场 主/平/客</span>{pct(p.ht.home)} / {pct(p.ht.draw)} / {pct(p.ht.away)}</div>
            <div><span className="k">双方进球</span>{pct(p.btts)}</div>
          </div>
        </section>
      )}

      <section className="card">
        <h3>🆚 赛前情报</h3>
        <div className="row"><span className="k">{m.home} 近况</span><Form list={sc.formHome} /></div>
        <div className="row"><span className="k">{m.away} 近况</span><Form list={sc.formAway} /></div>
        <CompareBar label="xG-form（实力被低估/高估）" h={sc.xgFormHome} a={sc.xgFormAway} hn={m.home} an={m.away} />
        {sc.common.length > 0 && (
          <div className="cobox">
            <div className="k">共同对手三角</div>
            {sc.common.map((c, i) => (
              <div className="corow" key={i}>
                <span className="coh">{m.home} {c.home.gf}-{c.home.ga}<em>xG{c.home.xf.toFixed(1)}</em></span>
                <span className="coopp">vs {c.opp}</span>
                <span className="coa"><em>xG{c.away.xf.toFixed(1)}</em>{c.away.gf}-{c.away.ga} {m.away}</span>
              </div>
            ))}
            <div className="lean">→ <b>{sc.commonLean > 0.3 ? '倾向 ' + m.home : sc.commonLean < -0.3 ? '倾向 ' + m.away : '难分'}</b></div>
          </div>
        )}
        {sc.h2h.length > 0 && <div className="row"><span className="k">近期交手</span><div className="forms">{sc.h2h.map((x, i) => <span key={i} className="formchip">{x.date.slice(0, 4)} {x.home ? '主' : '客'}{x.fh}-{x.fa}</span>)}</div></div>}
        {(sc.injHome.length > 0 || sc.injAway.length > 0) && <div className="row"><span className="k">伤停</span><div className="dim">
          {sc.injHome.length > 0 && <div>{m.home}: {sc.injHome.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
          {sc.injAway.length > 0 && <div>{m.away}: {sc.injAway.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
        </div></div>}
        <div className="oddsrow"><div><span className="k">开盘 主/平/客</span>{odds(o.opening)}</div><div><span className="k">收盘 主/平/客</span>{odds(o.closing)}</div></div>
      </section>

      {m.finished && ts && (
        <section className="card">
          <h3>⚽ 赛后关键数据</h3>
          {ts.home && ts.away && <>
            <CompareBar label="xG（预期进球）" h={+(ts.home.x || 0).toFixed(2)} a={+(ts.away.x || 0).toFixed(2)} hn={m.home} an={m.away} />
            <CompareBar label="射门" h={ts.home.s || 0} a={ts.away.s || 0} hn={m.home} an={m.away} />
            <CompareBar label="控球" h={Math.round(ts.home.p || 0)} a={Math.round(ts.away.p || 0)} suffix="%" hn={m.home} an={m.away} />
          </>}
          {m.setPiece && <CompareBar label="定位球 xG" h={m.setPiece.home.sp} a={m.setPiece.away.sp} hn={m.home} an={m.away} />}
          {m.ratings && Object.entries(m.ratings).map(([tid, ps]) => (
            <div className="row" key={tid}><span className="k">{tid} 评分</span><div className="forms">{ps.map((x, i) => <span key={i} className="rchip">{x.name}<Rating r={x.r} /></span>)}</div></div>
          ))}
          {m.events?.length > 0 && <div className="row"><span className="k">进球/牌</span><div className="forms">{m.events.map((e, i) => <span key={i} className="evchip">{e.min}' {e.type === 'Goal' ? '⚽' : '🟨'}{e.team} {e.player}</span>)}</div></div>}
          <Zones zones={m.zones} home={m.home} away={m.away} />
          <ShotMap shots={m.shotmap} home={m.home} away={m.away} />
          <Momentum values={m.momentum} />
        </section>
      )}
      <footer>仅供分析 · 影子模式</footer>
    </div>
  )
}
