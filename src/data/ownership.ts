import type { Garage, GarageKind, StoredVehicle } from '../types'
import { garageById, garages } from './garages'

export const seedOwnedIds = [
  'eclipse-blvd',
  'vinewood-club',
  'maze-west',
  'west-vinewood-nc',
  'eclipse-towers',
  'la-mesa-auto',
  'hawick-agency',
  'arena',
  'lsia-hangar',
  'la-mesa-mc',
  'casino',
  'tinsel',
] as const

export type SlotGroupId =
  | 'residence'
  | 'office'
  | 'nightclub'
  | 'agency'
  | 'autoshop'
  | 'clubhouse'
  | 'hangar'
  | 'arcade'
  | 'mansion'
  | 'bail'
  | 'special'

export interface SlotGroup {
  id: SlotGroupId
  label: string
  cap: number
  kinds: GarageKind[]
}

export const slotGroups: SlotGroup[] = [
  { id: 'residence', label: '公寓/车库', cap: 10, kinds: ['apartment', 'garage'] },
  { id: 'office', label: '办公室', cap: 1, kinds: ['office'] },
  { id: 'nightclub', label: '夜总会', cap: 1, kinds: ['nightclub'] },
  { id: 'agency', label: '事务所', cap: 1, kinds: ['agency'] },
  { id: 'autoshop', label: '改装店', cap: 1, kinds: ['autoshop'] },
  { id: 'clubhouse', label: '会所', cap: 1, kinds: ['clubhouse'] },
  { id: 'hangar', label: '机库', cap: 1, kinds: ['hangar'] },
  { id: 'arcade', label: '街机厅', cap: 1, kinds: ['arcade'] },
  { id: 'mansion', label: '豪宅', cap: 3, kinds: ['mansion'] },
  { id: 'bail', label: '保释所', cap: 1, kinds: ['bail'] },
  { id: 'special', label: '特殊', cap: 5, kinds: ['special'] },
]

export const slotGroupByKind = Object.fromEntries(
  slotGroups.flatMap((group) => group.kinds.map((kind) => [kind, group])),
) as Record<GarageKind, SlotGroup>

export type BuyVerdict =
  | { ok: true }
  | { ok: false; reason: string; needsTradeIn?: false }
  | { ok: false; reason: string; needsTradeIn: true; candidates: Garage[] }

export function slotGroupFor(garage: Garage | string): SlotGroup | null {
  const item = typeof garage === 'string' ? garageById[garage] : garage
  return item ? slotGroupByKind[item.kind] : null
}

export function ownedInGroup(ownedIds: string[], group: SlotGroup): Garage[] {
  const owned = new Set(ownedIds)
  return garages.filter((item) => owned.has(item.id) && group.kinds.includes(item.kind))
}

export function usageForKind(ownedIds: string[], kind: GarageKind) {
  const group = slotGroupByKind[kind]
  return { used: ownedInGroup(ownedIds, group).length, cap: group.cap, group }
}

export function tradeInRefund(price: number) {
  return Math.round(price * 0.5)
}

export function canBuy(ownedIds: string[], garageId: string): BuyVerdict {
  const garage = garageById[garageId]
  if (!garage) return { ok: false, reason: '找不到房产' }
  if (ownedIds.includes(garageId)) return { ok: false, reason: '已拥有这处房产' }
  const group = slotGroupFor(garage)
  if (!group) return { ok: false, reason: '未知房产类型' }
  const current = ownedInGroup(ownedIds, group)
  if (current.length < group.cap) return { ok: true }
  return {
    ok: false,
    reason: `${group.label}已达上限 ${group.cap} 处，需先下架一处`,
    needsTradeIn: true,
    candidates: current,
  }
}

export function canSell(
  ownedIds: string[],
  garageId: string,
  fleet: StoredVehicle[],
): { ok: boolean; reason?: string } {
  if (!ownedIds.includes(garageId)) return { ok: false, reason: '未拥有这处房产' }
  const cars = fleet.filter((item) => item.garageId === garageId).length
  if (cars > 0) return { ok: false, reason: `里面还有 ${cars} 台车` }
  return { ok: true }
}

export function buyProperty(
  ownedIds: string[],
  garageId: string,
  fleet: StoredVehicle[],
  tradeInId?: string,
): { ok: boolean; owned: string[]; reason?: string } {
  const verdict = canBuy(ownedIds, garageId)
  if (verdict.ok) return { ok: true, owned: [...ownedIds, garageId] }
  if (!verdict.needsTradeIn) return { ok: false, owned: ownedIds, reason: verdict.reason }
  if (!tradeInId) return { ok: false, owned: ownedIds, reason: verdict.reason }
  if (!verdict.candidates.some((item) => item.id === tradeInId)) {
    return { ok: false, owned: ownedIds, reason: '只能下架同类房产' }
  }
  const sell = canSell(ownedIds, tradeInId, fleet)
  if (!sell.ok) return { ok: false, owned: ownedIds, reason: sell.reason }
  return {
    ok: true,
    owned: ownedIds.filter((id) => id !== tradeInId).concat(garageId),
  }
}

export function sellProperty(
  ownedIds: string[],
  garageId: string,
  fleet: StoredVehicle[],
): { ok: boolean; owned: string[]; reason?: string } {
  const sell = canSell(ownedIds, garageId, fleet)
  if (!sell.ok) return { ok: false, owned: ownedIds, reason: sell.reason }
  return { ok: true, owned: ownedIds.filter((id) => id !== garageId) }
}
