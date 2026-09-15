import type { StoredVehicle } from '../types'
import { seedInventory } from '../data/inventory'
import { vehicleById } from '../data/vehicles'
import { garageById } from '../data/garages'

const KEY = 'gtagarage.fleet.v1'

export function loadFleet(): StoredVehicle[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(seedInventory)
    const parsed = JSON.parse(raw) as StoredVehicle[]
    if (!Array.isArray(parsed)) return structuredClone(seedInventory)
    return sanitizeFleet(parsed)
  } catch {
    return structuredClone(seedInventory)
  }
}

export function sanitizeFleet(list: StoredVehicle[]): StoredVehicle[] {
  const seen = new Set<string>()
  const out: StoredVehicle[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    if (typeof item.uid !== 'string' || !item.uid || seen.has(item.uid)) continue
    if (typeof item.model !== 'string' || !vehicleById[item.model]) continue
    const garage = garageById[item.garageId]
    if (!garage) continue
    const floor = garage.floors.some((f) => f.id === item.floor) ? item.floor : garage.floors[0].id
    seen.add(item.uid)
    out.push({
      uid: item.uid,
      model: item.model,
      garageId: item.garageId,
      floor,
      plate: typeof item.plate === 'string' ? item.plate : undefined,
      color: typeof item.color === 'string' ? item.color : undefined,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
    })
  }
  return out
}

export function canPlaceVehicle(
  fleet: StoredVehicle[],
  garageId: string,
  floor: string,
  exceptUid?: string,
): { ok: boolean; reason?: string } {
  const garage = garageById[garageId]
  if (!garage) return { ok: false, reason: '找不到车库' }
  const level = garage.floors.find((f) => f.id === floor)
  if (!level) return { ok: false, reason: '找不到楼层' }
  const others = fleet.filter((v) => v.uid !== exceptUid)
  const inGarage = others.filter((v) => v.garageId === garageId).length
  const onFloor = others.filter((v) => v.garageId === garageId && v.floor === floor).length
  if (onFloor >= level.capacity) return { ok: false, reason: `${level.name} 已满` }
  if (inGarage >= garage.capacity) return { ok: false, reason: '车库已满' }
  return { ok: true }
}

export function saveFleet(fleet: StoredVehicle[]) {
  localStorage.setItem(KEY, JSON.stringify(fleet))
}

export function resetFleet(): StoredVehicle[] {
  const next = structuredClone(seedInventory)
  saveFleet(next)
  return next
}

export function exportFleet(fleet: StoredVehicle[]) {
  const blob = new Blob([JSON.stringify(fleet, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'gta-garage-fleet.json'
  a.click()
  URL.revokeObjectURL(url)
}
