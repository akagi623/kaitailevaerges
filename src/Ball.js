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

        // 壁での跳ね返り
        if (this.x + this.radius > CANVAS_WIDTH || this.x - this.radius < 0) {
            this.dx = -this.dx;
        }
        if (this.y - this.radius < 0) {
            this.dy = -this.dy;
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
