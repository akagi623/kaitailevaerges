import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED } from './Constants.js';

export class Paddle {
    constructor() {
        this.width = PADDLE_WIDTH;
        this.height = PADDLE_HEIGHT;
        this.x = (CANVAS_WIDTH - this.width) / 2;
        this.y = CANVAS_HEIGHT - this.height - 20;
        this.color = COLORS.PADDLE;
        
        this.rightPressed = false;
        this.leftPressed = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') this.rightPressed = true;
            if (e.key === 'Left' || e.key === 'ArrowLeft') this.leftPressed = true;
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') this.rightPressed = false;
            if (e.key === 'Left' || e.key === 'ArrowLeft') this.leftPressed = false;
        });
        document.addEventListener('mousemove', (e) => {
            const relativeX = e.clientX - document.body.getBoundingClientRect().left - (window.innerWidth - CANVAS_WIDTH) / 2;
            if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
                this.x = relativeX - this.width / 2;
            }
        });
    }

    update() {
        if (this.rightPressed && this.x < CANVAS_WIDTH - this.width) {
            this.x += PADDLE_SPEED;
        } else if (this.leftPressed && this.x > 0) {
            this.x -= PADDLE_SPEED;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}
