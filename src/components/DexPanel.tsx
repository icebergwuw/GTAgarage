import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Garage, StoredVehicle, VehicleClass } from '../types'
import { formatCash } from '../types'
import { garageById } from '../data/garages'
import { classOrder, vehicleById, vehicles } from '../data/vehicles'
import { classProgress, collectedModels, collectionProgress, copiesOf } from '../lib/collection'
import { canPlaceVehicle } from '../lib/storage'
import { GaragePicker } from './GaragePicker'
import { VehiclePhoto } from './VehiclePhoto'

type StatusFilter = 'all' | 'collected' | 'missing'

interface Props {
  fleet: StoredVehicle[]
  ownedGarages: Garage[]
  selectedModel: string | null
  onSelectModel: (id: string | null) => void
  onClose: () => void
  onJump: (uid: string, garageId: string, floor: string) => void
  onAdd: (model: string, garageId: string, floor: string) => void
}

function emptyCopy(classFilter: VehicleClass | 'all', status: StatusFilter, query: string) {
  if (query.trim()) return '搜不到这个名字'
  if (status === 'missing') return classFilter === 'all' ? '目录已经收集齐了' : '这一类已经收集齐了'
  if (status === 'collected') return classFilter === 'all' ? '还没有收集任何车' : '这一类还没有收集'
  return '没有匹配的车型'
}

export function DexPanel({
  fleet,
  ownedGarages,
  selectedModel,
  onSelectModel,
  onClose,
  onJump,
  onAdd,
}: Props) {
  const [classFilter, setClassFilter] = useState<VehicleClass | 'all'>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [gid, setGid] = useState(ownedGarages[0]?.id ?? '')
  const [fid, setFid] = useState(ownedGarages[0]?.floors[0].id ?? '')
  const targetGarage = ownedGarages.find((item) => item.id === gid) ?? ownedGarages[0]
  const targetGarageId = targetGarage?.id ?? ''
  const targetFloor = targetGarage?.floors.some((item) => item.id === fid)
    ? fid
    : (targetGarage?.floors[0].id ?? '')

  const progress = collectionProgress(fleet, vehicles)
  const classes = classProgress(fleet, vehicles, classOrder)
  const owned = collectedModels(fleet)
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of fleet) map.set(item.model, (map.get(item.model) ?? 0) + 1)
    return map
  }, [fleet])
  const selected = selectedModel ? vehicleById[selectedModel] : null
  const copies = selectedModel ? copiesOf(fleet, selectedModel) : []
  const hasGarage = ownedGarages.length > 0
  const place = hasGarage ? canPlaceVehicle(fleet, targetGarageId, targetFloor) : { ok: false, reason: '先购买房产' }

  const list = useMemo(() => {
    const s = query.trim().toLowerCase()
    return vehicles.filter((car) => {
      if (classFilter !== 'all' && car.class !== classFilter) return false
      const collected = owned.has(car.id)
      if (status === 'collected' && !collected) return false
      if (status === 'missing' && collected) return false
      if (!s) return true
      return `${car.manufacturer} ${car.name} ${car.realLife} ${car.id} ${car.class}`.toLowerCase().includes(s)
    })
  }, [classFilter, status, query, owned])

  const sections = useMemo(
    () =>
      classes
        .filter((row) => classFilter === 'all' || row.class === classFilter)
        .map((row) => ({ ...row, cars: list.filter((car) => car.class === row.class) }))
        .filter((row) => row.cars.length > 0),
    [classes, list, classFilter],
  )

  return (
    <div
      className="dex-bg"
      onClick={() => {
        if (selectedModel) onSelectModel(null)
        else onClose()
      }}
    >
      <motion.section
        className="dex"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <header className="dex-head">
          <div>
            <div className="kicker">COLLECTION</div>
            <h3>
              图鉴 {progress.collected}/{progress.total}
              {progress.collected === progress.total && progress.total > 0 && <i className="dex-medal" aria-label="图鉴已完成" />}
            </h3>
          </div>
          <button className="close" onClick={onClose} aria-label="关闭图鉴">
            ×
          </button>
          <div className="dex-bar">
            <i style={{ width: `${progress.total ? Math.min(100, (progress.collected / progress.total) * 100) : 0}%` }} />
          </div>
        </header>

        <div className="dex-classes">
          <button className={`chip ${classFilter === 'all' ? 'on' : ''}`} onClick={() => setClassFilter('all')}>
            全部
            <em>
              {progress.collected}/{progress.total}
            </em>
            {progress.collected === progress.total && progress.total > 0 && <i className="dex-medal" aria-hidden />}
          </button>
          {classes.map((row) => (
            <button
              key={row.class}
              className={`chip ${classFilter === row.class ? 'on' : ''}`}
              onClick={() => setClassFilter(row.class)}
            >
              {row.class}
              <em>
                {row.collected}/{row.total}
              </em>
              {row.collected === row.total && <i className="dex-medal" aria-label={`${row.class}已完成`} />}
            </button>
          ))}
        </div>

        <div className="dex-tools">
          <div className="dex-status">
            {(
              [
                ['all', '全部'],
                ['collected', '已收集'],
                ['missing', '未收集'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={`chip ${status === id ? 'on' : ''}`} onClick={() => setStatus(id)}>
                {label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索车名 / 厂商 / 现实原型"
          />
        </div>

        <div className="dex-body">
          {sections.map((section) => (
            <section key={section.class} className="dex-section">
              <header className="dex-section-head">
                <h4>{section.class}</h4>
                <span>
                  {section.collected}/{section.total}
                </span>
                {section.collected === section.total && <i className="dex-medal" aria-label={`${section.class}已完成`} />}
              </header>
              <div className="dex-grid">
                {section.cars.map((car) => {
                  const count = counts.get(car.id) ?? 0
                  const collected = count > 0
                  return (
                    <button
                      key={car.id}
                      className={`${selectedModel === car.id ? 'on' : ''} ${collected ? '' : 'is-missing'}`}
                      onClick={() => onSelectModel(car.id)}
                    >
                      <VehiclePhoto model={car.id} alt={car.name} />
                      {collected ? count > 1 && <i className="dex-mark">×{count}</i> : <i className="dex-mark is-miss">未收集</i>}
                      <b>
                        {car.manufacturer} {car.name}
                      </b>
                      <span>
                        {car.class} · {formatCash(car.price)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          {list.length === 0 && <p className="dex-empty">{emptyCopy(classFilter, status, query)}</p>}
        </div>

        {selected && (
          <aside className="dex-sheet">
            <button className="close" onClick={() => onSelectModel(null)} aria-label="关闭车卡">
              ×
            </button>
            <div className="dex-hero">
              <VehiclePhoto model={selected.id} alt={selected.name} />
            </div>
            <div className="dex-sheet-body">
              <div className="make">{selected.manufacturer}</div>
              <h3>{selected.name}</h3>
              <div className="specs">
                <div>
                  <em>Class</em>
                  {selected.class}
                </div>
                <div>
                  <em>Price</em>
                  {formatCash(selected.price)}
                </div>
                <div>
                  <em>Top speed</em>
                  {selected.topSpeed} mph
                </div>
                <div>
                  <em>Seats</em>
                  {selected.seats}
                </div>
                <div>
                  <em>Source</em>
                  {selected.source}
                </div>
                <div>
                  <em>Real counterpart</em>
                  {selected.realLife}
                </div>
              </div>
              <p>{selected.description}</p>
              <p>
                <a href={selected.wiki} target="_blank" rel="noreferrer">
                  GTA Wiki →
                </a>
              </p>
              {copies.length > 0 && (
                <div className="dex-lots">
                  <em>停放位置 · {copies.length} 台</em>
                  {copies.map((item) => {
                    const garage = garageById[item.garageId]
                    const floor = garage?.floors.find((entry) => entry.id === item.floor)
                    return (
                      <button
                        key={item.uid}
                        type="button"
                        onClick={() => onJump(item.uid, item.garageId, item.floor)}
                      >
                        <b>{garage?.name ?? item.garageId}</b>
                        <span>
                          {floor?.name ?? item.floor}
                          {item.plate ? ` · ${item.plate}` : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <footer>
              {hasGarage ? (
                <GaragePicker
                  garages={ownedGarages}
                  fleet={fleet}
                  garageId={targetGarageId}
                  floor={targetFloor}
                  align="up"
                  onChange={(nextGarage, nextFloor) => {
                    setGid(nextGarage)
                    setFid(nextFloor)
                  }}
                />
              ) : (
                <p className="dex-need-garage">先购买房产才能入库</p>
              )}
              <button
                className="btn primary"
                disabled={!hasGarage || !place.ok}
                onClick={() => hasGarage && place.ok && onAdd(selected.id, targetGarageId, targetFloor)}
              >
                {hasGarage ? (place.ok ? '放入车库' : place.reason) : '先购买房产'}
              </button>
            </footer>
          </aside>
        )}
      </motion.section>
    </div>
  )
}
