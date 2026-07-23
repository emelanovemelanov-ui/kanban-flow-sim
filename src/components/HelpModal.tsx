import { useState } from 'react'

type SectionId =
  | 'welcome'
  | 'board'
  | 'cards'
  | 'people'
  | 'play'
  | 'wip'
  | 'billing'
  | 'charts'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'welcome', label: 'Приветствие' },
  { id: 'board', label: 'Доска' },
  { id: 'cards', label: 'Карточки' },
  { id: 'people', label: 'Сотрудники' },
  { id: 'play', label: 'Как играть' },
  { id: 'wip', label: 'WIP-лимиты' },
  { id: 'billing', label: 'Биллинг' },
  { id: 'charts', label: 'Графики' },
]

interface HelpModalProps {
  onClose: () => void
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [section, setSection] = useState<SectionId>('welcome')

  return (
    <div className="modal-backdrop help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card help-card"
        role="dialog"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-head">
          <div>
            <p className="modal-kicker">Kanban · ТехВилл</p>
            <h2 id="help-title">Справка по игре</h2>
          </div>
          <button type="button" className="chart-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="help-layout">
          <nav className="help-nav" aria-label="Разделы справки">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`help-nav-btn${section === s.id ? ' is-active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="help-body">
            {section === 'welcome' && <WelcomeSection onStart={() => setSection('board')} />}
            {section === 'board' && <BoardSection />}
            {section === 'cards' && <CardsSection />}
            {section === 'people' && <PeopleSection />}
            {section === 'play' && <PlaySection />}
            {section === 'wip' && <WipSection />}
            {section === 'billing' && <BillingSection />}
            {section === 'charts' && <ChartsSection />}
          </div>
        </div>

        <footer className="help-foot">
          <button type="button" className="btn-start" onClick={onClose}>
            Понятно, играть
          </button>
        </footer>
      </div>
    </div>
  )
}

function WelcomeSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="help-section">
      <h3>Добро пожаловать!</h3>
      <p>
        Это учебная симуляция канбан-потока доставки ПО (в духе getKanban). Вы — руководитель команды:
        ведёте карточки по доске, назначаете сотрудников, соблюдаете WIP-лимиты и зарабатываете на
        подписчиках.
      </p>
      <ul className="help-list">
        <li>
          <strong>Дни 9–21</strong> — партия идёт две недели симуляции.
        </li>
        <li>
          <strong>Цель</strong> — выпустить ценные задачи вовремя, нарастить подписчиков и кассу, не
          утонуть в незавершённой работе.
        </li>
        <li>
          <strong>Управление</strong> — перетаскивание карточек и фигурок сотрудников, зелёная кнопка
          шага в шапке.
        </li>
      </ul>
      <div className="help-callout">
        Ниже — карта экрана, легенда цветов и пошаговые правила. Можно сразу открыть раздел «Доска»
        или закрыть справку и начать со стендапа дня 9.
      </div>
      <button type="button" className="btn-chart help-inline-btn" onClick={onStart}>
        Смотреть доску →
      </button>
    </section>
  )
}

function BoardSection() {
  return (
    <section className="help-section">
      <h3>Что мы видим на доске</h3>
      <p>
        Доска слева направо — путь работы от идеи до выпуска. Сверху — срочная дорожка, снизу —
        основной поток. В шапке колонок в скобках — текущий WIP-лимит.
      </p>

      <figure className="help-figure">
        <BoardSchematic />
        <figcaption>
          Верх доски как в игре: двухуровневая шапка (Анализ/Разработка → «В работе» / «Готово»), затем
          строка «СРОЧНОЕ», ниже — основной поток.
        </figcaption>
      </figure>

      <ol className="help-list numbered">
        <li>
          <strong>Бэклог</strong> — запас задач. В поток только через «К работе».
        </li>
        <li>
          <strong>К работе</strong> — взяли в спринт потока (фиксируется день выбора).
        </li>
        <li>
          <strong>Анализ → Разработка → Тест</strong> — у анализа и разработки есть «В работе» и
          «Готово».
        </li>
        <li>
          <strong>К релизу / Выпущено</strong> — готово к биллингу и только что выпущено; после
          закрытия биллинга карточки уходят с доски.
        </li>
        <li>
          <strong>Срочное</strong> — отдельная дорожка с собственным WIP; колоночные лимиты тоже
          действуют.
        </li>
      </ol>

      <figure className="help-figure">
        <HudSchematic />
        <figcaption>Верхняя панель управления игрой</figcaption>
      </figure>

      <ol className="help-list numbered">
        <li>
          <strong>День</strong> — текущий день симуляции (партия идёт с 9-го по 21-й). От дня зависят
          события, биллинг и дедлайны.
        </li>
        <li>
          <strong>Касса</strong> — накопленная прибыль: выручка по биллингам минус штрафы и траты
          (например, найм G4).
        </li>
        <li>
          <strong>Сотрудники</strong> — пул свободных людей. Отсюда их перетаскивают на карточки;
          обратно в пул — с карточки сюда же.
        </li>
        <li>
          <strong>CFD</strong> — график накопленного потока карточек по стадиям.
        </li>
        <li>
          <strong>$</strong> — финансовая сводка по циклам биллинга.
        </li>
        <li>
          <strong>LT</strong> — lead time выпущенных тикетов (сколько дней от выбора до выпуска).
        </li>
        <li>
          <strong>−п</strong> — потери по незавершённым задачам к дню 21 (доступно после финального
          биллинга).
        </li>
        <li>
          <strong>Зелёная кнопка</strong> — главное действие текущего шага (стендап, бросок, релиз,
          биллинг, событие).
        </li>
        <li>
          <strong>Шаг</strong> — на каком этапе дня вы сейчас (событие утра → стендап → работа → …).
        </li>
        <li>
          <strong>?</strong> — эта справка.
        </li>
        <li>
          <strong>Сброс</strong> — начать партию заново с дня 9.
        </li>
      </ol>
    </section>
  )
}

function CardsSection() {
  return (
    <section className="help-section">
      <h3>Карточки на доске</h3>
      <p>
        Карточку можно перетаскивать между колонками. На неё же бросают сотрудников из пула. Цвет фона
        = класс работы.
      </p>

      <div className="help-swatches">
        <div className="help-swatch ticket-standard">
          <strong>S…</strong>
          <span>Обычная история</span>
          <em>Даёт подписчиков при выпуске</em>
        </div>
        <div className="help-swatch ticket-fixed">
          <strong>F…</strong>
          <span>Фиксированный срок</span>
          <em>Дедлайн, штраф или награда</em>
        </div>
        <div className="help-swatch ticket-intangible">
          <strong>I…</strong>
          <span>Нематериальное</span>
          <em>Улучшение процесса</em>
        </div>
        <div className="help-swatch ticket-expedite">
          <strong>E… / D…</strong>
          <span>Срочное</span>
          <em>Аварии и срочные запросы</em>
        </div>
      </div>

      <h4 className="help-subtitle">Разбор обычной карточки</h4>
      <div className="help-card-anatomy">
        <div className="help-ticket-demo ticket-standard" aria-hidden>
          <div className="help-ticket-demo-top">
            <span className="help-mark" data-n="1">
              S10
            </span>
            <span className="help-mark" data-n="2">
              Подп:8
            </span>
          </div>
          <div className="help-ticket-demo-bars help-mark" data-n="3">
            <div className="work-cells work-red">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={`r${i}`} className={`cell${i < 4 ? ' filled' : ''}`} />
              ))}
            </div>
            <div className="work-cells work-blue">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={`b${i}`} className={`cell${i < 2 ? ' filled' : ''}`} />
              ))}
            </div>
            <div className="work-cells work-green">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={`g${i}`} className="cell" />
              ))}
            </div>
          </div>
          <div className="help-ticket-demo-crew help-mark" data-n="4">
            <span className="person person-blue person-on-card">
              <svg className="person-svg" viewBox="0 0 24 32" aria-hidden>
                <circle cx="12" cy="7" r="4.5" />
                <path d="M12 13c-4.8 0-8.5 3.2-8.5 9.2V29h17v-6.8C20.5 16.2 16.8 13 12 13z" />
              </svg>
              <span className="person-id">B1</span>
            </span>
          </div>
          <div className="help-ticket-demo-foot">
            <span className="help-mark" data-n="5">
              Обычная история
            </span>
            <span className="help-mark" data-n="6">
              3 дн.
            </span>
          </div>
        </div>

        <ol className="help-callouts">
          <li>
            <strong>ID карточки</strong> — уникальный код (S10, F1, E1…). По нему удобно искать задачу
            на доске и в графиках.
          </li>
          <li>
            <strong>Подп: N</strong> — оценка или уже полученные подписчики. У ordinary-историй до
            выпуска это оценка; после выпуска — факт. Чем короче lead time, тем обычно больше
            подписчиков.
          </li>
          <li>
            <strong>Полоски работы</strong> — три ряда клеток:
            <ul>
              <li>
                <span className="help-dot help-dot-red" /> красная — анализ;
              </li>
              <li>
                <span className="help-dot help-dot-blue" /> синяя — разработка;
              </li>
              <li>
                <span className="help-dot help-dot-green" /> зелёная — тест.
              </li>
            </ul>
            Закрашенная клетка = сделанный объём, пустая = осталось. Бросок кубика закрашивает клетки.
            В «Готово» / «К релизу» можно перейти только с полной полоской этапа.
          </li>
          <li>
            <strong>Сотрудники на карточке</strong> — фигурки, которых вы перетащили из пула. После
            «Бросить кубики» их очки идут в полоску текущей колонки (своя специальность даёт полный
            бросок).
          </li>
          <li>
            <strong>Класс</strong> — тип работы (обычная / фикс. срок / нематериальное / срочное).
          </li>
          <li>
            <strong>Возраст</strong> — сколько дней карточка в потоке с момента выбора («Первый день»,
            «3 дн.»…) или lead time после выпуска.
          </li>
        </ol>
      </div>

      <h4 className="help-subtitle">Особые элементы других классов</h4>
      <div className="help-card-variants">
        <div className="help-ticket-demo ticket-fixed">
          <div className="help-ticket-demo-top">
            <strong>F1</strong>
            <span className="ticket-meta danger">$-2200</span>
          </div>
          <p className="ticket-due">Срок: день 15</p>
          <div className="help-ticket-demo-bars">
            <div className="work-cells work-red">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="cell" />
              ))}
            </div>
            <div className="work-cells work-blue">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="cell" />
              ))}
            </div>
            <div className="work-cells work-green">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="cell" />
              ))}
            </div>
          </div>
          <div className="help-ticket-demo-foot">
            <span>Фикс. срок</span>
            <span>Доступен</span>
          </div>
        </div>
        <ul className="help-list">
          <li>
            <strong>$-2200</strong> (красным) — штраф, если не выпустить к сроку (как у F1 к дню 15).
          </li>
          <li>
            <strong>+N подп.</strong> — награда подписчиками при своевременном выпуске (как у F2).
          </li>
          <li>
            <strong>Срок: день N</strong> — дедлайн фиксированной карточки.
          </li>
        </ul>
      </div>

      <div className="help-card-variants">
        <div className="help-ticket-demo ticket-expedite">
          <div className="help-ticket-demo-top">
            <strong>E1</strong>
          </div>
          <p className="ticket-blocked">⛔ Блокер — нужен P1</p>
          <p className="ticket-title">Срочно: авария у клиента</p>
          <div className="help-ticket-demo-bars">
            <div className="work-cells work-red">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className="cell filled" />
              ))}
            </div>
            <div className="work-cells work-blue">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`cell${i < 1 ? ' filled' : ''}`} />
              ))}
            </div>
            <div className="work-cells work-green">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="cell" />
              ))}
            </div>
          </div>
          <div className="help-ticket-demo-foot">
            <span>Срочное</span>
            <span>2 дн.</span>
          </div>
        </div>
        <ul className="help-list">
          <li>
            <strong>Название</strong> — у срочных и нематериальных показывается текстом на карточке.
          </li>
          <li>
            <strong>⛔ Блокер</strong> — работу обычными сотрудниками не продолжить, пока не назначите
            розового P1 и не бросите кубики.
          </li>
        </ul>
      </div>

      <div className="help-callout">
        Из бэклога карточку сначала тянут только в «К работе». Дальше — по стадиям, не нарушая WIP и
        порядок полосок.
      </div>
    </section>
  )
}

function PeopleSection() {
  return (
    <section className="help-section">
      <h3>Легенда сотрудников</h3>
      <p>
        Фигурки в шапке — свободные сотрудники. Перетащите на карточку в колонке «в работе», затем
        нажмите «Бросить кубики».
      </p>

      <div className="help-people-grid">
        <PeopleSwatch color="red" id="R1" role="Аналитик" tip="Сильнее в анализе" />
        <PeopleSwatch color="blue" id="B1" role="Разработчик" tip="Сильнее в разработке" />
        <PeopleSwatch color="green" id="G1" role="Тестировщик" tip="Сильнее в тесте" />
        <PeopleSwatch color="pink" id="P1" role="Петя" tip="Только снимает блокер" />
      </div>

      <p>
        Когда сотрудник работает по своей специальности, в полоску идёт полный бросок кубика. Если
        работа чужая — только половина очков, с округлением вверх.
      </p>
    </section>
  )
}

function PeopleSwatch({
  color,
  id,
  role,
  tip,
}: {
  color: string
  id: string
  role: string
  tip: string
}) {
  return (
    <div className={`help-person-card person-${color}`}>
      <span className={`person person-${color}`}>
        <svg className="person-svg" viewBox="0 0 24 32" aria-hidden>
          <circle cx="12" cy="7" r="4.5" />
          <path d="M12 13c-4.8 0-8.5 3.2-8.5 9.2V29h17v-6.8C20.5 16.2 16.8 13 12 13z" />
        </svg>
        <span className="person-id">{id}</span>
      </span>
      <div>
        <strong>{role}</strong>
        <span>{tip}</span>
      </div>
    </div>
  )
}

function PlaySection() {
  return (
    <section className="help-section">
      <h3>Как играть — цикл дня</h3>
      <ol className="help-steps">
        <li>
          <strong>Событие утра</strong> — в начале каждого дня (включая день 9) прочитайте карточку
          события (иногда выбор Да/Нет). Эффекты действуют уже в этот день.
        </li>
        <li>
          <strong>Стендап</strong> — пополните «К работе» из бэклога, подвиньте очередь, назначьте
          сотрудников. Затем «Завершить стендап».
        </li>
        <li>
          <strong>Работа</strong> — «Бросить кубики»: полоски закрашиваются. Незавершённое остаётся на
          этапе.
        </li>
        <li>
          <strong>Биллинг-дни 9 / 12 / 15 / 18 / 21</strong> — «Выпустить» из «К релизу», затем
          закрыть биллинг: выпущенные карточки уходят с доски. После последнего биллинга партия
          завершается.
        </li>
      </ol>
      <div className="help-callout">
        Подсказка текущего шага всегда в тёмной полосе под шапкой. Зелёная кнопка — главное действие
        шага.
      </div>
    </section>
  )
}

function WipSection() {
  return (
    <section className="help-section">
      <h3>Регулировка WIP-лимитов</h3>
      <p>
        Внизу экрана — блок «Регулировка WIP-лимитов». Кнопки − / + меняют лимит колонки. Нельзя
        затянуть больше карточек, чем позволяет лимит.
      </p>
      <ul className="help-list">
        <li>
          <strong>К работе / Анализ / Разработка / Тест</strong> — лимиты основного потока.
        </li>
        <li>
          <strong>Срочное</strong> — сколько срочных можно вести одновременно (обычно 1).
        </li>
        <li>Срочное больше не обходит лимиты колонок — учитывайте оба ограничения.</li>
        <li>Узкий WIP чаще даёт меньше «зависшей» работы и меньшие потери (−п) к дню 21.</li>
      </ul>
    </section>
  )
}

function BillingSection() {
  return (
    <section className="help-section">
      <h3>Подписчики и деньги</h3>
      <ul className="help-list">
        <li>При выпуске ordinary-историй считаются подписчики (быстрее lead time — больше подп.).</li>
        <li>
          Биллинг: <strong>подписчики × тариф</strong> минус штрафы. Тарифы: $100 → $150 → $200 → $250
          → $300 (дни 9…21).
        </li>
        <li>F1 к дню 15: не выпустили — штраф. F2 к финишу — награда подписчиками, если успели.</li>
        <li>Касса в шапке — нарастающая прибыль.</li>
      </ul>
    </section>
  )
}

function ChartsSection() {
  return (
    <section className="help-section">
      <h3>Кнопки графиков</h3>
      <div className="help-chart-keys">
        <span>
          <b>CFD</b> — накопленный поток по стадиям
        </span>
        <span>
          <b>$</b> — финансы по циклам биллинга
        </span>
        <span>
          <b>LT</b> — lead time выпущенных тикетов
        </span>
        <span>
          <b>−п</b> — потери по незавершённому WIP (после биллинга дня 21)
        </span>
      </div>
    </section>
  )
}

function BoardSchematic() {
  // Колонки как на реальной доске (без узкой рейки слева в пикселях схемы):
  // Бэклог | К работе | Ан.в работе | Ан.готово | Рз.в работе | Рз.готово | Тест | К релизу | Выпущено
  const cols = [
    { x: 28, w: 68, key: 'backlog' },
    { x: 96, w: 68, key: 'selected' },
    { x: 164, w: 58, key: 'anDo' },
    { x: 222, w: 58, key: 'anDone' },
    { x: 280, w: 58, key: 'devDo' },
    { x: 338, w: 58, key: 'devDone' },
    { x: 396, w: 68, key: 'test' },
    { x: 464, w: 68, key: 'ready' },
    { x: 532, w: 76, key: 'deployed' },
  ] as const
  const right = 608
  const headerH1 = 26
  const headerH2 = 22
  const y1 = 8
  const y2 = y1 + headerH1
  const yExp = y2 + headerH2
  const expH = 40
  const yMain = yExp + expH
  const mainH = 70

  return (
    <svg className="help-svg" viewBox="0 0 640 180" role="img" aria-label="Схема верхней части канбан-доски">
      <rect width="640" height="180" rx="6" fill="#f3f1ea" stroke="#cfc8b8" />

      {/* Угол над подписью «Срочное» */}
      <rect x="8" y={y1} width="20" height={headerH1 + headerH2} fill="#f3f1ea" stroke="#cfc8b8" />

      {/* Ряд 1: сквозные и объединённые заголовки */}
      <rect x={cols[0].x} y={y1} width={cols[0].w} height={headerH1 + headerH2} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[0].x + cols[0].w / 2} y={y1 + 28} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2224">
        Бэклог
      </text>

      <rect x={cols[1].x} y={y1} width={cols[1].w} height={headerH1 + headerH2} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[1].x + cols[1].w / 2} y={y1 + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2224">
        К работе
      </text>
      <text x={cols[1].x + cols[1].w / 2} y={y1 + 36} textAnchor="middle" fontSize="9" fill="#5a686c">
        (5)
      </text>

      <rect x={cols[2].x} y={y1} width={cols[2].w + cols[3].w} height={headerH1} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[2].x + (cols[2].w + cols[3].w) / 2} y={y1 + 17} textAnchor="middle" fontSize="10" fontWeight="700" fill="#b53d3d">
        Анализ (3)
      </text>

      <rect x={cols[4].x} y={y1} width={cols[4].w + cols[5].w} height={headerH1} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[4].x + (cols[4].w + cols[5].w) / 2} y={y1 + 17} textAnchor="middle" fontSize="10" fontWeight="700" fill="#3a5fbf">
        Разработка (5)
      </text>

      <rect x={cols[6].x} y={y1} width={cols[6].w} height={headerH1 + headerH2} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[6].x + cols[6].w / 2} y={y1 + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="#2f7a35">
        Тест
      </text>
      <text x={cols[6].x + cols[6].w / 2} y={y1 + 36} textAnchor="middle" fontSize="9" fill="#2f7a35">
        (3)
      </text>

      <rect x={cols[7].x} y={y1} width={cols[7].w} height={headerH1 + headerH2} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[7].x + cols[7].w / 2} y={y1 + 28} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2224">
        К релизу
      </text>

      <rect x={cols[8].x} y={y1} width={cols[8].w} height={headerH1 + headerH2} fill="#f3f1ea" stroke="#cfc8b8" />
      <text x={cols[8].x + cols[8].w / 2} y={y1 + 28} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2224">
        Выпущено
      </text>

      {/* Ряд 2: подколонки анализа и разработки */}
      <rect x={cols[2].x} y={y2} width={cols[2].w} height={headerH2} fill="#f7f5ef" stroke="#cfc8b8" />
      <text x={cols[2].x + cols[2].w / 2} y={y2 + 15} textAnchor="middle" fontSize="9" fill="#5a686c">
        В работе
      </text>
      <rect x={cols[3].x} y={y2} width={cols[3].w} height={headerH2} fill="#f7f5ef" stroke="#cfc8b8" />
      <text x={cols[3].x + cols[3].w / 2} y={y2 + 15} textAnchor="middle" fontSize="9" fill="#5a686c">
        Готово
      </text>
      <rect x={cols[4].x} y={y2} width={cols[4].w} height={headerH2} fill="#f7f5ef" stroke="#cfc8b8" />
      <text x={cols[4].x + cols[4].w / 2} y={y2 + 15} textAnchor="middle" fontSize="9" fill="#5a686c">
        В работе
      </text>
      <rect x={cols[5].x} y={y2} width={cols[5].w} height={headerH2} fill="#f7f5ef" stroke="#cfc8b8" />
      <text x={cols[5].x + cols[5].w / 2} y={y2 + 15} textAnchor="middle" fontSize="9" fill="#5a686c">
        Готово
      </text>

      {/* Срочная строка */}
      <rect x="8" y={yExp} width="20" height={expH} fill="#e8e6e0" stroke="#cfc8b8" />
      <text
        x="18"
        y={yExp + expH / 2}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="#5a686c"
        transform={`rotate(-90 18 ${yExp + expH / 2})`}
      >
        СРОЧНОЕ (1)
      </text>
      {cols.map((c) => (
        <rect key={`exp-${c.key}`} x={c.x} y={yExp} width={c.w} height={expH} fill="#faf8f4" stroke="#cfc8b8" />
      ))}
      <rect x={cols[1].x + 8} y={yExp + 8} width={52} height={24} rx="2" fill="#f0d0c0" stroke="#b9b2a2" />
      <text x={cols[1].x + 34} y={yExp + 24} textAnchor="middle" fontSize="9" fontWeight="700" fill="#8a3a18">
        E1
      </text>

      {/* Основной поток */}
      <rect x="8" y={yMain} width="20" height={mainH} fill="#f3f1ea" stroke="#cfc8b8" />
      {cols.map((c) => (
        <rect key={`main-${c.key}`} x={c.x} y={yMain} width={c.w} height={mainH} fill="#fff" stroke="#cfc8b8" />
      ))}
      <rect x={cols[0].x + 8} y={yMain + 10} width={52} height="22" rx="2" fill="#d9c6ef" stroke="#b9b2a2" />
      <text x={cols[0].x + 34} y={yMain + 25} textAnchor="middle" fontSize="9" fontWeight="700">
        F1
      </text>
      <rect x={cols[0].x + 8} y={yMain + 38} width={52} height="22" rx="2" fill="#f2e6b8" stroke="#b9b2a2" />
      <text x={cols[0].x + 34} y={yMain + 53} textAnchor="middle" fontSize="9" fontWeight="700">
        S10
      </text>
      <rect x={cols[2].x + 6} y={yMain + 18} width={46} height="28" rx="2" fill="#f2e6b8" stroke="#b9b2a2" />
      <text x={cols[2].x + 29} y={yMain + 36} textAnchor="middle" fontSize="9" fontWeight="700">
        S8
      </text>
      <rect x={cols[6].x + 8} y={yMain + 18} width={52} height="28" rx="2" fill="#f2e6b8" stroke="#b9b2a2" />
      <text x={cols[6].x + 34} y={yMain + 36} textAnchor="middle" fontSize="9" fontWeight="700">
        S2
      </text>
      <rect x={cols[8].x + 10} y={yMain + 18} width={56} height="28" rx="2" fill="#f2e6b8" stroke="#b9b2a2" />
      <text x={cols[8].x + 38} y={yMain + 36} textAnchor="middle" fontSize="9" fontWeight="700">
        S1
      </text>

      <line x1="8" y1={yMain + mainH} x2={right} y2={yMain + mainH} stroke="#cfc8b8" />
    </svg>
  )
}

function HudSchematic() {
  return (
    <svg className="help-svg" viewBox="0 0 640 72" role="img" aria-label="Схема шапки игры">
      <rect width="640" height="72" rx="8" fill="#0b4a56" />
      <text x="14" y="28" fill="#2dbe64" fontSize="14" fontWeight="700">
        Kanban
      </text>
      <text x="14" y="48" fill="#9ec9c0" fontSize="9">
        ТехВилл
      </text>
      <rect x="100" y="16" width="52" height="40" rx="4" fill="#083841" />
      <text x="108" y="32" fill="#9ec9c0" fontSize="8">
        День
      </text>
      <text x="108" y="48" fill="#fff" fontSize="13" fontWeight="700">
        9
      </text>
      <rect x="158" y="16" width="64" height="40" rx="4" fill="#083841" />
      <text x="166" y="32" fill="#9ec9c0" fontSize="8">
        Касса
      </text>
      <text x="166" y="48" fill="#fff" fontSize="13" fontWeight="700">
        $0
      </text>
      <rect x="228" y="16" width="118" height="40" rx="4" fill="#083841" />
      <text x="236" y="32" fill="#9ec9c0" fontSize="8">
        Сотрудники
      </text>
      <circle cx="248" cy="48" r="5" fill="#c05454" />
      <circle cx="262" cy="48" r="5" fill="#4a74d6" />
      <circle cx="276" cy="48" r="5" fill="#3f9a45" />
      <rect x="356" y="20" width="26" height="28" rx="3" fill="#fff" />
      <text x="360" y="38" fill="#1a2224" fontSize="8" fontWeight="700">
        CFD
      </text>
      <rect x="386" y="20" width="22" height="28" rx="3" fill="#fff" />
      <text x="392" y="38" fill="#1a2224" fontSize="10" fontWeight="700">
        $
      </text>
      <rect x="412" y="20" width="22" height="28" rx="3" fill="#fff" />
      <text x="416" y="38" fill="#1a2224" fontSize="8" fontWeight="700">
        LT
      </text>
      <rect x="438" y="20" width="26" height="28" rx="3" fill="#fff" />
      <text x="442" y="38" fill="#1a2224" fontSize="9" fontWeight="700">
        −п
      </text>
      <rect x="472" y="18" width="78" height="32" rx="4" fill="#3f9a45" />
      <text x="480" y="38" fill="#fff" fontSize="9" fontWeight="700">
        Стендап
      </text>
      <rect x="556" y="16" width="40" height="40" rx="4" fill="#083841" />
      <text x="562" y="32" fill="#9ec9c0" fontSize="7">
        Шаг
      </text>
      <text x="560" y="46" fill="#fff" fontSize="8" fontWeight="700">
        Стендап
      </text>
      <rect x="602" y="20" width="28" height="28" rx="4" fill="#3a7fc4" />
      <text x="611" y="39" fill="#fff" fontSize="14" fontWeight="700">
        ?
      </text>
    </svg>
  )
}
