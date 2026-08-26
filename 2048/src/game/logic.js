export const SIZE = 4

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

function withinBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

function buildTraversalOrder(vector) {
  const rows = [0, 1, 2, 3]
  const cols = [0, 1, 2, 3]
  if (vector.y === 1) rows.reverse()
  if (vector.x === 1) cols.reverse()
  return { rows, cols }
}

function findFarthestCell(grid, r, c, vector) {
  let prevR = r
  let prevC = c
  let nextR = r + vector.y
  let nextC = c + vector.x
  while (withinBounds(nextR, nextC) && !grid[nextR][nextC]) {
    prevR = nextR
    prevC = nextC
    nextR += vector.y
    nextC += vector.x
  }
  return {
    farthest: { r: prevR, c: prevC },
    next: withinBounds(nextR, nextC) ? { r: nextR, c: nextC } : null
  }
}

function createEmptyGrid(fill) {
  const grid = []
  for (let r = 0; r < SIZE; r++) {
    const row = []
    for (let c = 0; c < SIZE; c++) row.push(fill)
    grid.push(row)
  }
  return grid
}

export function performMove(direction, tileList) {
  const vector = DIRECTIONS[direction]
  const { rows, cols } = buildTraversalOrder(vector)
  const grid = createEmptyGrid(null)
  for (let i = 0; i < tileList.length; i++) {
    const tile = tileList[i]
    grid[tile.r][tile.c] = tile
  }

  const mergedThisMove = {}
  const removedIds = []
  const mergedIds = []
  let moved = false
  let gained = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    for (let j = 0; j < cols.length; j++) {
      const c = cols[j]
      const tile = grid[r][c]
      if (!tile) continue

      const result = findFarthestCell(grid, r, c, vector)
      const nextTile = result.next ? grid[result.next.r][result.next.c] : null

      if (nextTile && nextTile.value === tile.value && !mergedThisMove[nextTile.id]) {
        grid[r][c] = null
        tile.r = result.next.r
        tile.c = result.next.c
        nextTile.value *= 2
        mergedThisMove[nextTile.id] = true
        gained += nextTile.value
        removedIds.push(tile.id)
        mergedIds.push(nextTile.id)
        moved = true
      } else if (result.farthest.r !== r || result.farthest.c !== c) {
        grid[r][c] = null
        grid[result.farthest.r][result.farthest.c] = tile
        tile.r = result.farthest.r
        tile.c = result.farthest.c
        moved = true
      }
    }
  }

  return { moved, gained, removedIds, mergedIds }
}

export function buildValueGrid(tileList) {
  const grid = createEmptyGrid(0)
  for (let i = 0; i < tileList.length; i++) {
    const tile = tileList[i]
    grid[tile.r][tile.c] = tile.value
  }
  return grid
}

export function isGameOver(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return false
    }
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      if (grid[r][c] === grid[r][c + 1]) return false
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE - 1; r++) {
      if (grid[r][c] === grid[r + 1][c]) return false
    }
  }
  return true
}
