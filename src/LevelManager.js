import { 
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, 
    BRICK_PADDING, BRICK_OFFSET_TOP, BRICK_OFFSET_LEFT, ISSUE_BRICK_HP,
    STAGE_CONFIG
} from './Constants.js';
import { Brick } from './Brick.js';

export class LevelManager {
    constructor() {
        this.bricks = [];
        this.issueSpawned = false;
        this.currentStageId = null;
        this.init();
    }

    init(stageId = 'ikebukuro') {
        this.bricks = [];
        this.issueSpawned = false;
        this.currentStageId = stageId;

        const isShibuya = (stageId === 'shibuya');

        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                
                // 初回はすべてコアブロックではない
                const isIssue = false;
                const isEdge = (c === 0 || c === BRICK_COLS - 1);
                
                let isCenterTarget = false;
                if (isShibuya) {
                    // 渋谷：スクランブル配置（市松模様的な難しさ）
                    isCenterTarget = (r >= 1 && r <= 5 && c >= 1 && c <= 4 && (r + c) % 2 === 0);
                } else {
                    // 池袋：通常配置（中央付近）
                    isCenterTarget = (c >= 1 && c <= BRICK_COLS - 2 && r >= 2 && r <= BRICK_ROWS - 3);
                }
                
                const hp = isShibuya ? Math.floor(Math.random() * 41) + 30 : Math.floor(Math.random() * 31) + 20;

                const brick = new Brick(brickX, brickY, hp, isIssue, isEdge);
                brick.isCenterTarget = isCenterTarget;
                this.bricks.push(brick);
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

    update(deltaTime, onRespawn, onIssueSpawn) {
        for (let brick of this.bricks) {
            brick.update(deltaTime, (respawnedBrick) => {
                let isIssueSpawn = false;
                if (!this.issueSpawned && respawnedBrick.isCenterTarget) {
                    this.issueSpawned = true;
                    respawnedBrick.isIssue = true;
                    
                    // ステージ設定からコアHPを取得
                    const config = STAGE_CONFIG[this.currentStageId] || STAGE_CONFIG['ikebukuro'];
                    const coreHp = config.coreHp;

                    respawnedBrick.hp = coreHp;
                    respawnedBrick.maxHp = coreHp;
                    isIssueSpawn = true;
                }
                
                if (isIssueSpawn && onIssueSpawn) {
                    onIssueSpawn(respawnedBrick);
                } else if (onRespawn && !isIssueSpawn) {
                    onRespawn(respawnedBrick);
                }
            });
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
                        continue; // コアブロックにはレーザー無効
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
