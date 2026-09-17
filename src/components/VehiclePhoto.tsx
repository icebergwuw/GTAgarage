import { vehicleImage } from '../types'

export function VehiclePhoto({ model, alt }: { model: string; alt: string }) {
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
