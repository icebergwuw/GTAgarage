import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Garage, StoredVehicle } from '../types'
import { vehicleImage } from '../lib/lookups'
import { gtaCrs, gameToLatLng, TILE_URL, ERROR_TILE, MAP_BOUNDS } from '../lib/map'

interface Props {
  garages: Garage[]
  fleet: StoredVehicle[]
  selectedId: string | null
  hoveredId: string | null
  matchIds: Set<string>
  onHover: (id: string | null, point?: { x: number; y: number }) => void
  onSelect: (id: string) => void
  onClear: () => void
}

export function MapCanvas({
  garages,
  fleet,
  selectedId,
  hoveredId,
  matchIds,
  onHover,
  onSelect,
  onClear,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const fittedRef = useRef(false)
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  const onClearRef = useRef(onClear)
  onHoverRef.current = onHover
  onSelectRef.current = onSelect
  onClearRef.current = onClear

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return
    const map = L.map(rootRef.current, {
      crs: gtaCrs,
      minZoom: 1,
      maxZoom: 5,
      zoom: 3,
      center: [-400, 0],
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: true,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    })
    L.tileLayer(TILE_URL, {
      minZoom: 0,
      maxZoom: 5,
      maxNativeZoom: 4,
      noWrap: true,
      errorTileUrl: ERROR_TILE,
    }).addTo(map)
    map.on('click', () => onClearRef.current())
    mapRef.current = map
    requestAnimationFrame(() => map.invalidateSize())
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    Object.values(markersRef.current).forEach((m) => m.remove())
    markersRef.current = {}

    for (const garage of garages) {
      const stored = fleet.filter((v) => v.garageId === garage.id)
      const fill = stored.length / garage.capacity
      const icon = L.divIcon({
        className: 'gta-blip',
        html: blipHtml(fill, false, false, false),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker(gameToLatLng(garage.x, garage.y), { icon, keyboard: false })
      marker.addTo(map)
      marker.on('mouseover', () => {
        const p = map.latLngToContainerPoint(L.latLng(gameToLatLng(garage.x, garage.y)))
        onHoverRef.current(garage.id, { x: p.x, y: p.y })
      })
      marker.on('mouseout', () => onHoverRef.current(null))
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectRef.current(garage.id)
      })
      markersRef.current[garage.id] = marker
    }

    window.setTimeout(() => {
      if (fittedRef.current || !mapRef.current) return
      map.invalidateSize()
      const bounds = L.latLngBounds(garages.map((g) => gameToLatLng(g.x, g.y)))
      map.fitBounds(bounds, {
        paddingTopLeft: [48, 130],
        paddingBottomRight: [48, 80],
        maxZoom: 2,
        animate: false,
      })
      fittedRef.current = true
    }, 80)
  }, [garages, fleet])

  useEffect(() => {
    for (const garage of garages) {
      const marker = markersRef.current[garage.id]
      if (!marker) continue
      const stored = fleet.filter((v) => v.garageId === garage.id)
      const fill = stored.length / garage.capacity
      const dim = matchIds.size > 0 && !matchIds.has(garage.id)
      marker.setIcon(
        L.divIcon({
          className: 'gta-blip',
          html: blipHtml(fill, selectedId === garage.id, hoveredId === garage.id, dim),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      )
    }
  }, [garages, fleet, selectedId, hoveredId, matchIds])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const garage = garages.find((g) => g.id === selectedId)
    if (!garage) return
    const zoom = Math.max(map.getZoom(), 4)
    const latlng = L.latLng(gameToLatLng(garage.x, garage.y))
    const pt = map.project(latlng, zoom)
    pt.x += 220
    map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.7 })
  }, [selectedId, garages])

  return <div className="map-root" ref={rootRef} />
}

function blipHtml(fill: number, active: boolean, hover: boolean, dim: boolean) {
  const r = 12
  const c = 2 * Math.PI * r
  const dash = `${Math.max(0.08, fill) * c} ${c}`
  const cls = ['blip', active && 'is-active', hover && 'is-hover', dim && 'is-dim']
    .filter(Boolean)
    .join(' ')
  return `<div class="${cls}">
    ${active || hover ? '<i class="blip-pulse"></i>' : ''}
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="${r}" fill="none" stroke="rgba(239,232,214,0.18)" stroke-width="2"/>
      <circle cx="14" cy="14" r="${r}" fill="none" stroke="#e4c15a" stroke-width="2"
        stroke-dasharray="${dash}" stroke-linecap="round" transform="rotate(-90 14 14)"/>
    </svg>
    <span class="blip-core">${garageGlyph()}</span>
  </div>`
}

function garageGlyph() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 11V5.2L6 1.5l5 3.7V11H8.2V7.4H3.8V11H1z"/></svg>`
}

export function garageThumbs(garageId: string, fleet: StoredVehicle[]) {
  return fleet
    .filter((v) => v.garageId === garageId)
    .slice(0, 4)
    .map((v) => vehicleImage(v.model))
}
