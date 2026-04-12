export const CANVAS_WIDTH = 450;
export const CANVAS_HEIGHT = 800;

export const COLORS = {
    BALL: '#ffffff',
    PADDLE: '#ff9800',
    BRICK_HP1: '#e57373',
    BRICK_HP2: '#f06292',
    BRICK_HP3: '#ba68c8',
    PARTICLE: '#ffeb3b',
    UI_TEXT: '#ffffff'
};

export const BALL_RADIUS = 8;
export const BALL_INITIAL_SPEED = 5;

export const PADDLE_WIDTH = 80;
export const PADDLE_HEIGHT = 15;
export const PADDLE_SPEED = 8;

export const BRICK_ROWS = 6;
export const BRICK_COLS = 6;
export const BRICK_WIDTH = 60;
export const BRICK_HEIGHT = 25;
export const BRICK_PADDING = 8;
export const BRICK_OFFSET_TOP = 130;  // EXPバー・UIの下にスペース
export const BRICK_OFFSET_LEFT = 25;

export const SPECIAL_GAUGE_MAX = 100;
export const GAUGE_CHARGE_PER_HIT = 2; // パドルorブロックヒットでの上昇量
export const LASER_DAMAGE = 50;
export const LASER_COOLDOWN = 1000;

export const ISSUE_BRICK_HP = 1;
export const RESPAWN_TIME_NORMAL = 10000;
export const RESPAWN_TIME_EDGE = 30000;

export const MONEY_DROP_RATE = 0.3; // 30% chance to drop money on block destroy
export const MAGNET_RADIUS = 60; // Distance from paddle to start suction

export const GAME_STATE = {
    TITLE: 'TITLE',
    CHAR_SELECT: 'CHAR_SELECT',
    STAGE_SELECT: 'STAGE_SELECT',
    PLAYING: 'PLAYING',
    RESULT: 'RESULT',
    SHOP: 'SHOP'
};

export const STAGE_ID = {
    IKEBUKURO: 'ikebukuro',
    SHIBUYA: 'shibuya',
    SHINJUKU: 'shinjuku'
};

export const STAGE_CONFIG = {
    [STAGE_ID.IKEBUKURO]: {
        name: 'AI製造ハブ: 外部搬入路',
        coreHp: 1,
        difficulty: 1
    },
    [STAGE_ID.SHIBUYA]: {
        name: 'サーバー地区: メインフレーム入口',
        coreHp: 5,
        difficulty: 2
    },
    [STAGE_ID.SHINJUKU]: {
        name: '新宿: 摩天楼解体エリア',
        coreHp: 15,
        difficulty: 3,
        isBossStage: false
    }
};

export const EQUIPMENT_DATA = [
    {
        id: 'crowbar',
        name: 'プラズマトーチ',
        description: '高圧縮プラズマで装甲を溶断する基本ツール。攻撃力+5',
        price: 300,
        attackBoost: 5,
        color: '#00e5ff'
    },
    {
        id: 'hammer',
        name: '重力パイルバンカー',
        description: '局所的な重力場を発生させ、質量兵器を打ち込む。攻撃力+15',
        price: 1000,
        attackBoost: 15,
        color: '#ff5722'
    },
    {
        id: 'sabersaw',
        name: '高周波チェーンブレード',
        description: '分子結合を断ち切る超振動ブレード。攻撃力+40',
        price: 3500,
        attackBoost: 40,
        color: '#e040fb'
    },
    {
        id: 'excavator',
        name: '解体メック『タイタン』',
        description: '規格外の出力を誇る対巨大建造物用の搭乗兵器。攻撃力+100',
        price: 15000,
        attackBoost: 100,
        color: '#ffca28'
    }
];
