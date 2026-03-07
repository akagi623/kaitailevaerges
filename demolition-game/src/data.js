export const BLOCK_TYPES = {
  wood: {
    hp: 40,
    color: '#d97706',
    score: 100
  },
  concrete: {
    hp: 120,
    color: '#64748b',
    score: 300
  },
  steel: {
    hp: 300,
    color: '#94a3b8',
    score: 1000
  }
};

export const CHARACTERS = [
  {
    id: 'tetsu',
    name: '解体ルーキー・テツ',
    desc: 'ガッツ溢れる新人職人。平均的な能力で扱いやすい。',
    color: '#f0ab3d',
    speed: 5,
    power: 4,
    size: 100
  },
  {
    id: 'masa',
    name: 'スピードスター・マサ',
    desc: '迅速な作業がモットー。玉のスピードが非常に速く、玄人向け。',
    color: '#34d399',
    speed: 8,
    power: 3,
    size: 80
  },
  {
    id: 'gon',
    name: '重機使いのゴン',
    desc: '圧倒的なパワーを誇るベテラン。玉は重く、受け皿も大きいが制御が難しい。',
    color: '#f87171',
    speed: 6,
    power: 10,
    size: 130
  }
];

export const STAGES = [
  {
    id: 'stage1',
    name: '現場：老朽化した木造家屋',
    reward: 5000,
    timeLimit: 180,
    blocks: [
      // Denser layout
      ...Array.from({ length: 65 }, (_, i) => ({
        x: i % 13,
        y: Math.floor(i / 13),
        type: 'wood'
      }))
    ]
  },
  {
    id: 'stage2',
    name: '現場：コンクリートビル解体',
    reward: 15000,
    timeLimit: 300,
    blocks: [
      ...Array.from({ length: 65 }, (_, i) => ({
        x: i % 13,
        y: Math.floor(i / 13),
        type: i % 3 === 0 ? 'concrete' : 'wood'
      }))
    ]
  }
];
