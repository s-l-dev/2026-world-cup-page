import React, { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData, pct, bj, bjTime, bjDate, nm, tn, Crest, TeamName } from '../lib.jsx'

const TABS = [['standings', '小组积分'], ['group', '小组赛程'], ['ko', '淘汰赛'], ['bracket', '晋级图']]

function MatchRow({ m }) {
  const pr = m.prediction
  const predSegs = pr
    ? [
      ['home', pr.x12.home, tn(m.home)],
      ['draw', pr.x12.draw, '平'],
      ['away', pr.x12.away, tn(m.away)]
    ]
    : []
  return (
    <Link to={`/m/${m.id}`} target="_blank" rel="noopener" className={`mrow ${m.finished ? 'is-final' : 'is-upcoming'}`}>
      <div className="mtime">
        <span className="kick">{bjTime(m.kickoff)}</span>
        {m.group && <span className="mg">{m.group}</span>}
        <span className={`badge ${m.finished ? 'fin' : 'up'}`}>{m.finished ? '完赛' : '未赛'}</span>
      </div>
      <div className="mteams">
        <span className="mteam home"><Crest code={m.home} /><span className="mname">{nm(m.home)}</span></span>
        <span className="dim">vs</span>
        <span className="mteam away"><Crest code={m.away} /><span className="mname">{nm(m.away)}</span></span>
      </div>
      <div className="mright">
        {m.finished
          ? <span className="score">{m.result.h}-{m.result.a}</span>
          : (pr
            ? <span className="pred" title={`${tn(m.home)} ${pct(pr.x12.home)} / 平 ${pct(pr.x12.draw)} / ${tn(m.away)} ${pct(pr.x12.away)}`}>
              {predSegs.map(([k, v, lbl]) => (
                <span className={`pseg ${k}`} style={{ width: `${v * 100}%` }} key={k}>
                  <em>{lbl}</em><b>{pct(v)}</b>
                </span>
              ))}
            </span>
            : <span className="dim">球队待定</span>)}
      </div>
    </Link>
  )
}

function ByDate({ matches }) {
  const days = useMemo(() => {
    const g = {}
    matches.forEach(m => { const d = bjDate(m.kickoff); (g[d] ||= []).push(m) })
    return Object.entries(g).sort()
  }, [matches])
  return <>{days.map(([d, ms]) => (
    <div className="dayblock" key={d}>
      <div className="dayhdr">{d} <span className="dim">· {ms.length} 场</span></div>
      <div className="list">{ms.map(m => <MatchRow m={m} key={m.id} />)}</div>
    </div>
  ))}</>
}

function BCard({ m }) {
  return (
    <Link to={`/m/${m.id}`} target="_blank" rel="noopener" className={`bmatch ${m.result ? 'done' : 'todo'}`}>
      <div className="bteam"><span className="bname"><Crest code={m.home} className="tiny" />{nm(m.home)}</span>{m.result && <b>{m.result.h}</b>}</div>
      <div className="bteam"><span className="bname"><Crest code={m.away} className="tiny" />{nm(m.away)}</span>{m.result && <b>{m.result.a}</b>}</div>
      <div className="bdate">{bjDate(m.kickoff || m.date + 'T00:00:00Z').slice(5)}</div>
    </Link>
  )
}

function Bracket({ bracket }) {
  const cols = bracket.filter(r => !['final', 'third_place_playoff'].includes(r.round))
  const finals = bracket.filter(r => ['final', 'third_place_playoff'].includes(r.round))
  const half = which => (
    <div className={`bracket ${which}`}>
      {cols.map((r, i) => (
        <div className={`bcol r${i} ${r.round}`} key={r.round}>
          <div className="bhdr">{r.label}</div>
          {r.matches.filter(m => m.half === which).map(m => <BCard m={m} key={m.id} />)}
        </div>
      ))}
    </div>
  )
  return (
    <div className="bracketwrap">
      <section className="bsection">
        <div className="bhalf">上半区</div>{half('top')}
      </section>
      <section className="bfinalblock">
        <div className="bfinals">{finals.map(r => (
          <div className={`bfcol ${r.round}`} key={r.round}><div className="bhdr">{r.label}</div>{r.matches.map(m => <BCard m={m} key={m.id} />)}</div>
        ))}</div>
      </section>
      <section className="bsection">
        <div className="bhalf">下半区</div>{half('bottom')}
      </section>
    </div>
  )
}

export default function List() {
  const data = useData()
  // View state lives in the URL so Detail → 返回 restores the exact tab/filters.
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'standings'
  const g = sp.get('g') || ''
  const st = sp.get('st') || ''
  const setParam = (k, v) => setSp(prev => {
    const n = new URLSearchParams(prev)
    if (v) n.set(k, v); else n.delete(k)
    return n
  }, { replace: true })
  const setTab = v => setParam('tab', v)
  const setG = v => setParam('g', v)
  const setSt = v => setParam('st', v)
  if (!data) return <div className="wrap"><div className="loading">加载数据…</div></div>
  const matches = data.matches
  const fin = matches.filter(m => m.finished).length
  const groups = [...new Set(matches.filter(m => m.group).map(m => m.group))].sort()
  const groupMatches = matches.filter(m => m.stage === 'group_stage' && (!g || m.group === g)
    && (!st || (st === 'fin' ? m.finished : !m.finished)))
  const koMatches = matches.filter(m => m.stage !== 'group_stage')

  return (
    <div className="wrap">
      <header>
        <h1>世界杯 2026 数据中心</h1>
        <div className="sub">更新 {bj(data.generated_at)}（北京时间）</div>
      </header>
      <div className="kpis"><div><b>{fin}</b>已完赛</div><div><b>{matches.length - fin}</b>未开赛</div><div><b>{matches.length}</b>总场次</div></div>
      <div className="note">模型预测仅供分析参考；"价值"多为模型与市场背离；影子模式，非下注建议。时间为北京时间。</div>
      <div className="tabs">{TABS.map(([k, lbl]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{lbl}</button>)}</div>

      {tab === 'standings' && (
        <div className="groups">
          {Object.entries(data.standings).map(([gn, teams]) => (
            <div className="gcard" key={gn}><b>组 {gn}</b>
              <table className="st"><thead><tr><th>队</th><th>场</th><th>胜平负</th><th>进失</th><th>分</th></tr></thead>
                <tbody>{teams.map((t, i) => <tr key={t.team} className={i < 2 ? 'qual' : ''}>
                  <td data-label="队"><TeamName code={t.team} /></td>
                  <td data-label="场">{t.p}</td>
                  <td data-label="胜平负"><span className="formnum win">{t.w}</span>-<span className="formnum draw">{t.d}</span>-<span className="formnum loss">{t.l}</span></td>
                  <td data-label="进失">{t.gf}:{t.ga}</td>
                  <td data-label="分"><b>{t.pts}</b></td>
                </tr>)}</tbody>
              </table></div>
          ))}
        </div>
      )}
      {tab === 'group' && <>
        <div className="bar">
          <select value={g} onChange={e => setG(e.target.value)}><option value="">全部组</option>{groups.map(x => <option key={x} value={x}>{x}</option>)}</select>
          <div className="segbtns">
            {[['', '全部'], ['up', '未开赛'], ['fin', '已完赛']].map(([k, lbl]) =>
              <button key={k} className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{lbl}</button>)}
          </div>
        </div>
        <ByDate matches={groupMatches} />
      </>}
      {tab === 'ko' && <ByDate matches={koMatches} />}
      {tab === 'bracket' && <Bracket bracket={data.bracket} />}
      <footer>世界杯 2026 数据看板 · 模型+球探，仅供分析</footer>
    </div>
  )
}
