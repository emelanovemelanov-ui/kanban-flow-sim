import type { CfdPoint } from '../game/events'
import { columnOf, type FullState } from '../game/engine'
import { computeLostOpportunity } from '../game/opportunity'
import type { FinanceCycle, TicketClass, WipLimits } from '../game/types'

const STORAGE_KEY = 'kanban-flow-sim-results-v1'

export interface SavedLeadTime {
  day: number
  ticketId: string
  leadTime: number
  class: TicketClass
}

export interface SavedLossItem {
  ticketId: string
  title: string
  columnLabel: string
  daySelected: number
  leadTimeIfDay21: number
  lostSubscribers: number
}

/** Полный снимок партии для игрока (все графики + итоги). */
export interface PlayerRun {
  id: string
  playerName: string
  finishedAt: string
  cash: number
  subscribers: number
  deployedCount: number
  avgLeadTime: number
  lostSubscribers: number
  lostRevenue: number
  wip: WipLimits
  cfd: CfdPoint[]
  financeLog: FinanceCycle[]
  leadTimeLog: SavedLeadTime[]
  lossItems: SavedLossItem[]
}

export interface ResultsStore {
  version: 1
  runs: PlayerRun[]
}

function emptyStore(): ResultsStore {
  return { version: 1, runs: [] }
}

export function loadResultsStore(): ResultsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as ResultsStore
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs)) return emptyStore()
    return parsed
  } catch {
    return emptyStore()
  }
}

function saveResultsStore(store: ResultsStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function listRunsByProfit(): PlayerRun[] {
  return [...loadResultsStore().runs].sort(
    (a, b) => b.cash - a.cash || b.subscribers - a.subscribers || a.finishedAt.localeCompare(b.finishedAt),
  )
}

export function getRunById(id: string): PlayerRun | undefined {
  return loadResultsStore().runs.find((r) => r.id === id)
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Собирает и сохраняет результат завершённой партии. */
export function savePlayerRun(playerName: string, state: FullState): PlayerRun {
  const byTicket = new Map(state.leadTimeLog.map((e) => [e.ticketId, e]))
  const leadTimeLog = [...byTicket.values()].sort((a, b) => a.day - b.day || a.ticketId.localeCompare(b.ticketId))
  const avgLeadTime =
    leadTimeLog.length === 0 ? 0 : leadTimeLog.reduce((s, e) => s + e.leadTime, 0) / leadTimeLog.length
  const loss = computeLostOpportunity(state)
  const deployedCount = state.tickets.filter((t) => columnOf(state, t.id) === 'deployed').length

  const run: PlayerRun = {
    id: newId(),
    playerName: playerName.trim() || 'Игрок',
    finishedAt: new Date().toISOString(),
    cash: state.cash,
    subscribers: state.subscribers,
    deployedCount,
    avgLeadTime: Math.round(avgLeadTime * 10) / 10,
    lostSubscribers: loss?.lostSubscribers ?? 0,
    lostRevenue: loss?.lostRevenue ?? 0,
    wip: { ...state.wip },
    cfd: state.cfd.map((p) => ({ ...p })),
    financeLog: state.financeLog.map((f) => ({ ...f })),
    leadTimeLog,
    lossItems: loss?.items.map((i) => ({ ...i })) ?? [],
  }

  const store = loadResultsStore()
  store.runs.push(run)
  saveResultsStore(store)
  return run
}

export function formatFinishedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
