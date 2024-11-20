// 樱花
class Sakura {
  private x: number;
  private y: number;
  private speedX: number;
  private speedY: number;
  private size: number;
  private color: string;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.x = Math.random() * canvas.width;
    this.y = -Math.random() * 100;
    this.speedX = (Math.random() - 0.5) * 2;
    this.speedY = Math.random() * 2 + 1;
    this.size = Math.random() * 2 + 1;
    this.color = `rgba(255, 182, 193, ${Math.random() * 0.5 + 0.5})`; // 樱花颜色
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.y > this.canvas.height) {
      this.y = -Math.random() * 100;
      this.x = Math.random() * this.canvas.width;
    }
  }
}

class SakuraEffect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sakuras: Sakura[];
  private animationFrameId: number | null = null;

  constructor() {
    this.sakuras = [];
  }

  init() {
    const canvas = document.createElement('canvas')
    canvas.height = window.innerHeight
    canvas.width = window.innerWidth
    canvas.setAttribute('style', 'position: fixed;left: 0;top: 0;pointer-events: none;')
    canvas.setAttribute('id', 'canvas_sakura')
    document.getElementsByTagName('body')[0].appendChild(canvas)
    this.canvas = canvas;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = canvas.getContext('2d')!;
    for (let i = 0; i < 100; i++) {
      this.sakuras.push(new Sakura(this.canvas, this.ctx));
    }
  }

  start() {
    this.init();
    this.animate();
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      document.getElementById('canvas_sakura')?.remove()
      this.sakuras = []
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const sakura of this.sakuras) {
      sakura.update();
      sakura.draw();
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}

const sakuraEffect = new SakuraEffect()
export function stopOrStart(val) {
  if (val) {
    sakuraEffect.start()
  } else {
    sakuraEffect.stop()
  }
}
