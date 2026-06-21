import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData, pct, fmtKick } from '../lib.jsx'

const TABS = [['standings', '📊 小组积分'], ['group', '📅 小组赛程'], ['ko', '🏆 淘汰赛'], ['bracket', '🗺️ 晋级图']]

function MatchRow({ m }) {
  return (
    <Link to={`/m/${m.id}`} className="mrow" key={m.id}>
      <div className="mtime">{m.kickoff.slice(11, 16)}{m.group && <span className="mg">{m.group}</span>}</div>
      <div className="mteams">{m.home} <span className="dim">vs</span> {m.away}</div>
      <div className="mright">
        {m.finished
          ? <span className="score">{m.result.h}-{m.result.a}</span>
          : (m.prediction && <span className="pred">{pct(m.prediction.x12.home)}/{pct(m.prediction.x12.draw)}/{pct(m.prediction.x12.away)} · {m.prediction.topScores[0].score}</span>)}
        <span className={`badge ${m.finished ? 'fin' : 'up'}`}>{m.finished ? '完赛' : '预测'}</span>
      </div>
    </Link>
  )
}

function ByDate({ matches }) {
  const days = useMemo(() => {
    const g = {}
    matches.forEach(m => { const d = m.kickoff.slice(0, 10); (g[d] ||= []).push(m) })
    return Object.entries(g).sort()
  }, [matches])
  return (
    <>{days.map(([d, ms]) => (
      <div className="dayblock" key={d}>
        <div className="dayhdr">{d} <span className="dim">· {ms.length} 场</span></div>
        <div className="list">{ms.map(m => <MatchRow m={m} key={m.id} />)}</div>
      </div>
    ))}</>
  )
}

function Bracket({ bracket }) {
  return (
    <div className="bracket">
      {bracket.map(r => (
        <div className="bcol" key={r.round}>
          <div className="bhdr">{r.label}</div>
          {r.matches.map(m => (
            <Link to={`/m/${m.id}`} className="bmatch" key={m.id}>
              <div className="bteam">{m.home}{m.result && <b>{m.result.h}</b>}</div>
              <div className="bteam">{m.away}{m.result && <b>{m.result.a}</b>}</div>
              <div className="bdate">{m.date.slice(5)}</div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function List() {
  const data = useData()
  const [tab, setTab] = useState('standings')
  const [g, setG] = useState('')
  if (!data) return <div className="wrap"><div className="loading">加载数据…</div></div>
  const matches = data.matches
  const fin = matches.filter(m => m.finished).length
  const groups = [...new Set(matches.filter(m => m.group).map(m => m.group))].sort()
  const groupMatches = matches.filter(m => m.stage === 'group_stage' && (!g || m.group === g))
  const koMatches = matches.filter(m => m.stage !== 'group_stage')

  return (
    <div className="wrap">
      <header>
        <h1>🏆 世界杯 2026 · 数据与预测</h1>
        <div className="sub">更新 {data.generated_at?.slice(0, 16).replace('T', ' ')} UTC</div>
      </header>
      <div className="kpis"><div><b>{fin}</b>已完赛</div><div><b>{matches.length - fin}</b>未开赛</div><div><b>{matches.length}</b>总场次</div></div>
      <div className="note">⚠️ 模型预测仅供分析参考；"价值"多为模型与市场背离；影子模式，非下注建议。</div>

      <div className="tabs">{TABS.map(([k, lbl]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{lbl}</button>)}</div>

      {tab === 'standings' && (
        <div className="groups">
          {Object.entries(data.standings).map(([gn, teams]) => (
            <div className="gcard" key={gn}><b>组 {gn}</b>
              <table className="st"><thead><tr><th>队</th><th>场</th><th>胜平负</th><th>进失</th><th>分</th></tr></thead>
                <tbody>{teams.map((t, i) => <tr key={t.team} className={i < 2 ? 'qual' : ''}><td>{t.team}</td><td>{t.p}</td><td>{t.w}-{t.d}-{t.l}</td><td>{t.gf}:{t.ga}</td><td><b>{t.pts}</b></td></tr>)}</tbody>
              </table></div>
          ))}
        </div>
      )}
      {tab === 'group' && <>
        <div className="bar"><select value={g} onChange={e => setG(e.target.value)}><option value="">全部组</option>{groups.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
        <ByDate matches={groupMatches} />
      </>}
      {tab === 'ko' && <ByDate matches={koMatches} />}
      {tab === 'bracket' && <Bracket bracket={data.bracket} />}

      <footer>世界杯 2026 数据看板 · 模型+球探，仅供分析</footer>
    </div>
  )
}
