import { useState, type DragEvent } from 'react'
import type { Die } from '../game/types'

const ROLE: Record<Die['color'], string> = {
  red: 'Аналитик',
  blue: 'Разработчик',
  green: 'Тестировщик',
  pink: 'Петя',
}

interface PersonIconProps {
  die: Die
  draggable?: boolean
  /** Показать результат броска бейджем (фигурка не меняется). */
  showRoll?: boolean
  className?: string
  onDragStartExtra?: (e: DragEvent) => void
  onDragEndExtra?: () => void
}

/** Минималистичная фигурка сотрудника — одинаковая в пуле и на карточке. */
export function PersonIcon({
  die,
  draggable = false,
  showRoll = true,
  className = '',
  onDragStartExtra,
  onDragEndExtra,
}: PersonIconProps) {
  const [dragging, setDragging] = useState(false)

  return (
    <span
      className={`person person-${die.color}${draggable ? ' can-drag' : ''}${dragging ? ' is-dragging' : ''} ${className}`.trim()}
      title={`${ROLE[die.color]} ${die.id}${die.assignedTicketId ? ` → ${die.assignedTicketId}` : ''}${die.roll != null ? ` = ${die.roll}` : ''}`}
      draggable={draggable}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        if (!draggable) {
          e.preventDefault()
          return
        }
        e.stopPropagation()
        e.dataTransfer.setData('text/die-id', die.id)
        e.dataTransfer.setData('text/plain', `die:${die.id}`)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
        onDragStartExtra?.(e)
      }}
      onDragEnd={() => {
        setDragging(false)
        onDragEndExtra?.()
      }}
    >
      <svg className="person-svg" viewBox="0 0 24 32" aria-hidden>
        <circle cx="12" cy="7" r="4.5" />
        <path d="M12 13c-4.8 0-8.5 3.2-8.5 9.2V29h17v-6.8C20.5 16.2 16.8 13 12 13z" />
      </svg>
      <span className="person-id">{die.id}</span>
      {showRoll && die.roll != null && <em className="person-roll">{die.roll}</em>}
    </span>
  )
}
