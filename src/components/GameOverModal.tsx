import type { PlayerRun } from '../storage/resultsStore'

interface GameOverModalProps {
  playerName: string
  run: PlayerRun
  onLeaderboard: () => void
  onPlayAgain: () => void
  onChangePlayer: () => void
}

export function GameOverModal({
  playerName,
  run,
  onLeaderboard,
  onPlayAgain,
  onChangePlayer,
}: GameOverModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card gameover-card" role="dialog" aria-labelledby="go-title">
        <p className="modal-kicker">Партия завершена</p>
        <h2 id="go-title">{playerName}, итог записан</h2>
        <p>
          Прибыль <strong>${run.cash}</strong> · подписчики <strong>{run.subscribers}</strong> ·
          выпущено {run.deployedCount} · потери −${run.lostRevenue}
        </p>
        <p className="gameover-note">
          Сохранены данные CFD, финансов, lead time и потерь (−п). Их можно открыть в таблице лидеров.
        </p>
        <div className="modal-actions gameover-actions">
          <button type="button" className="btn-start" onClick={onLeaderboard}>
            Таблица лидеров
          </button>
          <button type="button" className="btn-chart" onClick={onPlayAgain}>
            Ещё раз
          </button>
          <button type="button" className="btn-exit" onClick={onChangePlayer}>
            Сменить игрока
          </button>
        </div>
      </div>
    </div>
  )
}
