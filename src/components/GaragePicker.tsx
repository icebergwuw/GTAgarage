import { useEffect, useMemo, useRef, useState } from 'react'
import type { Garage } from '../types'
import { kindFilters, kindLabel } from '../data/garages'

interface Props {
  garages: Garage[]
  garageId: string
  floor: string
  onChange: (garageId: string, floor: string) => void
  align?: 'up' | 'down'
}

export function GaragePicker({ garages, garageId, floor, onChange, align = 'up' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const garage = garages.find((item) => item.id === garageId)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    return kindFilters
      .filter((item): item is { id: NonNullable<typeof item.id>; label: string } => item.id !== null)
      .map((kind) => ({
        id: kind.id,
        label: kind.label,
        items: garages.filter((item) => {
          if (item.kind !== kind.id) return false
          if (!s) return true
          return `${item.name} ${item.district} ${item.address} ${item.type} ${kindLabel[item.kind]}`
            .toLowerCase()
            .includes(s)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [garages, q])

  function pickGarage(next: Garage) {
    const nextFloor = next.floors.some((item) => item.id === floor) ? floor : next.floors[0].id
    onChange(next.id, nextFloor)
    setOpen(false)
    setQ('')
  }

  return (
    <div className={`picker ${align === 'down' ? 'is-down' : ''}`} ref={rootRef}>
      <button type="button" className="picker-toggle" onClick={() => setOpen((v) => !v)}>
        <b>{garage?.name ?? '选择车库'}</b>
        <span>
          {garage ? kindLabel[garage.kind] : ''}
          {garage ? ` · ${garage.floors.find((item) => item.id === floor)?.name ?? garage.floors[0].name}` : ''}
        </span>
      </button>
      {open && (
        <div className="picker-menu">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索房产 / 街区 / 类型"
          />
          <div className="picker-list">
            {groups.map((group) => (
              <section key={group.id}>
                <em>{group.label}</em>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.id === garageId ? 'on' : ''}
                    onClick={() => pickGarage(item)}
                  >
                    <b>{item.name}</b>
                    <span>
                      {item.district} · {item.capacity} 车位
                    </span>
                  </button>
                ))}
              </section>
            ))}
            {groups.length === 0 && <p className="picker-empty">没有匹配的房产</p>}
          </div>
        </div>
      )}
      <select
        value={floor}
        onChange={(e) => onChange(garageId, e.target.value)}
        aria-label="楼层"
      >
        {garage?.floors.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  )
}
