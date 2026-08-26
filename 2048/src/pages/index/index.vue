<template>
  <div class="page" @touchstart="onTouchStart" @touchend="onTouchEnd" @swipe="onSwipe">
    <div class="layout-container" :style="containerStyle">
      <div class="board-col" :style="boardColStyle">
        <div class="board" :style="boardStyle">
          <div class="grid">
            <div class="grid-row" v-for="ri in gridRows" :key="'r'+ri" :style="gridRowStyle(ri)">
              <div class="cell" v-for="ci in gridRows" :key="'c'+ri+'-'+ci" :style="cellStyle(ci)"></div>
            </div>
          </div>
          <div class="tiles-layer" :style="tilesLayerStyle">
            <div class="tile" v-for="tile in tiles" :key="tile.id" :style="tileStyle(tile)">
              <div class="tile-inner" :class="[tile.isNew ? 'pop-in' : '', tile.isMerged ? 'merge-pop' : '']" :style="tileInnerStyle(tile)">
                <text class="tile-text" :style="tileTextStyle(tile)">{{ tile.displayValue }}</text>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="middle-col" :style="middleColStyle">
        <div class="score-box" :style="scoreBoxStyle" :class="scorePulse ? 'score-pulse' : ''">
          <text class="score-label">SCORE</text>
          <text class="score-value">{{ score }}</text>
          <text v-if="showGain" class="score-gain" :style="scoreGainStyle">+{{ lastGain }}</text>
        </div>
        <div class="score-box" :style="scoreBoxStyle">
          <text class="score-label">BEST</text>
          <text class="score-value">{{ best }}</text>
        </div>
        <div class="reset-btn" @click="initBoard" :style="resetBtnStyle">
          <text class="reset-text">新游戏</text>
        </div>
      </div>
      <div class="dpad-col" :style="dpadColStyle">
        <div class="dpad">
          <div class="dpad-row">
            <div class="dpad-spacer" :style="dpadItemStyle(true)"></div>
            <div class="dpad-btn" @click="onPad('up')" :style="dpadItemStyle(false)">
              <text class="dpad-text">▲</text>
            </div>
            <div class="dpad-spacer" :style="dpadItemStyle(true)"></div>
          </div>
          <div class="dpad-row">
            <div class="dpad-btn" @click="onPad('left')" :style="dpadItemStyle(false)">
              <text class="dpad-text">◀</text>
            </div>
            <div class="dpad-spacer" :style="dpadItemStyle(true)"></div>
            <div class="dpad-btn" @click="onPad('right')" :style="dpadItemStyle(false)">
              <text class="dpad-text">▶</text>
            </div>
          </div>
          <div class="dpad-row">
            <div class="dpad-spacer" :style="dpadItemStyle(true)"></div>
            <div class="dpad-btn" @click="onPad('down')" :style="dpadItemStyle(false)">
              <text class="dpad-text">▼</text>
            </div>
            <div class="dpad-spacer" :style="dpadItemStyle(true)"></div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showWin" class="modal">
      <div class="modal-box">
        <text class="modal-msg">YOU WIN!</text>
        <div class="reset-btn" @click="continueGame" :style="resetBtnStyle" style="margin-top:8px">
          <text class="reset-text">继续</text>
        </div>
      </div>
    </div>
    <div v-if="showOver" class="modal">
      <div class="modal-box">
        <text class="modal-msg">Game Over !</text>
        <div class="reset-btn" @click="initBoard" :style="resetBtnStyle" style="margin-top:8px">
          <text class="reset-text">新游戏</text>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { SIZE, performMove, buildValueGrid, isGameOver } from '@/game/logic.js'
const MOVE_MS = 120
const TILE_THEME = {
  2: { bg: '#eee4da', color: '#776e65' },
  4: { bg: '#ede0c8', color: '#776e65' },
  8: { bg: '#f2b179', color: '#f9f6f2' },
  16: { bg: '#f59563', color: '#f9f6f2' },
  32: { bg: '#f67c5f', color: '#f9f6f2' },
  64: { bg: '#f65e3b', color: '#f9f6f2' },
  128: { bg: '#edcf72', color: '#f9f6f2' },
  256: { bg: '#edcc61', color: '#f9f6f2' },
  512: { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
  4096: { bg: '#3c3a32', color: '#f9f6f2' },
  8192: { bg: '#2c2a24', color: '#f9f6f2' }
}
function readEnvSize() {
  let dw = 0, dh = 0
  try {
    const env = (typeof weex !== 'undefined' && weex.config && weex.config.env) || (typeof $falcon !== 'undefined' && $falcon.env) || {}
    dw = Number(env.deviceWidth || env.screenWidth || 0)
    dh = Number(env.deviceHeight || env.screenHeight || 0)
  } catch (e) {}
  return { dw, dh }
}
function computeLayout() {
  const vw = 750
  const size = readEnvSize()
  let realW = size.dw || 640
  let realH = size.dh || 172
  let vh = Math.round(vw * realH / realW)
  if (vh > 250) vh = 210
  const pad = 8
  const gap = 12
  const boardMax = Math.min(vh - pad * 2, 200)
  const boardPad = Math.round(boardMax * 0.05)
  const cellGap = Math.round(boardMax * 0.03)
  const cellSize = Math.floor((boardMax - boardPad * 2 - cellGap * 3) / 4)
  const boardInner = cellSize * 4 + cellGap * 3
  const boardOuter = boardInner + boardPad * 2
  const dpadBtn = Math.floor((vh - pad * 2 - 12) / 3)
  const dpadW = dpadBtn * 3 + 12
  const middleW = 125
  return { vw, vh, pad, gap, middleW, dpadW, boardOuter, boardInner, boardPad, cellGap, cellSize, dpadBtn }
}
export default {
  data() {
    return {
      layout: computeLayout(),
      gridRows: [0, 1, 2, 3],
      tiles: [],
      nextId: 1,
      score: 0,
      best: 0,
      lastGain: 0,
      showGain: false,
      scorePulse: false,
      showWin: false,
      showOver: false,
      locked: false,
      winNotified: false,
      touchX: 0,
      touchY: 0
    }
  },
  computed: {
    containerStyle() {
      return {
        flexDirection: 'row', width: this.layout.vw + 'px', height: this.layout.vh + 'px',
        padding: this.layout.pad + 'px', alignItems: 'center', justifyContent: 'space-around'
      }
    },
    boardColStyle() {
      return { width: this.layout.boardOuter + 'px', alignItems: 'center', justifyContent: 'center' }
    },
    boardStyle() {
      return {
        width: this.layout.boardOuter + 'px', height: this.layout.boardOuter + 'px',
        backgroundColor: '#bbada0', borderRadius: '12px', padding: this.layout.boardPad + 'px', position: 'relative'
      }
    },
    tilesLayerStyle() {
      return { position: 'absolute', top: this.layout.boardPad + 'px', left: this.layout.boardPad + 'px', width: this.layout.boardInner + 'px', height: this.layout.boardInner + 'px' }
    },
    middleColStyle() {
      return { width: this.layout.middleW + 'px', alignItems: 'center', justifyContent: 'center' }
    },
    dpadColStyle() {
      return { width: this.layout.dpadW + 'px', alignItems: 'center', justifyContent: 'center' }
    },
    scoreBoxStyle() {
      return {
        width: (this.layout.middleW - 8) + 'px', backgroundColor: '#bbada0', borderRadius: '8px',
        padding: '6px 0', alignItems: 'center', marginBottom: '8px', position: 'relative'
      }
    },
    scoreGainStyle() {
      return { position: 'absolute', left: '0', right: '0', textAlign: 'center', top: '-4px' }
    },
    resetBtnStyle() {
      return {
        width: (this.layout.middleW - 8) + 'px', backgroundColor: '#8f7a66', borderRadius: '999px',
        padding: '8px 0', alignItems: 'center', marginTop: '6px'
      }
    }
  },
  mounted() {
    this.layout = computeLayout()
    this.initBoard()
  },
  methods: {
    onShow() { this.layout = computeLayout() },
    initBoard() {
      this.tiles = []
      this.score = 0
      this.showWin = this.showOver = this.locked = this.winNotified = false
      this.addTile(true)
      this.addTile(true)
    },
    addTile(isNew = false) {
      const occupied = {}
      this.tiles.forEach(t => occupied[t.r + ',' + t.c] = true)
      const empty = []
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!occupied[r + ',' + c]) empty.push({ r, c })
      if (!empty.length) return
      const p = empty[Math.floor(Math.random() * empty.length)]
      const val = Math.random() < 0.9 ? 2 : 4
      this.tiles.push({ id: this.nextId++, r: p.r, c: p.c, value: val, displayValue: val, isNew: isNew, isMerged: false })
    },
    gridRowStyle(ri) {
      return { flexDirection: 'row', marginBottom: ri === 3 ? '0px' : this.layout.cellGap + 'px' }
    },
    cellStyle(ci) {
      return {
        width: this.layout.cellSize + 'px', height: this.layout.cellSize + 'px',
        marginRight: ci === 3 ? '0px' : this.layout.cellGap + 'px',
        backgroundColor: '#cdc1b4', borderRadius: '8px'
      }
    },
    tileStyle(t) {
      return {
        position: 'absolute', width: this.layout.cellSize + 'px', height: this.layout.cellSize + 'px',
        transform: `translate(${t.c * (this.layout.cellSize + this.layout.cellGap)}px, ${t.r * (this.layout.cellSize + this.layout.cellGap)}px)`,
        transitionProperty: 'transform', transitionDuration: MOVE_MS + 'ms', transitionTimingFunction: 'ease-in-out'
      }
    },
    tileInnerStyle(t) {
      const theme = TILE_THEME[t.displayValue] || { bg: '#3c3a32', color: '#f9f6f2' }
      return {
        width: '100%', height: '100%', backgroundColor: theme.bg, borderRadius: '8px', justifyContent: 'center', alignItems: 'center'
      }
    },
    tileTextStyle(t) {
      const theme = TILE_THEME[t.displayValue] || { bg: '#3c3a32', color: '#f9f6f2' }
      const len = String(t.displayValue).length
      const fs = len > 3 ? 0.35 : (len > 2 ? 0.45 : 0.55)
      return { fontSize: Math.round(this.layout.cellSize * fs) + 'px', color: theme.color, fontWeight: '800' }
    },
    dpadItemStyle(spacer) {
      const s = this.layout.dpadBtn + 'px'
      return {
        width: s, height: s, margin: '2px',
        backgroundColor: spacer ? 'transparent' : '#8f7a66',
        borderRadius: '12px', justifyContent: 'center', alignItems: 'center'
      }
    },
    onPad(dir) { this.move(dir) },
    move(dir) {
      if (this.locked || this.showWin || this.showOver) return
      const res = performMove(dir, this.tiles)
      if (!res.moved) {
        if (isGameOver(buildValueGrid(this.tiles))) this.showOver = true
        return
      }
      this.locked = true
      this.score += res.gained
      if (res.gained > 0) {
        this.lastGain = res.gained
        this.showGain = true
        this.scorePulse = true
        setTimeout(() => { this.showGain = false; this.scorePulse = false }, 700)
      }
      if (this.score > this.best) this.best = this.score
      this.tiles.forEach(t => { t.isNew = false; t.isMerged = res.mergedIds.includes(t.id) })
      setTimeout(() => {
        this.tiles = this.tiles.filter(t => !res.removedIds.includes(t.id))
        this.tiles.forEach(t => { if (res.mergedIds.includes(t.id)) t.displayValue = t.value })
        this.addTile(true)
        this.locked = false
        const max = Math.max(...this.tiles.map(t => t.value))
        if (max >= 2048 && !this.winNotified) { this.showWin = true; this.winNotified = true }
        if (isGameOver(buildValueGrid(this.tiles))) this.showOver = true
      }, MOVE_MS)
    },
    onTouchStart(e) {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
      if (!t) return
      this.touchX = t.pageX; this.touchY = t.pageY
    },
    onTouchEnd(e) {
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      if (!t) return
      const dx = t.pageX - this.touchX, dy = t.pageY - this.touchY
      const absX = Math.abs(dx), absY = Math.abs(dy)
      if (Math.max(absX, absY) < 20) return
      if (absX > absY) this.move(dx > 0 ? 'right' : 'left')
      else this.move(dy > 0 ? 'down' : 'up')
    },
    onSwipe(e) { let dir = e.direction; if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') this.move(dir) },
    continueGame() { this.showWin = false }
  }
}
</script>
<style scoped>
.page { background-color: #faf8ef; flex: 1; }
.layout-container { flex-direction: row; }
.board-col { justify-content: center; }
.board { position: relative; }
.grid { flex-direction: column; }
.tiles-layer { position: absolute; }
.tile { position: absolute; }
.pop-in { animation: tilePopIn 160ms ease-out; }
.merge-pop { animation: tileMergePop 160ms ease-out; }
@keyframes tilePopIn {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes tileMergePop {
  0% { transform: scale(1); }
  50% { transform: scale(1.16); }
  100% { transform: scale(1); }
}
.score-pulse { animation: scorePulse 220ms ease-out; }
@keyframes scorePulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
.score-gain { animation: scoreGainFloat 700ms ease-out; font-weight: 800; color: #8f7a66; font-size: 14px; }
@keyframes scoreGainFloat {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
.score-label { color: #eee4da; font-size: 10px; font-weight: 700; opacity: 0.8; }
.score-value { color: #ffffff; font-size: 18px; font-weight: 800; }
.reset-text { color: #f9f6f2; font-weight: 800; font-size: 16px; }
.dpad { flex-direction: column; }
.dpad-row { flex-direction: row; }
.dpad-text { color: #f9f6f2; font-size: 18px; font-weight: bold; }
.modal { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(238, 228, 218, 0.73); justify-content: center; alignItems: center; }
.modal-box { padding: 15px; background-color: #faf8ef; border-radius: 12px; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.modal-msg { font-size: 24px; font-weight: 800; color: #776e65; }
</style>
