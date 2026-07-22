export type TicketClass = 'standard' | 'fixed' | 'expedite' | 'intangible'
export type ValueBand = 'high' | 'med' | 'low'
export type Specialty = 'analysis' | 'development' | 'test'
export type DieColor = 'red' | 'blue' | 'green' | 'pink'

export type ColumnId =
  | 'options'
  | 'selected'
  | 'analysisDoing'
  | 'analysisDone'
  | 'devDoing'
  | 'devDone'
  | 'test'
  | 'ready'
  | 'deployed'

export type DayStep =
  | 'standup'
  | 'work'
  | 'deploy'
  | 'charts'
  | 'finance'
  | 'event'

export interface WorkRemaining {
  analysis: number
  development: number
  test: number
}

export interface Ticket {
  id: string
  title: string
  class: TicketClass
  valueBand?: ValueBand
  /** Оценка подписчиков (для Standard), показывается на карточке. */
  estSubs?: number
  work: WorkRemaining
  workMax: WorkRemaining
  daySelected: number | null
  dayDeployed: number | null
  leadTime: number | null
  subscribers: number | null
  dueDay?: number
  fine?: number
  rewardSubscribers?: number
  expediteLane: boolean
  blocked: boolean
}

export interface Die {
  id: string
  color: DieColor
  specialty: Specialty
  assignedTicketId: string | null
  assignedSpecialty: Specialty | null
  roll: number | null
  spent: boolean
}

export interface WipLimits {
  selected: number
  analysis: number
  development: number
  test: number
  expedite: number
}

export interface FinanceCycle {
  day: number
  newSubscribers: number
  totalSubscribers: number
  revenue: number
  fines: number
  cycleProfit: number
  profitToDate: number
}

export interface GameState {
  day: number
  step: DayStep
  tickets: Ticket[]
  /** Скрытая колода бэклога: пополняет Options при уходе карточек в «К работе». */
  optionsDeck: Ticket[]
  dice: Die[]
  wip: WipLimits
  subscribers: number
  cash: number
  financeLog: FinanceCycle[]
  leftover: Partial<Record<Specialty, number>>
  message: string
  selectedTicketId: string | null
  rolledThisDay: boolean
  deployedThisCycle: string[]
  /** Активная карточка события (нужно подтвердить). */
  activeEvent: { day: number; title: string; body: string } | null
  eventLog: string[]
  cfd: import('./events').CfdPoint[]
  leadTimeLog: { day: number; ticketId: string; leadTime: number; class: TicketClass }[]
  testPolicyStrict: boolean
  gameOver: boolean
  pendingGameOver: boolean
}

export const BILLING_DAYS = [9, 12, 15, 18, 21] as const
export const FINAL_DAY = 21
export const START_DAY = 9

export const COLUMN_LABELS: Record<ColumnId, string> = {
  options: 'Бэклог',
  selected: 'К работе',
  analysisDoing: 'Анализ · в работе',
  analysisDone: 'Анализ · готово',
  devDoing: 'Разработка · в работе',
  devDone: 'Разработка · готово',
  test: 'Тест',
  ready: 'К релизу',
  deployed: 'Выпущено',
}

export const MAIN_FLOW: ColumnId[] = [
  'options',
  'selected',
  'analysisDoing',
  'analysisDone',
  'devDoing',
  'devDone',
  'test',
  'ready',
  'deployed',
]
