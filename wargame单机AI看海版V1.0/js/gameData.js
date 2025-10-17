// 游戏数据模块
// 包含游戏状态、城市数据、路线和军队数据

// 游戏状态
const gameState = {
    currentTurn: 1,
    currentPlayer: 'rome', // 'rome' or 'carthage'
    selectedRegion: null,
    selectedArmy: null,
    debugMode: false,
    editMode: false,
    draggedCity: null,
    isDragging: false,
    gameEnded: false, // 游戏是否已结束
    paused: false, // 全局暂停状态
    watchMode: false, // 看海模式标记
    watchModeAutoCarthage: false, // 看海模式下迦太基回合是否自动结束（false=手动点击，true=自动）
    armyLimitEnabled: true, // 军队数量限制（true=最多5支，false=无限制）
    // 时间系统
    startYear: -218, // 公元前218年
    currentYear: -218,
    currentMonth: 1, // 1-12月
    currentSeason: 'spring', // spring, summer, autumn, winter
    // 经济系统
    romeFunds: 2000, // 罗马初始资金
    carthageFunds: 2000, // 迦太基初始资金
    macedoniaFunds: 2000, // 马其顿初始资金
    seleucidFunds: 2000, // 塞琉古初始资金
    ptolemyFunds: 2000, // 托勒密初始资金
    romeDebt: 0, // 罗马债务
    carthageDebt: 0, // 迦太基债务
    macedoniaDebt: 0, // 马其顿债务
    seleucidDebt: 0, // 塞琉古债务
    ptolemyDebt: 0, // 托勒密债务
    romeLastTurnExpense: 0, // 罗马上一回合军费
    carthageLastTurnExpense: 0, // 迦太基上一回合军费
    macedoniaLastTurnExpense: 0, // 马其顿上一回合军费
    seleucidLastTurnExpense: 0, // 塞琉古上一回合军费
    ptolemyLastTurnExpense: 0, // 托勒密上一回合军费
    // 军队行动系统
    actedArmies: [], // 本回合已行动的军队ID列表
    currentArmyIndex: 0, // 当前操作的军队索引
    availableArmies: [], // 本回合可操作的军队列表
    // 城市状态追踪（每回合重置）
    citiesBesiegedThisTurn: [], // 本回合被围城的城市ID列表
    citiesHarassedThisTurn: [] // 本回合被骚扰的城市ID列表
};

// 城市数据 - 坐标表示城市中心点
const cities = [
    // 西班牙- 伊比利亚半岛
    { id: 'gades', name: '迦得斯', faction: 'carthage', important: false, x: 50, y: 390, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'emerita', name: '艾梅里达', faction: 'neutral', important: false, x: 70, y: 360, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'asturica', name: '阿斯图里加', faction: 'neutral', important: false, x: 80, y: 320, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'corduba', name: '科尔巴多', faction: 'carthage', important: false, x: 90, y: 380, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'toletum', name: '托莱图姆', faction: 'neutral', important: false, x: 110, y: 350, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'newcarthage', name: '新迦太基', faction: 'carthage', important: true, x: 130, y: 360, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 50, fortificationLevel: 1 },
    { id: 'sagunto', name: '萨贡托', faction: 'rome', important: false, x: 150, y: 330, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'bilibilis', name: '比比里斯', faction: 'neutral', important: false, x: 140, y: 310, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 10 },
    { id: 'taraco', name: '塔拉科', faction: 'neutral', important: false, x: 170, y: 290, region: 'spain',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'budilragus', name: '布迪拉格', faction: 'neutral', important: false, x: 160, y: 260, region: 'gaul',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 10 },
    
    // 高卢南部和北意大利
    { id: 'narbo', name: '纳博讷', faction: 'neutral', important: false, x: 190, y: 230, region: 'gaul',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'massalia', name: '马赛', faction: 'neutral', important: false, x: 220, y: 200, region: 'gaul',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'lugdunum', name: '卢格杜努姆', faction: 'neutral', important: false, x: 200, y: 150, region: 'gaul',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'cenabum', name: '凯纳布姆', faction: 'neutral', important: false, x: 180, y: 120, region: 'gaul',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'treveri', name: '特雷维里', faction: 'neutral', important: false, x: 210, y: 100, region: 'gaul',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'mediolanum', name: '梅迪奥拉努姆', faction: 'rome', important: false, x: 270, y: 170, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'placentia', name: '普拉森提亚', faction: 'rome', important: false, x: 280, y: 190, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'aquileia', name: '阿奎莱亚', faction: 'neutral', important: false, x: 330, y: 180, region: 'balkans',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'salona', name: '萨洛纳', faction: 'neutral', important: false, x: 380, y: 220, region: 'balkans',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'sirmium', name: '西尔米乌姆', faction: 'neutral', important: false, x: 420, y: 200, region: 'balkans',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'serdica', name: '赛尔迪卡', faction: 'neutral', important: false, x: 480, y: 240, region: 'balkans',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    
    // 意大利半岛
    { id: 'rome', name: '罗马', faction: 'rome', important: true, x: 330, y: 290, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 50, fortificationLevel: 1 },
    { id: 'casilinum', name: '阿斯库路姆', faction: 'rome', important: false, x: 340, y: 310, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'pisatum', name: '彭锡图', faction: 'rome', important: false, x: 370, y: 320, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'capua', name: '卡普阿', faction: 'rome', important: true, x: 350, y: 330, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 40, fortificationLevel: 1 },
    { id: 'brundisium', name: '布林迪西', faction: 'rome', important: false, x: 410, y: 350, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'rhegium', name: '里吉乌姆', faction: 'rome', important: false, x: 360, y: 380, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'tarentum', name: '墨西拿', faction: 'rome', important: false, x: 390, y: 360, region: 'sicily',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    
    // 西西里岛
    { id: 'lilybaeum', name: '莉莉巴厄姆', faction: 'rome', important: false, x: 300, y: 400, region: 'sicily',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'syracuse', name: '叙拉古', faction: 'neutral', important: true, x: 370, y: 420, region: 'sicily',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 50, fortificationLevel: 1 },
    
    // 北非
    { id: 'tingis', name: '廷吉斯', faction: 'carthage', important: false, x: 120, y: 480, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'sicca', name: '锡卡', faction: 'carthage', important: false, x: 190, y: 450, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'zella', name: '赛拉', faction: 'carthage', important: false, x: 170, y: 470, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 10 },
    { id: 'cirta', name: '艾奥姆尼姆', faction: 'carthage', important: false, x: 230, y: 440, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'utica', name: '乌提卡', faction: 'carthage', important: false, x: 290, y: 430, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'carthage', name: '迦太基', faction: 'carthage', important: true, x: 310, y: 440, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 50, fortificationLevel: 1 },
    { id: 'tacape', name: '塔卡佩', faction: 'carthage', important: false, x: 320, y: 480, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'thubactus', name: '图巴克图斯', faction: 'carthage', important: false, x: 350, y: 500, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 10 },
    { id: 'cyrenaica', name: '昔兰尼', faction: 'carthage', important: false, x: 420, y: 510, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'hadrumetum', name: '巴迪亚斯', faction: 'carthage', important: false, x: 340, y: 460, region: 'north_africa',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    
    // 亚得里亚海东
    { id: 'pharos', name: '拉文纳', faction: 'rome', important: false, x: 410, y: 270, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'bononia', name: '博纳尼亚', faction: 'rome', important: false, x: 370, y: 210, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'pisa', name: '比萨', faction: 'rome', important: false, x: 300, y: 240, region: 'italy',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    
    // 希腊半岛和马其顿
    { id: 'corinth', name: '科林斯', faction: 'macedonia', important: false, x: 480, y: 350, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'athens', name: '雅典', faction: 'macedonia', important: true, x: 450, y: 330, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 70, fortificationLevel: 1 },
    { id: 'sparta', name: '斯巴达', faction: 'macedonia', important: false, x: 510, y: 370, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'pella', name: '佩拉', faction: 'macedonia', important: true, x: 530, y: 290, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 50, economicScore: 40, fortificationLevel: 1 },
    { id: 'demetrias', name: '安布拉基亚', faction: 'macedonia', important: false, x: 540, y: 320, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'philippopolis', name: '迪拉奇乌姆', faction: 'macedonia', important: false, x: 420, y: 310, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    
    // 色雷斯和小亚细亚
    { id: 'aelos', name: '艾洛斯', faction: 'neutral', important: false, x: 590, y: 280, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'byzantium', name: '拜占庭', faction: 'neutral', important: false, x: 650, y: 260, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'nicomedia', name: '尼科米底亚', faction: 'neutral', important: false, x: 680, y: 280, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'ancyra', name: '安卡拉', faction: 'seleucid', important: false, x: 720, y: 300, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 1, economicScore: 20 },
    { id: 'sinope', name: '锡洛普', faction: 'neutral', important: false, x: 720, y: 240, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'pergamon', name: '帕伽玛', faction: 'neutral', important: false, x: 630, y: 320, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'ephesos', name: '以弗所', faction: 'neutral', important: false, x: 650, y: 350, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'crete', name: '克里特', faction: 'neutral', important: false, x: 550, y: 400, region: 'greece',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 40 },
    { id: 'perga', name: '佩尔加', faction: 'neutral', important: false, x: 680, y: 390, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'appia', name: '阿皮亚', faction: 'neutral', important: false, x: 700, y: 340, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'tarsus', name: '塔苏斯', faction: 'seleucid', important: false, x: 710, y: 420, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 1, economicScore: 30 },
    { id: 'caesarea', name: '欧塞比亚', faction: 'neutral', important: false, x: 750, y: 320, region: 'asia_minor',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 20 },
    { id: 'antioch', name: '安条克', faction: 'seleucid', important: true, x: 730, y: 460, region: 'levant',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 3, economicScore: 50, fortificationLevel: 1 },
    { id: 'damascus', name: '大马士革', faction: 'seleucid', important: false, x: 750, y: 490, region: 'levant',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 1, economicScore: 40 },
    { id: 'jerusalem', name: '耶路撒冷', faction: 'seleucid', important: false, x: 720, y: 520, region: 'levant',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 10, economicScore: 30 },
    { id: 'pelusium', name: '贝鲁西亚', faction: 'ptolemy', important: false, x: 680, y: 520, region: 'egypt',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 1, economicScore: 20 },
    
    // 埃及和利比亚边界
    { id: 'katabathmus', name: '卡塔巴特姆斯', faction: 'ptolemy', important: false, x: 580, y: 500, region: 'egypt',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 1, economicScore: 10 },
    
    // 埃及
    { id: 'alexandria', name: '亚历山大', faction: 'ptolemy', important: true, x: 730, y: 470, region: 'egypt',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 3, economicScore: 75, fortificationLevel: 1 },
    { id: 'memphis', name: '孟菲斯', faction: 'ptolemy', important: false, x: 750, y: 490, region: 'egypt',
      isUnderSiege: false, siegeCount: 0, besiegingFaction: null, politicalScore: 1, economicScore: 40 }
];

// 路径连接 - 基于真实地理和历史路线
// 格式：[city1, city2] 或 {from: city1, to: city2, type: 'sea'} 
// type为'sea'表示海路，需要投D6>=5才能移动成功
const routes = [
    // 西班牙沿海路
    ['gades', 'tingis'], ['gades', 'emerita'], ['emerita', 'asturica'],
    ['gades', 'corduba'], ['corduba', 'emerita'], ['corduba', 'toletum'], ['asturica', 'toletum'],
    ['asturica', 'bilibilis'], ['toletum', 'newcarthage'], ['corduba', 'newcarthage'],
    ['gades', 'newcarthage'], ['newcarthage', 'sagunto'], ['sagunto', 'taraco'],
    ['bilibilis', 'taraco'], ['bilibilis', 'toletum'], ['bilibilis', 'budilragus'],
    
    // 汉尼拔的阿尔卑斯山路线
    ['taraco', 'narbo'], ['budilragus', 'narbo'], ['budilragus', 'lugdunum'],
    ['budilragus', 'cenabum'], ['lugdunum', 'cenabum'], ['cenabum', 'treveri'],
    ['lugdunum', 'treveri'], ['lugdunum', 'mediolanum'], ['narbo', 'massalia'],
    ['massalia', 'lugdunum'], ['massalia', 'mediolanum'], ['mediolanum', 'placentia'],
    
    // 意大利半岛南北主干道
    ['placentia', 'pharos'], ['placentia', 'aquileia'], ['aquileia', 'salona'],
    ['aquileia', 'sirmium'], ['salona', 'sirmium'], ['sirmium', 'serdica'],
    ['serdica', 'pella'], ['salona', 'philippopolis'],
    ['rome', 'casilinum'], ['rome', 'capua'],
    ['casilinum', 'pharos'], ['casilinum', 'pisatum'], ['pisatum', 'brundisium'],
    ['casilinum', 'capua'], ['capua', 'rhegium'], ['rhegium', 'tarentum'],
    
    // 比萨连接
    ['rome', 'pisa'],
    
    // 博纳尼亚连接
    ['bononia', 'mediolanum'], ['bononia', 'pharos'], ['bononia', 'pisa'], ['bononia', 'placentia'],
    
    // 意大利到西西里的海路
    ['tarentum', 'syracuse'], ['lilybaeum', 'syracuse'], ['lilybaeum', 'tarentum'],
    {from: 'brundisium', to: 'rhegium', type: 'sea'},
    {from: 'sparta', to: 'syracuse', type: 'sea'}, {from: 'syracuse', to: 'alexandria', type: 'sea'},
    
    // 西西里到北非海路
    {from: 'lilybaeum', to: 'utica', type: 'sea'}, {from: 'syracuse', to: 'utica', type: 'sea'},
    {from: 'syracuse', to: 'carthage', type: 'sea'}, {from: 'syracuse', to: 'tacape', type: 'sea'},
    {from: 'syracuse', to: 'thubactus', type: 'sea'}, {from: 'syracuse', to: 'cyrenaica', type: 'sea'},
    {from: 'carthage', to: 'cyrenaica', type: 'sea'},
    
    // 北非沿海道路
    ['tingis', 'zella'], ['tingis', 'sicca'], ['sicca', 'zella'],
    ['sicca', 'cirta'], ['cirta', 'utica'], ['cirta', 'hadrumetum'],
    ['utica', 'carthage'], ['carthage', 'tacape'], ['tacape', 'thubactus'],
    ['thubactus', 'cyrenaica'], ['cyrenaica', 'katabathmus'],
    ['tacape', 'hadrumetum'], ['carthage', 'hadrumetum'],
    
    // 亚得里亚海东西岸连接
    ['rome', 'pharos'],
    
    // 希腊半岛内部
    ['athens', 'corinth'], ['athens', 'demetrias'], ['corinth', 'sparta'],
    ['pella', 'demetrias'],
    
    // 巴尔干半岛到小亚细亚
    ['demetrias', 'philippopolis'], ['philippopolis', 'pella'],
    
    // 埃及内部和边界连接
    ['katabathmus', 'alexandria'], ['alexandria', 'memphis'],
    
    // 重要的跨海路线
    {from: 'brundisium', to: 'philippopolis', type: 'sea'}, {from: 'athens', to: 'ephesos', type: 'sea'},
    {from: 'athens', to: 'crete', type: 'sea'}, {from: 'crete', to: 'alexandria', type: 'sea'},
    {from: 'athens', to: 'pergamon', type: 'sea'}, {from: 'athens', to: 'perga', type: 'sea'},
    {from: 'aelos', to: 'athens', type: 'sea'}, {from: 'cyrenaica', to: 'athens', type: 'sea'},
    ['pella', 'byzantium'], ['pella', 'aelos'], ['aelos', 'byzantium'],
    ['byzantium', 'nicomedia'], ['nicomedia', 'pergamon'],
    ['nicomedia', 'sinope'], ['nicomedia', 'appia'], ['ancyra', 'appia'],
    ['aelos', 'pergamon'], ['pergamon', 'ephesos'], ['ephesos', 'perga'],
    ['ephesos', 'appia'], ['perga', 'appia'], ['perga', 'tarsus'],
    ['tarsus', 'caesarea'], ['tarsus', 'antioch'], ['antioch', 'damascus'],
    ['damascus', 'jerusalem'], ['jerusalem', 'pelusium'], ['pelusium', 'alexandria'],
    ['ancyra', 'caesarea'], ['sinope', 'caesarea'],
    {from: 'perga', to: 'alexandria', type: 'sea'}, {from: 'ancyra', to: 'alexandria', type: 'sea'},
    {from: 'tarsus', to: 'alexandria', type: 'sea'}, {from: 'antioch', to: 'alexandria', type: 'sea'}
];

// 军队数据 - 将由指挥官系统动态填入
const armies = {
    rome: [],
    carthage: [],
    macedonia: [],
    seleucid: [],
    ptolemy: []
}; 