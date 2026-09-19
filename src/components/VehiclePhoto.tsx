import { hasLocalVehicleImage, localVehicleImage, vehicleFallbackImage, vehicleImage } from '../types'

export function VehiclePhoto({ model, alt }: { model: string; alt: string }) {
  return (
    <img
      src={vehicleImage(model)}
      alt={alt}
      onError={(e) => {
        const el = e.currentTarget
        const step = el.dataset.fallback ?? '0'
        if (step === '0') {
          el.dataset.fallback = '1'
          el.src = hasLocalVehicleImage(model) ? vehicleFallbackImage() : localVehicleImage(model)
          return
        }
        if (step === '1') {
          el.dataset.fallback = '2'
          el.src = vehicleFallbackImage()
        }
      }}
    />
  )
}
