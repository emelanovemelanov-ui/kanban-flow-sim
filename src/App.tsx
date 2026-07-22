import { useReducer, useState } from 'react'
import { Board } from './components/Board'
import { ChartsModal, type ChartKind } from './components/ChartsModal'
import { Controls } from './components/Controls'
import { EventModal } from './components/EventModal'
import { GameBar } from './components/GameBar'
import {
  assignDie,
  createInitialState,
  dropTicket,
  selectTicket,
  setWip,
  type DropTarget,
  type FullState,
} from './game/engine'
import { primaryAction } from './game/flow'
import type { WipLimits } from './game/types'
import './App.css'

type Action =
  | { type: 'select'; id: string }
  | { type: 'assign'; dieId: string; ticketId: string }
  | { type: 'clearDie'; dieId: string }
  | { type: 'primary' }
  | { type: 'wip'; key: keyof WipLimits; delta: number }
  | { type: 'drop'; ticketId: string; target: DropTarget }
  | { type: 'reset' }

function reducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'select':
      return selectTicket(state, action.id)
    case 'assign':
      return assignDie(state, action.dieId, action.ticketId)
    case 'clearDie':
      return assignDie(state, action.dieId, null)
    case 'primary':
      return primaryAction(state)
    case 'wip':
      return setWip(state, action.key, state.wip[action.key] + action.delta)
    case 'drop':
      return dropTicket(state, action.ticketId, action.target)
    case 'reset':
      return createInitialState()
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [chart, setChart] = useState<ChartKind | null>(null)

  return (
    <div className="app">
      <div className="stage">
        <GameBar
          state={state}
          onPrimary={() => dispatch({ type: 'primary' })}
          onReset={() => dispatch({ type: 'reset' })}
          onClearWorker={(dieId) => dispatch({ type: 'clearDie', dieId })}
          onOpenChart={setChart}
        />
        <div className="day-hint" role="status">
          <span className="day-hint-label">Подсказка дня</span>
          <p>{state.message}</p>
        </div>
        <Board
          state={state}
          onSelectTicket={(id) => dispatch({ type: 'select', id })}
          onDropTicket={(ticketId, target) => dispatch({ type: 'drop', ticketId, target })}
          onAssignWorker={(dieId, ticketId) => dispatch({ type: 'assign', dieId, ticketId })}
        />
        <Controls
          state={state}
          onClearDie={(dieId) => dispatch({ type: 'clearDie', dieId })}
          onWip={(key, delta) => dispatch({ type: 'wip', key, delta })}
        />
      </div>
      <EventModal state={state} onAck={() => dispatch({ type: 'primary' })} />
      {chart && <ChartsModal state={state} kind={chart} onClose={() => setChart(null)} />}
    </div>
  )
}
