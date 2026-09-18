import { localVehicleImage, vehicleFallbackImage, vehicleImage } from '../types'

export function VehiclePhoto({ model, alt }: { model: string; alt: string }) {
  return (
    <img
      src={vehicleImage(model)}
      alt={alt}
      onError={(e) => {
        const el = e.currentTarget
        if (el.dataset.fallback === 'local') {
          el.dataset.fallback = 'done'
          el.src = vehicleFallbackImage()
          return
        }
        if (el.dataset.fallback === 'done') return
        el.dataset.fallback = 'local'
        el.src = localVehicleImage(model)
      }}
    />
  )
}
