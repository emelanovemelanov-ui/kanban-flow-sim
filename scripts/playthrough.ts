/**
 * Автопроход партии Day 9→21 для проверки алгоритмов движка + данных 3 графиков.
 *
 * Запуск:
 *   node --experimental-strip-types --import ./scripts/register.mjs scripts/playthrough.ts
 *   … --wip=tight|balanced|wide|default
 *   … --suite          (три вариации WIP подряд)
 */
import {
  assignDie,
  columnOf,
  countWip,
  createInitialState,
  dropTicket,
  pullIntoDoing,
  type FullState,
} from '../src/game/engine'
import { primaryAction } from '../src/game/flow'
import type { ColumnId, Specialty, WipLimits } from '../src/game/types'

/** Именованные пресеты WIP. */
const WIP_PRESETS: Record<string, WipLimits> = {
  /** Узкий поток: колонки=1, к работе=3 */
  tight: { selected: 3, analysis: 1, development: 1, test: 1, expedite: 1 },
  /** Сбалансированный */
  balanced: { selected: 4, analysis: 2, development: 3, test: 2, expedite: 1 },
  /** Широкий поток */
  wide: { selected: 6, analysis: 4, development: 6, test: 4, expedite: 2 },
}

const SUITE_ORDER = ['tight', 'balanced', 'wide'] as const

/** Тарифы биллинга после ×10: день 9 → $100, 12 → $150, … */
const BILLING_RATE: Record<number, number> = { 9: 100, 12: 150, 15: 200, 18: 250, 21: 300 }

function parseWipArg(): { name: string; wip: WipLimits | null } {
  const raw = process.argv.find((a) => a.startsWith('--wip='))?.slice('--wip='.length)
  if (process.argv.includes('--wip-tight')) return { name: 'tight', wip: WIP_PRESETS.tight }
  if (!raw || raw === 'default') return { name: 'default', wip: null }
  const preset = WIP_PRESETS[raw]
  if (!preset) {
    console.error(`Неизвестный --wip=${raw}. Доступно: default, ${Object.keys(WIP_PRESETS).join(', ')}`)
    process.exit(2)
  }
  return { name: raw, wip: preset }
}

let quiet = false
const fails: string[] = []

function note(msg: string, force = false) {
  if (!quiet || force) console.log(msg)
}

function fail(msg: string) {
  fails.push(msg)
  console.error('FAIL:', msg)
}

function assert(cond: boolean, msg: string) {
  if (!cond) fail(msg)
}

function ticketsAt(state: FullState, col: ColumnId) {
  return state.tickets.filter((t) => columnOf(state, t.id) === col)
}

function workCol(state: FullState, id: string): ColumnId | null {
  const col = columnOf(state, id)
  if (col === 'analysisDoing' || col === 'devDoing' || col === 'test') return col
  return null
}

/** Тянем из бэклога до заполнения WIP «К работе». */
function fillSelected(state: FullState): FullState {
  let s = state
  let guard = 20
  while (countWip(s, 'selected') < s.wip.selected && guard-- > 0) {
    const opt = s.tickets.find(
      (t) => columnOf(s, t.id) === 'options' && !t.expediteLane && t.class !== 'expedite',
    )
    if (!opt) break
    s = dropTicket(s, opt.id, 'selected')
  }
  return s
}

/** С done / selected тянем в doing, если есть место. */
function advanceQueue(state: FullState): FullState {
  let s = state
  const order = ['devDone', 'analysisDone', 'selected'] as const
  for (const from of order) {
    for (const t of ticketsAt(s, from)) {
      const before = columnOf(s, t.id)
      s = pullIntoDoing(s, t.id)
      if (columnOf(s, t.id) === before) break
    }
  }
  return s
}

function preferredTicketForDie(state: FullState, specialty: Specialty, color: string): string | null {
  if (color === 'pink') {
    const blocked = state.tickets.find((t) => t.blocked)
    return blocked?.id ?? null
  }

  const wantCol: ColumnId =
    specialty === 'analysis' ? 'analysisDoing' : specialty === 'development' ? 'devDoing' : 'test'

  const primary = state.tickets
    .filter((t) => columnOf(state, t.id) === wantCol && !t.blocked)
    .sort((a, b) => a.work[specialty] - b.work[specialty])

  if (primary[0]) return primary[0].id

  // fallback: любая doing-колонка с остатком работы этой специальности
  const any = state.tickets.find((t) => {
    const c = workCol(state, t.id)
    return c && !t.blocked && t.work[specialty] > 0
  })
  return any?.id ?? null
}

function assignAllDice(state: FullState): FullState {
  let s = state
  // сначала розовый на блокер
  for (const d of s.dice) {
    if (d.assignedTicketId) continue
    if (d.color !== 'pink') continue
    const tid = preferredTicketForDie(s, d.specialty, d.color)
    if (tid) s = assignDie(s, d.id, tid)
  }
  for (const d of [...s.dice]) {
    if (d.assignedTicketId) continue
    if (d.color === 'pink') continue
    let tid = preferredTicketForDie(s, d.specialty, d.color)
    if (!tid) {
      // посадить на любую карточку в работе
      const any = s.tickets.find((t) => workCol(s, t.id) && !t.blocked)
      tid = any?.id ?? null
    }
    if (!tid) {
      // создать работу: pull selected → analysis
      const sel = ticketsAt(s, 'selected')[0]
      if (sel) {
        s = pullIntoDoing(s, sel.id)
        tid = preferredTicketForDie(s, d.specialty, d.color) ?? ticketsAt(s, 'analysisDoing')[0]?.id ?? null
      }
    }
    if (tid) s = assignDie(s, d.id, tid)
  }
  return s
}

/** Сводка трёх графиков (CFD / Finance / Cycle Time) — как у кнопок в UI. */
function reportCharts(state: FullState) {
  note('\n═══════════ CFD (Cumulative Flow Diagram) ═══════════', true)
  note('день | выпущ | к рел | тест | разр | анал | к раб | всего', true)
  for (const p of state.cfd) {
    const total = p.deployed + p.ready + p.test + p.dev + p.analysis + p.selected
    note(
      `  ${String(p.day).padStart(2)}  | ${String(p.deployed).padStart(5)} | ${String(p.ready).padStart(5)} | ${String(p.test).padStart(4)} | ${String(p.dev).padStart(4)} | ${String(p.analysis).padStart(4)} | ${String(p.selected).padStart(5)} | ${total}`,
      true,
    )
  }
  if (state.cfd.length === 0) note('  (пусто)', true)

  note('\n═══════════ Financial chart ($) ═══════════', true)
  note('день | тариф | +подп | всего | выручка | штраф | прибыль цикла | нарастающим', true)
  for (const f of state.financeLog) {
    const rate = BILLING_RATE[f.day] ?? '?'
    note(
      `  ${String(f.day).padStart(2)}  | $${String(rate).padStart(3)} | ${String(f.newSubscribers).padStart(5)} | ${String(f.totalSubscribers).padStart(5)} | $${String(f.revenue).padStart(6)} | $${String(f.fines).padStart(4)} | $${String(f.cycleProfit).padStart(6)} | $${f.profitToDate}`,
      true,
    )
  }
  if (state.financeLog.length === 0) note('  (пусто)', true)

  note('\n═══════════ Cycle Time / Lead Time (LT) ═══════════', true)
  note('день выпуска | тикет | LT | класс', true)
  const byTicket = new Map(state.leadTimeLog.map((e) => [e.ticketId, e]))
  const list = [...byTicket.values()].sort((a, b) => a.day - b.day || a.ticketId.localeCompare(b.ticketId))
  for (const e of list) {
    note(`  ${String(e.day).padStart(2)}           | ${e.ticketId.padEnd(5)} | ${String(e.leadTime).padStart(2)} | ${e.class}`, true)
  }
  if (list.length === 0) {
    note('  (пусто)', true)
  } else {
    const dist = new Map<number, number>()
    for (const e of list) dist.set(e.leadTime, (dist.get(e.leadTime) ?? 0) + 1)
    const avg = list.reduce((s, e) => s + e.leadTime, 0) / list.length
    note(
      `распределение LT: ${[...dist.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([lt, n]) => `${lt}д×${n}`)
        .join(', ')} · среднее=${avg.toFixed(1)} · n=${list.length}`,
      true,
    )
  }
}

async function playDay(state: FullState, day: number): Promise<FullState> {
  note(`\n=== День ${day} · старт · шаг=${state.step} · кубиков=${state.dice.length} ===`)

  let s = state
  assert(s.day === day, `ожидали день ${day}, получили ${s.day}`)
  assert(s.step === 'standup', `день ${day}: старт не standup, а ${s.step}`)

  // Сначала двигаем очередь, потом снова заполняем «К работе» до WIP (требование finishStandup)
  s = advanceQueue(s)
  s = fillSelected(s)
  s = advanceQueue(s)
  s = fillSelected(s)
  s = assignAllDice(s)

  const unassigned = s.dice.filter((d) => !d.assignedTicketId)
  if (unassigned.length > 0) {
    // если розовый и нет блокера — это баг; иначе дотягиваем очередь ещё раз
    s = advanceQueue(s)
    s = assignAllDice(s)
  }
  const stillFree = s.dice.filter((d) => !d.assignedTicketId)
  if (stillFree.length > 0) {
    fail(`День ${day}: не удалось назначить ${stillFree.map((d) => d.id).join(',')}`)
    // аварийно: на любую карточку с work (P1 — только на блокер)
    for (const d of stillFree) {
      if (d.color === 'pink') {
        const blocked = s.tickets.find((t) => t.blocked)
        if (blocked) s = assignDie(s, d.id, blocked.id)
        continue
      }
      const t = s.tickets.find((x) => {
        const c = columnOf(s, x.id)
        return c !== 'options' && c !== 'deployed' && c !== 'ready' && !x.blocked
      })
      if (t) s = assignDie(s, d.id, t.id)
    }
  }

  // крутим primaryAction пока день не сменится или gameOver
  let guard = 40
  const startDay = s.day
  while (guard-- > 0 && !s.gameOver && s.day === startDay) {
    if (s.activeEvent) {
      note(`  событие: ${s.activeEvent.title}`)
      s = primaryAction(s)
      continue
    }

    if (s.step === 'standup') {
      const sel = countWip(s, 'selected')
      if (sel < s.wip.selected) {
        s = fillSelected(s)
      }
      const before = s.message
      s = primaryAction(s) // finish standup
      if (s.step === 'standup') {
        fail(`День ${day}: standup не завершился (${sel}/${s.wip.selected}): ${s.message}`)
        break
      }
      note(`  standup → ${s.step}`)
      continue
    }

    if (s.step === 'work' && !s.rolledThisDay) {
      // перед броском дотягиваем назначения (важно для P1 после блокера)
      s = assignAllDice(s)
      const free = s.dice.filter((d) => !d.assignedTicketId)
      if (free.length > 0) {
        note(`  не назначены: ${free.map((d) => d.id).join(',')} — повторный pull`)
        s = advanceQueue(s)
        s = assignAllDice(s)
      }
      note(`  бросок кубиков…`)
      s = primaryAction(s)
      note(`  → ${s.message.slice(0, 120)}`)

      // P1 должен исчезнуть, если блокеров нет
      const hasBlocker = s.tickets.some((t) => t.blocked)
      const hasPink = s.dice.some((d) => d.color === 'pink')
      if (!hasBlocker && hasPink && s.rolledThisDay) {
        fail(`День ${day}: после броска P1 остался без блокеров`)
      }
      if (hasBlocker && !hasPink) {
        // блокер есть, но P1 ещё не выдан — бывает до события
      }
      continue
    }

    // остаток очков — сжигаем через primary (он чистит leftover)
    if (s.step === 'work' && s.rolledThisDay) {
      s = primaryAction(s)
      continue
    }

    if (s.step === 'deploy') {
      const ready = ticketsAt(s, 'ready').map((t) => t.id)
      note(`  релиз: к релизу [${ready.join(', ') || 'пусто'}]`)
      s = primaryAction(s)
      const deployed = s.deployedThisCycle
      note(`  выпущено: [${deployed.join(', ') || 'пусто'}] · касса будет после finance`)
      for (const id of ready) {
        assert(columnOf(s, id) === 'deployed', `${id} должен быть в deployed после релиза`)
      }
      continue
    }

    s = primaryAction(s)
  }

  if (s.day === startDay && !s.gameOver) {
    fail(`День ${day}: застряли на шаге ${s.step}, день не сменился`)
  }

  note(
    `=== конец дня ${startDay}: cash=$${s.cash} subs=${s.subscribers} nextDay=${s.day} optionsDeck=${s.optionsDeck.length} ===`,
    true,
  )
  return s
}

interface RunSummary {
  name: string
  wip: WipLimits
  cash: number
  subscribers: number
  deployed: number
  avgLt: number
  ok: boolean
  failCount: number
}

async function runScenario(name: string, wipOverride: WipLimits | null): Promise<RunSummary> {
  fails.length = 0
  note(`\n████████████████████████████████████████████████████`, true)
  note(`█  Сценарий WIP: ${name}`, true)
  note(`████████████████████████████████████████████████████`, true)

  let state = createInitialState()
  if (wipOverride) state = { ...state, wip: { ...wipOverride } }

  note(
    `WIP: к работе=${state.wip.selected}, анализ=${state.wip.analysis}, разработка=${state.wip.development}, тест=${state.wip.test}, срочное=${state.wip.expedite}`,
    true,
  )

  assert(state.day === 9, 'старт с Day 9')
  assert(state.optionsDeck.length > 0, 'должна быть скрытая колода Options')
  assert(state.tickets.some((t) => columnOf(state, t.id) === 'options'), 'в бэклоге есть карточки')

  const optionsBefore = state.tickets.filter((t) => columnOf(state, t.id) === 'options').length
  state = fillSelected(state)
  const optionsAfter = state.tickets.filter((t) => columnOf(state, t.id) === 'options').length
  assert(
    optionsAfter >= Math.min(5, optionsBefore),
    `после pull бэклог должен пополняться (было ${optionsBefore}, стало ${optionsAfter})`,
  )
  note(`Пополнение бэклога: ${optionsBefore} → ${optionsAfter} видимых, колода ${state.optionsDeck.length}`, true)
  note(`«К работе»: ${countWip(state, 'selected')}/${state.wip.selected}`, true)

  for (let day = 9; day <= 21; day++) {
    if (state.gameOver) break
    if (state.day !== day) {
      if (state.day > day) continue
      fail(`ожидали день ${day}, state.day=${state.day}`)
      break
    }
    state = await playDay(state, day)
  }

  note('\n——— Итог ———', true)
  note(`gameOver=${state.gameOver} day=${state.day} cash=$${state.cash} subscribers=${state.subscribers}`, true)
  note(`eventLog: ${state.eventLog.join(' | ')}`, true)
  const deployedList = state.tickets.filter((t) => columnOf(state, t.id) === 'deployed')
  note(`deployed tickets: ${deployedList.map((t) => t.id).join(', ')}`, true)

  reportCharts(state)

  assert(state.gameOver || state.day > 21 || (state.day === 21 && state.gameOver), 'игра должна завершиться к Day 21')
  assert(state.financeLog.length >= 4, `ожидали ≥4 биллинга, получили ${state.financeLog.length}`)
  assert(state.eventLog.length >= 10, `ожидали много событий, получили ${state.eventLog.length}`)
  assert(state.cfd.length >= 10, `CFD: ожидали ≥10 точек (дни 8…21), получили ${state.cfd.length}`)
  assert(
    state.cfd.every((p, i, arr) => i === 0 || p.day >= arr[i - 1].day),
    'CFD: дни должны идти по возрастанию',
  )
  assert(state.cfd.some((p) => p.day === 8), 'CFD: должна быть стартовая точка дня 8')
  assert(state.financeLog.length === 5, `Finance: ожидали 5 циклов (9/12/15/18/21), получили ${state.financeLog.length}`)

  for (const f of state.financeLog) {
    const rate = BILLING_RATE[f.day]
    if (rate != null) {
      assert(
        f.revenue === f.totalSubscribers * rate,
        `тариф дня ${f.day}: ожидали ${f.totalSubscribers}×$${rate}=$${f.totalSubscribers * rate}, получили $${f.revenue}`,
      )
    }
  }

  const deployedIds = deployedList.map((t) => t.id)
  const ltIds = new Set(state.leadTimeLog.map((e) => e.ticketId))
  for (const id of deployedIds) {
    assert(ltIds.has(id), `LT: выпущенный ${id} должен быть в leadTimeLog`)
  }
  assert(state.leadTimeLog.length >= 1, 'LT: хотя бы один выпущенный тикет')
  assert(
    !state.dice.some((d) => d.color === 'pink') || state.tickets.some((t) => t.blocked),
    'P1 не должен висеть без блокера в финале',
  )

  const byTicket = new Map(state.leadTimeLog.map((e) => [e.ticketId, e]))
  const ltList = [...byTicket.values()]
  const avgLt = ltList.length ? ltList.reduce((s, e) => s + e.leadTime, 0) / ltList.length : 0

  const ok = fails.length === 0
  if (ok) note(`\n✓ Сценарий «${name}» — ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ`, true)
  else {
    note(`\n✗ Сценарий «${name}» — ПРОВАЛЕНО: ${fails.length}`, true)
    fails.forEach((f) => console.error(' -', f))
  }

  return {
    name,
    wip: { ...state.wip },
    cash: state.cash,
    subscribers: state.subscribers,
    deployed: deployedList.length,
    avgLt,
    ok,
    failCount: fails.length,
  }
}

async function main() {
  const suite = process.argv.includes('--suite')
  quiet = suite || process.argv.includes('--quiet')

  const summaries: RunSummary[] = []

  if (suite) {
    note('Сюит: tight → balanced → wide (тарифы ×10)', true)
    for (const name of SUITE_ORDER) {
      summaries.push(await runScenario(name, WIP_PRESETS[name]))
    }
  } else {
    const { name, wip } = parseWipArg()
    quiet = process.argv.includes('--quiet')
    summaries.push(await runScenario(name, wip))
  }

  if (summaries.length > 1) {
    note('\n═══════════ Сравнение сценариев ═══════════', true)
    note('сценарий   | sel/an/dev/te/ex | выпущено | подп. | касса   | ср.LT | статус', true)
    for (const s of summaries) {
      const w = `${s.wip.selected}/${s.wip.analysis}/${s.wip.development}/${s.wip.test}/${s.wip.expedite}`
      note(
        `${s.name.padEnd(10)} | ${w.padEnd(16)} | ${String(s.deployed).padStart(8)} | ${String(s.subscribers).padStart(5)} | $${String(s.cash).padStart(6)} | ${s.avgLt.toFixed(1).padStart(5)} | ${s.ok ? 'OK' : `FAIL×${s.failCount}`}`,
        true,
      )
    }
  }

  if (summaries.some((s) => !s.ok)) process.exit(1)
  console.log('\nВСЕ СЦЕНАРИИ ПРОЙДЕНЫ')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
