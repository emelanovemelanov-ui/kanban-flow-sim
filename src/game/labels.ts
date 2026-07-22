import type { ColumnId, DayStep, Specialty, TicketClass, ValueBand, WipLimits } from './types'

export const COLUMN_TITLE: Record<ColumnId, string> = {
  options: 'Бэклог',
  selected: 'К работе',
  analysisDoing: 'В работе',
  analysisDone: 'Готово',
  devDoing: 'В работе',
  devDone: 'Готово',
  test: 'Тест',
  ready: 'К релизу',
  deployed: 'Выпущено',
}

export const WIP_LABEL: Record<keyof WipLimits, string> = {
  selected: 'К работе',
  analysis: 'Анализ',
  development: 'Разработка',
  test: 'Тест',
  expedite: 'Срочное',
}

export const STEP_LABEL: Record<DayStep, string> = {
  standup: 'Стендап',
  work: 'Работа',
  deploy: 'Релиз',
  charts: 'Графики',
  finance: 'Финансы',
  event: 'Событие',
}

export const SPECIALTY_LABEL: Record<Specialty, string> = {
  analysis: 'анализ',
  development: 'разработка',
  test: 'тест',
}

export const SPECIALTY_SHORT: Record<Specialty, string> = {
  analysis: 'ан',
  development: 'рз',
  test: 'тс',
}

export const CLASS_LABEL: Record<TicketClass, string> = {
  standard: 'Обычная история',
  fixed: 'Фикс. срок',
  expedite: 'Срочное',
  intangible: 'Нематериальное',
}

export const VALUE_LABEL: Record<ValueBand, string> = {
  high: 'выс',
  med: 'сред',
  low: 'низ',
}
