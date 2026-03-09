import { COLORS } from './Constants.js';

export class Particle {
    constructor(x, y, color = COLORS.PARTICLE, size = null, sprite = null, srcRect = null) {
        this.x = x;
        this.y = y;
        this.size = size || (Math.random() * 3 + 1);
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.color = color;
        this.life = 1.0; 
        this.decay = Math.random() * 0.03 + 0.01;
        
        // スプライトの破片用
        this.sprite = sprite;
        this.srcRect = srcRect; // {x, y, w, h}
        if (this.srcRect) {
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        }
    }

    update() {
        if (isNaN(this.x) || isNaN(this.y)) {
            this.life = 0;
            return;
        }
        this.x += (this.speedX || 0);
        this.y += (this.speedY || 0);
        this.speedY += 0.1; // 重力
        this.life -= this.decay;
        if (this.srcRect) {
            this.rotation += (this.rotationSpeed || 0);
        }
        if (this.life < 0) this.life = 0;
    }

    draw(ctx) {
        if (this.life <= 0 || isNaN(this.x) || isNaN(this.y)) return;

        ctx.save();
        ctx.globalAlpha = this.life;
        
        if (this.sprite && this.srcRect && !isNaN(this.size) && this.size > 0) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation || 0);
            ctx.drawImage(
                this.sprite,
                this.srcRect.x, this.srcRect.y, this.srcRect.w, this.srcRect.h,
                -this.size/2, -this.size/2, this.size, this.size
            );
        } else if (!isNaN(this.size) && this.size > 0) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
}
