import type { ColumnId, Die, Specialty, Ticket, TicketClass, ValueBand, WorkRemaining } from './types'

export type EventEffect =
  | { type: 'message' }
  | { type: 'addTester'; id: string }
  | { type: 'addTicket'; ticket: TicketSeed }
  | { type: 'blocker'; ticketId: string }
  | { type: 'testPolicy'; strict: boolean }
  | { type: 'offerHire'; id: string; cost: number }
  | { type: 'gameOver' }

export type EventChoice = { type: 'hireTester'; id: string; cost: number }

export type ActiveEvent = {
  day: number
  title: string
  body: string
  choice?: EventChoice
}

export interface TicketSeed {
  id: string
  title: string
  class: TicketClass
  work: WorkRemaining
  valueBand?: ValueBand
  estSubs?: number
  dueDay?: number
  fine?: number
  rewardSubscribers?: number
  expediteLane?: boolean
}

export interface GameEvent {
  day: number
  title: string
  body: string
  effects: EventEffect[]
}

export function hydrateTicket(seed: TicketSeed): Ticket {
  const { analysis, development, test } = seed.work
  if (analysis < 1 || development < 1 || test < 1) {
    throw new Error(`Тикет ${seed.id}: нужны все 3 вида работы ≥ 1`)
  }
  return {
    id: seed.id,
    title: seed.title,
    class: seed.class,
    work: { ...seed.work },
    workMax: { ...seed.work },
    valueBand: seed.valueBand,
    estSubs: seed.estSubs,
    dueDay: seed.dueDay,
    fine: seed.fine,
    rewardSubscribers: seed.rewardSubscribers,
    daySelected: null,
    dayDeployed: null,
    leadTime: null,
    subscribers: null,
    expediteLane: seed.expediteLane ?? seed.class === 'expedite',
    blocked: false,
  }
}

export function makeDie(id: string, color: Die['color'], specialty: Specialty): Die {
  return {
    id,
    color,
    specialty,
    assignedTicketId: null,
    assignedSpecialty: null,
    roll: null,
    spent: false,
  }
}

/** Учебные события Days 9–21. */
export const EVENTS_BY_DAY: Record<number, GameEvent> = {
  9: {
    day: 9,
    title: 'Старт симуляции',
    body: 'Первый биллинг позади. Дальше вы ведёте поток сами: пополняйте «К работе», назначайте сотрудников и следите за WIP.',
    effects: [{ type: 'message' }],
  },
  10: {
    day: 10,
    title: 'Давление рынка',
    body: 'Маркетинг просит быстрее выпускать ценные фичи. Пересмотрите приоритеты в бэклоге — но не ломайте WIP.',
    effects: [{ type: 'message' }],
  },
  11: {
    day: 11,
    title: 'Блокер: ждём Петю',
    body: 'Тикет S6 заблокирован. Появился розовый кубик P1. Назначьте его на заблокированную карточку и бросьте — блокер снимется.',
    effects: [{ type: 'blocker', ticketId: 'S6' }],
  },
  12: {
    day: 12,
    title: 'Биллинг-цикл',
    body: 'Сегодня биллинг: выпустите «К релизу», посчитайте подписчиков и прибыль.',
    effects: [{ type: 'message' }],
  },
  13: {
    day: 13,
    title: 'Срочный запрос',
    body: 'В бэклог добавлен E1 (авария). Можно вести по срочной дорожке.',
    effects: [
      {
        type: 'addTicket',
        ticket: {
          id: 'E1',
          title: 'Срочно: авария у клиента',
          class: 'expedite',
          work: { analysis: 3, development: 5, test: 4 },
          expediteLane: true,
        },
      },
    ],
  },
  14: {
    day: 14,
    title: 'Новый тестировщик',
    body: 'В команду выходит тестировщик G3.',
    effects: [{ type: 'addTester', id: 'G3' }],
  },
  15: {
    day: 15,
    title: 'Дедлайн аудита',
    body: 'Крайний срок F1. Если F1 не выпущен к биллингу — штраф.',
    effects: [{ type: 'message' }],
  },
  16: {
    day: 16,
    title: 'Новые элементы бэклога',
    body: 'В бэклог добавлены S11 и I2. Если выпустите I2 — у всех тикетов с оставшимся тестом тест −1.',
    effects: [
      {
        type: 'addTicket',
        ticket: {
          id: 'S11',
          title: 'Мобильная навигация',
          class: 'standard',
          valueBand: 'low',
          estSubs: 5,
          work: { analysis: 4, development: 6, test: 4 },
        },
      },
      {
        type: 'addTicket',
        ticket: {
          id: 'I2',
          title: 'Ускорение CI',
          class: 'intangible',
          work: { analysis: 5, development: 8, test: 5 },
        },
      },
    ],
  },
  17: {
    day: 17,
    title: 'Политика Карлоса',
    body: 'Карлос ввёл правило: в Тесте работают только тестировщики. Других сотрудников на тестирование назначить нельзя. Правило действует несколько дней — планируйте тест заранее.',
    effects: [{ type: 'testPolicy', strict: true }],
  },
  18: {
    day: 18,
    title: 'Биллинг при Карлосе',
    body: 'Сегодня биллинг: выпустите «К релизу» и закройте финансы. Политика Карлоса всё ещё действует — в тесте только тестировщики.',
    effects: [{ type: 'message' }],
  },
  19: {
    day: 19,
    title: 'Оферта HR',
    body: 'Политика Карлоса ещё в силе. Можно нанять тестировщика G4 за $500. Нанимаем? Также в бэклог добавлен срочный дефект D1.',
    effects: [
      { type: 'offerHire', id: 'G4', cost: 500 },
      {
        type: 'addTicket',
        ticket: {
          id: 'D1',
          title: 'Дефект: регресс оплаты',
          class: 'expedite',
          work: { analysis: 3, development: 5, test: 5 },
          expediteLane: true,
        },
      },
    ],
  },
  20: {
    day: 20,
    title: 'Политику отменили',
    body: 'Ограничение Карлоса снято — снова можно ставить на тест любых сотрудников. Появился E2. Брать или нет — решение команды (смотрите WIP срочного и колонок).',
    effects: [
      { type: 'testPolicy', strict: false },
      {
        type: 'addTicket',
        ticket: {
          id: 'E2',
          title: 'Срочно: демо для инвестора',
          class: 'expedite',
          work: { analysis: 3, development: 5, test: 4 },
          expediteLane: true,
        },
      },
    ],
  },
  21: {
    day: 21,
    title: 'Финишный день',
    body: 'Последний день симуляции. Сегодня финальный биллинг и выставка (F2). После закрытия биллинга партия завершится.',
    effects: [{ type: 'message' }],
  },
}

export type CfdPoint = {
  day: number
  deployed: number
  ready: number
  test: number
  dev: number
  analysis: number
  selected: number
}

export function snapshotCfd(
  day: number,
  placement: Record<string, ColumnId>,
  tickets: { id: string; dayDeployed: number | null }[],
): CfdPoint {
  const counts = { deployed: 0, ready: 0, test: 0, dev: 0, analysis: 0, selected: 0 }
  for (const t of tickets) {
    // Накопительный «Выпущено»: и на доске, и уже снятые после биллинга
    if (t.dayDeployed != null) {
      counts.deployed++
      continue
    }
    const c = placement[t.id] ?? 'options'
    if (c === 'deployed') counts.deployed++
    else if (c === 'ready') counts.ready++
    else if (c === 'test') counts.test++
    else if (c === 'devDoing' || c === 'devDone') counts.dev++
    else if (c === 'analysisDoing' || c === 'analysisDone') counts.analysis++
    else if (c === 'selected') counts.selected++
  }
  return { day, ...counts }
}
