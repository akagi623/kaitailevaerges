import { 
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, 
    BRICK_PADDING, BRICK_OFFSET_TOP, BRICK_OFFSET_LEFT, ISSUE_BRICK_HP,
    STAGE_CONFIG, STAGE_ID
} from './Constants.js';
import { Brick } from './Brick.js';
import { Boss } from './Boss.js';

export class LevelManager {
    constructor() {
        this.bricks = [];
        this.bossBlocks = []; // ボスが生成するブロック
        this.issueSpawned = false;
        this.currentStageId = null;
        this.boss = null;
        this.bossImage = null;
        this.init();
    }

    init(stageId = 'ikebukuro', bossImage = null) {
        this.bricks = [];
        this.bossBlocks = [];
        this.issueSpawned = false;
        this.currentStageId = stageId;
        this.bossImage = bossImage;
        this.boss = null;

        const isShibuya = (stageId === 'shibuya');
        const isShinjuku = (stageId === STAGE_ID.SHINJUKU);

        if (isShinjuku && bossImage) {
            this.boss = new Boss((450 - 220) / 2, 100, bossImage);
            return; // 新宿ステージはボスのみ（最初は）
        }

        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                let brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                
                let width = BRICK_WIDTH;
                const isEdgeLeft = (c === 0);
                const isEdgeRight = (c === BRICK_COLS - 1);
                
                // 左右の端のブロックは、壁との隙間を空けて「裏回り」しやすくする
                if (isEdgeLeft) {
                    brickX += 15; // 右に寄せる
                    width -= 15;  // 幅を削る（左側に隙間を作る）
                } else if (isEdgeRight) {
                    width -= 15;  // 幅を削る（右側に隙間を作る）
                }

                const isIssue = false;
                const isEdge = isEdgeLeft || isEdgeRight;
                
                let isCenterTarget = false;
                if (stageId === STAGE_ID.SHINJUKU) {
                    // 新宿（旧ボス配置）：巨大なコアを中心とした要塞配置
                    isCenterTarget = (r >= 1 && r <= 4 && c >= 1 && c <= 4);
                } else if (isShibuya) {
                    // 渋谷：スクランブル配置（市松模様的な難しさ）
                    isCenterTarget = (r >= 1 && r <= 5 && c >= 1 && c <= 4 && (r + c) % 2 === 0);
                } else {
                    // 池袋：通常配置（中央付近）
                    isCenterTarget = (c >= 1 && c <= BRICK_COLS - 2 && r >= 2 && r <= BRICK_ROWS - 3);
                }
                
                const hp = isShibuya ? Math.floor(Math.random() * 41) + 30 : Math.floor(Math.random() * 31) + 20;

                const brick = new Brick(brickX, brickY, hp, isIssue, isEdge);
                brick.width = width; // 調整した幅を適用
                brick.isCenterTarget = isCenterTarget;
                this.bricks.push(brick);
            }
        }
    }

    checkCollision(ball, damage) {
        // ボスとの衝突判定を優先
        if (this.boss && this.boss.active) {
            const bossHit = this.boss.checkCollision(ball.x, ball.y, ball.radius);
            if (bossHit) {
                // 跳ね返り
                if (bossHit.dx !== 0) ball.dx = -ball.dx;
                if (bossHit.dy !== 0) ball.dy = -ball.dy;

                const damaged = this.boss.hit(damage);
                return {
                    hit: true,
                    isBoss: true,
                    invincible: bossHit.invincible,
                    damage: damaged ? damage : 0,
                    destroyed: !this.boss.active
                };
            }
        }

        // ボスが生成したブロックとの判定
        for (let i = this.bossBlocks.length - 1; i >= 0; i--) {
            const brick = this.bossBlocks[i];
            const collision = this._checkSingleBrickCollision(brick, ball);
            if (collision) {
                // ボスブロックは基本壊れない（または高HP）
                return { hit: true, brick: brick, destroyed: false, damage: 0 };
            }
        }

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

    _checkSingleBrickCollision(brick, ball) {
        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
        const distanceX = ball.x - closestX;
        const distanceY = ball.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (ball.radius * ball.radius)) {
            if (Math.abs(distanceX) > Math.abs(distanceY)) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }
            return true;
        }
        return false;
    }

    update(deltaTime, onRespawn, onIssueSpawn) {
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime);
            
            // ボスのブロック生成ロジック（暫定：5秒おきに周囲に配置）
            this.boss.blockTimer = (this.boss.blockTimer || 0) + deltaTime;
            if (this.boss.blockTimer > 5000) {
                this.boss.blockTimer = 0;
                this.spawnBossMinions();
            }
        }

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
        if (this.boss && this.boss.active) {
            this.boss.draw(ctx);
        }
        for (let brick of this.bossBlocks) {
            brick.draw(ctx);
        }
        for (let brick of this.bricks) {
            brick.draw(ctx);
        }
    }

    spawnBossMinions() {
        if (!this.boss) return;
        // 既存のボスブロックを消去
        this.bossBlocks = [];
        
        // ボスの周囲に4つブロックを配置
        const offset = 40;
        const positions = [
            { x: this.boss.x - offset, y: this.boss.y + this.boss.height / 2 },
            { x: this.boss.x + this.boss.width + offset - 60, y: this.boss.y + this.boss.height / 2 },
            { x: this.boss.x + this.boss.width / 2 - 30, y: this.boss.y - offset },
            { x: this.boss.x + this.boss.width / 2 - 30, y: this.boss.y + this.boss.height + offset }
        ];

        for (const pos of positions) {
            const b = new Brick(pos.x, pos.y, 9999, false, false); // 壊れないブロック
            b.width = 60;
            b.height = 20;
            this.bossBlocks.push(b);
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
        if (this.boss) return !this.boss.active;
        const issueBrick = this.bricks.find(b => b.isIssue);
        return issueBrick ? !issueBrick.active : false;
    }

    // 電磁爆弾: 全アクティブブロック（コアブロック除く）にダメージ
    bombDamageAll(damage) {
        let count = 0;
        for (let brick of this.bricks) {
            if (brick.active && !brick.isIssue) {
                brick.hit(damage);
                count++;
            }
        }
        return count;
    }
}
