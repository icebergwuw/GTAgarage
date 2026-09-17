import type { StoredVehicle, Vehicle, VehicleClass } from '../types'

export type Achievement = {
  key: string
  title: string
  detail: string
}

export const classAchievements: Partial<Record<VehicleClass, string>> = {
  Super: '真空中的王',
  Sports: '弯道诗人',
  'Sports Classics': '时光车库',
  Muscle: '美式噪音',
  Sedans: '低调有钱',
  Coupes: '双门绅士',
  SUVs: '全地形面子',
  Motorcycles: '两轮亡命',
  'Off-Road': '泥里也要帅',
  'Open Wheel': '赛道执照',
  Planes: '空中车库',
  Helicopters: '垂直起飞',
  Compacts: '小车也是车',
  Vans: '人货两用',
  Military: '编制齐全',
}

export const catalogAchievement = '洛圣都没有漏网之鱼'

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

export function newUnlocks(prev: StoredVehicle[], next: StoredVehicle[], catalog: Vehicle[], order: VehicleClass[]): Achievement[] {
  const before = classProgress(prev, catalog, order)
  const after = classProgress(next, catalog, order)
  const items: Achievement[] = []
  for (const row of after) {
    const was = before.find((item) => item.class === row.class)
    if (row.total > 0 && row.collected === row.total && was && was.collected < was.total) {
      items.push({
        key: row.class,
        title: classAchievements[row.class] ?? row.class,
        detail: `${row.class} 收集完成 · ${row.collected}/${row.total}`,
      })
    }
  }
  const from = collectionProgress(prev, catalog)
  const to = collectionProgress(next, catalog)
  if (to.total > 0 && from.collected < from.total && to.collected === to.total) {
    items.push({
      key: 'catalog',
      title: catalogAchievement,
      detail: `图鉴收集完成 · ${to.collected}/${to.total}`,
    })
  }
  return items
}
