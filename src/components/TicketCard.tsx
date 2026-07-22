import { useState, type DragEvent, type ReactNode } from 'react'
import type { Die, Ticket } from '../game/types'
import { CLASS_LABEL } from '../game/labels'
import { ticketAgeLabel } from '../game/tickets'
import type { DropTarget } from '../game/engine'
import { PersonIcon } from './PersonIcon'

export function readDieId(dt: DataTransfer): string {
  const typed = dt.getData('text/die-id')
  if (typed) return typed
  const plain = dt.getData('text/plain')
  if (plain.startsWith('die:')) return plain.slice(4)
  return ''
}

function isDieDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes('text/die-id')
}

interface TicketCardProps {
  ticket: Ticket
  day: number
  selected: boolean
  assigned: Die[]
  canAcceptWorker: boolean
  onSelect: (id: string) => void
  onAssignWorker: (dieId: string, ticketId: string) => void
}

function WorkCells({
  remaining,
  max,
  color,
}: {
  remaining: number
  max: number
  color: 'red' | 'blue' | 'green'
}) {
  if (max <= 0) return null
  const filled = Math.max(0, max - remaining)
  return (
    <div className={`work-cells work-${color}`} title={`${filled}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`cell${i < filled ? ' filled' : ''}`} />
      ))}
    </div>
  )
}

export function TicketCard({
  ticket,
  day,
  selected,
  assigned,
  canAcceptWorker,
  onSelect,
  onAssignWorker,
}: TicketCardProps) {
  const [dragging, setDragging] = useState(false)
  const [workerOver, setWorkerOver] = useState(false)
  const [draggingWorker, setDraggingWorker] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!draggingWorker}
      className={`ticket ticket-${ticket.class}${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}${workerOver ? ' wants-worker' : ''}${ticket.blocked ? ' is-blocked' : ''}`}
      onClick={() => onSelect(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(ticket.id)
        }
      }}
      onDragStart={(e) => {
        if (draggingWorker || isDieDrag(e.dataTransfer)) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData('text/ticket-id', ticket.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
        onSelect(ticket.id)
      }}
      onDragEnd={() => {
        setDragging(false)
        setDraggingWorker(false)
      }}
      onDragOver={(e) => {
        if (!canAcceptWorker) return
        if (isDieDrag(e.dataTransfer)) {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
        }
      }}
      onDragEnter={(e) => {
        if (!canAcceptWorker) return
        if (isDieDrag(e.dataTransfer)) {
          e.preventDefault()
          e.stopPropagation()
          setWorkerOver(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setWorkerOver(false)
      }}
      onDrop={(e) => {
        const dieId = readDieId(e.dataTransfer)
        if (dieId) {
          e.preventDefault()
          e.stopPropagation()
          setWorkerOver(false)
          onAssignWorker(dieId, ticket.id)
        }
      }}
    >
      <header className="ticket-top">
        <strong className="ticket-id">{ticket.id}</strong>
        {ticket.class === 'standard' && (
          <span className="ticket-meta">Подп:{ticket.subscribers ?? ticket.estSubs ?? '—'}</span>
        )}
        {ticket.class === 'fixed' && ticket.fine != null && (
          <span className="ticket-meta danger">${-ticket.fine}</span>
        )}
        {ticket.class === 'fixed' && ticket.rewardSubscribers != null && !ticket.fine && (
          <span className="ticket-meta">+{ticket.rewardSubscribers} подп.</span>
        )}
      </header>

      {ticket.blocked && <p className="ticket-blocked">⛔ Блокер — нужен P1</p>}

      {ticket.class === 'fixed' && ticket.dueDay != null && (
        <p className="ticket-due">Срок: день {ticket.dueDay}</p>
      )}

      {(ticket.class === 'intangible' || ticket.class === 'expedite') && (
        <p className="ticket-title">{ticket.title}</p>
      )}

      <div className="ticket-bars">
        <WorkCells remaining={ticket.work.analysis} max={ticket.workMax.analysis} color="red" />
        <WorkCells remaining={ticket.work.development} max={ticket.workMax.development} color="blue" />
        <WorkCells remaining={ticket.work.test} max={ticket.workMax.test} color="green" />
      </div>

      {assigned.length > 0 && (
        <div className="ticket-crew">
          {assigned.map((d) => (
            <PersonIcon
              key={d.id}
              die={d}
              draggable={canAcceptWorker}
              className="person-on-card"
              onDragStartExtra={() => setDraggingWorker(true)}
              onDragEndExtra={() => setDraggingWorker(false)}
            />
          ))}
        </div>
      )}

      <footer className="ticket-foot">
        <span>{CLASS_LABEL[ticket.class]}</span>
        <span>{ticketAgeLabel(ticket, day)}</span>
      </footer>
    </div>
  )
}

interface DropZoneProps {
  dropTarget: DropTarget
  className?: string
  onDropTicket: (ticketId: string, target: DropTarget) => void
  children: ReactNode
}

export function DropZone({ dropTarget, className = '', onDropTicket, children }: DropZoneProps) {
  const [over, setOver] = useState(false)

  const onDragOver = (e: DragEvent) => {
    if (isDieDrag(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div
      className={`drop-zone${over ? ' is-drop-target' : ''} ${className}`}
      onDragOver={onDragOver}
      onDragEnter={(e) => {
        if (isDieDrag(e.dataTransfer)) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false)
      }}
      onDrop={(e) => {
        if (readDieId(e.dataTransfer)) {
          setOver(false)
          return
        }
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData('text/ticket-id')
        if (id) onDropTicket(id, dropTarget)
      }}
    >
      {children}
    </div>
  )
}
