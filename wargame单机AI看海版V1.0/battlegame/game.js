
        class HexGame {
            constructor() {
                this.gridWidth = 100; // 减少50%
                this.gridHeight = 50; // 减少50%
                this.hexSize = 60;
                this.currentPlayer = 'rome'; // 'rome' or 'carthage'
                this.currentPhase = 'deployment'; // 'deployment', 'movement', 'turning', 'ranged', 'melee'
                this.deploymentPhase = 'rome'; // 'rome', 'carthage', 'completed'
                this.meleeSubPhase = 'select_attacker'; // 'select_attacker', 'select_target', 'select_attacker_support', 'select_defender_support', 'execute_combat'
                this.meleeType = null; // 'charge' (冲锋近战) or 'sustained' (持续近战)
                this.meleeAttacker = null; // 冲锋单位
                this.meleeTarget = null; // 被攻击单位
                this.attackerSupports = []; // 攻击方支援部队
                this.defenderSupports = []; // 防守方支援部队
                this.selectedUnit = null;
                this.isDragging = false;
                this.draggedUnit = null;
                this.dragOffset = { x: 0, y: 0 };
                this.lastClickTime = 0;
                this.lastClickedUnit = null;
                this.generalDeathTestDone = { rome: false, carthage: false }; // 跟踪将领阵亡测试是否已执行
                this.lastSpaceKeyTime = 0; // 用于检测双击空格键
                this.targetPosition = null; // 选择的目标位置
                this.moveState = 'none'; // 'none', 'unit_selected', 'planning', 'ready_to_execute', 'all_planned'
                this.movePlan = []; // 当前单位的移动规划步骤 [{startX, startY, endX, endY}, ...]
                this.currentPlanStep = 0; // 当前规划的步骤
                this.allUnitPlans = new Map(); // 所有单位的移动规划 Map<unitId, plan[]>
                this.planningPhase = 'planning'; // 'planning', 'executing'
                this.phaseCompleted = { movement: false, turning: false, ranged: false, melee: false }; // 各阶段完成状态
                this.lastClickTime = 0;
                this.lastClickedHex = null;
                this.units = [];
                this.gameBoard = [];
                this.showUnitInfo = true; // 控制是否显示单位名称和HP值
                this.rangedAttacker = null; // 射击阶段的攻击单位
                this.rangedTarget = null; // 射击阶段的目标单位
                
                this.initializeGame();
                this.setupEventListeners();
            }

            initializeGame() {
                this.createHexGrid();
                this.initializeUnits();
                
                // 计算初始总分值
                this.initialPoints = {
                    rome: this.calculateFactionPoints('rome'),
                    carthage: this.calculateFactionPoints('carthage')
                };
                console.log(`[游戏初始化] 罗马初始分值: ${this.initialPoints.rome}, 迦太基初始分值: ${this.initialPoints.carthage}`);
                
                this.renderBoard();
                this.updateMoveButtons(); // 确保按钮状态正确
                this.updateUI();
                
                // 如果是部署阶段，添加提示信息
                if (this.currentPhase === 'deployment') {
                    this.addGameLog(`📦 部署阶段开始！拖拽己方单位调整部署位置`);
                    this.addGameLog(`🏛️ 罗马：可在地图下方区域部署`);
                    this.addGameLog(`🌊 迦太基：可在地图上方区域部署`);
                    this.addGameLog(`💡 拖拽单位到合适位置，完成后点击"确认部署"按钮`);
                }
            }

            createHexGrid() {
                // 创建六角格坐标系统
                this.gameBoard = [];
                for (let row = 0; row < this.gridHeight; row++) {
                    this.gameBoard[row] = [];
                    for (let col = 0; col < this.gridWidth; col++) {
                        this.gameBoard[row][col] = {
                            x: col,
                            y: row,
                            unit: null,
                            terrain: 'plains'
                        };
                    }
                }
            }

            initializeUnits() {
                // 定义单位尺寸（朝向为north时的尺寸）
                this.unitBaseSizes = {
                    'infantry': { width: 3, height: 2 },     // 步兵 3x2
                    'cavalry': { width: 2, height: 1 },      // 骑兵 2x1  
                    'archer': { width: 3, height: 1 },       // 弓箭手 3x1
                    'legionary': { width: 3, height: 2 },    // 军团兵 3x2
                    'centurion': { width: 2, height: 1 },    // 百夫长 2x1
                    'hastati': { width: 3, height: 2 },      // 后备兵 3x2
                    'elephant': { width: 3, height: 2 },     // 战象 3x2
                    'general': { width: 2, height: 1 }       // 将领 2x1 (等同于骑兵)
                };

                // 为了兼容现有代码，保留unitSizes
                this.unitSizes = this.unitBaseSizes;

                // 定义单位分值
                this.unitValues = {
                    // 罗马单位
                    'legionary': 5,      // 罗马军团兵
                    'hastati': 7,        // 罗马后备兵
                    'cavalry': 12,       // 罗马贵族骑兵/迦太基骑兵
                    'general': 15,       // 罗马将军/迦太基将军
                    'archer': 3,         // 罗马弓箭手/迦太基弓箭手
                    // 迦太基单位
                    'infantry': 5,       // 迦太基步兵
                    'elephant': 20,      // 迦太基战象（特殊单位，分值较高）
                    'centurion': 15      // 百夫长（如果使用）
                };

                // 战场单位
                this.units = [
                    // 第一排军团步兵
                    { 
                        id: 1, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 34, 
                        y: 34, 
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',         // 士气：good(良好)/shaken(动摇)
                        order: 'good',          // 秩序：good(良好)/chaotic(混乱)
                        combatStatus: 'not_engaged',  // 战斗状态：engaged(近战中)/not_engaged(未近战)/supporting(支援中)
                        hasRangedAttacked: false,     // 已射击：true/false
                        hasMeleeAttacked: false,      // 已近战：true/false
                        lastMeleeResult: 'none'       // 上一轮近战结果：none(无)/won(胜利)/lost(失败)/draw(势均力敌)
                    },
                    { 
                        id: 2, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 41, 
                        y: 34, 
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 3, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 48, 
                        y: 34,
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 4, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 55, 
                        y: 34,
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    // 第二排军团步兵
                    { 
                        id: 5, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 38, 
                        y: 36,
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 6, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 44, 
                        y: 36,
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 7, 
                        name: '军团步兵', 
                        type: 'legionary', 
                        faction: 'rome', 
                        x: 52, 
                        y: 36,
                        chargeAttack: 5,        // 冲锋近战
                        sustainedMelee: 5,      // 持续近战
                        supportMelee: 2,        // 支援近战
                        throwingAttack: 2,      // 投掷攻击
                        rangedAttack: 2,        // 射击攻击
                        defense: 4,             // 防御能力
                        casualtyTolerance: 4,   // 伤亡承受力
                        specialSkills: ['盾墙', '投掷标枪'], // 特殊技能
                        range: 6,               // 射程
                        movement: 6,            // 移动
                        leadership: 0,          // 领导力
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    // 第三排后备步兵
                    { 
                        id: 8, 
                        name: '罗马后备兵', 
                        type: 'hastati', 
                        faction: 'rome', 
                        x: 34, 
                        y: 39, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 4,
                        specialSkills: ['指挥', '激励'],
                        range: 1,
                        movement: 6,
                        leadership: 3,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 9, 
                        name: '罗马后备兵', 
                        type: 'hastati', 
                        faction: 'rome', 
                        x: 41, 
                        y: 39,
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 4,
                        specialSkills: ['指挥', '激励'],
                        range: 1,
                        movement: 6,
                        leadership: 3,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 10, 
                        name: '罗马后备兵', 
                        type: 'hastati', 
                        faction: 'rome', 
                        x: 48, 
                        y: 39,
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 4,
                        specialSkills: ['指挥', '激励'],
                        range: 1,
                        movement: 6,
                        leadership: 3,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 11, 
                        name: '罗马后备兵', 
                        type: 'hastati', 
                        faction: 'rome', 
                        x: 55, 
                        y: 39,
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 3,
                        rangedAttack: 2,
                        defense: 4,
                        casualtyTolerance: 4,
                        specialSkills: ['指挥', '激励'],
                        range: 6,
                        movement: 6,
                        leadership: 3,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    //骑兵
                    { 
                        id: 12, 
                        name: '罗马执政官', 
                        type: 'general', 
                        faction: 'rome', 
                        x: 20, 
                        y: 33, 
                        chargeAttack: 6,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 8,
                        specialSkills: ['高级指挥', '战术大师', '鼓舞士气'],
                        range: 1,
                        movement: 9,
                        leadership: 9,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 13, 
                        name: '罗马贵族骑兵', 
                        type: 'cavalry', 
                        faction: 'rome', 
                        x: 66, 
                        y: 33, 
                        chargeAttack: 6,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['冲锋', '快速机动'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 14, 
                        name: '罗马贵族骑兵', 
                        type: 'cavalry', 
                        faction: 'rome', 
                        x: 17, 
                        y: 33, 
                        chargeAttack: 6,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['冲锋', '快速机动'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 15, 
                        name: '罗马贵族骑兵', 
                        type: 'cavalry', 
                        faction: 'rome', 
                        x: 69, 
                        y: 33, 
                        chargeAttack: 6,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['冲锋', '快速机动'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    // 同盟弓箭手
                    { 
                        id: 16, 
                        name: '同盟的弓箭手', 
                        type: 'archer', 
                        faction: 'rome', 
                        x: 27, 
                        y: 30, 
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 1,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['精准射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 17, 
                        name: '同盟的弓箭手', 
                        type: 'archer', 
                        faction: 'rome', 
                        x: 40, 
                        y: 30,
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 1,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['精准射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 18, 
                        name: '同盟的弓箭手', 
                        type: 'archer', 
                        faction: 'rome', 
                        x: 50, 
                        y: 30,
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 1,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['精准射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 19, 
                        name: '同盟的弓箭手', 
                        type: 'archer', 
                        faction: 'rome', 
                        x: 60, 
                        y: 30,
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 1,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['精准射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'north',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    
                    // 迦太基步兵
                    { 
                        id: 117, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 30, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 118, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 34, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 119, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 38, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 120, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 42, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 121, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 46, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 122, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 50, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 123, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 54, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 124, 
                        name: '迦太基步兵', 
                        type: 'infantry', 
                        faction: 'carthage', 
                        x: 58, 
                        y: 9, 
                        chargeAttack: 6,
                        sustainedMelee: 6,
                        supportMelee: 3,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 4,
                        casualtyTolerance: 5,
                        specialSkills: ['狂热冲锋'],
                        range: 1,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    // 迦太基战象和骑兵
                    { 
                        id: 125, 
                        name: '迦太基战象', 
                        type: 'elephant', 
                        faction: 'carthage', 
                        x: 19, 
                        y: 8, 
                        chargeAttack: 4,
                        sustainedMelee: 3,
                        supportMelee: 1,
                        throwingAttack: 1,
                        rangedAttack: 1,
                        defense: 4,
                        casualtyTolerance: 9,
                        specialSkills: ['践踏', '恐怖冲击', '巨兽威慑'],
                        range: 6,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 60,
                        maxHp: 60,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 126, 
                        name: '迦太基骑兵', 
                        type: 'cavalry', 
                        faction: 'carthage', 
                        x: 67, 
                        y: 10, 
                        chargeAttack: 5,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['游击战术', '快速撤退'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 127, 
                        name: '迦太基骑兵', 
                        type: 'cavalry', 
                        faction: 'carthage', 
                        x: 70, 
                        y: 10, 
                        chargeAttack: 5,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['游击战术', '快速撤退'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 128, 
                        name: '迦太基骑兵', 
                        type: 'cavalry', 
                        faction: 'carthage', 
                        x: 73, 
                        y: 10, 
                        chargeAttack: 5,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['游击战术', '快速撤退'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 129, 
                        name: '迦太基骑兵', 
                        type: 'cavalry', 
                        faction: 'carthage', 
                        x: 76, 
                        y: 10, 
                        chargeAttack: 5,
                        sustainedMelee: 3,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['游击战术', '快速撤退'],
                        range: 1,
                        movement: 9,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 130, 
                        name: '迦太基将军', 
                        type: 'general', 
                        faction: 'carthage', 
                        x: 24, 
                        y: 8, 
                        chargeAttack: 6,
                        sustainedMelee: 4,
                        supportMelee: 2,
                        throwingAttack: 0,
                        rangedAttack: 0,
                        defense: 5,
                        casualtyTolerance: 5,
                        specialSkills: ['高级指挥', '战术大师', '鼓舞士气'],
                        range: 1,
                        movement: 9,
                        leadership: 9,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    // 迦太基弓箭手
                    { 
                        id: 131, 
                        name: '迦太基弓箭手', 
                        type: 'archer', 
                        faction: 'carthage', 
                        x: 30, 
                        y: 13, 
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 2,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['连续射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 132, 
                        name: '迦太基弓箭手', 
                        type: 'archer', 
                        faction: 'carthage', 
                        x: 43, 
                        y: 13, 
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 2,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['连续射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                    { 
                        id: 133, 
                        name: '迦太基弓箭手', 
                        type: 'archer', 
                        faction: 'carthage', 
                        x: 58, 
                        y: 13, 
                        chargeAttack: 3,
                        sustainedMelee: 2,
                        supportMelee: 2,
                        throwingAttack: 2,
                        rangedAttack: 2,
                        defense: 6,
                        casualtyTolerance: 4,
                        specialSkills: ['连续射击'],
                        range: 12,
                        movement: 6,
                        leadership: 0,
                        hasMoved: false, 
                        direction: 'south',
                        hp: 40,
                        maxHp: 40,
                        morale: 'good',
                        order: 'good',
                        combatStatus: 'not_engaged',
                        hasRangedAttacked: false,
                        hasMeleeAttacked: false
                    },
                ];

                // 为所有单位添加lastMeleeResult、lastBattleDamage、engagedWith、supportingUnit、value属性（如果还没有）
                this.units.forEach(unit => {
                    if (!unit.hasOwnProperty('lastMeleeResult')) {
                        unit.lastMeleeResult = 'none';
                    }
                    if (!unit.hasOwnProperty('lastBattleDamage')) {
                        unit.lastBattleDamage = 0;
                    }
                    if (!unit.hasOwnProperty('engagedWith')) {
                        unit.engagedWith = null; // 追踪正在与谁近战
                    }
                    if (!unit.hasOwnProperty('supportingUnit')) {
                        unit.supportingUnit = null; // 追踪正在支援哪个单位
                    }
                    
                    // 为每个单位设置分值
                    if (!unit.hasOwnProperty('value')) {
                        unit.value = this.unitValues[unit.type] || 0;
                    }
                    
                    // 统一设置单位朝向：罗马朝北，迦太基朝南
                    if (unit.faction === 'rome') {
                        unit.direction = 'north';
                    } else if (unit.faction === 'carthage') {
                        unit.direction = 'south';
                    }
                });

                // 计算并存储初始总分值
                this.initialRomeValue = this.units
                    .filter(u => u.faction === 'rome')
                    .reduce((sum, u) => sum + (u.value || 0), 0);
                this.initialCarthageValue = this.units
                    .filter(u => u.faction === 'carthage')
                    .reduce((sum, u) => sum + (u.value || 0), 0);
                
                console.log(`初始分值 - 罗马: ${this.initialRomeValue}, 迦太基: ${this.initialCarthageValue}`);

            }

            setupEventListeners() {
                document.getElementById('reset-btn').addEventListener('click', () => {
                    this.resetGame();
                });

                document.getElementById('add-step-btn').addEventListener('click', () => {
                    this.addPlanStep();
                });

                document.getElementById('finish-plan-btn').addEventListener('click', () => {
                    this.finishPlanning();
                });

                document.getElementById('execute-plan-btn').addEventListener('click', async () => {
                    // 防止重复点击
                    const btn = document.getElementById('execute-plan-btn');
                    if (btn.disabled) return;
                    
                    btn.disabled = true;
                    btn.textContent = '执行中...';
                    
                    try {
                        await this.executePlan();
                    } catch (error) {
                        console.error('执行单个计划时出错:', error);
                        this.addGameLog('❌ 执行单个计划时发生错误，请重试');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = '执行移动';
                    }
                });

                document.getElementById('finish-all-plans-btn').addEventListener('click', () => {
                    this.finishAllPlanning();
                });

                document.getElementById('execute-all-btn').addEventListener('click', async () => {
                    // 防止重复点击
                    const btn = document.getElementById('execute-all-btn');
                    if (btn.disabled) return;
                    
                    btn.disabled = true;
                    btn.textContent = '执行中...';
                    
                    try {
                        await this.executeAllPlans();
                    } catch (error) {
                        console.error('执行计划时出错:', error);
                        this.addGameLog('❌ 执行计划时发生错误，请重试');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = '统一执行';
                    }
                });

                document.getElementById('cancel-move-btn').addEventListener('click', () => {
                    this.cancelMove();
                });

                document.getElementById('next-phase-btn').addEventListener('click', () => {
                    const btn = document.getElementById('next-phase-btn');
                    if (btn.disabled) {
                        console.log('[阶段控制] 下一阶段按钮被禁用');
                        return;
                    }
                    this.nextPhase();
                });

                document.getElementById('confirm-deployment-btn').addEventListener('click', () => {
                    this.confirmDeployment();
                });
                
                document.getElementById('finish-attacker-support-btn').addEventListener('click', () => {
                    this.finishAttackerSupport();
                });
                
                document.getElementById('finish-defender-support-btn').addEventListener('click', () => {
                    this.finishDefenderSupport();
                });
                
                document.getElementById('defender-retreat-btn').addEventListener('click', () => {
                    this.defenderChooseRetreat();
                });
                
                document.getElementById('defender-stand-btn').addEventListener('click', () => {
                    this.defenderChooseStand();
                });
                
                document.getElementById('execute-charge-btn').addEventListener('click', () => {
                    this.executeChargeAttack();
                    this.renderBoard();
                    this.updateUI();
                });

                document.getElementById('confirm-ranged-attack-btn').addEventListener('click', () => {
                    this.confirmRangedAttack();
                });

                document.getElementById('toggle-unit-info-btn').addEventListener('click', () => {
                    this.toggleUnitInfo();
                });

                document.getElementById('save-game-btn').addEventListener('click', () => {
                    this.saveGame();
                });

                document.getElementById('load-game-btn').addEventListener('click', () => {
                    this.loadGame();
                });

                // 添加全局拖拽事件
                document.addEventListener('mousemove', (e) => {
                    this.handleDrag(e);
                });

                document.addEventListener('mouseup', (e) => {
                    this.endDrag(e);
                });

                // 添加键盘事件监听器
                document.addEventListener('keydown', (e) => {
                    this.handleKeyPress(e);
                });
            }

            renderBoard() {
                const container = document.getElementById('square-grid');
                container.innerHTML = '';

                // 渲染基础网格（完整渲染以消除间隙）
                for (let row = 0; row < this.gridHeight; row++) {
                    for (let col = 0; col < this.gridWidth; col++) {
                        const square = this.createSquareElement(col, row);
                        container.appendChild(square);
                    }
                }

                // 渲染单位（根据部署阶段决定显示哪些单位）
                // 注意：即使HP<=0也要渲染单位，因为它们可能正在进行崩溃测试和后退
                // 只有真正被消灭（从units数组中移除）的单位才不会被渲染
                this.units.forEach(unit => {
                    if (!unit.isAnimating) {
                        // 在部署阶段，只显示当前部署方的单位
                        if (this.currentPhase === 'deployment') {
                            if (unit.faction === this.deploymentPhase) {
                        const unitElement = this.createLargeUnitElement(unit);
                        container.appendChild(unitElement);
                            }
                        } else {
                            // 非部署阶段，显示所有单位
                            const unitElement = this.createLargeUnitElement(unit);
                            container.appendChild(unitElement);
                        }
                    }
                });

                // 渲染后重新应用高亮和路径
                this.drawAllMovePaths();
                if (this.selectedUnit && this.moveState === 'planning') {
                    this.highlightCurrentStepMoves();
                } else if (this.selectedUnit && this.moveState === 'unit_selected') {
                    this.highlightCurrentStepMoves();
                }
            }

            createSquareElement(x, y) {
                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.x = x;
                square.dataset.y = y;

                // 小格子布局
                const squareSize = 16;
                const posX = x * squareSize;
                const posY = y * squareSize;

                square.style.left = posX + 'px';
                square.style.top = posY + 'px';

                // 草地效果 - 深浅草绿色相间
                if ((x + y) % 2 === 0) {
                    square.style.background = '#27ae60';
                } else {
                    square.style.background = '#2ecc71';
                }

                // 在部署阶段显示部署区域
                if (this.currentPhase === 'deployment') {
                    // 罗马部署区域（下半部分）
                    if (y >= this.gridHeight * 0.6) {
                        square.classList.add('deployment-zone-rome');
                        if (this.deploymentPhase === 'rome') {
                            square.classList.add('deployment-zone-active');
                        }
                    }
                    // 迦太基部署区域（上半部分）
                    else if (y < this.gridHeight * 0.4) {
                        square.classList.add('deployment-zone-carthage');
                        if (this.deploymentPhase === 'carthage') {
                            square.classList.add('deployment-zone-active');
                        }
                    }
                }

                square.addEventListener('click', (e) => {
                    console.log('方格被点击!', x, y);
                    this.handleSquareClick(x, y, e);
                });

                return square;
            }

            createLargeUnitElement(unit) {
                const size = this.getUnitSizeWithDirection(unit);
                const squareSize = 16;
                
                const unitDiv = document.createElement('div');
                unitDiv.className = `unit-large ${unit.faction}`;
                if (unit.hasMoved) {
                    unitDiv.classList.add('has-moved');
                }
                
                // 近战阶段的高亮
                if (this.currentPhase === 'melee') {
                    // 选择攻击者阶段 - 高亮已选择的攻击者
                    if (this.meleeSubPhase === 'select_attacker' && this.meleeAttacker && unit.id === this.meleeAttacker.id) {
                        unitDiv.classList.add('target-selected');
                    }
                    
                    // 选择目标阶段
                    if (this.meleeSubPhase === 'select_target' && this.meleeAttacker) {
                        // 已选择的攻击者 - 黄色框
                        if (unit.id === this.meleeAttacker.id) {
                            unitDiv.classList.add('target-selected');
                        }
                        // 可选的攻击目标 - 紫色框脉冲
                        const availableTargets = this.getUnitsInRange(this.meleeAttacker, 3, false);
                        if (availableTargets.find(u => u.id === unit.id)) {
                            unitDiv.classList.add('target-available');
                        }
                    }
                    
                    // 选择攻击方支援阶段
                    if (this.meleeSubPhase === 'select_attacker_support' && this.meleeAttacker) {
                        // 已选择的攻击者 - 黄色框
                        if (unit.id === this.meleeAttacker.id) {
                            unitDiv.classList.add('target-selected');
                        }
                        // 已选择的目标 - 黄色框
                        if (this.meleeTarget && unit.id === this.meleeTarget.id) {
                            unitDiv.classList.add('target-selected');
                        }
                        // 已添加的支援单位 - 黄色框放大（优先判断）
                        const isSelected = this.attackerSupports.find(u => u.id === unit.id);
                        if (isSelected) {
                            unitDiv.classList.add('support-selected');
                        } else {
                            // 可被添加的支援单位 - 紫色框脉冲（排除已添加的）
                            const availableSupports = this.getAvailableSupportUnits(this.meleeAttacker);
                            if (availableSupports.find(u => u.id === unit.id)) {
                                unitDiv.classList.add('support-available');
                            }
                        }
                    }
                    
                    // 选择防守方支援阶段
                    if (this.meleeSubPhase === 'select_defender_support' && this.meleeTarget) {
                        // 已选择的攻击者 - 黄色框
                        if (this.meleeAttacker && unit.id === this.meleeAttacker.id) {
                            unitDiv.classList.add('target-selected');
                        }
                        // 已选择的目标 - 黄色框
                        if (unit.id === this.meleeTarget.id) {
                            unitDiv.classList.add('target-selected');
                        }
                        // 已添加的攻击方支援单位 - 黄色框
                        if (this.attackerSupports.find(u => u.id === unit.id)) {
                            unitDiv.classList.add('support-selected');
                        }
                        // 已添加的防守方支援单位 - 黄色框放大（优先判断）
                        const isDefenderSelected = this.defenderSupports.find(u => u.id === unit.id);
                        if (isDefenderSelected) {
                            unitDiv.classList.add('support-selected');
                        } else {
                            // 可被添加的防守方支援单位 - 紫色框脉冲（排除已添加的）
                            const availableSupports = this.getAvailableSupportUnits(this.meleeTarget);
                            if (availableSupports.find(u => u.id === unit.id)) {
                                unitDiv.classList.add('support-available');
                            }
                        }
                    }
                }
                // 为图片单位添加特殊类
                if ((unit.faction === 'rome' && (unit.type === 'legionary' || unit.type === 'centurion' || unit.type === 'hastati' || unit.type === 'cavalry' || unit.type === 'archer' || unit.type === 'general')) || 
                    (unit.faction === 'carthage' && (unit.type === 'cavalry' || unit.type === 'archer' || unit.type === 'general' || unit.type === 'infantry' || unit.type === 'elephant'))) {
                    unitDiv.classList.add('image-unit');
                }
                unitDiv.dataset.unitId = unit.id;
                unitDiv.dataset.x = unit.x;
                unitDiv.dataset.y = unit.y;
                
                // 设置单位尺寸和位置
                unitDiv.style.width = (size.width * squareSize) + 'px';
                unitDiv.style.height = (size.height * squareSize) + 'px';
                unitDiv.style.left = (unit.x * squareSize) + 'px';
                unitDiv.style.top = (unit.y * squareSize) + 'px';
                
                // HP<=0的单位显示为濒死状态（半透明+红色边框）
                if (unit.hp <= 0) {
                    unitDiv.style.opacity = '0.6';
                    unitDiv.style.border = '3px solid #e74c3c';
                    unitDiv.style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.8)';
                }
                
                // 获取单位图标和方向箭头
                const unitIcon = this.getUnitIcon(unit);
                const directionArrow = this.getDirectionArrow(unit.direction);
                
                const fontSize = Math.min(size.width * 2, size.height * 3, 16);
                
                // 将领有特殊的显示效果
                const isGeneral = unit.type === 'general';
                const borderStyle = '';
                
                // 为图片单位和emoji单位使用不同的布局
                const isImageUnit = (unit.faction === 'rome' && (unit.type === 'legionary' || unit.type === 'centurion' || unit.type === 'hastati' || unit.type === 'cavalry' || unit.type === 'archer' || unit.type === 'general')) || 
                                   (unit.faction === 'carthage' && (unit.type === 'cavalry' || unit.type === 'archer' || unit.type === 'general' || unit.type === 'infantry' || unit.type === 'elephant'));
                
                // 使用单位的name字段作为显示名称
                const unitDisplayName = unit.name;
                
                if (isImageUnit) {
                    // 计算图片旋转角度
                    const rotationDegrees = {
                        'north': 0,
                        'east': 90,
                        'south': 180,
                        'west': 270
                    };
                    const rotation = rotationDegrees[unit.direction] || 0;
                    
                    // 计算缩放比例以保持图片在旋转后的大小一致
                    const isRotated = (unit.direction === 'east' || unit.direction === 'west');
                    const scaleValue = isRotated ? Math.max(size.width / size.height, size.height / size.width) : 1;
                    
                    unitDiv.innerHTML = `
                        <div style="position: relative; width: 100%; height: 100%; background: transparent; ${borderStyle}">
                            <div style="width: 100%; height: 100%; background: transparent; display: flex; align-items: center; justify-content: center; transform: rotate(${rotation}deg) scale(${scaleValue});">
                                ${unitIcon}
                            </div>
                            ${isGeneral ? `<div style="position: absolute; top: 2px; left: 2px; font-size: ${fontSize-3}px; color: #f1c40f; font-weight: bold; background: rgba(0,0,0,0.5); padding: 1px 3px; border-radius: 2px;">L${unit.leadership}</div>` : ''}
                            ${this.showUnitInfo ? `<div style="position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: ${Math.max(8, fontSize-4)}px; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,1); background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 3px; white-space: nowrap; z-index: 10; border: 1px solid #000;">
                                ${unitDisplayName}
                            </div>` : ''}
                        </div>
                    `;
                } else {
                    unitDiv.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-size: ${fontSize-4}px; ${borderStyle}">
                            <div style="font-size: ${fontSize}px; margin-bottom: 1px;">${unitIcon}</div>
                            <div style="font-size: ${fontSize-2}px; color: #f1c40f; text-shadow: 1px 1px 2px rgba(0,0,0,1);">
                                ${directionArrow}
                            </div>
                            ${isGeneral ? `<div style="font-size: ${fontSize-3}px; color: #f1c40f; font-weight: bold;">L${unit.leadership}</div>` : ''}
                            ${this.showUnitInfo ? `<div style="position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: ${Math.max(8, fontSize-4)}px; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,1); background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 3px; white-space: nowrap; z-index: 10; border: 1px solid #000;">
                                ${unitDisplayName}
                            </div>` : ''}
                        </div>
                    `;
                }
                
                const hpPercentage = (unit.hp / unit.maxHp) * 100;
                let hpColor = '#2ecc71';
                if (hpPercentage < 70) hpColor = '#f39c12';
                if (hpPercentage < 40) hpColor = '#e74c3c';
                
                // 获取单位名称
                const getUnitName = (unitType) => {
                    const nameMap = {
                        'legionary': '军团兵',
                        'centurion': '百夫长',
                        'archer': '弓箭手',
                        'infantry': '步兵',
                        'elephant': '战象',
                        'cavalry': '骑兵',
                        'general': '将领'
                    };
                    return nameMap[unitType] || unitType;
                };
                
                const moraleText = unit.morale === 'good' ? '良好' : '动摇';
                const orderText = unit.order === 'good' ? '良好' : '混乱';
                const combatText = unit.combatStatus === 'engaged' ? '近战中' : unit.combatStatus === 'supporting' ? '支援中' : '未近战';
                const directionText = {
                    'north': '北↑',
                    'east': '东→', 
                    'south': '南↓',
                    'west': '西←'
                }[unit.direction] || unit.direction;
                const directionIcon = {
                    'north': '⬆️',
                    'east': '➡️', 
                    'south': '⬇️',
                    'west': '⬅️'
                }[unit.direction] || '🧭';
                
                const tooltipText = `${unit.name} (${unit.faction === 'rome' ? '罗马' : '迦太基'}) | 💎分值: ${unit.value || 0}
HP: ${unit.hp}/${unit.maxHp} | 朝向: ${directionIcon}${directionText} | 位置: (${unit.x}, ${unit.y})
士气: ${moraleText} | 秩序: ${orderText} | 战斗状态: ${combatText}
冲锋近战: ${unit.chargeAttack} | 持续近战: ${unit.sustainedMelee} | 支援近战: ${unit.supportMelee}
投掷攻击: ${unit.throwingAttack} | 射击攻击: ${unit.rangedAttack} | 防御能力: ${unit.defense}
伤亡承受力: ${unit.casualtyTolerance} | 射程: ${unit.range} | 移动: ${unit.movement}
特殊技能: ${unit.specialSkills.join(', ')}${unit.leadership > 0 ? `\n领导力: ${unit.leadership}` : ''}
行动状态: 移动${unit.hasMoved ? '✅' : '⭕'} | 射击${unit.hasRangedAttacked ? '✅' : '⭕'} | 近战${unit.hasMeleeAttacked ? '✅' : '⭕'}`;
                
                unitDiv.title = tooltipText;

                // 添加HP条
                if (this.showUnitInfo && unit.hp < unit.maxHp) {
                    const hpBar = document.createElement('div');
                    hpBar.className = 'hp-bar';
                    hpBar.style.cssText = `
                        position: absolute;
                        bottom: -6px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: ${size.width * squareSize - 16}px;
                        height: 4px;
                        background: rgba(0,0,0,0.6);
                        border-radius: 1px;
                        overflow: hidden;
                    `;
                    
                    const hpFill = document.createElement('div');
                    hpFill.style.cssText = `
                        width: ${hpPercentage}%;
                        height: 100%;
                        background: ${hpColor};
                        transition: all 0.3s ease;
                    `;
                    
                    hpBar.appendChild(hpFill);
                    unitDiv.appendChild(hpBar);
                }

                // 添加点击事件
                unitDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('单位元素被点击!', unit.name);
                    this.handleUnitClick(unit, e);
                });

                // 在部署阶段为当前部署方的单位添加拖拽功能
                if (this.currentPhase === 'deployment' && unit.faction === this.deploymentPhase) {
                    unitDiv.style.cursor = 'grab';
                    
                    unitDiv.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.startDrag(unit, e);
                    });
                }

                // 右键点击调整方向
                unitDiv.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleDirectionChange(unit.x, unit.y, e);
                });

                return unitDiv;
            }

            handleSquareClick(x, y, event) {
                console.log(`点击位置: (${x}, ${y}), 当前阶段: ${this.currentPhase}`);
                
                // 检查当前阶段是否允许操作
                if (this.currentPhase === 'deployment') {
                    // 部署阶段不允许点击操作，只允许拖拽
                    console.log('部署阶段，忽略点击');
                    return;
                }
                
                if (this.currentPhase === 'turning') {
                    // 转向阶段只允许右键转向，不允许点击操作
                    console.log('转向阶段，忽略点击');
                    return;
                }
                
                if (this.currentPhase !== 'movement' && this.currentPhase !== 'ranged' && this.currentPhase !== 'melee') {
                    console.log('非法阶段，忽略点击');
                    return;
                }
                
                const clickedUnit = this.findUnitAtPosition(x, y);
                console.log('点击位置的单位:', clickedUnit ? clickedUnit.name : '无单位');
                
                // 检查双击射击（在 handleSquareClick 中也需要检测，因为点击大单位时可能触发方格点击而不是单位点击）
                if (clickedUnit && clickedUnit.faction !== this.currentPlayer && this.currentPhase === 'ranged') {
                    const currentTime = Date.now();
                    const timeDiff = currentTime - this.lastClickTime;
                    const isSameUnit = this.lastClickedUnit && this.lastClickedUnit.id === clickedUnit.id;
                    
                    console.log(`[方格双击检测] 时间差=${timeDiff}ms, 相同单位=${isSameUnit}, 上次单位=${this.lastClickedUnit?.name}`);
                    
                    // 如果双击同一个敌方单位且已选择攻击者，直接执行射击
                    if ((this.moveState === 'target_selected' || this.moveState === 'unit_selected') && 
                        this.selectedUnit && 
                        isSameUnit && 
                        timeDiff < 600 && timeDiff > 10) {
                        
                        console.log(`✨ [方格双击] 检测到双击射击: ${this.selectedUnit.name} → ${clickedUnit.name}`);
                        
                        if (this.canAttackInCurrentPhase(this.selectedUnit, clickedUnit)) {
                            console.log('🎯 [方格双击] 双击射击目标有效，执行射击');
                            this.addGameLog(`⚡ 双击快速射击: ${this.selectedUnit.name} → ${clickedUnit.name}`);
                            
                            // 直接执行攻击
                            this.executeAttack(this.selectedUnit, clickedUnit);
                            this.resetMoveState();
                            setTimeout(() => {
                                this.renderBoard();
                                this.updateUI();
                            }, 1000);
                            
                            // 重置双击检测变量
                            this.lastClickTime = 0;
                            this.lastClickedUnit = null;
                            return; // 立即返回，不执行后续逻辑
                        }
                    }
                }

                switch (this.moveState) {
                    case 'none':
                        // 近战阶段使用特殊处理逻辑
                        if (this.currentPhase === 'melee') {
                            if (clickedUnit) {
                                this.handleMeleePhaseClick(clickedUnit);
                            }
                            return;
                        }
                        
                        // 第一步：选择单位
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            // 检查通用状态：近战中和支援中的部队不能移动和射击
                                if (clickedUnit.combatStatus === 'engaged') {
                                this.addGameLog('⚠️ 该单位正处于近战状态，无法移动或射击');
                                    return;
                                }
                            if (clickedUnit.combatStatus === 'supporting') {
                                this.addGameLog('⚠️ 该单位正在支援中，无法移动或射击');
                                return;
                            }
                            
                            // 检查混乱状态：混乱的单位不能移动
                            if (this.currentPhase === 'movement' && clickedUnit.order === 'chaotic') {
                                this.addGameLog('⚠️ 该单位秩序混乱，无法移动！请等待下回合恢复测试');
                                return;
                            }
                            
                            // 检查阶段特定条件
                            if (this.currentPhase === 'ranged') {
                                if (clickedUnit.rangedAttack === 0 && clickedUnit.throwingAttack === 0) {
                                    this.addGameLog('⚠️ 该单位没有远程攻击能力');
                                    return;
                                }
                                if (clickedUnit.hasRangedAttacked) {
                                    this.addGameLog('⚠️ 该单位本回合已经进行过射击');
                                    return;
                                }
                            } else if (this.currentPhase === 'movement') {
                                if (clickedUnit.hasMoved) {
                                    this.addGameLog('⚠️ 该单位本回合已经移动过');
                                    return;
                                }
                            }
                            this.selectUnit(clickedUnit);
                        }
                        break;

                    case 'unit_selected':
                        // 近战阶段使用特殊处理
                        if (this.currentPhase === 'melee') {
                            this.handleMeleePhaseClick(clickedUnit);
                            return;
                        }
                        
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            // 检查能否重新选择该单位
                            let canSelect = true;
                            if (this.currentPhase === 'ranged' && clickedUnit.hasRangedAttacked) {
                                this.addGameLog('⚠️ 该单位本回合已经进行过射击');
                                canSelect = false;
                            } else if (this.currentPhase === 'movement' && clickedUnit.hasMoved) {
                                this.addGameLog('⚠️ 该单位本回合已经移动过');
                                canSelect = false;
                            }
                            
                            if (canSelect) {
                            this.selectUnit(clickedUnit);
                            }
                        } else if (clickedUnit && clickedUnit.faction !== this.currentPlayer) {
                            // 选择攻击目标（根据阶段判断攻击类型）
                            console.log(`尝试攻击目标: ${clickedUnit.name} 在 (${clickedUnit.x}, ${clickedUnit.y})`);
                            if (this.canAttackInCurrentPhase(this.selectedUnit, clickedUnit)) {
                                console.log('目标可以攻击，选择为攻击目标');
                                this.selectAttackTarget(clickedUnit);
                            } else if (this.currentPhase === 'ranged') {
                                // 射击阶段的特殊提示
                                const distance = this.getDistance(this.selectedUnit.x, this.selectedUnit.y, clickedUnit.x, clickedUnit.y);
                                
                                if (this.selectedUnit.combatStatus === 'engaged') {
                                    this.addGameLog('⚠️ 该单位正处于近战状态，无法进行射击');
                                } else if (this.selectedUnit.rangedAttack === 0 && this.selectedUnit.throwingAttack === 0) {
                                    this.addGameLog('⚠️ 该单位没有远程攻击能力');
                                } else if (clickedUnit.combatStatus === 'engaged') {
                                    this.addGameLog('⚠️ 目标正处于近战状态，无法射击');
                                } else if (distance > this.selectedUnit.range) {
                                    this.addGameLog(`⚠️ 目标距离${distance}，超出射程${this.selectedUnit.range}`);
                                } else if (!this.hasLineOfSight(this.selectedUnit, clickedUnit)) {
                                    this.addGameLog('🚫 射击路径被阻挡！无法射击该目标');
                                } else {
                                    this.addGameLog(`⚠️ 无法射击该目标 (距离:${distance}, 射程:${this.selectedUnit.range})`);
                                }
                            }
                        } else if (!clickedUnit && this.currentPhase === 'movement') {
                            // 开始移动规划（仅在移动阶段）
                            this.startMovePlanning(x, y);
                        }
                        break;

                    case 'planning':
                        // 近战阶段使用特殊处理
                        if (this.currentPhase === 'melee') {
                            if (clickedUnit) {
                                this.handleMeleePhaseClick(clickedUnit);
                            }
                            return;
                        }
                        
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer && !clickedUnit.hasMoved) {
                            // 重新选择单位
                            this.selectUnit(clickedUnit);
                        } else if (!clickedUnit) {
                            // 添加规划步骤
                            this.addMoveStep(x, y);
                        }
                        break;

                    case 'target_selected':
                        // 近战阶段使用特殊处理
                        if (this.currentPhase === 'melee') {
                            if (clickedUnit) {
                                this.handleMeleePhaseClick(clickedUnit);
                            }
                            return;
                        }
                        
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            // 重新选择己方单位
                            let canSelect = true;
                            if (this.currentPhase === 'ranged' && clickedUnit.hasRangedAttacked) {
                                this.addGameLog('⚠️ 该单位本回合已经进行过射击');
                                canSelect = false;
                            } else if (this.currentPhase === 'movement' && clickedUnit.hasMoved) {
                                this.addGameLog('⚠️ 该单位本回合已经移动过');
                                canSelect = false;
                            }
                            
                            if (canSelect) {
                                this.selectUnit(clickedUnit);
                            }
                        } else if (clickedUnit && clickedUnit.faction !== this.currentPlayer) {
                            // 检查是否是同一个目标
                            const isSameTarget = this.targetPosition && this.targetPosition.target && 
                                               this.targetPosition.target.id === clickedUnit.id;
                            
                            if (isSameTarget) {
                                // 重复点击同一个目标，不做任何操作（等待双击检测或执行按钮）
                                console.log(`重复选择同一目标: ${clickedUnit.name}，等待双击或点击执行按钮`);
                            } else {
                            // 重新选择攻击目标
                            console.log(`重新选择攻击目标: ${clickedUnit.name} 在 (${clickedUnit.x}, ${clickedUnit.y})`);
                            if (this.canAttackInCurrentPhase(this.selectedUnit, clickedUnit)) {
                                console.log('新目标可以攻击，更新攻击目标');
                                this.selectAttackTarget(clickedUnit);
                                this.addGameLog(`🎯 更换攻击目标为: ${clickedUnit.name}`);
                            } else if (this.currentPhase === 'ranged') {
                                // 射击阶段的特殊提示
                                const distance = this.getDistance(this.selectedUnit.x, this.selectedUnit.y, clickedUnit.x, clickedUnit.y);
                                
                                if (this.selectedUnit.combatStatus === 'engaged') {
                                    this.addGameLog('⚠️ 该单位正处于近战状态，无法进行射击');
                                } else if (this.selectedUnit.rangedAttack === 0 && this.selectedUnit.throwingAttack === 0) {
                                    this.addGameLog('⚠️ 该单位没有远程攻击能力');
                                } else if (clickedUnit.combatStatus === 'engaged') {
                                    this.addGameLog('⚠️ 目标正处于近战状态，无法射击');
                                } else if (distance > this.selectedUnit.range) {
                                    this.addGameLog(`⚠️ 目标距离${distance}，超出射程${this.selectedUnit.range}`);
                                } else if (!this.hasLineOfSight(this.selectedUnit, clickedUnit)) {
                                    this.addGameLog('🚫 射击路径被阻挡！无法射击该目标');
                                } else {
                                    this.addGameLog(`⚠️ 无法射击该目标 (距离:${distance}, 射程:${this.selectedUnit.range})`);
                                    }
                                }
                            }
                        }
                        break;
                }
                
                // 在 handleSquareClick 结束时也更新双击记录（用于方格点击的情况）
                if (this.currentPhase === 'ranged' && clickedUnit && clickedUnit.faction !== this.currentPlayer) {
                    this.lastClickTime = Date.now();
                    this.lastClickedUnit = clickedUnit;
                    console.log(`📍 [方格点击] 记录目标点击: ${clickedUnit.name} at ${this.lastClickTime}`);
                }

                this.updateUI();
            }

            selectUnit(unit) {
                this.selectedUnit = unit;
                this.targetPosition = null;
                this.movePlan = [];
                this.currentPlanStep = 0;
                this.moveState = 'unit_selected';
                this.updateMoveButtons();
                
                console.log(`选择单位: ${unit.name} (${unit.type}) 在 (${unit.x}, ${unit.y})`);
                console.log(`单位属性: 射击${unit.rangedAttack}, 投掷${unit.throwingAttack}, 射程${unit.range}`);
                console.log(`当前阶段: ${this.currentPhase}`);
                
                // 重新渲染整个棋盘，确保所有单位都显示
                this.renderBoard();
                // 显示所有占位预览
                this.showAllPlannedOccupations();
                
                // 延迟执行高亮，确保DOM已更新
                setTimeout(() => {
                    this.highlightCurrentStepMoves();
                }, 10);
            }

            selectAttackTarget(unit) {
                // 射击阶段需要确认
                if (this.currentPhase === 'ranged') {
                    this.rangedAttacker = this.selectedUnit;
                    this.rangedTarget = unit;
                    this.moveState = 'target_selected';
                    this.updateMoveButtons();
                    console.log(`选择射击目标: ${unit.name} 在 (${unit.x}, ${unit.y}), 等待确认`);
                    this.addGameLog(`🎯 已选择目标：${unit.name}，点击"确认射击"按钮执行射击`);
                    
                    // 延迟执行高亮更新
                    setTimeout(() => {
                        this.highlightAttackTarget(unit);
                    }, 10);
                } else {
                    // 其他阶段的正常处理
                    this.targetPosition = { x: unit.x, y: unit.y, action: 'attack', target: unit };
                    this.moveState = 'target_selected';
                    this.updateMoveButtons();
                    
                    console.log(`选择攻击目标: ${unit.name} 在 (${unit.x}, ${unit.y})`);
                    
                    // 延迟执行高亮更新
                    setTimeout(() => {
                        this.highlightAttackTarget(unit);
                    }, 10);
                }
            }

            highlightAttackTarget(unit) {
                this.clearHighlights();
                this.highlightUnitElement(this.selectedUnit, 'selected');
                this.highlightUnitElement(unit, 'target-selected');
            }

            startMovePlanning(x, y) {
                const validityCheck = this.checkMoveValidity(this.selectedUnit, x, y, 0);
                if (!validityCheck.valid) {
                    console.log('无法移动到该位置:', validityCheck.reason);
                    this.addGameLog(`⚠️ 无法移动到该位置: ${validityCheck.reason}`);
                    return;
                }
                
                this.movePlan = [{
                    startX: this.selectedUnit.x,
                    startY: this.selectedUnit.y,
                    endX: x,
                    endY: y
                }];
                this.currentPlanStep = 0;
                this.moveState = 'planning';
                
                console.log(`开始规划第1步: (${this.selectedUnit.x}, ${this.selectedUnit.y}) → (${x}, ${y})`);
                
                this.updateMoveButtons();
                // 重新渲染整个棋盘，确保所有单位都显示
                this.renderBoard();
                // 显示所有占位预览
                this.showAllPlannedOccupations();
                this.highlightCurrentStepMoves();
            }

            addMoveStep(x, y) {
                if (this.movePlan.length >= 3) {
                    console.log('最多只能规划3步');
                    this.addGameLog('⚠️ 最多只能规划3步移动');
                    return;
                }

                const lastStep = this.movePlan[this.movePlan.length - 1];
                const stepNumber = this.movePlan.length;
                
                const validityCheck = this.checkMoveValidity(this.selectedUnit, x, y, stepNumber);
                if (!validityCheck.valid) {
                    console.log(`第${stepNumber + 1}步无法移动到该位置:`, validityCheck.reason);
                    this.addGameLog(`⚠️ 第${stepNumber + 1}步无法移动: ${validityCheck.reason}`);
                    return;
                }

                this.movePlan.push({
                    startX: lastStep.endX,
                    startY: lastStep.endY,
                    endX: x,
                    endY: y
                });

                console.log(`添加第${this.movePlan.length}步: (${lastStep.endX}, ${lastStep.endY}) → (${x}, ${y})`);
                
                // 如果已规划三步，自动完成规划
                if (this.movePlan.length >= 3) {
                    console.log('已规划三步，自动完成规划');
                    this.finishPlanning();
                    return;
                }
                
                this.updateMoveButtons();
                // 重新渲染整个棋盘，确保所有单位都显示
                this.renderBoard();
                // 显示所有占位预览
                this.showAllPlannedOccupations();
                this.highlightCurrentStepMoves();
            }

            addPlanStep() {
                // 准备添加下一步，更新高亮显示
                console.log(`准备规划第${this.movePlan.length + 1}步`);
                this.highlightCurrentStepMoves();
            }

            finishPlanning() {
                if (this.movePlan.length === 0) {
                    console.log('请至少规划一步移动');
                    return;
                }
                
                // 保存当前单位的规划（包含单位信息用于渲染）
                this.allUnitPlans.set(this.selectedUnit.id, {
                    unit: this.selectedUnit,
                    plan: [...this.movePlan]
                });
                
                const unitTypeName = this.getUnitTypeName(this.selectedUnit.type);
                this.addGameLog(`✅ ${unitTypeName}完成移动规划，共${this.movePlan.length}步`);
                
                // 重置当前规划状态，准备规划下一个单位
                this.selectedUnit = null;
                this.movePlan = [];
                this.moveState = 'none';
                this.updateMoveButtons();
                this.clearHighlights();
                
                // 重新渲染整个棋盘，确保所有单位都显示在初始位置
                this.renderBoard();
                // 显示所有占位预览
                this.showAllPlannedOccupations();
                this.updateUI();
            }

            finishAllPlanning() {
                if (this.allUnitPlans.size === 0) {
                    console.log('请至少为一个单位规划移动');
                    return;
                }
                
                this.planningPhase = 'executing';
                this.moveState = 'all_planned';
                this.updateMoveButtons();
                this.clearHighlights();
                
                // 保持显示所有规划路径
                this.drawAllMovePaths();
                
                this.addGameLog(`🎯 所有规划完成，共${this.allUnitPlans.size}个单位有移动计划，准备统一执行`);
            }

            async executePlan() {
                if (this.moveState === 'ready_to_execute' && this.movePlan.length > 0) {
                    // 投掷2D6
                    const dice1 = Math.floor(Math.random() * 6) + 1;
                    const dice2 = Math.floor(Math.random() * 6) + 1;
                    const diceTotal = dice1 + dice2;
                    
                    // 检查是否有存活的将领
                    const hasGeneral = this.units.some(u => 
                        u.type === 'general' && 
                        u.faction === this.selectedUnit.faction && 
                        u.hp > 0
                    );
                    
                    // 获取最近的将领领导力（没有将领时返回默认值6）
                    const leadership = this.getNearestGeneralLeadership(this.selectedUnit);
                    const result = diceTotal - leadership;
                    
                    // 移除showDiceResult调用，直接在这里处理
                    
                    // 根据新规则执行相应步数
                    let stepsToExecute = 0;
                    if (result <= -3) {
                        stepsToExecute = this.movePlan.length; // 执行全部规划
                    } else if (result === -2) {
                        stepsToExecute = Math.min(2, this.movePlan.length); // 执行前两步
                    } else if (result >= -1 && result <= 1) {
                        stepsToExecute = 1; // 执行第一步
                    } else if (result >= 2) {
                        stepsToExecute = 0; // 不执行任何步骤
                    }
                    
                    console.log(`2D6: ${dice1}+${dice2}=${diceTotal}, 领导力: ${leadership}, 结果: ${result}, 执行步数: ${stepsToExecute}`);
                    
                    // 生成骰子结果文本
                    let resultText = `2D6投掷结果为${diceTotal}`;
                    if (hasGeneral) {
                        resultText += `，${diceTotal}-将领领导力${leadership}=${result}`;
                    } else {
                        resultText += `，无将领，使用默认领导值6，${diceTotal}-6=${result}`;
                    }
                    
                    if (result <= -3) {
                        resultText += `，可以执行全部${this.movePlan.length}步移动`;
                    } else if (result === -2) {
                        resultText += `，可以执行${Math.min(2, this.movePlan.length)}步移动`;
                    } else if (result >= -1 && result <= 1) {
                        resultText += `，可以执行1步移动`;
                    } else if (result >= 2) {
                        resultText += `，无法执行移动`;
                    }
                    
                    // 显示骰子结果到日志
                    this.addGameLog(resultText);
                    
                    // 执行移动（带动画）
                    await this.executeUnitPlanWithAnimation(this.selectedUnit, this.movePlan, stepsToExecute);
                    
                    // 重置状态
                    this.resetMoveState();
                    this.renderBoard();
                    this.updateUI();
                } else if (this.moveState === 'target_selected') {
                    // 攻击
                    this.executeAttack(this.selectedUnit, this.targetPosition.target);
                    this.resetMoveState();
                    setTimeout(() => {
                        this.renderBoard();
                        this.updateUI();
                    }, 1000);
                    this.updateUI();
                }
            }

            cancelMove() {
                this.resetMoveState();
                // 重新渲染整个棋盘，确保所有单位都显示
                this.renderBoard();
                // 显示所有占位预览
                this.showAllPlannedOccupations();
                this.updateUI();
            }

            resetMoveState() {
                this.selectedUnit = null;
                this.targetPosition = null;
                this.movePlan = [];
                this.currentPlanStep = 0;
                this.moveState = 'none';
                this.rangedAttacker = null;
                this.rangedTarget = null;
                this.updateMoveButtons();
                this.clearHighlights();
                this.clearMovePath();
                this.clearPlannedOccupations();
                this.hideDiceResult();
            }

            resetAllPlans() {
                this.allUnitPlans.clear();
                this.planningPhase = 'planning';
                this.clearPlannedOccupations();
                this.resetMoveState();
            }

            updateMoveButtons() {
                console.log(`更新按钮: 阶段=${this.currentPhase}, 状态=${this.moveState}, 部署阶段=${this.deploymentPhase}`);
                
                const addStepBtn = document.getElementById('add-step-btn');
                const finishPlanBtn = document.getElementById('finish-plan-btn');
                const executeBtn = document.getElementById('execute-plan-btn');
                const finishAllBtn = document.getElementById('finish-all-plans-btn');
                const executeAllBtn = document.getElementById('execute-all-btn');
                const cancelBtn = document.getElementById('cancel-move-btn');
                const nextPhaseBtn = document.getElementById('next-phase-btn');
                const confirmDeployBtn = document.getElementById('confirm-deployment-btn');

                const finishAttackerSupportBtn = document.getElementById('finish-attacker-support-btn');
                const finishDefenderSupportBtn = document.getElementById('finish-defender-support-btn');
                const defenderRetreatBtn = document.getElementById('defender-retreat-btn');
                const defenderStandBtn = document.getElementById('defender-stand-btn');
                const executeChargeBtn = document.getElementById('execute-charge-btn');
                const confirmRangedBtn = document.getElementById('confirm-ranged-attack-btn');
                
                // 隐藏所有移动和近战相关按钮
                [addStepBtn, finishPlanBtn, executeBtn, finishAllBtn, executeAllBtn, cancelBtn,
                 finishAttackerSupportBtn, finishDefenderSupportBtn, defenderRetreatBtn, defenderStandBtn, executeChargeBtn, confirmRangedBtn].forEach(btn => {
                    btn.style.display = 'none';
                });
                
                // 近战阶段的按钮显示
                if (this.currentPhase === 'melee') {
                    switch (this.meleeSubPhase) {
                        case 'select_attacker':
                            // 选择冲锋单位阶段，不显示特殊按钮
                            break;
                        case 'select_target':
                            // 选择目标阶段，不显示特殊按钮
                            break;
                        case 'defender_choose_retreat':
                            // 防御方选择撤退或战斗
                            defenderRetreatBtn.style.display = 'inline-block';
                            defenderStandBtn.style.display = 'inline-block';
                            break;
                        case 'select_attacker_support':
                            finishAttackerSupportBtn.style.display = 'inline-block';
                            break;
                        case 'select_defender_support':
                            finishDefenderSupportBtn.style.display = 'inline-block';
                            break;
                        case 'execute_combat':
                            executeChargeBtn.style.display = 'inline-block';
                            break;
                    }
                    confirmDeployBtn.style.display = 'none';
                    
                    // 检查是否还有持续近战单位待处理
                    const hasPendingSustainedMelee = this.getAvailableSustainedMeleeUnits().length > 0;
                    
                    if (hasPendingSustainedMelee && this.meleeSubPhase === 'select_attacker') {
                        // 还有持续近战未完成，禁用阶段切换
                        nextPhaseBtn.style.display = 'inline-block';
                        nextPhaseBtn.disabled = true;
                        nextPhaseBtn.title = '所有持续近战完成后才能进入下一阶段';
                    } else {
                        // 持续近战已完成或正在进行中，允许正常操作
                        nextPhaseBtn.style.display = 'inline-block';
                        nextPhaseBtn.disabled = false;
                        nextPhaseBtn.title = '';
                    }
                    return;
                }
                
                // 根据阶段显示相应按钮
                if (this.currentPhase === 'deployment') {
                    // 部署阶段，只显示确认部署按钮，隐藏其他所有按钮
                    confirmDeployBtn.style.display = 'inline-block';
                    nextPhaseBtn.style.display = 'none';
                    return;
                } else if (this.currentPhase === 'turning') {
                    // 转向阶段，只显示下一阶段按钮
                    confirmDeployBtn.style.display = 'none';
                    nextPhaseBtn.style.display = 'inline-block';
                    nextPhaseBtn.disabled = false;
                    // 注意：按钮文本在后面统一设置
                    // 这里不提前return，让它继续执行后面的逻辑
                } else if (this.currentPhase === 'movement') {
                    // 移动阶段，根据moveState显示对应按钮
                    confirmDeployBtn.style.display = 'none';
                    nextPhaseBtn.style.display = 'inline-block';
                    nextPhaseBtn.disabled = false;
                    nextPhaseBtn.title = '';
                    
                    // 根据moveState显示移动规划按钮
                    if (this.moveState === 'planning' && this.movePlan.length > 0) {
                        // 正在规划，显示添加步骤、完成单位规划和取消按钮
                        addStepBtn.style.display = 'inline-block';
                        finishPlanBtn.style.display = 'inline-block';
                        cancelBtn.style.display = 'inline-block';
                    }
                    
                    // 如果有已完成规划的单位，显示完成所有规划按钮
                    if (this.allUnitPlans.size > 0 && this.planningPhase === 'planning') {
                        finishAllBtn.style.display = 'inline-block';
                    }
                    
                    // 如果处于执行状态，显示统一执行按钮
                    if (this.moveState === 'all_planned' || (this.allUnitPlans.size > 0 && this.planningPhase === 'executing')) {
                        executeAllBtn.style.display = 'inline-block';
                    }
                } else if (this.currentPhase === 'ranged') {
                    // 射击阶段，下一阶段按钮永远可用
                    confirmDeployBtn.style.display = 'none';
                    nextPhaseBtn.style.display = 'inline-block';
                    nextPhaseBtn.disabled = false;
                    nextPhaseBtn.title = '';
                    
                    // 如果已选择射击目标，显示确认射击按钮
                    const confirmRangedBtn = document.getElementById('confirm-ranged-attack-btn');
                    if (this.moveState === 'target_selected' && this.rangedAttacker && this.rangedTarget) {
                        confirmRangedBtn.style.display = 'inline-block';
                    } else {
                        confirmRangedBtn.style.display = 'none';
                    }
                } else {
                    // 其他阶段，显示下一阶段按钮
                    confirmDeployBtn.style.display = 'none';
                    nextPhaseBtn.style.display = 'inline-block';
                }

                // 设置下一阶段按钮文本
                if (this.currentPhase === 'movement') {
                    nextPhaseBtn.textContent = '下一阶段';
                } else if (this.currentPhase === 'ranged') {
                    nextPhaseBtn.textContent = '下一阶段';
                } else if (this.currentPhase === 'turning') {
                    nextPhaseBtn.textContent = '下一阶段';
                } else if (this.currentPhase === 'melee') {
                    nextPhaseBtn.textContent = '结束回合';
                } else {
                    nextPhaseBtn.textContent = '下一阶段';
                }
            }

            highlightPossibleMoves(unit) {
                // 清除之前的高亮
                this.clearHighlights();

                // 高亮选中的单位
                const selectedUnit = document.querySelector(`[data-unit-id="${unit.id}"]`);
                if (selectedUnit) {
                    selectedUnit.classList.add('selected');
                }

                // 高亮可能的移动位置
                const possibleMoves = this.getPossibleMoves(unit);
                possibleMoves.forEach(pos => {
                    this.highlightArea(pos.x, pos.y, this.unitSizes[unit.type], 'possible-move');
                });

                // 高亮可能的攻击目标
                const attackTargets = this.getPossibleAttacks(unit);
                attackTargets.forEach(target => {
                    const targetUnit = target.unit;
                    if (targetUnit) {
                        const targetElement = document.querySelector(`[data-unit-id="${targetUnit.id}"]`);
                        if (targetElement) {
                            targetElement.style.boxShadow = '0 0 20px rgba(46, 204, 113, 0.8)';
                        }
                    }
                });

                // 如果已选择目标位置，高亮显示
                if (this.targetPosition) {
                    if (this.targetPosition.action === 'move') {
                        this.highlightArea(this.targetPosition.x, this.targetPosition.y, this.unitSizes[unit.type], 'target-selected');
                    } else if (this.targetPosition.target) {
                        const targetElement = document.querySelector(`[data-unit-id="${this.targetPosition.target.id}"]`);
                        if (targetElement) {
                            targetElement.style.boxShadow = '0 0 25px rgba(155, 89, 182, 1)';
                        }
                    }
                }
            }

            highlightArea(x, y, size, className) {
                for (let dy = 0; dy < size.height; dy++) {
                    for (let dx = 0; dx < size.width; dx++) {
                        const targetX = x + dx;
                        const targetY = y + dy;
                        const square = document.querySelector(`[data-x="${targetX}"][data-y="${targetY}"]`);
                        if (square) {
                            square.classList.add(className);
                            console.log(`高亮格子 (${targetX}, ${targetY}) 添加类: ${className}`);
                        } else {
                            console.log(`未找到格子 (${targetX}, ${targetY})`);
                        }
                    }
                }
            }

            highlightUnitElement(unit, className) {
                // 高亮单位占用的所有格子
                const size = this.getUnitSizeWithDirection(unit);
                for (let dy = 0; dy < size.height; dy++) {
                    for (let dx = 0; dx < size.width; dx++) {
                        const targetX = unit.x + dx;
                        const targetY = unit.y + dy;
                        const square = document.querySelector(`[data-x="${targetX}"][data-y="${targetY}"]`);
                        if (square) {
                            square.classList.add(className);
                            console.log(`高亮单位格子 (${targetX}, ${targetY}) 添加类: ${className}`);
                        }
                    }
                }
                
                // 也高亮单位元素本身
                const unitElements = document.querySelectorAll('.unit-large');
                unitElements.forEach(element => {
                    const elementUnit = this.units.find(u => 
                        u.x === parseInt(element.dataset.x) && 
                        u.y === parseInt(element.dataset.y)
                    );
                    if (elementUnit && elementUnit.id === unit.id) {
                        element.classList.add(className);
                        console.log(`高亮单位元素: ${unit.type}`);
                    }
                });
            }

            getPossibleAttacks(unit) {
                const attacks = [];
                const directions = this.getSquareDirections();

                directions.forEach(dir => {
                    const newX = unit.x + dir.dx;
                    const newY = unit.y + dir.dy;
                    if (this.isValidPosition(newX, newY)) {
                        const targetUnit = this.gameBoard[newY][newX].unit;
                        if (targetUnit && targetUnit.faction !== unit.faction) {
                            // 检查攻击方向影响
                            const attackBonus = this.getAttackBonus(unit, targetUnit);
                            attacks.push({ x: newX, y: newY, unit: targetUnit, bonus: attackBonus });
                        }
                    }
                });

                return attacks;
            }

            getPossibleMoves(unit) {
                const moves = [];
                
                // 正方形网格的移动计算
                for (let y = 0; y < this.gridHeight; y++) {
                    for (let x = 0; x < this.gridWidth; x++) {
                        if (this.canMoveTo(unit, x, y)) {
                            moves.push({ x, y });
                        }
                    }
                }

                return moves;
            }

            canMoveToStep(unit, x, y, stepNumber) {
                const result = this.checkMoveValidity(unit, x, y, stepNumber);
                return result.valid;
            }

            checkMoveValidity(unit, x, y, stepNumber) {
                // 返回详细的移动验证结果，包括失败原因
                // 获取单位移动力
                const moveDistance = this.getUnitMoveDistance(unit);
                const size = this.unitSizes[unit.type];
                
                // 计算起始位置（单位中心点和左上角）
                let startX, startY, centerX, centerY;
                if (stepNumber === 0) {
                    startX = unit.x;
                    startY = unit.y;
                    centerX = unit.x + Math.floor(size.width / 2);
                    centerY = unit.y + Math.floor(size.height / 2);
                } else if (this.movePlan.length >= stepNumber) {
                    const prevStep = this.movePlan[stepNumber - 1];
                    startX = prevStep.endX;
                    startY = prevStep.endY;
                    centerX = prevStep.endX + Math.floor(size.width / 2);
                    centerY = prevStep.endY + Math.floor(size.height / 2);
                } else {
                    return { valid: false, reason: '规划步骤错误' };
                }
                
                // 检查从中心点到目标位置的距离
                const distance = this.getDistance(centerX, centerY, x, y);
                if (distance > moveDistance) {
                    return { valid: false, reason: `距离${distance}超出移动力${moveDistance}` };
                }
                
                // 检查目标位置是否在地图边界内
                if (!this.isValidUnitPosition(x, y, size)) {
                    return { valid: false, reason: '目标位置超出地图边界' };
                }
                
                // 检查目标区域是否被当前存在的单位占用
                if (this.isAreaOccupiedByOthers(x, y, size.width, size.height, unit.id)) {
                    return { valid: false, reason: '目标位置被其他单位占用' };
                }
                
                // 检查是否与已规划的占位冲突
                const conflictCheck = this.checkPlannedOccupationConflict(x, y, size.width, size.height, unit.id);
                if (conflictCheck.conflict) {
                    return { valid: false, reason: '目标位置与已规划的移动冲突' };
                }
                
                // 检查移动路径是否会穿越敌方单位
                const pathBlockResult = this.checkPathBlocked(unit, startX, startY, x, y, size);
                if (pathBlockResult.blocked) {
                    return { valid: false, reason: `移动路径被敌方单位阻挡 (${pathBlockResult.blockerName})` };
                }
                
                return { valid: true, reason: '' };
            }

            isAreaOccupiedByOthers(x, y, width, height, excludeUnitId) {
                // 检查区域是否被其他单位占用
                for (let checkY = y; checkY < y + height; checkY++) {
                    for (let checkX = x; checkX < x + width; checkX++) {
                        if (checkX < 0 || checkX >= this.gridWidth || checkY < 0 || checkY >= this.gridHeight) {
                            return true; // 越界视为被占用
                        }
                        
                        const unitAtPos = this.findUnitAtPosition(checkX, checkY);
                        if (unitAtPos && unitAtPos.id !== excludeUnitId) {
                            return true;
                        }
                    }
                }
                return false;
            }

            checkPathBlocked(unit, startX, startY, endX, endY, size) {
                // 检查移动路径是否会穿越敌方单位
                // 使用Bresenham直线算法检查路径上的所有点
                // 返回详细信息：{ blocked: boolean, blockerName: string }
                
                // 计算单位中心点的路径
                const startCenterX = startX + Math.floor(size.width / 2);
                const startCenterY = startY + Math.floor(size.height / 2);
                const endCenterX = endX + Math.floor(size.width / 2);
                const endCenterY = endY + Math.floor(size.height / 2);
                
                // 获取路径上的所有点（使用中心点计算）
                const pathPoints = this.getLinePoints(startCenterX, startCenterY, endCenterX, endCenterY);
                
                // 对于路径上的每个点，检查单位占据的整个区域是否与敌方单位重叠
                for (let i = 1; i < pathPoints.length - 1; i++) { // 跳过起点和终点
                    const point = pathPoints[i];
                    // 计算单位在这个点上的左上角位置
                    const unitX = point.x - Math.floor(size.width / 2);
                    const unitY = point.y - Math.floor(size.height / 2);
                    
                    // 检查单位在这个位置是否与敌方单位重叠
                    for (let dy = 0; dy < size.height; dy++) {
                        for (let dx = 0; dx < size.width; dx++) {
                            const checkX = unitX + dx;
                            const checkY = unitY + dy;
                            
                            if (checkX >= 0 && checkX < this.gridWidth && 
                                checkY >= 0 && checkY < this.gridHeight) {
                                const unitAtPos = this.findUnitAtPosition(checkX, checkY);
                                // 如果路径上有敌方单位，则阻挡
                                if (unitAtPos && unitAtPos.id !== unit.id && unitAtPos.faction !== unit.faction) {
                                    console.log(`路径被敌方单位阻挡: ${unitAtPos.name} 在 (${checkX}, ${checkY})`);
                                    return { blocked: true, blockerName: unitAtPos.name };
                                }
                            }
                        }
                    }
                }
                
                return { blocked: false, blockerName: '' };
            }

            getLinePoints(x0, y0, x1, y1) {
                // Bresenham直线算法获取路径上的所有点
                const points = [];
                const dx = Math.abs(x1 - x0);
                const dy = Math.abs(y1 - y0);
                const sx = x0 < x1 ? 1 : -1;
                const sy = y0 < y1 ? 1 : -1;
                let err = dx - dy;
                
                let x = x0;
                let y = y0;
                
                while (true) {
                    points.push({ x, y });
                    
                    if (x === x1 && y === y1) break;
                    
                    const e2 = 2 * err;
                    if (e2 > -dy) {
                        err -= dy;
                        x += sx;
                    }
                    if (e2 < dx) {
                        err += dx;
                        y += sy;
                    }
                }
                
                return points;
            }

            getUnitMoveDistance(unit) {
                // 直接返回单位的movement属性
                return unit.movement || 3; // 默认值3，防止undefined
            }

            highlightCurrentStepMoves() {
                console.log('开始执行highlightCurrentStepMoves');
                this.clearHighlights();
                
                if (!this.selectedUnit) {
                    console.log('没有选中的单位');
                    return;
                }
                
                console.log(`选中单位: ${this.selectedUnit.type} 在 (${this.selectedUnit.x}, ${this.selectedUnit.y})`);
                
                // 高亮选中的单位
                this.highlightUnitElement(this.selectedUnit, 'selected');
                
                // 在射击阶段，高亮射程范围内的方格和敌方单位
                if (this.currentPhase === 'ranged') {
                    console.log(`射击阶段，高亮射程范围，射程: ${this.selectedUnit.range}`);
                    
                    // 获取单位中心位置
                    const size = this.getUnitSizeWithDirection(this.selectedUnit);
                    const centerX = this.selectedUnit.x + Math.floor(size.width / 2);
                    const centerY = this.selectedUnit.y + Math.floor(size.height / 2);
                    
                    let rangeSquareCount = 0;
                    let targetCount = 0;
                    
                    // 高亮射程范围内的所有方格
                    const rangeDistance = this.selectedUnit.range;
                    for (let x = Math.max(0, centerX - rangeDistance); x <= Math.min(this.gridWidth - 1, centerX + rangeDistance); x++) {
                        for (let y = Math.max(0, centerY - rangeDistance); y <= Math.min(this.gridHeight - 1, centerY + rangeDistance); y++) {
                            const distance = this.getDistance(centerX, centerY, x, y);
                            if (distance <= rangeDistance) {
                                const square = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                                if (square) {
                                    square.classList.add('possible-move');
                                    rangeSquareCount++;
                                }
                            }
                        }
                    }
                    
                    console.log(`高亮了${rangeSquareCount}个射程范围内的方格`);
                    
                    // 遍历所有敌方单位，检查是否在射程内
                    this.units.forEach(enemyUnit => {
                        if (enemyUnit.faction !== this.selectedUnit.faction && enemyUnit.hp > 0) {
                            // 计算到敌方单位的距离
                            const enemySize = this.getUnitSizeWithDirection(enemyUnit);
                            const enemyCenterX = enemyUnit.x + Math.floor(enemySize.width / 2);
                            const enemyCenterY = enemyUnit.y + Math.floor(enemySize.height / 2);
                            const distance = this.getDistance(centerX, centerY, enemyCenterX, enemyCenterY);
                            
                            // 检查是否可以攻击（在射程内且符合攻击条件）
                            if (this.canAttackInCurrentPhase(this.selectedUnit, enemyUnit)) {
                                // 高亮该敌方单位
                                const enemyElement = document.querySelector(`[data-unit-id="${enemyUnit.id}"]`);
                                if (enemyElement) {
                                    enemyElement.style.boxShadow = '0 0 20px rgba(46, 204, 113, 0.8)';
                                    targetCount++;
                                }
                                console.log(`可攻击目标: ${enemyUnit.name}, 距离: ${distance}`);
                            } else if (distance <= this.selectedUnit.range) {
                                // 在射程内但不能攻击（例如处于近战状态）
                                console.log(`在射程内但不可攻击: ${enemyUnit.name}, 距离: ${distance}`);
                            }
                        }
                    });
                    
                    console.log(`高亮了${targetCount}个可攻击目标`);
                    return;
                }
                
                // 移动阶段：高亮下一步可移动的格子
                if (this.movePlan.length < 3) {
                    // 计算当前步骤的起始位置（单位中心点）
                    let centerX, centerY;
                    if (this.movePlan.length === 0) {
                        // 第一步：以当前单位位置为中心
                        const size = this.unitSizes[this.selectedUnit.type];
                        centerX = this.selectedUnit.x + Math.floor(size.width / 2);
                        centerY = this.selectedUnit.y + Math.floor(size.height / 2);
                    } else {
                        // 后续步骤：以上一步规划的终点为中心
                        const lastStep = this.movePlan[this.movePlan.length - 1];
                        const size = this.unitSizes[this.selectedUnit.type];
                        centerX = lastStep.endX + Math.floor(size.width / 2);
                        centerY = lastStep.endY + Math.floor(size.height / 2);
                    }
                    
                    console.log(`高亮第${this.movePlan.length + 1}步，中心位置: (${centerX}, ${centerY})`);
                    
                    // 获取移动力
                    const moveDistance = this.getUnitMoveDistance(this.selectedUnit);
                    let highlightCount = 0;
                    
                    // 高亮逻辑：只高亮实际可以规划的位置
                    const stepNumber = this.movePlan.length;
                    for (let x = Math.max(0, centerX - moveDistance); x <= Math.min(this.gridWidth - 1, centerX + moveDistance); x++) {
                        for (let y = Math.max(0, centerY - moveDistance); y <= Math.min(this.gridHeight - 1, centerY + moveDistance); y++) {
                            const distance = this.getDistance(centerX, centerY, x, y);
                            if (distance <= moveDistance) {
                                // 使用canMoveToStep确保高亮的格子实际可以选择
                                if (this.canMoveToStep(this.selectedUnit, x, y, stepNumber)) {
                                    const square = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                                    if (square) {
                                        square.classList.add('possible-move');
                                        highlightCount++;
                                    }
                                }
                            }
                        }
                    }
                    
                    console.log(`高亮了${highlightCount}个可移动位置，移动力: ${moveDistance}`);
                } else {
                    console.log('已达到最大规划步数，不显示高亮');
                }
            }

            isValidUnitPosition(x, y, size) {
                // 检查单位是否能放在这个位置（不超出边界）
                return x >= 0 && y >= 0 && 
                       x + size.width <= this.gridWidth && 
                       y + size.height <= this.gridHeight;
            }

            getSquareDirections() {
                // 正方形网格的8个方向（包括对角线）
                return [
                    { dx: 0, dy: -1 },   // 北
                    { dx: 1, dy: -1 },   // 东北
                    { dx: 1, dy: 0 },    // 东
                    { dx: 1, dy: 1 },    // 东南
                    { dx: 0, dy: 1 },    // 南
                    { dx: -1, dy: 1 },   // 西南
                    { dx: -1, dy: 0 },   // 西
                    { dx: -1, dy: -1 }   // 西北
                ];
            }

            handleUnitClick(unit, event) {
                console.log(`单位被点击: ${unit.name} 在 (${unit.x}, ${unit.y}), 阵营: ${unit.faction}`);
                console.log(`当前状态: 玩家=${this.currentPlayer}, 阶段=${this.currentPhase}, 移动状态=${this.moveState}`);
                
                // 检查是否为双击 - 针对射击阶段的特殊处理
                const currentTime = Date.now();
                const timeDiff = currentTime - this.lastClickTime;
                const isSameUnit = this.lastClickedUnit && this.lastClickedUnit.id === unit.id;
                
                console.log(`双击检测: 时间差=${timeDiff}ms, 相同单位=${isSameUnit}, 上次点击单位=${this.lastClickedUnit?.name}`);
                console.log(`选中的攻击单位: ${this.selectedUnit?.name}, 移动状态: ${this.moveState}`);
                
                // 在射击阶段，如果双击敌方单位（已选择攻击者或已选择目标），直接执行射击
                if (this.currentPhase === 'ranged' && 
                    (this.moveState === 'target_selected' || this.moveState === 'unit_selected') && 
                    this.selectedUnit && 
                    unit.faction !== this.currentPlayer && 
                    isSameUnit && 
                    timeDiff < 600 && timeDiff > 10) { // 10-600ms内的双击
                    
                    console.log(`✨ 检测到双击射击: ${this.selectedUnit.name} → ${unit.name}`);
                    
                    // 检查是否可以攻击该目标
                    if (this.canAttackInCurrentPhase(this.selectedUnit, unit)) {
                        console.log('🎯 双击射击目标有效，执行射击');
                        this.addGameLog(`⚡ 双击快速射击: ${this.selectedUnit.name} → ${unit.name}`);
                        
                        // 直接执行攻击
                        this.executeAttack(this.selectedUnit, unit);
                        this.resetMoveState();
                        setTimeout(() => {
                            this.renderBoard();
                            this.updateUI();
                        }, 1000);
                        
                        // 重置双击检测变量并立即返回，不执行后续逻辑
                        this.lastClickTime = 0;
                        this.lastClickedUnit = null;
                        return; // 关键：立即返回，不执行handleSquareClick
                    } else {
                        console.log('❌ 双击射击目标无效');
                        this.addGameLog(`❌ 无法射击该目标: ${unit.name}`);
                        // 双击失败，重置变量但继续正常流程
                        this.lastClickTime = 0;
                        this.lastClickedUnit = null;
                    }
                }
                
                // 正常的单击处理逻辑
                // 转发到handleSquareClick处理
                    this.handleSquareClick(unit.x, unit.y, event);
                
                // 在handleSquareClick之后更新双击检测状态
                // 在射击阶段，选择敌方单位后记录双击信息
                if (this.currentPhase === 'ranged' && 
                    unit.faction !== this.currentPlayer) {
                    
                    // 记录这次点击用于下次双击检测（使用新的时间戳）
                    this.lastClickTime = Date.now();
                    this.lastClickedUnit = unit;
                    console.log(`📍 记录目标点击: ${unit.name} at ${this.lastClickTime}，再次点击可触发双击射击`);
                } else {
                    // 其他情况清除双击记录
                    this.lastClickTime = 0;
                    this.lastClickedUnit = null;
                }
            }

            handleKeyPress(event) {
                // 检测空格键
                if (event.code === 'Space') {
                    event.preventDefault(); // 防止页面滚动
                    
                    const currentTime = Date.now();
                    const timeDiff = currentTime - this.lastSpaceKeyTime;
                    
                    console.log(`空格键按下，时间差=${timeDiff}ms, 当前阶段=${this.currentPhase}, 移动状态=${this.moveState}`);
                    
                    // 检测双击空格键（间隔小于600ms）
                    if (timeDiff > 10 && timeDiff < 600) {
                        console.log(`检测到双击空格键`);
                        
                        // 在转向阶段，双击空格键快速完成转向阶段
                        if (this.currentPhase === 'turning') {
                            console.log(`转向阶段双击空格键，快速进入下一阶段`);
                            this.addGameLog(`⚡ 通过双击空格键快速完成转向阶段`);
                            this.nextPhase();
                            
                            // 重置时间，防止三连击
                            this.lastSpaceKeyTime = 0;
                            return;
                        }
                        
                        // 在移动阶段，双击空格键完成所有规划并执行
                        if (this.currentPhase === 'movement') {
                            // 如果当前有正在规划的单位，先完成它的规划
                            if (this.moveState === 'planning' && this.selectedUnit && this.movePlan.length > 0) {
                                this.addGameLog(`⌨️ ${this.selectedUnit.name}通过快捷键完成移动规划`);
                                this.finishPlanning();
                            }
                            
                            // 完成所有规划并执行
                            if (this.allUnitPlans.size > 0) {
                                this.addGameLog(`⚡ 通过双击空格键完成所有规划并开始执行`);
                                this.finishAllPlanning();
                                
                                // 稍作延迟后执行移动
                                setTimeout(async () => {
                                    const btn = document.getElementById('execute-all-btn');
                                    if (!btn.disabled) {
                                        btn.disabled = true;
                                        btn.textContent = '执行中...';
                                        
                                        try {
                                            await this.executeAllPlans();
                                        } catch (error) {
                                            console.error('执行计划时出错:', error);
                                            this.addGameLog('❌ 执行计划时发生错误，请重试');
                                        } finally {
                                            btn.disabled = false;
                                            btn.textContent = '统一执行';
                                        }
                                    }
                                }, 100);
                            } else {
                                this.addGameLog(`⚠️ 没有单位规划需要执行`);
                            }
                            
                            // 重置时间，防止三连击
                            this.lastSpaceKeyTime = 0;
                            return;
                        }
                    }
                    
                    // 单击空格键的处理
                    
                    // 射击阶段：如果已选择攻击者和目标，按空格键执行射击
                    if (this.currentPhase === 'ranged' && this.moveState === 'target_selected' && 
                        this.rangedAttacker && this.rangedTarget) {
                        console.log(`射击阶段单击空格键，快速执行射击`);
                        this.addGameLog(`⚡ 通过空格键快速射击: ${this.rangedAttacker.name} → ${this.rangedTarget.name}`);
                        this.confirmRangedAttack();
                        
                        // 重置时间
                        this.lastSpaceKeyTime = currentTime;
                        return;
                    }
                    
                    // 移动阶段：单击空格键完成当前单位的移动规划
                    if (this.moveState === 'planning' && this.selectedUnit) {
                        console.log(`单击空格键，结束当前单位移动规划`);
                        this.addGameLog(`⌨️ ${this.selectedUnit.name}通过空格键完成移动规划`);
                        this.finishPlanning();
                    }
                    
                    // 记录本次空格键按下时间
                    this.lastSpaceKeyTime = currentTime;
                }
            }

            handleDirectionChange(x, y, event) {
                const unit = this.findUnitAtPosition(x, y);
                
                // 检查是否在转向阶段，或者是移动阶段且单位还未移动
                const canChangeDirection = (this.currentPhase === 'turning') || 
                                         (this.currentPhase === 'movement' && !unit?.hasMoved);
                
                if (!canChangeDirection) {
                    if (this.currentPhase !== 'turning' && this.currentPhase !== 'movement') {
                        this.addGameLog('⚠️ 只能在移动阶段或转向阶段调整单位朝向');
                    }
                    return;
                }
                
                if (unit && unit.faction === this.currentPlayer) {
                    // 循环改变方向
                    const directions = ['north', 'east', 'south', 'west'];
                    const currentIndex = directions.indexOf(unit.direction);
                    const nextIndex = (currentIndex + 1) % directions.length;
                    const oldDirection = unit.direction;
                    unit.direction = directions[nextIndex];
                    
                    const directionNames = {
                        'north': '上',
                        'east': '右',
                        'south': '下',
                        'west': '左'
                    };
                    
                    this.addGameLog(`🔄 ${unit.name}转向: ${directionNames[oldDirection]} → ${directionNames[unit.direction]}`);
                    console.log(`${unit.type} 转向: ${unit.direction}`);
                    
                    // 重新渲染整个棋盘以更新单位显示
                    this.renderBoard();
                    this.updateUI();
                }
            }

            // 拖拽相关方法
            startDrag(unit, event) {
                if (this.currentPhase !== 'deployment' || unit.faction !== this.deploymentPhase) {
                    return;
                }

                this.isDragging = true;
                this.draggedUnit = unit;
                
                const unitElement = document.querySelector(`[data-unit-id="${unit.id}"]`);
                if (unitElement) {
                    unitElement.style.cursor = 'grabbing';
                    unitElement.style.zIndex = '2000';
                    unitElement.style.opacity = '0.8';
                    
                    const rect = unitElement.getBoundingClientRect();
                    this.dragOffset.x = event.clientX - rect.left;
                    this.dragOffset.y = event.clientY - rect.top;
                }

                console.log(`开始拖拽: ${unit.name}`);
                this.addGameLog(`📦 开始拖拽 ${unit.name}`);
            }

            handleDrag(event) {
                if (!this.isDragging || !this.draggedUnit) {
                    return;
                }

                const container = document.getElementById('square-grid');
                const containerRect = container.getBoundingClientRect();
                
                // 计算相对于游戏容器的位置
                const relativeX = event.clientX - containerRect.left - this.dragOffset.x;
                const relativeY = event.clientY - containerRect.top - this.dragOffset.y;

                const unitElement = document.querySelector(`[data-unit-id="${this.draggedUnit.id}"]`);
                if (unitElement) {
                    unitElement.style.left = relativeX + 'px';
                    unitElement.style.top = relativeY + 'px';
                }
            }

            endDrag(event) {
                if (!this.isDragging || !this.draggedUnit) {
                    return;
                }

                const container = document.getElementById('square-grid');
                const containerRect = container.getBoundingClientRect();
                const squareSize = 16;
                
                // 计算新的网格位置
                const relativeX = event.clientX - containerRect.left - this.dragOffset.x;
                const relativeY = event.clientY - containerRect.top - this.dragOffset.y;
                
                const newGridX = Math.round(relativeX / squareSize);
                const newGridY = Math.round(relativeY / squareSize);

                // 检查新位置是否有效
                if (this.isValidDeploymentPosition(this.draggedUnit, newGridX, newGridY)) {
                    // 更新单位位置
                    this.draggedUnit.x = newGridX;
                    this.draggedUnit.y = newGridY;
                    this.addGameLog(`📍 ${this.draggedUnit.name} 部署到 (${newGridX}, ${newGridY})`);
                } else {
                    this.addGameLog(`❌ 无效位置，${this.draggedUnit.name} 回到原位`);
                }

                // 重置拖拽状态
                const unitElement = document.querySelector(`[data-unit-id="${this.draggedUnit.id}"]`);
                if (unitElement) {
                    unitElement.style.cursor = 'grab';
                    unitElement.style.zIndex = '';
                    unitElement.style.opacity = '';
                }

                this.isDragging = false;
                this.draggedUnit = null;
                this.dragOffset = { x: 0, y: 0 };

                // 重新渲染棋盘
                this.renderBoard();
                this.updateUI();
            }

            isValidDeploymentPosition(unit, x, y) {
                const size = this.getUnitSizeWithDirection(unit);
                
                // 检查是否在地图边界内
                if (x < 0 || y < 0 || x + size.width > this.gridWidth || y + size.height > this.gridHeight) {
                    return false;
                }

                // 检查部署区域限制
                if (unit.faction === 'rome') {
                    // 罗马部署在地图下半部分
                    if (y < this.gridHeight * 0.6) {
                        return false;
                    }
                } else if (unit.faction === 'carthage') {
                    // 迦太基部署在地图上半部分
                    if (y + size.height > this.gridHeight * 0.4) {
                        return false;
                    }
                }

                // 检查是否与其他单位重叠
                for (let checkY = y; checkY < y + size.height; checkY++) {
                    for (let checkX = x; checkX < x + size.width; checkX++) {
                        const otherUnit = this.findUnitAtPosition(checkX, checkY);
                        if (otherUnit && otherUnit.id !== unit.id) {
                            return false;
                        }
                    }
                }

                return true;
            }

            confirmDeployment() {
                if (this.currentPhase !== 'deployment') {
                    return;
                }

                if (this.deploymentPhase === 'rome') {
                    this.deploymentPhase = 'carthage';
                    this.addGameLog(`✅ 罗马部署完成，轮到迦太基部署`);
                    this.renderBoard();
                    this.updateUI();
                } else if (this.deploymentPhase === 'carthage') {
                    this.deploymentPhase = 'completed';
                    this.currentPhase = 'movement';
                    this.addGameLog(`✅ 迦太基部署完成，游戏开始！`);
                    this.addGameLog(`🚶 🏛️ 罗马开始规划和移动阶段`);
                    this.renderBoard();
                    this.updateUI();
                }
            }

            findUnitAtPosition(x, y) {
                return this.units.find(unit => {
                    const size = this.getUnitSizeWithDirection(unit);
                    return x >= unit.x && x < unit.x + size.width &&
                           y >= unit.y && y < unit.y + size.height;
                });
            }

            isValidPosition(x, y) {
                return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
            }

            executeMove(unit, newX, newY) {
                if (!this.canMoveTo(unit, newX, newY)) {
                    return false;
                }

                // 移动单位到新位置
                unit.x = newX;
                unit.y = newY;
                unit.hasMoved = true;

                console.log(`${unit.type} 移动到 (${newX}, ${newY})`);
                return true;
            }

            executeAttack(attacker, defender) {
                // 根据当前阶段选择攻击类型
                if (this.currentPhase === 'ranged') {
                    return this.executeRangedAttack(attacker, defender);
                } else if (this.currentPhase === 'melee') {
                    return this.executeMeleeAttack(attacker, defender);
                }
                return false;
            }

            // 射击攻击逻辑
            executeRangedAttack(attacker, defender) {
                if (!this.canAttackInCurrentPhase(attacker, defender)) {
                    return false;
                }

                const attackerName = this.getUnitTypeName(attacker.type);
                const defenderName = this.getUnitTypeName(defender.type);
                
                // 获取射击攻击数值（投掷或射击属性的较大值）
                let rangedAttackValue = Math.max(attacker.rangedAttack, attacker.throwingAttack);
                
                // 目标类型修正：骑兵和弓箭手更难命中
                if (defender.type === 'cavalry') {
                    rangedAttackValue = Math.max(0, rangedAttackValue - 1);
                    this.addGameLog(`🐎 目标为骑兵，射击骰子数-1`);
                } else if (defender.type === 'archer') {
                    rangedAttackValue = Math.max(0, rangedAttackValue - 1);
                    this.addGameLog(`🏹 目标为弓箭手，射击骰子数-1`);
                }
                
                this.addGameLog(`🏹 ${attackerName}向${defenderName}射击，投掷${rangedAttackValue}个D6进行命中判断`);
                
                // 检查是否还有骰子可以投掷
                if (rangedAttackValue <= 0) {
                    this.addGameLog(`❌ 射击骰子数为0，无法进行攻击`);
                    attacker.hasRangedAttacked = true;
                    return true;
                }
                
                // 1. 命中判断阶段
                let hits = 0;
                const hitRolls = [];
                
                for (let i = 0; i < rangedAttackValue; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    hitRolls.push(roll);
                    
                    // 判断命中条件
                    let hitThreshold = 4; // 正常状态：4、5、6命中
                    if (attacker.morale === 'shaken' || attacker.order === 'chaotic') {
                        hitThreshold = 5; // 士气动摇或秩序混乱：5、6命中
                    }
                    
                    if (roll >= hitThreshold) {
                        hits++;
                    }
                }
                
                // 显示命中判断结果
                const statusText = attacker.morale === 'shaken' ? '(士气动摇)' : 
                                 attacker.order === 'chaotic' ? '(秩序混乱)' : '(正常状态)';
                this.addGameLog(`🎲 命中判断${statusText}: [${hitRolls.join(', ')}] - ${hits}次命中`);
                
                if (hits === 0) {
                    this.addGameLog(`❌ 所有射击都未命中目标`);
                    attacker.hasRangedAttacked = true;
                    
                    // 播放射击动画和MISS效果
                    this.showRangedAttackAnimation(attacker, defender, rangedAttackValue, () => {
                        this.showEnhancedDamageEffect(defender.x, defender.y, 0, {
                            isMiss: true,
                            attackType: 'ranged'
                        });
                    });
                    
                    return true;
                }
                
                // 2. 防御判断阶段
                let finalDamage = 0;
                const defenseRolls = [];
                
                this.addGameLog(`🛡️ ${defenderName}进行${hits}次防御判断`);
                
                for (let i = 0; i < hits; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    defenseRolls.push(roll);
                    
                    // 计算防御阈值
                    let defenseThreshold = defender.defense;
                    if (defender.morale === 'shaken' || defender.order === 'chaotic') {
                        defenseThreshold += 1; // 士气动摇或秩序混乱时防御+1
                    }
                    
                    if (roll < defenseThreshold) {
                        finalDamage++; // 防御失败，造成1点伤害
                    }
                }
                
                // 显示防御判断结果
                const defenderStatusText = defender.morale === 'shaken' ? '(士气动摇)' : 
                                          defender.order === 'chaotic' ? '(秩序混乱)' : '(正常状态)';
                const defenseThreshold = defender.defense + (defender.morale === 'shaken' || defender.order === 'chaotic' ? 1 : 0);
                this.addGameLog(`🎲 防御判断${defenderStatusText}(需≥${defenseThreshold}): [${defenseRolls.join(', ')}] - ${finalDamage}次防御失败`);
                
                // 3. 造成伤害
                const totalDamage = finalDamage * 10;
                const wasShaken = defender.morale === 'shaken'; // 记录受伤前是否已经动摇
                defender.hp = Math.max(0, defender.hp - totalDamage);
                
                if (totalDamage > 0) {
                    this.addGameLog(`💥 ${defenderName}受到${totalDamage}点伤害 (${finalDamage}次×10)`);
                    
                    // 显示射击动画，然后显示增强攻击效果
                    this.showRangedAttackAnimation(attacker, defender, hits, () => {
                        const isCritical = finalDamage >= 3; // 3次以上伤害算暴击
                        this.showEnhancedDamageEffect(defender.x, defender.y, totalDamage, {
                            isCritical: isCritical,
                            comboCount: hits,
                            attackType: 'ranged'
                        });
                        this.updateUnitDisplay(defender);
                    });
                } else {
                    this.addGameLog(`🛡️ ${defenderName}成功防御了所有攻击`);
                    // 即使没有伤害也显示射击动画
                    this.showRangedAttackAnimation(attacker, defender, hits);
                }

                // 检查单位是否HP归零 - 进入动摇状态（射击阶段直接进入动摇，不会立即消灭）
                if (defender.hp <= 0 && defender.morale !== 'shaken') {
                    defender.morale = 'shaken';
                    this.addGameLog(`😰 ${defenderName}士气动摇！HP归零`);
                    this.updateUnitDisplay(defender);
                }

                attacker.hasRangedAttacked = true;
                
                // 射击阶段崩溃测试：当且仅当一支动摇的部队被远程射击并造成伤害后执行
                if (wasShaken && finalDamage > 0) {
                    this.addGameLog(`⚠️ ${defenderName}动摇状态下受到射击伤害，需要进行崩溃测试`);
                    console.log(`[executeRangedAttack] 触发射击崩溃测试: 单位=${defenderName}, 动摇=${wasShaken}, 伤害次数=${finalDamage}`);
                    
                    // 延迟执行崩溃测试，等待动画完成
                    setTimeout(() => {
                        this.performRangedRouteTest(defender, finalDamage);
                    }, 1500);
                }
                
                // 检查游戏结束
                this.checkGameEnd();
                return true;
            }

            // 处理近战阶段的点击
            handleMeleePhaseClick(clickedUnit) {
                console.log(`[近战处理] 子阶段: ${this.meleeSubPhase}, 点击单位: ${clickedUnit?.name}, 玩家: ${this.currentPlayer}`);
                
                switch (this.meleeSubPhase) {
                    case 'select_attacker':
                        // 选择近战单位（冲锋或持续）
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            // 检查通用条件
                            if (clickedUnit.hasMeleeAttacked) {
                                this.addGameLog('⚠️ 该单位本回合已经进行过近战');
                                return false;
                            }
                            if (clickedUnit.combatStatus === 'supporting') {
                                this.addGameLog('⚠️ 该单位正在支援中');
                                return false;
                            }
                            
                            // 判断是冲锋近战还是持续近战
                            if (clickedUnit.combatStatus === 'engaged') {
                                // 持续近战：单位已处于近战状态
                                console.log(`[近战处理] 持续近战: ${clickedUnit.name}`);
                                
                                // 检查是否有原对手
                                if (!clickedUnit.engagedWith) {
                                    this.addGameLog('⚠️ 无法找到原近战对手');
                                    return false;
                                }
                                
                                // 找到原对手
                                const opponent = this.units.find(u => u.id === clickedUnit.engagedWith);
                                if (!opponent) {
                                    this.addGameLog('⚠️ 原近战对手已不存在');
                                    return false;
                                }
                                
                                // 检查对手是否在3格内
                                const centerX = clickedUnit.x + Math.floor(this.getUnitSizeWithDirection(clickedUnit).width / 2);
                                const centerY = clickedUnit.y + Math.floor(this.getUnitSizeWithDirection(clickedUnit).height / 2);
                                const opponentCenterX = opponent.x + Math.floor(this.getUnitSizeWithDirection(opponent).width / 2);
                                const opponentCenterY = opponent.y + Math.floor(this.getUnitSizeWithDirection(opponent).height / 2);
                                const distance = this.getDistance(centerX, centerY, opponentCenterX, opponentCenterY);
                                
                                if (distance > 3) {
                                    this.addGameLog(`⚠️ 原对手距离${distance}格，已超出3格范围`);
                                    return false;
                                }
                                
                                // 设置为持续近战
                                this.meleeType = 'sustained';
                                this.meleeAttacker = clickedUnit;
                                this.meleeTarget = opponent;
                                this.meleeSubPhase = 'select_attacker_support';
                                this.addGameLog(`⚔️ 持续近战: ${clickedUnit.name} VS ${opponent.name}`);
                                this.addGameLog(`💪 请选择攻击方支援部队（3格范围内，可多选），完成后点击"完成支援选择"按钮`);
                                this.renderBoard();
                                this.updateUI();
                                return true;
                            } else {
                                // 冲锋近战：单位未处于近战状态
                                console.log(`[近战处理] 冲锋近战: ${clickedUnit.name}`);
                                
                                // 检查3格内是否有敌方单位
                                const nearbyEnemies = this.getUnitsInRange(clickedUnit, 3, false);
                                if (nearbyEnemies.length === 0) {
                                    this.addGameLog('⚠️ 该单位3格内没有敌方单位');
                                    return false;
                                }
                                
                                // 设置为冲锋近战
                                this.meleeType = 'charge';
                                this.meleeAttacker = clickedUnit;
                                this.meleeSubPhase = 'select_target';
                                this.addGameLog(`⚔️ 选择冲锋单位: ${clickedUnit.name}，请选择3格内的攻击目标`);
                                this.renderBoard();
                                this.updateUI();
                                return true;
                            }
                        }
                        break;
                    
                    case 'select_target':
                        // 选择目标
                        if (clickedUnit && clickedUnit.faction !== this.currentPlayer) {
                            // 检查目标是否在冲锋单位3格范围内
                            const centerX = this.meleeAttacker.x + Math.floor(this.getUnitSizeWithDirection(this.meleeAttacker).width / 2);
                            const centerY = this.meleeAttacker.y + Math.floor(this.getUnitSizeWithDirection(this.meleeAttacker).height / 2);
                            const targetCenterX = clickedUnit.x + Math.floor(this.getUnitSizeWithDirection(clickedUnit).width / 2);
                            const targetCenterY = clickedUnit.y + Math.floor(this.getUnitSizeWithDirection(clickedUnit).height / 2);
                            const distance = this.getDistance(centerX, centerY, targetCenterX, targetCenterY);
                            
                            if (distance > 3) {
                                this.addGameLog(`⚠️ 目标距离${distance}格，超出3格冲锋范围`);
                                return false;
                            }
                            // 允许攻击正在近战中的敌方单位（移除combatStatus检查）
                            
                            this.meleeTarget = clickedUnit;
                            
                            // 切换到防御方，让其选择是否撤退
                            this.currentPlayer = this.currentPlayer === 'rome' ? 'carthage' : 'rome';
                            this.meleeSubPhase = 'defender_choose_retreat';
                            this.addGameLog(`🎯 选择目标: ${clickedUnit.name} (距离${distance}格)`);
                            this.addGameLog(`🛡️ 防御方 ${clickedUnit.name}，请选择：撤退或坚守战斗`);
                            this.renderBoard();
                            this.updateUI();
                            return true;
                        } else if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            // 重新选择冲锋单位
                            this.meleeSubPhase = 'select_attacker';
                            return this.handleMeleePhaseClick(clickedUnit);
                        }
                        break;
                    
                    case 'select_attacker_support':
                        // 选择攻击方支援部队
                        console.log(`[支援选择] 点击单位: ${clickedUnit?.name}, 阵营: ${clickedUnit?.faction}, 当前玩家: ${this.currentPlayer}`);
                        
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            const availableSupports = this.getAvailableSupportUnits(this.meleeAttacker);
                            console.log(`[支援选择] 可用支援单位数: ${availableSupports.length}, 单位ID: [${availableSupports.map(u => u.id).join(', ')}]`);
                            console.log(`[支援选择] 点击的单位ID: ${clickedUnit.id}`);
                            
                            if (availableSupports.find(u => u.id === clickedUnit.id)) {
                                // 切换支援状态
                                const index = this.attackerSupports.findIndex(u => u.id === clickedUnit.id);
                                if (index >= 0) {
                                    this.attackerSupports.splice(index, 1);
                                    this.addGameLog(`➖ 取消支援: ${clickedUnit.name}`);
                                } else {
                                    this.attackerSupports.push(clickedUnit);
                                    this.addGameLog(`➕ 添加支援: ${clickedUnit.name}`);
                                }
                                this.renderBoard();
                                this.updateUI();
                                return true;
                            } else {
                                this.addGameLog(`⚠️ ${clickedUnit.name}不能作为支援单位（3格外、已近战或已支援）`);
                                console.log(`[支援选择] 单位${clickedUnit.name}不在可用支援列表中`);
                            }
                        } else if (clickedUnit) {
                            this.addGameLog(`⚠️ 只能选择己方单位作为支援`);
                        }
                        return false;
                    
                    case 'select_defender_support':
                        // 选择防守方支援部队
                        console.log(`[防守方支援] 点击单位: ${clickedUnit?.name}, 阵营: ${clickedUnit?.faction}, 当前玩家: ${this.currentPlayer}`);
                        
                        if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
                            const availableSupports = this.getAvailableSupportUnits(this.meleeTarget);
                            console.log(`[防守方支援] 可用支援单位数: ${availableSupports.length}, 单位ID: [${availableSupports.map(u => u.id).join(', ')}]`);
                            console.log(`[防守方支援] 点击的单位ID: ${clickedUnit.id}, 目标阵营: ${this.meleeTarget.faction}`);
                            
                            if (availableSupports.find(u => u.id === clickedUnit.id)) {
                                // 切换支援状态
                                const index = this.defenderSupports.findIndex(u => u.id === clickedUnit.id);
                                if (index >= 0) {
                                    this.defenderSupports.splice(index, 1);
                                    this.addGameLog(`➖ 取消支援: ${clickedUnit.name}`);
                                } else {
                                    this.defenderSupports.push(clickedUnit);
                                    this.addGameLog(`➕ 添加支援: ${clickedUnit.name}`);
                                }
                                this.renderBoard();
                                this.updateUI();
                                return true;
                            } else {
                                this.addGameLog(`⚠️ ${clickedUnit.name}不能作为支援单位（3格外、已近战或已支援）`);
                                console.log(`[防守方支援] 单位${clickedUnit.name}不在可用支援列表中`);
                            }
                        } else if (clickedUnit) {
                            this.addGameLog(`⚠️ 只能选择防守方单位作为支援`);
                        }
                        return false;
                }
                return false;
            }

            // 近战攻击逻辑（新的冲锋战斗系统）
            executeMeleeAttack(attacker, defender) {
                // 使用新的冲锋战斗系统
                return this.executeChargeAttack();
            }
            
            // 执行冲锋战斗
            executeChargeAttack() {
                if (!this.meleeAttacker || !this.meleeTarget) {
                    console.error('冲锋单位或目标未设置');
                    return false;
                }

                const attacker = this.meleeAttacker;
                const defender = this.meleeTarget;
                
                // 确保设置为执行中状态（如果还没设置的话）
                if (this.meleeSubPhase !== 'executing') {
                    this.meleeSubPhase = 'executing';
                }
                
                // 根据近战类型显示不同的日志
                const meleeTypeName = this.meleeType === 'sustained' ? '持续近战' : '冲锋战斗';
                this.addGameLog(`⚔️ 开始${meleeTypeName}: ${attacker.name} VS ${defender.name}`);
                
                // 1. 计算攻击方支援战力
                let attackerSupportPower = 0;
                this.attackerSupports.forEach(support => {
                    attackerSupportPower += support.supportMelee;
                    support.combatStatus = 'supporting';
                    support.supportingUnit = attacker.id; // 记录正在支援哪个单位
                    this.addGameLog(`💪 ${support.name} 提供支援: +${support.supportMelee}`);
                });
                
                // 2. 计算防守方支援战力
                let defenderSupportPower = 0;
                this.defenderSupports.forEach(support => {
                    defenderSupportPower += support.supportMelee;
                    support.combatStatus = 'supporting';
                    support.supportingUnit = defender.id; // 记录正在支援哪个单位
                    this.addGameLog(`🛡️ ${support.name} 提供支援: +${support.supportMelee}`);
                });
                
                // 更新所有支援单位的显示
                [...this.attackerSupports, ...this.defenderSupports].forEach(support => {
                    this.updateUnitDisplay(support);
                });
                
                // 3. 计算攻击方战斗骰子数
                // 根据近战类型使用不同的战斗力值
                const attackerMeleeValue = this.meleeType === 'sustained' ? attacker.sustainedMelee : attacker.chargeAttack;
                let attackerDice = attackerMeleeValue + attackerSupportPower;
                console.log(`[战斗骰子] 攻击方基础: ${attackerMeleeValue} (${this.meleeType === 'sustained' ? '持续' : '冲锋'}), 支援: ${attackerSupportPower}`);
                
                // 士气和秩序修正
                if (attacker.morale === 'shaken') {
                    attackerDice -= 1;
                    this.addGameLog(`😰 攻击方动摇，骰子数-1`);
                }
                if (attacker.order === 'chaotic') {
                    attackerDice -= 1;
                    this.addGameLog(`📋 攻击方混乱，骰子数-1`);
                }
                
                // 方向修正
                const relativeDirection = this.getRelativeAttackDirection(attacker, defender);
                if (relativeDirection === 'side') {
                    const bonus = Math.floor(attackerMeleeValue * 0.5);
                    attackerDice += bonus;
                    this.addGameLog(`📐 攻击侧面，骰子数+${bonus}`);
                } else if (relativeDirection === 'back') {
                    attackerDice += attackerMeleeValue;
                    this.addGameLog(`📐 攻击背面，骰子数+${attackerMeleeValue}`);
                }
                
                // 上一轮近战胜利加成（只有持续近战才有）
                if (this.meleeType === 'sustained' && attacker.lastMeleeResult === 'won') {
                    attackerDice += 1;
                    this.addGameLog(`🏆 攻击方上轮胜利，骰子数+1`);
                }
                
                attackerDice = Math.max(0, attackerDice);
                
                // 4. 计算防守方战斗骰子数
                // 防守方在持续近战中也使用持续近战值
                const defenderMeleeValue = this.meleeType === 'sustained' ? defender.sustainedMelee : defender.chargeAttack;
                let defenderDice = defenderMeleeValue + defenderSupportPower;
                console.log(`[战斗骰子] 防守方基础: ${defenderMeleeValue} (${this.meleeType === 'sustained' ? '持续' : '冲锋'}), 支援: ${defenderSupportPower}`);
                
                if (defender.morale === 'shaken') {
                    defenderDice -= 1;
                    this.addGameLog(`😰 防守方动摇，骰子数-1`);
                }
                if (defender.order === 'chaotic') {
                    defenderDice -= 1;
                    this.addGameLog(`📋 防守方混乱，骰子数-1`);
                }
                
                defenderDice = Math.max(0, defenderDice);
                
                this.addGameLog(`🎲 攻击方骰子数: ${attackerDice}, 防守方骰子数: ${defenderDice}`);
                
                // 5. 投掷命中判定
                let attackerHits = 0;
                const attackerRolls = [];
                for (let i = 0; i < attackerDice; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    attackerRolls.push(roll);
                    if (roll >= 4) attackerHits++;
                }
                
                let defenderHits = 0;
                const defenderRolls = [];
                for (let i = 0; i < defenderDice; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    defenderRolls.push(roll);
                    if (roll >= 4) defenderHits++;
                }
                
                this.addGameLog(`🎲 攻击方投掷: [${attackerRolls.join(', ')}] - ${attackerHits}次命中`);
                this.addGameLog(`🎲 防守方投掷: [${defenderRolls.join(', ')}] - ${defenderHits}次命中`);
                
                // 6. 防御判定计算伤害
                let attackerDamageCount = 0;
                const attackerDefenseRolls = [];
                for (let i = 0; i < attackerHits; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    attackerDefenseRolls.push(roll);
                    if (roll < defender.defense) attackerDamageCount++;
                }
                
                let defenderDamageCount = 0;
                const defenderDefenseRolls = [];
                for (let i = 0; i < defenderHits; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    defenderDefenseRolls.push(roll);
                    if (roll < attacker.defense) defenderDamageCount++;
                }
                
                this.addGameLog(`🛡️ 防守方防御判定: [${attackerDefenseRolls.join(', ')}] - ${attackerDamageCount}次防御失败`);
                this.addGameLog(`🛡️ 攻击方防御判定: [${defenderDefenseRolls.join(', ')}] - ${defenderDamageCount}次防御失败`);
                
                // 7. 造成伤害
                const attackerTotalDamage = attackerDamageCount * 10;
                const defenderTotalDamage = defenderDamageCount * 10;
                
                defender.hp = Math.max(0, defender.hp - attackerTotalDamage);
                attacker.hp = Math.max(0, attacker.hp - defenderTotalDamage);
                
                this.addGameLog(`💥 ${defender.name}受到${attackerTotalDamage}点伤害 (${attackerDamageCount}次×10)`);
                this.addGameLog(`💥 ${attacker.name}受到${defenderTotalDamage}点伤害 (${defenderDamageCount}次×10)`);
                
                // 播放冲锋动画和攻击效果
                this.showMeleeChargeAnimation(attacker, defender, () => {
                    // 冲锋动画完成后显示伤害效果
                    if (attackerTotalDamage > 0) {
                        const isCritical = attackerDamageCount >= 4; // 4次以上伤害算暴击
                        this.showEnhancedDamageEffect(defender.x, defender.y, attackerTotalDamage, {
                            isCritical: isCritical,
                            comboCount: attackerDamageCount,
                            attackType: 'melee'
                        });
                this.updateUnitDisplay(defender);
                    }
                    if (defenderTotalDamage > 0) {
                        const isCritical = defenderDamageCount >= 4;
                    setTimeout(() => {
                            this.showEnhancedDamageEffect(attacker.x, attacker.y, defenderTotalDamage, {
                                isCritical: isCritical,
                                comboCount: defenderDamageCount,
                                attackType: 'melee'
                            });
                            this.updateUnitDisplay(attacker);
                        }, 200); // 稍微延迟，让两个伤害数字不重叠
                    }
                });
                
                // 8. 判定胜负
                if (attackerDamageCount > defenderDamageCount) {
                    this.addGameLog(`🏆 攻击方获胜！`);
                    attacker.lastMeleeResult = 'won';
                    defender.lastMeleeResult = 'lost';
                } else if (attackerDamageCount < defenderDamageCount) {
                    this.addGameLog(`🛡️ 防守方获胜！`);
                    attacker.lastMeleeResult = 'lost';
                    defender.lastMeleeResult = 'won';
                } else {
                    this.addGameLog(`⚖️ 势均力敌！`);
                    attacker.lastMeleeResult = 'draw';
                    defender.lastMeleeResult = 'draw';
                }
                
                // 9. 更新单位状态
                attacker.hasMeleeAttacked = true;
                attacker.combatStatus = 'engaged';
                defender.combatStatus = 'engaged';
                
                // 设置近战关系
                attacker.engagedWith = defender.id;
                defender.engagedWith = attacker.id;
                
                // 10. 记录本轮伤害（用于崩溃测试）
                attacker.lastBattleDamage = defenderDamageCount; // 自己受到的伤害
                defender.lastBattleDamage = attackerDamageCount; // 自己受到的伤害
                const damageDiff = attackerDamageCount - defenderDamageCount; // 敌方-己方

                // 11. 检查HP归零 - 变为动摇
                if (defender.hp <= 0 && defender.morale !== 'shaken') {
                    defender.morale = 'shaken';
                    this.addGameLog(`😰 ${defender.name}士气动摇！`);
                    this.updateUnitDisplay(defender);
                }
                if (attacker.hp <= 0 && attacker.morale !== 'shaken') {
                    attacker.morale = 'shaken';
                    this.addGameLog(`😰 ${attacker.name}士气动摇！`);
                    this.updateUnitDisplay(attacker);
                }
                
                // 保存支援单位列表的副本（因为后续会被重置）
                const savedAttackerSupports = [...this.attackerSupports];
                const savedDefenderSupports = [...this.defenderSupports];
                
                // 12-14. 执行崩溃测试
                setTimeout(() => {
                    // 记录需要测试的单位，并记录每个单位相关的支援单位列表
                    const unitsToTest = [];
                    
                    console.log(`\n[崩溃测试] 检查条件:`);
                    console.log(`攻击者: ${attacker.name}, morale=${attacker.morale}, hp=${attacker.hp}, result=${attacker.lastMeleeResult}`);
                    console.log(`防守者: ${defender.name}, morale=${defender.morale}, hp=${defender.hp}, result=${defender.lastMeleeResult}`);
                    console.log(`伤害数: 攻击者受=${defenderDamageCount}, 防守者受=${attackerDamageCount}`);
                    console.log(`伤害差: damageDiff=${damageDiff}`);
                    
                    // 12. 动摇部队受伤测试
                    if (attacker.morale === 'shaken' && defenderDamageCount > 0) {
                        console.log(`[崩溃测试] 攻击者${attacker.name}触发动摇部队受伤测试`);
                        unitsToTest.push({ 
                            unit: attacker, 
                            reason: 'shaken_damaged', 
                            damageDiff: -damageDiff,
                            relatedSupports: savedAttackerSupports // 主战单位的支援单位列表
                        });
                    }
                    if (defender.morale === 'shaken' && attackerDamageCount > 0) {
                        console.log(`[崩溃测试] 防守者${defender.name}触发动摇部队受伤测试`);
                        unitsToTest.push({ 
                            unit: defender, 
                            reason: 'shaken_damaged', 
                            damageDiff: damageDiff,
                            relatedSupports: savedDefenderSupports // 主战单位的支援单位列表
                        });
                    }
                    
                    // 13. 战败测试
                    if (attacker.lastMeleeResult === 'lost') {
                        if (!unitsToTest.find(t => t.unit.id === attacker.id)) {
                            console.log(`[崩溃测试] 攻击者${attacker.name}触发战败测试`);
                            unitsToTest.push({ 
                                unit: attacker, 
                                reason: 'defeated', 
                                damageDiff: -damageDiff,
                                relatedSupports: savedAttackerSupports // 主战单位的支援单位列表
                            });
                        }
                    }
                    if (defender.lastMeleeResult === 'lost') {
                        if (!unitsToTest.find(t => t.unit.id === defender.id)) {
                            console.log(`[崩溃测试] 防守者${defender.name}触发战败测试`);
                            unitsToTest.push({ 
                                unit: defender, 
                                reason: 'defeated', 
                                damageDiff: damageDiff,
                                relatedSupports: savedDefenderSupports // 主战单位的支援单位列表
                            });
                        }
                    }
                    
                    console.log(`[崩溃测试] 第一轮：主战单位测试，共 ${unitsToTest.length} 个单位`);
                    
                    // 第一轮：执行主战单位的崩溃测试
                    if (unitsToTest.length > 0) {
                        this.performRouteTests(unitsToTest);
                    }
                    
                    // 第二轮：检查支援单位是否需要测试（基于主战单位测试后的实际状态）
                    const checkSupportedUnitStatusAfterTest = (supportList, supportedUnit, oppositeDamageDiff) => {
                        // 触发条件：主战单位在测试后动摇或被消灭（HP<=0）
                        // 注意：不包括单纯的"战败"，因为战败但坚守的单位不会影响支援单位
                        const shouldTrigger = supportedUnit.morale === 'shaken' || supportedUnit.hp <= 0;
                        
                        if (shouldTrigger) {
                            const reason = supportedUnit.morale === 'shaken' ? '被支援单位动摇' :
                                         supportedUnit.hp <= 0 ? '被支援单位被消灭' : '未知';
                            console.log(`[崩溃测试] ${supportedUnit.name}的支援单位需要进行测试 (原因: ${reason})`);
                            
                            const supportUnitsToTest = [];
                            supportList.forEach(support => {
                                console.log(`[崩溃测试] 支援单位${support.name}触发测试`);
                                supportUnitsToTest.push({ 
                                    unit: support, 
                                    reason: 'supported_unit_failed', 
                                    damageDiff: oppositeDamageDiff,
                                    relatedSupports: []
                                });
                            });
                            
                            if (supportUnitsToTest.length > 0) {
                                console.log(`[崩溃测试] 第二轮：支援单位测试，共 ${supportUnitsToTest.length} 个单位`);
                                this.performRouteTests(supportUnitsToTest);
                            }
                        }
                    };
                    
                    // 延迟执行第二轮测试，确保第一轮测试完成
                    const firstRoundDelay = unitsToTest.length > 0 ? (unitsToTest.length * 1500 + 500) : 500;
                    setTimeout(() => {
                        checkSupportedUnitStatusAfterTest(savedAttackerSupports, attacker, -damageDiff);
                        checkSupportedUnitStatusAfterTest(savedDefenderSupports, defender, damageDiff);
                    }, firstRoundDelay)
                    
                    // 计算崩溃测试总时长（包括两轮），然后重置状态并检查持续近战
                    // 第一轮 + 可能的第二轮（假设最多4个支援单位）
                    const maxSupportTests = Math.min(savedAttackerSupports.length + savedDefenderSupports.length, 4);
                    const totalTestDelay = firstRoundDelay + (maxSupportTests > 0 ? maxSupportTests * 1500 + 500 : 0);
                    setTimeout(() => {
                        const wasChargeType = this.meleeType === 'charge';
                        this.resetChargeState();
                        
                        // 如果是冲锋近战，冲锋完成后自动检查持续近战
                        if (wasChargeType) {
                            console.log('[近战系统] 冲锋近战完成，检查持续近战...');
                            setTimeout(() => {
                                this.autoStartNextSustainedMelee();
                            }, 500);
                        } else {
                            // 如果是持续近战，持续近战完成后检查下一个持续近战
                            console.log('[近战系统] 持续近战完成，检查下一个持续近战...');
                            setTimeout(() => {
                                this.autoStartNextSustainedMelee();
                            }, 500);
                        }
                    }, totalTestDelay);
                    
                }, 2000); // 等待动画完成后再进行测试
                
                this.checkGameEnd();
                return true;
            }
            
            // 获取相对攻击方向（用于计算方向加成）
            getRelativeAttackDirection(attacker, defender) {
                // 计算攻击者相对于防守者的方向（攻击来自哪个方向）
                const dx = attacker.x - defender.x;
                const dy = attacker.y - defender.y;
                
                let attackDirection = '';
                if (Math.abs(dx) > Math.abs(dy)) {
                    attackDirection = dx > 0 ? 'east' : 'west';
                } else {
                    attackDirection = dy > 0 ? 'south' : 'north';
                }
                
                console.log(`[攻击方向] 攻击者(${attacker.x}, ${attacker.y}) -> 防守者(${defender.x}, ${defender.y}), dx=${dx}, dy=${dy}, 攻击来自: ${attackDirection}, 防守者朝向: ${defender.direction}`);
                
                // 计算相对方向
                const directionMap = {
                    'north': { front: 'north', back: 'south', side: ['east', 'west'] },
                    'south': { front: 'south', back: 'north', side: ['east', 'west'] },
                    'east': { front: 'east', back: 'west', side: ['north', 'south'] },
                    'west': { front: 'west', back: 'east', side: ['north', 'south'] }
                };
                
                const defenderDir = directionMap[defender.direction];
                let result = 'front';
                if (attackDirection === defenderDir.back) result = 'back';
                else if (defenderDir.side.includes(attackDirection)) result = 'side';
                
                console.log(`[攻击方向] 判定结果: ${result} (正面=${defenderDir.front}, 背面=${defenderDir.back}, 侧面=[${defenderDir.side.join(', ')}])`);
                return result;
            }
            
            // 执行崩溃测试
            performRouteTests(unitsToTest) {
                if (unitsToTest.length === 0) {
                    return;
                }
                
                this.addGameLog(`\n🎲 开始崩溃测试...`);
                
                unitsToTest.forEach((testData, index) => {
                    setTimeout(() => {
                        this.performSingleRouteTest(testData.unit, testData.reason, testData.damageDiff, testData.relatedSupports);
                    }, index * 1500); // 每个测试间隔1.5秒
                });
            }
            
            // 单个单位的崩溃测试
            performSingleRouteTest(unit, reason, damageDiff, relatedSupports = []) {
                // 检查单位是否还存在
                if (!this.units.find(u => u.id === unit.id)) {
                    console.log(`[performSingleRouteTest] 单位${unit.name}已不存在，跳过测试`);
                    return;
                }
                
                const reasonText = {
                    'shaken_damaged': '动摇部队受伤',
                    'defeated': '近战被击败',
                    'supported_unit_failed': '被支援单位动摇/消灭'
                }[reason] || reason;
                
                this.addGameLog(`\n🎯 ${unit.name} 进行崩溃测试 (原因: ${reasonText})`);
                console.log(`[performSingleRouteTest] 开始测试: ${unit.name}, reason=${reason}, damageDiff=${damageDiff}`);
                
                // 投掷2D6
                const dice1 = Math.floor(Math.random() * 6) + 1;
                const dice2 = Math.floor(Math.random() * 6) + 1;
                const baseRoll = dice1 + dice2;
                
                this.addGameLog(`🎲 投掷2D6: ${dice1} + ${dice2} = ${baseRoll}`);
                this.addGameLog(`📊 伤害差值修正: ${damageDiff > 0 ? '+' : ''}${damageDiff}`);
                
                const finalRoll = baseRoll - damageDiff;
                this.addGameLog(`📊 最终结果: ${baseRoll} - ${damageDiff} = ${finalRoll}`);
                
                // 查表判定结果
                console.log(`[performSingleRouteTest] 调用 getRouteTestResult`);
                const result = this.getRouteTestResult(unit, finalRoll);
                console.log(`[performSingleRouteTest] 调用 applyRouteResult, result=`, result);
                this.applyRouteResult(unit, result, relatedSupports);
                console.log(`[performSingleRouteTest] applyRouteResult 完成`);
            }
            
            // 获取单位类别（用于崩溃测试）
            getUnitCategory(unit) {
                // 骑兵：迦太基骑兵、罗马贵族骑兵、罗马将军、迦太基将军
                if (unit.type === 'cavalry' || unit.type === 'general') {
                    return 'cavalry';
                }
                // 步兵：迦太基步兵、罗马军团兵、罗马后备兵
                if (unit.type === 'infantry') {
                    return 'infantry';
                }
                // 弓箭兵
                if (unit.type === 'archer') {
                    return 'archer';
                }
                // 战象按骑兵处理
                if (unit.type === 'elephant') {
                    return 'cavalry';
                }
                // 默认按步兵处理
                return 'infantry';
            }
            
            // 根据骰子结果查表
            getRouteTestResult(unit, roll) {
                const category = this.getUnitCategory(unit);
                const isShaken = unit.morale === 'shaken';
                console.log(`[getRouteTestResult] 单位=${unit.name}, 类别=${category}, 动摇=${isShaken}, 骰值=${roll}`);
                
                let result;
                
                // 崩溃测试结果表
                if (roll >= 10) {
                    result = { action: 'hold', disorder: false, text: '坚守' };
                } else if (roll === 9) {
                    if (category === 'cavalry') {
                        result = { action: 'retreat_ordered', disorder: false, withSupports: true, text: '骑兵和支援单位一起有序后退' };
                    } else if (category === 'archer') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '弓箭兵混乱地撤退' };
                    } else { // infantry
                        result = { action: 'hold', disorder: false, text: '步兵坚守' };
                    }
                } else if (roll === 8) {
                    if (category === 'cavalry') {
                        result = { action: 'retreat_ordered', disorder: false, withSupports: true, text: '骑兵和支援单位一起有序后退' };
                    } else if (category === 'archer') {
                        if (isShaken) {
                            result = { action: 'destroyed', text: '弓箭兵动摇被消灭' };
                        } else {
                            result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '弓箭兵混乱地后退' };
                        }
                    } else { // infantry
                        result = { action: 'hold', disorder: false, text: '步兵坚守' };
                    }
                } else if (roll === 7 || roll === 6) {
                    if (category === 'cavalry') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: true, text: '骑兵和支援单位一起混乱地后退' };
                    } else if (category === 'archer') {
                        result = { action: 'destroyed', text: '弓箭兵被消灭' };
                    } else { // infantry
                        result = { action: 'retreat_ordered', disorder: false, withSupports: true, text: '步兵和支援单位一起有序后退' };
                    }
                } else if (roll === 5) {
                    if (category === 'cavalry') {
                        if (isShaken) {
                            result = { action: 'destroyed', text: '骑兵动摇被消灭' };
                        } else {
                            result = { action: 'retreat_disordered', disorder: true, withSupports: true, text: '骑兵和支援单位一起混乱后退' };
                        }
                    } else if (category === 'archer') {
                        result = { action: 'destroyed', text: '弓箭兵被消灭' };
                    } else { // infantry
                        result = { action: 'retreat_disordered', disorder: true, withSupports: true, text: '步兵和支援单位一起混乱地后退' };
                    }
                } else if (roll === 4) {
                    if (category === 'archer') {
                        result = { action: 'destroyed', text: '弓箭兵被消灭' };
                    } else { // infantry or cavalry
                        if (isShaken) {
                            result = { action: 'destroyed', text: '动摇被消灭' };
                        } else {
                            result = { action: 'retreat_disordered', disorder: true, withSupports: true, text: '和支援单位一起混乱后退' };
                        }
                    }
                } else if (roll === 3) {
                    if (category === 'cavalry' || category === 'archer') {
                        result = { action: 'destroyed', text: '被消灭' };
                    } else { // infantry
                        if (isShaken) {
                            result = { action: 'destroyed', text: '步兵动摇被消灭' };
                        } else {
                            result = { action: 'retreat_disordered', disorder: true, withSupports: true, text: '步兵和支援单位一起混乱后退' };
                        }
                    }
                } else { // roll <= 2
                    result = { action: 'destroyed', text: '被消灭' };
                }
                
                console.log(`[getRouteTestResult] 结果: action=${result.action}, text=${result.text}`);
                return result;
            }
            
            // 应用崩溃测试结果
            applyRouteResult(unit, result, relatedSupports = []) {
                this.addGameLog(`✅ 结果: ${result.text}`);
                console.log(`[applyRouteResult] 单位=${unit.name}, action=${result.action}, disorder=${result.disorder}, withSupports=${result.withSupports}`);
                
                switch (result.action) {
                    case 'hold':
                        // 坚守原地
                        console.log(`[applyRouteResult] 执行坚守原地`);
                        if (result.disorder) {
                            unit.order = 'chaotic';
                            this.addGameLog(`📋 ${unit.name}进入混乱状态`);
                        }
                        // 清除支援状态（通过了崩溃测试，不再支援）
                        if (unit.combatStatus === 'supporting') {
                            console.log(`[applyRouteResult] 清除坚守单位${unit.name}的支援状态`);
                            unit.combatStatus = 'not_engaged';
                            unit.supportingUnit = null;
                            this.addGameLog(`🏃 ${unit.name}脱离支援状态`);
                        }
                        this.updateUnitDisplay(unit);
                        break;
                        
                    case 'retreat_ordered':
                        // 有序后退
                        console.log(`[applyRouteResult] 执行有序后退`);
                        const orderedResult = this.retreatUnit(unit, false, result.withSupports, relatedSupports, true);
                        if (orderedResult.destroyed) {
                            // 单位因无法撤退被消灭，执行消灭逻辑
                            const isGeneral = unit.type === 'general';
                            const generalFaction = unit.faction;
                            this.showDeathEffect(unit.x, unit.y);
                            if (isGeneral) {
                                setTimeout(async () => {
                                    await this.performGeneralDeathTest(generalFaction);
                                    this.checkGameEnd();
                                }, 800);
                            } else {
                                setTimeout(() => {
                                    this.checkGameEnd();
                                }, 800);
                            }
                        }
                        break;
                        
                    case 'retreat_disordered':
                        // 混乱后退
                        console.log(`[applyRouteResult] 执行混乱后退`);
                        const disorderedResult = this.retreatUnit(unit, true, result.withSupports, relatedSupports, true);
                        if (disorderedResult.destroyed) {
                            // 单位因无法撤退被消灭，执行消灭逻辑
                            const isGeneral = unit.type === 'general';
                            const generalFaction = unit.faction;
                            this.showDeathEffect(unit.x, unit.y);
                            if (isGeneral) {
                                setTimeout(async () => {
                                    await this.performGeneralDeathTest(generalFaction);
                                    this.checkGameEnd();
                                }, 800);
                            } else {
                                setTimeout(() => {
                                    this.checkGameEnd();
                                }, 800);
                            }
                        }
                        break;
                        
                    case 'destroyed':
                        // 被消灭
                        console.log(`[applyRouteResult] 单位被消灭`);
                        this.addGameLog(`💀 ${unit.name}被消灭！`);
                        
                        // 检查是否是将领
                        const isGeneral = unit.type === 'general';
                        const generalFaction = unit.faction;
                        
                        this.showDeathEffect(unit.x, unit.y);
                        setTimeout(async () => {
                            this.removeUnit(unit);
                            // 检查并解除对手的近战状态
                            this.checkAndDisengageUnits();
                            
                            // 如果被消灭的是将领，触发将领阵亡测试
                            if (isGeneral) {
                                await this.performGeneralDeathTest(generalFaction);
                            }
                            
                            this.checkGameEnd();
                        }, 800);
                        break;
                        
                    default:
                        console.error(`[applyRouteResult] 未知的action: ${result.action}`);
                        break;
                }
            }
            
            // 将领阵亡测试：当本阵营将领被消灭时，对所有剩余部队进行士气测试
            async performGeneralDeathTest(faction) {
                // 检查该阵营的将领阵亡测试是否已经执行过
                if (this.generalDeathTestDone[faction]) {
                    console.log(`[将领阵亡测试] ${faction}阵营的将领阵亡测试已经执行过，跳过`);
                    return;
                }
                
                // 标记该阵营的将领阵亡测试已执行
                this.generalDeathTestDone[faction] = true;
                
                this.addGameLog(`\n⚠️ ${faction === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'}将领阵亡！开始进行部队士气测试...`);
                console.log(`[将领阵亡测试] ${faction}将领被消灭，开始测试所有剩余部队`);
                
                // 获取该阵营所有存活的非将领单位
                const remainingUnits = this.units.filter(u => 
                    u.faction === faction && 
                    u.type !== 'general' && 
                    u.hp > 0
                );
                
                if (remainingUnits.length === 0) {
                    this.addGameLog(`⚠️ 该阵营没有剩余部队需要测试`);
                    return;
                }
                
                this.addGameLog(`📋 需要测试的单位数量: ${remainingUnits.length}`);
                
                // 逐个对每个单位进行测试
                for (const unit of remainingUnits) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 投掷2D6
                    const dice1 = Math.floor(Math.random() * 6) + 1;
                    const dice2 = Math.floor(Math.random() * 6) + 1;
                    const roll = dice1 + dice2;
                    
                    this.addGameLog(`\n🎯 ${unit.name} 进行将领阵亡士气测试`);
                    this.addGameLog(`🎲 投掷2D6: ${dice1} + ${dice2} = ${roll}`);
                    
                    // 查表获取结果
                    const result = this.getGeneralDeathTestResult(unit, roll);
                    
                    this.addGameLog(`✅ 结果: ${result.text}`);
                    console.log(`[将领阵亡测试] ${unit.name}, roll=${roll}, result=`, result);
                    
                    // 应用结果
                    await this.applyGeneralDeathTestResult(unit, result);
                }
                
                this.addGameLog(`\n✅ 将领阵亡士气测试完成\n`);
                
                // 更新显示
                this.renderBoard();
                this.updateUI();
            }
            
            // 根据骰子结果查表获取将领阵亡测试结果
            getGeneralDeathTestResult(unit, roll) {
                const category = this.getUnitCategory(unit);
                
                // 根据单位类别和骰子结果查表
                if (roll >= 10) {
                    // 10+：所有单位坚守
                    return { action: 'hold', disorder: false, text: '坚守' };
                } else if (roll === 9) {
                    // 9：步兵/骑兵坚守，弓箭兵有序撤退
                    if (category === 'archer') {
                        return { action: 'retreat_ordered', disorder: false, text: '有序地撤退' };
                    } else {
                        return { action: 'hold', disorder: false, text: '坚守' };
                    }
                } else if (roll === 8) {
                    // 8：步兵/骑兵坚守，弓箭兵混乱撤退
                    if (category === 'archer') {
                        return { action: 'retreat_disordered', disorder: true, text: '混乱地撤退' };
                    } else {
                        return { action: 'hold', disorder: false, text: '坚守' };
                    }
                } else if (roll === 7) {
                    // 7：步兵坚守，骑兵有序撤退，弓箭兵混乱撤退
                    if (category === 'infantry') {
                        return { action: 'hold', disorder: false, text: '坚守' };
                    } else if (category === 'cavalry') {
                        return { action: 'retreat_ordered', disorder: false, text: '有序地撤退' };
                    } else { // archer
                        return { action: 'retreat_disordered', disorder: true, text: '混乱地撤退' };
                    }
                } else if (roll === 6) {
                    // 6：步兵坚守并混乱，骑兵混乱撤退，弓箭兵混乱撤退
                    if (category === 'infantry') {
                        return { action: 'hold', disorder: true, text: '坚守并混乱' };
                    } else {
                        return { action: 'retreat_disordered', disorder: true, text: '混乱地撤退' };
                    }
                } else if (roll === 5) {
                    // 5：步兵坚守并混乱，骑兵混乱撤退，弓箭兵被消灭
                    if (category === 'infantry') {
                        return { action: 'hold', disorder: true, text: '坚守并混乱' };
                    } else if (category === 'cavalry') {
                        return { action: 'retreat_disordered', disorder: true, text: '混乱地撤退' };
                    } else { // archer
                        return { action: 'destroyed', disorder: false, text: '被消灭' };
                    }
                } else if (roll === 4) {
                    // 4：步兵混乱撤退，骑兵被消灭，弓箭兵被消灭
                    if (category === 'infantry') {
                        return { action: 'retreat_disordered', disorder: true, text: '混乱地撤退' };
                    } else {
                        return { action: 'destroyed', disorder: false, text: '被消灭' };
                    }
                } else {
                    // 3及以下：所有单位被消灭
                    return { action: 'destroyed', disorder: false, text: '被消灭' };
                }
            }
            
            // 应用将领阵亡测试结果
            async applyGeneralDeathTestResult(unit, result) {
                switch (result.action) {
                    case 'hold':
                        // 坚守原地
                        console.log(`[将领阵亡测试] ${unit.name}坚守原地`);
                        if (result.disorder) {
                            unit.order = 'chaotic';
                            this.addGameLog(`📋 ${unit.name}进入混乱状态`);
                        }
                        this.updateUnitDisplay(unit);
                        break;
                        
                    case 'retreat_ordered':
                        // 有序后退
                        console.log(`[将领阵亡测试] ${unit.name}有序后退`);
                        const orderedRes = this.retreatUnit(unit, false, false, [], true);
                        if (orderedRes.destroyed) {
                            this.showDeathEffect(unit.x, unit.y);
                            await new Promise(resolve => setTimeout(resolve, 800));
                            this.checkAndDisengageUnits();
                            this.checkGameEnd();
                        }
                        break;
                        
                    case 'retreat_disordered':
                        // 混乱后退
                        console.log(`[将领阵亡测试] ${unit.name}混乱后退`);
                        const disorderedRes = this.retreatUnit(unit, true, false, [], true);
                        if (disorderedRes.destroyed) {
                            this.showDeathEffect(unit.x, unit.y);
                            await new Promise(resolve => setTimeout(resolve, 800));
                            this.checkAndDisengageUnits();
                            this.checkGameEnd();
                        }
                        break;
                        
                    case 'destroyed':
                        // 被消灭
                        console.log(`[将领阵亡测试] ${unit.name}被消灭`);
                        this.addGameLog(`💀 ${unit.name}被消灭！`);
                        this.showDeathEffect(unit.x, unit.y);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        this.removeUnit(unit);
                        this.checkAndDisengageUnits();
                        this.checkGameEnd();
                        break;
                }
            }
            
            // 射击阶段崩溃测试查表（与近战不同）
            getRangedRouteTestResult(unit, roll) {
                const category = this.getUnitCategory(unit);
                console.log(`[getRangedRouteTestResult] 单位=${unit.name}, 类别=${category}, 骰值=${roll}`);
                
                let result;
                
                // 射击阶段崩溃测试结果表
                if (roll >= 10) {
                    // 10+：全部坚守
                    result = { action: 'hold', disorder: false, text: '坚守' };
                } else if (roll === 9) {
                    if (category === 'archer') {
                        result = { action: 'retreat_ordered', disorder: false, withSupports: false, text: '弓箭兵有序地撤退' };
                    } else { // infantry or cavalry
                        result = { action: 'hold', disorder: false, text: '坚守' };
                    }
                } else if (roll === 8) {
                    if (category === 'archer') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '弓箭兵混乱地撤退' };
                    } else { // infantry or cavalry
                        result = { action: 'hold', disorder: false, text: '坚守' };
                    }
                } else if (roll === 7) {
                    if (category === 'cavalry') {
                        result = { action: 'retreat_ordered', disorder: false, withSupports: false, text: '骑兵有序地撤退' };
                    } else if (category === 'archer') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '弓箭兵混乱地撤退' };
                    } else { // infantry
                        result = { action: 'hold', disorder: false, text: '步兵坚守' };
                    }
                } else if (roll === 6) {
                    if (category === 'cavalry') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '骑兵混乱地撤退' };
                    } else if (category === 'archer') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '弓箭兵混乱地撤退' };
                    } else { // infantry
                        result = { action: 'hold', disorder: true, text: '步兵坚守并混乱' };
                    }
                } else if (roll === 5) {
                    if (category === 'cavalry') {
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '骑兵混乱地撤退' };
                    } else if (category === 'archer') {
                        result = { action: 'destroyed', text: '弓箭兵被消灭' };
                    } else { // infantry
                        result = { action: 'hold', disorder: true, text: '步兵坚守并混乱' };
                    }
                } else if (roll === 4) {
                    if (category === 'cavalry' || category === 'archer') {
                        result = { action: 'destroyed', text: '被消灭' };
                    } else { // infantry
                        result = { action: 'retreat_disordered', disorder: true, withSupports: false, text: '步兵混乱地撤退' };
                    }
                } else { // roll <= 3
                    // 2-3：全部被消灭
                    result = { action: 'destroyed', text: '被消灭' };
                }
                
                console.log(`[getRangedRouteTestResult] 结果: action=${result.action}, text=${result.text}`);
                return result;
            }
            
            // 执行射击阶段的崩溃测试
            performRangedRouteTest(unit, damageReceived) {
                console.log(`[performRangedRouteTest] 单位=${unit.name}, 受到伤害=${damageReceived}`);
                
                // 投掷2D6
                const die1 = Math.floor(Math.random() * 6) + 1;
                const die2 = Math.floor(Math.random() * 6) + 1;
                const baseRoll = die1 + die2;
                
                // 计算修正值：敌方伤害 - 己方伤害 = 0 - damageReceived = -damageReceived
                const damageDiff = -damageReceived;
                const finalRoll = baseRoll + damageDiff;
                
                this.addGameLog(`🎲 射击崩溃测试: 2D6=[${die1}+${die2}=${baseRoll}] 伤害修正=${damageDiff} 最终=${finalRoll}`);
                console.log(`[performRangedRouteTest] baseRoll=${baseRoll}, damageDiff=${damageDiff}, finalRoll=${finalRoll}`);
                
                // 查表获取结果
                const result = this.getRangedRouteTestResult(unit, finalRoll);
                
                // 应用结果（射击阶段不涉及支援单位）
                this.applyRouteResult(unit, result, []);
            }
            
            // 后退单位
            // 检查撤退路径是否有敌方单位阻挡
            checkRetreatPath(unit, retreatDistance) {
                const oppositeDirection = {
                    'north': 'south',
                    'south': 'north',
                    'east': 'west',
                    'west': 'east'
                }[unit.direction];
                
                const unitSize = this.getUnitSizeWithDirection(unit);
                
                // 检查撤退路径上的每一格
                for (let step = 1; step <= retreatDistance; step++) {
                    let checkX = unit.x;
                    let checkY = unit.y;
                    
                    switch (oppositeDirection) {
                        case 'north':
                            checkY -= step;
                            break;
                        case 'south':
                            checkY += step;
                            break;
                        case 'east':
                            checkX += step;
                            break;
                        case 'west':
                            checkX -= step;
                            break;
                    }
                    
                    // 检查该位置是否有敌方单位
                    for (let unit2 of this.units) {
                        if (unit2.id === unit.id || unit2.faction === unit.faction) continue;
                        
                        const unit2Size = this.getUnitSizeWithDirection(unit2);
                        
                        // 检查是否重叠
                        if (checkX < unit2.x + unit2Size.width &&
                            checkX + unitSize.width > unit2.x &&
                            checkY < unit2.y + unit2Size.height &&
                            checkY + unitSize.height > unit2.y) {
                            return { canRetreat: false, blockedBy: unit2, blockedAt: step };
                        }
                    }
                }
                
                return { canRetreat: true, blockedBy: null, blockedAt: -1 };
            }

            retreatUnit(unit, isDisordered, withSupports, relatedSupports = [], fromRouteTest = false) {
                // 检查单位是否还存在
                if (!this.units.find(u => u.id === unit.id)) {
                    console.error(`[retreatUnit] 单位${unit.name}已不存在，无法执行后退`);
                    return { success: false, destroyed: false };
                }
                
                console.log(`[retreatUnit] 单位=${unit.name}, isDisordered=${isDisordered}, withSupports=${withSupports}, relatedSupports数量=${relatedSupports.length}, fromRouteTest=${fromRouteTest}`);
                console.log(`[retreatUnit] 单位当前位置: (${unit.x}, ${unit.y}), 朝向=${unit.direction}`);
                
                // 近战后退固定6格
                const retreatDistance = 6;
                
                // 检查撤退路径是否有敌方单位阻挡
                const pathCheck = this.checkRetreatPath(unit, retreatDistance);
                if (!pathCheck.canRetreat) {
                    this.addGameLog(`⚠️ ${unit.name}的撤退路径被${pathCheck.blockedBy.name}阻挡！`);
                    
                    if (fromRouteTest) {
                        // 如果是崩溃测试导致的撤退且无法撤退，则消灭单位
                        this.addGameLog(`💀 ${unit.name}无法撤退，被消灭！`);
                        this.removeUnit(unit);
                        return { success: false, destroyed: true };
                    } else {
                        // 非崩溃测试的撤退（例如防守方选择撤退），不允许撤退
                        this.addGameLog(`❌ ${unit.name}无法撤退！`);
                        return { success: false, destroyed: false };
                    }
                }
                
                // 计算后退方向（与单位朝向相反）
                const oppositeDirection = {
                    'north': 'south',
                    'south': 'north',
                    'east': 'west',
                    'west': 'east'
                }[unit.direction];
                
                console.log(`[retreatUnit] 后退方向=${oppositeDirection}`);
                
                // 计算目标位置
                let targetX = unit.x;
                let targetY = unit.y;
                
                switch (oppositeDirection) {
                    case 'north':
                        targetY -= retreatDistance;
                        break;
                    case 'south':
                        targetY += retreatDistance;
                        break;
                    case 'east':
                        targetX += retreatDistance;
                        break;
                    case 'west':
                        targetX -= retreatDistance;
                        break;
                }
                
                // 检查目标位置是否有效
                const unitSize = this.getUnitSizeWithDirection(unit);
                let finalX = targetX;
                let finalY = targetY;
                let blocked = false;
                
                // 检查是否出界
                if (targetX < 0 || targetY < 0 || 
                    targetX + unitSize.width > this.gridWidth || 
                    targetY + unitSize.height > this.gridHeight) {
                    // 尽可能后退
                    finalX = Math.max(0, Math.min(targetX, this.gridWidth - unitSize.width));
                    finalY = Math.max(0, Math.min(targetY, this.gridHeight - unitSize.height));
                    blocked = true;
                    this.addGameLog(`⚠️ ${unit.name}后退受阻（地图边界）`);
                }
                
                // 检查是否与其他单位重叠
                if (!blocked && this.isAreaOccupiedByOthers(finalX, finalY, unitSize.width, unitSize.height, unit.id)) {
                    // 尝试部分后退
                    let partialDistance = 0;
                    for (let d = retreatDistance - 1; d > 0; d--) {
                        let testX = unit.x;
                        let testY = unit.y;
                        switch (oppositeDirection) {
                            case 'north': testY -= d; break;
                            case 'south': testY += d; break;
                            case 'east': testX += d; break;
                            case 'west': testX -= d; break;
                        }
                        if (!this.isAreaOccupiedByOthers(testX, testY, unitSize.width, unitSize.height, unit.id)) {
                            finalX = testX;
                            finalY = testY;
                            partialDistance = d;
                            break;
                        }
                    }
                    if (partialDistance > 0) {
                        blocked = true;
                        this.addGameLog(`⚠️ ${unit.name}后退受阻，只能后退${partialDistance}格`);
                    } else {
                        finalX = unit.x;
                        finalY = unit.y;
                        blocked = true;
                        this.addGameLog(`⚠️ ${unit.name}后退完全受阻！`);
                    }
                }
                
                // 移动单位
                if (finalX !== unit.x || finalY !== unit.y) {
                    console.log(`[retreatUnit] 移动单位从(${unit.x}, ${unit.y})到(${finalX}, ${finalY})`);
                    unit.x = finalX;
                    unit.y = finalY;
                    this.addGameLog(`🏃 ${unit.name}后退到(${finalX}, ${finalY})`);
                } else {
                    console.log(`[retreatUnit] 单位位置未改变`);
                }
                
                // 处理混乱状态
                if (isDisordered || blocked) {
                    console.log(`[retreatUnit] 设置混乱状态: isDisordered=${isDisordered}, blocked=${blocked}`);
                    unit.order = 'chaotic';
                    this.addGameLog(`📋 ${unit.name}进入混乱状态`);
                } else {
                    console.log(`[retreatUnit] 不设置混乱状态`);
                }
                
                // 清除后退单位的支援状态
                if (unit.combatStatus === 'supporting') {
                    console.log(`[retreatUnit] 清除单位${unit.name}的支援状态`);
                    unit.combatStatus = 'not_engaged';
                    unit.supportingUnit = null;
                    this.addGameLog(`🏃 ${unit.name}脱离支援状态`);
                }
                
                // 处理支援单位（只影响传入的relatedSupports列表中的单位）
                if (withSupports && relatedSupports.length > 0) {
                    relatedSupports.forEach(support => {
                        // 检查支援单位是否还存在（可能已被消灭）
                        if (!this.units.find(u => u.id === support.id)) {
                            console.log(`[retreatUnit] 支援单位${support.name}已不存在`);
                            return;
                        }
                        
                        console.log(`[retreatUnit] 处理支援单位${support.name}, 当前位置:(${support.x}, ${support.y})`);
                        console.log(`[retreatUnit] 主单位后退到位置: finalX=${finalX}, finalY=${finalY}`);
                        
                        this.addGameLog(`👥 ${support.name}跟随${unit.name}一起后退`);
                        // 支援单位也后退（简化处理，后退到主单位附近）
                        const offsetX = Math.floor(Math.random() * 3) - 1;
                        const offsetY = Math.floor(Math.random() * 3) - 1;
                        console.log(`[retreatUnit] 随机偏移: offsetX=${offsetX}, offsetY=${offsetY}`);
                        
                        let supportTargetX = finalX + offsetX;
                        let supportTargetY = finalY + offsetY;
                        console.log(`[retreatUnit] 初始目标位置: (${supportTargetX}, ${supportTargetY})`);
                        
                        const supportSize = this.getUnitSizeWithDirection(support);
                        console.log(`[retreatUnit] 支援单位尺寸: ${supportSize.width}x${supportSize.height}`);
                        console.log(`[retreatUnit] 地图尺寸: gridWidth=${this.gridWidth}, gridHeight=${this.gridHeight}`);
                        
                        supportTargetX = Math.max(0, Math.min(supportTargetX, this.gridWidth - supportSize.width));
                        supportTargetY = Math.max(0, Math.min(supportTargetY, this.gridHeight - supportSize.height));
                        console.log(`[retreatUnit] 边界限制后位置: (${supportTargetX}, ${supportTargetY})`);
                        
                        if (!this.isAreaOccupiedByOthers(supportTargetX, supportTargetY, supportSize.width, supportSize.height, support.id)) {
                            console.log(`[retreatUnit] 位置未被占用，更新支援单位位置: (${support.x}, ${support.y}) -> (${supportTargetX}, ${supportTargetY})`);
                            support.x = supportTargetX;
                            support.y = supportTargetY;
                            this.addGameLog(`🏃 ${support.name}后退到(${supportTargetX}, ${supportTargetY})`);
                        } else {
                            console.log(`[retreatUnit] 位置被占用，支援单位保持原位: (${support.x}, ${support.y})`);
                            this.addGameLog(`⚠️ ${support.name}后退受阻，保持原位`);
                        }
                        
                        if (isDisordered) {
                            support.order = 'chaotic';
                        }
                        
                        console.log(`[retreatUnit] 支援单位${support.name}最终位置: (${support.x}, ${support.y})`);
                        this.updateUnitDisplay(support);
                    });
                }
                
                this.updateUnitDisplay(unit);
                this.renderBoard();
                
                // 检查是否有单位因后退脱离近战
                this.checkAndDisengageUnits();
                
                return { success: true, destroyed: false };
            }
            
            // 重置冲锋状态
            resetChargeState() {
                this.meleeType = null;
                this.meleeAttacker = null;
                this.meleeTarget = null;
                this.attackerSupports = [];
                this.defenderSupports = [];
                this.meleeSubPhase = 'select_attacker';
                
                // 重置后立即更新UI以隐藏执行冲锋按钮
                this.renderBoard();
                this.updateUI();
            }
            
            // 查找所有可以进行持续近战的单位
            getAvailableSustainedMeleeUnits() {
                return this.units.filter(unit => {
                    // 基本条件：当前玩家、处于近战中、本回合未进行近战
                    if (unit.faction !== this.currentPlayer) return false;
                    if (unit.combatStatus !== 'engaged') return false;
                    if (unit.hasMeleeAttacked) return false;
                    if (!unit.engagedWith) return false;
                    
                    // 检查原对手是否还在3格内
                    const opponent = this.units.find(u => u.id === unit.engagedWith);
                    if (!opponent) return false;
                    
                    const centerX = unit.x + Math.floor(this.getUnitSizeWithDirection(unit).width / 2);
                    const centerY = unit.y + Math.floor(this.getUnitSizeWithDirection(unit).height / 2);
                    const opponentCenterX = opponent.x + Math.floor(this.getUnitSizeWithDirection(opponent).width / 2);
                    const opponentCenterY = opponent.y + Math.floor(this.getUnitSizeWithDirection(opponent).height / 2);
                    const distance = this.getDistance(centerX, centerY, opponentCenterX, opponentCenterY);
                    
                    return distance <= 3;
                });
            }
            
            // 自动开始下一个持续近战
            autoStartNextSustainedMelee() {
                console.log('[持续近战] 检查是否有下一个可持续近战的单位');
                
                const availableUnits = this.getAvailableSustainedMeleeUnits();
                console.log(`[持续近战] 找到 ${availableUnits.length} 个可持续近战的单位`);
                
                if (availableUnits.length === 0) {
                    // 没有更多持续近战单位，结束持续近战流程
                    console.log('[持续近战] 没有更多单位，结束持续近战流程');
                    this.addGameLog(`\n✅ 所有持续近战已完成`);
                    return false;
                }
                
                // 选择第一个单位自动开始持续近战
                const nextUnit = availableUnits[0];
                const opponent = this.units.find(u => u.id === nextUnit.engagedWith);
                
                console.log(`[持续近战] 自动开始: ${nextUnit.name} VS ${opponent.name}`);
                this.addGameLog(`\n🔄 自动进行持续近战...`);
                
                // 设置为持续近战
                this.meleeType = 'sustained';
                this.meleeAttacker = nextUnit;
                this.meleeTarget = opponent;
                this.meleeSubPhase = 'select_attacker_support';
                
                this.addGameLog(`⚔️ 持续近战: ${nextUnit.name} VS ${opponent.name}`);
                this.addGameLog(`💪 请选择攻击方支援部队（3格范围内，可多选），完成后点击"完成支援选择"按钮`);
                
                this.renderBoard();
                this.updateUI();
                return true;
            }
            
            // 混乱状态恢复测试（Rally Test）
            performRallyTests() {
                const currentPlayerName = this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                
                // 找出所有当前玩家的混乱单位
                const chaoticUnits = this.units.filter(u => 
                    u.faction === this.currentPlayer && 
                    u.order === 'chaotic'
                );
                
                if (chaoticUnits.length === 0) {
                    return; // 没有混乱单位，不需要测试
                }
                
                this.addGameLog(`\n📋 ${currentPlayerName}混乱部队尝试恢复秩序...`);
                
                chaoticUnits.forEach(unit => {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    console.log(`[恢复测试] ${unit.name} 投掷D6: ${roll}`);
                    
                    if (roll >= 4) {
                        // 成功恢复
                        unit.order = 'good';
                        this.addGameLog(`✅ ${unit.name}投掷${roll}，成功恢复秩序！`);
                        this.updateUnitDisplay(unit);
                    } else {
                        // 失败
                        this.addGameLog(`❌ ${unit.name}投掷${roll}，仍然混乱`);
                    }
                });
                
                this.renderBoard();
            }
            
            // 检查并解除超距的近战状态
            checkAndDisengageUnits() {
                const unitsToDisengage = [];
                
                // 检查所有近战中的单位
                this.units.forEach(unit => {
                    if (unit.combatStatus === 'engaged' && unit.engagedWith) {
                        // 找到其近战对手
                        const opponent = this.units.find(u => u.id === unit.engagedWith);
                        if (!opponent) {
                            // 对手已经不存在（被消灭），解除近战状态
                            unitsToDisengage.push(unit);
                            return;
                        }
                        
                        // 计算距离
                        const unitCenterX = unit.x + Math.floor(this.getUnitSizeWithDirection(unit).width / 2);
                        const unitCenterY = unit.y + Math.floor(this.getUnitSizeWithDirection(unit).height / 2);
                        const opponentCenterX = opponent.x + Math.floor(this.getUnitSizeWithDirection(opponent).width / 2);
                        const opponentCenterY = opponent.y + Math.floor(this.getUnitSizeWithDirection(opponent).height / 2);
                        const distance = this.getDistance(unitCenterX, unitCenterY, opponentCenterX, opponentCenterY);
                        
                        // 如果距离超过3格，标记为需要解除
                        if (distance > 3) {
                            if (!unitsToDisengage.find(u => u.id === unit.id)) {
                                unitsToDisengage.push(unit);
                            }
                            if (!unitsToDisengage.find(u => u.id === opponent.id)) {
                                unitsToDisengage.push(opponent);
                            }
                        }
                    }
                });
                
                // 解除近战状态
                unitsToDisengage.forEach(unit => {
                    const opponentId = unit.engagedWith;
                    const opponent = this.units.find(u => u.id === opponentId);
                    
                    this.addGameLog(`🏃 ${unit.name}脱离了与${opponent ? opponent.name : '对手'}的近战`);
                    
                    // 解除该单位的近战状态
                    unit.combatStatus = 'not_engaged';
                    unit.engagedWith = null;
                    this.updateUnitDisplay(unit);
                    
                    // 找出所有支援该单位的单位，并解除支援状态
                    const supportingUnits = this.units.filter(u => u.supportingUnit === unit.id);
                    supportingUnits.forEach(support => {
                        this.addGameLog(`🏃 ${support.name}解除了对${unit.name}的支援状态`);
                        support.combatStatus = 'not_engaged';
                        support.supportingUnit = null;
                        this.updateUnitDisplay(support);
                    });
                });
                
                if (unitsToDisengage.length > 0) {
                    this.renderBoard();
                }
            }
            
            // 防御方选择撤退
            confirmRangedAttack() {
                if (!this.rangedAttacker || !this.rangedTarget) {
                    this.addGameLog('⚠️ 请先选择射击单位和目标');
                    return;
                }
                
                // 执行射击攻击
                this.executeRangedAttack(this.rangedAttacker, this.rangedTarget);
                
                // 重置状态
                this.rangedAttacker = null;
                this.rangedTarget = null;
                this.selectedUnit = null;
                this.moveState = 'none';
                this.clearHighlights();
                
                // 更新UI
                setTimeout(() => {
                    this.renderBoard();
                    this.updateUI();
                }, 1000);
            }
            
            defenderChooseRetreat() {
                const defender = this.meleeTarget;
                this.addGameLog(`🏃 ${defender.name}选择撤退，后撤6格`);
                
                // 执行后撤6格（有序撤退，非崩溃测试）
                const retreatResult = this.retreatUnit(defender, false, false, [], false);
                
                if (!retreatResult.success) {
                    // 撤退失败，自动进入战斗环节
                    this.addGameLog(`❌ ${defender.name}撤退失败，自动进入战斗！`);
                    setTimeout(() => {
                        this.defenderChooseStand();
                    }, 500);
                    return;
                }
                
                // 重置近战状态
                setTimeout(() => {
                    this.addGameLog(`✅ 撤退完成，冲锋取消`);
                    this.currentPlayer = this.currentPlayer === 'rome' ? 'carthage' : 'rome'; // 切换回攻击方
                    this.resetChargeState();
                }, 800);
            }
            
            // 防御方选择坚守战斗
            defenderChooseStand() {
                const defender = this.meleeTarget;
                this.addGameLog(`⚔️ ${defender.name}选择坚守战斗！`);
                
                // 切换回攻击方，进入支援选择阶段
                this.currentPlayer = this.currentPlayer === 'rome' ? 'carthage' : 'rome';
                this.meleeSubPhase = 'select_attacker_support';
                this.addGameLog(`💪 请选择攻击方支援部队（3格范围内，可多选），完成后点击"完成支援选择"按钮`);
                this.renderBoard();
                this.updateUI();
            }
            
            // 完成攻击方支援选择
            finishAttackerSupport() {
                this.addGameLog(`✅ 攻击方支援选择完成，共${this.attackerSupports.length}个支援单位`);
                // 切换到防守方选择支援
                this.currentPlayer = this.currentPlayer === 'rome' ? 'carthage' : 'rome';
                this.meleeSubPhase = 'select_defender_support';
                this.addGameLog(`🔄 轮到${this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'}选择防守方支援部队`);
                this.renderBoard();
                this.updateUI();
            }
            
            // 完成防守方支援选择
            finishDefenderSupport() {
                this.addGameLog(`✅ 防守方支援选择完成，共${this.defenderSupports.length}个支援单位`);
                
                // 注意：不需要切换玩家！
                // 攻击方发起的近战，应该保持在攻击方的回合
                // 之前在finishAttackerSupport中已经切换到防守方让其选择支援
                // 现在防守方选择完成，应该切换回攻击方
                this.currentPlayer = this.meleeAttacker.faction;
                
                // 自动执行近战，不需要点击执行按钮
                this.meleeSubPhase = 'executing';
                this.renderBoard();
                this.updateUI();
                
                // 延迟一点时间让UI更新，然后自动执行
                setTimeout(() => {
                    this.executeChargeAttack();
                }, 300);
            }

            showAttackEffect(x, y, damage) {
                const targetHex = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (!targetHex) {
                    console.log(`找不到目标格子: (${x}, ${y})`);
                    return;
                }

                console.log(`显示攻击特效在位置 (${x}, ${y}), 伤害: ${damage}`);

                // 创建伤害数字弹出效果
                const damagePopup = document.createElement('div');
                damagePopup.className = 'damage-popup';
                damagePopup.textContent = `-${damage}`;
                damagePopup.style.cssText = `
                    position: absolute;
                    left: 50%;
                    top: 20%;
                    transform: translateX(-50%);
                    z-index: 25;
                    font-size: 20px;
                    font-weight: bold;
                    color: #e74c3c;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                    pointer-events: none;
                `;
                
                // 创建爆炸效果
                const explosion = document.createElement('div');
                explosion.className = 'explosion-effect';
                explosion.textContent = '💥';
                explosion.style.cssText = `
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 24;
                    font-size: 30px;
                    pointer-events: none;
                `;

                targetHex.appendChild(damagePopup);
                targetHex.appendChild(explosion);

                // 启动动画
                setTimeout(() => {
                    damagePopup.style.animation = 'damageFloat 2s ease-out forwards';
                    explosion.style.animation = 'explosion 1s ease-out forwards';
                }, 10);

                // 震动效果
                targetHex.style.animation = 'shake 0.5s ease-in-out';
                
                // 清理特效
                setTimeout(() => {
                    if (damagePopup.parentNode) damagePopup.remove();
                    if (explosion.parentNode) explosion.remove();
                    targetHex.style.animation = '';
                }, 2100);
            }

            showDeathEffect(x, y) {
                const targetHex = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (!targetHex) {
                    console.log(`找不到死亡特效目标格子: (${x}, ${y})`);
                    return;
                }

                console.log(`显示死亡特效在位置 (${x}, ${y})`);

                // 死亡特效
                const deathEffect = document.createElement('div');
                deathEffect.textContent = '💀';
                deathEffect.style.cssText = `
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 26;
                    font-size: 40px;
                    pointer-events: none;
                `;

                targetHex.appendChild(deathEffect);

                // 启动死亡动画
                setTimeout(() => {
                    deathEffect.style.animation = 'explosion 1.5s ease-out forwards';
                }, 100);

                setTimeout(() => {
                    if (deathEffect.parentNode) deathEffect.remove();
                }, 1600);
            }

            // 显示射击动画
            showRangedAttackAnimation(attacker, defender, arrowCount, callback) {
                const container = document.getElementById('square-grid');
                if (!container) {
                    console.error('找不到游戏容器');
                    if (callback) callback();
                    return;
                }

                const squareSize = 16;
                
                // 计算射击者和目标的中心位置
                const attackerSize = this.getUnitSizeWithDirection(attacker);
                const defenderSize = this.getUnitSizeWithDirection(defender);
                
                const startX = (attacker.x + attackerSize.width / 2) * squareSize;
                const startY = (attacker.y + attackerSize.height / 2) * squareSize;
                const endX = (defender.x + defenderSize.width / 2) * squareSize;
                const endY = (defender.y + defenderSize.height / 2) * squareSize;

                console.log(`射击动画: 从(${startX}, ${startY})到(${endX}, ${endY}), ${arrowCount}支箭`);

                // 创建多支箭矢
                const arrows = [];
                for (let i = 0; i < arrowCount; i++) {
                    setTimeout(() => {
                        this.createArrowAnimation(container, startX, startY, endX, endY, i, callback && i === arrowCount - 1 ? callback : null);
                    }, i * 150); // 每支箭间隔150ms发射
                }
            }

            // 创建单支箭矢动画
            createArrowAnimation(container, startX, startY, endX, endY, arrowIndex, callback) {
                // 添加一些随机偏移，让箭矢不完全重叠
                const offsetX = (Math.random() - 0.5) * 20;
                const offsetY = (Math.random() - 0.5) * 20;
                const actualEndX = endX + offsetX;
                const actualEndY = endY + offsetY;

                // 计算箭矢角度
                const dx = actualEndX - startX;
                const dy = actualEndY - startY;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 创建箭矢元素
                const arrow = document.createElement('div');
                arrow.style.cssText = `
                    position: absolute;
                    left: ${startX}px;
                    top: ${startY}px;
                    width: 20px;
                    height: 3px;
                    background: linear-gradient(90deg, #8B4513 0%, #DEB887 50%, #CD853F 100%);
                    transform: rotate(${angle}deg);
                    transform-origin: left center;
                    z-index: 1000;
                    pointer-events: none;
                    border-radius: 1px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                `;

                // 添加箭头
                const arrowHead = document.createElement('div');
                arrowHead.style.cssText = `
                    position: absolute;
                    right: -6px;
                    top: -2px;
                    width: 0;
                    height: 0;
                    border-left: 8px solid #8B4513;
                    border-top: 4px solid transparent;
                    border-bottom: 4px solid transparent;
                `;
                arrow.appendChild(arrowHead);

                container.appendChild(arrow);

                // 动画飞行时间基于距离
                const flightTime = Math.min(1000, Math.max(300, distance * 2));

                // 箭矢飞行动画
                setTimeout(() => {
                    arrow.style.transition = `left ${flightTime}ms ease-out, top ${flightTime}ms ease-out`;
                    arrow.style.left = `${actualEndX}px`;
                    arrow.style.top = `${actualEndY}px`;

                    // 添加重力效果（抛物线）
                    const midTime = flightTime / 2;
                    setTimeout(() => {
                        arrow.style.transform = `rotate(${angle + 15}deg)`; // 箭矢下落时角度变化
                    }, midTime);

                }, 50);

                // 箭矢撞击效果
                setTimeout(() => {
                    // 撞击闪光效果
                    const impact = document.createElement('div');
                    impact.style.cssText = `
                        position: absolute;
                        left: ${actualEndX - 10}px;
                        top: ${actualEndY - 10}px;
                        width: 20px;
                        height: 20px;
                        background: radial-gradient(circle, #FFD700 0%, #FF8C00 50%, transparent 70%);
                        border-radius: 50%;
                        z-index: 999;
                        pointer-events: none;
                        animation: impactFlash 0.3s ease-out forwards;
                    `;
                    container.appendChild(impact);

                    // 移除箭矢和撞击效果
                    setTimeout(() => {
                        if (arrow.parentNode) arrow.remove();
                        if (impact.parentNode) impact.remove();
                        
                        // 如果是最后一支箭，执行回调
                        if (callback) callback();
                    }, 300);

                }, flightTime + 50);
            }

            // 近战冲锋动画
            showMeleeChargeAnimation(attacker, defender, callback) {
                const container = document.getElementById('square-grid');
                if (!container) {
                    console.error('找不到游戏容器');
                    if (callback) callback();
                    return;
                }

                const squareSize = 16;
                
                // 计算攻击者和防守者的位置
                const attackerSize = this.getUnitSizeWithDirection(attacker);
                const defenderSize = this.getUnitSizeWithDirection(defender);
                
                const attackerCenterX = attacker.x + attackerSize.width / 2;
                const attackerCenterY = attacker.y + attackerSize.height / 2;
                const defenderCenterX = defender.x + defenderSize.width / 2;
                const defenderCenterY = defender.y + defenderSize.height / 2;
                
                // 计算冲锋方向
                const dx = (defenderCenterX - attackerCenterX) * squareSize * 0.3;
                const dy = (defenderCenterY - attackerCenterY) * squareSize * 0.3;
                
                // 找到攻击者单位元素
                const attackerElements = document.querySelectorAll(`.unit-large[data-unit-id="${attacker.id}"]`);
                
                if (attackerElements.length > 0) {
                    attackerElements.forEach(elem => {
                        elem.style.setProperty('--charge-x', `${dx}px`);
                        elem.style.setProperty('--charge-y', `${dy}px`);
                        elem.style.animation = 'chargeForward 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    });
                    
                    // 冲锋中途显示斩击效果
                    setTimeout(() => {
                        this.showSlashEffect(defenderCenterX * squareSize, defenderCenterY * squareSize);
                    }, 400);
                    
                    // 重置动画
                    setTimeout(() => {
                        attackerElements.forEach(elem => {
                            elem.style.animation = '';
                        });
                        if (callback) callback();
                    }, 800);
                } else {
                    if (callback) callback();
                }
            }

            // 斩击轨迹效果
            showSlashEffect(x, y) {
                const container = document.getElementById('square-grid');
                if (!container) return;
                
                // 创建斩击效果
                const slash = document.createElement('div');
                slash.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, 
                        transparent 0%, 
                        rgba(255, 255, 255, 0.9) 20%, 
                        rgba(255, 200, 0, 0.8) 50%, 
                        rgba(255, 100, 0, 0.6) 80%, 
                        transparent 100%);
                    border-radius: 10px;
                    z-index: 1000;
                    pointer-events: none;
                    animation: slashEffect 0.6s ease-out forwards;
                    box-shadow: 0 0 20px rgba(255, 200, 0, 0.8);
                `;
                
                container.appendChild(slash);
                
                // 添加冲击波
                const shockwave = document.createElement('div');
                shockwave.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255, 255, 255, 0.8);
                    border-radius: 50%;
                    z-index: 999;
                    pointer-events: none;
                    animation: shockwave 0.5s ease-out forwards;
                `;
                
                container.appendChild(shockwave);
                
                // 清理特效
                setTimeout(() => {
                    if (slash.parentNode) slash.remove();
                    if (shockwave.parentNode) shockwave.remove();
                }, 600);
            }

            // 增强伤害效果（支持暴击、连击）
            showEnhancedDamageEffect(x, y, damage, options = {}) {
                const { isCritical = false, comboCount = 0, attackType = 'melee', isMiss = false } = options;
                
                const targetHex = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (!targetHex) return;

                // 创建主伤害数字或MISS文字
                const damagePopup = document.createElement('div');
                damagePopup.className = 'damage-popup';
                let explosion = null; // 声明在外部，避免作用域问题
                
                if (isMiss) {
                    // MISS效果
                    damagePopup.textContent = 'MISS';
                    damagePopup.style.cssText = `
                        position: absolute;
                        left: 50%;
                        top: 30%;
                        z-index: 25;
                        font-size: 28px;
                        font-weight: bold;
                        color: #95a5a6;
                        text-shadow: 
                            2px 2px 4px rgba(0,0,0,0.9),
                            0 0 8px rgba(149, 165, 166, 0.5);
                        pointer-events: none;
                        transform: translateX(-50%);
                        animation: missFloat 1.5s ease-out forwards;
                    `;
                } else {
                    // 正常伤害效果
                    damagePopup.textContent = `-${damage}`;
                    damagePopup.style.cssText = `
                        position: absolute;
                        left: 50%;
                        top: 30%;
                        z-index: 25;
                        font-size: ${isCritical ? '32px' : '24px'};
                        font-weight: bold;
                        color: ${isCritical ? '#ff0000' : '#e74c3c'};
                        text-shadow: 
                            2px 2px 4px rgba(0,0,0,0.9),
                            0 0 ${isCritical ? '10px' : '5px'} ${isCritical ? '#ffff00' : '#ff6b6b'};
                        pointer-events: none;
                        transform: translateX(-50%);
                    `;
                }
                
                // MISS效果时跳过暴击、连击和伤害动画
                if (!isMiss) {
                    if (isCritical) {
                        damagePopup.style.animation = 'criticalDamage 1.5s ease-out forwards';
                        
                        // 暴击文字
                        const critText = document.createElement('div');
                        critText.textContent = '💥暴击！';
                        critText.style.cssText = `
                            position: absolute;
                            left: 50%;
                            top: 10%;
                            transform: translateX(-50%);
                            z-index: 26;
                            font-size: 16px;
                            font-weight: bold;
                            color: #ffff00;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.9), 0 0 10px #ff0000;
                            pointer-events: none;
                            animation: comboEffect 1.2s ease-out forwards;
                        `;
                        targetHex.appendChild(critText);
                        setTimeout(() => { if (critText.parentNode) critText.remove(); }, 1200);
                    } else {
                        damagePopup.style.animation = 'damageFloat 2s ease-out forwards';
                    }
                    
                    // 连击计数
                    if (comboCount > 1) {
                        const comboText = document.createElement('div');
                        comboText.textContent = `${comboCount} HIT COMBO!`;
                        comboText.style.cssText = `
                            position: absolute;
                            left: 50%;
                            top: 60%;
                            transform: translateX(-50%);
                            z-index: 26;
                            font-size: 14px;
                            font-weight: bold;
                            color: #ffa500;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                            pointer-events: none;
                            animation: comboEffect 1.5s ease-out forwards;
                        `;
                        targetHex.appendChild(comboText);
                        setTimeout(() => { if (comboText.parentNode) comboText.remove(); }, 1500);
                    }
                    
                    // 爆炸效果
                    explosion = document.createElement('div');
                    explosion.className = 'explosion-effect';
                    explosion.textContent = attackType === 'melee' ? '⚔️' : '💥';
                    explosion.style.cssText = `
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 24;
                        font-size: ${isCritical ? '40px' : '30px'};
                        pointer-events: none;
                    `;
                    
                    // 光芒爆发效果（暴击专属）
                    if (isCritical) {
                        const burst = document.createElement('div');
                        burst.style.cssText = `
                            position: absolute;
                            left: 50%;
                            top: 50%;
                            width: 50px;
                            height: 50px;
                            background: radial-gradient(circle, 
                                rgba(255, 255, 0, 0.8) 0%, 
                                rgba(255, 150, 0, 0.6) 30%, 
                                rgba(255, 0, 0, 0.3) 60%, 
                                transparent 100%);
                            border-radius: 50%;
                            z-index: 23;
                            pointer-events: none;
                            animation: radialBurst 0.8s ease-out forwards;
                        `;
                        targetHex.appendChild(burst);
                        setTimeout(() => { if (burst.parentNode) burst.remove(); }, 800);
                    }

                    targetHex.appendChild(explosion);

                    // 启动爆炸动画
                    setTimeout(() => {
                        explosion.style.animation = 'explosion 1s ease-out forwards';
                    }, 10);

                    // 震动和闪红效果
                    this.showHitReaction(x, y);
                } else {
                    // MISS效果：显示烟雾/灰尘效果
                    const missEffect = document.createElement('div');
                    missEffect.textContent = '💨';
                    missEffect.style.cssText = `
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 24;
                        font-size: 24px;
                        pointer-events: none;
                        opacity: 0.7;
                        animation: missEffect 1.2s ease-out forwards;
                    `;
                    targetHex.appendChild(missEffect);
                    setTimeout(() => { if (missEffect.parentNode) missEffect.remove(); }, 1200);
                }

                targetHex.appendChild(damagePopup);
                
                // 清理特效
                setTimeout(() => {
                    if (damagePopup && damagePopup.parentNode) damagePopup.remove();
                    if (explosion && explosion.parentNode) explosion.remove();
                }, isCritical ? 1500 : 2100);
            }

            // 受击反应动画
            showHitReaction(x, y) {
                const targetHex = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (!targetHex) return;
                
                // 格子震动
                targetHex.style.animation = 'shake 0.5s ease-in-out';
                
                // 单位闪红
                const unitElements = document.querySelectorAll(`[data-x="${x}"][data-y="${y}"] .unit-large`);
                unitElements.forEach(elem => {
                    elem.style.animation = 'hitFlash 0.6s ease-in-out';
                });
                
                // 重置动画
                setTimeout(() => {
                    targetHex.style.animation = '';
                    unitElements.forEach(elem => {
                        elem.style.animation = '';
                    });
                }, 600);
            }

            canMoveTo(unit, x, y) {
                if (!this.isValidPosition(x, y)) return false;
                
                const size = this.unitSizes[unit.type];
                
                // 检查目标区域是否都在边界内
                if (x + size.width > this.gridWidth || y + size.height > this.gridHeight) {
                    return false;
                }
                
                // 检查目标区域是否被其他单位占用
                if (this.isAreaOccupied(x, y, size.width, size.height, unit.id)) {
                    return false;
                }
                
                const distance = this.getDistance(unit.x, unit.y, x, y);
                return distance <= unit.movement;
            }

            isAreaOccupied(x, y, width, height, excludeUnitId = null) {
                for (let checkY = y; checkY < y + height; checkY++) {
                    for (let checkX = x; checkX < x + width; checkX++) {
                        const occupyingUnit = this.findUnitAtPosition(checkX, checkY);
                        if (occupyingUnit && occupyingUnit.id !== excludeUnitId) {
                            return true;
                        }
                    }
                }
                return false;
            }

            getDistance(x1, y1, x2, y2) {
                // 正方形网格距离计算（曼哈顿距离或切比雪夫距离）
                const dx = Math.abs(x2 - x1);
                const dy = Math.abs(y2 - y1);
                
                // 使用切比雪夫距离（允许对角线移动）
                return Math.max(dx, dy);
            }

            getAttackBonus(attacker, defender) {
                // 计算攻击方向加成
                const dx = defender.x - attacker.x;
                const dy = defender.y - attacker.y;
                
                // 确定攻击方向
                let attackDirection = 'front';
                if (dx === 0 && dy === -1) attackDirection = 'north';
                else if (dx === 1 && dy === 0) attackDirection = 'east';
                else if (dx === 0 && dy === 1) attackDirection = 'south';
                else if (dx === -1 && dy === 0) attackDirection = 'west';
                
                // 计算相对攻击方向
                const relative = this.getRelativeDirection(attacker.direction, attackDirection);
                const defenseRelative = this.getRelativeDirection(defender.direction, attackDirection);
                
                let bonus = 0;
                
                // 攻击者从正面攻击 +10%
                if (relative === 'front') bonus += 0.1;
                
                // 攻击防御者的侧面 +20%
                if (defenseRelative === 'side') bonus += 0.2;
                
                // 攻击防御者的背面 +50%
                if (defenseRelative === 'back') bonus += 0.5;
                
                // 将领的领导加成
                if (attacker.leadership) {
                    bonus += attacker.leadership * 0.05; // 每点领导力+5%攻击
                }
                
                return bonus;
            }

            getRelativeDirection(unitDirection, attackDirection) {
                const directionMap = {
                    'north': { front: 'north', back: 'south', left: 'west', right: 'east' },
                    'south': { front: 'south', back: 'north', left: 'east', right: 'west' },
                    'east': { front: 'east', back: 'west', left: 'north', right: 'south' },
                    'west': { front: 'west', back: 'east', left: 'south', right: 'north' }
                };
                
                const directions = directionMap[unitDirection];
                if (attackDirection === directions.front) return 'front';
                if (attackDirection === directions.back) return 'back';
                return 'side';
            }



            canAttack(attacker, defender) {
                const distance = this.getDistance(attacker.x, attacker.y, defender.x, defender.y);
                return distance <= 1 && attacker.faction !== defender.faction;
            }

            // 检查射击路径上是否有单位阻挡
            hasLineOfSight(attacker, defender) {
                // 计算攻击者和防守者的中心位置
                const attackerSize = this.getUnitSizeWithDirection(attacker);
                const defenderSize = this.getUnitSizeWithDirection(defender);
                
                const attackerCenterX = attacker.x + Math.floor(attackerSize.width / 2);
                const attackerCenterY = attacker.y + Math.floor(attackerSize.height / 2);
                const defenderCenterX = defender.x + Math.floor(defenderSize.width / 2);
                const defenderCenterY = defender.y + Math.floor(defenderSize.height / 2);
                
                // 使用布雷森汉姆直线算法获取路径上的所有格子
                const pathCells = this.getLinePath(attackerCenterX, attackerCenterY, defenderCenterX, defenderCenterY);
                
                // 检查路径上是否有其他单位（排除攻击者和防守者自己）
                for (let i = 1; i < pathCells.length - 1; i++) {
                    const cell = pathCells[i];
                    const unitAtCell = this.findUnitAtPosition(cell.x, cell.y);
                    
                    if (unitAtCell && unitAtCell.id !== attacker.id && unitAtCell.id !== defender.id) {
                        console.log(`射击路径被阻挡: (${cell.x}, ${cell.y}) 位置有单位 ${unitAtCell.name}`);
                        return false; // 路径被阻挡
                    }
                }
                
                return true; // 视线畅通
            }
            
            // 使用布雷森汉姆直线算法获取两点之间的路径
            getLinePath(x0, y0, x1, y1) {
                const path = [];
                const dx = Math.abs(x1 - x0);
                const dy = Math.abs(y1 - y0);
                const sx = x0 < x1 ? 1 : -1;
                const sy = y0 < y1 ? 1 : -1;
                let err = dx - dy;
                
                let x = x0;
                let y = y0;
                
                while (true) {
                    path.push({ x, y });
                    
                    if (x === x1 && y === y1) break;
                    
                    const e2 = 2 * err;
                    if (e2 > -dy) {
                        err -= dy;
                        x += sx;
                    }
                    if (e2 < dx) {
                        err += dx;
                        y += sy;
                    }
                }
                
                return path;
            }

            canAttackInCurrentPhase(attacker, defender) {
                const distance = this.getDistance(attacker.x, attacker.y, defender.x, defender.y);
                
                if (this.currentPhase === 'ranged') {
                    // 远程射击阶段：选择本阵营、未处于近战、投掷或射击属性大于0的单位
                    // 攻击射程范围内、且未进入近战的敌方单位
                    const basicCheck = attacker.combatStatus !== 'engaged' && // 攻击者未处于近战
                           (attacker.rangedAttack > 0 || attacker.throwingAttack > 0) && // 有远程攻击能力
                           distance <= attacker.range && // 在射程内
                           defender.combatStatus !== 'engaged' && // 目标未进入近战
                           attacker.faction !== defender.faction; // 敌方单位
                    
                    // 如果基本检查通过，再检查视线
                    if (basicCheck) {
                        const lineOfSight = this.hasLineOfSight(attacker, defender);
                        
                        // 调试信息
                        console.log(`射击检查: 攻击者(${attacker.x},${attacker.y}) -> 目标(${defender.x},${defender.y})`);
                        console.log(`距离: ${distance}, 射程: ${attacker.range}`);
                        console.log(`攻击者状态: ${attacker.combatStatus}, 目标状态: ${defender.combatStatus}`);
                        console.log(`攻击能力: 射击${attacker.rangedAttack}, 投掷${attacker.throwingAttack}`);
                        console.log(`视线畅通: ${lineOfSight}`);
                        
                        return lineOfSight;
                    }
                    
                    return false;
                } else if (this.currentPhase === 'melee') {
                    // 近战攻击阶段：只能进行近战攻击
                    return distance <= 1 && attacker.faction !== defender.faction;
                }
                
                return false; // 移动阶段和转向阶段不允许攻击
            }

            updateUnitDisplay(unit) {
                const unitElement = document.querySelector(`[data-unit-id="${unit.id}"]`);
                if (unitElement && unit.hp > 0) {
                    // 更新tooltip
                    const hpPercentage = (unit.hp / unit.maxHp) * 100;
                    const moraleText = unit.morale === 'good' ? '良好' : '动摇';
                    const orderText = unit.order === 'good' ? '良好' : '混乱';
                    const combatText = unit.combatStatus === 'engaged' ? '近战中' : unit.combatStatus === 'supporting' ? '支援中' : '未近战';
                    const directionText = {
                        'north': '北↑',
                        'east': '东→', 
                        'south': '南↓',
                        'west': '西←'
                    }[unit.direction] || unit.direction;
                    const directionIcon = {
                        'north': '⬆️',
                        'east': '➡️', 
                        'south': '⬇️',
                        'west': '⬅️'
                    }[unit.direction] || '🧭';
                    
                    unitElement.title = `${unit.name} (${unit.faction === 'rome' ? '罗马' : '迦太基'}) | 💎分值: ${unit.value || 0}
HP: ${unit.hp}/${unit.maxHp} | 朝向: ${directionIcon}${directionText} | 位置: (${unit.x}, ${unit.y})
士气: ${moraleText} | 秩序: ${orderText} | 战斗状态: ${combatText}
冲锋近战: ${unit.chargeAttack} | 持续近战: ${unit.sustainedMelee} | 支援近战: ${unit.supportMelee}
投掷攻击: ${unit.throwingAttack} | 射击攻击: ${unit.rangedAttack} | 防御能力: ${unit.defense}
伤亡承受力: ${unit.casualtyTolerance} | 射程: ${unit.range} | 移动: ${unit.movement}
特殊技能: ${unit.specialSkills.join(', ')}${unit.leadership > 0 ? `\n领导力: ${unit.leadership}` : ''}
行动状态: 移动${unit.hasMoved ? '✅' : '⭕'} | 射击${unit.hasRangedAttacked ? '✅' : '⭕'} | 近战${unit.hasMeleeAttacked ? '✅' : '⭕'}`;

                    // 更新或添加HP条
                    const existingHpBar = unitElement.querySelector('.hp-bar');
                    if (existingHpBar) {
                        existingHpBar.remove();
                    }
                    
                    if (unit.hp < unit.maxHp) {
                        let hpColor = '#2ecc71';
                        if (hpPercentage < 70) hpColor = '#f39c12';
                        if (hpPercentage < 40) hpColor = '#e74c3c';
                        
                        const hpBar = document.createElement('div');
                        hpBar.className = 'hp-bar';
                        hpBar.style.cssText = `
                            position: absolute;
                            bottom: -6px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 35px;
                            height: 3px;
                            background: rgba(0,0,0,0.6);
                            border-radius: 2px;
                            overflow: hidden;
                        `;
                        
                        const hpFill = document.createElement('div');
                        hpFill.style.cssText = `
                            width: ${hpPercentage}%;
                            height: 100%;
                            background: ${hpColor};
                            transition: all 0.3s ease;
                        `;
                        
                        hpBar.appendChild(hpFill);
                        unitElement.appendChild(hpBar);
                    }
                }
            }

            removeUnit(unit) {
                this.units = this.units.filter(u => u.id !== unit.id);
            }
            
            toggleUnitInfo() {
                this.showUnitInfo = !this.showUnitInfo;
                const btn = document.getElementById('toggle-unit-info-btn');
                if (this.showUnitInfo) {
                    btn.textContent = '👁️ 隐藏单位信息';
                    btn.style.background = 'linear-gradient(135deg, #16a085, #1abc9c)';
                    this.addGameLog('👁️ 显示单位名称和HP值');
                } else {
                    btn.textContent = '👁️ 显示单位信息';
                    btn.style.background = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
                    this.addGameLog('👁️ 隐藏单位名称和HP值');
                }
                this.renderBoard();
                this.updateUI();
            }
            
            getUnitIcon(unit) {
                // 根据单位类型和阵营选择图片或emoji
                const unitType = unit.type;
                const faction = unit.faction;
                
                // 罗马单位使用图片
                if (faction === 'rome') {
                if (unitType === 'legionary') {
                        return '<img src="static/footman.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="步兵">';
                    }
                    if (unitType === 'centurion') {
                        return '<img src="static/footman2.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="百夫长">';
                    }
                    if (unitType === 'hastati') {
                        return '<img src="static/footman2.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="后备兵">';
                    }
                    if (unitType === 'cavalry') {
                        return '<img src="static/cav_roma.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="罗马骑兵">';
                    }
                    if (unitType === 'archer') {
                        return '<img src="static/archer_roma.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="弓箭手">';
                    }
                    if (unitType === 'general') {
                        return '<img src="static/leader_roma.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="将领">';
                    }
                }
                
                // 迦太基单位
                if (faction === 'carthage') {
                    if (unitType === 'cavalry') {
                        return '<img src="static/cav_carthage.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="迦太基骑兵">';
                    }
                    if (unitType === 'archer') {
                        return '<img src="static/archer_carthage.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="迦太基弓箭手">';
                    }
                    if (unitType === 'general') {
                        return '<img src="static/leader_carthagepng.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="迦太基将领">';
                    }
                    if (unitType === 'infantry') {
                        return '<img src="static/footman3.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="迦太基步兵">';
                    }
                    if (unitType === 'elephant') {
                        return '<img src="static/elp_carthage.png" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" alt="迦太基战象">';
                    }
                }
                
                // 其他单位使用emoji
                const typeMap = {
                    'infantry': '🗡️',
                    'elephant': '🐘',
                    'archer': '🏹',
                    'general': '👑',
                    'cavalry': '🐎'
                };
                
                return typeMap[unitType] || '?';
            }
            
            getDirectionArrow(direction) {
                const directionArrows = {
                    'north': '↑',
                    'south': '↓',
                    'east': '→',
                    'west': '←'
                };
                
                return directionArrows[direction] || '?';
            }

            // 根据单位朝向获取实际占位尺寸
            getUnitSizeWithDirection(unit) {
                const baseSize = this.unitBaseSizes[unit.type];
                
                // 对于非正方形单位，朝向会影响占位
                if (baseSize.width !== baseSize.height) {
                    if (unit.direction === 'east' || unit.direction === 'west') {
                        // 东西朝向时，宽高互换
                        return { width: baseSize.height, height: baseSize.width };
                    }
                }
                
                // 正方形单位或南北朝向，保持原尺寸
                return { width: baseSize.width, height: baseSize.height };
            }

            nextPhase() {
                // 检查是否允许进入下一阶段
                if (this.currentPhase === 'melee') {
                    // 近战阶段需要检查是否还有持续近战待处理
                    const pendingUnits = this.getAvailableSustainedMeleeUnits();
                    if (pendingUnits.length > 0 && this.meleeSubPhase === 'select_attacker') {
                        this.addGameLog(`⚠️ 还有${pendingUnits.length}个单位需要进行持续近战，无法进入下一阶段`);
                        console.log('[阶段控制] 持续近战未完成，阻止进入下一阶段');
                        return;
                    }
                }
                
                // 完成当前阶段
                this.phaseCompleted[this.currentPhase] = true;
                
                // 切换到下一阶段
                if (this.currentPhase === 'movement') {
                    this.currentPhase = 'turning';
                    this.addGameLog(`🔄 ${this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'}进入转向阶段，右键点击单位调整朝向`);
                } else if (this.currentPhase === 'turning') {
                    this.currentPhase = 'ranged';
                    // 清除射击状态
                    this.rangedAttacker = null;
                    this.rangedTarget = null;
                    this.addGameLog(`🏹 ${this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'}进入远程射击阶段`);
                    console.log('进入射击阶段');
                } else if (this.currentPhase === 'ranged') {
                    // 清除射击状态
                    this.rangedAttacker = null;
                    this.rangedTarget = null;
                    
                    this.currentPhase = 'melee';
                    this.meleeSubPhase = 'select_attacker';
                    this.resetChargeState();
                    this.addGameLog(`⚔️ ${this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'}进入近战攻击阶段`);
                    
                    // 检查是否有持续近战单位，如果有则自动开始
                    setTimeout(() => {
                        const hasAutoStarted = this.autoStartNextSustainedMelee();
                        if (!hasAutoStarted) {
                            // 没有持续近战，显示常规冲锋提示
                            this.addGameLog(`💡 选择一个与敌方接触的单位发起冲锋`);
                        }
                    }, 300);
                } else if (this.currentPhase === 'melee') {
                    // 完成所有阶段，结束回合
                    this.endTurn();
                    return;
                }
                
                // 重置移动状态
                this.resetMoveState();
                this.updateUI();
            }

            endTurn() {
                // 检查是否允许结束回合
                if (this.currentPhase !== 'melee') {
                    this.addGameLog(`⚠️ 只能在近战阶段结束回合`);
                    console.log('[阶段控制] 非近战阶段，阻止结束回合');
                    return;
                }
                
                // 检查是否还有持续近战待处理
                const pendingUnits = this.getAvailableSustainedMeleeUnits();
                if (pendingUnits.length > 0 && this.meleeSubPhase === 'select_attacker') {
                    this.addGameLog(`⚠️ 还有${pendingUnits.length}个单位需要进行持续近战，无法结束回合`);
                    console.log('[阶段控制] 持续近战未完成，阻止结束回合');
                    return;
                }
                
                // 重置移动状态和所有规划
                this.resetAllPlans();
                this.resetChargeState();
                
                // 重置阶段状态
                this.phaseCompleted = { movement: false, turning: false, ranged: false, melee: false };
                this.currentPhase = 'movement';
                
                // 重置所有当前玩家单位的行动状态
                this.units.forEach(unit => {
                    if (unit.faction === this.currentPlayer) {
                        unit.hasMoved = false;
                        unit.hasRangedAttacked = false;
                        unit.hasMeleeAttacked = false;
                    }
                    // 重置所有单位的近战状态
                    if (unit.combatStatus === 'supporting') {
                        unit.combatStatus = 'not_engaged';
                        this.updateUnitDisplay(unit); // 更新显示
                    }
                });

                // 切换玩家
                const previousPlayer = this.currentPlayer;
                this.currentPlayer = this.currentPlayer === 'rome' ? 'carthage' : 'rome';
                
                const prevPlayerName = previousPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                const currentPlayerName = this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                this.addGameLog(`🔄 ${prevPlayerName}回合结束，轮到${currentPlayerName}行动`);
                
                // 在移动阶段开始前，对混乱单位进行恢复测试
                this.performRallyTests();
                
                this.addGameLog(`🚶 ${currentPlayerName}开始规划和移动阶段`);
                
                this.renderBoard();
                this.updateUI();
            }

            resetGame() {
                this.resetMoveState();
                this.currentPlayer = 'rome';
                this.currentPhase = 'deployment';
                this.deploymentPhase = 'rome';
                this.phaseCompleted = { movement: false, turning: false, ranged: false, melee: false };
                this.isDragging = false;
                this.draggedUnit = null;
                this.dragOffset = { x: 0, y: 0 };
                this.lastClickTime = 0;
                this.lastClickedUnit = null;
                this.generalDeathTestDone = { rome: false, carthage: false }; // 重置将领阵亡测试标志
                this.units = [];
                this.gameBoard = [];
                this.initializeGame();
                this.addGameLog(`📦 游戏开始，🏛️ 罗马先进行部署`);
            }

            saveGame() {
                try {
                    // 创建游戏状态对象
                    const gameState = {
                        version: '1.0',
                        timestamp: new Date().toISOString(),
                        currentPlayer: this.currentPlayer,
                        currentPhase: this.currentPhase,
                        deploymentPhase: this.deploymentPhase,
                        meleeSubPhase: this.meleeSubPhase,
                        meleeType: this.meleeType,
                        phaseCompleted: this.phaseCompleted,
                        generalDeathTestDone: this.generalDeathTestDone,
                        initialPoints: this.initialPoints,
                        initialRomeValue: this.initialRomeValue,
                        initialCarthageValue: this.initialCarthageValue,
                        units: this.units.map(unit => ({
                            ...unit,
                            // 深拷贝所有属性
                        })),
                        allUnitPlans: Array.from(this.allUnitPlans.entries()).map(([id, plan]) => ({
                            id: id,
                            plan: plan
                        })),
                        moveState: this.moveState,
                        planningPhase: this.planningPhase
                    };

                    // 保存到localStorage
                    localStorage.setItem('battleGameSave', JSON.stringify(gameState));
                    
                    // 显示保存成功消息
                    this.addGameLog(`💾 游戏已保存到本地存储 (${new Date().toLocaleString('zh-CN')})`);
                    
                    // 显示临时提示
                    this.showTempMessage('✅ 游戏保存成功！', 'success');
                } catch (error) {
                    console.error('保存游戏失败:', error);
                    this.addGameLog(`❌ 保存游戏失败: ${error.message}`);
                    this.showTempMessage('❌ 保存游戏失败！', 'error');
                }
            }

            loadGame() {
                try {
                    // 从localStorage读取
                    const savedData = localStorage.getItem('battleGameSave');
                    
                    if (!savedData) {
                        this.addGameLog(`⚠️ 没有找到保存的游戏数据`);
                        this.showTempMessage('⚠️ 没有找到保存的游戏！', 'warning');
                        return;
                    }

                    const gameState = JSON.parse(savedData);
                    
                    // 显示确认对话框
                    const saveTime = new Date(gameState.timestamp).toLocaleString('zh-CN');
                    if (!confirm(`确定要载入保存的游戏吗？\n\n保存时间: ${saveTime}\n当前进度将会丢失！`)) {
                        return;
                    }

                    // 恢复游戏状态
                    this.currentPlayer = gameState.currentPlayer;
                    this.currentPhase = gameState.currentPhase;
                    this.deploymentPhase = gameState.deploymentPhase;
                    this.meleeSubPhase = gameState.meleeSubPhase || 'select_attacker';
                    this.meleeType = gameState.meleeType || null;
                    this.phaseCompleted = gameState.phaseCompleted;
                    this.generalDeathTestDone = gameState.generalDeathTestDone || { rome: false, carthage: false };
                    this.initialPoints = gameState.initialPoints;
                    this.initialRomeValue = gameState.initialRomeValue;
                    this.initialCarthageValue = gameState.initialCarthageValue;
                    this.units = gameState.units;
                    this.moveState = gameState.moveState || 'none';
                    this.planningPhase = gameState.planningPhase || 'planning';
                    
                    // 恢复单位规划
                    this.allUnitPlans.clear();
                    if (gameState.allUnitPlans) {
                        gameState.allUnitPlans.forEach(item => {
                            this.allUnitPlans.set(item.id, item.plan);
                        });
                    }

                    // 重置临时状态
                    this.selectedUnit = null;
                    this.targetPosition = null;
                    this.movePlan = [];
                    this.currentPlanStep = 0;
                    this.meleeAttacker = null;
                    this.meleeTarget = null;
                    this.attackerSupports = [];
                    this.defenderSupports = [];
                    this.lastClickTime = 0;
                    this.lastClickedUnit = null;
                    this.isDragging = false;
                    this.draggedUnit = null;
                    this.dragOffset = { x: 0, y: 0 };

                    // 重新渲染游戏
                    this.renderBoard();
                    this.updateUI();
                    
                    this.addGameLog(`📂 游戏已从本地存储载入 (保存于 ${saveTime})`);
                    this.showTempMessage('✅ 游戏载入成功！', 'success');
                } catch (error) {
                    console.error('载入游戏失败:', error);
                    this.addGameLog(`❌ 载入游戏失败: ${error.message}`);
                    this.showTempMessage('❌ 载入游戏失败！', 'error');
                }
            }

            showTempMessage(message, type = 'info') {
                // 创建临时消息元素
                const messageDiv = document.createElement('div');
                messageDiv.textContent = message;
                messageDiv.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    padding: 20px 40px;
                    font-size: 24px;
                    font-weight: bold;
                    color: white;
                    background: ${type === 'success' ? 'linear-gradient(135deg, #27ae60, #229954)' : 
                                 type === 'error' ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : 
                                 'linear-gradient(135deg, #f39c12, #e67e22)'};
                    border-radius: 15px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    z-index: 10001;
                    animation: fadeInOut 2s ease-in-out;
                `;
                
                document.body.appendChild(messageDiv);
                
                // 2秒后自动移除
                setTimeout(() => {
                    messageDiv.remove();
                }, 2000);
            }

            clearHighlights() {
                document.querySelectorAll('.square').forEach(square => {
                    square.classList.remove('selected', 'possible-move', 'target-selected');
                });
                
                // 清除单位的特殊高亮效果
                document.querySelectorAll('.unit-large').forEach(unit => {
                    unit.classList.remove('selected');
                    unit.style.boxShadow = '';
                });
            }

            drawMovePath() {
                // 不清除所有路径，只绘制当前规划的路径
                if (this.movePlan.length === 0) return;
                
                // 先移除当前单位的旧路径
                if (this.selectedUnit) {
                    const container = document.getElementById('square-grid');
                    container.querySelectorAll(`[data-unit-id="${this.selectedUnit.id}"]`).forEach(el => el.remove());
                }
                
                const container = document.getElementById('square-grid');
                const squareSize = 16;
                
                this.movePlan.forEach((step, index) => {
                    const startCenterX = step.startX * squareSize + squareSize * this.unitSizes[this.selectedUnit.type].width / 2;
                    const startCenterY = step.startY * squareSize + squareSize * this.unitSizes[this.selectedUnit.type].height / 2;
                    const endCenterX = step.endX * squareSize + squareSize * this.unitSizes[this.selectedUnit.type].width / 2;
                    const endCenterY = step.endY * squareSize + squareSize * this.unitSizes[this.selectedUnit.type].height / 2;
                    
                    // 计算箭头角度和长度
                    const dx = endCenterX - startCenterX;
                    const dy = endCenterY - startCenterY;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    
                    // 当前规划使用金色（更亮）
                    const arrowColor = 'rgba(241, 196, 15, 1.0)';
                    
                    // 创建箭头元素
                    const arrow = document.createElement('div');
                    arrow.className = 'move-arrow';
                    arrow.style.left = startCenterX + 'px';
                    arrow.style.top = startCenterY + 'px';
                    arrow.style.width = length + 'px';
                    arrow.style.transform = `rotate(${angle}deg)`;
                    arrow.style.background = arrowColor;
                    arrow.dataset.unitId = this.selectedUnit.id;
                    arrow.style.setProperty('--arrow-color', arrowColor);
                    
                    container.appendChild(arrow);
                    
                    // 创建步骤编号
                    const stepNumber = document.createElement('div');
                    stepNumber.className = 'step-number';
                    stepNumber.textContent = index + 1;
                    stepNumber.style.left = (endCenterX - 8) + 'px';
                    stepNumber.style.top = (endCenterY - 8) + 'px';
                    stepNumber.style.background = '#f39c12'; // 当前规划用金色
                    stepNumber.dataset.unitId = this.selectedUnit.id;
                    
                    container.appendChild(stepNumber);
                });
            }

            clearMovePath() {
                const container = document.getElementById('square-grid');
                container.querySelectorAll('.move-arrow, .step-number').forEach(el => el.remove());
            }

            drawAllMovePaths() {
                this.clearMovePath();
                
                const container = document.getElementById('square-grid');
                const squareSize = 16;
                
                // 绘制所有已规划单位的路径
                this.allUnitPlans.forEach((planData, unitId) => {
                    const unit = planData.unit;
                    const plan = planData.plan;
                    
                    plan.forEach((step, index) => {
                        const startCenterX = step.startX * squareSize + squareSize * this.unitSizes[unit.type].width / 2;
                        const startCenterY = step.startY * squareSize + squareSize * this.unitSizes[unit.type].height / 2;
                        const endCenterX = step.endX * squareSize + squareSize * this.unitSizes[unit.type].width / 2;
                        const endCenterY = step.endY * squareSize + squareSize * this.unitSizes[unit.type].height / 2;
                        
                        // 计算箭头角度和长度
                        const dx = endCenterX - startCenterX;
                        const dy = endCenterY - startCenterY;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        
                        // 为不同单位使用不同颜色
                        const arrowColor = unit.faction === 'rome' ? 'rgba(231, 76, 60, 0.8)' : 'rgba(52, 152, 219, 0.8)';
                        
                        // 创建箭头元素
                        const arrow = document.createElement('div');
                        arrow.className = 'move-arrow';
                        arrow.style.left = startCenterX + 'px';
                        arrow.style.top = startCenterY + 'px';
                        arrow.style.width = length + 'px';
                        arrow.style.transform = `rotate(${angle}deg)`;
                        arrow.style.background = arrowColor;
                        arrow.dataset.unitId = unitId; // 标记所属单位
                        
                        // 设置箭头头部颜色
                        arrow.style.setProperty('--arrow-color', arrowColor);
                        
                        container.appendChild(arrow);
                        
                        // 创建步骤编号
                        const stepNumber = document.createElement('div');
                        stepNumber.className = 'step-number';
                        stepNumber.textContent = index + 1;
                        stepNumber.style.left = (endCenterX - 8) + 'px';
                        stepNumber.style.top = (endCenterY - 8) + 'px';
                        stepNumber.style.background = unit.faction === 'rome' ? '#e74c3c' : '#3498db';
                        stepNumber.dataset.unitId = unitId;
                        
                        container.appendChild(stepNumber);
                    });
                });
                
                // 如果有当前正在规划的单位，也绘制其路径
                if (this.selectedUnit && this.movePlan.length > 0) {
                    this.drawMovePath();
                }
            }

            getNearestGeneralLeadership(unit) {
                let nearestGeneral = null;
                let minDistance = Infinity;
                
                // 查找同阵营最近的将领
                this.units.forEach(u => {
                    if (u.type === 'general' && u.faction === unit.faction && u.hp > 0) {
                        const distance = this.getDistance(unit.x, unit.y, u.x, u.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestGeneral = u;
                        }
                    }
                });
                
                // 如果没有将领或将领被消灭，使用默认领导值6
                return nearestGeneral ? nearestGeneral.leadership : 6;
            }

            executeMovePlan(stepsToExecute) {
                if (stepsToExecute === 0) {
                    console.log('移动失败，无法执行任何步骤');
                    this.showExecutionResult('', '移动失败！骰子结果不佳，单位无法移动');
                    this.resetMoveState();
                    this.renderBoard();
                    this.updateUI();
                    return;
                }
                
                const totalSteps = this.movePlan.length;
                let actualStepsExecuted = 0;
                let collisionOccurred = false;
                
                // 逐步执行移动（带碰撞检测）
                for (let i = 0; i < stepsToExecute; i++) {
                    const step = this.movePlan[i];
                    const size = this.unitSizes[this.selectedUnit.type];
                    
                    // 检查目标位置是否被其他单位占用
                    if (this.isAreaOccupiedByOthers(step.endX, step.endY, size.width, size.height, this.selectedUnit.id)) {
                        const unitTypeName = this.getUnitTypeName(this.selectedUnit.type);
                        const collidingUnit = this.findUnitAtPosition(step.endX, step.endY, this.selectedUnit.id);
                        const collidingUnitName = collidingUnit ? this.getUnitTypeName(collidingUnit.type) : '其他单位';
                        this.addGameLog(`🚫 ${unitTypeName}第${i + 1}步移动受阻，与${collidingUnitName}发生碰撞`);
                        
                        // 显示碰撞效果
                        this.showCollisionEffect(this.selectedUnit, collidingUnit);
                        
                        collisionOccurred = true;
                        break;
                    }
                    
                    // 执行移动
                    this.selectedUnit.x = step.endX;
                    this.selectedUnit.y = step.endY;
                    actualStepsExecuted++;
                    console.log(`执行第${i + 1}步: 移动到 (${step.endX}, ${step.endY})`);
                }
                
                this.selectedUnit.hasMoved = true;
                
                // 显示执行结果
                let resultText = '';
                if (collisionOccurred) {
                    if (actualStepsExecuted > 0) {
                        resultText = `移动部分成功！规划${totalSteps}步，因碰撞实际执行${actualStepsExecuted}步`;
                    } else {
                        resultText = `移动失败！第1步就遇到碰撞，无法移动`;
                    }
                } else if (actualStepsExecuted === totalSteps) {
                    resultText = `移动成功！执行了全部${totalSteps}步规划`;
                } else {
                    resultText = `移动部分成功！规划${totalSteps}步，实际执行${actualStepsExecuted}步`;
                }
                
                this.showExecutionResult('', resultText);
                
                // 检查是否有单位因移动脱离近战
                this.checkAndDisengageUnits();
                
                this.resetMoveState();
                this.renderBoard();
                this.updateUI();
            }

            async executeAllPlans() {
                if (this.allUnitPlans.size === 0) {
                    console.log('没有单位规划需要执行');
                    return;
                }
                
                this.addGameLog(`🎲 开始逐个执行${this.allUnitPlans.size}个单位的移动计划（包含移动动画）`);
                
                // 转换为数组以便按顺序执行
                const planEntries = Array.from(this.allUnitPlans.entries());
                
                // 按单位类型分组，罗马军团兵和后备兵为一组，迦太基步兵为一组，弓箭手各自为一组
                const unitGroups = [];
                const romeInfantryGroup = [];
                const carthageInfantryGroup = [];
                const romeArcherGroup = [];
                const carthageArcherGroup = [];
                const otherUnits = [];
                
                for (const [unitId, planData] of planEntries) {
                    const unit = this.units.find(u => u.id === unitId && u.hp > 0);
                    if (!unit) continue;
                    
                    if (unit.faction === 'rome' && (unit.type === 'legionary' || unit.type === 'hastati')) {
                        romeInfantryGroup.push([unitId, planData, unit]);
                    } else if (unit.faction === 'carthage' && unit.type === 'infantry') {
                        carthageInfantryGroup.push([unitId, planData, unit]);
                    } else if (unit.faction === 'rome' && unit.type === 'archer') {
                        romeArcherGroup.push([unitId, planData, unit]);
                    } else if (unit.faction === 'carthage' && unit.type === 'archer') {
                        carthageArcherGroup.push([unitId, planData, unit]);
                    } else {
                        otherUnits.push([unitId, planData, unit]);
                    }
                }
                
                // 如果有罗马步兵单位，作为一组处理
                if (romeInfantryGroup.length > 0) {
                    unitGroups.push({
                        type: 'rome_infantry',
                        units: romeInfantryGroup
                    });
                }
                
                // 如果有迦太基步兵单位，作为一组处理
                if (carthageInfantryGroup.length > 0) {
                    unitGroups.push({
                        type: 'carthage_infantry',
                        units: carthageInfantryGroup
                    });
                }
                
                // 如果有罗马弓箭手单位，作为一组处理
                if (romeArcherGroup.length > 0) {
                    unitGroups.push({
                        type: 'rome_archer',
                        units: romeArcherGroup
                    });
                }
                
                // 如果有迦太基弓箭手单位，作为一组处理
                if (carthageArcherGroup.length > 0) {
                    unitGroups.push({
                        type: 'carthage_archer',
                        units: carthageArcherGroup
                    });
                }
                
                // 其他单位分别处理
                for (const unitData of otherUnits) {
                    unitGroups.push({
                        type: 'individual',
                        units: [unitData]
                    });
                }
                
                // 逐组执行
                for (const group of unitGroups) {
                    if (group.type === 'rome_infantry') {
                        // 罗马步兵组：共用一次投掷
                        const dice1 = Math.floor(Math.random() * 6) + 1;
                        const dice2 = Math.floor(Math.random() * 6) + 1;
                        const diceTotal = dice1 + dice2;
                        
                        this.addGameLog(`🎲 罗马步兵团体投掷: 2D6=${dice1}+${dice2}=${diceTotal}`);
                        
                        // 为该组的每个单位执行移动
                        for (const [unitId, planData, unit] of group.units) {
                            const plan = planData.plan;
                            
                            // 检查是否有存活的将领
                            const hasGeneral = this.units.some(u => 
                                u.type === 'general' && 
                                u.faction === unit.faction && 
                                u.hp > 0
                            );
                            
                            // 获取最近的将领领导力（没有将领时返回默认值6）
                            const leadership = this.getNearestGeneralLeadership(unit);
                            const result = diceTotal - leadership;
                            
                            // 根据新规则执行相应步数
                            let stepsToExecute = 0;
                            if (result <= -3) {
                                stepsToExecute = plan.length; // 执行全部规划
                            } else if (result === -2) {
                                stepsToExecute = Math.min(2, plan.length); // 执行前两步
                            } else if (result >= -1 && result <= 1) {
                                stepsToExecute = 1; // 执行第一步
                            } else if (result >= 2) {
                                stepsToExecute = 0; // 不执行任何步骤
                            }
                            
                            const unitTypeName = this.getUnitTypeName(unit.type);
                            
                            // 记录结果
                            let resultText = `${unit.name}`;
                            if (hasGeneral) {
                                resultText += `: ${diceTotal}-将领领导力${leadership}=${result}`;
                            } else {
                                resultText += `: 无将领，使用默认领导值6，${diceTotal}-6=${result}`;
                            }
                            
                            if (result <= -3) {
                                resultText += `，可以执行全部${plan.length}步移动`;
                            } else if (result === -2) {
                                resultText += `，可以执行${Math.min(2, plan.length)}步移动`;
                            } else if (result >= -1 && result <= 1) {
                                resultText += `，可以执行1步移动`;
                            } else if (result >= 2) {
                                resultText += `，无法执行移动`;
                            }
                            
                            this.addGameLog(resultText);
                            
                            // 执行移动（带动画和碰撞检测）
                            if (stepsToExecute > 0) {
                                await this.executeUnitPlanWithAnimation(unit, plan, stepsToExecute);
                            } else {
                                this.addGameLog(`❌ ${unit.name}移动失败！骰子结果不佳，无法移动`);
                            }
                            
                            // 每个单位执行完后稍作停顿
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } else if (group.type === 'carthage_infantry') {
                        // 迦太基步兵组：共用一次投掷
                        const dice1 = Math.floor(Math.random() * 6) + 1;
                        const dice2 = Math.floor(Math.random() * 6) + 1;
                        const diceTotal = dice1 + dice2;
                        
                        this.addGameLog(`🎲 迦太基步兵团体投掷: 2D6=${dice1}+${dice2}=${diceTotal}`);
                        
                        // 为该组的每个单位执行移动
                        for (const [unitId, planData, unit] of group.units) {
                            const plan = planData.plan;
                            
                            // 检查是否有存活的将领
                            const hasGeneral = this.units.some(u => 
                                u.type === 'general' && 
                                u.faction === unit.faction && 
                                u.hp > 0
                            );
                            
                            // 获取最近的将领领导力（没有将领时返回默认值6）
                            const leadership = this.getNearestGeneralLeadership(unit);
                            const result = diceTotal - leadership;
                            
                            // 根据新规则执行相应步数
                            let stepsToExecute = 0;
                            if (result <= -3) {
                                stepsToExecute = plan.length; // 执行全部规划
                            } else if (result === -2) {
                                stepsToExecute = Math.min(2, plan.length); // 执行前两步
                            } else if (result >= -1 && result <= 1) {
                                stepsToExecute = 1; // 执行第一步
                            } else if (result >= 2) {
                                stepsToExecute = 0; // 不执行任何步骤
                            }
                            
                            const unitTypeName = this.getUnitTypeName(unit.type);
                            
                            // 记录结果
                            let resultText = `${unit.name}`;
                            if (hasGeneral) {
                                resultText += `: ${diceTotal}-将领领导力${leadership}=${result}`;
                            } else {
                                resultText += `: 无将领，使用默认领导值6，${diceTotal}-6=${result}`;
                            }
                            
                            if (result <= -3) {
                                resultText += `，可以执行全部${plan.length}步移动`;
                            } else if (result === -2) {
                                resultText += `，可以执行${Math.min(2, plan.length)}步移动`;
                            } else if (result >= -1 && result <= 1) {
                                resultText += `，可以执行1步移动`;
                            } else if (result >= 2) {
                                resultText += `，无法执行移动`;
                            }
                            
                            this.addGameLog(resultText);
                            
                            // 执行移动（带动画和碰撞检测）
                            if (stepsToExecute > 0) {
                                await this.executeUnitPlanWithAnimation(unit, plan, stepsToExecute);
                            } else {
                                this.addGameLog(`❌ ${unit.name}移动失败！骰子结果不佳，无法移动`);
                            }
                            
                            // 每个单位执行完后稍作停顿
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } else if (group.type === 'rome_archer') {
                        // 罗马弓箭手组：共用一次投掷
                        const dice1 = Math.floor(Math.random() * 6) + 1;
                        const dice2 = Math.floor(Math.random() * 6) + 1;
                        const diceTotal = dice1 + dice2;
                        
                        this.addGameLog(`🎲 罗马弓箭手团体投掷: 2D6=${dice1}+${dice2}=${diceTotal}`);
                        
                        // 为该组的每个单位执行移动
                        for (const [unitId, planData, unit] of group.units) {
                            const plan = planData.plan;
                            
                            // 检查是否有存活的将领
                            const hasGeneral = this.units.some(u => 
                                u.type === 'general' && 
                                u.faction === unit.faction && 
                                u.hp > 0
                            );
                            
                            // 获取最近的将领领导力（没有将领时返回默认值6）
                            const leadership = this.getNearestGeneralLeadership(unit);
                            const result = diceTotal - leadership;
                            
                            // 根据新规则执行相应步数
                            let stepsToExecute = 0;
                            if (result <= -3) {
                                stepsToExecute = plan.length; // 执行全部规划
                            } else if (result === -2) {
                                stepsToExecute = Math.min(2, plan.length); // 执行前两步
                            } else if (result >= -1 && result <= 1) {
                                stepsToExecute = 1; // 执行第一步
                            } else if (result >= 2) {
                                stepsToExecute = 0; // 不执行任何步骤
                            }
                            
                            const unitTypeName = this.getUnitTypeName(unit.type);
                            
                            // 记录结果
                            let resultText = `${unit.name}`;
                            if (hasGeneral) {
                                resultText += `: ${diceTotal}-将领领导力${leadership}=${result}`;
                            } else {
                                resultText += `: 无将领，使用默认领导值6，${diceTotal}-6=${result}`;
                            }
                            
                            if (result <= -3) {
                                resultText += `，可以执行全部${plan.length}步移动`;
                            } else if (result === -2) {
                                resultText += `，可以执行${Math.min(2, plan.length)}步移动`;
                            } else if (result >= -1 && result <= 1) {
                                resultText += `，可以执行1步移动`;
                            } else if (result >= 2) {
                                resultText += `，无法执行移动`;
                            }
                            
                            this.addGameLog(resultText);
                            
                            // 执行移动（带动画和碰撞检测）
                            if (stepsToExecute > 0) {
                                await this.executeUnitPlanWithAnimation(unit, plan, stepsToExecute);
                            } else {
                                this.addGameLog(`❌ ${unit.name}移动失败！骰子结果不佳，无法移动`);
                            }
                            
                            // 每个单位执行完后稍作停顿
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } else if (group.type === 'carthage_archer') {
                        // 迦太基弓箭手组：共用一次投掷
                        const dice1 = Math.floor(Math.random() * 6) + 1;
                        const dice2 = Math.floor(Math.random() * 6) + 1;
                        const diceTotal = dice1 + dice2;
                        
                        this.addGameLog(`🎲 迦太基弓箭手团体投掷: 2D6=${dice1}+${dice2}=${diceTotal}`);
                        
                        // 为该组的每个单位执行移动
                        for (const [unitId, planData, unit] of group.units) {
                            const plan = planData.plan;
                            
                            // 检查是否有存活的将领
                            const hasGeneral = this.units.some(u => 
                                u.type === 'general' && 
                                u.faction === unit.faction && 
                                u.hp > 0
                            );
                            
                            // 获取最近的将领领导力（没有将领时返回默认值6）
                            const leadership = this.getNearestGeneralLeadership(unit);
                            const result = diceTotal - leadership;
                            
                            // 根据新规则执行相应步数
                            let stepsToExecute = 0;
                            if (result <= -3) {
                                stepsToExecute = plan.length; // 执行全部规划
                            } else if (result === -2) {
                                stepsToExecute = Math.min(2, plan.length); // 执行前两步
                            } else if (result >= -1 && result <= 1) {
                                stepsToExecute = 1; // 执行第一步
                            } else if (result >= 2) {
                                stepsToExecute = 0; // 不执行任何步骤
                            }
                            
                            const unitTypeName = this.getUnitTypeName(unit.type);
                            
                            // 记录结果
                            let resultText = `${unit.name}`;
                            if (hasGeneral) {
                                resultText += `: ${diceTotal}-将领领导力${leadership}=${result}`;
                            } else {
                                resultText += `: 无将领，使用默认领导值6，${diceTotal}-6=${result}`;
                            }
                            
                            if (result <= -3) {
                                resultText += `，可以执行全部${plan.length}步移动`;
                            } else if (result === -2) {
                                resultText += `，可以执行${Math.min(2, plan.length)}步移动`;
                            } else if (result >= -1 && result <= 1) {
                                resultText += `，可以执行1步移动`;
                            } else if (result >= 2) {
                                resultText += `，无法执行移动`;
                            }
                            
                            this.addGameLog(resultText);
                            
                            // 执行移动（带动画和碰撞检测）
                            if (stepsToExecute > 0) {
                                await this.executeUnitPlanWithAnimation(unit, plan, stepsToExecute);
                            } else {
                                this.addGameLog(`❌ ${unit.name}移动失败！骰子结果不佳，无法移动`);
                            }
                            
                            // 每个单位执行完后稍作停顿
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } else {
                        // 单独执行的单位
                        const [unitId, planData, unit] = group.units[0];
                    const plan = planData.plan;
                    
                    // 投掷2D6
                    const dice1 = Math.floor(Math.random() * 6) + 1;
                    const dice2 = Math.floor(Math.random() * 6) + 1;
                    const diceTotal = dice1 + dice2;
                    
                    // 检查是否有存活的将领
                    const hasGeneral = this.units.some(u => 
                        u.type === 'general' && 
                        u.faction === unit.faction && 
                        u.hp > 0
                    );
                    
                    // 获取最近的将领领导力（没有将领时返回默认值6）
                    const leadership = this.getNearestGeneralLeadership(unit);
                    const result = diceTotal - leadership;
                    
                    // 根据新规则执行相应步数
                    let stepsToExecute = 0;
                    if (result <= -3) {
                        stepsToExecute = plan.length; // 执行全部规划
                    } else if (result === -2) {
                        stepsToExecute = Math.min(2, plan.length); // 执行前两步
                    } else if (result >= -1 && result <= 1) {
                        stepsToExecute = 1; // 执行第一步
                    } else if (result >= 2) {
                        stepsToExecute = 0; // 不执行任何步骤
                    }
                    
                    const unitTypeName = this.getUnitTypeName(unit.type);
                    
                    // 记录骰子结果
                        let resultText = `${unit.name}: 2D6投掷结果为${diceTotal}`;
                    if (hasGeneral) {
                        resultText += `，${diceTotal}-将领领导力${leadership}=${result}`;
                    } else {
                        resultText += `，无将领，使用默认领导值6，${diceTotal}-6=${result}`;
                    }
                    
                    if (result <= -3) {
                        resultText += `，可以执行全部${plan.length}步移动`;
                    } else if (result === -2) {
                        resultText += `，可以执行${Math.min(2, plan.length)}步移动`;
                    } else if (result >= -1 && result <= 1) {
                        resultText += `，可以执行1步移动`;
                    } else if (result >= 2) {
                        resultText += `，无法执行移动`;
                    }
                    
                    this.addGameLog(resultText);
                    
                    // 执行移动（带动画和碰撞检测）
                    if (stepsToExecute > 0) {
                        await this.executeUnitPlanWithAnimation(unit, plan, stepsToExecute);
                    } else {
                            this.addGameLog(`❌ ${unit.name}移动失败！骰子结果不佳，无法移动`);
                    }
                    
                    // 每个单位执行完后稍作停顿
                    await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                
                // 清空所有规划，重置状态
                this.allUnitPlans.clear();
                this.planningPhase = 'planning';
                this.moveState = 'none';
                this.resetMoveState();
                this.renderBoard();
                // 清除所有占位预览
                this.clearPlannedOccupations();
                
                // 自动进入转向阶段
                this.addGameLog(`📋 移动阶段执行完毕，自动进入转向阶段`);
                this.currentPhase = 'turning';
                this.phaseCompleted.movement = true;
                this.addGameLog(`🔄 ${this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'}进入转向阶段，右键点击单位调整朝向`);
                
                this.updateUI();
            }

            showDiceResult(dice1, dice2, leadership, result) {
                // 这个方法现在不再使用，骰子结果直接在executePlan中处理
            }

            hideDiceResult() {
                const diceDiv = document.getElementById('dice-result');
                diceDiv.style.display = 'none';
            }

            getUnitTypeName(unitType) {
                const typeNames = {
                    'legionary': '军团兵',
                    'centurion': '百夫长',
                    'hastati': '后备兵',
                    'archer': '弓箭手',
                    'infantry': '步兵',
                    'elephant': '战象',
                    'cavalry': '骑兵',
                    'general': '将领'
                };
                return typeNames[unitType] || unitType;
            }

            showExecutionResult(title, details) {
                // 在游戏日志中显示执行结果
                this.addGameLog(details);
            }

            addGameLog(message) {
                try {
                    const logContent = document.getElementById('game-log-content');
                    if (!logContent) {
                        console.error('游戏日志容器未找到');
                        return;
                    }
                    
                    const timestamp = new Date().toLocaleTimeString();
                    
                    const logEntry = document.createElement('div');
                    logEntry.style.cssText = `
                        margin-bottom: 8px;
                        padding: 5px 8px;
                        background: white;
                        border-radius: 4px;
                        border-left: 3px solid #3498db;
                    `;
                    
                                    logEntry.innerHTML = `
                    <span style="color: #7f8c8d; font-size: 12px;">[${timestamp}]</span>
                    <span style="margin-left: 8px; color: #2c3e50;">${message}</span>
                `;
                    
                    logContent.appendChild(logEntry);
                    
                    // 自动滚动到底部
                    logContent.scrollTop = logContent.scrollHeight;
                    
                    // 限制日志条目数量，保持性能
                    const entries = logContent.children;
                    if (entries.length > 50) {
                        logContent.removeChild(entries[0]);
                    }
                } catch (error) {
                    console.error('添加游戏日志时出错:', error);
                }
            }
            
            showCollisionEffect(movingUnit, collidingUnit) {
                // 为移动单位添加碰撞效果
                if (movingUnit) {
                    const movingUnitElement = document.querySelector(`[data-x="${movingUnit.x}"][data-y="${movingUnit.y}"]`);
                    if (movingUnitElement) {
                        movingUnitElement.classList.add('collision-effect');
                        setTimeout(() => {
                            movingUnitElement.classList.remove('collision-effect');
                        }, 600);
                    }
                }
                
                // 为被碰撞单位添加震动效果
                if (collidingUnit) {
                    const collidingUnitElement = document.querySelector(`[data-x="${collidingUnit.x}"][data-y="${collidingUnit.y}"]`);
                    if (collidingUnitElement) {
                        collidingUnitElement.style.animation = 'shake 0.5s ease-in-out';
                        setTimeout(() => {
                            collidingUnitElement.style.animation = '';
                        }, 500);
                    }
                }
            }
            
            // 显示所有已规划单位的占位
            showAllPlannedOccupations() {
                // 清除现有的占位显示
                this.clearPlannedOccupations();
                
                const container = document.getElementById('square-grid');
                
                // 显示所有已完成规划的单位占位
                for (const [unitId, planData] of this.allUnitPlans) {
                    const { unit, plan } = planData;
                    const size = this.unitSizes[unit.type];
                    
                    // 显示初始位置占位
                    this.createOccupationElement(container, unit.x, unit.y, size, unit.faction, 0);
                    
                    // 显示规划步骤占位
                    plan.forEach((step, stepIndex) => {
                        this.createOccupationElement(container, step.endX, step.endY, size, unit.faction, stepIndex + 1);
                    });
                }
                
                // 显示当前规划中单位的占位
                if (this.selectedUnit && this.movePlan.length > 0) {
                    const size = this.unitSizes[this.selectedUnit.type];
                    
                    // 显示当前单位的初始位置占位
                    this.createOccupationElement(container, this.selectedUnit.x, this.selectedUnit.y, size, this.selectedUnit.faction, 0);
                    
                    // 显示规划步骤占位
                    this.movePlan.forEach((step, stepIndex) => {
                        this.createOccupationElement(container, step.endX, step.endY, size, this.selectedUnit.faction, stepIndex + 1);
                    });
                }
            }
            
            // 只显示其他已完成规划单位的占位（不包括当前选中单位）
            showOtherPlannedOccupations() {
                // 清除现有的占位显示
                this.clearPlannedOccupations();
                
                const container = document.getElementById('square-grid');
                
                // 只显示已完成规划的单位占位
                for (const [unitId, planData] of this.allUnitPlans) {
                    const { unit, plan } = planData;
                    const size = this.unitSizes[unit.type];
                    
                    plan.forEach((step, stepIndex) => {
                        this.createOccupationElement(container, step.endX, step.endY, size, unit.faction, stepIndex + 1);
                    });
                }
            }
            
            // 创建占位显示元素
            createOccupationElement(container, x, y, size, faction, stepNumber) {
                const occupationDiv = document.createElement('div');
                occupationDiv.className = `planned-occupation ${faction} step-${stepNumber}`;
                occupationDiv.style.left = `${x * 16}px`;
                occupationDiv.style.top = `${y * 16}px`;
                occupationDiv.style.width = `${size.width * 16}px`;
                occupationDiv.style.height = `${size.height * 16}px`;
                occupationDiv.dataset.unitOccupation = 'true';
                occupationDiv.dataset.x = x;
                occupationDiv.dataset.y = y;
                occupationDiv.dataset.width = size.width;
                occupationDiv.dataset.height = size.height;
                occupationDiv.dataset.step = stepNumber;
                
                container.appendChild(occupationDiv);
            }
            
            // 清除所有占位显示
            clearPlannedOccupations() {
                const occupations = document.querySelectorAll('.planned-occupation');
                occupations.forEach(el => el.remove());
            }
            
            // 检查规划位置是否与已有占位冲突
            checkPlannedOccupationConflict(x, y, width, height, excludeUnitId = null) {
                // 检查与已规划单位的冲突
                for (const [unitId, planData] of this.allUnitPlans) {
                    if (excludeUnitId && unitId === excludeUnitId) continue;
                    
                    const { unit, plan } = planData;
                    const unitSize = this.unitSizes[unit.type];
                    
                    // 检查与该单位所有规划步骤的冲突
                    for (const step of plan) {
                        if (this.isAreaOverlap(x, y, width, height, step.endX, step.endY, unitSize.width, unitSize.height)) {
                            return {
                                conflict: true,
                                conflictUnit: unit,
                                conflictPosition: { x: step.endX, y: step.endY }
                            };
                        }
                    }
                }
                
                // 检查与当前规划中单位的冲突（如果不是同一单位）
                if (this.selectedUnit && this.selectedUnit.id !== excludeUnitId && this.movePlan.length > 0) {
                    const size = this.unitSizes[this.selectedUnit.type];
                    
                    for (const step of this.movePlan) {
                        if (this.isAreaOverlap(x, y, width, height, step.endX, step.endY, size.width, size.height)) {
                            return {
                                conflict: true,
                                conflictUnit: this.selectedUnit,
                                conflictPosition: { x: step.endX, y: step.endY }
                            };
                        }
                    }
                }
                
                return { conflict: false };
            }
            
            // 检查两个矩形区域是否重叠
            isAreaOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
                return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
            }
            
            // 单步移动动画 - 显示整个占位区域的移动
            animateUnitMove(unit, targetX, targetY) {
                return new Promise((resolve, reject) => {
                    try {
                        const size = this.unitSizes[unit.type];
                        const container = document.getElementById('square-grid');
                        
                        if (!container) {
                            console.error('找不到游戏容器');
                            unit.x = targetX;
                            unit.y = targetY;
                            resolve();
                            return;
                        }
                        
                        // 创建移动动画元素，显示整个占位区域
                        const animationElement = document.createElement('div');
                        animationElement.className = `unit-large ${unit.faction} unit-moving-animation`;
                        animationElement.style.cssText = `
                            position: absolute;
                            width: ${size.width * 16}px;
                            height: ${size.height * 16}px;
                            left: ${unit.x * 16}px;
                            top: ${unit.y * 16}px;
                            background: ${unit.faction === 'rome' ? 'rgba(231, 76, 60, 0.8)' : 'rgba(52, 152, 219, 0.8)'};
                            border: 3px solid ${unit.faction === 'rome' ? '#c0392b' : '#2980b9'};
                            border-radius: 4px;
                            z-index: 1500;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: white;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                            transition: left 0.8s ease-in-out, top 0.8s ease-in-out;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                        `;
                        
                        // 显示单位类型和方向
                        try {
                            const unitIcon = this.getUnitIcon(unit);
                            const directionArrow = this.getDirectionArrow(unit.direction);
                            
                            // 检查是否为图片单位
                            const isImageUnit = (unit.faction === 'rome' && (unit.type === 'legionary' || unit.type === 'centurion' || unit.type === 'hastati' || unit.type === 'cavalry' || unit.type === 'archer' || unit.type === 'general')) || 
                                               (unit.faction === 'carthage' && (unit.type === 'cavalry' || unit.type === 'archer' || unit.type === 'general' || unit.type === 'infantry' || unit.type === 'elephant'));
                            
                            if (isImageUnit) {
                                // 图片单位：图标旋转，不显示方向箭头
                                const rotationDegrees = {
                                    'north': 0,
                                    'east': 90,
                                    'south': 180,
                                    'west': 270
                                };
                                const rotation = rotationDegrees[unit.direction] || 0;
                                
                                // 获取单位尺寸并计算缩放比例
                                const unitSize = this.getUnitSizeWithDirection(unit);
                                const baseSize = this.unitBaseSizes[unit.type];
                                const isRotated = (unit.direction === 'east' || unit.direction === 'west');
                                const scaleValue = isRotated ? Math.max(baseSize.width / baseSize.height, baseSize.height / baseSize.width) : 1;
                                
                                animationElement.innerHTML = `
                                    <div style="transform: rotate(${rotation}deg) scale(${scaleValue}); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                        ${unitIcon}
                                    </div>
                                `;
                            } else {
                                // Emoji单位：显示图标和方向箭头
                                animationElement.innerHTML = `
                                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                        <div style="font-size: 20px;">${unitIcon}</div>
                                        <div style="font-size: 12px; color: #f1c40f;">${directionArrow}</div>
                                    </div>
                                `;
                            }
                        } catch (iconError) {
                            console.warn('获取单位图标失败，使用默认显示:', iconError);
                            animationElement.innerHTML = unit.type.charAt(0).toUpperCase();
                        }
                        
                        container.appendChild(animationElement);
                        
                        // 稍作延迟后开始动画
                        setTimeout(() => {
                            try {
                                const newLeft = targetX * 16;
                                const newTop = targetY * 16;
                                
                                animationElement.style.left = `${newLeft}px`;
                                animationElement.style.top = `${newTop}px`;
                                
                                // 动画完成后更新单位位置并移除动画元素
                                setTimeout(() => {
                                    try {
                                        unit.x = targetX;
                                        unit.y = targetY;
                                        if (animationElement.parentNode) {
                                            animationElement.remove();
                                        }
                                        resolve();
                                    } catch (cleanupError) {
                                        console.error('动画清理时出错:', cleanupError);
                                        unit.x = targetX;
                                        unit.y = targetY;
                                        resolve();
                                    }
                                }, 800); // 与CSS动画时间一致
                            } catch (animError) {
                                console.error('动画执行时出错:', animError);
                                unit.x = targetX;
                                unit.y = targetY;
                                if (animationElement.parentNode) {
                                    animationElement.remove();
                                }
                                resolve();
                            }
                        }, 50);
                    } catch (error) {
                        console.error('创建动画时出错:', error);
                        unit.x = targetX;
                        unit.y = targetY;
                        resolve();
                    }
                });
            }
            
            // 执行单个单位的移动计划（带动画）
            async executeUnitPlanWithAnimation(unit, plan, stepsToExecute) {
                const unitTypeName = this.getUnitTypeName(unit.type);
                let actualStepsExecuted = 0;
                let collisionOccurred = false;
                
                // 在开始移动前隐藏原始单位（通过临时标记）
                unit.isAnimating = true;
                this.renderBoard(); // 重新渲染以隐藏正在动画的单位
                
                for (let i = 0; i < stepsToExecute; i++) {
                    const step = plan[i];
                    const size = this.unitSizes[unit.type];
                    
                    // 检查目标位置是否被其他单位占用（实时检测）
                    if (this.isAreaOccupiedByOthers(step.endX, step.endY, size.width, size.height, unit.id)) {
                        // 找到碰撞的单位
                        const collidingUnit = this.findUnitAtPosition(step.endX, step.endY, unit.id);
                        const collidingUnitName = collidingUnit ? this.getUnitTypeName(collidingUnit.type) : '其他单位';
                        this.addGameLog(`🚫 ${unitTypeName}第${i + 1}步移动受阻，与${collidingUnitName}发生碰撞`);
                        
                        // 显示碰撞效果
                        this.showCollisionEffect(unit, collidingUnit);
                        
                        collisionOccurred = true;
                        break;
                    }
                    
                    // 执行带动画的移动
                    try {
                        await this.animateUnitMove(unit, step.endX, step.endY);
                        actualStepsExecuted++;
                        console.log(`${unitTypeName}执行第${i + 1}步: 移动到 (${step.endX}, ${step.endY})`);
                    } catch (error) {
                        console.error(`${unitTypeName}第${i + 1}步移动动画出错:`, error);
                        // 即使动画失败，也要更新单位位置
                        unit.x = step.endX;
                        unit.y = step.endY;
                        actualStepsExecuted++;
                    }
                }
                
                // 动画完成，移除动画标记
                unit.isAnimating = false;
                unit.hasMoved = true;
                
                // 根据实际执行情况显示结果
                if (collisionOccurred) {
                    if (actualStepsExecuted > 0) {
                        this.addGameLog(`⚡ ${unitTypeName}移动部分成功！规划${plan.length}步，因碰撞实际执行${actualStepsExecuted}步`);
                    } else {
                        this.addGameLog(`❌ ${unitTypeName}移动失败！第1步就遇到碰撞，无法移动`);
                    }
                } else if (actualStepsExecuted === plan.length) {
                    this.addGameLog(`✅ ${unitTypeName}移动成功！执行了全部${plan.length}步规划`);
                } else {
                    this.addGameLog(`⚡ ${unitTypeName}移动部分成功！规划${plan.length}步，实际执行${actualStepsExecuted}步`);
                }
                
                // 检查是否有单位因移动脱离近战
                this.checkAndDisengageUnits();
            }

            updateUI() {
                console.log(`更新UI: 当前玩家=${this.currentPlayer}, 当前阶段=${this.currentPhase}, 移动状态=${this.moveState}`);
                
                const playerText = document.getElementById('current-player-text');
                playerText.textContent = this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                playerText.className = this.currentPlayer;

                // 更新阶段显示
                const phaseText = document.getElementById('current-phase-text');
                const phaseNames = {
                    'deployment': '📦 部署阶段',
                    'movement': '🚶 规划和移动',
                    'turning': '🔄 转向调整',
                    'ranged': '🏹 远程射击', 
                    'melee': '⚔️ 近战攻击'
                };
                
                if (this.currentPhase === 'deployment') {
                    const deploymentPlayerName = this.deploymentPhase === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                    phaseText.textContent = `阶段: ${phaseNames[this.currentPhase]} - ${deploymentPlayerName}部署中`;
                } else {
                    phaseText.textContent = `阶段: ${phaseNames[this.currentPhase]}`;
                }

                // 更新右侧栏的回合和阶段信息
                const sidebarPlayerText = document.getElementById('sidebar-player-text');
                if (sidebarPlayerText) {
                    sidebarPlayerText.textContent = this.currentPlayer === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                    sidebarPlayerText.className = this.currentPlayer;
                }
                
                const sidebarPhaseText = document.getElementById('sidebar-phase-text');
                if (sidebarPhaseText) {
                    if (this.currentPhase === 'deployment') {
                        const deploymentPlayerName = this.deploymentPhase === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                        sidebarPhaseText.textContent = `${phaseNames[this.currentPhase]} - ${deploymentPlayerName}部署中`;
                    } else {
                        sidebarPhaseText.textContent = phaseNames[this.currentPhase] || this.currentPhase;
                    }
                }

                // 更新阵营统计（统计分值而非数量）
                const romeValue = this.calculateFactionPoints('rome');
                const carthageValue = this.calculateFactionPoints('carthage');
                
                // 显示格式：当前分值/初始总分值 (百分比)
                let romeText, carthageText;
                if (this.initialPoints) {
                    const romePercentage = ((romeValue / this.initialPoints.rome) * 100).toFixed(1);
                    const carthagePercentage = ((carthageValue / this.initialPoints.carthage) * 100).toFixed(1);
                    romeText = `${romeValue}/${this.initialPoints.rome} (${romePercentage}%)`;
                    carthageText = `${carthageValue}/${this.initialPoints.carthage} (${carthagePercentage}%)`;
                } else {
                    romeText = `${romeValue}`;
                    carthageText = `${carthageValue}`;
                }
                
                document.getElementById('rome-count').textContent = romeText;
                document.getElementById('carthage-count').textContent = carthageText;
                
                // 更新底部统计（如果存在）
                const romeCountBottom = document.getElementById('rome-count-bottom');
                const carthageCountBottom = document.getElementById('carthage-count-bottom');
                if (romeCountBottom) romeCountBottom.textContent = romeText;
                if (carthageCountBottom) carthageCountBottom.textContent = carthageText;

                // 更新选中单位信息
                const infoDiv = document.getElementById('selected-unit-info');
                                            if (this.selectedUnit) {
                    const unit = this.selectedUnit;
                    const hpPercentage = (unit.hp / unit.maxHp) * 100;
                    let hpColor = '#2ecc71';
                    if (hpPercentage < 70) hpColor = '#f39c12';
                    if (hpPercentage < 40) hpColor = '#e74c3c';
                    
                    const typeNames = {
                        'legionary': '军团兵',
                        'centurion': '百夫长',
                        'archer': '弓箭手',
                        'infantry': '步兵',
                        'elephant': '战象',
                        'cavalry': '骑兵',
                        'general': '将领'
                    };

                    let statusInfo = '';
                    if (this.moveState === 'unit_selected') {
                        statusInfo = '<div style="color: #f39c12;">📍 已选择单位，点击空地开始规划移动</div>';
                    } else if (this.moveState === 'planning') {
                        statusInfo = `<div style="color: #9b59b6;">🎯 移动规划中 (${this.movePlan.length}/3步)，点击位置添加步骤</div>`;
                    } else if (this.moveState === 'ready_to_execute') {
                        statusInfo = '<div style="color: #27ae60;">✅ 规划完成，点击执行按钮投掷骰子</div>';
                    } else if (this.moveState === 'target_selected') {
                        const action = this.targetPosition.action === 'move' ? '移动' : '攻击';
                        statusInfo = `<div style="color: #e74c3c;">🎯 已选择${action}目标，点击确定按钮执行</div>`;
                    }
                    
                    // 显示已规划的单位数量
                    if (this.allUnitPlans.size > 0) {
                        statusInfo += `<div style="color: #3498db; margin-top: 5px;">📋 已规划${this.allUnitPlans.size}个单位</div>`;
                    }
                    
                    infoDiv.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; align-items: center;">
                            <div>
                                <div style="font-size: 18px; margin-bottom: 8px;">
                                    <strong>${unit.name}</strong> (${unit.faction === 'rome' ? '🏛️ 罗马' : '🌊 迦太基'})
                                </div>
                                <div style="margin-bottom: 5px;">
                                    <span style="color: ${hpColor};">❤️ HP: ${unit.hp}/${unit.maxHp}</span>
                                </div>
                                <div style="margin-bottom: 5px; font-size: 12px;">
                                    🧠 士气: <span style="color: ${unit.morale === 'good' ? '#2ecc71' : '#e74c3c'};">${unit.morale === 'good' ? '良好' : '动摇'}</span> | 
                                    📋 秩序: <span style="color: ${unit.order === 'good' ? '#2ecc71' : '#e74c3c'};">${unit.order === 'good' ? '良好' : '混乱'}</span> | 
                                    ⚔️ 战斗: <span style="color: ${unit.combatStatus === 'engaged' ? '#e74c3c' : unit.combatStatus === 'supporting' ? '#f39c12' : '#95a5a6'};">${unit.combatStatus === 'engaged' ? '近战中' : unit.combatStatus === 'supporting' ? '支援中' : '未近战'}</span>
                                </div>
                                <div style="font-size: 12px; line-height: 1.3;">
                                    ⚔️ 冲锋: ${unit.chargeAttack} | 持续: ${unit.sustainedMelee} | 支援: ${unit.supportMelee}<br>
                                    🏹 投掷: ${unit.throwingAttack} | 射击: ${unit.rangedAttack} | 🛡️ 防御: ${unit.defense}<br>
                                    💪 承受力: ${unit.casualtyTolerance} | 🎯 射程: ${unit.range}
                                </div>
                            </div>
                            <div>
                                <div style="margin-bottom: 5px;">🏃 移动: ${unit.movement}</div>
                                ${unit.leadership > 0 ? `<div style="margin-bottom: 5px; color: #f1c40f;">👑 领导力: ${unit.leadership}</div>` : ''}
                                <div style="margin-bottom: 5px; color: #9b59b6; font-weight: bold;">💎 分值: ${unit.value || 0}</div>
                                <div style="margin-bottom: 5px; font-size: 13px; color: #3498db; font-weight: bold;">
                                    ${{
                                        'north': '⬆️ 朝向: 北方',
                                        'east': '➡️ 朝向: 东方',
                                        'south': '⬇️ 朝向: 南方',
                                        'west': '⬅️ 朝向: 西方'
                                    }[unit.direction] || '🧭 朝向: 未知'}
                                </div>
                                <div style="font-size: 11px; line-height: 1.2;">
                                <div style="color: ${unit.hasMoved ? '#e74c3c' : '#2ecc71'};">
                                        🚶 移动: ${unit.hasMoved ? '已完成' : '可执行'}
                                    </div>
                                    <div style="color: ${unit.hasRangedAttacked ? '#e74c3c' : '#2ecc71'};">
                                        🏹 射击: ${unit.hasRangedAttacked ? '已完成' : '可执行'}
                                    </div>
                                    <div style="color: ${unit.hasMeleeAttacked ? '#e74c3c' : '#2ecc71'};">
                                        ⚔️ 近战: ${unit.hasMeleeAttacked ? '已完成' : '可执行'}
                                    </div>
                                </div>
                                <div style="margin-bottom: 5px; font-size: 11px; color: #3498db;">
                                    特殊技能: ${unit.specialSkills.join(', ')}
                                </div>
                                <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                                    📍 坐标: (${unit.x}, ${unit.y})
                                </div>
                            </div>
                        </div>
                        ${statusInfo}
                    `;
                } else {
                    let stateInfo = '';
                    if (this.currentPhase === 'deployment') {
                        const currentDeploymentPlayer = this.deploymentPhase === 'rome' ? '🏛️ 罗马' : '🌊 迦太基';
                        stateInfo = `📦 ${currentDeploymentPlayer}部署中 - 拖拽单位调整位置，完成后点击"确认部署"按钮`;
                    } else if (this.planningPhase === 'executing') {
                        switch (this.moveState) {
                            case 'all_planned':
                                stateInfo = '🎲 所有规划完成，点击统一执行按钮';
                                break;
                        }
                    } else {
                        switch (this.moveState) {
                            case 'none':
                                if (this.allUnitPlans.size > 0) {
                                    stateInfo = `🎯 继续规划其他单位，或点击完成所有规划 (已规划${this.allUnitPlans.size}个)`;
                                } else {
                                    stateInfo = '🎯 选择一个己方单位开始规划移动';
                                }
                                break;
                            case 'unit_selected':
                                stateInfo = '📍 点击空地开始规划移动，或点击敌方单位攻击';
                                break;
                            case 'planning':
                                stateInfo = `🗺️ 移动规划中 (${this.movePlan.length}/3步)`;
                                break;
                            case 'ready_to_execute':
                                stateInfo = '🎲 点击执行按钮投掷骰子决定移动结果';
                                break;
                            case 'target_selected':
                                stateInfo = this.currentPhase === 'ranged' ? '🏹 点击确认射击按钮执行射击' : '⚔️ 点击确定按钮执行攻击';
                                break;
                        }
                    }
                    
                    infoDiv.innerHTML = `
                        <div style="text-align: center; opacity: 0.7;">
                            ${stateInfo}
                        </div>
                    `;
                }
                
                // 更新按钮状态
                this.updateMoveButtons();
            }

            // 计算阵营当前分值
            calculateFactionPoints(faction) {
                let totalPoints = 0;
                this.units.forEach(unit => {
                    if (unit.faction === faction && unit.hp > 0) {
                        const unitType = unit.type;
                        const points = this.unitValues[unitType] || 0;
                        totalPoints += points;
                    }
                });
                return totalPoints;
            }
            
            checkGameEnd() {
                // 计算当前剩余分值
                const romeCurrentPoints = this.calculateFactionPoints('rome');
                const carthageCurrentPoints = this.calculateFactionPoints('carthage');
                
                // 检查是否有初始分值（游戏刚开始时可能还没有）
                if (!this.initialPoints) {
                    return;
                }
                
                // 计算分值比例
                const romePercentage = (romeCurrentPoints / this.initialPoints.rome) * 100;
                const carthagePercentage = (carthageCurrentPoints / this.initialPoints.carthage) * 100;
                
                console.log(`[胜负判定] 罗马: ${romeCurrentPoints}/${this.initialPoints.rome} (${romePercentage.toFixed(1)}%)`);
                console.log(`[胜负判定] 迦太基: ${carthageCurrentPoints}/${this.initialPoints.carthage} (${carthagePercentage.toFixed(1)}%)`);
                
                // 检查胜负条件：剩余分值低于初始总分值的65%则战败
                if (romePercentage < 65) {
                    this.addGameLog(`\n🏆 游戏结束！迦太基获胜！`);
                    this.addGameLog(`📊 罗马剩余分值: ${romeCurrentPoints}/${this.initialPoints.rome} (${romePercentage.toFixed(1)}%)`);
                    this.addGameLog(`📊 迦太基剩余分值: ${carthageCurrentPoints}/${this.initialPoints.carthage} (${carthagePercentage.toFixed(1)}%)`);
                    
                    setTimeout(() => {
                        this.showVictoryModal('carthage', romeCurrentPoints, carthageCurrentPoints, romePercentage, carthagePercentage);
                    }, 1000);
                } else if (carthagePercentage < 65) {
                    this.addGameLog(`\n🏆 游戏结束！罗马获胜！`);
                    this.addGameLog(`📊 罗马剩余分值: ${romeCurrentPoints}/${this.initialPoints.rome} (${romePercentage.toFixed(1)}%)`);
                    this.addGameLog(`📊 迦太基剩余分值: ${carthageCurrentPoints}/${this.initialPoints.carthage} (${carthagePercentage.toFixed(1)}%)`);
                    
                    setTimeout(() => {
                        this.showVictoryModal('rome', romeCurrentPoints, carthageCurrentPoints, romePercentage, carthagePercentage);
                    }, 1000);
                }
            }
            
            // 显示胜利弹窗
            showVictoryModal(winner, romePoints, carthagePoints, romePercentage, carthagePercentage) {
                const modal = document.getElementById('victory-modal');
                const icon = document.getElementById('victory-icon');
                const title = document.getElementById('victory-title');
                const romeScore = document.getElementById('rome-final-score');
                const carthageScore = document.getElementById('carthage-final-score');
                const message = document.getElementById('victory-message');
                
                // 设置胜利方的图标和标题
                if (winner === 'rome') {
                    icon.textContent = '🏛️';
                    title.textContent = '罗马获胜！';
                } else {
                    icon.textContent = '🌊';
                    title.textContent = '迦太基获胜！';
                }
                
                // 设置双方分数
                romeScore.textContent = `${romePoints}/${this.initialPoints.rome} (${romePercentage.toFixed(1)}%)`;
                carthageScore.textContent = `${carthagePoints}/${this.initialPoints.carthage} (${carthagePercentage.toFixed(1)}%)`;
                
                // 设置胜利信息
                const loserName = winner === 'rome' ? '迦太基' : '罗马';
                message.innerHTML = `${loserName}的剩余部队分值已低于初始总分值的65%，<br>战斗以${winner === 'rome' ? '罗马' : '迦太基'}的胜利告终！`;
                
                // 计算战后影响
                const battleResult = this.calculateBattleAftermath(winner);
                
                // 显示罗马战后影响
                const romeMoraleEl = document.getElementById('rome-morale-change');
                const romeLossEl = document.getElementById('rome-loss-detail');
                
                if (winner === 'rome') {
                    romeMoraleEl.innerHTML = `📈 士气：<span style="color: #2ecc71;">增长至 5</span>`;
                    romeLossEl.innerHTML = `💀 兵力损失：<span style="color: #f39c12;">${battleResult.winnerLossPercent.toFixed(1)}%</span> <span style="color: #95a5a6;">(投掷骰子: ${battleResult.winnerDice})</span>`;
                } else {
                    romeMoraleEl.innerHTML = `📉 士气：<span style="color: #e74c3c;">降低至 1</span>`;
                    romeLossEl.innerHTML = `💀 兵力损失：<span style="color: #e74c3c;">${battleResult.loserLossPercent.toFixed(1)}%</span> <span style="color: #95a5a6;">(投掷骰子: ${battleResult.loserDice[0]} + ${battleResult.loserDice[1]})</span>`;
                }
                
                // 显示迦太基战后影响
                const carthageMoraleEl = document.getElementById('carthage-morale-change');
                const carthageLossEl = document.getElementById('carthage-loss-detail');
                
                if (winner === 'carthage') {
                    carthageMoraleEl.innerHTML = `📈 士气：<span style="color: #2ecc71;">增长至 5</span>`;
                    carthageLossEl.innerHTML = `💀 兵力损失：<span style="color: #f39c12;">${battleResult.winnerLossPercent.toFixed(1)}%</span> <span style="color: #95a5a6;">(投掷骰子: ${battleResult.winnerDice})</span>`;
                } else {
                    carthageMoraleEl.innerHTML = `📉 士气：<span style="color: #e74c3c;">降低至 1</span>`;
                    carthageLossEl.innerHTML = `💀 兵力损失：<span style="color: #e74c3c;">${battleResult.loserLossPercent.toFixed(1)}%</span> <span style="color: #95a5a6;">(投掷骰子: ${battleResult.loserDice[0]} + ${battleResult.loserDice[1]})</span>`;
                }
                
                // 记录到日志
                this.addGameLog(`\n⚔️ === 战后影响 ===`);
                if (winner === 'rome') {
                    this.addGameLog(`🏛️ 罗马（胜）：士气 → 5，兵力损失 ${battleResult.winnerLossPercent.toFixed(1)}% (D6: ${battleResult.winnerDice})`);
                    this.addGameLog(`🌊 迦太基（败）：士气 → 1，兵力损失 ${battleResult.loserLossPercent.toFixed(1)}% (2D6: ${battleResult.loserDice[0]}+${battleResult.loserDice[1]}=${battleResult.loserDice[0]+battleResult.loserDice[1]})`);
                } else {
                    this.addGameLog(`🌊 迦太基（胜）：士气 → 5，兵力损失 ${battleResult.winnerLossPercent.toFixed(1)}% (D6: ${battleResult.winnerDice})`);
                    this.addGameLog(`🏛️ 罗马（败）：士气 → 1，兵力损失 ${battleResult.loserLossPercent.toFixed(1)}% (2D6: ${battleResult.loserDice[0]}+${battleResult.loserDice[1]}=${battleResult.loserDice[0]+battleResult.loserDice[1]})`);
                }
                
                // 显示弹窗
                modal.classList.add('show');
                
                // 绑定重新开始按钮
                const restartBtn = document.getElementById('victory-restart-btn');
                restartBtn.onclick = () => {
                    modal.classList.remove('show');
                    this.resetGame();
                };
            }
            
            // 计算战后影响（士气和兵力损失）
            calculateBattleAftermath(winner) {
                // 胜利方：士气增长至5，损失D6%的兵力
                const winnerDice = Math.floor(Math.random() * 6) + 1;
                const winnerLossPercent = winnerDice;
                
                // 失败方：士气减少至1，损失(20+2D6)%的兵力
                const loserDice1 = Math.floor(Math.random() * 6) + 1;
                const loserDice2 = Math.floor(Math.random() * 6) + 1;
                const loserLossPercent = 20 + loserDice1 + loserDice2;
                
                return {
                    winner: winner,
                    winnerMorale: 5,
                    winnerLossPercent: winnerLossPercent,
                    winnerDice: winnerDice,
                    loserMorale: 1,
                    loserLossPercent: loserLossPercent,
                    loserDice: [loserDice1, loserDice2]
                };
            }

            // 判断两个单位是否接触（相邻）
            areUnitsAdjacent(unit1, unit2) {
                const size1 = this.getUnitSizeWithDirection(unit1);
                const size2 = this.getUnitSizeWithDirection(unit2);
                
                // 检查所有组合的格子，看是否有相邻的
                for (let y1 = unit1.y; y1 < unit1.y + size1.height; y1++) {
                    for (let x1 = unit1.x; x1 < unit1.x + size1.width; x1++) {
                        for (let y2 = unit2.y; y2 < unit2.y + size2.height; y2++) {
                            for (let x2 = unit2.x; x2 < unit2.x + size2.width; x2++) {
                                // 检查8个方向是否相邻
                                const dx = Math.abs(x1 - x2);
                                const dy = Math.abs(y1 - y2);
                                if ((dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                return false;
            }

            // 获取与单位接触的敌方单位列表
            getAdjacentEnemyUnits(unit) {
                return this.units.filter(u => 
                    u.faction !== unit.faction && 
                    // HP为0的单位（动摇状态）仍然可以在近战中被攻击
                    this.areUnitsAdjacent(unit, u)
                );
            }

            // 获取距离单位指定范围内的友方单位
            getUnitsInRange(unit, range, sameFaction = true) {
                const centerX = unit.x + Math.floor(this.getUnitSizeWithDirection(unit).width / 2);
                const centerY = unit.y + Math.floor(this.getUnitSizeWithDirection(unit).height / 2);
                
                return this.units.filter(u => {
                    if (u.id === unit.id) return false;
                    // HP为0的单位（动摇状态）仍然可以参与战斗和支援
                    if (sameFaction && u.faction !== unit.faction) return false;
                    if (!sameFaction && u.faction === unit.faction) return false;
                    
                    const targetCenterX = u.x + Math.floor(this.getUnitSizeWithDirection(u).width / 2);
                    const targetCenterY = u.y + Math.floor(this.getUnitSizeWithDirection(u).height / 2);
                    
                    const distance = this.getDistance(centerX, centerY, targetCenterX, targetCenterY);
                    return distance <= range;
                });
            }

            // 获取可作为支援的单位
            getAvailableSupportUnits(targetUnit, range = 3) {
                return this.getUnitsInRange(targetUnit, range, true).filter(u => 
                    u.combatStatus === 'not_engaged' && 
                    !u.hasMeleeAttacked &&
                    u.id !== targetUnit.id && // 排除目标单位本身
                    u.id !== this.meleeAttacker?.id && // 排除冲锋单位
                    u.id !== this.meleeTarget?.id // 排除被攻击单位
                );
            }
        }

        // 启动游戏
        const game = new HexGame();
        
        // 添加全局错误处理
        window.addEventListener('error', function(e) {
            console.error('JavaScript错误:', e.error);
        });

