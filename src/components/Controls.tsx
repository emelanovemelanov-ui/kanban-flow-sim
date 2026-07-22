import type { FullState } from '../game/engine'
import type { WipLimits } from '../game/types'
import { WIP_LABEL } from '../game/labels'

interface ControlsProps {
  state: FullState
  onWip: (key: keyof WipLimits, delta: number) => void
}

export function Controls({ state, onWip }: ControlsProps) {
  return (
    <aside className="tray">
      <section className="tray-block">
        <h4>Регулировка WIP-лимитов</h4>
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
    </aside>
  )
}
