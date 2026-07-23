import type { Ticket, ValueBand, WorkRemaining } from './types'

/** Минимум карточек, видимых в бэклоге (Options) — как колода getKanban. */
export const OPTIONS_VISIBLE_MIN = 5

function assertEffort(effort: WorkRemaining, id: string): void {
  if (effort.analysis < 1 || effort.development < 1 || effort.test < 1) {
    throw new Error(`Тикет ${id}: нужны все 3 вида работы (анализ, разработка, тест) ≥ 1`)
  }
}

/**
 * Объём работы связан с ожидаемыми подписчиками / ценностью:
 * чем выше estSubs (и valueBand), тем больше клеток A/D/T.
 * Ориентир getKanban: полоски заметно больше среднего броска кубика (3–4),
 * иначе карточки закрываются за один день.
 */
export function effortFromValue(estSubs: number, valueBand: ValueBand = 'med'): WorkRemaining {
  const bandBoost = valueBand === 'high' ? 1.15 : valueBand === 'low' ? 0.9 : 1
  const s = Math.max(3, estSubs) * bandBoost
  const analysis = Math.min(8, Math.max(4, Math.round(s * 0.5)))
  const development = Math.min(14, Math.max(6, Math.round(s * 0.95)))
  const test = Math.min(9, Math.max(4, Math.round(s * 0.55)))
  return { analysis, development, test }
}

export function effortFixed(size: 'med' | 'large' = 'med'): WorkRemaining {
  return size === 'large'
    ? { analysis: 6, development: 11, test: 7 }
    : { analysis: 5, development: 8, test: 5 }
}

export function effortIntangible(): WorkRemaining {
  return { analysis: 5, development: 9, test: 5 }
}

export function effortExpedite(estSubs = 6): WorkRemaining {
  // срочные чуть компактнее, но не «однобросковые»
  const base = effortFromValue(estSubs, 'med')
  return {
    analysis: Math.max(3, base.analysis - 1),
    development: Math.max(5, base.development - 2),
    test: Math.max(4, base.test - 1),
  }
}

type TicketDraft = Omit<
  Ticket,
  'workMax' | 'work' | 'daySelected' | 'dayDeployed' | 'leadTime' | 'subscribers' | 'expediteLane' | 'blocked'
> & {
  effort: WorkRemaining
  remaining?: WorkRemaining
  daySelected?: number | null
  expediteLane?: boolean
  blocked?: boolean
}

function mk(partial: TicketDraft): Ticket {
  assertEffort(partial.effort, partial.id)
  const remaining = partial.remaining ?? partial.effort
  return {
    id: partial.id,
    title: partial.title,
    class: partial.class,
    valueBand: partial.valueBand,
    estSubs: partial.estSubs,
    dueDay: partial.dueDay,
    fine: partial.fine,
    rewardSubscribers: partial.rewardSubscribers,
    workMax: { ...partial.effort },
    work: { ...remaining },
    daySelected: partial.daySelected ?? null,
    dayDeployed: null,
    leadTime: null,
    subscribers: null,
    expediteLane: partial.expediteLane ?? false,
    blocked: partial.blocked ?? false,
  }
}

/** Карточки уже на доске к Day 9 (не в бэклоге). */
function boardTickets(): Ticket[] {
  return [
    mk({
      id: 'S1',
      title: 'Доработка входа',
      class: 'standard',
      valueBand: 'med',
      estSubs: 8,
      effort: effortFromValue(8, 'med'),
      remaining: { analysis: 0, development: 0, test: 0 },
      daySelected: 1,
    }),
    mk({
      id: 'S2',
      title: 'Сброс пароля',
      class: 'standard',
      valueBand: 'med',
      estSubs: 6,
      effort: effortFromValue(6, 'med'),
      remaining: { analysis: 0, development: 0, test: 3 },
      daySelected: 1,
    }),
    mk({
      id: 'S3',
      title: 'Экспорт биллинга',
      class: 'standard',
      valueBand: 'high',
      estSubs: 12,
      effort: effortFromValue(12, 'high'),
      remaining: (() => {
        const e = effortFromValue(12, 'high')
        return { analysis: 0, development: 0, test: e.test }
      })(),
      daySelected: 2,
    }),
    mk({
      id: 'S4',
      title: 'Приглашения',
      class: 'standard',
      valueBand: 'high',
      estSubs: 10,
      effort: effortFromValue(10, 'high'),
      remaining: (() => {
        const e = effortFromValue(10, 'high')
        return { analysis: 0, development: 0, test: e.test }
      })(),
      daySelected: 3,
    }),
    mk({
      id: 'S5',
      title: 'Тёмная тема',
      class: 'standard',
      valueBand: 'low',
      estSubs: 4,
      effort: effortFromValue(4, 'low'),
      remaining: (() => {
        const e = effortFromValue(4, 'low')
        return { analysis: 0, development: Math.ceil(e.development / 2), test: e.test }
      })(),
      daySelected: 3,
    }),
    mk({
      id: 'S6',
      title: 'Фильтры поиска',
      class: 'standard',
      valueBand: 'high',
      estSubs: 14,
      effort: effortFromValue(14, 'high'),
      remaining: (() => {
        const e = effortFromValue(14, 'high')
        return { analysis: 0, development: e.development, test: e.test }
      })(),
      daySelected: 4,
    }),
    mk({
      id: 'S7',
      title: 'Уведомления',
      class: 'standard',
      valueBand: 'med',
      estSubs: 7,
      effort: effortFromValue(7, 'med'),
      remaining: (() => {
        const e = effortFromValue(7, 'med')
        return { analysis: 0, development: e.development, test: e.test }
      })(),
      daySelected: 5,
    }),
    mk({
      id: 'S8',
      title: 'Лимиты API',
      class: 'standard',
      valueBand: 'med',
      estSubs: 9,
      effort: effortFromValue(9, 'med'),
      remaining: (() => {
        const e = effortFromValue(9, 'med')
        return { analysis: Math.ceil(e.analysis * 0.6), development: e.development, test: e.test }
      })(),
      daySelected: 6,
    }),
    mk({
      id: 'S9',
      title: 'Журнал аудита',
      class: 'standard',
      valueBand: 'low',
      estSubs: 5,
      effort: effortFromValue(5, 'low'),
      daySelected: 6,
    }),
  ].map((t) =>
    t.id === 'S1'
      ? { ...t, dayDeployed: 8, leadTime: 7, subscribers: 5 }
      : t,
  )
}

/** Стартовый видимый бэклог (5) + фиксированные / нематериал. */
function initialOptionsVisible(): Ticket[] {
  return [
    mk({
      id: 'F1',
      title: 'Исправление для аудита',
      class: 'fixed',
      effort: effortFixed('med'),
      dueDay: 15,
      fine: 2200,
    }),
    mk({
      id: 'S10',
      title: 'Импорт CSV',
      class: 'standard',
      valueBand: 'med',
      estSubs: 8,
      effort: effortFromValue(8, 'med'),
    }),
    mk({
      id: 'S13',
      title: 'Виджеты дашборда',
      class: 'standard',
      valueBand: 'high',
      estSubs: 11,
      effort: effortFromValue(11, 'high'),
    }),
    mk({
      id: 'I1',
      title: 'Рефакторинг ядра',
      class: 'intangible',
      effort: effortIntangible(),
    }),
    mk({
      id: 'F2',
      title: 'Фича к выставке',
      class: 'fixed',
      effort: effortFixed('large'),
      dueDay: 21,
      rewardSubscribers: 30,
    }),
  ]
}

/**
 * Скрытая колода Options (как в getKanban): при уходе карточки в «К работе»
 * из колоды в бэклог выходит следующая, пока колода не кончится.
 * ID не пересекаются с событийными S11 / I2 / E1 / E2 / D1 и стартовой доской.
 */
export function createOptionsDeck(): Ticket[] {
  const standards: { id: string; title: string; valueBand: ValueBand; estSubs: number }[] = [
    { id: 'S12', title: 'Профиль пользователя', valueBand: 'med', estSubs: 7 },
    { id: 'S14', title: 'Оплата картой', valueBand: 'high', estSubs: 13 },
    { id: 'S15', title: 'История заказов', valueBand: 'med', estSubs: 8 },
    { id: 'S16', title: 'Поиск по тегам', valueBand: 'low', estSubs: 5 },
    { id: 'S17', title: 'Экспорт PDF', valueBand: 'med', estSubs: 9 },
    { id: 'S18', title: 'Роли и права', valueBand: 'high', estSubs: 12 },
    { id: 'S19', title: 'Кэш каталога', valueBand: 'low', estSubs: 4 },
    { id: 'S20', title: 'Чат поддержки', valueBand: 'high', estSubs: 14 },
    { id: 'S21', title: 'Мультиязычность', valueBand: 'med', estSubs: 8 },
    { id: 'S22', title: 'Отчёты продаж', valueBand: 'high', estSubs: 11 },
    { id: 'S23', title: 'Скидки и купоны', valueBand: 'med', estSubs: 9 },
    { id: 'S24', title: 'Интеграция CRM', valueBand: 'high', estSubs: 13 },
    { id: 'S25', title: 'Мобильный чекаут', valueBand: 'high', estSubs: 12 },
    { id: 'S26', title: 'Webhooks', valueBand: 'med', estSubs: 7 },
    { id: 'S27', title: 'A/B тесты', valueBand: 'low', estSubs: 5 },
    { id: 'I3', title: 'Обновление SDK', valueBand: 'med', estSubs: 0 },
    // Запас на всю партию 9–21: иначе при WIP «К работе»=5 колода кончается к середине
    { id: 'S28', title: 'Пуш-уведомления', valueBand: 'med', estSubs: 8 },
    { id: 'S29', title: 'Избранное', valueBand: 'low', estSubs: 5 },
    { id: 'S30', title: 'Рекомендации', valueBand: 'high', estSubs: 14 },
    { id: 'S31', title: 'Онбординг', valueBand: 'med', estSubs: 9 },
    { id: 'S32', title: 'Фильтры каталога', valueBand: 'med', estSubs: 7 },
    { id: 'S33', title: 'Отзывы клиентов', valueBand: 'high', estSubs: 12 },
    { id: 'S34', title: 'Возвраты', valueBand: 'med', estSubs: 8 },
    { id: 'S35', title: 'Складской учёт', valueBand: 'high', estSubs: 11 },
    { id: 'S36', title: 'Промо-лендинги', valueBand: 'low', estSubs: 4 },
    { id: 'S37', title: 'API партнёров', valueBand: 'med', estSubs: 8 },
    { id: 'S38', title: 'Двухфакторка', valueBand: 'high', estSubs: 10 },
    { id: 'S39', title: 'Тёмная тема', valueBand: 'low', estSubs: 3 },
    { id: 'S40', title: 'Подписки', valueBand: 'high', estSubs: 13 },
    { id: 'S41', title: 'Календарь доставок', valueBand: 'med', estSubs: 7 },
    { id: 'S42', title: 'Бонусные баллы', valueBand: 'med', estSubs: 9 },
    { id: 'S43', title: 'Живой поиск', valueBand: 'high', estSubs: 12 },
    { id: 'S44', title: 'Экспорт Excel', valueBand: 'low', estSubs: 5 },
    { id: 'S45', title: 'Внутренний чат', valueBand: 'med', estSubs: 8 },
    { id: 'I4', title: 'Миграция БД', valueBand: 'med', estSubs: 0 },
    { id: 'I5', title: 'Мониторинг ошибок', valueBand: 'med', estSubs: 0 },
  ]

  return standards.map((s) =>
    s.id.startsWith('I')
      ? mk({
          id: s.id,
          title: s.title,
          class: 'intangible',
          effort: effortIntangible(),
        })
      : mk({
          id: s.id,
          title: s.title,
          class: 'standard',
          valueBand: s.valueBand,
          estSubs: s.estSubs,
          effort: effortFromValue(s.estSubs, s.valueBand),
        }),
  )
}

export function createInitialTickets(): Ticket[] {
  return [...boardTickets(), ...initialOptionsVisible()]
}

export const START_COLUMNS: Record<string, import('./types').ColumnId> = {
  S1: 'deployed',
  S2: 'test',
  S3: 'test',
  S4: 'devDone',
  S5: 'devDoing',
  S6: 'devDoing',
  S7: 'analysisDone',
  S8: 'analysisDoing',
  S9: 'selected',
  F1: 'options',
  S10: 'options',
  S13: 'options',
  I1: 'options',
  F2: 'options',
}

export function subscribersForLeadTime(leadTime: number, valueBand: 'high' | 'med' | 'low' = 'med'): number {
  const base =
    leadTime <= 3 ? 14 :
    leadTime <= 5 ? 11 :
    leadTime <= 7 ? 8 :
    leadTime <= 9 ? 5 :
    leadTime <= 12 ? 3 : 1

  const mult = valueBand === 'high' ? 1.4 : valueBand === 'low' ? 0.7 : 1
  return Math.max(1, Math.round(base * mult))
}

export function ticketAgeLabel(ticket: Ticket, day: number): string {
  if (ticket.dayDeployed != null) {
    const age = ticket.dayDeployed - (ticket.daySelected ?? ticket.dayDeployed)
    if (age <= 0) return 'Первый день'
    return `${age} дн.`
  }
  if (ticket.daySelected == null) return 'Доступен'
  const age = day - ticket.daySelected
  if (age <= 0) return 'Первый день'
  return `${age} дн.`
}
