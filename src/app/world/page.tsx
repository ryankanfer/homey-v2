'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

// ─── Constants ───────────────────────────────────────────────────────────────
const TILE_W = 64
const TILE_H = 32
const TW2 = TILE_W / 2
const TH2 = TILE_H / 2
const MAP_SIZE = 30
const INTERIOR_W = 12
const INTERIOR_H = 10
const MOVE_SPEED = 4 // tiles/sec

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg:         '#0D0D0B',
  surface:    '#1A1A17',
  border:     '#2A2A27',
  sand:       '#C8B89A',
  sandMuted:  '#A8956E',
  sandDark:   '#8B7458',
  text:       '#F0EDE8',
  textMuted:  '#A8A49E',
  green:      '#4A7C59',
  red:        '#8B3A3A',
  road:       '#2A2A27',
  sidewalk:   '#3A3530',
  ground:     '#161613',
  groundLine: '#1E1E1B',
  skyTop:     '#050505',
  skyBottom:  '#0D0D0B',
  marking:    '#3A3A37',
  gold:       '#C8A050',
  glass:      'rgba(100, 150, 180, 0.15)',
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TileType =
  | 'ground' | 'sidewalk' | 'road' | 'solid'
  | 'door_homey' | 'door_advsr' | 'door_acquire'
  | 'interact_homey' | 'interact_advsr' | 'interact_acquire'
  | 'exit'

type Scene = 'overworld' | 'homey' | 'advsr' | 'acquire'
type Dir = 'N' | 'S' | 'E' | 'W'

interface GameState {
  scene: Scene
  charTileX: number
  charTileY: number
  targetTileX: number
  targetTileY: number
  prevTileX: number
  prevTileY: number
  moving: boolean
  moveProgress: number
  direction: Dir
  fadeAlpha: number
  fadingOut: boolean
  fadingIn: boolean
  fadeScene: Scene
  fadeLabel: string
  time: number
  zoom: number
  nearDoor: '' | 'homey' | 'advsr' | 'acquire'
  nearInteract: '' | 'homey' | 'advsr' | 'acquire'
  nearExit: boolean
  spawnedTrail: boolean
  trails: Trail[]
  
  // God Mode: Ecosystem Monitor
  stats: {
    buyers: number
    renters: number
    agentClients: number
    activeListings: number
  }
  ghosts: Ghost[]
  nearGhost: Ghost | null
  selectionMode: 'homey' | 'advsr' | 'acquire' | null
}

interface Ghost {
  id: string
  name: string
  role: 'buyer' | 'renter'
  x: number
  y: number
  readiness: number
  fear: string
  timeOffset: number
}

interface Trail {
  x: number, y: number, age: number
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,   x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,   y + h, r)
  ctx.arcTo(x,   y + h, x,   y,   r)
  ctx.arcTo(x,   y,   x + w, y,   r)
  ctx.closePath()
}

// ─── Tile Map Builder ─────────────────────────────────────────────────────────
function buildOverworldMap(): TileType[][] {
  const map: TileType[][] = Array.from({ length: MAP_SIZE }, () =>
    Array(MAP_SIZE).fill('ground')
  )

  // Road row 14
  for (let x = 0; x < MAP_SIZE; x++) map[14][x] = 'road'

  // Sidewalk row 13
  for (let x = 0; x < MAP_SIZE; x++) map[13][x] = 'sidewalk'

  // Building footprints (solid)
  // homey: cols 4-7, rows 6-12
  for (let r = 6; r <= 12; r++)
    for (let c = 4; c <= 7; c++) map[r][c] = 'solid'

  // advsr: cols 12-15, rows 5-12
  for (let r = 5; r <= 12; r++)
    for (let c = 12; c <= 15; c++) map[r][c] = 'solid'

  // acquire: cols 20-23, rows 7-12
  for (let r = 7; r <= 12; r++)
    for (let c = 20; c <= 23; c++) map[r][c] = 'solid'

  // Doors
  map[13][5] = 'door_homey'
  map[13][13] = 'door_advsr'
  map[13][21] = 'door_acquire'

  return map
}

function buildInteriorMap(scene: 'homey' | 'advsr' | 'acquire'): TileType[][] {
  const map: TileType[][] = Array.from({ length: INTERIOR_H }, () =>
    Array(INTERIOR_W).fill('ground')
  )

  // Walls (solid border)
  for (let r = 0; r < INTERIOR_H; r++)
    for (let c = 0; c < INTERIOR_W; c++)
      if (r === 0 || r === INTERIOR_H - 1 || c === 0 || c === INTERIOR_W - 1)
        map[r][c] = 'solid'

  // Exit door on south wall
  map[INTERIOR_H - 1][5] = 'exit'
  map[INTERIOR_H - 1][6] = 'exit'

  // Furniture as solid
  if (scene === 'homey') {
    map[3][3] = 'solid' // bookshelf
    map[5][5] = 'solid' // couch
    map[2][6] = `interact_homey` as TileType
  } else if (scene === 'advsr') {
    map[5][6] = 'solid' // desk
    map[4][6] = `interact_advsr` as TileType
  } else {
    map[5][5] = 'solid' // blueprint table
    map[4][5] = `interact_acquire` as TileType
  }

  return map
}

// ─── Iso Projection ───────────────────────────────────────────────────────────
function isoToScreen(
  tx: number, ty: number,
  originX: number, originY: number
): [number, number] {
  return [
    (tx - ty) * TW2 + originX,
    (tx + ty) * TH2 + originY,
  ]
}

// ─── Canvas Drawing Primitives ────────────────────────────────────────────────

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath()
  ctx.moveTo(sx,        sy)
  ctx.lineTo(sx + TW2,  sy + TH2)
  ctx.lineTo(sx,        sy + TILE_H)
  ctx.lineTo(sx - TW2,  sy + TH2)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  tw: number, td: number,
  height: number,
  colors: { top: string; left: string; right: string },
  originX: number, originY: number
) {
  const px = height * TH2
  const corners = {
    topNW: isoToScreen(tx,      ty,      originX, originY),
    topNE: isoToScreen(tx + tw, ty,      originX, originY),
    topSE: isoToScreen(tx + tw, ty + td, originX, originY),
    topSW: isoToScreen(tx,      ty + td, originX, originY),
  }

  // Left face (west)
  ctx.beginPath()
  ctx.moveTo(corners.topNW[0], corners.topNW[1] - px)
  ctx.lineTo(corners.topSW[0], corners.topSW[1] - px)
  ctx.lineTo(corners.topSW[0], corners.topSW[1])
  ctx.lineTo(corners.topNW[0], corners.topNW[1])
  ctx.closePath()
  ctx.fillStyle = colors.left
  ctx.fill()

  // Right face (east)
  ctx.beginPath()
  ctx.moveTo(corners.topSW[0], corners.topSW[1] - px)
  ctx.lineTo(corners.topSE[0], corners.topSE[1] - px)
  ctx.lineTo(corners.topSE[0], corners.topSE[1])
  ctx.lineTo(corners.topSW[0], corners.topSW[1])
  ctx.closePath()
  ctx.fillStyle = colors.right
  ctx.fill()

  // Top face
  ctx.beginPath()
  ctx.moveTo(corners.topNW[0], corners.topNW[1] - px)
  ctx.lineTo(corners.topNE[0], corners.topNE[1] - px)
  ctx.lineTo(corners.topSE[0], corners.topSE[1] - px)
  ctx.lineTo(corners.topSW[0], corners.topSW[1] - px)
  ctx.closePath()
  ctx.fillStyle = colors.top
  ctx.fill()
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  tw: number, td: number,
  height: number,
  color: string,
  pulse: number,
  originX: number, originY: number
) {
  const px = height * TH2
  ctx.globalAlpha = (0.5 + pulse * 0.3)

  // Left face windows
  const lw = isoToScreen(tx, ty, originX, originY)
  const lb = isoToScreen(tx, ty + td, originX, originY)
  const rows = height
  const cols = Math.max(1, Math.floor(td))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (r + 0.3) / rows
      const u = (c + 0.3) / cols
      const wx = lw[0] + (lb[0] - lw[0]) * u
      const wy = lw[1] - px + (lb[1] - lw[1]) * u + t * px
      ctx.fillStyle = color
      ctx.fillRect(wx - 3, wy - 2, 5, 4)
    }
  }

  // Right face windows
  const rb = isoToScreen(tx + tw, ty + td, originX, originY)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (r + 0.3) / rows
      const u = (c + 0.3) / cols
      const wx = lb[0] + (rb[0] - lb[0]) * u
      const wy = lb[1] - px + (rb[1] - lb[1]) * u + t * px
      ctx.fillStyle = color
      ctx.fillRect(wx - 2, wy - 2, 4, 4)
    }
  }
  ctx.globalAlpha = 1
}

function drawCornice(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  tw: number, td: number,
  height: number,
  color: string,
  originX: number, originY: number
) {
  const px = height * TH2 + 2
  const nw = isoToScreen(tx - 0.1,      ty - 0.1,      originX, originY)
  const ne = isoToScreen(tx + tw + 0.1, ty - 0.1,      originX, originY)
  const se = isoToScreen(tx + tw + 0.1, ty + td + 0.1, originX, originY)
  const sw = isoToScreen(tx - 0.1,      ty + td + 0.1, originX, originY)

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(nw[0], nw[1] - px)
  ctx.lineTo(ne[0], ne[1] - px)
  ctx.lineTo(se[0], se[1] - px)
  ctx.lineTo(sw[0], sw[1] - px)
  ctx.closePath()
  ctx.fill()
}

function drawScaffolding(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  tw: number, td: number,
  height: number,
  originX: number, originY: number
) {
  const px = height * TH2
  const base = isoToScreen(tx, ty + td, originX, originY)
  const top = isoToScreen(tx, ty, originX, originY)
  ctx.strokeStyle = '#5A5048'
  ctx.lineWidth = 1.5
  // Vertical poles
  for (let i = 0; i <= tw; i++) {
    const [bx, by] = isoToScreen(tx + i, ty + td, originX, originY)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx, by - px - 10)
    ctx.stroke()
  }
  // Horizontal bars
  for (let lvl = 0; lvl <= height; lvl++) {
    const yOff = (lvl / height) * px
    ctx.beginPath()
    ctx.moveTo(base[0], base[1] - yOff)
    ctx.lineTo(top[0], top[1] - yOff)
    ctx.stroke()
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  time: number,
  originX: number, originY: number
) {
  const [sx, sy] = isoToScreen(tx, ty, originX, originY)
  const sway = Math.sin(time * 0.8 + tx) * 1.5

  // Trunk
  ctx.fillStyle = '#3A2A1A'
  ctx.fillRect(sx - 3, sy - 20, 6, 20)

  // Leaves - diamond shape
  ctx.beginPath()
  ctx.moveTo(sx + sway,     sy - 40)
  ctx.lineTo(sx + 16 + sway, sy - 20)
  ctx.lineTo(sx + sway,     sy - 10)
  ctx.lineTo(sx - 16 + sway, sy - 20)
  ctx.closePath()
  ctx.fillStyle = '#2A4A2A'
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(sx + sway,     sy - 50)
  ctx.lineTo(sx + 10 + sway, sy - 35)
  ctx.lineTo(sx + sway,     sy - 22)
  ctx.lineTo(sx - 10 + sway, sy - 35)
  ctx.closePath()
  ctx.fillStyle = '#3A5A3A'
  ctx.fill()
}

function drawStreetlight(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  time: number,
  originX: number, originY: number
) {
  const [sx, sy] = isoToScreen(tx, ty, originX, originY)
  const glowPulse = Math.sin(time * 1.2) * 0.1 + 0.9

  // Pole
  ctx.fillStyle = '#3A3530'
  ctx.fillRect(sx - 2, sy - 50, 4, 50)

  // Arm
  ctx.fillRect(sx - 2, sy - 50, 15, 3)

  // Glow
  const grd = ctx.createRadialGradient(sx + 13, sy - 50, 0, sx + 13, sy - 50, 20)
  grd.addColorStop(0, `rgba(255, 230, 150, ${0.3 * glowPulse})`)
  grd.addColorStop(1, 'rgba(255, 230, 150, 0)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(sx + 13, sy - 50, 20, 0, Math.PI * 2)
  ctx.fill()

  // Bulb
  ctx.fillStyle = `rgba(255, 230, 150, ${0.8 * glowPulse})`
  ctx.beginPath()
  ctx.arc(sx + 13, sy - 50, 4, 0, Math.PI * 2)
  ctx.fill()
}

function drawBench(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  originX: number, originY: number
) {
  drawIsoBox(ctx, tx, ty, 2, 1, 0.3, {
    top: C.sandDark,
    left: '#6A5040',
    right: '#5A4030',
  }, originX, originY)
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  time: number
) {
  const drift = (time * 10) % 400
  const x = cx + drift
  ctx.fillStyle = 'rgba(200, 200, 200, 0.03)'
  ctx.beginPath()
  ctx.arc(x, cy, 30, 0, Math.PI * 2)
  ctx.arc(x + 25, cy - 10, 25, 0, Math.PI * 2)
  ctx.arc(x + 50, cy, 30, 0, Math.PI * 2)
  ctx.fill()
}

function drawLightShaft(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number
) {
  const grd = ctx.createLinearGradient(x, y, x + w, y + h)
  grd.addColorStop(0, 'rgba(200, 184, 154, 0.08)')
  grd.addColorStop(1, 'rgba(200, 184, 154, 0)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + w - 40, y + h)
  ctx.lineTo(x - 40, y)
  ctx.closePath()
  ctx.fill()
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  dir: Dir,
  moving: boolean,
  time: number
) {
  const bob = moving ? Math.sin(time * 8) * 2 : 0
  const y = sy + bob

  // Shadow
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.ellipse(sx, sy + 2, 10, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Body
  ctx.fillStyle = C.sand
  ctx.beginPath()
  ctx.ellipse(sx, y + 5, 7, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  // Head
  ctx.fillStyle = '#D8C8AA'
  ctx.beginPath()
  ctx.arc(sx, y - 8, 7, 0, Math.PI * 2)
  ctx.fill()

  // Direction indicator
  ctx.fillStyle = C.sandMuted
  ctx.beginPath()
  if (dir === 'N') {
    ctx.moveTo(sx, y - 17); ctx.lineTo(sx - 4, y - 12); ctx.lineTo(sx + 4, y - 12)
  } else if (dir === 'S') {
    ctx.moveTo(sx, y + 18); ctx.lineTo(sx - 4, y + 13); ctx.lineTo(sx + 4, y + 13)
  } else if (dir === 'E') {
    ctx.moveTo(sx + 9, y + 5); ctx.lineTo(sx + 4, y + 1); ctx.lineTo(sx + 4, y + 9)
  } else {
    ctx.moveTo(sx - 9, y + 5); ctx.lineTo(sx - 4, y + 1); ctx.lineTo(sx - 4, y + 9)
  }
  ctx.closePath()
  ctx.fill()

  // Name tag
  ctx.font = 'italic 10px "Playfair Display", serif'
  ctx.fillStyle = C.sand
  ctx.textAlign = 'center'
  ctx.fillText('you', sx, y - 22)
}

function drawGhostPrompt(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  ghost: Ghost,
  time: number
) {
  const hover = Math.sin(time * 3) * 5
  const y = py - 40 + hover
  
  // Outer Glow
  ctx.shadowColor = C.sand
  ctx.shadowBlur = 15
  
  // Bubble
  ctx.fillStyle = 'rgba(13, 13, 11, 0.95)'
  ctx.strokeStyle = C.sand
  ctx.lineWidth = 1
  roundRect(ctx, px - 60, y - 60, 120, 65, 8)
  ctx.fill()
  ctx.stroke()
  
  ctx.shadowBlur = 0 // Reset

  // Content
  ctx.fillStyle = C.text
  ctx.font = 'bold 10px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(ghost.name, px, y - 42)
  
  ctx.fillStyle = C.textMuted
  ctx.font = '8px Inter, sans-serif'
  ctx.fillText(`Readiness: ${ghost.readiness}%`, px, y - 28)
  
  ctx.fillStyle = C.red
  ctx.font = 'italic 9px Inter, sans-serif'
  ctx.fillText(`Fear: ${ghost.fear}`, px, y - 14)
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  time: number,
  offset: number
) {
  const t = time + offset
  const bounce = Math.sin(t * 2) * 5
  const alpha = 0.3 + Math.sin(t * 1.5) * 0.1
  const y = py - 20 + bounce

  // Aura
  const grd = ctx.createRadialGradient(px, y, 0, px, y, 30)
  grd.addColorStop(0, `rgba(200, 184, 154, ${alpha})`)
  grd.addColorStop(1, 'rgba(200, 184, 154, 0)')
  ctx.fillStyle = grd
  ctx.beginPath(); ctx.arc(px, y, 30, 0, Math.PI * 2); ctx.fill()

  // Humanoid Silhouette
  ctx.fillStyle = `rgba(240, 237, 232, ${alpha + 0.3})`
  
  // Head
  ctx.beginPath(); ctx.arc(px, y - 18, 5, 0, Math.PI * 2); ctx.fill()
  
  // Torso
  ctx.beginPath()
  ctx.moveTo(px - 6, y - 12)
  ctx.lineTo(px + 6, y - 12)
  ctx.lineTo(px + 8, y + 8)
  ctx.lineTo(px - 8, y + 8)
  ctx.closePath()
  ctx.fill()
}

function drawInteractPrompt(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  label: string
) {
  const w = 80, h = 20
  const x = sx - w / 2, y = sy - 60

  ctx.fillStyle = 'rgba(26, 26, 23, 0.92)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 6)
  ctx.fill()

  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.font = '10px Inter, sans-serif'
  ctx.fillStyle = C.sand
  ctx.textAlign = 'center'
  ctx.fillText(label, sx, y + 13)
}


function drawOverworld(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  gs: GameState,
  tileMap: TileType[][]
) {
  // Camera origin: center on character
  const [charSX, charSY] = isoToScreen(gs.charTileX, gs.charTileY, 0, 0)
  const originX = cw / 2 - charSX
  const originY = ch / 2 - charSY + 40

  // Ecosystem Heartbeat
  const pulseFreq = 0.8 + (gs.stats.buyers * 0.02)
  const pulse = Math.sin(gs.time * pulseFreq) * 0.2 + 0.8

  // Sky Gradient
  const grd = ctx.createLinearGradient(0, 0, 0, ch * 0.6)
  grd.addColorStop(0, C.skyTop)
  grd.addColorStop(1, C.skyBottom)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, cw, ch)

  // Floating Clouds
  drawCloud(ctx, 50, 100, gs.time)
  drawCloud(ctx, 400, 150, gs.time * 0.8)
  drawCloud(ctx, -200, 80, gs.time * 1.2)

  // Stars in upper region
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 137.5) % cw)
    const sy = ((i * 97.3) % (ch * 0.4))
    const twinkle = Math.sin(gs.time * 0.7 + i * 1.3) * 0.4 + 0.5
    ctx.globalAlpha = twinkle * 0.6
    ctx.fillStyle = '#F0EDE8'
    ctx.fillRect(sx, sy, 1, 1)
  }
  ctx.globalAlpha = 1

  // Draw tiles (back to front for iso depth)
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      const [sx, sy] = isoToScreen(c, r, originX, originY)
      // Frustum cull
      if (sx < -TILE_W || sx > cw + TILE_W || sy < -TILE_H || sy > ch + TILE_H) continue

      const tile = tileMap[r][c]
      let color = C.ground
      if (tile === 'road') color = C.road
      else if (tile === 'sidewalk') color = C.sidewalk
      else if (tile === 'solid') continue // drawn as buildings
      else if (tile.startsWith('door_')) color = C.sidewalk

      drawIsoTile(ctx, sx, sy, color, C.groundLine)

      // Road markings
      if (tile === 'road' && (c % 4 === 0)) {
        const [mx, my] = isoToScreen(c + 0.5, r + 0.45, originX, originY)
        ctx.fillStyle = C.marking
        ctx.beginPath()
        ctx.moveTo(mx - 5, my)
        ctx.lineTo(mx + 5, my + 5)
        ctx.lineTo(mx, my + 10)
        ctx.lineTo(mx - 10, my + 5)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  // Decorations
  drawTree(ctx, 2,  2,  gs.time, originX, originY)
  drawTree(ctx, 27, 2,  gs.time, originX, originY)
  drawTree(ctx, 2,  26, gs.time, originX, originY)
  drawTree(ctx, 27, 26, gs.time, originX, originY)

  drawBench(ctx, 8,  15, originX, originY)
  drawBench(ctx, 17, 15, originX, originY)

  drawStreetlight(ctx, 3,  13, gs.time, originX, originY)
  drawStreetlight(ctx, 10, 13, gs.time, originX, originY)
  drawStreetlight(ctx, 18, 13, gs.time, originX, originY)
  drawStreetlight(ctx, 25, 13, gs.time, originX, originY)

  // homey. brownstone
  drawIsoBox(ctx, 4, 6, 4, 6, 3, {
    top: C.sand, left: C.sandMuted, right: C.sandDark,
  }, originX, originY)
  // Clouds...
  
  // Ghosts (God Mode)
  gs.ghosts.forEach(g => {
    const [gx, gy] = isoToScreen(g.x, g.y, originX, originY)
    drawGhost(ctx, gx, gy, gs.time, g.timeOffset)
  })

  // Stoop...
  drawIsoBox(ctx, 4.5, 12, 1, 0.5, 0.5, {
    top: C.sidewalk, left: C.ground, right: C.groundLine
  }, originX, originY)
  drawWindows(ctx, 4, 6, 4, 6, 3, '#C8A050', pulse, originX, originY)
  drawCornice(ctx, 4, 6, 4, 6, 3, '#A88558', originX, originY)

  // Arched door
  {
    const [dx, dy] = isoToScreen(5, 12, originX, originY)
    ctx.fillStyle = '#3A1A0A'
    ctx.beginPath()
    ctx.arc(dx, dy - 8, 8, Math.PI, 0)
    ctx.rect(dx - 8, dy - 8, 16, 14)
    ctx.fill()
  }

  // advsr glass tower
  drawIsoBox(ctx, 12, 5, 4, 6, 4, {
    top: '#1A2A2A', left: '#0D1A1A', right: '#142020',
  }, originX, originY)
  drawWindows(ctx, 12, 5, 4, 6, 4, C.green, pulse, originX, originY)
  drawCornice(ctx, 12, 5, 4, 6, 4, '#1A2A2A', originX, originY)

  // Glass door
  {
    const [dx, dy] = isoToScreen(13, 12, originX, originY)
    ctx.fillStyle = '#0A1A1A'
    ctx.fillRect(dx - 10, dy - 20, 20, 22)
    ctx.fillStyle = `rgba(74, 124, 89, ${0.3 + pulse * 0.2})`
    ctx.fillRect(dx - 9, dy - 19, 9, 20)
    ctx.fillRect(dx + 1, dy - 19, 8, 20)
  }

  // acquire construction
  drawIsoBox(ctx, 20, 7, 4, 5, 2, {
    top: '#3A3530', left: '#2A2520', right: '#1A1510',
  }, originX, originY)
  drawScaffolding(ctx, 20, 7, 4, 5, 2, originX, originY)
  
  // Construction Steam
  for (let i = 0; i < 5; i++) {
    const life = (gs.time + i * 0.5) % 2.5
    const [bx0, by0] = isoToScreen(20.5, 9.5, originX, originY)
    const sz = life * 15
    const alpha = (1 - life / 2.5) * 0.2
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`
    ctx.beginPath()
    ctx.arc(bx0 + Math.sin(life * 2) * 10, by0 - sz - 20, sz, 0, Math.PI * 2)
    ctx.fill()
  }

  // Construction Barrels
  for (let i = 0; i < 3; i++) {
    const [bx, by] = isoToScreen(19.5, 8 + i * 2, originX, originY)
    ctx.fillStyle = '#C85020'
    ctx.fillRect(bx - 4, by - 10, 8, 10)
    ctx.fillStyle = '#EEE'
    ctx.fillRect(bx - 4, by - 6, 8, 2)
  }

  // Caution tape on door
  {
    const [dx, dy] = isoToScreen(21, 12, originX, originY)
    ctx.strokeStyle = '#C8A020'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(dx - 12, dy - 5)
    ctx.lineTo(dx + 12, dy - 15)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(dx - 12, dy - 12)
    ctx.lineTo(dx + 12, dy - 22)
    ctx.stroke()
  }

  // Footprints
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  gs.trails.forEach(t => {
    const [sx, sy] = isoToScreen(t.x, t.y, originX, originY)
    ctx.globalAlpha = Math.max(0, 1 - (t.age / 1.5))
    ctx.beginPath()
    ctx.ellipse(sx, sy + 3, 5, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  // Character
  const charScreenX = cw / 2
  const charScreenY = ch / 2 + 40
  drawCharacter(ctx, charScreenX, charScreenY, gs.direction, gs.moving, gs.time)

  // Prompt
  if (gs.nearDoor) {
    drawInteractPrompt(ctx, charScreenX, charScreenY, `[E] Enter ${gs.nearDoor === 'homey' ? 'homey.' : gs.nearDoor === 'advsr' ? 'advsr' : 'acquire'}`)
  }
}


// ─── Interior Renderer ────────────────────────────────────────────────────────
function drawInterior(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  gs: GameState,
  interiorMap: TileType[][]
) {
  const scene = gs.scene as 'homey' | 'advsr' | 'acquire'
  const [charSX, charSY] = isoToScreen(gs.charTileX, gs.charTileY, 0, 0)
  const originX = cw / 2 - charSX
  const originY = ch / 2 - charSY + 60

  // Background
  const bgColor = scene === 'homey' ? '#0A0805' : scene === 'advsr' ? '#080D0D' : '#0A0908'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, cw, ch)

  // Floor tiles
  const floorColor = scene === 'homey' ? '#2A1A0A' : scene === 'advsr' ? '#111117' : '#1A1510'
  const floorLine  = scene === 'homey' ? '#351F0D' : scene === 'advsr' ? '#181820' : '#221A14'

  for (let r = 1; r < INTERIOR_H - 1; r++) {
    for (let c = 1; c < INTERIOR_W - 1; c++) {
      const [sx, sy] = isoToScreen(c, r, originX, originY)
      if (interiorMap[r][c] === 'solid') continue
      drawIsoTile(ctx, sx, sy, floorColor, floorLine)
      
      // Grain / Shading
      if ((r + c) % 3 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)'
        ctx.fillRect(sx - 10, sy + 15, 20, 1)
      }
    }
  }

  // Light Shafts
  drawLightShaft(ctx, cw * 0.2, 0, 150, ch)
  drawLightShaft(ctx, cw * 0.7, 0, 100, ch)

  // North wall (back)
  {
    const wallColor = scene === 'homey' ? '#1A0D05' : scene === 'advsr' ? '#0A1010' : '#151008'
    const [x0, y0] = isoToScreen(1,           0, originX, originY)
    const [x1, y1] = isoToScreen(INTERIOR_W-1, 0, originX, originY)
    const wallH = 80
    ctx.fillStyle = wallColor
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x1, y1 - wallH)
    ctx.lineTo(x0, y0 - wallH)
    ctx.closePath()
    ctx.fill()

    // Baseboard/Molding
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1)
    ctx.stroke()

    // Advsr: NYC skyline on north wall
    if (scene === 'advsr') {
      const heights = [30, 50, 35, 60, 25, 45, 38, 55, 20, 48]
      for (let i = 0; i < 10; i++) {
        const bx = x0 + (x1 - x0) * (i / 10)
        const bw = (x1 - x0) / 10 - 2
        ctx.fillStyle = '#0D1820'
        ctx.fillRect(bx, y0 - heights[i], bw, heights[i])
        // windows
        ctx.fillStyle = `rgba(74,124,89,${Math.sin(gs.time + i) * 0.2 + 0.3})`
        for (let wr = 0; wr < 3; wr++)
          ctx.fillRect(bx + 2, y0 - heights[i] + 5 + wr * 10, 3, 3)
      }
    }

    // homey: bookshelf wall art
    if (scene === 'homey') {
      const frameX = x0 + (x1 - x0) * 0.3
      ctx.strokeStyle = C.sandDark
      ctx.lineWidth = 2
      ctx.strokeRect(frameX, y0 - 55, 40, 40)
      ctx.fillStyle = 'rgba(200, 160, 80, 0.1)'
      ctx.fillRect(frameX + 1, y0 - 54, 38, 38)
    }
  }

  // West wall (left)
  {
    const wallColor = scene === 'homey' ? '#150A03' : scene === 'advsr' ? '#080D0D' : '#100D06'
    const [x0, y0] = isoToScreen(0, 0,            originX, originY)
    const [x1, y1] = isoToScreen(0, INTERIOR_H-1, originX, originY)
    const wallH = 80
    ctx.fillStyle = wallColor
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x1, y1 - wallH)
    ctx.lineTo(x0, y0 - wallH)
    ctx.closePath()
    ctx.fill()

    // Advsr: client board on west wall
    if (scene === 'advsr') {
      const bx = x0 + 10, by = (y0 + y1) / 2 - 50
      ctx.fillStyle = '#141A14'
      ctx.fillRect(bx, by, 60, 70)
      ctx.strokeStyle = C.border
      ctx.lineWidth = 1
      ctx.strokeRect(bx, by, 60, 70)
      const dotColors = [C.green, C.sandMuted, C.red, C.sand, C.textMuted]
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = dotColors[i]
        ctx.beginPath()
        ctx.arc(bx + 10, by + 10 + i * 12, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = C.textMuted
        ctx.font = '7px Inter, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('─────────', bx + 16, by + 13 + i * 12)
      }
    }

    // Acquire: pipeline board
    if (scene === 'acquire') {
      const bx = x0 + 8, by = (y0 + y1) / 2 - 45
      const cols = ['NEW', 'ACTIVE', 'WON']
      cols.forEach((label, i) => {
        const cx = bx + i * 22
        ctx.fillStyle = '#1A1510'
        ctx.fillRect(cx, by, 18, 60)
        ctx.strokeStyle = C.border
        ctx.lineWidth = 0.5
        ctx.strokeRect(cx, by, 18, 60)
        ctx.font = '5px Inter, sans-serif'
        ctx.fillStyle = C.textMuted
        ctx.textAlign = 'center'
        ctx.fillText(label, cx + 9, by + 7)
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = C.sandDark
          ctx.fillRect(cx + 2, by + 12 + j * 15, 14, 10)
        }
      })
    }
  }

  // Furniture & objects
  if (scene === 'advsr') {
    // Rug
    const [rx, ry] = isoToScreen(4, 4, originX, originY)
    ctx.fillStyle = '#111A1A'
    ctx.beginPath()
    ctx.moveTo(rx, ry); ctx.lineTo(rx + TW2 * 4, ry + TH2 * 4); ctx.lineTo(rx, ry + TILE_H * 4); ctx.lineTo(rx - TW2 * 4, ry + TH2 * 4); ctx.closePath()
    ctx.fill()
  }

  if (scene === 'homey') {
    // Rug
    const [rx, ry] = isoToScreen(4, 4, originX, originY)
    ctx.fillStyle = '#4A3A2A'
    ctx.beginPath()
    ctx.moveTo(rx, ry)
    ctx.lineTo(rx + TW2 * 6, ry + TH2 * 6)
    ctx.lineTo(rx, ry + TILE_H * 6)
    ctx.lineTo(rx - TW2 * 6, ry + TH2 * 6)
    ctx.closePath()
    ctx.fill()

    // Couch
    drawIsoBox(ctx, 5, 5, 2, 1, 0.6, {
      top: C.sandMuted, left: '#7A6040', right: '#6A5030'
    }, originX, originY)

    // Floor Lamp Glow
    const [lx, ly] = isoToScreen(2, 2, originX, originY)
    const lGlow = Math.sin(gs.time) * 0.1 + 0.9
    const grdL = ctx.createRadialGradient(lx, ly - 40, 0, lx, ly - 40, 30)
    grdL.addColorStop(0, `rgba(200, 184, 154, ${0.1 * lGlow})`)
    grdL.addColorStop(1, 'rgba(200,184,154,0)')
    ctx.fillStyle = grdL
    ctx.beginPath(); ctx.arc(lx, ly - 40, 30, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = C.sandDark
    ctx.fillRect(lx - 1, ly - 40, 2, 40)
    ctx.fillRect(lx - 4, ly - 45, 8, 5)
    // Bookshelf
    drawIsoBox(ctx, 3, 3, 1, 1, 1.5, {
      top: '#2A1A0A', left: '#1A0D05', right: '#150A03'
    }, originX, originY)
    // Screen glow
    const pulse = Math.sin(gs.time * 1.2) * 0.2 + 0.8
    const [sx2, sy2] = isoToScreen(6, 2, originX, originY)
    const grd = ctx.createRadialGradient(sx2, sy2 - 30, 0, sx2, sy2 - 30, 40)
    grd.addColorStop(0, `rgba(200, 184, 154, ${0.15 * pulse})`)
    grd.addColorStop(1, 'rgba(200,184,154,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(sx2, sy2 - 30, 40, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(200,184,154,${0.7 * pulse})`
    ctx.fillRect(sx2 - 25, sy2 - 55, 50, 35)
    ctx.font = 'italic bold 14px "Playfair Display", serif'
    ctx.fillStyle = C.bg
    ctx.textAlign = 'center'
    ctx.fillText('homey.', sx2, sy2 - 33)
  }

  if (scene === 'advsr') {
    // Desk
    drawIsoBox(ctx, 6, 5, 2, 1, 0.5, {
      top: C.sandDark, left: '#6A5040', right: '#5A4030'
    }, originX, originY)
    // Monitor
    const [mx, my] = isoToScreen(6.5, 5, originX, originY)
    ctx.fillStyle = '#0A0A0A'
    ctx.fillRect(mx - 15, my - 45, 28, 20)
    ctx.fillStyle = `rgba(74,124,89,${0.5 + Math.sin(gs.time) * 0.2})`
    ctx.fillRect(mx - 13, my - 43, 24, 16)
    ctx.font = '5px Inter, sans-serif'
    ctx.fillStyle = C.text
    ctx.textAlign = 'center'
    ctx.fillText('advsr', mx, my - 33)
  }

  if (scene === 'acquire') {
    // Blueprint table
    drawIsoBox(ctx, 5, 5, 2, 2, 0.5, {
      top: '#2A2520', left: '#1A1510', right: '#141008'
    }, originX, originY)
    
    // Scattered blueprint clutter
    for(let i=0; i<3; i++) {
       const [px, py] = isoToScreen(4 + i*0.8, 4 + i*0.4, originX, originY)
       ctx.fillStyle = 'rgba(200, 200, 220, 0.8)'
       ctx.fillRect(px - 10, py - 10, 15, 10)
    }
    // Paper on table
    const [bx2, by2] = isoToScreen(5.5, 5.5, originX, originY)
    ctx.fillStyle = '#C8C0A8'
    ctx.fillRect(bx2 - 20, by2 - 18, 35, 25)
    ctx.strokeStyle = '#8A9AB0'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(bx2 - 18, by2 - 14 + i * 5)
      ctx.lineTo(bx2 + 12, by2 - 14 + i * 5)
      ctx.stroke()
    }
    // Hard hat
    const [hx, hy] = isoToScreen(2, 8, originX, originY)
    ctx.fillStyle = '#C87820'
    ctx.beginPath()
    ctx.arc(hx, hy - 10, 10, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#A86010'
    ctx.fillRect(hx - 12, hy - 10, 24, 4)
  }

  // Exit door tile visual
  {
    const [dx, dy] = isoToScreen(5, INTERIOR_H - 1, originX, originY)
    ctx.fillStyle = C.border
    ctx.fillRect(dx - 10, dy - 20, 20, 22)
    ctx.fillStyle = C.sandDark
    ctx.font = '7px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('EXIT', dx + TW2 / 2, dy - 5)
  }

  // Footprints for interior
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  gs.trails.forEach(t => {
    const [sx, sy] = isoToScreen(t.x, t.y, originX, originY)
    ctx.globalAlpha = Math.max(0, 1 - (t.age / 1.5))
    ctx.beginPath()
    ctx.ellipse(sx, sy + 3, 5, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  // Character
  const charScreenX = cw / 2
  const charScreenY = ch / 2 + 60
  drawCharacter(ctx, charScreenX, charScreenY, gs.direction, gs.moving, gs.time)

  // Prompt
  if (gs.nearInteract) {
    drawInteractPrompt(ctx, charScreenX, charScreenY, '[E] Open app')
  } else if (gs.nearExit) {
    drawInteractPrompt(ctx, charScreenX, charScreenY, '[E] Exit')
  }

  // Ghost Info Bubble
  if (gs.nearGhost) {
    const [gx, gy] = isoToScreen(gs.nearGhost.x, gs.nearGhost.y, originX, originY)
    drawGhostPrompt(ctx, gx, gy, gs.nearGhost, gs.time)
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, cw: number, ch: number, gs: GameState) {
  // Founder Ticker
  if (gs.scene === 'overworld') {
    ctx.fillStyle = 'rgba(0,0,0,0.85)'
    ctx.fillRect(0, 0, cw, 40)
    ctx.strokeStyle = C.sand
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(cw, 40); ctx.stroke()

    ctx.fillStyle = C.text
    ctx.font = '500 10px Inter, sans-serif'
    ctx.textAlign = 'left'
    const statsStr = `UNIVERSE MONITOR | BUYERS: ${gs.stats.buyers} | RENTERS: ${gs.stats.renters} | AGENTS: ${gs.stats.agentClients} | ACTIVE ANALYSES: 12`
    ctx.fillText(statsStr, 20, 25)

    // Pulse
    const pulse = Math.sin(gs.time * 2) * 0.2 + 0.8
    ctx.fillStyle = C.green
    ctx.beginPath(); ctx.arc(cw - 30, 23, 4 * pulse, 0, Math.PI * 2); ctx.fill()
  }

  // Controls hint
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(20, ch - 50, 220, 30)
  ctx.fillStyle = C.textMuted
  ctx.font = '8px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('WASD: MOVE | SHIFT: SPRINT | M/Z: SATELLITE VIEW', 30, ch - 32)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorldPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null)
  const overlayRef = useRef<string | null>(null)

  useEffect(() => {
    overlayRef.current = activeOverlay
  }, [activeOverlay])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!

    // Resize handler
    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Build maps
    const overworldMap = buildOverworldMap()
    const interiorMaps: Record<string, TileType[][]> = {
      homey:   buildInteriorMap('homey'),
      advsr:   buildInteriorMap('advsr'),
      acquire: buildInteriorMap('acquire'),
    }

    // Collision helpers
    function isSolid(map: TileType[][], r: number, c: number): boolean {
      if (r < 0 || r >= map.length || c < 0 || c >= (map[0]?.length ?? 0)) return true
      const t = map[r][c]
      return t === 'solid'
    }

    function isDoor(map: TileType[][], r: number, c: number): '' | 'homey' | 'advsr' | 'acquire' {
      if (r < 0 || r >= map.length || c < 0 || c >= (map[0]?.length ?? 0)) return ''
      const t = map[r][c]
      if (t === 'door_homey')   return 'homey'
      if (t === 'door_advsr')   return 'advsr'
      if (t === 'door_acquire') return 'acquire'
      return ''
    }

    function isInteract(map: TileType[][], r: number, c: number): '' | 'homey' | 'advsr' | 'acquire' {
      if (r < 0 || r >= map.length || c < 0 || c >= (map[0]?.length ?? 0)) return ''
      const t = map[r][c]
      if (t === 'interact_homey')   return 'homey'
      if (t === 'interact_advsr')   return 'advsr'
      if (t === 'interact_acquire') return 'acquire'
      return ''
    }

    function isExit(map: TileType[][], r: number, c: number): boolean {
      if (r < 0 || r >= map.length || c < 0 || c >= (map[0]?.length ?? 0)) return false
      return map[r][c] === 'exit'
    }

    // Game state
    const gs: GameState = {
      scene: 'overworld',
      charTileX: 15, charTileY: 18,
      targetTileX: 15, targetTileY: 18,
      prevTileX: 15, prevTileY: 18,
      moving: false,
      moveProgress: 0,
      direction: 'S',
      fadeAlpha: 0,
      fadingOut: false,
      fadingIn: false,
      fadeScene: 'overworld',
      fadeLabel: '',
      time: 0,
      zoom: 1,
      nearDoor: '',
      nearInteract: '',
      nearExit: false,
      spawnedTrail: false,
      trails: [] as Trail[],
      stats: {
        buyers: 12,
        renters: 5,
        agentClients: 3,
        activeListings: 8,
      },
      ghosts: [] as Ghost[],
      nearGhost: null,
      selectionMode: null,
    }

    const keys = new Set<string>()
    let moveCooldown = 0
    let eJustPressed = false
    let eWasDown = false

    // Fetch Ecosystem Data
    async function loadUniverse() {
      const supabase = createClient()
      try {
        const { count: bc } = await supabase.from('buyer_profiles').select('*', { count: 'exact', head: true })
        const { count: rc } = await supabase.from('renter_profiles').select('*', { count: 'exact', head: true })
        const { count: ac } = await supabase.from('agent_clients').select('*', { count: 'exact', head: true })
        
        // Fetch ALL profiles to turn into ghosts
        const { data: usersRaw } = await supabase.from('profiles').select('id, full_name, role').order('created_at', { ascending: false })
        const users = (usersRaw as any[]) || []
        
        if (bc !== null) gs.stats.buyers = bc
        if (rc !== null) gs.stats.renters = rc
        if (ac !== null) gs.stats.agentClients = ac

        if (users) {
          gs.ghosts = users.map((u, i) => {
            // Spread ghosts across the whole map grid
            const gridX = 2 + (Math.floor(i * 1.61803) % (MAP_SIZE - 4))
            const gridY = 2 + (Math.floor(i * 2.71828) % (MAP_SIZE - 4))
            
            return {
              id: u.id,
              name: u.full_name || 'Anonymous',
              role: (u.role as 'buyer' | 'renter') || 'buyer',
              x: gridX,
              y: gridY,
              readiness: 40 + Math.floor(Math.random() * 50),
              fear: ['Market Volatility', 'Down Payment', 'Hidden Fees', 'Property Taxes', 'Bidding Wars', 'Renovation Costs'][i % 6],
              timeOffset: Math.random() * 100,
            }
          })
        }
      } catch (err) {
        console.error('God Mode: Failed to fetch universe data', err)
      }
    }
    loadUniverse()

    function onKey(e: KeyboardEvent, down: boolean) {
      keys[down ? 'add' : 'delete'](e.key.toLowerCase())
      if (e.key.toLowerCase() === 'e') {
        if (down && !eWasDown) eJustPressed = true
        eWasDown = down
      }
      // Prevent page scroll on WASD
      if (['w','a','s','d',' '].includes(e.key.toLowerCase())) e.preventDefault()
    }

    window.addEventListener('keydown', e => onKey(e, true))
    window.addEventListener('keyup',   e => onKey(e, false))

    let animFrame: number
    let lastTime = 0

    function getMap(): TileType[][] {
      if (gs.scene === 'overworld') return overworldMap
      return interiorMaps[gs.scene] ?? overworldMap
    }

    function update(dt: number) {
      gs.time += dt
      moveCooldown = Math.max(0, moveCooldown - dt)

      // Fade transitions
      if (gs.fadingOut) {
        gs.fadeAlpha = Math.min(1, gs.fadeAlpha + dt * 2.5)
        if (gs.fadeAlpha >= 1) {
          gs.fadingOut = false
          gs.fadingIn = true
          // Switch scene
          gs.scene = gs.fadeScene
          if (gs.scene === 'overworld') {
            gs.charTileX = 15; gs.charTileY = 18
          } else {
            gs.charTileX = 5; gs.charTileY = 8
          }
          gs.targetTileX = gs.charTileX
          gs.targetTileY = gs.charTileY
          gs.prevTileX = gs.charTileX
          gs.prevTileY = gs.charTileY
          gs.moving = false
        }
        return
      }

      if (gs.fadingIn) {
        gs.fadeAlpha = Math.max(0, gs.fadeAlpha - dt * 2)
        if (gs.fadeAlpha <= 0) gs.fadingIn = false
        return
      }

      // Satellite Zoom
      const targetZoom = keys.has('m') || keys.has('z') ? 0.4 : 1
      gs.zoom += (targetZoom - gs.zoom) * 0.1

      // Smooth movement interpolation
      const currentSpeed = keys.has('shift') ? 8 : MOVE_SPEED
      if (gs.moving) {
        gs.moveProgress = Math.min(1, gs.moveProgress + dt * currentSpeed)
        gs.charTileX = gs.prevTileX + (gs.targetTileX - gs.prevTileX) * gs.moveProgress
        gs.charTileY = gs.prevTileY + (gs.targetTileY - gs.prevTileY) * gs.moveProgress
        
        // Spawn footprint halfway through move step
        if (gs.moveProgress > 0.5 && !gs.spawnedTrail) {
          gs.trails.push({ x: gs.charTileX, y: gs.charTileY, age: 0 })
          gs.spawnedTrail = true
        }
        
        if (gs.moveProgress >= 1) {
          gs.charTileX = gs.targetTileX
          gs.charTileY = gs.targetTileY
          gs.prevTileX = gs.targetTileX
          gs.prevTileY = gs.targetTileY
          gs.moving = false
          gs.spawnedTrail = false
        }
      }

      // Update old trails
      gs.trails.forEach(t => t.age += dt)
      gs.trails = gs.trails.filter(t => t.age < 1.5)

      // Input → movement
      if (!gs.moving && moveCooldown <= 0 && !overlayRef.current) {
        const map = getMap()
        let dx = 0, dy = 0, dir: Dir = gs.direction

        if (keys.has('w')) { dx = -1; dy = -1; dir = 'N' }
        else if (keys.has('s')) { dx = 1;  dy = 1;  dir = 'S' }
        else if (keys.has('a')) { dx = -1; dy = 1;  dir = 'W' }
        else if (keys.has('d')) { dx = 1;  dy = -1; dir = 'E' }

        gs.direction = dir

        if (dx !== 0 || dy !== 0) {
          const nx = Math.round(gs.charTileX) + dx
          const ny = Math.round(gs.charTileY) + dy
          if (!isSolid(map, ny, nx)) {
            gs.prevTileX = gs.charTileX
            gs.prevTileY = gs.charTileY
            gs.targetTileX = nx
            gs.targetTileY = ny
            gs.moving = true
            gs.moveProgress = 0
            moveCooldown = 0.05
          }
        }
      }

      // Check nearby tiles
      const tx = Math.round(gs.charTileX)
      const ty = Math.round(gs.charTileY)
      const map = getMap()

      gs.nearDoor = ''
      gs.nearInteract = ''
      gs.nearExit = false

      if (gs.scene === 'overworld') {
        // Check current + adjacent tiles for door
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const d = isDoor(map, ty + dr, tx + dc)
            if (d) { gs.nearDoor = d; break }
          }
          if (gs.nearDoor) break
        }
      } else {
        // Check interact
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const i = isInteract(map, ty + dr, tx + dc)
            if (i) { gs.nearInteract = i; break }
          }
          if (gs.nearInteract) break
        }
        // Check exit
        if (isExit(map, ty, tx) || isExit(map, ty + 1, tx) || isExit(map, ty, tx + 1)) {
          gs.nearExit = true
        }
      }

      // E key interactions
      if (eJustPressed) {
        eJustPressed = false
        if (gs.nearDoor && !gs.fadingOut && !gs.fadingIn) {
          gs.fadingOut = true
          gs.fadeScene = gs.nearDoor
          const labels: Record<string, string> = {
            homey: 'entering homey.',
            advsr: 'entering homey. advsr',
            acquire: 'entering homey.acquire',
          }
          gs.fadeLabel = labels[gs.nearDoor] ?? ''
        } else if (gs.nearInteract) {
          gs.selectionMode = gs.nearInteract
        } else if (gs.nearExit && gs.scene !== 'overworld') {
          gs.fadingOut = true
          gs.fadeScene = 'overworld'
          gs.fadeLabel = 'returning to the street'
        }
      }
      
      // Near Ghost detection
      if (gs.scene === 'overworld') {
        gs.nearGhost = gs.ghosts.find(g => Math.hypot(g.x - gs.charTileX, g.y - gs.charTileY) < 1.5) || null
      } else {
        gs.nearGhost = null
      }
    }

    function draw(cw: number, ch: number) {
      ctx.clearRect(0, 0, cw, ch)

      ctx.save()
      if (gs.zoom !== 1) {
        ctx.translate(cw / 2, ch / 2)
        ctx.scale(gs.zoom, gs.zoom)
        ctx.translate(-cw / 2, -ch / 2)
      }

      if (gs.scene === 'overworld') {
        drawOverworld(ctx, cw, ch, gs, overworldMap)
      } else {
        const scene = gs.scene as 'homey' | 'advsr' | 'acquire'
        drawInterior(ctx, cw, ch, gs, interiorMaps[scene])
      }
      ctx.restore()

      drawHUD(ctx, cw, ch, gs)

      // Fade overlay
      if (gs.fadeAlpha > 0) {
        ctx.fillStyle = `rgba(13, 13, 11, ${gs.fadeAlpha})`
        ctx.fillRect(0, 0, cw, ch)

        if (gs.fadeAlpha > 0.6 && gs.fadeLabel) {
          const labelAlpha = Math.min(1, (gs.fadeAlpha - 0.6) / 0.4)
          ctx.globalAlpha = labelAlpha
          ctx.font = 'italic 18px "Playfair Display", serif'
          ctx.fillStyle = C.sand
          ctx.textAlign = 'center'
          ctx.fillText(gs.fadeLabel, cw / 2, ch / 2)
          ctx.font = '11px Inter, sans-serif'
          ctx.fillStyle = C.textMuted
          ctx.fillText('· · ·', cw / 2, ch / 2 + 24)
          ctx.globalAlpha = 1
        }
      }
    }

    function loop(timestamp: number) {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
      lastTime = timestamp
      const cw = canvas?.width  ?? window.innerWidth
      const ch = canvas?.height ?? window.innerHeight
      update(dt)
      draw(cw, ch)

      if (gs.selectionMode) {
        setSelection(gs.selectionMode)
        gs.selectionMode = null
      }

      animFrame = requestAnimationFrame(loop)
    }

    animFrame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', e => onKey(e, true))
      window.removeEventListener('keyup',   e => onKey(e, false))
    }
  }, [])

  const [founderMode, setFounderMode] = useState(false)
  const [selection, setSelection] = useState<'homey' | 'advsr' | 'acquire' | null>(null)

  // Sync state from game loop to React
  useEffect(() => {
    const timer = setInterval(() => {
      // Use a ref-like pattern in the future or just polls for simplicity
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full h-screen bg-[#0D0D0B] overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0D0D0B; overflow: hidden; }
        canvas { display: block; cursor: none; }
      `}</style>
      <canvas ref={canvasRef} />

      {/* Founder Selection UI */}
      {selection && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[400px] bg-[#0A0A0A] border border-[#C8B89A]/30 p-8 rounded-lg shadow-2xl text-center">
            <h2 className="text-[#C8B89A] font-serif italic text-2xl mb-2">Entry Authorized</h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-8">Homey Universe Access Protocol</p>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  setFounderMode(false)
                  setActiveOverlay(selection)
                  setSelection(null)
                }}
                className="group relative h-16 border border-[#2A2A27] bg-[#111] hover:border-[#C8B89A] transition-all flex flex-col items-center justify-center px-6"
              >
                <span className="text-white font-medium text-xs">CONSUMER EXPERIENCE</span>
                <span className="text-[9px] text-[#555] group-hover:text-[#C8B89A]/60 transition-colors">Launch standard production portal</span>
              </button>

              <button 
                onClick={() => {
                  setFounderMode(true)
                  setActiveOverlay(selection)
                  setSelection(null)
                }}
                className="group relative h-16 border border-[#C8B89A]/20 bg-[#1A1A17] hover:border-[#C8B89A] transition-all flex flex-col items-center justify-center px-6"
              >
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C8B89A] animate-pulse" />
                <span className="text-[#C8A050] font-bold text-xs">FOUNDER DASHBOARD</span>
                <span className="text-[9px] text-[#C8B89A]/40 group-hover:text-[#C8B89A]/60 transition-colors">Access universe telemetry & health</span>
              </button>

              <button 
                onClick={() => setSelection(null)}
                className="mt-4 text-[10px] text-[#555] hover:text-white transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                CANCEL ACCESS
              </button>
            </div>
          </div>
        </div>
      )}

      {activeOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto transition-opacity duration-300">
          <div className="relative w-[95vw] h-[95vh] bg-[#0A0A0A] border border-[#2A2A27] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Mac-style Window Header */}
            <div className="shrink-0 h-10 border-b border-[#1a1a1a] flex items-center justify-between px-4 bg-[#111]">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setActiveOverlay(null)
                    setFounderMode(false)
                  }}
                  className="w-3 h-3 rounded-full bg-[#ED6A5E] hover:bg-[#D55F54] transition-colors flex items-center justify-center focus:outline-none cursor-pointer"
                />
                <div className="w-3 h-3 rounded-full bg-[#F4BF4F]" />
                <div className="w-3 h-3 rounded-full bg-[#61C554]" />
              </div>
              <div className="flex items-center gap-2">
                {founderMode && <div className="px-2 py-0.5 rounded-full bg-[#C8A050]/20 border border-[#C8A050]/40 text-[#C8A050] text-[8px] font-bold tracking-widest uppercase">Founder Mode Access</div>}
                <span className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">
                  {activeOverlay === 'homey' ? 'homey. OS' : activeOverlay === 'advsr' ? 'homey. advsr' : 'homey. acquire'}
                </span>
              </div>
              <div className="w-4" />
            </div>

            {/* Embedded Screen */}
            <div className="flex-1 w-full h-full bg-[#0D0D0B] relative">
              <iframe 
                src={
                  founderMode ? (
                    activeOverlay === 'homey' ? '/founder/buyers' :
                    activeOverlay === 'advsr' ? '/founder/agents' :
                    '/founder/listings'
                  ) : (
                    activeOverlay === 'homey' ? '/' :
                    activeOverlay === 'advsr' ? '/agent' :
                    'http://localhost:3001'
                  )
                } 
                className="w-full h-full border-none" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
