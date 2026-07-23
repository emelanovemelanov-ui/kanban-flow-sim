import { useEffect, useReducer, useRef, useState } from 'react'
import { Board } from './components/Board'
import { ChartsModal, type ChartKind } from './components/ChartsModal'
import { Controls } from './components/Controls'
import { EventModal } from './components/EventModal'
import { GameBar } from './components/GameBar'
import { GameOverModal } from './components/GameOverModal'
import { HelpModal } from './components/HelpModal'
import { LeaderboardModal } from './components/LeaderboardModal'
import { RegistrationScreen } from './components/RegistrationScreen'
import {
  assignDie,
  dropTicket,
  selectTicket,
  setWip,
  type DropTarget,
  type FullState,
} from './game/engine'
import { primaryAction, startPlaythroughState } from './game/flow'
import type { WipLimits } from './game/types'
import { savePlayerRun, type PlayerRun } from './storage/resultsStore'
import './App.css'

const HELP_SEEN_KEY = 'kanban-flow-sim-help-seen'

type Phase = 'register' | 'playing'

type Action =
  | { type: 'select'; id: string }
  | { type: 'assign'; dieId: string; ticketId: string }
  | { type: 'clearDie'; dieId: string }
  | { type: 'primary' }
  | { type: 'eventChoice'; yes: boolean }
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
    case 'eventChoice':
      return primaryAction(state, action.yes)
    case 'wip':
      return setWip(state, action.key, state.wip[action.key] + action.delta)
    case 'drop':
      return dropTicket(state, action.ticketId, action.target)
    case 'reset':
      return startPlaythroughState()
    default:
      return state
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('register')
  const [playerName, setPlayerName] = useState('')
  const [state, dispatch] = useReducer(reducer, undefined, startPlaythroughState)
  const [chart, setChart] = useState<ChartKind | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [savedRun, setSavedRun] = useState<PlayerRun | null>(null)
  const [gameOverOpen, setGameOverOpen] = useState(false)
  const savedForGameRef = useRef(false)

  useEffect(() => {
    if (phase !== 'playing') return
    try {
      if (localStorage.getItem(HELP_SEEN_KEY) !== '1') {
        setHelpOpen(true)
      }
    } catch {
      setHelpOpen(true)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing' || !state.gameOver || savedForGameRef.current) return
    try {
      const run = savePlayerRun(playerName, state)
      savedForGameRef.current = true
      setSavedRun(run)
      setGameOverOpen(true)
    } catch {
      savedForGameRef.current = true
      setGameOverOpen(true)
    }
  }, [phase, state, playerName])

  function closeHelp() {
    setHelpOpen(false)
    try {
      localStorage.setItem(HELP_SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  function startGame(name: string) {
    setPlayerName(name)
    savedForGameRef.current = false
    setSavedRun(null)
    setGameOverOpen(false)
    dispatch({ type: 'reset' })
    setPhase('playing')
  }

  function playAgain() {
    savedForGameRef.current = false
    setSavedRun(null)
    setGameOverOpen(false)
    dispatch({ type: 'reset' })
  }

  function changePlayer() {
    savedForGameRef.current = false
    setSavedRun(null)
    setGameOverOpen(false)
    setPlayerName('')
    dispatch({ type: 'reset' })
    setPhase('register')
  }

  if (phase === 'register') {
    return (
      <div className="app">
        <RegistrationScreen
          onStart={startGame}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
        />
        {leaderboardOpen && <LeaderboardModal onClose={() => setLeaderboardOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="app">
      <div className="stage">
        <GameBar
          state={state}
          playerName={playerName}
          onPrimary={() => dispatch({ type: 'primary' })}
          onReset={playAgain}
          onClearWorker={(dieId) => dispatch({ type: 'clearDie', dieId })}
          onOpenChart={setChart}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
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
          onWip={(key, delta) => dispatch({ type: 'wip', key, delta })}
        />
      </div>
      <EventModal
        state={state}
        onAck={() => dispatch({ type: 'primary' })}
        onChoice={(yes) => dispatch({ type: 'eventChoice', yes })}
      />
      {chart && <ChartsModal state={state} kind={chart} onClose={() => setChart(null)} />}
      {helpOpen && <HelpModal onClose={closeHelp} />}
      {leaderboardOpen && (
        <LeaderboardModal
          onClose={() => setLeaderboardOpen(false)}
          highlightId={savedRun?.id ?? null}
        />
      )}
      {gameOverOpen && savedRun && (
        <GameOverModal
          playerName={playerName}
          run={savedRun}
          onLeaderboard={() => {
            setGameOverOpen(false)
            setLeaderboardOpen(true)
          }}
          onPlayAgain={playAgain}
          onChangePlayer={changePlayer}
        />
      )}
    </div>
  )
}
