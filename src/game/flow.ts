import { EVENTS_BY_DAY, hydrateTicket, makeDie, snapshotCfd, type GameEvent } from './events'
import {
  completeFinance,
  deployReady,
  endDay,
  finishStandup,
  isBillingDay,
  rollDice,
  type FullState,
} from './engine'
import type { DayStep } from './types'

export function trackCharts(state: FullState): FullState {
  const point = snapshotCfd(
    state.day,
    state.placement,
    state.tickets.map((t) => t.id),
  )
  const cfd = [...state.cfd.filter((p) => p.day !== state.day), point]
  const byTicket = new Map(state.leadTimeLog.map((e) => [e.ticketId, e]))
  for (const id of state.deployedThisCycle) {
    const t = state.tickets.find((x) => x.id === id)
    if (t?.leadTime != null) {
      byTicket.set(t.id, { day: state.day, ticketId: t.id, leadTime: t.leadTime, class: t.class })
    }
  }
  // также подхватить уже выпущенные без записи
  for (const t of state.tickets) {
    if (t.dayDeployed != null && t.leadTime != null && !byTicket.has(t.id)) {
      byTicket.set(t.id, {
        day: t.dayDeployed,
        ticketId: t.id,
        leadTime: t.leadTime,
        class: t.class,
      })
    }
  }
  const leadTimeLog = [...byTicket.values()].sort((a, b) => a.day - b.day || a.ticketId.localeCompare(b.ticketId))
  return {
    ...state,
    cfd,
    leadTimeLog,
    message: `Графики дня ${state.day} обновлены (CFD + lead time).`,
  }
}

function applyEventEffects(state: FullState, event: GameEvent): FullState {
  let next = { ...state }
  const notes: string[] = []

  for (const effect of event.effects) {
    if (effect.type === 'addTester') {
      if (!next.dice.some((d) => d.id === effect.id)) {
        next = {
          ...next,
          dice: [...next.dice, makeDie(effect.id, 'green', 'test')],
        }
        notes.push(`+тестировщик ${effect.id}`)
      }
    }
    if (effect.type === 'hireTester') {
      if (next.cash >= effect.cost && !next.dice.some((d) => d.id === effect.id)) {
        next = {
          ...next,
          cash: next.cash - effect.cost,
          dice: [...next.dice, makeDie(effect.id, 'green', 'test')],
        }
        notes.push(`нанят ${effect.id} (−$${effect.cost})`)
      } else if (next.cash < effect.cost) {
        notes.push(`найм ${effect.id} недоступен (мало денег)`)
      }
    }
    if (effect.type === 'addTicket') {
      if (!next.tickets.some((t) => t.id === effect.ticket.id)) {
        const ticket = hydrateTicket(effect.ticket)
        next = {
          ...next,
          tickets: [...next.tickets, ticket],
          placement: { ...next.placement, [ticket.id]: 'options' },
        }
        notes.push(`+тикет ${ticket.id}`)
      }
    }
    if (effect.type === 'blocker') {
      const hasPink = next.dice.some((d) => d.id === 'P1')
      next = {
        ...next,
        tickets: next.tickets.map((t) => (t.id === effect.ticketId ? { ...t, blocked: true } : t)),
        dice: hasPink ? next.dice : [...next.dice, makeDie('P1', 'pink', 'development')],
      }
      notes.push(`блокер на ${effect.ticketId}, кубик P1`)
    }
    if (effect.type === 'testPolicy') {
      next = { ...next, testPolicyStrict: effect.strict }
      notes.push(effect.strict ? 'строгий тест' : 'политика снята')
    }
    if (effect.type === 'gameOver') {
      next = { ...next, pendingGameOver: true }
    }
  }

  return {
    ...next,
    eventLog: [...next.eventLog, `Д${event.day}: ${event.title}`],
    message: notes.length ? `${event.title}: ${notes.join(', ')}` : event.title,
  }
}

/** Показать событие текущего дня (шаг event). */
export function presentEvent(state: FullState): FullState {
  const event = EVENTS_BY_DAY[state.day]
  if (!event) {
    return { ...state, step: 'event', activeEvent: null, message: 'Событий нет — завершите день.' }
  }
  const withEffects = applyEventEffects(state, event)
  return {
    ...withEffects,
    step: 'event',
    activeEvent: { day: event.day, title: event.title, body: event.body },
  }
}

export function acknowledgeEvent(state: FullState): FullState {
  if (state.gameOver) {
    return { ...state, message: `Игра окончена. Прибыль $${state.cash}, подписчики ${state.subscribers}.` }
  }
  const cleared = { ...state, activeEvent: null }
  if (state.pendingGameOver || state.day >= 21) {
    return {
      ...cleared,
      gameOver: true,
      step: 'event',
      message: `Игра окончена! Итоговая прибыль: $${state.cash}. Подписчики: ${state.subscribers}.`,
    }
  }
  return endDay(cleared)
}

/**
 * Единый алгоритм главной кнопки по ТЗ:
 * standup → work(roll) → [deploy → charts → finance] | charts → event → next day
 */
export function primaryAction(state: FullState): FullState {
  if (state.gameOver) {
    return { ...state, message: 'Симуляция завершена. Нажмите «Сброс» для новой партии.' }
  }

  if (state.activeEvent) {
    return acknowledgeEvent(state)
  }

  switch (state.step as DayStep) {
    case 'standup':
      return finishStandup(state)

    case 'work': {
      if (!state.rolledThisDay) {
        return rollDice(state)
      }
      if (isBillingDay(state.day)) {
        return { ...state, step: 'deploy', message: 'Биллинг: выпустите тикеты из «К релизу».' }
      }
      return trackCharts({ ...state, step: 'charts' })
    }

    case 'deploy': {
      const deployed = deployReady(state)
      // deployReady sets step finance or charts; normalize to charts then finance
      const charted = trackCharts({ ...deployed, step: 'charts' })
      return { ...charted, step: 'finance', message: `${deployed.message} Далее — биллинг.` }
    }

    case 'charts': {
      const charted = state.cfd.some((p) => p.day === state.day) ? state : trackCharts(state)
      if (isBillingDay(state.day) && !state.financeLog.some((f) => f.day === state.day)) {
        return { ...charted, step: 'finance', message: 'Графики готовы. Закройте биллинг.' }
      }
      return presentEvent({ ...charted, step: 'event' })
    }

    case 'finance': {
      const financed = completeFinance(state)
      return presentEvent({ ...financed, step: 'event' })
    }

    case 'event':
      if (state.activeEvent) return acknowledgeEvent(state)
      return presentEvent(state)

    default:
      return state
  }
}

export function primaryLabel(state: FullState): string {
  if (state.gameOver) return 'Игра окончена'
  if (state.activeEvent) return 'Принять событие'
  if (state.step === 'standup') return 'Завершить стендап'
  if (state.step === 'work' && !state.rolledThisDay) return 'Бросить кубики'
  if (state.step === 'work') return 'Далее'
  if (state.step === 'deploy') return 'Выпустить'
  if (state.step === 'charts') return 'К событию'
  if (state.step === 'finance') return 'Закрыть биллинг'
  if (state.step === 'event') return 'Событие дня'
  return 'Далее'
}