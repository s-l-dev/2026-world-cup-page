import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData, pct, fmtKick } from '../lib.jsx'

export default function List() {
  const data = useData()
  const [st, setSt] = useState('')
  const [g, setG] = useState('')
  const [q, setQ] = useState('')
  const matches = data?.matches || []
  const groups = useMemo(() => [...new Set(matches.map(m => m.group).filter(Boolean))].sort(), [matches])
  const fin = matches.filter(m => m.finished).length

  const rows = matches.filter(m => {
    if (st === 'fin' && !m.finished) return false
    if (st === 'up' && m.finished) return false
    if (g && m.group !== g) return false
    if (q && !(m.home + m.away).toUpperCase().includes(q.toUpperCase())) return false
    return true
  })

  if (!data) return <div className="wrap"><div className="loading">加载数据…</div></div>

  return (
    <div className="wrap">
      <header>
        <h1>🏆 世界杯 2026 · 数据与预测</h1>
        <div className="sub">更新 {data.generated_at?.slice(0, 16).replace('T', ' ')} UTC</div>
      </header>
      <div className="kpis">
        <div><b>{fin}</b>已完赛</div><div><b>{matches.length - fin}</b>未开赛</div><div><b>{matches.length}</b>总场次</div>
      </div>
      <div className="note">⚠️ 模型预测仅供分析参考；"价值"多为模型与市场背离（多半模型偏差）；影子模式，非下注建议。</div>

      <h2>📊 小组积分</h2>
      <div className="groups">
        {Object.entries(data.standings || {}).map(([gn, teams]) => (
          <div className="gcard" key={gn}>
            <b>组 {gn}</b>
            <table className="st"><thead><tr><th>队</th><th>场</th><th>胜平负</th><th>进失</th><th>分</th></tr></thead>
              <tbody>{teams.map((t, i) => (
                <tr key={t.team} className={i < 2 ? 'qual' : ''}>
                  <td>{t.team}</td><td>{t.p}</td><td>{t.w}-{t.d}-{t.l}</td><td>{t.gf}:{t.ga}</td><td><b>{t.pts}</b></td>
                </tr>))}</tbody>
            </table>
          </div>
        ))}
      </div>

      <h2>📅 赛程</h2>
      <div className="bar">
        <select value={st} onChange={e => setSt(e.target.value)}><option value="">全部状态</option><option value="fin">已完赛</option><option value="up">未开赛</option></select>
        <select value={g} onChange={e => setG(e.target.value)}><option value="">全部组</option>{groups.map(x => <option key={x} value={x}>{x}</option>)}</select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索球队代码…" />
      </div>
      <div className="list">
        {rows.map(m => (
          <Link to={`/m/${m.id}`} className="mrow" key={m.id}>
            <div className="mtime">{fmtKick(m.kickoff)}<span className="mg">{m.group}</span></div>
            <div className="mteams">{m.home} <span className="dim">vs</span> {m.away}</div>
            <div className="mright">
              {m.finished
                ? <span className="score">{m.result.h}-{m.result.a}</span>
                : (m.prediction && <span className="pred">{pct(m.prediction.x12.home)}/{pct(m.prediction.x12.draw)}/{pct(m.prediction.x12.away)} · {m.prediction.topScores[0].score}</span>)}
              <span className={`badge ${m.finished ? 'fin' : 'up'}`}>{m.finished ? '完赛' : '预测'}</span>
            </div>
          </Link>
        ))}
      </div>
      <footer>世界杯 2026 数据看板 · 模型+球探，仅供分析</footer>
    </div>
  )
}
