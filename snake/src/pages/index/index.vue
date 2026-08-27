<template>
  <div class="app">
    <div class="header">
      <div class="card">
        <text class="lab">分数</text>
        <text class="val">{{ score }}</text>
      </div>
      <div class="card">
        <text class="lab">最高</text>
        <text class="val">{{ bestScore }}</text>
      </div>
    </div>

    <div class="stage">
      <canvas ref="gameCanvas" class="canvas" @touchstart="onCanvas"></canvas>
      <div v-if="gameState !== 'playing'" class="overlay" @touchstart="onCanvas">
        <text v-if="gameState === 'idle'" class="msg">开始游戏</text>
        <text v-if="gameState === 'paused'" class="msg">已暂停</text>
        <div v-if="gameState === 'gameover'" class="over-box">
          <text class="msg">游戏结束</text>
          <text class="final">得分: {{ score }}</text>
          <text class="btn-txt">再来一局</text>
        </div>
      </div>
    </div>

    <div class="dpad">
      <div class="row">
        <div class="btn" @touchstart="go(0, -1)"><text class="ic">↑</text></div>
      </div>
      <div class="row">
        <div class="btn" @touchstart="go(-1, 0)"><text class="ic">←</text></div>
        <div class="btn empty"></div>
        <div class="btn" @touchstart="go(1, 0)"><text class="ic">→</text></div>
      </div>
      <div class="row">
        <div class="btn" @touchstart="go(0, 1)"><text class="ic">↓</text></div>
      </div>
    </div>

    <div class="footer">
      <div class="speed-row">
        <text v-for="s in speeds" :key="s.v" :class="[moveInterval === s.v ? 'active-s' : 's-btn']" @touchstart="setS(s.v)">{{ s.l }}</text>
      </div>
      <div class="act-row">
        <text class="act" @touchstart="pause">{{ gameState === 'paused' ? '继续' : '暂停' }}</text>
        <text class="act" @touchstart="startGame">重置</text>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      gameState: 'idle', score: 0, bestScore: 0, moveInterval: 130,
      speeds: [{l:'慢',v:180}, {l:'常',v:130}, {l:'快',v:90}, {l:'极',v:60}],
      cols: 16, rows: 16, snake: [], prevSnake: [], dir: {x:1,y:0}, nextDir: {x:1,y:0},
      food: null, particles: [], lastMoveTime: 0, canvasSize: 160, ctx: null, bestScoresMap: {}
    }
  },
  methods: {
    onShow() {
      this.init();
      this.load();
      this.updateB();
      this.loop();
    },
    init() {
      const c = this.$refs.gameCanvas;
      this.ctx = c.getContext('2d');
      c.width = this.canvasSize;
      c.height = this.canvasSize;
    },
    load() {
      try {
        const v = localStorage.getItem('snakeBestScores');
        this.bestScoresMap = v ? JSON.parse(v) : {};
      } catch (e) { this.bestScoresMap = {}; }
    },
    updateB() { this.bestScore = this.bestScoresMap[this.moveInterval] || 0; },
    save() {
      if (this.score > (this.bestScoresMap[this.moveInterval] || 0)) {
        this.bestScoresMap[this.moveInterval] = this.score;
        try { localStorage.setItem('snakeBestScores', JSON.stringify(this.bestScoresMap)); } catch(e) {}
        this.updateB();
      }
    },
    startGame() {
      const sx = Math.floor(this.cols / 4);
      const sy = Math.floor(this.rows / 2);
      this.snake = [{x:sx+2, y:sy}, {x:sx+1, y:sy}, {x:sx, y:sy}];
      this.prevSnake = JSON.parse(JSON.stringify(this.snake));
      this.dir = {x:1, y:0}; this.nextDir = {x:1, y:0};
      this.score = 0; this.particles = [];
      this.spawn();
      this.lastMoveTime = performance.now();
      this.gameState = 'playing';
    },
    pause() {
      if (this.gameState === 'playing') this.gameState = 'paused';
      else if (this.gameState === 'paused') { this.gameState = 'playing'; this.lastMoveTime = performance.now(); }
    },
    setS(v) { if (this.gameState !== 'playing') { this.moveInterval = v; this.updateB(); } },
    go(x, y) {
      if (this.gameState !== 'playing') return;
      if (x === -this.dir.x && y === -this.dir.y) return;
      this.nextDir = {x, y};
    },
    spawn() {
      const occ = {};
      this.snake.forEach(s => occ[`${s.x},${s.y}`] = true);
      const f = [];
      for (let x=0; x<this.cols; x++) for (let y=0; y<this.rows; y++) if (!occ[`${x},${y}`]) f.push({x, y});
      if (f.length === 0) { this.end(); return; }
      this.food = f[Math.floor(Math.random() * f.length)];
    },
    step() {
      this.prevSnake = JSON.parse(JSON.stringify(this.snake));
      this.dir = this.nextDir;
      const h = this.snake[0];
      const nh = {x: h.x + this.dir.x, y: h.y + this.dir.y};
      if (nh.x<0 || nh.x>=this.cols || nh.y<0 || nh.y>=this.rows || this.snake.some(s => s.x===nh.x && s.y===nh.y)) {
        this.end(); return;
      }
      this.snake.unshift(nh);
      if (this.food && nh.x===this.food.x && nh.y===this.food.y) {
        this.score += 10; this.part(this.food.x, this.food.y); this.spawn();
      } else { this.snake.pop(); }
    },
    end() { this.save(); this.gameState = 'gameover'; },
    part(x, y) {
      const g = this.canvasSize / this.cols;
      for (let i=0; i<8; i++) {
        const a = (Math.PI*2/8)*i;
        this.particles.push({
          x: x*g+g/2, y: y*g+g/2, vx: Math.cos(a)*2, vy: Math.sin(a)*2,
          life: 1, decay: 0.05
        });
      }
    },
    loop() {
      const n = performance.now();
      if (this.gameState === 'playing' && n - this.lastMoveTime >= this.moveInterval) {
        this.step(); this.lastMoveTime = n;
      }
      for (let i=this.particles.length-1; i>=0; i--) {
        const p = this.particles[i]; p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
        if (p.life<=0) this.particles.splice(i, 1);
      }
      this.draw(n);
      requestAnimationFrame(() => this.loop());
    },
    draw(ts) {
      const ctx = this.ctx; if (!ctx) return;
      const s = this.canvasSize; const g = s / this.cols;
      ctx.fillStyle = '#081310'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(95,232,154,0.1)'; ctx.lineWidth = 0.5;
      for (let i=0; i<=this.cols; i++) {
        ctx.beginPath(); ctx.moveTo(i*g, 0); ctx.lineTo(i*g, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*g); ctx.lineTo(s, i*g); ctx.stroke();
      }
      if (this.gameState !== 'idle') {
        if (this.food) {
          ctx.fillStyle = '#ff7a59';
          const p = g * 0.2; this.rct(this.food.x*g+p, this.food.y*g+p, g-p*2, g-p*2, 2); ctx.fill();
        }
        const t = this.gameState === 'playing' ? Math.min((ts-this.lastMoveTime)/this.moveInterval, 1) : 1;
        this.snake.map((curr, i) => {
          const prev = i < this.prevSnake.length ? this.prevSnake[i] : this.prevSnake[this.prevSnake.length-1];
          const rx = prev.x+(curr.x-prev.x)*t, ry = prev.y+(curr.y-prev.y)*t;
          ctx.fillStyle = i===0 ? '#5fe89a' : '#155c3b';
          const p = g * 0.1; this.rct(rx*g+p, ry*g+p, g-p*2, g-p*2, 2); ctx.fill();
        });
        this.particles.forEach(p => {
          ctx.globalAlpha = p.life; ctx.fillStyle = '#ffcb80';
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    },
    rct(x, y, w, h, r) {
      this.ctx.beginPath(); this.ctx.moveTo(x+r, y); this.ctx.lineTo(x+w-r, y);
      this.ctx.arcTo(x+w, y, x+w, y+r, r); this.ctx.lineTo(x+w, y+h-r);
      this.ctx.arcTo(x+w, y+h, x+w-r, y+h, r); this.ctx.lineTo(x+r, y+h);
      this.ctx.arcTo(x, y+h, x, y+h-r, r); this.ctx.lineTo(x, y+r);
      this.ctx.arcTo(x, y, x+r, y, r); this.ctx.closePath();
    },
    onCanvas() {
      if (this.gameState === 'idle' || this.gameState === 'gameover') this.startGame();
      else if (this.gameState === 'playing') this.gameState = 'paused';
      else if (this.gameState === 'paused') { this.gameState = 'playing'; this.lastMoveTime = performance.now(); }
    }
  }
}
</script>

<style scoped>
.app { width: 172px; height: 640px; background-color: #081310; align-items: center; }
.header { width: 172px; padding: 10px 0; align-items: center; border-bottom: 1px solid #1a2a24; }
.card { background-color: #11221c; width: 150px; padding: 4px 0; margin: 2px 0; border-radius: 6px; border: 1px solid #5fe89a; align-items: center; }
.lab { color: #5fe89a; font-size: 10px; }
.val { color: #fff; font-size: 14px; font-weight: bold; }
.stage { margin: 15px 0; width: 160px; height: 160px; position: relative; }
.canvas { width: 160px; height: 160px; border: 1px solid #1a2a24; border-radius: 4px; }
.overlay { position: absolute; top: 0; left: 0; width: 160px; height: 160px; background-color: rgba(8, 19, 16, 0.85); justify-content: center; align-items: center; }
.msg { color: #fff; font-size: 16px; font-weight: bold; }
.over-box { align-items: center; }
.final { color: #5fe89a; font-size: 12px; margin: 5px 0; }
.btn-txt { background-color: #5fe89a; color: #081310; padding: 4px 10px; border-radius: 4px; font-size: 10px; }
.dpad { align-items: center; margin-top: 10px; }
.row { flex-direction: row; }
.btn { width: 42px; height: 42px; background-color: #1a2a24; margin: 3px; border-radius: 8px; border: 1px solid #5fe89a; justify-content: center; align-items: center; }
.empty { background-color: transparent; border: 0; }
.ic { color: #5fe89a; font-size: 18px; font-weight: bold; }
.footer { width: 172px; flex: 1; justify-content: flex-end; align-items: center; padding-bottom: 20px; }
.speed-row { flex-direction: row; margin-bottom: 10px; }
.s-btn { padding: 2px 6px; margin: 0 2px; background-color: #1a2a24; color: #555; font-size: 10px; border-radius: 4px; }
.active-s { padding: 2px 6px; margin: 0 2px; background-color: #5fe89a; color: #081310; font-size: 10px; border-radius: 4px; }
.act-row { flex-direction: row; }
.act { background-color: #333; color: #fff; padding: 6px 15px; margin: 0 5px; border-radius: 12px; font-size: 12px; }
</style>
