import type { FullState } from '../game/engine'
import type { CfdPoint } from '../game/events'
import { computeLostOpportunity } from '../game/opportunity'
import type { TicketClass } from '../game/types'

export type ChartKind = 'cfd' | 'finance' | 'cycle' | 'loss'

interface ChartsModalProps {
  state: FullState
  kind: ChartKind
  onClose: () => void
}

const CFD_LAYERS: { key: keyof Omit<CfdPoint, 'day'>; label: string; color: string }[] = [
  { key: 'deployed', label: 'Выпущено', color: '#5a6a6e' },
  { key: 'ready', label: 'К релизу', color: '#8a9a4a' },
  { key: 'test', label: 'Тест', color: '#3f9a45' },
  { key: 'dev', label: 'Разработка', color: '#4a74d6' },
  { key: 'analysis', label: 'Анализ', color: '#c05454' },
  { key: 'selected', label: 'К работе', color: '#c4a35a' },
]

const CLASS_COLOR: Record<TicketClass, string> = {
  standard: '#c4a035',
  fixed: '#8b6bb8',
  intangible: '#4a9a5a',
  expedite: '#c45c26',
}

const TITLES: Record<ChartKind, string> = {
  cfd: 'Cumulative Flow Diagram',
  finance: 'Financial Summary',
  cycle: 'Cycle Time (Lead Time)',
  loss: 'Потери к дню 21',
}

export function ChartsModal({ state, kind, onClose }: ChartsModalProps) {
  return (
    <div className="modal-backdrop chart-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card chart-card"
        role="dialog"
        aria-labelledby="chart-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="chart-card-head">
          <h2 id="chart-title">{TITLES[kind]}</h2>
          <button type="button" className="chart-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>
        <div className="chart-body">
          {kind === 'cfd' && <CfdChart points={state.cfd} />}
          {kind === 'finance' && <FinanceChart log={state.financeLog} />}
          {kind === 'cycle' && <CycleChart entries={state.leadTimeLog} />}
          {kind === 'loss' && <LossChart state={state} />}
        </div>
        <p className="chart-caption">
          {kind === 'cfd' && 'Снимок количества карточек по стадиям на конец каждого дня (как в getKanban CFD).'}
          {kind === 'finance' && 'Биллинг каждые 3 дня: подписчики × тариф − штрафы → прибыль нарастающим итогом.'}
          {kind === 'cycle' && 'Lead time = день выпуска − день выбора. Каждая точка — выпущенный тикет.'}
          {kind === 'loss' &&
            'Доступно после закрытия биллинга дня 21: незавершённые задачи × тариф $300.'}
        </p>
      </div>
    </div>
  )
}

function CfdChart({ points }: { points: CfdPoint[] }) {
  if (points.length === 0) {
    return <p className="chart-empty">Данных пока нет — завершите хотя бы один день до шага «графики».</p>
  }

  const w = 560
  const h = 280
  const pad = { t: 16, r: 16, b: 36, l: 40 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const totals = points.map((p) =>
    CFD_LAYERS.reduce((s, layer) => s + (p[layer.key] as number), 0),
  )
  const maxY = Math.max(1, ...totals)
  const n = points.length
  const xAt = (i: number) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yAt = (v: number) => pad.t + innerH - (v / maxY) * innerH

  // stacked area paths from bottom
  const layerPaths = CFD_LAYERS.map((layer, layerIdx) => {
    const tops: number[] = []
    const bottoms: number[] = []
    for (let i = 0; i < n; i++) {
      let bottom = 0
      for (let j = 0; j < layerIdx; j++) {
        bottom += points[i][CFD_LAYERS[j].key] as number
      }
      const top = bottom + (points[i][layer.key] as number)
      bottoms.push(bottom)
      tops.push(top)
    }
    let d = `M ${xAt(0)} ${yAt(tops[0])}`
    for (let i = 1; i < n; i++) d += ` L ${xAt(i)} ${yAt(tops[i])}`
    for (let i = n - 1; i >= 0; i--) d += ` L ${xAt(i)} ${yAt(bottoms[i])}`
    d += ' Z'
    return { ...layer, d }
  })

  return (
    <div className="chart-svg-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="CFD">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = yAt(maxY * t)
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="chart-grid" />
              <text x={pad.l - 6} y={y + 3} className="chart-axis" textAnchor="end">
                {Math.round(maxY * t)}
              </text>
            </g>
          )
        })}
        {layerPaths.map((layer) => (
          <path key={layer.key} d={layer.d} fill={layer.color} opacity={0.85} />
        ))}
        {points.map((p, i) => (
          <text key={p.day} x={xAt(i)} y={h - 12} className="chart-axis" textAnchor="middle">
            {p.day}
          </text>
        ))}
        <text x={w / 2} y={h - 2} className="chart-axis-label" textAnchor="middle">
          День
        </text>
        <text
          x={12}
          y={h / 2}
          className="chart-axis-label"
          textAnchor="middle"
          transform={`rotate(-90 12 ${h / 2})`}
        >
          Карточки
        </text>
      </svg>
      <ul className="chart-legend">
        {[...CFD_LAYERS].reverse().map((l) => (
          <li key={l.key}>
            <i style={{ background: l.color }} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FinanceChart({ log }: { log: FullState['financeLog'] }) {
  if (log.length === 0) {
    return <p className="chart-empty">Финансовых циклов ещё нет — первый биллинг на день 9.</p>
  }

  const w = 560
  const h = 280
  const pad = { t: 20, r: 20, b: 40, l: 48 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const maxProfit = Math.max(1, ...log.map((e) => Math.max(e.profitToDate, e.revenue, 1)))
  const n = log.length
  const barW = Math.min(48, innerW / n - 12)
  const xAt = (i: number) => pad.l + ((i + 0.5) / n) * innerW
  const yAt = (v: number) => pad.t + innerH - (Math.max(0, v) / maxProfit) * innerH

  // line for profit to date
  const linePts = log.map((e, i) => `${xAt(i)},${yAt(e.profitToDate)}`).join(' ')

  return (
    <div className="chart-svg-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Finance">
        {[0, 0.5, 1].map((t) => {
          const y = yAt(maxProfit * t)
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="chart-grid" />
              <text x={pad.l - 6} y={y + 3} className="chart-axis" textAnchor="end">
                ${Math.round(maxProfit * t)}
              </text>
            </g>
          )
        })}
        {log.map((e, i) => {
          const x = xAt(i) - barW / 2
          const y = yAt(e.revenue)
          const bh = pad.t + innerH - y
          return (
            <g key={e.day}>
              <rect x={x} y={y} width={barW} height={Math.max(0, bh)} fill="#4a74d6" opacity={0.55} />
              {e.fines > 0 && (
                <rect
                  x={x}
                  y={yAt(e.fines)}
                  width={barW}
                  height={Math.max(0, pad.t + innerH - yAt(e.fines))}
                  fill="#c05454"
                  opacity={0.7}
                />
              )}
              <text x={xAt(i)} y={h - 18} className="chart-axis" textAnchor="middle">
                Д{e.day}
              </text>
              <text x={xAt(i)} y={y - 4} className="chart-axis" textAnchor="middle">
                {e.totalSubscribers}п
              </text>
            </g>
          )
        })}
        <polyline points={linePts} fill="none" stroke="#2f7d6d" strokeWidth={2.5} />
        {log.map((e, i) => (
          <circle key={`p-${e.day}`} cx={xAt(i)} cy={yAt(e.profitToDate)} r={4} fill="#2f7d6d" />
        ))}
      </svg>
      <ul className="chart-legend">
        <li>
          <i style={{ background: '#4a74d6' }} />
          Выручка цикла
        </li>
        <li>
          <i style={{ background: '#2f7d6d' }} />
          Прибыль нарастающим итогом
        </li>
        <li>
          <i style={{ background: '#c05454' }} />
          Штрафы
        </li>
      </ul>
      <table className="chart-table">
        <thead>
          <tr>
            <th>День</th>
            <th>+подп.</th>
            <th>Всего</th>
            <th>Выручка</th>
            <th>Штраф</th>
            <th>Прибыль</th>
          </tr>
        </thead>
        <tbody>
          {log.map((e) => (
            <tr key={e.day}>
              <td>{e.day}</td>
              <td>{e.newSubscribers}</td>
              <td>{e.totalSubscribers}</td>
              <td>${e.revenue}</td>
              <td>{e.fines ? `−$${e.fines}` : '—'}</td>
              <td>${e.profitToDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CycleChart({
  entries,
}: {
  entries: FullState['leadTimeLog']
}) {
  // unique by ticketId (last wins)
  const byTicket = new Map<string, (typeof entries)[0]>()
  for (const e of entries) byTicket.set(e.ticketId, e)
  const list = [...byTicket.values()].sort((a, b) => a.day - b.day || a.ticketId.localeCompare(b.ticketId))

  if (list.length === 0) {
    return <p className="chart-empty">Пока нет выпущенных тикетов с lead time.</p>
  }

  const w = 560
  const h = 280
  const pad = { t: 16, r: 16, b: 40, l: 40 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const maxLt = Math.max(1, ...list.map((e) => e.leadTime))
  const days = [...new Set(list.map((e) => e.day))].sort((a, b) => a - b)
  const minDay = days[0]
  const maxDay = days[days.length - 1]
  const xAt = (day: number) =>
    pad.l + (maxDay === minDay ? innerW / 2 : ((day - minDay) / (maxDay - minDay)) * innerW)
  const yAt = (lt: number) => pad.t + innerH - (lt / maxLt) * innerH

  // distribution tallies
  const dist = new Map<number, number>()
  for (const e of list) dist.set(e.leadTime, (dist.get(e.leadTime) ?? 0) + 1)

  return (
    <div className="chart-svg-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Cycle time">
        {[0, 0.5, 1].map((t) => {
          const y = yAt(maxLt * t)
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="chart-grid" />
              <text x={pad.l - 6} y={y + 3} className="chart-axis" textAnchor="end">
                {Math.round(maxLt * t)}
              </text>
            </g>
          )
        })}
        {list.map((e) => (
          <g key={e.ticketId}>
            <circle
              cx={xAt(e.day)}
              cy={yAt(e.leadTime)}
              r={6}
              fill={CLASS_COLOR[e.class]}
              stroke="#fff"
              strokeWidth={1}
            >
              <title>{`${e.ticketId}: LT=${e.leadTime} (день ${e.day})`}</title>
            </circle>
            <text x={xAt(e.day)} y={yAt(e.leadTime) - 8} className="chart-dot-label" textAnchor="middle">
              {e.ticketId}
            </text>
          </g>
        ))}
        <text x={w / 2} y={h - 8} className="chart-axis-label" textAnchor="middle">
          День выпуска
        </text>
        <text
          x={12}
          y={h / 2}
          className="chart-axis-label"
          textAnchor="middle"
          transform={`rotate(-90 12 ${h / 2})`}
        >
          Lead time (дни)
        </text>
      </svg>
      <ul className="chart-legend">
        <li>
          <i style={{ background: CLASS_COLOR.standard }} />
          Standard
        </li>
        <li>
          <i style={{ background: CLASS_COLOR.fixed }} />
          Fixed
        </li>
        <li>
          <i style={{ background: CLASS_COLOR.intangible }} />
          Intangible
        </li>
        <li>
          <i style={{ background: CLASS_COLOR.expedite }} />
          Expedite
        </li>
      </ul>
      <table className="chart-table">
        <thead>
          <tr>
            <th>LT</th>
            <th>Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {[...dist.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([lt, count]) => (
              <tr key={lt}>
                <td>{lt} дн.</td>
                <td>{count}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

function LossChart({ state }: { state: FullState }) {
  const loss = computeLostOpportunity(state)

  if (!loss) {
    return (
      <p className="chart-empty">
        Результат появится после финального биллинга дня 21 — перед окончанием игры.
      </p>
    )
  }

  if (loss.items.length === 0) {
    return (
      <div className="chart-svg-wrap">
        <div className="loss-summary" role="group" aria-label="Итог потерь">
          <div className="loss-stat">
            <span>Потерянные подписчики</span>
            <strong>0</strong>
          </div>
          <div className="loss-stat">
            <span>Тариф дня {loss.asOfDay}</span>
            <strong>${loss.rate}</strong>
          </div>
          <div className="loss-stat loss-stat-accent">
            <span>Потерянный заработок</span>
            <strong>$0</strong>
          </div>
        </div>
        <p className="chart-empty">Все взятые в работу задачи к дню 21 выпущены — потерь нет.</p>
      </div>
    )
  }

  return (
    <div className="chart-svg-wrap">
      <div className="loss-summary" role="group" aria-label="Итог потерь">
        <div className="loss-stat">
          <span>Потерянные подписчики</span>
          <strong>{loss.lostSubscribers}</strong>
        </div>
        <div className="loss-stat">
          <span>Тариф дня {loss.asOfDay}</span>
          <strong>${loss.rate}</strong>
        </div>
        <div className="loss-stat loss-stat-accent">
          <span>Потерянный заработок</span>
          <strong>${loss.lostRevenue}</strong>
        </div>
      </div>
      <p className="loss-formula">
        {loss.lostSubscribers} подп. × ${loss.rate} = ${loss.lostRevenue}
      </p>
      <table className="chart-table">
        <thead>
          <tr>
            <th>Тикет</th>
            <th>Колонка</th>
            <th>Выбран</th>
            <th>LT→21</th>
            <th>−подп.</th>
          </tr>
        </thead>
        <tbody>
          {loss.items.map((item) => (
            <tr key={item.ticketId}>
              <td>
                {item.ticketId}
                <span className="loss-ticket-title"> · {item.title}</span>
              </td>
              <td>{item.columnLabel}</td>
              <td>Д{item.daySelected}</td>
              <td>{item.leadTimeIfDay21}</td>
              <td>{item.lostSubscribers || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
