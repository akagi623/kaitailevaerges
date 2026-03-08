import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, BALL_RADIUS } from './Constants.js';

export class Ball {
    constructor(x, y, dx, dy) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.radius = BALL_RADIUS;
        this.color = COLORS.BALL;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        // 左右の壁での跳ね返り（位置を確実に補正してハマりを防止）
        if (this.x + this.radius > CANVAS_WIDTH) {
            this.dx = -Math.abs(this.dx); // 必ず左向きに
            this.x = CANVAS_WIDTH - this.radius;
        } else if (this.x - this.radius < 0) {
            this.dx = Math.abs(this.dx); // 必ず右向きに
            this.x = this.radius;
        }

        // 上壁での跳ね返り
        if (this.y - this.radius < 0) {
            this.dy = Math.abs(this.dy); // 必ず下向きに
            this.y = this.radius;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}
