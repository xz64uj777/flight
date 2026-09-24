import { useState } from 'react'
import type { QualityKey } from './game/config'
import { FlightView } from './components/FlightView'
import { Hangar } from './components/Hangar'

export default function App() {
  const [phase, setPhase] = useState<'hangar' | 'flight'>('hangar')
  const [quality, setQuality] = useState<QualityKey>('med')

  if (phase === 'hangar') {
    return (
      <div className="app">
        <Hangar
          quality={quality}
          onQuality={setQuality}
          onFly={() => setPhase('flight')}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <FlightView
        quality={quality}
        onQualityChange={setQuality}
        onHangar={() => setPhase('hangar')}
      />
    </div>
  )
}
