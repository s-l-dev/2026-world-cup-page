import React, { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useOdds, pct, bj, nm, tn } from '../lib.jsx'

const fpct = x => x == null ? '—' : `${(x * 100).toFixed(1)}%`
const fvig = v => v == null ? '—' : `${(v * 100).toFixed(2)}%`
const sgn = v => (v > 0 ? '+' : '') + v

function Back() {
  const nav = useNavigate(), loc = useLocation()
  const onBack = e => { e.preventDefault(); (loc.key && loc.key !== 'default') ? nav(-1) : nav('/') }
  return <a href="/" onClick={onBack} className="back">← 返回</a>
}

// per-bookmaker odds table: model / consensus / best-price summary rows, then each book sorted sharpest-first
function BookTable({ sels, labels, group, model }) {
  const { books, best, consensus } = group
  const short = s => {
    if (s === 'draw') return '平'
    if (s === 'over' || s === 'under') return labels[s]
    if (sels.includes('draw')) return s === 'home' ? '主胜' : '客胜'
    return s === 'home' ? '主队' : '客队'
  }
  const priceLabel = s => short(s)
  const probLabel = s => `去水${short(s)}`
  const Empty = ({ label }) => <td className="empty" data-label={label}>—</td>
  return (
    <div className="mtbl-wrap bookwrap"><table className={`mtbl booktbl cols-${sels.length}`}>
      <thead><tr>
        <th>博彩</th>
        {sels.map(s => <th key={s}>{labels[s]}</th>)}
        <th>抽水</th>
        {sels.map(s => <th key={s + 'p'}>去水{labels[s]}</th>)}
      </tr></thead>
      <tbody>
        {model && (
          <tr className="srow model"><td className="sel" data-label="来源"><span className="bookname">模型</span></td>
            {sels.map(s => <Empty key={s} label={priceLabel(s)} />)}<Empty label="抽水" />
            {sels.map(s => <td key={s} className="np" data-label={probLabel(s)}>{fpct(model[s])}</td>)}
          </tr>
        )}
        <tr className="srow cons"><td className="sel" data-label="来源"><span className="bookname">共识去水</span></td>
          {sels.map(s => <Empty key={s} label={priceLabel(s)} />)}<Empty label="抽水" />
          {sels.map(s => <td key={s} className="np" data-label={probLabel(s)}>{fpct(consensus[s])}</td>)}
        </tr>
        <tr className="srow best"><td className="sel" data-label="来源"><span className="bookname">最高价 · 比价</span></td>
          {sels.map(s => <td key={s} className="bp" data-label={priceLabel(s)}>{best[s]}</td>)}<Empty label="抽水" />
          {sels.map(s => <Empty key={s} label={probLabel(s)} />)}
        </tr>
        {books.map((b, i) => (
          <tr key={i} className={i === 0 ? 'sharp' : ''}>
            <td className="sel" data-label="博彩"><span className="bookname">{b.bk}</span>{i === 0 && <span className="tag">最锐</span>}</td>
            {sels.map(s => <td key={s} data-label={priceLabel(s)} className={best[s] === b.o[s] ? 'bp' : ''}>{b.o[s]}</td>)}
            <td className="vig" data-label="抽水">{fvig(b.vig)}</td>
            {sels.map(s => <td key={s} className="np" data-label={probLabel(s)}>{fpct(b.nv[s])}</td>)}
          </tr>
        ))}
      </tbody>
    </table></div>
  )
}

const TABS = [['h2h', '胜平负'], ['spreads', '让球'], ['totals', '大小球']]

export default function Odds() {
  const { id } = useParams()
  const od = useOdds()
  const [mk, setMk] = useState('h2h')
  if (!od) return <div className="wrap"><div className="loading">加载赔率…</div></div>
  const m = od.matches.find(x => x.id === id)
  if (!m) return <div className="wrap"><Back /><p>未找到该比赛的赔率（淘汰赛待定或未开盘）。</p></div>
  const mk3 = { home: tn(m.home), draw: '平', away: tn(m.away) }
  const mk2 = { home: tn(m.home), away: tn(m.away) }
  const ou = { over: '大', under: '小' }
  const mkt = m.markets || {}

  return (
    <div className="wrap detail odds-page">
      <Back />
      <header className="dhead">
        <h1>{tn(m.home)} <span className="dim">vs</span> {tn(m.away)} · 逐家赔率</h1>
        <div className="sub">{bj(m.kickoff)}（北京时间）· {m.finished ? '已完赛' : '未开赛'} · 开盘价</div>
      </header>

      <div className="tabs odds-tabs">{TABS.map(([k, l]) => {
        const avail = k === 'h2h' ? !!mkt.h2h : (mkt[k] || []).length > 0
        return <button key={k} disabled={!avail} className={mk === k ? 'on' : ''} onClick={() => setMk(k)}>{l}</button>
      })}</div>

      {mk === 'h2h' && mkt.h2h && (
        <section className="card odds-card">
          <div className="mlabel">胜平负 1X2 <span className="dim">· {mkt.h2h.books.length} 家 · 按抽水从低到高</span></div>
          <BookTable sels={['home', 'draw', 'away']} labels={mk3} group={mkt.h2h} model={mkt.h2h.model} />
        </section>
      )}
      {mk === 'spreads' && (mkt.spreads || []).map((g, i) => (
        <section className="card odds-card" key={i}>
          <div className="mlabel">让球 {tn(m.home)} {sgn(g.line)} <span className="dim">· {g.books.length} 家</span></div>
          <BookTable sels={['home', 'away']} labels={mk2} group={g} model={g.model} />
        </section>
      ))}
      {mk === 'totals' && (mkt.totals || []).map((g, i) => (
        <section className="card odds-card" key={i}>
          <div className="mlabel">总进球 {g.line} <span className="dim">· {g.books.length} 家</span></div>
          <BookTable sels={['over', 'under']} labels={ou} group={g} model={g.model} />
        </section>
      ))}

      <div className="note small">
        <b>抽水</b> = 该家溢出 = Σ(1/赔率) − 1，越低越锐（交易所/Pinnacle 最低）。
        <b>去水概率</b> = 去掉抽水后的真实概率估计（每家自己的看法）；<b>最低抽水盘</b>（最锐）的去水最接近真实概率。
        <b>共识去水</b> = 各家去水的均值（更稳的真实概率）。<b>模型</b> = 我们自己的预测，用来和市场找分歧。
        <b>最高价</b> 仅供比价找最高赔率。期望值 EV = 真实概率 × 你下到的赔率 − 1；但 EV 只和你的概率一样准——软盘背离多为噪声。仅供分析、非下注建议。
      </div>
      <footer>逐家赔率 · 影子模式 · 仅供分析</footer>
    </div>
  )
}
