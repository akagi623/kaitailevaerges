import { COLORS } from './Constants.js';

export class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.color = COLORS.PARTICLE;
        this.life = 1.0; // 1.0 to 0
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        if (this.life < 0) this.life = 0;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        // 円(arc)から四角(fillRect)に変更して描画を高速化
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}
