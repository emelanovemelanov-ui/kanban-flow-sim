import type { ReactNode } from 'react'
import type { DropTarget, FullState } from '../game/engine'
import { countWip } from '../game/engine'
import type { ColumnId, Die, Ticket } from '../game/types'
import { DropZone, TicketCard } from './TicketCard'

interface BoardProps {
  state: FullState
  onSelectTicket: (id: string) => void
  onDropTicket: (ticketId: string, target: DropTarget) => void
  onAssignWorker: (dieId: string, ticketId: string) => void
}

function ticketsFor(
  state: FullState,
  column: ColumnId,
  predicate: (t: Ticket) => boolean = () => true,
): Ticket[] {
  return state.tickets.filter((t) => state.placement[t.id] === column && predicate(t))
}

function workersOn(state: FullState, ticketId: string): Die[] {
  return state.dice.filter((d) => d.assignedTicketId === ticketId)
}

type CardHandlers = {
  state: FullState
  canAcceptWorker: boolean
  onSelectTicket: (id: string) => void
  onAssignWorker: (dieId: string, ticketId: string) => void
}

function Cards({ tickets, handlers }: { tickets: Ticket[]; handlers: CardHandlers }) {
  return (
    <>
      {tickets.map((t) => (
        <TicketCard
          key={t.id}
          ticket={t}
          day={handlers.state.day}
          selected={handlers.state.selectedTicketId === t.id}
          assigned={workersOn(handlers.state, t.id)}
          canAcceptWorker={handlers.canAcceptWorker}
          onSelect={handlers.onSelectTicket}
          onAssignWorker={handlers.onAssignWorker}
        />
      ))}
    </>
  )
}

function Cell({
  dropTarget,
  tickets,
  handlers,
  onDropTicket,
  className = '',
  children,
}: {
  dropTarget: DropTarget
  tickets?: Ticket[]
  handlers: CardHandlers
  onDropTicket: (ticketId: string, target: DropTarget) => void
  className?: string
  children?: ReactNode
}) {
  return (
    <DropZone dropTarget={dropTarget} className={`board-cell ${className}`} onDropTicket={onDropTicket}>
      {children ?? (tickets ? <Cards tickets={tickets} handlers={handlers} /> : null)}
    </DropZone>
  )
}

export function Board({ state, onSelectTicket, onDropTicket, onAssignWorker }: BoardProps) {
  const main = (t: Ticket) => !t.expediteLane
  const exp = (t: Ticket) => t.expediteLane
  const canAcceptWorker = !state.rolledThisDay && (state.step === 'standup' || state.step === 'work')
  const handlers: CardHandlers = { state, canAcceptWorker, onSelectTicket, onAssignWorker }

  const backlogMain = ticketsFor(state, 'options', main)
  const expCount = countWip(state, 'expedite')
  const expOver = expCount > state.wip.expedite

  const selectedCount = countWip(state, 'selected')
  const analysisCount = countWip(state, 'analysis')
  const devCount = countWip(state, 'development')
  const testCount = countWip(state, 'test')

  return (
    <div className="board-scroll">
      <div className={`board-table${expOver ? ' exp-over' : ''}`}>
        {/* угол над подписью срочного */}
        <div className="th th-corner" />

        {/* шапка ряд 1–2 */}
        <div className="th th-rspan">Бэклог</div>
        <div className={`th th-rspan${selectedCount > state.wip.selected ? ' over-wip' : ''}`}>
          К работе ({state.wip.selected})
        </div>
        <div className={`th th-cspan th-analysis${analysisCount > state.wip.analysis ? ' over-wip' : ''}`}>
          Анализ ({state.wip.analysis})
        </div>
        <div className={`th th-cspan th-dev${devCount > state.wip.development ? ' over-wip' : ''}`}>
          Разработка ({state.wip.development})
        </div>
        <div className={`th th-rspan th-test${testCount > state.wip.test ? ' over-wip' : ''}`}>
          Тест ({state.wip.test})
        </div>
        <div className="th th-rspan">К релизу</div>
        <div className="th th-rspan">Выпущено</div>

        {/* подколонки анализа / разработки */}
        <div className="th th-sub">В работе</div>
        <div className="th th-sub">Готово</div>
        <div className="th th-sub">В работе</div>
        <div className="th th-sub">Готово</div>

        {/* срочная строка */}
        <div className="exp-rail" title={`Срочная · WIP ${expCount}/${state.wip.expedite}`}>
          <span className="exp-rail-text">СРОЧНОЕ ({state.wip.expedite})</span>
        </div>
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'options' }}
          tickets={ticketsFor(state, 'options', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'selected' }}
          tickets={ticketsFor(state, 'selected', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'analysisDoing' }}
          tickets={ticketsFor(state, 'analysisDoing', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'analysisDone' }}
          tickets={ticketsFor(state, 'analysisDone', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'devDoing' }}
          tickets={ticketsFor(state, 'devDoing', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'devDone' }}
          tickets={ticketsFor(state, 'devDone', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'test' }}
          tickets={ticketsFor(state, 'test', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'ready' }}
          tickets={ticketsFor(state, 'ready', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="exp-zone"
          dropTarget={{ expedite: 'deployed' }}
          tickets={ticketsFor(state, 'deployed', exp)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />

        {/* основная дорожка */}
        <div className="exp-rail-spacer" aria-hidden />
        <Cell className="main-zone backlog-zone" dropTarget="options" handlers={handlers} onDropTicket={onDropTicket}>
          {(['fixed', 'standard', 'intangible'] as const).map((cls) => {
            const group = backlogMain.filter((t) => t.class === cls)
            if (group.length === 0) return null
            const label = cls === 'fixed' ? 'Фикс. срок' : cls === 'standard' ? 'Обычные' : 'Нематериал.'
            return (
              <div key={cls} className="backlog-group">
                <p className="backlog-label">{label}</p>
                <Cards tickets={group} handlers={handlers} />
              </div>
            )
          })}
        </Cell>
        <Cell
          className="main-zone"
          dropTarget="selected"
          tickets={ticketsFor(state, 'selected', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="analysisDoing"
          tickets={ticketsFor(state, 'analysisDoing', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="analysisDone"
          tickets={ticketsFor(state, 'analysisDone', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="devDoing"
          tickets={ticketsFor(state, 'devDoing', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="devDone"
          tickets={ticketsFor(state, 'devDone', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="test"
          tickets={ticketsFor(state, 'test', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="ready"
          tickets={ticketsFor(state, 'ready', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
        <Cell
          className="main-zone"
          dropTarget="deployed"
          tickets={ticketsFor(state, 'deployed', main)}
          handlers={handlers}
          onDropTicket={onDropTicket}
        />
      </div>
    </div>
  )
}
