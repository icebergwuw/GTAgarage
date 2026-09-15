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
  const [sellRequest, setSellRequest] = useState<string | null>(null)
  const [migrationTarget, setMigrationTarget] = useState('')
  const [sellConfirm, setSellConfirm] = useState(false)
  const [batchMoveUids, setBatchMoveUids] = useState<string[]>([])
  const [batchMoveTarget, setBatchMoveTarget] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

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
  const shopKind = kindFilter

  const visibleGarages = useMemo(() => {
    const base = shopMode ? garages : ownedGarages
    const kind = kindFilter
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
      setNotice(result.reason ?? '无法购买')
      return
    }
    setOwnedIds(result.owned)
    openGarage(garageId)
  }

  function handleSell(garageId: string) {
    const cars = fleet.filter((item) => item.garageId === garageId)
    if (cars.length > 0) {
      setSellRequest(garageId)
      setMigrationTarget('')
      setSellConfirm(true)
      return
    }
    const result = sellProperty(ownedIds, garageId, fleet)
    if (!result.ok) {
      setNotice(result.reason ?? '无法出售')
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

  function confirmSellWithMigration() {
    if (!sellRequest) return
    const cars = fleet.filter((item) => item.garageId === sellRequest)
    const counts = new Map<string, number>()
    for (const car of fleet) {
      if (car.garageId !== sellRequest) counts.set(car.garageId, (counts.get(car.garageId) ?? 0) + 1)
    }
    const target = migrationTarget ? garages.find((item) => item.id === migrationTarget) : null
    if (!target) return
    const next = (counts.get(target.id) ?? 0) + cars.length
    if (next > target.capacity) return
    counts.set(target.id, next)
    const floorCounts = new Map(target.floors.map((floor) => [floor.id, fleet.filter((car) => car.garageId === target.id && car.floor === floor.id).length]))
    const assignments = new Map<string, string>()
    for (const car of cars) {
      const floor = target.floors.find((item) => (floorCounts.get(item.id) ?? 0) < item.capacity)
      if (!floor) return
      assignments.set(car.uid, floor.id)
      floorCounts.set(floor.id, (floorCounts.get(floor.id) ?? 0) + 1)
    }
    setFleet((prev) => prev.map((car) => {
      if (car.garageId !== sellRequest || !migrationTarget) return car
      return { ...car, garageId: target.id, floor: assignments.get(car.uid) ?? car.floor }
    }))
    const result = sellProperty(ownedIds, sellRequest, [])
    if (result.ok) setOwnedIds(result.owned)
    setSellRequest(null)
    setMigrationTarget('')
    setSellConfirm(false)
    closeGarage()
  }

  function confirmBatchMove() {
    const target = garages.find((item) => item.id === batchMoveTarget)
    const selected = fleet.filter((item) => batchMoveUids.includes(item.uid))
    if (!target || !selected.length) return
    const counts = new Map(target.floors.map((floor) => [floor.id, fleet.filter((item) => item.garageId === target.id && item.floor === floor.id && !batchMoveUids.includes(item.uid)).length]))
    const assignments = new Map<string, string>()
    for (const car of selected) {
      const floor = target.floors.find((item) => (counts.get(item.id) ?? 0) < item.capacity)
      if (!floor) { setNotice(`目标车库空间不足：需要 ${selected.length} 个空位`); return }
      assignments.set(car.uid, floor.id)
      counts.set(floor.id, (counts.get(floor.id) ?? 0) + 1)
    }
    setFleet((prev) => prev.map((car) => assignments.has(car.uid) ? { ...car, garageId: target.id, floor: assignments.get(car.uid)! } : car))
    setBatchMoveUids([])
    setBatchMoveTarget('')
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
            setKindFilter(kind)
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
            onBatchMove={(uids) => { setBatchMoveUids(uids); setBatchMoveTarget('') }}
            onBatchDelete={(uids) => setFleet((prev) => prev.filter((car) => !uids.includes(car.uid)))}
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
                fleet={fleet}
                onClose={() => setVehicleUid(null)}
                onMove={(garageId, nextFloor) => {
                  const check = canPlaceVehicle(fleet, garageId, nextFloor, selectedVehicle.uid)
                  if (!check.ok) {
                    setNotice(check.reason ?? '无法移动')
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
              setNotice(check.reason ?? '无法入库')
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
      {sellRequest && sellConfirm && (
        <div className="modal-bg" onClick={() => setSellRequest(null)}>
          <section className="modal sell-migration" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setSellRequest(null)} aria-label="关闭">×</button>
            <div className="kicker">出售前迁移</div>
            <h2>先安置车库里的车辆</h2>
            <p className="blurb">该车库有 {fleet.filter((car) => car.garageId === sellRequest).length} 台车，将整体迁移到同一个目标车库。</p>
            <label className="migration-picker">目标车库
              <select value={migrationTarget} onChange={(event) => setMigrationTarget(event.target.value)}>
                <option value="">选择目标车库</option>
                {ownedGarages.filter((target) => target.id !== sellRequest).map((target) => <option key={target.id} value={target.id}>{target.name} · 剩余 {Math.max(0, target.capacity - fleet.filter((car) => car.garageId === target.id).length)}/{target.capacity}</option>)}
              </select>
            </label>
            <p className="migration-note">系统会按每层剩余容量自动分配，不会超过任何楼层上限。</p>
            <div className="migration-actions"><button className="btn ghost" onClick={() => setSellRequest(null)}>取消</button><button className="btn primary" disabled={!migrationTarget} onClick={() => {
              const cars = fleet.filter((car) => car.garageId === sellRequest)
              const target = garages.find((item) => item.id === migrationTarget)
              const occupied = fleet.filter((car) => car.garageId === migrationTarget).length
              if (!target || occupied + cars.length > target.capacity) {
                setNotice(`${target?.name ?? '目标车库'}空间不足：需要 ${cars.length} 个空位，目前只有 ${Math.max(0, (target?.capacity ?? 0) - occupied)} 个`)
                return
              }
              confirmSellWithMigration()
            }}>迁移并出售</button></div>
          </section>
        </div>
      )}
      {batchMoveUids.length > 0 && <div className="modal-bg"><section className="confirm-modal batch-move-modal"><div className="kicker">批量移动</div><h2>选择目标车库</h2><p>将移动 {batchMoveUids.length} 台车辆，系统会自动按楼层剩余容量分配。</p><label className="migration-picker">目标车库<select value={batchMoveTarget} onChange={(event) => setBatchMoveTarget(event.target.value)}><option value="">选择目标车库</option>{ownedGarages.map((garage) => <option key={garage.id} value={garage.id}>{garage.name} · 剩余 {Math.max(0, garage.capacity - fleet.filter((car) => car.garageId === garage.id && !batchMoveUids.includes(car.uid)).length)}/{garage.capacity}</option>)}</select></label>{batchMoveTarget && <p className="migration-note">{garages.find((garage) => garage.id === batchMoveTarget)?.floors.map((floor) => `${floor.name} ${fleet.filter((car) => car.garageId === batchMoveTarget && car.floor === floor.id && !batchMoveUids.includes(car.uid)).length}/${floor.capacity}`).join(' · ')}</p>}<div className="migration-actions"><button className="btn ghost" onClick={() => setBatchMoveUids([])}>取消</button><button className="btn primary" disabled={!batchMoveTarget} onClick={confirmBatchMove}>确认移动</button></div></section></div>}
      {notice && <div className="toast" role="status" onClick={() => setNotice(null)}>{notice}</div>}
    </div>
  )
}
