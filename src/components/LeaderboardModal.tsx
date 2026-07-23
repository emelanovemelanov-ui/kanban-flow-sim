import { useMemo, useState } from 'react'
import {
  formatFinishedAt,
  listRunsByProfit,
  type PlayerRun,
} from '../storage/resultsStore'

interface LeaderboardModalProps {
  onClose: () => void
  highlightId?: string | null
}

export function LeaderboardModal({ onClose, highlightId = null }: LeaderboardModalProps) {
  const runs = useMemo(() => listRunsByProfit(), [])
  const [selectedId, setSelectedId] = useState<string | null>(highlightId ?? runs[0]?.id ?? null)
  const selected = runs.find((r) => r.id === selectedId) ?? null

  return (
    <div className="modal-backdrop help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card help-card lb-card"
        role="dialog"
        aria-labelledby="lb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-head">
          <div>
            <p className="modal-kicker">Результаты</p>
            <h2 id="lb-title">Таблица лидеров</h2>
          </div>
          <button type="button" className="chart-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="lb-body">
          {runs.length === 0 ? (
            <p className="chart-empty">Пока нет сохранённых партий. Сыграйте до конца дня 21.</p>
          ) : (
            <>
              <div className="lb-table-wrap">
                <table className="chart-table lb-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Игрок</th>
                      <th>Прибыль</th>
                      <th>Подп.</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run, i) => (
                      <tr
                        key={run.id}
                        className={[
                          selectedId === run.id ? 'is-selected' : '',
                          highlightId === run.id ? 'is-highlight' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setSelectedId(run.id)}
                      >
                        <td>{i + 1}</td>
                        <td>{run.playerName}</td>
                        <td>${run.cash}</td>
                        <td>{run.subscribers}</td>
                        <td>{formatFinishedAt(run.finishedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected && <RunDetails run={selected} />}
            </>
          )}
        </div>

        <footer className="help-foot">
          <button type="button" className="btn-start" onClick={onClose}>
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  )
}

function RunDetails({ run }: { run: PlayerRun }) {
  return (
    <div className="lb-details">
      <h3>
        {run.playerName} · ${run.cash}
      </h3>
      <p className="lb-details-meta">
        Подписчики {run.subscribers} · выпущено {run.deployedCount} · ср. LT {run.avgLeadTime} · потери
        −{run.lostSubscribers} подп. (−${run.lostRevenue}) · WIP{' '}
        {run.wip.selected}/{run.wip.analysis}/{run.wip.development}/{run.wip.test}/{run.wip.expedite}
      </p>

      <h4>CFD</h4>
      <div className="lb-scroll">
        <table className="chart-table">
          <thead>
            <tr>
              <th>День</th>
              <th>Вып</th>
              <th>Рел</th>
              <th>Тест</th>
              <th>Разр</th>
              <th>Ан</th>
              <th>К раб</th>
            </tr>
          </thead>
          <tbody>
            {run.cfd.map((p) => (
              <tr key={p.day}>
                <td>{p.day}</td>
                <td>{p.deployed}</td>
                <td>{p.ready}</td>
                <td>{p.test}</td>
                <td>{p.dev}</td>
                <td>{p.analysis}</td>
                <td>{p.selected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Финансы ($)</h4>
      <div className="lb-scroll">
        <table className="chart-table">
          <thead>
            <tr>
              <th>День</th>
              <th>+подп</th>
              <th>Всего</th>
              <th>Выручка</th>
              <th>Штраф</th>
              <th>Прибыль</th>
            </tr>
          </thead>
          <tbody>
            {run.financeLog.map((f) => (
              <tr key={f.day}>
                <td>{f.day}</td>
                <td>{f.newSubscribers}</td>
                <td>{f.totalSubscribers}</td>
                <td>${f.revenue}</td>
                <td>{f.fines ? `−$${f.fines}` : '—'}</td>
                <td>${f.profitToDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Lead time (LT)</h4>
      <div className="lb-scroll">
        <table className="chart-table">
          <thead>
            <tr>
              <th>День</th>
              <th>Тикет</th>
              <th>LT</th>
              <th>Класс</th>
            </tr>
          </thead>
          <tbody>
            {run.leadTimeLog.map((e) => (
              <tr key={`${e.ticketId}-${e.day}`}>
                <td>{e.day}</td>
                <td>{e.ticketId}</td>
                <td>{e.leadTime}</td>
                <td>{e.class}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Потери (−п)</h4>
      {run.lossItems.length === 0 ? (
        <p className="lb-details-meta">Незавершённых задач не было (или данные недоступны).</p>
      ) : (
        <div className="lb-scroll">
          <table className="chart-table">
            <thead>
              <tr>
                <th>Тикет</th>
                <th>Колонка</th>
                <th>Выбран</th>
                <th>LT→21</th>
                <th>−подп</th>
              </tr>
            </thead>
            <tbody>
              {run.lossItems.map((i) => (
                <tr key={i.ticketId}>
                  <td>
                    {i.ticketId} · {i.title}
                  </td>
                  <td>{i.columnLabel}</td>
                  <td>Д{i.daySelected}</td>
                  <td>{i.leadTimeIfDay21}</td>
                  <td>{i.lostSubscribers || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
