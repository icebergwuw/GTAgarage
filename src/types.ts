export type VehicleClass =
  | 'Super'
  | 'Sports'
  | 'Sports Classics'
  | 'Muscle'
  | 'Sedans'
  | 'Coupes'
  | 'SUVs'
  | 'Motorcycles'
  | 'Off-Road'
  | 'Open Wheel'
  | 'Planes'
  | 'Helicopters'
  | 'Military'
  | 'Compacts'
  | 'Vans'

export type GarageKind =
  | 'apartment'
  | 'garage'
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

export interface Vehicle {
  id: string
  manufacturer: string
  name: string
  class: VehicleClass
  price: number
  seats: number
  topSpeed: number
  realLife: string
  source: string
  description: string
  wiki: string
}

export interface GarageFloor {
  id: string
  name: string
  capacity: number
}

export interface Garage {
  id: string
  name: string
  type: string
  kind: GarageKind
  address: string
  district: string
  capacity: number
  price: number
  x: number
  y: number
  floors: GarageFloor[]
  blurb: string
}

export interface StoredVehicle {
  uid: string
  model: string
  garageId: string
  floor: string
  plate?: string
  color?: string
  notes?: string
}

export function vehicleImage(model: string) {
  return `https://docs.fivem.net/vehicles/${model}.webp`
}

export function formatCash(n: number) {
  return `$${n.toLocaleString('en-US')}`
}
