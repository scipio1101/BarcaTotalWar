/**
 * 迦太基AI控制器模块
 * 专门用于自动控制迦太基阵营的军队行动
 * 独立于罗马AI，拥有自己的战略目标和决策逻辑
 */

const CarthageAIController = {
    // 辅助函数：获取城市中文名
    getCityName(cityId) {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : cityId;
    },

    // AI配置
    config: {
        enabled: false,           // AI是否启用
        aggressiveness: 0.7,      // 进攻倾向 (0-1) - 迦太基更具进攻性
        economicFocus: 0.3,       // 经济重视度 (0-1)
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

    // 失去的城市记录
    lostCities: {},  // { cityId: { lostTurn: number, lostTo: faction, importance: number, cityData: {} } }

    // 军队收复城市的责任权重
    recaptureWeights: {},  // { armyId: { cityId: weight } }

    // 萨贡托占领标记（占领一次后该规则不再生效）
    saguntoCapture: {
        captured: false,  // 是否已占领过萨贡托
        capturedTurn: null  // 占领的回合数
    },

    // 迦太基战略目标配置
    strategicGoals: {
        // 首要目标：保卫迦太基城
        defenseCapital: {
            cityId: 'carthage',
            priority: 1000,  // 最高优先级
            defensiveRadius: 2,  // 防御半径（步数）
            description: '保卫迦太基城'
        },
        // 西班牙战略（哈斯德鲁巴专属，最高优先级）
        spainStrategy: {
            cityIds: [ 'toletum', 'emerita', 'asturica', 'bilibilis', 'taraco','newcarthage', 'gades'],
            priority: 750, // 高于罗马战略
            description: '收复西班牙领土',
            commanderName: '哈斯德鲁巴' // 只有哈斯德鲁巴执行此战略
        },
        // 重要进攻目标（按优先级排序）
        offensiveTargets: [
            { cityId: 'rome', priority: 600, description: '攻陷罗马城' },
            { cityId: 'syracuse', priority: 500, description: '占领叙拉古' },
        ],
        // 西西里岛城市（战略目标）
        sicilyRegion: {
            cityIds: ['syracuse', 'messana', 'lilybaeum'],
            priority: 450,
            description: '占领西西里岛'
        },
        // 西班牙地区（经济基地）
        spainRegion: {
            cityIds: ['gades', 'emerita', 'asturica', 'corduba', 'toletum', 
                     'newcarthage', 'sagunto', 'bilibilis', 'budilragus', 'taraco'],
            priority: 400,
            description: '保卫西班牙基地'
        }
    },

    // 启用AI控制
    enable() {
        this.config.enabled = true;
        // addLog(`🤖 迦太基AI已启用`, 'system');
        this.initializeCityTracking();
        this.updateUI();
    },

    // 禁用AI控制
    disable() {
        this.config.enabled = false;
        // addLog('🤖 迦太基AI已禁用', 'system');
        this.updateUI();
    },

    // 切换AI控制
    toggle() {
        if (this.config.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    },

    // 检查是否应该由AI控制当前回合
    shouldControl() {
        return this.config.enabled && gameState.currentPlayer === 'carthage';
    },

    // 更新UI显示
    updateUI() {
        // 【修改】调用罗马AI的updateUI来统一更新显示
        if (typeof AIController !== 'undefined' && typeof AIController.updateUI === 'function') {
            AIController.updateUI();
        }
    },

    // ==================== 联盟系统（支持马其顿联盟）====================

    /**
     * 判断是否与马其顿结盟
     */
    isAlliedWithMacedonia() {
        if (typeof MacedoniaAIController === 'undefined') return false;
        return MacedoniaAIController.config.alliance === 'carthage';
    },

    /**
     * 判断指定阵营是否为盟友
     */
    isAlly(faction) {
        if (faction === 'carthage') return true;
        if (faction === 'macedonia' && this.isAlliedWithMacedonia()) return true;
        return false;
    },

    /**
     * 判断指定阵营是否为敌人
     */
    isEnemy(faction) {
        if (faction === 'carthage') return false;
        if (this.isAlly(faction)) return false;
        return true;
    },

    /**
     * 获取当前敌对阵营列表
     */
    getEnemyFactions() {
        const enemies = ['rome'];
        // 如果马其顿不是盟友，也是敌人
        if (!this.isAlliedWithMacedonia()) {
            enemies.push('macedonia');
        }
        return enemies;
    },

    /**
     * 获取盟友阵营
     */
    getAllyFaction() {
        return this.isAlliedWithMacedonia() ? 'macedonia' : null;
    },

    /**
     * 判断城市是否为友方城市（己方或盟友）
     */
    isFriendlyCity(city) {
        if (!city) return false;
        if (city.faction === 'carthage') return true;
        const allyFaction = this.getAllyFaction();
        if (allyFaction && city.faction === allyFaction) return true;
        return false;
    },

    /**
     * 判断城市是否为敌方城市
     */
    isEnemyCity(city) {
        if (!city) return false;
        if (this.isFriendlyCity(city)) return false;
        if (city.faction === 'neutral') return false;
        return true;
    },

    // ==================== 失去城市追踪系统 ====================
    
    initializeCityTracking() {
        this.lostCities = {};
        // addLog(`📊 迦太基城市追踪系统已初始化`, 'info');
    },

    checkCityChanges() {
        const currentCities = cities.filter(c => c.faction === 'carthage');
        
        // 检查是否有城市被夺回
        Object.keys(this.lostCities).forEach(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (city && city.faction === 'carthage') {
                const lostData = this.lostCities[cityId];
                // addLog(`🎉 ${city.name}已夺回！（曾在第${lostData.lostTurn}回合失守${gameState.turn - lostData.lostTurn}回合）`, 'carthage');
                delete this.lostCities[cityId];
                
                // 清除该城市的所有收复权重
                Object.keys(this.recaptureWeights).forEach(armyId => {
                    if (this.recaptureWeights[armyId][cityId]) {
                        delete this.recaptureWeights[armyId][cityId];
                    }
                });
            }
        });
        
        // 检查是否有新的城市失守
        cities.forEach(city => {
            if (city.previousFaction === 'carthage' && city.faction !== 'carthage' && !this.lostCities[city.id]) {
                this.recordLostCity(city);
            }
        });
    },

    recordLostCity(city) {
        const importance = (city.politicalScore || 0) + (city.economicScore || 0) + (city.important ? 20 : 0);
        
        this.lostCities[city.id] = {
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
        
        const lostToName = city.faction === 'rome' ? '罗马' : city.faction === 'carthage' ? '迦太基' : '中立';
        // addLog(`💔 迦太基失去了${city.name}（转为${lostToName}），重要度${importance}`, 'carthage');
        
        this.calculateRecaptureWeights(city.id);
    },

    calculateRecaptureWeights(lostCityId) {
        const factionArmies = armies.carthage || [];
        const lostCityData = this.lostCities[lostCityId];
        
        if (!lostCityData) return;
        
        factionArmies.forEach(army => {
            // 汉尼拔和哈斯德鲁巴不参与救援和收复任务
            if (army.commander === '汉尼拔·巴卡' || army.commander === '哈斯德鲁巴·巴卡') {
                return;
            }
            
            if (!this.recaptureWeights[army.id]) {
                this.recaptureWeights[army.id] = {};
            }
            
            const distance = this.calculateDistance(army.location, lostCityId);
            
            let weight = 0;
            if (distance <= 10) {
                weight = lostCityData.importance * (10 - distance) / 10;
            } else {
                weight = lostCityData.importance * 0.1;
            }
            
            if (lostCityData.cityData.important) {
                weight *= 1.5;
            }
            
            this.recaptureWeights[army.id][lostCityId] = Math.floor(weight);
            
            // addLog(`   📍 ${army.commander}对收复${lostCityData.cityData.name}的权重: ${Math.floor(weight)} (距离${distance}步)`, 'info');
        });
    },

    getPriorityRecaptureTarget(army) {
        const armyWeights = this.recaptureWeights[army.id];
        if (!armyWeights || Object.keys(armyWeights).length === 0) {
            return null;
        }
        
        let bestCityId = null;
        let bestWeight = 0;
        
        Object.keys(armyWeights).forEach(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (!city || city.faction === 'carthage') return;
            
            const baseWeight = armyWeights[cityId];
            const lostCityData = this.lostCities[cityId];
            
            if (!lostCityData) return;
            
            const turnsLost = gameState.turn - lostCityData.lostTurn;
            
            let timeFactor = 1.0;
            if (turnsLost <= 12) {
                timeFactor = 1.0 + (turnsLost / 12.0);
            } else {
                const decayTurns = turnsLost - 12;
                timeFactor = 2.0 - (decayTurns / 12.0);
                timeFactor = Math.max(0.1, timeFactor);
            }
            
            const adjustedWeight = Math.floor(baseWeight * timeFactor);
            
            if (adjustedWeight > bestWeight) {
                bestWeight = adjustedWeight;
                bestCityId = cityId;
            }
        });
        
        if (bestCityId) {
            const lostCityData = this.lostCities[bestCityId];
            const turnsLost = gameState.turn - lostCityData.lostTurn;
            
            return {
                cityId: bestCityId,
                weight: bestWeight,
                cityData: lostCityData,
                turnsLost: turnsLost
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
    
    evaluateSituation() {
        const allArmies = getAllArmies();
        const enemyFactions = this.getEnemyFactions();
        
        return {
            myFaction: 'carthage',
            currentTurn: gameState.turn,
            myArmies: armies.carthage || [],
            enemyArmies: allArmies.filter(a => enemyFactions.includes(a.faction)),
            allyArmies: this.isAlliedWithMacedonia() ? (armies.macedonia || []) : [],
            myCities: cities.filter(c => c.faction === 'carthage'),
            enemyCities: cities.filter(c => c.faction === 'rome'),
            neutralCities: cities.filter(c => c.faction === 'neutral'),
            myFunds: gameState.carthageFunds,
            enemyFunds: gameState.romeFunds,
            myDebt: gameState.carthageDebt,
            myTotalMilitaryPower: this.calculateTotalMilitaryPower('carthage'),
            enemyTotalMilitaryPower: this.calculateTotalMilitaryPower('rome'),
            isAlliedWithMacedonia: this.isAlliedWithMacedonia(),
            allyFaction: this.getAllyFaction()
        };
    },

    calculateTotalMilitaryPower(faction) {
        const factionArmies = armies[faction] || [];
        return factionArmies.reduce((total, army) => {
            return total + calculateCombatPower(army);
        }, 0);
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
        
        return 999;
    },

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
        
        return null;
    },

    getNextStepToTarget(currentCityId, targetCityId) {
        const path = this.findPath(currentCityId, targetCityId);
        if (!path || path.length < 2) {
            return null;
        }
        return path[1];
    },

    /**
     * 查找路径，并排除指定的城市（用于绕路）
     * 使用带权重的搜索，考虑海路3倍成本
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
     * 检查目标城市的敌军情况（使用综合战力评估）
     * 【关键】评估的是"移动到目标城市后"的战力对比
     * 返回: { canMove: boolean, shouldReinforce: boolean, powerGap: number, reason: string }
     */
    checkEnemyAtTarget(army, targetCityId) {
        const enemyFaction = 'rome';
        const myFaction = 'carthage';
        
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

    // ==================== 战略目标评估 ====================
    
    /**
     * 判断军队是否正在执行汉尼拔战略
     */
    isExecutingHannibalStrategy(army) {
        const isHannibal = army.commander && army.commander.includes('汉尼拔');
        if (!isHannibal) return false;
        
        const romeCity = cities.find(c => c.id === 'rome');
        if (!romeCity || this.isFriendlyCity(romeCity)) return false;
        
        const distanceToRome = this.calculateDistance(army.location, 'rome');
        return distanceToRome <= 15;
    },

    /**
     * 汉尼拔威胁罗马战略（升级版）
     * 包含智能绕路、连续绕路检测、撤退后增强等完整机制
     */
    evaluateHannibalRomeStrategy(army, situation) {
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
        
        // 检查是否是汉尼拔
        const isHannibal = army.commander && army.commander.includes('汉尼拔');
        if (!isHannibal) return null;
        
        const targetCityId = 'rome';
        const romeCity = cities.find(c => c.id === targetCityId);
        if (!romeCity || this.isFriendlyCity(romeCity)) return null;
        
        const distanceToRome = this.calculateDistance(army.location, targetCityId);
        
        // 汉尼拔在罗马15步以内，启动攻罗马战略
        if (distanceToRome > 15) return null;
        
        // addLog(`   🔥 汉尼拔执行进攻罗马战略（距离${distanceToRome}步）`, 'info');
        
        const basePriority = 550; // 高优先级
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const enemyFaction = 'rome';
        
        // 检查当前位置是否有敌军（使用综合战力评估）
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        if (enemiesAtLocation.length > 0) {
            const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
            const enemyPower = enemyResult.totalPower;
            
            if (myPower > enemyPower) {
                // 综合优势，进攻
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【汉尼拔战略】在${this.getCityName(army.location)}消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // 综合劣势，考虑整编或撤退
                if (army.morale < 4) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 30,
                        reason: `【汉尼拔战略】综合劣势，整编后再战(${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                    };
                }
                // 不做特殊决策，让常规逻辑处理
                return null;
            }
        }
        
        // 如果在友方城市（己方或联盟），向罗马移动
        if (this.isFriendlyCity(currentCity)) {
            const connectedCities = getConnectedCities(army.location);
            
            // 使用综合战力评估检查移动目标
            const checkTargetForEnemies = (targetId) => {
                const enemyCheck = this.checkEnemyAtTarget(army, targetId);
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
                // 相邻罗马，检查是否有敌军
                const checkResult = checkTargetForEnemies(targetCityId);
                
                if (checkResult.canMove) {
                    if (checkResult.shouldAttack) {
                        // addLog(`   ⚔️ 罗马有敌军，汉尼拔优势，移动后将攻击`, 'info');
                    }
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 100,
                        reason: `【汉尼拔战略】进军罗马！(距离${distanceToRome}步${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`
                    };
                } else if (checkResult.needImprove) {
                    // 实力差距小，优先征召或整编
                    // addLog(`   💪 ${checkResult.reason}`, 'info');
                    
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【汉尼拔战略】整编提升战力(差距${checkResult.powerGap}，目标罗马)`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 95,
                            reason: `【汉尼拔战略】征召增强兵力(差距${checkResult.powerGap}，目标罗马)`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【汉尼拔战略】整编提升战力(差距${checkResult.powerGap}，目标罗马)`
                        };
                    }
                } else {
                    // addLog(`   ⚠️ ${checkResult.reason}`, 'warning');
                    // 罗马有强敌且差距过大，不做特殊决策
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
                    const path = AIController.findPathWithExclusions.call(
                        AIController,
                        army.location, 
                        targetCityId, 
                        excludedCities
                    );
                    
                    if (!path || path.length <= 1) {
                        // 没有可用路径了
                        if (excludedCities.size > 0) {
                            // addLog(`   ❌ 所有路径均被强敌阻断（已排除${excludedCities.size}个城市），暂缓进军`, 'warning');
                        }
                        return null;
                    }
                    
                    const firstStep = path[1];
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
                                        reason: `【汉尼拔战略】连续绕路受阻，整编提升战力`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 95,
                                        reason: `【汉尼拔战略】连续绕路受阻，征召增强兵力`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                        reason: `【汉尼拔战略】连续绕路受阻，整编备战`
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
                            reason: `【汉尼拔战略】向罗马进军(距离${distanceToRome}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`,
                            _detoured: willDetour // 内部标记，用于记录历史
                        };
                    } else if (checkResult.needImprove) {
                        // 第一步实力差距小，可以提升后再进
                        // addLog(`   💪 ${this.getCityName(firstStep)}: ${checkResult.reason}`, 'info');
                        
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【汉尼拔战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 95,
                                reason: `【汉尼拔战略】征召后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【汉尼拔战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
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
        
        // 如果在中立城市
        if (currentCity.faction === 'neutral') {
            // 西班牙地区的中立城市：直接围城
            const spainCities = this.strategicGoals.spainRegion.cityIds;
            if (spainCities.includes(currentCity.id)) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【汉尼拔战略】围攻西班牙中立城市${this.getCityName(currentCity.id)}(不游说直接攻城)`
                };
            }
            
            // 非西班牙地区：若位于中立城市的回合数大于6，优先围城
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 80,
                    reason: `【汉尼拔战略】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                const attitude = currentCity.carthageAttitude || 0;
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 90,
                    reason: `【汉尼拔战略】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 如果在敌方城市，优先进行围城
        if (currentCity.faction === 'rome') {
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【汉尼拔战略】围攻${this.getCityName(currentCity.id)}(向罗马进军途中)`
                };
            } else {
                // 有敌军，使用综合战力评估
                const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
                const myPower = myResult.totalPower;
                
                const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
                const enemyPower = enemyResult.totalPower;
                
                if (myPower > enemyPower) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 90,
                        reason: `【汉尼拔战略】消灭驻防敌军后围城(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 萨贡托战略（仅针对汉尼拔，最高优先级）
     * 当萨贡托为罗马阵营时，汉尼拔以最高优先级占领
     * 占领一次后，该规则不再生效
     */
    evaluateSaguntoStrategy(army, situation) {
        // 检查是否是汉尼拔
        const isHannibal = army.commander && army.commander.includes('汉尼拔');
        if (!isHannibal) return null;
        
        // 检查是否已经占领过萨贡托
        if (this.saguntoCapture.captured) {
            return null;
        }
        
        const targetCityId = 'sagunto';
        const saguntoCity = cities.find(c => c.id === targetCityId);
        
        // 检查萨贡托是否为罗马阵营
        if (!saguntoCity || saguntoCity.faction !== 'rome') {
            // 如果萨贡托已被占领（变成迦太基阵营），标记为已占领
            if (saguntoCity && saguntoCity.faction === 'carthage' && !this.saguntoCapture.captured) {
                this.saguntoCapture.captured = true;
                this.saguntoCapture.capturedTurn = gameState.turn;
                // addLog(`✅ 萨贡托已被汉尼拔占领，萨贡托战略不再生效`, 'system');
            }
            return null;
        }
        
        // addLog(`   🎯 汉尼拔执行萨贡托占领战略（萨贡托目前为罗马控制）`, 'warning');
        
        const basePriority = 950; // 极高优先级，仅次于保卫迦太基
        const distance = this.calculateDistance(army.location, targetCityId);
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        // 如果已经在萨贡托
        if (army.location === targetCityId) {
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(targetCityId, 'rome');
            
            if (enemiesAtCity.length > 0) {
                // 有敌军驻守，评估战力
                const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
                const myPower = myResult.totalPower;
                
                const enemyResult = this.calculateEnemyComprehensivePower(army.location, 'rome');
                const enemyPower = enemyResult.totalPower;
                
                if (myPower > enemyPower * 1.2) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 30,
                        reason: `【萨贡托战略】消灭驻防敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                    };
                } else if (army.morale < 5) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 20,
                        reason: `【萨贡托战略】整编提升战力应对驻军`
                    };
                } else if (situation.myFunds >= 200) {
                    return {
                        type: 'recruit',
                        priority: basePriority + 20,
                        reason: `【萨贡托战略】征召增强兵力应对驻军`
                    };
                }
            } else {
                // 无敌军，直接围城
                return {
                    type: 'siege',
                    target: saguntoCity,
                    priority: basePriority + 40,
                    reason: `【萨贡托战略】围攻萨贡托（历史重要事件）`
                };
            }
        }
        
        // 未到达萨贡托，移动前往
        const nextStep = this.getNextStepToTarget(army.location, targetCityId);
        if (nextStep) {
            // 检查下一步是否有敌军
            const enemyCheck = this.checkEnemyAtTarget(army, nextStep);
            
            if (enemyCheck.canMove || enemyCheck.shouldAttack) {
                return {
                    type: 'move',
                    target: nextStep,
                    priority: basePriority + 35,
                    reason: `【萨贡托战略】前往萨贡托(距离${distance}步，经${this.getCityName(nextStep)}${enemyCheck.shouldAttack ? '，抵达后攻击敌军' : ''})`
                };
            } else if (enemyCheck.needImprove) {
                // 路上有强敌，先增强实力
                if (army.morale < 5) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 25,
                        reason: `【萨贡托战略】整编后前往萨贡托(${enemyCheck.reason})`
                    };
                } else if (situation.myFunds >= 200) {
                    return {
                        type: 'recruit',
                        priority: basePriority + 25,
                        reason: `【萨贡托战略】征召后前往萨贡托(${enemyCheck.reason})`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 判断是否是兵力最强的2支部队之一用于进攻罗马（排除汉尼拔和叙拉古战略执行者）
     */
    isStrongestForRome(army, situation) {
        const targetCityId = 'rome';
        
        // 排除汉尼拔
        const isHannibal = army.commander && army.commander.includes('汉尼拔');
        if (isHannibal) return false;
        
        // 先确定谁是叙拉古战略执行者（避免重复计算）
        let syracuseExecutorId = null;
        const syracuseCity = cities.find(c => c.id === 'syracuse');
        if (syracuseCity && syracuseCity.faction !== 'carthage') {
            // 找到距离叙拉古最近的非汉尼拔军队
            let minDistance = 999;
            for (const a of situation.myArmies) {
                const isArmyHannibal = a.commander && a.commander.includes('汉尼拔');
                if (isArmyHannibal) continue;
                
                const dist = this.calculateDistance(a.location, 'syracuse');
                if (dist < minDistance) {
                    minDistance = dist;
                    syracuseExecutorId = a.id;
                }
            }
        }
        
        // 如果当前军队是叙拉古战略执行者，不执行罗马战略
        if (syracuseExecutorId === army.id) return false;
        
        // 计算所有符合条件的迦太基军队的综合战力
        const armyStrengths = [];
        
        for (const a of situation.myArmies) {
            // 排除汉尼拔
            const isArmyHannibal = a.commander && a.commander.includes('汉尼拔');
            if (isArmyHannibal) continue;
            
            // 排除叙拉古战略执行者
            if (a.id === syracuseExecutorId) continue;
            
            // 计算综合战力
            const strengthResult = this.calculateComprehensivePower(a, a.location, 'carthage');
            const strength = strengthResult.totalPower;
            
            armyStrengths.push({
                army: a,
                strength: strength,
                troops: a.troops || 0,
                morale: a.morale || 0
            });
        }
        
        // 按综合战力排序（战力相同时，按兵力、士气、ID排序）
        armyStrengths.sort((a, b) => {
            if (a.strength !== b.strength) {
                return b.strength - a.strength; // 战力高的在前
            }
            if (a.troops !== b.troops) {
                return b.troops - a.troops; // 兵力多的在前
            }
            if (a.morale !== b.morale) {
                return b.morale - a.morale; // 士气高的在前
            }
            return a.army.id.localeCompare(b.army.id); // ID小的在前
        });
        
        // 判断当前军队是否在前2名
        const top2 = armyStrengths.slice(0, 2);
        const isInTop2 = top2.some(item => item.army.id === army.id);
        
        if (isInTop2) {
            const rank = top2.findIndex(item => item.army.id === army.id) + 1;
            const myStrength = armyStrengths.find(item => item.army.id === army.id);
            // addLog(`   🎯 ${army.commander}是第${rank}强的部队（综合战力${myStrength.strength.toFixed(0)}）`, 'info');
        }
        
        return isInTop2;
    },

    isClosestToSyracuse(army, situation) {
        const targetCityId = 'syracuse';
        const myDistance = this.calculateDistance(army.location, targetCityId);
        
        // 排除哈斯德鲁巴·巴卡
        const isHasdrubal = army.commander && army.commander.includes('哈斯德鲁巴');
        if (isHasdrubal) {
            return false;
        }
        
        // 首先，如果是汉尼拔且正在执行进攻罗马战略，就不执行叙拉古战略
        const isHannibal = army.commander && army.commander.includes('汉尼拔');
        if (isHannibal) {
            const romeCity = cities.find(c => c.id === 'rome');
            const distanceToRome = this.calculateDistance(army.location, 'rome');
            // 如果汉尼拔距离罗马5步以内且罗马未被控制，优先执行罗马战略
            if (romeCity && romeCity.faction !== 'carthage' && distanceToRome <= 5) {
                return false;
            }
        }
        
        // 检查其他迦太基军队的距离（排除汉尼拔战略执行者和罗马战略执行者）
        for (const otherArmy of situation.myArmies) {
            if (otherArmy.id === army.id) continue;
            
            // 排除哈斯德鲁巴·巴卡
            const isOtherHasdrubal = otherArmy.commander && otherArmy.commander.includes('哈斯德鲁巴');
            if (isOtherHasdrubal) continue;
            
            // 如果其他军队是汉尼拔且正在执行罗马战略，不参与叙拉古竞争
            const isOtherHannibal = otherArmy.commander && otherArmy.commander.includes('汉尼拔');
            if (isOtherHannibal) {
                const romeCity = cities.find(c => c.id === 'rome');
                const distanceToRome = this.calculateDistance(otherArmy.location, 'rome');
                if (romeCity && romeCity.faction !== 'carthage' && distanceToRome <= 5) {
                    continue; // 排除这支军队
                }
            }
            
            // 排除罗马战略执行者（避免循环依赖，直接检查兵力）
            // 这里简化处理：如果其他军队正在执行罗马战略，不参与叙拉古竞争
            // 由于罗马战略基于兵力，我们需要避免循环调用
            
            // 该军队不执行汉尼拔战略，参与叙拉古距离竞争
            const otherDistance = this.calculateDistance(otherArmy.location, targetCityId);
            if (otherDistance < myDistance) {
                return false; // 有其他军队更近
            }
        }
        
        // addLog(`   🎯 ${army.commander}是执行叙拉古战略的部队（距叙拉古${myDistance}步）`, 'info');
        return true; // 这是最近的军队（且不执行汉尼拔战略）
    },

    /**
     * 罗马战略决策
     * 为兵力最强的2支迦太基军队制定进攻罗马的专门策略（排除汉尼拔和叙拉古战略执行者）
     */
    evaluateRomeStrategy(army, situation) {
        const targetCityId = 'rome';
        const targetCity = cities.find(c => c.id === targetCityId);
        
        if (!targetCity) return null;
        
        // 如果罗马已经是友方（迦太基或联盟）控制，不需要特殊策略
        if (this.isFriendlyCity(targetCity)) return null;
        
        // 判断是否是兵力最强的2支军队之一
        if (!this.isStrongestForRome(army, situation)) return null;
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = 600; // 罗马战略基础优先级（高于叙拉古，低于萨贡托和保卫迦太基）
        
        // 检查是否有敌军在当前位置
        const enemyFaction = 'rome';
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 若有敌方军队，根据综合战力进行判定
        if (enemiesAtLocation.length > 0) {
            // 使用综合战力评估
            const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
            const enemyPower = enemyResult.totalPower;
            
            if (myPower > enemyPower * 1) {
                // 综合优势，进攻
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【罗马战略】在${this.getCityName(army.location)}消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // 综合劣势，考虑整编或撤退
                if (army.morale < 4) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 30,
                        reason: `【罗马战略】综合劣势，整编后再战(${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                    };
                }
                // 不做特殊决策，让常规逻辑处理
                return null;
            }
        }
        
        // 若当前位于友方城市（己方或联盟），优先向罗马移动
        if (this.isFriendlyCity(currentCity)) {
            const connectedCities = getConnectedCities(army.location);
            
            // 使用综合战力评估检查移动目标
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
                // 相邻罗马，检查是否有敌军
                const checkResult = checkTargetForEnemies(targetCityId);
                
                if (checkResult.canMove) {
                    if (checkResult.shouldAttack) {
                        // addLog(`   ⚔️ ${this.getCityName(targetCityId)}有敌军，我方优势，移动后将攻击`, 'info');
                    }
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 100,
                        reason: `【罗马战略】向罗马进军(距离${distance}步${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`
                    };
                } else if (checkResult.needImprove) {
                    // 实力差距小，优先征召或整编
                    // addLog(`   💪 ${checkResult.reason}`, 'info');
                    
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【罗马战略】整编提升战力(差距${checkResult.powerGap}，目标罗马)`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 95,
                            reason: `【罗马战略】征召增强兵力(差距${checkResult.powerGap}，目标罗马)`
                        };
                    } else {
                        // 资金不足，整编
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【罗马战略】整编提升战力(差距${checkResult.powerGap}，目标罗马)`
                        };
                    }
                } else {
                    // addLog(`   ⚠️ ${checkResult.reason}`, 'warning');
                    // 罗马有强敌且差距过大，不做特殊决策
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
                                        reason: `【罗马战略】连续绕路受阻，整编提升战力`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 95,
                                        reason: `【罗马战略】连续绕路受阻，征召增强兵力`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                        reason: `【罗马战略】连续绕路受阻，整编备战`
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
                            reason: `【罗马战略】向罗马进军(距离${distance}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`,
                            _detoured: willDetour // 内部标记，用于记录历史
                        };
                    } else if (checkResult.needImprove) {
                        // 第一步实力差距小，可以提升后再进
                        // addLog(`   💪 ${this.getCityName(firstStep)}: ${checkResult.reason}`, 'info');
                                
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【罗马战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 95,
                                reason: `【罗马战略】征召后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【罗马战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
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
        
        // 若当前位于中立城市
        if (currentCity.faction === 'neutral') {
            // 若位于中立城市的回合数大于6，优先进行围城
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 80,
                    reason: `【罗马战略】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                // 继续游说
                const attitude = currentCity.carthageAttitude || 0;
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 90,
                    reason: `【罗马战略】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 若位于敌方城市，优先进行围城
        if (currentCity.faction === 'rome') {
            // 检查是否有敌军驻守
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【罗马战略】围攻敌城${this.getCityName(currentCity.id)}(向罗马进军途中)`
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
                        reason: `【罗马战略】消灭敌军后围城`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 西班牙战略决策（哈斯德鲁巴专属）
     * 收复艾梅里达、阿斯图里加、比比里斯、塔拉科、托莱图姆、新迦太基、加得斯
     * 只围攻，不游说
     */
    evaluateSpainStrategy(army, situation) {
        const spainConfig = this.strategicGoals.spainStrategy;
        
        // 只有哈斯德鲁巴执行此战略
        const isHasdrubal = army.commander && army.commander.includes(spainConfig.commanderName);
        if (!isHasdrubal) return null;
        
        // 找到第一个未被迦太基控制的西班牙城市
        let targetCity = null;
        for (const cityId of spainConfig.cityIds) {
            const city = cities.find(c => c.id === cityId);
            if (city && city.faction !== 'carthage') {
                targetCity = city;
                break;
            }
        }
        
        // 所有西班牙城市都已控制
        if (!targetCity) return null;
        
        const targetCityId = targetCity.id;
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = spainConfig.priority; // 750，最高优先级
        
        // 检查是否有敌军在当前位置
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 5. 若有敌方军队，根据综合战力进行判定
        if (enemiesAtLocation.length > 0) {
            const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, 'rome');
            const enemyPower = enemyResult.totalPower;
            
            if (myPower > enemyPower * 1) {
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【西班牙战略】在${this.getCityName(army.location)}消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                if (army.morale < 4) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 30,
                        reason: `【西班牙战略】综合劣势，整编后再战(${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                    };
                }
                return null;
            }
        }
        
        // 1. 若当前位于友方城市，优先向目标城市移动
        if (currentCity.faction === 'carthage') {
            const connectedCities = getConnectedCities(army.location);
            
            const checkTargetForEnemies = (targetId) => {
                const enemyCheck = this.checkEnemyAtTarget(army, targetId);
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
                        reason: enemyCheck.reason
                    };
                }
            };
            
            if (connectedCities.includes(targetCityId)) {
                const checkResult = checkTargetForEnemies(targetCityId);
                
                if (checkResult.canMove) {
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 100,
                        reason: `【西班牙战略】向${targetCity.name}进军(距离${distance}步${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`
                    };
                } else if (checkResult.needImprove) {
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【西班牙战略】整编提升战力(差距${checkResult.powerGap}，目标${targetCity.name})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 95,
                            reason: `【西班牙战略】征召增强兵力(差距${checkResult.powerGap}，目标${targetCity.name})`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【西班牙战略】整编提升战力(差距${checkResult.powerGap}，目标${targetCity.name})`
                        };
                    }
                } else {
                    return null;
                }
            } else {
                const excludedCities = new Set();
                let attemptCount = 0;
                const maxAttempts = 5;
                
                while (attemptCount < maxAttempts) {
                    attemptCount++;
                    
                    const path = this.findPathWithExclusions(army.location, targetCityId, excludedCities);
                    
                    if (!path || path.length <= 1) {
                        if (excludedCities.size > 0) {
                            // 路径被阻断
                        }
                        return null;
                    }
                    
                    const firstStep = path[1];
                    const checkResult = checkTargetForEnemies(firstStep);
                        
                    if (checkResult.canMove) {
                        if (attemptCount >= 3) {
                            if (army.morale < 5) {
                                return {
                                    type: 'reorganize',
                                    priority: basePriority + 95,
                                    reason: `【西班牙战略】连续绕路受阻，整编提升战力`
                                };
                            } else if (situation.myFunds >= 200) {
                                return {
                                    type: 'recruit',
                                    priority: basePriority + 95,
                                    reason: `【西班牙战略】连续绕路受阻，征召增强兵力`
                                };
                            } else {
                                return {
                                    type: 'reorganize',
                                    priority: basePriority + 95,
                                    reason: `【西班牙战略】连续绕路受阻，整编备战`
                                };
                            }
                        }
                        
                        const willDetour = attemptCount > 1;
                        
                        return {
                            type: 'move',
                            target: firstStep,
                            priority: basePriority + 100,
                            reason: `【西班牙战略】向${targetCity.name}进军(距离${distance}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`,
                            _detoured: willDetour
                        };
                    } else if (checkResult.needImprove) {
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【西班牙战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 95,
                                reason: `【西班牙战略】征召后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【西班牙战略】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        }
                    } else {
                        excludedCities.add(firstStep);
                        continue;
                    }
                }
                
                return null;
            }
        }
        
        // 2. 若当前位于中立城市
        // 西班牙战略不游说，直接围城
        if (currentCity.faction === 'neutral') {
            return {
                type: 'siege',
                target: currentCity,
                priority: basePriority + 80,
                reason: `【西班牙战略】围攻中立城市${currentCity.name}(不游说)`
            };
        }
        
        // 3. 若位于敌方城市，优先进行围城
        if (currentCity.faction !== 'carthage' && currentCity.faction !== 'neutral') {
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, currentCity.faction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 90,
                    reason: `【西班牙战略】围攻敌城${currentCity.name}(无驻军)`
                };
            } else {
                const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
                const myPower = myResult.totalPower;
                
                const enemyResult = this.calculateEnemyComprehensivePower(army.location, currentCity.faction);
                const enemyPower = enemyResult.totalPower;
                
                if (myPower > enemyPower) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 100,
                        reason: `【西班牙战略】消灭${currentCity.name}守军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                    };
                } else {
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 70,
                            reason: `【西班牙战略】整编后攻城(当前劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 70,
                            reason: `【西班牙战略】征召后攻城(当前劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    }
                }
            }
        }
        
        return null;
    },

    /**
     * 叙拉古战略决策
     * 为距离叙拉古最近的迦太基军队制定专门策略（排除执行汉尼拔战略的军队）
     */
    evaluateSyracuseStrategy(army, situation) {
        const targetCityId = 'syracuse';
        const targetCity = cities.find(c => c.id === targetCityId);
        
        if (!targetCity) return null;
        
        // 如果叙拉古已经是迦太基控制，不需要特殊策略
        if (targetCity.faction === 'carthage') return null;
        
        // 判断是否是距离叙拉古最近的军队（排除汉尼拔战略执行者）
        if (!this.isClosestToSyracuse(army, situation)) return null;
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = 480; // 叙拉古战略基础优先级（高于西班牙防御）
        
        // 检查是否有敌军在当前位置
        const enemyFaction = 'rome';
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 若与敌方军队处于同一个城市（使用综合战力评估）
        if (enemiesAtLocation.length > 0) {
            const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemyFaction);
            const enemyPower = enemyResult.totalPower;
            
            // 若综合战力大于对方，攻击
            if (myPower > enemyPower * 1) {
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【叙拉古战略】消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // 若综合战力小于对方
                // 若当前处于我方城市：优先征召和整编
                if (currentCity.faction === 'carthage') {
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
                    // 若当前处于中立和敌方城市：向临近城市撤退
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
                        if (city.faction === 'carthage') {
                            priority = 3; // 优先撤退到我方城市
                        } else if (city.faction === 'neutral') {
                            priority = 2; // 其次是中立城市
                        } else {
                            priority = 1; // 再次是敌方城市
                        }
                        
                        if (priority > retreatPriority) {
                            retreatPriority = priority;
                            retreatTarget = cityId;
                        }
                    }
                    
                    if (retreatTarget) {
                        const retreatCity = cities.find(c => c.id === retreatTarget);
                        const factionDesc = retreatCity.faction === 'carthage' ? '己方' : 
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
        
        // 若当前位于己方城市，优先向叙拉古移动
        if (currentCity.faction === 'carthage') {
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
                // 不相邻，向叙拉古方向移动
                const nextStep = this.getNextStepToTarget(army.location, targetCityId);
                if (nextStep) {
                    return {
                        type: 'move',
                        target: nextStep,
                        priority: basePriority + 80,
                        reason: `【叙拉古战略】向叙拉古进军(距离${distance}步，经${this.getCityName(nextStep)})`
                    };
                }
            }
        }
        
        // 若当前位于中立城市
        if (currentCity.faction === 'neutral') {
            // 若当前位于叙拉古且叙拉古中立，优先围城
            if (army.location === targetCityId) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【叙拉古战略】围攻叙拉古(中立城市，直接围城)`
                };
            }
            
            // 西班牙地区的中立城市：直接围城
            const spainCities = this.strategicGoals.spainRegion.cityIds;
            if (spainCities.includes(currentCity.id)) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 80,
                    reason: `【叙拉古战略】围攻西班牙中立城市${this.getCityName(currentCity.id)}(不游说直接攻城)`
                };
            }
            
            // 若位于非叙拉古、非西班牙的中立城市的回合数大于6，优先围城
            const attitude = currentCity.carthageAttitude || 0;
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 70,
                    reason: `【叙拉古战略】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                // 若当前位于非叙拉古、非西班牙的中立城市，优先游说
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 75,
                    reason: `【叙拉古战略】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 若位于敌方城市，优先进行围城
        if (currentCity.faction === 'rome') {
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
                const myResult = this.calculateComprehensivePower(army, army.location, 'carthage');
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
     * 保卫西班牙战略
     */
    evaluateSpainDefenseStrategy(army, situation) {
        // 排除执行汉尼拔战略的部队
        if (this.isExecutingHannibalStrategy(army)) {
            return null;
        }
        
        const goals = this.strategicGoals;
        const spainCities = goals.spainRegion.cityIds;
        
        // 检查军队是否在西班牙地区
        const isInSpain = spainCities.includes(army.location);
        if (!isInSpain) return null;
        
        // 检查西班牙地区是否受到威胁
        const threatenedSpainCities = spainCities.filter(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (!city || city.faction !== 'carthage') return false;
            
            // 检查是否有敌军接近（2步以内）
            const nearbyEnemies = situation.enemyArmies.filter(e => {
                const dist = this.calculateDistance(e.location, cityId);
                return dist <= 2;
            });
            
            return nearbyEnemies.length > 0;
        });
        
        if (threatenedSpainCities.length === 0) return null;
        
        // 找到距离最近的受威胁城市
        let nearestThreat = null;
        let nearestDistance = 999;
        
        threatenedSpainCities.forEach(cityId => {
            const dist = this.calculateDistance(army.location, cityId);
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestThreat = cityId;
            }
        });
        
        if (!nearestThreat) return null;
        
        const basePriority = 400;
        
        // 如果已经在受威胁的城市
        if (army.location === nearestThreat) {
            const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
            
            if (enemiesAtLocation.length > 0) {
                const myPower = calculateCombatPower(army);
                const enemyPower = calculateCombatPower(enemiesAtLocation[0]);
                
                if (myPower > enemyPower * 0.9) {
                    return {
                        type: 'attack',
                        target: enemiesAtLocation[0],
                        priority: basePriority + 50,
                        reason: `【保卫西班牙】消灭入侵${this.getCityName(army.location)}的敌军`
                    };
                } else {
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 40,
                            reason: `【保卫西班牙】整编提升战力应对敌军`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 40,
                            reason: `【保卫西班牙】征召增强兵力应对敌军`
                        };
                    }
                }
            }
        } else {
            // 移动到受威胁的城市
            const nextStep = this.getNextStepToTarget(army.location, nearestThreat);
            if (nextStep) {
                return {
                    type: 'move',
                    target: nextStep,
                    priority: basePriority + 45,
                    reason: `【保卫西班牙】驰援${this.getCityName(nearestThreat)}(距离${nearestDistance}步)`
                };
            }
        }
        
        return null;
    },

    // ==================== 决策系统 ====================
    
    decideArmyAction(army, situation) {
        // addLog(`\n🎯 迦太基AI评估 ${army.commander} 的行动...`, 'info');
        
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
        const capitalId = 'carthage'; // 迦太基的首都
        const capitalCity = cities.find(c => c.id === capitalId);
        
        // 检查首都是否被敌方围城
        if (capitalCity && capitalCity.isUnderSiege && 
            capitalCity.besiegingFaction !== 'carthage') {
            
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
        
        // 【新增】优先检查当前城市是否正在被我方围城
        const currentCity = cities.find(c => c.id === army.location);
        if (currentCity && currentCity.isUnderSiege && currentCity.besiegingFaction === 'carthage') {
            // 该城市正在被我方围城，优先继续围城
            // addLog(`🏰 ${currentCity.name}正在被围城中(第${currentCity.siegeCount}次)，优先继续围城`, 'warning');
            
            // 检查是否有敌军驻防（围城期间不主动攻击）
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, 'rome');
            
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
        
        const decisions = [];
        
        // 1. 最高优先级：保卫迦太基
        const carthageDefense = this.evaluateDefendCapital(army, situation);
        if (carthageDefense) {
            decisions.push(carthageDefense);
        }
        
        // 2. 萨贡托战略（汉尼拔专属，极高优先级）
        const saguntoStrategy = this.evaluateSaguntoStrategy(army, situation);
        if (saguntoStrategy) {
            decisions.push(saguntoStrategy);
        }
        
        // 2.5. 西班牙战略（哈斯德鲁巴专属，最高优先级）
        const spainStrategy = this.evaluateSpainStrategy(army, situation);
        if (spainStrategy) {
            decisions.push(spainStrategy);
        }
        
        // 3. 汉尼拔特殊战略：进攻罗马
        const hannibalStrategy = this.evaluateHannibalRomeStrategy(army, situation);
        if (hannibalStrategy) {
            decisions.push(hannibalStrategy);
        }
        
        // 3.5. 罗马战略（兵力最强的2支部队，排除汉尼拔和叙拉古战略执行者）
        const romeStrategy = this.evaluateRomeStrategy(army, situation);
        if (romeStrategy) {
            decisions.push(romeStrategy);
        }
        
        // 4. 叙拉古战略（排除汉尼拔和罗马战略执行者）
        const syracuseStrategy = this.evaluateSyracuseStrategy(army, situation);
        if (syracuseStrategy) {
            decisions.push(syracuseStrategy);
        }
        
        // 5. 保卫西班牙战略
        const spainDefense = this.evaluateSpainDefenseStrategy(army, situation);
        if (spainDefense) {
            decisions.push(spainDefense);
        }
        
        // 6. 收复失地
        const recapture = this.evaluateRecaptureLostCity(army, situation);
        if (recapture) {
            decisions.push(recapture);
        }
        
        // 7. 攻击敌军
        const attack = this.evaluateAttack(army, situation);
        if (attack) {
            decisions.push(attack);
        }
        
        // 8. 围城
        const siege = this.evaluateSiege(army, situation);
        if (siege) {
            decisions.push(siege);
        }
        
        // 9. 游说
        const diplomacy = this.evaluateDiplomacy(army, situation);
        if (diplomacy) {
            decisions.push(diplomacy);
        }
        
        // 10. 征召
        const recruit = this.evaluateRecruit(army, situation);
        if (recruit) {
            decisions.push(recruit);
        }
        
        // 11. 整编
        const reorganize = this.evaluateReorganize(army, situation);
        if (reorganize) {
            decisions.push(reorganize);
        }
        
        // 12. 借款（一回合只能借款一次，且负债不超过5999）
        if (situation.myFunds < 100 && situation.myDebt < 6000 && !this.borrowedThisTurn) {
            decisions.push({
                type: 'borrow',
                priority: 100,
                reason: `资金不足(${situation.myFunds})，需要借款（当前债务${situation.myDebt}）`
            });
        }
        
        // 选择优先级最高的决策
        if (decisions.length === 0) {
            // 兜底：整编
            return {
                type: 'reorganize',
                priority: 50,
                reason: '无明确目标，维持部队状态'
            };
        }
        
        decisions.sort((a, b) => b.priority - a.priority);
        
        const bestDecision = decisions[0];
        // addLog(`   优先级最高的决策: ${this.getActionName(bestDecision.type)} (优先级${bestDecision.priority})`, 'info');
        // addLog(`   决策理由: ${bestDecision.reason}`, 'info');
        
        return bestDecision;
    },

    evaluateDefendCapital(army, situation) {
        // 汉尼拔和哈斯德鲁巴不参与救援和收复任务
        if (army.commander === '汉尼拔·巴卡' || army.commander === '哈斯德鲁巴·巴卡') {
            return null;
        }
        
        // 排除执行汉尼拔战略的部队
        if (this.isExecutingHannibalStrategy(army)) {
            return null;
        }
        
        const capitalId = this.strategicGoals.defenseCapital.cityId;
        const capitalCity = cities.find(c => c.id === capitalId);
        
        if (!capitalCity) return null;
        
        // 检查迦太基是否被围城或失陷
        if (capitalCity.faction !== 'carthage') {
            const distance = this.calculateDistance(army.location, capitalId);
            return {
                type: 'move',
                target: this.getNextStepToTarget(army.location, capitalId),
                priority: 1200,
                reason: `【紧急】迦太基失陷！立即收复(距离${distance}步)`
            };
        }
        
        // 检查是否有敌军威胁迦太基
        const threats = situation.enemyArmies.filter(e => {
            const dist = this.calculateDistance(e.location, capitalId);
            return dist <= this.strategicGoals.defenseCapital.defensiveRadius;
        });
        
        if (threats.length === 0) return null;
        
        // 找到最近的威胁
        let nearestThreat = null;
        let nearestDistance = 999;
        
        threats.forEach(threat => {
            const dist = this.calculateDistance(threat.location, capitalId);
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestThreat = threat;
            }
        });
        
        if (!nearestThreat) return null;
        
        const myDistance = this.calculateDistance(army.location, nearestThreat.location);
        const basePriority = 900 + (3 - nearestDistance) * 50; // 威胁越近，优先级越高
        
        // 如果与威胁同城
        if (army.location === nearestThreat.location) {
            const myPower = calculateCombatPower(army);
            const enemyPower = calculateCombatPower(nearestThreat);
            
            if (myPower > enemyPower * 0.9) {
                return {
                    type: 'attack',
                    target: nearestThreat,
                    priority: basePriority,
                    reason: `【保卫迦太基】消灭威胁首都的敌军${nearestThreat.commander}(距首都${nearestDistance}步)`
                };
            }
        }
        
        // 移动拦截
        if (myDistance <= 2) {
            const nextStep = this.getNextStepToTarget(army.location, nearestThreat.location);
            if (nextStep) {
                return {
                    type: 'move',
                    target: nextStep,
                    priority: basePriority,
                    reason: `【保卫迦太基】拦截威胁首都的敌军${nearestThreat.commander}(敌军距首都${nearestDistance}步)`
                };
            }
        }
        
        return null;
    },

    evaluateRecaptureLostCity(army, situation) {
        // 汉尼拔和哈斯德鲁巴不参与救援和收复任务
        if (army.commander === '汉尼拔·巴卡' || army.commander === '哈斯德鲁巴·巴卡') {
            return null;
        }
        
        const recaptureTarget = this.getPriorityRecaptureTarget(army);
        if (!recaptureTarget) return null;
        
        const targetCity = cities.find(c => c.id === recaptureTarget.cityId);
        if (!targetCity) return null;
        
        const distance = this.calculateDistance(army.location, recaptureTarget.cityId);
        const basePriority = 200 + recaptureTarget.weight;
        
        // 如果已经在失地
        if (army.location === recaptureTarget.cityId) {
            if (targetCity.faction === 'neutral') {
                // 西班牙地区的失地：直接围城
                const spainCities = this.strategicGoals.spainRegion.cityIds;
                if (spainCities.includes(targetCity.id)) {
                    return {
                        type: 'siege',
                        target: targetCity,
                        priority: basePriority + 50,
                        reason: `收复西班牙失地${targetCity.name}(围城，失守${recaptureTarget.turnsLost}回合)`
                    };
                } else {
                    return {
                        type: 'diplomacy',
                        target: targetCity,
                        priority: basePriority + 50,
                        reason: `收复失地${targetCity.name}(游说中立，失守${recaptureTarget.turnsLost}回合)`
                    };
                }
            } else {
                return {
                    type: 'siege',
                    target: targetCity,
                    priority: basePriority + 50,
                    reason: `收复失地${targetCity.name}(围城，失守${recaptureTarget.turnsLost}回合)`
                };
            }
        } else {
            // 移动到失地
            const nextStep = this.getNextStepToTarget(army.location, recaptureTarget.cityId);
            if (nextStep) {
                return {
                    type: 'move',
                    target: nextStep,
                    priority: basePriority,
                    reason: `前往收复失地${targetCity.name}(距离${distance}步，失守${recaptureTarget.turnsLost}回合)`
                };
            }
        }
        
        return null;
    },

    evaluateAttack(army, situation) {
        // 【新增】如果当前城市正在被我方围城，不主动攻击
        const currentCity = cities.find(c => c.id === army.location);
        if (currentCity && currentCity.isUnderSiege && currentCity.besiegingFaction === 'carthage') {
            return null; // 围城期间不主动攻击
        }
        
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        if (enemiesAtLocation.length === 0) return null;
        
        const enemy = enemiesAtLocation[0];
        const myPower = calculateCombatPower(army);
        const enemyPower = calculateCombatPower(enemy);
        
        if (myPower > enemyPower * 1) {
            const priority = 90 + (currentCity && currentCity.faction === 'carthage' ? 50 : 0);
            
            return {
                type: 'attack',
                target: enemy,
                priority: priority,
                reason: `优势攻击敌军${enemy.commander}(战力优势${(myPower/enemyPower).toFixed(2)}:1)`
            };
        }
        
        return null;
    },

    evaluateSiege(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        // 特殊判断：当迦太基城或新迦太基城失陷，且本方军队士气为5时，最高优先级围城
        if ((currentCity.id === 'carthage' || currentCity.id === 'newcarthage') && 
            currentCity.faction !== 'carthage' && 
            army.morale >= 5) {
            const cityName = currentCity.id === 'carthage' ? '迦太基城' : '新迦太基城';
            return {
                type: 'siege',
                target: currentCity,
                priority: 99999, // 最高优先级
                reason: `【紧急】${cityName}失陷！士气饱满，立即围城收复！`
            };
        }
        
        if (currentCity.faction === 'carthage') return null;
        
        // 检查是否有敌军驻防
        const enemyFaction = currentCity.faction === 'rome' ? 'rome' : 'neutral';
        const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, enemyFaction);
        
        if (enemiesAtCity.length > 0) return null;
        
        // 罗马城市：直接围城
        if (currentCity.faction === 'rome') {
            const cityValue = (currentCity.politicalScore || 0) + (currentCity.economicScore || 0);
            return {
                type: 'siege',
                target: currentCity,
                priority: 70 + cityValue * 2,
                reason: `围攻敌城${currentCity.name}(价值${cityValue})`
            };
        }
        
        // 中立城市：只围攻西班牙地区的中立城市
        if (currentCity.faction === 'neutral') {
            const spainCities = this.strategicGoals.spainRegion.cityIds;
            if (spainCities.includes(currentCity.id)) {
                const cityValue = (currentCity.politicalScore || 0) + (currentCity.economicScore || 0);
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: 75 + cityValue * 2, // 优先级略高于游说
                    reason: `围攻西班牙中立城市${currentCity.name}(价值${cityValue}，不游说直接攻城)`
                };
            }
        }
        
        return null;
    },

    evaluateDiplomacy(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        if (currentCity.faction !== 'neutral') return null;
        
        // 西班牙地区的中立城市不游说，直接围城
        const spainCities = this.strategicGoals.spainRegion.cityIds;
        if (spainCities.includes(currentCity.id)) {
            return null; // 返回null，让evaluateSiege处理
        }
        
        // 【新增】检查是否有敌军驻守
        const enemyFaction = 'rome';
        const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(currentCity.id, enemyFaction);
        
        if (enemiesAtCity.length > 0) {
            // 有敌军，改为围攻
            const cityValue = (currentCity.politicalScore || 0) + (currentCity.economicScore || 0);
            return {
                type: 'siege',
                target: currentCity,
                priority: 55 + cityValue * 1.5,  // 围攻优先级略低于游说
                reason: `中立城市${currentCity.name}有敌军驻守，改为围攻`
            };
        }
        
        const attitude = currentCity.carthageAttitude || 0;
        const cityValue = (currentCity.politicalScore || 0) + (currentCity.economicScore || 0);
        
        return {
            type: 'diplomacy',
            target: currentCity,
            priority: 60 + cityValue + attitude * 10,
            reason: `游说中立城市${currentCity.name}(态度${attitude}/3，价值${cityValue})`
        };
    },

    evaluateRecruit(army, situation) {
        const totalTroops = (army.lightCavalry || 0) + (army.heavyCavalry || 0) + 
                           (army.heavyInfantry || 0) + (army.lightInfantry || 0);
        
        const currentCity = cities.find(c => c.id === army.location);
        
        if (totalTroops < 10000 && situation.myFunds >= 200) {
            const priority = 40 + (currentCity && currentCity.faction === 'carthage' ? 15 : 0);
            return {
                type: 'recruit',
                priority: priority,
                reason: `补充兵力(当前${totalTroops}人)`
            };
        }
        
        return null;
    },

    evaluateReorganize(army, situation) {
        if (army.morale < 4) {
            const currentCity = cities.find(c => c.id === army.location);
            const priority = 55 + (5 - army.morale) * 10 + 
                           (currentCity && currentCity.faction === 'carthage' ? 15 : 0);
            
            return {
                type: 'reorganize',
                priority: priority,
                reason: `提升低士气(当前${army.morale.toFixed(1)})`
            };
        }
        
        return null;
    },

    updateArmyStayHistory(army) {
        const currentLocation = army.location;
        const armyId = army.id;
        
        if (!this.armyStayHistory[armyId]) {
            this.armyStayHistory[armyId] = {
                cityId: currentLocation,
                stayTurns: 1,
                firstStayTurn: gameState.turn
            };
        } else {
            const stayRecord = this.armyStayHistory[armyId];
            if (stayRecord.cityId === currentLocation) {
                stayRecord.stayTurns++;
            } else {
                stayRecord.cityId = currentLocation;
                stayRecord.stayTurns = 1;
                stayRecord.firstStayTurn = gameState.turn;
            }
        }
    },

    /**
     * 评估是否应该组建新军
     * 检查财政盈余和组军条件
     */
    shouldRaiseNewArmy(situation) {
        // 检查部队数量限制（最多5支）
        const currentArmyCount = situation.myArmies.length;
        if (currentArmyCount >= 5) {
            return null; // 部队数量已达上限
        }
        
        const capitalCity = 'carthage';
        const raiseArmyCost = 500;
        
        // 1. 检查迦太基城是否有驻军
        const armiesAtCapital = situation.myArmies.filter(a => a.location === capitalCity);
        if (armiesAtCapital.length > 0) {
            return null; // 迦太基有驻军，不需要组军
        }
        
        // 2. 检查资金是否足够（需要至少500+200的余量）
        if (situation.myFunds < raiseArmyCost + 200) {
            return null; // 资金不足
        }
        
        // 3. 计算当前收入
        const myIncome = cities
            .filter(c => c.faction === 'carthage')
            .reduce((sum, c) => sum + (c.economicScore || 0), 0);
        
        // 4. 计算当前真实军饷支出（使用游戏实际计算公式）
        let currentExpense = 0;
        situation.myArmies.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            currentExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        });
        currentExpense = Math.round(currentExpense);
        
        // 5. 当前盈余
        const currentSurplus = myIncome - currentExpense;
        
        // 6. 如果当前没有盈余，不组军
        if (currentSurplus <= 0) {
            return null;
        }
        
        // 7. 计算组军后的盈余（新军队按标准配置：轻骑2000，重骑1000，重步20000，轻步2000）
        const newArmyCost = 2000/100 + 1000/50 + 20000/200 + 2000/3000; // 约140.67
        const futureExpense = currentExpense + newArmyCost;
        const futureSurplus = myIncome - futureExpense;
        
        // 8. 如果组军后没有盈余，不组军
        if (futureSurplus <= 0) {
            return null;
        }
        
        // 9. 检查资金是否充裕（至少要有组军成本 + 一定储备）
        const minReserveFunds = 300; // 保留储备
        if (situation.myFunds < raiseArmyCost + minReserveFunds) {
            return null; // 资金不够充裕
        }
        
        // 10. 检查是否有近距离威胁（3步以内）
        const threatsToCapital = situation.enemyArmies.filter(e => {
            const distance = this.calculateDistance(e.location, capitalCity);
            return distance <= 3;
        });
        
        // 如果有威胁，需要更多储备资金
        if (threatsToCapital.length > 0) {
            if (situation.myFunds < raiseArmyCost + 500) {
                return null; // 有威胁时需要更多储备
            }
        }
        
        // 11. 满足所有条件，可以组军
        return {
            type: 'raise_army',
            priority: 200,
            reason: `【组军】财政盈余${currentSurplus}，组军后仍有盈余${futureSurplus.toFixed(0)}`
        };
    },

    // ==================== 执行系统 ====================
    
    async executeTurn() {
        if (!this.shouldControl()) return;
        
        // 检查全局暂停状态
        if (typeof gameState !== 'undefined' && gameState.paused) {
            console.log('⏸️ 迦太基AI执行被暂停');
            return;
        }
        
        // addLog(`🤖 ========== 迦太基AI开始执行回合 ==========`, 'system');
        
        // 重置本回合借款标记
        if (this.currentTurnForBorrow !== gameState.turn) {
            this.currentTurnForBorrow = gameState.turn;
            this.borrowedThisTurn = false;
        }
        
        this.checkCityChanges();
        
        const situation = this.evaluateSituation();
        
        // 显示战略目标状态
        const goals = this.strategicGoals;
        // addLog(`\n🎯 迦太基战略目标:`, 'info');
        
        // 1. 迦太基城状态
        const carthageCity = cities.find(c => c.id === goals.defenseCapital.cityId);
        const carthageStatus = carthageCity && carthageCity.faction === 'carthage' ? '✅ 已控制' : '❌ 已失陷';
        const threats = situation.enemyArmies.filter(e => {
            const dist = this.calculateDistance(e.location, goals.defenseCapital.cityId);
            return dist <= goals.defenseCapital.defensiveRadius;
        });
        const threatStatus = threats.length > 0 ? `⚠️ 受威胁(${threats.length}支敌军)` : '✅ 安全';
        // addLog(`   首要目标 - 保卫迦太基城: ${carthageStatus}, ${threatStatus}`, 'info');
        
        // 2. 重要进攻目标
        for (const target of goals.offensiveTargets) {
            const targetCity = cities.find(c => c.id === target.cityId);
            const status = targetCity.faction === 'carthage' ? '✅ 已占领' : 
                         targetCity.faction === 'rome' ? '❌ 敌方控制' : '⚪ 中立';
            const siege = targetCity.isUnderSiege ? '(围城中)' : '';
            // addLog(`   ${target.description}: ${status} ${siege}`, 'info');
        }
        
        // 3. 西班牙地区进度
        const controlledSpainCities = goals.spainRegion.cityIds.filter(id => {
            const city = cities.find(c => c.id === id);
            return city && city.faction === 'carthage';
        }).length;
        const totalSpainCities = goals.spainRegion.cityIds.length;
        const controlPercentage = (controlledSpainCities / totalSpainCities * 100).toFixed(0);
        // addLog(`   控制西班牙: ${controlledSpainCities}/${totalSpainCities}座 (${controlPercentage}%)`, 'info');
        
        if (this.config.debugMode) {
            console.log('迦太基AI详细评估:', situation);
        }
        
        // 【组军决策】在所有军队行动前检查是否应该组军
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
        
        // 为每支军队执行决策
        const currentArmies = armies.carthage || [];
        // addLog(`🎲 开始逐个处理 ${currentArmies.length} 支军队...`, 'info');
        
        // 清除旧决策信息
        currentArmies.forEach(army => {
            delete army.aiDecision;
        });
        
        for (let i = 0; i < currentArmies.length; i++) {
            const army = currentArmies[i];
            
            await this.delay(this.config.autoDelay);
            await this.waitIfPaused();
            
            if (!armies.carthage.find(a => a.id === army.id)) {
                // addLog(`⚠️ ${army.commander} 已不存在，跳过`, 'warning');
                continue;
            }
            
            // addLog(`\n--- 🎯 处理第${i+1}/${currentArmies.length}支军队: ${army.commander} ---`, 'info');
            
            const decision = await Promise.resolve(this.decideArmyAction(army, situation));
            
            if (this.config.debugMode) {
                console.log(`迦太基AI决策 [${army.commander}]:`, decision);
            }
            
            // 保存AI决策信息
            army.aiDecision = {
                actionName: this.getActionName(decision.type),
                reason: decision.reason || '无',
                priority: decision.priority || 0,
                type: decision.type,
                timestamp: Date.now()
            };
            
            await this.executeDecision(army, decision);
            await this.waitIfPaused();
            await this.delay(this.config.autoDelay);
        }
        
        await this.delay(this.config.autoDelay);
        
        // 非看海模式时才自动结束回合，看海模式由外层控制
        if (!gameState.watchMode) {
            endTurn();
        } else {
            // addLog(`🤖 迦太基AI回合执行完毕`, 'system');
        }
    },

    async executeDecision(army, decision) {
        if (!decision) {
            // addLog(`❌ 致命错误：${army.commander} 决策系统失败`, 'error');
            gameState.selectedArmy = army.id;
            gameState.selectedRegion = army.location;
            executeReorganize();
            return;
        }

        const actionName = this.getActionName(decision.type);
        // addLog(`🎯 ${army.commander} 最终决定: ${actionName} - ${decision.reason}`, 'success');

        gameState.selectedArmy = army.id;

        const isValid = this.validateAndFixDecision(army, decision);
        if (!isValid) {
            // addLog(`⚠️ 决策验证失败且无法修正，${army.commander} 执行整编`, 'warning');
            gameState.selectedRegion = army.location;
            executeReorganize();
            return;
        }

        switch (decision.type) {
            case 'move':
                this.armyHistory[army.id] = {
                    lastLocation: army.location,
                    actionCount: (this.armyHistory[army.id]?.actionCount || 0) + 1,
                    detoured: decision._detoured || false
                };
                gameState.selectedRegion = decision.target;
                executeMove();
                // 更新行动历史（记录绕路）
                this.updateArmyActionHistory(army, decision._detoured || false, false);
                break;

            case 'attack':
                executeAttack();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'siege':
                gameState.selectedRegion = army.location;
                executeAction('siege');
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'diplomacy':
                gameState.selectedRegion = decision.target.id;
                executeDiplomacy();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'recruit':
                if (this.armyHistory[army.id]) {
                    this.armyHistory[army.id].detoured = false;
                }
                gameState.selectedRegion = army.location;
                executeRecruit();
                // 更新行动历史（清除绕路和撤退标记）
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'reorganize':
                if (this.armyHistory[army.id]) {
                    this.armyHistory[army.id].detoured = false;
                }
                gameState.selectedRegion = army.location;
                executeReorganize();
                // 更新行动历史（清除绕路和撤退标记）
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'fortify':
                gameState.selectedRegion = army.location;
                executeFortify();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'borrow':
                executeBorrow();
                this.borrowedThisTurn = true; // 标记本回合已借款
                // addLog(`📝 已标记本回合借款，本回合不再借款`, 'info');
                break;
            
            case 'raise_army':
                // 组军不影响军队状态（在executeTurn开始时执行）
                break;

            default:
                // addLog(`❌ 错误：未知决策类型 ${decision.type}`, 'error');
                gameState.selectedRegion = army.location;
                executeReorganize();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;
        }
    },

    validateAndFixDecision(army, decision) {
        switch (decision.type) {
            case 'move':
                const connectedCities = getConnectedCities(army.location);
                if (!connectedCities.includes(decision.target)) {
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
                return true;
        }
    },

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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    pause() {
        if (!this.config.paused) {
            this.config.paused = true;
            // addLog(`⏸️ 迦太基AI执行已暂停（战斗进行中）`, 'system');
        }
    },

    resume() {
        if (this.config.paused) {
            this.config.paused = false;
            if (this.config.pauseResolve) {
                this.config.pauseResolve();
                this.config.pauseResolve = null;
            }
            // addLog(`▶️ 迦太基AI执行已恢复`, 'system');
        }
    },

    async waitIfPaused() {
        if (this.config.paused) {
            await new Promise(resolve => {
                this.config.pauseResolve = resolve;
            });
        }
    },

    // ==================== 战斗决策系统 ====================

    /**
     * 处理主动进攻的决策（攻击方）
     * @param {Object} attackerArmy - 攻击方军队
     * @param {Object} defenderArmy - 防御方军队
     * @param {Object} city - 战斗城市
     * @returns {Boolean} - 是否继续进攻
     */
    async handleAttackDecision(attackerArmy, defenderArmy, city) {
        // 检查是否是AI控制的阵营
        if (!this.config.enabled || attackerArmy.faction !== 'carthage') {
            return true; // 不是AI控制的军队，继续进攻
        }

        // addLog(`🤖 迦太基AI正在准备进攻...`, 'carthage');

        // 第一步：请求所有可能的援军
        // addLog(`📢 ${attackerArmy.commander} 向附近己方军队请求援军...`, 'carthage');
        
        const supportRequested = await this.requestAllSupport(attackerArmy, defenderArmy, city);
        
        if (supportRequested) {
            // addLog(`✅ 援军请求已发送，等待支援到达`, 'carthage');
            await this.delay(1500);
        } else {
            // addLog(`ℹ️ 附近无可用援军，${attackerArmy.commander} 将独自进攻`, 'carthage');
        }

        // 第二步：使用综合战力评估（包含潜在援军）
        const myResult = AIController.calculateComprehensivePower(attackerArmy, city.id, 'carthage');
        const myPower = myResult.totalPower;
        
        const enemyResult = AIController.calculateEnemyComprehensivePower(city.id, defenderArmy.faction);
        const enemyPower = enemyResult.totalPower;
        
        const powerRatio = myPower / enemyPower;

        // addLog(`⚖️ 综合实力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)} (${powerRatio.toFixed(2)}:1)`, 'carthage');

        // 第三步：决定是否继续进攻
        if (myPower > enemyPower) {
            // addLog(`⚔️ 综合战力占据优势，${attackerArmy.commander} 发起进攻！`, 'carthage');
            return true; // 继续进攻
        } else {
            // addLog(`⚠️ 即使考虑潜在援军后仍处于劣势(${powerRatio.toFixed(2)}:1)，但已经承诺进攻`, 'warning');
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
        if (!this.config.enabled || defenderArmy.faction !== 'carthage') {
            return null; // 不是AI控制的军队
        }

        // addLog(`🤖 迦太基AI正在评估防御策略...`, 'carthage');

        // 第一步：AI自动请求同城和周边所有地区的援军
        // addLog(`📢 ${defenderArmy.commander} 向附近己方军队请求援军...`, 'carthage');
        
        const supportRequested = await this.requestAllSupport(defenderArmy, attackerArmy, city);
        
        if (supportRequested) {
            // addLog(`✅ 援军请求已发送，等待支援到达`, 'carthage');
            await this.delay(1500);
        } else {
           // addLog(`ℹ️ 附近无可用援军，${defenderArmy.commander} 将独自应战`, 'carthage');
        }

        // 第二步：使用综合战力评估（包含请求完援军后的战力）
        const myResult = AIController.calculateComprehensivePower(defenderArmy, city.id, 'carthage');
        const myPower = myResult.totalPower;
        
        const enemyResult = AIController.calculateEnemyComprehensivePower(city.id, attackerArmy.faction);
        const enemyPower = enemyResult.totalPower;
        
        const powerRatio = myPower / enemyPower;

        // addLog(`⚖️ 综合实力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)} (${powerRatio.toFixed(2)}:1)`, 'carthage');

        // 第三步：根据城市阵营和实力对比做出决策
        const isMyCity = city.faction === 'carthage';
        const powerGap = enemyPower - myPower;
        
        if (isMyCity) {
            // ========== (二) 当前处于迦太基己方城市 ==========
            // addLog(`📍 当前位于己方城市 ${city.name}`, 'carthage');
            
            if (myPower > enemyPower * 0.9) {
                // (1) 战力 > 敌方×0.9：会战
                // addLog(`⚔️ 综合战力优势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定进行会战！`, 'carthage');
                return {
                    action: 'battle',
                    reason: `己方城市优势会战(${powerRatio.toFixed(2)}:1)`
                };
            } else if (myPower > enemyPower * 0.5) {
                // (2) 敌方×0.5 < 战力 ≤ 敌方×0.9：守城
                // addLog(`🛡️ 战力处于中等劣势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定守城！`, 'carthage');
                // addLog(`📝 后续回合将优先征召和整编增强实力`, 'carthage');
                
                // 标记该军队下回合优先增强
                if (!this.armyPlans[defenderArmy.id]) {
                    this.armyPlans[defenderArmy.id] = {};
                }
                this.armyPlans[defenderArmy.id].prioritizeReinforce = true;
                
                return {
                    action: 'siege',
                    reason: `己方城市中等劣势守城(${powerRatio.toFixed(2)}:1，差距${powerGap.toFixed(0)})`
                };
            } else {
                // (3) 战力 ≤ 敌方×0.5：判断周边有无中立/己方城市
                // addLog(`⚠️ 战力处于严重劣势（${powerRatio.toFixed(2)}:1），差距${powerGap.toFixed(0)}`, 'warning');
                
                // 评估撤退目标（只考虑中立或己方城市）
                const retreatTarget = this.findBestRetreatTarget(defenderArmy, attackerArmy);
                
                if (retreatTarget) {
                    const targetCity = cities.find(c => c.id === retreatTarget);
                    const factionDesc = targetCity.faction === 'carthage' ? '己方' : '中立';
                    // addLog(`🏃 找到${factionDesc}城市可撤退，${defenderArmy.commander} 决定撤退至 ${targetCity.name}`, 'carthage');
                    return {
                        action: 'retreat',
                        reason: `己方城市严重劣势撤退至${factionDesc}城市(${powerRatio.toFixed(2)}:1)`
                    };
                } else {
                    // 周边无合适撤退目标，守城
                    // addLog(`🛡️ 周边无合适撤退目标，${defenderArmy.commander} 决定守城死战！`, 'carthage');
                    
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
            // addLog(`📍 当前位于${cityType} ${city.name}`, 'carthage');
            
            if (myPower > enemyPower * 0.9) {
                // (1) 战力 > 敌方×0.9：会战
                // addLog(`⚔️ 综合战力优势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定进行会战！`, 'carthage');
                return {
                    action: 'battle',
                    reason: `${cityType}优势会战(${powerRatio.toFixed(2)}:1)`
                };
            } else {
                // (2) 战力 ≤ 敌方×0.9：判断周边有无中立/己方城市
                // addLog(`⚠️ 战力处于劣势（${powerRatio.toFixed(2)}:1），差距${powerGap.toFixed(0)}`, 'warning');
                
                // 评估撤退目标（只考虑中立或己方城市）
                const retreatTarget = this.findBestRetreatTarget(defenderArmy, attackerArmy);
                
                if (retreatTarget) {
                    const targetCity = cities.find(c => c.id === retreatTarget);
                    const factionDesc = targetCity.faction === 'carthage' ? '己方' : '中立';
                    // addLog(`🏃 找到${factionDesc}城市可撤退，${defenderArmy.commander} 决定撤退至 ${targetCity.name}`, 'carthage');
                    return {
                        action: 'retreat',
                        reason: `${cityType}劣势撤退至${factionDesc}城市(${powerRatio.toFixed(2)}:1)`
                    };
                } else {
                    // 周边无合适撤退目标，会战
                    // addLog(`⚔️ 周边无合适撤退目标，${defenderArmy.commander} 决定进行会战！`, 'carthage');
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
        // 获取所有迦太基军队
        const myArmies = armies.carthage || [];
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

        // addLog(`📡 发现${supportArmies.length}支可能的援军：`, 'carthage');
        for (const { army, distance } of supportArmies) {
            const cityName = this.getCityName(army.location);
            const distanceText = distance === 0 ? '同城' : `${distance}步`;
            // addLog(`   - ${army.commander} (${cityName}，距离${distanceText})`, 'carthage');
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
                // addLog(`   ❌ ${army.commander} 支援失败 (2D6=${diceTotal} > 10)`, 'carthage');
            }
            
            // 短暂延迟
            await this.delay(300);
        }

        if (totalSupported > 0) {
            // addLog(`✅ 成功获得${totalSupported}支援军！`, 'carthage');
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
            // addLog(`   ⚠️ ${reinforcingArmy.commander} 兵力不足，无法提供支援`, 'carthage');
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
        // addLog(`   ✅ ${reinforcingArmy.commander} 承诺提供援军支援 (2D6=${dice1}+${dice2}，支援战力${supportPercentage}%)`, 'carthage');
        
        const details = [];
        if (lightCavSupport > 0) details.push(`轻骑兵${lightCavSupport}人`);
        if (heavyCavSupport > 0) details.push(`重骑兵${heavyCavSupport}人`);
        if (heavyInfSupport > 0) details.push(`重步兵${heavyInfSupport}人`);
        if (lightInfSupport > 0) details.push(`轻步兵${lightInfSupport}人`);
        
        if (details.length > 0) {
            // addLog(`      援军战力：${details.join(', ')}（参与战斗计算但不转移兵力）`, 'carthage');
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
        const myFaction = 'carthage';
        let bestTarget = null;
        let bestPriority = -1;

        // addLog(`   🔍 评估周边撤退目标...`, 'carthage');

        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;

            // 【关键1】海路连接不能作为撤退路线
            if (this.isSeaRoute(currentLocation, cityId)) {
                // addLog(`   ❌ ${city.name}(海路) - 海路不能作为撤退路线`, 'carthage');
                continue;
            }

            // 【关键2】只考虑中立城市和己方城市，不考虑敌方城市
            if (city.faction !== 'neutral' && city.faction !== myFaction) {
                // addLog(`   ❌ ${city.name}(敌方城市) - 不考虑撤退到敌方城市`, 'carthage');
                continue;
            }

            // 检查该城市是否有敌军
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
            if (enemiesAtCity.length > 0) {
                const enemyPower = enemiesAtCity.reduce((sum, e) => sum + calculateCombatPower(e), 0);
                const myPower = calculateCombatPower(defenderArmy);
                // 如果撤退目标的敌军太强，跳过
                if (enemyPower >= myPower * 0.8) {
                    // addLog(`   ❌ ${city.name}(${city.faction === myFaction ? '己方' : '中立'}) - 有强敌驻守`, 'carthage');
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

            // addLog(`   ✅ ${city.name}(${factionDesc}城市) - 可作为撤退目标(优先级${priority})`, 'carthage');

            if (priority > bestPriority) {
                bestPriority = priority;
                bestTarget = cityId;
            }
        }

        if (!bestTarget) {
            // addLog(`   ⚠️ 周边无合适的撤退目标（无中立或己方城市）`, 'carthage');
        } else {
            const targetCity = cities.find(c => c.id === bestTarget);
            const factionDesc = targetCity.faction === myFaction ? '己方' : '中立';
            // addLog(`   🎯 最佳撤退目标：${targetCity.name}(${factionDesc}城市)`, 'carthage');
        }

        return bestTarget;
    },

    /**
     * 计算综合战力（考虑潜在援军和马其顿盟友）
     * 综合战力 = 本队战力 + 同城友军*0.5 + 相邻友军*0.5 + 同城盟友*0.5 + 相邻盟友*0.5
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
        
        // 2. 同城友军战力 * 0.5（移动后目标城市的己方军队）
        const alliesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, faction);
        alliesInCity.forEach(ally => {
            if (ally.id !== army.id) { // 排除自己
                const allyPower = calculateCombatPower(ally);
                details.sameCityAllies.push({ commander: ally.commander, power: allyPower });
                details.sameCityPower += allyPower * 0.5;
            }
        });
        totalPower += details.sameCityPower;
        
        // 3. 相邻友军战力 * 0.5（目标城市相邻的己方军队）
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
        
        // 4. 同城盟友军队战力 * 0.5（马其顿联盟支援）
        if (this.isAlliedWithMacedonia()) {
            const macedoniaArmiesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, 'macedonia');
            macedoniaArmiesInCity.forEach(allyArmy => {
                const allyPower = calculateCombatPower(allyArmy);
                details.sameCityAllyArmies.push({ 
                    commander: allyArmy.commander, 
                    power: allyPower,
                    faction: '马其顿盟友'
                });
                details.sameCityAllyPower += allyPower * 0.5;
            });
            totalPower += details.sameCityAllyPower;
            
            // 5. 相邻盟友军队战力 * 0.5
            connectedCities.forEach(cityId => {
                const macedoniaArmiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, 'macedonia');
                macedoniaArmiesInNeighbor.forEach(allyArmy => {
                    const allyPower = calculateCombatPower(allyArmy);
                    const cityName = this.getCityName(cityId);
                    details.neighborAllyArmies.push({ 
                        commander: allyArmy.commander, 
                        power: allyPower,
                        city: cityName,
                        faction: '马其顿盟友'
                    });
                    details.neighborAllyPower += allyPower * 0.5;
                });
            });
            totalPower += details.neighborAllyPower;
        }
        
        return {
            totalPower: totalPower,
            details: details
        };
    },

    /**
     * 计算敌方综合战力
     * 敌方综合战力 = 目标城市所有敌军战力*1.0 + 相邻城市敌军战力*0.5
     * @param {string} targetCityId - 目标城市ID
     * @param {string} enemyFaction - 敌方阵营
     * @returns {Object} { totalPower: number, details: string } 敌方综合战力和详细说明
     */
    calculateEnemyComprehensivePower(targetCityId, enemyFaction) {
        let totalPower = 0;
        const sameCityEnemies = [];
        const neighborEnemies = [];
        
        // 1. 目标城市的敌军（100%）
        const enemiesInCity = CityArmyManager.getArmiesAtCityByFaction(targetCityId, enemyFaction);
        enemiesInCity.forEach(enemy => {
            const enemyPower = calculateCombatPower(enemy);
            sameCityEnemies.push({ commander: enemy.commander, power: enemyPower });
            totalPower += enemyPower;
        });
        
        // 2. 相邻城市的敌军（50%）
        const connectedCities = getConnectedCities(targetCityId);
        connectedCities.forEach(cityId => {
            const enemiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
            enemiesInNeighbor.forEach(enemy => {
                const enemyPower = calculateCombatPower(enemy);
                const cityName = this.getCityName(cityId);
                neighborEnemies.push({ 
                    commander: enemy.commander, 
                    power: enemyPower,
                    city: cityName
                });
                totalPower += enemyPower * 0.5;
            });
        });
        
        // 构建详细说明
        let details = '';
        if (sameCityEnemies.length > 0) {
            details += `同城敌军${sameCityEnemies.length}支`;
        }
        if (neighborEnemies.length > 0) {
            if (details) details += '，';
            details += `相邻敌军${neighborEnemies.length}支`;
        }
        
        return {
            totalPower: totalPower,
            details: details
        };
    }
};

