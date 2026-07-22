# Kanban Flow Sim

Учебный браузерный прототип канбан-симуляции доставки ПО (механики в духе [getKanban](https://getkanban.com/)). **Не для коммерческого использования.** UI: **Kanban / ТехВилл**.

## Стек

- Vite + React 19 + TypeScript
- Локальный движок на `useReducer` (без бэкенда)

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте URL из терминала (обычно `http://localhost:5173`).

В Cursor: откройте папку репозитория как workspace — подтянется правило агента из `.cursor/rules/`.

## Автотест (бот)

Полный проход дней 9→21:

```bash
npm run playthrough
npm run playthrough -- --suite
npm run playthrough -- --wip=tight
```

Пресеты WIP: `default`, `tight` (3/1/1/1/1), `balanced` (4/2/3/2/1), `wide` (6/4/6/4/2).

## Объём прототипа

- Доска: Options → Selected → Analysis → Development → Test → Ready → Deployed + срочная дорожка
- WIP-лимиты, кубики по специальностям, цикл дня и биллинг
- Графики: CFD, финансы, lead time (кнопки в шапке)

## Разработка с другого компьютера

1. Клонируйте репозиторий.
2. `npm install` → `npm run dev`.
3. Откройте проект в Cursor — контекст агента уже в `.cursor/rules/kanban-flow-sim.mdc`.
