import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Garage, StoredVehicle } from '../types'
import { kindColor } from '../data/garages'
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
  const lastSelectedRef = useRef<string | null>(null)
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
      minZoom: 2,
      maxZoom: 5,
      zoom: 3,
      center: [-400, 0],
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
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
    L.control.zoom({ position: 'bottomleft' }).addTo(map)
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
    const existing = markersRef.current
    const keep = new Set(garages.map((g) => g.id))
    for (const id of Object.keys(existing)) {
      if (!keep.has(id)) {
        existing[id].remove()
        delete existing[id]
      }
    }

    for (const garage of garages) {
      if (existing[garage.id]) {
        existing[garage.id].setLatLng(gameToLatLng(garage.x, garage.y))
        continue
      }
      const marker = L.marker(gameToLatLng(garage.x, garage.y), {
        icon: L.divIcon({
          className: 'gta-blip',
          html: blipHtml(0, false, false, false, kindColor[garage.kind]),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        keyboard: false,
      })
      marker.addTo(map)
      const pointFromEvent = (e: L.LeafletMouseEvent) => {
        const oe = e.originalEvent as MouseEvent | undefined
        if (oe && map) return map.mouseEventToContainerPoint(oe)
        return map.latLngToContainerPoint(L.latLng(gameToLatLng(garage.x, garage.y)))
      }
      marker.on('mouseover', (e) => {
        const p = pointFromEvent(e)
        onHoverRef.current(garage.id, { x: p.x, y: p.y })
      })
      marker.on('mousemove', (e) => {
        const p = pointFromEvent(e)
        onHoverRef.current(garage.id, { x: p.x, y: p.y })
      })
      marker.on('mouseout', () => onHoverRef.current(null))
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectRef.current(garage.id)
      })
      existing[garage.id] = marker
    }

    if (fittedRef.current) return
    const timer = window.setTimeout(() => {
      if (!mapRef.current || fittedRef.current) return
      fittedRef.current = true
      if (selectedId) return
      map.invalidateSize()
      const core = garages.filter((item) => item.y >= -3600 && item.y <= 900)
      const focus = core.length ? core : garages
      const bounds = L.latLngBounds(focus.map((item) => gameToLatLng(item.x, item.y)))
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 120],
        paddingBottomRight: [40, 64],
        maxZoom: 3,
        animate: false,
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [garages, selectedId])

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
          html: blipHtml(fill, selectedId === garage.id, hoveredId === garage.id, dim, kindColor[garage.kind]),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      )
    }
  }, [garages, fleet, selectedId, hoveredId, matchIds])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const id = selectedId ?? lastSelectedRef.current
    lastSelectedRef.current = selectedId
    if (!id) return
    const garage = garages.find((g) => g.id === id)
    if (!garage) return
    const latlng = L.latLng(gameToLatLng(garage.x, garage.y))
    if (!selectedId) {
      map.flyTo(latlng, Math.min(Math.max(map.getZoom(), 3), 3.5), { duration: 0.55 })
      return
    }
    const zoom = Math.max(map.getZoom(), 4)
    const pt = map.project(latlng, zoom)
    pt.x += 220
    map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.7 })
  }, [selectedId, garages])

  return <div className="map-root" ref={rootRef} />
}

function blipHtml(fill: number, active: boolean, hover: boolean, dim: boolean, color: string) {
  const r = 12
  const c = 2 * Math.PI * r
  const amount = Math.max(0, Math.min(1, fill))
  const dash = `${amount * c} ${c}`
  const cap = amount > 0.02 ? 'round' : 'butt'
  const cls = ['blip', active && 'is-active', hover && 'is-hover', dim && 'is-dim']
    .filter(Boolean)
    .join(' ')
  return `<div class="${cls}">
    ${active || hover ? '<i class="blip-pulse"></i>' : ''}
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="${r}" fill="none" stroke="rgba(239,232,214,0.18)" stroke-width="2"/>
      <circle cx="14" cy="14" r="${r}" fill="none" stroke="${color}" stroke-width="2"
        stroke-dasharray="${dash}" stroke-linecap="${cap}" transform="rotate(-90 14 14)"/>
    </svg>
    <span class="blip-core">${garageGlyph()}</span>
  </div>`
}

function garageGlyph() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 11V5.2L6 1.5l5 3.7V11H8.2V7.4H3.8V11H1z"/></svg>`
}
