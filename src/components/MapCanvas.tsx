import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Garage, StoredVehicle } from '../types'
import { complexId, kindColor } from '../data/garages'
import { gtaCrs, gameToLatLng, TILE_URL, ERROR_TILE, MAP_BOUNDS } from '../lib/map'

interface Props {
  garages: Garage[]
  fleet: StoredVehicle[]
  ownedIds: string[]
  selectedId: string | null
  hoveredId: string | null
  matchIds: Set<string>
  focusToken: string
  onHover: (id: string | null, point?: { x: number; y: number }) => void
  onSelect: (id: string) => void
  onClear: () => void
}

export function MapCanvas({
  garages,
  fleet,
  ownedIds,
  selectedId,
  hoveredId,
  matchIds,
  focusToken,
  onHover,
  onSelect,
  onClear,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const lastFocusRef = useRef<string | null>(null)
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
    const sites = sitesFrom(garages)
    const keep = new Set(sites.map((site) => site.id))
    for (const id of Object.keys(existing)) {
      if (!keep.has(id)) {
        existing[id].remove()
        delete existing[id]
      }
    }

    for (const site of sites) {
      if (existing[site.id]) {
        existing[site.id].setLatLng(gameToLatLng(site.x, site.y))
        continue
      }
      const marker = L.marker(gameToLatLng(site.x, site.y), {
        icon: L.divIcon({
          className: 'gta-blip',
          html: blipHtml(0, false, false, false, kindColor[site.kind]),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        keyboard: false,
      })
      marker.addTo(map)
      const pointFromEvent = (e: L.LeafletMouseEvent) => {
        const oe = e.originalEvent as MouseEvent | undefined
        if (oe && map) return map.mouseEventToContainerPoint(oe)
        return map.latLngToContainerPoint(L.latLng(gameToLatLng(site.x, site.y)))
      }
      marker.on('mouseover', (e) => {
        const p = pointFromEvent(e)
        onHoverRef.current(site.id, { x: p.x, y: p.y })
      })
      marker.on('mousemove', (e) => {
        const p = pointFromEvent(e)
        onHoverRef.current(site.id, { x: p.x, y: p.y })
      })
      marker.on('mouseout', () => onHoverRef.current(null))
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectRef.current(site.id)
      })
      existing[site.id] = marker
    }

    if (lastFocusRef.current === focusToken) return
    const timer = window.setTimeout(() => {
      const live = mapRef.current
      if (!live || lastFocusRef.current === focusToken || garages.length === 0) return
      lastFocusRef.current = focusToken
      live.invalidateSize()
      const bounds = L.latLngBounds(sitesFrom(garages).map((item) => gameToLatLng(item.x, item.y)))
      live.fitBounds(bounds, {
        paddingTopLeft: [40, 120],
        paddingBottomRight: [48, 72],
        maxZoom: focusToken.startsWith('shop') ? 4 : 3,
        animate: false,
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [garages, focusToken])

  useEffect(() => {
    for (const site of sitesFrom(garages)) {
      const marker = markersRef.current[site.id]
      if (!marker) continue
      const ownedHere = site.members.filter((item) => ownedIds.includes(item.id))
      const stored = fleet.filter((v) => ownedHere.some((item) => item.id === v.garageId))
      const capacity = ownedHere.reduce((sum, item) => sum + item.capacity, 0)
      const fill = capacity > 0 ? stored.length / capacity : 0
      const dim = matchIds.size > 0 && !site.members.some((item) => matchIds.has(item.id))
      const catalog = ownedHere.length === 0
      marker.setIcon(
        L.divIcon({
          className: 'gta-blip',
          html: blipHtml(fill, selectedId === site.id, hoveredId === site.id, dim, kindColor[site.kind], catalog),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      )
    }
  }, [garages, fleet, selectedId, hoveredId, matchIds, ownedIds])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const id = selectedId ?? lastSelectedRef.current
    lastSelectedRef.current = selectedId
    if (!id) return
    const site = sitesFrom(garages).find((item) => item.id === id) ?? sitesFrom(garages).find((item) => item.members.some((g) => g.id === id))
    if (!site) return
    const latlng = L.latLng(gameToLatLng(site.x, site.y))
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

function blipHtml(fill: number, active: boolean, hover: boolean, dim: boolean, color: string, catalog = false) {
  const r = 12
  const c = 2 * Math.PI * r
  const amount = catalog ? 0 : Math.max(0, Math.min(1, fill))
  const dash = `${amount * c} ${c}`
  const cap = amount > 0.02 ? 'round' : 'butt'
  const cls = ['blip', active && 'is-active', hover && 'is-hover', dim && 'is-dim', catalog && 'is-catalog']
    .filter(Boolean)
    .join(' ')
  return `<div class="${cls}">
    ${active || hover ? '<i class="blip-pulse"></i>' : ''}
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="${r}" fill="none" stroke="rgba(239,232,214,0.18)" stroke-width="2"/>
      <circle cx="14" cy="14" r="${r}" fill="none" stroke="${color}" stroke-width="2"
        stroke-dasharray="${dash}" stroke-linecap="${cap}" transform="rotate(-90 14 14)"/>
    </svg>
    <span class="blip-core">${catalog ? plusGlyph() : garageGlyph()}</span>
  </div>`
}

function garageGlyph() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 11V5.2L6 1.5l5 3.7V11H8.2V7.4H3.8V11H1z"/></svg>`
}

function plusGlyph() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M5.25 5.25V2h1.5v3.25H10v1.5H6.75V10h-1.5V6.75H2v-1.5h3.25z"/></svg>`
}

function sitesFrom(garages: Garage[]) {
  const grouped = new Map<string, Garage[]>()
  for (const garage of garages) {
    const id = complexId(garage)
    const list = grouped.get(id)
    if (list) list.push(garage)
    else grouped.set(id, [garage])
  }
  return [...grouped.entries()].map(([id, members]) => ({
    id,
    members,
    x: members[0].x,
    y: members[0].y,
    kind: members[0].kind,
  }))
}
