import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Garage, StoredVehicle } from '../types'
import { formatCash, vehicleImage } from '../types'
import { vehicleById, vehicles } from '../data/vehicles'
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
  count: number
  value: number
  thumbs: string[]
  x: number
  y: number
}

export function GarageTooltip({ garage, count, value, thumbs, x, y }: TooltipProps) {
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
      <h3>{garage.name}</h3>
      <div className="meta">
        {garage.type} · {garage.district}
      </div>
      <div className="row">
        <span>容量</span>
        <b>
          {count}/{garage.capacity}
        </b>
      </div>
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
    </div>
  )
}

interface PanelProps {
  garage: Garage
  fleet: StoredVehicle[]
  floor: string
  onFloor: (id: string) => void
  selectedUid: string | null
  onSelectVehicle: (uid: string) => void
  onClose: () => void
  onAdd: () => void
}

export function GaragePanel({
  garage,
  fleet,
  floor,
  onFloor,
  selectedUid,
  onSelectVehicle,
  onClose,
  onAdd,
}: PanelProps) {
  const here = fleet.filter((v) => v.garageId === garage.id)
  const visible = here.filter((v) => v.floor === floor)
  const value = here.reduce((sum, v) => sum + (vehicleById[v.model]?.price ?? 0), 0)
  const currentFloor = garage.floors.find((f) => f.id === floor) ?? garage.floors[0]
  const garageFull = here.length >= garage.capacity

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
        <div className="kicker">{garage.type}</div>
        <h2>{garage.name}</h2>
        <p className="addr">
          {garage.address} · {garage.district}
        </p>
        <p className="blurb">{garage.blurb}</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 18, alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
            {here.length}/{garage.capacity} · {formatCash(value)}
          </span>
          <button className="btn primary" onClick={onAdd} disabled={garageFull}>
            {garageFull ? '已满' : '入库'}
          </button>
        </div>
      </div>
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
