import {
  createInitialTickets,
  createOptionsDeck,
  OPTIONS_VISIBLE_MIN,
  START_COLUMNS,
  subscribersForLeadTime,
} from './tickets'
import { snapshotCfd } from './events'
import { COLUMN_TITLE, SPECIALTY_LABEL, STEP_LABEL, WIP_LABEL } from './labels'
import {
  BILLING_DAYS,
  FINAL_DAY,
  START_DAY,
  type ColumnId,
  type DayStep,
  type Die,
  type GameState,
  type Specialty,
  type Ticket,
  type WipLimits,
} from './types'

export type TicketPlacement = Record<string, ColumnId>

export interface FullState extends GameState {
  placement: TicketPlacement
}

const DEFAULT_WIP: WipLimits = {
  selected: 5,
  analysis: 3,
  development: 5,
  test: 3,
  expedite: 1,
}

function makeDice(): Die[] {
  return [
    { id: 'R1', color: 'red', specialty: 'analysis', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
    { id: 'R2', color: 'red', specialty: 'analysis', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
    { id: 'B1', color: 'blue', specialty: 'development', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
    { id: 'B2', color: 'blue', specialty: 'development', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
    { id: 'B3', color: 'blue', specialty: 'development', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
    { id: 'G1', color: 'green', specialty: 'test', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
    { id: 'G2', color: 'green', specialty: 'test', assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false },
  ]
}

export function createInitialState(): FullState {
  const tickets = createInitialTickets()
  const optionsDeck = createOptionsDeck()
  const deployedSubs = tickets
    .filter((t) => START_COLUMNS[t.id] === 'deployed')
    .reduce((sum, t) => sum + (t.subscribers ?? 0), 0)
  const placement = { ...START_COLUMNS }
  const cfd0 = snapshotCfd(8, placement, tickets)

  return {
    day: START_DAY,
    step: 'standup',
    tickets,
    optionsDeck,
    dice: makeDice(),
    wip: { ...DEFAULT_WIP },
    subscribers: deployedSubs,
    cash: 0,
    financeLog: [],
    leftover: {},
    message: 'День 9 — пополните «К работе», назначьте сотрудников, затем завершите стендап.',
    selectedTicketId: null,
    rolledThisDay: false,
    deployedThisCycle: [],
    activeEvent: null,
    eventLog: [],
    cfd: [cfd0],
    leadTimeLog: tickets
      .filter((t) => t.leadTime != null)
      .map((t) => ({ day: t.dayDeployed ?? 8, ticketId: t.id, leadTime: t.leadTime!, class: t.class })),
    testPolicyStrict: false,
    gameOver: false,
    pendingGameOver: false,
    placement,
  }
}

/** Держим в Options не меньше OPTIONS_VISIBLE_MIN, пока есть скрытая колода. */
export function replenishOptions(state: FullState): FullState {
  // Считаем только реально видимые на доске (placement), не «логические» columnOf
  let optionsCount = state.tickets.filter(
    (t) => state.placement[t.id] === 'options' && !t.expediteLane,
  ).length
  if (optionsCount >= OPTIONS_VISIBLE_MIN || state.optionsDeck.length === 0) {
    return state
  }

  const deck = [...state.optionsDeck]
  const tickets = [...state.tickets]
  const placement = { ...state.placement }
  const added: string[] = []

  while (optionsCount < OPTIONS_VISIBLE_MIN && deck.length > 0) {
    const next = deck.shift()!
    if (tickets.some((t) => t.id === next.id)) {
      // ID уже на столе (не должно случаться) — карточку колоды отбрасываем, не зацикливаемся
      continue
    }
    tickets.push(next)
    placement[next.id] = 'options'
    added.push(next.id)
    optionsCount += 1
  }

  if (added.length === 0) {
    return { ...state, optionsDeck: deck }
  }

  return {
    ...state,
    tickets,
    placement,
    optionsDeck: deck,
    message: `${state.message} · в бэклог: ${added.join(', ')}`,
  }
}

/** Есть ли ещё что тянуть в «К работе» (видимый бэклог или скрытая колода). */
export function canPullFromBacklog(state: FullState): boolean {
  if (state.optionsDeck.length > 0) return true
  return state.tickets.some((t) => state.placement[t.id] === 'options')
}

export function isBillingDay(day: number): boolean {
  return (BILLING_DAYS as readonly number[]).includes(day)
}

export function columnOf(state: FullState, ticketId: string): ColumnId {
  const placed = state.placement[ticketId]
  if (placed) return placed
  // После биллинга выпущенные уходят с доски (нет placement), но логически — «Выпущено»
  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (ticket?.dayDeployed != null) return 'deployed'
  return 'options'
}

export function ticketsIn(state: FullState, column: ColumnId, expediteOnly = false): Ticket[] {
  return state.tickets.filter((t) => {
    if (columnOf(state, t.id) !== column) return false
    if (expediteOnly) return t.expediteLane
    if (column !== 'options' && column !== 'deployed' && column !== 'ready') {
      // main swimlane excludes expedite lane tickets visually separated
    }
    return !t.expediteLane || column === 'options' || column === 'deployed'
  })
}

export function countWip(state: FullState, area: 'selected' | 'analysis' | 'development' | 'test' | 'expedite'): number {
  if (area === 'selected') {
    return state.tickets.filter((t) => columnOf(state, t.id) === 'selected').length
  }
  if (area === 'analysis') {
    return state.tickets.filter((t) => {
      const c = columnOf(state, t.id)
      return c === 'analysisDoing' || c === 'analysisDone'
    }).length
  }
  if (area === 'development') {
    return state.tickets.filter((t) => {
      const c = columnOf(state, t.id)
      return c === 'devDoing' || c === 'devDone'
    }).length
  }
  if (area === 'test') {
    return state.tickets.filter((t) => columnOf(state, t.id) === 'test').length
  }
  return state.tickets.filter(
    (t) => t.expediteLane && columnOf(state, t.id) !== 'options' && columnOf(state, t.id) !== 'deployed',
  ).length
}

export function canPullInto(state: FullState, target: ColumnId, ticket: Ticket): boolean {
  const from = columnOf(state, ticket.id)

  // Срочная дорожка имеет свой WIP, но колоночные лимиты тоже действуют
  if (ticket.expediteLane) {
    const alreadyInFlight = from !== 'options' && from !== 'deployed'
    if (!alreadyInFlight && countWip(state, 'expedite') >= state.wip.expedite) {
      return false
    }
  }

  if (target === 'selected') {
    if (from === 'selected') return true
    return countWip(state, 'selected') < state.wip.selected
  }
  if (target === 'analysisDoing' || target === 'analysisDone') {
    if (from === 'analysisDoing' || from === 'analysisDone') return true
    return countWip(state, 'analysis') < state.wip.analysis
  }
  if (target === 'devDoing' || target === 'devDone') {
    if (from === 'devDoing' || from === 'devDone') return true
    return countWip(state, 'development') < state.wip.development
  }
  if (target === 'test') {
    if (from === 'test') return true
    return countWip(state, 'test') < state.wip.test
  }
  return true
}

function nextColumnAfterWork(ticket: Ticket, from: ColumnId): ColumnId | null {
  if (from === 'analysisDoing' && ticket.work.analysis <= 0) return 'analysisDone'
  if (from === 'devDoing' && ticket.work.development <= 0) return 'devDone'
  if (from === 'test' && ticket.work.test <= 0) return 'ready'
  return null
}

export function effectivePoints(die: Die, specialty: Specialty, roll: number, testPolicyStrict = false): number {
  if (testPolicyStrict && specialty === 'test' && die.specialty !== 'test') return 0
  if (die.specialty === specialty) return roll
  return Math.ceil(roll / 2)
}

export function specialtyForColumn(column: ColumnId): Specialty | null {
  if (column === 'analysisDoing' || column === 'analysisDone') return 'analysis'
  if (column === 'devDoing' || column === 'devDone') return 'development'
  if (column === 'test') return 'test'
  return null
}

export function selectTicket(state: FullState, ticketId: string | null): FullState {
  return { ...state, selectedTicketId: ticketId }
}

export function setWip(state: FullState, key: keyof WipLimits, value: number): FullState {
  return {
    ...state,
    wip: { ...state.wip, [key]: Math.max(1, value) },
    message: `WIP «${WIP_LABEL[key]}» → ${Math.max(1, value)}`,
  }
}

export function pullToSelected(state: FullState, ticketId: string): FullState {
  if (state.step !== 'standup') {
    return { ...state, message: 'Тянуть в «К работе» можно только на стендапе.' }
  }
  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (!ticket || columnOf(state, ticketId) !== 'options') {
    return { ...state, message: 'Выберите тикет из бэклога.' }
  }
  if (!canPullInto(state, 'selected', ticket)) {
    return { ...state, message: 'Лимит WIP «К работе» исчерпан. Поднимите WIP или освободите место.' }
  }

  const useExpedite =
    ticket.class === 'expedite' ||
    (ticket.class === 'fixed' && ticket.dueDay != null && ticket.dueDay - state.day < 3)

  const pulled: FullState = {
    ...state,
    tickets: state.tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            daySelected: state.day,
            expediteLane: useExpedite || t.expediteLane,
          }
        : t,
    ),
    placement: { ...state.placement, [ticketId]: 'selected' },
    message: `Тикет ${ticketId} в «К работе» (день выбора = ${state.day}).`,
    selectedTicketId: ticketId,
  }
  return replenishOptions(pulled)
}

/** Колонка должна соответствовать закрашенным полоскам (выполненной работе). */
function stageGateMessage(ticket: Ticket, target: ColumnId): string | null {
  const { analysis, development, test } = ticket.work
  if (target === 'analysisDone' && analysis > 0) {
    return `${ticket.id}: в «Готово» анализа можно только с полностью закрашенной красной полоской.`
  }
  if ((target === 'devDoing' || target === 'devDone') && analysis > 0) {
    return `${ticket.id}: сначала завершите анализ (красная полоска).`
  }
  if (target === 'devDone' && development > 0) {
    return `${ticket.id}: в «Готово» разработки — только с полной синей полоской.`
  }
  if ((target === 'test' || target === 'ready' || target === 'deployed') && (analysis > 0 || development > 0)) {
    return `${ticket.id}: в тест / релиз — после анализа и разработки.`
  }
  if ((target === 'ready' || target === 'deployed') && test > 0) {
    return `${ticket.id}: «К релизу» — только с полностью закрашенной зелёной полоской.`
  }
  return null
}

export function moveTicket(state: FullState, ticketId: string, target: ColumnId): FullState {
  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (!ticket) return state
  if (columnOf(state, ticketId) === target) {
    return { ...state, selectedTicketId: ticketId, message: `${ticketId} уже в «${COLUMN_TITLE[target]}».` }
  }
  if (target === 'selected' && columnOf(state, ticketId) === 'options') {
    return pullToSelected(state, ticketId)
  }
  if (columnOf(state, ticketId) === 'options' && target !== 'options') {
    // из бэклога на доску — через Selected (правило replenish)
    if (target !== 'selected') {
      return { ...state, message: 'Из бэклога сначала перетащите в «Выбрано».' }
    }
  }

  const gate = stageGateMessage(ticket, target)
  if (gate) return { ...state, message: gate }

  if (!canPullInto(state, target, ticket) && columnOf(state, ticketId) !== target) {
    const from = columnOf(state, ticketId)
    const sameArea =
      ((from === 'analysisDoing' || from === 'analysisDone') && (target === 'analysisDoing' || target === 'analysisDone')) ||
      ((from === 'devDoing' || from === 'devDone') && (target === 'devDoing' || target === 'devDone'))
    if (!sameArea && target !== 'ready' && target !== 'deployed' && target !== 'analysisDone' && target !== 'devDone') {
      return { ...state, message: `WIP не даёт переместить ${ticketId} → «${COLUMN_TITLE[target]}».` }
    }
  }

  let tickets = state.tickets
  if (columnOf(state, ticketId) === 'options') {
    tickets = state.tickets.map((t) =>
      t.id === ticketId ? { ...t, daySelected: t.daySelected ?? state.day } : t,
    )
  }

  return {
    ...state,
    tickets,
    placement: { ...state.placement, [ticketId]: target },
    selectedTicketId: ticketId,
    message: `Перемещён ${ticketId} → «${COLUMN_TITLE[target]}».`,
  }
}

/** Drop: обычная колонка или ячейка срочной дорожки с тем же статусом. */
export type DropTarget = ColumnId | { expedite: ColumnId }

export function dropTicket(state: FullState, ticketId: string, target: DropTarget): FullState {
  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (!ticket) return state

  if (typeof target === 'object' && 'expedite' in target) {
    const col = target.expedite
    if (countWip(state, 'expedite') >= state.wip.expedite && !ticket.expediteLane) {
      return { ...state, message: 'Лимит WIP срочной дорожки исчерпан.' }
    }
    let next: FullState = {
      ...state,
      tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, expediteLane: true } : t)),
    }
    if (columnOf(next, ticketId) === 'options' && col === 'selected') {
      next = pullToSelected(next, ticketId)
      return {
        ...next,
        tickets: next.tickets.map((t) => (t.id === ticketId ? { ...t, expediteLane: true } : t)),
        message: `Тикет ${ticketId} на срочной дорожке → «${COLUMN_TITLE[col]}».`,
      }
    }
    if (columnOf(next, ticketId) === col) {
      return {
        ...next,
        selectedTicketId: ticketId,
        message: `${ticketId} на срочной дорожке в «${COLUMN_TITLE[col]}».`,
      }
    }
    next = moveTicket(next, ticketId, col)
    return {
      ...next,
      tickets: next.tickets.map((t) => (t.id === ticketId ? { ...t, expediteLane: true } : t)),
      message: next.message.includes('WIP') || next.message.includes('бэклога')
        ? next.message
        : `Срочная: ${ticketId} → «${COLUMN_TITLE[col]}».`,
    }
  }

  // сброс expedite при дропе в обычную колонку (кроме бэклога — можно вернуть в options)
  let next = state
  if (ticket.expediteLane) {
    next = {
      ...state,
      tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, expediteLane: false } : t)),
    }
  }

  return moveTicket(next, ticketId, target)
}

export function assignDie(state: FullState, dieId: string, ticketId: string | null, specialty?: Specialty): FullState {
  if (state.rolledThisDay) {
    return { ...state, message: 'Уже бросали сегодня. Завершите день.' }
  }
  const die = state.dice.find((d) => d.id === dieId)
  if (!die) return state

  if (!ticketId) {
    return {
      ...state,
      dice: state.dice.map((d) =>
        d.id === dieId ? { ...d, assignedTicketId: null, assignedSpecialty: null, roll: null, spent: false } : d,
      ),
      message: `Сотрудник ${dieId} свободен.`,
    }
  }

  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (!ticket) return state

  if (ticket.blocked && die.color !== 'pink') {
    return { ...state, message: `${ticketId} заблокирован — назначьте розового сотрудника (P1).` }
  }
  if (!ticket.blocked && die.color === 'pink') {
    return { ...state, message: 'P1 нужен только для снятия блокера.' }
  }

  let next = state
  let col = columnOf(state, ticketId)

  // Автоматически тянем в нужную колонку «в работе», если сотрудник брошен на очередь / done
  if (col === 'options' || col === 'ready' || col === 'deployed') {
    return { ...state, message: 'Сюда сотрудников не назначают. Перетащите на карточку в работе.' }
  }

  // P1 только снимает блокер — не тянем карточку в doing и не упираемся в WIP
  if (die.color === 'pink' && ticket.blocked) {
    return {
      ...next,
      selectedTicketId: ticketId,
      dice: next.dice.map((d) =>
        d.id === dieId
          ? { ...d, assignedTicketId: ticketId, assignedSpecialty: die.specialty, roll: null, spent: false }
          : d,
      ),
      message: `Сотрудник ${dieId} → ${ticketId} (снятие блокера).`,
    }
  }

  if (col === 'selected' || col === 'analysisDone' || col === 'devDone') {
    if (state.testPolicyStrict && die.specialty !== 'test') {
      const wouldEnterTest =
        col === 'devDone' ||
        (col === 'selected' && ticket.work.analysis <= 0 && ticket.work.development <= 0 && ticket.work.test > 0)
      if (wouldEnterTest) {
        return {
          ...state,
          message: 'Политика Карлоса: на тестирование можно назначать только тестировщиков.',
        }
      }
    }
    const pulled = ensureDoingColumn(next, ticketId, die.specialty)
    if (pulled.message.startsWith('WIP') || pulled.message.startsWith('Нельзя') || pulled.message.includes('заполнен')) {
      return pulled
    }
    next = pulled
    col = columnOf(next, ticketId)
  }

  const autoSpecialty = specialty ?? specialtyForColumn(col) ?? die.specialty
  if (col !== 'analysisDoing' && col !== 'devDoing' && col !== 'test' && !ticket.expediteLane) {
    return { ...next, message: 'Назначайте сотрудников на карточки в «Анализ», «Разработка» или «Тест».' }
  }

  // Для срочной дорожки: специальность по оставшейся работе
  let workSpecialty = autoSpecialty
  if (ticket.expediteLane || col === 'analysisDoing' || col === 'devDoing' || col === 'test') {
    workSpecialty =
      specialty ??
      specialtyForColumn(col) ??
      preferredSpecialtyForTicket(next.tickets.find((t) => t.id === ticketId) ?? ticket, die.specialty)
  }

  if (state.testPolicyStrict && workSpecialty === 'test' && die.specialty !== 'test') {
    return {
      ...state,
      message: 'Политика Карлоса: на тестирование можно назначать только тестировщиков.',
    }
  }

  return {
    ...next,
    selectedTicketId: ticketId,
    dice: next.dice.map((d) =>
      d.id === dieId
        ? { ...d, assignedTicketId: ticketId, assignedSpecialty: workSpecialty, roll: null, spent: false }
        : d,
    ),
    message: `Сотрудник ${dieId} → ${ticketId} (${SPECIALTY_LABEL[workSpecialty]}${die.specialty !== workSpecialty ? ', вне спец.' : ''}).`,
  }
}

function preferredSpecialtyForTicket(ticket: Ticket, fallback: Specialty): Specialty {
  if (ticket.work.analysis > 0) return 'analysis'
  if (ticket.work.development > 0) return 'development'
  if (ticket.work.test > 0) return 'test'
  return fallback
}

/** Подтянуть тикет в doing-колонку под работу сотрудника. */
function ensureDoingColumn(state: FullState, ticketId: string, preferred: Specialty): FullState {
  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (!ticket) return state
  const col = columnOf(state, ticketId)

  if (col === 'selected') {
    // берём первую незакрытую стадию, иначе специальность сотрудника
    let target: ColumnId = 'analysisDoing'
    if (ticket.work.analysis > 0) target = 'analysisDoing'
    else if (ticket.work.development > 0) target = 'devDoing'
    else if (ticket.work.test > 0) target = 'test'
    else if (preferred === 'development') target = 'devDoing'
    else if (preferred === 'test') target = 'test'

    if (target === 'analysisDoing' && !canPullInto(state, 'analysisDoing', ticket)) {
      return { ...state, message: 'WIP анализа заполнен.' }
    }
    if (target === 'devDoing' && !canPullInto(state, 'devDoing', ticket)) {
      return { ...state, message: 'WIP разработки заполнен.' }
    }
    if (target === 'test' && !canPullInto(state, 'test', ticket)) {
      return { ...state, message: 'WIP теста заполнен.' }
    }
    return moveTicket(state, ticketId, target)
  }

  if (col === 'analysisDone') {
    if (!canPullInto(state, 'devDoing', ticket)) {
      return { ...state, message: 'WIP разработки заполнен.' }
    }
    return moveTicket(state, ticketId, 'devDoing')
  }

  if (col === 'devDone') {
    if (!canPullInto(state, 'test', ticket)) {
      return { ...state, message: 'WIP теста заполнен.' }
    }
    return moveTicket(state, ticketId, 'test')
  }

  return state
}

export function pullIntoDoing(state: FullState, ticketId: string): FullState {
  const col = columnOf(state, ticketId)
  const ticket = state.tickets.find((t) => t.id === ticketId)
  if (!ticket) return state

  if (col === 'selected') {
    if (!canPullInto(state, 'analysisDoing', ticket)) {
      return { ...state, message: 'WIP анализа заполнен.' }
    }
    return moveTicket(state, ticketId, 'analysisDoing')
  }
  if (col === 'analysisDone') {
    if (!canPullInto(state, 'devDoing', ticket)) {
      return { ...state, message: 'WIP разработки заполнен.' }
    }
    return moveTicket(state, ticketId, 'devDoing')
  }
  if (col === 'devDone') {
    if (!canPullInto(state, 'test', ticket)) {
      return { ...state, message: 'WIP теста заполнен.' }
    }
    return moveTicket(state, ticketId, 'test')
  }
  return { ...state, message: `${ticketId} уже в работе или не может продвинуться.` }
}

function d6(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export function rollDice(state: FullState): FullState {
  if (state.step !== 'work' && state.step !== 'standup') {
    return { ...state, message: 'Бросайте кубики на шаге «Работа».' }
  }
  if (state.rolledThisDay) {
    return { ...state, message: 'Сегодня уже бросали.' }
  }
  const unassigned = state.dice.filter((d) => !d.assignedTicketId)
  if (unassigned.length > 0) {
    return { ...state, message: `Сначала назначьте все кубики (свободны: ${unassigned.map((d) => d.id).join(', ')}).` }
  }

  let tickets = state.tickets.map((t) => ({ ...t, work: { ...t.work } }))
  let placement = { ...state.placement }
  const messages: string[] = []
  const advancedIds = new Set<string>()

  const rolledDice = state.dice.map((d) => {
    const roll = d6()
    return { ...d, roll, spent: false }
  })

  for (const die of rolledDice) {
    const ticketId = die.assignedTicketId!
    const ticketIndex = tickets.findIndex((t) => t.id === ticketId)
    const ticket = tickets[ticketIndex]
    const col = placement[ticketId]

    // Pink die clears blocker
    if (die.color === 'pink' && ticket.blocked) {
      ticket.blocked = false
      messages.push(`${ticketId}: блокер снят`)
      continue
    }
    if (ticket.blocked) {
      messages.push(`${ticketId} всё ещё заблокирован`)
      continue
    }

    // Очки идут в полоску текущего этапа (колонки «в работе» / тест)
    const stage = specialtyForColumn(col) ?? die.assignedSpecialty ?? die.specialty
    let points = effectivePoints(die, stage, die.roll!, state.testPolicyStrict)

    const before = ticket.work[stage]
    const used = Math.min(before, points)
    ticket.work[stage] = before - used
    points -= used

    // Полоска полностью закрашена → следующий этап; иначе остаётся здесь до завтра
    const advanced = nextColumnAfterWork(ticket, col)
    if (advanced && !advancedIds.has(ticketId)) {
      placement[ticketId] = advanced
      advancedIds.add(ticketId)
      messages.push(`${ticketId}: полоска закрашена → «${COLUMN_TITLE[advanced]}»`)
    }

    // Избыток броска всегда сгорает (остаток не переносится)
    if (points > 0) {
      messages.push(`Остаток ${die.id} (${points}) сгорел`)
    }
  }

  const stillBlocked = tickets.some((t) => t.blocked)
  const nextDice = rolledDice
    .filter((d) => d.color !== 'pink' || stillBlocked)
    .map((d) => ({ ...d, spent: true }))

  if (!stillBlocked && rolledDice.some((d) => d.color === 'pink')) {
    messages.push('P1 ушёл (блокер снят)')
  }

  return {
    ...state,
    step: 'work',
    tickets,
    placement,
    dice: nextDice,
    leftover: {},
    rolledThisDay: true,
    message: `Бросок! ${messages.join(' · ') || 'Работа закрашена на полосках. Незавершённые карточки остаются на этапе.'}`,
  }
}

export function deployReady(state: FullState): FullState {
  if (!isBillingDay(state.day)) {
    return { ...state, message: 'Релиз только в дни биллинга (9, 12, 15, 18, 21).' }
  }

  const readyIds = state.tickets
    .filter((t) => columnOf(state, t.id) === 'ready')
    .map((t) => t.id)

  let newSubs = 0
  let tickets = state.tickets.map((t) => {
    if (!readyIds.includes(t.id)) return t
    const leadTime = state.day - (t.daySelected ?? state.day)
    let subscribers = 0
    if (t.class === 'standard') {
      subscribers = subscribersForLeadTime(leadTime, t.valueBand ?? 'med')
      newSubs += subscribers
    }
    if (t.class === 'fixed' && t.id === 'F2' && state.day <= (t.dueDay ?? 21)) {
      subscribers = t.rewardSubscribers ?? 30
      newSubs += subscribers
    }
    return {
      ...t,
      dayDeployed: state.day,
      leadTime,
      subscribers,
    }
  })

  const placement = { ...state.placement }
  for (const id of readyIds) placement[id] = 'deployed'

  // I2: при выпуске снижаем оставшийся тест у всех тикетов
  if (readyIds.includes('I2')) {
    tickets = tickets.map((t) => {
      if (t.work.test <= 0) return t
      const test = Math.max(0, t.work.test - 1)
      return { ...t, work: { ...t.work, test }, workMax: { ...t.workMax, test: Math.max(t.workMax.test, test) } }
    })
  }

  return {
    ...state,
    tickets,
    placement,
    deployedThisCycle: readyIds,
    message:
      readyIds.length === 0
        ? 'Нечего выпускать в этом цикле.'
        : `Выпущено: ${readyIds.join(', ')}. +${newSubs} подписчиков.`,
  }
}

export function completeFinance(state: FullState): FullState {
  const newlyDeployed = state.tickets.filter((t) => state.deployedThisCycle.includes(t.id))
  let newSubs = newlyDeployed.reduce((sum, t) => sum + (t.subscribers ?? 0), 0)

  // F2 reward if somehow deployed earlier this cycle already counted; if due today and in deployed with dayDeployed==21
  if (state.day === 21) {
    const f2 = state.tickets.find((t) => t.id === 'F2')
    if (f2 && f2.dayDeployed != null && f2.dayDeployed <= 21 && (f2.subscribers ?? 0) === 0) {
      // already handled in deploy if was in ready
    }
  }

  let fines = 0
  if (state.day === 15) {
    const f1 = state.tickets.find((t) => t.id === 'F1')
    if (f1 && (f1.dayDeployed == null || f1.dayDeployed > 15)) {
      fines = f1.fine ?? 2200
    }
  }

  const cycleIndex = BILLING_DAYS.indexOf(state.day as (typeof BILLING_DAYS)[number])
  const rate = (10 + Math.max(0, cycleIndex) * 5) * 10
  const totalSubscribers = state.subscribers + newSubs
  const revenue = totalSubscribers * rate
  const cycleProfit = revenue - fines
  const profitToDate = state.cash + cycleProfit

  const entry = {
    day: state.day,
    newSubscribers: newSubs,
    totalSubscribers,
    revenue,
    fines,
    cycleProfit,
    profitToDate,
  }

  // После биллинга выпущенные карточки уходят с доски (остаются в учёте по dayDeployed)
  const placement = { ...state.placement }
  const leftBoard: string[] = []
  for (const [id, col] of Object.entries(placement)) {
    if (col === 'deployed') {
      delete placement[id]
      leftBoard.push(id)
    }
  }

  return {
    ...state,
    subscribers: totalSubscribers,
    cash: profitToDate,
    financeLog: [...state.financeLog.filter((f) => f.day !== state.day), entry],
    deployedThisCycle: [],
    placement,
    selectedTicketId:
      state.selectedTicketId && leftBoard.includes(state.selectedTicketId) ? null : state.selectedTicketId,
    message: `Биллинг дня ${state.day}: +${newSubs} подп., выручка $${revenue}, штрафы $${fines}, прибыль $${profitToDate}.${
      leftBoard.length ? ` С доски ушли: ${leftBoard.join(', ')}.` : ''
    }`,
  }
}

export function advanceStep(state: FullState): FullState {
  const order: DayStep[] = isBillingDay(state.day)
    ? ['standup', 'work', 'deploy', 'finance', 'event']
    : ['standup', 'work', 'event']

  const idx = order.indexOf(state.step)
  if (idx < 0 || idx >= order.length - 1) {
    return endDay(state)
  }

  const next = order[idx + 1]
  if (next === 'deploy') return { ...state, step: 'deploy', message: 'День биллинга — выпустите тикеты из «К релизу».' }
  if (next === 'finance') return deployReady({ ...state, step: 'deploy' })
  if (next === 'work') {
    return { ...state, step: 'work', message: 'Назначьте оставшиеся кубики и бросайте.' }
  }
  return { ...state, step: next, message: `Шаг: ${STEP_LABEL[next]}` }
}

export function endDay(state: FullState): FullState {
  if (state.gameOver || state.day >= FINAL_DAY) {
    return {
      ...state,
      gameOver: true,
      step: 'event',
      activeEvent: null,
      message: `Игра окончена! Прибыль: $${state.cash}. Подписчики: ${state.subscribers}.`,
    }
  }

  const nextDay = state.day + 1
  const hasBlocker = state.tickets.some((t) => t.blocked)
  const dice = state.dice
    .filter((d) => d.color !== 'pink' || hasBlocker)
    .map((d) => ({
      ...d,
      assignedTicketId: null,
      assignedSpecialty: null,
      roll: null,
      spent: false,
    }))

  return {
    ...state,
    day: nextDay,
    step: 'standup',
    dice,
    leftover: {},
    rolledThisDay: false,
    selectedTicketId: null,
    activeEvent: null,
    message: `День ${nextDay}: стендап — WIP, пополнение «К работе», назначение сотрудников.`,
  }
}

export function finishStandup(state: FullState): FullState {
  const selectedCount = countWip(state, 'selected')
  if (selectedCount < state.wip.selected && canPullFromBacklog(state)) {
    return {
      ...state,
      message: `В «К работе» ${selectedCount}/${state.wip.selected}. Доберите из бэклога или снизьте WIP «К работе».`,
    }
  }
  const backlogEmptyNote =
    selectedCount < state.wip.selected && !canPullFromBacklog(state)
      ? ` Бэклог и колода пусты — «К работе» ${selectedCount}/${state.wip.selected}.`
      : ''
  const unassigned = state.dice.filter((d) => !d.assignedTicketId)
  if (unassigned.length > 0) {
    return {
      ...state,
      step: 'work',
      message: `Стендап завершён.${backlogEmptyNote} Назначьте сотрудников (${unassigned.map((d) => d.id).join(', ')}) и бросайте кубики.`,
    }
  }
  return {
    ...state,
    step: 'work',
    message: `Стендап завершён.${backlogEmptyNote || ' Все сотрудники назначены — можно бросать кубики.'}`,
  }
}
