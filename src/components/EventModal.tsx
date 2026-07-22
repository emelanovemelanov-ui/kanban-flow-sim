import type { FullState } from '../game/engine'

interface EventModalProps {
  state: FullState
  onAck: () => void
}

export function EventModal({ state, onAck }: EventModalProps) {
  if (!state.activeEvent) return null
  const ev = state.activeEvent
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-labelledby="event-title">
        <p className="modal-kicker">Событие · день {ev.day}</p>
        <h2 id="event-title">{ev.title}</h2>
        <p>{ev.body}</p>
        <button type="button" className="btn-start" onClick={onAck}>
          Принять и продолжить
        </button>
      </div>
    </div>
  )
}
