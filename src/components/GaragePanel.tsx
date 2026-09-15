import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Garage, StoredVehicle } from '../types'
import { formatCash, vehicleImage } from '../types'
import { complexName } from '../data/garages'
import { vehicleById, vehicles } from '../data/vehicles'
import { canBuy, canSell, slotGroupFor, tradeInRefund, usageForKind } from '../data/ownership'
import { canPlaceVehicle } from '../lib/storage'
import { GaragePicker } from './GaragePicker'

function VehiclePhoto({ model, alt }: { model: string; alt: string }) {
  return (
    <img
      src={vehicleImage(model)}
      alt={alt}
      onError={(e) => {
        const el = e.currentTarget
        if (el.dataset.fallback) return
        el.dataset.fallback = '1'
        el.src = '/car-fallback.svg'
      }}
    />
  )
}

interface TooltipProps {
  garage: Garage
  units?: Garage[]
  ownedIds?: string[]
  owned: boolean
  count: number
  value: number
  thumbs: string[]
  x: number
  y: number
}

export function GarageTooltip({ garage, units, ownedIds, owned, count, value, thumbs, x, y }: TooltipProps) {
  const many = (units?.length ?? 1) > 1
  const ownedUnitCount = units?.filter((item) => ownedIds?.includes(item.id)).length ?? (owned ? 1 : 0)
  const capacity = owned
    ? (units ?? [garage]).filter((item) => ownedIds?.includes(item.id) || (!ownedIds && item.id === garage.id)).reduce((sum, item) => sum + item.capacity, 0)
    : garage.capacity
  const width = 280
  const height = 196
  const vw = typeof window !== 'undefined' ? window.innerWidth : x
  const vh = typeof window !== 'undefined' ? window.innerHeight : y
  let left = x + 18
  let top = y + 16
  if (left + width > vw - 16) left = x - width - 12
  if (top + height > vh - 16) top = y - height - 12
  left = Math.max(16, Math.min(left, vw - width - 16))
  top = Math.max(110, Math.min(top, vh - height - 16))
  return (
    <div className="tooltip" style={{ left, top }}>
      <h3>{many ? complexName(garage) : garage.name}</h3>
      <div className="meta">
        {many ? `${units!.length} 套单位 · ${garage.district}` : `${garage.type} · ${garage.district}`}
      </div>
      {many && (
        <div className="row">
          <span>已拥有</span>
          <b>
            {ownedUnitCount}/{units!.length}
          </b>
        </div>
      )}
      <div className="row">
        <span>{owned ? '容量' : '车位'}</span>
        <b>
          {owned ? `${count}/${capacity || garage.capacity}` : many ? units!.reduce((sum, item) => sum + item.capacity, 0) : garage.capacity}
        </b>
      </div>
      {owned ? (
        <>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (count / garage.capacity) * 100)}%` }} />
          </div>
          <div className="row">
            <span>库存估值</span>
            <b>{formatCash(value)}</b>
          </div>
          <div className="thumbs">
            {thumbs.map((model, i) => (
              <VehiclePhoto key={`${model}-${i}`} model={model} alt="" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="bar">
            <i style={{ width: '0%' }} />
          </div>
          <div className="row">
            <span>售价</span>
            <b>
              {many
                ? `${formatCash(Math.min(...units!.map((item) => item.price)))} – ${formatCash(Math.max(...units!.map((item) => item.price)))}`
                : garage.price === 0
                  ? 'GTA+'
                  : formatCash(garage.price)}
            </b>
          </div>
        </>
      )}
    </div>
  )
}


interface BuildingProps {
  units: Garage[]
  fleet: StoredVehicle[]
  ownedIds: string[]
  onClose: () => void
  onOpen: (id: string) => void
}

export function BuildingPanel({ units, fleet, ownedIds, onClose, onOpen }: BuildingProps) {
  const lead = units[0]
  const ownedHere = units.filter((item) => ownedIds.includes(item.id))
  const cars = fleet.filter((item) => ownedHere.some((unit) => unit.id === item.garageId))
  const value = cars.reduce((sum, item) => sum + (vehicleById[item.model]?.price ?? 0), 0)
  const group = slotGroupFor(lead)
  const usage = lead ? usageForKind(ownedIds, lead.kind) : null

  return (
    <motion.aside
      className="panel"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <button className="close" onClick={onClose} aria-label="关闭">
        ×
      </button>
      <div className="panel-head">
        <div className="kicker">{lead.district}</div>
        <h2>{complexName(lead)}</h2>
        <p className="addr">{lead.address.split(',')[0]} · 每套独立车库，各占 1 个公寓名额</p>
        <p className="blurb">
          Dynasty 8 在这栋楼挂了 {units.length} 套单位。地图上只显示一个点，点进去再选房间，避免针叠在一起。
        </p>
        <div className="deal">
          <div className="row">
            <span>已拥有</span>
            <b>
              {ownedHere.length}/{units.length}
            </b>
          </div>
          <div className="row">
            <span>库存</span>
            <b>
              {cars.length}/{ownedHere.reduce((sum, item) => sum + item.capacity, 0) || 0} · {formatCash(value)}
            </b>
          </div>
          {group && usage && (
            <div className="row">
              <span>{group.label}</span>
              <b>
                {usage.used}/{usage.cap}
              </b>
            </div>
          )}
        </div>
      </div>
      <div className="unit-list">
        {units.map((unit) => {
          const mine = ownedIds.includes(unit.id)
          const here = fleet.filter((item) => item.garageId === unit.id)
          return (
            <button type="button" key={unit.id} className={mine ? 'is-owned' : ''} onClick={() => onOpen(unit.id)}>
              <span className="unit-name">
                <b>{unit.unit ?? unit.name}</b>
                <em>{unit.type}</em>
              </span>
              <span className="unit-meta">
                {mine ? `${here.length}/${unit.capacity}` : unit.price === 0 ? 'GTA+' : formatCash(unit.price)}
                <i>{mine ? '进入' : '查看'}</i>
              </span>
            </button>
          )
        })}
      </div>
    </motion.aside>
  )
}

interface PanelProps {
  garage: Garage
  fleet: StoredVehicle[]
  owned: boolean
  ownedIds: string[]
  floor: string
  onFloor: (id: string) => void
  selectedUid: string | null
  onSelectVehicle: (uid: string) => void
  onClose: () => void
  onAdd: () => void
  onBuy: (tradeInId?: string) => void
  onSell: () => void
  onBack?: () => void
}

export function GaragePanel({
  garage,
  fleet,
  owned,
  ownedIds,
  floor,
  onFloor,
  selectedUid,
  onSelectVehicle,
  onClose,
  onAdd,
  onBuy,
  onSell,
  onBack,
}: PanelProps) {
  const here = fleet.filter((v) => v.garageId === garage.id)
  const visible = here.filter((v) => v.floor === floor)
  const value = here.reduce((sum, v) => sum + (vehicleById[v.model]?.price ?? 0), 0)
  const currentFloor = garage.floors.find((f) => f.id === floor) ?? garage.floors[0]
  const garageFull = here.length >= garage.capacity
  const group = slotGroupFor(garage)
  const verdict = canBuy(ownedIds, garage.id)
  const trade = !verdict.ok && verdict.needsTradeIn ? verdict : null
  const sell = canSell(ownedIds, garage.id, fleet)
  const [tradeInId, setTradeInId] = useState('')

  return (
    <motion.aside
      className="panel"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <button className="close" onClick={onClose} aria-label="关闭">
        ×
      </button>
      <div className="panel-head">
        {onBack && (
          <button className="back" type="button" onClick={onBack}>
            ← {garage.building ?? '返回楼栋'}
          </button>
        )}
        <div className="kicker">{garage.unit ? garage.type : garage.type}</div>
        <h2>{garage.unit ?? garage.name}</h2>
        <p className="addr">
          {garage.building ? `${garage.building} · ${garage.district}` : `${garage.address} · ${garage.district}`}
        </p>
        <p className="blurb">{garage.blurb}</p>
        {owned ? (
          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {here.length}/{garage.capacity} · {formatCash(value)}
            </span>
            <button className="btn primary" onClick={onAdd} disabled={garageFull}>
              {garageFull ? '已满' : '入库'}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (!sell.ok) {
                  alert(sell.reason ?? '无法出售')
                  return
                }
                const refund = tradeInRefund(garage.price)
                if (confirm(`出售 ${garage.name}？将退还 ${formatCash(refund)}。`)) onSell()
              }}
              disabled={!sell.ok}
              title={sell.reason}
            >
              出售
            </button>
          </div>
        ) : (
          <div className="deal">
            <div className="row">
              <span>售价</span>
              <b>{garage.price === 0 ? 'GTA+' : formatCash(garage.price)}</b>
            </div>
            {group && (
              <div className="row">
                <span>{group.label}</span>
                <b>
                  {usageForKind(ownedIds, garage.kind).used}/{group.cap}
                </b>
              </div>
            )}
            {trade && (
              <label className="trade">
                <em>下架同类房产</em>
                <select value={tradeInId} onChange={(e) => setTradeInId(e.target.value)}>
                  <option value="">选择要置换的房产</option>
                  {trade.candidates.map((item) => {
                    const blocked = fleet.some((v) => v.garageId === item.id)
                    return (
                      <option key={item.id} value={item.id} disabled={blocked}>
                        {item.name}
                        {blocked ? ' · 仍有车辆' : ` · 退还 ${formatCash(tradeInRefund(item.price))}`}
                      </option>
                    )
                  })}
                </select>
              </label>
            )}
            <button
              className="btn primary"
              disabled={trade ? !tradeInId : !verdict.ok}
              onClick={() => onBuy(trade ? tradeInId : undefined)}
            >
              {garage.price === 0 ? '领取' : `购买 ${formatCash(garage.price)}`}
            </button>
            {!verdict.ok && <p className="deal-note">{verdict.reason}</p>}
          </div>
        )}
      </div>
      {owned && (
      <>
      <div className="floors">
        {garage.floors.map((f) => {
          const n = here.filter((v) => v.floor === f.id).length
          return (
            <button key={f.id} className={floor === f.id ? 'on' : ''} onClick={() => onFloor(f.id)}>
              {f.name} {n}/{f.capacity}
            </button>
          )
        })}
      </div>
      <div className="grid">
        {visible.map((stored) => {
          const car = vehicleById[stored.model]
          if (!car) {
            return (
              <div key={stored.uid} className="veh">
                <div className="veh-missing">未知车型</div>
                <b>{stored.model}</b>
                <span>数据缺失</span>
              </div>
            )
          }
          return (
            <button
              key={stored.uid}
              className={`veh ${selectedUid === stored.uid ? 'on' : ''}`}
              onClick={() => onSelectVehicle(stored.uid)}
            >
              <VehiclePhoto model={car.id} alt={car.name} />
              <b>
                {car.manufacturer} {car.name}
              </b>
              <span>
                {car.class}
                {stored.color ? ` · ${stored.color}` : ''}
              </span>
            </button>
          )
        })}
        {Array.from({ length: Math.max(0, (currentFloor?.capacity ?? 0) - visible.length) }).map(
          (_, i) => (
            <button key={`empty-${i}`} className="veh" onClick={onAdd}>
              <div style={{ height: 78, display: 'grid', placeItems: 'center', color: 'var(--dim)' }}>
                空车位
              </div>
              <b>添加车辆</b>
              <span>{currentFloor?.name}</span>
            </button>
          ),
        )}
      </div>
      </>
      )}
    </motion.aside>
  )
}

interface SheetProps {
  stored: StoredVehicle
  garages: Garage[]
  onClose: () => void
  onMove: (garageId: string, floor: string) => void
  onDelete: () => void
  onPatch: (patch: Partial<StoredVehicle>) => void
}

export function VehicleSheet({ stored, garages, onClose, onMove, onDelete, onPatch }: SheetProps) {
  const car = vehicleById[stored.model]
  if (!car) return null
  const garage = garages.find((g) => g.id === stored.garageId)

  return (
    <motion.div
      className="sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="close" onClick={onClose} aria-label="关闭">
        ×
      </button>
      <div className="hero">
        <motion.div key={car.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <VehiclePhoto model={car.id} alt={car.name} />
        </motion.div>
      </div>
      <div className="sheet-body">
        <div className="make">{car.manufacturer}</div>
        <h3>{car.name}</h3>
        <div className="specs">
          <div>
            <em>Class</em>
            {car.class}
          </div>
          <div>
            <em>Price</em>
            {formatCash(car.price)}
          </div>
          <div>
            <em>Top speed</em>
            {car.topSpeed} mph
          </div>
          <div>
            <em>Seats</em>
            {car.seats}
          </div>
          <div>
            <em>Source</em>
            {car.source}
          </div>
          <div>
            <em>Real counterpart</em>
            {car.realLife}
          </div>
        </div>
        <p>{car.description}</p>
        <p>
          <a href={car.wiki} target="_blank" rel="noreferrer">
            GTA Wiki →
          </a>
        </p>
        <div className="specs">
          <label>
            <em>Color</em>
            <input
              value={stored.color ?? ''}
              onChange={(e) => onPatch({ color: e.target.value })}
              style={{ width: '100%', background: '#0c0e12', border: '1px solid var(--line)', padding: 8 }}
            />
          </label>
          <label>
            <em>Plate</em>
            <input
              value={stored.plate ?? ''}
              onChange={(e) => onPatch({ plate: e.target.value })}
              style={{ width: '100%', background: '#0c0e12', border: '1px solid var(--line)', padding: 8 }}
            />
          </label>
        </div>
        <label>
          <em style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Notes
          </em>
          <input
            value={stored.notes ?? ''}
            onChange={(e) => onPatch({ notes: e.target.value })}
            style={{ width: '100%', background: '#0c0e12', border: '1px solid var(--line)', padding: 8, marginTop: 4 }}
          />
        </label>
        <div className="sheet-actions">
          <GaragePicker
            garages={garages}
            garageId={stored.garageId}
            floor={stored.floor}
            align="up"
            onChange={onMove}
          />
          <button className="btn danger" onClick={onDelete}>
            移出车库
          </button>
        </div>
        <p style={{ marginTop: 12, fontSize: 12 }}>
          当前：{garage?.name} · {garage?.floors.find((f) => f.id === stored.floor)?.name}
        </p>
      </div>
    </motion.div>
  )
}

interface AddProps {
  garages: Garage[]
  fleet: StoredVehicle[]
  garageId: string
  floor: string
  onClose: () => void
  onAdd: (model: string, garageId: string, floor: string) => void
}

export function AddVehicle({ garages, fleet, garageId, floor, onClose, onAdd }: AddProps) {
  const [q, setQ] = useState('')
  const [model, setModel] = useState<string | null>(null)
  const [gid, setGid] = useState(garageId)
  const [fid, setFid] = useState(floor)

  useEffect(() => {
    setGid(garageId)
    setFid(floor)
  }, [garageId, floor])

  const place = canPlaceVehicle(fleet, gid, fid)
  const list = vehicles.filter((v) => {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return `${v.manufacturer} ${v.name} ${v.class} ${v.realLife}`.toLowerCase().includes(s)
  })

  return (
    <div className="modal-bg" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <header>
          <h3>从目录入库</h3>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </header>
        <div style={{ padding: '10px 12px' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 Adder / Pegassi / Nissan..."
            style={{ width: '100%', background: '#0c0e12', border: '1px solid var(--line)', padding: 10 }}
          />
        </div>
        <div className="catalog">
          {list.map((car) => (
            <button
              key={car.id}
              className={model === car.id ? 'on' : ''}
              onClick={() => setModel(car.id)}
            >
              <VehiclePhoto model={car.id} alt={car.name} />
              <b>
                {car.manufacturer} {car.name}
              </b>
              <span>
                {car.class} · {formatCash(car.price)}
              </span>
            </button>
          ))}
        </div>
        <footer>
          <GaragePicker
            garages={garages}
            garageId={gid}
            floor={fid}
            align="up"
            onChange={(nextGarage, nextFloor) => {
              setGid(nextGarage)
              setFid(nextFloor)
            }}
          />
          <button
            className="btn primary"
            disabled={!model || !place.ok}
            onClick={() => model && place.ok && onAdd(model, gid, fid)}
          >
            {place.ok ? '放入车库' : place.reason}
          </button>
        </footer>
      </motion.div>
    </div>
  )
}
