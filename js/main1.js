// ==================== 联盟支援系统 ====================

/**
 * 获取指定阵营的盟友阵营
 */
function getAllyFaction(faction) {
    if (faction === 'rome' && typeof AIController !== 'undefined') {
        return AIController.getAllyFaction();
    } else if (faction === 'carthage' && typeof CarthageAIController !== 'undefined') {
        return CarthageAIController.getAllyFaction();
    } else if (faction === 'macedonia' && typeof MacedoniaAIController !== 'undefined') {
        return MacedoniaAIController.getAllyFaction();
    } else if (faction === 'seleucid' && typeof SeleucidAIController !== 'undefined') {
        return SeleucidAIController.getAllyFaction();
    } else if (faction === 'ptolemy' && typeof PtolemyAIController !== 'undefined') {
        return PtolemyAIController.getAllyFaction();
    }
    return null;
}

/**
 * 获取某城市的盟友军队
 */
function getAllyArmiesAtCity(cityId, faction) {
    const allyFaction = getAllyFaction(faction);
    if (!allyFaction) return [];
    
    return CityArmyManager.getArmiesAtCityByFaction(cityId, allyFaction);
}

/**
 * 获取相邻城市的盟友军队
 */
function getAllyArmiesInNeighbor(cityId, faction) {
    const allyFaction = getAllyFaction(faction);
    if (!allyFaction) return [];
    
    const connectedCities = getConnectedCities(cityId);
    const neighborAllies = [];
    
    connectedCities.forEach(neighborCityId => {
        const armiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(neighborCityId, allyFaction);
        armiesInNeighbor.forEach(army => {
            const cityName = cities.find(c => c.id === neighborCityId)?.name || '未知';
            neighborAllies.push({
                army: army,
                cityName: cityName,
                cityId: neighborCityId
            });
        });
    });
    
    return neighborAllies;
}

/**
 * 获取同城的己方友军
 */
function getFriendlyArmiesAtCity(cityId, faction, excludeArmyId) {
    const armiesAtCity = CityArmyManager.getArmiesAtCityByFaction(cityId, faction);
    return armiesAtCity.filter(army => army.id !== excludeArmyId);
}

/**
 * 获取相邻城市的己方友军
 */
function getFriendlyArmiesInNeighbor(cityId, faction) {
    const connectedCities = getConnectedCities(cityId);
    const neighborFriendlies = [];
    
    connectedCities.forEach(neighborCityId => {
        const armiesInNeighbor = CityArmyManager.getArmiesAtCityByFaction(neighborCityId, faction);
        armiesInNeighbor.forEach(army => {
            const cityName = cities.find(c => c.id === neighborCityId)?.name || '未知';
            neighborFriendlies.push({
                army: army,
                cityName: cityName,
                cityId: neighborCityId
            });
        });
    });
    
    return neighborFriendlies;
}

/**
 * 计算包含联盟和友军支援的综合战斗力
 * @param {Object} mainArmy - 主力军队
 * @param {string} cityId - 战斗城市ID
 * @param {boolean} autoRequestSupport - 是否自动请求支援（AI用）
 * @returns {Object} { totalPower, mainPower, sameCityPower, neighborPower, details }
 */
function calculateAllianceCombatPower(mainArmy, cityId, autoRequestSupport = true) {
    const result = {
        mainPower: calculateCombatPower(mainArmy),
        sameCityFriendlyPower: 0,
        neighborFriendlyPower: 0,
        sameCityAllyPower: 0,
        neighborAllyPower: 0,
        totalPower: 0,
        details: {
            sameCityFriendlies: [],
            neighborFriendlies: [],
            sameCityAllies: [],
            neighborAllies: []
        }
    };
    
    result.totalPower = result.mainPower;
    
    // 1. 同城己方友军 × 0.5
    const sameCityFriendlies = getFriendlyArmiesAtCity(cityId, mainArmy.faction, mainArmy.id);
    sameCityFriendlies.forEach(army => {
        const power = calculateCombatPower(army);
        result.sameCityFriendlyPower += power * 0.5;
        result.details.sameCityFriendlies.push({
            commander: army.commander,
            power: power
        });
    });
    
    // 2. 相邻己方友军 × 0.5
    if (autoRequestSupport) {
        const neighborFriendlies = getFriendlyArmiesInNeighbor(cityId, mainArmy.faction);
        neighborFriendlies.forEach(item => {
            const power = calculateCombatPower(item.army);
            result.neighborFriendlyPower += power * 0.5;
            result.details.neighborFriendlies.push({
                commander: item.army.commander,
                power: power,
                cityName: item.cityName
            });
        });
    }
    
    // 3. 同城盟友军队 × 0.5
    const sameCityAllies = getAllyArmiesAtCity(cityId, mainArmy.faction);
    sameCityAllies.forEach(army => {
        const power = calculateCombatPower(army);
        result.sameCityAllyPower += power * 0.5;
        result.details.sameCityAllies.push({
            commander: army.commander,
            power: power,
            faction: army.faction
        });
    });
    
    // 4. 相邻盟友军队 × 0.5
    if (autoRequestSupport) {
        const neighborAllies = getAllyArmiesInNeighbor(cityId, mainArmy.faction);
        neighborAllies.forEach(item => {
            const power = calculateCombatPower(item.army);
            result.neighborAllyPower += power * 0.5;
            result.details.neighborAllies.push({
                commander: item.army.commander,
                power: power,
                cityName: item.cityName,
                faction: item.army.faction
            });
        });
    }
    
    result.totalPower += result.sameCityFriendlyPower + result.neighborFriendlyPower + 
                         result.sameCityAllyPower + result.neighborAllyPower;
    
    return result;
}

/**
 * 生成支援详情日志
 */
function logSupportDetails(armyCommander, faction, result) {
    const getFactionName = (f) => {
        if (f === 'rome') return '罗马';
        if (f === 'carthage') return '迦太基';
        if (f === 'macedonia') return '马其顿';
        if (f === 'seleucid') return '塞琉古';
        if (f === 'ptolemy') return '托勒密';
        return '未知';
    };
    
    let hasSupport = false;
    
    // 同城友军
    if (result.details.sameCityFriendlies.length > 0) {
        hasSupport = true;
        const commanders = result.details.sameCityFriendlies.map(f => f.commander).join('、');
        addLog(`  🛡️ 同城友军支援：${commanders}（+${result.sameCityFriendlyPower.toFixed(0)}战力）`, faction);
    }
    
    // 相邻友军
    if (result.details.neighborFriendlies.length > 0) {
        hasSupport = true;
        result.details.neighborFriendlies.forEach(f => {
            addLog(`  🛡️ ${f.cityName}友军支援：${f.commander}（+${(f.power * 0.5).toFixed(0)}战力）`, faction);
        });
    }
    
    // 同城盟友
    if (result.details.sameCityAllies.length > 0) {
        hasSupport = true;
        result.details.sameCityAllies.forEach(a => {
            addLog(`  🤝 同城${getFactionName(a.faction)}盟友：${a.commander}（+${(a.power * 0.5).toFixed(0)}战力）`, faction);
        });
    }
    
    // 相邻盟友
    if (result.details.neighborAllies.length > 0) {
        hasSupport = true;
        result.details.neighborAllies.forEach(a => {
            addLog(`  🤝 ${a.cityName}${getFactionName(a.faction)}盟友：${a.commander}（+${(a.power * 0.5).toFixed(0)}战力）`, faction);
        });
    }
    
    if (hasSupport) {
        const supportPower = result.totalPower - result.mainPower;
        addLog(`  ✨ ${armyCommander}总战力：${result.mainPower} + ${supportPower.toFixed(0)}支援 = ${result.totalPower.toFixed(0)}`, faction);
    }
}

// ==================== 会战系统 ====================

// 会战系统
class BattleSystem {
    static currentBattle = null;
    static battlePhase = 0;
    static defenseChoice = null;
    
    // 检查城市中是否有敌对军队需要会战
    static checkForBattle(cityId) {
        const armiesAtCity = CityArmyManager.getArmiesAtCity(cityId);
        if (armiesAtCity.length < 2) return false;
        
        // 检查是否有不同阵营的军队
        const factions = [...new Set(armiesAtCity.map(army => army.faction))];
        if (factions.length < 2) return false;
        
        // 找到最后进入的军队作为攻击方
        const attackerArmy = this.getLastMovedArmy(armiesAtCity);
        if (!attackerArmy) return false;
        
        // 找到防御方军队
        const defenderArmy = armiesAtCity.find(army => army.faction !== attackerArmy.faction);
        if (!defenderArmy) return false;
        
        // 显示防御方选择弹窗
        this.showDefenseChoiceModal(cityId, attackerArmy, defenderArmy);
        return true;
    }
    
    // 获取最后移动的军队（攻击方）
    static getLastMovedArmy(armiesAtCity) {
        // 简化实现：当前玩家的军队为攻击方
        const currentPlayerArmies = armiesAtCity.filter(army => army.faction === gameState.currentPlayer);
        return currentPlayerArmies[0] || null;
    }
    
    // 显示防御方选择弹窗
    static async showDefenseChoiceModal(cityId, attackerArmy, defenderArmy) {
        const city = cities.find(c => c.id === cityId);
        
        // 保存选择数据
        this.defenseChoice = {
            cityId: cityId,
            cityName: city.name,
            attacker: attackerArmy,
            defender: defenderArmy
        };
        
        // 更新弹窗内容
        const getFactionName = (faction) => {
            if (faction === 'rome') return '罗马';
            if (faction === 'carthage') return '迦太基';
            if (faction === 'macedonia') return '马其顿';
            if (faction === 'seleucid') return '塞琉古';
            if (faction === 'ptolemy') return '托勒密';
            return '未知';
        };
        const attackerFactionName = getFactionName(attackerArmy.faction);
        const defenderFactionName = getFactionName(defenderArmy.faction);
        
        document.getElementById('defenseChoiceTitle').textContent = `${attackerFactionName}军队来袭！`;
        document.getElementById('defenseSituation').textContent = 
            `${attackerArmy.commander}${attackerFactionName}军队进入${city.name}${defenderArmy.commander}如何应对？`;
        
        // 更新军队信息
        document.getElementById('defenseAttackerInfo').textContent = `指挥官：${attackerArmy.commander}`;
        document.getElementById('defenseDefenderInfo').textContent = `指挥官：${defenderArmy.commander}`;
        
        // 计算战斗战斗力
        const attackerPower = calculateCombatPower(attackerArmy);
        const defenderPower = calculateCombatPower(defenderArmy);
        document.getElementById('defenseAttackerPower').textContent = `战斗力：${attackerPower}`;
        document.getElementById('defenseDefenderPower').textContent = `战斗力：${defenderPower}`;
        
        // 检查是否可以守城（防御方在己方城市）
        const siegeBtn = document.getElementById('siegeChoiceBtn');
        if (city.faction === defenderArmy.faction) {
            siegeBtn.style.display = 'block';
        } else {
            siegeBtn.style.display = 'none';
        }
        
        // 检查防御方是否是AI控制（注意：不能用shouldControl，因为当前可能是攻击方回合）
        const isDefenderAI = (typeof AIController !== 'undefined' && 
            AIController.config.enabled &&
            defenderArmy.faction === AIController.config.controlledFaction) ||
            (typeof CarthageAIController !== 'undefined' &&
            CarthageAIController.config.enabled &&
            defenderArmy.faction === 'carthage') ||
            (typeof MacedoniaAIController !== 'undefined' &&
            MacedoniaAIController.config.enabled &&
            defenderArmy.faction === 'macedonia') ||
            (typeof SeleucidAIController !== 'undefined' &&
            SeleucidAIController.config.enabled &&
            defenderArmy.faction === 'seleucid') ||
            (typeof PtolemyAIController !== 'undefined' &&
            PtolemyAIController.config.enabled &&
            defenderArmy.faction === 'ptolemy');
        
        // 显示弹窗
        document.getElementById('defenseChoiceModal').style.display = 'flex';
        
        // 获取按钮元素
        const battleBtn = document.querySelector('.battle-choice');
        const retreatBtn = document.querySelector('.retreat-choice');
        const siegeChoiceBtn = document.getElementById('siegeChoiceBtn');
        const requestSupportBtn = document.querySelector('#defenseChoiceModal button[onclick="requestReinforcements()"]');
        
        // 如果防御方是玩家，确保按钮可用
        if (!isDefenderAI) {
            if (battleBtn) {
                battleBtn.disabled = false;
                battleBtn.style.opacity = '1';
                battleBtn.style.cursor = 'pointer';
            }
            if (retreatBtn) {
                retreatBtn.disabled = false;
                retreatBtn.style.opacity = '1';
                retreatBtn.style.cursor = 'pointer';
            }
            if (siegeChoiceBtn) {
                siegeChoiceBtn.disabled = false;
                siegeChoiceBtn.style.opacity = '1';
                siegeChoiceBtn.style.cursor = 'pointer';
            }
            if (requestSupportBtn) {
                requestSupportBtn.disabled = false;
                requestSupportBtn.style.backgroundColor = '#3498db';
                requestSupportBtn.style.cursor = 'pointer';
                requestSupportBtn.style.opacity = '1';
                requestSupportBtn.textContent = '请求支援';
            }
        }
        
        // 如果防御方是AI，禁用所有按钮并显示AI思考提示
        if (isDefenderAI) {
            // 禁用所有选择按钮
            if (battleBtn) {
                battleBtn.disabled = true;
                battleBtn.style.opacity = '0.5';
                battleBtn.style.cursor = 'not-allowed';
            }
            if (retreatBtn) {
                retreatBtn.disabled = true;
                retreatBtn.style.opacity = '0.5';
                retreatBtn.style.cursor = 'not-allowed';
            }
            if (siegeChoiceBtn) {
                siegeChoiceBtn.disabled = true;
                siegeChoiceBtn.style.opacity = '0.5';
                siegeChoiceBtn.style.cursor = 'not-allowed';
            }
            if (requestSupportBtn) {
                requestSupportBtn.disabled = true;
                requestSupportBtn.style.backgroundColor = '#95a5a6';
                requestSupportBtn.style.cursor = 'not-allowed';
                requestSupportBtn.style.opacity = '0.5';
                requestSupportBtn.textContent = '请求支援（AI已自动请求）';
            }
            
            // 显示AI思考提示
            const situationElement = document.getElementById('defenseSituation');
            const originalText = situationElement.textContent;
            situationElement.innerHTML = `${originalText}<br><br><span style="color: #3498db; font-weight: bold;">🤖 AI正在评估战场态势...</span>`;
            
            // addLog(`🤖 AI控制的${defenderArmy.commander}正在做出防御决策...`, defenderArmy.faction);
            
            // 延迟1秒让玩家看到弹窗
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 调用AI防御决策 - 根据阵营选择对应的AI控制器
            let decision = null;
            if (defenderArmy.faction === 'rome' && typeof AIController !== 'undefined') {
                decision = await AIController.handleDefenseDecision(defenderArmy, attackerArmy, city);
            } else if (defenderArmy.faction === 'carthage' && typeof CarthageAIController !== 'undefined') {
                decision = await CarthageAIController.handleDefenseDecision(defenderArmy, attackerArmy, city);
            } else if (defenderArmy.faction === 'macedonia' && typeof MacedoniaAIController !== 'undefined') {
                decision = await MacedoniaAIController.handleDefenseDecision(defenderArmy, attackerArmy, city);
            } else if (defenderArmy.faction === 'seleucid' && typeof SeleucidAIController !== 'undefined') {
                decision = await SeleucidAIController.handleDefenseDecision(defenderArmy, attackerArmy, city);
            } else if (defenderArmy.faction === 'ptolemy' && typeof PtolemyAIController !== 'undefined') {
                decision = await PtolemyAIController.handleDefenseDecision(defenderArmy, attackerArmy, city);
            }
            
            if (decision) {
                // 更新提示为AI决策结果
                situationElement.innerHTML = `${originalText}<br><br><span style="color: #27ae60; font-weight: bold;">🎯 AI决策：${decision.reason}</span>`;
                // addLog(`🎯 AI决策：${decision.reason}`, defenderArmy.faction);
                
                // 延迟1秒后自动执行决策
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 自动执行决策
                chooseDefenseAction(decision.action);
            }
        }
    }
    
    // 开始会战
    static startBattle(cityId, attackerArmy, allArmies) {
        const city = cities.find(c => c.id === cityId);
        const defenderArmy = allArmies.find(army => army.faction !== attackerArmy.faction);
        
        if (!defenderArmy) return;
        
        // 从defenseChoice中获取isActiveAttack标志
        const isActiveAttack = this.defenseChoice ? this.defenseChoice.isActiveAttack : false;
        
        // 创建会战数据
        this.currentBattle = {
            cityId: cityId,
            cityName: city.name,
            attacker: this.cloneArmy(attackerArmy),
            defender: this.cloneArmy(defenderArmy),
            phase: 0,
            log: [],
            isActiveAttack: isActiveAttack // 保存主动攻击标志
        };
        
        this.battlePhase = 0;
        this.showBattleModal();
        this.addBattleLog(`${city.name}展开激烈会战！`, 'phase-start');
        const getFactionName = (faction) => {
            if (faction === 'rome') return '罗马';
            if (faction === 'carthage') return '迦太基';
            if (faction === 'macedonia') return '马其顿';
            if (faction === 'seleucid') return '塞琉古';
            if (faction === 'ptolemy') return '托勒密';
            return '未知';
        };
        this.addBattleLog(`攻击方：${attackerArmy.commander}（${getFactionName(attackerArmy.faction)}）`, 'info');
        this.addBattleLog(`防御方：${defenderArmy.commander}（${getFactionName(defenderArmy.faction)}）`, 'info');
    }
    
    // 克隆军队数据
    static cloneArmy(army) {
        return {
            ...army,
            lightCavalry: army.lightCavalry || 2000,
            heavyCavalry: army.heavyCavalry || 1000,
            heavyInfantry: army.heavyInfantry || 20000,
            lightInfantry: army.lightInfantry || 2000,
            morale: army.morale || 5.0
        };
    }
    
    // 显示会战弹窗
    static showBattleModal() {
        const modal = document.getElementById('battleModal');
        const battle = this.currentBattle;
        
        // 更新标题和位置
        document.getElementById('battleTitle').textContent = `${battle.cityName}会战`;
        document.getElementById('battleLocation').textContent = `战场${battle.cityName}`;
        
        // 更新攻击方信息
        document.getElementById('attackerInfo').textContent = `指挥官：${battle.attacker.commander}`;
        this.updateArmyDisplay('attacker', battle.attacker);
        
        // 更新防御方信息
        document.getElementById('defenderInfo').textContent = `指挥官：${battle.defender.commander}`;
        this.updateArmyDisplay('defender', battle.defender);
        
        // 重置阶段指示
        for (let i = 1; i <= 4; i++) {
            const phase = document.getElementById(`phase${i}`);
            phase.className = 'phase';
        }
        document.getElementById('phase1').classList.add('active');
        
        // 重置按钮状态
        const nextPhaseBtn = document.getElementById('nextPhaseBtn');
        const closeBattleBtn = document.getElementById('closeBattleBtn');
        
        nextPhaseBtn.style.display = 'inline-block';
        nextPhaseBtn.textContent = '开始第一阶段';
        nextPhaseBtn.disabled = false; // 重置按钮为可用状态
        closeBattleBtn.style.display = 'none';
        
        // 清空战斗记录
        document.getElementById('battleLogContent').innerHTML = '';
        
        // 显示弹窗
        modal.style.display = 'flex';
    }
    
    // 更新军队显示
    static updateArmyDisplay(side, army) {
        document.getElementById(`${side}LightCav`).textContent = Math.floor(army.lightCavalry);
        document.getElementById(`${side}HeavyCav`).textContent = Math.floor(army.heavyCavalry);
        document.getElementById(`${side}HeavyInf`).textContent = Math.floor(army.heavyInfantry);
        document.getElementById(`${side}LightInf`).textContent = Math.floor(army.lightInfantry);
        document.getElementById(`${side}Morale`).textContent = army.morale.toFixed(1);
    }
    
    // 添加战斗记录
    static addBattleLog(message, type = 'info') {
        const logContent = document.getElementById('battleLogContent');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    // 进行下一阶段战斗
    static nextPhase() {
        // 防止在会战已完成后继续调用nextPhase
        if (this.currentBattle && this.currentBattle.completed) {
            return;
        }
        
        this.battlePhase++;
        
        switch (this.battlePhase) {
            case 1:
                this.lightCavalryBattle();
                break;
            case 2:
                this.cavalryBattle();
                break;
            case 3:
                this.lightInfantryBattle();
                break;
            case 4:
                this.finalBattle();
                break;
            default:
                this.endBattle();
                break;
        }
    }
    
    // 第一阶段：轻骑兵战斗
    static lightCavalryBattle() {
        this.updatePhaseIndicator(1);
        this.addBattleLog('=== 第一阶段：轻骑兵战斗 ===', 'phase-start');
        
        const attacker = this.currentBattle.attacker;
        const defender = this.currentBattle.defender;
        
        // 计算战斗战斗力
        const attackerPower = attacker.lightCavalry * 3 * attacker.morale * attacker.military;
        const defenderPower = defender.lightCavalry * 3 * defender.morale * defender.military;
        
        this.addBattleLog(`攻击方轻骑兵战斗力：${Math.floor(attackerPower)}`);
        this.addBattleLog(`防御方轻骑兵战斗力：${Math.floor(defenderPower)}`);
        
        const result = this.calculateBattleResult(attackerPower, defenderPower);
        
        if (result.attackerWins) {
            this.addBattleLog('攻击方轻骑兵获胜', 'victory');
            // 失败方损耗
            defender.lightCavalry *= (1 - this.getRandomLoss(0.1, 0.2));
            defender.morale -= 0.5;
            // 胜利方损耗
            attacker.lightCavalry *= (1 - this.getRandomLoss(0.05, 0.1));
        } else {
            this.addBattleLog('防御方轻骑兵获胜', 'victory');
            // 失败方损耗
            attacker.lightCavalry *= (1 - this.getRandomLoss(0.1, 0.2));
            attacker.morale -= 0.5;
            // 胜利方损耗
            defender.lightCavalry *= (1 - this.getRandomLoss(0.05, 0.1));
        }
        
        this.updateArmyDisplay('attacker', attacker);
        this.updateArmyDisplay('defender', defender);
        
        document.getElementById('nextPhaseBtn').textContent = '开始第二阶段';
    }
    
    // 第二阶段：轻骑兵+重骑兵战斗
    static cavalryBattle() {
        this.updatePhaseIndicator(2);
        this.addBattleLog('=== 第二阶段：轻骑兵+重骑兵战斗 ===', 'phase-start');
        
        const attacker = this.currentBattle.attacker;
        const defender = this.currentBattle.defender;
        
        // 计算战斗战斗力
        const attackerPower = (attacker.lightCavalry * 3 + attacker.heavyCavalry * 5) * attacker.morale * attacker.military;
        const defenderPower = (defender.lightCavalry * 3 + defender.heavyCavalry * 5) * defender.morale * defender.military;
        
        this.addBattleLog(`攻击方骑兵战斗力${Math.floor(attackerPower)}`);
        this.addBattleLog(`防御方骑兵战斗力${Math.floor(defenderPower)}`);
        
        const result = this.calculateBattleResult(attackerPower, defenderPower);
        
        if (result.attackerWins) {
            this.addBattleLog('攻击方骑兵获胜！', 'victory');
            // 失败方损耗
            defender.lightCavalry *= (1 - this.getRandomLoss(0.1, 0.2));
            defender.heavyCavalry *= (1 - this.getRandomLoss(0.1, 0.2));
            defender.morale -= 0.5;
            // 胜利方损耗
            attacker.lightCavalry *= (1 - this.getRandomLoss(0.05, 0.1));
            attacker.heavyCavalry *= (1 - this.getRandomLoss(0.05, 0.1));
            attacker.morale += 0.5;
        } else {
            this.addBattleLog('防御方骑兵获胜！', 'victory');
            // 失败方损耗
            attacker.lightCavalry *= (1 - this.getRandomLoss(0.1, 0.2));
            attacker.heavyCavalry *= (1 - this.getRandomLoss(0.1, 0.2));
            attacker.morale -= 0.5;
            // 胜利方损耗
            defender.lightCavalry *= (1 - this.getRandomLoss(0.05, 0.1));
            defender.heavyCavalry *= (1 - this.getRandomLoss(0.05, 0.1));
            defender.morale += 0.5;
        }
        
        this.updateArmyDisplay('attacker', attacker);
        this.updateArmyDisplay('defender', defender);
        
        document.getElementById('nextPhaseBtn').textContent = '开始第三阶段';
    }
    
    // 第三阶段：轻装兵战斗
    static lightInfantryBattle() {
        this.updatePhaseIndicator(3);
        this.addBattleLog('=== 第三阶段：轻装兵战斗 ===', 'phase-start');
        
        const attacker = this.currentBattle.attacker;
        const defender = this.currentBattle.defender;
        
        // 计算战斗战斗力
        const attackerPower = attacker.lightInfantry * 1 * attacker.morale * attacker.military;
        const defenderPower = defender.lightInfantry * 1 * defender.morale * defender.military;
        
        this.addBattleLog(`攻击方轻装兵战斗力：${Math.floor(attackerPower)}`);
        this.addBattleLog(`防御方轻装兵战斗力：${Math.floor(defenderPower)}`);
        
        const result = this.calculateBattleResult(attackerPower, defenderPower);
        
        if (result.attackerWins) {
            this.addBattleLog('攻击方轻装兵获胜', 'victory');
            // 失败方损耗
            defender.lightInfantry *= (1 - this.getRandomLoss(0.1, 0.2));
            // 胜利方损耗
            attacker.lightInfantry *= (1 - this.getRandomLoss(0.05, 0.1));
        } else {
            this.addBattleLog('防御方轻装兵获胜', 'victory');
            // 失败方损耗
            attacker.lightInfantry *= (1 - this.getRandomLoss(0.1, 0.2));
            // 胜利方损耗
            defender.lightInfantry *= (1 - this.getRandomLoss(0.05, 0.1));
        }
        
        this.updateArmyDisplay('attacker', attacker);
        this.updateArmyDisplay('defender', defender);
        
        document.getElementById('nextPhaseBtn').textContent = '开始决战';
    }
    
    // 第四阶段：总决战
    static finalBattle() {
        this.updatePhaseIndicator(4);
        this.addBattleLog('=== 第四阶段：总决战 ===', 'phase-start');
        
        const attacker = this.currentBattle.attacker;
        const defender = this.currentBattle.defender;
        
        // 计算总战斗力
        const attackerPower = (attacker.lightCavalry * 3 + attacker.heavyCavalry * 5 + 
                            attacker.heavyInfantry * 2 + attacker.lightInfantry * 1) * 
                            attacker.morale * attacker.military;
        const defenderPower = (defender.lightCavalry * 3 + defender.heavyCavalry * 5 + 
                            defender.heavyInfantry * 2 + defender.lightInfantry * 1) * 
                            defender.morale * defender.military;
        
        this.addBattleLog(`攻击方总战斗力${Math.floor(attackerPower)}`);
        this.addBattleLog(`防御方总战斗力${Math.floor(defenderPower)}`);
        
        const result = this.calculateBattleResult(attackerPower, defenderPower);
        
        if (result.attackerWins) {
            this.addBattleLog(`${attacker.commander} 获得决定性胜利！`, 'victory');
            this.currentBattle.winner = 'attacker';
            // 失败方重大损耗
            this.applyFinalDefeat(defender);
            // 胜利方轻微损失并恢复士气
            this.applyFinalVictory(attacker);
        } else {
            this.addBattleLog(`${defender.commander} 获得决定性胜利！`, 'victory');
            this.currentBattle.winner = 'defender';
            // 失败方重大损耗
            this.applyFinalDefeat(attacker);
            // 胜利方轻微损失并恢复士气
            this.applyFinalVictory(defender);
        }
        
        this.updateArmyDisplay('attacker', attacker);
        this.updateArmyDisplay('defender', defender);
        
        document.getElementById('nextPhaseBtn').textContent = '完成会战';
    }
    
    // 计算战斗结果
    static calculateBattleResult(attackerPower, defenderPower) {
        const ratio = attackerPower / defenderPower;
        const dice = rollDice(2);
        let targetRange;
        
        this.addBattleLog(`战力比值：${ratio.toFixed(2)}`);
        this.addBattleLog(`投掷2D6${dice}`);
        
        if (ratio >= 3) {
            targetRange = [4, 12];
        } else if (ratio >= 2) {
            targetRange = [5, 12];
        } else if (ratio >= 1.25) {
            targetRange = [6, 12];
        } else if (ratio >= 0.8) {
            targetRange = [7, 7];
        } else if (ratio >= 0.5) {
            targetRange = [1, 6];
        } else if (ratio >= 0.3) {
            targetRange = [1, 5];
        } else {
            targetRange = [1, 4];
        }
        
        const attackerWins = dice >= targetRange[0] && dice <= targetRange[1];
        
        this.addBattleLog(`攻击方需要投${targetRange[0]}-${targetRange[1]}${attackerWins ? '成功' : '失败'}`);
        
        return { attackerWins, dice, ratio };
    }
    
    // 获取随机损失百分比
    static getRandomLoss(min, max) {
        return min + Math.random() * (max - min);
    }
    
    // 应用最终战败效果
    static applyFinalDefeat(army) {
        const lossRate = this.getRandomLoss(0.2, 0.3);
        army.lightCavalry *= (1 - lossRate);
        army.heavyCavalry *= (1 - lossRate);
        army.heavyInfantry *= (1 - lossRate);
        army.lightInfantry *= (1 - lossRate);
        army.morale -= 2;
        if (army.morale < 1) army.morale = 1;
        
        this.addBattleLog(`${army.commander} 部队损失${Math.floor(lossRate * 100)}%，士气大幅下降`, 'defeat');
    }
    
    // 应用最终胜利效果
    static applyFinalVictory(army) {
        const lossRate = this.getRandomLoss(0.05, 0.1);
        army.lightCavalry *= (1 - lossRate);
        army.heavyCavalry *= (1 - lossRate);
        army.heavyInfantry *= (1 - lossRate);
        army.lightInfantry *= (1 - lossRate);
        army.morale = 5.0;
        
        this.addBattleLog(`${army.commander} 部队损失${Math.floor(lossRate * 100)}%，士气恢复`, 'victory');
    }
    
    // 更新阶段指示
    static updatePhaseIndicator(currentPhase) {
        for (let i = 1; i <= 4; i++) {
            const phase = document.getElementById(`phase${i}`);
            phase.className = 'phase';
            if (i < currentPhase) {
                phase.classList.add('completed');
            } else if (i === currentPhase) {
                phase.classList.add('active');
            }
        }
    }
    
    // 结束会战
    static endBattle() {
        // 防止重复调用endBattle
        if (this.currentBattle && this.currentBattle.completed) {
            return;
        }
        
        this.addBattleLog('=== 会战结束 ===', 'phase-start');
        
        // 应用结果到游戏中的军队
        this.applyBattleResults();
        
        // 处理败军撤退
        this.handleRetreat();
        
        const nextPhaseBtn = document.getElementById('nextPhaseBtn');
        const closeBattleBtn = document.getElementById('closeBattleBtn');
        
        nextPhaseBtn.style.display = 'none';
        nextPhaseBtn.disabled = true; // 禁用按钮防止重复点击
        
        closeBattleBtn.style.display = 'inline-block';
        
        // 更新游戏日志
        const winner = this.currentBattle.winner === 'attacker' ? this.currentBattle.attacker : this.currentBattle.defender;
        addLog(`${this.currentBattle.cityName}会战结束${winner.commander} 获胜！`, winner.faction);
        
        // 标记会战完成，准备结束回合
        this.currentBattle.completed = true;
    }
    
    // 应用会战结果到游戏中的军队
    static applyBattleResults() {
        const battle = this.currentBattle;
        
        // 更新攻击方军队
        const attackerInGame = getAllArmies().find(army => army.id === battle.attacker.id);
        if (attackerInGame) {
            const attackerDestroyed = this.updateArmyFromBattle(attackerInGame, battle.attacker);
            if (attackerDestroyed) {
                // 如果攻击方被消灭，从战斗数据中也标记
                battle.attackerDestroyed = true;
            }
        }
        
        // 更新防御方军队
        const defenderInGame = getAllArmies().find(army => army.id === battle.defender.id);
        if (defenderInGame) {
            const defenderDestroyed = this.updateArmyFromBattle(defenderInGame, battle.defender);
            if (defenderDestroyed) {
                // 如果防御方被消灭，从战斗数据中也标记
                battle.defenderDestroyed = true;
            }
        }
        
        // 更新UI
        placeArmies();
        if (gameState.selectedArmy) {
            const selectedArmy = getAllArmies().find(army => army.id === gameState.selectedArmy);
            if (selectedArmy) {
                showArmyDetails(selectedArmy);
            }
        }
    }
    
    // 从会战结果更新军队
    static updateArmyFromBattle(gameArmy, battleArmy) {
        gameArmy.lightCavalry = Math.floor(battleArmy.lightCavalry);
        gameArmy.heavyCavalry = Math.floor(battleArmy.heavyCavalry);
        gameArmy.heavyInfantry = Math.floor(battleArmy.heavyInfantry);
        gameArmy.lightInfantry = Math.floor(battleArmy.lightInfantry);
        gameArmy.morale = battleArmy.morale;
        
        // 检查部队是否被消灭（双方<5）
        return this.checkArmyDestroyed(gameArmy);
    }
    
    // 检查部队是否被消灭
    static checkArmyDestroyed(army) {
        // 如果军队已经被标记为消灭，避免重复处理
        if (army.destroyed) {
            return true;
        }
        
        const combatPower = calculateCombatPower(army);
        
        // 双方军队战斗力5以下被消灭
        const destructionThreshold = 5;
        if (combatPower < destructionThreshold) {
            // 标记军队为已消灭，避免重复处理
            army.destroyed = true;
            
            this.addBattleLog(`${army.commander} 的部队战斗力降至 ${combatPower}，部队被消灭！`, 'defeat');
            addLog(`${army.commander} 的部队战斗力过低，部队被消灭！`, army.faction);
            
            // 如果是罗马军队，在罗马重新部署
            if (army.faction === 'rome') {
                respawnRomanArmy(army);
            }
            
            // 从游戏中移除原军队
            const faction = army.faction;
            const armyIndex = armies[faction].findIndex(a => a.id === army.id);
            if (armyIndex >= 0) {
                armies[faction].splice(armyIndex, 1);
            }
            
            // 检查军队被消灭后是否需要解除围城
            checkAllSiegesAfterArmyRemoval();
            
            return true; // 返回true表示部队被消灭
        }
        
        return false; // 返回false表示部队存活
    }
    
    // 处理败军撤退
    static handleRetreat() {
        const battle = this.currentBattle;
        const loser = battle.winner === 'attacker' ? battle.defender : battle.attacker;
        const loserDestroyed = battle.winner === 'attacker' ? battle.defenderDestroyed : battle.attackerDestroyed;
        
        // 如果败军已经被消灭，不需要处理撤退
        if (loserDestroyed) {
            this.addBattleLog(`${loser.commander} 的部队已被完全消灭`, 'defeat');
            return;
        }
        
        const loserInGame = getAllArmies().find(army => army.id === loser.id);
        
        if (!loserInGame) {
            this.addBattleLog(`${loser.commander} 的部队已不存在`, 'defeat');
            return;
        }
        
        // 寻找撤退位置
        const currentCity = loserInGame.location;
        const connectedCities = getConnectedCities(currentCity);
        const retreatOptions = connectedCities.filter(cityId => {
            const city = cities.find(c => c.id === cityId);
            // 排除海路连接和敌方城市
            if (isSeaRoute(currentCity, cityId)) {
                return false; // 海路不能作为撤退路线
            }
            return city && (city.faction === loser.faction || city.faction === 'neutral');
        });
        
        if (retreatOptions.length > 0) {
            // 优先选择己方城市
            const ownCities = retreatOptions.filter(cityId => {
                const city = cities.find(c => c.id === cityId);
                return city && city.faction === loser.faction;
            });
            
            let retreatCity;
            if (ownCities.length > 0) {
                // 有己方城市，优先撤退到己方城市
                retreatCity = ownCities[Math.floor(Math.random() * ownCities.length)];
            } else {
                // 没有己方城市，随机选择中立城市
                retreatCity = retreatOptions[Math.floor(Math.random() * retreatOptions.length)];
            }
            
            const retreatCityName = cities.find(c => c.id === retreatCity).name;
            
            loserInGame.location = retreatCity;
            this.addBattleLog(`${loser.commander} 撤退到${retreatCityName}`, 'defeat');
            addLog(`${loser.commander} 战败后撤退到${retreatCityName}`, loser.faction);
        } else {
            // 无处撤退，部队被全歼
            this.addBattleLog(`${loser.commander} 无处可退，部队全军覆没！`, 'defeat');
            addLog(`${loser.commander} 部队${battle.cityName} 全军覆没！`, loser.faction);
            
            // 从游戏中移除军队
            const faction = loser.faction;
            const armyIndex = armies[faction].findIndex(army => army.id === loser.id);
            if (armyIndex >= 0) {
                armies[faction].splice(armyIndex, 1);
                
                // 检查军队被消灭后是否需要解除围城
                checkAllSiegesAfterArmyRemoval();
            }
        }
    }
}

// 防御方选择处理函数
function chooseDefenseAction(action) {
    const choice = BattleSystem.defenseChoice;
    if (!choice) return;
    
    console.log('[chooseDefenseAction] BattleSystem.defenseChoice =', choice);
    
    const city = cities.find(c => c.id === choice.cityId);
    const isActiveAttack = choice.isActiveAttack || false; // 是否为主动攻击
    
    console.log('[chooseDefenseAction] action =', action, ', isActiveAttack =', isActiveAttack);
    
    switch (action) {
        case 'battle':
            // 判断是攻击方还是防御方
            const isAttackerRequesting = choice.isAttackerRequestingSupport || false;
            
            if (isAttackerRequesting) {
                // 攻击方选择"直接进攻" - 转到防御方面板
                const attackData = window.currentAttackData;
                if (attackData) {
                    addLog(`${attackData.attacker.commander} 发起进攻！`, attackData.attacker.faction);
                    closeDefenseChoice();
                    
                    // 调用initiateAttack显示防御方选择界面（让AI做防御决策）
                    initiateAttack(attackData.attacker, attackData.defender, attackData.city);
                }
            } else {
                // 防御方选择会战
                addLog(`${choice.defender.commander} 选择与 ${choice.attacker.commander} 进行会战！`, choice.defender.faction);
                closeDefenseChoice();
                
                // 检查防御方是否是AI（注意：不能用shouldControl，因为可能是对方回合）
                const isDefenderAI = (typeof AIController !== 'undefined' &&
                    AIController.config.enabled &&
                    choice.defender.faction === AIController.config.controlledFaction) ||
                    (typeof CarthageAIController !== 'undefined' &&
                    CarthageAIController.config.enabled &&
                    choice.defender.faction === 'carthage') ||
                    (typeof MacedoniaAIController !== 'undefined' &&
                    MacedoniaAIController.config.enabled &&
                    choice.defender.faction === 'macedonia') ||
                    (typeof SeleucidAIController !== 'undefined' &&
                    SeleucidAIController.config.enabled &&
                    choice.defender.faction === 'seleucid') ||
                    (typeof PtolemyAIController !== 'undefined' &&
                    PtolemyAIController.config.enabled &&
                    choice.defender.faction === 'ptolemy');
                
                // 如果防御方是AI，先请求支援
                if (isDefenderAI) {
                    addLog(`📢 ${choice.defender.commander} 向附近己方军队请求援军...`, choice.defender.faction);
                    
                    // 异步请求支援
                    (async () => {
                        // 根据阵营选择对应的AI控制器
                        let supportRequested = false;
                        if (choice.defender.faction === 'rome' && typeof AIController !== 'undefined') {
                            supportRequested = await AIController.requestAllSupport(
                                choice.defender, 
                                choice.attacker, 
                                city
                            );
                        } else if (choice.defender.faction === 'carthage' && typeof CarthageAIController !== 'undefined') {
                            supportRequested = await CarthageAIController.requestAllSupport(
                                choice.defender, 
                                choice.attacker, 
                                city
                            );
                        } else if (choice.defender.faction === 'macedonia' && typeof MacedoniaAIController !== 'undefined') {
                            supportRequested = await MacedoniaAIController.requestAllSupport(
                                choice.defender, 
                                choice.attacker, 
                                city
                            );
                        } else if (choice.defender.faction === 'seleucid' && typeof SeleucidAIController !== 'undefined') {
                            supportRequested = await SeleucidAIController.requestAllSupport(
                                choice.defender, 
                                choice.attacker, 
                                city
                            );
                        } else if (choice.defender.faction === 'ptolemy' && typeof PtolemyAIController !== 'undefined') {
                            supportRequested = await PtolemyAIController.requestAllSupport(
                                choice.defender, 
                                choice.attacker, 
                                city
                            );
                        }
                        
                        if (supportRequested) {
                            addLog(`✅ 援军请求已发送，等待支援到达`, choice.defender.faction);
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        } else {
                            addLog(`ℹ️ 附近无可用援军，${choice.defender.commander} 将独自应战`, choice.defender.faction);
                        }
                        
                        // 请求支援完成后，显示战斗模式选择弹窗
                        showBattleModeModal(choice.attacker, choice.defender, city, isActiveAttack);
                    })();
                } else {
                    // 玩家控制，显示作战准备弹窗（可以请求援军）
                    showBattlePrepModal(choice.attacker, choice.defender, city, isActiveAttack);
                }
            }
            break;
            
        case 'retreat':
            // 选择撤退
            console.log('[chooseDefenseAction] 调用 handleDefenderRetreat, isActiveAttack =', isActiveAttack);
            handleDefenderRetreat(choice, isActiveAttack);
            break;
            
        case 'siege':
            // 选择守城
            handleDefenderSiege(choice, city, isActiveAttack);
            break;
    }
}

// 处理防御方撤退
function handleDefenderRetreat(choice, isActiveAttack = false) {
    const defenderArmy = getAllArmies().find(army => army.id === choice.defender.id);
    if (!defenderArmy) return;
    
    console.log('[handleDefenderRetreat] isActiveAttack =', isActiveAttack);
    
    // 寻找撤退位置
    const currentCity = defenderArmy.location;
    const connectedCities = getConnectedCities(currentCity);
    const retreatOptions = connectedCities.filter(cityId => {
        const city = cities.find(c => c.id === cityId);
        // 排除海路连接和敌方城市
        if (isSeaRoute(currentCity, cityId)) {
            return false; // 海路不能作为撤退路线
        }
        return city && (city.faction === choice.defender.faction || city.faction === 'neutral');
    });
    
    if (retreatOptions.length > 0) {
        // 优先选择己方城市
        const ownCities = retreatOptions.filter(cityId => {
            const city = cities.find(c => c.id === cityId);
            return city && city.faction === choice.defender.faction;
        });
        
        let retreatCity;
        if (ownCities.length > 0) {
            // 有己方城市，优先撤退到己方城市
            retreatCity = ownCities[Math.floor(Math.random() * ownCities.length)];
        } else {
            // 没有己方城市，随机选择中立城市
            retreatCity = retreatOptions[Math.floor(Math.random() * retreatOptions.length)];
        }
        
        const retreatCityName = cities.find(c => c.id === retreatCity).name;
        
        // 撤退损失：投2D6，损失百分之(2D6)的部队
        const retreatLossDice = rollDice(2);
        const retreatLossPercent = retreatLossDice;
        
        // 计算各兵种损失
        const lightCavLoss = Math.floor((defenderArmy.lightCavalry || 0) * retreatLossPercent / 100);
        const heavyCavLoss = Math.floor((defenderArmy.heavyCavalry || 0) * retreatLossPercent / 100);
        const heavyInfLoss = Math.floor((defenderArmy.heavyInfantry || 0) * retreatLossPercent / 100);
        const lightInfLoss = Math.floor((defenderArmy.lightInfantry || 0) * retreatLossPercent / 100);
        const totalLoss = lightCavLoss + heavyCavLoss + heavyInfLoss + lightInfLoss;
        
        // 应用损失
        defenderArmy.lightCavalry = Math.max(0, (defenderArmy.lightCavalry || 0) - lightCavLoss);
        defenderArmy.heavyCavalry = Math.max(0, (defenderArmy.heavyCavalry || 0) - heavyCavLoss);
        defenderArmy.heavyInfantry = Math.max(0, (defenderArmy.heavyInfantry || 0) - heavyInfLoss);
        defenderArmy.lightInfantry = Math.max(0, (defenderArmy.lightInfantry || 0) - lightInfLoss);
        
        // 记录撤退和损失
        defenderArmy.lastLocation = defenderArmy.location;  // 保存上回合位置
        defenderArmy.location = retreatCity;
        defenderArmy.retreatedThisTurn = true;  // 标记本回合进行了撤退
        addLog(`🎲 ${choice.defender.commander} 撤退到 ${retreatCityName}，投2D6=${retreatLossDice}，损失${retreatLossPercent}%部队（${totalLoss}人）`, choice.defender.faction);
        if (totalLoss > 0) {
            addLog(`   💀 损失详情：轻骑${lightCavLoss} 重骑${heavyCavLoss} 重步${heavyInfLoss} 轻步${lightInfLoss}`, choice.defender.faction);
        }
        
        closeDefenseChoice();
        
        // 重新生成地图
        generateMap();
        drawRoutes();
        
        // 执行绝对坐标修复
        absoluteFix();
        
        placeArmies();
        
        // 恢复AI执行（所有派系）
        if (typeof AIController !== 'undefined' && AIController.config.enabled) {
            AIController.resume();
        }
        if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
            CarthageAIController.resume();
        }
        if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
            MacedoniaAIController.resume();
        }
        if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
            SeleucidAIController.resume();
        }
        if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
            PtolemyAIController.resume();
        }
        
        // 如果是主动攻击，标记攻击方军队已行动；否则结束回合
        setTimeout(() => {
            console.log('[handleDefenderRetreat setTimeout] isActiveAttack =', isActiveAttack);
            if (isActiveAttack) {
                console.log('[handleDefenderRetreat] 主动攻击，标记军队已行动');
                ArmyActionManager.markCurrentArmyActed();
            } else {
                console.log('[handleDefenderRetreat] 非主动攻击，结束回合');
                endTurn();
            }
        }, 1000);
    } else {
        // 无处可退，必须选择其他选项
        addLog(`${choice.defender.commander} 无处可退，必须选择其他行动`, 'error');
        // 不关闭弹窗，让玩家重新选择
    }
}

// 处理防御方守城
function handleDefenderSiege(choice, city, isActiveAttack = false) {
    addLog(`${choice.defender.commander} 选择守城，${city.name} 进入被围攻状态`, choice.defender.faction);
    
    // 设置围城状态
    city.isUnderSiege = true;
    city.besiegingFaction = choice.attacker.faction;
    city.siegeCount = 1;
    
    // 更新城市显示
    SiegeSystem.updateCityDisplay(city);
    
    closeDefenseChoice();
    
    // 重新生成地图
    generateMap();
    drawRoutes();
    
    // 执行绝对坐标修复
    absoluteFix();
    
    placeArmies();
    
    // 恢复AI执行（所有派系）
    if (typeof AIController !== 'undefined' && AIController.config.enabled) {
        AIController.resume();
    }
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
        CarthageAIController.resume();
    }
    if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
        MacedoniaAIController.resume();
    }
    if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
        SeleucidAIController.resume();
    }
    if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
        PtolemyAIController.resume();
    }
    
    // 如果是主动攻击，标记攻击方军队已行动；否则结束回合
    setTimeout(() => {
        if (isActiveAttack) {
            ArmyActionManager.markCurrentArmyActed();
        } else {
            endTurn();
        }
    }, 1000);
}

// 关闭防御方选择弹窗
function closeDefenseChoice() {
    document.getElementById('defenseChoiceModal').style.display = 'none';
    BattleSystem.defenseChoice = null;
    
    // 执行绝对坐标修复
    absoluteFix();
    
    // 恢复AI执行（防止弹窗被手动关闭时AI卡住）
    if (typeof AIController !== 'undefined' && AIController.config.enabled && AIController.config.paused) {
        AIController.resume();
    }
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled && CarthageAIController.config.paused) {
        CarthageAIController.resume();
    }
    if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled && MacedoniaAIController.config.paused) {
        MacedoniaAIController.resume();
    }
    if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled && SeleucidAIController.config.paused) {
        SeleucidAIController.resume();
    }
    if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled && PtolemyAIController.config.paused) {
        PtolemyAIController.resume();
    }
}

// 处理城市摧毁选择
function chooseCityDestroy(destroy) {
    SiegeSystem.handleCityDestroy(destroy);
}

// 检查所有围城状态（军队被移除后）
function checkAllSiegesAfterArmyRemoval() {
    cities.forEach(city => {
        if (city.isUnderSiege) {
            SiegeSystem.checkAutoLiftSiege(city.id);
        }
    });
}

// 会战控制函数
function nextBattlePhase() {
        // 防止在会战已完成后继续调用
    if (BattleSystem.currentBattle && BattleSystem.currentBattle.completed) {
        return;
    }
    BattleSystem.nextPhase();
}

function closeBattle() {
    const battleCompleted = BattleSystem.currentBattle && BattleSystem.currentBattle.completed;
    const isActiveAttack = BattleSystem.currentBattle && BattleSystem.currentBattle.isActiveAttack;
    
    document.getElementById('battleModal').style.display = 'none';
    BattleSystem.currentBattle = null;
    BattleSystem.battlePhase = 0;
    
    // 重新生成地图以反映变化
    generateMap();
    drawRoutes();
    
    // 执行绝对坐标修复，确保城市位置正确
    absoluteFix();
    
    placeArmies();
    
    // 恢复AI执行（所有派系）
    if (typeof AIController !== 'undefined' && AIController.config.enabled) {
        AIController.resume();
    }
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
        CarthageAIController.resume();
    }
    if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
        MacedoniaAIController.resume();
    }
    if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
        SeleucidAIController.resume();
    }
    if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
        PtolemyAIController.resume();
    }
    
    // 如果会战已完成，根据是否为主动攻击决定是标记军队已行动还是结束回合
    if (battleCompleted) {
        setTimeout(() => {
            if (isActiveAttack) {
                ArmyActionManager.markCurrentArmyActed();
            } else {
                endTurn();
            }
        }, 1000);
    }
}

// 获取当前玩家的军队
function getCurrentPlayerArmy() {
    // 如果有选中的军队，返回选中的军队
    if (gameState.selectedArmy) {
        const allArmies = getAllArmies();
        const selectedArmy = allArmies.find(a => a.id === gameState.selectedArmy);
        if (selectedArmy) {
            // 确保是当前玩家的军队
            const playerArmies = armies[gameState.currentPlayer];
            if (playerArmies.find(a => a.id === selectedArmy.id)) {
                return selectedArmy;
            }
        }
    }
    
    // 否则返回第一支军队
    const playerArmies = armies[gameState.currentPlayer];
    return playerArmies[0];
}

// 投掷骰子
function rollDice(count) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * 6) + 1;
    }
    return total;
}

// 显示骰子结果
function showDiceResult(diceCount, result, target, success, modifier = 0, customModifierDesc = null) {
    const diceElement = document.getElementById('diceResult');
    diceElement.style.display = 'block';
    
    let html = `投掷 ${diceCount}D6: ${result}`;
    if (modifier !== 0) {
        const modifierText = modifier > 0 ? `+${modifier}` : `${modifier}`;
        let modifierDesc;
        if (customModifierDesc) {
            modifierDesc = customModifierDesc;
        } else {
            modifierDesc = modifier < 0 ? '围城减' : '围城修正';
        }
        html += ` ${modifierText} (${modifierDesc}) = ${result + modifier}`;
    }
    html += `<br>目标 < ${target}<br>`;
    html += success ? '<span style="color: #2ecc71;">成功!</span>' : '<span style="color: #e74c3c;">失败!</span>';
    
    diceElement.innerHTML = html;
    diceElement.className = `dice-result ${success ? 'success' : 'failure'}`;
}

// 城市军队管理系统
class CityArmyManager {
    // 获取城市的所有军队（返回原始对象引用，带faction标记）
    static getArmiesAtCity(cityId) {
        const cityArmies = [];
        
        // 检查罗马军队 - 返回原始对象引用
        armies.rome.forEach(army => {
            if (army.location === cityId) {
                // 确保faction属性存在
                if (!army.faction) army.faction = 'rome';
                cityArmies.push(army);
            }
        });
        
        // 检查迦太基军队 - 返回原始对象引用
        armies.carthage.forEach(army => {
            if (army.location === cityId) {
                // 确保faction属性存在
                if (!army.faction) army.faction = 'carthage';
                cityArmies.push(army);
            }
        });
        
        // 检查马其顿军队 - 返回原始对象引用
        if (armies.macedonia) {
            armies.macedonia.forEach(army => {
                if (army.location === cityId) {
                    // 确保faction属性存在
                    if (!army.faction) army.faction = 'macedonia';
                    cityArmies.push(army);
                }
            });
        }
        
        // 检查塞琉古军队 - 返回原始对象引用
        if (armies.seleucid) {
            armies.seleucid.forEach(army => {
                if (army.location === cityId) {
                    // 确保faction属性存在
                    if (!army.faction) army.faction = 'seleucid';
                    cityArmies.push(army);
                }
            });
        }
        
        // 检查托勒密军队 - 返回原始对象引用
        if (armies.ptolemy) {
            armies.ptolemy.forEach(army => {
                if (army.location === cityId) {
                    // 确保faction属性存在
                    if (!army.faction) army.faction = 'ptolemy';
                    cityArmies.push(army);
                }
            });
        }
        
        return cityArmies;
    }
    
    // 获取城市的特定阵营军队（返回原始对象引用）
    static getArmiesAtCityByFaction(cityId, faction) {
        // 直接从对应阵营数组中查找，返回原始对象引用
        if (faction === 'rome') {
            return armies.rome.filter(army => army.location === cityId);
        } else if (faction === 'carthage') {
            return armies.carthage.filter(army => army.location === cityId);
        } else if (faction === 'macedonia') {
            return armies.macedonia ? armies.macedonia.filter(army => army.location === cityId) : [];
        } else if (faction === 'seleucid') {
            return armies.seleucid ? armies.seleucid.filter(army => army.location === cityId) : [];
        }
        else if (faction === 'ptolemy') {
            return armies.ptolemy ? armies.ptolemy.filter(army => army.location === cityId) : [];
        }
        return [];
    }
    
    // 检查城市是否有敌方军队
    static hasEnemyArmies(cityId, cityFaction) {
        const armies = this.getArmiesAtCity(cityId);
        return armies.some(army => army.faction !== cityFaction);
    }
    
    // 检查城市是否可以被围城
    static canBeSieged(cityId, besiegingFaction) {
        const city = cities.find(c => c.id === cityId);
        if (!city || city.faction === besiegingFaction) {
            return false;
        }
        
        // 检查是否有围城方的军队在该城市
        const besiegingArmies = this.getArmiesAtCityByFaction(cityId, besiegingFaction);
        return besiegingArmies.length > 0;
    }
    
    // 检查当前军队是否在指定城市
    static isCurrentArmyAtCity(cityId, currentPlayer) {
        const currentArmy = getCurrentPlayerArmy();
        if (!currentArmy) return false;
        
        return currentArmy.location === cityId;
    }
    
    // 获取城市状态信息
    static getCityInfo(cityId) {
        const city = cities.find(c => c.id === cityId);
        if (!city) return null;
        
        const armies = this.getArmiesAtCity(cityId);
        const factionCounts = {
            rome: armies.filter(a => a.faction === 'rome').length,
            carthage: armies.filter(a => a.faction === 'carthage').length,
            macedonia: armies.filter(a => a.faction === 'macedonia').length,
            seleucid: armies.filter(a => a.faction === 'seleucid').length,
            ptolemy: armies.filter(a => a.faction === 'ptolemy').length
        };
        
        return {
            city: city,
            armies: armies,
            factionCounts: factionCounts,
            hasEnemies: this.hasEnemyArmies(cityId, city.faction),
            canBeSieged: {
                rome: this.canBeSieged(cityId, 'rome'),
                carthage: this.canBeSieged(cityId, 'carthage')
            }
        };
    }
}

// 围城系统
class SiegeSystem {
    // 开始围城
    static startSiege(cityId, besiegingFaction, currentArmy) {
        const city = cities.find(c => c.id === cityId);
        if (!city || city.faction === besiegingFaction) {
            return false;
        }
        
        // 检查当前军队是否在该城市
        if (!currentArmy || currentArmy.location !== cityId) {
            addLog(`${city.name} 无法被围城 - 当前军队不在该城市`, besiegingFaction);
            return false;
        }
        
        // 第一次围城时，无论成功与否都进入被围攻状态
        city.isUnderSiege = true;
        city.besiegingFaction = besiegingFaction;
        city.siegeCount = 1;
        
        // 围城时减少对围城方的态度-2
        if (besiegingFaction === 'rome') {
            city.romeAttitude = (city.romeAttitude || 0) - 2;
            addLog(`${city.name} 对罗马态度 -2 (围城影响，当前 ${city.romeAttitude})`, 'system');
        } else if (besiegingFaction === 'carthage') {
            city.carthageAttitude = (city.carthageAttitude || 0) - 2;
            addLog(`${city.name} 对迦太基态度 -2 (围城影响，当前 ${city.carthageAttitude})`, 'system');
        } else if (besiegingFaction === 'macedonia') {
            city.macedoniaAttitude = (city.macedoniaAttitude || 0) - 2;
            addLog(`${city.name} 对马其顿态度 -2 (围城影响，当前 ${city.macedoniaAttitude})`, 'system');
        } else if (besiegingFaction === 'seleucid') {
            city.seleucidAttitude = (city.seleucidAttitude || 0) - 2;
            addLog(`${city.name} 对塞琉古态度 -2 (围城影响，当前 ${city.seleucidAttitude})`, 'system');
        } else if (besiegingFaction === 'ptolemy') {
            city.ptolemyAttitude = (city.ptolemyAttitude || 0) - 2;
            addLog(`${city.name} 对托勒密态度 -2 (围城影响，当前 ${city.ptolemyAttitude})`, 'system');
        }
        
        this.updateCityDisplay(city);
        addLog(`${currentArmy.commander} 开始围城${city.name}`, besiegingFaction);
        return true;
    }
    
    // 执行围城判定（带状态变化）- 用于首次围城
    static executeSiegeWithStateChange(cityId, commander, besiegingFaction, siegeCost = 30) {
        const city = cities.find(c => c.id === cityId);
        if (!city) return false;
        
        // 检查指挥官是否在该城市
        if (commander.location !== cityId) {
            addLog(`${commander.commander} 不在 ${city.name}，无法执行围城`, besiegingFaction);
            return false;
        }
        
        // 检查是否为己方城市
        if (city.faction === besiegingFaction) {
            addLog(`${city.name} 已是己方城市，无需围城`, besiegingFaction);
            return false;
        }
        
        // 围城时减少对围城方的态度-2，经济分-2（最低为0）
        if (besiegingFaction === 'rome') {
            city.romeAttitude = (city.romeAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对罗马态度 -2 (围城影响，当前 ${city.romeAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (besiegingFaction === 'carthage') {
            city.carthageAttitude = (city.carthageAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对迦太基态度 -2 (围城影响，当前 ${city.carthageAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (besiegingFaction === 'macedonia') {
            city.macedoniaAttitude = (city.macedoniaAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对马其顿态度 -2 (围城影响，当前 ${city.macedoniaAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (besiegingFaction === 'seleucid') {
            city.seleucidAttitude = (city.seleucidAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对塞琉古态度 -2 (围城影响，当前 ${city.seleucidAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (besiegingFaction === 'ptolemy') {
            city.ptolemyAttitude = (city.ptolemyAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对托勒密态度 -2 (围城影响，当前 ${city.ptolemyAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        }
        
        // 执行围城判定（首次围城，围攻次数）
        const diceResult = rollDice(3);
        const siegeCount = 1; // 首次围城
        const fortificationLevel = city.fortificationLevel || 0; // 城市工事等级
        const modifier = -siegeCount + fortificationLevel; // 围攻次数作为负修正，工事等级作为正修正
        const modifiedResult = diceResult + modifier;
        const targetNumber = commander.military;
        const success = modifiedResult < targetNumber;
        
        // 显示围城结果
        const modifierDesc = fortificationLevel > 0  
            ? `围城减-${siegeCount}) + 工事防御(+${fortificationLevel})` 
            : `围城减-${siegeCount})`;
        showDiceResult(3, diceResult, targetNumber, success, modifier, modifierDesc);
        
        if (success) {
            // 围城成功 - 显示摧毁城市选择弹窗
            this.showCityDestroyChoice(city, commander, besiegingFaction, siegeCost);
        } else {
            // 围城失败 - 该城市进入被围攻状态，被围攻次数+1
            city.isUnderSiege = true;
            city.besiegingFaction = besiegingFaction;
            city.siegeCount = 1;
            this.updateCityDisplay(city);
            
            // 围城失败造成部队损失
            const armyStillExists = this.applySiegeFailureLoss(commander, besiegingFaction, city);
            
            addLog(`${commander.commander} 围城失败${city.name} 进入被围攻状态(首次围城，消耗${siegeCost}资金`, besiegingFaction);
            
            // 记录行动结果
            if (armyStillExists) {
                recordArmyAction(commander, '围城', 'failed', `围城${city.name}失败，进入被围攻状态`);
            }
            
            console.log('[围城失败] armyStillExists:', armyStillExists);
            console.log('[围城失败] 准备在500ms后标记单位已完成');
            
            // 只有当部队还存在时才标记单位已行动
            if (armyStillExists) {
                const commanderId = commander.id;
                setTimeout(() => {
                    console.log('[围城失败] 正在标记单位已完成');
                    ArmyActionManager.markArmyActed(commanderId);
                }, 100);
            } else {
                console.log('[围城失败] 部队已消灭，不标记单位已完成');
            }
        }
        
        return success;
    }
    
    // 执行围城判定 - 用于后续围城
    static executeSiege(cityId, commander, siegeCost = 30) {
        const city = cities.find(c => c.id === cityId);
        if (!city || !city.isUnderSiege) return false;
        
        // 检查指挥官是否在该城市
        if (commander.location !== cityId) {
            addLog(`${commander.commander} 不在 ${city.name}，无法继续围城`, city.besiegingFaction);
            return false;
        }
        
        // 围城时减少对围城方的态度-2，经济分-2（最低为0）
        if (city.besiegingFaction === 'rome') {
            city.romeAttitude = (city.romeAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对罗马态度 -2 (围城影响，当前 ${city.romeAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (city.besiegingFaction === 'carthage') {
            city.carthageAttitude = (city.carthageAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对迦太基态度 -2 (围城影响，当前 ${city.carthageAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (city.besiegingFaction === 'macedonia') {
            city.macedoniaAttitude = (city.macedoniaAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对马其顿态度 -2 (围城影响，当前 ${city.macedoniaAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (city.besiegingFaction === 'seleucid') {
            city.seleucidAttitude = (city.seleucidAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对塞琉古态度 -2 (围城影响，当前 ${city.seleucidAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        } else if (city.besiegingFaction === 'ptolemy') {
            city.ptolemyAttitude = (city.ptolemyAttitude || 0) - 2;
            city.economicScore = Math.max(0, (city.economicScore || 0) - 2);
            addLog(`${city.name} 对托勒密态度 -2 (围城影响，当前 ${city.ptolemyAttitude})`, 'system');
            addLog(`${city.name} 经济发展 -2 (围城影响，当前 ${city.economicScore})`, 'system');
        }
        
        // 投掷3D6，减去围攻次数，加上工事等级
        const diceResult = rollDice(3);
        const fortificationLevel = city.fortificationLevel || 0; // 城市工事等级
        const modifier = -city.siegeCount + fortificationLevel; // 围攻次数作为负修正，工事等级作为正修正
        const modifiedResult = diceResult + modifier;
        const targetNumber = commander.military;
        const success = modifiedResult < targetNumber; // 小于将领军事点数时成功
        // 显示围城结果
        const modifierDesc = fortificationLevel > 0  
            ? `围城减-${city.siegeCount}) + 工事防御(+${fortificationLevel})` 
            : `围城减-${city.siegeCount})`;
        showDiceResult(3, diceResult, targetNumber, success, modifier, modifierDesc);
        
        if (success) {
            // 围城成功 - 显示摧毁城市选择弹窗
            this.showCityDestroyChoice(city, commander, city.besiegingFaction, siegeCost);
        } else {
            // 围城失败 - 被围攻次数+1
            city.siegeCount++;
            
            // 围城失败造成部队损失
            const armyStillExists = this.applySiegeFailureLoss(commander, city.besiegingFaction, city);
            
            addLog(`${commander.commander} 围城失败${city.name} 继续被围攻(第${city.siegeCount}次围攻，消耗${siegeCost}资金`, city.besiegingFaction);
            
            // 记录行动结果
            if (armyStillExists) {
                recordArmyAction(commander, '围城', 'failed', `围城${city.name}失败，第${city.siegeCount}次围攻`);
            }
            
            this.updateCityDisplay(city);
            
            console.log('[继续围城失败] armyStillExists:', armyStillExists);
            console.log('[继续围城失败] 准备在500ms后标记单位已完成');
            
            // 只有当部队还存在时才标记单位已行动
            if (armyStillExists) {
                const commanderId = commander.id;
                setTimeout(() => {
                    console.log('[继续围城失败] 正在标记单位已完成');
                    ArmyActionManager.markArmyActed(commanderId);
                }, 500);
            } else {
                console.log('[继续围城失败] 部队已消灭，不标记单位已完成');
            }
        }
        
        return success;
    }
    

    
    // 处理围城成功的资金奖励
    static handleSiegeReward(originalFaction, attackingFaction, cityName) {
        let reward = 100; // 攻克城市的奖励
        let penalty = 0; // 敌对阵营的惩罚
        if (originalFaction === 'neutral') {
            // 攻克中立城市：本阵营增加100资金
            if (attackingFaction === 'rome') {
                gameState.romeFunds += reward;
                addLog(`攻克中立城市 ${cityName}，罗马获得${reward}资金奖励`, 'rome');
            } else if (attackingFaction === 'carthage') {
                gameState.carthageFunds += reward;
                addLog(`攻克中立城市 ${cityName}，迦太基获得${reward}资金奖励`, 'carthage');
            } else if (attackingFaction === 'macedonia') {
                gameState.macedoniaFunds += reward;
                addLog(`攻克中立城市 ${cityName}，马其顿获得${reward}资金奖励`, 'macedonia');
            } else if (attackingFaction === 'seleucid') {
                gameState.seleucidFunds += reward;
                addLog(`攻克中立城市 ${cityName}，塞琉古获得${reward}资金奖励`, 'seleucid');
            } else if (attackingFaction === 'ptolemy') {
                gameState.ptolemyFunds += reward;
                addLog(`攻克中立城市 ${cityName}，托勒密获得${reward}资金奖励`, 'ptolemy');
            }
        } else if (originalFaction !== attackingFaction) {
            // 攻克敌对阵营城市：本阵营增加100资金，敌对阵营减50资金
            penalty = 50;
            
            if (attackingFaction === 'rome') {
                gameState.romeFunds += reward;
                if (originalFaction === 'carthage') {
                    gameState.carthageFunds = Math.max(0, gameState.carthageFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，罗马获得${reward}资金，迦太基损失${penalty}资金`, 'rome');
                } else if (originalFaction === 'macedonia') {
                    gameState.macedoniaFunds = Math.max(0, gameState.macedoniaFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，罗马获得${reward}资金，马其顿损失${penalty}资金`, 'rome');
                } else if (originalFaction === 'seleucid') {
                    gameState.seleucidFunds = Math.max(0, gameState.seleucidFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，罗马获得${reward}资金，塞琉古损失${penalty}资金`, 'rome');
                } else if (originalFaction === 'ptolemy') {
                    gameState.ptolemyFunds = Math.max(0, gameState.ptolemyFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，罗马获得${reward}资金，托勒密损失${penalty}资金`, 'rome');
                }
            } else if (attackingFaction === 'carthage') {
                gameState.carthageFunds += reward;
                if (originalFaction === 'rome') {
                    gameState.romeFunds = Math.max(0, gameState.romeFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，迦太基获得${reward}资金，罗马损失${penalty}资金`, 'carthage');
                } else if (originalFaction === 'macedonia') {
                    gameState.macedoniaFunds = Math.max(0, gameState.macedoniaFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，迦太基获得${reward}资金，马其顿损失${penalty}资金`, 'carthage');
                } else if (originalFaction === 'seleucid') {
                    gameState.seleucidFunds = Math.max(0, gameState.seleucidFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，迦太基获得${reward}资金，塞琉古损失${penalty}资金`, 'carthage');
                } else if (originalFaction === 'ptolemy') {
                    gameState.ptolemyFunds = Math.max(0, gameState.ptolemyFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，迦太基获得${reward}资金，托勒密损失${penalty}资金`, 'carthage');
                }
            } else if (attackingFaction === 'macedonia') {
                gameState.macedoniaFunds += reward;
                if (originalFaction === 'rome') {
                    gameState.romeFunds = Math.max(0, gameState.romeFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，马其顿获得${reward}资金，罗马损失${penalty}资金`, 'macedonia');
                } else if (originalFaction === 'carthage') {
                    gameState.carthageFunds = Math.max(0, gameState.carthageFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，马其顿获得${reward}资金，迦太基损失${penalty}资金`, 'macedonia');
                } else if (originalFaction === 'seleucid') {
                    gameState.seleucidFunds = Math.max(0, gameState.seleucidFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，马其顿获得${reward}资金，塞琉古损失${penalty}资金`, 'macedonia');
                } else if (originalFaction === 'ptolemy') {
                    gameState.ptolemyFunds = Math.max(0, gameState.ptolemyFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，马其顿获得${reward}资金，托勒密损失${penalty}资金`, 'macedonia');
                }
            } else if (attackingFaction === 'seleucid') {
                gameState.seleucidFunds += reward;
                if (originalFaction === 'rome') {
                    gameState.romeFunds = Math.max(0, gameState.romeFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，塞琉古获得${reward}资金，罗马损失${penalty}资金`, 'seleucid');
                } else if (originalFaction === 'carthage') {
                    gameState.carthageFunds = Math.max(0, gameState.carthageFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，塞琉古获得${reward}资金，迦太基损失${penalty}资金`, 'seleucid');
                } else if (originalFaction === 'macedonia') {
                    gameState.macedoniaFunds = Math.max(0, gameState.macedoniaFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，塞琉古获得${reward}资金，马其顿损失${penalty}资金`, 'seleucid');
                } else if (originalFaction === 'ptolemy') {
                    gameState.ptolemyFunds = Math.max(0, gameState.ptolemyFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，塞琉古获得${reward}资金，托勒密损失${penalty}资金`, 'seleucid');
                }
            } else if (attackingFaction === 'ptolemy') {
                gameState.ptolemyFunds += reward;
                if (originalFaction === 'rome') {
                    gameState.romeFunds = Math.max(0, gameState.romeFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，托勒密获得${reward}资金，罗马损失${penalty}资金`, 'ptolemy');
                } else if (originalFaction === 'carthage') {
                    gameState.carthageFunds = Math.max(0, gameState.carthageFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，托勒密获得${reward}资金，迦太基损失${penalty}资金`, 'ptolemy');
                } else if (originalFaction === 'macedonia') {
                    gameState.macedoniaFunds = Math.max(0, gameState.macedoniaFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，托勒密获得${reward}资金，马其顿损失${penalty}资金`, 'ptolemy');
                } else if (originalFaction === 'seleucid') {
                    gameState.seleucidFunds = Math.max(0, gameState.seleucidFunds - penalty);
                    addLog(`攻克敌方城市 ${cityName}，托勒密获得${reward}资金，塞琉古损失${penalty}资金`, 'ptolemy');
                }
            }
        }
        
        // 更新资金显示
        updateFactionFunds();
    }

    // 解除围城
    static liftSiege(cityId, reason = 'unknown') {
        const city = cities.find(c => c.id === cityId);
        if (city && city.isUnderSiege) {
            city.isUnderSiege = false;
            city.siegeCount = 0;
            city.besiegingFaction = null;
            this.updateCityDisplay(city);
            addLog(`${city.name} 的围城已解除 (${reason})`, 'system');
            return true;
        }
        return false;
    }
    
    // 检查是否应该自动解除围城
    static checkAutoLiftSiege(cityId) {
        const city = cities.find(c => c.id === cityId);
        if (!city || !city.isUnderSiege) return;
        
        // 检查是否有围城方的军队在该城市
        const besiegingArmies = this.getArmiesAtCity(cityId, city.besiegingFaction);
        
        if (besiegingArmies.length === 0) {
            this.liftSiege(cityId, '围城军队已离开');
        } else if (city.faction === city.besiegingFaction) {
            this.liftSiege(cityId, '城市已归属围城方');
        }
    }
    
    // 获取指定城市的指定阵营军队
    static getArmiesAtCity(cityId, faction) {
        return CityArmyManager.getArmiesAtCityByFaction(cityId, faction);
    }
    
    // 更新城市显示
    static updateCityDisplay(city) {
        const cityElement = document.getElementById(city.id);
        if (!cityElement) return;
        
        // 更新城市的基础CSS
        let factionClass = city.faction;
        
        // 如果城市被围攻，显示围攻方的颜色
        if (city.isUnderSiege && city.besiegingFaction) {
            factionClass = city.besiegingFaction;
        }
        
        // 重新设置城市的CSS
        cityElement.className = `city ${factionClass}${city.important ? ' important' : ''}`;
        
        // 移除旧的围城样式
        cityElement.classList.remove('under-siege');
        const oldIndicator = cityElement.querySelector('.siege-indicator');
        if (oldIndicator) {
            oldIndicator.remove();
        }
        
        // 添加新的围城样式
        if (city.isUnderSiege) {
            cityElement.classList.add('under-siege');
            
            // 添加围城次数指示
            const indicator = document.createElement('div');
            indicator.className = 'siege-indicator';
            indicator.textContent = city.siegeCount;
            indicator.title = `被围攻第${city.siegeCount}次`;
            cityElement.appendChild(indicator);
        }
        
        // 更新阵营分数显示
        updateFactionScores();
    }
    
    // 围城失败造成部队损失
    // 返回 true 表示部队仍然存在，false 表示部队被消灭
    static applySiegeFailureLoss(commander, faction, city) {
        if (!commander) return true;
        
        // 投掷2D6
        const dice1 = rollD6();
        const dice2 = rollD6();
        const diceRoll = dice1 + dice2;
        
        // 计算损失百分比：0.25% * 2D6
        const lossPercentage = 0.25 * diceRoll;
        
        // 计算各兵种损失
        const totalTroops = (commander.lightCavalry || 0) + 
                           (commander.heavyCavalry || 0) + 
                           (commander.heavyInfantry || 0) + 
                           (commander.lightInfantry || 0);
        
        if (totalTroops === 0) return true;
        
        // 计算实际损失人数
        const totalLoss = Math.floor(totalTroops * lossPercentage / 100);
        
        // 按比例分配损失到各兵种
        const lightCavLoss = Math.floor((commander.lightCavalry || 0) * lossPercentage / 100);
        const heavyCavLoss = Math.floor((commander.heavyCavalry || 0) * lossPercentage / 100);
        const heavyInfLoss = Math.floor((commander.heavyInfantry || 0) * lossPercentage / 100);
        const lightInfLoss = Math.floor((commander.lightInfantry || 0) * lossPercentage / 100);
        
        // 应用损失
        commander.lightCavalry = Math.max(0, (commander.lightCavalry || 0) - lightCavLoss);
        commander.heavyCavalry = Math.max(0, (commander.heavyCavalry || 0) - heavyCavLoss);
        commander.heavyInfantry = Math.max(0, (commander.heavyInfantry || 0) - heavyInfLoss);
        commander.lightInfantry = Math.max(0, (commander.lightInfantry || 0) - lightInfLoss);
        
        // 记录日志
        addLog(`💀 ${commander.commander} 围城失败，投骰${dice1}+${dice2}=${diceRoll}，部队损失${lossPercentage}%（${totalLoss}人）`, faction);
        
        // 检查战斗力是否低于消灭阈值
        const destroyed = BattleSystem.checkArmyDestroyed(commander);
        if (destroyed) {
            return false; // 部队已被消灭
        }
        
        // 检查是否投到12，如果是则强制撤退
        if (diceRoll === 12) {
            addLog(`⚠️ 投到双6！${commander.commander} 被迫从 ${city.name} 撤退`, faction);
            const armyStillExists = this.handleForcedRetreat(commander, faction, city);
            if (!armyStillExists) {
                return false; // 部队被消灭
            }
        }
        
        // 注意：updateArmyDetails 函数不存在，已删除
        // 部队信息会在 placeArmies() 中自动更新
        
        return true; // 部队仍然存在
    }
    
    // 处理强制撤退
    // 返回 true 表示部队仍然存在，false 表示部队被消灭
    static handleForcedRetreat(commander, faction, city) {
        if (!commander || !city) return true;
        
        const currentCity = city.id;
        const connectedCities = getConnectedCities(currentCity);
        
        // 筛选可撤退的城市：己方城市或中立城市
        const ownCities = connectedCities.filter(cityId => {
            const c = cities.find(ct => ct.id === cityId);
            return c && c.faction === faction;
        });
        
        const neutralCities = connectedCities.filter(cityId => {
            const c = cities.find(ct => ct.id === cityId);
            return c && c.faction === 'neutral';
        });
        
        let retreatCity = null;
        
        // 优先撤退到己方城市
        if (ownCities.length > 0) {
            retreatCity = ownCities[0];
            const retreatCityObj = cities.find(c => c.id === retreatCity);
            addLog(`🏃 ${commander.commander} 撤退至己方城市 ${retreatCityObj.name}`, faction);
        } else if (neutralCities.length > 0) {
            // 其次撤退到中立城市
            retreatCity = neutralCities[0];
            const retreatCityObj = cities.find(c => c.id === retreatCity);
            addLog(`🏃 ${commander.commander} 撤退至中立城市 ${retreatCityObj.name}`, faction);
        } else {
            // 无处可退，全军覆没
            const remainingTroops = (commander.lightCavalry || 0) +
                                   (commander.heavyCavalry || 0) +
                                   (commander.heavyInfantry || 0) +
                                   (commander.lightInfantry || 0);
            
            addLog(`💀💀 ${commander.commander} 在 ${city.name} 围城失败后无路可退，全军覆没！（${remainingTroops}人全部阵亡）`, faction);
            
            // 从游戏中移除部队
            const armyIndex = armies[faction].findIndex(army => army.id === commander.id);
            if (armyIndex >= 0) {
                armies[faction].splice(armyIndex, 1);
                console.log(`[强制撤退] ${commander.commander} 已从游戏中移除`);
                
                // 检查围城状态
                checkAllSiegesAfterArmyRemoval();
                
                // 更新地图显示
                placeArmies();
            }
            return false; // 部队被消灭
        }
        
        // 执行撤退
        if (retreatCity) {
            commander.location = retreatCity;
            
            // 更新地图显示
            placeArmies();
        }
        
        return true; // 部队仍然存在
    }
    
    // 显示城市摧毁选择弹窗
    static showCityDestroyChoice(city, commander, besiegingFaction, siegeCost) {
        // 保存当前围城信息到全局变量
        window.currentSiegeInfo = {
            city: city,
            commander: commander,
            besiegingFaction: besiegingFaction,
            siegeCost: siegeCost,
            originalFaction: city.faction
        };
        
        // AI自动决策：罗马AI、迦太基AI、马其顿AI和塞琉古AI根据城市态度自动选择
        // 调试日志
        console.log('[城市处置] besiegingFaction:', besiegingFaction);
        console.log('[城市处置] AIController存在:', typeof AIController !== 'undefined');
        console.log('[城市处置] CarthageAIController存在:', typeof CarthageAIController !== 'undefined');
        console.log('[城市处置] MacedoniaAIController存在:', typeof MacedoniaAIController !== 'undefined');
        console.log('[城市处置] SeleucidAIController存在:', typeof SeleucidAIController !== 'undefined');
        console.log('[城市处置] PtolemyAIController存在:', typeof PtolemyAIController !== 'undefined');
        console.log('[城市处置] shouldControl:', AIController && AIController.shouldControl ? AIController.shouldControl() : 'N/A');
        
        // 罗马AI自动决策
        if (besiegingFaction === 'rome' && typeof AIController !== 'undefined' && AIController.shouldControl()) {
            const attitude = city.romeAttitude || 0;
            const shouldDestroy = attitude < -5;
            
            console.log('[城市处置] 罗马AI自动决策触发');
            console.log('[城市处置] 城市态度:', attitude);
            console.log('[城市处置] 决定摧毁:', shouldDestroy);
            
            if (shouldDestroy) {
                // addLog(`🤖 罗马AI决策：${city.name} 对罗马态度为 ${attitude}（<-5），决定摧毁城市`, 'rome');
            } else {
                // addLog(`🤖 罗马AI决策：${city.name} 对罗马态度为 ${attitude}（≥-5），决定保留城市`, 'rome');
            }
            
            // 延迟一秒后自动执行决策，让玩家看到日志
            setTimeout(() => {
                this.handleCityDestroy(shouldDestroy);
            }, 1000);
            
            return; // 不显示弹窗
        }
        
        // 迦太基AI自动决策
        if (besiegingFaction === 'carthage' && typeof CarthageAIController !== 'undefined' && CarthageAIController.shouldControl()) {
            const attitude = city.carthageAttitude || 0;
            const shouldDestroy = attitude < -5;
            
            console.log('[城市处置] 迦太基AI自动决策触发');
            console.log('[城市处置] 城市态度:', attitude);
            console.log('[城市处置] 决定摧毁:', shouldDestroy);
            
            if (shouldDestroy) {
                // addLog(`🤖 迦太基AI决策：${city.name} 对迦太基态度为 ${attitude}（<-5），决定摧毁城市`, 'carthage');
            } else {
                // addLog(`🤖 迦太基AI决策：${city.name} 对迦太基态度为 ${attitude}（≥-5），决定保留城市`, 'carthage');
            }
            
            // 延迟一秒后自动执行决策，让玩家看到日志
            setTimeout(() => {
                this.handleCityDestroy(shouldDestroy);
            }, 1000);
            
            return; // 不显示弹窗
        }
        
        // 马其顿AI自动决策
        if (besiegingFaction === 'macedonia' && typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.shouldControl()) {
            const attitude = city.macedoniaAttitude || 0;
            const shouldDestroy = attitude < -5;
            
            console.log('[城市处置] 马其顿AI自动决策触发');
            console.log('[城市处置] 城市态度:', attitude);
            console.log('[城市处置] 决定摧毁:', shouldDestroy);
            
            if (shouldDestroy) {
                // addLog(`🤖 马其顿AI决策：${city.name} 对马其顿态度为 ${attitude}（<-5），决定摧毁城市`, 'macedonia');
            } else {
                // addLog(`🤖 马其顿AI决策：${city.name} 对马其顿态度为 ${attitude}（≥-5），决定保留城市`, 'macedonia');
            }
            
            // 延迟一秒后自动执行决策，让玩家看到日志
            setTimeout(() => {
                this.handleCityDestroy(shouldDestroy);
            }, 1000);
            
            return; // 不显示弹窗
        }
        
        // 塞琉古AI自动决策
        if (besiegingFaction === 'seleucid' && typeof SeleucidAIController !== 'undefined' && SeleucidAIController.shouldControl()) {
            const attitude = city.seleucidAttitude || 0;
            const shouldDestroy = attitude < -5;
            
            console.log('[城市处置] 塞琉古AI自动决策触发');
            console.log('[城市处置] 城市态度:', attitude);
            console.log('[城市处置] 决定摧毁:', shouldDestroy);
            
            if (shouldDestroy) {
                // addLog(`🤖 塞琉古AI决策：${city.name} 对塞琉古态度为 ${attitude}（<-5），决定摧毁城市`, 'seleucid');
            } else {
                // addLog(`🤖 塞琉古AI决策：${city.name} 对塞琉古态度为 ${attitude}（≥-5），决定保留城市`, 'seleucid');
            }
            
            // 延迟一秒后自动执行决策，让玩家看到日志
            setTimeout(() => {
                this.handleCityDestroy(shouldDestroy);
            }, 1000);
            
            return; // 不显示弹窗
        }
        if (besiegingFaction === 'ptolemy' && typeof PtolemyAIController !== 'undefined' && PtolemyAIController.shouldControl()) {
            const attitude = city.ptolemyAttitude || 0;
            const shouldDestroy = attitude < -5;
            
            console.log('[城市处置] 托勒密AI自动决策触发');
            console.log('[城市处置] 城市态度:', attitude);
            console.log('[城市处置] 决定摧毁:', shouldDestroy);
            if (shouldDestroy) {
                // addLog(`🤖 塞琉古AI决策：${city.name} 对塞琉古态度为 ${attitude}（<-5），决定摧毁城市`, 'ptolemy');
            } else {
                // addLog(`🤖 塞琉古AI决策：${city.name} 对塞琉古态度为 ${attitude}（≥-5），决定保留城市`, 'ptolemy');
            }
            
            // 延迟一秒后自动执行决策，让玩家看到日志
            setTimeout(() => {
                this.handleCityDestroy(shouldDestroy);
            }, 1000);
            
            return; // 不显示弹窗
        }


        console.log('[城市处置] 不满足AI自动决策条件，显示玩家弹窗');
        
        // 玩家手动回合：显示弹窗让玩家选择
        // 更新弹窗内容
        document.getElementById('cityDestroyTitle').textContent = `围城成功！`;
        
        // 根据阵营显示对应态度
        let factionName, attitude;
        if (besiegingFaction === 'rome') {
            factionName = '罗马';
            attitude = city.romeAttitude || 0;
        } else if (besiegingFaction === 'carthage') {
            factionName = '迦太基';
            attitude = city.carthageAttitude || 0;
        } else if (besiegingFaction === 'macedonia') {
            factionName = '马其顿';
            attitude = city.macedoniaAttitude || 0;
        } else if (besiegingFaction === 'seleucid') {
            factionName = '塞琉古';
            attitude = city.seleucidAttitude || 0;
        } else if (besiegingFaction === 'ptolemy') {
            factionName = '托勒密';
            attitude = city.ptolemyAttitude || 0;
        }

        
        document.getElementById('cityDestroySituation').textContent = 
            `${commander.commander} 成功攻克${city.name}（对${factionName}态度：${attitude}），是否摧毁这座城市？`;
        
        // 显示弹窗
        document.getElementById('cityDestroyModal').style.display = 'flex';
    }
    
    // 处理摧毁城市选择
    static handleCityDestroy(destroy) {
        const info = window.currentSiegeInfo;
        if (!info) return;
        
        const city = info.city;
        const commander = info.commander;
        const besiegingFaction = info.besiegingFaction;
        const siegeCost = info.siegeCost;
        const originalFaction = info.originalFaction;
        
        // 处理城市中的守军撤退
        this.handleDefendersRetreat(city, originalFaction);
        
        // 占领城市的基本处理
        city.faction = besiegingFaction;
        city.isUnderSiege = false;
        city.besiegingFaction = null;
        city.siegeCount = 0;
        
        if (destroy) {
            // 摧毁城市：政治分和经济分降低，对双方阵营的好感度变为0
            // 1. 抢劫资金（摧毁前的经济分 × 10）
            const lootAmount = city.economicScore * 10;
            if (besiegingFaction === 'rome') {
                gameState.romeFunds += lootAmount;
            } else if (besiegingFaction === 'carthage') {
                gameState.carthageFunds += lootAmount;
            } else if (besiegingFaction === 'macedonia') {
                gameState.macedoniaFunds += lootAmount;
            } else if (besiegingFaction === 'seleucid') {
                gameState.seleucidFunds += lootAmount;
            } else if (besiegingFaction === 'ptolemy') {
                gameState.ptolemyFunds += lootAmount;
            }
            
            // 2. 提升攻城部队士气至5
            if (commander && commander.morale !== undefined) {
                const oldMorale = commander.morale;
                commander.morale = 5;
                addLog(`🎖️ ${commander.commander} 摧毁城市，部队士气提升至5（原士气：${oldMorale}）`, besiegingFaction);
            }
            
            // 3. 降低城市属性
            city.politicalScore = 1;
            city.economicScore = 1;
            city.romeAttitude = 0;
            city.carthageAttitude = 0;
            city.macedoniaAttitude = 0;
            city.seleucidAttitude = 0;
            city.ptolemyAttitude = 0;
            
            // 4. 周边相邻城市对该阵营态度-1
            const connectedCities = getConnectedCities(city.id);
            let affectedCities = [];
            connectedCities.forEach(cityId => {
                const neighborCity = cities.find(c => c.id === cityId);
                if (neighborCity) {
                    if (besiegingFaction === 'rome') {
                        neighborCity.romeAttitude = (neighborCity.romeAttitude || 0) - 1;
                    } else if (besiegingFaction === 'carthage') {
                        neighborCity.carthageAttitude = (neighborCity.carthageAttitude || 0) - 1;
                    } else if (besiegingFaction === 'macedonia') {
                        neighborCity.macedoniaAttitude = (neighborCity.macedoniaAttitude || 0) - 1;
                    } else if (besiegingFaction === 'seleucid') {
                        neighborCity.seleucidAttitude = (neighborCity.seleucidAttitude || 0) - 1;
                    } else if (besiegingFaction === 'ptolemy') {
                        neighborCity.ptolemyAttitude = (neighborCity.ptolemyAttitude || 0) - 1;
                    }
                    affectedCities.push(neighborCity.name);
                }
            });
            
            // 5. 周边中立城市骰子判定
            const opposingFaction = besiegingFaction === 'rome' ? 'carthage' : 'rome';
            let joinedOwnFaction = [];
            let joinedOpposingFaction = [];
            
            connectedCities.forEach(cityId => {
                const neighborCity = cities.find(c => c.id === cityId);
                if (neighborCity && neighborCity.faction === 'neutral') {
                    const diceRoll = rollD6();
                    
                    if (diceRoll === 1) {
                        // 加入对立阵营
                        neighborCity.faction = opposingFaction;
                        joinedOpposingFaction.push({ name: neighborCity.name, dice: diceRoll });
                        const opposingFactionName = {'rome': '罗马', 'carthage': '迦太基', 'macedonia': '马其顿', 'seleucid': '塞琉古', 'ptolemy': '托勒密'}[opposingFaction] || '未知';
                        addLog(`🎲 ${neighborCity.name} 投骰结果：${diceRoll}，因恐惧加入${opposingFactionName}阵营！`, opposingFaction);
                    } else if (diceRoll === 6) {
                        // 加入己方阵营
                        neighborCity.faction = besiegingFaction;
                        joinedOwnFaction.push({ name: neighborCity.name, dice: diceRoll });
                        const besiegingFactionName = {'rome': '罗马', 'carthage': '迦太基', 'macedonia': '马其顿', 'seleucid': '塞琉古', 'ptolemy': '托勒密'}[besiegingFaction] || '未知';
                        addLog(`🎲 ${neighborCity.name} 投骰结果：${diceRoll}，因震慑加入${besiegingFactionName}阵营！`, besiegingFaction);
                    } else {
                        addLog(`🎲 ${neighborCity.name} 投骰结果：${diceRoll}，保持中立`, 'system');
                    }
                }
            });
            
            addLog(`围城成功${commander.commander} 攻克${city.name} 并摧毁了这座城市，消耗${siegeCost}资金`, besiegingFaction);
            addLog(`${city.name} 被摧毁：政治分和经济分降低，对双方阵营好感度归零`, 'system');
            
            // 根据阵营显示当前资金
            let currentFunds;
            if (besiegingFaction === 'rome') {
                currentFunds = gameState.romeFunds;
            } else if (besiegingFaction === 'carthage') {
                currentFunds = gameState.carthageFunds;
            } else if (besiegingFaction === 'macedonia') {
                currentFunds = gameState.macedoniaFunds;
            } else if (besiegingFaction === 'seleucid') {
                currentFunds = gameState.seleucidFunds;
            } else if (besiegingFaction === 'ptolemy') {
                currentFunds = gameState.ptolemyFunds;
            }
            addLog(`抢劫资金 ${lootAmount}，当前资金 ${currentFunds}`, besiegingFaction);
            if (affectedCities.length > 0) {
                addLog(`周边城市 ${affectedCities.join('、')} 对该阵营态度-1`, 'system');
            }
        } else {
            // 保留城市：正常占领
            addLog(`围城成功${commander.commander} 攻克${city.name}，消耗${siegeCost}资金`, besiegingFaction);
        }
        
        // 记录行动结果
        const destroyText = destroy ? '成功并摧毁' : '成功并占领';
        recordArmyAction(commander, '围城', 'success', `围城${city.name}${destroyText}`);
        
        // 处理围城成功的资金奖励
        this.handleSiegeReward(originalFaction, besiegingFaction, city.name);
        
        // 更新显示
        this.updateCityDisplay(city);
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
        updateFactionScores();
        updateFactionFunds();
        
        // 清理全局变量
        window.currentSiegeInfo = null;
        
        // 隐藏弹窗
        document.getElementById('cityDestroyModal').style.display = 'none';
        
        // 检查胜利条件
        setTimeout(() => {
            VictorySystem.checkVictoryConditions();
        }, 500);
        
        // 标记单位已完成行动
        const commanderId = commander.id;
        setTimeout(() => {
            ArmyActionManager.markArmyActed(commanderId);
        }, 1000);
    }
    
    // 处理守军撤退
    static handleDefendersRetreat(city, originalFaction) {
        // 获取该城市中原阵营的军队
        const defendingArmies = CityArmyManager.getArmiesAtCityByFaction(city.id, originalFaction);
        
        if (defendingArmies.length === 0) return;
        
        defendingArmies.forEach(armyInfo => {
            const army = armies[originalFaction].find(a => a.id === armyInfo.id);
            if (!army) return;
            
            // 寻找可撤退的地区（相邻的中立地区或己方城市）
            const connectedCities = getConnectedCities(city.id);
            const retreatOptions = connectedCities.filter(cityId => {
                const targetCity = cities.find(c => c.id === cityId);
                return targetCity && (targetCity.faction === 'neutral' || targetCity.faction === originalFaction);
            });
            
            if (retreatOptions.length > 0) {
                // 选择第一个可用的撤退地点
                const retreatLocation = retreatOptions[0];
                const retreatCity = cities.find(c => c.id === retreatLocation);
                
                // 移动军队到撤退地点
                army.location = retreatLocation;
                
                // 士气-1，损0%部队
                army.morale = Math.max(1, army.morale - 1);
                army.lightCavalry = Math.floor((army.lightCavalry || 0) * 0.8);
                army.heavyCavalry = Math.floor((army.heavyCavalry || 0) * 0.8);
                army.heavyInfantry = Math.floor((army.heavyInfantry || 0) * 0.8);
                army.lightInfantry = Math.floor((army.lightInfantry || 0) * 0.8);
                
                addLog(`${army.commander} 被迫${city.name} 撤退${retreatCity.name}，士气-1，损0%部队`, originalFaction);
            } else {
                // 无地区可以撤退，军队被消灭
                const armyIndex = armies[originalFaction].findIndex(a => a.id === army.id);
                if (armyIndex >= 0) {
                    armies[originalFaction].splice(armyIndex, 1);
                    addLog(`${army.commander} ${city.name} 被围攻成功后无处撤退，整支军队被消灭！`, originalFaction);
                    
                    // 检查军队被消灭后是否需要解除围城
                    checkAllSiegesAfterArmyRemoval();
                }
            }
        });
    }
    
    // 获取城市围城状态信息
    static getCityStatus(cityId) {
        const city = cities.find(c => c.id === cityId);
        if (!city) return null;
        
        return {
            name: city.name,
            faction: city.faction,
            isUnderSiege: city.isUnderSiege,
            siegeCount: city.siegeCount,
            besiegingFaction: city.besiegingFaction
        };
    }
}

// 动态指挥官管理系统
class CommanderManager {
    static commanderData = []; // 存储从Excel加载的指挥官数据
    static currentCommanders = { rome: [], carthage: [] }; // 当前活跃的指挥官
    
    // 加载指挥官数据
    static loadCommanderData(data) {
        this.commanderData = data;
        console.log('指挥官数据已加载:', data);
        this.updateCurrentCommanders();
    }
    
    // 根据当前年份更新指挥官
    static updateCurrentCommanders() {
        const currentYear = Math.abs(gameState.currentYear); // 转为正数，BC218 = 218
        
        // 清空当前指挥官
        this.currentCommanders.rome = [];
        this.currentCommanders.carthage = [];
        
        // 筛选当前年份的指挥官
        const yearCommanders = this.commanderData.filter(cmd => 
            cmd.year === currentYear && cmd.faction === 'rome'
        );
        
        // 按优先级排序
        yearCommanders.sort((a, b) => (a.priority || 1) - (b.priority || 1));
        
        yearCommanders.forEach((cmdData, index) => {
            const commander = {
                id: `rome_${currentYear}_${index}`,
                commander: cmdData.name,
                military: cmdData.military || 5,
                political: cmdData.political || 5,
                diplomatic: cmdData.diplomatic || 5,
                location: this.getInitialLocation(index, cmdData),
                isThirdArmy: index === 2 // 第三支部队标记
            };
            
            this.currentCommanders.rome.push(commander);
        });
        
        console.log(`${currentYear}年罗马指挥官:`, this.currentCommanders.rome);
    }
    
    // 获取初始部署位置
    static getInitialLocation(index, cmdData) {
        if (index === 2) {
            return 'rome'; // 第三支部队部署在罗马
        }
        return cmdData.location || (index === 0 ? 'rome' : 'placentia');
    }
    
    // 获取当前年份的罗马军队
    static getCurrentRomanLegions() {
        return this.currentCommanders.rome.map(cmd => ({
            ...cmd,
            faction: 'rome'
        }));
    }
    
        // 年份变化时更新军队
    static onYearChange() {
        const oldCommanders = [...this.currentCommanders.rome];
        this.updateCurrentCommanders();
        const newCommanders = this.currentCommanders.rome;
        
        // 移除上一年的第三支部队
        oldCommanders.forEach(oldCmd => {
            if (oldCmd.isThirdArmy) {
                this.removeArmy(oldCmd.id);
            }
        });
        
        // 更新armies.rome数组
        armies.rome = newCommanders;
        
        // 重新部署军队
        placeArmies();
        
        // 记录变化
        const commanderNames = newCommanders.map(cmd => cmd.commander).join(', ');
        addLog(`${Math.abs(gameState.currentYear)}年罗马军团指挥官: ${commanderNames}`, 'system');
        
        if (newCommanders.length === 3) {
            addLog(`第三支军团由${newCommanders[2].commander}指挥，部署在罗马`, 'system');
        }
    }
    
    // 移除军队
    static removeArmy(armyId) {
        const armyIndex = armies.rome.findIndex(army => army.id === armyId);
        if (armyIndex >= 0) {
            const removedArmy = armies.rome[armyIndex];
            armies.rome.splice(armyIndex, 1);
            addLog(`${removedArmy.commander}的军团已解散`, 'system');
            
            // 检查该军队所在城市的围城状态
            cities.forEach(city => {
                if (city.isUnderSiege && city.besiegingFaction === 'rome') {
                    SiegeSystem.checkAutoLiftSiege(city.id);
                }
            });
        }
    }
    
    // 导出当前指挥官数据
    static exportCurrentData() {
        const exportData = this.commanderData.map(cmd => ({
            年份: cmd.year,
            阵营: cmd.faction,
            指挥官: cmd.name,
            军事: cmd.military,
            政治: cmd.political,
            外交: cmd.diplomatic,
            优先级: cmd.priority || 1,
            初始位置: cmd.location || ''
        }));
        
        return exportData;
    }
}

// 城市状态显示系统
function showCityStatus(cityId) {
    const cityInfo = CityArmyManager.getCityInfo(cityId);
    if (!cityInfo) return;
    
    const panel = document.getElementById('cityStatusPanel');
    const city = cityInfo.city;
    
    // 更新城市名称
    document.getElementById('statusCityName').textContent = city.name;
    
    // 更新势力归属
    const factionElement = document.getElementById('statusFaction');
    let factionName = '中立';
    if (city.faction === 'rome') {
        factionName = '罗马';
    } else if (city.faction === 'carthage') {
        factionName = '迦太基';
    } else if (city.faction === 'macedonia') {
        factionName = '马其顿';
    } else if (city.faction === 'seleucid') {
        factionName = '塞琉古';
    } else if (city.faction === 'ptolemy') {
        factionName = '托勒密';
    }
    factionElement.textContent = factionName;
    factionElement.className = `city-faction ${city.faction}`;
    
    // 更新重要程度
    const importanceElement = document.getElementById('statusImportance');
    importanceElement.textContent = city.important ? '重要城市' : '普通城市';
    
    // 更新政治分数
    const politicalScoreElement = document.getElementById('statusPoliticalScore');
    politicalScoreElement.textContent = city.politicalScore + ' ';
    politicalScoreElement.style.color = city.politicalScore >= 5 ? '#f39c12' : '#ecf0f1';
    
    // 更新经济分数
    const economicScoreElement = document.getElementById('statusEconomicScore');
    economicScoreElement.textContent = city.economicScore + ' ';
    economicScoreElement.style.color = city.economicScore >= 4 ? '#27ae60' : city.economicScore >= 3 ? '#f39c12' : '#ecf0f1';
    
    // 更新工事等级
    const fortificationElement = document.getElementById('statusFortificationLevel');
    fortificationElement.textContent = (city.fortificationLevel || 0) + ' ';
    fortificationElement.style.color = (city.fortificationLevel || 0) >= 1 ? '#f39c12' : '#ecf0f1';
    
    // 更新态度
    const romeAttitudeElement = document.getElementById('statusRomeAttitude');
    const romeAttitude = city.romeAttitude || 0;
    romeAttitudeElement.textContent = romeAttitude;
    romeAttitudeElement.style.color = romeAttitude > 0 ? '#27ae60' : romeAttitude < 0 ? '#e74c3c' : '#ecf0f1';
    
    const carthageAttitudeElement = document.getElementById('statusCarthageAttitude');
    const carthageAttitude = city.carthageAttitude || 0;
    carthageAttitudeElement.textContent = carthageAttitude;
    carthageAttitudeElement.style.color = carthageAttitude > 0 ? '#27ae60' : carthageAttitude < 0 ? '#e74c3c' : '#ecf0f1';
    
    // 更新围城状态
    const siegeElement = document.getElementById('statusSiege');
    if (city.isUnderSiege) {
        let besiegingName = '未知';
        if (city.besiegingFaction === 'rome') besiegingName = '罗马';
        else if (city.besiegingFaction === 'carthage') besiegingName = '迦太基';
        else if (city.besiegingFaction === 'macedonia') besiegingName = '马其顿';
        else if (city.besiegingFaction === 'seleucid') besiegingName = '塞琉古';
        else if (city.besiegingFaction === 'ptolemy') besiegingName = '托勒密';
        siegeElement.innerHTML = `${besiegingName}围城 (${city.siegeCount})`;
        siegeElement.style.color = '#e74c3c';
    } else {
        siegeElement.textContent = '无围城';
        siegeElement.style.color = '#27ae60';
    }
    
    // 更新驻军情况
    const armiesElement = document.getElementById('statusArmies');
    if (cityInfo.armies.length === 0) {
        armiesElement.innerHTML = '<div style="color: #95a5a6;">无驻军</div>';
    } else {
        let armiesHtml = '';
        cityInfo.armies.forEach(army => {
            let factionName = '未知';
            if (army.faction === 'rome') factionName = '罗马';
            else if (army.faction === 'carthage') factionName = '迦太基';
            else if (army.faction === 'macedonia') factionName = '马其顿';
            else if (army.faction === 'seleucid') factionName = '塞琉古';
            else if (army.faction === 'ptolemy') factionName = '托勒密';
            const combatPower = calculateCombatPower(army);
            armiesHtml += `
                <div class="army-info ${army.faction}">
                    <div class="army-commander">${army.commander} (${factionName})</div>
                    <div class="army-stats">战斗值: ${combatPower} | 军事: ${army.military} | 政治: ${army.political}</div>
                </div>
            `;
        });
        armiesElement.innerHTML = armiesHtml;
    }
    
    // 显示面板
    panel.style.display = 'block';
}

function closeCityStatus() {
    document.getElementById('cityStatusPanel').style.display = 'none';
}

// 处理行动结果
function processActionResult(action, success) {
    const cityData = cities.find(c => c.id === gameState.selectedRegion);
    const cityName = cityData ? cityData.name : '未知城市';
    let player = '未知';
    if (gameState.currentPlayer === 'rome') player = '罗马';
    else if (gameState.currentPlayer === 'carthage') player = '迦太基';
    else if (gameState.currentPlayer === 'macedonia') player = '马其顿';
    else if (gameState.currentPlayer === 'seleucid') player = '塞琉古';
    else if (gameState.currentPlayer === 'ptolemy') player = '托勒密';
    
    // 检查行动前置条件
    if (action === 'siege') {
        const currentArmy = getCurrentPlayerArmy();
        console.log('围城调试 - 当前军队:', currentArmy);
        console.log('围城调试 - 选中城市:', gameState.selectedRegion);
        console.log('围城调试 - 城市数据:', cityData);
        
        if (!currentArmy) {
            addLog('没有选中的军队', 'error');
            return false;
        }
        
        // 检查军队是否在目标城市
        if (currentArmy.location !== gameState.selectedRegion) {
            addLog(`${currentArmy.commander} 不在 ${cityData.name}，无法执行围城`, 'error');
            return false;
        }
        
        // 检查是否可以对该城市执行围城
        if (cityData.faction === gameState.currentPlayer) {
            addLog(`${cityData.name} 已是己方城市，无需围城`, 'error');
            return false;
        }
        
        if (cityData.isUnderSiege && cityData.besiegingFaction !== gameState.currentPlayer) {
            addLog(`${cityData.name} 正被其他势力围攻，无法执行围城`, 'error');
            return false;
        }
        
            // 检查资金是否足够
        const siegeCost = 30;
        let currentFunds = 0;
        if (gameState.currentPlayer === 'rome') currentFunds = gameState.romeFunds;
        else if (gameState.currentPlayer === 'carthage') currentFunds = gameState.carthageFunds;
        else if (gameState.currentPlayer === 'macedonia') currentFunds = gameState.macedoniaFunds;
        else if (gameState.currentPlayer === 'seleucid') currentFunds = gameState.seleucidFunds;
        else if (gameState.currentPlayer === 'ptolemy') currentFunds = gameState.ptolemyFunds;
        if (currentFunds < siegeCost) {
            addLog(`资金不足，无法围城（需${siegeCost}资金）`, 'error');
            return false;
        }
        
        console.log('围城调试 - 前置条件检查通过');
    }
    
    // 围城行动的特殊处理
    if (action === 'siege') {
        const currentArmy = getCurrentPlayerArmy();
        const siegeCost = 30;
        
        // 记录本回合被围城的城市
        if (!gameState.citiesBesiegedThisTurn.includes(cityData.id)) {
            gameState.citiesBesiegedThisTurn.push(cityData.id);
        }
        
        // 先扣除围城资金
        if (gameState.currentPlayer === 'rome') {
            gameState.romeFunds -= siegeCost;
        } else if (gameState.currentPlayer === 'carthage') {
            gameState.carthageFunds -= siegeCost;
        } else if (gameState.currentPlayer === 'macedonia') {
            gameState.macedoniaFunds -= siegeCost;
        } else if (gameState.currentPlayer === 'seleucid') {
            gameState.seleucidFunds -= siegeCost;
        } else if (gameState.currentPlayer === 'ptolemy') {
            gameState.ptolemyFunds -= siegeCost;
        }
        
        let siegeResult;
        
        if (!cityData.isUnderSiege && cityData.faction !== gameState.currentPlayer) {
            // 首次围城 - 直接执行围城判定，失败时才进入围攻状态
            siegeResult = SiegeSystem.executeSiegeWithStateChange(gameState.selectedRegion, currentArmy, gameState.currentPlayer, siegeCost);
        } else if (cityData.isUnderSiege && cityData.besiegingFaction === gameState.currentPlayer) {
            // 继续围城判定
            siegeResult = SiegeSystem.executeSiege(gameState.selectedRegion, currentArmy, siegeCost);
        } else {
            // 其他情况（不应该到达这里，但以防万一）
            addLog(`无法${cityData.name} 执行围城`, 'error');
            return false;
        }
        
        // 更新资金显示
        updateFactionFunds();
        
        // 围城总是被认为是有效行动（即使失败也会建立围攻状态）
        return true;
    }
    
    if (success) {
        addLog(`${player} ${cityName} 成功执行${getActionName(action)}`, gameState.currentPlayer);
        
        // 根据不同行动执行相应效果
        switch (action) {
            // 游说已经有专门的处理函数，这里不再处理
            case 'diplomacy':
                return true;
        }
        
        return true;
    } else {
        addLog(`${player} ${cityName} 执行${getActionName(action)}失败`, gameState.currentPlayer);
        
        // 行动失败但仍然是有效的尝试，回合应该结束
        return true;
    }
}

// 获取行动名称
function getActionName(action) {
    const names = {
        'move': '移动',
        'siege': '围城',
        'harass': '骚扰',
        'diplomacy': '游说',
        'recruit': '征召',
        'reorganize': '整编',
        'fortify': '修筑',
        'raise_army': '组军',
        'borrow': '借款',
        'repay': '还款'
    };
    return names[action];
}

// 改变城市势力
function changeFaction(cityId, newFaction) {
    const city = cities.find(c => c.id === cityId);
    
    // 记录城市之前的阵营（用于AI追踪失去的城市）
    city.previousFaction = city.faction;
    city.faction = newFaction;
    
    const cityElement = document.getElementById(cityId);
    cityElement.className = `city ${newFaction}${city.important ? ' important' : ''}`;
    
    // 更新阵营分数显示
    updateFactionScores();
    
    // 检查胜利条件
    setTimeout(() => {
        VictorySystem.checkVictoryConditions();
    }, 500);
}

// 结束回合
function endTurn() {
    // 检查是否有战斗相关弹窗打开，如果有则不允许结束回合
    const defenseModal = document.getElementById('defenseChoiceModal');
    const battlePrepModal = document.getElementById('battlePrepModal');
    const battleModeModal = document.getElementById('battleModeModal');
    const battleResultModal = document.getElementById('battleResultModal');
    const reinforcementModal = document.getElementById('reinforcementModal');
    
    if ((defenseModal && defenseModal.style.display === 'flex') ||
        (battlePrepModal && battlePrepModal.style.display === 'flex') ||
        (battleModeModal && battleModeModal.style.display === 'flex') ||
        (battleResultModal && battleResultModal.style.display === 'flex') ||
        (reinforcementModal && reinforcementModal.style.display === 'flex')) {
        console.log('[endTurn] 战斗进行中，阻止结束回合');
        return;
    }
    
    // 检查AI是否暂停（战斗进行中）
    if (typeof AIController !== 'undefined' && AIController.config.enabled && AIController.config.paused) {
        console.log('[endTurn] AI暂停中（战斗进行中），阻止结束回合');
        return;
    }
    
    // 检查是否还有军队未行动（AI回合时跳过确认）
    const isAIControlled = (gameState.currentPlayer === 'rome' && AIController && AIController.shouldControl()) ||
                          (gameState.currentPlayer === 'carthage' && typeof CarthageAIController !== 'undefined' && CarthageAIController.shouldControl()) ||
                          (gameState.currentPlayer === 'macedonia' && typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.shouldControl()) ||
                          (gameState.currentPlayer === 'seleucid' && typeof SeleucidAIController !== 'undefined' && SeleucidAIController.shouldControl()) ||
                          (gameState.currentPlayer === 'ptolemy' && typeof PtolemyAIController !== 'undefined' && PtolemyAIController.shouldControl());
    
    if (!isAIControlled && !ArmyActionManager.allArmiesActed()) {
        const remainingCount = armies[gameState.currentPlayer].length - gameState.actedArmies.length;
        const confirmEnd = confirm(`还有 ${remainingCount} 支军队未行动，确定要结束回合吗？`);
        if (!confirmEnd) {
            return;
        }
    }
    
    // 回合循环: 罗马 → 迦太基 → 马其顿 → 塞琉古 → 托勒密 → 罗马
    if (gameState.currentPlayer === 'rome') {
        gameState.currentPlayer = 'carthage';
    } else if (gameState.currentPlayer === 'carthage') {
        gameState.currentPlayer = 'macedonia';
    } else if (gameState.currentPlayer === 'macedonia') {
        gameState.currentPlayer = 'seleucid';
    } else if (gameState.currentPlayer === 'seleucid') {
        gameState.currentPlayer = 'ptolemy';
    } else if (gameState.currentPlayer === 'ptolemy') {
        gameState.currentPlayer = 'rome';
    }
    
    // 清空新回合阵营所有部队的行动记录
    clearFactionActionRecords(gameState.currentPlayer);
    
    // 只有当轮到罗马时（完整回合结束）才推进时间和回合
    if (gameState.currentPlayer === 'rome') {
        gameState.currentTurn++;
        TimeSystem.advanceMonth();
        
        // 处理城市经济自然增长（在计算经济收入之前）
        processCityEconomicGrowth();
        
        // 计算经济收入（每个完整回合结束时）
        calculateEconomicIncome();
        
        // 计算军饷支出（每个完整回合结束时）
        calculateMilitaryPayroll();
        
        // 处理债务惩罚（每个完整回合结束时）
        handleDebtPenalties();
        
        // 显示回合经济汇总
        displayEconomicSummary();
        
        // 处理被围攻城市中军队的士气惩罚
        handleSiegedArmiesMoralePenalty();
        
        // 处理士气低下导致的部队损失
        processMoraleLoss();
        
        // 检查所有军队战斗力是否低于消灭阈值
        checkAllArmiesCombatPower();
        
        // 检查所有围城状态（确保围城军队仍在城市中）
        checkAllSiegesAfterArmyRemoval();
        
        // 检查历史事件
        const events = TimeSystem.checkHistoricalEvents();
        if (events.length > 0) {
            events.forEach(event => {
                addLog(`📅 历史事件: ${event}`, 'historical-event');
            });
        }
        
        // 每回合开始时检查首都陷落导致全国中立
        checkCapitalFallAndNeutralize();
        
        // 每回合开始时检查城市态度和阵营变化
        checkCityAttitudeAndFaction();
        
        // 重置本回合追踪数据
        gameState.citiesBesiegedThisTurn = [];
        gameState.citiesHarassedThisTurn = [];
    }
    
    updateUI();
    
    const timeInfo = TimeSystem.getFullTimeDisplay();
    let playerName = '未知';
    if (gameState.currentPlayer === 'rome') playerName = '罗马';
    else if (gameState.currentPlayer === 'carthage') playerName = '迦太基';
    else if (gameState.currentPlayer === 'macedonia') playerName = '马其顿';
    else if (gameState.currentPlayer === 'seleucid') playerName = '塞琉古';
    else if (gameState.currentPlayer === 'ptolemy') playerName = '托勒密';
    addLog(`--- ${timeInfo} - ${gameState.currentTurn}回合 ${playerName}行动 ---`);
    
    // 检查胜利条件
    VictorySystem.checkVictoryConditions();
    
    // 初始化新回合的军队行动系统
    ArmyActionManager.initializeTurn();
}

// 启动外部战斗系统
function startExternalBattle(attacker, defender, city, isActiveAttack) {
    console.log('⚔️ 启动外部战斗系统');
    
    // 获取完整的军队数据
    const attackerArmy = getAllArmies().find(a => a.id === attacker.id);
    const defenderArmy = getAllArmies().find(a => a.id === defender.id);
    
    if (!attackerArmy || !defenderArmy) {
        addLog('无法找到军队数据', 'error');
        console.error('❌ 无法找到军队数据');
        return;
    }
    
    // 启动战斗系统
    const success = BattleSystemIntegration.startBattle(
        attackerArmy, 
        defenderArmy, 
        city.name,
        function(battleResult) {
            handleBattleResult(battleResult, attackerArmy, defenderArmy, city, isActiveAttack);
        }
    );
    
    if (!success) {
        addLog('无法启动战斗系统', 'error');
    }
}

// 投掷骰子（D6）
function rollD6() {
    return Math.floor(Math.random() * 6) + 1;
}

// 投掷2D6
function roll2D6() {
    return rollD6() + rollD6();
}

// 显示会战结果弹窗
function showBattleResultModal(result, attacker, defender, city) {
    console.log('📊 显示会战结果弹窗', result);
    
    const winner = result.winner; // faction name
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    const winnerName = getFactionName(winner);
    
    // 确定胜利方和失败方军队
    const winnerArmy = (attacker.faction === winner) ? attacker : defender;
    const loserArmy = (attacker.faction === winner) ? defender : attacker;
    const loserName = getFactionName(loserArmy.faction);
    
    // 计算百分比
    const winnerPercentage = result[winner + 'Percentage'] || result.winnerPercentage || 75;
    const loserFactionKey = loserArmy.faction;
    const loserPercentage = result[loserFactionKey + 'Percentage'] || result.loserPercentage || 35;
    
    // 投掷骰子计算兵力损失
    const winnerDice = rollD6(); // 胜利方损失 D6%
    const loserDice1 = rollD6();
    const loserDice2 = rollD6();
    const loserDiceTotal = loserDice1 + loserDice2; // 失败方损失 (20 + 2D6)%
    
    const winnerLossPercentage = winnerDice;
    const loserLossPercentage = 20 + loserDiceTotal;
    
    // 更新弹窗显示
    const modal = document.getElementById('battleResultModal');
    document.getElementById('battleResultTitle').textContent = `${city.name} 会战结束`;
    document.getElementById('battleResultSituation').textContent = `${winnerName}军队获得胜利！`;
    
    // 胜利横幅
    const winnerBanner = document.getElementById('battleResultWinner');
    winnerBanner.textContent = `🏆 ${winnerName}获胜！`;
    
    // 根据阵营设置背景颜色
    const factionBackgrounds = {
        'rome': 'linear-gradient(135deg, rgba(231, 76, 60, 0.3), rgba(192, 57, 43, 0.3))',
        'carthage': 'linear-gradient(135deg, rgba(155, 89, 182, 0.3), rgba(142, 68, 173, 0.3))',
        'macedonia': 'linear-gradient(135deg, rgba(52, 152, 219, 0.3), rgba(41, 128, 185, 0.3))',
        'seleucid': 'linear-gradient(135deg, rgba(22, 160, 133, 0.3), rgba(19, 141, 117, 0.3))',
        'ptolemy': 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 165, 0, 0.3))'
    };
    winnerBanner.style.background = factionBackgrounds[winner] || factionBackgrounds['rome'];
    
    // 胜利方信息
    document.getElementById('battleResultWinnerName').textContent = winnerName;
    document.getElementById('battleResultWinnerCommander').textContent = winnerArmy.commander;
    document.getElementById('battleResultWinnerPoints').textContent = `${winnerPercentage.toFixed(1)}%`;
    document.getElementById('battleResultWinnerLoss').textContent = `${winnerLossPercentage}%`;
    document.getElementById('battleResultWinnerMorale').textContent = '5.0';
    
    // 失败方信息
    document.getElementById('battleResultLoserName').textContent = loserName;
    document.getElementById('battleResultLoserCommander').textContent = loserArmy.commander;
    document.getElementById('battleResultLoserPoints').textContent = `${loserPercentage.toFixed(1)}%`;
    document.getElementById('battleResultLoserLoss').textContent = `${loserLossPercentage}%`;
    document.getElementById('battleResultLoserMorale').textContent = '1.0';
    
    // 骰子详情
    document.getElementById('battleResultDiceDetails').innerHTML = `
        🎲 骰子结果：<br>
        胜利方（${winnerName}）损失 = D6 = ${winnerDice}%<br>
        失败方（${loserName}）损失 = 20% + 2D6(${loserDice1}+${loserDice2}) = ${loserLossPercentage}%
    `;
    
    // 保存结果数据到modal，供关闭时使用
    modal.dataset.result = JSON.stringify({
        winner,
        winnerArmy,
        loserArmy,
        winnerLossPercentage,
        loserLossPercentage,
        loserPercentage,
        city,
        isActiveAttack: result.isActiveAttack
    });
    
    modal.style.display = 'flex';
}

// 关闭会战结果弹窗
function closeBattleResultModal() {
    const modal = document.getElementById('battleResultModal');
    const resultData = JSON.parse(modal.dataset.result);
    
    // 应用战斗结果
    applyBattleResult(resultData);
    
    modal.style.display = 'none';
}

// 应用战斗结果（士气和兵力变化）
function applyBattleResult(data) {
    const { winner, winnerArmy, loserArmy, winnerLossPercentage, loserLossPercentage, loserPercentage, city, isActiveAttack, isAutoBattle } = data;
    
    console.log('[applyBattleResult] isActiveAttack =', isActiveAttack);
    console.log('[applyBattleResult] isAutoBattle =', isAutoBattle);
    console.log('[applyBattleResult] data =', data);
    
    // 在armies数组中找到实际的军队对象
    const actualWinnerArmy = getAllArmies().find(a => a.id === winnerArmy.id);
    const actualLoserArmy = getAllArmies().find(a => a.id === loserArmy.id);
    
    // 如果是自动战斗，损失已经应用过了，只需要处理撤退
    if (isAutoBattle) {
        console.log('[applyBattleResult] 自动战斗，跳过重复应用损失，只处理撤退');
        
        // 只处理撤退（损失已经在executeAutoBattle中应用）
        if (actualLoserArmy) {
            // 直接调用撤退处理（参数：loserArmy, loserFaction, city, isActiveAttack）
            handleBattleLoserRetreat(actualLoserArmy, actualLoserArmy.faction, city, isActiveAttack);
            return; // 撤退处理中已经包含了恢复AI和标记军队完成的逻辑
        }
    } else {
        // 详细会战：需要应用损失和属性变化
        if (actualWinnerArmy) {
            // 胜利方：士气增长至5，损失 winnerLossPercentage% 兵力
            actualWinnerArmy.morale = 5.0;
            const lossRatio = 1 - (winnerLossPercentage / 100);
            actualWinnerArmy.lightCavalry = Math.floor(actualWinnerArmy.lightCavalry * lossRatio);
            actualWinnerArmy.heavyCavalry = Math.floor(actualWinnerArmy.heavyCavalry * lossRatio);
            actualWinnerArmy.heavyInfantry = Math.floor(actualWinnerArmy.heavyInfantry * lossRatio);
            actualWinnerArmy.lightInfantry = Math.floor(actualWinnerArmy.lightInfantry * lossRatio);
            
            // 胜利方将领军事值+2（不大于11）
            const oldMilitary = actualWinnerArmy.military;
            actualWinnerArmy.military = Math.min(11, actualWinnerArmy.military + 2);
            const militaryGain = actualWinnerArmy.military - oldMilitary;
            
            addLog(`${actualWinnerArmy.commander} 获胜，士气提升至5.0，损失${winnerLossPercentage}%兵力`, winner);
            if (militaryGain > 0) {
                addLog(`${actualWinnerArmy.commander} 通过战斗经验提升，军事值 ${oldMilitary} → ${actualWinnerArmy.military} (+${militaryGain})`, winner);
            }
            
            // 检查胜利方战斗力是否低于阈值
            const winnerDestroyed = BattleSystem.checkArmyDestroyed(actualWinnerArmy);
            if (winnerDestroyed) {
                addLog(`${actualWinnerArmy.commander} 虽然获胜，但战斗力过低已被消灭`, winner);
            }
        }
        
        if (actualLoserArmy) {
            // 失败方：士气降至1，损失 loserLossPercentage% 兵力
            actualLoserArmy.morale = 1.0;
            const lossRatio = 1 - (loserLossPercentage / 100);
            actualLoserArmy.lightCavalry = Math.floor(actualLoserArmy.lightCavalry * lossRatio);
            actualLoserArmy.heavyCavalry = Math.floor(actualLoserArmy.heavyCavalry * lossRatio);
            actualLoserArmy.heavyInfantry = Math.floor(actualLoserArmy.heavyInfantry * lossRatio);
            actualLoserArmy.lightInfantry = Math.floor(actualLoserArmy.lightInfantry * lossRatio);
            
            // 失败方将领军事值+1（不大于11）
            const oldMilitary = actualLoserArmy.military;
            actualLoserArmy.military = Math.min(11, actualLoserArmy.military + 1);
            const militaryGain = actualLoserArmy.military - oldMilitary;
            
            addLog(`${actualLoserArmy.commander} 战败，士气降至1.0，损失${loserLossPercentage}%兵力`, loserArmy.faction);
            if (militaryGain > 0) {
                addLog(`${actualLoserArmy.commander} 从失败中汲取教训，军事值 ${oldMilitary} → ${actualLoserArmy.military} (+${militaryGain})`, loserArmy.faction);
            }
            
            // 检查失败方战斗力是否低于阈值
            const loserDestroyed = BattleSystem.checkArmyDestroyed(actualLoserArmy);
            
            if (loserDestroyed) {
                // 部队被消灭，已经在checkArmyDestroyed中处理
                addLog(`${actualLoserArmy.commander} 战斗力过低，部队被消灭`, loserArmy.faction);
                // 不需要撤退，直接结束
            } else {
                // 判断是否全军覆没（剩余分值 < 35%）
                if (loserPercentage < 35) {
                    addLog(`${actualLoserArmy.commander} 部队在 ${city.name} 全军覆没！`, loserArmy.faction);
                    
                    // 从游戏中移除败方军队
                    const loserFaction = actualLoserArmy.faction;
                    const armyIndex = armies[loserFaction].findIndex(army => army.id === actualLoserArmy.id);
                    if (armyIndex >= 0) {
                        armies[loserFaction].splice(armyIndex, 1);
                        checkAllSiegesAfterArmyRemoval();
                    }
                } else {
                    // 败方撤退（详细会战）
                    handleBattleLoserRetreat(actualLoserArmy, actualLoserArmy.faction, city, isActiveAttack);
                    return; // 撤退处理中已经包含了后续流程
                }
            }
        }
    }
    
    // 如果全军覆没（没有撤退），需要手动处理后续流程
    // 更新地图显示
    generateMap();
    drawRoutes();
    absoluteFix();
    placeArmies();
    
    // 恢复AI执行（所有派系）
    if (typeof AIController !== 'undefined' && AIController.config.enabled) {
        AIController.resume();
    }
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
        CarthageAIController.resume();
    }
    if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
        MacedoniaAIController.resume();
    }
    if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
        SeleucidAIController.resume();
    }
    if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
        PtolemyAIController.resume();
    }
    
    console.log('[applyBattleResult] 准备根据isActiveAttack决定后续行为, isActiveAttack =', isActiveAttack);
    
    // 根据是否为主动攻击决定后续行为
    if (isActiveAttack) {
        // 主动攻击：标记攻击方军队已行动
        console.log('[applyBattleResult] 主动攻击，标记军队已行动');
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
    } else {
        // 移动触发的会战：结束回合
        console.log('[applyBattleResult] 非主动攻击，结束回合');
        setTimeout(() => {
            endTurn();
        }, 100);
    }
}

// 处理战斗结果
function handleBattleResult(result, attacker, defender, city, isActiveAttack) {
    console.log('🏆 处理战斗结果:', result);
    
    const winner = result.winner;
    const factionNames = {'rome': '罗马', 'carthage': '迦太基', 'macedonia': '马其顿', 'seleucid': '塞琉古', 'ptolemy': '托勒密'};
    const winnerName = factionNames[winner] || '未知';
    
    addLog(`🏆 会战结束！${winnerName}获胜！`, winner);
    addLog(`罗马剩余分值: ${result.romePercentage.toFixed(1)}%，迦太基剩余分值: ${result.carthagePercentage.toFixed(1)}%`, 'system');
    
    // 保存isActiveAttack标志到result中
    result.isActiveAttack = isActiveAttack;
    
    // 显示会战结果弹窗
    showBattleResultModal(result, attacker, defender, city);
}

// 支援系统
class ReinforcementSystem {
    static requestReinforcements() {
        const choice = BattleSystem.defenseChoice;
        if (!choice) {
            console.error('[支援系统] 没有防御选择数据');
            return;
        }
        
        // 判断是攻击方还是防御方请求支援
        const isAttackerRequesting = choice.isAttackerRequestingSupport || false;
        
        // 如果是攻击方请求支援，使用攻击方数据；否则使用防御方数据
        let requestingArmy;
        if (isAttackerRequesting) {
            requestingArmy = getAllArmies().find(a => a.id === choice.attacker.id);
            if (!requestingArmy) {
                console.error('[支援系统] 找不到攻击部队');
                return;
            }
        } else {
            requestingArmy = getAllArmies().find(a => a.id === choice.defender.id);
            if (!requestingArmy) {
                console.error('[支援系统] 找不到被攻击部队');
                return;
            }
        }
        
        const city = cities.find(c => c.id === choice.cityId);
        const requestingFaction = requestingArmy.faction;
        
        console.log(`[支援系统] 正在为 ${requestingArmy.commander} 寻找支援部队`);
        console.log(`[支援系统] 战场城市: ${city.name} (${choice.cityId})`);
        console.log(`[支援系统] 请求方阵营: ${requestingFaction}`);
        console.log(`[支援系统] 是否为攻击方请求: ${isAttackerRequesting}`);
        
        // 查找可支援的部队
        const potentialReinforcements = [];
        
        // 1. 同城市的友军
        const armiesInCity = CityArmyManager.getArmiesAtCityByFaction(choice.cityId, requestingFaction);
        console.log(`[支援系统] 同城友军数量: ${armiesInCity.length}`);
        armiesInCity.forEach(army => {
            if (army.id !== requestingArmy.id) {
                console.log(`[支援系统] 找到同城友军: ${army.commander}`);
                potentialReinforcements.push({
                    army: army,
                    location: city.name,
                    distance: '同城'
                });
            }
        });
        
        // 2. 临近城市的友军（排除海路连接）
        const connectedCities = getConnectedCities(choice.cityId);
        console.log(`[支援系统] 临近城市列表 (${connectedCities.length}个):`, connectedCities);
        
        connectedCities.forEach(cityId => {
            // 排除海路连接
            if (isSeaRoute(choice.cityId, cityId)) {
                console.log(`[支援系统] ${cityId} 是海路连接，跳过`);
                return;
            }
            
            const neighborCity = cities.find(c => c.id === cityId);
            if (neighborCity) {
                const neighborArmies = CityArmyManager.getArmiesAtCityByFaction(cityId, requestingFaction);
                console.log(`[支援系统] ${neighborCity.name} 友军数量: ${neighborArmies.length}`);
                neighborArmies.forEach(army => {
                    console.log(`[支援系统] 找到临近友军: ${army.commander} (位于${neighborCity.name})`);
                    potentialReinforcements.push({
                        army: army,
                        location: neighborCity.name,
                        distance: '临近城市'
                    });
                });
            } else {
                console.warn(`[支援系统] 找不到城市: ${cityId}`);
            }
        });
        
        console.log(`[支援系统] 可支援部队总数: ${potentialReinforcements.length}`);
        
        // 显示支援请求弹窗
        this.showReinforcementModal(requestingArmy, potentialReinforcements, choice, isAttackerRequesting);
    }
    
    static showReinforcementModal(requestingArmy, reinforcements, choice, isAttackerRequesting) {
        // 更新请求部队信息
        const requestingPower = calculateCombatPower(requestingArmy);
        const roleText = isAttackerRequesting ? '进攻部队' : '被攻击部队';
        document.getElementById('reinforcementDefenderInfo').innerHTML = `
            <strong>${roleText}</strong><br>
            指挥官：${requestingArmy.commander}<br>
            当前战斗力：${requestingPower}
        `;
        
        // 生成支援部队列表
        const listContainer = document.getElementById('reinforcementArmiesList');
        
        if (reinforcements.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: #95a5a6; padding: 20px;">
                    暂无可支援的部队
                </div>
            `;
        } else {
            let html = '';
            reinforcements.forEach((info, index) => {
                const army = info.army;
                const power = calculateCombatPower(army);
                html += `
                    <div style="background: rgba(44, 62, 80, 0.5); padding: 10px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;"
                         onmouseover="this.style.background='rgba(52, 152, 219, 0.3)'"
                         onmouseout="this.style.background='rgba(44, 62, 80, 0.5)'"
                         onclick="ReinforcementSystem.requestFromArmy(${index})">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold; color: #ecf0f1; margin-bottom: 4px;">
                                    ${army.commander}
                                </div>
                                <div style="font-size: 12px; color: #bdc3c7;">
                                    位置：${info.location} (${info.distance})<br>
                                    战斗力：${power} | 士气：${army.morale}
                                </div>
                            </div>
                            <div style="background: rgba(52, 152, 219, 0.6); padding: 8px 15px; border-radius: 4px; font-weight: bold; color: white;">
                                请求支援
                            </div>
                        </div>
                    </div>
                `;
            });
            listContainer.innerHTML = html;
        }
        
        // 保存数据供后续使用
        window.currentReinforcementData = {
            requestingArmy: requestingArmy,
            reinforcements: reinforcements,
            choice: choice,
            isAttackerRequesting: isAttackerRequesting
        };
        
        // 隐藏防御选择弹窗，显示支援弹窗
        document.getElementById('defenseChoiceModal').style.display = 'none';
        document.getElementById('reinforcementModal').style.display = 'flex';
    }
    
    static requestFromArmy(index) {
        const data = window.currentReinforcementData;
        if (!data) return;
        
        const reinforcementInfo = data.reinforcements[index];
        const reinforcingArmy = reinforcementInfo.army;
        const requestingArmy = data.requestingArmy;
        
        // 投掷2D6判定是否支援成功
        const dice1 = rollD6();
        const dice2 = rollD6();
        const diceTotal = dice1 + dice2;
        
        console.log(`支援判定：2D6 = ${dice1}+${dice2} = ${diceTotal}`);
        
        if (diceTotal <= 10) {
            // 支援成功
            this.executeReinforcement(reinforcingArmy, requestingArmy, dice1, dice2);
        } else {
            // 支援失败
            addLog(`${reinforcingArmy.commander} 尝试支援 ${requestingArmy.commander}，但距离太远或时机不当 (2D6=${diceTotal})`, requestingArmy.faction);
            
            // 显示失败提示并返回
            alert(`支援失败！\n投掷2D6 = ${dice1}+${dice2} = ${diceTotal} > 10\n\n${reinforcingArmy.commander} 无法及时赶到支援。`);
        }
    }
    
    static executeReinforcement(reinforcingArmy, requestingArmy, dice1, dice2) {
        // 计算转移的兵力百分比：2D6 × 10%
        const transferPercentage = (dice1 + dice2) * 10;
        
        // 计算各兵种的转移数量
        const lightCavTransfer = Math.floor((reinforcingArmy.lightCavalry || 0) * transferPercentage / 100);
        const heavyCavTransfer = Math.floor((reinforcingArmy.heavyCavalry || 0) * transferPercentage / 100);
        const heavyInfTransfer = Math.floor((reinforcingArmy.heavyInfantry || 0) * transferPercentage / 100);
        const lightInfTransfer = Math.floor((reinforcingArmy.lightInfantry || 0) * transferPercentage / 100);
        
        const totalTransfer = lightCavTransfer + heavyCavTransfer + heavyInfTransfer + lightInfTransfer;
        
        // 从支援部队减少兵力
        reinforcingArmy.lightCavalry = (reinforcingArmy.lightCavalry || 0) - lightCavTransfer;
        reinforcingArmy.heavyCavalry = (reinforcingArmy.heavyCavalry || 0) - heavyCavTransfer;
        reinforcingArmy.heavyInfantry = (reinforcingArmy.heavyInfantry || 0) - heavyInfTransfer;
        reinforcingArmy.lightInfantry = (reinforcingArmy.lightInfantry || 0) - lightInfTransfer;
        
        // 加入被支援部队
        requestingArmy.lightCavalry = (requestingArmy.lightCavalry || 0) + lightCavTransfer;
        requestingArmy.heavyCavalry = (requestingArmy.heavyCavalry || 0) + heavyCavTransfer;
        requestingArmy.heavyInfantry = (requestingArmy.heavyInfantry || 0) + heavyInfTransfer;
        requestingArmy.lightInfantry = (requestingArmy.lightInfantry || 0) + lightInfTransfer;
        
        // 记录日志
        addLog(`🤝 支援成功！${reinforcingArmy.commander} 派遣 ${totalTransfer} 兵力支援 ${requestingArmy.commander} (2D6=${dice1}+${dice2}，转移${transferPercentage}%)`, requestingArmy.faction);
        
        if (lightCavTransfer > 0) addLog(`  轻骑兵 +${lightCavTransfer}`, requestingArmy.faction);
        if (heavyCavTransfer > 0) addLog(`  重骑兵 +${heavyCavTransfer}`, requestingArmy.faction);
        if (heavyInfTransfer > 0) addLog(`  重步兵 +${heavyInfTransfer}`, requestingArmy.faction);
        if (lightInfTransfer > 0) addLog(`  轻装步兵 +${lightInfTransfer}`, requestingArmy.faction);
        
        // 显示成功提示
        const newRequestingPower = calculateCombatPower(requestingArmy);
        alert(`支援成功！\n\n${reinforcingArmy.commander} 派遣 ${totalTransfer} 兵力支援 ${requestingArmy.commander}\n\n转移比例：2D6×10% = ${dice1}+${dice2}×10% = ${transferPercentage}%\n\n${requestingArmy.commander} 新战斗力：${newRequestingPower}`);
        
        // 更新地图显示
        placeArmies();
        
        // 关闭支援弹窗，显示更新后的防御选择弹窗
        this.closeAndRefresh();
    }
    
    static closeAndRefresh() {
        document.getElementById('reinforcementModal').style.display = 'none';
        
        const data = window.currentReinforcementData;
        
        // 如果是攻击方请求支援，完成后直接发起攻击
        if (data && data.isAttackerRequesting) {
            const attackData = window.currentAttackData;
            if (attackData) {
                // 获取最新的攻击方数据（已经包含支援兵力）
                const updatedAttacker = getAllArmies().find(a => a.id === attackData.attacker.id);
                if (updatedAttacker) {
                    initiateAttack(updatedAttacker, attackData.defender, attackData.city);
                    return;
                }
            }
        }
        
        // 如果是防御方请求支援，检查是否有作战准备数据
        if (window.currentBattlePrepData) {
            // 获取最新的防御方数据（已经包含支援兵力）
            const updatedDefender = getAllArmies().find(a => a.id === window.currentBattlePrepData.defender.id);
            if (updatedDefender) {
                // 更新作战准备数据
                window.currentBattlePrepData.defender = updatedDefender;
                
                // 更新战斗力显示
                const newPower = calculateCombatPower(updatedDefender);
                document.getElementById('battlePrepDefenderPower').textContent = `战斗力：${newPower}`;
            }
            
            // 返回作战准备弹窗
            document.getElementById('battlePrepModal').style.display = 'flex';
        } else {
            // 旧逻辑：返回防御选择弹窗
            const choice = BattleSystem.defenseChoice;
            if (choice) {
                const requestingArmy = getAllArmies().find(a => a.id === choice.defender.id);
                if (requestingArmy) {
                    const newPower = calculateCombatPower(requestingArmy);
                    document.getElementById('defenseDefenderPower').textContent = `战斗力：${newPower}`;
                }
            }
            
            document.getElementById('defenseChoiceModal').style.display = 'flex';
        }
    }
}

// 全局函数接口
function requestReinforcements() {
    ReinforcementSystem.requestReinforcements();
}

function closeReinforcementModal() {
    document.getElementById('reinforcementModal').style.display = 'none';
    
    const data = window.currentReinforcementData;
    
    // 如果是攻击方关闭支援弹窗，返回到攻击准备弹窗
    if (data && data.isAttackerRequesting) {
        const attackData = window.currentAttackData;
        if (attackData) {
            showAttackerChoiceModal(attackData.attacker, attackData.defender, attackData.city);
            return;
        }
    }
    
    // 如果是防御方，检查是否有作战准备数据
    if (window.currentBattlePrepData) {
        // 返回到作战准备弹窗
        document.getElementById('battlePrepModal').style.display = 'flex';
    } else {
        // 返回到防御选择弹窗
        document.getElementById('defenseChoiceModal').style.display = 'flex';
    }
}

// 显示作战准备弹窗（防御方）
function showBattlePrepModal(attackerArmy, defenderArmy, city, isActiveAttack) {
    // 保存战斗数据
    window.currentBattlePrepData = {
        attacker: attackerArmy,
        defender: defenderArmy,
        city: city,
        isActiveAttack: isActiveAttack
    };
    
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    
    const attackerFactionName = getFactionName(attackerArmy.faction);
    const defenderFactionName = getFactionName(defenderArmy.faction);
    
    // 更新弹窗内容
    document.getElementById('battlePrepTitle').textContent = '作战准备';
    document.getElementById('battlePrepSituation').textContent = 
        `${attackerArmy.commander}（${attackerFactionName}）来袭，${defenderArmy.commander}（${defenderFactionName}）准备迎战`;
    
    // 更新军队信息
    document.getElementById('battlePrepAttackerInfo').textContent = `指挥官：${attackerArmy.commander}`;
    document.getElementById('battlePrepDefenderInfo').textContent = `指挥官：${defenderArmy.commander}`;
    
    // 计算战斗力
    const attackerPower = calculateCombatPower(attackerArmy);
    const defenderPower = calculateCombatPower(defenderArmy);
    document.getElementById('battlePrepAttackerPower').textContent = `战斗力：${attackerPower}`;
    document.getElementById('battlePrepDefenderPower').textContent = `战斗力：${defenderPower}`;
    
    // 显示弹窗
    document.getElementById('battlePrepModal').style.display = 'flex';
}

// 作战准备：请求援军
function requestBattleReinforcements() {
    const data = window.currentBattlePrepData;
    if (!data) return;
    
    // 设置BattleSystem.defenseChoice供援军系统使用
    BattleSystem.defenseChoice = {
        cityId: data.city.id,
        attacker: data.attacker,
        defender: data.defender,
        isActiveAttack: data.isActiveAttack,
        isAttackerRequestingSupport: false // 防御方请求
    };
    
    // 隐藏作战准备弹窗
    document.getElementById('battlePrepModal').style.display = 'none';
    
    // 调用援军系统
    requestReinforcements();
}

// 作战准备：返回防御选择
function returnToDefenseChoice() {
    const data = window.currentBattlePrepData;
    if (!data) return;
    
    // 隐藏作战准备弹窗
    document.getElementById('battlePrepModal').style.display = 'none';
    
    // 重新设置BattleSystem.defenseChoice
    BattleSystem.defenseChoice = {
        cityId: data.city.id,
        attacker: data.attacker,
        defender: data.defender,
        isActiveAttack: data.isActiveAttack
    };
    
    // 重新显示防御选择弹窗
    const city = cities.find(c => c.id === data.city.id);
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    const attackerFactionName = getFactionName(data.attacker.faction);
    const defenderFactionName = getFactionName(data.defender.faction);
    
    document.getElementById('defenseChoiceTitle').textContent = `${attackerFactionName}军队来袭！`;
    document.getElementById('defenseSituation').textContent = 
        `${data.attacker.commander} 的${attackerFactionName}军队进攻 ${city.name}，${data.defender.commander} 如何应对？`;
    
    // 显示防御选择弹窗
    document.getElementById('defenseChoiceModal').style.display = 'flex';
}

// 作战准备：确定作战
function confirmBattle() {
    const data = window.currentBattlePrepData;
    if (!data) return;
    
    // 隐藏作战准备弹窗
    document.getElementById('battlePrepModal').style.display = 'none';
    
    // 进入战斗模式选择
    showBattleModeModal(data.attacker, data.defender, data.city, data.isActiveAttack);
}

// 显示战斗模式选择弹窗
function showBattleModeModal(attackerArmy, defenderArmy, city, isActiveAttack) {
    // 保存战斗数据
    window.currentBattleData = {
        attacker: attackerArmy,
        defender: defenderArmy,
        city: city,
        isActiveAttack: isActiveAttack
    };
    
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    const attackerFactionName = getFactionName(attackerArmy.faction);
    const defenderFactionName = getFactionName(defenderArmy.faction);
    
    // 更新弹窗内容
    document.getElementById('battleModeTitle').textContent = '选择战斗模式';
    document.getElementById('battleModeSituation').textContent = 
        `${attackerArmy.commander}（${attackerFactionName}）VS ${defenderArmy.commander}（${defenderFactionName}）`;
    
    // 更新军队信息
    document.getElementById('battleModeAttackerInfo').textContent = `指挥官：${attackerArmy.commander}`;
    document.getElementById('battleModeDefenderInfo').textContent = `指挥官：${defenderArmy.commander}`;
    
    // 计算战斗力
    const attackerPower = calculateCombatPower(attackerArmy);
    const defenderPower = calculateCombatPower(defenderArmy);
    document.getElementById('battleModeAttackerPower').textContent = `战斗力：${attackerPower}`;
    document.getElementById('battleModeDefenderPower').textContent = `战斗力：${defenderPower}`;
    
    // 检查是否有AI参战，如果有则禁用详细会战按钮（注意：不能用shouldControl，可能是对方回合）
    const detailedBattleBtn = document.querySelector('#battleModeModal button[onclick="chooseBattleMode(\'detailed\')"]');
    if (detailedBattleBtn) {
        const hasAI = (typeof AIController !== 'undefined' && AIController.config.enabled) &&
                     (attackerArmy.faction === AIController.config.controlledFaction || 
                      defenderArmy.faction === AIController.config.controlledFaction);
        
        if (hasAI) {
            detailedBattleBtn.disabled = true;
            detailedBattleBtn.style.backgroundColor = '#95a5a6';
            detailedBattleBtn.style.cursor = 'not-allowed';
            detailedBattleBtn.style.opacity = '0.6';
            detailedBattleBtn.textContent = '详细会战（AI不可用）';
        } else {
            detailedBattleBtn.disabled = false;
            detailedBattleBtn.style.backgroundColor = '#e74c3c';
            detailedBattleBtn.style.cursor = 'pointer';
            detailedBattleBtn.style.opacity = '1';
            detailedBattleBtn.textContent = '详细会战（战棋）';
        }
    }
    
    // 显示弹窗
    document.getElementById('battleModeModal').style.display = 'flex';
    
    // AI自动选择战斗模式（自动计算）（注意：不能用shouldControl，可能是对方回合）
    if (typeof AIController !== 'undefined' && AIController.config.enabled) {
        const aiControlled = (attackerArmy.faction === AIController.config.controlledFaction) || 
                            (defenderArmy.faction === AIController.config.controlledFaction);
        
        if (aiControlled) {
            // addLog(`🤖 AI自动选择战斗模式：自动计算`, 'info');
            
            // 延迟1秒后自动选择自动计算模式
            setTimeout(() => {
                chooseBattleMode('auto');
            }, 1000);
        }
    }
}

// 选择战斗模式
function chooseBattleMode(mode) {
    const battleData = window.currentBattleData;
    if (!battleData) return;
    
    // 隐藏战斗模式选择弹窗
    document.getElementById('battleModeModal').style.display = 'none';
    
    if (mode === 'auto') {
        // 自动战斗模式 - 快速战斗力对比
        executeAutoBattle(battleData.attacker, battleData.defender, battleData.city, battleData.isActiveAttack);
    } else {
        // 详细会战模式 - 使用外部战斗系统
        startExternalBattle(battleData.attacker, battleData.defender, battleData.city, battleData.isActiveAttack);
    }
    
    // 清除临时数据
    window.currentBattleData = null;
}

// 执行自动战斗（战斗力对比，包含联盟支援）
function executeAutoBattle(attackerArmy, defenderArmy, city, isActiveAttack) {
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    
    const attackerFactionName = getFactionName(attackerArmy.faction);
    const defenderFactionName = getFactionName(defenderArmy.faction);
    
    addLog(`⚔️ 自动战斗：${attackerArmy.commander}（${attackerFactionName}）VS ${defenderArmy.commander}（${defenderFactionName}）`, 'system');
    
    // 检测AI控制，AI自动请求支援
    const isAttackerAI = (typeof AIController !== 'undefined' && 
        AIController.config.enabled && attackerArmy.faction === AIController.config.controlledFaction) ||
        (typeof CarthageAIController !== 'undefined' && 
        CarthageAIController.config.enabled && attackerArmy.faction === 'carthage') ||
        (typeof MacedoniaAIController !== 'undefined' && 
        MacedoniaAIController.config.enabled && attackerArmy.faction === 'macedonia') ||
        (typeof SeleucidAIController !== 'undefined' && 
        SeleucidAIController.config.enabled && attackerArmy.faction === 'seleucid') ||
        (typeof PtolemyAIController !== 'undefined' && 
        PtolemyAIController.config.enabled && attackerArmy.faction === 'ptolemy');
        
    const isDefenderAI = (typeof AIController !== 'undefined' && 
        AIController.config.enabled && defenderArmy.faction === AIController.config.controlledFaction) ||
        (typeof CarthageAIController !== 'undefined' && 
        CarthageAIController.config.enabled && defenderArmy.faction === 'carthage') ||
        (typeof MacedoniaAIController !== 'undefined' && 
        MacedoniaAIController.config.enabled && defenderArmy.faction === 'macedonia') ||
        (typeof SeleucidAIController !== 'undefined' && 
        SeleucidAIController.config.enabled && defenderArmy.faction === 'seleucid') ||
        (typeof PtolemyAIController !== 'undefined' && 
        PtolemyAIController.config.enabled && defenderArmy.faction === 'ptolemy');
    
    // 计算包含联盟支援的战斗力（AI自动请求支援，玩家也自动请求）
    const attackerResult = calculateAllianceCombatPower(attackerArmy, city.id, true);
    const defenderResult = calculateAllianceCombatPower(defenderArmy, city.id, true);
    
    // 显示支援详情
    addLog(`📊 ${attackerArmy.commander}（${attackerFactionName}）主力战力：${attackerResult.mainPower}`, attackerArmy.faction);
    logSupportDetails(attackerArmy.commander, attackerArmy.faction, attackerResult);
    
    addLog(`📊 ${defenderArmy.commander}（${defenderFactionName}）主力战力：${defenderResult.mainPower}`, defenderArmy.faction);
    logSupportDetails(defenderArmy.commander, defenderArmy.faction, defenderResult);
    
    const attackerPower = attackerResult.totalPower;
    const defenderPower = defenderResult.totalPower;
    
    addLog(`⚔️ 总战力对比：攻击方 ${attackerPower.toFixed(0)} VS 防御方 ${defenderPower.toFixed(0)}`, 'system');
    
    // 计算战斗力差距百分比
    const totalPower = attackerPower + defenderPower;
    const attackerChance = (attackerPower / totalPower) * 100;
    const defenderChance = (defenderPower / totalPower) * 100;
    
    // 投掷D100决定胜负
    const dice = Math.floor(Math.random() * 100) + 1;
    
    addLog(`🎲 投掷D100：${dice}（攻击方需要≤${Math.floor(attackerChance)}获胜）`, 'system');
    
    let winnerArmy, loserArmy, winnerFaction, loserFaction;
    
    if (dice <= attackerChance) {
        // 攻击方获胜
        winnerArmy = attackerArmy;
        loserArmy = defenderArmy;
        winnerFaction = attackerArmy.faction;
        loserFaction = defenderArmy.faction;
    } else {
        // 防御方获胜
        winnerArmy = defenderArmy;
        loserArmy = attackerArmy;
        winnerFaction = defenderArmy.faction;
        loserFaction = attackerArmy.faction;
    }
    
    const winnerFactionName = getFactionName(winnerFaction);
    const loserFactionName = getFactionName(loserFaction);
    
    addLog(`🏆 ${winnerArmy.commander}（${winnerFactionName}）获胜！`, winnerFaction);
    
    // 计算损失
    // 胜利方损失：D6 × 1% 的兵力
    const winnerDice = rollD6();
    const winnerLossPercent = winnerDice * 1;
    
    // 失败方损失：2D6 × 4% 的兵力
    const loserDice1 = rollD6();
    const loserDice2 = rollD6();
    const loserLossPercent = (loserDice1 + loserDice2) * 4;
    
    addLog(`💀 ${winnerArmy.commander} 损失：D6=${winnerDice}，${winnerLossPercent}%兵力`, winnerFaction);
    addLog(`💀 ${loserArmy.commander} 损失：2D6=${loserDice1}+${loserDice2}，${loserLossPercent}%兵力`, loserFaction);
    
    // 应用损失
    applyBattleLoss(winnerArmy, winnerLossPercent);
    applyBattleLoss(loserArmy, loserLossPercent);
    
    // 更新士气
    // 胜利方士气提升至5
    winnerArmy.morale = 5.0;
    // 失败方士气降至1
    loserArmy.morale = 1.0;
    
    addLog(`🎖️ ${winnerArmy.commander} 士气提升至 ${winnerArmy.morale}`, winnerFaction);
    addLog(`😔 ${loserArmy.commander} 士气降至 ${loserArmy.morale}`, loserFaction);
    
    // 更新将领军事值
    // 胜利方 +2（最大11）
    winnerArmy.military = Math.min(11, (winnerArmy.military || 5) + 2);
    // 失败方 +1（最大11）
    loserArmy.military = Math.min(11, (loserArmy.military || 5) + 1);
    
    addLog(`⭐ ${winnerArmy.commander} 军事值提升至 ${winnerArmy.military}`, winnerFaction);
    addLog(`📈 ${loserArmy.commander} 军事值提升至 ${loserArmy.military}`, loserFaction);
    
    // 检查战斗力是否低于消灭阈值
    const winnerDestroyed = BattleSystem.checkArmyDestroyed(winnerArmy);
    const loserDestroyed = BattleSystem.checkArmyDestroyed(loserArmy);
    
    // 如果失败方被消灭，不需要显示战斗结果弹窗（已经被移除）
    if (loserDestroyed) {
        addLog(`${loserArmy.commander} 的部队战斗力过低，已被消灭`, loserFaction);
        
        // 更新地图和军队显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
        
        // 恢复AI执行（所有派系）
        if (typeof AIController !== 'undefined' && AIController.config.enabled) {
            AIController.resume();
        }
        if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
            CarthageAIController.resume();
        }
        if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
            MacedoniaAIController.resume();
        }
        if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
            SeleucidAIController.resume();
        }
        if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
            PtolemyAIController.resume();
        }
        
        // 标记攻击方军队已完成行动
        if (isActiveAttack && typeof ArmyActionManager !== 'undefined') {
            ArmyActionManager.markCurrentArmyActed();
        }
        
        return; // 不显示战斗结果弹窗
    }
    
    // 更新地图和军队显示
    generateMap();
    drawRoutes();
    absoluteFix();
    placeArmies();
    
    // 显示战斗结果弹窗
    showAutoBattleResultModal(winnerArmy, loserArmy, winnerFaction, loserFaction, city, isActiveAttack, winnerLossPercent, loserLossPercent);
}

// 显示自动战斗结果弹窗
function showAutoBattleResultModal(winnerArmy, loserArmy, winnerFaction, loserFaction, city, isActiveAttack, winnerLossPercent, loserLossPercent) {
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    
    const winnerFactionName = getFactionName(winnerFaction);
    const loserFactionName = getFactionName(loserFaction);
    
    // 更新弹窗显示
    const modal = document.getElementById('battleResultModal');
    document.getElementById('battleResultTitle').textContent = `${city.name} 自动战斗结束`;
    document.getElementById('battleResultSituation').textContent = `${winnerFactionName}军队获得胜利！`;
    
    // 胜利横幅
    const winnerBanner = document.getElementById('battleResultWinner');
    winnerBanner.textContent = `🏆 ${winnerFactionName}获胜！`;
    
    // 根据阵营设置背景颜色
    const factionBackgrounds = {
        'rome': 'linear-gradient(135deg, rgba(231, 76, 60, 0.3), rgba(192, 57, 43, 0.3))',
        'carthage': 'linear-gradient(135deg, rgba(155, 89, 182, 0.3), rgba(142, 68, 173, 0.3))',
        'macedonia': 'linear-gradient(135deg, rgba(52, 152, 219, 0.3), rgba(41, 128, 185, 0.3))',
        'seleucid': 'linear-gradient(135deg, rgba(22, 160, 133, 0.3), rgba(19, 141, 117, 0.3))',
        'ptolemy': 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 165, 0, 0.3))'
    };
    winnerBanner.style.background = factionBackgrounds[winnerFaction] || factionBackgrounds['rome'];
    
    // 胜利方信息
    document.getElementById('battleResultWinnerName').textContent = winnerFactionName;
    document.getElementById('battleResultWinnerCommander').textContent = winnerArmy.commander;
    document.getElementById('battleResultWinnerPoints').textContent = '胜利';
    document.getElementById('battleResultWinnerLoss').textContent = `${winnerLossPercent}%`;
    document.getElementById('battleResultWinnerMorale').textContent = winnerArmy.morale.toFixed(1);
    
    // 失败方信息
    document.getElementById('battleResultLoserName').textContent = loserFactionName;
    document.getElementById('battleResultLoserCommander').textContent = loserArmy.commander;
    document.getElementById('battleResultLoserPoints').textContent = '失败';
    document.getElementById('battleResultLoserLoss').textContent = `${loserLossPercent}%`;
    document.getElementById('battleResultLoserMorale').textContent = loserArmy.morale.toFixed(1);
    
    // 骰子详情
    document.getElementById('battleResultDiceDetails').innerHTML = `
        <p>💀 胜利方损失: ${winnerLossPercent}%</p>
        <p>💀 失败方损失: ${loserLossPercent}%</p>
    `;
    
    // 保存数据供确认按钮使用
    modal.dataset.result = JSON.stringify({
        winner: winnerFaction,
        winnerArmy: winnerArmy,
        loserArmy: loserArmy,
        winnerLossPercentage: winnerLossPercent,
        loserLossPercentage: loserLossPercent,
        loserPercentage: 50, // 自动战斗简化处理
        city: city,
        isActiveAttack: isActiveAttack,
        isAutoBattle: true // 标记为自动战斗，已应用过损失
    });
    
    // 显示弹窗
    modal.style.display = 'flex';
}

// 应用战斗损失
function applyBattleLoss(army, lossPercent) {
    const totalTroops = (army.lightCavalry || 0) + 
                       (army.heavyCavalry || 0) + 
                       (army.heavyInfantry || 0) + 
                       (army.lightInfantry || 0);
    
    if (totalTroops === 0) return;
    
    const lossAmount = Math.floor(totalTroops * lossPercent / 100);
    
    // 按比例分配损失
    const lightCavLoss = Math.floor((army.lightCavalry || 0) * lossPercent / 100);
    const heavyCavLoss = Math.floor((army.heavyCavalry || 0) * lossPercent / 100);
    const heavyInfLoss = Math.floor((army.heavyInfantry || 0) * lossPercent / 100);
    const lightInfLoss = Math.floor((army.lightInfantry || 0) * lossPercent / 100);
    
    army.lightCavalry = Math.max(0, (army.lightCavalry || 0) - lightCavLoss);
    army.heavyCavalry = Math.max(0, (army.heavyCavalry || 0) - heavyCavLoss);
    army.heavyInfantry = Math.max(0, (army.heavyInfantry || 0) - heavyInfLoss);
    army.lightInfantry = Math.max(0, (army.lightInfantry || 0) - lightInfLoss);
    
    addLog(`  - 轻骑兵 -${lightCavLoss}, 重骑兵 -${heavyCavLoss}, 重步兵 -${heavyInfLoss}, 轻步兵 -${lightInfLoss}`, army.faction);
}

// 处理战斗失败方撤退
function handleBattleLoserRetreat(loserArmy, loserFaction, city, isActiveAttack) {
    // 寻找可撤退的地区（相邻的中立地区或己方城市，但不包括海路）
    const connectedCities = getConnectedCities(city.id);
    const retreatOptions = connectedCities.filter(cityId => {
        const targetCity = cities.find(c => c.id === cityId);
        // 排除海路连接
        if (isSeaRoute(city.id, cityId)) {
            return false; // 海路不能作为撤退路线
        }
        return targetCity && (targetCity.faction === loserFaction || targetCity.faction === 'neutral');
    });
    
    if (retreatOptions.length > 0) {
        // 撤退损失：投2D6，损失百分之(2D6)的部队
        const retreatLossDice = rollDice(2);
        const retreatLossPercent = retreatLossDice;
        
        // 计算各兵种损失
        const lightCavLoss = Math.floor((loserArmy.lightCavalry || 0) * retreatLossPercent / 100);
        const heavyCavLoss = Math.floor((loserArmy.heavyCavalry || 0) * retreatLossPercent / 100);
        const heavyInfLoss = Math.floor((loserArmy.heavyInfantry || 0) * retreatLossPercent / 100);
        const lightInfLoss = Math.floor((loserArmy.lightInfantry || 0) * retreatLossPercent / 100);
        const totalLoss = lightCavLoss + heavyCavLoss + heavyInfLoss + lightInfLoss;
        
        // 应用损失
        loserArmy.lightCavalry = Math.max(0, (loserArmy.lightCavalry || 0) - lightCavLoss);
        loserArmy.heavyCavalry = Math.max(0, (loserArmy.heavyCavalry || 0) - heavyCavLoss);
        loserArmy.heavyInfantry = Math.max(0, (loserArmy.heavyInfantry || 0) - heavyInfLoss);
        loserArmy.lightInfantry = Math.max(0, (loserArmy.lightInfantry || 0) - lightInfLoss);
        
        // 自动撤退到第一个可用城市
        const retreatCityId = retreatOptions[0];
        const retreatCity = cities.find(c => c.id === retreatCityId);
        loserArmy.lastLocation = loserArmy.location;  // 保存上回合位置
        loserArmy.location = retreatCityId;
        loserArmy.retreatedThisTurn = true;  // 标记本回合进行了撤退
        addLog(`🏃 ${loserArmy.commander} 撤退至 ${retreatCity.name}，投2D6=${retreatLossDice}，损失${retreatLossPercent}%部队（${totalLoss}人）`, loserFaction);
        if (totalLoss > 0) {
            addLog(`   💀 损失详情：轻骑${lightCavLoss} 重骑${heavyCavLoss} 重步${heavyInfLoss} 轻步${lightInfLoss}`, loserFaction);
        }
    } else {
        // 无路可退，全军覆没
        const remainingTroops = (loserArmy.lightCavalry || 0) +
                               (loserArmy.heavyCavalry || 0) +
                               (loserArmy.heavyInfantry || 0) +
                               (loserArmy.lightInfantry || 0);
        
        addLog(`💀💀 ${loserArmy.commander} 无路可退，全军覆没！（${remainingTroops}人全部阵亡）`, loserFaction);
        
        // 从军队列表中移除
        const armyIndex = armies[loserFaction].findIndex(a => a.id === loserArmy.id);
        if (armyIndex >= 0) {
            armies[loserFaction].splice(armyIndex, 1);
            checkAllSiegesAfterArmyRemoval();
        }
    }
    
    // 更新显示
    placeArmies();
    
    // 恢复AI执行（罗马和迦太基）
    if (typeof AIController !== 'undefined' && AIController.config.enabled) {
        AIController.resume();
    }
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
        CarthageAIController.resume();
    }
    
    // 根据是否为主动攻击决定后续流程
    setTimeout(() => {
        if (isActiveAttack) {
            ArmyActionManager.markCurrentArmyActed();
        } else {
            endTurn();
        }
    }, 1000);
}
