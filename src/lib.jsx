import React, { useEffect, useState } from 'react'

let _cache = null
let _teams = {}
export const nm = code => _teams[code] || code   // 三字母代码 -> 全名

const ISO_BY_TEAM = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA', BRA: 'BR', CAN: 'CA',
  CIV: 'CI', COD: 'CD', COL: 'CO', CPV: 'CV', CRO: 'HR', CUW: 'CW', CZE: 'CZ', ECU: 'EC',
  EGY: 'EG', ESP: 'ES', FRA: 'FR', GER: 'DE', GHA: 'GH', HAI: 'HT', IRQ: 'IQ', IRN: 'IR',
  JOR: 'JO', JPN: 'JP', KOR: 'KR', KSA: 'SA', MAR: 'MA', MEX: 'MX', NED: 'NL', NOR: 'NO',
  NZL: 'NZ', PAN: 'PA', PAR: 'PY', POR: 'PT', QAT: 'QA', RSA: 'ZA', SEN: 'SN', SUI: 'CH',
  SWE: 'SE', TUN: 'TN', TUR: 'TR', URU: 'UY', USA: 'US', UZB: 'UZ',
}

const SPECIAL_FLAGS = {
  ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
}

const isoFlag = iso => iso && iso.length === 2
  ? [...iso.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
  : ''

export const flag = code => SPECIAL_FLAGS[code] || isoFlag(ISO_BY_TEAM[code])
export const tn = code => flag(code) ? `${flag(code)} ${nm(code)}` : nm(code)

export function Crest({ code, className = '' }) {
  const f = flag(code)
  return <span className={`crest ${f ? 'has-flag' : ''} ${className}`.trim()} title={nm(code)}>{f || code}</span>
}

export function TeamName({ code, className = '' }) {
  const f = flag(code)
  return (
    <span className={`teamname ${className}`.trim()}>
      {f && <span className="flag" aria-hidden="true">{f}</span>}
      <span>{nm(code)}</span>
    </span>
  )
}

export function useData() {
  const [data, setData] = useState(_cache)
  useEffect(() => {
    if (_cache) return
    fetch('/data.json').then(r => r.json()).then(d => { _cache = d; _teams = d.teams || {}; setData(d) })
  }, [])
  return data
}

let _oddsCache = null
export function useOdds() {
  const [data, setData] = useState(_oddsCache)
  useEffect(() => {
    if (_oddsCache) return
    fetch('/odds.json').then(r => r.json()).then(d => { _oddsCache = d; if (d.teams) _teams = { ..._teams, ...d.teams }; setData(d) })
  }, [])
  return data
}

export const pct = x => `${Math.round((x || 0) * 100)}%`
// 北京时间 (UTC+8)
export const bj = k => k ? new Date(k).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '-') : ''
export const bjTime = k => k ? new Date(k).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }) : ''
export const bjDate = k => k ? new Date(k).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }) : ''
export const fmtKick = bj

// 双向对比条（蓝=主 橙=客）
export function CompareBar({ label, h, a, hn, an, suffix }) {
  const t = (Math.abs(h) + Math.abs(a)) || 1
  return (
    <div className="cmp">
      <div className="cmplab"><b>{h}{suffix}</b><span>{label}</span><b>{a}{suffix}</b></div>
      <div className="cmpbar">
        <i className="ch" style={{ width: `${Math.abs(h) / t * 100}%` }} />
        <i className="ca" style={{ width: `${Math.abs(a) / t * 100}%` }} />
      </div>
    </div>
  )
}
export const Pills = ({ tags }) => <span className="pills">{(tags || []).map((t, i) => <i key={i}>{t}</i>)}</span>
export const Rating = ({ r }) => <span className="rb" style={{ background: r >= 7.5 ? '#1f6f3f' : r >= 6.8 ? '#3a5f2a' : r >= 6 ? '#6a5a1f' : '#5a2b2b' }}>{r.toFixed(1)}</span>

// 1X2 probability tri-bar
export function ProbBar({ p, home, away }) {
  if (!p) return null
  const seg = [['home', p.home, '#1f6f3f', home], ['draw', p.draw, '#3a4654', '平'], ['away', p.away, '#8a5a1f', away]]
  return (
    <div className="probbar">
      {seg.map(([k, v, c, lbl]) => (
        <div key={k} style={{ width: `${v * 100}%`, background: c }} title={`${lbl} ${pct(v)}`}>
          <span>{lbl}</span><b>{pct(v)}</b>
        </div>
      ))}
    </div>
  )
}

// shot-map: home attacks left->right, away mirrored onto one pitch
export function ShotMap({ shots, home, away }) {
  if (!shots || !shots.length) return null
  return (
    <div className="block">
      <div className="lbl">射门质量图 <span className="dim">蓝={tn(home)} 橙={tn(away)}，圈∝xG，实心=射正</span></div>
      <svg viewBox="0 0 100 64" className="pitch">
        <rect x="0" y="0" width="100" height="64" fill="#0b2616" stroke="#2f6f44" />
        <line x1="50" y1="0" x2="50" y2="64" stroke="#2f6f44" />
        <circle cx="50" cy="32" r="7" fill="none" stroke="#2f6f44" />
        <rect x="0" y="18" width="13" height="28" fill="none" stroke="#2f6f44" />
        <rect x="87" y="18" width="13" height="28" fill="none" stroke="#2f6f44" />
        {shots.map((s, i) => {
          const own = s.team === home
          const x = own ? s.x : 100 - s.x, y = (own ? s.y : 100 - s.y) * 0.64
          const r = 1.4 + 7 * Math.sqrt(Math.min(s.xg, 1))
          const col = own ? '#58a6ff' : '#f0883e'
          return <circle key={i} cx={x} cy={y} r={r} fill={s.on ? col : 'none'} stroke={col} strokeWidth="0.9" opacity="0.85" />
        })}
      </svg>
    </div>
  )
}

export function Momentum({ values }) {
  if (!values || !values.length) return null
  const mx = Math.max(...values.map(Math.abs)) || 1
  return (
    <div className="block">
      <div className="lbl">动量曲线 <span className="dim">上=主队压制 下=客队</span></div>
      <svg viewBox="0 0 100 40" className="mom">
        <line x1="0" y1="20" x2="100" y2="20" stroke="#30363d" />
        {values.map((v, i) => {
          const w = 100 / values.length, h = Math.abs(v) / mx * 19
          return <rect key={i} x={i * w} y={v >= 0 ? 20 - h : 20} width={w} height={h} fill={v >= 0 ? '#58a6ff' : '#f0883e'} />
        })}
      </svg>
    </div>
  )
}

export function Zones({ zones, home, away }) {
  if (!zones || (!zones.home && !zones.away)) return null
  const bar = (z, tid) => z ? (
    <div className="zrow"><span className="ztid">{tn(tid)}</span>
      <div className="zbar">
        <i style={{ width: `${z.left}%`, background: '#1f6f3f' }}>{z.left} 左</i>
        <i style={{ width: `${z.center}%`, background: '#30536f' }}>{z.center} 中</i>
        <i style={{ width: `${z.right}%`, background: '#8a5a1f' }}>{z.right} 右</i>
      </div></div>
  ) : null
  return <div className="block"><div className="lbl">进攻区域</div>{bar(zones.home, home)}{bar(zones.away, away)}</div>
}
