import type { StoredVehicle } from '../types'
import { seedInventory } from '../data/inventory'

const KEY = 'gtagarage.fleet.v1'

export function loadFleet(): StoredVehicle[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(seedInventory)
    const parsed = JSON.parse(raw) as StoredVehicle[]
    if (!Array.isArray(parsed)) return structuredClone(seedInventory)
    return parsed
  } catch {
    return structuredClone(seedInventory)
  }
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
