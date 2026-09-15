import { formatCash, type GarageKind } from '../types'
import { kindFilters } from '../data/garages'

interface Props {
  query: string
  onQuery: (v: string) => void
  kindFilter: GarageKind | null
  onKind: (v: GarageKind | null) => void
  garageCount: number
  carCount: number
  value: number
  panelOpen: boolean
  onAdd: () => void
  onReset: () => void
  onExport: () => void
}

export function Hud({
  query,
  onQuery,
  kindFilter,
  onKind,
  garageCount,
  carCount,
  value,
  panelOpen,
  onAdd,
  onReset,
  onExport,
}: Props) {
  return (
    <>
      <header className="hud">
        <div className="brand">
          <b>GTA GARAGE</b>
          <span>圣安地列斯车队图鉴</span>
        </div>
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="搜索车库 / 地址 / 车型 / 厂商"
          />
        </div>
        {!panelOpen && (
          <div className="stats">
            <div>
              <em>车库</em>
              <b>{garageCount}</b>
            </div>
            <div>
              <em>载具</em>
              <b>{carCount}</b>
            </div>
            <div>
              <em>估值</em>
              <b>{formatCash(value)}</b>
            </div>
          </div>
        )}
      </header>
      {!panelOpen && (
        <>
          <div className="filters">
            {kindFilters.map((item) => (
              <button
                key={item.label}
                className={`chip ${kindFilter === item.id ? 'on' : ''}`}
                onClick={() => onKind(kindFilter === item.id ? null : item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="btn primary" onClick={onAdd}>
              添加车辆
            </button>
            <button className="btn ghost" onClick={onExport}>
              导出
            </button>
            <button className="btn danger" onClick={onReset}>
              重置示例
            </button>
          </div>
        </>
      )}
      <div className="hint">悬停车库看概览 · 点击进入库存</div>
    </>
  )
}
