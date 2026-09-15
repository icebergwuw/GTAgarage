import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MapCanvas } from './components/MapCanvas'
import { Hud } from './components/Hud'
import { AddVehicle, BuildingPanel, GaragePanel, GarageTooltip, VehicleSheet } from './components/GaragePanel'
import { complexId, complexUnits, garages } from './data/garages'
import { buyProperty, sellProperty } from './data/ownership'
import type { GarageKind } from './types'
import { vehicleById } from './data/vehicles'
import { canPlaceVehicle, exportFleet, loadFleet, loadOwned, resetFleet, saveFleet, saveOwned } from './lib/storage'
import type { StoredVehicle } from './types'

const EMPTY_MATCH = new Set<string>()

function garageIdFromHash() {
  const hash = decodeURIComponent(window.location.hash.replace('#', ''))
  return garages.some((g) => g.id === hash) ? hash : null
}

export default function App() {
  const [fleet, setFleet] = useState<StoredVehicle[]>(() => loadFleet())
  const [ownedIds, setOwnedIds] = useState<string[]>(() => loadOwned(loadFleet()))
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<GarageKind | null>(() => {
    const hash = garageIdFromHash()
    if (!hash) return null
    const garage = garages.find((item) => item.id === hash)
    if (!garage) return null
    return loadOwned(loadFleet()).includes(hash) ? null : garage.kind
  })
  const [shopMode, setShopMode] = useState(() => {
    const hash = garageIdFromHash()
    if (!hash) return false
    return !loadOwned(loadFleet()).includes(hash)
  })
  const [selectedId, setSelectedId] = useState<string | null>(() => garageIdFromHash())
  const [siteId, setSiteId] = useState<string | null>(() => {
    const hash = garageIdFromHash()
    if (!hash) return null
    const garage = garages.find((item) => item.id === hash)
    return garage ? complexId(garage) : null
  })
  const [hovered, setHovered] = useState<{ id: string; x: number; y: number } | null>(null)
  const [floor, setFloor] = useState(() => {
    const g = garages.find((x) => x.id === garageIdFromHash())
    return g?.floors[0].id ?? 'b1'
  })
  const [vehicleUid, setVehicleUid] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds])
  const ownedGarages = useMemo(() => garages.filter((item) => ownedSet.has(item.id)), [ownedSet])

  useEffect(() => {
    saveFleet(fleet)
  }, [fleet])

  useEffect(() => {
    saveOwned(ownedIds)
  }, [ownedIds])

  const closeGarage = useCallback(() => {
    setSelectedId(null)
    setSiteId(null)
    setVehicleUid(null)
    setHovered(null)
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  const openGarage = useCallback((id: string) => {
    const g = garages.find((x) => x.id === id)
    setSelectedId(id)
    setSiteId(g ? complexId(g) : id)
    setFloor(g?.floors[0].id ?? 'g')
    setVehicleUid(null)
    setHovered(null)
    window.location.hash = id
  }, [])

  const openSite = useCallback((id: string) => {
    const units = complexUnits(id)
    setVehicleUid(null)
    setHovered(null)
    if (units.length <= 1) {
      openGarage(units[0]?.id ?? id)
      return
    }
    setSiteId(id)
    setSelectedId(null)
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [openGarage])

  const enterShop = useCallback(
    (kind?: GarageKind | null) => {
      setShopMode(true)
      setKindFilter(kind ?? kindFilter ?? 'apartment')
      setAdding(false)
      closeGarage()
    },
    [closeGarage, kindFilter],
  )

  const exitShop = useCallback(() => {
    setShopMode(false)
    closeGarage()
  }, [closeGarage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (adding) setAdding(false)
      else if (vehicleUid) setVehicleUid(null)
      else if (selectedId && siteId && complexUnits(siteId).length > 1) {
        setSelectedId(null)
        setVehicleUid(null)
        if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
      } else closeGarage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, vehicleUid, selectedId, siteId, closeGarage])

  const selectedGarage = garages.find((g) => g.id === selectedId) ?? null
  const selectedOwned = selectedId ? ownedSet.has(selectedId) : false
  const selectedVehicle = fleet.find((v) => v.uid === vehicleUid) ?? null
  const shopKind = shopMode ? (kindFilter ?? 'apartment') : kindFilter

  const visibleGarages = useMemo(() => {
    const base = shopMode ? garages : ownedGarages
    const kind = shopMode ? (kindFilter ?? 'apartment') : kindFilter
    const typed = kind ? base.filter((item) => item.kind === kind) : base
    const s = query.trim().toLowerCase()
    if (!s) return typed
    return typed.filter((garage) => {
      const nameHit = `${garage.name} ${garage.district} ${garage.type} ${garage.address} ${garage.kind} ${garage.building ?? ''} ${garage.unit ?? ''}`
        .toLowerCase()
        .includes(s)
      if (nameHit) return true
      return fleet.some((v) => {
        if (v.garageId !== garage.id) return false
        const car = vehicleById[v.model]
        if (!car) return false
        return `${car.manufacturer} ${car.name} ${car.realLife} ${v.plate ?? ''}`.toLowerCase().includes(s)
      })
    })
  }, [shopMode, ownedGarages, kindFilter, query, fleet])

  const value = fleet.reduce((sum, v) => sum + (vehicleById[v.model]?.price ?? 0), 0)
  const hoverUnits = hovered ? complexUnits(hovered.id) : []
  const hoverOwned = hoverUnits.filter((item) => ownedSet.has(item.id))
  const hoverCars = fleet.filter((v) => hoverOwned.some((item) => item.id === v.garageId))
  const selectedSiteId = siteId ?? (selectedGarage ? complexId(selectedGarage) : null)
  const selectedSiteUnits = selectedSiteId ? complexUnits(selectedSiteId) : []
  const addTarget = selectedOwned ? selectedId : ownedGarages[0]?.id

  useEffect(() => {
    const onHash = () => {
      const hash = garageIdFromHash()
      if (!hash) return
      const g = garages.find((x) => x.id === hash)
      if (!ownedSet.has(hash)) {
        setShopMode(true)
        setKindFilter(g?.kind ?? 'apartment')
      }
      setSelectedId(hash)
      setSiteId(g ? complexId(g) : hash)
      setFloor(g?.floors[0].id ?? 'g')
      setVehicleUid(null)
      setHovered(null)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [ownedSet])

  useEffect(() => {
    if (!selectedId) return
    const g = garages.find((x) => x.id === selectedId)
    if (!g) return
    setFloor((current) => (g.floors.some((f) => f.id === current) ? current : g.floors[0].id))
  }, [selectedId])

  useEffect(() => {
    const garage = selectedId ? garages.find((item) => item.id === selectedId) : null
    const id = siteId ?? (garage ? complexId(garage) : null)
    if (!id) return
    if (!visibleGarages.some((item) => complexId(item) === id)) closeGarage()
  }, [visibleGarages, selectedId, siteId, closeGarage])

  function patchFleet(uid: string, patch: Partial<StoredVehicle>) {
    setFleet((prev) => prev.map((v) => (v.uid === uid ? { ...v, ...patch } : v)))
  }

  function handleBuy(garageId: string, tradeInId?: string) {
    const result = buyProperty(ownedIds, garageId, fleet, tradeInId)
    if (!result.ok) {
      alert(result.reason ?? '无法购买')
      return
    }
    setOwnedIds(result.owned)
    openGarage(garageId)
  }

  function handleSell(garageId: string) {
    const result = sellProperty(ownedIds, garageId, fleet)
    if (!result.ok) {
      alert(result.reason ?? '无法出售')
      return
    }
    setOwnedIds(result.owned)
    const cid = selectedGarage ? complexId(selectedGarage) : siteId
    const remain = cid ? complexUnits(cid).filter((item) => result.owned.includes(item.id)) : []
    if (remain.length) {
      setSelectedId(null)
      setVehicleUid(null)
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
      return
    }
    closeGarage()
  }

  return (
    <div className="app">
      <MapCanvas
        garages={visibleGarages}
        fleet={fleet}
        ownedIds={ownedIds}
        selectedId={selectedSiteId}
        hoveredId={hovered?.id ?? null}
        matchIds={EMPTY_MATCH}
        focusToken={`${shopMode ? 'shop' : 'own'}:${shopKind ?? 'all'}`}
        onHover={(id, point) => {
          if (!id || !point) setHovered(null)
          else setHovered({ id, x: point.x, y: point.y })
        }}
        onSelect={openSite}
        onClear={closeGarage}
      />
      <Hud
        query={query}
        onQuery={setQuery}
        kindFilter={shopKind}
        onKind={(kind) => {
          if (shopMode) {
            if (kind) setKindFilter(kind)
            return
          }
          setKindFilter(kind)
        }}
        shopMode={shopMode}
        ownedIds={ownedIds}
        garageCount={ownedGarages.length}
        carCount={fleet.length}
        value={value}
        panelOpen={!!selectedGarage || !!siteId}
        onAdd={() => setAdding(true)}
        canAdd={ownedGarages.length > 0}
        onShop={() => (shopMode ? exitShop() : enterShop())}
        onReset={() => {
          if (confirm('恢复为示例车队？当前本地修改会丢掉。')) {
            const next = resetFleet()
            setFleet(next)
            setOwnedIds(loadOwned(next))
            setShopMode(false)
            closeGarage()
          }
        }}
        onExport={() => exportFleet(fleet)}
      />
      {hoverUnits.length > 0 && !selectedGarage && !siteId && (
        <GarageTooltip
          garage={hoverOwned[0] ?? hoverUnits[0]}
          units={hoverUnits}
          ownedIds={ownedIds}
          owned={hoverOwned.length > 0}
          count={hoverCars.length}
          value={hoverCars.reduce((sum, v) => sum + (vehicleById[v.model]?.price ?? 0), 0)}
          thumbs={hoverCars.slice(0, 4).map((v) => v.model)}
          x={hovered!.x}
          y={hovered!.y}
        />
      )}
      <AnimatePresence>
        {siteId && !selectedGarage && selectedSiteUnits.length > 1 && (
          <BuildingPanel
            key={siteId}
            units={selectedSiteUnits}
            fleet={fleet}
            ownedIds={ownedIds}
            onClose={closeGarage}
            onOpen={openGarage}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedGarage && (
          <GaragePanel
            key={selectedGarage.id}
            garage={selectedGarage}
            fleet={fleet}
            owned={selectedOwned}
            ownedIds={ownedIds}
            floor={floor}
            onFloor={setFloor}
            selectedUid={vehicleUid}
            onSelectVehicle={setVehicleUid}
            onClose={closeGarage}
            onAdd={() => setAdding(true)}
            onBuy={(tradeInId) => handleBuy(selectedGarage.id, tradeInId)}
            onSell={() => handleSell(selectedGarage.id)}
            onBack={selectedSiteUnits.length > 1 ? () => {
              setSelectedId(null)
              setVehicleUid(null)
              if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
            } : undefined}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedVehicle && selectedGarage && selectedOwned && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 720, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(520px, 100%)', pointerEvents: 'auto' }}>
              <VehicleSheet
                stored={selectedVehicle}
                garages={ownedGarages}
                onClose={() => setVehicleUid(null)}
                onMove={(garageId, nextFloor) => {
                  const check = canPlaceVehicle(fleet, garageId, nextFloor, selectedVehicle.uid)
                  if (!check.ok) {
                    alert(check.reason ?? '无法移动')
                    return
                  }
                  patchFleet(selectedVehicle.uid, { garageId, floor: nextFloor })
                  setSelectedId(garageId)
                  setFloor(nextFloor)
                  window.location.hash = garageId
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
      {adding && ownedGarages.length > 0 && (
        <AddVehicle
          garages={ownedGarages}
          fleet={fleet}
          garageId={addTarget ?? ownedGarages[0].id}
          floor={floor}
          onClose={() => setAdding(false)}
          onAdd={(model, garageId, nextFloor) => {
            const check = canPlaceVehicle(fleet, garageId, nextFloor)
            if (!check.ok) {
              alert(check.reason ?? '无法入库')
              return
            }
            const uid = `sv-${Date.now()}`
            setFleet((prev) => [...prev, { uid, model, garageId, floor: nextFloor }])
            setSelectedId(garageId)
            setFloor(nextFloor)
            setVehicleUid(uid)
            setAdding(false)
            setShopMode(false)
            window.location.hash = garageId
          }}
        />
      )}
    </div>
  )
}
