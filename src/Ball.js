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
        // 炎の様なグラデーションを描画
        const x = this.x;
        const y = this.y;
        const r = this.radius;
        const flameGradient = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.5);
        flameGradient.addColorStop(0, '#ffffff');  // 中心は白
        flameGradient.addColorStop(0.3, '#ffff00'); // 黄色
        flameGradient.addColorStop(0.7, '#ff5722'); // オレンジ・赤
        flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // 外側は透明

        ctx.beginPath();
        // 光彩の範囲まで描画するため少し大きめにArcを描く
        ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = flameGradient;
        ctx.fill();
        ctx.closePath();
    }
}
