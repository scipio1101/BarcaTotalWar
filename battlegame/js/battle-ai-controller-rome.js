/**
 * 战棋界面罗马AI控制系统
 * 专门用于战斗界面的AI控制，处理部署、移动、转向、远程和近战阶段
 */

class BattleAIControllerRome {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.faction = 'rome'; // 控制的阵营
        this.thinking = false; // 是否正在思考
        this.autoDelay = 800; // 自动操作延迟（毫秒）
        this.debugMode = true; // 调试模式
        
        // AI配置
        this.config = {
            aggressiveness: 0.7,    // 进攻倾向 (0-1)
            defensiveness: 0.3,     // 防守倾向 (0-1)
            riskTaking: 0.6,        // 冒险倾向 (0-1)
            focusFire: 0.8,         // 集火倾向 (0-1) - 优先攻击已受损单位
            flankBonus: 0.9,        // 侧翼包抄加成
        };
        
        // 战术记忆
        this.memory = {
            lastDeployedPositions: [],
            priorityTargets: [],
            weakestEnemies: [],
            strongestAllies: [],
        };
        
        this.log('战棋AI控制器已创建');
    }
    
    // ==================== 核心控制方法 ====================
    
    /**
     * 启用AI控制
     */
    enable() {
        this.enabled = true;
        this.log('✅ 罗马AI已启用', 'success');
        this.updateUI();
        
        // 设置防御方撤退监听器
        this.setupDefenseRetreatListener();
        
        // 立即检查是否需要AI接管当前回合
        setTimeout(() => {
            if (this.shouldControl()) {
                this.log('🎯 检测到当前是罗马回合，立即启动AI', 'success');
                this.takeTurn();
            }
        }, 100);
    }
    
    /**
     * 禁用AI控制
     */
    disable() {
        this.enabled = false;
        this.log('❌ 罗马AI已禁用', 'info');
        this.updateUI();

        // 清除防御方撤退监听器
        if (this.defenseRetreatInterval) {
            clearInterval(this.defenseRetreatInterval);
            this.defenseRetreatInterval = null;
        }
    }

    /**
     * 设置防御方撤退监听器
     */
    setupDefenseRetreatListener() {
        // 监听游戏状态变化
        const checkForDefenseRetreat = () => {
            if (this.enabled && !this.thinking &&
                this.game.currentPhase === 'melee' &&
                this.game.meleeSubPhase === 'defender_choose_retreat' &&
                this.game.currentPlayer === 'rome' &&
                this.game.meleeTarget &&
                !this.processingRetreat) { // 防止重复处理

                console.log('[罗马AI] 检测到防御方撤退阶段，立即处理');
                this.processingRetreat = true; // 设置标志
                this.defenderChooseRetreat();
            }
        };

        // 定期检查（每200ms）
        this.defenseRetreatInterval = setInterval(checkForDefenseRetreat, 200);
    }
    
    /**
     * 切换AI控制
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    /**
     * 更新UI显示
     */
    updateUI() {
        const btn = document.getElementById('ai-toggle-btn-rome');
        if (btn) {
            btn.textContent = this.enabled ? '🤖 禁用罗马AI' : '🤖 启用罗马AI';
            btn.style.background = this.enabled ? 
                'linear-gradient(135deg, #e74c3c, #c0392b)' : 
                'linear-gradient(135deg, #27ae60, #229954)';
        }
    }
    
    /**
     * 检查是否应该由AI控制
     */
    shouldControl() {
        if (!this.enabled || this.thinking) {
            return false;
        }

        // 在部署阶段，检查deploymentPhase
        if (this.game.currentPhase === 'deployment') {
            const should = this.game.deploymentPhase === this.faction;
            console.log(`[罗马AI] shouldControl() deployment: ${should} (deploymentPhase=${this.game.deploymentPhase}, faction=${this.faction})`);
            return should;
        }

        // 其他阶段检查currentPlayer
        const should = this.game.currentPlayer === this.faction;
        console.log(`[罗马AI] shouldControl() normal: ${should} (currentPlayer=${this.game.currentPlayer}, faction=${this.faction}, phase=${this.game.currentPhase})`);
        return should;
    }
    
    /**
     * 主控制循环 - 在每个阶段被调用
     */
    async takeTurn() {
        console.log(`[罗马AI] takeTurn() called, shouldControl: ${this.shouldControl()}, currentPlayer: ${this.game.currentPlayer}, phase: ${this.game.currentPhase}, subPhase: ${this.game.meleeSubPhase}`);
        if (!this.shouldControl()) {
            return;
        }
        
        this.thinking = true;
        this.log(`\n🤖 AI开始思考 - 阶段: ${this.game.currentPhase}`, 'phase');
        
        try {
            await this.delay(this.autoDelay);

            // 特殊处理：如果当前是防御方撤退阶段，直接处理
            if (this.game.currentPhase === 'melee' && this.game.meleeSubPhase === 'defender_choose_retreat' && this.game.currentPlayer === 'rome') {
                console.log('[罗马AI] 检测到防御方撤退阶段，直接处理');
                await this.defenderChooseRetreat();
                this.thinking = false;
                return;
            }
            
            switch (this.game.currentPhase) {
                case 'deployment':
                    await this.handleDeploymentPhase();
                    break;
                case 'movement':
                    await this.handleMovementPhase();
                    break;
                case 'turning':
                    await this.handleTurningPhase();
                    break;
                case 'ranged':
                    await this.handleRangedPhase();
                    break;
                case 'melee':
                    // 如果是防御方撤退阶段，已经在上面特殊处理了
                    if (this.game.meleeSubPhase !== 'defender_choose_retreat') {
                    await this.handleMeleePhase();
                    }
                    break;
            }
        } catch (error) {
            this.log(`❌ AI执行出错: ${error.message}`, 'error');
            console.error('AI Error:', error);
        } finally {
            this.thinking = false;
        }
    }
    
    // ==================== 部署阶段 ====================
    
    /**
     * 处理部署阶段
     */
    async handleDeploymentPhase() {
        if (this.game.deploymentPhase !== this.faction) {
            this.log('不是罗马部署回合', 'info');
            return;
        }
        
        this.log('📦 开始自动部署...', 'phase');
        
        // 获取所有需要部署的单位
        const unitsToDeployy = this.game.units.filter(unit => 
            unit.faction === this.faction && !unit.deployed
        );
        
        if (unitsToDeployy.length === 0) {
            this.log('✓ 所有单位已部署，确认部署', 'success');
            await this.delay(500);
            this.confirmDeployment();
            return;
        }
        
        // 计算兵力比
        const myForce = this.calculateTotalForce(this.faction);
        const enemyForce = this.calculateTotalForce(this.faction === 'rome' ? 'carthage' : 'rome');
        const forceRatio = enemyForce > 0 ? myForce / enemyForce : 1.0;
        
        this.log(`兵力比: ${forceRatio.toFixed(2)} (我方:${myForce} vs 敌方:${enemyForce})`, 'info');
        
        // 根据兵力比选择阵型
        let formation;
        if (forceRatio >= 0.9) {
            formation = 'normal';
            this.log('选择正常阵型', 'info');
        } else if (forceRatio >= 0.5) {
            formation = 'oblique';
            this.log('选择斜阵', 'info');
        } else {
            formation = 'defensive';
            this.log('选择防御阵', 'info');
        }
        
        // 按类型分类单位
        const archers = unitsToDeployy.filter(u => u.type === 'archer');
        const infantry = unitsToDeployy.filter(u => u.type === 'infantry');
        const cavalry = unitsToDeployy.filter(u => u.type === 'cavalry');
        const generals = unitsToDeployy.filter(u => u.type === 'general');
        const elephants = unitsToDeployy.filter(u => u.type === 'elephant');
        
        // 计算部署位置
        const positions = this.calculateFormationPositions(
            formation, archers, infantry, cavalry, generals, elephants
        );
        
        // 执行部署
        for (const posData of positions) {
            await this.deployUnitAt(posData.unit, posData.x, posData.y);
            await this.delay(this.autoDelay / 3);
        }
        
        // 所有单位部署完成后，确认部署
        this.log('✓ 所有单位部署完成', 'success');
        await this.delay(500);
        this.confirmDeployment();
    }
    
    /**
     * 计算兵力值
     */
    calculateTotalForce(faction) {
        const units = this.game.units.filter(u => u.faction === faction);
        let total = 0;
        for (const unit of units) {
            // 简单的兵力计算：HP + 攻击力
            total += unit.maxHp + unit.attack * 2;
        }
        return total;
    }
    
    /**
     * 计算阵型部署位置
     */
    calculateFormationPositions(formation, archers, infantry, cavalry, generals, elephants) {
        const positions = [];
        // 第一排应该靠近敌人，后排向己方边缘退
        // 给予缓冲空间：罗马从30开始（合法区域>=29），迦太基从18开始（合法区域<=19）
        const baseY = this.faction === 'rome' ? 30 : 18;
        const direction = this.faction === 'rome' ? 'north' : 'south';  // 罗马朝北，迦太基朝南
        const yDirection = this.faction === 'rome' ? 1 : -1;  // 罗马向下退（y增大），迦太基向上退（y减小）
        
        if (formation === 'normal') {
            // 正常阵型
            this.calculateNormalFormation(positions, archers, infantry, cavalry, generals, elephants, baseY, yDirection, direction);
        } else if (formation === 'oblique') {
            // 斜阵
            this.calculateObliqueFormation(positions, archers, infantry, cavalry, generals, elephants, baseY, yDirection, direction);
        } else {
            // 防御阵
            this.calculateDefensiveFormation(positions, archers, infantry, cavalry, generals, elephants, baseY, yDirection, direction);
        }
        
        return positions;
    }
    
    /**
     * 正常阵型部署
     */
    calculateNormalFormation(positions, archers, infantry, cavalry, generals, elephants, baseY, yDir, direction) {
        const centerX = 50;
        const unitSpacing = 5;  // 单位左右间距
        const rowSpacing = 3;  // 排与排之间的间距（3格）
        
        // 1. 弓箭手第一排平均分布
        if (archers.length > 0) {
            const archerY = baseY;
            const totalWidth = (archers.length - 1) * unitSpacing;
            const startX = centerX - totalWidth / 2;
            archers.forEach((archer, i) => {
                positions.push({
                    unit: archer,
                    x: Math.round(startX + i * unitSpacing),  // 强制转换为整数
                    y: archerY,
                    direction: direction
                });
            });
        }
        
        // 2. 步兵在弓箭手后方，根据数量分排
        if (infantry.length > 0) {
            let rows = 1;
            let firstRowCount = infantry.length;
            
            if (infantry.length >= 15) {
                rows = 3;
                firstRowCount = Math.ceil(infantry.length / 3);
            } else if (infantry.length >= 5) {
                rows = 2;
                if (infantry.length <= 10) {
                    firstRowCount = Math.min(5, infantry.length);
                } else {
                    firstRowCount = Math.ceil(infantry.length / 2);
                }
            }
            
            let infantryIndex = 0;
            for (let row = 0; row < rows && infantryIndex < infantry.length; row++) {
                const rowCount = row === 0 ? firstRowCount : 
                                 row === 1 && rows === 3 ? Math.floor(infantry.length / 3) :
                                 infantry.length - infantryIndex;
                const rowY = baseY + (row + 1) * rowSpacing * yDir;
                const totalWidth = (rowCount - 1) * unitSpacing;
                const startX = centerX - totalWidth / 2;
                
                // 第二排交错排列
                const offset = (row % 2 === 1) ? unitSpacing / 2 : 0;
                
                for (let i = 0; i < rowCount && infantryIndex < infantry.length; i++, infantryIndex++) {
                    positions.push({
                        unit: infantry[infantryIndex],
                        x: Math.round(startX + i * unitSpacing + offset),  // 强制转换为整数
                        y: rowY,
                        direction: direction
                    });
                }
            }
        }
        
        // 3. 骑兵、将领和战象分布在左右两侧
        const mounted = [...cavalry, ...generals, ...elephants];
        if (mounted.length > 0) {
            const leftCount = Math.ceil(mounted.length / 2);
            const sideY = baseY + rowSpacing * yDir;
            
            // 左侧单位
            for (let i = 0; i < leftCount; i++) {
                positions.push({
                    unit: mounted[i],
                    x: 12,
                    y: sideY + i * rowSpacing * yDir,  // 每个单位独立一行
                    direction: direction
                });
            }
            
            // 右侧单位
            for (let i = leftCount; i < mounted.length; i++) {
                const rightIndex = i - leftCount;
                positions.push({
                    unit: mounted[i],
                    x: 88,
                    y: sideY + rightIndex * rowSpacing * yDir,  // 每个单位独立一行
                    direction: direction
                });
            }
        }
    }
    
    /**
     * 斜阵部署
     */
    calculateObliqueFormation(positions, archers, infantry, cavalry, generals, elephants, baseY, yDir, direction) {
        const unitSpacing = 5;
        const rowSpacing = 3;  // 排与排之间的间距（3格）
        
        // 1. 弓箭手集中在中间靠右，紧密排列
        if (archers.length > 0) {
            const archerY = baseY;
            const startX = 58;  // 中间偏右
            archers.forEach((archer, i) => {
                positions.push({
                    unit: archer,
                    x: Math.round(startX + i * 3.5),  // 强制转换为整数（紧密排列）
                    y: archerY,
                    direction: direction
                });
            });
        }
        
        // 2. 步兵排成斜线
        if (infantry.length > 0) {
            const firstRowCount = Math.min(7, infantry.length);
            const startX = 62;
            
            // 第一排（斜线前段）
            for (let i = 0; i < firstRowCount; i++) {
                positions.push({
                    unit: infantry[i],
                    x: Math.round(startX + i * unitSpacing),  // 强制转换为整数
                    y: Math.round(baseY + (i + 1) * rowSpacing * 0.7 * yDir),  // y也可能是小数
                    direction: direction
                });
            }
            
            // 剩余单位在右后方
            for (let i = firstRowCount; i < infantry.length; i++) {
                const offset = i - firstRowCount;
                positions.push({
                    unit: infantry[i],
                    x: Math.round(startX + (firstRowCount - 1) * unitSpacing + Math.floor(offset / 2) * unitSpacing),  // 强制转换为整数
                    y: Math.round(baseY + (firstRowCount + offset) * rowSpacing * 0.7 * yDir),  // y也可能是小数
                    direction: direction
                });
            }
        }
        
        // 3. 骑兵、将领和战象全部在右侧
        const mounted = [...cavalry, ...generals, ...elephants];
        mounted.forEach((unit, i) => {
            positions.push({
                unit: unit,
                x: 88,
                y: baseY + (i + 1) * rowSpacing * yDir,  // 每个单位间隔rowSpacing
                direction: direction
            });
        });
    }
    
    /**
     * 防御阵部署
     */
    calculateDefensiveFormation(positions, archers, infantry, cavalry, generals, elephants, baseY, yDir, direction) {
        const centerX = 50;
        const unitSpacing = 5;
        const rowSpacing = 3;  // 排与排之间的间距（3格）
        
        // 1. 弓箭手第一排
        if (archers.length > 0) {
            const archerY = baseY;
            const totalWidth = (archers.length - 1) * unitSpacing;
            const startX = centerX - totalWidth / 2;
            archers.forEach((archer, i) => {
                positions.push({
                    unit: archer,
                    x: Math.round(startX + i * unitSpacing),  // 强制转换为整数
                    y: archerY,
                    direction: direction
                });
            });
        }
        
        // 2. 步兵排成凹形
        if (infantry.length > 0) {
            const leftCount = Math.ceil(infantry.length / 3);
            const centerCount = Math.floor(infantry.length / 3);
            const rightCount = infantry.length - leftCount - centerCount;
            
            let index = 0;
            
            // 左翼
            for (let i = 0; i < leftCount; i++, index++) {
                positions.push({
                    unit: infantry[index],
                    x: Math.round(15 + i * unitSpacing * 0.8),  // 强制转换为整数
                    y: baseY + (1 + Math.floor(i / 3)) * rowSpacing * yDir,
                    direction: direction
                });
            }
            
            // 中央后退
            for (let i = 0; i < centerCount; i++, index++) {
                positions.push({
                    unit: infantry[index],
                    x: Math.round(centerX - (centerCount / 2 - i) * unitSpacing),  // 强制转换为整数
                    y: baseY + 2 * rowSpacing * yDir,  // 后退
                    direction: direction
                });
            }
            
            // 右翼
            for (let i = 0; i < rightCount; i++, index++) {
                positions.push({
                    unit: infantry[index],
                    x: Math.round(85 - i * unitSpacing * 0.8),  // 强制转换为整数
                    y: baseY + (1 + Math.floor(i / 3)) * rowSpacing * yDir,
                    direction: direction
                });
            }
        }
        
        // 3. 骑兵、将领和战象在步兵后侧
        const mounted = [...cavalry, ...generals, ...elephants];
        mounted.forEach((unit, i) => {
            const isLeft = i % 2 === 0;
            const rowOffset = Math.floor(i / 2);  // 每两个单位换一行
            positions.push({
                unit: unit,
                x: isLeft ? 22 : 78,
                y: baseY + (3 + rowOffset) * rowSpacing * yDir,  // 从第3排开始，每两个单位换行
                direction: direction
            });
        });
    }
    
    /**
     * 在指定位置部署单位
     */
    async deployUnitAt(unit, x, y) {
        // 检查位置是否被占用，如果被占用则寻找附近空位
        const finalPos = this.findNearbyEmptyPosition(x, y, unit);
        
        // 执行部署
        unit.x = finalPos.x;
        unit.y = finalPos.y;
        unit.deployed = true;
        unit.direction = this.faction === 'rome' ? 'north' : 'south';  // 罗马朝北，迦太基朝南
        
        this.log(`└─ 部署 ${unit.name} 到 (${finalPos.x}, ${finalPos.y})`, 'action');
        
        // 更新显示
        this.game.updateUI();
    }
    
    /**
     * 寻找附近的空位置
     */
    findNearbyEmptyPosition(x, y, unit) {
        const unitSize = this.game.unitSizes[unit.type] || 1;
        
        // 检查目标位置是否可用且在合法区域内
        if (this.isValidPosition(x, y, unit) && !this.isPositionOccupied(x, y, unit.id, unitSize)) {
            return { x, y };
        }
        
        // 螺旋搜索附近位置
        for (let radius = 1; radius <= 10; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const testX = x + dx * 2;
                        const testY = y + dy * 2;
                        if (this.isValidPosition(testX, testY, unit) && 
                            !this.isPositionOccupied(testX, testY, unit.id, unitSize)) {
                            return { x: testX, y: testY };
                        }
                    }
                }
            }
        }
        
        // 如果找不到位置，返回原位置（会被游戏系统检查）
        this.log(`⚠️ 无法为 ${unit.name} 找到合适位置，使用原坐标 (${x}, ${y})`, 'error');
        return { x, y };
    }
    
    /**
     * 检查位置是否在合法部署区域内
     */
    isValidPosition(x, y, unit) {
        // 检查地图边界
        if (x < 0 || x >= this.game.gridWidth || y < 0 || y >= this.game.gridHeight) {
            return false;
        }
        
        // 检查部署区域限制
        if (unit.faction === 'rome') {
            // 罗马部署在地图下半部分 (y >= gridHeight * 0.6)
            return y >= this.game.gridHeight * 0.6;
        } else if (unit.faction === 'carthage') {
            // 迦太基部署在地图上半部分 (y <= gridHeight * 0.4)
            return y <= this.game.gridHeight * 0.4;
        }
        
        return true;
    }
    
    /**
     * 检查位置是否被占用
     */
    isPositionOccupied(x, y, excludeUnitId, size) {
        for (const unit of this.game.units) {
            if (unit.id === excludeUnitId) continue;
            if (!unit.deployed) continue;
            
            const unitSize = this.game.unitSizes[unit.type] || 1;
            const distance = this.getDistance(x, y, unit.x, unit.y);
            
            // 如果距离小于两个单位的尺寸之和，则认为重叠
            if (distance < (size + unitSize)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 确认部署
     */
    confirmDeployment() {
        const btn = document.getElementById('confirm-deployment-btn');
        if (btn && btn.style.display !== 'none') {
            btn.click();
            this.log('✓ 已确认部署', 'success');
        }
    }
    
    // ==================== 移动阶段 ====================
    
    /**
     * 处理移动阶段
     */
    async handleMovementPhase() {
        this.log('🚶 开始规划移动...', 'phase');
        
        // 获取所有己方单位
        const myUnits = this.game.units.filter(unit => 
            unit.faction === this.faction && unit.hp > 0
        );
        
        // 获取所有敌方单位
        const enemyUnits = this.game.units.filter(unit => 
            unit.faction !== this.faction && unit.hp > 0
        );
        
        if (myUnits.length === 0) {
            this.log('└─ 没有可移动的单位', 'info');
            await this.delay(500);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        // 为每个单位规划移动
        for (const unit of myUnits) {
            await this.planUnitMovement(unit, enemyUnits);
            await this.delay(this.autoDelay / 3);
        }
        
        // 完成所有规划
        await this.delay(500);
        
        // 验证是否有单位规划
        const planCount = this.game.allUnitPlans ? this.game.allUnitPlans.size : 0;
        this.log(`✓ 完成所有单位规划 (共${planCount}个单位)`, 'success');
        
        if (planCount === 0) {
            this.log('⚠️ [错误] 没有单位有移动计划！', 'error');
            await this.delay(1000);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        // 验证每个计划是否有实际步骤
        let validPlanCount = 0;
        if (this.game.allUnitPlans) {
            for (const [unitId, planData] of this.game.allUnitPlans.entries()) {
                if (planData.plan && planData.plan.length > 0) {
                    validPlanCount++;
                }
            }
        }
        
        this.log(`  └─ 其中${validPlanCount}个单位有有效移动计划`, 'info');
        
        if (validPlanCount === 0) {
            this.log('⚠️ [错误] 所有计划都是空的！', 'error');
            await this.delay(1000);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        // 直接调用finishAllPlanning，而不是点击按钮
        if (typeof this.game.finishAllPlanning === 'function') {
            try {
                this.game.finishAllPlanning();
                await this.delay(300);
                this.log(`  └─ 已调用finishAllPlanning()`, 'info');
            } catch (error) {
                this.log(`  └─ [错误] finishAllPlanning失败: ${error.message}`, 'error');
            }
        }
        
        // 执行所有移动计划
        await this.delay(500);
        
        // 再次验证计划数量
        const finalPlanCount = this.game.allUnitPlans ? this.game.allUnitPlans.size : 0;
        this.log(`✓ 开始统一执行移动 (${finalPlanCount}个单位)`, 'success');
        
        // 详细调试：再次列出所有计划
        if (finalPlanCount > 0) {
            this.log(`  └─ [调试] 执行前 allUnitPlans内容:`, 'info');
            for (const [unitId, plan] of this.game.allUnitPlans.entries()) {
                const unit = this.game.units.find(u => u.id === unitId);
                this.log(`     - ${unit ? unit.name : unitId}: ${plan.plan ? plan.plan.length : 0}步`, 'info');
            }
        } else {
            this.log('⚠️ [错误] 移动计划丢失！', 'error');
            this.log(`  └─ [调试] allUnitPlans = ${this.game.allUnitPlans}`, 'error');
        }
        
        if (finalPlanCount === 0) {
            this.log('⚠️ 跳过执行，进入下一阶段', 'error');
            await this.delay(1000);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        this.log(`  └─ [调试] moveState = ${this.game.moveState}`, 'info');
        this.log(`  └─ [调试] planningPhase = ${this.game.planningPhase}`, 'info');
        
        // 直接调用executeAllPlans方法，不通过按钮
        if (typeof this.game.executeAllPlans === 'function') {
            this.log(`  └─ [调试] 即将直接调用executeAllPlans()`, 'info');
            
            try {
                // 设置超时保护（30秒）
                const executePromise = this.game.executeAllPlans();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('移动执行超时（30秒）')), 30000);
                });
                
                await Promise.race([executePromise, timeoutPromise]);
                this.log(`✓ 移动执行完成`, 'success');
                
                // executeAllPlans()内部会直接设置currentPhase，而不是调用nextPhase()
                // 所以不会触发AI监听器，需要手动触发下一个阶段的AI
                await this.delay(1000);
                
                // 重置thinking状态，以便下一阶段可以执行
                this.thinking = false;
                
                // 检查当前阶段并继续AI执行
                if (this.shouldControl()) {
                    this.log(`✓ 继续执行${this.game.currentPhase}阶段的AI`, 'info');
                    this.takeTurn();
                }
            } catch (error) {
                this.log(`  └─ [错误] executeAllPlans()执行失败或超时: ${error.message}`, 'error');
                console.error('ExecuteAllPlans Error:', error);
                // 如果执行失败，手动进入下一阶段
                await this.delay(500);
                this.thinking = false;
                this.nextPhase();
            }
        } else {
            this.log('⚠️ [错误] executeAllPlans方法不存在', 'error');
            await this.delay(1000);
            this.thinking = false;
            this.nextPhase();
        }
    }
    
    /**
     * 为单个单位规划移动
     */
    async planUnitMovement(unit, enemyUnits) {
        // 如果单位已经与敌人接敌，不移动
        if (unit.engagedWith) {
            this.log(`└─ ${unit.name} 已接敌，跳过移动`, 'info');
            return;
        }
        
        // 找到最近的敌人
        const nearestEnemy = this.findNearestEnemy(unit, enemyUnits);
        if (!nearestEnemy) {
            this.log(`└─ ${unit.name} 未找到敌人`, 'info');
            return;
        }
        
        // 计算当前距离
        const currentDistance = this.getDistance(unit.x, unit.y, nearestEnemy.x, nearestEnemy.y);
        
        // 如果已经很近了（距离<3），可能不需要移动
        if (currentDistance < 3) {
            this.log(`└─ ${unit.name} 已接近敌人 (距离: ${currentDistance.toFixed(1)})`, 'info');
            return;
        }
        
        // 计算移动方向
        const moveDirection = this.calculateMoveDirection(unit, nearestEnemy);
        
        // 计算移动距离（根据单位类型）
        const maxMoveDistance = this.getUnitMoveDistance(unit);
        
        // 计算目标位置
        let targetX = Math.round(unit.x + moveDirection.dx * maxMoveDistance);
        let targetY = Math.round(unit.y + moveDirection.dy * maxMoveDistance);
        
        // 确保目标位置在地图范围内
        targetX = Math.max(0, Math.min(this.game.gridWidth - 1, targetX));
        targetY = Math.max(0, Math.min(this.game.gridHeight - 1, targetY));
        
        // 检查目标位置是否被占用，如果被占用则寻找附近空位
        const unitSize = this.game.unitSizes[unit.type] || 1;
        if (this.isPositionOccupied(targetX, targetY, unit.id, unitSize)) {
            // 简单调整：尝试左右偏移
            const offsets = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]];
            let found = false;
            for (const [dx, dy] of offsets) {
                const testX = targetX + dx;
                const testY = targetY + dy;
                if (!this.isPositionOccupied(testX, testY, unit.id, unitSize)) {
                    targetX = testX;
                    targetY = testY;
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.log(`└─ ${unit.name} 目标位置被占用，跳过移动`, 'info');
                return;
            }
        }
        
        // 如果目标位置与当前位置太近，跳过
        const moveDist = this.getDistance(unit.x, unit.y, targetX, targetY);
        if (moveDist < 1) {
            this.log(`└─ ${unit.name} 无需移动`, 'info');
            return;
        }
        
        // 选择单位
        this.log(`└─ ${unit.name} 规划移动: (${unit.x},${unit.y}) → (${targetX},${targetY})`, 'action');
        
        // 先点击单位选择
        const unitElement = document.querySelector(`[data-unit-id="${unit.id}"]`);
        if (unitElement) {
            unitElement.click();
            await this.delay(200);
        } else {
            this.log(`└─ 未找到单位元素: ${unit.id}`, 'error');
            return;
        }
        
        // 等待游戏状态更新
        await this.delay(100);
        
        // 点击目标位置创建移动步骤
        const hexElement = document.querySelector(`[data-x="${targetX}"][data-y="${targetY}"]`);
        if (hexElement) {
            hexElement.click();
            // 等待移动步骤被添加到movePlan数组中
            await this.delay(500);
            
            // 验证movePlan是否有内容
            if (this.game.movePlan && this.game.movePlan.length > 0) {
                this.log(`  └─ 移动计划已创建 (${this.game.movePlan.length}步)`, 'info');
            } else {
                this.log(`  └─ 警告：移动计划可能未创建`, 'error');
            }
        } else {
            this.log(`└─ 未找到目标格子: (${targetX}, ${targetY})`, 'error');
            return;
        }
        
        // 完成该单位的移动规划
        await this.delay(300);
        
        // 验证movePlan
        if (!this.game.movePlan || this.game.movePlan.length === 0) {
            this.log(`  └─ [错误] movePlan为空，跳过该单位`, 'error');
            return;
        }
        
        this.log(`  └─ [调试] movePlan.length = ${this.game.movePlan.length}`, 'info');
        
        // 直接调用游戏的finishPlanning方法，而不是点击按钮
        if (typeof this.game.finishPlanning === 'function') {
            try {
                this.game.finishPlanning();
                await this.delay(200);
                
                // 验证是否成功保存
                const savedPlanCount = this.game.allUnitPlans ? this.game.allUnitPlans.size : 0;
                this.log(`  └─ 已完成 ${unit.name} 的移动规划 (总计${savedPlanCount}个)`, 'info');
            } catch (error) {
                this.log(`  └─ [错误] finishPlanning执行失败: ${error.message}`, 'error');
            }
        } else {
            this.log(`  └─ [错误] finishPlanning方法不存在`, 'error');
        }
    }
    
    /**
     * 选择单位
     */
    selectUnit(unit) {
        const unitElement = document.querySelector(`[data-unit-id="${unit.id}"]`);
        if (unitElement) {
            unitElement.click();
        }
    }
    
    /**
     * 获取单位移动距离
     */
    getUnitMoveDistance(unit) {
        const moveDistances = {
            'general': 3,
            'cavalry': 5,
            'elephant': 3,
            'infantry': 2,
            'archer': 2
        };
        return moveDistances[unit.type] || 2;
    }
    
    /**
     * 计算移动方向
     */
    calculateMoveDirection(unit, target) {
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { dx: 0, dy: 0 };
        }
        
        return {
            dx: Math.round(dx / distance),
            dy: Math.round(dy / distance)
        };
    }
    
    // ==================== 转向阶段 ====================
    
    /**
     * 处理转向阶段
     */
    async handleTurningPhase() {
        this.log('🔄 开始调整朝向...', 'phase');
        
        // 获取所有己方单位
        const myUnits = this.game.units.filter(unit => 
            unit.faction === this.faction && unit.hp > 0
        );
        
        // 获取所有敌方单位
        const enemyUnits = this.game.units.filter(unit => 
            unit.faction !== this.faction && unit.hp > 0
        );
        
        for (const unit of myUnits) {
            await this.adjustUnitFacing(unit, enemyUnits);
            await this.delay(this.autoDelay / 3);
        }
        
        // 完成转向阶段
        await this.delay(500);
        this.log('✓ 转向调整完成', 'success');
        
        // 重置thinking状态，让下一阶段的AI可以接管
        this.thinking = false;
        this.nextPhase();
    }
    
    /**
     * 调整单位朝向
     */
    async adjustUnitFacing(unit, enemyUnits) {
        // 找到最近的敌人
        const nearestEnemy = this.findNearestEnemy(unit, enemyUnits);
        if (!nearestEnemy) {
            return;
        }
        
        // 计算应该面向的方向
        const optimalDirection = this.calculateOptimalDirection(unit, nearestEnemy);
        
        if (unit.direction === optimalDirection) {
            this.log(`└─ ${unit.name} 朝向正确`, 'info');
            return;
        }
        
        // 直接修改单位朝向
        unit.direction = optimalDirection;
        this.log(`└─ ${unit.name} 转向 ${optimalDirection}`, 'action');
        
        // 更新显示
        this.game.renderBoard();
    }
    
    /**
     * 计算最优朝向
     */
    calculateOptimalDirection(unit, target) {
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        
        // 计算角度
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // 转换为方向（使用游戏系统的方向名称）
        if (angle >= -45 && angle < 45) return 'east';
        if (angle >= 45 && angle < 135) return 'south';
        if (angle >= 135 || angle < -135) return 'west';
        return 'north';
    }
    
    /**
     * 计算需要旋转的次数
     */
    getRotationsNeeded(currentDir, targetDir) {
        const directions = ['up', 'right', 'down', 'left'];
        const currentIndex = directions.indexOf(currentDir);
        const targetIndex = directions.indexOf(targetDir);
        
        let rotation = targetIndex - currentIndex;
        
        // 优化旋转方向（选择最短路径）
        if (rotation > 2) rotation -= 4;
        if (rotation < -2) rotation += 4;
        
        return rotation;
    }
    
    /**
     * 模拟按键
     */
    simulateKeyPress(key) {
        const event = new KeyboardEvent('keydown', {
            key: key,
            code: key,
            bubbles: true
        });
        document.dispatchEvent(event);
    }
    
    // ==================== 远程阶段 ====================
    
    /**
     * 处理远程攻击阶段
     */
    async handleRangedPhase() {
        this.log('🏹 开始远程攻击...', 'phase');
        
        // 获取所有己方弓箭手
        const archers = this.game.units.filter(unit => 
            unit.faction === this.faction && 
            unit.type === 'archer' && 
            unit.hp > 0
        );
        
        if (archers.length === 0) {
            this.log('└─ 没有可用的弓箭手', 'info');
            await this.delay(500);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        // 获取所有敌方单位
        const enemyUnits = this.game.units.filter(unit => 
            unit.faction !== this.faction && unit.hp > 0
        );
        
        // 对每个弓箭手选择目标并攻击
        for (const archer of archers) {
            await this.executeRangedAttack(archer, enemyUnits);
            await this.delay(this.autoDelay);
        }
        
        // 完成远程阶段
        await this.delay(500);
        this.log('✓ 远程攻击完成', 'success');
        this.thinking = false;
        this.nextPhase();
    }
    
    /**
     * 执行远程攻击
     */
    async executeRangedAttack(archer, enemyUnits) {
        // 找到射程内最优目标
        const target = this.findBestRangedTarget(archer, enemyUnits);
        
        if (!target) {
            this.log(`└─ ${archer.name} 无射程内目标`, 'info');
            return;
        }
        
        // 选择弓箭手
        this.selectUnit(archer);
        await this.delay(200);
        
        // 选择目标
        this.selectUnit(target);
        await this.delay(200);
        
        // 确认射击
        const confirmBtn = document.getElementById('confirm-ranged-attack-btn');
        if (confirmBtn && confirmBtn.style.display !== 'none') {
            confirmBtn.click();
            this.log(`└─ ${archer.name} 射击 ${target.name}`, 'action');
        }
    }
    
    /**
     * 寻找最佳远程目标
     */
    findBestRangedTarget(archer, enemyUnits) {
        const maxRange = 10; // 弓箭手射程
        const targets = [];
        
        for (const enemy of enemyUnits) {
            const distance = this.getDistance(archer.x, archer.y, enemy.x, enemy.y);
            
            if (distance <= maxRange) {
                // 计算目标优先级
                let priority = 0;
                
                // 优先攻击已受损单位（集火）
                const hpPercent = enemy.hp / enemy.maxHp;
                priority += (1 - hpPercent) * this.config.focusFire * 100;
                
                // 优先攻击弓箭手和将领
                if (enemy.type === 'archer') priority += 50;
                if (enemy.type === 'general') priority += 80;
                
                // 距离越近优先级越高
                priority += (maxRange - distance) * 5;
                
                targets.push({ enemy, distance, priority });
            }
        }
        
        // 按优先级排序
        targets.sort((a, b) => b.priority - a.priority);
        
        return targets.length > 0 ? targets[0].enemy : null;
    }
    
    // ==================== 近战阶段 ====================
    
    /**
     * 处理近战阶段
     */
    async handleMeleePhase() {
        this.log('⚔️ 开始近战...', 'phase');
        console.log(`[罗马AI] handleMeleePhase() called, subPhase: ${this.game.meleeSubPhase}, currentPlayer: ${this.game.currentPlayer}`);
        
        // 根据近战子阶段处理
        switch (this.game.meleeSubPhase) {
            case 'select_attacker':
                await this.selectMeleeAttacker();
                break;
            case 'select_target':
                await this.selectMeleeTarget();
                break;
            case 'defender_choose_retreat':
                await this.defenderChooseRetreat();
                break;
            case 'select_attacker_support':
                await this.selectAttackerSupport();
                break;
            case 'select_defender_support':
                // 如果己方是防守方，需要选择支援
                await this.selectDefenderSupport();
                break;
            case 'execute_combat':
                // 等待战斗执行
                break;
        }
    }
    
    /**
     * 选择近战攻击者
     */
    async selectMeleeAttacker() {
        this.log('选择近战攻击者...', 'phase');
        
        // 获取所有可以冲锋的己方单位
        const myUnits = this.game.units.filter(unit => 
            unit.faction === this.faction && 
            unit.hp > 0 &&
            !unit.hasCharged && // 还没有冲锋过
            !unit.hasMeleeAttacked // 还没有近战攻击过
        );
        
        this.log(`└─ 检测到 ${myUnits.length} 个可冲锋单位`, 'info');
        
        if (myUnits.length === 0) {
            this.log('└─ 没有可冲锋的单位', 'info');
            
            // 检查是否有持续近战需要处理
            const sustainedUnits = this.game.getAvailableSustainedMeleeUnits();
            if (sustainedUnits.length > 0) {
                this.log(`└─ 检测到 ${sustainedUnits.length} 个持续近战单位，处理持续近战`, 'info');
                // 持续近战由游戏系统自动处理
                this.thinking = false;
                return;
            }
            
            this.log('└─ 没有持续近战，结束近战阶段', 'info');
            await this.delay(500);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        // 获取所有敌方单位
        const enemyUnits = this.game.units.filter(unit => 
            unit.faction !== this.faction && unit.hp > 0
        );
        
        // 选择最佳冲锋单位
        const bestAttacker = this.findBestMeleeAttacker(myUnits, enemyUnits);
        
        if (!bestAttacker) {
            this.log('└─ 所有单位3格内都没有敌人，结束近战', 'info');
            await this.delay(500);
            this.thinking = false;
            this.nextPhase();
            return;
        }
        
        // 选择该单位
        this.selectUnit(bestAttacker);
        this.log(`└─ 选择 ${bestAttacker.name} 发起冲锋`, 'action');
        await this.delay(this.autoDelay);
        
        // 选择攻击者后，自动进入目标选择
        if (this.game.meleeSubPhase === 'select_target' && this.game.meleeAttacker) {
            this.log('└─ 继续选择攻击目标...', 'info');
            await this.selectMeleeTarget();
        }
        
        // 注意：不要在这里调用 nextPhase()
        // 冲锋执行完成后会自动重置状态，然后由循环继续处理下一个单位
    }
    
    /**
     * 选择近战目标
     */
    async selectMeleeTarget() {
        this.log('选择近战目标...', 'phase');
        
        if (!this.game.meleeAttacker) {
            this.log('└─ 没有攻击者', 'error');
            return;
        }
        
        // 获取所有敌方单位
        const enemyUnits = this.game.units.filter(unit => 
            unit.faction !== this.faction && unit.hp > 0
        );
        
        // 选择最佳目标（确保在3格范围内）
        const bestTarget = this.findBestMeleeTarget(this.game.meleeAttacker, enemyUnits);
        
        if (!bestTarget) {
            this.log('└─ 没有合适的目标', 'info');
            return;
        }
        
        // 验证距离（游戏要求3格内）
        const distance = this.getDistance(this.game.meleeAttacker.x, this.game.meleeAttacker.y, bestTarget.x, bestTarget.y);
        if (distance > 3) {
            this.log(`└─ 目标 ${bestTarget.name} 距离${distance}格，超出冲锋范围`, 'warning');
            return;
        }

        // 直接设置近战目标（模拟游戏逻辑）
        this.game.meleeTarget = bestTarget;

        // 切换到防御方，让其选择是否撤退
        this.game.currentPlayer = this.game.currentPlayer === 'rome' ? 'carthage' : 'rome';
        this.game.meleeSubPhase = 'defender_choose_retreat';

        this.log(`└─ 选择 ${bestTarget.name} 作为目标 (距离${distance}格)`, 'action');

        // 立即触发迦太基AI来处理撤退选择
        if (window.battleAI && window.battleAI.enabled && window.battleAI.shouldControl()) {
            this.log('触发迦太基AI处理防御方撤退...', 'info');
            window.battleAI.defenderChooseRetreat();
        }

        await this.delay(this.autoDelay);
    }
    
    /**
     * 选择攻击方支援
     */
    async selectAttackerSupport() {
        this.log('选择攻击方支援...', 'phase');
        
        // 获取所有可支援的己方单位
        const supportUnits = this.game.units.filter(unit => 
            unit.faction === this.faction && 
            unit.hp > 0 &&
            unit.id !== this.game.meleeAttacker.id &&
            !unit.hasSupported
        );
        
        if (supportUnits.length === 0) {
            this.log('└─ 没有可用的支援单位', 'info');
            await this.delay(500);
            this.finishSupport('attacker');
            return;
        }
        
        // 选择最多3个最强的支援单位
        const selectedSupports = this.selectBestSupports(
            this.game.meleeAttacker, 
            this.game.meleeTarget,
            supportUnits,
            3
        );
        
        for (const support of selectedSupports) {
            this.selectUnit(support);
            this.log(`└─ 选择 ${support.name} 支援攻击`, 'action');
            await this.delay(300);
        }
        
        // 完成支援选择
        await this.delay(500);
        this.finishSupport('attacker');
    }

    /**
     * 选择防御方支援
     */
    async selectDefenderSupport() {
        this.log('选择防御方支援...', 'phase');

        // 获取所有可支援的己方单位
        const supportUnits = this.game.units.filter(unit =>
            unit.faction === this.faction &&
            unit.hp > 0 &&
            unit.id !== this.game.meleeTarget.id &&
            !unit.hasSupported
        );

        if (supportUnits.length === 0) {
            this.log('└─ 没有可用的支援单位', 'info');
            await this.delay(500);
            this.finishSupport('defender');
            return;
        }

        // 选择最多3个最强的支援单位
        const selectedSupports = this.selectBestSupports(
            this.game.meleeTarget,
            this.game.meleeAttacker,
            supportUnits,
            3
        );

        for (const support of selectedSupports) {
            this.selectUnit(support);
            this.log(`└─ 选择 ${support.name} 支援防守`, 'action');
            await this.delay(300);
        }

        // 完成支援选择
        await this.delay(500);
        this.finishSupport('defender');
    }

    /**
     * 防御方选择撤退
     */
    async defenderChooseRetreat() {
        this.log('防御方选择撤退...', 'phase');
        console.log(`[罗马AI] defenderChooseRetreat() called, meleeTarget: ${this.game.meleeTarget?.name}, currentPlayer: ${this.game.currentPlayer}, subPhase: ${this.game.meleeSubPhase}`);

        if (!this.game.meleeTarget) {
            this.log('└─ 没有防御目标', 'error');
            this.processingRetreat = false; // 重置标志
            return;
        }

        // 确保当前玩家是罗马且处于防御方撤退阶段
        if (this.game.currentPlayer !== 'rome' || this.game.meleeSubPhase !== 'defender_choose_retreat') {
            this.log(`└─ 条件不满足: currentPlayer=${this.game.currentPlayer}, subPhase=${this.game.meleeSubPhase}`, 'warning');
            this.processingRetreat = false; // 重置标志
            console.log(`[罗马AI] 等待条件满足后重试...`);
            // 等待一小段时间后重试
            await this.delay(500);
            if (this.game.currentPlayer === 'rome' && this.game.meleeSubPhase === 'defender_choose_retreat' && !this.processingRetreat) {
                console.log(`[罗马AI] 条件满足，重试撤退选择`);
                this.processingRetreat = true;
                this.game.defenderChooseRetreat();
                return;
            }
            return;
        }

        // 评估战力对比，决定是撤退还是坚守
        const shouldRetreat = this.evaluateRetreatDecision(this.game.meleeAttacker, this.game.meleeTarget);

        if (shouldRetreat) {
            this.log(`└─ ${this.game.meleeTarget.name} 评估劣势，选择撤退`, 'action');
            
            // 调用游戏的撤退函数
            this.game.defenderChooseRetreat();
            
            // 等待撤退完成并更新显示
            await this.delay(1000);
            this.game.renderBoard();
            this.game.updateUI();

            // 撤退完成后，重置thinking状态，触发攻击方AI继续处理下一个冲锋
            this.thinking = false;
            this.processingRetreat = false; // 重置标志
            setTimeout(() => {
                // 游戏已经重置了冲锋状态并切换回攻击方
                if (window.battleAI && window.battleAI.enabled && 
                    window.battleAI.shouldControl() && 
                    this.game.meleeSubPhase === 'select_attacker') {
                    console.log('[罗马AI] 撤退完成，触发迦太基AI继续选择下一个攻击者');
                    window.battleAI.takeTurn();
                }
            }, 1000);
        } else {
            this.log(`└─ ${this.game.meleeTarget.name} 评估优势，选择坚守战斗`, 'action');
            
            // 调用游戏的坚守函数
            this.game.defenderChooseStand();
            
            this.processingRetreat = false; // 重置标志
            await this.delay(this.autoDelay);
            
            // 坚守战斗会进入攻击方支援选择阶段
            setTimeout(() => {
                if (this.game.meleeSubPhase === 'select_attacker_support') {
                    this.log('└─ 进入攻击方支援选择阶段...', 'info');
                    // 触发攻击方AI选择支援
                    if (window.battleAI && window.battleAI.enabled && window.battleAI.shouldControl()) {
                        window.battleAI.takeTurn();
                    }
                }
            }, 500);
        }
    }

    /**
     * 评估冲锋决策
     * 返回战力比（攻击方战力 / 防御方战力）
     */
    evaluateChargeDecision(attacker, target) {
        if (!attacker || !target) return 0;

        // 1. 计算攻击方基础战力
        const attackerPower = (attacker.chargeAttack || 0) + (attacker.hp / attacker.maxHp) * 10;

        // 2. 计算防御方基础战力
        const targetPower = (target.defense || 0) + (target.hp / target.maxHp) * 10;

        // 3. 计算攻击方可用支援单位
        const attackerSupports = this.game.units.filter(unit =>
            unit.faction === attacker.faction &&
            unit.hp > 0 &&
            unit.id !== attacker.id &&
            !unit.hasSupported &&
            this.getDistance(unit.x, unit.y, attacker.x, attacker.y) <= 3
        );
        const attackerSupportPower = attackerSupports.reduce((sum, u) => sum + (u.supportMelee || 0) + (u.defense || 0), 0);

        // 4. 计算防御方可用支援单位
        const targetSupports = this.game.units.filter(unit =>
            unit.faction === target.faction &&
            unit.hp > 0 &&
            unit.id !== target.id &&
            !unit.hasSupported &&
            this.getDistance(unit.x, unit.y, target.x, target.y) <= 3
        );
        const targetSupportPower = targetSupports.reduce((sum, u) => sum + (u.supportMelee || 0) + (u.defense || 0), 0);

        // 5. 综合战力评估
        const totalAttackerPower = attackerPower + attackerSupportPower;
        const totalTargetPower = targetPower + targetSupportPower;

        // 6. 计算战力比
        const powerRatio = totalAttackerPower / (totalTargetPower || 1);

        return powerRatio;
    }

    /**
     * 评估撤退决策
     * 返回true表示应该撤退，false表示应该坚守
     */
    evaluateRetreatDecision(attacker, defender) {
        if (!attacker || !defender) return true;

        // 1. 计算基础战力
        const attackerPower = (attacker.chargeAttack || 0) + (attacker.hp / attacker.maxHp) * 10;
        const defenderPower = (defender.defense || 0) + (defender.hp / defender.maxHp) * 10;

        // 2. 计算己方可用支援单位（防御方）
        const defenderSupports = this.game.units.filter(unit =>
            unit.faction === defender.faction &&
            unit.hp > 0 &&
            unit.id !== defender.id &&
            !unit.hasSupported &&
            this.getDistance(unit.x, unit.y, defender.x, defender.y) <= 3
        );
        const defenderSupportPower = defenderSupports.reduce((sum, u) => sum + (u.supportMelee || 0) + (u.defense || 0), 0);

        // 3. 计算对方可用支援单位（攻击方）
        const attackerSupports = this.game.units.filter(unit =>
            unit.faction === attacker.faction &&
            unit.hp > 0 &&
            unit.id !== attacker.id &&
            !unit.hasSupported &&
            this.getDistance(unit.x, unit.y, attacker.x, attacker.y) <= 3
        );
        const attackerSupportPower = attackerSupports.reduce((sum, u) => sum + (u.supportMelee || 0) + (u.defense || 0), 0);

        // 4. 综合战力评估
        const totalDefenderPower = defenderPower + defenderSupportPower;
        const totalAttackerPower = attackerPower + attackerSupportPower;

        // 5. 计算战力比
        const powerRatio = totalDefenderPower / (totalAttackerPower || 1);

        this.log(`└─ 战力评估: 防守${totalDefenderPower.toFixed(1)} vs 攻击${totalAttackerPower.toFixed(1)}, 比率=${powerRatio.toFixed(2)}`, 'info');
        this.log(`└─ 支援情况: 防守${defenderSupports.length}个 vs 攻击${attackerSupports.length}个`, 'info');

        // 6. 决策逻辑
        // 战力比 < 0.6：显著劣势，选择撤退
        // 战力比 >= 0.6：有一战之力，选择坚守
        const shouldRetreat = powerRatio < 0.6;

        if (shouldRetreat) {
            this.log(`└─ 战力比${powerRatio.toFixed(2)} < 0.6，选择撤退`, 'info');
        } else {
            this.log(`└─ 战力比${powerRatio.toFixed(2)} >= 0.6，选择坚守`, 'info');
        }

        return shouldRetreat;
    }
    
    /**
     * 寻找最佳近战攻击者
     */
    findBestMeleeAttacker(myUnits, enemyUnits) {
        const candidates = [];
        
        for (const unit of myUnits) {
            // 找到该单位可攻击的敌人（游戏规则：3格内）
            const targets = enemyUnits.filter(enemy => {
                const distance = this.getDistance(unit.x, unit.y, enemy.x, enemy.y);
                return distance <= 3; // 冲锋距离（游戏规则是3格，不是6格）
            });
            
            if (targets.length === 0) continue;
            
            // 对每个可能的目标进行战力评估
            let bestTargetForThisUnit = null;
            let bestPowerRatio = 0;
            
            for (const target of targets) {
                // 评估对该目标发起冲锋的战力比
                const powerRatio = this.evaluateChargeDecision(unit, target);
                
                // 只有战力比 >= 0.8 才考虑冲锋
                if (powerRatio >= 0.8 && powerRatio > bestPowerRatio) {
                    bestPowerRatio = powerRatio;
                    bestTargetForThisUnit = target;
                }
            }
            
            // 如果没有合适的目标（战力比都 < 0.8），跳过该单位
            if (!bestTargetForThisUnit) {
                this.log(`└─ ${unit.name} 周围敌人过强（战力比 < 0.8），不冲锋`, 'info');
                continue;
            }
            
            // 计算该单位作为攻击者的优先级
            let priority = 0;
            
            // 战力比越高，优先级越高
            priority += bestPowerRatio * 100;
            
            // 骑兵和战象适合冲锋
            if (unit.type === 'cavalry') priority += 100;
            if (unit.type === 'elephant') priority += 120;
            if (unit.type === 'general') priority += 80;
            
            // HP越高优先级越高
            priority += (unit.hp / unit.maxHp) * 50;
            
            // 冲锋攻击力越高优先级越高
            priority += (unit.chargeAttack || 0) * 10;
            
            candidates.push({ unit, priority, bestTarget: bestTargetForThisUnit, powerRatio: bestPowerRatio });
        }
        
        // 按优先级排序
        candidates.sort((a, b) => b.priority - a.priority);
        
        if (candidates.length > 0) {
            const best = candidates[0];
            this.log(`└─ 最佳攻击者: ${best.unit.name}, 目标: ${best.bestTarget.name}, 战力比: ${best.powerRatio.toFixed(2)}`, 'info');
            return best.unit;
        }
        
        return null;
    }
    
    /**
     * 寻找最佳近战目标
     */
    findBestMeleeTarget(attacker, enemyUnits) {
        const maxRange = 3; // 冲锋距离（游戏规则是3格）
        const targets = [];
        
        for (const enemy of enemyUnits) {
            const distance = this.getDistance(attacker.x, attacker.y, enemy.x, enemy.y);
            
            if (distance <= maxRange) {
                // 计算目标优先级
                let priority = 0;
                
                // 优先攻击已受损单位
                const hpPercent = enemy.hp / enemy.maxHp;
                priority += (1 - hpPercent) * this.config.focusFire * 100;
                
                // 优先攻击高价值目标
                if (enemy.type === 'general') priority += 150;
                if (enemy.type === 'elephant') priority += 80;
                if (enemy.type === 'archer') priority += 60;
                
                // 优先攻击弱小目标
                if (enemy.defense < 5) priority += 30;
                
                // 距离越近优先级越高
                priority += (maxRange - distance) * 10;
                
                targets.push({ enemy, distance, priority });
            }
        }
        
        // 按优先级排序
        targets.sort((a, b) => b.priority - a.priority);
        
        return targets.length > 0 ? targets[0].enemy : null;
    }
    
    /**
     * 选择最佳支援单位
     */
    selectBestSupports(attacker, target, availableUnits, maxCount) {
        const supports = [];
        
        for (const unit of availableUnits) {
            const distanceToAttacker = this.getDistance(unit.x, unit.y, attacker.x, attacker.y);
            const distanceToTarget = this.getDistance(unit.x, unit.y, target.x, target.y);
            
            // 支援单位必须在3格范围内（游戏规则）
            if (distanceToAttacker > 3 && distanceToTarget > 3) continue;
            
            // 计算支援价值
            let value = 0;
            
            // 支援近战能力高的单位价值高
            value += (unit.supportMelee || 0) * 10;
            
            // HP高的单位支援价值高
            value += (unit.hp / unit.maxHp) * 30;
            
            // 距离近的单位支援价值高
            value += (3 - Math.min(distanceToAttacker, distanceToTarget)) * 5;
            
            supports.push({ unit, value });
        }
        
        // 按价值排序
        supports.sort((a, b) => b.value - a.value);
        
        // 返回前N个
        return supports.slice(0, maxCount).map(s => s.unit);
    }
    
    /**
     * 完成支援选择
     */
    finishSupport(side) {
        const btnId = side === 'attacker' ? 
            'finish-attacker-support-btn' : 
            'finish-defender-support-btn';
        
        const btn = document.getElementById(btnId);
        if (btn && btn.style.display !== 'none') {
            btn.click();
            this.log(`✓ 完成${side === 'attacker' ? '攻击方' : '防守方'}支援选择`, 'success');
            
            // 如果完成的是攻击方支援，触发防御方AI选择支援
            if (side === 'attacker') {
                setTimeout(() => {
                    if (this.game.meleeSubPhase === 'select_defender_support') {
                        this.log('└─ 进入防御方支援选择阶段...', 'info');
                        // 触发防御方AI
                        if (window.battleAI && window.battleAI.enabled && window.battleAI.shouldControl()) {
                            window.battleAI.takeTurn();
                        }
                    }
                }, 500);
            }
        }
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 找到最近的敌人
     */
    findNearestEnemy(unit, enemyUnits) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const enemy of enemyUnits) {
            const distance = this.getDistance(unit.x, unit.y, enemy.x, enemy.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = enemy;
            }
        }
        
        return nearest;
    }
    
    /**
     * 计算距离
     */
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    /**
     * 进入下一阶段
     */
    nextPhase() {
        const btn = document.getElementById('next-phase-btn');
        if (btn && btn.style.display !== 'none' && !btn.disabled) {
            btn.click();
            this.log('✓ 进入下一阶段', 'success');
        }
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 日志输出
     */
    log(message, type = 'info') {
        if (!this.debugMode && type === 'info') return;
        
        const prefix = {
            'phase': '🎯',
            'action': '▶',
            'success': '✓',
            'error': '❌',
            'info': 'ℹ'
        }[type] || '';
        
        const color = {
            'phase': 'color: #3498db; font-weight: bold;',
            'action': 'color: #27ae60;',
            'success': 'color: #229954; font-weight: bold;',
            'error': 'color: #e74c3c; font-weight: bold;',
            'info': 'color: #95a5a6;'
        }[type] || '';
        
        console.log(`%c[战棋AI] ${prefix} ${message}`, color);
        
        // 也添加到游戏日志
        if (type === 'phase' || type === 'success' || type === 'error') {
            if (typeof this.game.addGameLog === 'function') {
                this.game.addGameLog(`${prefix} ${message}`);
            }
        }
    }
}

// 导出供全局使用
window.BattleAIControllerRome = BattleAIControllerRome;

console.log('🤖 战棋AI控制器模块（罗马）已加载');

