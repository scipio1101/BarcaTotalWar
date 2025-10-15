/**
 * AI控制器模块
 * 用于自动控制罗马或迦太基阵营的军队行动
 */

const AIController = {
    // 辅助函数：获取城市中文名
    getCityName(cityId) {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : cityId;
    },

    // AI配置
    config: {
        enabled: false,           // AI是否启用
        controlledFaction: null,  // AI控制的阵营 ('rome' 或 'carthage')
        aggressiveness: 0.6,      // 进攻倾向 (0-1)
        economicFocus: 0.4,       // 经济重视度 (0-1)
        autoDelay: 1000,          // 自动操作延迟（毫秒）
        debugMode: false,         // 调试模式
        paused: false,            // 是否暂停AI执行（用于战斗时）
        pauseResolve: null        // 暂停恢复的Promise resolver
    },

    // 军队行动历史（避免来回移动）
    armyHistory: {},  // { armyId: { lastLocation: cityId, actionCount: number, detoured: boolean } }

    // 军队在城市的停留记录
    armyStayHistory: {},  // { armyId: { cityId: string, stayTurns: number, firstStayTurn: number } }

    // 军队回合计划（下回合计划）
    armyPlans: {},  // { armyId: { nextTurnPlan: decision, createdTurn: number, reason: string } }

    // 本回合借款标记
    borrowedThisTurn: false,
    currentTurnForBorrow: 0,

    // 失去的城市记录（阵营专属）
    lostCities: {
        rome: {},      // { cityId: { lostTurn: number, lostTo: faction, importance: number, cityData: {} } }
        carthage: {}
    },

    // 军队收复城市的责任权重
    recaptureWeights: {
        rome: {},      // { armyId: { cityId: weight } }
        carthage: {}
    },

    // 罗马战略目标配置
    romeStrategicGoals: {
        // 首要目标：保卫罗马城
        defenseCapital: {
            cityId: 'rome',
            priority: 1000,  // 最高优先级
            defensiveRadius: 2,  // 防御半径（步数）
            description: '保卫罗马城'
        },
        // 重要进攻目标（按优先级排序）
        offensiveTargets: [
            { cityId: 'carthage', priority: 600, description: '攻陷迦太基城' },
            { cityId: 'newcarthage', priority: 600, description: '攻陷新迦太基城' },
        ],
        // 西班牙地区城市（战略目标）
        spainRegion: {
            cityIds: ['gades', 'emerita', 'asturica', 'corduba', 'toletum', 
                     'newcarthage', 'sagunto', 'bilibilis', 'budilragus', 'taraco'],
            priority: 500,
            description: '占领西班牙地区'
        }
    },

    // 启用AI控制
    enable(faction = 'rome') {
        // 【修改】AIController现在只控制罗马
        this.config.enabled = true;
        this.config.controlledFaction = 'rome';
        // addLog(`🤖 罗马AI已启用`, 'system');
        
        // 初始化失去城市记录
        this.initializeCityTracking('rome');
        
        this.updateUI();
    },

    // 禁用AI控制
    disable() {
        this.config.enabled = false;
        // addLog('🤖 罗马AI已禁用', 'system');
        this.updateUI();
    },

    // 切换AI控制
    toggle(faction = 'rome') {
        // 【修改】AIController现在只控制罗马
        if (this.config.enabled) {
            this.disable();
        } else {
            this.enable('rome');
        }
    },

    // 检查是否应该由AI控制当前回合
    shouldControl() {
        return this.config.enabled && 
               this.config.controlledFaction === gameState.currentPlayer;
    },

    // 更新UI显示
    updateUI() {
        const aiStatusElement = document.getElementById('aiStatus');
        if (aiStatusElement) {
            // 【修改】显示所有启用的AI
            const enabledAIs = [];
            if (this.config.enabled) enabledAIs.push('罗马');
            if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) enabledAIs.push('迦太基');
            if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) enabledAIs.push('马其顿');
            if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) enabledAIs.push('塞琉古');
            if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) enabledAIs.push('托勒密');
            
            if (enabledAIs.length > 0) {
                aiStatusElement.textContent = `AI控制: ${enabledAIs.join('、')}`;
                aiStatusElement.style.color = '#2ecc71';
            } else {
                aiStatusElement.textContent = 'AI: 关闭';
                aiStatusElement.style.color = '#95a5a6';
            }
        }
    },

    // ==================== 联盟系统（支持马其顿联盟）====================

    /**
     * 判断是否与马其顿结盟
     */
    isAlliedWithMacedonia() {
        if (typeof MacedoniaAIController === 'undefined') return false;
        return MacedoniaAIController.config.alliance === this.config.controlledFaction;
    },

    /**
     * 判断是否与塞琉古结盟
     */
    isAlliedWithSeleucid() {
        if (typeof SeleucidAIController === 'undefined') return false;
        return SeleucidAIController.config.alliance === this.config.controlledFaction;
    },

    /**
     * 判断是否与托勒密结盟
     */
    isAlliedWithPtolemy() {
        if (typeof PtolemyAIController === 'undefined') return false;
        return PtolemyAIController.config.alliance === this.config.controlledFaction;
    },

    /**
     * 判断指定阵营是否为盟友
     */
    isAlly(faction) {
        if (faction === this.config.controlledFaction) return true;
        if (faction === 'macedonia' && this.isAlliedWithMacedonia()) return true;
        if (faction === 'seleucid' && this.isAlliedWithSeleucid()) return true;
        if (faction === 'ptolemy' && this.isAlliedWithPtolemy()) return true;
        return false;
    },

    /**
     * 判断指定阵营是否为敌人
     */
    isEnemy(faction) {
        if (faction === this.config.controlledFaction) return false;
        if (this.isAlly(faction)) return false;
        return true;
    },

    /**
     * 获取当前敌对阵营列表
     */
    getEnemyFactions() {
        const myFaction = this.config.controlledFaction;
        const enemies = [];
        
        if (myFaction === 'rome') {
            enemies.push('carthage');
            // 如果马其顿不是盟友，也是敌人
            if (!this.isAlliedWithMacedonia()) {
                enemies.push('macedonia');
            }
            // 如果塞琉古不是盟友，也是敌人
            if (!this.isAlliedWithSeleucid()) {
                enemies.push('seleucid');
            }
            // 如果托勒密不是盟友，也是敌人
            if (!this.isAlliedWithPtolemy()) {
                enemies.push('ptolemy');
            }
        } else if (myFaction === 'carthage') {
            enemies.push('rome');
            if (!this.isAlliedWithMacedonia()) {
                enemies.push('macedonia');
            }
            if (!this.isAlliedWithSeleucid()) {
                enemies.push('seleucid');
            }
            if (!this.isAlliedWithPtolemy()) {
                enemies.push('ptolemy');
            }
        }
        
        return enemies;
    },

    /**
     * 获取盟友阵营（返回所有盟友列表）
     */
    getAllyFaction() {
        const allies = [];
        if (this.isAlliedWithMacedonia()) allies.push('macedonia');
        if (this.isAlliedWithSeleucid()) allies.push('seleucid');
        if (this.isAlliedWithPtolemy()) allies.push('ptolemy');
        return allies.length > 0 ? allies : null;
    },

    /**
     * 判断城市是否为友方（包括己方和联盟）
     */
    isFriendlyCity(city) {
        if (!city) return false;
        
        if (city.faction === this.config.controlledFaction) {
            return true; // 己方城市
        }
        
        // 检查是否为联盟城市
        const allyFactions = this.getAllyFaction();
        if (allyFactions && Array.isArray(allyFactions) && allyFactions.includes(city.faction)) {
            return true; // 联盟城市
        }
        
        return false;
    },

    /**
     * 判断城市是否为敌方（排除己方、联盟和中立）
     */
    isEnemyCity(city) {
        if (!city) return false;
        
        if (this.isFriendlyCity(city)) {
            return false;
        }
        if (city.faction === 'neutral') {
            return false;
        }
        return true;
    },

    // ==================== 失去城市追踪系统 ====================

    /**
     * 初始化城市追踪（记录初始控制的城市）
     */
    initializeCityTracking(faction) {
        // 记录初始控制的城市作为基准
        cities.forEach(city => {
            if (city.faction === faction) {
                // 初始时不记录为失去的城市，仅作为参考
                if (!this.lostCities[faction]) {
                    this.lostCities[faction] = {};
                }
            }
        });
        // addLog(`📊 ${faction === 'rome' ? '罗马' : '迦太基'}城市追踪系统已初始化`, 'info');
    },

    /**
     * 检查并记录城市阵营变化
     * 应在每回合开始时调用
     */
    checkCityChanges(faction) {
        const currentCities = cities.filter(c => c.faction === faction);
        const lostCitiesRecord = this.lostCities[faction];
        
        // 检查是否有城市被夺回
        Object.keys(lostCitiesRecord).forEach(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (city && city.faction === faction) {
                // 城市被夺回
                const lostData = lostCitiesRecord[cityId];
                // addLog(`🎉 ${city.name}已夺回！（曾在第${lostData.lostTurn}回合失守${gameState.turn - lostData.lostTurn}回合）`, faction);
                delete lostCitiesRecord[cityId];
                
                // 清除该城市的所有收复权重
                Object.keys(this.recaptureWeights[faction]).forEach(armyId => {
                    if (this.recaptureWeights[faction][armyId][cityId]) {
                        delete this.recaptureWeights[faction][armyId][cityId];
                    }
                });
            }
        });
        
        // 检查是否有新的城市失守
        cities.forEach(city => {
            // 如果城市之前属于本阵营，现在不属于了
            if (city.previousFaction === faction && city.faction !== faction && !lostCitiesRecord[city.id]) {
                // 记录失去的城市
                this.recordLostCity(faction, city);
            }
        });
    },

    /**
     * 记录失去的城市
     */
    recordLostCity(faction, city) {
        const importance = (city.politicalScore || 0) + (city.economicScore || 0) + (city.important ? 20 : 0);
        
        this.lostCities[faction][city.id] = {
            lostTurn: gameState.turn,
            lostTo: city.faction,
            importance: importance,
            cityData: {
                name: city.name,
                political: city.politicalScore,
                economic: city.economicScore,
                important: city.important
            }
        };
        
        const factionName = faction === 'rome' ? '罗马' : '迦太基';
        const lostToName = city.faction === 'rome' ? '罗马' : city.faction === 'carthage' ? '迦太基' : '中立';
        // addLog(`💔 ${factionName}失去了${city.name}（转为${lostToName}），重要度${importance}`, faction);
        
        // 计算所有军队对该城市的收复权重
        this.calculateRecaptureWeights(faction, city.id);
    },

    /**
     * 计算军队对失去城市的收复权重
     * 权重基于距离：距离越近，权重越高
     */
    calculateRecaptureWeights(faction, lostCityId) {
        const factionArmies = armies[faction] || [];
        const lostCityData = this.lostCities[faction][lostCityId];
        
        if (!lostCityData) return;
        
        factionArmies.forEach(army => {
            if (!this.recaptureWeights[faction][army.id]) {
                this.recaptureWeights[faction][army.id] = {};
            }
            
            const distance = this.calculateDistance(army.location, lostCityId);
            
            // 权重计算公式：
            // 基础权重 = 城市重要度 × (10 - 距离) / 10
            // 距离0: 权重最高
            // 距离10+: 权重接近0
            let weight = 0;
            if (distance <= 10) {
                weight = lostCityData.importance * (10 - distance) / 10;
            } else {
                weight = lostCityData.importance * 0.1; // 距离太远，权重很低
            }
            
            // 特殊情况：如果是重要城市，增加权重
            if (lostCityData.cityData.important) {
                weight *= 1.5;
            }
            
            this.recaptureWeights[faction][army.id][lostCityId] = Math.floor(weight);
            
            // addLog(`   📍 ${army.commander}对收复${lostCityData.cityData.name}的权重: ${Math.floor(weight)} (距离${distance}步)`, 'info');
        });
    },

    /**
     * 获取军队应优先收复的城市
     * 权重会根据失守时间动态调整：前12回合递增，之后递减
     */
    getPriorityRecaptureTarget(army, faction) {
        const armyWeights = this.recaptureWeights[faction]?.[army.id];
        if (!armyWeights || Object.keys(armyWeights).length === 0) {
            return null;
        }
        
        // 找到权重最高的失去城市（考虑时间因素）
        let bestCityId = null;
        let bestWeight = 0;
        
        Object.keys(armyWeights).forEach(cityId => {
            // 检查城市是否仍然失守
            const city = cities.find(c => c.id === cityId);
            if (!city || city.faction === faction) return;
            
            const baseWeight = armyWeights[cityId];  // 基础权重（失守时计算的）
            const lostCityData = this.lostCities[faction][cityId];
            
            if (!lostCityData) return;
            
            // 计算失守回合数
            const turnsLost = gameState.turn - lostCityData.lostTurn;
            
            // 时间系数计算：
            // 1-12回合：每回合增加8.33%（第12回合达到200%）
            // 13+回合：每回合减少8.33%（第24回合降至100%，第36回合降至0%）
            let timeFactor = 1.0;
            
            if (turnsLost <= 12) {
                // 前12回合：从1.0递增到2.0
                timeFactor = 1.0 + (turnsLost / 12.0);
            } else {
                // 第13回合开始：从2.0递减
                const decayTurns = turnsLost - 12;
                timeFactor = 2.0 - (decayTurns / 12.0);
                // 最低降至0.1，不完全归零
                timeFactor = Math.max(0.1, timeFactor);
            }
            
            // 应用时间系数
            const adjustedWeight = Math.floor(baseWeight * timeFactor);
            
            if (adjustedWeight > bestWeight) {
                bestWeight = adjustedWeight;
                bestCityId = cityId;
            }
        });
        
        if (bestCityId) {
            const lostCityData = this.lostCities[faction][bestCityId];
            const turnsLost = gameState.turn - lostCityData.lostTurn;
            
            return {
                cityId: bestCityId,
                weight: bestWeight,
                cityData: lostCityData,
                turnsLost: turnsLost  // 添加失守回合数信息
            };
        }
        
        return null;
    },

    // ==================== 评估系统 ====================
    
    /**
     * 检查军队最近两回合是否有撤退或绕路行为
     * @param {Object} army - 军队对象
     * @returns {Object} { hasRetreatOrDetour: boolean, reason: string }
     */
    checkRecentRetreatOrDetour(army) {
        const currentTurn = gameState.currentTurn || 0;
        
        // 检查本回合是否有撤退标记
        if (army.retreatedThisTurn) {
            return {
                hasRetreatOrDetour: true,
                reason: '上回合进行了撤退'
            };
        }
        
        // 检查armyHistory中的绕路记录
        const history = this.armyHistory[army.id];
        if (history && history.detoured) {
            return {
                hasRetreatOrDetour: true,
                reason: '上回合进行了绕路'
            };
        }
        
        // 检查recentActions数组（最近两回合）
        if (history && history.recentActions && history.recentActions.length > 0) {
            for (const action of history.recentActions) {
                if (action.detoured || action.retreated) {
                    const turnDiff = currentTurn - action.turn;
                    if (turnDiff <= 2) {
                        const actionType = action.retreated ? '撤退' : '绕路';
                        return {
                            hasRetreatOrDetour: true,
                            reason: `${turnDiff}回合前进行了${actionType}`
                        };
                    }
                }
            }
        }
        
        return {
            hasRetreatOrDetour: false,
            reason: ''
        };
    },
    
    /**
     * 更新军队行动历史（记录撤退和绕路）
     * @param {Object} army - 军队对象
     * @param {boolean} detoured - 是否绕路
     * @param {boolean} retreated - 是否撤退
     */
    updateArmyActionHistory(army, detoured, retreated) {
        const currentTurn = gameState.currentTurn || 0;
        
        if (!this.armyHistory[army.id]) {
            this.armyHistory[army.id] = {
                lastLocation: army.location,
                actionCount: 0,
                detoured: detoured,
                recentActions: []
            };
        }
        
        const history = this.armyHistory[army.id];
        
        // 更新当前状态
        history.detoured = detoured;
        
        // 添加到历史记录
        if (!history.recentActions) {
            history.recentActions = [];
        }
        
        // 添加新记录
        history.recentActions.push({
            turn: currentTurn,
            detoured: detoured,
            retreated: retreated || army.retreatedThisTurn || false
        });
        
        // 只保留最近3回合的记录
        if (history.recentActions.length > 3) {
            history.recentActions.shift();
        }
        
        // 清除军队的撤退标记（已记录到历史中）
        if (army.retreatedThisTurn) {
            delete army.retreatedThisTurn;
        }
    },
    
    /**
     * 评估当前局势（增加联盟支持）
     */
    evaluateSituation() {
        const faction = this.config.controlledFaction;
        const enemyFaction = faction === 'rome' ? 'carthage' : 'rome';
        const allArmies = getAllArmies();
        const enemyFactions = this.getEnemyFactions();
        
        // 收集所有盟友军队
        let allyArmies = [];
        if (this.isAlliedWithMacedonia()) {
            allyArmies = allyArmies.concat(armies.macedonia || []);
        }
        if (this.isAlliedWithSeleucid()) {
            allyArmies = allyArmies.concat(armies.seleucid || []);
        }
        if (this.isAlliedWithPtolemy()) {
            allyArmies = allyArmies.concat(armies.ptolemy || []);
        }
        
        return {
            myFaction: faction,
            currentTurn: gameState.turn,
            myArmies: armies[faction] || [],
            enemyArmies: allArmies.filter(a => enemyFactions.includes(a.faction)),
            allyArmies: allyArmies,
            myCities: cities.filter(c => c.faction === faction),
            enemyCities: cities.filter(c => c.faction === enemyFaction),
            neutralCities: cities.filter(c => c.faction === 'neutral'),
            myFunds: faction === 'rome' ? gameState.romeFunds : gameState.carthageFunds,
            enemyFunds: faction === 'rome' ? gameState.carthageFunds : gameState.romeFunds,
            myDebt: faction === 'rome' ? gameState.romeDebt : gameState.carthageDebt,
            myTotalMilitaryPower: this.calculateTotalMilitaryPower(faction),
            enemyTotalMilitaryPower: this.calculateTotalMilitaryPower(enemyFaction),
            isAlliedWithMacedonia: this.isAlliedWithMacedonia(),
            isAlliedWithSeleucid: this.isAlliedWithSeleucid(),
            isAlliedWithPtolemy: this.isAlliedWithPtolemy(),
            allyFaction: this.getAllyFaction()
        };
    },

    /**
     * 计算阵营总军事实力
     */
    calculateTotalMilitaryPower(faction) {
        const factionArmies = armies[faction] || [];
        return factionArmies.reduce((total, army) => {
            return total + calculateCombatPower(army);
        }, 0);
    },

    /**
     * 评估城市价值
     */
    evaluateCityValue(city) {
        let value = 0;
        
        // 经济价值
        value += (city.economicScore || 0) * 2;
        
        // 政治价值
        value += (city.politicalScore || 0) * 1.5;
        
        // 重要城市额外加分
        if (city.important) {
            value += 50;
        }
        
        // 工事等级降低价值（难攻打）
        value -= (city.fortificationLevel || 0) * 10;
        
        return value;
    },

    /**
     * 评估军队到城市的威胁程度
     */
    evaluateThreat(army, city) {
        const distance = this.calculateDistance(army.location, city.id);
        const armyPower = calculateCombatPower(army);
        
        // 距离越近，威胁越大
        const distanceFactor = Math.max(0, 1 - distance / 5);
        
        return armyPower * distanceFactor;
    },

    /**
     * 检查两个城市之间是否是海路连接
     */
    isSeaRoute(cityId1, cityId2) {
        for (const route of routes) {
            if (Array.isArray(route)) {
                // 普通陆路连接：['city1', 'city2']
                continue;
            } else if (route.type === 'sea') {
                // 海路连接：{from: 'city1', to: 'city2', type: 'sea'}
                if ((route.from === cityId1 && route.to === cityId2) ||
                    (route.from === cityId2 && route.to === cityId1)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * 计算两个城市之间的距离（通过路径）
     * 海路连接按3倍长度计算
     */
    calculateDistance(cityId1, cityId2) {
        if (cityId1 === cityId2) return 0;
        
        // 简单的BFS查找最短路径
        const visited = new Set();
        const queue = [[cityId1, 0]];
        
        while (queue.length > 0) {
            const [currentCity, distance] = queue.shift();
            
            if (currentCity === cityId2) {
                return distance;
            }
            
            if (visited.has(currentCity)) continue;
            visited.add(currentCity);
            
            const connected = getConnectedCities(currentCity);
            for (const nextCity of connected) {
                if (!visited.has(nextCity)) {
                    // 海路连接距离为3，普通连接距离为1
                    const stepDistance = this.isSeaRoute(currentCity, nextCity) ? 3 : 1;
                    queue.push([nextCity, distance + stepDistance]);
                }
            }
        }
        
        return 999; // 无法到达
    },

    /**
     * 查找从起点到终点的最短路径
     * 返回完整路径数组，如果无法到达则返回null
     */
    findPath(startCityId, endCityId) {
        if (startCityId === endCityId) return [startCityId];
        
        // 使用带权重的搜索（考虑海路3倍成本）
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // 初始化所有城市
        cities.forEach(city => {
            distances.set(city.id, Infinity);
            unvisited.add(city.id);
        });
        distances.set(startCityId, 0);

        while (unvisited.size > 0) {
            // 找到未访问节点中距离最小的
            let currentCity = null;
            let minDistance = Infinity;
            for (const cityId of unvisited) {
                const dist = distances.get(cityId);
                if (dist < minDistance) {
                    minDistance = dist;
                    currentCity = cityId;
                }
            }

            if (currentCity === null || minDistance === Infinity) {
                break; // 无法到达
            }

            if (currentCity === endCityId) {
                // 找到目标，重建路径
                const path = [];
                let current = endCityId;
                while (current) {
                    path.unshift(current);
                    current = previous.get(current);
                }
                return path;
            }

            unvisited.delete(currentCity);

            const connectedCities = getConnectedCities(currentCity);
            for (const nextCity of connectedCities) {
                if (!unvisited.has(nextCity)) {
                    continue;
                }

                // 计算到下一个城市的成本（海路3倍，陆路1倍）
                const edgeCost = this.isSeaRoute(currentCity, nextCity) ? 3 : 1;
                const newDistance = distances.get(currentCity) + edgeCost;

                if (newDistance < distances.get(nextCity)) {
                    distances.set(nextCity, newDistance);
                    previous.set(nextCity, currentCity);
                }
            }
        }
        
        return null; // 无法到达
    },

    /**
     * 寻找路径，可以排除某些城市（用于绕路）
     * 使用带权重的搜索，考虑海路3倍成本
     * @param {string} startCityId - 起点城市ID
     * @param {string} endCityId - 终点城市ID
     * @param {Set} excludedCities - 要排除的城市ID集合
     * @returns {Array|null} - 路径数组或null
     */
    findPathWithExclusions(startCityId, endCityId, excludedCities = new Set()) {
        if (startCityId === endCityId) return [startCityId];
        
        // 使用带权重的搜索（考虑海路3倍成本）
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // 初始化所有城市
        cities.forEach(city => {
            // 跳过被排除的城市（但不排除起点和终点）
            if (excludedCities.has(city.id) && city.id !== startCityId && city.id !== endCityId) {
                return;
            }
            distances.set(city.id, Infinity);
            unvisited.add(city.id);
        });
        distances.set(startCityId, 0);

        while (unvisited.size > 0) {
            // 找到未访问节点中距离最小的
            let currentCity = null;
            let minDistance = Infinity;
            for (const cityId of unvisited) {
                const dist = distances.get(cityId);
                if (dist < minDistance) {
                    minDistance = dist;
                    currentCity = cityId;
                }
            }

            if (currentCity === null || minDistance === Infinity) {
                break; // 无法到达
            }

            if (currentCity === endCityId) {
                // 找到目标，重建路径
                const path = [];
                let current = endCityId;
                while (current) {
                    path.unshift(current);
                    current = previous.get(current);
                }
                return path;
            }

            unvisited.delete(currentCity);

            const connectedCities = getConnectedCities(currentCity);
            for (const nextCity of connectedCities) {
                if (!unvisited.has(nextCity)) {
                    continue;
                }

                // 跳过被排除的城市（但不排除终点）
                if (excludedCities.has(nextCity) && nextCity !== endCityId) {
                    continue;
                }

                // 计算到下一个城市的成本（海路3倍，陆路1倍）
                const edgeCost = this.isSeaRoute(currentCity, nextCity) ? 3 : 1;
                const newDistance = distances.get(currentCity) + edgeCost;

                if (newDistance < distances.get(nextCity)) {
                    distances.set(nextCity, newDistance);
                    previous.set(nextCity, currentCity);
                }
            }
        }
        
        return null; // 无法到达
    },

    /**
     * 获取通往目标城市的下一步（相邻城市）
     */
    getNextStepToTarget(currentCityId, targetCityId) {
        const path = this.findPath(currentCityId, targetCityId);
        if (!path || path.length < 2) {
            return null; // 无法到达或已在目标
        }
        return path[1]; // 返回路径上的下一个城市（第一个是当前城市）
    },

    /**
     * 评估罗马战略目标的重要性
     */
    evaluateRomeStrategicValue(cityId, situation) {
        if (this.config.controlledFaction !== 'rome') {
            return { value: 0, reason: '' };
        }

        const goals = this.romeStrategicGoals;
        
        // 1. 检查是否需要保卫罗马城
        if (cityId === goals.defenseCapital.cityId) {
            const romeCity = cities.find(c => c.id === goals.defenseCapital.cityId);
            if (romeCity && romeCity.faction === 'rome') {
                // 检查罗马是否受到威胁
                const threats = situation.enemyArmies.filter(e => {
                    const dist = this.calculateDistance(e.location, goals.defenseCapital.cityId);
                    return dist <= goals.defenseCapital.defensiveRadius;
                });
                
                if (threats.length > 0) {
                    return {
                        value: goals.defenseCapital.priority,
                        reason: `罗马城受威胁(${threats.length}支敌军接近)，必须保卫首都`
                    };
                }
            }
        }

        // 2. 检查是否是重要进攻目标
        for (const target of goals.offensiveTargets) {
            if (cityId === target.cityId) {
                const targetCity = cities.find(c => c.id === target.cityId);
                if (targetCity && targetCity.faction !== 'rome') {
                    return {
                        value: target.priority,
                        reason: `战略目标: ${target.description}`
                    };
                }
            }
        }

        // 3. 检查是否是西班牙地区城市
        if (goals.spainRegion.cityIds.includes(cityId)) {
            const targetCity = cities.find(c => c.id === cityId);
            if (targetCity && targetCity.faction !== 'rome') {
                // 计算西班牙地区已控制城市数
                const controlledSpainCities = goals.spainRegion.cityIds.filter(id => {
                    const city = cities.find(c => c.id === id);
                    return city && city.faction === 'rome';
                }).length;
                
                const totalSpainCities = goals.spainRegion.cityIds.length;
                const controlPercentage = (controlledSpainCities / totalSpainCities * 100).toFixed(0);
                
                return {
                    value: goals.spainRegion.priority,
                    reason: `西班牙战略(已控制${controlledSpainCities}/${totalSpainCities}座,${controlPercentage}%)`
                };
            }
        }

        return { value: 0, reason: '' };
    },

    /**
     * 评估敌军对罗马城的威胁等级
     * 只有3步以内才算威胁，分4个等级
     */
    evaluateThreatToRome(enemyArmy) {
        const distance = this.calculateDistance(enemyArmy.location, 'rome');
        
        // 距离超过3步，不构成威胁
        if (distance > 3) {
            return null;
        }
        
        const power = calculateCombatPower(enemyArmy);
        
        let threatLevel = '';
        let threatScore = 0;
        let urgency = '';
        
        if (distance === 0) {
            // 距离0步：极危威胁（已在罗马城）
            threatLevel = '⚠️极危';
            threatScore = 1000;
            urgency = '敌军已在罗马城！';
        } else if (distance === 1) {
            // 距离1步：极高威胁
            threatLevel = '🔴极高';
            threatScore = 500;
            urgency = '敌军即将抵达！';
        } else if (distance === 2) {
            // 距离2步：高威胁
            threatLevel = '🟠高';
            threatScore = 300;
            urgency = '敌军迫近！';
        } else if (distance === 3) {
            // 距离3步：中等威胁
            threatLevel = '🟡中';
            threatScore = 150;
            urgency = '敌军接近中';
        }
        
        // 威胁分数 = 基础分数 × 敌军战力系数
        const powerFactor = Math.max(1, power / 300); // 战力300为基准
        threatScore = Math.floor(threatScore * powerFactor);
        
        return {
            army: enemyArmy,
            distance: distance,
            power: power,
            threatLevel: threatLevel,
            threatScore: threatScore,
            urgency: urgency
        };
    },

    /**
     * 更新军队停留记录
     */
    updateArmyStayHistory(army) {
        const currentLocation = army.location;
        const armyId = army.id;
        
        if (!this.armyStayHistory[armyId]) {
            // 首次记录
            this.armyStayHistory[armyId] = {
                cityId: currentLocation,
                stayTurns: 1,
                firstStayTurn: gameState.turn
            };
        } else {
            const stayRecord = this.armyStayHistory[armyId];
            if (stayRecord.cityId === currentLocation) {
                // 继续停留在同一城市
                stayRecord.stayTurns++;
            } else {
                // 移动到新城市，重置记录
                stayRecord.cityId = currentLocation;
                stayRecord.stayTurns = 1;
                stayRecord.firstStayTurn = gameState.turn;
            }
        }
    },

    /**
     * 判断当前军队是否是距离新迦太基最近的2支罗马军队之一
     */
    isClosestToNewCarthage(army, situation) {
        if (this.config.controlledFaction !== 'rome') return false;
        
        const targetCityId = 'newcarthage';
        const myDistance = this.calculateDistance(army.location, targetCityId);
        
        // 计算所有罗马军队到新迦太基的距离
        const armyDistances = situation.myArmies.map(a => ({
            army: a,
            distance: this.calculateDistance(a.location, targetCityId)
        }));
        
        // 按距离排序（距离相同时，ID小的优先）
        armyDistances.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance;
            }
            return a.army.id.localeCompare(b.army.id);
        });
        
        // 判断当前军队是否在前2名
        const top2 = armyDistances.slice(0, 2);
        const isInTop2 = top2.some(item => item.army.id === army.id);
        
        if (isInTop2) {
            const rank = top2.findIndex(item => item.army.id === army.id) + 1;
            // addLog(`   🎯 ${army.commander}是第${rank}近的部队（距新迦太基${myDistance}步）`, 'info');
        }
        
        return isInTop2;
    },

    /**
     * 新迦太基战略决策
     * 为距离新迦太基最近的2支罗马军队制定专门策略
     */
    evaluateNewCarthageStrategy(army, situation) {
        if (this.config.controlledFaction !== 'rome') return null;
        
        // 【最高优先级】检查最近两回合是否有撤退或绕路，若有则优先整编/征召
        const retreatDetourCheck = this.checkRecentRetreatOrDetour(army);
        if (retreatDetourCheck.hasRetreatOrDetour) {
            if (army.morale < 5) {
                return {
                    type: 'reorganize',
                    priority: 9999,  // 最高优先级
                    reason: `${retreatDetourCheck.reason}，优先整编恢复战力`
                };
            } else if (situation.myFunds >= 200) {
                return {
                    type: 'recruit',
                    priority: 9999,  // 最高优先级
                    reason: `${retreatDetourCheck.reason}，优先征召增强兵力`
                };
            } else {
                return {
                    type: 'reorganize',
                    priority: 9999,  // 最高优先级
                    reason: `${retreatDetourCheck.reason}，优先整编提升士气`
                };
            }
        }
        
        const targetCityId = 'newcarthage';
        const targetCity = cities.find(c => c.id === targetCityId);
        
        if (!targetCity) return null;
        
        // 如果新迦太基已经是罗马或联盟控制，不需要特殊策略
        if (this.isFriendlyCity(targetCity)) return null;
        
        // 判断是否是距离最近的2支军队之一
        if (!this.isClosestToNewCarthage(army, situation)) return null;
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = 350; // 新迦太基战略基础优先级（高于一般移动，低于保卫罗马）
        
        // 检查是否有敌军在当前位置
        const enemyFaction = 'carthage';
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 5. 若有敌方军队，根据综合战力进行判定
        if (enemiesAtLocation.length > 0) {
            // 使用综合战力评估
            const myFaction = 'rome';
            const enemyFaction = 'carthage';
            const myResult = this.calculateComprehensivePower(army, army.location, myFaction);
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
            const enemyPower = enemyResult.totalPower;
            
            if (myPower > enemyPower * 1) {
                // 综合优势，进攻
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【新迦太基战略】在${this.getCityName(army.location)}消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // 综合劣势，考虑整编或撤退
                if (army.morale < 4) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 30,
                        reason: `【新迦太基战略】综合劣势，整编后再战(${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                    };
                }
                // 不做特殊决策，让常规逻辑处理
                return null;
            }
        }
        
        // 1. 若当前位于友方城市（己方或联盟），优先向新迦太基移动
        if (this.isFriendlyCity(currentCity)) {
            const connectedCities = getConnectedCities(army.location);
            
            // 6. 使用综合战力评估检查移动目标（直接调用已更新的全局函数）
            const checkTargetForEnemies = (targetId) => {
                const enemyCheck = this.checkEnemyAtTarget(army, targetId);
                // 转换为本地格式
                if (enemyCheck.canMove) {
                    return { 
                        canMove: true, 
                        hasEnemy: enemyCheck.powerGap !== 0,
                        shouldAttack: enemyCheck.powerGap < 0,
                        reason: enemyCheck.reason || null
                    };
                } else if (enemyCheck.shouldReinforce) {
                        return {
                            canMove: false,
                            needImprove: true,
                        powerGap: enemyCheck.powerGap,
                        reason: enemyCheck.reason
                        };
                    } else {
                        return { 
                            canMove: false,
                            needImprove: false,
                        powerGap: enemyCheck.powerGap,
                        reason: enemyCheck.reason
                        };
                }
            };
            
            if (connectedCities.includes(targetCityId)) {
                // 相邻新迦太基，检查是否有敌军
                const checkResult = checkTargetForEnemies(targetCityId);
                
                if (checkResult.canMove) {
                    if (checkResult.shouldAttack) {
                        // addLog(`   ⚔️ ${this.getCityName(targetCityId)}有敌军，我方优势，移动后将攻击`, 'info');
                    }
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 100,
                        reason: `【新迦太基战略】向新迦太基进军(距离${distance}步${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`
                    };
                } else if (checkResult.needImprove) {
                    // 实力差距小，优先征召或整编
                    // addLog(`   💪 ${checkResult.reason}`, 'info');
                    
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【新迦太基战略】整编提升战力(差距${checkResult.powerGap}，目标新迦太基)`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 95,
                            reason: `【新迦太基战略】征召增强兵力(差距${checkResult.powerGap}，目标新迦太基)`
                        };
                    } else {
                        // 资金不足，整编
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【新迦太基战略】整编提升战力(差距${checkResult.powerGap}，目标新迦太基)`
                        };
                    }
                } else {
                    // addLog(`   ⚠️ ${checkResult.reason}`, 'warning');
                    // 新迦太基有强敌且差距过大，不做特殊决策
                    return null;
                }
            } else {
                // 不相邻，尝试寻找可通行的路径（包括次短路径）
                const excludedCities = new Set(); // 被强敌阻断的城市
                let attemptCount = 0;
                const maxAttempts = 5; // 最多尝试5条不同路径
                
                while (attemptCount < maxAttempts) {
                    attemptCount++;
                    
                    // 寻找路径，排除已知被阻断的城市
                    const path = this.findPathWithExclusions(army.location, targetCityId, excludedCities);
                    
                    if (!path || path.length <= 1) {
                        // 没有可用路径了
                        if (excludedCities.size > 0) {
                            // addLog(`   ❌ 所有路径均被强敌阻断（已排除${excludedCities.size}个城市），暂缓进军`, 'warning');
                        }
                        return null;
                    }
                    
                    const firstStep = path[1];
                    
                    // 调试信息：检查firstStep是否真的相邻
                    const connectedCities = getConnectedCities(army.location);
                    if (!connectedCities.includes(firstStep)) {
                        console.warn(`🔍 寻路异常：路径的下一步${firstStep}不在相邻城市列表中！`);
                        console.warn(`   当前位置: ${army.location}`);
                        console.warn(`   完整路径: ${path.join(' -> ')}`);
                        console.warn(`   相邻城市: ${connectedCities.join(', ')}`);
                        addLog(`   ⚠️ 罗马AI寻路异常：${this.getCityName(firstStep)}不是${this.getCityName(army.location)}的相邻城市`, 'warning');
                    }
                    
                    const checkResult = checkTargetForEnemies(firstStep);
                        
                        if (checkResult.canMove) {
                        // 第一步可以通过
                        
                        // 检查是否需要绕路（attemptCount > 1说明不是最短路径）
                        if (attemptCount > 1) {
                            // 检查上一回合是否已经绕路
                            const history = this.armyHistory[army.id];
                            if (history && history.detoured) {
                                // 连续两回合都需要绕路，优先整编/征召
                                // addLog(`   ⚠️ 连续两回合需要绕路，优先整编/征召而非继续绕路`, 'warning');
                                
                                if (army.morale < 5) {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                        reason: `【新迦太基战略】连续绕路受阻，整编提升战力`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 95,
                                        reason: `【新迦太基战略】连续绕路受阻，征召增强兵力`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                        reason: `【新迦太基战略】连续绕路受阻，整编备战`
                                    };
                                }
                            }
                            
                            // addLog(`   🔄 找到绕路方案（尝试${attemptCount}次）`, 'info');
                        }
                        
                            if (checkResult.shouldAttack) {
                            // addLog(`   ⚔️ ${this.getCityName(firstStep)}有敌军，我方优势，移动后将攻击`, 'info');
                            }
                        
                        // 标记本回合使用了绕路方案
                        const willDetour = attemptCount > 1;
                        
                            return {
                                type: 'move',
                            target: firstStep,
                                priority: basePriority + 100,
                            reason: `【新迦太基战略】向新迦太基进军(距离${distance}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`,
                            _detoured: willDetour // 内部标记，用于记录历史
                            };
                        } else if (checkResult.needImprove) {
                        // 第一步实力差距小，可以提升后再进
                        // addLog(`   💪 ${this.getCityName(firstStep)}: ${checkResult.reason}`, 'info');
                                
                                if (army.morale < 5) {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                reason: `【新迦太基战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 95,
                                reason: `【新迦太基战略】征召后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                reason: `【新迦太基战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                                    };
                                }
                            } else {
                        // 第一步有强敌，排除这个城市，尝试下一条路径
                        // addLog(`   ❌ ${this.getCityName(firstStep)}: ${checkResult.reason}，寻找绕路方案...`, 'info');
                        excludedCities.add(firstStep);
                        // 继续循环，尝试下一条路径
                    }
                }
                
                // 达到最大尝试次数
                // addLog(`   ❌ 已尝试${maxAttempts}条路径，均被强敌阻断，暂缓进军`, 'warning');
                    return null;
            }
        }
        
        // 2. 若当前位于中立城市，优先游说
        if (currentCity.faction === 'neutral') {
            // 3. 若位于中立城市的回合数大于6，优先进行围城
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 80,
                    reason: `【新迦太基战略】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                // 继续游说
                const attitude = currentCity.romeAttitude || 0;
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 90,
                    reason: `【新迦太基战略】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 4. 若位于敌方城市，优先进行围城
        if (currentCity.faction === 'carthage') {
            // 检查是否有敌军驻守
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【新迦太基战略】围攻敌城${this.getCityName(currentCity.id)}(向新迦太基进军途中)`
                };
            } else {
                // 有敌军，优先攻击
                const myPower = calculateCombatPower(army);
                const enemyPower = enemiesAtCity.reduce((sum, e) => sum + calculateCombatPower(e), 0);
                
                if (myPower > enemyPower * 1) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 90,
                        reason: `【新迦太基战略】消灭敌军后围城`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 判断是否是距离叙拉古最近的罗马军队（排除执行新迦太基战略的军队）
     */
    isClosestToSyracuse(army, situation) {
        if (this.config.controlledFaction !== 'rome') return false;
        
        const targetCityId = 'syracuse';
        const myDistance = this.calculateDistance(army.location, targetCityId);
        
        // 首先，如果自己正在执行新迦太基战略（前2名），就不执行叙拉古战略
        if (this.isClosestToNewCarthage(army, situation)) {
            return false;
        }
        
        // 检查其他罗马军队的距离（排除执行新迦太基战略的军队）
        for (const otherArmy of situation.myArmies) {
            if (otherArmy.id === army.id) continue;
            
            // 如果其他军队正在执行新迦太基战略，不参与叙拉古竞争
            if (this.isClosestToNewCarthage(otherArmy, situation)) {
                continue;
            }
            
            // 该军队不执行新迦太基战略，参与叙拉古距离竞争
            const otherDistance = this.calculateDistance(otherArmy.location, targetCityId);
            if (otherDistance < myDistance) {
                return false; // 有其他军队更近
            }
        }
        
        // addLog(`   🎯 ${army.commander}是执行叙拉古战略的部队（距叙拉古${myDistance}步）`, 'info');
        return true; // 这是最近的军队（且不执行新迦太基战略）
    },

    /**
     * 叙拉古战略决策
     * 为距离叙拉古最近的罗马军队制定专门策略（排除执行新迦太基战略的军队）
     */
    evaluateSyracuseStrategy(army, situation) {
        if (this.config.controlledFaction !== 'rome') return null;
        
        const targetCityId = 'syracuse';
        const targetCity = cities.find(c => c.id === targetCityId);
        
        if (!targetCity) return null;
        
        // 如果叙拉古已经是罗马或联盟控制，不需要特殊策略
        if (this.isFriendlyCity(targetCity)) return null;
        
        // 判断是否是距离叙拉古最近的军队（排除新迦太基战略执行者）
        if (!this.isClosestToSyracuse(army, situation)) return null;
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = 320; // 叙拉古战略基础优先级（低于新迦太基）
        
        // 检查是否有敌军在当前位置
        const enemyFaction = 'carthage';
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 5. 若与敌方军队处于同一个城市（使用综合战力评估）
        if (enemiesAtLocation.length > 0) {
            const myFaction = 'rome';
            const myResult = this.calculateComprehensivePower(army, army.location, myFaction);
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
            const enemyPower = enemyResult.totalPower;
            
            // (1) 若综合战力大于对方，攻击
            if (myPower > enemyPower * 1) {
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【叙拉古战略】消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // (2) 若综合战力小于对方
                // i) 若当前处于友方城市（己方或联盟）：优先征召和整编
                if (this.isFriendlyCity(currentCity)) {
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 45,
                            reason: `【叙拉古战略】整编提升战力(综合劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 45,
                            reason: `【叙拉古战略】征召增强兵力(综合劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 45,
                            reason: `【叙拉古战略】整编备战(综合劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    }
                } else {
                    // ii) 若当前处于中立和敌方城市：向临近城市撤退
                    const connectedCities = getConnectedCities(army.location);
                    let retreatTarget = null;
                    let retreatPriority = -1;
                    
                    for (const cityId of connectedCities) {
                        const city = cities.find(c => c.id === cityId);
                        if (!city) continue;
                        
                        // 检查该城市是否有敌军
                        const enemiesAtRetreat = situation.enemyArmies.filter(e => e.location === cityId);
                        if (enemiesAtRetreat.length > 0) continue; // 不撤退到有敌军的城市
                        
                        let priority = 0;
                        if (city.faction === 'rome') {
                            priority = 3; // 优先撤退到己方城市
                        } else if (this.isAlly(city.faction)) {
                            priority = 2.5; // 其次是联盟城市
                        } else if (city.faction === 'neutral') {
                            priority = 2; // 再次是中立城市
                        } else {
                            priority = 1; // 最后是敌方城市
                        }
                        
                        if (priority > retreatPriority) {
                            retreatPriority = priority;
                            retreatTarget = cityId;
                        }
                    }
                    
                    if (retreatTarget) {
                        const retreatCity = cities.find(c => c.id === retreatTarget);
                        const factionDesc = retreatCity.faction === 'rome' ? '己方' : 
                                          retreatCity.faction === 'neutral' ? '中立' : '敌方';
                        return {
                            type: 'move',
                            target: retreatTarget,
                            priority: basePriority + 40,
                            reason: `【叙拉古战略】撤退到${factionDesc}城市${this.getCityName(retreatTarget)}(面对强敌)`
                        };
                    }
                }
                
                // 无法撤退，不做特殊决策
                return null;
            }
        }
        
        // 1. 若当前位于己方城市，优先向叙拉古移动
        if (currentCity.faction === 'rome') {
            const connectedCities = getConnectedCities(army.location);
            
            if (connectedCities.includes(targetCityId)) {
                // 相邻，检查叙拉古是否有敌军
                const enemyCheck = this.checkEnemyAtTarget(army, targetCityId);
                
                if (!enemyCheck.canMove && !enemyCheck.shouldReinforce) {
                    // 差距过大，排除
                    // addLog(`   ❌ 叙拉古: ${enemyCheck.reason}`, 'warning');
                    return null;
                } else if (enemyCheck.shouldReinforce) {
                    // 需要增强
                    // addLog(`   💪 叙拉古有强敌，先增强实力`, 'info');
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 75,
                            reason: `【叙拉古战略】整编后进攻叙拉古(差距${enemyCheck.powerGap})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 75,
                            reason: `【叙拉古战略】征召后进攻叙拉古(差距${enemyCheck.powerGap})`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 75,
                            reason: `【叙拉古战略】整编后进攻叙拉古(差距${enemyCheck.powerGap})`
                        };
                    }
                } else {
                    // 可以移动
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 80,
                        reason: `【叙拉古战略】向叙拉古进军(距离${distance}步${enemyCheck.reason ? '，' + enemyCheck.reason : ''})`
                    };
                }
            } else {
                // 不相邻，尝试寻找可通行的路径（包括次短路径）
                const excludedCities = new Set();
                let attemptCount = 0;
                const maxAttempts = 5;
                
                while (attemptCount < maxAttempts) {
                    attemptCount++;
                    
                    // 寻找路径，排除已知被阻断的城市
                    const path = this.findPathWithExclusions(army.location, targetCityId, excludedCities);
                    
                    if (!path || path.length <= 1) {
                        if (excludedCities.size > 0) {
                            // addLog(`   ❌ 所有路径均被强敌阻断（已排除${excludedCities.size}个城市），暂缓进军`, 'warning');
                        }
                        return null;
                    }
                    
                    const firstStep = path[1];
                    
                    // 调试信息：检查firstStep是否真的相邻
                    const connectedCities = getConnectedCities(army.location);
                    if (!connectedCities.includes(firstStep)) {
                        console.warn(`🔍 寻路异常：路径的下一步${firstStep}不在相邻城市列表中！`);
                        console.warn(`   当前位置: ${army.location}`);
                        console.warn(`   完整路径: ${path.join(' -> ')}`);
                        console.warn(`   相邻城市: ${connectedCities.join(', ')}`);
                        addLog(`   ⚠️ 罗马AI寻路异常：${this.getCityName(firstStep)}不是${this.getCityName(army.location)}的相邻城市`, 'warning');
                    }
                    
                    const enemyCheck = this.checkEnemyAtTarget(army, firstStep);
                    
                    if (!enemyCheck.canMove && !enemyCheck.shouldReinforce) {
                        // 差距过大，排除这个城市，尝试下一条路径
                        // addLog(`   ❌ ${this.getCityName(firstStep)}: ${enemyCheck.reason}，寻找绕路方案...`, 'info');
                        excludedCities.add(firstStep);
                        continue;
                    } else if (enemyCheck.shouldReinforce) {
                        // 需要增强
                        // addLog(`   💪 ${this.getCityName(firstStep)}有强敌，先增强实力`, 'info');
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 75,
                                reason: `【叙拉古战略】整编后进攻${this.getCityName(firstStep)}(差距${enemyCheck.powerGap})`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 75,
                                reason: `【叙拉古战略】征召后进攻${this.getCityName(firstStep)}(差距${enemyCheck.powerGap})`
                            };
                        } else {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 75,
                                reason: `【叙拉古战略】整编后进攻${this.getCityName(firstStep)}(差距${enemyCheck.powerGap})`
                            };
                        }
                    } else {
                        // 可以移动
                        
                        // 检查是否需要绕路（attemptCount > 1说明不是最短路径）
                        if (attemptCount > 1) {
                            // 检查上一回合是否已经绕路
                            const history = this.armyHistory[army.id];
                            if (history && history.detoured) {
                                // 连续两回合都需要绕路，优先整编/征召
                                // addLog(`   ⚠️ 连续两回合需要绕路，优先整编/征召而非继续绕路`, 'warning');
                                
                                if (army.morale < 5) {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 75,
                                        reason: `【叙拉古战略】连续绕路受阻，整编提升战力`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 75,
                                        reason: `【叙拉古战略】连续绕路受阻，征召增强兵力`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 75,
                                        reason: `【叙拉古战略】连续绕路受阻，整编备战`
                                    };
                                }
                            }
                            
                            // addLog(`   🔄 找到绕路方案（尝试${attemptCount}次）`, 'info');
                        }
                        
                        // 标记本回合使用了绕路方案
                        const willDetour = attemptCount > 1;
                        
                        return {
                            type: 'move',
                            target: firstStep,
                            priority: basePriority + 80,
                            reason: `【叙拉古战略】向叙拉古进军(距离${distance}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${enemyCheck.reason ? '，' + enemyCheck.reason : ''})`,
                            _detoured: willDetour // 内部标记，用于记录历史
                        };
                    }
                }
                
                // 达到最大尝试次数
                // addLog(`   ❌ 已尝试${maxAttempts}条路径，均被强敌阻断，暂缓进军`, 'warning');
                return null;
            }
        }
        
        // 2. 若当前位于中立城市
        if (currentCity.faction === 'neutral') {
            // 2.2 若当前位于叙拉古且叙拉古中立，优先围城（特殊：叙拉古战略允许围城中立叙拉古）
            if (army.location === targetCityId) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【叙拉古战略】围攻叙拉古(中立城市，直接围城)`
                };
            }
            
            // 3. 若位于非叙拉古的中立城市的回合数大于6，优先围城
            const attitude = currentCity.romeAttitude || 0;
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 70,
                    reason: `【叙拉古战略】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                // 2.1 若当前位于非叙拉古的中立城市，优先游说
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 75,
                    reason: `【叙拉古战略】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 4. 若位于敌方城市，优先进行围城（使用综合战力评估）
        if (currentCity.faction === 'carthage') {
            // 检查是否有敌军驻守
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 75,
                    reason: `【叙拉古战略】围攻敌城${this.getCityName(currentCity.id)}(向叙拉古进军途中)`
                };
            } else {
                // 有敌军，使用综合战力评估
                const myFaction = 'rome';
                const myResult = this.calculateComprehensivePower(army, army.location, myFaction);
                const myPower = myResult.totalPower;
                
                const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
                const enemyPower = enemyResult.totalPower;
                
                if (myPower > enemyPower * 1) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 80,
                        reason: `【叙拉古战略】消灭敌军后围城(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 找到汉尼拔军队
     */
    findHannibalArmy() {
        if (this.config.controlledFaction !== 'rome') return null;
        
        const carthageArmies = armies.carthage || [];
        const hannibal = carthageArmies.find(a => 
            a.commander && a.commander.includes('汉尼拔')
        );
        
        return hannibal || null;
    },

    /**
     * 检查军队是否还存在
     */
    isArmyAlive(army) {
        if (!army || !army.faction) return false;
        const factionArmies = armies[army.faction] || [];
        return factionArmies.some(a => a.id === army.id);
    },

    /**
     * 找到2步内最强的罗马军队
     */
    findStrongestRomeArmyNearHannibal(hannibalLocation, currentArmy, situation) {
        let strongest = null;
        let strongestPower = 0;
        
        for (const army of situation.myArmies) {
            if (army.id === currentArmy.id) continue; // 排除当前军队
            
            const distance = this.calculateDistance(army.location, hannibalLocation);
            if (distance <= 2) {
                const power = calculateCombatPower(army);
                if (power > strongestPower) {
                    strongestPower = power;
                    strongest = army;
                }
            }
        }
        
        return strongest;
    },

    /**
     * 汉尼拔威胁应对战略
     * 专门针对汉尼拔军队的威胁制定战略
     */
    evaluateHannibalThreat(army, situation) {
        if (this.config.controlledFaction !== 'rome') return null;
        
        // 找到汉尼拔军队
        const hannibal = this.findHannibalArmy();
        if (!hannibal) return null;
        
        const romeId = 'rome';
        const hannibalDistanceToRome = this.calculateDistance(hannibal.location, romeId);
        
        // 汉尼拔必须在罗马3步以内才触发此战略
        if (hannibalDistanceToRome > 3) {
            // 汉尼拔远离，清除标记
            if (army.hannibalThreatAssignment) {
                delete army.hannibalThreatAssignment;
            }
            return null;
        }
        
        // 每回合第一次调用时，分配汉尼拔威胁应对部队（最强的2支）
        if (!this._hannibalThreatInitialized || this._lastHannibalThreatTurn !== situation.currentTurn) {
            this._lastHannibalThreatTurn = situation.currentTurn;
            this._hannibalThreatInitialized = true;
            
            // 清除已消亡军队的标记
            situation.myArmies.forEach(a => {
                if (a.hannibalThreatAssignment && !this.isArmyAlive(a)) {
                    delete a.hannibalThreatAssignment;
                }
            });
            
            // 检查是否已有标记的军队
            const alreadyAssigned = situation.myArmies.filter(a => a.hannibalThreatAssignment);
            
            if (alreadyAssigned.length < 2) {
                // 需要分配新军队
                const unassigned = situation.myArmies.filter(a => !a.hannibalThreatAssignment && !a.romeDefenseAssignment);
                
                if (unassigned.length > 0) {
                    // 按战力排序
                    const sortedByPower = unassigned.map(a => ({
                        army: a,
                        power: calculateCombatPower(a)
                    })).sort((a, b) => b.power - a.power);
                    
                    // 找出缺失的rank
                    const existingRanks = alreadyAssigned.map(a => a.hannibalThreatAssignment.rank);
                    const missingRanks = [];
                    for (let rank = 1; rank <= 2; rank++) {
                        if (!existingRanks.includes(rank)) {
                            missingRanks.push(rank);
                        }
                    }
                    
                    // 分配缺失的rank
                    const toAssign = sortedByPower.slice(0, Math.min(missingRanks.length, sortedByPower.length));
                    
                    toAssign.forEach((item, index) => {
                        const assignedRank = missingRanks[index];
                        item.army.hannibalThreatAssignment = {
                            target: hannibal,
                            assignedTurn: situation.currentTurn,
                            rank: assignedRank
                        };
                        const rankName = assignedRank === 1 ? '主防御者' : '辅助防御者';
                        // addLog(`⚔️ 【汉尼拔威胁】分配军队${item.army.commander}(战力${item.power.toFixed(0)})作为${rankName}应对汉尼拔威胁`, 'info');
                    });
                }
            }
        }
        
        // 检查当前军队是否被分配应对汉尼拔
        if (!army.hannibalThreatAssignment) {
            return null; // 无标记，不参与汉尼拔威胁应对
        }
        
        const myLocation = army.location;
        const hannibalLocation = hannibal.location;
        const distanceToHannibal = this.calculateDistance(myLocation, hannibalLocation);
        
        // 使用综合战力评估
        const myFaction = 'rome';
        const enemyFaction = 'carthage';
        
        // 评估我方战力：使用部队当前位置（考虑当前位置的同城和周边友军）
        const myResult = this.calculateComprehensivePower(army, myLocation, myFaction);
        const myPower = myResult.totalPower;
        
        // 评估敌方战力：使用汉尼拔的位置（考虑汉尼拔位置的同城和周边敌军）
        const enemyResult = this.calculateEnemyComprehensivePower(hannibalLocation, enemyFaction);
        const enemyPower = enemyResult.totalPower;
        
        const basePriority = 500; // 基础优先级（高于新迦太基，接近保卫罗马）
        
        // addLog(`⚠️ 汉尼拔威胁评估：距罗马${hannibalDistanceToRome}步，位于${this.getCityName(hannibalLocation)}`, 'warning');
        
        // 显示详细战力分解
        // addLog(`   我方战力分解：`, 'info');
        // addLog(`     主力(${army.commander}): ${myResult.details.mainForce.toFixed(0)}`, 'info');
        if (myResult.details.sameCityAllies.length > 0) {
            myResult.details.sameCityAllies.forEach(ally => {
                // addLog(`     同城友军(${ally.commander}): ${ally.power.toFixed(0)} × 0.5 = ${(ally.power * 0.5).toFixed(0)}`, 'info');
            });
        }
        if (myResult.details.neighborAllies.length > 0) {
            myResult.details.neighborAllies.forEach(ally => {
                // addLog(`     相邻友军(${ally.commander}@${ally.city}): ${ally.power.toFixed(0)} × 0.5 = ${(ally.power * 0.5).toFixed(0)}`, 'info');
            });
        }
        // addLog(`   综合战力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)}`, 'info');
        
        // 1. 若军队综合实力大于敌方
        if (myPower > enemyPower) {
            // addLog(`   我方综合优势：${(myPower/enemyPower).toFixed(2)}:1，主动进攻`, 'info');
            
            // (1) 不在同一城市，移动接近
            if (myLocation !== hannibalLocation) {
                const connectedCities = getConnectedCities(myLocation);
                
                if (connectedCities.includes(hannibalLocation)) {
                    // 相邻，直接移动
                    return {
                        type: 'move',
                        target: hannibalLocation,
                        priority: basePriority + 150,
                        reason: `【汉尼拔威胁】主动追击(综合优势${(myPower/enemyPower).toFixed(2)}:1，距罗马${hannibalDistanceToRome}步)`
                    };
                } else {
                    // 不相邻，找最短路径
                    const nextStep = this.getNextStepToTarget(myLocation, hannibalLocation);
                    if (nextStep) {
                        return {
                            type: 'move',
                            target: nextStep,
                            priority: basePriority + 150,
                            reason: `【汉尼拔威胁】追击(综合优势${(myPower/enemyPower).toFixed(2)}:1，经${this.getCityName(nextStep)})`
                        };
                    }
                }
            } else {
                // (2) 在同一城市，发起攻击
                return {
                    type: 'attack',
                    target: hannibal,
                    priority: basePriority + 200,
                    reason: `【汉尼拔威胁】消灭汉尼拔(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            }
        } else {
            // 2. 若军队综合实力小于敌方
            // addLog(`   我方综合劣势：${(enemyPower/myPower).toFixed(2)}:1，执行防御策略`, 'info');
            
            // 判断当前军队的角色（第1强或第2强）
            const myRank = army.hannibalThreatAssignment.rank;
            const isPrimaryDefender = (myRank === 1);
            
            if (isPrimaryDefender) {
                // addLog(`   当前军队是主防御者，承担主要防御`, 'info');
                
                // 若是最强
                if (myLocation === romeId) {
                    // (1) 在罗马，进行防御准备
                    const romeCity = cities.find(c => c.id === romeId);
                    const fortLevel = romeCity.fortificationLevel || 0;
                    
                    if (fortLevel <= 5) {
                        return {
                            type: 'fortify',
                            target: romeCity,
                            priority: basePriority + 120,
                            reason: `【汉尼拔威胁】加固罗马防御(当前工事${fortLevel}级，汉尼拔距${hannibalDistanceToRome}步)`
                        };
                    } else {
                        // 工事>5，优先征召或整编
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 110,
                                reason: `【汉尼拔威胁】整编备战(汉尼拔距${hannibalDistanceToRome}步)`
                            };
                        } else {
                            return {
                                type: 'recruit',
                                priority: basePriority + 100,
                                reason: `【汉尼拔威胁】征召增强防御(汉尼拔距${hannibalDistanceToRome}步)`
                            };
                        }
                    }
                } else {
                    // (2) 不在罗马，移动到罗马
                    const connectedCities = getConnectedCities(myLocation);
                    
                    if (connectedCities.includes(romeId)) {
                        // 相邻，直接移动
                        return {
                            type: 'move',
                            target: romeId,
                            priority: basePriority + 130,
                            reason: `【汉尼拔威胁】回防罗马(汉尼拔距罗马${hannibalDistanceToRome}步)`
                        };
                    } else {
                        // 不相邻，找最短路径
                        const nextStep = this.getNextStepToTarget(myLocation, romeId);
                        if (nextStep) {
                            return {
                                type: 'move',
                                target: nextStep,
                                priority: basePriority + 130,
                                reason: `【汉尼拔威胁】回防罗马(经${this.getCityName(nextStep)}，汉尼拔距罗马${hannibalDistanceToRome}步)`
                            };
                        }
                    }
                }
            } else {
                // 若是辅助防御者，向主防御者靠拢
                const primaryDefender = situation.myArmies.find(a => 
                    a.hannibalThreatAssignment && a.hannibalThreatAssignment.rank === 1
                );
                
                if (primaryDefender) {
                    // addLog(`   向主防御者靠拢：${primaryDefender.commander}`, 'info');
                    
                    const primaryLocation = primaryDefender.location;
                    
                    // 判断是否在同一城市
                    if (myLocation === primaryLocation) {
                        // 在同一城市，优先征召或整编
                        // addLog(`   已与主防御者集结，提升战力`, 'info');
                        
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【汉尼拔威胁】与${primaryDefender.commander}集结，整编提升战力`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 95,
                                reason: `【汉尼拔威胁】与${primaryDefender.commander}集结，征召增强兵力`
                            };
                        } else {
                            // 资金不足，整编
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【汉尼拔威胁】与${primaryDefender.commander}集结，整编备战`
                            };
                        }
                    } else {
                        // 不在同一城市，向主防御者移动
                        const connectedCities = getConnectedCities(myLocation);
                        
                        if (connectedCities.includes(primaryLocation)) {
                            // 相邻，直接移动
                            return {
                                type: 'move',
                                target: primaryLocation,
                                priority: basePriority + 90,
                                reason: `【汉尼拔威胁】集结兵力，向${primaryDefender.commander}靠拢`
                            };
                        } else {
                            // 不相邻，找最短路径
                            const nextStep = this.getNextStepToTarget(myLocation, primaryLocation);
                            if (nextStep) {
                                return {
                                    type: 'move',
                                    target: nextStep,
                                    priority: basePriority + 90,
                                    reason: `【汉尼拔威胁】集结兵力，向${primaryDefender.commander}靠拢(经${this.getCityName(nextStep)})`
                                };
                            }
                        }
                    }
                } else {
                    // 找不到主防御者，执行回防罗马的逻辑
                    if (myLocation !== romeId) {
                        const connectedCities = getConnectedCities(myLocation);
                        if (connectedCities.includes(romeId)) {
                            return {
                                type: 'move',
                                target: romeId,
                                priority: basePriority + 90,
                                reason: `【汉尼拔威胁】回防罗马(汉尼拔距罗马${hannibalDistanceToRome}步)`
                            };
                        } else {
                            const nextStep = this.getNextStepToTarget(myLocation, romeId);
                            if (nextStep) {
                                return {
                                    type: 'move',
                                    target: nextStep,
                                    priority: basePriority + 90,
                                    reason: `【汉尼拔威胁】回防罗马(经${this.getCityName(nextStep)})`
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    },

    /**
     * 评估是否应该组建新军
     * 检查财政盈余和组军条件
     */
    shouldRaiseNewArmy(situation) {
        if (this.config.controlledFaction !== 'rome') return null;
        
        // 0. 检查部队数量限制（如果启用）
        const currentArmyCount = situation.myArmies.length;
        if (gameState.armyLimitEnabled && currentArmyCount >= 5) {
            return null; // 部队数量已达上限
        }
        
        const capitalCity = 'rome';
        const raiseArmyCost = 500;
        
        // 1. 计算当前回合收入（所有己方城市的经济分之和）
        const myIncome = cities
            .filter(c => c.faction === 'rome')
            .reduce((sum, c) => sum + (c.economicScore || 0), 0);
        
        // 2. 计算当前真实军饷支出（使用游戏实际计算公式）
        let currentExpense = 0;
        situation.myArmies.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            currentExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        });
        currentExpense = Math.round(currentExpense);
        
        // 3. 当前盈余
        const currentSurplus = myIncome - currentExpense;
        
        // 4. 如果当前没有盈余，不组军
        if (currentSurplus <= 0) {
            return null;
        }
        
        // 5. 计算组军后的盈余（新军队按标准配置：轻骑2000，重骑1000，重步20000，轻步2000）
        const newArmyCost = 2000/100 + 1000/50 + 20000/200 + 2000/3000; // 约140.67
        const futureExpense = currentExpense + newArmyCost;
        const futureSurplus = myIncome - futureExpense;
        
        // 6. 如果组军后没有盈余，不组军
        if (futureSurplus <= 0) {
            return null;
        }
        
        // 7. 检查组军条件
        
        // 7.1 检查资金是否充裕（至少要有组军成本 + 一定储备）
        const minReserveFunds = 300; // 保留储备
        if (situation.myFunds < raiseArmyCost + minReserveFunds) {
            return null; // 资金不够充裕
        }
        
        // 7.2 检查罗马是否有驻军
        const armiesAtRome = situation.myArmies.filter(a => a.location === capitalCity);
        if (armiesAtRome.length > 0) {
            return null; // 罗马有驻军，无法组军
        }
        
        // 7.3 检查是否有紧急威胁（罗马3步内有敌军）
        const threatsToRome = situation.enemyArmies.filter(e => {
            const distance = this.calculateDistance(e.location, capitalCity);
            return distance <= 3;
        });
        
        if (threatsToRome.length > 0) {
            // 有威胁时，资金要求更高（需要足够应对威胁）
            if (situation.myFunds < raiseArmyCost + 500) {
                return null;
            }
        }
        
        // 8. 所有条件满足，返回组军决策
        // addLog(`💰 财政评估：收入${myIncome} 当前支出${currentExpense} 盈余${currentSurplus}`, 'info');
        // addLog(`💰 组军后评估：支出${futureExpense} 盈余${futureSurplus}`, 'info');
        // addLog(`✅ 符合组军条件：罗马无驻军，资金${situation.myFunds}，组军后仍有盈余`, 'success');
        
        return {
            type: 'raise_army',
            priority: 200, // 中等优先级，低于紧急防御，高于常规行动
            reason: `【组军】财政盈余${currentSurplus}，组军后仍有盈余${futureSurplus}`
        };
    },

    /**
     * 罗马防御作战系统 - 一对一标记配对机制
     * 为每个威胁罗马的敌军分配专门的防御部队
     */
    needDefendRome(army, situation) {
        if (this.config.controlledFaction !== 'rome') return null;

        const goals = this.romeStrategicGoals;
        const romeCity = cities.find(c => c.id === goals.defenseCapital.cityId);
        
        // ========== 特殊情况1：罗马被围城 ==========
        if (!romeCity) return null;
        
        // 检查罗马是否被围城
        if (romeCity.isUnderSiege && romeCity.besiegingFaction === 'carthage') {
            // 罗马正在被围城！
            const romeCityId = goals.defenseCapital.cityId;
            
            // 如果当前军队在罗马城内
            if (army.location === romeCityId) {
                // 查找所有在罗马的敌军
                const enemiesAtRome = situation.enemyArmies.filter(e => e.location === romeCityId);
                
                if (enemiesAtRome.length > 0) {
                    // 找到战力最弱的敌军作为目标
                    enemiesAtRome.sort((a, b) => calculateCombatPower(a) - calculateCombatPower(b));
                    const targetEnemy = enemiesAtRome[0];
                    const targetPower = calculateCombatPower(targetEnemy);
                    
                    // 第一次检测到罗马被围城时，输出警告
                    if (!this._romeSiegedWarningShown || this._lastSiegeCheckTurn !== situation.currentTurn) {
                        this._lastSiegeCheckTurn = situation.currentTurn;
                        if (!this._romeSiegedWarningShown) {
                            this._romeSiegedWarningShown = true;
                            // addLog(`🚨🚨🚨 罗马城被围城！城内军队必须立即突围攻击敌军！`, 'error');
                        }
                    }
                    
                    // 无条件攻击，最高优先级
                    return {
                        type: 'attack',
                        target: targetEnemy,
                        priority: 1200,  // 超高优先级，高于一切
                        reason: `🚨【罗马围城突围】无条件攻击围城敌军${targetEnemy.commander}(战力${targetPower})`
                    };
                }
            }
        }
        
        // ========== 特殊情况2：罗马已陷落（包括被联盟占领视为友方城市）==========
        if (!this.isFriendlyCity(romeCity)) {
            // 罗马已被敌军占领（非己方也非联盟），启动最高优先级紧急响应
            return this.handleRomeSieged(army, romeCity, situation);
        }
        
        // 罗马仍在友方控制下（己方或联盟），继续正常防御逻辑

        // 每回合第一次调用时，执行威胁评估和部队分配
        if (!this._romeDefenseInitialized || this._lastDefenseTurn !== situation.currentTurn) {
            this._lastDefenseTurn = situation.currentTurn;
            this._romeDefenseInitialized = true;
            
            // 清除过期标记
            this.updateDefenseAssignments(situation);
            
            // 重新评估威胁
            const threats = this.evaluateThreatsToRome(situation);
            
            if (threats.length > 0) {
                // 分配防御部队
                this.assignDefendersToThreats(threats, situation);
            }
        }
        
        // 检查当前军队是否有防御标记
        if (!army.romeDefenseAssignment) {
            return null; // 无标记，不参与罗马防御
        }
        
        // 找到对应的威胁
        const threat = this.findThreatById(army.romeDefenseAssignment.threatId, situation);
        if (!threat) {
            // 威胁已不存在，清除标记
            delete army.romeDefenseAssignment;
            return null;
        }
        
        // 制定防御行动
        return this.decideDefenseAction(army, threat, situation);
    },

    /**
     * 评估所有对罗马的威胁并标号
     */
    evaluateThreatsToRome(situation) {
        const threats = [];
        
        situation.enemyArmies.forEach((enemy, index) => {
            const distance = this.calculateDistance(enemy.location, 'rome');
            
            // 只处理3步以内的威胁
            if (distance <= 3) {
                let threatScore = 0;
                let threatLevel = '';
                
                // 根据距离评分
                if (distance === 0) {
                    threatLevel = '⚠️极危';
                    threatScore = 1000;
                } else if (distance === 1) {
                    threatLevel = '🔴极高';
                    threatScore = 950;
                } else if (distance === 2) {
                    threatLevel = '🟠高';
                    threatScore = 900;
                } else if (distance === 3) {
                    threatLevel = '🟡中';
                    threatScore = 850;
                }
                
                threats.push({
                    id: `threat_${index + 1}`,
                    army: enemy,
                    distance: distance,
                    power: calculateCombatPower(enemy),
                    threatScore: threatScore,
                    threatLevel: threatLevel,
                    assignedDefender: null
                });
            }
        });
        
        // 按威胁分数排序（最危险的在前）
        threats.sort((a, b) => b.threatScore - a.threatScore);
        
        if (threats.length > 0) {
            // addLog(`🛡️ 检测到${threats.length}个威胁罗马的敌军`, 'warning');
        }
        
        return threats;
    },

    /**
     * 为每个威胁分配防御部队
     */
    assignDefendersToThreats(threats, situation) {
        // 只分配战力最强的1支军队应对罗马威胁
        
        if (threats.length === 0) {
            return;
        }
        
        // 检查是否已经有被标记的罗马防御军队
        const alreadyAssigned = situation.myArmies.filter(army => army.romeDefenseAssignment);
        
        if (alreadyAssigned.length > 0) {
            // 已经有防御军队，不再重复分配
            // addLog(`🛡️ 【罗马威胁】已有${alreadyAssigned.length}支军队负责防御，无需重新分配`, 'info');
            return;
        }
        
        // 没有防御军队，需要分配新的
        // 筛选未分配的部队（排除已有汉尼拔威胁标记的）
        const availableDefenders = situation.myArmies.filter(army => 
            !army.romeDefenseAssignment && !army.hannibalThreatAssignment
        );
        
        if (availableDefenders.length === 0) {
            // addLog(`⚠️ 罗马威胁无可用防御部队（所有军队均已分配任务）`, 'warning');
            return;
        }
        
        // 找到战力最强的1支军队
        const sortedByPower = availableDefenders.map(army => ({
            army: army,
            power: calculateCombatPower(army)
        })).sort((a, b) => b.power - a.power);
        
        const strongestDefender = sortedByPower[0].army;
        
        // 找到威胁最大的敌军
        const highestThreat = threats.sort((a, b) => b.threatScore - a.threatScore)[0];
        
        // 标记最强部队
        strongestDefender.romeDefenseAssignment = {
            threatId: highestThreat.id,
            threatTarget: highestThreat.army,
            threatPower: highestThreat.power,
            assignedTurn: situation.currentTurn,
            priority: highestThreat.threatScore
        };
        
        highestThreat.assignedDefender = strongestDefender;
        
        // addLog(`🛡️ 【罗马威胁】分配最强军队${strongestDefender.commander}(战力${sortedByPower[0].power.toFixed(0)})应对${highestThreat.id}(${highestThreat.army.commander})`, 'info');
    },

    /**
     * 为已分配的防御部队制定行动（使用综合战力评估）
     */
    decideDefenseAction(army, threat, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        const threatLocation = threat.army.location;
        
        // 使用综合战力评估
        const myFaction = 'rome';
        const enemyFaction = 'carthage';
        
        // 评估位置：如果在同城，用当前位置；否则用威胁位置（移动目标）
        const evalLocation = (army.location === threatLocation) ? army.location : threatLocation;
        const myResult = this.calculateComprehensivePower(army, evalLocation, myFaction);
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(evalLocation, enemyFaction);
        const enemyPower = enemyResult.totalPower;
        
        // addLog(`   🛡️ 防御战力评估：我方${myPower.toFixed(0)} vs 威胁${enemyPower.toFixed(0)}`, 'info');
        
        // ========== 阶段1：兵力评估 ==========
        
        if (myPower < enemyPower) {
            // 综合兵力劣势：优先征召/整编
            // addLog(`   ⚠️ 综合战力劣势，优先增强`, 'warning');
            if (situation.myFunds >= 200) {
                return {
                    type: 'recruit',
                    priority: threat.threatScore - 50,
                    reason: `【罗马防御-${threat.id}】综合战力不足(${myPower.toFixed(0)}/${enemyPower.toFixed(0)})，征召增强`
                };
            } else if (situation.myFunds >= 100 && army.morale < 4) {
                return {
                    type: 'reorganize',
                    priority: threat.threatScore - 50,
                    reason: `【罗马防御-${threat.id}】综合战力不足且士气低，整编恢复`
                };
            }
            // 资金不足但需要移动，继续后续逻辑
        }
        
        // ========== 阶段2：根据当前位置决定行动 ==========
        
        // 情况1：与目标敌军同城
        if (army.location === threat.army.location) {
            if (myPower > enemyPower) {
                // 优势：攻击
                return {
                    type: 'attack',
                    target: threat.army,
                    priority: threat.threatScore,
                    reason: `【罗马防御-${threat.id}】同城优势，主动攻击`
                };
            } else {
                // 劣势处理
                if (this.isFriendlyCity(currentCity)) {
                    // 友方城市（己方或联盟）：征召/整编
                    if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: threat.threatScore - 30,
                            reason: `【罗马防御-${threat.id}】友方城市劣势，征召增强`
                        };
                    } else if (situation.myFunds >= 100) {
                        return {
                            type: 'reorganize',
                            priority: threat.threatScore - 30,
                            reason: `【罗马防御-${threat.id}】友方城市劣势，整编恢复`
                        };
                    }
                } else {
                    // 中立/敌方城市：撤退
                    return this.findRetreatTarget(army, situation, threat);
                }
            }
        }
        
        // 情况2：在友方城市（非目标位置）
        if (this.isFriendlyCity(currentCity)) {
            const nextStep = this.getNextStepToTarget(army.location, threat.army.location);
            if (nextStep) {
                return {
                    type: 'move',
                    target: nextStep,
                    priority: threat.threatScore + 10,
                    reason: `【罗马防御-${threat.id}】向目标${threat.army.commander}进军`
                };
            }
        }
        
        // 情况3：在中立城市
        if (currentCity.faction === 'neutral') {
            const stayTurns = this.armyStayHistory[army.id]?.stayTurns || 0;
            
            if (stayTurns <= 6) {
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: threat.threatScore - 10,
                    reason: `【罗马防御-${threat.id}】中立城市游说(${stayTurns}/6回合)`
                };
            } else {
                return {
                    type: 'siege',
                    priority: threat.threatScore - 20,
                    reason: `【罗马防御-${threat.id}】中立城市停留过久，围城`
                };
            }
        }
        
        // 情况4：在敌方城市
        if (currentCity.faction !== 'rome' && currentCity.faction !== 'neutral') {
            return {
                type: 'siege',
                priority: threat.threatScore - 15,
                reason: `【罗马防御-${threat.id}】敌方城市围城`
            };
        }
        
        // 默认：向目标移动
        const nextStep = this.getNextStepToTarget(army.location, threat.army.location);
        if (nextStep) {
            return {
                type: 'move',
                target: nextStep,
                priority: threat.threatScore,
                reason: `【罗马防御-${threat.id}】向威胁目标移动`
            };
        }
        
        return null;
    },

    /**
     * 为劣势部队寻找撤退目标
     */
    findRetreatTarget(army, situation, threat) {
        const connectedCities = getConnectedCities(army.location);
        const retreatOptions = [];
        
        connectedCities.forEach(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (!city) return;
            
            // 检查该城市的敌军实力
            const enemiesAtCity = situation.enemyArmies.filter(e => e.location === cityId);
            const enemyPowerAtCity = enemiesAtCity.reduce((sum, e) => 
                sum + calculateCombatPower(e), 0
            );
            
            const myPower = calculateCombatPower(army);
            
            // 排除敌军实力 ≥ 我方实力 × 0.8 的城市
            if (enemyPowerAtCity >= myPower * 0.8) return;
            
            // 计算撤退优先级
            let score = 0;
            if (city.faction === 'rome') {
                score = 3;  // 己方城市最优先
            } else if (this.isAlly(city.faction)) {
                score = 2.5;  // 联盟城市次之
            } else if (city.faction === 'neutral') {
                score = 2;  // 中立城市再次
            } else {
                score = 1;  // 敌方城市最后考虑
            }
            
            retreatOptions.push({
                cityId: cityId,
                cityName: city.name,
                score: score,
                city: city
            });
        });
        
        // 无可撤退目标
        if (retreatOptions.length === 0) {
            // addLog(`⚠️ ${army.commander}无法撤退，原地增强`, 'warning');
            
            if (situation.myFunds >= 200) {
                return {
                    type: 'recruit',
                    priority: threat.threatScore - 40,
                    reason: `【罗马防御-${threat.id}】无路可退，原地征召`
                };
            } else if (situation.myFunds >= 100) {
                return {
                    type: 'reorganize',
                    priority: threat.threatScore - 40,
                    reason: `【罗马防御-${threat.id}】无路可退，原地整编`
                };
            }
            return null;
        }
        
        // 选择最优撤退目标
        retreatOptions.sort((a, b) => b.score - a.score);
        const bestRetreat = retreatOptions[0];
        
        return {
            type: 'move',
            target: bestRetreat.cityId,
            priority: threat.threatScore - 20,
            reason: `【罗马防御-${threat.id}】撤退至${bestRetreat.cityName}`
        };
    },

    /**
     * 清除过期的防御标记
     */
    updateDefenseAssignments(situation) {
        situation.myArmies.forEach(army => {
            if (!army.romeDefenseAssignment) return;
            
            const assignment = army.romeDefenseAssignment;
            const threatArmy = situation.enemyArmies.find(e => 
                e.id === assignment.threatTarget.id
            );
            
            // 检查清除条件
            let shouldClear = false;
            let clearReason = '';
            
            if (!threatArmy) {
                shouldClear = true;
                clearReason = '威胁已消灭';
            } else {
                const currentDistance = this.calculateDistance(threatArmy.location, 'rome');
                if (currentDistance > 3) {
                    shouldClear = true;
                    clearReason = `威胁远离(${currentDistance}步)`;
                }
            }
            
            const turnsPassed = situation.currentTurn - assignment.assignedTurn;
            if (turnsPassed > 5) {
                shouldClear = true;
                clearReason = `标记超时(${turnsPassed}回合)`;
            }
            
            // 清除标记
            if (shouldClear) {
                delete army.romeDefenseAssignment;
                // addLog(`🔓 ${army.commander}解除罗马防御标记：${clearReason}`, 'info');
            }
        });
    },

    /**
     * 根据威胁ID查找当前威胁对象
     */
    findThreatById(threatId, situation) {
        // 从threatId提取索引
        const match = threatId.match(/threat_(\d+)/);
        if (!match) return null;
        
        const index = parseInt(match[1]) - 1;
        
        // 重新评估威胁（确保数据最新）
        const threats = this.evaluateThreatsToRome(situation);
        
        // 注意：这里我们需要根据敌军ID来匹配，而不是索引
        // 因为敌军可能被消灭，索引会变化
        return threats[index] || null;
    },

    /**
     * 处理罗马被围城的紧急情况
     * 最高优先级：所有军队全力收复罗马
     */
    handleRomeSieged(army, romeCity, situation) {
        const goals = this.romeStrategicGoals;
        const romeCityId = goals.defenseCapital.cityId;
        
        // 检查罗马城的敌军
        const enemiesAtRome = situation.enemyArmies.filter(e => e.location === romeCityId);
        const totalEnemyPower = enemiesAtRome.reduce((sum, e) => sum + calculateCombatPower(e), 0);
        
        // 第一次检测到罗马被围城，输出警告
        if (!this._romeSiegedWarningShown || this._lastSiegeCheckTurn !== situation.currentTurn) {
            this._lastSiegeCheckTurn = situation.currentTurn;
            if (!this._romeSiegedWarningShown) {
                this._romeSiegedWarningShown = true;
                // addLog(`🚨🚨🚨 罗马城陷落！当前控制：${romeCity.faction}，所有军队立即收复！`, 'error');
            }
        }
        
        const myPower = calculateCombatPower(army);
        
        // ========== 情况1：军队在罗马城 ==========
        if (army.location === romeCityId) {
            // 在罗马，攻击围城敌军
            if (enemiesAtRome.length > 0) {
                // 选择战力最弱的敌军优先攻击
                enemiesAtRome.sort((a, b) => calculateCombatPower(a) - calculateCombatPower(b));
                const targetEnemy = enemiesAtRome[0];
                const targetPower = calculateCombatPower(targetEnemy);
                
                // 无论兵力如何，都要攻击（收复罗马最重要）
                return {
                    type: 'attack',
                    target: targetEnemy,
                    priority: 1100,  // 最高优先级
                    reason: `🚨【收复罗马】攻击围城敌军${targetEnemy.commander}(${targetPower})`
                };
            } else {
                // 罗马没有敌军但不在我方控制（可能是中立或刚被围城）
                // 尝试围城夺回
                if (romeCity.faction === 'carthage') {
                    return {
                        type: 'siege',
                        priority: 1100,
                        reason: `🚨【收复罗马】围城夺回罗马城`
                    };
                } else {
                    // 中立状态，游说
                    return {
                        type: 'diplomacy',
                        target: romeCity,
                        priority: 1100,
                        reason: `🚨【收复罗马】游说收复罗马城`
                    };
                }
            }
        }
        
        // ========== 情况2：军队不在罗马城 ==========
        
        // 检查是否相邻罗马
        const connectedCities = getConnectedCities(army.location);
        const isAdjacentToRome = connectedCities.includes(romeCityId);
        
        if (isAdjacentToRome) {
            // 相邻罗马，直接移动过去
            return {
                type: 'move',
                target: romeCityId,
                priority: 1100,
                reason: `🚨【收复罗马】立即前往罗马城（相邻）`
            };
        } else {
            // 不相邻，找最短路径
            const nextStep = this.getNextStepToTarget(army.location, romeCityId);
            if (nextStep) {
                const distance = this.calculateDistance(army.location, romeCityId);
                return {
                    type: 'move',
                    target: nextStep,
                    priority: 1100,
                    reason: `🚨【收复罗马】向罗马进军(${distance}步)`
                };
            } else {
                // 找不到路径，尝试征召增强后再出发
                if (situation.myFunds >= 200) {
                    return {
                        type: 'recruit',
                        priority: 1050,
                        reason: `🚨【收复罗马】无法前往罗马，征召增强`
                    };
                } else if (situation.myFunds >= 100 && army.morale < 4) {
                    return {
                        type: 'reorganize',
                        priority: 1050,
                        reason: `🚨【收复罗马】无法前往罗马，整编恢复`
                    };
                }
            }
        }
        
        // 兜底：最低限度的决策
        return {
            type: 'move',
            target: romeCityId,
            priority: 1100,
            reason: `🚨【收复罗马】尝试前往罗马`
        };
    },

    // ==================== 回合计划系统 ====================

    /**
     * 检查上回合制定的计划是否仍然适用
     */
    isPlanStillRelevant(army, plan, situation) {
        // 检查计划类型
        switch (plan.type) {
            case 'move':
                // 移动计划：检查目标城市是否仍然相邻且有价值
                const connectedCities = getConnectedCities(army.location);
                if (!connectedCities.includes(plan.target)) {
                    return false; // 目标不再相邻
                }
                const targetCity = cities.find(c => c.id === plan.target);
                if (!targetCity) return false;
                
                // 如果目标城市已经是己方城市且没有威胁，计划可能不再适用
                if (targetCity.faction === this.config.controlledFaction) {
                    const threats = situation.enemyArmies.filter(e => {
                        const dist = this.calculateDistance(e.location, plan.target);
                        return dist <= 2;
                    });
                    if (threats.length === 0) {
                        return false; // 己方城市且无威胁，不需要移动
                    }
                }
                return true;

            case 'siege':
                // 围城计划：检查是否仍在敌方城市且无敌军
                const siegeCity = cities.find(c => c.id === army.location);
                if (!siegeCity || siegeCity.faction === this.config.controlledFaction) {
                    return false;
                }
                const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
                const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
                return enemiesAtCity.length === 0;

            case 'attack':
                // 攻击计划：检查是否仍有敌军在同一位置
                const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
                if (enemiesAtLocation.length === 0) return false;
                const myPower = calculateCombatPower(army);
                const enemyPower = calculateCombatPower(enemiesAtLocation[0]);
                return myPower > enemyPower * 1; // 仍有优势

            case 'diplomacy':
                // 游说计划：检查资金和目标城市状态
                if (situation.myFunds < 50) return false;
                if (!plan.target || !plan.target.id) return false;
                const diplomacyTarget = cities.find(c => c.id === plan.target.id);
                if (!diplomacyTarget) return false;
                // 如果目标已经是己方城市且态度很高，不需要继续游说
                if (diplomacyTarget.faction === this.config.controlledFaction) {
                    const attitude = this.config.controlledFaction === 'rome' ? 
                        (diplomacyTarget.romeAttitude || 0) : (diplomacyTarget.carthageAttitude || 0);
                    if (attitude >= 4) return false; // 态度已经很高
                }
                return true;

            case 'recruit':
            case 'reorganize':
                // 这些行动计划一般仍然适用（除非资金不足）
                const costs = { recruit: 200, reorganize: 100, fortify: 150 };
                return situation.myFunds >= costs[plan.type];

            case 'fortify':
                // 修筑计划：检查资金和城市工事等级
                if (situation.myFunds < 150) return false;
                const fortifyCheckCity = cities.find(c => c.id === army.location);
                if (!fortifyCheckCity || fortifyCheckCity.faction !== this.config.controlledFaction) return false;
                const currentFortLevel = fortifyCheckCity.fortificationLevel || 0;
                const maxFortLevel = 5;
                // 工事等级达到5级后，修筑计划不再相关
                if (currentFortLevel >= maxFortLevel) return false;
                const targetLevel = fortifyCheckCity.important ? maxFortLevel : 3;
                // 未达目标等级，计划仍然相关
                return currentFortLevel < targetLevel;

            case 'borrow':
                // 借款计划：检查是否仍需要资金
                return situation.myFunds < 300 && situation.myDebt < 4000;

            default:
                return false;
        }
    },

    /**
     * 制定下回合计划
     */
    makeNextTurnPlan(army, currentDecision, situation) {
        
        
        // 分析当前决策的后续行动
        let nextTurnPlan = null;
        let planReason = '';

        switch (currentDecision.type) {
            case 'move':
                // 移动后，下回合计划取决于目标城市
                const targetCity = cities.find(c => c.id === currentDecision.target);
                if (targetCity) {
                    if (targetCity.faction !== this.config.controlledFaction && targetCity.faction !== 'neutral') {
                        // 移动到敌方城市，下回合计划围城
                        nextTurnPlan = {
                            type: 'siege',
                            priority: 80,
                            reason: '到达敌方城市后围城'
                        };
                        planReason = `移动至${this.getCityName(currentDecision.target)}后，下回合围城`;
                    } else if (targetCity.faction === 'neutral') {
                        // 移动到中立城市，下回合游说
                        nextTurnPlan = {
                            type: 'diplomacy',
                            target: targetCity,
                            priority: 70,
                            reason: '到达中立城市后游说'
                        };
                        planReason = `移动至${this.getCityName(currentDecision.target)}后，下回合游说`;
                    } else {
                        // 移动到己方城市，下回合根据情况整编或修筑
                        if (army.morale < 4) {
                            nextTurnPlan = {
                                type: 'reorganize',
                                priority: 60,
                                reason: '到达己方城市后整编'
                            };
                            planReason = `移动至${this.getCityName(currentDecision.target)}后，下回合整编`;
                        } else {
                            nextTurnPlan = {
                                type: 'fortify',
                                priority: 50,
                                reason: '到达己方城市后修筑'
                            };
                            planReason = `移动至${this.getCityName(currentDecision.target)}后，下回合修筑`;
                        }
                    }
                } else {
                    // 找不到目标城市，计划整编
                    nextTurnPlan = {
                        type: 'reorganize',
                        priority: 50,
                        reason: '移动后整编恢复'
                    };
                    planReason = `移动完成后，下回合整编`;
                }
                break;

            case 'siege':
                // 围城后，继续围城直到成功
                nextTurnPlan = {
                    type: 'siege',
                    priority: 90,
                    reason: '继续围城直到攻克'
                };
                planReason = `围城行动，下回合继续围城`;
                break;

            case 'attack':
                // 攻击后，下回合整编恢复战力
                nextTurnPlan = {
                    type: 'reorganize',
                    priority: 70,
                    reason: '战斗后整编恢复'
                };
                planReason = `战斗后，下回合整编恢复战力`;
                break;

            case 'recruit':
            case 'reorganize':
                // 补充兵力后，下回合寻找目标移动
                const bestTarget = this.findBestMoveTarget(army, situation);
                if (bestTarget) {
                    nextTurnPlan = {
                        type: 'move',
                        target: bestTarget.cityId,
                        priority: 65,
                        reason: `补充完成后向${bestTarget.reason}进军`
                    };
                    planReason = `整编/征召后，下回合向${this.getCityName(bestTarget.cityId)}进军`;
                } else {
                    // 如果找不到移动目标，检查当前城市是否可以修筑
                    const currentCity = cities.find(c => c.id === army.location);
                    if (currentCity && currentCity.faction === this.config.controlledFaction && 
                        (currentCity.fortificationLevel || 0) < 3) {
                        nextTurnPlan = {
                            type: 'fortify',
                            priority: 55,
                            reason: '无移动目标，强化当前城市'
                        };
                        planReason = `整编/征召后无移动目标，下回合修筑`;
                    } else {
                        // 继续整编提升战力
                        nextTurnPlan = {
                            type: 'reorganize',
                            priority: 50,
                            reason: '继续提升战力'
                        };
                        planReason = `整编/征召后，下回合继续整编`;
                    }
                }
                break;

            case 'diplomacy':
                // 游说后，如果还需要继续游说则继续，否则移动
                const diplomacyCity = cities.find(c => c.id === currentDecision.target?.id);
                if (diplomacyCity && diplomacyCity.faction === 'neutral') {
                    const attitude = this.config.controlledFaction === 'rome' ? 
                        (diplomacyCity.romeAttitude || 0) : (diplomacyCity.carthageAttitude || 0);
                    if (attitude < 2) {
                        // 态度还不够，继续游说
                        nextTurnPlan = {
                            type: 'diplomacy',
                            target: diplomacyCity,
                            priority: 75,
                            reason: '继续游说提升态度'
                        };
                        planReason = `游说后态度${attitude}/3，下回合继续游说`;
                    } else {
                        // 游说成功，寻找下一个目标
                        const nextTarget = this.findBestMoveTarget(army, situation);
                        if (nextTarget) {
                            nextTurnPlan = {
                                type: 'move',
                                target: nextTarget.cityId,
                                priority: 60,
                                reason: `游说完成后向${nextTarget.reason}进军`
                            };
                            planReason = `游说接近完成，下回合向${this.getCityName(nextTarget.cityId)}进军`;
                        } else {
                            // 找不到移动目标，整编
                            nextTurnPlan = {
                                type: 'reorganize',
                                priority: 55,
                                reason: '游说完成后整编'
                            };
                            planReason = `游说完成后无移动目标，下回合整编`;
                        }
                    }
                } else {
                    // 游说目标已经不是中立城市，寻找新目标
                    const nextTarget = this.findBestMoveTarget(army, situation);
                    if (nextTarget) {
                        nextTurnPlan = {
                            type: 'move',
                            target: nextTarget.cityId,
                            priority: 60,
                            reason: `游说完成，向新目标进军`
                        };
                        planReason = `游说完成，下回合向${this.getCityName(nextTarget.cityId)}进军`;
                    } else {
                        // 整编
                        nextTurnPlan = {
                            type: 'reorganize',
                            priority: 55,
                            reason: '游说完成后整编'
                        };
                        planReason = `游说完成，下回合整编`;
                    }
                }
                break;

            case 'fortify':
                // 修筑后，继续修筑或寻找新目标
                const fortifyCity = cities.find(c => c.id === army.location);
                const fortLevel = fortifyCity ? (fortifyCity.fortificationLevel || 0) : 0;
                const maxFortLevel = 5; // 最高工事等级
                const targetFortLevel = (fortifyCity && fortifyCity.important) ? maxFortLevel : 3; // 重要城市5级，普通城市3级
                
                // 工事等级达到5级后，不再修筑，直接寻找新目标
                if (fortifyCity && fortLevel >= maxFortLevel) {
                    const nextTarget = this.findBestMoveTarget(army, situation);
                    if (nextTarget) {
                        nextTurnPlan = {
                            type: 'move',
                            target: nextTarget.cityId,
                            priority: 60,
                            reason: `修筑完成后向${nextTarget.reason}进军`
                        };
                        planReason = `工事已达最高等级${maxFortLevel}级，下回合向${this.getCityName(nextTarget.cityId)}进军`;
                    } else {
                        nextTurnPlan = {
                            type: 'reorganize',
                            priority: 50,
                            reason: '修筑完成后整编'
                        };
                        planReason = `工事已达最高等级，下回合整编`;
                    }
                } else if (fortifyCity && fortLevel < targetFortLevel) {
                    // 未达目标等级，继续修筑
                    nextTurnPlan = {
                        type: 'fortify',
                        priority: 55,
                        reason: '继续强化城市防御'
                    };
                    planReason = `修筑后工事${fortLevel}级，下回合继续修筑至${targetFortLevel}级`;
                } else {
                    // 达到目标等级（但未达5级），寻找新目标
                    const nextTarget = this.findBestMoveTarget(army, situation);
                    if (nextTarget) {
                        nextTurnPlan = {
                            type: 'move',
                            target: nextTarget.cityId,
                            priority: 60,
                            reason: `修筑完成后向${nextTarget.reason}进军`
                        };
                        planReason = `修筑完成，下回合向${this.getCityName(nextTarget.cityId)}进军`;
                    } else {
                        // 找不到目标，继续整编
                        nextTurnPlan = {
                            type: 'reorganize',
                            priority: 50,
                            reason: '修筑完成后整编'
                        };
                        planReason = `修筑完成无移动目标，下回合整编`;
                    }
                }
                break;

            case 'borrow':
                // 借款后，根据情况选择行动
                if (army.morale < 4) {
                    nextTurnPlan = {
                        type: 'reorganize',
                        priority: 65,
                        reason: '借款后整编提升士气'
                    };
                    planReason = `借款获得资金，下回合整编`;
                } else {
                    const nextTarget = this.findBestMoveTarget(army, situation);
                    if (nextTarget) {
                        nextTurnPlan = {
                            type: 'move',
                            target: nextTarget.cityId,
                            priority: 60,
                            reason: `借款后向目标进军`
                        };
                        planReason = `借款后，下回合向${this.getCityName(nextTarget.cityId)}进军`;
                    } else {
                        nextTurnPlan = {
                            type: 'recruit',
                            priority: 60,
                            reason: '借款后征召'
                        };
                        planReason = `借款后，下回合征召扩充兵力`;
                    }
                }
                break;

            default:
                // 默认：寻找最佳移动目标
                const defaultTarget = this.findBestMoveTarget(army, situation);
                if (defaultTarget) {
                    nextTurnPlan = {
                        type: 'move',
                        target: defaultTarget.cityId,
                        priority: 50,
                        reason: `向${defaultTarget.reason}进军`
                    };
                    planReason = `下回合向${defaultTarget.cityId}进军`;
                } else {
                    // 如果找不到任何移动目标，执行整编
                    nextTurnPlan = {
                        type: 'reorganize',
                        priority: 50,
                        reason: '无明确目标，整编待命'
                    };
                    planReason = `无移动目标，下回合整编提升战力`;
                }
                break;
        }

        // 强制保存下回合计划（必须有计划）
        if (!nextTurnPlan) {
            // 最终兜底计划：整编
            // addLog(`⚠️ 未能生成常规计划，强制制定整编计划`, 'warning');
            nextTurnPlan = {
                type: 'reorganize',
                priority: 40,
                reason: '兜底计划：整编'
            };
            planReason = `强制计划：下回合整编提升战力`;
        }

        this.armyPlans[army.id] = {
            nextTurnPlan: nextTurnPlan,
            createdTurn: gameState.turn,
            reason: planReason
        };
        // addLog(`✅ 下回合计划: ${this.getActionName(nextTurnPlan.type)} - ${planReason}`, 'success');
    },

    /**
     * 为军队寻找最佳移动目标
     */
    findBestMoveTarget(army, situation) {
        const connectedCities = getConnectedCities(army.location);
        let bestTarget = null;
        let bestScore = 0;

        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;

            let score = 0;
            let reason = '';

            // 检查战略价值（罗马专属）
            if (this.config.controlledFaction === 'rome') {
                const strategicValue = this.evaluateRomeStrategicValue(cityId, situation);
                if (strategicValue.value > 0) {
                    score += strategicValue.value;
                    reason = strategicValue.reason;
                }
            }

            // 敌方城市
            if (city.faction !== this.config.controlledFaction && city.faction !== 'neutral') {
                const cityValue = this.evaluateCityValue(city);
                score += cityValue * 2;
                if (!reason) reason = `攻击目标(价值${cityValue.toFixed(0)})`;
            }

            // 中立城市
            if (city.faction === 'neutral') {
                const cityValue = this.evaluateCityValue(city);
                score += cityValue;
                if (!reason) reason = `游说目标(价值${cityValue.toFixed(0)})`;
            }

            if (score > bestScore) {
                bestScore = score;
                bestTarget = { cityId: cityId, reason: reason };
            }
        }

        return bestTarget;
    },

    // ==================== 决策系统 ====================

    /**
     * 为军队做出决策
     */
    decideArmyAction(army, situation) {
        const decisions = [];
        
        // 更新军队停留记录
        this.updateArmyStayHistory(army);
        
        // 【优先级0】绝对最高优先级：士气不足5必须整编
        if (army.morale < 5) {
            const currentCity = cities.find(c => c.id === army.location);
            const cityDesc = currentCity ? currentCity.name : army.location;
            // addLog(`⚠️ ${army.commander} 士气严重不足(${army.morale.toFixed(1)})，在${cityDesc}紧急整编`, 'warning');
            
            return {
                type: 'reorganize',
                priority: 9999, // 绝对最高优先级
                reason: `士气严重不足(${army.morale.toFixed(1)})，必须立即整编恢复战力`
            };
        }
        
        // 【新增】绝对最高优先级：首都被围城紧急响应
        const capitalId = this.config.controlledFaction === 'rome' ? 'rome' : 
                         this.config.controlledFaction === 'carthage' ? 'carthage' : null;
        
        if (capitalId) {
            const capitalCity = cities.find(c => c.id === capitalId);
            
            // 检查首都是否被敌方围城
            if (capitalCity && capitalCity.isUnderSiege && 
                capitalCity.besiegingFaction !== this.config.controlledFaction) {
                
                const distance = this.calculateDistance(army.location, capitalId);
                
                // 情况1：军队在首都，立即攻击围城敌军
                if (army.location === capitalId) {
                    const enemies = situation.enemyArmies.filter(e => e.location === capitalId);
                    if (enemies.length > 0) {
                        return {
                            type: 'attack',
                            target: enemies[0],
                            priority: 999999, // 绝对最高优先级
                            reason: `【首都危机】${capitalCity.name}被围城！立即攻击围城敌军！`
                        };
                    }
                }
                
                // 情况2：军队距离首都1步，立即前往首都
                if (distance === 1) {
                    return {
                        type: 'move',
                        target: capitalId,
                        priority: 999999, // 绝对最高优先级
                        reason: `【首都危机】${capitalCity.name}被围城！紧急驰援！`
                    };
                }
            }
        }
        
        // 【新增】优先检查当前城市是否正在被我方围城
        const currentCity = cities.find(c => c.id === army.location);
        if (currentCity && currentCity.isUnderSiege && currentCity.besiegingFaction === this.config.controlledFaction) {
            // 该城市正在被我方围城，优先继续围城
            // addLog(`🏰 ${currentCity.name}正在被围城中(第${currentCity.siegeCount}次)，优先继续围城`, 'warning');
            
            // 检查是否有敌军驻防（围城期间不主动攻击）
            const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
            
            if (enemiesAtCity.length > 0) {
                // addLog(`   围城期间不主动攻击驻防敌军，继续围城`, 'info');
            }
            
            return {
                type: 'siege',
                target: currentCity,
                priority: 999, // 极高优先级
                reason: `继续围城${currentCity.name}(第${currentCity.siegeCount}次，对手上回合选择守城)`
            };
        }
                
        // 0. 检查是否有上回合制定的计划
        const existingPlan = this.armyPlans[army.id];
        if (existingPlan && existingPlan.nextTurnPlan) {
            // addLog(`📋 发现上回合制定的计划: ${this.getActionName(existingPlan.nextTurnPlan.type)} - ${existingPlan.reason}`, 'info');
            
            // 创建计划副本以便可能的修正
            const planToCheck = { ...existingPlan.nextTurnPlan };
            
            // 验证并可能修正计划（对于移动计划）
            const isValid = this.validateAndFixDecision(army, planToCheck);
            if (isValid && this.isPlanStillRelevant(army, planToCheck, situation)) {
                // addLog(`✅ 上回合计划仍然有效，优先执行`, 'success');
                // 将上回合计划作为高优先级选项
                decisions.push({
                    ...planToCheck,
                    priority: planToCheck.priority + 30, // 提高优先级
                    reason: `[执行上回合计划] ${planToCheck.reason}`
                });
            } else {
                // addLog(`⚠️ 上回合计划已不适用，重新规划`, 'warning');
            }
        }
        
        // 1. 检查是否需要借款（一回合只能借款一次，且负债不超过5999）
        if (situation.myFunds < 100 && situation.myDebt < 6000 && !this.borrowedThisTurn) {
            // addLog(`💰 资金不足(${situation.myFunds})，决定借款（当前债务${situation.myDebt}）`, 'info');
            return { type: 'borrow', priority: 100, reason: `资金紧张(${situation.myFunds})，债务${situation.myDebt}` };
        }

        // 2. 罗马特殊：检查是否需要紧急支援罗马城（最高优先级）
        if (this.config.controlledFaction === 'rome') {
            const defendRomeDecision = this.needDefendRome(army, situation);
            if (defendRomeDecision) {
                decisions.push(defendRomeDecision);
                // addLog(`🛡️ 发现首都威胁 - 优先级: ${defendRomeDecision.priority.toFixed(1)} (${defendRomeDecision.reason})`, 'warning');
            }
        }

        // 2.2. 罗马特殊：汉尼拔威胁应对（高优先级）
        if (this.config.controlledFaction === 'rome') {
            const hannibalDecision = this.evaluateHannibalThreat(army, situation);
            if (hannibalDecision) {
                decisions.push(hannibalDecision);
                // addLog(`⚔️ 汉尼拔威胁应对 - 优先级: ${hannibalDecision.priority.toFixed(1)} (${hannibalDecision.reason})`, 'warning');
            }
        }

        // 2.3. 罗马特殊：新迦太基战略（高优先级）
        if (this.config.controlledFaction === 'rome') {
            const newCarthageDecision = this.evaluateNewCarthageStrategy(army, situation);
            if (newCarthageDecision) {
                decisions.push(newCarthageDecision);
                // addLog(`🎯 新迦太基战略 - 优先级: ${newCarthageDecision.priority.toFixed(1)} (${newCarthageDecision.reason})`, 'warning');
            }
        }

        // 2.4. 罗马特殊：叙拉古战略（中优先级）
        if (this.config.controlledFaction === 'rome') {
            const syracuseDecision = this.evaluateSyracuseStrategy(army, situation);
            if (syracuseDecision) {
                decisions.push(syracuseDecision);
                // addLog(`🏛️ 叙拉古战略 - 优先级: ${syracuseDecision.priority.toFixed(1)} (${syracuseDecision.reason})`, 'info');
            }
        }

        // 2.5. 同城敌军应对（高优先级，除叙拉古战略军队外）
        const enemyInCityDecision = this.evaluateEnemyInSameCity(army, situation);
        if (enemyInCityDecision) {
            decisions.push(enemyInCityDecision);
            // addLog(`⚠️ 同城敌军应对 - 优先级: ${enemyInCityDecision.priority.toFixed(1)} (${enemyInCityDecision.reason})`, 'warning');
        }

        // 2.6. 检查是否应该收复失去的城市（高优先级）
        const recaptureDecision = this.evaluateRecaptureOptions(army, situation);
        if (recaptureDecision) {
            decisions.push(recaptureDecision);
            // addLog(`🔄 发现收复目标 - 优先级: ${recaptureDecision.priority.toFixed(1)} (${recaptureDecision.reason})`, 'info');
        }

        // 3. 检查是否应该进攻敌军
        const attackDecision = this.evaluateAttackOptions(army, situation);
        if (attackDecision) {
            decisions.push(attackDecision);
            // addLog(`⚔️ 发现攻击机会 - 优先级: ${attackDecision.priority.toFixed(1)} (${attackDecision.reason})`, 'info');
        }

        // 4. 检查是否应该移动
        const moveDecision = this.evaluateMoveOptions(army, situation);
        if (moveDecision) {
            decisions.push(moveDecision);
            // addLog(`🚶 发现移动目标 - 优先级: ${moveDecision.priority.toFixed(1)} (${moveDecision.reason})`, 'info');
        }

        // 5. 检查是否应该围城
        const siegeDecision = this.evaluateSiegeOptions(army, situation);
        if (siegeDecision) {
            decisions.push(siegeDecision);
            // addLog(`🏰 可以围城 - 优先级: ${siegeDecision.priority.toFixed(1)} (${siegeDecision.reason})`, 'info');
        }

        // 6. 检查是否应该游说（提高优先级，优先游说当前城市）
        const diplomacyDecision = this.evaluateDiplomacyOptions(army, situation);
        if (diplomacyDecision) {
            // 如果可以游说当前城市，大幅提高优先级
            if (diplomacyDecision.target && diplomacyDecision.target.id === army.location) {
                diplomacyDecision.priority += 30; // 提高优先级
                diplomacyDecision.reason = `【优先】${diplomacyDecision.reason}`;
            }
            decisions.push(diplomacyDecision);
            // addLog(`🤝 可以游说 - 优先级: ${diplomacyDecision.priority.toFixed(1)} (${diplomacyDecision.reason})`, 'info');
        }

        // 7. 检查是否应该征召
        const recruitDecision = this.evaluateRecruitOptions(army, situation);
        if (recruitDecision) {
            decisions.push(recruitDecision);
            // addLog(`🎖️ 可以征召 - 优先级: ${recruitDecision.priority.toFixed(1)} (${recruitDecision.reason})`, 'info');
        }

        // 8. 检查是否应该整编
        const reorganizeDecision = this.evaluateReorganizeOptions(army, situation);
        if (reorganizeDecision) {
            decisions.push(reorganizeDecision);
            // addLog(`📈 可以整编 - 优先级: ${reorganizeDecision.priority.toFixed(1)} (${reorganizeDecision.reason})`, 'info');
        }

        // 9. 检查是否应该修筑
        const fortifyDecision = this.evaluateFortifyOptions(army, situation);
        if (fortifyDecision) {
            decisions.push(fortifyDecision);
            // addLog(`🔨 可以修筑 - 优先级: ${fortifyDecision.priority.toFixed(1)} (${fortifyDecision.reason})`, 'info');
        }

        // 选择优先级最高的决策
        if (decisions.length > 0) {
            decisions.sort((a, b) => b.priority - a.priority);
            // addLog(`✅ 最终决策: ${this.getActionName(decisions[0].type)} (原因: ${decisions[0].reason})`, 'success');
            return decisions[0];
        }

        // 没有好的选择时，强制执行一个实际行动
        // addLog(`⚠️ 无明显优选项，${army.commander} 强制执行保守行动`, 'warning');
        return this.getFallbackAction(army, situation);
    },

    /**
     * 获取兜底行动（当没有明显好选择时）
     */
    getFallbackAction(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        
        // 1. 优先尝试整编（如果士气不满且有资金）
        if (situation.myFunds >= 100 && army.morale < 5) {
            // addLog(`   → 选择整编提升士气`, 'info');
            return {
                type: 'reorganize',
                priority: 10,
                reason: '无更优选项，整编提升士气'
            };
        }

        // 2. 尝试修筑（如果在友方城市且有资金）
        if (situation.myFunds >= 150 && 
            this.isFriendlyCity(currentCity) &&
            (currentCity.fortificationLevel || 0) < 5) {
            // addLog(`   → 选择修筑强化防御`, 'info');
            return {
                type: 'fortify',
                priority: 10,
                reason: '无更优选项，修筑强化城市'
            };
        }

        // 3. 尝试征召（如果有资金）
        if (situation.myFunds >= 200) {
            // addLog(`   → 选择征召补充兵力`, 'info');
            return {
                type: 'recruit',
                priority: 10,
                reason: '无更优选项，征召补充实力'
            };
        }

        // 4. 尝试移动到相邻城市（选择最有价值的）
        const connectedCities = getConnectedCities(army.location);
        if (connectedCities && connectedCities.length > 0) {
            // 优先选择己方城市、然后中立、最后敌方
            let bestTarget = null;
            let bestScore = -1;
            
            for (const cityId of connectedCities) {
                const city = cities.find(c => c.id === cityId);
                if (!city) continue;
                
                let score = 0;
                if (this.isFriendlyCity(city)) {
                    // 己方城市30分，联盟城市28分
                    score = city.faction === this.config.controlledFaction ? 30 : 28;
                } else if (city.faction === 'neutral') {
                    score = 20; // 中立城市
                } else {
                    score = 10; // 敌方城市
                }
                
                // 加上城市价值
                score += (city.economicScore || 0) * 0.5 + (city.politicalScore || 0) * 0.3;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = cityId;
                }
            }
            
            if (bestTarget) {
                const targetCity = cities.find(c => c.id === bestTarget);
                // addLog(`   → 选择移动到相邻城市 ${this.getCityName(bestTarget)}`, 'info');
                let cityTypeDesc = '敌方';
                if (this.isFriendlyCity(targetCity)) {
                    cityTypeDesc = targetCity.faction === this.config.controlledFaction ? '己方' : '联盟';
                } else if (targetCity.faction === 'neutral') {
                    cityTypeDesc = '中立';
                }
                return {
                    type: 'move',
                    target: bestTarget,
                    priority: 10,
                    reason: `无更优选项，移动到${cityTypeDesc}城市${this.getCityName(bestTarget)}`
                };
            }
        }

        // 5. 如果实在没有可执行的行动，整编（即使士气满）
        // addLog(`   → 强制整编（无其他可行动作）`, 'warning');
        return {
            type: 'reorganize',
            priority: 5,
            reason: '无任何可行动作，强制整编'
        };
    },

    /**
     * 评估收复失去城市的选项
     */
    evaluateRecaptureOptions(army, situation) {
        const faction = this.config.controlledFaction;
        const recaptureTarget = this.getPriorityRecaptureTarget(army, faction);
        
        if (!recaptureTarget) return null;
        
        const targetCity = cities.find(c => c.id === recaptureTarget.cityId);
        if (!targetCity) return null;
        
        const distance = this.calculateDistance(army.location, recaptureTarget.cityId);
        const weight = recaptureTarget.weight;
        const turnsLost = recaptureTarget.turnsLost;
        
        // 优先级基于权重
        // 权重高的城市，且距离近的军队，优先级更高
        let priority = 200 + weight; // 基础优先级较高
        
        // 距离修正
        priority -= distance * 5;
        
        // 特殊加成
        if (recaptureTarget.cityData.cityData.important) {
            priority += 100; // 重要城市额外加成
        }
        
        // 构建时间提示信息
        let timeInfo = '';
        if (turnsLost <= 12) {
            timeInfo = `失守${turnsLost}回合↗`;  // 紧迫性上升
        } else {
            timeInfo = `失守${turnsLost}回合↘`;  // 紧迫性下降
        }
        
        // 构建移动目标（可能需要路径）
        const connectedCities = getConnectedCities(army.location);
        let actualTarget = recaptureTarget.cityId;
        let reasonText = `【收复失地】${recaptureTarget.cityData.cityData.name}（权重${weight}，${timeInfo}，距离${distance}步）`;
        
        if (!connectedCities.includes(recaptureTarget.cityId)) {
            // 不相邻，需要路径
            const nextStep = this.getNextStepToTarget(army.location, recaptureTarget.cityId);
            if (nextStep) {
                actualTarget = nextStep;
                reasonText = `【收复失地】向${recaptureTarget.cityData.cityData.name}进军（权重${weight}，${timeInfo}）`;
            } else {
                // 无法到达
                return null;
            }
        }
        
        return {
            type: 'move',
            target: actualTarget,
            priority: priority,
            reason: reasonText
        };
    },

    /**
     * 评估攻击选项（使用综合战力评估）
     */
    evaluateAttackOptions(army, situation) {
        // 【新增】如果当前城市正在被我方围城，不主动攻击
        const currentCity = cities.find(c => c.id === army.location);
        if (currentCity && currentCity.isUnderSiege && currentCity.besiegingFaction === this.config.controlledFaction) {
            return null; // 围城期间不主动攻击
        }
        
        const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
        const myFaction = this.config.controlledFaction;
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        if (enemiesAtLocation.length === 0) return null;
        
        const enemy = enemiesAtLocation[0];
        
        // 使用综合战力评估
        const myResult = this.calculateComprehensivePower(army, army.location, myFaction);
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
        const enemyPower = enemyResult.totalPower;
        
        // 只有在有综合优势时才攻击
        if (myPower > enemyPower * 1) {
            const powerRatio = (myPower / enemyPower).toFixed(2);
            return {
                type: 'attack',
                target: enemy,
                priority: 90 + (myPower - enemyPower) / 10,
                reason: `综合战力${myPower.toFixed(0)}优于敌军${enemyPower.toFixed(0)}，战力比${powerRatio}:1`
            };
        }
        
        return null;
    },

    /**
     * 评估同城敌军应对（除叙拉古战略外的所有罗马AI）
     * 如果当前城市有敌军，根据实力对比决定进攻或撤退/增强
     */
    evaluateEnemyInSameCity(army, situation) {
        // 检查当前城市是否有敌军
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
        const enemiesInCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
        
        if (enemiesInCity.length === 0) {
            return null; // 没有敌军，不需要处理
        }
        
        // 如果是执行叙拉古战略的军队，不使用这个逻辑（叙拉古战略有自己的处理）
        if (this.config.controlledFaction === 'rome') {
            const syracuse = cities.find(c => c.id === 'syracuse');
            if (syracuse && syracuse.faction !== 'rome') {
                if (this.isClosestToSyracuse(army, situation)) {
                    return null; // 叙拉古战略军队使用自己的逻辑
                }
            }
        }
        
        // 计算实力对比（使用综合战力评估）
        const myFaction = this.config.controlledFaction;
        const myResult = this.calculateComprehensivePower(army, army.location, myFaction);
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
        const enemyPower = enemyResult.totalPower;
        const powerGap = enemyPower - myPower;
        
        // 构建战力说明
        let powerInfo = `我${myPower.toFixed(0)} vs 敌${enemyPower.toFixed(0)}`;
        if (myResult.details.sameCityAllies.length > 0 || myResult.details.neighborAllies.length > 0) {
            powerInfo += ` (含潜在援军)`;
        }
        
        // 基础优先级（高于普通攻击/移动，但低于战略目标）
        const basePriority = 350;
        
        // （1）若军队实力大于对方，移动并攻击
        if (myPower > enemyPower) {
            // addLog(`   ⚔️ 同城敌军：综合优势${(myPower/enemyPower).toFixed(2)}:1，主动攻击`, 'info');
            return {
                type: 'attack',
                target: enemiesInCity[0], // 攻击第一个敌军
                priority: basePriority + 50,
                reason: `同城敌军综合优势进攻(${powerInfo})`
            };
        }
        
        // （2）若军队实力小于对方
        // i) 若当前处于友方城市（己方或联盟）：优先征召和整编
        if (this.isFriendlyCity(currentCity)) {
            // addLog(`   🛡️ 同城敌军：我方劣势${(enemyPower/myPower).toFixed(2)}:1，在友方城市增强实力`, 'warning');
            
            // 优先整编（如果士气低）或征召（如果有资金）
            if (army.morale < 4 || situation.myFunds < 200) {
                return {
                    type: 'reorganize',
                    priority: basePriority + 40,
                    reason: `同城强敌整编备战(差距${powerGap}，在${this.getCityName(currentCity.id)})`
                };
            } else {
                return {
                    type: 'recruit',
                    priority: basePriority + 40,
                    reason: `同城强敌征召增援(差距${powerGap}，在${this.getCityName(currentCity.id)})`
                };
            }
        }
        
        // ii) 若当前处于中立和敌方城市：向临近城市撤退
        // addLog(`   🏃 同城敌军：我方劣势${(enemyPower/myPower).toFixed(2)}:1，在非己方城市，准备撤退`, 'warning');
        
        const connectedCities = getConnectedCities(army.location);
        let retreatTarget = null;
        let retreatPriority = -1;
        let retreatFactionDesc = '';
        
        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;
            
            // 检查该城市是否有敌军
            const enemiesAtRetreat = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
            if (enemiesAtRetreat.length > 0) {
                // 计算撤退目标的敌军实力
                const retreatEnemyPower = enemiesAtRetreat.reduce((sum, e) => sum + calculateCombatPower(e), 0);
                // 如果撤退目标的敌军也很强，跳过
                if (retreatEnemyPower >= myPower * 0.8) {
                    continue;
                }
            }
            
            let priority = 0;
            let factionDesc = '';
            if (city.faction === this.config.controlledFaction) {
                priority = 3; // 优先撤退到己方城市
                factionDesc = '己方';
            } else if (this.isAlly(city.faction)) {
                priority = 2.5; // 其次是联盟城市
                factionDesc = '联盟';
            } else if (city.faction === 'neutral') {
                priority = 2; // 再次是中立城市
                factionDesc = '中立';
            } else {
                priority = 1; // 最后是敌方城市
                factionDesc = '敌方';
            }
            
            if (priority > retreatPriority) {
                retreatPriority = priority;
                retreatTarget = cityId;
                retreatFactionDesc = factionDesc;
            }
        }
        
        if (retreatTarget) {
            return {
                type: 'move',
                target: retreatTarget,
                priority: basePriority + 30,
                reason: `同城强敌战略撤退至${retreatFactionDesc}城市${this.getCityName(retreatTarget)}(差距${powerGap})`
            };
        }
        
        // 无法撤退，尝试整编或征召（即使在非己方城市）
        // addLog(`   ⚠️ 无法撤退，原地增强实力`, 'warning');
        if (army.morale < 4 || situation.myFunds < 200) {
            return {
                type: 'reorganize',
                priority: basePriority + 20,
                reason: `同城强敌无法撤退整编(差距${powerGap})`
            };
        } else {
            return {
                type: 'recruit',
                priority: basePriority + 20,
                reason: `同城强敌无法撤退征召(差距${powerGap})`
            };
        }
    },

    /**
     * 计算综合战力（考虑潜在援军）
     * 综合战力 = 本队战力 + 同城友军*0.5 + 相邻友军*0.5
     * @param {Object} army - 主力部队
     * @param {string} locationId - 评估位置（目标位置，即部队移动后所在位置）
     * @param {string} faction - 阵营
     * @returns {Object} { totalPower: number, details: Object } 综合战力和详细分解
     */
    calculateComprehensivePower(army, locationId, faction) {
        const details = {
            mainForce: 0,
            sameCityAllies: [],
            neighborAllies: [],
            sameCityAllyArmies: [],
            neighborAllyArmies: [],
            sameCityPower: 0,
            neighborPower: 0,
            sameCityAllyPower: 0,
            neighborAllyPower: 0
        };
        
        // 1. 主力部队战力（100%）
        details.mainForce = calculateCombatPower(army);
        let totalPower = details.mainForce;
        
        // 2. 同城友军战力 * 0.5（移动后目标城市的友军）
        const alliesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, faction);
        alliesInCity.forEach(ally => {
            if (ally.id !== army.id) { // 排除自己
                const allyPower = calculateCombatPower(ally);
                details.sameCityAllies.push({ commander: ally.commander, power: allyPower });
                details.sameCityPower += allyPower * 0.5;
            }
        });
        totalPower += details.sameCityPower;
        
        // 3. 相邻友军战力 * 0.5（目标城市相邻的友军）
        const connectedCities = getConnectedCities(locationId);
        connectedCities.forEach(cityId => {
            const alliesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, faction);
            alliesInNeighbor.forEach(ally => {
                const allyPower = calculateCombatPower(ally);
                const cityName = this.getCityName(cityId);
                details.neighborAllies.push({ 
                    commander: ally.commander, 
                    power: allyPower,
                    city: cityName
                });
                details.neighborPower += allyPower * 0.5;
            });
        });
        totalPower += details.neighborPower;
        
        // 4. 同城盟友军队战力 * 0.5（联盟支援）
        // 马其顿联盟支援
        if (this.isAlliedWithMacedonia()) {
            const macedoniaArmiesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, 'macedonia');
            macedoniaArmiesInCity.forEach(allyArmy => {
                const allyPower = calculateCombatPower(allyArmy);
                details.sameCityAllyArmies.push({ 
                    commander: allyArmy.commander, 
                    power: allyPower,
                    faction: 'macedonia'
                });
                details.sameCityAllyPower += allyPower * 0.5;
            });
            totalPower += details.sameCityAllyPower;
        }
        
        // 塞琉古联盟支援
        if (this.isAlliedWithSeleucid()) {
            const seleucidArmiesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, 'seleucid');
            seleucidArmiesInCity.forEach(allyArmy => {
                const allyPower = calculateCombatPower(allyArmy);
                details.sameCityAllyArmies.push({ 
                    commander: allyArmy.commander, 
                    power: allyPower,
                    faction: 'seleucid'
                });
                details.sameCityAllyPower += allyPower * 0.5;
            });
            totalPower += details.sameCityAllyPower;
        }
        
        // 托勒密联盟支援
        if (this.isAlliedWithPtolemy()) {
            const ptolemyArmiesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, 'ptolemy');
            ptolemyArmiesInCity.forEach(allyArmy => {
                const allyPower = calculateCombatPower(allyArmy);
                details.sameCityAllyArmies.push({ 
                    commander: allyArmy.commander, 
                    power: allyPower,
                    faction: 'ptolemy'
                });
                details.sameCityAllyPower += allyPower * 0.5;
            });
            totalPower += details.sameCityAllyPower;
        }
        
        // 5. 相邻盟友军队战力 * 0.5
        connectedCities.forEach(cityId => {
            // 马其顿相邻支援
            if (this.isAlliedWithMacedonia()) {
                const macedoniaArmiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, 'macedonia');
                macedoniaArmiesInNeighbor.forEach(allyArmy => {
                    const allyPower = calculateCombatPower(allyArmy);
                    const cityName = this.getCityName(cityId);
                    details.neighborAllyArmies.push({ 
                        commander: allyArmy.commander, 
                        power: allyPower,
                        city: cityName,
                        faction: 'macedonia'
                    });
                    details.neighborAllyPower += allyPower * 0.5;
                });
            }
            
            // 塞琉古相邻支援
            if (this.isAlliedWithSeleucid()) {
                const seleucidArmiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, 'seleucid');
                seleucidArmiesInNeighbor.forEach(allyArmy => {
                    const allyPower = calculateCombatPower(allyArmy);
                    const cityName = this.getCityName(cityId);
                    details.neighborAllyArmies.push({ 
                        commander: allyArmy.commander, 
                        power: allyPower,
                        city: cityName,
                        faction: 'seleucid'
                    });
                    details.neighborAllyPower += allyPower * 0.5;
                });
            }
            
            // 托勒密相邻支援
            if (this.isAlliedWithPtolemy()) {
                const ptolemyArmiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, 'ptolemy');
                ptolemyArmiesInNeighbor.forEach(allyArmy => {
                    const allyPower = calculateCombatPower(allyArmy);
                    const cityName = this.getCityName(cityId);
                    details.neighborAllyArmies.push({ 
                        commander: allyArmy.commander, 
                        power: allyPower,
                        city: cityName,
                        faction: 'ptolemy'
                    });
                    details.neighborAllyPower += allyPower * 0.5;
                });
            }
        });
        totalPower += details.neighborAllyPower;
        
        return {
            totalPower: totalPower,
            details: details
        };
    },

    /**
     * 计算敌方在某位置的综合战力（考虑潜在援军，排除盟友）
     * @param {string} locationId - 评估位置
     * @param {string} enemyFaction - 敌方阵营
     * @returns {Object} { totalPower: number, details: string }
     */
    calculateEnemyComprehensivePower(locationId, enemyFaction) {
        // 如果是盟友，返回0战力
        if (this.isAlly(enemyFaction)) {
            return {
                totalPower: 0,
                details: '(盟友)'
            };
        }
        
        let totalPower = 0;
        let details = [];
        
        // 1. 同城敌军战力
        const enemiesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, enemyFaction);
        if (enemiesInCity.length > 0) {
            const cityPower = enemiesInCity.reduce((sum, e) => sum + calculateCombatPower(e), 0);
            totalPower += cityPower;
            details.push(`同城${cityPower}`);
        }
        
        // 2. 相邻敌军战力 * 0.5
        const connectedCities = getConnectedCities(locationId);
        let neighborPower = 0;
        connectedCities.forEach(cityId => {
            const enemiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
            enemiesInNeighbor.forEach(enemy => {
                neighborPower += calculateCombatPower(enemy) * 0.5;
            });
        });
        
        if (neighborPower > 0) {
            totalPower += neighborPower;
            details.push(`相邻${neighborPower.toFixed(0)}`);
        }
        
        return {
            totalPower: totalPower,
            details: details.length > 0 ? `(${details.join('+')})` : ''
        };
    },

    /**
     * 检查目标城市的敌军情况（使用综合战力评估）
     * 【关键】评估的是"移动到目标城市后"的战力对比
     * 返回: { canMove: boolean, shouldReinforce: boolean, powerGap: number, reason: string }
     */
    checkEnemyAtTarget(army, targetCityId) {
        const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
        const myFaction = this.config.controlledFaction;
        
        const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(targetCityId, enemyFaction);
        
        if (enemiesAtCity.length === 0) {
            return { canMove: true, shouldReinforce: false, powerGap: 0, reason: '' };
        }
        
        // 使用综合战力评估（基于目标位置）
        // 我方：本队战力 + 目标城市同城友军*0.5 + 目标城市相邻友军*0.5
        const myResult = this.calculateComprehensivePower(army, targetCityId, myFaction);
        const myPower = myResult.totalPower;
        
        // 敌方：敌军战力 + 目标城市同城敌军*0.5 + 目标城市相邻敌军*0.5
        const enemyResult = this.calculateEnemyComprehensivePower(targetCityId, enemyFaction);
        const enemyPower = enemyResult.totalPower;
        
        const powerGap = enemyPower - myPower;
        
        // 构建详细说明
        let detailInfo = '';
        if (myResult.details.sameCityAllies.length > 0 || myResult.details.neighborAllies.length > 0) {
            detailInfo += `\n   我方援军: `;
            if (myResult.details.sameCityAllies.length > 0) {
                detailInfo += `同城${myResult.details.sameCityAllies.length}支(+${myResult.details.sameCityPower.toFixed(0)}) `;
            }
            if (myResult.details.neighborAllies.length > 0) {
                detailInfo += `相邻${myResult.details.neighborAllies.length}支(+${myResult.details.neighborPower.toFixed(0)})`;
            }
        }
        if (enemyResult.details) {
            detailInfo += `\n   敌方${enemyResult.details}`;
        }
        
        // 如果我方更强，可以移动并攻击
        if (myPower > enemyPower) {
            return { 
                canMove: true, 
                shouldReinforce: false, 
                powerGap: powerGap,
                reason: `综合优势${(myPower / enemyPower).toFixed(2)}:1 (我${myPower.toFixed(0)}vs敌${enemyPower.toFixed(0)})${detailInfo}` 
            };
        }
        
        // 如果我方较弱
        if (powerGap <= 100) {
            // 差距在100以内，应该先征召/整编
            return { 
                canMove: false, 
                shouldReinforce: true, 
                powerGap: powerGap,
                reason: `综合劣势${(enemyPower / myPower).toFixed(2)}:1，差距${powerGap.toFixed(0)}，建议增强${detailInfo}` 
            };
        } else {
            // 差距超过100，排除该目标
            return { 
                canMove: false, 
                shouldReinforce: false, 
                powerGap: powerGap,
                reason: `综合劣势${(enemyPower / myPower).toFixed(2)}:1，差距${powerGap.toFixed(0)}过大，排除目标${detailInfo}` 
            };
        }
    },

    /**
     * 评估移动选项
     */
    evaluateMoveOptions(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        const connectedCities = getConnectedCities(army.location);
        
        // 获取上一回合位置，避免来回移动
        const history = this.armyHistory[army.id] || {};
        const lastLocation = history.lastLocation;
        
        let bestMove = null;
        let bestScore = 0;
        let bestReason = '';
        let shouldReinforceInstead = false; // 标记是否应该增强而非移动
        
        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;
            
            // 先检查目标城市的敌军情况
            const enemyCheck = this.checkEnemyAtTarget(army, cityId);
            
            // 如果差距过大（>100），排除该目标
            if (!enemyCheck.canMove && !enemyCheck.shouldReinforce) {
                // addLog(`   ❌ ${this.getCityName(cityId)}: ${enemyCheck.reason}`, 'info');
                continue; // 跳过这个目标
            }
            
            // 如果需要增强（差距<=100），记录但继续评估其他目标
            if (enemyCheck.shouldReinforce) {
                shouldReinforceInstead = true;
                // addLog(`   ⚠️ ${this.getCityName(cityId)}: ${enemyCheck.reason}`, 'info');
                // 不跳过，继续评估，但会降低优先级
            }
            
            let score = 0;
            let reason = '';
            
            // 惩罚：避免原路返回（除非有紧急情况）
            if (cityId === lastLocation) {
                score -= 100;
                // addLog(`   ⚠️ ${this.getCityName(cityId)} 是上一回合位置，降低优先级`, 'info');
            }
            
            // 检查是否是战略目标（罗马专属）
            if (this.config.controlledFaction === 'rome') {
                const strategicValue = this.evaluateRomeStrategicValue(cityId, situation);
                if (strategicValue.value > 0) {
                    score += strategicValue.value * 0.3; // 战略价值影响移动决策
                    reason = strategicValue.reason;
                }
            }
            
            // 进攻敌方城市
            if (city.faction !== this.config.controlledFaction && 
                city.faction !== 'neutral') {
                const cityValue = this.evaluateCityValue(city);
                score += cityValue * this.config.aggressiveness;
                
                if (!reason) {
                    reason = `进攻敌方城市${this.getCityName(city.id)}(价值${cityValue.toFixed(0)})`;
                }
                
                // 应用敌军检查结果
                if (enemyCheck.canMove && enemyCheck.powerGap < 0) {
                    // 我方有优势
                        score += 40;
                    reason += `，${enemyCheck.reason}`;
                } else if (enemyCheck.shouldReinforce) {
                    // 需要增强，大幅降低优先级
                    score -= 80;
                    reason += `，${enemyCheck.reason}`;
                }
            }
            
            // 支援友方城市（包括己方和联盟）
            if (this.isFriendlyCity(city)) {
                // 检查是否有威胁
                const threats = situation.enemyArmies.filter(e => {
                    const dist = this.calculateDistance(e.location, cityId);
                    return dist <= 2;
                });
                
                if (threats.length > 0) {
                    score += 60;
                    const cityType = city.faction === this.config.controlledFaction ? '己方' : '联盟';
                    if (!reason) {
                        reason = `支援受威胁的${cityType}城市${this.getCityName(city.id)}(${threats.length}支敌军接近)`;
                    }
                }
                
                // 检查友方城市是否有敌军（可能是敌军占领了我方或联盟城市）
                if (enemyCheck.shouldReinforce) {
                    score -= 50; // 降低优先级
                    reason += `，但${enemyCheck.reason}`;
                }
            }
            
            // 游说中立城市的位置
            if (city.faction === 'neutral') {
                // 检查该城市是否可以直接游说（无敌军驻守）
                const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
                const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
                
                if (enemiesAtCity.length === 0) {
                    // 可以直接游说，不应该移动到那里（游说优先级会更高）
                    // 降低移动优先级，让游说决策优先
                    // addLog(`   ℹ️ ${this.getCityName(city.id)} 可直接游说，降低移动优先级`, 'info');
                    continue; // 跳过这个城市作为移动目标
                }
                
                const cityValue = this.evaluateCityValue(city);
                score += cityValue * this.config.economicFocus;
                if (!reason) {
                    reason = `前往中立城市${this.getCityName(city.id)}(价值${cityValue.toFixed(0)})`;
                }
                
                // 检查中立城市的敌军
                if (enemyCheck.shouldReinforce) {
                    score -= 60;
                    reason += `，但${enemyCheck.reason}`;
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = {
                    type: 'move',
                    target: cityId,
                    priority: 50 + score,
                    reason: reason
                };
                bestReason = reason;
            }
        }
        
        // 如果所有目标都需要增强，返回null让其他决策（如征召/整编）优先
        if (shouldReinforceInstead && (!bestMove || bestScore < 0)) {
            // addLog(`   💪 所有移动目标都有强敌，建议先增强实力`, 'info');
            return null;
        }
        
        return bestMove;
    },

    /**
     * 评估围城选项
     */
    evaluateSiegeOptions(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        
        // 只围攻敌方城市
        // 特殊例外1：叙拉古即使是中立也可以围城
        // 特殊例外2：中立城市停留超过6回合也可以围城
        const isSyracuseSpecialCase = (currentCity.id === 'syracuse' && 
                                        currentCity.faction === 'neutral' && 
                                        this.config.controlledFaction === 'rome');
        
        const stayHistory = this.armyStayHistory[army.id];
        const stayTurns = (stayHistory && stayHistory.cityId === army.location) ? stayHistory.stayTurns : 0;
        const isLongStayCase = (currentCity.faction === 'neutral' && stayTurns > 6);
        
        if (!isSyracuseSpecialCase && !isLongStayCase) {
            // 不围攻己方、联盟和中立城市
            if (this.isFriendlyCity(currentCity) || currentCity.faction === 'neutral') {
                return null;
            }
        }
        
        // 检查是否已经在围城
        if (currentCity.isUnderSiege) {
            return null;
        }
        
        // 检查是否有敌军
        const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
        const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
        
        // 【修复】如果是中立城市有敌军，允许围城（因为无法游说）
        // 其他情况有敌军则不能围城（应该先战斗）
        if (enemiesAtCity.length > 0 && currentCity.faction !== 'neutral') {
            return null;
        }
        
        const cityValue = this.evaluateCityValue(currentCity);
        const fortLevel = currentCity.fortificationLevel || 0;
        let priority = 70 + cityValue / 5;
        
        // 根据不同情况生成描述
        let reason;
        if (currentCity.faction === 'neutral') {
            // 检查是否有敌军驻守
            if (enemiesAtCity.length > 0) {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(有敌军驻守，无法游说)`;
                priority = 75 + cityValue / 5; // 提高优先级
            } else if (isLongStayCase) {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(停留${stayTurns}回合，游说失败转围城)`;
            } else if (isSyracuseSpecialCase) {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(叙拉古战略特权)`;
            } else {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(价值${cityValue.toFixed(0)})`;
            }
        } else {
            reason = `围攻敌城${this.getCityName(currentCity.id)}(价值${cityValue.toFixed(0)}, 工事${fortLevel}级)`;
        }
        
        // 检查是否是战略目标（罗马专属）
        if (this.config.controlledFaction === 'rome') {
            const strategicValue = this.evaluateRomeStrategicValue(currentCity.id, situation);
            if (strategicValue.value > 0) {
                priority += strategicValue.value * 0.5; // 战略价值大幅提升围城优先级
                reason = `${strategicValue.reason} - ${reason}`;
            }
        }
        
        return {
            type: 'siege',
            target: currentCity,
            priority: priority,
            reason: reason
        };
    },

    /**
     * 评估游说选项
     */
    evaluateDiplomacyOptions(army, situation) {
        // 检查资金
        if (situation.myFunds < 50) return null;
        
        const currentCity = cities.find(c => c.id === army.location);
        const connectedCities = getConnectedCities(army.location);
        
        let bestTarget = null;
        let bestScore = 0;
        let bestReason = '';
        
        // 检查当前城市和相邻城市
        const citesToCheck = [currentCity, ...connectedCities.map(id => cities.find(c => c.id === id))];
        
        for (const city of citesToCheck) {
            if (!city) continue;
            
            // 检查是否可以游说
            const enemyFaction = this.config.controlledFaction === 'rome' ? 'carthage' : 'rome';
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(city.id, enemyFaction);
            
            // 【新增】如果城市有敌军，且是中立城市，改为围攻
            if (enemiesAtCity.length > 0) {
                if (city.faction === 'neutral') {
                    const cityValue = this.evaluateCityValue(city);
                    const score = cityValue * 1.2;  // 围攻优先级略低于游说
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        bestReason = `中立城市${this.getCityName(city.id)}有敌军驻守，改为围攻`;
                    }
                }
                continue;
            }
            
            // 优先游说中立城市
            if (city.faction === 'neutral') {
                const attitude = this.config.controlledFaction === 'rome' ? 
                    (city.romeAttitude || 0) : (city.carthageAttitude || 0);
                const cityValue = this.evaluateCityValue(city);
                
                // 态度接近转换阈值时优先游说
                if (attitude >= 2) {
                    const score = cityValue * 1.5;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        bestReason = `游说中立城市${this.getCityName(city.id)}(态度${attitude}/3, 价值${cityValue.toFixed(0)}, 接近转换)`;
                    }
                } else {
                    const score = cityValue;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        bestReason = `游说中立城市${this.getCityName(city.id)}(态度${attitude}/3, 价值${cityValue.toFixed(0)})`;
                    }
                }
            }
            // 也可以游说友方城市（己方或联盟）增加态度
            else if (this.isFriendlyCity(city)) {
                const attitude = this.config.controlledFaction === 'rome' ? 
                    (city.romeAttitude || 0) : (city.carthageAttitude || 0);
                
                // 如果态度较低，增加游说优先级
                if (attitude < 3) {
                    const cityValue = this.evaluateCityValue(city);
                    const score = cityValue * 0.5;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        const cityType = city.faction === this.config.controlledFaction ? '己方' : '联盟';
                        bestReason = `巩固${cityType}城市${this.getCityName(city.id)}(态度${attitude}/3较低)`;
                    }
                }
            }
        }
        
        if (bestTarget) {
            // 【新增】如果原因包含"改为围攻"，返回围攻决策
            if (bestReason.includes('改为围攻')) {
                return {
                    type: 'siege',
                    target: bestTarget,
                    priority: 55 + bestScore / 10,  // 围攻优先级略低
                    reason: bestReason
                };
            }
            
            return {
                type: 'diplomacy',
                target: bestTarget,
                priority: 60 + bestScore / 10,
                reason: bestReason
            };
        }
        
        return null;
    },

    /**
     * 评估征召选项
     */
    evaluateRecruitOptions(army, situation) {
        // 检查资金
        if (situation.myFunds < 200) return null;
        
        const armyPower = calculateCombatPower(army);
        
        // 如果军队战斗力较低，考虑征召
        if (armyPower < 200) {
            return {
                type: 'recruit',
                priority: 40 + (200 - armyPower) / 5,
                reason: `军队战力偏低(${armyPower}), 需要补充兵力`
            };
        }
        
        return null;
    },

    /**
     * 评估整编选项
     */
    evaluateReorganizeOptions(army, situation) {
        // 检查资金
        if (situation.myFunds < 100) return null;
        
        // 如果士气低，优先整编
        if (army.morale < 5) {
            return {
                type: 'reorganize',
                priority: 55 + (3 - army.morale) * 10,
                reason: `士气过低(${army.morale}/5), 需要整编提升`
            };
        }
        
        return null;
    },

    /**
     * 评估修筑选项
     */
    evaluateFortifyOptions(army, situation) {
        // 检查资金
        if (situation.myFunds < 150) return null;
        
        const currentCity = cities.find(c => c.id === army.location);
        
        // 只在己方城市修筑
        if (currentCity.faction !== this.config.controlledFaction) {
            return null;
        }
        
        const fortLevel = currentCity.fortificationLevel || 0;
        const maxFortLevel = 5; // 最高工事等级
        
        // 工事等级达到5级后，不再修筑
        if (fortLevel >= maxFortLevel) {
            return null;
        }
        
        // 重要城市：修筑到5级
        // 普通城市：修筑到3级
        let targetLevel = currentCity.important ? maxFortLevel : 3;
        
        if (fortLevel < targetLevel) {
            // 未达目标等级，修筑提升工事
            return {
                type: 'fortify',
                priority: 35 + (currentCity.important ? 20 : 0),
                reason: `强化城市${this.getCityName(currentCity.id)}(当前工事${fortLevel}级)`
            };
        }
        
        return null;
    },

    // ==================== 执行系统 ====================

    /**
     * 执行AI回合
     */
    async executeTurn() {
        if (!this.shouldControl()) return;
        
        const factionName = this.config.controlledFaction === 'rome' ? '罗马' : '迦太基';
        // addLog(`🤖 ========== AI开始执行 ${factionName} 的回合 ==========`, 'system');
        
        // 重置本回合借款标记
        if (this.currentTurnForBorrow !== gameState.turn) {
            this.currentTurnForBorrow = gameState.turn;
            this.borrowedThisTurn = false;
        }
        
        // 检查城市变化（检测失去或夺回的城市）
        this.checkCityChanges(this.config.controlledFaction);
        
        const situation = this.evaluateSituation();
        
        
        // 罗马战略目标状态
        if (this.config.controlledFaction === 'rome') {
            const goals = this.romeStrategicGoals;
            // addLog(`\n🎯 罗马战略目标:`, 'info');
            
            // 1. 罗马城状态
            const romeCity = cities.find(c => c.id === goals.defenseCapital.cityId);
            const romeStatus = romeCity && romeCity.faction === 'rome' ? '✅ 已控制' : '❌ 已失陷';
            const threats = situation.enemyArmies.filter(e => {
                const dist = this.calculateDistance(e.location, goals.defenseCapital.cityId);
                return dist <= goals.defenseCapital.defensiveRadius;
            });
            const threatStatus = threats.length > 0 ? `⚠️ 受威胁(${threats.length}支敌军)` : '✅ 安全';
            // addLog(`   首要目标 - 保卫罗马城: ${romeStatus}, ${threatStatus}`, 'info');
            
            // 2. 重要进攻目标
            for (const target of goals.offensiveTargets) {
                const targetCity = cities.find(c => c.id === target.cityId);
                const status = targetCity.faction === 'rome' ? '✅ 已占领' : 
                             targetCity.faction === 'carthage' ? '❌ 敌方控制' : '⚪ 中立';
                const siege = targetCity.isUnderSiege ? '(围城中)' : '';
                // addLog(`   ${target.description}: ${status} ${siege}`, 'info');
            }
            
            // 3. 西班牙地区进度
            const controlledSpainCities = goals.spainRegion.cityIds.filter(id => {
                const city = cities.find(c => c.id === id);
                return city && city.faction === 'rome';
            }).length;
            const totalSpainCities = goals.spainRegion.cityIds.length;
            const controlPercentage = (controlledSpainCities / totalSpainCities * 100).toFixed(0);
            // addLog(`   占领西班牙: ${controlledSpainCities}/${totalSpainCities}座 (${controlPercentage}%)`, 'info');
        }
        
        if (this.config.debugMode) {
            console.log('AI详细评估:', situation);
        }
        
        // 【组军决策】在所有军队行动前检查是否应该组军
        if (this.config.controlledFaction === 'rome') {
            const raiseArmyDecision = this.shouldRaiseNewArmy(situation);
            if (raiseArmyDecision) {
                // addLog(`\n🏗️ 执行组军决策：${raiseArmyDecision.reason}`, 'success');
                
                // 调用组军函数
                const raiseSuccess = executeRaiseArmy();
                if (raiseSuccess) {
                    // addLog(`✅ 组军成功！`, 'success');
                    // 组军后更新situation
                    await this.delay(500);
                } else {
                    // addLog(`❌ 组军失败`, 'error');
                }
            }
        }
        
        // 为每支军队执行决策
        const currentArmies = armies[this.config.controlledFaction] || [];
        // addLog(`🎲 开始逐个处理 ${currentArmies.length} 支军队...`, 'info');
        
        // 在开始处理军队决策之前，清除所有军队的旧决策信息
        currentArmies.forEach(army => {
            delete army.aiDecision;
        });
        
        for (let i = 0; i < currentArmies.length; i++) {
            const army = currentArmies[i];
            
            // 等待延迟
            await this.delay(this.config.autoDelay);
            
            // 检查是否暂停（战斗进行中）
            await this.waitIfPaused();
            
            // 检查军队是否还存在（可能在战斗中被消灭）
            if (!armies[this.config.controlledFaction].find(a => a.id === army.id)) {
                // addLog(`⚠️ ${army.commander} 已不存在，跳过`, 'warning');
                continue;
            }
            
            // addLog(`\n--- 🎯 处理第${i+1}/${currentArmies.length}支军队: ${army.commander} ---`, 'info');
            
            // 等待决策（支持同步和异步）
            const decision = await Promise.resolve(this.decideArmyAction(army, situation));
            
            if (this.config.debugMode) {
                console.log(`AI决策 [${army.commander}]:`, decision);
            }
            
            // 保存AI决策信息到军队对象（用于鼠标浮动显示）
            army.aiDecision = {
                actionName: this.getActionName(decision.type),
                reason: decision.reason || '无',
                priority: decision.priority || 0,
                type: decision.type,
                timestamp: Date.now()
            };
            
            await this.executeDecision(army, decision);
            
            // 执行决策后立即检查是否暂停（如果决策触发了战斗）
            await this.waitIfPaused();
            
            // 等待延迟
            await this.delay(this.config.autoDelay);
        }
        
        // 所有军队完成后，自动结束回合
        await this.delay(this.config.autoDelay);
        
        // 非看海模式时才自动结束回合，看海模式由外层控制
        if (!gameState.watchMode) {
            endTurn();
        } else {
            // addLog(`🤖 罗马AI回合执行完毕`, 'system');
        }
    },

    /**
     * 执行具体决策
     */
    async executeDecision(army, decision) {
        if (!decision) {
            // addLog(`❌ 致命错误：${army.commander} 决策系统失败`, 'error');
            // 应急措施：强制整编
            gameState.selectedArmy = army.id;
            gameState.selectedRegion = army.location;
            executeReorganize();
            return;
        }

        const actionName = this.getActionName(decision.type);
        // addLog(`🎯 ${army.commander} 最终决定: ${actionName} - ${decision.reason}`, 'success');

        // 设置选中的军队
        gameState.selectedArmy = army.id;

        // 验证并修正决策（对于移动，会自动调整为路径上的下一步）
        const isValid = this.validateAndFixDecision(army, decision);
        if (!isValid) {
            // addLog(`⚠️ 决策验证失败且无法修正，${army.commander} 执行兜底行动`, 'warning');
            // 执行兜底行动
            const fallbackDecision = this.getFallbackAction(army, this.evaluateSituation());
            return await this.executeDecision(army, fallbackDecision);
        }

        // 执行决策前，制定下回合计划
        const situation = this.evaluateSituation();
        this.makeNextTurnPlan(army, decision, situation);

        switch (decision.type) {
            case 'move':
                // 记录移动前的位置和绕路状态
                this.armyHistory[army.id] = {
                    lastLocation: army.location,
                    actionCount: (this.armyHistory[army.id]?.actionCount || 0) + 1,
                    detoured: decision._detoured || false // 记录是否使用了绕路方案
                };
                gameState.selectedRegion = decision.target;
                executeMove();
                // 更新行动历史（记录绕路）
                this.updateArmyActionHistory(army, decision._detoured || false, false);
                break;

            case 'attack':
                // 攻击不改变位置，保持绕路状态
                executeAttack();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'siege':
                // 围城不改变位置，保持绕路状态
                gameState.selectedRegion = army.location;
                executeAction('siege');
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'diplomacy':
                // 外交不改变位置，保持绕路状态
                gameState.selectedRegion = decision.target.id;
                executeDiplomacy();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'recruit':
                // 征召后实力增强，清除绕路标记（下回合可以重新尝试直接路径）
                if (this.armyHistory[army.id]) {
                    this.armyHistory[army.id].detoured = false;
                }
                gameState.selectedRegion = army.location;
                executeRecruit();
                // 更新行动历史（清除绕路和撤退标记）
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'reorganize':
                // 整编后实力恢复，清除绕路标记
                if (this.armyHistory[army.id]) {
                    this.armyHistory[army.id].detoured = false;
                }
                gameState.selectedRegion = army.location;
                executeReorganize();
                // 更新行动历史（清除绕路和撤退标记）
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'fortify':
                // 修筑不改变位置，保持绕路状态
                gameState.selectedRegion = army.location;
                executeFortify();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'borrow':
                // 借贷不影响军队状态
                executeBorrow();
                this.borrowedThisTurn = true; // 标记本回合已借款
                // addLog(`📝 已标记本回合借款，本回合不再借款`, 'info');
                break;

            default:
                // 未知决策类型，记录错误
                // addLog(`❌ 错误：未知决策类型 ${decision.type}`, 'error');
                // 强制执行整编作为安全措施
                gameState.selectedRegion = army.location;
                executeReorganize();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;
        }
    },

    /**
     * 验证并修正决策
     * 对于移动到不相邻城市的情况，自动调整为路径上的下一步
     */
    validateAndFixDecision(army, decision) {
        switch (decision.type) {
            case 'move':
                // 验证目标城市是否相邻
                const connectedCities = getConnectedCities(army.location);
                if (!connectedCities.includes(decision.target)) {
                    // 目标不相邻，尝试找到通往目标的下一步
                    // addLog(`   ⚠️ ${this.getCityName(decision.target)} 不与 ${this.getCityName(army.location)} 相邻，查找路径...`, 'warning');
                    
                    const nextStep = this.getNextStepToTarget(army.location, decision.target);
                    if (nextStep) {
                        const oldTarget = decision.target;
                        decision.target = nextStep;
                        decision.reason = `[自动路径] 向${this.getCityName(oldTarget)}进军，当前移动至${this.getCityName(nextStep)}`;
                        // addLog(`   ✅ 已调整移动目标：${this.getCityName(army.location)} → ${this.getCityName(nextStep)} → ${this.getCityName(oldTarget)}`, 'success');
                        return true;
                    } else {
                        // addLog(`   ❌ 无法找到通往${this.getCityName(decision.target)}的路径`, 'error');
                        return false;
                    }
                }
                return true;
            
            default:
                // 其他决策类型使用原有验证逻辑
                return this.validateDecision(army, decision);
        }
    },

    /**
     * 验证决策是否有效（原有逻辑保留）
     */
    validateDecision(army, decision) {
        switch (decision.type) {
            case 'move':
                // 验证目标城市是否相邻
                const connectedCities = getConnectedCities(army.location);
                if (!connectedCities.includes(decision.target)) {
                    return false;
                }
                return true;

            case 'siege':
                // 验证围城条件
                const siegeCity = cities.find(c => c.id === army.location);
                if (!siegeCity) {
                    // addLog(`   ❌ 围城验证失败：找不到城市 ${this.getCityName(army.location)}`, 'error');
                    return false;
                }
                if (this.isFriendlyCity(siegeCity)) {
                    // addLog(`   ❌ 围城验证失败：${this.getCityName(army.location)} 是友方城市`, 'error');
                    return false;
                }
                
                // 检查中立城市围城的特殊例外
                if (siegeCity.faction === 'neutral') {
                    // 例外1：叙拉古战略特权
                    const isSyracuseSpecialCase = (
                        siegeCity.id === 'syracuse' && 
                        this.config.controlledFaction === 'rome'
                    );
                    
                    // 例外2：长期停留（超过6回合）
                    const stayHistory = this.armyStayHistory[army.id];
                    const stayTurns = (stayHistory && stayHistory.cityId === army.location) 
                        ? stayHistory.stayTurns 
                        : 0;
                    const isLongStayCase = (stayTurns > 6);
                    
                    // 如果不是特殊例外，则不允许围城中立城市
                    if (!isSyracuseSpecialCase && !isLongStayCase) {
                        // addLog(`   ❌ 围城验证失败：${this.getCityName(army.location)} 是中立城市（需叙拉古特权或停留>6回合）`, 'error');
                    return false;
                }
                    
                    // 是特殊例外，允许围城
                    if (isSyracuseSpecialCase) {
                        // addLog(`   ✅ 围城验证通过：${this.getCityName(army.location)} (叙拉古战略特权)`, 'info');
                    } else if (isLongStayCase) {
                        // addLog(`   ✅ 围城验证通过：${this.getCityName(army.location)} (停留${stayTurns}回合，允许围城)`, 'info');
                    }
                }
                
                return true;

            case 'diplomacy':
                // 验证游说条件
                if (!decision.target || !decision.target.id) {
                    // addLog(`   ❌ 游说验证失败：无效的目标`, 'error');
                    return false;
                }
                return true;

            case 'recruit':
            case 'reorganize':
            case 'fortify':
            case 'borrow':
            case 'attack':
                // 这些行动不需要额外验证
                return true;

            default:
                return false;
        }
    },

    /**
     * 获取行动名称
     */
    getActionName(type) {
        const names = {
            'move': '移动',
            'attack': '攻击',
            'siege': '围城',
            'diplomacy': '游说',
            'recruit': '征召',
            'reorganize': '整编',
            'fortify': '修筑',
            'borrow': '借款'
        };
        return names[type] || '未知行动';
    },

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 暂停AI执行
     */
    pause() {
        if (!this.config.paused) {
            this.config.paused = true;
            addLog(`⏸️ AI执行已暂停（战斗进行中）`, 'system');
        }
    },

    /**
     * 恢复AI执行
     */
    resume() {
        if (this.config.paused) {
            this.config.paused = false;
            if (this.config.pauseResolve) {
                this.config.pauseResolve();
                this.config.pauseResolve = null;
            }
            addLog(`▶️ AI执行已恢复`, 'system');
        }
    },

    /**
     * 等待恢复（如果暂停）
     */
    async waitIfPaused() {
        if (this.config.paused) {
            await new Promise(resolve => {
                this.config.pauseResolve = resolve;
            });
        }
    },

    /**
     * 主动攻击时的援军请求和决策（攻击方）
     * @param {Object} attackerArmy - 攻击方军队
     * @param {Object} defenderArmy - 防御方军队
     * @param {Object} city - 战斗城市
     * @returns {boolean} - 是否继续进攻
     */
    async handleAttackDecision(attackerArmy, defenderArmy, city) {
        // 检查是否是AI控制的阵营
        if (!this.config.enabled || attackerArmy.faction !== this.config.controlledFaction) {
            return true; // 不是AI控制的军队，继续进攻
        }

        addLog(`🤖 AI正在准备进攻...`, attackerArmy.faction);

        // 第一步：请求所有可能的援军
        addLog(`📢 ${attackerArmy.commander} 向附近己方军队请求援军...`, attackerArmy.faction);
        
        const supportRequested = await this.requestAllSupport(attackerArmy, defenderArmy, city);
        
        if (supportRequested) {
            addLog(`✅ 援军请求已发送，等待支援到达`, attackerArmy.faction);
            await this.delay(1500);
        } else {
            addLog(`ℹ️ 附近无可用援军，${attackerArmy.commander} 将独自进攻`, attackerArmy.faction);
        }

        // 第二步：使用综合战力评估（包含潜在援军）
        const myResult = this.calculateComprehensivePower(attackerArmy, city.id, attackerArmy.faction);
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(city.id, defenderArmy.faction);
        const enemyPower = enemyResult.totalPower;
        
        const powerRatio = myPower / enemyPower;

        addLog(`⚖️ 综合实力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)} (${powerRatio.toFixed(2)}:1)`, attackerArmy.faction);

        // 第三步：决定是否继续进攻
        if (myPower > enemyPower) {
            addLog(`⚔️ 综合战力占据优势，${attackerArmy.commander} 发起进攻！`, attackerArmy.faction);
            return true; // 继续进攻
        } else {
            addLog(`⚠️ 即使考虑潜在援军后仍处于劣势(${powerRatio.toFixed(2)}:1)，但已经承诺进攻`, 'warning');
            return true; // 仍然继续进攻（因为已经主动攻击了）
        }
    },

    /**
     * 应对敌军攻击的决策（防御方）
     * @param {Object} defenderArmy - 防御方军队
     * @param {Object} attackerArmy - 攻击方军队
     * @param {Object} city - 战斗城市
     * @returns {Object} - 决策结果 { action: 'battle'|'retreat'|'siege', reason: string }
     */
    async handleDefenseDecision(defenderArmy, attackerArmy, city) {
        // 检查是否是AI控制的阵营（注意：不检查shouldControl，因为可能是对方回合攻击过来）
        if (!this.config.enabled || defenderArmy.faction !== this.config.controlledFaction) {
            return null; // 不是AI控制的军队
        }

        addLog(`🤖 AI正在评估防御策略...`, defenderArmy.faction);

        // 第一步：AI自动请求同城和周边所有地区的援军
        addLog(`📢 ${defenderArmy.commander} 向附近己方军队请求援军...`, defenderArmy.faction);
        
        const supportRequested = await this.requestAllSupport(defenderArmy, attackerArmy, city);
        
        if (supportRequested) {
            addLog(`✅ 援军请求已发送，等待支援到达`, defenderArmy.faction);
            await this.delay(1500);
        } else {
            addLog(`ℹ️ 附近无可用援军，${defenderArmy.commander} 将独自应战`, defenderArmy.faction);
        }

        // 第二步：使用综合战力评估（包含请求完援军后的战力）
        const myResult = this.calculateComprehensivePower(defenderArmy, city.id, defenderArmy.faction);
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(city.id, attackerArmy.faction);
        const enemyPower = enemyResult.totalPower;
        
        const powerRatio = myPower / enemyPower;

        addLog(`⚖️ 综合实力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)} (${powerRatio.toFixed(2)}:1)`, defenderArmy.faction);

        // 第三步：根据城市阵营和实力对比做出决策
        const isMyCity = this.isFriendlyCity(city);
        const powerGap = enemyPower - myPower;
        
        if (isMyCity) {
            // ========== (二) 当前处于友方城市（己方或联盟）==========
            const cityType = city.faction === defenderArmy.faction ? '己方' : '联盟';
            addLog(`📍 当前位于${cityType}城市 ${city.name}`, defenderArmy.faction);
            
            if (myPower > enemyPower * 0.9) {
                // (1) 战力 > 敌方×0.9：会战
                addLog(`⚔️ 综合战力优势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定进行会战！`, defenderArmy.faction);
                return {
                    action: 'battle',
                    reason: `${cityType}城市优势会战(${powerRatio.toFixed(2)}:1)`
                };
            } else if (myPower > enemyPower * 0.5) {
                // (2) 敌方×0.5 < 战力 ≤ 敌方×0.9：守城
                addLog(`🛡️ 战力处于中等劣势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定守城！`, defenderArmy.faction);
                addLog(`📝 后续回合将优先征召和整编增强实力`, defenderArmy.faction);
                
                // 标记该军队下回合优先增强
                if (!this.armyPlans[defenderArmy.id]) {
                    this.armyPlans[defenderArmy.id] = {};
                }
                this.armyPlans[defenderArmy.id].prioritizeReinforce = true;
                
                return {
                    action: 'siege',
                    reason: `${cityType}城市中等劣势守城(${powerRatio.toFixed(2)}:1，差距${powerGap.toFixed(0)})`
                };
            } else {
                // (3) 战力 ≤ 敌方×0.5：判断周边有无中立/己方城市
                addLog(`⚠️ 战力处于严重劣势（${powerRatio.toFixed(2)}:1），差距${powerGap.toFixed(0)}`, 'warning');
                
                // 评估撤退目标（只考虑中立或己方城市）
                const retreatTarget = this.findBestRetreatTarget(defenderArmy, attackerArmy);
                
                if (retreatTarget) {
                    const targetCity = cities.find(c => c.id === retreatTarget);
                    let factionDesc = '敌方';
                    if (this.isFriendlyCity(targetCity)) {
                        factionDesc = targetCity.faction === defenderArmy.faction ? '己方' : '联盟';
                    } else if (targetCity.faction === 'neutral') {
                        factionDesc = '中立';
                    }
                    addLog(`🏃 找到${factionDesc}城市可撤退，${defenderArmy.commander} 决定撤退至 ${targetCity.name}`, defenderArmy.faction);
                    return {
                        action: 'retreat',
                        reason: `${cityType}城市严重劣势撤退至${factionDesc}城市(${powerRatio.toFixed(2)}:1)`
                    };
                } else {
                    // 周边无合适撤退目标，守城
                    addLog(`🛡️ 周边无合适撤退目标，${defenderArmy.commander} 决定守城死战！`, defenderArmy.faction);
                    
                    // 标记该军队下回合优先增强
                    if (!this.armyPlans[defenderArmy.id]) {
                        this.armyPlans[defenderArmy.id] = {};
                    }
                    this.armyPlans[defenderArmy.id].prioritizeReinforce = true;
                    
                    return {
                        action: 'siege',
                        reason: `己方城市无路可退守城(${powerRatio.toFixed(2)}:1，差距${powerGap.toFixed(0)})`
                    };
                }
            }
        } else {
            // ========== (一) 当前处于敌方城市或中立城市 ==========
            const cityType = city.faction === 'neutral' ? '中立城市' : '敌方城市';
            addLog(`📍 当前位于${cityType} ${city.name}`, defenderArmy.faction);
            
            if (myPower > enemyPower * 0.9) {
                // (1) 战力 > 敌方×0.9：会战
                addLog(`⚔️ 综合战力优势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定进行会战！`, defenderArmy.faction);
                return {
                    action: 'battle',
                    reason: `${cityType}优势会战(${powerRatio.toFixed(2)}:1)`
                };
            } else {
                // (2) 战力 ≤ 敌方×0.9：判断周边有无中立/己方城市
                addLog(`⚠️ 战力处于劣势（${powerRatio.toFixed(2)}:1），差距${powerGap.toFixed(0)}`, 'warning');
                
                // 评估撤退目标（只考虑中立或己方城市）
                const retreatTarget = this.findBestRetreatTarget(defenderArmy, attackerArmy);
                
                if (retreatTarget) {
                    const targetCity = cities.find(c => c.id === retreatTarget);
                    const factionDesc = targetCity.faction === defenderArmy.faction ? '己方' : '中立';
                    addLog(`🏃 找到${factionDesc}城市可撤退，${defenderArmy.commander} 决定撤退至 ${targetCity.name}`, defenderArmy.faction);
                    return {
                        action: 'retreat',
                        reason: `${cityType}劣势撤退至${factionDesc}城市(${powerRatio.toFixed(2)}:1)`
                    };
                } else {
                    // 周边无合适撤退目标，会战
                    addLog(`⚔️ 周边无合适撤退目标，${defenderArmy.commander} 决定进行会战！`, defenderArmy.faction);
                    return {
                        action: 'battle',
                        reason: `${cityType}无路可退会战(${powerRatio.toFixed(2)}:1，差距${powerGap.toFixed(0)})`
                    };
                }
            }
        }
    },

    /**
     * 请求所有可能的援军
     */
    async requestAllSupport(requestingArmy, enemyArmy, city) {
        // 获取所有己方军队
        const myArmies = armies[this.config.controlledFaction] || [];
        const supportArmies = [];

        // 查找附近的己方军队（同城或陆路相邻距离=1）
        // 注意：由于海路距离为3，distance <= 1 的条件已自动排除海路连接
        for (const army of myArmies) {
            if (army.id === requestingArmy.id) continue; // 排除自己
            
            const distance = this.calculateDistance(army.location, city.id);
            if (distance <= 1) {  // 同城(0) 或陆路相邻(1)，海路(3)已被排除
                supportArmies.push({ army, distance });
            }
        }

        if (supportArmies.length === 0) {
            return false; // 没有可用援军
        }

        // 按距离排序，优先请求最近的
        supportArmies.sort((a, b) => a.distance - b.distance);

        addLog(`📡 发现${supportArmies.length}支可能的援军：`, requestingArmy.faction);
        for (const { army, distance } of supportArmies) {
            const cityName = this.getCityName(army.location);
            const distanceText = distance === 0 ? '同城' : `${distance}步`;
            addLog(`   - ${army.commander} (${cityName}，距离${distanceText})`, requestingArmy.faction);
        }

        // AI自动请求所有可用援军
        let totalSupported = 0;
        for (const { army, distance } of supportArmies) {
            // 投掷2D6判定是否支援成功
            const dice1 = this.rollD6();
            const dice2 = this.rollD6();
            const diceTotal = dice1 + dice2;
            
            if (diceTotal <= 10) {
                // 支援成功 - 直接执行援军合并
                const transferred = this.executeAIReinforcement(army, requestingArmy, dice1, dice2);
                if (transferred > 0) {
                    totalSupported++;
                }
            } else {
                addLog(`   ❌ ${army.commander} 支援失败 (2D6=${diceTotal} > 10)`, requestingArmy.faction);
            }
            
            // 短暂延迟
            await this.delay(300);
        }

        if (totalSupported > 0) {
            addLog(`✅ 成功获得${totalSupported}支援军！`, requestingArmy.faction);
            // 更新地图显示
            if (typeof placeArmies === 'function') {
                placeArmies();
            }
        }
        
        return totalSupported > 0;
    },

    /**
     * AI执行援军支援（不显示弹窗）
     */
    executeAIReinforcement(reinforcingArmy, requestingArmy, dice1, dice2) {
        // 【修改】援军系统改为只提供战斗力加成，不再实际转移兵力
        // 计算援军的战斗力百分比：2D6 × 10%
        const supportPercentage = (dice1 + dice2) * 10;
        
        // 计算援军可以提供的战斗力（用于显示）
        const lightCavSupport = Math.floor((reinforcingArmy.lightCavalry || 0) * supportPercentage / 100);
        const heavyCavSupport = Math.floor((reinforcingArmy.heavyCavalry || 0) * supportPercentage / 100);
        const heavyInfSupport = Math.floor((reinforcingArmy.heavyInfantry || 0) * supportPercentage / 100);
        const lightInfSupport = Math.floor((reinforcingArmy.lightInfantry || 0) * supportPercentage / 100);
        
        const totalSupport = lightCavSupport + heavyCavSupport + heavyInfSupport + lightInfSupport;
        
        if (totalSupport === 0) {
            addLog(`   ⚠️ ${reinforcingArmy.commander} 兵力不足，无法提供支援`, requestingArmy.faction);
            return 0;
        }
        
        // 【移除】不再实际转移兵力
        // reinforcingArmy.lightCavalry = (reinforcingArmy.lightCavalry || 0) - lightCavTransfer;
        // reinforcingArmy.heavyCavalry = (reinforcingArmy.heavyCavalry || 0) - heavyCavTransfer;
        // reinforcingArmy.heavyInfantry = (reinforcingArmy.heavyInfantry || 0) - heavyInfTransfer;
        // reinforcingArmy.lightInfantry = (reinforcingArmy.lightInfantry || 0) - lightInfTransfer;
        
        // 【移除】不再加入被支援部队
        // requestingArmy.lightCavalry = (requestingArmy.lightCavalry || 0) + lightCavTransfer;
        // requestingArmy.heavyCavalry = (requestingArmy.heavyCavalry || 0) + heavyCavTransfer;
        // requestingArmy.heavyInfantry = (requestingArmy.heavyInfantry || 0) + heavyInfTransfer;
        // requestingArmy.lightInfantry = (requestingArmy.lightInfantry || 0) + lightInfTransfer;
        
        // 记录日志
        addLog(`   ✅ ${reinforcingArmy.commander} 承诺提供援军支援 (2D6=${dice1}+${dice2}，支援战力${supportPercentage}%)`, requestingArmy.faction);
        
        const details = [];
        if (lightCavSupport > 0) details.push(`轻骑兵${lightCavSupport}人`);
        if (heavyCavSupport > 0) details.push(`重骑兵${heavyCavSupport}人`);
        if (heavyInfSupport > 0) details.push(`重步兵${heavyInfSupport}人`);
        if (lightInfSupport > 0) details.push(`轻步兵${lightInfSupport}人`);
        
        if (details.length > 0) {
            addLog(`      援军战力：${details.join(', ')}（参与战斗计算但不转移兵力）`, requestingArmy.faction);
        }
        
        return totalSupport;
    },

    /**
     * 投掷一个6面骰子
     */
    rollD6() {
        return Math.floor(Math.random() * 6) + 1;
    },

    /**
     * 计算城市中某方的总战力
     */
    calculateTotalPowerAtCity(cityId, faction) {
        const armiesAtCity = CityArmyManager.getArmiesAtCityByFaction(cityId, faction);
        return armiesAtCity.reduce((sum, army) => sum + calculateCombatPower(army), 0);
    },

    /**
     * 寻找最佳撤退目标（只考虑中立城市和己方城市）
     */
    findBestRetreatTarget(defenderArmy, attackerArmy) {
        const currentLocation = defenderArmy.location;
        const connectedCities = getConnectedCities(currentLocation);
        
        if (!connectedCities || connectedCities.length === 0) {
            return null;
        }

        const enemyFaction = attackerArmy.faction;
        const myFaction = this.config.controlledFaction;
        let bestTarget = null;
        let bestPriority = -1;

        addLog(`   🔍 评估周边撤退目标...`, myFaction);

        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;

            // 【关键1】海路连接不能作为撤退路线
            if (this.isSeaRoute(currentLocation, cityId)) {
                addLog(`   ❌ ${city.name}(海路) - 海路不能作为撤退路线`, myFaction);
                continue;
            }

            // 【关键2】只考虑中立城市和己方城市，不考虑敌方城市
            if (city.faction !== 'neutral' && city.faction !== myFaction) {
                addLog(`   ❌ ${city.name}(敌方城市) - 不考虑撤退到敌方城市`, myFaction);
                continue;
            }

            // 检查该城市是否有敌军
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
            if (enemiesAtCity.length > 0) {
                const enemyPower = enemiesAtCity.reduce((sum, e) => sum + calculateCombatPower(e), 0);
                const myPower = calculateCombatPower(defenderArmy);
                // 如果撤退目标的敌军太强，跳过
                if (enemyPower >= myPower * 0.8) {
                    addLog(`   ❌ ${city.name}(${city.faction === myFaction ? '己方' : '中立'}) - 有强敌驻守`, myFaction);
                    continue;
                }
            }

            // 根据城市阵营分配优先级
            let priority = 0;
            let factionDesc = '';
            if (city.faction === myFaction) {
                priority = 3; // 优先撤退到我方城市
                factionDesc = '己方';
            } else if (city.faction === 'neutral') {
                priority = 2; // 其次是中立城市
                factionDesc = '中立';
            }

            addLog(`   ✅ ${city.name}(${factionDesc}城市) - 可作为撤退目标(优先级${priority})`, myFaction);

            if (priority > bestPriority) {
                bestPriority = priority;
                bestTarget = cityId;
            }
        }

        if (!bestTarget) {
            addLog(`   ⚠️ 周边无合适的撤退目标（无中立或己方城市）`, myFaction);
        } else {
            const targetCity = cities.find(c => c.id === bestTarget);
            const factionDesc = targetCity.faction === myFaction ? '己方' : '中立';
            addLog(`   🎯 最佳撤退目标：${targetCity.name}(${factionDesc}城市)`, myFaction);
        }

        return bestTarget;
    }
};

// 在回合开始时检查是否需要AI控制
const originalEndTurn = window.endTurn;
window.endTurn = async function() {
    // 调用原始的结束回合函数
    await originalEndTurn();
    
    // 等待回合切换完成
    await AIController.delay(500);
    
    // 看海模式下更新按钮状态
    if (gameState.watchMode && typeof toggleGameButtons === 'function') {
        toggleGameButtons(true);
    }
    
    // 检查是否需要AI控制新回合（支持罗马、迦太基和马其顿AI）
    if (gameState.currentPlayer === 'rome' && AIController.shouldControl()) {
        await AIController.delay(1000);
        await AIController.executeTurn();
        
        // 看海模式下，罗马AI执行完自动结束回合
        if (gameState.watchMode) {
            await AIController.delay(1000);
            await window.endTurn();
        }
    } else if (gameState.currentPlayer === 'carthage' && typeof CarthageAIController !== 'undefined' && CarthageAIController.shouldControl()) {
        await AIController.delay(1000);
        await CarthageAIController.executeTurn();
        
        // 看海模式下，根据设置决定是自动结束回合还是等待玩家点击
        if (gameState.watchMode) {
            if (gameState.watchModeAutoCarthage) {
                // 自动模式：直接结束回合并继续循环
                addLog('🍿 迦太基AI回合结束，自动切换到罗马回合...', 'system');
                await AIController.delay(1000);
                await window.endTurn();
            } else {
                // 手动模式：等待玩家点击结束回合按钮
                addLog('🍿 迦太基AI回合结束，请点击"结束回合"按钮继续', 'system');
                // 确保按钮状态正确（迦太基回合启用结束回合按钮）
                if (typeof toggleGameButtons === 'function') {
                    toggleGameButtons(true);
                }
            }
        }
    } else if (gameState.currentPlayer === 'macedonia' && typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.shouldControl()) {
        // 马其顿AI控制
        await AIController.delay(1000);
        await MacedoniaAIController.executeTurn();
        
        // 看海模式下，马其顿AI执行完自动结束回合
        if (gameState.watchMode) {
            await AIController.delay(1000);
            await window.endTurn();
        }
    } else if (gameState.currentPlayer === 'seleucid' && typeof SeleucidAIController !== 'undefined' && SeleucidAIController.shouldControl()) {
        // 塞琉古AI控制
        await AIController.delay(1000);
        await SeleucidAIController.executeTurn();
        
        // 看海模式下，塞琉古AI执行完自动结束回合
        if (gameState.watchMode) {
            await AIController.delay(1000);
            await window.endTurn();
        }
    } else if (gameState.currentPlayer === 'ptolemy' && typeof PtolemyAIController !== 'undefined' && PtolemyAIController.shouldControl()) {
        // 托勒密AI控制
        await AIController.delay(1000);
        await PtolemyAIController.executeTurn();
        
        // 看海模式下，托勒密AI执行完自动结束回合
        if (gameState.watchMode) {
            await AIController.delay(1000);
            await window.endTurn();
        }
    }
};

console.log('🤖 AI控制器已加载');

