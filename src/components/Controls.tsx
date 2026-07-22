import type { FullState } from '../game/engine'
import type { WipLimits } from '../game/types'
import { STEP_LABEL, WIP_LABEL } from '../game/labels'

interface ControlsProps {
  state: FullState
  onClearDie: (dieId: string) => void
  onWip: (key: keyof WipLimits, delta: number) => void
}

export function Controls({ state, onClearDie, onWip }: ControlsProps) {
  const lastCfd = state.cfd[state.cfd.length - 1]

  return (
    <aside className="tray">
      <section className="tray-block">
        <h4>Шаг · {STEP_LABEL[state.step]}</h4>
        <p className="tray-note">
          Подп. {state.subscribers}
          {state.testPolicyStrict ? ' · строгий тест' : ''}
          {state.gameOver ? ' · ИГРА ОКОНЧЕНА' : ''}
        </p>
      </section>

      <section className="tray-block">
        <h4>WIP</h4>
        <div className="wip-inline">
          {(Object.keys(state.wip) as (keyof WipLimits)[]).map((key) => (
            <div key={key} className="wip-mini">
              <span>{WIP_LABEL[key]}</span>
              <button type="button" onClick={() => onWip(key, -1)}>
                −
              </button>
              <strong>{state.wip[key]}</strong>
              <button type="button" onClick={() => onWip(key, 1)}>
                +
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="tray-block">
        <h4>CFD (сейчас)</h4>
        {lastCfd ? (
          <div className="finance-inline">
            <span>Вып {lastCfd.deployed}</span>
            <span>Рел {lastCfd.ready}</span>
            <span>Тест {lastCfd.test}</span>
            <span>Разр {lastCfd.dev}</span>
            <span>Ан {lastCfd.analysis}</span>
            <span>Очер {lastCfd.selected}</span>
          </div>
        ) : (
          <p className="tray-note">Появятся после шага графиков</p>
        )}
      </section>

      {state.financeLog.length > 0 && (
        <section className="tray-block">
          <h4>Финансы</h4>
          <div className="finance-inline">
            {state.financeLog.map((f) => (
              <span key={f.day}>
                Д{f.day}: ${f.profitToDate}
                {f.fines ? ` (−${f.fines})` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      {state.eventLog.length > 0 && (
        <section className="tray-block">
          <h4>Журнал событий</h4>
          <div className="finance-inline">
            {state.eventLog.slice(-4).map((e) => (
              <span key={e}>{e}</span>
            ))}
          </div>
        </section>
      )}

      <section className="tray-block">
        <h4>Сотрудники на карточках</h4>
        <div className="finance-inline">
          {state.dice.map((d) => (
            <span key={d.id}>
              {d.id}
              {d.assignedTicketId ? `→${d.assignedTicketId}` : '·своб'}
              {d.assignedTicketId && (
                <>
                  {' '}
                  <button type="button" className="linkish" onClick={() => onClearDie(d.id)}>
                    снять
                  </button>
                </>
              )}
            </span>
          ))}
        </div>
      </section>
    </aside>
  )
}
