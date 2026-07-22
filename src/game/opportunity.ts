import { subscribersForLeadTime } from './tickets'
import { BILLING_DAYS, FINAL_DAY, type Ticket } from './types'
import { columnOf, type FullState } from './engine'
import { COLUMN_TITLE } from './labels'

/** Тариф биллинга: день 9→$100 … 21→$300. */
export function billingRateForDay(day: number): number {
  const cycleIndex = (BILLING_DAYS as readonly number[]).indexOf(day)
  if (cycleIndex >= 0) return (10 + cycleIndex * 5) * 10
  const prior = [...BILLING_DAYS].reverse().find((d) => d <= day)
  if (prior != null) {
    const i = (BILLING_DAYS as readonly number[]).indexOf(prior)
    return (10 + i * 5) * 10
  }
  return (10 + 0 * 5) * 10
}

/** Итог потерь доступен только после закрытия биллинга дня 21. */
export function isFinalLossAvailable(state: FullState): boolean {
  return state.day >= FINAL_DAY && state.financeLog.some((f) => f.day === FINAL_DAY)
}

/** Сколько подписчиков дал бы тикет при выпуске в deployDay (как в deployReady). */
export function potentialSubscribersIfDeployedOn(ticket: Ticket, deployDay: number): number {
  if (ticket.class === 'standard') {
    const leadTime = deployDay - (ticket.daySelected ?? deployDay)
    return subscribersForLeadTime(leadTime, ticket.valueBand ?? 'med')
  }
  if (ticket.class === 'fixed' && ticket.id === 'F2' && deployDay <= (ticket.dueDay ?? FINAL_DAY)) {
    return ticket.rewardSubscribers ?? 30
  }
  return 0
}

export interface LostWorkItem {
  ticketId: string
  title: string
  columnLabel: string
  daySelected: number
  leadTimeIfDay21: number
  lostSubscribers: number
}

export interface LostOpportunity {
  asOfDay: number
  rate: number
  items: LostWorkItem[]
  lostSubscribers: number
  lostRevenue: number
}

/**
 * Не реализованные, но взятые в работу задачи к дню 21:
 * потенциальные подписчики (как при релизе в день 21) и недополученная выручка
 * по тарифу финального биллинга.
 * Возвращает null, пока финальный биллинг дня 21 не закрыт.
 */
export function computeLostOpportunity(state: FullState): LostOpportunity | null {
  if (!isFinalLossAvailable(state)) return null

  const asOfDay = FINAL_DAY
  const rate = billingRateForDay(asOfDay)
  const unfinished = state.tickets.filter((t) => t.daySelected != null && t.dayDeployed == null)

  const items: LostWorkItem[] = unfinished.map((t) => {
    const daySelected = t.daySelected!
    return {
      ticketId: t.id,
      title: t.title,
      columnLabel: COLUMN_TITLE[columnOf(state, t.id)] ?? columnOf(state, t.id),
      daySelected,
      leadTimeIfDay21: asOfDay - daySelected,
      lostSubscribers: potentialSubscribersIfDeployedOn(t, asOfDay),
    }
  })

  items.sort((a, b) => b.lostSubscribers - a.lostSubscribers || a.ticketId.localeCompare(b.ticketId))

  const lostSubscribers = items.reduce((sum, i) => sum + i.lostSubscribers, 0)
  return {
    asOfDay,
    rate,
    items,
    lostSubscribers,
    lostRevenue: lostSubscribers * rate,
  }
}
