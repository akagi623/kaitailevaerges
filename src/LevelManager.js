import { 
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, 
    BRICK_PADDING, BRICK_OFFSET_TOP, BRICK_OFFSET_LEFT 
} from './Constants.js';
import { Brick } from './Brick.js';

export class LevelManager {
    constructor() {
        this.bricks = [];
        this.init();
    }

    init() {
        this.bricks = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                // 耐久度を20〜50で設定
                const hp = Math.floor(Math.random() * 31) + 20;
                this.bricks.push(new Brick(brickX, brickY, hp));
            }
        }
    }

    checkCollision(ball, damage) {
        for (let brick of this.bricks) {
            if (brick.active) {
                // 矩形と円の当たり判定
                const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
                const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
                
                const distanceX = ball.x - closestX;
                const distanceY = ball.y - closestY;
                const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                if (distanceSquared < (ball.radius * ball.radius)) {
                    // 衝突方向の判定
                    if (Math.abs(distanceX) > Math.abs(distanceY)) {
                        ball.dx = -ball.dx;
                    } else {
                        ball.dy = -ball.dy;
                    }

                    brick.hit(damage);
                    
                    return { hit: true, brick: brick, destroyed: !brick.active, damage: damage };
                }
            }
        }
        return { hit: false };
    }

    draw(ctx) {
        for (let brick of this.bricks) {
            brick.draw(ctx);
        }
    }

    checkLaserCollision(laserX, laserWidth, damage) {
        const results = [];
        for (let brick of this.bricks) {
            if (brick.active) {
                // レーザーの判定（縦一列の矩形）
                const laserLeft = laserX - laserWidth / 2;
                const laserRight = laserX + laserWidth / 2;
                const brickLeft = brick.x;
                const brickRight = brick.x + brick.width;

                // 横方向の重なりがあるかチェック
                if (laserRight > brickLeft && laserLeft < brickRight) {
                    brick.hit(damage);
                    results.push({
                        brick: brick,
                        destroyed: !brick.active,
                        damage: damage
                    });
                }
            }
        }
        return results;
    }

    areAllBricksCleared() {
        return this.bricks.every(b => !b.active);
    }
}
