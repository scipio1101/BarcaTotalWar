/**
 * 马其顿AI控制器模块
 * 用于自动控制马其顿阵营的军队行动
 * 支持多种战略模式：罗马战略、迦太基战略、亚历山大战略、安条克战略
 */

const MacedoniaAIController = {
    // 辅助函数：获取城市中文名
    getCityName(cityId) {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : cityId;
    },

    // AI配置
    config: {
        enabled: false,           // AI是否启用
        controlledFaction: 'macedonia',  // AI控制的阵营
        strategy: 'alexander',    // 当前战略 ('rome', 'carthage', 'alexander', 'antiochus')
        aggressiveness: 0.7,      // 进攻倾向 (0-1)
        economicFocus: 0.3,       // 经济重视度 (0-1)
        autoDelay: 1000,          // 自动操作延迟（毫秒）
        debugMode: false,         // 调试模式
        paused: false,            // 是否暂停AI执行（用于战斗时）
        pauseResolve: null,       // 暂停恢复的Promise resolver
        alliance: 'neutral',      // 当前联盟状态 ('carthage', 'rome', 'neutral')
        primaryTarget: 'antioch',    // 第一目标城市（动态调整）
        secondaryTarget: 'alexandria' // 第二目标城市（动态调整）
    },

    // 战略配置集合
    strategies: {
        // 1. 亚历山大战略：全面扩张，征服一切（默认战略）
        alexander: {
            name: '亚历山大战略',
            description: '继承亚历山大大帝遗志，全面征服地中海',
            aggressiveness: 0.9,  // 最高进攻性
            economicFocus: 0.1,   // 最低经济重视
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 0,  // 最小防御半径
                description: '保卫佩拉'
            },
            secondaryDefense: [],  // 不强调次要防御
            // 双首要目标：同时进攻罗马和迦太基
            offensiveTargets: [
                { cityId: 'rome', priority: 900, description: '攻陷罗马城' },
                { cityId: 'carthage', priority: 900, description: '攻陷迦太基城' },
                { cityId: 'syracuse', priority: 850, description: '占领叙拉古' },
                { cityId: 'newcarthage', priority: 800, description: '占领新迦太基' },
                { cityId: 'ravenna', priority: 750, description: '占领拉文纳' },
                { cityId: 'tarentum', priority: 700, description: '占领塔兰托' }
            ],
            expansionPriority: {
                description: '优先攻占所有重要城市',
                targetImportantCities: true,  // 优先攻击important=true的城市
                minCityValue: 10  // 城市价值阈值（政治+经济）
            }
        },

        // 2. 叙拉古战略：控制西西里，掌握地中海枢纽
        syracuse: {
            name: '叙拉古战略',
            description: '以西西里为基地，控制地中海中部要道',
            aggressiveness: 0.75,
            economicFocus: 0.25,
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            secondaryDefense: [
                { cityId: 'athens', priority: 850, description: '守卫雅典' },
                { cityId: 'corinth', priority: 800, description: '守卫科林斯' },
                { cityId: 'syracuse', priority: 950, description: '死守叙拉古' }  // 核心基地
            ],
            // 首要目标：控制整个西西里岛
            offensiveTargets: [
                { cityId: 'syracuse', priority: 950, description: '占领叙拉古（首要）' },
                { cityId: 'messana', priority: 900, description: '占领墨西拿（跨海要道）' },
                { cityId: 'lilybaeum', priority: 850, description: '占领利利拜' },
                { cityId: 'agrigentum', priority: 800, description: '占领阿格里真托' },
                { cityId: 'tarentum', priority: 750, description: '占领塔兰托（意大利桥头堡）' },
                { cityId: 'carthage', priority: 700, description: '进攻迦太基' },
                { cityId: 'rome', priority: 650, description: '进攻罗马' }
            ],
            sicilyRegion: {
                cityIds: ['syracuse', 'messana', 'lilybaeum', 'agrigentum'],
                priority: 900,
                description: '完全控制西西里岛'
            },
            centralMediterranean: {
                cityIds: ['syracuse', 'tarentum', 'messana', 'lilybaeum', 'carthage'],
                priority: 800,
                description: '控制地中海中部'
            }
        },

        // 3. 罗马战略：征服罗马，统一意大利
        rome: {
            name: '罗马战略',
            description: '北上意大利，攻陷罗马，建立地中海霸权',
            aggressiveness: 0.8,
            economicFocus: 0.2,
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            secondaryDefense: [
                { cityId: 'athens', priority: 850, description: '守卫雅典' },
                { cityId: 'corinth', priority: 800, description: '守卫科林斯' }
            ],
            // 罗马为首要目标，逐步占领意大利
            offensiveTargets: [
                { cityId: 'rome', priority: 950, description: '攻陷罗马城（首要）' },
                { cityId: 'brundisium', priority: 900, description: '占领布林迪西（登陆点）' },
                { cityId: 'tarentum', priority: 850, description: '占领塔兰托' },
                { cityId: 'capua', priority: 800, description: '占领卡普阿' },
                { cityId: 'ravenna', priority: 750, description: '占领拉文纳' },
                { cityId: 'ancona', priority: 700, description: '占领安科纳' },
                { cityId: 'arretium', priority: 650, description: '占领阿雷佐' }
            ],
            italyRegion: {
                cityIds: ['rome', 'ravenna', 'arretium', 'ancona', 'capua', 'tarentum', 'brundisium'],
                priority: 850,
                description: '完全控制意大利半岛'
            },
            adriaticRoute: {
                cityIds: ['brundisium', 'tarentum', 'ancona', 'ravenna'],
                priority: 750,
                description: '控制亚得里亚海沿岸'
            }
        },

        // 4. 安条克战略：稳健防御，巩固东方
        antiochus: {
            name: '安条克战略',
            description: '守住希腊，稳步发展，等待时机',
            aggressiveness: 0.5,  // 最低进攻性
            economicFocus: 0.5,   // 最高经济重视
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,  // 最大防御半径
                description: '保卫佩拉'
            },
            secondaryDefense: [
                { cityId: 'athens', priority: 950, description: '死守雅典' },
                { cityId: 'corinth', priority: 900, description: '死守科林斯' },
                { cityId: 'sparta', priority: 850, description: '守卫斯巴达' },
                { cityId: 'demetrias', priority: 800, description: '守卫安布拉基亚' },
                { cityId: 'philippopolis', priority: 800, description: '守卫迪拉奇乌姆' }
            ],
            // 防守反击，只在敌人虚弱时进攻
            offensiveTargets: [
                { cityId: 'rome', priority: 600, description: '伺机攻罗马' },
                { cityId: 'carthage', priority: 600, description: '伺机攻迦太基' },
                { cityId: 'syracuse', priority: 550, description: '机会主义扩张' }
            ],
            greeceRegion: {
                cityIds: ['pella', 'athens', 'corinth', 'sparta', 'demetrias', 'philippopolis'],
                priority: 950,
                description: '巩固希腊本土（核心）'
            },
            economicStrategy: {
                description: '优先经济发展和城市忠诚度',
                minFundsForWar: 1000,  // 资金低于此值时减少进攻
                persuasionPriority: 0.8,  // 高优先级游说
                fortifyPriority: 0.7  // 高优先级修筑
            }
        },

        // 5. 迦太基战略：渡海西进，征服北非
        carthage: {
            name: '迦太基战略',
            description: '经西西里进攻北非，消灭迦太基',
            aggressiveness: 0.75,
            economicFocus: 0.25,
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            secondaryDefense: [
                { cityId: 'athens', priority: 850, description: '守卫雅典' },
                { cityId: 'syracuse', priority: 900, description: '守卫叙拉古（跳板）' }
            ],
            // 迦太基为最终目标，经西西里和北非逐步推进
            offensiveTargets: [
                { cityId: 'carthage', priority: 950, description: '攻陷迦太基城（最终目标）' },
                { cityId: 'syracuse', priority: 900, description: '占领叙拉古（必经）' },
                { cityId: 'lilybaeum', priority: 850, description: '占领利利拜（西西里西端）' },
                { cityId: 'utica', priority: 800, description: '占领乌提卡（迦太基门户）' },
                { cityId: 'hadrumetum', priority: 750, description: '占领哈德鲁美图' },
                { cityId: 'thapsus', priority: 700, description: '占领塔普苏斯' }
            ],
            sicilyRegion: {
                cityIds: ['syracuse', 'messana', 'lilybaeum', 'agrigentum'],
                priority: 850,
                description: '控制西西里岛（跳板）'
            },
            africaRegion: {
                cityIds: ['carthage', 'utica', 'hadrumetum', 'thapsus', 'sicca'],
                priority: 900,
                description: '征服北非地区'
            },
            westernRoute: {
                cityIds: ['syracuse', 'lilybaeum', 'utica', 'carthage'],
                priority: 880,
                description: '西进路线（希腊→西西里→北非）'
            }
        }
    },

    // 军队行动历史
    armyHistory: {},
    armyStayHistory: {},
    armyPlans: {},

    // 本回合借款标记
    borrowedThisTurn: false,
    currentTurnForBorrow: 0,

    // 失去的城市记录
    lostCities: {},  // { cityId: { lostTurn: number, lostTo: faction, importance: number, cityData: {} } }

    // 军队收复城市的责任权重
    recaptureWeights: {},  // { armyId: { cityId: weight } }

    // 启用AI控制
    enable(strategy = 'alexander') {
        this.config.enabled = true;
        this.config.strategy = strategy;
        
        // 根据战略调整参数
        const strategyConfig = this.strategies[strategy];
        if (strategyConfig) {
            this.config.aggressiveness = strategyConfig.aggressiveness;
            this.config.economicFocus = strategyConfig.economicFocus;
            // addLog(`🤖 马其顿AI已启用 - ${strategyConfig.name}`, 'system');
            // addLog(`   📜 战略说明：${strategyConfig.description}`, 'macedonia');
        } else {
            // addLog(`🤖 马其顿AI已启用 - 默认战略`, 'system');
        }
        
        this.initializeCityTracking('macedonia');
        this.updateUI();
    },

    // 禁用AI控制
    disable() {
        this.config.enabled = false;
        // addLog('🤖 马其顿AI已禁用', 'system');
        this.updateUI();
    },

    /**
     * 切换AI控制（完全复制自罗马AI的toggle函数）
     */
    toggle() {
        if (this.config.enabled) {
            this.disable();
        } else {
            this.enable('alexander'); // 默认亚历山大战略
        }
    },

    // 切换战略（马其顿AI特有）
    switchStrategy(strategy) {
        if (this.strategies[strategy]) {
            this.config.strategy = strategy;
            const strategyConfig = this.strategies[strategy];
            this.config.aggressiveness = strategyConfig.aggressiveness;
            this.config.economicFocus = strategyConfig.economicFocus;
            addLog(`⚔️ 马其顿战略切换为：${strategyConfig.name}`, 'macedonia');
            addLog(`   📜 ${strategyConfig.description}`, 'macedonia');
        } else {
            addLog(`❌ 未知战略：${strategy}`, 'error');
        }
    },

    // 检查是否应该由AI控制当前回合
    shouldControl() {
        return this.config.enabled && 
               gameState.currentPlayer === 'macedonia';
    },

    // 更新UI显示
    updateUI() {
        // 【修改】调用罗马AI的updateUI来统一更新显示
        if (typeof AIController !== 'undefined' && typeof AIController.updateUI === 'function') {
            AIController.updateUI();
        }
    },

    // 初始化城市追踪
    initializeCityTracking(faction) {
        cities.forEach(city => {
            if (city.faction === faction) {
                if (!this.lostCities[faction]) {
                    this.lostCities[faction] = {};
                }
            }
        });
    },

    /**
     * 记录失去的城市（完全复制自罗马AI）
     */
    recordLostCity(city) {
        const faction = 'macedonia';
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
        // addLog(`💔 马其顿失去了${city.name}（转为${lostToName}），重要度${importance}`, 'macedonia');
        
        // 计算所有军队对该城市的收复权重
        this.calculateRecaptureWeights(city.id);
    },

    /**
     * 计算军队对失去城市的收复权重（完全复制自罗马AI）
     * 权重基于距离：距离越近，权重越高
     */
    calculateRecaptureWeights(lostCityId) {
        const factionArmies = armies.macedonia || [];
        const lostCityData = this.lostCities[lostCityId];
        
        if (!lostCityData) return;
        
        factionArmies.forEach(army => {
            if (!this.recaptureWeights[army.id]) {
                this.recaptureWeights[army.id] = {};
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
            
            this.recaptureWeights[army.id][lostCityId] = Math.floor(weight);
            
            // addLog(`   📍 ${army.commander}对收复${lostCityData.cityData.name}的权重: ${Math.floor(weight)} (距离${distance}步)`, 'info');
        });
    },

    /**
     * 获取军队应优先收复的城市（完全复制自罗马AI）
     * 权重会根据失守时间动态调整：前12回合递增，之后递减
     */
    getPriorityRecaptureTarget(army) {
        const armyWeights = this.recaptureWeights[army.id];
        if (!armyWeights || Object.keys(armyWeights).length === 0) {
            return null;
        }
        
        // 找到权重最高的失去城市（考虑时间因素）
        let bestCityId = null;
        let bestWeight = 0;
        
        Object.keys(armyWeights).forEach(cityId => {
            // 检查城市是否仍然失守
            const city = cities.find(c => c.id === cityId);
            if (!city || city.faction === 'macedonia') return;
            
            const baseWeight = armyWeights[cityId];  // 基础权重（失守时计算的）
            const lostCityData = this.lostCities[cityId];
            
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
            const lostCityData = this.lostCities[bestCityId];
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

    /**
     * 计算阵营总军事力量（完全复制自罗马AI）
     */
    calculateTotalMilitaryPower(faction) {
        const factionArmies = armies[faction] || [];
        return factionArmies.reduce((total, army) => {
            return total + calculateCombatPower(army);
        }, 0);
    },

    /**
     * 评估城市价值（完全复制自罗马AI）
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
     * 评估军队到城市的威胁程度（完全复制自罗马AI）
     */
    evaluateThreat(army, city) {
        const distance = this.calculateDistance(army.location, city.id);
        const armyPower = calculateCombatPower(army);
        
        // 距离越近，威胁越大
        const distanceFactor = Math.max(0, 1 - distance / 5);
        
        return armyPower * distanceFactor;
    },

    /**
     * 寻找路径（完全复制自罗马AI的findPath）
     */
    findPath(startCityId, endCityId) {
        if (startCityId === endCityId) {
            return [startCityId];
        }

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
     * 评估并更新联盟状态（动态联盟系统）
     * 根据罗马和迦太基的总分数决定结盟对象
     */
    evaluateAlliance() {
        // 计算罗马和迦太基的总分数
        const romeScore = calculateFactionScore('rome');
        const carthageScore = calculateFactionScore('carthage');
        
        const scoreDiff = romeScore - carthageScore;
        
        let newAlliance = 'neutral';
        let allianceReason = '';
        let primaryTarget = 'antioch';    // 默认第一目标
        let secondaryTarget = 'alexandria'; // 默认第二目标
        
        // 罗马总分数 > 迦太基总分数 + 100 → 与迦太基结盟
        if (scoreDiff > 100) {
            newAlliance = 'carthage';
            primaryTarget = 'rome';
            secondaryTarget = 'syracuse';
            allianceReason = `罗马过强(${romeScore}分 vs ${carthageScore}分，差距${scoreDiff})，与迦太基结盟对抗罗马`;
        }
        // 罗马总分数 < 迦太基总分数 - 100 → 与罗马结盟
        else if (scoreDiff < -100) {
            newAlliance = 'rome';
            primaryTarget = 'carthage';
            secondaryTarget = 'syracuse';
            allianceReason = `迦太基过强(${carthageScore}分 vs ${romeScore}分，差距${Math.abs(scoreDiff)})，与罗马结盟对抗迦太基`;
        }
        // 分数差距在±100以内 → 保持中立
        else {
            newAlliance = 'neutral';
            primaryTarget = 'antioch';
            secondaryTarget = 'alexandria';
            allianceReason = `双方实力均衡(罗马${romeScore}分 vs 迦太基${carthageScore}分，差距${Math.abs(scoreDiff)})，保持中立，向东扩张`;
        }
        
        // 如果联盟状态改变，输出日志
        if (this.config.alliance !== newAlliance) {
            const oldAlliance = this.config.alliance;
            this.config.alliance = newAlliance;
            this.config.primaryTarget = primaryTarget;
            this.config.secondaryTarget = secondaryTarget;
            
            addLog(`\n🤝 ===== 马其顿联盟状态变更 =====`, 'macedonia');
            addLog(`📊 ${allianceReason}`, 'macedonia');
            
            if (oldAlliance !== 'neutral') {
                const factionNames = {'rome': '罗马', 'carthage': '迦太基', 'macedonia': '马其顿', 'seleucid': '塞琉古', 'ptolemy': '托勒密'};
                const oldAllyName = factionNames[oldAlliance] || '未知';
                addLog(`❌ 解除与${oldAllyName}的联盟`, 'macedonia');
            }
            
            if (newAlliance !== 'neutral') {
                const factionNames = {'rome': '罗马', 'carthage': '迦太基', 'macedonia': '马其顿', 'seleucid': '塞琉古', 'ptolemy': '托勒密'};
                const newAllyName = factionNames[newAlliance] || '未知';
                addLog(`✅ 与${newAllyName}结成联盟`, 'macedonia');
                // addLog(`🎯 第一目标：${this.getCityName(primaryTarget)}，第二目标：${this.getCityName(secondaryTarget)}`, 'macedonia');
            } else {
                addLog(`⚔️ 保持独立，多方互为敌对`, 'macedonia');
                // addLog(`🎯 第一目标：${this.getCityName(primaryTarget)}（东扩），第二目标：${this.getCityName(secondaryTarget)}`, 'macedonia');
            }
            
            addLog(`================================\n`, 'macedonia');
        } else if (this.config.primaryTarget !== primaryTarget) {
            // 联盟状态未变，但目标可能需要更新（比如从neutral第一次初始化）
            this.config.primaryTarget = primaryTarget;
            this.config.secondaryTarget = secondaryTarget;
        }
        
        return this.config.alliance;
    },

    /**
     * 根据联盟状态更新战略目标
     */
    updateAllianceStrategy() {
        const alliance = this.config.alliance;
        
        // 创建动态战略
        const dynamicStrategy = {
            name: '',
            description: '',
            aggressiveness: 0.7,
            economicFocus: 0.3,
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            offensiveTargets: []
        };
        
        if (alliance === 'carthage') {
            // 与迦太基结盟 → 攻击罗马
            dynamicStrategy.name = '反罗马联盟';
            dynamicStrategy.description = '与迦太基联盟，共同对抗罗马';
            dynamicStrategy.offensiveTargets = [
                { cityId: 'rome', priority: 950, description: '攻陷罗马城（联盟首要目标）' },
                { cityId: 'syracuse', priority: 900, description: '占领叙拉古（第二目标）' },
                { cityId: 'ravenna', priority: 800, description: '进攻拉文纳' },
                { cityId: 'capua', priority: 750, description: '进攻卡普阿' }
            ];
            // addLog(`🎯 战略目标：第一目标-罗马，第二目标-叙拉古`, 'macedonia');
        }
        else if (alliance === 'rome') {
            // 与罗马结盟 → 攻击迦太基
            dynamicStrategy.name = '反迦太基联盟';
            dynamicStrategy.description = '与罗马联盟，共同对抗迦太基';
            dynamicStrategy.offensiveTargets = [
                { cityId: 'carthage', priority: 950, description: '攻陷迦太基城（联盟首要目标）' },
                { cityId: 'syracuse', priority: 900, description: '占领叙拉古（第二目标）' },
                { cityId: 'utica', priority: 800, description: '进攻乌提卡' },
                { cityId: 'hadrumetum', priority: 750, description: '进攻哈德鲁美图' }
            ];
            // addLog(`🎯 战略目标：第一目标-迦太基城，第二目标-叙拉古`, 'macedonia');
        }
        else {
            // 保持中立 → 三方混战
            dynamicStrategy.name = '三方混战';
            dynamicStrategy.description = '保持独立，罗马、迦太基、马其顿三方互为敌对';
            dynamicStrategy.offensiveTargets = [
                { cityId: 'antioch', priority: 950, description: '占领安条克（首要目标）' },
                { cityId: 'alexandria', priority: 900, description: '占领亚历山大（第二目标）' },
                { cityId: 'syracuse', priority: 800, description: '占领叙拉古' }
            ];
            // addLog(`🎯 战略目标：第一目标-安条克，第二目标-亚历山大`, 'macedonia');
        }
        
        // 将动态战略设为当前战略
        this.strategies.dynamic = dynamicStrategy;
        this.config.strategy = 'dynamic';
        this.config.aggressiveness = dynamicStrategy.aggressiveness;
        this.config.economicFocus = dynamicStrategy.economicFocus;
    },

    /**
     * 判断指定阵营是否为盟友
     */
    isAlly(faction) {
        if (faction === 'macedonia') return true;
        return faction === this.config.alliance;
    },

    /**
     * 判断指定阵营是否为敌人
     */
    isEnemy(faction) {
        if (faction === 'macedonia') return false;
        if (this.config.alliance === 'neutral') {
            // 中立状态：罗马和迦太基都是敌人
            return faction === 'rome' || faction === 'carthage';
        }
        // 联盟状态：盟友的敌人是敌人
        return faction !== this.config.alliance;
    },

    /**
     * 获取当前敌对阵营列表
     */
    getEnemyFactions() {
        if (this.config.alliance === 'neutral') {
            return ['rome', 'carthage'];
        } else if (this.config.alliance === 'rome') {
            return ['carthage'];
        } else if (this.config.alliance === 'carthage') {
            return ['rome'];
        }
        return [];
    },

    /**
     * 获取盟友阵营
     */
    getAllyFaction() {
        return this.config.alliance !== 'neutral' ? this.config.alliance : null;
    },

    /**
     * 判断城市是否为友方城市（己方或盟友）
     */
    isFriendlyCity(city) {
        if (!city) return false;
        if (city.faction === 'macedonia') return true;
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
     * 评估当前局势（完全参考罗马AI，增加联盟支持）
     */
    evaluateSituation() {
        const myFaction = 'macedonia';
        const allArmies = getAllArmies();
        
        // 评估联盟状态
        this.evaluateAlliance();
        
        // 获取敌对阵营列表
        const enemyFactions = this.getEnemyFactions();
        
        return {
            myFaction: myFaction,
            currentTurn: gameState.turn,
            myArmies: armies.macedonia || [],
            myFunds: gameState.macedoniaFunds,
            myDebt: gameState.macedoniaDebt,
            enemyArmies: allArmies.filter(a => enemyFactions.includes(a.faction)),
            allyArmies: this.config.alliance !== 'neutral' ? 
                (armies[this.config.alliance] || []) : [],
            myCities: cities.filter(c => c.faction === myFaction),
            allCities: cities,
            alliance: this.config.alliance,
            allyFaction: this.getAllyFaction()
        };
    },

    /**
     * 更新军队停留历史（完全参考罗马AI）
     */
    updateArmyStayHistory(army) {
        const currentLocation = army.location;
        const existingRecord = this.armyStayHistory[army.id];
        
        if (existingRecord && existingRecord.cityId === currentLocation) {
            // 仍在同一城市，增加停留回合数
            existingRecord.stayTurns++;
        } else {
            // 移动到新城市，重置记录
            this.armyStayHistory[army.id] = {
                cityId: currentLocation,
                stayTurns: 1,
                firstStayTurn: gameState.currentTurn
            };
        }
        
        // 同时更新行动历史（用于绕路检测）
        const lastHistory = this.armyHistory[army.id];
        if (lastHistory && lastHistory.lastLocation === currentLocation) {
            // 没有移动
            this.armyHistory[army.id] = {
                lastLocation: currentLocation,
                actionCount: (lastHistory.actionCount || 0) + 1,
                detoured: false
            };
        } else {
            // 移动了
            this.armyHistory[army.id] = {
                lastLocation: currentLocation,
                actionCount: 1,
                detoured: false
            };
        }
    },

    // 检查城市变化
    checkCityChanges(faction) {
        const currentCities = cities.filter(c => c.faction === faction);
        const lostCitiesRecord = this.lostCities[faction] || {};
        
        // 检查是否有城市被夺回
        Object.keys(lostCitiesRecord).forEach(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (city && city.faction === faction) {
                addLog(`✅ 【失地收复】${city.name} 已被夺回！`, faction);
                delete lostCitiesRecord[cityId];
            }
        });
        
        // 检查是否有新城市失去
        const allCities = cities.filter(c => 
            c.faction === faction || 
            (lostCitiesRecord[c.id] && lostCitiesRecord[c.id].originalFaction === faction)
        );
        
        allCities.forEach(city => {
            if (city.faction !== faction && !lostCitiesRecord[city.id]) {
                // 记录失去的城市
                lostCitiesRecord[city.id] = {
                    lostTurn: gameState.currentTurn,
                    lostTo: city.faction,
                    importance: (city.important ? 10 : 5) + (city.politicalScore || 0) + (city.economicScore || 0),
                    cityData: { ...city },
                    originalFaction: faction
                };
                addLog(`⚠️ 【失去城市】${city.name} 被${city.faction === 'rome' ? '罗马' : city.faction === 'carthage' ? '迦太基' : '敌方'}占领！`, faction);
            }
        });
    },

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 暂停AI执行
    pause() {
        if (this.config.paused) {
            return Promise.resolve();
        }
        
        this.config.paused = true;
        return new Promise(resolve => {
            this.config.pauseResolve = resolve;
        });
    },

    // 恢复AI执行
    resume() {
        if (this.config.pauseResolve) {
            this.config.pauseResolve();
            this.config.pauseResolve = null;
        }
        this.config.paused = false;
    },

    // ==================== 主执行函数 ====================

    /**
     * 执行完整的AI回合
     */
    async executeTurn() {
        console.log('🔍 马其顿AI executeTurn 开始');
        
        if (!this.shouldControl()) {
            console.log('🔍 马其顿AI shouldControl 返回 false，退出');
            return;
        }

        // 检查全局暂停状态
        if (typeof gameState !== 'undefined' && gameState.paused) {
            console.log('⏸️ 马其顿AI执行被暂停');
            return;
        }

        const strategyConfig = this.strategies[this.config.strategy];
        const strategyName = strategyConfig ? strategyConfig.name : '默认战略';
        
        console.log('🔍 马其顿AI 策略:', strategyName);

        // 检查城市变化
        this.checkCityChanges('macedonia');

        // 重置本回合借款标记
        if (this.currentTurnForBorrow !== gameState.currentTurn) {
            this.borrowedThisTurn = false;
            this.currentTurnForBorrow = gameState.currentTurn;
        }

        // 获取所有马其顿军队
        const macedonianArmies = armies.macedonia || [];
        
        console.log('🔍 马其顿军队数量:', macedonianArmies.length);
        
        if (macedonianArmies.length === 0) {
            addLog('⚠️ 没有可用的马其顿军队', 'macedonia');
            console.log('🔍 马其顿AI executeTurn 结束（无军队）');
            return;
        }


        // 执行阵营层面的操作（借款、组军等）
        console.log('🔍 开始执行阵营操作...');
        await this.executeFactionActions();
        console.log('🔍 阵营操作完成');

        // 为每支军队制定行动计划
        for (let i = 0; i < macedonianArmies.length; i++) {
            const army = macedonianArmies[i];
            console.log(`🔍 处理第 ${i+1}/${macedonianArmies.length} 支军队: ${army.commander}`);
            
            if (this.config.paused) {
                console.log('🔍 AI暂停中，等待恢复...');
                await this.pause();
            }

            await this.executeArmyTurn(army);
            console.log(`🔍 第 ${i+1} 支军队完成，延迟 ${this.config.autoDelay}ms`);
            await this.delay(this.config.autoDelay);
        }

        // addLog(`🤖 马其顿AI回合结束`, 'macedonia');
        
        console.log('🔍 马其顿AI executeTurn 完成');
    },

    /**
     * 执行阵营层面的操作（完全复制罗马AI逻辑）
     */
    async executeFactionActions() {
        const situation = this.evaluateSituation();
        
        // 【新增】1. 检查是否需要借款（阵营层面，一回合只能借款一次）
        if (situation.myFunds < 100 && situation.myDebt < 6000 && !this.borrowedThisTurn) {
            addLog(`💰 马其顿资金紧张(${situation.myFunds})，债务${situation.myDebt}，执行借款`, 'macedonia');
            try {
                executeBorrow();
                this.borrowedThisTurn = true;
                await this.delay(1000);
            } catch (error) {
                addLog(`❌ 借款失败：${error}`, 'macedonia');
            }
        }
        
        // 2. 检查是否应该组建新军
        const raiseArmyDecision = this.shouldRaiseNewArmy(situation);
        if (raiseArmyDecision) {
            addLog(`🏛️ ${raiseArmyDecision.reason}`, 'macedonia');
                    try {
                        executeRaiseArmy();
                        await this.delay(1000);
                    } catch (error) {
                        addLog(`❌ 组军失败：${error}`, 'macedonia');
                    }
                }
    },

    /**
     * 评估是否应该组建新军（完全复制罗马AI的shouldRaiseNewArmy）
     * 检查财政盈余和组军条件
     */
    shouldRaiseNewArmy(situation) {
        // 0. 检查部队数量限制（如果启用）
        const currentArmyCount = situation.myArmies.length;
        if (gameState.armyLimitEnabled && currentArmyCount >= 5) {
            return null; // 部队数量已达上限
        }
        
        const capitalCity = 'pella';
        const raiseArmyCost = 500;
        
        // 1. 计算当前回合收入（所有己方城市的经济分之和）
        const myIncome = cities
            .filter(c => c.faction === 'macedonia')
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
        
        // 7.2 检查佩拉是否有驻军
        const armiesAtPella = situation.myArmies.filter(a => a.location === capitalCity);
        if (armiesAtPella.length > 0) {
            return null; // 佩拉有驻军，无法组军
        }
        
        // 7.3 检查是否有紧急威胁（佩拉3步内有敌军）
        const threatsToPella = situation.enemyArmies.filter(e => {
            const distance = this.calculateDistance(e.location, capitalCity);
            return distance <= 3;
        });
        
        if (threatsToPella.length > 0) {
            // 有威胁时，资金要求更高（需要足够应对威胁）
            if (situation.myFunds < raiseArmyCost + 500) {
                return null;
            }
        }
        
        // 8. 所有条件满足，返回组军决策
        return {
            type: 'raise_army',
            priority: 200, // 中等优先级，低于紧急防御，高于常规行动
            reason: `【组军】财政盈余${currentSurplus}，组军后仍有盈余${futureSurplus}`
        };
    },

    /**
     * 执行单个军队的回合
     */
    async executeArmyTurn(army) {
        console.log(`🔍 executeArmyTurn 开始: ${army.commander}`);
        
        addLog(`⚔️ 【${army.commander}】开始行动`, 'macedonia');
        
        const combatPower = calculateCombatPower(army);
        addLog(`   战力：${combatPower} | 位置：${this.getCityName(army.location)}`, 'macedonia');

        // 选择该军队
        if (gameState.selectedArmy !== army.id) {
            console.log(`🔍 选择军队: ${army.id}`);
            selectArmy(army.id);
            await this.delay(300);
        }

        // 制定行动决策
        console.log(`🔍 开始制定决策...`);
        const decision = await this.makeArmyDecision(army);
        console.log(`🔍 决策结果:`, decision);
        
        if (decision) {
            console.log(`🔍 执行决策: ${decision.type} - ${decision.reason}`);
            
            // 保存AI决策信息到军队对象（用于鼠标浮动显示）
            army.aiDecision = {
                actionName: this.getActionName(decision.type),
                reason: decision.reason || '无',
                priority: decision.priority || 0,
                type: decision.type,
                timestamp: Date.now()
            };
            
            await this.executeDecision(army, decision);
            console.log(`🔍 决策执行完成`);
        } else {
            console.log(`🔍 无决策，军队待命`);
            
            // 即使没有决策，也记录待命状态
            army.aiDecision = {
                actionName: '待命',
                reason: '无可执行决策',
                priority: 0,
                type: 'idle',
                timestamp: Date.now()
            };
            
            addLog(`   ⏸️ ${army.commander} 本回合待命`, 'macedonia');
        }

    },

    /**
     * 获取兜底行动（完全复制自罗马AI）
     */
    getFallbackAction(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        
        // 1. 优先尝试整编
        if (situation.myFunds >= 100 && army.morale < 5) {
            return {
                type: 'reorganize',
                priority: 10,
                reason: '无更优选项，整编提升士气'
            };
        }

        // 2. 尝试修筑
        if (situation.myFunds >= 150 && 
            currentCity.faction === 'macedonia' &&
            (currentCity.fortificationLevel || 0) < 5) {
            return {
                type: 'fortify',
                priority: 10,
                reason: '无更优选项，修筑强化城市'
            };
        }

        // 3. 尝试征召
        if (situation.myFunds >= 200) {
            return {
                type: 'recruit',
                priority: 10,
                reason: '无更优选项，征召补充实力'
            };
        }

        // 4. 尝试移动到相邻城市
        const connectedCities = getConnectedCities(army.location);
        if (connectedCities && connectedCities.length > 0) {
            let bestTarget = null;
            let bestScore = -1;
            
            for (const cityId of connectedCities) {
                const city = cities.find(c => c.id === cityId);
                if (!city) continue;
                
                let score = 0;
                if (city.faction === 'macedonia') {
                    score = 30;
                } else if (city.faction === 'neutral') {
                    score = 20;
                } else {
                    score = 10;
                }
                
                score += (city.economicScore || 0) * 0.5 + (city.politicalScore || 0) * 0.3;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = cityId;
                }
            }
            
            if (bestTarget) {
                const targetCity = cities.find(c => c.id === bestTarget);
                return {
                    type: 'move',
                    target: bestTarget,
                    priority: 10,
                    reason: `无更优选项，移动到${targetCity.faction === 'macedonia' ? '己方' : targetCity.faction === 'neutral' ? '中立' : '敌方'}城市${this.getCityName(bestTarget)}`
                };
            }
        }

        // 5. 强制整编
        return {
            type: 'reorganize',
            priority: 5,
            reason: '无任何可行动作，强制整编'
        };
    },

    /**
     * 寻找撤退目标（完全复制自罗马AI）
     */
    findRetreatTarget(army, situation, threat) {
        const connectedCities = getConnectedCities(army.location);
        const retreatOptions = [];
        
        connectedCities.forEach(cityId => {
            const city = cities.find(c => c.id === cityId);
            if (!city) return;
            
            const enemiesAtCity = situation.enemyArmies.filter(e => e.location === cityId);
            const enemyPowerAtCity = enemiesAtCity.reduce((sum, e) => 
                sum + calculateCombatPower(e), 0
            );
            
            const myPower = calculateCombatPower(army);
            
            if (enemyPowerAtCity >= myPower * 0.8) return;
            
            let score = 0;
            if (city.faction === 'macedonia') {
                score = 3;
            } else if (city.faction === 'neutral') {
                score = 2;
            } else {
                score = 1;
            }
            
            retreatOptions.push({
                cityId: cityId,
                cityName: city.name,
                score: score,
                city: city
            });
        });
        
        if (retreatOptions.length === 0) {
            if (situation.myFunds >= 200) {
                return {
                    type: 'recruit',
                    priority: threat ? (threat.threatScore - 40) : 50,
                    reason: `【防御】无路可退，原地征召`
                };
            } else if (situation.myFunds >= 100) {
                return {
                    type: 'reorganize',
                    priority: threat ? (threat.threatScore - 40) : 50,
                    reason: `【防御】无路可退，原地整编`
                };
            }
            return null;
        }
        
        retreatOptions.sort((a, b) => b.score - a.score);
        const bestRetreat = retreatOptions[0];
        
        return {
            type: 'move',
            target: bestRetreat.cityId,
            priority: threat ? (threat.threatScore - 20) : 60,
            reason: `【防御】撤退至${bestRetreat.cityName}`
        };
    },

    /**
     * 投骰子D6（完全复制自罗马AI）
     */
    rollD6() {
        return Math.floor(Math.random() * 6) + 1;
    },

    /**
     * 计算城市总战力（完全复制自罗马AI）
     */
    calculateTotalPowerAtCity(cityId, faction) {
        const armiesAtCity = (armies[faction] || []).filter(a => a.location === cityId);
        return armiesAtCity.reduce((total, army) => total + calculateCombatPower(army), 0);
    },

    /**
     * 寻找最佳撤退目标（完全复制自罗马AI）
     */
    findBestRetreatTarget(defenderArmy, attackerArmy) {
        const connected = getConnectedCities(defenderArmy.location);
        let bestRetreat = null;
        let bestScore = -999;
        
        for (const cityId of connected) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;
            
            let score = 0;
            
            // 优先己方城市
            if (city.faction === defenderArmy.faction) {
                score += 100;
            } else if (city.faction === 'neutral') {
                score += 50;
            }
            
            // 避开攻击者可能的追击路线
            const attackerConnected = getConnectedCities(attackerArmy.location);
            if (!attackerConnected.includes(cityId)) {
                score += 30;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestRetreat = cityId;
            }
        }
        
        return bestRetreat;
    },

    /**
     * 等待暂停恢复（完全复制自罗马AI）
     */
    async waitIfPaused() {
        while (this.config.paused) {
            await new Promise(resolve => {
                this.config.pauseResolve = resolve;
            });
            this.config.pauseResolve = null;
        }
    },

    // ==================== 评估选项函数（完全复制自罗马AI）====================

    /**
     * 评估收复失地选项（完全复制自罗马AI）
     */
    evaluateRecaptureOptions(army, situation) {
        const recaptureTarget = this.getPriorityRecaptureTarget(army);
        
        if (!recaptureTarget) return null;
        
        const targetCity = cities.find(c => c.id === recaptureTarget.cityId);
        if (!targetCity) return null;
        
        const distance = this.calculateDistance(army.location, recaptureTarget.cityId);
        const weight = recaptureTarget.weight;
        const turnsLost = recaptureTarget.turnsLost;
        
        // 优先级基于权重
        let priority = 200 + weight;
        
        // 距离修正
        priority -= distance * 5;
        
        // 特殊加成
        if (recaptureTarget.cityData.cityData.important) {
            priority += 100;
        }
        
        // 构建时间提示信息
        let timeInfo = '';
        if (turnsLost <= 12) {
            timeInfo = `失守${turnsLost}回合↗`;
        } else {
            timeInfo = `失守${turnsLost}回合↘`;
        }
        
        // 构建移动目标
        const connectedCities = getConnectedCities(army.location);
        let actualTarget = recaptureTarget.cityId;
        let reasonText = `【收复失地】${recaptureTarget.cityData.cityData.name}（权重${weight}，${timeInfo}，距离${distance}步）`;
        
        if (!connectedCities.includes(recaptureTarget.cityId)) {
            const nextStep = this.getNextStepToTarget(army.location, recaptureTarget.cityId);
            if (nextStep) {
                actualTarget = nextStep;
                reasonText = `【收复失地】向${recaptureTarget.cityData.cityData.name}进军（权重${weight}，${timeInfo}）`;
            } else {
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
     * 评估同城敌军情况（完全照抄罗马AI的evaluateEnemyInSameCity）
     */
    evaluateEnemyInSameCity(army, situation) {
        // 检查当前城市是否有敌军
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const enemiesInCity = situation.enemyArmies.filter(e => e.location === army.location);
        
        if (enemiesInCity.length === 0) {
            return null; // 没有敌军，不需要处理
        }
        
        // 如果是执行第一目标战略的军队，不使用这个逻辑（战略有自己的处理）
        const primaryTarget = this.config.primaryTarget;
        if (primaryTarget) {
            const targetCity = cities.find(c => c.id === primaryTarget);
            if (targetCity && targetCity.faction !== 'macedonia') {
                if (this.isClosestToTarget(army, situation, primaryTarget, 2)) {
                    return null; // 战略军队使用自己的逻辑
                }
            }
        }
        
        // 计算实力对比（使用综合战力评估）
        const myResult = this.calculateComprehensivePower(army, army.location, 'macedonia');
        const myPower = myResult.totalPower;
        
        // 敌军综合战力（包含所有敌方派系）
        let enemyPower = 0;
        const enemyFactions = this.getEnemyFactions();
        for (const faction of enemyFactions) {
            const result = this.calculateEnemyComprehensivePower(army.location, faction);
            enemyPower += result.totalPower;
        }
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
        const connectedCities = getConnectedCities(army.location);
        let retreatTarget = null;
        let retreatPriority = -1;
        let retreatFactionDesc = '';
        
        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;
            
            // 检查该城市是否有敌军
            const enemiesAtRetreat = situation.enemyArmies.filter(e => e.location === cityId);
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
            if (city.faction === 'macedonia') {
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
     * 判断计划是否仍然相关（完全照抄罗马AI的isPlanStillRelevant）
     */
    isPlanStillRelevant(army, plan, situation) {
        if (!plan) return false;
        
        // 1. 如果是移动计划，检查目标城市是否仍然有效
        if (plan.type === 'move') {
            const targetCityId = plan.target;
            const targetCity = cities.find(c => c.id === targetCityId);
            
            // 目标不存在
            if (!targetCity) return false;
            
            // 如果目标已经被占领，取消计划
            if (targetCity.faction === 'macedonia') {
                return false;
            }
            
            // 检查是否相邻
            const connectedCities = getConnectedCities(army.location);
            if (!connectedCities.includes(targetCityId)) {
                return false; // 不相邻，可能路径被阻断
            }
            
            // 检查该目标是否现在有更强的敌军
            const enemiesAtTarget = situation.enemyArmies.filter(e => e.location === targetCityId);
            if (enemiesAtTarget.length > 0) {
                const myResult = this.calculateComprehensivePower(army, targetCityId, 'macedonia');
                const myPower = myResult.totalPower;
                
                let enemyPower = 0;
                const enemyFactions = this.getEnemyFactions();
                for (const faction of enemyFactions) {
                    const result = this.calculateEnemyComprehensivePower(targetCityId, faction);
                    enemyPower += result.totalPower;
                }
                
                // 如果敌军过强，取消计划
                if (enemyPower > myPower * 1.5) {
                    return false;
                }
            }
            
            return true;
        }
        
        // 其他类型的计划暂时都认为仍然相关
        return true;
    },

    /**
     * 评估攻击选项（完全复制自罗马AI）
     */
    evaluateAttackOptions(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        if (currentCity && currentCity.isUnderSiege && currentCity.besiegingFaction === 'macedonia') {
            return null;
        }
        
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        if (enemiesAtLocation.length === 0) return null;
        
        const enemy = enemiesAtLocation[0];
        
        // 使用综合战力评估
        const myResult = this.calculateComprehensivePower(army, army.location, 'macedonia');
        const myPower = myResult.totalPower;
        
        const enemyFaction = enemy.faction;
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
     * 评估移动选项（完全复制自罗马AI，简化版）
     */
    evaluateMoveOptions(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        const connectedCities = getConnectedCities(army.location);
        
        const history = this.armyHistory[army.id] || {};
        const lastLocation = history.lastLocation;
        
        let bestMove = null;
        let bestScore = 0;
        
        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;
            
            const enemyCheck = this.checkEnemyAtTarget(army, cityId);
            
            if (!enemyCheck.canMove && !enemyCheck.shouldReinforce) {
                continue;
            }
            
            let score = 0;
            let reason = '';
            
            // 惩罚：避免原路返回
            if (cityId === lastLocation) {
                score -= 100;
            }
            
            // 进攻敌方城市
            if (city.faction !== 'macedonia' && city.faction !== 'neutral') {
                score += 50 * this.config.aggressiveness;
                reason = `进攻敌方城市${this.getCityName(city.id)}`;
                
                if (enemyCheck.canMove && enemyCheck.powerGap < 0) {
                    score += 40;
                    reason += `，${enemyCheck.reason}`;
                } else if (enemyCheck.shouldReinforce) {
                    score -= 80;
                    reason += `，${enemyCheck.reason}`;
                }
            }
            
            // 支援友方城市
            if (city.faction === 'macedonia') {
                const threats = situation.enemyArmies.filter(e => {
                    const dist = this.calculateDistance(e.location, cityId);
                    return dist <= 2;
                });
                
                if (threats.length > 0) {
                    score += 60;
                    reason = `支援受威胁的己方城市${this.getCityName(city.id)}(${threats.length}支敌军接近)`;
                }
            }
            
            // 游说中立城市
            if (city.faction === 'neutral') {
                const enemiesAtCity = situation.enemyArmies.filter(e => e.location === cityId);
                
                if (enemiesAtCity.length === 0) {
                    continue;
                }
                
                score += 30 * this.config.economicFocus;
                reason = `前往中立城市${this.getCityName(city.id)}`;
                
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
            }
        }
        
        return bestMove;
    },

    /**
     * 评估围城选项（完全复制自罗马AI）
     */
    evaluateSiegeOptions(army, situation) {
        const currentCity = cities.find(c => c.id === army.location);
        
        // 特殊判断：当佩拉或雅典城失陷，且本方军队士气为5时，最高优先级围城
        if ((currentCity.id === 'pella' || currentCity.id === 'athens') && 
            currentCity.faction !== 'macedonia' && 
            army.morale >= 5) {
            const cityName = currentCity.id === 'pella' ? '佩拉' : '雅典';
            return {
                type: 'siege',
                target: currentCity,
                priority: 999999, // 最高优先级
                reason: `【紧急】${cityName}失陷！士气饱满，立即围城收复！`
            };
        }
        
        const strategyConfig = this.strategies[this.config.strategy];
        const isTargetCity = strategyConfig && strategyConfig.offensiveTargets && 
                            strategyConfig.offensiveTargets.some(t => t.cityId === currentCity.id);
        
        const stayHistory = this.armyStayHistory[army.id];
        const stayTurns = (stayHistory && stayHistory.cityId === army.location) ? stayHistory.stayTurns : 0;
        const isLongStayCase = (currentCity.faction === 'neutral' && stayTurns > 6);
        
        if (!isTargetCity && !isLongStayCase) {
            if (currentCity.faction === 'macedonia' || currentCity.faction === 'neutral') {
                return null;
            }
        }
        
        if (currentCity.isUnderSiege) {
            return null;
        }
        
        const enemiesAtCity = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 【修复】如果是中立城市有敌军，允许围城（因为无法游说）
        // 其他情况有敌军则不能围城（应该先战斗）
        if (enemiesAtCity.length > 0 && currentCity.faction !== 'neutral') {
            return null;
        }
        
        const fortLevel = currentCity.fortificationLevel || 0;
        let priority = 70;
        
        let reason;
        if (currentCity.faction === 'neutral') {
            // 检查是否有敌军驻守
            if (enemiesAtCity.length > 0) {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(有敌军驻守，无法游说)`;
                priority = 75; // 提高优先级
            } else if (isLongStayCase) {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(停留${stayTurns}回合，游说失败转围城)`;
            } else if (isTargetCity) {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}(战略目标特权)`;
            } else {
                reason = `围攻中立城市${this.getCityName(currentCity.id)}`;
            }
        } else {
            reason = `围攻敌城${this.getCityName(currentCity.id)}(工事${fortLevel}级)`;
        }
        
        return {
            type: 'siege',
            target: currentCity,
            priority: priority,
            reason: reason
        };
    },

    /**
     * 评估游说选项（完全复制自罗马AI）
     */
    evaluateDiplomacyOptions(army, situation) {
        if (situation.myFunds < 50) return null;
        
        const currentCity = cities.find(c => c.id === army.location);
        const connectedCities = getConnectedCities(army.location);
        
        let bestTarget = null;
        let bestScore = 0;
        let bestReason = '';
        
        const citesToCheck = [currentCity, ...connectedCities.map(id => cities.find(c => c.id === id))];
        
        for (const city of citesToCheck) {
            if (!city) continue;
            
            const enemiesAtCity = situation.enemyArmies.filter(e => e.location === city.id);
            
            if (enemiesAtCity.length > 0) continue;
            
            if (city.faction === 'neutral') {
                const attitude = city.macedoniaAttitude || 0;
                
                if (attitude >= 2) {
                    const score = 75;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        bestReason = `游说中立城市${this.getCityName(city.id)}(态度${attitude}/3, 接近转换)`;
                    }
                } else {
                    const score = 50;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        bestReason = `游说中立城市${this.getCityName(city.id)}(态度${attitude}/3)`;
                    }
                }
            }
            else if (city.faction === 'macedonia') {
                const attitude = city.macedoniaAttitude || 0;
                
                if (attitude < 3) {
                    const score = 25;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = city;
                        bestReason = `巩固己方城市${this.getCityName(city.id)}(态度${attitude}/3较低)`;
                    }
                }
            }
        }
        
        if (bestTarget) {
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
     * 评估征召选项（完全复制自罗马AI）
     */
    evaluateRecruitOptions(army, situation) {
        if (situation.myFunds < 200) return null;
        
        const armyPower = calculateCombatPower(army);
        
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
     * 评估整编选项（完全复制自罗马AI）
     */
    evaluateReorganizeOptions(army, situation) {
        if (situation.myFunds < 100) return null;
        
        if (army.morale < 3) {
            return {
                type: 'reorganize',
                priority: 55 + (3 - army.morale) * 10,
                reason: `士气过低(${army.morale}/5), 需要整编提升`
            };
        }
        
        return null;
    },

    /**
     * 评估修筑选项（完全复制自罗马AI）
     */
    evaluateFortifyOptions(army, situation) {
        if (situation.myFunds < 150) return null;
        
        const currentCity = cities.find(c => c.id === army.location);
        
        if (currentCity.faction !== 'macedonia') {
            return null;
        }
        
        const fortLevel = currentCity.fortificationLevel || 0;
        const maxFortLevel = 5;
        
        if (fortLevel >= maxFortLevel) {
            return null;
        }
        
        let targetLevel = currentCity.important ? maxFortLevel : 3;
        
        if (fortLevel < targetLevel) {
            return {
                type: 'fortify',
                priority: 35 + (currentCity.important ? 20 : 0),
                reason: `强化城市${this.getCityName(currentCity.id)}(当前工事${fortLevel}级)`
            };
        }
        
        return null;
    },

    /**
     * 验证并修正决策（完全复制自罗马AI）
     */
    validateAndFixDecision(army, decision) {
        switch (decision.type) {
            case 'move':
                const connectedCities = getConnectedCities(army.location);
                if (!connectedCities.includes(decision.target)) {
                    const nextStep = this.getNextStepToTarget(army.location, decision.target);
                    if (nextStep) {
                        const oldTarget = decision.target;
                        decision.target = nextStep;
                        decision.reason = `[自动路径] 向${this.getCityName(oldTarget)}进军，当前移动至${this.getCityName(nextStep)}`;
                        return true;
                    } else {
                        return false;
                    }
                }
                return true;
            
            default:
                return this.validateDecision(army, decision);
        }
    },

    /**
     * 验证决策是否有效（完全复制自罗马AI）
     */
    validateDecision(army, decision) {
        switch (decision.type) {
            case 'move':
                const connectedCities = getConnectedCities(army.location);
                if (!connectedCities.includes(decision.target)) {
                    return false;
                }
                return true;

            case 'siege':
                const siegeCity = cities.find(c => c.id === army.location);
                if (!siegeCity) {
                    return false;
                }
                if (siegeCity.faction === 'macedonia') {
                    return false;
                }
                
                if (siegeCity.faction === 'neutral') {
                    const strategyConfig = this.strategies[this.config.strategy];
                    const isTargetCity = strategyConfig && strategyConfig.offensiveTargets && 
                                        strategyConfig.offensiveTargets.some(t => t.cityId === siegeCity.id);
                    
                    const stayHistory = this.armyStayHistory[army.id];
                    const stayTurns = (stayHistory && stayHistory.cityId === army.location) 
                        ? stayHistory.stayTurns 
                        : 0;
                    const isLongStayCase = (stayTurns > 6);
                    
                    if (!isTargetCity && !isLongStayCase) {
                        return false;
                    }
                }
                
                return true;

            case 'diplomacy':
                if (!decision.target || !decision.target.id) {
                    return false;
                }
                return true;

            case 'recruit':
            case 'reorganize':
            case 'fortify':
            case 'borrow':
            case 'attack':
                return true;

            default:
                return false;
        }
    },

    /**
     * 获取行动名称（完全复制自罗马AI）
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
     * 为军队制定决策（完全照抄罗马AI的decideArmyAction）
     * 返回包含priority的决策对象
     */
    async makeArmyDecision(army) {
        const situation = this.evaluateSituation();
        const decisions = [];
        
        // 更新军队停留记录
        this.updateArmyStayHistory(army);
        
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
        
        // 【优先级0】绝对最高优先级：士气不足5必须整编
        if (army.morale < 5) {
            const cityForMorale = cities.find(c => c.id === army.location);
            const cityDesc = cityForMorale ? cityForMorale.name : army.location;
            
            return {
                type: 'reorganize',
                priority: 9999, // 绝对最高优先级
                reason: `士气严重不足(${army.morale.toFixed(1)})，必须立即整编恢复战力`
            };
        }
        
        // 【新增】绝对最高优先级：首都被围城紧急响应
        const capitalId = 'pella'; // 马其顿的首都
        const capitalCity = cities.find(c => c.id === capitalId);
        
        // 检查首都是否被敌方围城
        if (capitalCity && capitalCity.isUnderSiege && 
            capitalCity.besiegingFaction !== 'macedonia') {
            
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
        if (currentCity && currentCity.isUnderSiege && currentCity.besiegingFaction === 'macedonia') {
            // 该城市正在被我方围城，优先继续围城
            
            // 检查是否有敌军驻防（围城期间不主动攻击）
            const enemiesAtCity = situation.enemyArmies.filter(e => e.location === army.location);
            
            return {
                type: 'siege',
                target: currentCity,
                priority: 999, // 极高优先级
                reason: `继续围城${currentCity.name}(第${currentCity.siegeCount}次，对手上回合选择守城)`
            };
        }
                
        // 【罗马AI逻辑】0. 检查是否有上回合制定的计划
        const existingPlan = this.armyPlans[army.id];
        if (existingPlan && existingPlan.nextTurnPlan) {
            // 创建计划副本以便可能的修正
            const planToCheck = { ...existingPlan.nextTurnPlan };
            
            // 验证并可能修正计划（对于移动计划）
            const isValid = this.validateAndFixDecision(army, planToCheck);
            if (isValid && this.isPlanStillRelevant(army, planToCheck, situation)) {
                // 将上回合计划作为高优先级选项
                decisions.push({
                    ...planToCheck,
                    priority: planToCheck.priority + 30, // 提高优先级
                    reason: `[执行上回合计划] ${planToCheck.reason}`
                });
            }
        }
        
        // 【罗马AI逻辑】1. 检查是否需要借款（一回合只能借款一次，且负债不超过5999）
        if (situation.myFunds < 100 && situation.myDebt < 6000 && !this.borrowedThisTurn) {
            return { type: 'borrow', priority: 100, reason: `资金紧张(${situation.myFunds})，债务${situation.myDebt}` };
        }
        
        // 2. 首都防御（超高优先级800-1200）
        const defendPellaDecision = this.needDefendPella(army, situation);
        if (defendPellaDecision) {
            decisions.push(defendPellaDecision);
        }
        
        // 3. 第一目标战略（高优先级350+）
        const firstTargetDecision = this.evaluateFirstTargetStrategy(army, situation);
        if (firstTargetDecision) {
            decisions.push(firstTargetDecision);
        }
        
        // 4. 第二目标战略（中优先级320+）
        const secondTargetDecision = this.evaluateSecondTargetStrategy(army, situation);
        if (secondTargetDecision) {
            decisions.push(secondTargetDecision);
        }
        
        // 【罗马AI逻辑】5. 同城敌军应对（高优先级，除特殊战略军队外）
        const enemyInCityDecision = this.evaluateEnemyInSameCity(army, situation);
        if (enemyInCityDecision) {
            decisions.push(enemyInCityDecision);
        }
        
        // 【罗马AI逻辑】6. 检查是否应该收复失去的城市（高优先级）
        const recaptureDecision = this.evaluateRecaptureOptions(army, situation);
        if (recaptureDecision) {
            decisions.push(recaptureDecision);
        }

        // 【罗马AI逻辑】7. 检查是否应该进攻敌军
        const attackDecision = this.evaluateAttackOptions(army, situation);
        if (attackDecision) {
            decisions.push(attackDecision);
        }

        // 【罗马AI逻辑】8. 检查是否应该移动
        const moveDecision = this.evaluateMoveOptions(army, situation);
        if (moveDecision) {
            decisions.push(moveDecision);
        }

        // 【罗马AI逻辑】9. 检查是否应该围城
        const siegeDecision = this.evaluateSiegeOptions(army, situation);
        if (siegeDecision) {
            decisions.push(siegeDecision);
        }

        // 【罗马AI逻辑】10. 检查是否应该游说（提高优先级，优先游说当前城市）
        const diplomacyDecision = this.evaluateDiplomacyOptions(army, situation);
        if (diplomacyDecision) {
            // 如果可以游说当前城市，大幅提高优先级
            if (diplomacyDecision.target && diplomacyDecision.target.id === army.location) {
                diplomacyDecision.priority += 30; // 提高优先级
                diplomacyDecision.reason = `【优先】${diplomacyDecision.reason}`;
            }
            decisions.push(diplomacyDecision);
        }

        // 【罗马AI逻辑】11. 检查是否应该征召
        const recruitDecision = this.evaluateRecruitOptions(army, situation);
        if (recruitDecision) {
            decisions.push(recruitDecision);
        }

        // 【罗马AI逻辑】12. 检查是否应该整编
        const reorganizeDecision = this.evaluateReorganizeOptions(army, situation);
        if (reorganizeDecision) {
            decisions.push(reorganizeDecision);
        }

        // 【罗马AI逻辑】13. 检查是否应该修筑
        const fortifyDecision = this.evaluateFortifyOptions(army, situation);
        if (fortifyDecision) {
            decisions.push(fortifyDecision);
        }

        // 【罗马AI逻辑】选择优先级最高的决策
        if (decisions.length > 0) {
            decisions.sort((a, b) => b.priority - a.priority);
            return decisions[0];
        }

        // 没有好的选择时，强制执行一个实际行动
        return this.getFallbackAction(army, situation);
    },

    /**
     * 检查是否需要防御佩拉（参考罗马AI的needDefendRome）
     * 简化版：检测佩拉周围的威胁
     */
    needDefendPella(army, situation) {
        const strategy = this.config.strategy;
        const strategyConfig = this.strategies[strategy];
        
        if (!strategyConfig || !strategyConfig.defenseCapital) {
            return null;
        }

        const pellaCity = cities.find(c => c.id === 'pella');
        
        // 如果佩拉不存在或已失陷
        if (!pellaCity) return null;
        
        // 特殊情况1：佩拉被围城
        if (pellaCity.isUnderSiege && pellaCity.besiegingFaction !== 'macedonia') {
            if (army.location === 'pella') {
                // 在佩拉城内，必须突围
                const enemiesAtPella = situation.enemyArmies.filter(e => e.location === 'pella');
                
                if (enemiesAtPella.length > 0) {
                    enemiesAtPella.sort((a, b) => calculateCombatPower(a) - calculateCombatPower(b));
                    const targetEnemy = enemiesAtPella[0];
                    
                    return {
                        type: 'attack',
                        target: targetEnemy,
                        priority: 1200,  // 超高优先级
                        reason: `🚨【佩拉围城突围】无条件攻击围城敌军${targetEnemy.commander}`
                    };
                }
            }
        }
        
        // 特殊情况2：佩拉已失陷
        if (pellaCity.faction !== 'macedonia') {
            // 所有军队优先收复佩拉
            const pathToPella = this.findPathToCity(army.location, 'pella');
            if (pathToPella && pathToPella.length > 0) {
                return {
                    type: 'move',
                    target: pathToPella[0],
                    priority: 1100,  // 极高优先级
                    reason: `🚨【收复佩拉】首都失陷，立即收复`
                };
            }
        }
        
        // 正常情况：检查佩拉周围的威胁
        const defensiveRadius = strategyConfig.defenseCapital.defensiveRadius || 2;
        const myDistance = this.calculateDistance(army.location, 'pella');
        
        // 只有在防御半径内的军队参与防御
        if (myDistance > defensiveRadius) {
            return null;
        }
        
        // 寻找威胁佩拉的敌军
        const connectedToPella = getConnectedCities('pella');
        let nearestThreat = null;
        let minDistance = Infinity;
        
        for (const enemy of situation.enemyArmies) {
            const enemyDistance = this.calculateDistance(enemy.location, 'pella');
            
            // 距离佩拉2步以内的敌军视为威胁
            if (enemyDistance <= 2) {
                if (enemyDistance < minDistance) {
                    minDistance = enemyDistance;
                    nearestThreat = enemy;
                }
            }
        }
        
        if (nearestThreat) {
            // 发现威胁，前去拦截
            const enemyLocation = nearestThreat.location;
            
            // 如果敌军就在相邻位置
            if (connectedToPella.includes(enemyLocation)) {
                // 如果我方军队在佩拉或相邻城市
                const myConnected = getConnectedCities(army.location);
                if (myConnected.includes(enemyLocation)) {
                    // 可以直接攻击
                    const enemyCheck = this.checkEnemyAtTarget(army, enemyLocation);
                    
                    if (enemyCheck.canMove) {
                        return {
                            type: 'move',
                            target: enemyLocation,
                            priority: 900,  // 很高优先级
                            reason: `【防御佩拉】拦截${nearestThreat.commander}(距首都${minDistance}步)`
                        };
                    } else if (enemyCheck.shouldReinforce) {
                        // 需要增强
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: 850,
                                reason: `【防御佩拉】整编后拦截${nearestThreat.commander}`
                            };
                        }
                    }
                }
            }
            
            // 威胁较远，前往佩拉防守
            if (army.location !== 'pella') {
                const pathToPella = this.findPathToCity(army.location, 'pella');
                if (pathToPella && pathToPella.length > 0) {
                    return {
                        type: 'move',
                        target: pathToPella[0],
                        priority: 800,
                        reason: `【防御佩拉】发现威胁${nearestThreat.commander}，回防首都`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 检查首都防御需求（旧函数，保留兼容性）
     */
    checkCapitalDefense(army, strategyConfig) {
        if (!strategyConfig || !strategyConfig.defenseCapital) {
            return null;
        }

        const capital = cities.find(c => c.id === strategyConfig.defenseCapital.cityId);
        if (!capital || capital.faction !== 'macedonia') {
            return null;
        }

        // 检查首都周围是否有敌军威胁
        const capitalConnected = getConnectedCities(capital.id);
        let threatDetected = false;
        
        for (const connectedCityId of capitalConnected) {
            const enemies = this.getEnemiesAtCity(connectedCityId);
            if (enemies.length > 0) {
                threatDetected = true;
                break;
            }
        }

        if (threatDetected) {
            // 如果军队不在首都或周围，前往首都
            if (army.location !== capital.id && !capitalConnected.includes(army.location)) {
                const pathToCapital = this.findPathToCity(army.location, capital.id);
                if (pathToCapital && pathToCapital.length > 0) {
                    return { 
                        type: 'move', 
                        target: pathToCapital[0], 
                        reason: `保卫${capital.name}` 
                    };
                }
            }
        }

        return null;
    },

    /**
     * 获取城市的敌军
     */
    getEnemiesAtCity(cityId) {
        const allArmies = getAllArmies();
        const enemyFactions = this.getEnemyFactions();
        return allArmies.filter(a => 
            a.location === cityId && 
            enemyFactions.includes(a.faction)
        );
    },

    /**
     * 决定如何应对敌军
     */
    decideAgainstEnemies(army, enemies) {
        const myPower = calculateCombatPower(army);
        const totalEnemyPower = enemies.reduce((sum, e) => sum + calculateCombatPower(e), 0);

        addLog(`   ⚔️ 发现敌军！我方战力：${myPower}，敌方战力：${totalEnemyPower}`, 'macedonia');

        if (myPower >= totalEnemyPower * 0.8) {
            // 实力相当或占优，发起攻击
            return { 
                type: 'attack', 
                target: enemies[0], 
                reason: `进攻${this.getCityName(enemies[0].location)}的敌军` 
            };
        } else if (myPower >= totalEnemyPower * 0.5) {
            // 实力稍弱，根据进攻性决定
            if (Math.random() < this.config.aggressiveness) {
                return { 
                    type: 'attack', 
                    target: enemies[0], 
                    reason: `冒险进攻${this.getCityName(enemies[0].location)}的敌军` 
                };
            } else {
                // 撤退到安全位置
                const safeCity = this.findSafeRetreat(army);
                if (safeCity) {
                    return { type: 'move', target: safeCity, reason: '战术撤退' };
                }
            }
        } else {
            // 实力明显不足，撤退
            const safeCity = this.findSafeRetreat(army);
            if (safeCity) {
                return { type: 'move', target: safeCity, reason: '撤退避敌' };
            }
        }

        return null;
    },

    /**
     * 寻找收复失地目标
     */
    findRecaptureTarget(army) {
        const lostCitiesRecord = this.lostCities['macedonia'] || {};
        const lostCityIds = Object.keys(lostCitiesRecord);
        
        if (lostCityIds.length === 0) {
            return null;
        }

        // 找到最近的失地
        let bestTarget = null;
        let shortestPath = Infinity;

        for (const cityId of lostCityIds) {
            const path = this.findPathToCity(army.location, cityId);
            if (path && path.length > 0 && path.length < shortestPath) {
                shortestPath = path.length;
                bestTarget = path[0];  // 返回下一步目标
            }
        }

        return bestTarget;
    },

    /**
     * 判断军队是否为友方军队（基于联盟状态）
     */
    isFriendlyArmy(army) {
        if (!army) return false;
        
        // 马其顿军队永远是友方
        if (army.faction === 'macedonia') return true;
        
        // 根据联盟状态判断
        const allyFaction = this.getAllyFaction();
        if (allyFaction && army.faction === allyFaction) return true;
        
        return false;  // 其他情况都不是友方
    },

    /**
     * 判断军队是否为敌方军队（基于联盟状态）
     */
    isEnemyArmy(army) {
        if (!army) return false;
        
        // 马其顿军队永远不是敌方
        if (army.faction === 'macedonia') return false;
        
        // 如果是盟友，不是敌方
        if (this.isFriendlyArmy(army)) return false;
        
        // 其他都是敌方
        return true;
    },

    /**
     * 判断军队是否是距离指定目标最近的N支军队之一
     */
    isClosestToTarget(army, situation, targetCityId, topN = 2) {
        const targetCity = cities.find(c => c.id === targetCityId);
        if (!targetCity || targetCity.faction === 'macedonia') {
            return false;
        }

        const myDistance = this.calculateDistance(army.location, targetCityId);
        
        // 计算所有马其顿军队到目标的距离
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
        
        // 判断当前军队是否在前N名
        const topNArmies = armyDistances.slice(0, topN);
        const isInTopN = topNArmies.some(item => item.army.id === army.id);
        
        return isInTopN;
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
     * 计算两个城市之间的距离
     * 海路连接按3倍长度计算
     */
    calculateDistance(fromCityId, toCityId) {
        if (fromCityId === toCityId) {
            return 0;
        }

        const visited = new Set();
        const queue = [{ cityId: fromCityId, distance: 0 }];

        while (queue.length > 0) {
            const { cityId, distance } = queue.shift();
            
            if (distance > 60) {  // 最大搜索距离（考虑海路3倍，从20改为60）
                break;
            }

            const connected = getConnectedCities(cityId);
            
            for (const nextCityId of connected) {
                if (visited.has(nextCityId)) {
                    continue;
                }
                
                visited.add(nextCityId);
                
                // 海路连接距离为3，普通连接距离为1
                const stepDistance = this.isSeaRoute(cityId, nextCityId) ? 3 : 1;
                
                if (nextCityId === toCityId) {
                    return distance + stepDistance;
                }
                
                queue.push({ cityId: nextCityId, distance: distance + stepDistance });
            }
        }

        return Infinity;
    },

    /**
     * 计算军队在某位置的综合战力（完全参考罗马AI）
     * 考虑主力+同城友军+相邻友军
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
        const allyFaction = this.getAllyFaction();
        if (allyFaction) {
            const allyArmiesInCity = CityArmyManager.getArmiesAtCityByFaction(locationId, allyFaction);
            allyArmiesInCity.forEach(allyArmy => {
                const allyPower = calculateCombatPower(allyArmy);
                details.sameCityAllyArmies.push({ 
                    commander: allyArmy.commander, 
                    power: allyPower,
                    faction: allyFaction
                });
                details.sameCityAllyPower += allyPower * 0.5;
            });
            totalPower += details.sameCityAllyPower;
            
            // 5. 相邻盟友军队战力 * 0.5
            connectedCities.forEach(cityId => {
                const allyArmiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(cityId, allyFaction);
                allyArmiesInNeighbor.forEach(allyArmy => {
                    const allyPower = calculateCombatPower(allyArmy);
                    const cityName = this.getCityName(cityId);
                    details.neighborAllyArmies.push({ 
                        commander: allyArmy.commander, 
                        power: allyPower,
                        city: cityName,
                        faction: allyFaction
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
     * 计算敌方在某位置的综合战力（排除盟友）
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
     * 检查目标城市的敌军情况（完全参考罗马AI，支持联盟）
     * 使用综合战力评估
     */
    checkEnemyAtTarget(army, targetCityId) {
        const targetCity = cities.find(c => c.id === targetCityId);
        if (!targetCity) {
            return { canMove: true, shouldReinforce: false, powerGap: 0, reason: '' };
        }

        const enemyFaction = targetCity.faction === 'neutral' ? null : targetCity.faction;
        if (!enemyFaction || enemyFaction === 'macedonia' || this.isAlly(enemyFaction)) {
            // 如果是中立、我方城市或盟友城市，可以自由移动
            return { canMove: true, shouldReinforce: false, powerGap: 0, reason: '' };
        }

        const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(targetCityId, enemyFaction);
        
        if (enemiesAtCity.length === 0) {
            return { canMove: true, shouldReinforce: false, powerGap: 0, reason: '' };
        }
        
        // 使用综合战力评估（基于目标位置，包含盟友支援）
        const myResult = this.calculateComprehensivePower(army, targetCityId, 'macedonia');
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(targetCityId, enemyFaction);
        const enemyPower = enemyResult.totalPower;
        
        const powerGap = enemyPower - myPower;
        
        // 构建详细说明
        let detailInfo = '';
        if (myResult.details.sameCityAllies.length > 0 || myResult.details.neighborAllies.length > 0 ||
            myResult.details.sameCityAllyArmies.length > 0 || myResult.details.neighborAllyArmies.length > 0) {
            detailInfo += `\n   我方援军: `;
            if (myResult.details.sameCityAllies.length > 0) {
                detailInfo += `同城${myResult.details.sameCityAllies.length}支(+${myResult.details.sameCityPower.toFixed(0)}) `;
            }
            if (myResult.details.neighborAllies.length > 0) {
                detailInfo += `相邻${myResult.details.neighborAllies.length}支(+${myResult.details.neighborPower.toFixed(0)}) `;
            }
            if (myResult.details.sameCityAllyPower > 0) {
                detailInfo += `盟友同城(+${myResult.details.sameCityAllyPower.toFixed(0)}) `;
            }
            if (myResult.details.neighborAllyPower > 0) {
                detailInfo += `盟友相邻(+${myResult.details.neighborAllyPower.toFixed(0)})`;
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
     * 寻找路径（带排除城市）（完全参考罗马AI）
     * 使用带权重的搜索，考虑海路3倍成本
     */
    findPathWithExclusions(startCityId, endCityId, excludedCities = new Set()) {
        if (startCityId === endCityId) {
            return [startCityId];
        }

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

        return null; // 没有找到路径
    },

    /**
     * 第一目标战略决策（使用动态目标）
     * 为距离第一目标最近的2支马其顿军队制定专门策略
     */
    evaluateFirstTargetStrategy(army, situation) {
        // 使用动态确定的第一目标
        const targetCityId = this.config.primaryTarget || 'rome';
        const targetCity = cities.find(c => c.id === targetCityId);
        
        if (!targetCity) return null;
        
        // 如果目标已经是马其顿控制，不需要特殊策略
        if (targetCity.faction === 'macedonia') return null;
        
        // 如果目标是盟友城市，不攻击
        if (this.isFriendlyCity(targetCity)) return null;
        
        // 判断是否是距离最近的2支军队之一
        if (!this.isClosestToTarget(army, situation, targetCityId, 2)) return null;
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = 350; // 第一目标战略基础优先级（高于一般移动，低于保卫佩拉）
        
        // 确定敌对派系（目标城市的派系）
        const enemyFaction = targetCity.faction === 'neutral' ? null : targetCity.faction;
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 获取目标描述
        const targetDesc = `第一目标：${targetCity.name}`;
        
        // 5. 若有敌方军队，根据综合战力进行判定
        if (enemiesAtLocation.length > 0) {
            const myResult = this.calculateComprehensivePower(army, army.location, 'macedonia');
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemiesAtLocation[0].faction);
            const enemyPower = enemyResult.totalPower;
            
            if (myPower > enemyPower * 1) {
                // 综合优势，进攻
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【${targetDesc}】在${this.getCityName(army.location)}消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // 综合劣势，考虑整编或撤退
                if (army.morale < 4) {
                    return {
                        type: 'reorganize',
                        priority: basePriority + 30,
                        reason: `【${targetDesc}】综合劣势，整编后再战(${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                    };
                }
                return null;
            }
        }
        
        // 1. 若当前位于友方城市（己方或联盟），优先向目标移动
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
                // 相邻目标，检查是否有敌军
                const checkResult = checkTargetForEnemies(targetCityId);
                
                if (checkResult.canMove) {
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 100,
                        reason: `【${targetDesc}】向${targetCity.name}进军(距离${distance}步${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`
                    };
                } else if (checkResult.needImprove) {
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【${targetDesc}】整编提升战力(差距${checkResult.powerGap}，目标${targetCity.name})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 95,
                            reason: `【${targetDesc}】征召增强兵力(差距${checkResult.powerGap}，目标${targetCity.name})`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 95,
                            reason: `【${targetDesc}】整编提升战力(差距${checkResult.powerGap}，目标${targetCity.name})`
                        };
                    }
                } else {
                    return null;
                }
            } else {
                // 不相邻，尝试寻找可通行的路径
                const excludedCities = new Set();
                let attemptCount = 0;
                const maxAttempts = 5;
                
                while (attemptCount < maxAttempts) {
                    attemptCount++;
                    
                    const path = this.findPathWithExclusions(army.location, targetCityId, excludedCities);
                    
                    if (!path || path.length <= 1) {
                        return null;
                    }
                    
                    const firstStep = path[1];
                    const checkResult = checkTargetForEnemies(firstStep);
                    
                    if (checkResult.canMove) {
                        if (attemptCount > 1) {
                            const history = this.armyHistory[army.id];
                            if (history && history.detoured) {
                                if (army.morale < 5) {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                        reason: `【${targetDesc}】连续绕路受阻，整编提升战力`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 95,
                                        reason: `【${targetDesc}】连续绕路受阻，征召增强兵力`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 95,
                                        reason: `【${targetDesc}】连续绕路受阻，整编备战`
                                    };
                                }
                            }
                        }
                        
                        const willDetour = attemptCount > 1;
                        
                        return {
                            type: 'move',
                            target: firstStep,
                            priority: basePriority + 100,
                            reason: `【${targetDesc}】向${targetCity.name}进军(距离${distance}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${checkResult.shouldAttack ? '，抵达后攻击敌军' : ''})`,
                            _detoured: willDetour
                        };
                    } else if (checkResult.needImprove) {
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【${targetDesc}】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 95,
                                reason: `【${targetDesc}】征召后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        } else {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 95,
                                reason: `【${targetDesc}】整编后进攻${this.getCityName(firstStep)}(差距${checkResult.powerGap})`
                            };
                        }
                    } else {
                        excludedCities.add(firstStep);
                    }
                }
                
                return null;
            }
        }
        
        // 2. 若当前位于中立城市，优先游说
        if (currentCity.faction === 'neutral') {
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 80,
                    reason: `【${targetDesc}】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                const attitude = currentCity.macedoniaAttitude || 0;
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 90,
                    reason: `【${targetDesc}】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 4. 若位于敌方城市，优先进行围城
        if (this.isEnemyCity(currentCity)) {
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, currentCity.faction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【${targetDesc}】围攻敌城${this.getCityName(currentCity.id)}(向${targetCity.name}进军途中)`
                };
            } else {
                const myPower = calculateCombatPower(army);
                const enemyPower = enemiesAtCity.reduce((sum, e) => sum + calculateCombatPower(e), 0);
                
                if (myPower > enemyPower * 1) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 90,
                        reason: `【${targetDesc}】消灭敌军后围城(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 第二目标战略决策（使用动态目标）
     * 为距离第二目标最近的马其顿军队制定专门策略（排除执行第一目标战略的军队）
     */
    evaluateSecondTargetStrategy(army, situation) {
        // 使用动态确定的第二目标
        const targetCityId = this.config.secondaryTarget || 'syracuse';
        const targetCity = cities.find(c => c.id === targetCityId);
        
        if (!targetCity) return null;
        
        // 如果目标已经是马其顿控制，不需要特殊策略
        if (targetCity.faction === 'macedonia') return null;
        
        // 如果目标是盟友城市，不攻击
        if (this.isFriendlyCity(targetCity)) return null;
        
        // 首先，如果自己正在执行第一目标战略（前2名），就不执行第二目标战略
        const primaryTargetId = this.config.primaryTarget || 'rome';
        if (this.isClosestToTarget(army, situation, primaryTargetId, 2)) {
            return false;
        }
        
        // 判断是否是距离第二目标最近的军队（排除执行第一目标的军队）
        const myDistance = this.calculateDistance(army.location, targetCityId);
        
        // 检查其他马其顿军队的距离（排除执行第一目标战略的军队）
        const otherArmies = situation.myArmies.filter(a => a.id !== army.id);
        for (const otherArmy of otherArmies) {
            // 如果其他军队正在执行第一目标战略，不参与第二目标竞争
            if (this.isClosestToTarget(otherArmy, situation, primaryTargetId, 2)) {
                continue;
            }

            // 该军队不执行第一目标战略，参与第二目标距离竞争
            const otherDistance = this.calculateDistance(otherArmy.location, targetCityId);
            if (otherDistance < myDistance) {
                return null;  // 有其他军队更近
            }
        }
        
        // 这是最近的军队（且不执行第一目标战略）
        
        // 获取停留记录
        const stayRecord = this.armyStayHistory[army.id];
        const stayTurns = stayRecord && stayRecord.cityId === army.location ? stayRecord.stayTurns : 0;
        
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) return null;
        
        const distance = this.calculateDistance(army.location, targetCityId);
        const basePriority = 320; // 第二目标战略基础优先级（低于第一目标）
        
        // 获取目标描述
        const targetDesc = `第二目标：${targetCity.name}`;
        
        // 检查是否有敌军在当前位置
        const enemiesAtLocation = situation.enemyArmies.filter(e => e.location === army.location);
        
        // 5. 若与敌方军队处于同一个城市（使用综合战力评估）
        if (enemiesAtLocation.length > 0) {
            const myResult = this.calculateComprehensivePower(army, army.location, 'macedonia');
            const myPower = myResult.totalPower;
            
            const enemyResult = this.calculateEnemyComprehensivePower(army.location, enemiesAtLocation[0].faction);
            const enemyPower = enemyResult.totalPower;
            
            // (1) 若综合战力大于对方，攻击
            if (myPower > enemyPower * 1) {
                return {
                    type: 'attack',
                    target: enemiesAtLocation[0],
                    priority: basePriority + 50,
                    reason: `【${targetDesc}】消灭敌军(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                };
            } else {
                // (2) 若综合战力小于对方
                // i) 若当前处于我方城市：优先征召和整编
                if (currentCity.faction === 'macedonia') {
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 45,
                            reason: `【${targetDesc}】整编提升战力(综合劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 45,
                            reason: `【${targetDesc}】征召增强兵力(综合劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 45,
                            reason: `【${targetDesc}】整编备战(综合劣势${myPower.toFixed(0)}vs${enemyPower.toFixed(0)})`
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
                        if (city.faction === 'macedonia') {
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
                        const factionDesc = retreatCity.faction === 'macedonia' ? '己方' : 
                                          retreatCity.faction === 'neutral' ? '中立' : '敌方';
                        return {
                            type: 'move',
                            target: retreatTarget,
                            priority: basePriority + 40,
                            reason: `【${targetDesc}】撤退到${factionDesc}城市${this.getCityName(retreatTarget)}(面对强敌)`
                        };
                    }
                }
                
                // 无法撤退，不做特殊决策
                return null;
            }
        }
        
        // 1. 若当前位于己方城市，优先向目标移动
        if (currentCity.faction === 'macedonia') {
            const connectedCities = getConnectedCities(army.location);
            
            if (connectedCities.includes(targetCityId)) {
                // 相邻，检查目标是否有敌军
                const enemyCheck = this.checkEnemyAtTarget(army, targetCityId);
                
                if (!enemyCheck.canMove && !enemyCheck.shouldReinforce) {
                    // 差距过大，排除
                    return null;
                } else if (enemyCheck.shouldReinforce) {
                    // 需要增强
                    if (army.morale < 5) {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 75,
                            reason: `【${targetDesc}】整编后进攻${targetCity.name}(差距${enemyCheck.powerGap})`
                        };
                    } else if (situation.myFunds >= 200) {
                        return {
                            type: 'recruit',
                            priority: basePriority + 75,
                            reason: `【${targetDesc}】征召后进攻${targetCity.name}(差距${enemyCheck.powerGap})`
                        };
                    } else {
                        return {
                            type: 'reorganize',
                            priority: basePriority + 75,
                            reason: `【${targetDesc}】整编后进攻${targetCity.name}(差距${enemyCheck.powerGap})`
                        };
                    }
                } else {
                    // 可以移动
                    return {
                        type: 'move',
                        target: targetCityId,
                        priority: basePriority + 80,
                        reason: `【${targetDesc}】向${targetCity.name}进军(距离${distance}步${enemyCheck.reason ? '，' + enemyCheck.reason : ''})`
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
                        return null;
                    }
                    
                    const firstStep = path[1];
                    const enemyCheck = this.checkEnemyAtTarget(army, firstStep);
                    
                    if (!enemyCheck.canMove && !enemyCheck.shouldReinforce) {
                        // 差距过大，排除这个城市，尝试下一条路径
                        excludedCities.add(firstStep);
                        continue;
                    } else if (enemyCheck.shouldReinforce) {
                        // 需要增强
                        if (army.morale < 5) {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 75,
                                reason: `【${targetDesc}】整编后进攻${this.getCityName(firstStep)}(差距${enemyCheck.powerGap})`
                            };
                        } else if (situation.myFunds >= 200) {
                            return {
                                type: 'recruit',
                                priority: basePriority + 75,
                                reason: `【${targetDesc}】征召后进攻${this.getCityName(firstStep)}(差距${enemyCheck.powerGap})`
                            };
                        } else {
                            return {
                                type: 'reorganize',
                                priority: basePriority + 75,
                                reason: `【${targetDesc}】整编后进攻${this.getCityName(firstStep)}(差距${enemyCheck.powerGap})`
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
                                if (army.morale < 5) {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 75,
                                        reason: `【${targetDesc}】连续绕路受阻，整编提升战力`
                                    };
                                } else if (situation.myFunds >= 200) {
                                    return {
                                        type: 'recruit',
                                        priority: basePriority + 75,
                                        reason: `【${targetDesc}】连续绕路受阻，征召增强兵力`
                                    };
                                } else {
                                    return {
                                        type: 'reorganize',
                                        priority: basePriority + 75,
                                        reason: `【${targetDesc}】连续绕路受阻，整编备战`
                                    };
                                }
                            }
                        }
                        
                        // 标记本回合使用了绕路方案
                        const willDetour = attemptCount > 1;
                        
                        return {
                            type: 'move',
                            target: firstStep,
                            priority: basePriority + 80,
                            reason: `【${targetDesc}】向${targetCity.name}进军(距离${distance}步，经${this.getCityName(firstStep)}${willDetour ? '，绕路' : ''}${enemyCheck.reason ? '，' + enemyCheck.reason : ''})`,
                            _detoured: willDetour // 内部标记，用于记录历史
                        };
                    }
                }
                
                // 达到最大尝试次数
                return null;
            }
        }
        
        // 2. 若当前位于中立城市
        if (currentCity.faction === 'neutral') {
            // 2.2 若当前位于目标城市且目标城市中立，优先围城（特殊：第二目标战略允许围城中立目标）
            if (army.location === targetCityId) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 85,
                    reason: `【${targetDesc}】围攻${targetCity.name}(中立城市，直接围城)`
                };
            }
            
            // 3. 若位于非目标的中立城市的回合数大于6，优先围城
            const attitude = currentCity.macedoniaAttitude || 0;
            if (stayTurns > 6) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 70,
                    reason: `【${targetDesc}】游说时间过长(${stayTurns}回合)，转为围城`
                };
            } else {
                // 2.1 若当前位于非目标的中立城市，优先游说
                return {
                    type: 'diplomacy',
                    target: currentCity,
                    priority: basePriority + 75,
                    reason: `【${targetDesc}】游说中立城市${this.getCityName(currentCity.id)}(已停留${stayTurns}回合，态度${attitude}/3)`
                };
            }
        }
        
        // 4. 若位于敌方城市，优先进行围城（使用综合战力评估）
        if (currentCity.faction !== 'macedonia' && currentCity.faction !== 'neutral') {
            // 检查是否有敌军驻守
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(army.location, currentCity.faction);
            
            if (enemiesAtCity.length === 0) {
                return {
                    type: 'siege',
                    target: currentCity,
                    priority: basePriority + 75,
                    reason: `【${targetDesc}】围攻敌城${this.getCityName(currentCity.id)}(向${targetCity.name}进军途中)`
                };
            } else {
                // 有敌军，使用综合战力评估
                const myResult = this.calculateComprehensivePower(army, army.location, 'macedonia');
                const myPower = myResult.totalPower;
                
                const enemyResult = this.calculateEnemyComprehensivePower(army.location, currentCity.faction);
                const enemyPower = enemyResult.totalPower;
                
                if (myPower > enemyPower * 1) {
                    return {
                        type: 'attack',
                        target: enemiesAtCity[0],
                        priority: basePriority + 80,
                        reason: `【${targetDesc}】消灭敌军后围城(综合优势${(myPower/enemyPower).toFixed(2)}:1)`
                    };
                }
            }
        }
        
        return null;
    },

    /**
     * 寻找进攻目标
     */
    findOffensiveTarget(army, strategyConfig) {
        if (!strategyConfig || !strategyConfig.offensiveTargets) {
            return this.findGeneralOffensiveTarget(army);
        }

        const connectedCities = getConnectedCities(army.location);
        let bestTarget = null;
        let bestPriority = 0;

        // 检查相邻城市中的战略目标
        for (const target of strategyConfig.offensiveTargets) {
            if (connectedCities.includes(target.cityId)) {
                const city = cities.find(c => c.id === target.cityId);
                if (city && city.faction !== 'macedonia') {
                    if (target.priority > bestPriority) {
                        bestPriority = target.priority;
                        bestTarget = target.cityId;
                    }
                }
            }
        }

        if (bestTarget) {
            return { 
                type: 'move', 
                target: bestTarget, 
                reason: `战略进攻${this.getCityName(bestTarget)}` 
            };
        }

        // 如果相邻没有战略目标，寻找路径到最近的战略目标
        for (const target of strategyConfig.offensiveTargets) {
            const city = cities.find(c => c.id === target.cityId);
            if (city && city.faction !== 'macedonia') {
                const path = this.findPathToCity(army.location, target.cityId);
                if (path && path.length > 0) {
                    return { 
                        type: 'move', 
                        target: path[0], 
                        reason: `前往战略目标${city.name}` 
                    };
                }
            }
        }

        // 如果没有明确战略目标，寻找一般进攻目标
        return this.findGeneralOffensiveTarget(army);
    },

    /**
     * 寻找一般进攻目标
     */
    findGeneralOffensiveTarget(army) {
        const connectedCities = getConnectedCities(army.location);
        const myPower = calculateCombatPower(army);

        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city || city.faction === 'macedonia') {
                continue;
            }

            const enemies = this.getEnemiesAtCity(cityId);
            const enemyPower = enemies.reduce((sum, e) => sum + calculateCombatPower(e), 0);

            // 如果目标城市无敌军或我方占优
            if (enemies.length === 0 || myPower >= enemyPower * 0.8) {
                return { 
                    type: 'move', 
                    target: cityId, 
                    reason: `进攻${city.name}` 
                };
            }
        }

        return null;
    },

    /**
     * 寻找安全撤退位置
     */
    findSafeRetreat(army) {
        const connectedCities = getConnectedCities(army.location);
        
        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;

            // 优先撤退到己方城市
            if (city.faction === 'macedonia') {
                const enemies = this.getEnemiesAtCity(cityId);
                if (enemies.length === 0) {
                    return cityId;
                }
            }
        }

        // 如果没有安全的己方城市，考虑中立城市
        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (city && city.faction === 'neutral') {
                const enemies = this.getEnemiesAtCity(cityId);
                if (enemies.length === 0) {
                    return cityId;
                }
            }
        }

        return null;
    },

    /**
     * 寻找到目标城市的路径
     */
    findPathToCity(fromCityId, toCityId, maxDepth = 20) {
        if (fromCityId === toCityId) {
            return [];
        }

        // 使用带权重的搜索（考虑海路3倍成本）
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // 初始化所有城市
        cities.forEach(city => {
            distances.set(city.id, Infinity);
            unvisited.add(city.id);
        });
        distances.set(fromCityId, 0);

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

            if (currentCity === null || minDistance === Infinity || minDistance > maxDepth) {
                break; // 无法到达或超过最大深度
            }

            if (currentCity === toCityId) {
                // 找到目标，重建路径（不包含起点）
                const path = [];
                let current = toCityId;
                while (current && current !== fromCityId) {
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

    /**
     * 获取到达目标城市的下一步（完全复制自罗马AI）
     */
    getNextStepToTarget(currentCityId, targetCityId) {
        const path = this.findPathToCity(currentCityId, targetCityId);
        if (!path || path.length < 2) {
            return null; // 无法到达或已在目标
        }
        return path[1]; // 返回路径上的下一个城市（第一个是当前城市）
    },

    /**
     * 检查军队是否仍然存活（完全复制自罗马AI）
     */
    isArmyAlive(army) {
        if (!army || !army.faction) return false;
        const factionArmies = armies[army.faction] || [];
        return factionArmies.some(a => a.id === army.id);
    },

    /**
     * 执行决策（完全照抄罗马AI的executeDecision）
     */
    async executeDecision(army, decision) {
        if (!decision) {
            // 应急措施：强制整编
            gameState.selectedArmy = army.id;
            gameState.selectedRegion = army.location;
            executeReorganize();
            return;
        }

        const actionName = this.getActionName(decision.type);

        // 设置选中的军队
        gameState.selectedArmy = army.id;

        // 验证并修正决策（对于移动，会自动调整为路径上的下一步）
        const isValid = this.validateAndFixDecision(army, decision);
        if (!isValid) {
            // 执行兜底行动
            const fallbackDecision = this.getFallbackAction(army, this.evaluateSituation());
            return await this.executeDecision(army, fallbackDecision);
        }

        console.log(`🔍 执行决策: ${decision.type}`);
        addLog(`   📋 决策：${decision.reason}`, 'macedonia');

            switch (decision.type) {
                case 'move':
                console.log(`🔍 执行移动到: ${decision.target}`);
                gameState.selectedRegion = decision.target;
                executeMove();
                // 更新行动历史（记录绕路）
                this.updateArmyActionHistory(army, decision._detoured || false, false);
                    break;

                case 'attack':
                console.log(`🔍 执行攻击`);
                    // 调用全局的executeAttack函数（与罗马AI和迦太基AI保持一致）
                    executeAttack();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                    break;

            case 'siege':
                console.log(`🔍 执行围城`);
                gameState.selectedRegion = army.location;
                executeAction('siege');
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                    break;

            case 'diplomacy':
                console.log(`🔍 执行游说`);
                // 外交不改变位置，保持绕路状态
                gameState.selectedRegion = decision.target.id;
                executeDiplomacy();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'recruit':
                console.log(`🔍 执行征召`);
                gameState.selectedRegion = army.location;
                executeRecruit();
                // 更新行动历史（清除绕路和撤退标记）
                this.updateArmyActionHistory(army, false, false);
                break;

            case 'reorganize':
                console.log(`🔍 执行整编`);
                gameState.selectedRegion = army.location;
                executeReorganize();
                // 更新行动历史（清除绕路和撤退标记）
                this.updateArmyActionHistory(army, false, false);
                break;

                case 'fortify':
                console.log(`🔍 执行修筑`);
                gameState.selectedRegion = army.location;
                executeFortify();
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
                    break;

            case 'borrow':
                console.log(`🔍 执行借款`);
                executeBorrow();
                this.borrowedThisTurn = true;
                    break;

                default:
                console.log(`🔍 未知决策类型: ${decision.type}`);
                    addLog(`   ❌ 未知决策类型：${decision.type}`, 'macedonia');
                // 更新行动历史
                this.updateArmyActionHistory(army, false, false);
            }

        await this.delay(800);
        console.log(`🔍 executeDecision 完成`);
    },

    /**
     * 执行移动
     */
    async executeMove(army, targetCityId) {
        const targetCity = cities.find(c => c.id === targetCityId);
        if (!targetCity) {
            addLog(`   ❌ 目标城市不存在：${targetCityId}`, 'macedonia');
            return;
        }

        addLog(`   🚶 ${army.commander} 前往 ${targetCity.name}`, 'macedonia');
        
        try {
            // 使用和罗马AI相同的方式执行移动
            gameState.selectedRegion = targetCityId;
            executeMove();
            await this.delay(800);

            // 移动后检查是否有敌军
            const enemies = this.getEnemiesAtCity(targetCityId);
            if (enemies.length > 0) {
                addLog(`   ⚔️ 到达后发现敌军，准备战斗...`, 'macedonia');
                await this.executeAttack(army, enemies[0]);
            }
        } catch (error) {
            const currentCity = cities.find(c => c.id === army.location);
            const currentCityName = currentCity ? currentCity.name : army.location;
            addLog(`   ❌ 军队【${army.commander}】从${currentCityName}移动到${targetCity.name}失败：${error}`, 'macedonia');
        }
    },

    /**
     * 执行攻击
     * 注意：实际攻击由全局executeAttack()函数处理，这里不需要自定义实现
     * 保留此注释供参考，实际调用在executeDecision的attack case中
     */

    /**
     * 执行游说
     */
    async executePersuade(army) {
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) {
            return;
        }

        addLog(`   💬 ${army.commander} 在 ${currentCity.name} 进行游说`, 'macedonia');
        
        try {
            await executeDiplomacy();
            await this.delay(500);
        } catch (error) {
            addLog(`   ❌ 游说失败：${error}`, 'macedonia');
        }
    },

    /**
     * 执行修筑
     */
    async executeFortify(army) {
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) {
            return;
        }

        addLog(`   🏰 ${army.commander} 在 ${currentCity.name} 修筑防御`, 'macedonia');
        
        try {
            await executeFortify();
            await this.delay(500);
        } catch (error) {
            addLog(`   ❌ 修筑失败：${error}`, 'macedonia');
        }
    },

    /**
     * 执行围城
     */
    async executeSiege(army) {
        const currentCity = cities.find(c => c.id === army.location);
        if (!currentCity) {
            return;
        }

        addLog(`   ⚔️ ${army.commander} 围攻 ${currentCity.name}`, 'macedonia');
        
        try {
            // 围城实际上是通过showArmyActionModal并选择"围城"实现的
            // 但在AI中，我们需要判断是否可以围城
            const canSiege = currentCity.faction !== 'macedonia' && currentCity.faction !== 'neutral';
            
            if (canSiege) {
                // 围城逻辑已在主游戏循环中处理，这里只需记录
                addLog(`   🔥 正在围攻敌城${currentCity.name}`, 'macedonia');
            } else {
                addLog(`   ⚠️ 无法围城：${currentCity.name}不是敌方城市`, 'macedonia');
            }
            
            await this.delay(500);
        } catch (error) {
            addLog(`   ❌ 围城失败：${error}`, 'macedonia');
        }
    },

    /**
     * 执行整编
     */
    async executeReorganize(army) {
        addLog(`   🔧 ${army.commander} 进行整编`, 'macedonia');
        
        try {
            executeReorganize();
            await this.delay(800);
        } catch (error) {
            addLog(`   ❌ 整编失败：${error}`, 'macedonia');
        }
    },

    /**
     * 执行征召
     */
    async executeRecruit(army) {
        addLog(`   📣 ${army.commander} 进行征召`, 'macedonia');
        
        try {
            executeRecruit();
            await this.delay(800);
        } catch (error) {
            addLog(`   ❌ 征召失败：${error}`, 'macedonia');
        }
    },

    /**
     * 处理攻击决策（战斗前）- 完全照抄罗马AI
     */
    async handleAttackDecision(attackerArmy, defenderArmy, city) {
        // 检查是否是AI控制的阵营
        if (!this.config.enabled || attackerArmy.faction !== 'macedonia') {
            return true; // 不是AI控制的军队，继续进攻
        }

        // addLog(`🤖 马其顿AI正在准备进攻...`, 'macedonia');

        // 第一步：请求所有可能的援军（包括同盟）
        addLog(`📢 ${attackerArmy.commander} 向附近己方军队和同盟请求援军...`, 'macedonia');
        
        const supportRequested = await this.requestAllSupport(attackerArmy, defenderArmy, city);
        
        if (supportRequested) {
            addLog(`✅ 援军请求已发送，等待支援到达`, 'macedonia');
            await this.delay(1500);
        } else {
            addLog(`ℹ️ 附近无可用援军，${attackerArmy.commander} 将独自进攻`, 'macedonia');
        }

        // 第二步：使用综合战力评估（包含潜在援军）
        const myResult = this.calculateComprehensivePower(attackerArmy, city.id, 'macedonia');
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(city.id, defenderArmy.faction);
        const enemyPower = enemyResult.totalPower;
        
        const powerRatio = myPower / enemyPower;

        addLog(`⚖️ 综合实力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)} (${powerRatio.toFixed(2)}:1)`, 'macedonia');

        // 第三步：决定是否继续进攻
        if (myPower > enemyPower) {
            addLog(`⚔️ 综合战力占据优势，${attackerArmy.commander} 发起进攻！`, 'macedonia');
            return true; // 继续进攻
        } else {
            addLog(`⚠️ 即使考虑潜在援军后仍处于劣势(${powerRatio.toFixed(2)}:1)，但已经承诺进攻`, 'macedonia');
            return true; // 仍然继续进攻（因为已经主动攻击了）
        }
    },

    /**
     * 请求所有可用援军（己方+同盟）- 完全照抄罗马AI
     */
    async requestAllSupport(requestingArmy, enemyArmy, city) {
        // 获取所有己方军队
        const myArmies = armies.macedonia || [];
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

        addLog(`📡 发现${supportArmies.length}支可能的援军：`, 'macedonia');
        for (const { army, distance } of supportArmies) {
            const cityName = this.getCityName(army.location);
            const distanceText = distance === 0 ? '同城' : `${distance}步`;
            addLog(`   - ${army.commander} (${cityName}，距离${distanceText})`, 'macedonia');
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
                addLog(`   ❌ ${army.commander} 支援失败 (2D6=${diceTotal} > 10)`, 'macedonia');
            }
            
            // 短暂延迟
            await this.delay(300);
        }

        if (totalSupported > 0) {
            addLog(`✅ 成功获得${totalSupported}支援军！`, 'macedonia');
            // 更新地图显示
            if (typeof placeArmies === 'function') {
                placeArmies();
            }
        }
        
        return totalSupported > 0;
    },

    /**
     * AI执行援军支援（不显示弹窗）- 完全照抄罗马AI
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
            addLog(`   ⚠️ ${reinforcingArmy.commander} 兵力不足，无法提供支援`, 'macedonia');
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
        addLog(`   ✅ ${reinforcingArmy.commander} 承诺提供援军支援 (2D6=${dice1}+${dice2}，支援战力${supportPercentage}%)`, 'macedonia');
        
        const details = [];
        if (lightCavSupport > 0) details.push(`轻骑兵${lightCavSupport}人`);
        if (heavyCavSupport > 0) details.push(`重骑兵${heavyCavSupport}人`);
        if (heavyInfSupport > 0) details.push(`重步兵${heavyInfSupport}人`);
        if (lightInfSupport > 0) details.push(`轻步兵${lightInfSupport}人`);
        
        if (details.length > 0) {
            addLog(`      援军战力：${details.join(', ')}（参与战斗计算但不转移兵力）`, 'macedonia');
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
     * 处理防御决策（被攻击时）- 完全照抄罗马AI
     */
    async handleDefenseDecision(defenderArmy, attackerArmy, city) {
        // 检查是否是AI控制的阵营（注意：不检查shouldControl，因为可能是对方回合攻击过来）
        if (!this.config.enabled || defenderArmy.faction !== 'macedonia') {
            return null; // 不是AI控制的军队
        }

        // addLog(`🤖 马其顿AI正在评估防御策略...`, 'macedonia');

        // 第一步：AI自动请求同城和周边所有地区的援军
        addLog(`📢 ${defenderArmy.commander} 向附近己方军队请求援军...`, 'macedonia');
        
        const supportRequested = await this.requestAllSupport(defenderArmy, attackerArmy, city);
        
        if (supportRequested) {
            addLog(`✅ 援军请求已发送，等待支援到达`, 'macedonia');
            await this.delay(1500);
        } else {
            addLog(`ℹ️ 附近无可用援军，${defenderArmy.commander} 将独自应战`, 'macedonia');
        }

        // 第二步：使用综合战力评估（包含请求完援军后的战力）
        const myResult = this.calculateComprehensivePower(defenderArmy, city.id, 'macedonia');
        const myPower = myResult.totalPower;
        
        const enemyResult = this.calculateEnemyComprehensivePower(city.id, attackerArmy.faction);
        const enemyPower = enemyResult.totalPower;
        
        const powerRatio = myPower / enemyPower;

        addLog(`⚖️ 综合实力对比：我方${myPower.toFixed(0)} vs 敌方${enemyPower.toFixed(0)} (${powerRatio.toFixed(2)}:1)`, 'macedonia');

        // 第三步：根据城市阵营和实力对比做出决策
        const isMyCity = this.isFriendlyCity(city);
        const powerGap = enemyPower - myPower;
        
        if (isMyCity) {
            // ========== (二) 当前处于友方城市（己方或联盟）==========
            const cityType = city.faction === 'macedonia' ? '己方' : '联盟';
            addLog(`📍 当前位于${cityType}城市 ${city.name}`, 'macedonia');
            
            if (myPower > enemyPower * 0.9) {
                // (1) 战力 > 敌方×0.9：会战
                addLog(`⚔️ 综合战力优势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定进行会战！`, 'macedonia');
                return {
                    action: 'battle',
                    reason: `${cityType}城市优势会战(${powerRatio.toFixed(2)}:1)`
                };
            } else if (myPower > enemyPower * 0.5) {
                // (2) 敌方×0.5 < 战力 ≤ 敌方×0.9：守城
                addLog(`🛡️ 战力处于中等劣势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定守城！`, 'macedonia');
                addLog(`📝 后续回合将优先征召和整编增强实力`, 'macedonia');
                
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
                        factionDesc = targetCity.faction === 'macedonia' ? '己方' : '联盟';
                    } else if (targetCity.faction === 'neutral') {
                        factionDesc = '中立';
                    }
                    addLog(`🏃 找到${factionDesc}城市可撤退，${defenderArmy.commander} 决定撤退至 ${targetCity.name}`, 'macedonia');
                    return {
                        action: 'retreat',
                        reason: `${cityType}城市严重劣势撤退至${factionDesc}城市(${powerRatio.toFixed(2)}:1)`
                    };
                } else {
                    // 周边无合适撤退目标，守城
                    addLog(`🛡️ 周边无合适撤退目标，${defenderArmy.commander} 决定守城死战！`, 'macedonia');
                    
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
            addLog(`📍 当前位于${cityType} ${city.name}`, 'macedonia');
            
            if (myPower > enemyPower * 0.9) {
                // (1) 战力 > 敌方×0.9：会战
                addLog(`⚔️ 综合战力优势（${powerRatio.toFixed(2)}:1），${defenderArmy.commander} 决定进行会战！`, 'macedonia');
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
                    const factionDesc = targetCity.faction === 'macedonia' ? '己方' : '中立';
                    addLog(`🏃 找到${factionDesc}城市可撤退，${defenderArmy.commander} 决定撤退至 ${targetCity.name}`, 'macedonia');
                    return {
                        action: 'retreat',
                        reason: `${cityType}劣势撤退至${factionDesc}城市(${powerRatio.toFixed(2)}:1)`
                    };
                } else {
                    // 周边无合适撤退目标，会战
                    addLog(`⚔️ 周边无合适撤退目标，${defenderArmy.commander} 决定进行会战！`, 'macedonia');
                    return {
                        action: 'battle',
                        reason: `${cityType}无路可退会战(${powerRatio.toFixed(2)}:1，差距${powerGap.toFixed(0)})`
                    };
                }
            }
        }
    },

    /**
     * 寻找最佳撤退目标（只考虑中立城市和己方城市）- 完全照抄罗马AI
     */
    findBestRetreatTarget(defenderArmy, attackerArmy) {
        const currentLocation = defenderArmy.location;
        const connectedCities = getConnectedCities(currentLocation);
        
        if (!connectedCities || connectedCities.length === 0) {
            return null;
        }

        const enemyFaction = attackerArmy.faction;
        let bestTarget = null;
        let bestPriority = -1;

        addLog(`   🔍 评估周边撤退目标...`, 'macedonia');

        for (const cityId of connectedCities) {
            const city = cities.find(c => c.id === cityId);
            if (!city) continue;

            // 【关键1】海路连接不能作为撤退路线
            if (this.isSeaRoute(currentLocation, cityId)) {
                addLog(`   ❌ ${city.name}(海路) - 海路不能作为撤退路线`, 'macedonia');
                continue;
            }

            // 【关键2】只考虑中立城市和己方城市，不考虑敌方城市
            if (city.faction !== 'neutral' && city.faction !== 'macedonia') {
                addLog(`   ❌ ${city.name}(敌方城市) - 不考虑撤退到敌方城市`, 'macedonia');
                continue;
            }

            let priority = 0;
            let reason = '';

            // 优先级1：己方城市 > 中立城市
            if (city.faction === 'macedonia') {
                priority += 100;
                reason = '己方城市';
            } else if (city.faction === 'neutral') {
                priority += 50;
                reason = '中立城市';
            }

            // 优先级2：无敌军 > 有敌军
            const enemiesAtCity = CityArmyManager.getArmiesAtCityByFaction(cityId, enemyFaction);
            if (enemiesAtCity.length === 0) {
                priority += 50;
                reason += '(无敌军)';
            } else {
                reason += '(有敌军)';
            }

            // 优先级3：经济分高的城市
            priority += (city.economicScore || 1);

            addLog(`   ${city.name}: ${reason}, 优先级${priority}`, 'macedonia');

            if (priority > bestPriority) {
                bestPriority = priority;
                bestTarget = cityId;
            }
        }

        return bestTarget;
    }
};

console.log('🤖 马其顿AI控制器已加载');


