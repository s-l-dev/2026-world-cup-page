import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData, pct, fmtKick, ProbBar, ShotMap, Momentum, Zones } from '../lib.jsx'

const luckTag = f => f.gf - f.xf >= 1 ? ' ⚑运气' : (f.xf - f.gf >= 1 ? ' ⚑欠运' : '')
const Form = ({ list }) => list.length
  ? <>{list.map((f, i) => <span key={i} className="formchip">vs{f.opp} {f.gf}-{f.ga} <em>xG{f.xf.toFixed(1)}-{f.xa.toFixed(1)}</em>{luckTag(f)}</span>)}</>
  : <span className="dim">首战</span>

export default function Detail() {
  const { id } = useParams()
  const data = useData()
  if (!data) return <div className="wrap"><div className="loading">加载…</div></div>
  const m = data.matches.find(x => x.id === id)
  if (!m) return <div className="wrap"><Link to="/" className="back">← 返回</Link><p>未找到比赛</p></div>
  const sc = m.scouting, p = m.prediction, o = m.odds
  const odds = d => d ? `${d.home} / ${d.draw} / ${d.away}` : '—'

  return (
    <div className="wrap detail">
      <Link to="/" className="back">← 返回赛程</Link>
      <header className="dhead">
        <h1>{m.home} <span className="dim">vs</span> {m.away}</h1>
        <div className="sub">{fmtKick(m.kickoff)} UTC · 组{m.group} · {m.finished ? '已完赛' : '未开赛'}</div>
        {m.finished && <div className="bigscore">{m.result.h} – {m.result.a}</div>}
      </header>

      {!m.finished && sc.report && (
        <section className="card report">
          <h3>🔍 球探报告</h3>
          {sc.report.map((s, i) => (
            <div className="rsec" key={i}>
              <h4>{s.t}</h4>
              <ul>{s.b.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
      )}

      {p && (
        <section className="card">
          <h3>📈 模型预测</h3>
          <ProbBar p={p.x12} home={m.home} away={m.away} />
          <div className="grid">
            <div><span className="k">预期进球 λ</span>{m.home} {p.lambda.home} – {p.lambda.away} {m.away}</div>
            <div><span className="k">最可能比分</span>{p.topScores.map(s => `${s.score} ${pct(s.p)}`).join('，')}</div>
            <div><span className="k">大小球</span>1.5 大{pct(p.totals.o15)} · 2.5 大{pct(p.totals.o25)} · 3.5 大{pct(p.totals.o35)}</div>
            <div><span className="k">半场 / BTTS</span>{pct(p.ht.home)}/{pct(p.ht.draw)}/{pct(p.ht.away)} · 双方进球 {pct(p.btts)}</div>
          </div>
        </section>
      )}

      <section className="card">
        <h3>🆚 赛前情报</h3>
        <div className="row"><span className="k">{m.home} 状态</span><div><Form list={sc.formHome} /> <em className="xgf">xG-form {sc.xgFormHome >= 0 ? '+' : ''}{sc.xgFormHome}</em></div></div>
        <div className="row"><span className="k">{m.away} 状态</span><div><Form list={sc.formAway} /> <em className="xgf">xG-form {sc.xgFormAway >= 0 ? '+' : ''}{sc.xgFormAway}</em></div></div>
        {sc.common.length > 0 && (
          <div className="row"><span className="k">共同对手三角</span><div>
            {sc.common.map((c, i) => <div key={i}>经 <b>{c.opp}</b>：{m.home} {c.home.gf}-{c.home.ga}(xG{c.home.xf.toFixed(1)}) ｜ {m.away} {c.away.gf}-{c.away.ga}(xG{c.away.xf.toFixed(1)})</div>)}
            <div className="lean">按 xG 净胜 → <b>{sc.commonLean > 0.3 ? '倾向 ' + m.home : sc.commonLean < -0.3 ? '倾向 ' + m.away : '难分'}</b>（模型隐式三角的可视化）</div>
          </div></div>
        )}
        {sc.h2h.length > 0 && <div className="row"><span className="k">近期交手</span><div>{sc.h2h.map((x, i) => <span key={i} className="formchip">{x.date.slice(0, 4)} {x.home ? '主' : '客'}{x.fh}-{x.fa}</span>)}</div></div>}
        {(sc.injHome.length > 0 || sc.injAway.length > 0) && <div className="row"><span className="k">伤停</span><div className="dim">
          {sc.injHome.length > 0 && <div>{m.home}: {sc.injHome.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
          {sc.injAway.length > 0 && <div>{m.away}: {sc.injAway.map(x => `${x.name}(${x.status})`).join(', ')}</div>}
        </div></div>}
        <div className="row"><span className="k">开盘价 主/平/客</span><div>{odds(o.opening)}</div></div>
        <div className="row"><span className="k">收盘价 主/平/客</span><div>{odds(o.closing)}</div></div>
      </section>

      {m.finished && (
        <section className="card">
          <h3>⚽ 赛后关键数据</h3>
          {m.teamStats?.home && m.teamStats?.away && <>
            <div className="row hi"><span className="k">xG</span><div>{m.home} <b>{(m.teamStats.home.x || 0).toFixed(2)}</b> – <b>{(m.teamStats.away.x || 0).toFixed(2)}</b> {m.away}</div></div>
            <div className="row"><span className="k">射门(射正)/控球</span><div>{m.home} {m.teamStats.home.s}({m.teamStats.home.st})·{Math.round(m.teamStats.home.p)}% — {m.away} {m.teamStats.away.s}({m.teamStats.away.st})·{Math.round(m.teamStats.away.p)}%</div></div>
          </>}
          {m.setPiece && <div className="row"><span className="k">定位球威胁(xG)</span><div>{m.home} {m.setPiece.home.sp}/{m.setPiece.home.tot} — {m.away} {m.setPiece.away.sp}/{m.setPiece.away.tot} <span className="dim">(定位球/总)</span></div></div>}
          {m.topPlayers && <>
            <div className="row"><span className="k">{m.home} 最佳</span><div>{m.topPlayers.home.map(x => `${x.name}(${x.g}球 xG${x.xg})`).join(', ')}</div></div>
            <div className="row"><span className="k">{m.away} 最佳</span><div>{m.topPlayers.away.map(x => `${x.name}(${x.g}球 xG${x.xg})`).join(', ')}</div></div>
          </>}
          {m.ratings && Object.entries(m.ratings).map(([tid, ps]) => <div className="row" key={tid}><span className="k">{tid} 评分榜</span><div>{ps.map(x => `${x.name} ${x.r.toFixed(1)}`).join(', ')}</div></div>)}
          {m.events?.length > 0 && <div className="row"><span className="k">进球/牌</span><div className="dim">{m.events.map((e, i) => <span key={i}>{e.min}' {e.type === 'Goal' ? '⚽' : '🟨'}{e.team} {e.player} </span>)}</div></div>}
          <Zones zones={m.zones} home={m.home} away={m.away} />
          <ShotMap shots={m.shotmap} home={m.home} away={m.away} />
          <Momentum values={m.momentum} />
        </section>
      )}
      <footer>仅供分析 · 影子模式</footer>
    </div>
  )
}
