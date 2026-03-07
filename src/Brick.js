import { COLORS, BRICK_WIDTH, BRICK_HEIGHT } from './Constants.js';

export class Brick {
    constructor(x, y, hp) {
        this.x = x;
        this.y = y;
        this.width = BRICK_WIDTH;
        this.height = BRICK_HEIGHT;
        this.hp = hp;
        this.active = true;
    }

    hit(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        let color;
        if (this.hp === 3) color = COLORS.BRICK_HP3;
        else if (this.hp === 2) color = COLORS.BRICK_HP2;
        else color = COLORS.BRICK_HP1;

        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = color;
        ctx.fill();
        
        // ハイライト（立体感）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // HPの表示
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp, this.x + this.width / 2, this.y + this.height / 2);
        
        ctx.closePath();
    }
}
