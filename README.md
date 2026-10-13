<div align="center">

[简体中文](README.md) · [English](README.en.md)

# GTA GARAGE

### Your cars. Your map. Your empire.

一个为 GTA Online 车主打造的地图化车库管理器：把散落在圣安地列斯各处的房产、载具和收藏进度，变成一张真正属于你的车库地图。

<p>
  <a href="https://icebergwuw.github.io/GTAgarage/"><strong>进入在线 Demo →</strong></a>
  ·
  <a href="#功能亮点">查看功能</a>
  ·
  <a href="#本地运行">本地运行</a>
</p>

<p>
  <img src="https://img.shields.io/github/actions/workflow/status/icebergwuw/GTAgarage/deploy-pages.yml?style=flat-square&label=deploy" alt="Deploy status" />
  <img src="https://img.shields.io/github/last-commit/icebergwuw/GTAgarage?style=flat-square" alt="Last commit" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=fff" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-personal%20project-efe8d6?style=flat-square" alt="Personal project" />
</p>

<img src="public/preview-home.png" alt="GTA Garage map overview" width="100%" />

</div>

<br />

> **把“我到底把车停在哪了？”变成一张可以逛的地图。**

## 为什么做它

GTA Online 的载具越来越多，房产、楼层和容量规则却越来越复杂。GTA Garage 不试图做一个冰冷的表格，而是把车库重新设计成一个有空间感的收藏系统：

- 在熟悉的 San Andreas 地图上找到每一处车库
- 通过容量环和车辆缩略图快速判断库存状态
- 进入具体楼层，像逛自己的虚拟车库一样浏览车辆
- 用图鉴和成就记录你的收藏进度

## 功能亮点

| 地图化库存 | 房产管理 | 车辆图鉴 |
| --- | --- | --- |
| 只显示已拥有房产，点击地图标记进入车库 | 按 GTA Online 规则处理购买、置换、出售和容量上限 | 按车辆类别浏览，查看规格、厂商、现实原型和收藏进度 |

| 快速整理 | 本地数据 | 响应式体验 |
| --- | --- | --- |
| 搜索车库、地址、车型、厂商；支持跨车库移动和批量移动 | 数据保存在浏览器，可导出 JSON，也能一键恢复示例车队 | 桌面端地图工作台 + 移动端可用布局 |

## 交互预览

<table>
  <tr>
    <td width="50%"><img src="public/shot-home.png" alt="Map overview" /></td>
    <td width="50%"><img src="public/shot-panel.png" alt="Garage inventory panel" /></td>
  </tr>
  <tr>
    <td align="center"><sub>地图总览：库存、估值和车库分布一眼可见</sub></td>
    <td align="center"><sub>库存面板：楼层容量和车辆图像并列浏览</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="public/shot-hover.png" alt="Garage hover preview" /></td>
    <td width="50%"><img src="public/shot-sheet.png" alt="Vehicle detail sheet" /></td>
  </tr>
  <tr>
    <td align="center"><sub>悬停预览：不用打开面板也能快速扫库</sub></td>
    <td align="center"><sub>车辆详情：颜色、车牌、备注和移动操作</sub></td>
  </tr>
</table>

## 本地运行

```bash
git clone https://github.com/icebergwuw/GTAgarage.git
cd GTAgarage
npm install
npm run dev
```

然后打开终端提示的本地地址。生产构建：

```bash
npm run build
```

## 使用说明

1. 默认进入“我的车库”，地图只展示示例车队已拥有的房产。
2. 点击地图上的房产标记，进入楼层和车辆库存。
3. 使用右上角搜索框查找车库、地址、车型或厂商。
4. 点击“购买房产”查看候选地点；空心标记代表可购买房产。
5. 点击“图鉴”浏览完整车辆目录和分类收藏进度。
6. 右上角“导出”可以把当前本地车队保存为 JSON。

## 技术栈

- **UI**：React 19 + TypeScript
- **地图**：Leaflet + Rockstar Social Club San Andreas map tiles
- **动效**：Framer Motion
- **构建**：Vite
- **数据**：浏览器 `localStorage`，无需后端和账号系统
- **部署**：GitHub Actions + GitHub Pages

## 数据范围

项目聚焦 GTA Online 的常规个人载具库存，当前不包含地堡、设施、货物仓、载具仓库、游艇、潜艇、拆车场、洗车店和 McKenzie 机库等非标准个人载具车库。

车辆图片和资料来自 FiveM / GTA Wiki；项目为个人非商业作品，不隶属于 Rockstar Games。

## Roadmap

- [x] 地图化车库与楼层库存
- [x] 房产购买、出售和容量规则
- [x] 车辆搜索、移动、批量整理和 JSON 导出
- [x] 车辆图鉴与分类成就
- [x] GitHub Pages 在线 Demo
- [ ] 自定义车库封面和收藏标签
- [ ] 可选的云端同步 / 账号系统
- [ ] 更完整的车辆资料和筛选维度

## 反馈与共创

如果你也有一支失控的 GTA Online 车队，欢迎提交 Issue：告诉我你最想管理的车库、最常用的筛选方式，或者你希望加入图鉴的字段。

<div align="center">

**Built for collectors who never stop buying cars.**

<a href="https://icebergwuw.github.io/GTAgarage/">打开 GTA Garage →</a>

</div>
