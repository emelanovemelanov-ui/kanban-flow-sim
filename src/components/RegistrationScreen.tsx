import { useState, type FormEvent } from 'react'

interface RegistrationScreenProps {
  onStart: (playerName: string) => void
  onOpenLeaderboard: () => void
}

export function RegistrationScreen({ onStart, onOpenLeaderboard }: RegistrationScreenProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Введите имя не короче 2 символов')
      return
    }
    if (trimmed.length > 40) {
      setError('Имя слишком длинное (макс. 40 символов)')
      return
    }
    setError('')
    onStart(trimmed)
  }

  return (
    <div className="reg-screen">
      <div className="reg-card">
        <p className="modal-kicker">Kanban · ТехВилл</p>
        <h1>Регистрация игрока</h1>
        <p className="reg-lead">
          Укажите имя, чтобы начать партию. После финала результаты графиков сохранятся за вами, а
          прибыль попадёт в таблицу лидеров.
        </p>
        <form className="reg-form" onSubmit={submit}>
          <label htmlFor="player-name">Имя или ник</label>
          <input
            id="player-name"
            type="text"
            autoComplete="nickname"
            autoFocus
            maxLength={40}
            value={name}
            placeholder="Например, Анна"
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
          />
          {error && <p className="reg-error">{error}</p>}
          <button type="submit" className="btn-start reg-submit">
            Начать игру
          </button>
        </form>
        <button type="button" className="btn-chart reg-lb-btn" onClick={onOpenLeaderboard}>
          Таблица лидеров
        </button>
      </div>
    </div>
  )
}
