import type { FullState } from '../game/engine'

interface EventModalProps {
  state: FullState
  onAck: () => void
  onChoice: (yes: boolean) => void
}

export function EventModal({ state, onAck, onChoice }: EventModalProps) {
  if (!state.activeEvent) return null
  const ev = state.activeEvent
  const choice = ev.choice
  const canAfford = choice ? state.cash >= choice.cost : true

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-labelledby="event-title">
        <p className="modal-kicker">Событие · день {ev.day}</p>
        <h2 id="event-title">{ev.title}</h2>
        <p>{ev.body}</p>
        {choice?.type === 'hireTester' && (
          <p className="modal-choice-meta">
            Найм {choice.id} за ${choice.cost}
            {!canAfford ? ' — недостаточно средств' : ` · касса $${state.cash}`}
          </p>
        )}
        {choice ? (
          <div className="modal-actions">
            <button
              type="button"
              className="btn-start"
              disabled={!canAfford}
              onClick={() => onChoice(true)}
            >
              Да
            </button>
            <button type="button" className="btn-exit" onClick={() => onChoice(false)}>
              Нет
            </button>
          </div>
        ) : (
          <button type="button" className="btn-start" onClick={onAck}>
            Принять и продолжить
          </button>
        )}
      </div>
    </div>
  )
}
