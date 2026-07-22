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
    if (effect.type === 'offerHire') {
      notes.push(`предложение найма ${effect.id} (−$${effect.cost})`)
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
  const hire = event.effects.find((e): e is Extract<typeof e, { type: 'offerHire' }> => e.type === 'offerHire')
  return {
    ...withEffects,
    step: 'event',
    activeEvent: {
      day: event.day,
      title: event.title,
      body: event.body,
      choice: hire ? { type: 'hireTester', id: hire.id, cost: hire.cost } : undefined,
    },
  }
}

export function acknowledgeEvent(state: FullState, answer?: boolean): FullState {
  if (state.gameOver) {
    return { ...state, message: `Игра окончена. Прибыль $${state.cash}, подписчики ${state.subscribers}.` }
  }

  let cleared: FullState = { ...state, activeEvent: null }
  const choice = state.activeEvent?.choice
  if (choice?.type === 'hireTester') {
    if (answer === true) {
      if (cleared.cash >= choice.cost && !cleared.dice.some((d) => d.id === choice.id)) {
        cleared = {
          ...cleared,
          cash: cleared.cash - choice.cost,
          dice: [...cleared.dice, makeDie(choice.id, 'green', 'test')],
          message: `Нанят ${choice.id} (−$${choice.cost}).`,
        }
      } else if (cleared.cash < choice.cost) {
        cleared = { ...cleared, message: `Найм ${choice.id} отклонён: недостаточно средств (нужно $${choice.cost}).` }
      } else {
        cleared = { ...cleared, message: `${choice.id} уже в команде.` }
      }
    } else {
      cleared = { ...cleared, message: `Найм ${choice.id} отклонен.` }
    }
  }

  if (cleared.pendingGameOver || cleared.day >= 21) {
    return {
      ...cleared,
      gameOver: true,
      step: 'event',
      message: `Игра окончена! Итоговая прибыль: $${cleared.cash}. Подписчики: ${cleared.subscribers}.`,
    }
  }
  return endDay(cleared)
}

/**
 * Единый алгоритм главной кнопки по ТЗ:
 * standup → work(roll) → [deploy → charts → finance] | charts → event → next day
 */
export function primaryAction(state: FullState, eventAnswer?: boolean): FullState {
  if (state.gameOver) {
    return { ...state, message: 'Симуляция завершена. Нажмите «Сброс» для новой партии.' }
  }

  if (state.activeEvent) {
    if (state.activeEvent.choice && eventAnswer === undefined) {
      return { ...state, message: 'Выберите «Да» или «Нет» в окне события.' }
    }
    return acknowledgeEvent(state, eventAnswer)
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
  if (state.activeEvent?.choice) return 'Выберите Да / Нет'
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