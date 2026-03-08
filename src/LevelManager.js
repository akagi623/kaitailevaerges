import { 
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, 
    BRICK_PADDING, BRICK_OFFSET_TOP, BRICK_OFFSET_LEFT, ISSUE_BRICK_HP
} from './Constants.js';
import { Brick } from './Brick.js';

export class LevelManager {
    constructor() {
        this.bricks = [];
        this.init();
    }

    init() {
        this.bricks = [];
        const totalBricks = BRICK_ROWS * BRICK_COLS;
        const issueIndex = Math.floor(Math.random() * totalBricks);

        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                
                const index = r * BRICK_COLS + c;
                const isIssue = (index === issueIndex);
                const isEdge = (c === 0 || c === BRICK_COLS - 1);
                
                const hp = isIssue ? ISSUE_BRICK_HP : Math.floor(Math.random() * 31) + 20;

                this.bricks.push(new Brick(brickX, brickY, hp, isIssue, isEdge));
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

    update(deltaTime) {
        for (let brick of this.bricks) {
            brick.update(deltaTime);
        }
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
                    if (brick.isIssue) {
                        continue; // イシューブロックにはレーザー無効
                    }
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
        const issueBrick = this.bricks.find(b => b.isIssue);
        return issueBrick ? !issueBrick.active : false;
    }
}
