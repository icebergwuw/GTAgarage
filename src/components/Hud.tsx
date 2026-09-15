import { formatCash, type GarageKind } from '../types'
import { kindFilters } from '../data/garages'
import { slotGroupByKind, usageForKind } from '../data/ownership'

interface Props {
  query: string
  onQuery: (v: string) => void
  kindFilter: GarageKind | null
  onKind: (v: GarageKind | null) => void
  shopMode: boolean
  ownedIds: string[]
  garageCount: number
  carCount: number
  value: number
  panelOpen: boolean
  onAdd: () => void
  canAdd: boolean
  onShop: () => void
  onReset: () => void
  onExport: () => void
}

export function Hud({
  query,
  onQuery,
  kindFilter,
  onKind,
  shopMode,
  ownedIds,
  garageCount,
  carCount,
  value,
  panelOpen,
  onAdd,
  canAdd,
  onShop,
  onReset,
  onExport,
}: Props) {
  const chips = shopMode ? kindFilters.filter((item) => item.id !== null) : kindFilters
  const shopGroup = kindFilter ? slotGroupByKind[kindFilter] : null
  const shopUsage = kindFilter ? usageForKind(ownedIds, kindFilter) : null

  return (
    <>
      <header className="hud">
        <div className="brand">
          <b>GTA GARAGE</b>
          <span>{shopMode ? 'Dynasty 8 / Maze Bank 选址' : '圣安地列斯车队图鉴'}</span>
        </div>
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={shopMode ? '搜索可购买的房产 / 街区' : '搜索车库 / 地址 / 车型 / 厂商'}
          />
        </div>
        {!panelOpen && (
          <div className="stats">
            <div>
              <em>已拥有</em>
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
          <div className={`filters ${shopMode ? 'is-shop' : ''}`}>
            {chips.map((item) => {
              const usage = item.id ? usageForKind(ownedIds, item.id) : null
              return (
                <button
                  key={item.label}
                  className={`chip ${kindFilter === item.id ? 'on' : ''}`}
                  onClick={() => {
                    if (shopMode) {
                      if (item.id) onKind(item.id)
                      return
                    }
                    onKind(kindFilter === item.id ? null : item.id)
                  }}
                >
                  {item.label}
                  {shopMode && usage && (
                    <em>
                      {usage.used}/{usage.cap}
                    </em>
                  )}
                </button>
              )
            })}
          </div>
          <div className="actions">
            <button className={`btn ${shopMode ? 'primary' : 'ghost'}`} onClick={onShop}>
              {shopMode ? '我的车库' : '购买房产'}
            </button>
            <button className="btn primary" onClick={onAdd} disabled={!canAdd}>
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
      <div className="hint">
        {shopMode
          ? shopGroup && shopUsage
            ? `选址中 · ${shopGroup.label}上限 ${shopUsage.cap} 处，已拥有 ${shopUsage.used} · 空心标记可买`
            : '选一处类型，地图只显示这一类候选点'
          : '默认只显示已拥有的房产 · 购买房产按 GTAO 上限选址'}
      </div>
    </>
  )
}
