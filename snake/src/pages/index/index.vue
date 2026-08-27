<template>
  <div class="app-container">
    <div class="header">
      <div class="score-card">
        <text class="label">当前分数</text>
        <text class="value">{{ score }}</text>
      </div>
      <div class="score-card">
        <text class="label">最高纪录</text>
        <text class="value">{{ bestScore }}</text>
      </div>
    </div>

    <div class="stage">
      <div class="canvas-frame">
        <canvas ref="gameCanvas" class="canvas" @touchstart="onCanvasTouch"></canvas>
        <div v-if="gameState !== 'playing'" class="overlay" @touchstart="onOverlayTouch">
          <text v-if="gameState === 'idle'" class="ov-btn">开始游戏</text>
          <text v-if="gameState === 'paused'" class="ov-title">已暂停</text>
          <text v-if="gameState === 'gameover'" class="ov-title">游戏结束</text>
          <text v-if="gameState === 'gameover'" class="ov-score">得分: {{ score }}</text>
          <text v-if="gameState !== 'idle'" class="ov-btn">继续游戏</text>
        </div>
      </div>
    </div>

    <div class="dpad">
      <div class="dpad-row">
        <div class="dpad-btn" @touchstart="changeDir(0, -1)">
          <text class="dpad-icon">↑</text>
        </div>
      </div>
      <div class="dpad-row">
        <div class="dpad-btn" @touchstart="changeDir(-1, 0)">
          <text class="dpad-icon">←</text>
        </div>
        <div class="dpad-btn empty"></div>
        <div class="dpad-btn" @touchstart="changeDir(1, 0)">
          <text class="dpad-icon">→</text>
        </div>
      </div>
      <div class="dpad-row">
        <div class="dpad-btn" @touchstart="changeDir(0, 1)">
          <text class="dpad-icon">↓</text>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="speed-selector">
        <text
          v-for="s in speeds"
          :key="s.value"
          :class="['speed-btn', moveInterval === s.value ? 'active' : '']"
          @touchstart="setSpeed(s.value)"
        >{{ s.label }}</text>
      </div>
      <div class="btn-group">
        <text class="btn primary" @touchstart="startGame">{{ gameState === 'idle' ? '开始' : '重来' }}</text>
        <text class="btn secondary" @touchstart="togglePause">{{ gameState === 'paused' ? '继续' : '暂停' }}</text>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      gameState: 'idle',
      score: 0,
      bestScore: 0,
      moveInterval: 130,
      speeds: [
        { label: '慢速', value: 180 },
        { label: '正常', value: 130 },
        { label: '快速', value: 90 },
        { label: '极速', value: 60 }
      ],
      cols: 16,
      rows: 16,
      snake: [],
      prevSnake: [],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: null,
      particles: [],
      lastMoveTime: 0,
      canvasSize: 160,
      ctx: null,
      bestScoresMap: {},
      isLooping: false
    }
  },
  methods: {
    onShow() {
      this.initCanvas();
      this.loadBestScores();
      this.updateBestDisplay();
      if (!this.isLooping) {
        this.isLooping = true;
        this.loop();
      }
    },
    initCanvas() {
      const canvas = this.$refs.gameCanvas;
      if (!canvas) return;
      this.ctx = canvas.getContext('2d');
      canvas.width = this.canvasSize;
      canvas.height = this.canvasSize;
    },
    loadBestScores() {
      try {
        const val = localStorage.getItem('snakeBestScores');
        this.bestScoresMap = val ? JSON.parse(val) : {};
      } catch (e) {
        this.bestScoresMap = {};
      }
    },
    updateBestDisplay() {
      this.bestScore = this.bestScoresMap[this.moveInterval] || 0;
    },
    saveBestScore() {
      if (this.score > (this.bestScoresMap[this.moveInterval] || 0)) {
        this.bestScoresMap[this.moveInterval] = this.score;
        try {
          localStorage.setItem('snakeBestScores', JSON.stringify(this.bestScoresMap));
        } catch(e) {}
        this.updateBestDisplay();
      }
    },
    startGame() {
      const startX = Math.floor(this.cols / 4);
      const startY = Math.floor(this.rows / 2);
      this.snake = [{ x: startX + 2, y: startY }, { x: startX + 1, y: startY }, { x: startX, y: startY }];
      this.prevSnake = JSON.parse(JSON.stringify(this.snake));
      this.dir = { x: 1, y: 0 };
      this.nextDir = { x: 1, y: 0 };
      this.score = 0;
      this.particles = [];
      this.spawnFood();
      this.lastMoveTime = performance.now();
      this.gameState = 'playing';
    },
    resumeGame() {
      this.gameState = 'playing';
      this.lastMoveTime = performance.now();
    },
    togglePause() {
      if (this.gameState === 'playing') this.gameState = 'paused';
      else if (this.gameState === 'paused') this.resumeGame();
    },
    setSpeed(val) {
      if (this.gameState === 'playing') return;
      this.moveInterval = val;
      this.updateBestDisplay();
    },
    changeDir(x, y) {
      if (this.gameState !== 'playing') return;
      if (x === -this.dir.x && y === -this.dir.y) return;
      this.nextDir = { x, y };
    },
    spawnFood() {
      const occupied = {};
      this.snake.forEach(s => occupied[`${s.x},${s.y}`] = true);
      const free = [];
      for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
          if (!occupied[`${x},${y}`]) free.push({ x: x, y: y });
        }
      }
      if (free.length === 0) {
        this.endGame();
        return;
      }
      this.food = free[Math.floor(Math.random() * free.length)];
    },
    step() {
      this.prevSnake = JSON.parse(JSON.stringify(this.snake));
      this.dir = this.nextDir;
      const head = this.snake[0];
      const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
      if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows || this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        this.endGame();
        return;
      }
      this.snake.unshift(newHead);
      if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
        this.score += 10;
        this.spawnParticles(this.food.x, this.food.y);
        this.spawnFood();
      } else {
        this.snake.pop();
      }
    },
    endGame() {
      this.saveBestScore();
      this.gameState = 'gameover';
    },
    spawnParticles(x, y) {
      const grid = this.canvasSize / this.cols;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
        const speed = 1.4 + Math.random() * 2.6;
        this.particles.push({
          x: x * grid + grid / 2,
          y: y * grid + grid / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.05,
          size: 2
        });
      }
    },
    updateParticles() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    },
    loop() {
      const now = performance.now();
      if (this.gameState === 'playing' && now - this.lastMoveTime >= this.moveInterval) {
        this.step(); this.lastMoveTime = now;
      }
      if (this.gameState === 'playing' || this.gameState === 'gameover') this.updateParticles();
      this.draw(now);
      requestAnimationFrame(() => this.loop());
    },
    draw(ts) {
      const ctx = this.ctx; if (!ctx) return;
      const size = this.canvasSize; const grid = size / this.cols;
      ctx.fillStyle = '#081310'; ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(95,232,154,0.08)'; ctx.lineWidth = 0.5;
      for (let i = 0; i <= this.cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * grid, 0); ctx.lineTo(i * grid, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * grid); ctx.lineTo(size, i * grid); ctx.stroke();
      }
      if (this.gameState !== 'idle') {
        if (this.food) {
          ctx.fillStyle = '#ff7a59';
          const fPad = grid * 0.2;
          this.drawRoundRect(this.food.x * grid + fPad, this.food.y * grid + fPad, grid - fPad * 2, grid - fPad * 2, 2);
          ctx.fill();
        }
        const t = this.gameState === 'playing' ? Math.min((ts - this.lastMoveTime) / this.moveInterval, 1) : 1;
        const renderSnake = this.getInterpolatedSnake(t);
        renderSnake.forEach((seg, i) => {
          const ratio = renderSnake.length > 1 ? i / (renderSnake.length - 1) : 0;
          ctx.fillStyle = this.mixColor('#5fe89a', '#155c3b', ratio);
          const sPad = grid * 0.05;
          this.drawRoundRect(seg.x * grid + sPad, seg.y * grid + sPad, grid - sPad * 2, grid - sPad * 2, 2);
          ctx.fill();
        });
        this.particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = '#ffcb80';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    },
    getInterpolatedSnake(t) {
      if (t >= 1 || this.prevSnake.length === 0) return this.snake;
      return this.snake.map((curr, i) => {
        const prev = i < this.prevSnake.length ? this.prevSnake[i] : this.prevSnake[this.prevSnake.length - 1];
        return { x: prev.x + (curr.x - prev.x) * t, y: prev.y + (curr.y - prev.y) * t };
      });
    },
    drawRoundRect(x, y, w, h, r) {
      const ctx = this.ctx; ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    },
    mixColor(c1, c2, r) {
      const f1 = hex => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
      const a = f1(c1), b = f1(c2);
      return `rgb(${Math.round(a.r + (b.r - a.r) * r)}, ${Math.round(a.g + (b.g - a.g) * r)}, ${Math.round(a.b + (b.b - a.b) * r)})`;
    },
    onCanvasTouch() {
      if (this.gameState === 'idle') this.startGame();
      else if (this.gameState === 'playing') this.gameState = 'paused';
      else if (this.gameState === 'paused') this.resumeGame();
      else if (this.gameState === 'gameover') this.startGame();
    },
    onOverlayTouch() {
      if (this.gameState === 'idle') this.startGame();
      else if (this.gameState === 'paused') this.resumeGame();
      else if (this.gameState === 'gameover') this.startGame();
    }
  }
}
</script>

<style scoped>
.app-container {
  width: 172px;
  height: 640px;
  background-color: #081310;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.header {
  width: 172px;
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: #1a2a24;
}
.score-card {
  background-color: #11221c;
  width: 140px;
  padding: 5px 0;
  margin: 2px 0;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  border-color: #5fe89a;
  align-items: center;
}
.label {
  color: #5fe89a;
  font-size: 10px;
}
.value {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}
.stage {
  margin: 15px 0;
  width: 160px;
  height: 160px;
  align-items: center;
  justify-content: center;
}
.canvas-frame {
  position: relative;
  width: 160px;
  height: 160px;
  border-width: 2px;
  border-style: solid;
  border-color: #1a2a24;
  border-radius: 8px;
  overflow: hidden;
}
.canvas {
  width: 160px;
  height: 160px;
}
.overlay {
  position: absolute;
  top: 0; left: 0; width: 160px; height: 160px;
  background-color: rgba(8, 19, 16, 0.9);
  justify-content: center;
  align-items: center;
}
.ov-title {
  color: #fff; font-size: 18px; font-weight: bold; margin-bottom: 10px;
}
.ov-score {
  color: #5fe89a; font-size: 14px; margin-bottom: 15px;
}
.ov-btn {
  background-color: #5fe89a; color: #081310; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;
}
.dpad {
  margin-top: 10px;
  align-items: center;
}
.dpad-row {
  flex-direction: row;
}
.dpad-btn {
  width: 45px;
  height: 45px;
  background-color: #1a2a24;
  margin: 4px;
  border-radius: 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #5fe89a;
  justify-content: center;
  align-items: center;
}
.empty {
  background-color: transparent;
  border-width: 0;
}
.dpad-icon {
  color: #5fe89a; font-size: 20px; font-weight: bold;
}
.footer {
  width: 172px;
  flex: 1;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 30px;
}
.speed-selector {
  flex-direction: row; margin-bottom: 15px;
}
.speed-btn {
  padding: 3px 6px; margin: 0 3px; background-color: #1a2a24; color: #555; font-size: 10px; border-radius: 4px;
}
.active {
  background-color: #5fe89a; color: #081310;
}
.btn-group {
  flex-direction: row;
}
.btn {
  padding: 8px 16px; margin: 0 8px; border-radius: 20px; font-size: 12px; font-weight: bold;
}
.primary {
  background-color: #5fe89a; color: #081310;
}
.secondary {
  background-color: #1a2a24; color: #5fe89a; border-width: 1px; border-style: solid; border-color: #5fe89a;
}
</style>
