import { CANVAS_HEIGHT } from './Constants.js';

export const ITEM_TYPES = {
    EXPAND: 'EXPAND', // パドルが伸びる
    EXTRA_BALL: 'EXTRA_BALL' // ボールが増える（今回はスコア加算などの簡易実装も可）
};

export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type;
        this.speedY = 2;
        this.active = true;
    }

    update() {
        this.y += this.speedY;
        if (this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = this.type === ITEM_TYPES.EXPAND ? '#4caf50' : '#ff9800';
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(this.type === ITEM_TYPES.EXPAND ? 'E' : 'B', this.x + 5, this.y + 15);
        ctx.closePath();
    }
}
