import { COLORS } from './Constants.js';

export class Particle {
    constructor(x, y, color = COLORS.PARTICLE, size = null) {
        this.x = x;
        this.y = y;
        this.size = size || (Math.random() * 3 + 1);
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.color = color;
        this.life = 1.0; 
        this.decay = Math.random() * 0.05 + 0.02;
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
