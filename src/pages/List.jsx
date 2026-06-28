import React, { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData, pct, bj, bjTime, bjDate, nm, tn, Crest, SquadCrest, TeamName } from '../lib.jsx'

const TABS = [['overview', '预测战绩'], ['bets', '投注建议'], ['standings', '小组积分'], ['group', '小组赛程'], ['ko', '淘汰赛'], ['bracket', '晋级图']]

// Pick label shared by the recommendation rows and the track record.
function betSelLabel(b) {
  return b.market === 'h2h'
    ? (b.selection === 'home' ? tn(b.home) : b.selection === 'away' ? tn(b.away) : '平局')
    : b.market === 'totals' ? `大小球 ${b.selection === 'over' ? '大' : '小'} ${b.line}`
      : `让球 ${tn(b.selection === 'home' ? b.home : b.away)} ${b.line}`
}

// Virtual track record of the would-bet picks (flat-stake), overall + group vs knockout split.
function BetsTrack({ t }) {
  if (!t || !t.overall) return null
  const Card = ({ title, s }) => (
    <div className={`trkcard ${s ? '' : 'empty'}`}>
      <div className="trkt">{title}</div>
      {s ? <>
        <div className="trkbig"><b className={s.roi >= 0 ? 'pos' : 'neg'}>{s.roi >= 0 ? '+' : ''}{(s.roi * 100).toFixed(1)}%</b><span className="dim small">ROI</span></div>
        <div className="trkrow"><span>{s.n} 注 · {s.w}胜{s.l}负</span></div>
        <div className="trkrow"><span>净收益</span><b className={s.net >= 0 ? 'pos' : 'neg'}>{s.net >= 0 ? '+' : ''}{s.net} 注</b></div>
        <div className="trkrow"><span>打过收盘</span><b>{s.posClvRate != null ? pct(s.posClvRate) : '—'}</b></div>
        <div className="trkrow"><span>平均 CLV</span><b>{s.meanClv != null ? (s.meanClv * 100).toFixed(2) + '%' : '—'}</b></div>
      </> : <div className="dim" style={{ padding: '8px 0' }}>暂无已结算</div>}
    </div>
  )
  return (
    <div className="betstrack">
      <div className="trksub">📈 建议跟踪 · 按建议平注的已结算虚拟战绩</div>
      <div className="trkcards"><Card title="整体" s={t.overall} /><Card title="小组赛" s={t.group} /><Card title="淘汰赛" s={t.knockout} /></div>
      {t.byMarket && <div className="trkmkt">
        <div className="trksub2">按盘口拆分（看边际真正在哪——以 CLV 为准，ROI 易被运气带偏）</div>
        <table className="st"><thead><tr><th>盘口</th><th>注数</th><th>胜负</th><th>ROI/注</th><th>打过收盘</th><th>平均CLV</th></tr></thead>
          <tbody>{[['h2h', '胜平负'], ['totals', '大小球'], ['spreads', '让球']].map(([k, lbl]) => {
            const s = t.byMarket[k]
            return <tr key={k}><td data-label="盘口">{lbl}</td>
              {s ? <>
                <td data-label="注数">{s.n}</td><td data-label="胜负">{s.w}-{s.l}</td>
                <td data-label="ROI/注" className={s.roi >= 0 ? 'pos' : 'neg'}>{(s.roi * 100).toFixed(1)}%</td>
                <td data-label="打过收盘">{s.posClvRate != null ? pct(s.posClvRate) : '—'}</td>
                <td data-label="平均CLV" className={s.meanClv >= 0 ? 'pos' : 'neg'}>{s.meanClv != null ? (s.meanClv * 100).toFixed(2) + '%' : '—'}</td>
              </> : <td colSpan="5" className="dim">暂无</td>}
            </tr>
          })}</tbody></table>
        <div className="dim small">⚠ 样本小、方差大。<b>CLV（打过收盘价）比 ROI 可信</b>——ROI 高但 CLV≈0/打过收盘≈50% 多为运气。本届目前 CLV 正向集中在大小球/让球，与"软盘无边际"的旧结论相反，需淘汰赛继续验证。</div>
      </div>}
      {t.recent.length > 0 && <div className="trklist">
        {t.recent.map((r, i) => (
          <Link to={`/m/${r.id}`} target="_blank" rel="noopener" className={`trkrec ${r.won ? 'win' : 'loss'}`} key={i}>
            <span className="trm">{nm(r.home)} <b>{r.score}</b> {nm(r.away)}</span>
            <span className="trp">{betSelLabel(r)} @{r.odds}</span>
            <span className="trpnl">{r.won ? '✓' : '✗'} {r.pnl >= 0 ? '+' : ''}{r.pnl}{r.clv != null ? ` · CLV ${(r.clv * 100).toFixed(1)}%` : ''}</span>
          </Link>
        ))}
      </div>}
      <div className="dim small">单位 = 1 注（平注）。<b>淘汰赛栏会随比赛结算逐步填充</b>——这就是检验小组赛正边际是否延续的地方。CLV&gt;0 = 拿到的价格优于收盘价。</div>
    </div>
  )
}

function BetRow({ b }) {
  const sel = betSelLabel(b)
  return (
    <Link to={`/m/${b.id}`} target="_blank" rel="noopener" className="betrow">
      <div className="betmatch"><SquadCrest code={b.home} className="tiny" />{nm(b.home)} <span className="dim">vs</span> {nm(b.away)}<SquadCrest code={b.away} className="tiny" /></div>
      <div className="betpick"><b>{sel}</b> <span className="betodds">@{b.odds}</span></div>
      <div className="betmeta">
        <span>模型 {pct(b.modelProb)} / 市场 {pct(b.marketProb)}</span>
        <span className="betstake">建议仓位 {b.stakePct}%</span>
        <span className={`betev ${b.ev > 0.5 ? 'hot' : ''}`}>EV {(b.ev * 100).toFixed(0)}%{b.ev > 0.5 ? ' ⚠噪声' : ''}</span>
      </div>
    </Link>
  )
}

function Bets({ bets, meta, track }) {
  if (!meta) return <div className="note">投注建议数据未生成。</div>
  const picks = bets || []
  return (
    <div className="betsboard">
      <div className="betsval">
        小组赛验证：会下注样本 <b>{meta.validatedSample}/{meta.gateTarget}</b> · 打过收盘价 <b>{pct(meta.positiveClvRate)}</b> · 平均 CLV <b>{(meta.meanClv * 100).toFixed(2)}%</b> · 模型仍 <b>shadow</b>
      </div>
      <div className="note">{meta.note} 仓位 = 占总资金的 1/4 凯利建议（封顶 1%）；<b>高赔/大 EV 多为噪声，勿追</b>；非投注指令，自负盈亏。</div>
      <div className="betsub">🎯 待下注价值票（上游比赛）</div>
      {picks.length === 0
        ? <div className="dim" style={{ padding: '12px 0' }}>当前无 +EV 价值票——等开盘赔率到位、或模型与市场出现足够分歧时才会出现（模型很挑，多数场次与市场一致）。</div>
        : <div className="betlist">{picks.map((b, i) => <BetRow b={b} key={i} />)}</div>}
      <BetsTrack t={track} />
    </div>
  )
}

// One finished match: predicted 1X2 bar (winning side highlighted) + predicted top-12 scorelines
// (actual highlighted) + whether the result landed the top pick. All scored on the PRE-KICKOFF
// snapshot, so this is honest accuracy, not a post-result refit.
function OvMatch({ m }) {
  const segs = [['home', m.x12.home, tn(m.home)], ['draw', m.x12.draw, '平'], ['away', m.x12.away, tn(m.away)]]
  return (
    <Link to={`/m/${m.id}`} target="_blank" rel="noopener" className="ovrow">
      <div className="ovteams">
        <span className="ovt"><SquadCrest code={m.home} className="tiny" />{nm(m.home)}</span>
        <b className="ovscore">{m.actual}</b>
        <span className="ovt">{nm(m.away)}<SquadCrest code={m.away} className="tiny" /></span>
        <span className={`ovhit ${m.topPickHit ? 'ok' : 'no'}`}>{m.topPickHit ? '✓ 命中' : '✗ 未中'}</span>
      </div>
      <div className="predbar ov">
        {segs.map(([k, v, lbl]) => (
          <span className={`pseg ${k} ${m.result === k ? 'won' : ''}`} style={{ width: `${v * 100}%` }} key={k}>
            <em>{lbl}</em><b>{pct(v)}</b>
          </span>
        ))}
      </div>
      <div className="ovscores">
        {m.top12.map(s => <span className={`csbox ${s.score === m.actual ? 'hit' : ''}`} key={s.score}>{s.score}<i>{pct(s.p)}</i></span>)}
        {!m.scoreInTop12 && <span className="csbox miss">赛果 {m.actual} 不在前12</span>}
      </div>
    </Link>
  )
}

function Overview({ ov }) {
  if (!ov || !ov.n) return <div className="note">尚无已完赛的赛前预测可统计。</div>
  const Stat = ({ k, v, s }) => <div className="ovstat"><div className="ovk">{k}</div><div className="ovv">{v}</div>{s && <div className="ovs">{s}</div>}</div>
  return (
    <div className="overview">
      <div className="ovgrid">
        <Stat k="胜平负命中" v={pct(ov.topPickRate)} s={`市场 ${pct(ov.marketTopPickRate)}`} />
        <Stat k="赛果在前12比分" v={pct(ov.scoreInTop12Rate)} s="实际比分落在模型前12" />
        <Stat k="正确比分" v={pct(ov.exactScoreRate)} s="最可能比分=赛果" />
        <Stat k="大小球 2.5" v={pct(ov.ou25Rate)} s="过/不过方向" />
        <Stat k="样本" v={`${ov.n} 场`} s={ov.skipped_no_prematch_snapshot ? `另 ${ov.skipped_no_prematch_snapshot} 场无赛前快照` : '均为赛前快照'} />
      </div>
      <div className="ovnote small dim">
        口径：仅用开球前生成的预测打分（无赛果泄漏）。平局：模型 {pct(ov.drawRate.model)} / 市场 {pct(ov.drawRate.market)} / 实际 {pct(ov.drawRate.actual)}。
      </div>
      <div className="ovcal">
        <div className="ovcaltitle">校准（模型置信档 vs 实际命中率）</div>
        <table className="st"><thead><tr><th>置信档</th><th>命中/样本</th><th>实际命中率</th></tr></thead>
          <tbody>{ov.calibration.map(b => (
            <tr key={b.bucket}><td data-label="置信档">{b.bucket}</td><td data-label="命中/样本">{b.hit}/{b.n}</td>
              <td data-label="实际命中率">{b.n ? pct(b.hit / b.n) : '—'}</td></tr>
          ))}</tbody></table>
      </div>
      <div className="ovlisttitle">逐场：预测 vs 赛果（最近在前）</div>
      <div className="ovmatches">{ov.matches.map(m => <OvMatch m={m} key={m.id} />)}</div>
    </div>
  )
}

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
        <span className="mteam home"><SquadCrest code={m.home} /><span className="mname">{nm(m.home)}</span></span>
        <span className="dim">vs</span>
        <span className="mteam away"><SquadCrest code={m.away} /><span className="mname">{nm(m.away)}</span></span>
      </div>
      <div className="mright">
        {m.finished
          ? <span className="score">{m.result.h}-{m.result.a}{m.resultDetail && <em className="kotag">{m.resultDetail.pen ? `点球 ${m.resultDetail.pen.h}-${m.resultDetail.pen.a}` : '加时'}</em>}</span>
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

function ByDate({ matches, reverse = false }) {
  const days = useMemo(() => {
    const g = {}
    matches.forEach(m => { const d = bjDate(m.kickoff); (g[d] ||= []).push(m) })
    const dir = reverse ? -1 : 1
    const ent = Object.entries(g)
    ent.forEach(([, ms]) => ms.sort((x, y) => (x.kickoff < y.kickoff ? -1 : 1) * dir))
    ent.sort((a, b) => (a[0] < b[0] ? -1 : 1) * dir)
    return ent
  }, [matches, reverse])
  return <>{days.map(([d, ms]) => (
    <div className="dayblock" key={d}>
      <div className="dayhdr">{d} <span className="dim">· {ms.length} 场</span></div>
      <div className="list">{ms.map(m => <MatchRow m={m} key={m.id} />)}</div>
    </div>
  ))}</>
}

function BCard({ m }) {
  const adv = m.resultDetail?.advancer
  return (
    <Link to={`/m/${m.id}`} target="_blank" rel="noopener" className={`bmatch ${m.result ? 'done' : 'todo'}`}>
      <div className={`bteam ${adv === m.home ? 'adv' : ''}`}><span className="bname"><SquadCrest code={m.home} className="tiny" />{nm(m.home)}</span>{m.result && <b>{m.result.h}</b>}</div>
      <div className={`bteam ${adv === m.away ? 'adv' : ''}`}><span className="bname"><SquadCrest code={m.away} className="tiny" />{nm(m.away)}</span>{m.result && <b>{m.result.a}</b>}</div>
      {m.resultDetail?.pen && <div className="bpen">点球 {m.resultDetail.pen.h}-{m.resultDetail.pen.a}</div>}
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
  const tab = sp.get('tab') || 'overview'
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
        <div className="sub">更新 {bj(data.generated_at)}（北京时间） · <Link to="/players" className="navlink">球员数据榜 →</Link> · <Link to="/methodology" className="navlink">方法说明 →</Link></div>
      </header>
      <div className="kpis"><div><b>{fin}</b>已完赛</div><div><b>{matches.length - fin}</b>未开赛</div><div><b>{matches.length}</b>总场次</div></div>
      {data.modelReview && (
        <div className="review">
          📊 模型本届战绩（{data.modelReview.n} 场）：胜平负命中 <b>{pct(data.modelReview.model)}</b>（市场 {pct(data.modelReview.market)}）· 正确比分 {pct(data.modelReview.exact)} · 大小球 {pct(data.modelReview.ou)}
          <span className="dim small"> ｜ 打平：模型 {pct(data.modelReview.draw.model)} / 市场 {pct(data.modelReview.draw.market_novig)} / 实际 {pct(data.modelReview.draw.actual)}（模型≈市场，平局偏多多为波动）</span>
        </div>
      )}
      <div className="note">模型预测仅供分析参考；"价值"多为模型与市场背离；影子模式，非下注建议。时间为北京时间。</div>
      <div className="tabs">{TABS.map(([k, lbl]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{lbl}</button>)}</div>

      {tab === 'overview' && <Overview ov={data.overview} />}
      {tab === 'bets' && <Bets bets={data.bets} meta={data.betsMeta} track={data.betsTrack} />}
      {tab === 'standings' && (
        <div className="groups">
          {Object.entries(data.standings).map(([gn, teams]) => (
            <div className="gcard" key={gn}><b>组 {gn}</b>
              <table className="st"><thead><tr><th>队</th><th>场</th><th>胜平负</th><th>进失</th><th>分</th></tr></thead>
                <tbody>{teams.map((t, i) => <tr key={t.team} className={i < 2 ? 'qual' : ''}>
                  <td data-label="队"><Link to={`/players?team=${t.team}`} className="teamlink"><TeamName code={t.team} /></Link></td>
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
        <ByDate matches={groupMatches} reverse={st === 'fin'} />
      </>}
      {tab === 'ko' && <ByDate matches={koMatches} />}
      {tab === 'bracket' && <Bracket bracket={data.bracket} />}
      <footer>世界杯 2026 数据看板 · 模型+球探，仅供分析</footer>
    </div>
  )
}
