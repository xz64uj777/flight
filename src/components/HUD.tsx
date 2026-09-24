import type { Hud } from '../game/types'
import type { QualityKey } from '../game/config'
import type { FlightPrefs } from '../game/prefs'

export type TiltHeartbeat = 'off' | 'pending' | 'live' | 'no-signal'

type Props = {
  hud: Hud
  message: string
  crashed: boolean
  prefs: FlightPrefs
  calStatus: string | null
  /** Sticky no-signal copy — stays until live or Tilt OFF (no toast fade). */
  tiltSticky: string | null
  tiltHb: TiltHeartbeat
  showSettings: boolean
  onToggleSettings: () => void
  onCam: () => void
  onReset: () => void
  onHangar: () => void
  onQuality: (q: QualityKey) => void
  onHelp: () => void
  onSens: () => void
  onPitchMode: () => void
  onTilt: () => void
  onRecalibrate: () => void
  onPause: () => void
}

function tiltLabel(hb: TiltHeartbeat, on: boolean): string {
  if (!on) return 'Tilt · OFF'
  if (hb === 'live') return 'Tilt · live'
  if (hb === 'no-signal') return 'Tilt · no signal'
  return 'Tilt · …'
}

export function HUD({
  hud,
  message,
  crashed,
  prefs,
  calStatus,
  tiltSticky,
  tiltHb,
  showSettings,
  onToggleSettings,
  onCam,
  onReset,
  onHangar,
  onQuality,
  onHelp,
  onSens,
  onPitchMode,
  onTilt,
  onRecalibrate,
  onPause,
}: Props) {
  const banner = crashed ? 'Hard landing — Reset' : calStatus || tiltSticky || message
  return (
    <>
      <div className="hud">
        <div className="hud-panel">
          <div><strong>ALT</strong> {hud.alt.toFixed(1)} m</div>
          <div><strong>SPEED</strong> {hud.speed.toFixed(0)} kt</div>
          <div><strong>HDG</strong> {hud.hdg.toFixed(0).padStart(3, '0')}°</div>
          <div><strong>COLL</strong> {(hud.collective * 100).toFixed(0)}%</div>
        </div>
        <div className="hud-actions">
          <button type="button" onClick={onCam}>Cam · {hud.cam}</button>
          <button type="button" onClick={() => onQuality(cycleQ(hud.quality))}>
            Q · {hud.quality}
          </button>
          <button
            type="button"
            className={prefs.tiltCyclic ? 'active' : ''}
            onClick={onTilt}
            title="Toggle phone tilt → cyclic"
          >
            {tiltLabel(tiltHb, prefs.tiltCyclic)}
          </button>
          <button
            type="button"
            className={showSettings ? 'active' : ''}
            onClick={onToggleSettings}
          >
            Settings
          </button>
          <button type="button" onClick={onHelp}>Help</button>
          <button type="button" onClick={onPause}>Pause</button>
          <button type="button" onClick={onReset}>Reset</button>
          <button type="button" onClick={onHangar}>Hangar</button>
        </div>
      </div>
      {(banner) && (
        <div className={`msg${crashed ? ' warn' : ''}${tiltSticky && !calStatus && !crashed ? ' sticky' : ''}`}>
          {banner}
        </div>
      )}
      {showSettings && (
        <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
          <h3>Settings</h3>
          <div className="settings-row">
            <span>Sensitivity</span>
            <button type="button" onClick={onSens}>Sens · {prefs.sens}</button>
          </div>
          <div className="settings-row">
            <span>Pitch</span>
            <button type="button" onClick={onPitchMode}>
              {prefs.pitchMode === 'realistic' ? 'Realistic' : 'Casual'}
            </button>
          </div>
          <p className="settings-hint">
            Casual (default): screen-up / W → nose UP; stick-left → bank LEFT. Realistic: heli (nose down).
          </p>
          <div className="settings-row">
            <span>Tilt cyclic</span>
            <button
              type="button"
              className={prefs.tiltCyclic ? 'active' : ''}
              onClick={onTilt}
            >
              {tiltLabel(tiltHb, prefs.tiltCyclic)}
            </button>
          </div>
          {prefs.tiltCyclic && (
            <div className="settings-row">
              <span>Gyro zero</span>
              <button
                type="button"
                disabled={tiltHb !== 'live'}
                onClick={onRecalibrate}
              >
                Recalibrate
              </button>
            </div>
          )}
          <p className="settings-hint">
            Recalibrate only when <strong>Tilt · live</strong> (sustained motion). No signal stays sticky
            until live resumes or Tilt OFF.
          </p>
          {tiltSticky && <p className="settings-hint tilt-sticky-hint">{tiltSticky}</p>}
          <button type="button" className="settings-close" onClick={onToggleSettings}>
            Close
          </button>
        </div>
      )}
      {prefs.showHelp && (
        <div className="help-panel" onClick={onHelp}>
          <h3>How to fly</h3>
          <ul>
            <li><strong>Left stick (cyclic)</strong> — spring-centers. Casual (default): screen-up = nose UP. Left = left bank.</li>
            <li><strong>Yaw stick</strong> — spring-centers. Left = nose left.</li>
            <li><strong>Collective</strong> — absolute hold; release keeps last power (never snaps idle).</li>
            <li><strong>Tilt</strong> — optional phone gyro. Live needs sustained motion; no signal stays until fixed or OFF. Recalibrate only when live.</li>
            <li><strong>Sens</strong> Low/Med/High scales sticks + gyro (Settings).</li>
            <li><strong>Realistic</strong> — opt-in heli pitch (screen-up → nose down).</li>
            <li>Keys: W/S pitch · arrows roll · A/D yaw · R/F coll · C cam · H help · Esc pause</li>
          </ul>
          <p className="help-dismiss">Tap to close</p>
        </div>
      )}
    </>
  )
}

function cycleQ(q: QualityKey): QualityKey {
  if (q === 'low') return 'med'
  if (q === 'med') return 'high'
  return 'low'
}
