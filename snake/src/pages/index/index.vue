<template>
  <div class="app-container">
    <div class="header">
      <div class="score-box">
        <text class="score-label">SCORE</text>
        <text class="score-value">{{ score }}</text>
      </div>
      <div class="score-box">
        <text class="score-label">BEST</text>
        <text class="score-value">{{ bestScore }}</text>
      </div>
    </div>

    <div class="game-stage">
      <canvas ref="gameCanvas" class="canvas" @touchstart="onCanvasTouch"></canvas>

      <div v-if="gameState === 'idle'" class="overlay" @click="startGame">
        <text class="overlay-btn">START GAME</text>
      </div>

      <div v-if="gameState === 'paused'" class="overlay" @click="resumeGame">
        <text class="overlay-title">PAUSED</text>
        <text class="overlay-hint">Tap to Continue</text>
      </div>

      <div v-if="gameState === 'gameover'" class="overlay" @click="startGame">
        <text class="overlay-title">GAME OVER</text>
        <text class="overlay-score">SCORE: {{ score }}</text>
        <text class="overlay-btn">RESTART</text>
      </div>
    </div>

    <div class="dpad">
      <div class="dpad-row">
        <div class="dpad-btn" @touchstart="changeDir(0, -1)">
          <text class="arrow">▲</text>
        </div>
      </div>
      <div class="dpad-row">
        <div class="dpad-btn" @touchstart="changeDir(-1, 0)">
          <text class="arrow">◀</text>
        </div>
        <div class="dpad-btn empty"></div>
        <div class="dpad-btn" @touchstart="changeDir(1, 0)">
          <text class="arrow">▶</text>
        </div>
      </div>
      <div class="dpad-row">
        <div class="dpad-btn" @touchstart="changeDir(0, 1)">
          <text class="arrow">▼</text>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="speed-selector">
        <text
          v-for="s in speeds"
          :key="s.value"
          :class="['speed-btn', moveInterval === s.value ? 'speed-btn-active' : '']"
          @click="setSpeed(s.value)"
        >{{ s.label }}</text>
      </div>
      <div class="action-btns">
        <text class="ctrl-btn" @click="togglePause">{{ gameState === 'paused' ? 'RESUME' : 'PAUSE' }}</text>
        <text class="ctrl-btn" @click="startGame">RESET</text>
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
        { label: 'SLOW', value: 180 },
        { label: 'NORM', value: 130 },
        { label: 'FAST', value: 90 },
        { label: 'MAX', value: 60 }
      ],
      cols: 20,
      rows: 20,
      snake: [],
      prevSnake: [],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: null,
      particles: [],
      lastMoveTime: 0,
      canvasSize: 680,
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
      this.ctx = canvas.getContext('2d');
      const dpr = 1;
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
      this.snake = [
        { x: startX + 2, y: startY },
        { x: startX + 1, y: startY },
        { x: startX, y: startY }
      ];
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
          if (!occupied[`${x},${y}`]) free.push({ x, y });
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
          decay: 0.03 + Math.random() * 0.03,
          size: 2 + Math.random() * 2
        });
      }
    },
    updateParticles() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    },
    loop() {
      const now = performance.now();
      if (this.gameState === 'playing') {
        if (now - this.lastMoveTime >= this.moveInterval) {
          this.step();
          this.lastMoveTime = now;
        }
      }
      if (this.gameState === 'playing' || this.gameState === 'gameover') {
        this.updateParticles();
      }
      this.draw(now);
      requestAnimationFrame(() => this.loop());
    },
    draw(ts) {
      const ctx = this.ctx;
      if (!ctx) return;
      const size = this.canvasSize;
      const grid = size / this.cols;
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= this.cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * grid, 0); ctx.lineTo(i * grid, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * grid); ctx.lineTo(size, i * grid); ctx.stroke();
      }
      if (this.gameState !== 'idle') {
        if (this.food) {
          const pulse = 0.7 + 0.3 * Math.sin(ts / 200);
          ctx.fillStyle = '#ff7a59';
          const fPad = grid * 0.2;
          this.drawRoundRect(this.food.x * grid + fPad, this.food.y * grid + fPad, grid - fPad * 2, grid - fPad * 2, grid / 4);
          ctx.fill();
        }
        const t = this.gameState === 'playing' ? Math.min((ts - this.lastMoveTime) / this.moveInterval, 1) : 1;
        const renderSnake = this.getInterpolatedSnake(t);
        renderSnake.forEach((seg, i) => {
          const ratio = renderSnake.length > 1 ? i / (renderSnake.length - 1) : 0;
          ctx.fillStyle = this.mixColor('#5fe89a', '#155c3b', ratio);
          const sPad = grid * 0.05;
          this.drawRoundRect(seg.x * grid + sPad, seg.y * grid + sPad, grid - sPad * 2, grid - sPad * 2, grid / 4);
          ctx.fill();
        });
        this.particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = '#ffcb80';
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
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
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
    }
  }
}
</script>

<style lang="less" scoped>
.app-container {
  width: 750px;
  background-color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.header {
  width: 750px;
  flex-direction: row;
  justify-content: space-around;
  padding: 40px 0;
  border-bottom-width: 2px;
  border-bottom-style: solid;
  border-bottom-color: #222;
}
.score-box {
  background-color: #1a1a1a;
  padding: 20px;
  border-radius: 12px;
  width: 300px;
  align-items: center;
}
.score-label {
  font-size: 24px;
  color: #888;
  font-weight: bold;
}
.score-value {
  font-size: 48px;
  color: #fff;
  font-weight: 800;
  margin-top: 10px;
}
.game-stage {
  position: relative;
  width: 680px;
  height: 680px;
  margin: 60px 0;
  border-width: 4px;
  border-style: solid;
  border-color: #333;
  border-radius: 16px;
}
.canvas {
  width: 680px;
  height: 680px;
}
.overlay {
  position: absolute;
  top: 0; left: 0; width: 680px; height: 680px;
  background-color: rgba(0,0,0,0.8);
  justify-content: center;
  align-items: center;
}
.overlay-title {
  color: #fff;
  font-size: 60px;
  font-weight: 800;
  margin-bottom: 20px;
}
.overlay-score {
  color: #5fe89a;
  font-size: 40px;
  margin-bottom: 40px;
}
.overlay-btn {
  background-color: #5fe89a;
  color: #000;
  padding: 20px 40px;
  border-radius: 12px;
  font-size: 32px;
  font-weight: bold;
}
.overlay-hint {
  color: #666;
  font-size: 24px;
  margin-top: 20px;
}
.dpad {
  margin-top: 40px;
  align-items: center;
}
.dpad-row {
  flex-direction: row;
}
.dpad-btn {
  width: 120px;
  height: 120px;
  background-color: #222;
  justify-content: center;
  align-items: center;
  margin: 10px;
  border-radius: 20px;
}
.empty {
  background-color: transparent;
}
.arrow {
  color: #fff;
  font-size: 60px;
}
.footer {
  width: 750px;
  padding: 60px 0;
  align-items: center;
}
.speed-selector {
  flex-direction: row;
  justify-content: center;
  margin-bottom: 60px;
}
.speed-btn {
  padding: 15px 25px;
  margin: 0 10px;
  background-color: #222;
  color: #666;
  font-size: 24px;
  border-radius: 8px;
}
.speed-btn-active {
  background-color: #5fe89a;
  color: #000;
}
.action-btns {
  flex-direction: row;
  justify-content: center;
}
.ctrl-btn {
  background-color: #333;
  color: #fff;
  padding: 20px 60px;
  margin: 0 20px;
  border-radius: 50px;
  font-size: 28px;
  font-weight: bold;
}
</style>
