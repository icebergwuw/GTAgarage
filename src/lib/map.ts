import L from 'leaflet'

const centerX = 65.55
const centerY = 117.31
const scaleX = 0.01687
const scaleY = 0.01382

export const gtaCrs = L.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,
  scale(zoom: number) {
    return Math.pow(2, zoom)
  },
  zoom(sc: number) {
    return Math.log(sc) / Math.LN2
  },
  distance(a: L.LatLng, b: L.LatLng) {
    const dx = b.lng - a.lng
    const dy = b.lat - a.lat
    return Math.sqrt(dx * dx + dy * dy)
  },
  transformation: new L.Transformation(scaleX, centerX, -scaleY, centerY),
  infinite: true,
})

export function gameToLatLng(x: number, y: number): L.LatLngExpression {
  return [y, x]
}

export const TILE_URL = 'https://s.rsg.sc/sc/images/games/GTAV/map/render/{z}/{x}/{y}.jpg'
export const ERROR_TILE = '/ocean.jpg'

export const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [-4000, -5500],
  [8000, 6000],
]
