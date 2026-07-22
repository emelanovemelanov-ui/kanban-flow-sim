import { useState } from 'react'
import type { FullState } from '../game/engine'
import { primaryLabel } from '../game/flow'
import { STEP_LABEL } from '../game/labels'
import { PersonIcon } from './PersonIcon'
import { readDieId } from './TicketCard'
import type { ChartKind } from './ChartsModal'

interface GameBarProps {
  state: FullState
  onPrimary: () => void
  onReset: () => void
  onClearWorker: (dieId: string) => void
  onOpenChart: (kind: ChartKind) => void
}

export function GameBar({ state, onPrimary, onReset, onClearWorker, onOpenChart }: GameBarProps) {
  const [poolOver, setPoolOver] = useState(false)
  const canAssign = !state.gameOver && !state.rolledThisDay && (state.step === 'standup' || state.step === 'work')
  const free = state.dice.filter((d) => !d.assignedTicketId)

  return (
    <header className="game-bar">
      <div className="brand">
        <span className="brand-mark">Kanban</span>
        <span className="brand-ver">
          <span className="brand-techvill">ТехВилл</span> учебная версия
        </span>
      </div>

      <div className="stat-pill">
        <span>День</span>
        <strong>{state.day}</strong>
      </div>
      <div className="stat-pill">
        <span>Касса</span>
        <strong>${state.cash}</strong>
      </div>

      <div
        className={`stat-pill wide staff-pool${poolOver ? ' is-drop-target' : ''}${canAssign ? '' : ' is-locked'}`}
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.types).includes('text/die-id')) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDragEnter={(e) => {
          if (Array.from(e.dataTransfer.types).includes('text/die-id')) {
            e.preventDefault()
            setPoolOver(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setPoolOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setPoolOver(false)
          const dieId = readDieId(e.dataTransfer)
          if (dieId) onClearWorker(dieId)
        }}
      >
        <span>Сотрудники</span>
        <div className="team-figs">
          {free.map((d) => (
            <PersonIcon key={d.id} die={d} draggable={canAssign} />
          ))}
          {free.length === 0 && <em className="staff-empty">все на карточках</em>}
        </div>
        {state.testPolicyStrict && (
          <small className="staff-hint">Политика Карлоса: в тесте только тестировщики</small>
        )}
      </div>

      <div className="chart-btns" role="group" aria-label="Графики">
        <button type="button" className="btn-chart" onClick={() => onOpenChart('cfd')} title="Cumulative Flow Diagram">
          CFD
        </button>
        <button type="button" className="btn-chart" onClick={() => onOpenChart('finance')} title="Financial chart">
          $
        </button>
        <button type="button" className="btn-chart" onClick={() => onOpenChart('cycle')} title="Cycle / Lead time">
          LT
        </button>
        <button
          type="button"
          className="btn-chart"
          onClick={() => onOpenChart('loss')}
          title="Потери: только после финального биллинга дня 21"
        >
          −п
        </button>
      </div>

      <button type="button" className="btn-start" onClick={onPrimary} disabled={state.gameOver && !state.activeEvent}>
        {primaryLabel(state)}
      </button>

      <div className="stat-pill step-pill mute">
        <span>Шаг</span>
        <strong>{STEP_LABEL[state.step]}</strong>
      </div>

      <button
        type="button"
        className="btn-help"
        title="Цикл дня: стендап → назначение → бросок → (биллинг: релиз+финансы) → событие → следующий день. Кнопки CFD / $ / LT / −п открывают графики и потери."
      >
        ?
      </button>
      <button type="button" className="btn-exit" onClick={onReset}>
        Сброс
      </button>
    </header>
  )
}
