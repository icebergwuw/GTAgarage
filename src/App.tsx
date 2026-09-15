import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MapCanvas } from './components/MapCanvas'
import { Hud } from './components/Hud'
import { AddVehicle, GaragePanel, GarageTooltip, VehicleSheet } from './components/GaragePanel'
import { garages } from './data/garages'
import { vehicleById } from './data/vehicles'
import { exportFleet, loadFleet, resetFleet, saveFleet } from './lib/storage'
import { vehicleImage } from './types'
import type { StoredVehicle } from './types'

export default function App() {
  const [fleet, setFleet] = useState<StoredVehicle[]>(() => loadFleet())
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<{ id: string; x: number; y: number } | null>(null)
  const [floor, setFloor] = useState('b1')
  const [vehicleUid, setVehicleUid] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    saveFleet(fleet)
  }, [fleet])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (adding) setAdding(false)
        else if (vehicleUid) setVehicleUid(null)
        else setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, vehicleUid])

  const selectedGarage = garages.find((g) => g.id === selectedId) ?? null
  const selectedVehicle = fleet.find((v) => v.uid === vehicleUid) ?? null

  const matchIds = useMemo(() => {
    const s = query.trim().toLowerCase()
    const ids = new Set<string>()
    if (!s && !classFilter) return ids
    for (const garage of garages) {
      const nameHit = s && `${garage.name} ${garage.district} ${garage.type}`.toLowerCase().includes(s)
      const cars = fleet.filter((v) => v.garageId === garage.id)
      const carHit = cars.some((v) => {
        const car = vehicleById[v.model]
        if (!car) return false
        if (classFilter && car.class !== classFilter) return false
        if (!s) return true
        return `${car.manufacturer} ${car.name} ${car.realLife} ${v.plate ?? ''}`.toLowerCase().includes(s)
      })
      if (nameHit || carHit) ids.add(garage.id)
    }
    return ids
  }, [query, classFilter, fleet])

  const value = fleet.reduce((sum, v) => sum + (vehicleById[v.model]?.price ?? 0), 0)
  const hoverGarage = hovered ? garages.find((g) => g.id === hovered.id) : null
  const hoverCars = hovered ? fleet.filter((v) => v.garageId === hovered.id) : []

  function openGarage(id: string) {
    const g = garages.find((x) => x.id === id)
    setSelectedId(id)
    setFloor(g?.floors[0].id ?? 'g')
    setVehicleUid(null)
    setHovered(null)
    window.location.hash = id
  }

  function closeGarage() {
    setSelectedId(null)
    setVehicleUid(null)
    setHovered(null)
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  useEffect(() => {
    const apply = () => {
      const hash = decodeURIComponent(window.location.hash.replace('#', ''))
      if (hash && garages.some((g) => g.id === hash)) {
        const g = garages.find((x) => x.id === hash)!
        setSelectedId(g.id)
        setFloor(g.floors[0].id)
      }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  function patchFleet(uid: string, patch: Partial<StoredVehicle>) {
    setFleet((prev) => prev.map((v) => (v.uid === uid ? { ...v, ...patch } : v)))
  }

  return (
    <div className="app">
      <MapCanvas
        garages={garages}
        fleet={fleet}
        selectedId={selectedId}
        hoveredId={hovered?.id ?? null}
        matchIds={matchIds}
        onHover={(id, point) => {
          if (!id || !point) setHovered(null)
          else setHovered({ id, x: point.x, y: point.y })
        }}
        onSelect={openGarage}
        onClear={closeGarage}
      />
      <Hud
        query={query}
        onQuery={setQuery}
        classFilter={classFilter}
        onClass={setClassFilter}
        garageCount={garages.length}
        carCount={fleet.length}
        value={value}
        onAdd={() => setAdding(true)}
        onReset={() => {
          if (confirm('恢复为示例车队？当前本地修改会丢掉。')) {
            setFleet(resetFleet())
            setSelectedId(null)
            setVehicleUid(null)
          }
        }}
        onExport={() => exportFleet(fleet)}
      />
      {hoverGarage && !selectedGarage && (
        <GarageTooltip
          garage={hoverGarage}
          count={hoverCars.length}
          value={hoverCars.reduce((sum, v) => sum + (vehicleById[v.model]?.price ?? 0), 0)}
          thumbs={hoverCars.slice(0, 4).map((v) => vehicleImage(v.model))}
          x={hovered!.x}
          y={hovered!.y}
        />
      )}
      <AnimatePresence>
        {selectedGarage && (
          <GaragePanel
            key={selectedGarage.id}
            garage={selectedGarage}
            fleet={fleet}
            floor={floor}
            onFloor={setFloor}
            selectedUid={vehicleUid}
            onSelectVehicle={setVehicleUid}
            onClose={closeGarage}
            onAdd={() => setAdding(true)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedVehicle && selectedGarage && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 720, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(520px, 100%)', pointerEvents: 'auto' }}>
              <VehicleSheet
                stored={selectedVehicle}
                garages={garages}
                onClose={() => setVehicleUid(null)}
                onMove={(garageId, nextFloor) => {
                  patchFleet(selectedVehicle.uid, { garageId, floor: nextFloor })
                  setSelectedId(garageId)
                  setFloor(nextFloor)
                }}
                onDelete={() => {
                  setFleet((prev) => prev.filter((v) => v.uid !== selectedVehicle.uid))
                  setVehicleUid(null)
                }}
                onPatch={(patch) => patchFleet(selectedVehicle.uid, patch)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
      {adding && (
        <AddVehicle
          garages={garages}
          garageId={selectedId ?? garages[0].id}
          floor={floor}
          onClose={() => setAdding(false)}
          onAdd={(model, garageId, nextFloor) => {
            const uid = `sv-${Date.now()}`
            setFleet((prev) => [...prev, { uid, model, garageId, floor: nextFloor }])
            setSelectedId(garageId)
            setFloor(nextFloor)
            setVehicleUid(uid)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}
