import type { StoredVehicle, Vehicle, VehicleClass } from '../types'

export function collectedModels(fleet: StoredVehicle[]): Set<string> {
  return new Set(fleet.map((item) => item.model))
}

export function collectionProgress(fleet: StoredVehicle[], catalog: Vehicle[]) {
  const owned = collectedModels(fleet)
  let collected = 0
  for (const car of catalog) {
    if (owned.has(car.id)) collected += 1
  }
  return { collected, total: catalog.length }
}

export function classProgress(fleet: StoredVehicle[], catalog: Vehicle[], order: VehicleClass[]) {
  const owned = collectedModels(fleet)
  const rows = new Map<VehicleClass, { collected: number; total: number }>()
  for (const cls of order) rows.set(cls, { collected: 0, total: 0 })
  for (const car of catalog) {
    const row = rows.get(car.class) ?? { collected: 0, total: 0 }
    row.total += 1
    if (owned.has(car.id)) row.collected += 1
    rows.set(car.class, row)
  }
  return order
    .map((cls) => {
      const row = rows.get(cls) ?? { collected: 0, total: 0 }
      return { class: cls, collected: row.collected, total: row.total }
    })
    .filter((row) => row.total > 0)
}

export function copiesOf(fleet: StoredVehicle[], model: string) {
  return fleet.filter((item) => item.model === model)
}
