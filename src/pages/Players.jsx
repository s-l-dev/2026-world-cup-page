import React, { useMemo, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { usePlayers, nm, tn, Crest } from '../lib.jsx'

function Back() {
  const nav = useNavigate(), loc = useLocation()
  const onBack = e => { e.preventDefault(); (loc.key && loc.key !== 'default') ? nav(-1) : nav('/') }
  return <a href="/" onClick={onBack} className="back">← 返回</a>
}

// columns: key, label, accessor, better-high (all here are high=better)
const COLS = [
  ['ga', '球+助', p => p.g + p.a],
  ['g', '进球', p => p.g],
  ['a', '助攻', p => p.a],
  ['xg', 'xG', p => p.xg],
  ['xa', 'xA', p => p.xa],
  ['npxg', 'xG+xA', p => +(p.xg + p.xa).toFixed(2)],
  ['sh', '射门', p => p.sh],
  ['rating', '评分', p => p.rating ?? -1],
  ['min', '分钟', p => p.min],
]
const COLMAP = Object.fromEntries(COLS.map(c => [c[0], c]))

export default function Players() {
  const doc = usePlayers()
  const [sp, setSp] = useSearchParams()
  const team = sp.get('team') || ''
  const [sort, setSort] = useState('ga')
  const [q, setQ] = useState('')
  const nav = useNavigate()

  const teams = useMemo(() => doc ? [...new Set(doc.players.map(p => p.team))].sort((a, b) => nm(a) < nm(b) ? -1 : 1) : [], [doc])
  const rows = useMemo(() => {
    if (!doc) return []
    const acc = COLMAP[sort][2]
    return doc.players
      .filter(p => (!team || p.team === team) && (!q || p.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => acc(b) - acc(a) || (b.g + b.a) - (a.g + a.a))
      .slice(0, 200)
  }, [doc, team, sort, q])

  if (!doc) return <div className="wrap"><div className="loading">加载球员数据…</div></div>
  const setTeam = v => setSp(prev => { const n = new URLSearchParams(prev); v ? n.set('team', v) : n.delete('team'); return n }, { replace: true })

  return (
    <div className="wrap players-page">
      <Back />
      <header>
        <h1>本届球员数据榜 <span className="srctag src-wc">本届</span></h1>
        <div className="sub">{doc.players.length} 名出场球员 · FotMob 实测 · 点表头切换排序{team ? ` · ${nm(team)}` : ''}</div>
      </header>

      <div className="bar">
        <select value={team} onChange={e => setTeam(e.target.value)}>
          <option value="">全部国家</option>
          {teams.map(t => <option key={t} value={t}>{nm(t)}</option>)}
        </select>
        <input placeholder="搜索球员…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={sort} onChange={e => setSort(e.target.value)} className="sortsel">
          {COLS.map(([k, l]) => <option key={k} value={k}>按{l}排序</option>)}
        </select>
      </div>

      <div className="mtbl-wrap">
        <table className="mtbl ranktbl">
          <thead><tr>
            <th>#</th><th className="ply">球员</th><th>场</th>
            {COLS.map(([k, l]) => <th key={k} className={`sortable ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{l}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.name + p.team}>
                <td className="rank">{i + 1}</td>
                <td className="ply">
                  <span className="pname">{p.name}</span>
                  <a className="pteam" href={`/players?team=${p.team}`} onClick={e => { e.preventDefault(); setTeam(p.team) }}><Crest code={p.team} className="tiny" />{nm(p.team)}</a>
                </td>
                <td>{p.mp}</td>
                {COLS.map(([k]) => {
                  const v = COLMAP[k][2](p)
                  const show = k === 'rating' ? (p.rating ?? '—') : v
                  return <td key={k} className={sort === k ? 'on' : ''}>{show}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note small">球+助 = 进球+助攻；xG/xA = 预期进球/助攻（机会质量）；评分 = FotMob 场均评分。均为本届实测、出场球员，前 200 名。{team && <button className="clearf" onClick={() => setTeam('')}>清除国家筛选</button>}</div>
      <footer>本届球员数据 · 仅供分析</footer>
    </div>
  )
}
