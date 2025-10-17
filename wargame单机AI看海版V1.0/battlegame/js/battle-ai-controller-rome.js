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
        
        // 捕获游戏console输出用于调试
        this.capturedLogs = [];
        this.setupConsoleCapture();
        
        this.log('战棋AI控制器已创建');
    }
    
    /**
     * 设置console捕获（用于调试）
     */
    setupConsoleCapture() {
        const originalConsoleLog = console.log;
        const self = this;
        console.log = function(...args) {
            // 保存最近30条日志
            self.capturedLogs.push(args.join(' '));
            if (self.capturedLogs.length > 30) {
                self.capturedLogs.shift();
            }
            // 调用原始console.log
            originalConsoleLog.apply(console, args);
        };
    }
    
    /**
     * 获取最近的console输出
     */
    getRecentConsoleLogs(count = 5) {
        return this.capturedLogs.slice(-count);
    }
    
    /**
     * 清除捕获的日志
     */
    clearCapturedLogs() {
        this.capturedLogs = [];
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
        // 1. 检查当前已部署单位的位置
        if (typeof this.game.isAreaOccupiedByOthers === 'function') {
            if (this.game.isAreaOccupiedByOthers(x, y, size, 1, excludeUnitId)) {
                return true;
            }
        } else {
            // 如果游戏方法不可用，使用简单检测
            for (const unit of this.game.units) {
                if (unit.id === excludeUnitId) continue;
                if (!unit.deployed) continue;
                
                const unitSize = this.game.unitSizes[unit.type] || 1;
                const distance = this.getDistance(x, y, unit.x, unit.y);
                
                if (distance < (size + unitSize)) {
                    return true;
                }
            }
        }
        
        // 2. 检查已规划但未执行的移动目标位置
        if (this.game.allUnitPlans && this.game.allUnitPlans.size > 0) {
            for (const [unitId, planData] of this.game.allUnitPlans) {
                // 跳过当前单位自己的规划
                if (unitId === excludeUnitId) continue;
                
                const { unit, plan } = planData;
                if (!plan || plan.length === 0) continue;
                
                // 获取该单位的目标位置（移动计划的最后一步）
                const lastStep = plan[plan.length - 1];
                const targetX = lastStep.endX;
                const targetY = lastStep.endY;
                
                // 获取单位尺寸
                const unitSize = this.game.unitSizes[unit.type] || { width: 1, height: 1 };
                
                // 检查是否与目标位置重叠
                if (this.isAreaOverlap(x, y, size, 1, targetX, targetY, unitSize.width, unitSize.height)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 检查两个矩形区域是否重叠
     */
    isAreaOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
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
            // 检查是否已经完成所有规划（游戏自动切换状态）
            if (this.game.moveState === 'all_planned' || this.game.planningPhase === 'executing') {
                this.log('└─ 检测到游戏已进入执行阶段，停止规划', 'info');
                break;
            }
            
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
     * 为单个单位规划移动（新战术系统）
     */
    async planUnitMovement(unit, enemyUnits) {
        // 如果单位已经与敌人接敌，不移动
        if (unit.engagedWith) {
            this.log(`└─ ${unit.name} 已接敌，跳过移动`, 'info');
            return;
        }
        
        // 获取所有己方单位
        const myUnits = this.game.units.filter(u => u.faction === this.faction && u.hp > 0);
        
        // 根据单位类型选择不同的移动策略
        let targetPos = null;
        
        switch (unit.type) {
            case 'archer':
                targetPos = await this.planArcherMovement(unit, enemyUnits, myUnits);
                break;
            case 'cavalry':
                targetPos = await this.planCavalryMovement(unit, enemyUnits, myUnits);
                break;
            case 'infantry':
                targetPos = await this.planInfantryMovement(unit, enemyUnits, myUnits);
                break;
            case 'general':
                targetPos = await this.planGeneralMovement(unit, enemyUnits, myUnits);
                break;
            default:
                // 默认策略：向最近敌人移动
        const nearestEnemy = this.findNearestEnemy(unit, enemyUnits);
                if (nearestEnemy) {
                    targetPos = this.calculateApproachPosition(unit, nearestEnemy, 3);
                }
                break;
        }
        
        // 如果没有找到合适的目标位置，跳过
        if (!targetPos) {
            this.log(`└─ ${unit.name} 无合适移动位置`, 'info');
            return;
        }
        
        // 执行移动规划
        await this.executeMoveToPosition(unit, targetPos);
    }
    
    /**
     * 弓箭手移动策略（优化版）：
     * 1. 首要：移动到能射击敌人的位置
     * 2. 次要：在射程内的位置中，选择最远离敌人的安全位置
     */
    async planArcherMovement(unit, enemyUnits, myUnits) {
        if (!enemyUnits || enemyUnits.length === 0) return null;
        
        const archerRange = unit.range || 12; // 弓箭手射程
        const dangerDist = 5; // 5格内视为危险（接近近战范围）
        
        // 【使用游戏原生函数获取所有可移动位置】
        // 弓箭手通常规划1步移动即可
        const validMoves = this.getValidMovesForStep(unit, unit.x, unit.y, 0, []);
        
        if (validMoves.length === 0) {
            this.log(`  └─ ${unit.name} 没有可移动位置`, 'info');
            return null;
        }
        
        this.log(`  └─ [弓箭手] ${unit.name} 有${validMoves.length}个可移动位置`, 'info');
        
        // 【评估每个可移动位置】
        let bestPos = null;
        let bestScore = -Infinity;
        let positionsInRange = 0;
        
        for (const pos of validMoves) {
            // 1. 检查能否射击到敌人
            let canShootEnemy = false;
            let enemiesInRange = 0;
            let minDistToEnemy = Infinity;
            
            for (const enemy of enemyUnits) {
                const distToEnemy = this.getDistance(pos.x, pos.y, enemy.x, enemy.y);
                minDistToEnemy = Math.min(minDistToEnemy, distToEnemy);
                
                if (distToEnemy <= archerRange) {
                    canShootEnemy = true;
                    enemiesInRange++;
                }
            }
            
            // 如果不能射击到任何敌人，跳过这个位置
            if (!canShootEnemy) {
                continue;
            }
            
            positionsInRange++;
            
            // 2. 计算安全性（距离最近敌人越远越好）
            let safetyScore = minDistToEnemy;
            
            // 如果太近（危险距离内），大幅降低评分
            if (minDistToEnemy < dangerDist) {
                safetyScore = minDistToEnemy - 10; // 负分惩罚
            }
            
            // 3. 计算支援价值
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            
            // 4. 检查是否阻挡己方步兵
            let blockingPenalty = 0;
            const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.hp > 0);
            for (const inf of myInfantry) {
                const enemyCenter = this.calculateCenterOfMass(enemyUnits);
                // 如果弓箭手在步兵和敌人之间，扣分
                const infToEnemy = this.getDistance(inf.x, inf.y, enemyCenter.x, enemyCenter.y);
                const infToArcher = this.getDistance(inf.x, inf.y, pos.x, pos.y);
                const archerToEnemy = this.getDistance(pos.x, pos.y, enemyCenter.x, enemyCenter.y);
                
                if (infToArcher < infToEnemy && archerToEnemy < infToEnemy) {
                    blockingPenalty += 5; // 阻挡步兵，扣5分
                }
            }
            
            // 5. 计算可射击敌人数量加成
            const targetBonus = enemiesInRange * 0.5;
            
            // 【综合评分】
            // 权重：安全性×3（最重要） + 支援×2 + 目标数×0.5 - 阻挡惩罚×1
            const totalScore = safetyScore * 3 + supportScore * 2 + targetBonus - blockingPenalty;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        if (bestPos) {
            this.log(`  └─ [弓箭手] 找到最优位置，射程内位置数: ${positionsInRange}/${validMoves.length}`, 'info');
            return bestPos;
        } else {
            this.log(`  └─ [弓箭手] 没有射程内的可移动位置，保持原位`, 'info');
            return null; // 没有能射击敌人的位置，不移动
        }
    }
    
    /**
     * 寻找安全后退位置
     */
    findSafeRetreatPosition(archerUnit, threat, myUnits, safeDist) {
        const candidates = [];
        
        // 向威胁相反方向寻找位置
        const dx = archerUnit.x - threat.x;
        const dy = archerUnit.y - threat.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.1) {
            // 随机选择方向
            const angle = Math.random() * Math.PI * 2;
            const ndx = Math.cos(angle);
            const ndy = Math.sin(angle);
            
            for (let d = safeDist - 1; d <= safeDist + 1; d++) {
                const x = Math.round(archerUnit.x + ndx * d);
                const y = Math.round(archerUnit.y + ndy * d);
                if (this.isValidPosition(x, y) && !this.isPositionOccupied(x, y, archerUnit.id, 1)) {
                    candidates.push({ x, y });
                }
            }
        } else {
            const ndx = dx / dist;
            const ndy = dy / dist;
            
            // 生成后退位置候选
            for (let d = safeDist - 1; d <= safeDist + 1; d++) {
                for (let offset = -2; offset <= 2; offset++) {
                    const angle = Math.atan2(ndy, ndx) + (offset * Math.PI / 6);
                    const x = Math.round(archerUnit.x + Math.cos(angle) * d);
                    const y = Math.round(archerUnit.y + Math.sin(angle) * d);
                    
                    if (this.isValidPosition(x, y) && !this.isPositionOccupied(x, y, archerUnit.id, 1)) {
                        candidates.push({ x, y });
                    }
                }
            }
        }
        
        // 评估候选位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        const enemyUnits = this.game.units.filter(u => u.faction !== this.faction && u.hp > 0);
        
        for (const pos of candidates) {
            const supportScore = this.evaluateSupportValue(pos, archerUnit, myUnits);
            const riskScore = this.evaluatePositionRisk(pos, archerUnit, enemyUnits);
            const distToThreat = this.getDistance(pos.x, pos.y, threat.x, threat.y);
            
            // 评分：支援×10 - 风险×10 + 距离威胁×2
            const totalScore = supportScore * 10 - riskScore * 10 + distToThreat * 2;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos || this.calculateRetreatPosition(archerUnit, threat, safeDist);
    }
    
    /**
     * 骑兵移动策略：优先攻击敌方骑兵，待步兵交战后攻击敌方步兵后背
     */
    async planCavalryMovement(unit, enemyUnits, myUnits) {
        // 1. 检查是否有敌方骑兵 - 优先攻击
        const enemyCavalry = enemyUnits.filter(u => u.type === 'cavalry');
        if (enemyCavalry.length > 0) {
            // 选择最优敌方骑兵目标
            const cavalryTarget = this.selectPriorityTarget(unit, enemyCavalry);
            if (cavalryTarget) {
                this.log(`  └─ ${unit.name} 优先攻击敌方骑兵`, 'info');
                return this.findBestFlankingPosition(unit, cavalryTarget, myUnits);
            }
        }
        
        // 2. 检查己方步兵是否已经与敌人交战
        const infantryEngaged = this.isInfantryEngaged(myUnits, enemyUnits);
        
        if (infantryEngaged) {
            // 步兵已交战，寻找敌方步兵的后方位置
            const enemyInfantry = enemyUnits.filter(u => u.type === 'infantry');
            if (enemyInfantry.length > 0) {
                const infantryTarget = this.selectPriorityTarget(unit, enemyInfantry);
                if (infantryTarget) {
                    this.log(`  └─ ${unit.name} 步兵已交战，准备攻击敌方步兵后背`, 'info');
                    // 寻找敌方步兵的后方位置
                    return this.findRearAttackPosition(unit, infantryTarget, myUnits);
                }
            }
        }
        
        // 3. 步兵未交战，骑兵保持侧翼待命或寻找其他机会
        const priorityTarget = this.selectPriorityTarget(unit, enemyUnits);
        if (!priorityTarget) return null;
        
        // 寻找侧翼位置，但不要过于深入
        const weakPoint = this.findEnemyWeakPoint(enemyUnits, myUnits);
        const target = (weakPoint && this.canFlankTarget(unit, weakPoint, myUnits)) ? weakPoint : priorityTarget;
        
        return this.findBestFlankingPosition(unit, target, myUnits);
    }
    
    /**
     * 检查步兵是否已交战
     */
    isInfantryEngaged(myUnits, enemyUnits) {
        const myInfantry = myUnits.filter(u => u.type === 'infantry');
        const enemyInfantry = enemyUnits.filter(u => u.type === 'infantry');
        
        // 检查是否有己方步兵与敌方步兵距离很近（<4格视为交战）
        for (const myInf of myInfantry) {
            for (const enemyInf of enemyInfantry) {
                const dist = this.getDistance(myInf.x, myInf.y, enemyInf.x, enemyInf.y);
                if (dist < 4) {
                    return true; // 步兵已交战
                }
            }
        }
        
        return false;
    }
    
    /**
     * 寻找后方攻击位置
     */
    findRearAttackPosition(cavalryUnit, target, myUnits) {
        // 计算目标的后方方向（与其朝向相反）
        const targetDirection = target.direction || 'east';
        let rearAngles = [];
        
        switch (targetDirection) {
            case 'north':
                rearAngles = [180, 150, -150]; // 南方为后背
                break;
            case 'south':
                rearAngles = [0, 30, -30]; // 北方为后背
                break;
            case 'east':
                rearAngles = [270, 240, -240]; // 西方为后背
                break;
            case 'west':
                rearAngles = [90, 60, 120]; // 东方为后背
                break;
        }
        
        const candidates = [];
        const distance = 2; // 更近距离，准备冲锋
        
        for (const angle of rearAngles) {
            const rad = angle * Math.PI / 180;
            const x = Math.round(target.x + Math.cos(rad) * distance);
            const y = Math.round(target.y + Math.sin(rad) * distance);
            
            if (this.isValidPosition(x, y) && !this.isPositionOccupied(x, y, cavalryUnit.id, 1)) {
                candidates.push({ x, y });
            }
        }
        
        if (candidates.length === 0) {
            // 如果后方位置都被占，尝试侧方
            return this.findBestFlankingPosition(cavalryUnit, target, myUnits);
        }
        
        // 选择支援价值最高的后方位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            const supportScore = this.evaluateSupportValue(pos, cavalryUnit, myUnits);
            
            if (supportScore > bestScore) {
                bestScore = supportScore;
                bestPos = pos;
            }
        }
        
        return bestPos || candidates[0];
    }
    
    /**
     * 步兵移动策略：整体行动，形成防线稳步推进
     */
    async planInfantryMovement(unit, enemyUnits, myUnits) {
        const priorityTarget = this.selectPriorityTarget(unit, enemyUnits);
        if (!priorityTarget) return null;
        
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== unit.id);
        
        // 计算步兵整体的前进状态
        const infantryStatus = this.calculateInfantryGroupStatus(myInfantry, enemyUnits);
        
        // 步兵整体行动：根据整体状态决定移动距离
        let targetDist;
        
        if (infantryStatus.nearestEnemyDist < 8) {
            // 接近敌人，小步谨慎前进
            targetDist = 2;
            this.log(`  └─ ${unit.name} 整体接近敌人，谨慎推进${targetDist}格`, 'info');
        } else if (infantryStatus.nearestEnemyDist < 15) {
            // 中距离，稳步前进
            targetDist = 4;
        } else {
            // 远距离，可以快速前进
            targetDist = 5;
        }
        
        // 计算阵型一致的前进位置
        const formationPos = this.findGroupFormationPosition(unit, myInfantry, enemyUnits, targetDist);
        
        if (formationPos) {
            return formationPos;
        }
        
        // 如果找不到阵型位置，尝试标准前进
        const currentDist = this.getDistance(unit.x, unit.y, priorityTarget.x, priorityTarget.y);
        
        if (currentDist < 8) {
            const cautionPos = this.findCautiousAdvancePosition(unit, priorityTarget, myUnits, enemyUnits);
            if (cautionPos) return cautionPos;
        }
        
        const advancePos = this.findSteadyAdvancePosition(unit, priorityTarget, myUnits, enemyUnits);
        if (advancePos) return advancePos;
        
        return this.calculateApproachPosition(unit, priorityTarget, targetDist);
    }
    
    /**
     * 计算步兵整体状态
     */
    calculateInfantryGroupStatus(myInfantry, enemyUnits) {
        if (myInfantry.length === 0) {
            return { nearestEnemyDist: Infinity, avgEnemyDist: Infinity };
        }
        
        // 计算步兵整体到敌人的最近距离
        let minDist = Infinity;
        let totalDist = 0;
        
        for (const inf of myInfantry) {
            const nearest = this.findNearestEnemy(inf, enemyUnits);
            if (nearest) {
                const dist = this.getDistance(inf.x, inf.y, nearest.x, nearest.y);
                minDist = Math.min(minDist, dist);
                totalDist += dist;
            }
        }
        
        return {
            nearestEnemyDist: minDist,
            avgEnemyDist: totalDist / myInfantry.length
        };
    }
    
    /**
     * 寻找整体阵型位置
     */
    findGroupFormationPosition(unit, myInfantry, enemyUnits, targetDist) {
        if (myInfantry.length === 0) return null;
        
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        const lineDirection = this.detectInfantryLineDirection(myInfantry, enemyCenter);
        
        // 计算步兵整体的平均位置
        const avgX = myInfantry.reduce((sum, u) => sum + u.x, 0) / myInfantry.length;
        const avgY = myInfantry.reduce((sum, u) => sum + u.y, 0) / myInfantry.length;
        
        // 计算前进方向（朝向敌人）
        const dx = enemyCenter.x - avgX;
        const dy = enemyCenter.y - avgY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.1) return null;
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        // 生成沿着阵线的候选位置
        const candidates = [];
        
        // 根据排列方向生成候选位置
        if (lineDirection === 'horizontal') {
            // 横向阵型：保持y坐标一致，x坐标分散
            const targetY = Math.round(avgY + ndy * targetDist);
            
            for (let offsetX = -8; offsetX <= 8; offsetX++) {
                const targetX = Math.round(avgX + ndx * targetDist + offsetX * 2);
                candidates.push({ x: targetX, y: targetY });
                candidates.push({ x: targetX, y: targetY + 1 });
                candidates.push({ x: targetX, y: targetY - 1 });
            }
        } else {
            // 纵向阵型：保持x坐标一致，y坐标分散
            const targetX = Math.round(avgX + ndx * targetDist);
            
            for (let offsetY = -8; offsetY <= 8; offsetY++) {
                const targetY = Math.round(avgY + ndy * targetDist + offsetY * 2);
                candidates.push({ x: targetX, y: targetY });
                candidates.push({ x: targetX + 1, y: targetY });
                candidates.push({ x: targetX - 1, y: targetY });
            }
        }
        
        // 评估候选位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            if (!this.isValidPosition(pos.x, pos.y) || 
                this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                continue;
            }
            
            const allInfantry = [unit, ...myInfantry];
            const supportScore = this.evaluateSupportValue(pos, unit, allInfantry);
            const alignmentScore = this.calculateLineAlignment(pos, myInfantry, lineDirection);
            
            const enemyUnitsAll = this.game.units.filter(u => u.faction !== this.faction && u.hp > 0);
            const riskScore = this.evaluatePositionRisk(pos, unit, enemyUnitsAll);
            
            // 评分：排列整齐×30 + 支援×12 - 风险×6
            const totalScore = alignmentScore * 30 + supportScore * 12 - riskScore * 6;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos;
    }
    
    /**
     * 寻找谨慎前进位置（接近敌人时）
     */
    findCautiousAdvancePosition(unit, target, myUnits, enemyUnits) {
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== unit.id);
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        const lineDirection = myInfantry.length > 0 ? 
            this.detectInfantryLineDirection(myInfantry, enemyCenter) : 'horizontal';
        
        // 小步前进（2-3格）
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.1) return null;
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        const candidates = [];
        
        // 尝试2-3格的小步前进
        for (let d = 2; d <= 3; d++) {
            const baseX = Math.round(unit.x + ndx * d);
            const baseY = Math.round(unit.y + ndy * d);
            
            // 在一条线上生成位置
            if (lineDirection === 'horizontal') {
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    candidates.push({ x: baseX + offsetX, y: baseY });
                }
            } else {
                for (let offsetY = -1; offsetY <= 1; offsetY++) {
                    candidates.push({ x: baseX, y: baseY + offsetY });
                }
            }
        }
        
        // 评估候选位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            if (!this.isValidPosition(pos.x, pos.y) || 
                this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                continue;
            }
            
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            const alignmentScore = myInfantry.length > 0 ? 
                this.calculateLineAlignment(pos, myInfantry, lineDirection) : 0;
            const distToEnemy = this.getDistance(pos.x, pos.y, target.x, target.y);
            const riskScore = this.evaluatePositionRisk(pos, unit, enemyUnits);
            
            // 权重：排列整齐×25 + 支援×10 - 风险×8 - 距离敌人×1
            const totalScore = alignmentScore * 25 + supportScore * 10 - riskScore * 8 - distToEnemy;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos;
    }
    
    /**
     * 寻找稳步前进位置（远离敌人时）
     */
    findSteadyAdvancePosition(unit, target, myUnits, enemyUnits) {
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== unit.id);
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        const lineDirection = myInfantry.length > 0 ? 
            this.detectInfantryLineDirection(myInfantry, enemyCenter) : 'horizontal';
        
        // 中等步幅前进（4-5格）
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.1) return null;
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        const candidates = [];
        
        // 尝试4-5格的稳步前进
        for (let d = 4; d <= 5; d++) {
            const baseX = Math.round(unit.x + ndx * d);
            const baseY = Math.round(unit.y + ndy * d);
            
            // 在一条线上生成位置
            if (lineDirection === 'horizontal') {
                for (let offsetX = -2; offsetX <= 2; offsetX++) {
                    candidates.push({ x: baseX + offsetX, y: baseY });
                }
            } else {
                for (let offsetY = -2; offsetY <= 2; offsetY++) {
                    candidates.push({ x: baseX, y: baseY + offsetY });
                }
            }
        }
        
        // 评估候选位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            if (!this.isValidPosition(pos.x, pos.y) || 
                this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                continue;
            }
            
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            const alignmentScore = myInfantry.length > 0 ? 
                this.calculateLineAlignment(pos, myInfantry, lineDirection) : 0;
            const distToEnemy = this.getDistance(pos.x, pos.y, target.x, target.y);
            const riskScore = this.evaluatePositionRisk(pos, unit, enemyUnits);
            
            // 权重：排列整齐×20 + 支援×10 - 风险×5 - 距离敌人×1.5
            const totalScore = alignmentScore * 20 + supportScore * 10 - riskScore * 5 - distToEnemy * 1.5;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos;
    }
    
    /**
     * 寻找前进位置（保持一线阵型）
     */
    findAdvancePositionInLine(unit, target, myUnits, enemyUnits) {
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== unit.id);
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        // 检测排列方向
        const lineDirection = myInfantry.length > 0 ? 
            this.detectInfantryLineDirection(myInfantry, enemyCenter) : 'horizontal';
        
        // 计算前进方向
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.1) return null;
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        // 生成多个前进候选位置
        const candidates = [];
        const maxMoveDistance = this.getUnitMoveDistance(unit);
        
        // 朝敌人方向前进，尝试多个距离
        for (let d = maxMoveDistance; d >= maxMoveDistance * 0.5; d -= 1) {
            const baseX = Math.round(unit.x + ndx * d);
            const baseY = Math.round(unit.y + ndy * d);
            
            // 生成在一条线上的位置变体
            if (lineDirection === 'horizontal') {
                // 保持y坐标，调整x坐标
                for (let offsetX = -2; offsetX <= 2; offsetX++) {
                    candidates.push({ x: baseX + offsetX, y: baseY });
                }
            } else {
                // 保持x坐标，调整y坐标
                for (let offsetY = -2; offsetY <= 2; offsetY++) {
                    candidates.push({ x: baseX, y: baseY + offsetY });
                }
            }
        }
        
        // 评估候选位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            if (!this.isValidPosition(pos.x, pos.y) || 
                this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                continue;
            }
            
            // 计算各项评分
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            const alignmentScore = myInfantry.length > 0 ? 
                this.calculateLineAlignment(pos, myInfantry, lineDirection) : 0;
            const distToEnemy = this.getDistance(pos.x, pos.y, target.x, target.y);
            const riskScore = this.evaluatePositionRisk(pos, unit, enemyUnits);
            
            // 综合评分：排列整齐 × 15 + 支援 × 8 - 距离敌人 × 2 - 风险 × 3
            // 注意：增加了距离敌人的权重，鼓励前进
            const totalScore = alignmentScore * 15 + supportScore * 8 - distToEnemy * 2 - riskScore * 3;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos;
    }
    
    /**
     * 将领移动策略：保持在部队后方
     */
    async planGeneralMovement(unit, enemyUnits, myUnits) {
        // 找到己方前线位置
        const frontLine = this.calculateFrontLine(myUnits, enemyUnits);
        
        // 保持在前线后方3-5格
        const targetDist = 4;
        return this.calculateRearPosition(unit, frontLine, targetDist);
    }
    
    /**
     * 执行移动到指定位置（三步规划，最大化移动距离）
     */
    async executeMoveToPosition(unit, targetPos) {
        if (!targetPos) return;
        
        const { x: finalTargetX, y: finalTargetY } = targetPos;
        
        // 获取单位的移动力
        const maxMoveDistance = this.getUnitMoveDistance(unit);
        
        // 计算到最终目标的总距离
        const totalDist = this.getDistance(unit.x, unit.y, finalTargetX, finalTargetY);
        if (totalDist < 1) {
            this.log(`└─ ${unit.name} 无需移动`, 'info');
            return;
        }
        
        // 计算三步规划的路径点
        const steps = this.calculateThreeStepPath(unit, finalTargetX, finalTargetY, maxMoveDistance);
        
        if (steps.length === 0) {
            this.log(`└─ ${unit.name} 无法规划有效路径`, 'info');
            return;
        }
        
        this.log(`└─ ${unit.name} 规划${steps.length}步移动: (${unit.x},${unit.y}) → (${steps[steps.length-1].x},${steps[steps.length-1].y})`, 'action');
        
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
        
        // 依次点击每个步骤的位置
        let successfulSteps = 0;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const hexElement = document.querySelector(`[data-x="${step.x}"][data-y="${step.y}"]`);
            
            if (hexElement) {
                const previousLength = this.game.movePlan ? this.game.movePlan.length : 0;
                const previousState = this.game.moveState;
                
                // 【详细诊断】点击前的完整状态
                const clickedUnit = this.game.findUnitAtPosition(step.x, step.y);
                const diagInfo = {
                    step: i + 1,
                    pos: `(${step.x}, ${step.y})`,
                    unitPos: `(${unit.x}, ${unit.y})`,
                    previousPlanLength: previousLength,
                    moveState: previousState,
                    currentPhase: this.game.currentPhase,
                    hasUnitAtTarget: !!clickedUnit,
                    targetUnitName: clickedUnit ? clickedUnit.name : 'none'
                };
                
                this.log(`  └─ [点击前] 第${i+1}步: pos=${diagInfo.pos}, moveState=${diagInfo.moveState}, phase=${diagInfo.currentPhase}, 目标有单位=${diagInfo.hasUnitAtTarget}${diagInfo.hasUnitAtTarget ? '('+diagInfo.targetUnitName+')' : ''}`, 'info');
                
                // 清空console捕获日志，只保留这次点击的输出
                this.clearCapturedLogs();
                
                hexElement.click();
                
                // 等待movePlan更新或游戏自动完成规划
                let waitCount = 0;
                let planUpdated = false;
                let failureReason = '';
                let stateChangeDetected = false;
                
                while (waitCount < 15) {
                    await this.delay(100);
                    
                    // 【详细诊断】每次循环都记录当前状态
                    const currentMoveState = this.game.moveState;
                    const currentPlanLength = this.game.movePlan ? this.game.movePlan.length : 0;
                    
                    if (waitCount === 0) {
                        this.log(`  └─ [点击后] moveState=${currentMoveState}, planLength=${currentPlanLength}`, 'info');
                    }
                    
                    // 【修复】第3步的特殊处理：游戏会立即自动完成并清空movePlan
                    // 检测条件：如果是第3步（previousLength==2），且moveState变为none，movePlan被清空
                    if (previousLength === 2 && currentMoveState === 'none' && currentPlanLength === 0) {
                        planUpdated = true;
                        successfulSteps++;
                        this.log(`  └─ [成功] 第3步已添加，游戏自动完成规划`, 'info');
                        break;
                    }
                    
                    // 检查movePlan是否更新（适用于第1、2步）
                    if (this.game.movePlan && this.game.movePlan.length > previousLength) {
                        planUpdated = true;
                        successfulSteps++;
                        this.log(`  └─ [成功] movePlan已更新: ${previousLength} → ${this.game.movePlan.length}`, 'info');
                        break;
                    }
                    
                    // 检查是否因为达到3步而自动完成（movePlan被清空）- 保留向后兼容
                    if (this.game.moveState === 'none' && !this.game.movePlan && previousLength > 0 && waitCount > 2) {
                        planUpdated = true;
                        successfulSteps++;
                        this.log(`  └─ 游戏自动完成规划（已有${previousLength}步）`, 'info');
                        break;
                    }
                    
                    // 检查moveState变化（可能表示失败）
                    if (currentMoveState !== previousState) {
                        if (!stateChangeDetected) {
                            this.log(`  └─ [状态变化] moveState: ${previousState} → ${currentMoveState}`, 'info');
                            stateChangeDetected = true;
                        }
                        // 【修复】如果是第3步，moveState变为none是正常的
                        if (currentMoveState !== 'planning' && previousLength !== 2) {
                            failureReason = `moveState变为${currentMoveState}`;
                        }
                    }
                    
                    waitCount++;
                }
                
                // 【详细诊断】如果失败，记录最终状态
                if (!planUpdated) {
                    this.log(`  └─ [超时] 等待${waitCount}次循环(${waitCount*100}ms)后仍未更新`, 'error');
                    this.log(`  └─ [最终状态] moveState=${this.game.moveState}, planLength=${this.game.movePlan ? this.game.movePlan.length : 'null'}`, 'error');
                }
                
                if (planUpdated) {
                    if (successfulSteps <= i + 1) {
                        this.log(`  └─ 第${i+1}步已添加 (${step.x}, ${step.y})`, 'info');
                    }
                } else {
                    // 详细错误诊断
                    const currentDist = this.getDistance(
                        i === 0 ? unit.x : steps[i-1].x,
                        i === 0 ? unit.y : steps[i-1].y,
                        step.x, step.y
                    );
                    
                    this.log(`  └─ ❌ 第${i+1}步添加失败`, 'error');
                    this.log(`     位置: (${step.x}, ${step.y})`, 'error');
                    this.log(`     起点: ${i === 0 ? diagInfo.unitPos : `(${steps[i-1].x}, ${steps[i-1].y})`}`, 'error');
                    this.log(`     距离: ${currentDist.toFixed(2)}格 (移动力:${this.getUnitMoveDistance(unit)})`, 'error');
                    this.log(`     状态: ${this.game.moveState}`, 'error');
                    this.log(`     movePlan长度: ${this.game.movePlan ? this.game.movePlan.length : 'null'}`, 'error');
                    if (failureReason) {
                        this.log(`     原因: ${failureReason}`, 'error');
                    }
                    
                    // 【详细诊断】输出游戏console的最近日志
                    const recentLogs = this.getRecentConsoleLogs(8);
                    if (recentLogs.length > 0) {
                        this.log(`     [游戏Console输出]:`, 'error');
                        recentLogs.forEach(logMsg => {
                            this.log(`       ${logMsg}`, 'error');
                        });
                    }
                    break;
                }
                
                // 如果游戏已自动完成，不继续添加步骤
                if (this.game.moveState === 'none' && !this.game.movePlan) {
                    break;
                }
            } else {
                this.log(`  └─ 未找到第${i+1}步目标格子: (${step.x}, ${step.y})`, 'error');
                break;
            }
        }
        
        // 完成该单位的移动规划
        await this.delay(200);
        
        // 如果游戏没有自动完成（<3步），手动调用finishPlanning
        if (this.game.movePlan && this.game.movePlan.length > 0) {
            this.log(`  └─ ⚠️ 规划${steps.length}步，实际完成${successfulSteps}步`, 'info');
            
            if (typeof this.game.finishPlanning === 'function') {
                try {
                    this.game.finishPlanning();
                    await this.delay(200);
                    
                    const savedPlanCount = this.game.allUnitPlans ? this.game.allUnitPlans.size : 0;
                    this.log(`  └─ 已完成 ${unit.name} 的移动规划 (总计${savedPlanCount}个)`, 'info');
                } catch (error) {
                    this.log(`  └─ [错误] finishPlanning执行失败: ${error.message}`, 'error');
                }
            }
        } else if (successfulSteps > 0) {
            // 游戏已自动完成规划（达到3步或提前完成）
            const savedPlanCount = this.game.allUnitPlans ? this.game.allUnitPlans.size : 0;
            if (successfulSteps === steps.length) {
                this.log(`  └─ ✅ ${unit.name}完成${successfulSteps}步规划（游戏自动保存，总计${savedPlanCount}个单位）`, 'success');
            } else {
                this.log(`  └─ ⚠️ ${unit.name}完成${successfulSteps}/${steps.length}步规划（游戏自动保存，总计${savedPlanCount}个单位）`, 'info');
            }
        } else {
            this.log(`  └─ [错误] 没有成功添加任何步骤`, 'error');
        }
    }
    
    /**
     * 计算三步移动路径（使用游戏原生可移动范围）
     */
    calculateThreeStepPath(unit, targetX, targetY, maxMovePerStep) {
        const steps = [];
        let currentX = unit.x;
        let currentY = unit.y;
        
        // 获取敌方单位用于风险评估
        const enemyUnits = this.game.units.filter(u => u.faction !== this.faction && u.hp > 0);
        
        // 规划最多3步
        const maxSteps = 3;
        
        for (let i = 0; i < maxSteps; i++) {
            // 【使用游戏原生函数获取所有可移动格子】
            // 传递之前的步骤，以便正确验证
            const validMoves = this.getValidMovesForStep(unit, currentX, currentY, i, steps);
            
            if (validMoves.length === 0) {
                this.log(`  └─ [调试] 第${i+1}步没有可移动格子 (currentPos: ${currentX},${currentY})`, 'info');
                break;
            }
            
            // 计算目标方向
            const dx = targetX - currentX;
            const dy = targetY - currentY;
            const remainingDist = Math.sqrt(dx * dx + dy * dy);
            
            // 如果已经到达目标附近，停止规划
            if (remainingDist < 1) {
                break;
            }
            
            // 从所有可移动格子中选择最优位置
            let bestPos = null;
            let bestScore = -Infinity;
            
            for (const pos of validMoves) {
                const riskScore = this.evaluatePositionRisk(pos, unit, enemyUnits);
                const distToTarget = this.getDistance(pos.x, pos.y, targetX, targetY);
                
                // 优先接近目标方向
                const distToCurrentTarget = Math.sqrt(dx * dx + dy * dy);
                const moveTowardTarget = distToCurrentTarget - distToTarget;
                
                // 综合评分：朝向目标×20 - 风险×10 - 绝对距离×1
                const totalScore = moveTowardTarget * 20 - riskScore * 10 - distToTarget;
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestPos = pos;
                }
            }
            
            if (!bestPos) {
                this.log(`  └─ [调试] 第${i+1}步没有找到最优位置 (候选: ${validMoves.length})`, 'info');
                break;
            }
            
            // 检查是否与上一步位置相同（避免重复）
            if (i > 0 && bestPos.x === steps[i-1].x && bestPos.y === steps[i-1].y) {
                this.log(`  └─ [调试] 第${i+1}步与上一步位置相同，停止规划`, 'info');
                break; // 位置相同，停止规划
            }
            
            steps.push(bestPos);
            currentX = bestPos.x;
            currentY = bestPos.y;
        }
        
        return steps;
    }
    
    /**
     * 获取某一步的所有可移动格子（使用游戏原生逻辑）
     */
    getValidMovesForStep(unit, currentX, currentY, stepNumber, previousSteps = []) {
        const validMoves = [];
        const moveDistance = this.getUnitMoveDistance(unit);
        
        // 计算中心点
        const size = this.game.unitSizes[unit.type];
        const centerX = currentX + Math.floor(size.width / 2);
        const centerY = currentY + Math.floor(size.height / 2);
        
        // 【临时保存游戏状态】
        const savedSelectedUnit = this.game.selectedUnit;
        const savedMovePlan = this.game.movePlan;
        
        // 【临时设置游戏状态以便正确验证】
        this.game.selectedUnit = unit;
        this.game.movePlan = previousSteps.map((step, i) => ({
            startX: i === 0 ? unit.x : previousSteps[i-1].x,
            startY: i === 0 ? unit.y : previousSteps[i-1].y,
            endX: step.x,
            endY: step.y
        }));
        
        // 遍历移动范围内的所有格子
        for (let x = Math.max(0, centerX - moveDistance); x <= Math.min(this.game.gridWidth - 1, centerX + moveDistance); x++) {
            for (let y = Math.max(0, centerY - moveDistance); y <= Math.min(this.game.gridHeight - 1, centerY + moveDistance); y++) {
                const distance = this.getDistance(centerX, centerY, x, y);
                if (distance <= moveDistance) {
                    // 【使用游戏原生验证】
                    if (typeof this.game.checkMoveValidity === 'function') {
                        const validityCheck = this.game.checkMoveValidity(unit, x, y, stepNumber);
                        if (validityCheck.valid) {
                            validMoves.push({ x, y });
                        }
                    }
                }
            }
        }
        
        // 【恢复游戏状态】
        this.game.selectedUnit = savedSelectedUnit;
        this.game.movePlan = savedMovePlan;
        
        return validMoves;
    }
    
    /**
     * 生成步骤候选位置（严格控制距离）
     */
    generateStepCandidates(currentX, currentY, ndx, ndy, stepDist, unit) {
        const candidates = [];
        const unitSize = this.game.unitSizes[unit.type] || 1;
        
        // 保守计算：使用stepDist的85%作为安全距离（更保守）
        const safeDist = stepDist * 0.85;
        
        // 主要方向
        const mainX = Math.round(currentX + ndx * safeDist);
        const mainY = Math.round(currentY + ndy * safeDist);
        
        // 确保在地图范围内
        const baseX = Math.max(0, Math.min(this.game.gridWidth - 1, mainX));
        const baseY = Math.max(0, Math.min(this.game.gridHeight - 1, mainY));
        
        // 生成候选位置（更保守的偏移）
        const positions = [];
        
        // 添加主位置
        positions.push({ x: baseX, y: baseY });
        
        // 添加小偏移位置（只±1格）
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                positions.push({ x: baseX + dx, y: baseY + dy });
            }
        }
        
        // 严格验证每个位置
        for (const pos of positions) {
            if (!this.isValidPosition(pos.x, pos.y)) {
                continue;
            }
            
            // 【优先使用游戏原生验证】游戏的checkMoveValidity已包含所有检查：
            // - 距离验证
            // - 区域占用检查
            // - 已规划位置冲突检查
            // - 路径阻挡检查
            if (typeof this.game.checkMoveValidity === 'function') {
                const validityCheck = this.game.checkMoveValidity(unit, pos.x, pos.y, 0);
                if (!validityCheck.valid) {
                    continue; // 游戏认为该位置无效，跳过
                }
            } else {
                // 降级方案：如果游戏方法不可用，使用AI自己的检查
                if (this.isPositionOccupied(pos.x, pos.y, unit.id, unitSize)) {
                    continue;
                }
            }
            
            // 严格验证：使用中心点计算距离（与游戏一致）
            const unitSizeData = this.game.unitSizes[unit.type];
            const centerOffsetX = unitSizeData ? Math.floor(unitSizeData.width / 2) : 0;
            const centerOffsetY = unitSizeData ? Math.floor(unitSizeData.height / 2) : 0;
            
            const fromCenterX = currentX + centerOffsetX;
            const fromCenterY = currentY + centerOffsetY;
            
            const actualDist = this.getDistance(fromCenterX, fromCenterY, pos.x, pos.y);
            if (actualDist <= stepDist - 0.5) {  // 留0.5的安全余量
                candidates.push(pos);
            }
        }
        
        return candidates;
    }
    
    /**
     * 评估位置风险
     * 返回：风险分数（越高越危险）
     */
    evaluatePositionRisk(position, unit, enemyUnits) {
        let risk = 0;
        
        const myUnits = this.game.units.filter(u => u.faction === this.faction && u.hp > 0);
        
        // 1. 评估敌方威胁
        for (const enemy of enemyUnits) {
            const distToEnemy = this.getDistance(position.x, position.y, enemy.x, enemy.y);
            
            // 3格内是冲锋范围，非常危险
            if (distToEnemy <= 3) {
                const enemyPower = this.getUnitCombatPower(enemy);
                risk += enemyPower * 2 / (distToEnemy + 0.5); // 距离越近，风险越高
            }
            
            // 6-10格内是弓箭射程，中等危险
            if (distToEnemy >= 6 && distToEnemy <= 12) {
                if (enemy.type === 'archer') {
                    risk += 3;
                }
            }
        }
        
        // 2. 评估友军支援（支援越多，风险越低）
        let supportCount = 0;
        for (const ally of myUnits) {
            if (ally.id === unit.id) continue;
            
            const distToAlly = this.getDistance(position.x, position.y, ally.x, ally.y);
            if (distToAlly <= 3) {
                supportCount += this.getUnitSupportValue(ally);
            }
        }
        
        // 支援减少风险
        risk -= supportCount * 2;
        
        // 3. 孤立惩罚
        if (supportCount === 0) {
            risk += 15; // 完全孤立非常危险
        }
        
        return Math.max(0, risk);
    }
    
    /**
     * 寻找附近的空位置
     */
    findNearbyEmptyPosition(x, y, unitId, unitSize) {
        const offsets = [
            {dx: 0, dy: 0},
            {dx: 1, dy: 0}, {dx: -1, dy: 0},
            {dx: 0, dy: 1}, {dx: 0, dy: -1},
            {dx: 1, dy: 1}, {dx: -1, dy: -1},
            {dx: 1, dy: -1}, {dx: -1, dy: 1},
            {dx: 2, dy: 0}, {dx: -2, dy: 0},
            {dx: 0, dy: 2}, {dx: 0, dy: -2}
        ];
        
        for (const offset of offsets) {
            const testX = x + offset.dx;
            const testY = y + offset.dy;
            
            if (this.isValidPosition(testX, testY) && 
                !this.isPositionOccupied(testX, testY, unitId, unitSize)) {
                return { x: testX, y: testY };
            }
        }
        
        return null;
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
        // 优先使用单位对象中的移动力属性
        if (unit.movement !== undefined) {
            return unit.movement;
        }
        
        // 如果没有，使用默认值
        const moveDistances = {
            'general': 6,
            'cavalry': 8,
            'elephant': 6,
            'infantry': 6,
            'archer': 6,
            'hastati': 6,
            'principes': 6,
            'triarii': 6
        };
        return moveDistances[unit.type] || 6;
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
        
        // 等待游戏状态更新为select_target
        let waitCount = 0;
        while (this.game.meleeSubPhase !== 'select_target' && waitCount < 10) {
            await this.delay(100);
            waitCount++;
        }
        
        // 选择攻击者后，自动进入目标选择
        if (this.game.meleeSubPhase === 'select_target' && this.game.meleeAttacker) {
            this.log('└─ 继续选择攻击目标...', 'info');
            await this.delay(200);
            await this.selectMeleeTarget();
        } else {
            this.log(`└─ 状态未更新为select_target (当前: ${this.game.meleeSubPhase})`, 'error');
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
                
                // 骑兵优先攻击敌方骑兵（最高优先级）
                if (attacker.type === 'cavalry' && enemy.type === 'cavalry') {
                    priority += 300; // 骑兵 vs 骑兵最高优先级
                }
                
                // 优先攻击已受损单位
                const hpPercent = enemy.hp / (enemy.maxHp || enemy.hp);
                priority += (1 - hpPercent) * this.config.focusFire * 100;
                
                // 优先攻击高价值目标
                if (enemy.type === 'general') priority += 150;
                if (enemy.type === 'elephant') priority += 80;
                
                // 弓箭手（轻装兵）优先级较低，除非是骑兵攻击
                if (enemy.type === 'archer') {
                    if (attacker.type === 'cavalry') {
                        priority += 40; // 骑兵可以追击弓箭手
                    } else {
                        priority += 20; // 其他单位对弓箭手兴趣不大
                    }
                }
                
                // 步兵对步兵
                if (attacker.type === 'infantry' && enemy.type === 'infantry') {
                    priority += 50; // 步兵优先打步兵
                }
                
                // 优先攻击弱小目标
                if (enemy.defense && enemy.defense < 5) priority += 30;
                
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
     * 选择优先攻击目标
     * 优先级：将领 > 低HP单位 > 低战斗力单位 > 最近单位
     */
    selectPriorityTarget(unit, enemyUnits) {
        if (!enemyUnits || enemyUnits.length === 0) return null;
        
        let bestTarget = null;
        let bestScore = -Infinity;
        
        for (const enemy of enemyUnits) {
            let score = 0;
            
            // 将领优先级最高
            if (enemy.type === 'general') {
                score += 1000;
            }
            
            // HP越低，优先级越高
            const hpPercent = enemy.hp / (enemy.maxHp || enemy.hp);
            score += (1 - hpPercent) * 500;
            
            // 战斗力越弱，优先级越高
            const combatPower = this.getUnitCombatPower(enemy);
            score += (20 - combatPower) * 20;
            
            // 距离越近，优先级越高（但权重较低）
            const distance = this.getDistance(unit.x, unit.y, enemy.x, enemy.y);
            score += Math.max(0, 50 - distance * 2);
            
            if (score > bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        }
        
        return bestTarget;
    }
    
    /**
     * 获取单位战斗力
     */
    getUnitCombatPower(unit) {
        const basePower = {
            'general': 8,
            'cavalry': 15,
            'elephant': 18,
            'infantry': 12,
            'archer': 10
        };
        
        const power = basePower[unit.type] || 10;
        const hpPercent = unit.hp / (unit.maxHp || unit.hp);
        
        return power * hpPercent;
    }
    
    /**
     * 检查弓箭手是否阻挡了己方步兵前进
     */
    isBlockingAlliedInfantry(archerUnit, myUnits, enemyUnits) {
        // 找到己方步兵
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== archerUnit.id);
        
        // 找到最近的敌人
        const nearestEnemy = this.findNearestEnemy(archerUnit, enemyUnits);
        if (!nearestEnemy) return false;
        
        // 检查是否有步兵在弓箭手后方，且想向敌人前进
        for (const infantry of myInfantry) {
            const infantryToEnemy = this.getDistance(infantry.x, infantry.y, nearestEnemy.x, nearestEnemy.y);
            const archerToEnemy = this.getDistance(archerUnit.x, archerUnit.y, nearestEnemy.x, nearestEnemy.y);
            
            // 如果步兵距离敌人更远，且弓箭手在步兵和敌人之间
            if (infantryToEnemy > archerToEnemy) {
                const infantryToArcher = this.getDistance(infantry.x, infantry.y, archerUnit.x, archerUnit.y);
                // 如果步兵离弓箭手很近（可能想通过这个区域）
                if (infantryToArcher < 5) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 寻找侧翼位置（为弓箭手）
     */
    findFlankPosition(archerUnit, target, myUnits, minDist, maxDist) {
        const optimalDist = (minDist + maxDist) / 2;
        
        // 计算目标的左右两侧位置
        const angles = [90, -90, 60, -60, 120, -120]; // 度数，相对于目标
        
        for (const angle of angles) {
            const rad = angle * Math.PI / 180;
            const dx = Math.cos(rad) * optimalDist;
            const dy = Math.sin(rad) * optimalDist;
            
            const targetX = Math.round(target.x + dx);
            const targetY = Math.round(target.y + dy);
            
            // 检查位置是否合法且未被占用
            if (this.isValidPosition(targetX, targetY) && 
                !this.isPositionOccupied(targetX, targetY, archerUnit.id, 1)) {
                return { x: targetX, y: targetY };
            }
        }
        
        // 如果找不到完美侧翼位置，尝试简单后退
        return this.calculateRetreatPosition(archerUnit, target, optimalDist);
    }
    
    /**
     * 寻找最佳支援位置（综合考虑距离和支援价值）
     */
    findBestSupportPosition(unit, target, myUnits, minDist, maxDist, moveType = 'approach') {
        const candidates = [];
        const avgDist = (minDist + maxDist) / 2;
        
        if (moveType === 'flank') {
            // 侧翼移动：尝试多个角度
            const angles = [90, -90, 60, -60, 120, -120, 45, -45];
            for (const angle of angles) {
                const rad = angle * Math.PI / 180;
                const dx = Math.cos(rad) * avgDist;
                const dy = Math.sin(rad) * avgDist;
                
                const x = Math.round(target.x + dx);
                const y = Math.round(target.y + dy);
                
                if (this.isValidPosition(x, y) && !this.isPositionOccupied(x, y, unit.id, 1)) {
                    candidates.push({ x, y });
                }
            }
        } else {
            // 接近移动：在目标方向上寻找多个可选位置
            const dx = target.x - unit.x;
            const dy = target.y - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const ndx = dx / dist;
                const ndy = dy / dist;
                
                // 尝试不同距离的位置
                for (let d = minDist; d <= maxDist; d += 1) {
                    const x = Math.round(unit.x + ndx * (dist - d));
                    const y = Math.round(unit.y + ndy * (dist - d));
                    
                    if (this.isValidPosition(x, y) && !this.isPositionOccupied(x, y, unit.id, 1)) {
                        candidates.push({ x, y });
                    }
                    
                    // 也尝试左右偏移
                    for (const offset of [{dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}]) {
                        const ox = x + offset.dx;
                        const oy = y + offset.dy;
                        if (this.isValidPosition(ox, oy) && !this.isPositionOccupied(ox, oy, unit.id, 1)) {
                            candidates.push({ x: ox, y: oy });
                        }
                    }
                }
            }
        }
        
        if (candidates.length === 0) {
            // 如果没有候选位置，使用原方法
            return moveType === 'flank' ? 
                this.findFlankPosition(unit, target, myUnits, minDist, maxDist) :
                this.calculateApproachPosition(unit, target, avgDist);
        }
        
        // 评估每个候选位置的支援价值
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            const distToTarget = this.getDistance(pos.x, pos.y, target.x, target.y);
            const distPenalty = Math.abs(distToTarget - avgDist) * 2;
            
            const totalScore = supportScore - distPenalty;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos || candidates[0];
    }
    
    /**
     * 寻找最佳侧翼攻击位置（考虑支援）
     */
    findBestFlankingPosition(cavalryUnit, target, myUnits) {
        const targetDirection = target.direction || 'east';
        let preferredAngles = [];
        
        // 根据目标朝向确定最佳攻击角度
        switch (targetDirection) {
            case 'north':
                preferredAngles = [180, 135, -135, 90, -90]; 
                break;
            case 'south':
                preferredAngles = [0, 45, -45, 90, -90]; 
                break;
            case 'east':
                preferredAngles = [270, 225, -225, 180, 0]; 
                break;
            case 'west':
                preferredAngles = [90, 45, 135, 0, 180]; 
                break;
        }
        
        const candidates = [];
        const distance = 3; // 骑兵冲锋距离
        
        for (const angle of preferredAngles) {
            const rad = angle * Math.PI / 180;
            const x = Math.round(target.x + Math.cos(rad) * distance);
            const y = Math.round(target.y + Math.sin(rad) * distance);
            
            if (this.isValidPosition(x, y) && !this.isPositionOccupied(x, y, cavalryUnit.id, 1)) {
                candidates.push({ x, y });
            }
        }
        
        if (candidates.length === 0) {
            return this.calculateApproachPosition(cavalryUnit, target, 2);
        }
        
        // 选择支援价值最高的位置
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            const supportScore = this.evaluateSupportValue(pos, cavalryUnit, myUnits);
            
            if (supportScore > bestScore) {
                bestScore = supportScore;
                bestPos = pos;
            }
        }
        
        return bestPos || candidates[0];
    }
    
    /**
     * 评估某个位置的支援价值
     * 返回：能接受的支援数量 + 能提供的支援数量
     */
    evaluateSupportValue(position, unit, myUnits) {
        let supportReceived = 0;  // 能接受的支援
        let supportProvided = 0;  // 能提供的支援
        
        const supportRange = 3; // 支援范围3格
        
        for (const ally of myUnits) {
            if (ally.id === unit.id) continue;
            
            const distToAlly = this.getDistance(position.x, position.y, ally.x, ally.y);
            
            if (distToAlly <= supportRange) {
                // 这个位置能接受该友军的支援
                supportReceived += this.getUnitSupportValue(ally);
                
                // 这个位置能给该友军提供支援
                // 根据单位类型计算优先级加成
                const priorityBonus = this.getSupportPriorityBonus(unit, ally);
                supportProvided += this.getUnitSupportValue(unit) * priorityBonus;
            }
        }
        
        // 综合评分：接受支援 × 2 + 提供支援 × 1
        // 接受支援更重要，因为保护自己优先
        return supportReceived * 2 + supportProvided;
    }
    
    /**
     * 获取支援优先级加成
     * 根据支援方和被支援方的类型返回加成倍数
     */
    getSupportPriorityBonus(supporter, supported) {
        // 骑兵支援优先级：骑兵 > 步兵 > 弓箭手
        if (supporter.type === 'cavalry') {
            if (supported.type === 'cavalry') return 3.0;      // 优先支援骑兵
            if (supported.type === 'infantry') return 2.0;     // 其次支援步兵
            if (supported.type === 'archer') return 1.0;       // 最后支援弓箭手
            if (supported.type === 'general') return 2.5;      // 将领优先级较高
            if (supported.type === 'elephant') return 2.0;     // 战象与步兵同级
        }
        
        // 步兵支援优先级：步兵 > 将领 > 骑兵 > 弓箭手
        if (supporter.type === 'infantry') {
            if (supported.type === 'infantry') return 2.5;     // 优先支援步兵
            if (supported.type === 'general') return 2.5;      // 保护将领
            if (supported.type === 'cavalry') return 1.5;      // 支援骑兵
            if (supported.type === 'archer') return 2.0;       // 保护弓箭手
            if (supported.type === 'elephant') return 2.0;     // 支援战象
        }
        
        // 弓箭手支援优先级：步兵 > 弓箭手 > 骑兵
        if (supporter.type === 'archer') {
            if (supported.type === 'infantry') return 2.0;     // 火力支援步兵
            if (supported.type === 'archer') return 1.5;       // 互相支援
            if (supported.type === 'cavalry') return 1.0;      // 支援骑兵较少
            if (supported.type === 'general') return 2.5;      // 保护将领
        }
        
        // 将领支援优先级：所有单位均衡
        if (supporter.type === 'general') {
            return 2.0;  // 将领的士气加成对所有单位都重要
        }
        
        // 默认
        return 1.5;
    }
    
    /**
     * 获取单位的支援价值
     */
    getUnitSupportValue(unit) {
        // 不同类型单位的支援价值不同
        const baseValue = {
            'general': 3,    // 将领提供士气加成
            'cavalry': 2,    // 骑兵机动支援
            'infantry': 3,   // 步兵稳定防线
            'archer': 1,     // 弓箭手远程支援
            'elephant': 2    // 战象冲击力
        };
        
        const value = baseValue[unit.type] || 1;
        const hpPercent = unit.hp / (unit.maxHp || unit.hp);
        
        // HP越高，支援价值越大
        return value * hpPercent;
    }
    
    /**
     * 寻找步兵阵型位置（紧密排成一排）
     */
    findInfantryFormationPositionWithSupport(unit, myUnits, enemyUnits) {
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== unit.id);
        
        if (myInfantry.length === 0) {
            return null;
        }
        
        // 找到最近的友军步兵
        let nearestAlly = null;
        let minDist = Infinity;
        
        for (const ally of myInfantry) {
            const dist = this.getDistance(unit.x, unit.y, ally.x, ally.y);
            if (dist < minDist) {
                minDist = dist;
                nearestAlly = ally;
            }
        }
        
        if (!nearestAlly) return null;
        
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        // 检测现有步兵的排列方向
        const lineDirection = this.detectInfantryLineDirection(myInfantry, enemyCenter);
        
        // 根据排列方向生成候选位置
        const positions = this.generateLineFormationPositions(nearestAlly, lineDirection, myInfantry);
        
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of positions) {
            if (!this.isValidPosition(pos.x, pos.y) || 
                this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                continue;
            }
            
            // 计算支援价值
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            
            // 计算排列整齐度（是否在一条线上）
            const alignmentScore = this.calculateLineAlignment(pos, myInfantry, lineDirection);
            
            // 计算距离敌人
            const distToEnemy = this.getDistance(pos.x, pos.y, enemyCenter.x, enemyCenter.y);
            
            // 评估风险
            const enemyUnits = this.game.units.filter(u => u.faction !== this.faction && u.hp > 0);
            const riskScore = this.evaluatePositionRisk(pos, unit, enemyUnits);
            
            // 综合评分：排列整齐 × 20 + 支援价值 × 10 - 风险 × 5 - 距离敌人 × 0.3
            const totalScore = alignmentScore * 20 + supportScore * 10 - riskScore * 5 - distToEnemy * 0.3;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos;
    }
    
    /**
     * 检测步兵队列的排列方向
     */
    detectInfantryLineDirection(infantryUnits, enemyCenter) {
        if (infantryUnits.length === 0) return 'horizontal';
        
        // 计算步兵的平均位置
        const avgX = infantryUnits.reduce((sum, u) => sum + u.x, 0) / infantryUnits.length;
        const avgY = infantryUnits.reduce((sum, u) => sum + u.y, 0) / infantryUnits.length;
        
        // 计算到敌人的方向
        const dxToEnemy = enemyCenter.x - avgX;
        const dyToEnemy = enemyCenter.y - avgY;
        
        // 如果敌人主要在东西方向，步兵应该纵向排列
        // 如果敌人主要在南北方向，步兵应该横向排列
        if (Math.abs(dxToEnemy) > Math.abs(dyToEnemy)) {
            return 'vertical';   // 纵向排列（面对东西方向的敌人）
        } else {
            return 'horizontal'; // 横向排列（面对南北方向的敌人）
        }
    }
    
    /**
     * 生成直线阵型候选位置
     */
    generateLineFormationPositions(anchorUnit, direction, allInfantry) {
        const positions = [];
        
        if (direction === 'horizontal') {
            // 横向排列：y坐标相同，x坐标递增
            // 在锚点单位左右寻找位置
            for (let offsetX = -6; offsetX <= 6; offsetX++) {
                if (offsetX === 0) continue;
                positions.push({ 
                    x: anchorUnit.x + offsetX * 2, 
                    y: anchorUnit.y,
                    priority: Math.abs(offsetX) <= 3 ? 2 : 1  // 近距离优先
                });
                // 也尝试后方一排
                positions.push({ 
                    x: anchorUnit.x + offsetX * 2, 
                    y: anchorUnit.y + 2,
                    priority: 1
                });
            }
        } else {
            // 纵向排列：x坐标相同，y坐标递增
            // 在锚点单位上下寻找位置
            for (let offsetY = -6; offsetY <= 6; offsetY++) {
                if (offsetY === 0) continue;
                positions.push({ 
                    x: anchorUnit.x, 
                    y: anchorUnit.y + offsetY * 2,
                    priority: Math.abs(offsetY) <= 3 ? 2 : 1
                });
                // 也尝试旁边一列
                positions.push({ 
                    x: anchorUnit.x + 2, 
                    y: anchorUnit.y + offsetY * 2,
                    priority: 1
                });
            }
        }
        
        // 按优先级排序
        positions.sort((a, b) => b.priority - a.priority);
        
        return positions;
    }
    
    /**
     * 计算位置的排列整齐度
     */
    calculateLineAlignment(position, infantryUnits, direction) {
        let alignmentScore = 0;
        
        for (const infantry of infantryUnits) {
            if (direction === 'horizontal') {
                // 横向排列：y坐标越接近，分数越高
                const yDiff = Math.abs(position.y - infantry.y);
                if (yDiff === 0) {
                    alignmentScore += 10; // 完美对齐
                } else if (yDiff <= 2) {
                    alignmentScore += 5;  // 接近对齐
                }
                
                // x坐标距离适中最好（2-4格）
                const xDiff = Math.abs(position.x - infantry.x);
                if (xDiff >= 2 && xDiff <= 4) {
                    alignmentScore += 3;
                }
            } else {
                // 纵向排列：x坐标越接近，分数越高
                const xDiff = Math.abs(position.x - infantry.x);
                if (xDiff === 0) {
                    alignmentScore += 10; // 完美对齐
                } else if (xDiff <= 2) {
                    alignmentScore += 5;  // 接近对齐
                }
                
                // y坐标距离适中最好（2-4格）
                const yDiff = Math.abs(position.y - infantry.y);
                if (yDiff >= 2 && yDiff <= 4) {
                    alignmentScore += 3;
                }
            }
        }
        
        return alignmentScore;
    }
    
    /**
     * 寻找防守位置（考虑支援）
     */
    findDefensivePositionWithSupport(unit, myUnits, enemyUnits) {
        const myCenter = this.calculateCenterOfMass(myUnits);
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        const dx = myCenter.x - enemyCenter.x;
        const dy = myCenter.y - enemyCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) return null;
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        // 在己方重心前方生成多个候选位置
        const candidates = [];
        for (let d = 2; d <= 5; d++) {
            const baseX = Math.round(myCenter.x - ndx * d);
            const baseY = Math.round(myCenter.y - ndy * d);
            
            candidates.push({ x: baseX, y: baseY });
            candidates.push({ x: baseX + 1, y: baseY });
            candidates.push({ x: baseX - 1, y: baseY });
            candidates.push({ x: baseX, y: baseY + 1 });
            candidates.push({ x: baseX, y: baseY - 1 });
        }
        
        let bestPos = null;
        let bestScore = -Infinity;
        
        for (const pos of candidates) {
            if (!this.isValidPosition(pos.x, pos.y) || 
                this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                continue;
            }
            
            const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
            const distToCenter = this.getDistance(pos.x, pos.y, myCenter.x, myCenter.y);
            
            // 评分：支援价值 × 5 - 距离重心 × 1
            const totalScore = supportScore * 5 - distToCenter;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPos = pos;
            }
        }
        
        return bestPos || { 
            x: Math.max(0, Math.min(this.game.gridWidth - 1, Math.round(myCenter.x - ndx * 3))),
            y: Math.max(0, Math.min(this.game.gridHeight - 1, Math.round(myCenter.y - ndy * 3)))
        };
    }
    
    /**
     * 计算接近目标的位置
     */
    calculateApproachPosition(unit, target, desiredDistance) {
        const currentDist = this.getDistance(unit.x, unit.y, target.x, target.y);
        
        // 如果已经在期望距离，返回null
        if (Math.abs(currentDist - desiredDistance) < 1) {
            return null;
        }
        
        // 计算方向向量
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) return null;
        
        // 归一化
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        // 计算目标位置
        const targetX = Math.round(unit.x + ndx * (currentDist - desiredDistance));
        const targetY = Math.round(unit.y + ndy * (currentDist - desiredDistance));
        
        // 确保在地图范围内
        const finalX = Math.max(0, Math.min(this.game.gridWidth - 1, targetX));
        const finalY = Math.max(0, Math.min(this.game.gridHeight - 1, targetY));
        
        return { x: finalX, y: finalY };
    }
    
    /**
     * 计算后退位置
     */
    calculateRetreatPosition(unit, threat, desiredDistance) {
        // 与接近位置相反，向后退
        const dx = unit.x - threat.x;
        const dy = unit.y - threat.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) {
            // 如果完全重叠，随机选择一个方向
            const angle = Math.random() * Math.PI * 2;
            return {
                x: Math.round(unit.x + Math.cos(angle) * desiredDistance),
                y: Math.round(unit.y + Math.sin(angle) * desiredDistance)
            };
        }
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        const targetX = Math.round(unit.x + ndx * (desiredDistance - dist));
        const targetY = Math.round(unit.y + ndy * (desiredDistance - dist));
        
        const finalX = Math.max(0, Math.min(this.game.gridWidth - 1, targetX));
        const finalY = Math.max(0, Math.min(this.game.gridHeight - 1, targetY));
        
        return { x: finalX, y: finalY };
    }
    
    /**
     * 寻找敌人薄弱点
     */
    findEnemyWeakPoint(enemyUnits, myUnits) {
        // 计算敌军重心
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        // 寻找远离敌军重心的敌方单位（后备或侧翼）
        let weakest = null;
        let maxDist = -Infinity;
        
        for (const enemy of enemyUnits) {
            const distToCenter = this.getDistance(enemy.x, enemy.y, enemyCenter.x, enemyCenter.y);
            
            // 综合考虑：距离重心远 + 战斗力弱
            const score = distToCenter * 2 - this.getUnitCombatPower(enemy);
            
            if (score > maxDist) {
                maxDist = score;
                weakest = enemy;
            }
        }
        
        return weakest;
    }
    
    /**
     * 计算单位重心
     */
    calculateCenterOfMass(units) {
        if (!units || units.length === 0) return { x: 0, y: 0 };
        
        let sumX = 0, sumY = 0;
        for (const unit of units) {
            sumX += unit.x;
            sumY += unit.y;
        }
        
        return {
            x: sumX / units.length,
            y: sumY / units.length
        };
    }
    
    /**
     * 检查是否可以侧翼攻击目标
     */
    canFlankTarget(cavalryUnit, target, myUnits) {
        // 骑兵移动力较高，基本都可以尝试侧翼
        const distance = this.getDistance(cavalryUnit.x, cavalryUnit.y, target.x, target.y);
        
        // 如果距离在合理范围内（不太远）
        return distance < 20;
    }
    
    /**
     * 计算侧翼攻击位置
     */
    calculateFlankingPosition(cavalryUnit, target) {
        // 尝试绕到目标的侧面或背后
        // 根据目标朝向，选择其侧翼或背后位置
        
        const targetDirection = target.direction || 'east';
        let preferredAngles = [];
        
        // 根据目标朝向确定最佳攻击角度
        switch (targetDirection) {
            case 'north':
                preferredAngles = [180, 135, -135]; // 南、东南、西南
                break;
            case 'south':
                preferredAngles = [0, 45, -45]; // 北、东北、西北
                break;
            case 'east':
                preferredAngles = [270, 225, -225]; // 西、西南、西北
                break;
            case 'west':
                preferredAngles = [90, 45, 135]; // 东、东北、东南
                break;
        }
        
        // 尝试这些角度的位置
        const distance = 3; // 骑兵冲锋距离
        
        for (const angle of preferredAngles) {
            const rad = angle * Math.PI / 180;
            const targetX = Math.round(target.x + Math.cos(rad) * distance);
            const targetY = Math.round(target.y + Math.sin(rad) * distance);
            
            if (this.isValidPosition(targetX, targetY) && 
                !this.isPositionOccupied(targetX, targetY, cavalryUnit.id, 1)) {
                return { x: targetX, y: targetY };
            }
        }
        
        // 如果侧翼位置都被占，直接接近
        return this.calculateApproachPosition(cavalryUnit, target, 2);
    }
    
    /**
     * 评估激进程度
     */
    evaluateAggressionLevel(myUnits, enemyUnits) {
        // 计算双方总战斗力
        let myPower = 0;
        let enemyPower = 0;
        
        for (const unit of myUnits) {
            myPower += this.getUnitCombatPower(unit);
        }
        
        for (const unit of enemyUnits) {
            enemyPower += this.getUnitCombatPower(unit);
        }
        
        // 计算战力比
        const powerRatio = enemyPower > 0 ? myPower / enemyPower : 2;
        
        // 战力比越高，越激进
        // 0.5 = 防守, 1.0 = 平衡, 1.5+ = 激进
        return Math.min(1, Math.max(0, (powerRatio - 0.5) / 1.5));
    }
    
    /**
     * 寻找步兵阵型位置
     */
    findInfantryFormationPosition(unit, myUnits, enemyUnits) {
        // 找到己方其他步兵
        const myInfantry = myUnits.filter(u => u.type === 'infantry' && u.id !== unit.id);
        
        if (myInfantry.length === 0) {
            // 没有其他步兵，直接向敌人前进
            return null;
        }
        
        // 找到最近的友军步兵
        let nearestAlly = null;
        let minDist = Infinity;
        
        for (const ally of myInfantry) {
            const dist = this.getDistance(unit.x, unit.y, ally.x, ally.y);
            if (dist < minDist) {
                minDist = dist;
                nearestAlly = ally;
            }
        }
        
        if (!nearestAlly) return null;
        
        // 尝试在友军旁边或后方形成阵型
        const positions = [
            { x: nearestAlly.x + 2, y: nearestAlly.y },     // 右侧
            { x: nearestAlly.x - 2, y: nearestAlly.y },     // 左侧
            { x: nearestAlly.x, y: nearestAlly.y + 2 },     // 后方
            { x: nearestAlly.x + 1, y: nearestAlly.y + 1 }, // 斜后方
            { x: nearestAlly.x - 1, y: nearestAlly.y + 1 }  // 斜后方
        ];
        
        // 选择最接近敌人且未被占用的位置
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        let bestPos = null;
        let bestScore = Infinity;
        
        for (const pos of positions) {
            if (this.isValidPosition(pos.x, pos.y) && 
                !this.isPositionOccupied(pos.x, pos.y, unit.id, 1)) {
                
                // 评分：既要靠近友军，也要面向敌人
                const distToAlly = this.getDistance(pos.x, pos.y, nearestAlly.x, nearestAlly.y);
                const distToEnemy = this.getDistance(pos.x, pos.y, enemyCenter.x, enemyCenter.y);
                const score = distToAlly * 2 + distToEnemy * 0.5;
                
                if (score < bestScore) {
                    bestScore = score;
                    bestPos = pos;
                }
            }
        }
        
        return bestPos;
    }
    
    /**
     * 寻找防守位置
     */
    findDefensivePosition(unit, myUnits, enemyUnits) {
        // 寻找己方重心位置
        const myCenter = this.calculateCenterOfMass(myUnits);
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        // 在己方重心和敌方重心之间，靠近己方的位置
        const dx = myCenter.x - enemyCenter.x;
        const dy = myCenter.y - enemyCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) return null;
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        // 在己方重心前方2-3格
        const targetX = Math.round(myCenter.x - ndx * 3);
        const targetY = Math.round(myCenter.y - ndy * 3);
        
        const finalX = Math.max(0, Math.min(this.game.gridWidth - 1, targetX));
        const finalY = Math.max(0, Math.min(this.game.gridHeight - 1, targetY));
        
        return { x: finalX, y: finalY };
    }
    
    /**
     * 计算前线位置
     */
    calculateFrontLine(myUnits, enemyUnits) {
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        // 找到最接近敌人的己方单位
        let closestDist = Infinity;
        let frontUnit = null;
        
        for (const unit of myUnits) {
            const dist = this.getDistance(unit.x, unit.y, enemyCenter.x, enemyCenter.y);
            if (dist < closestDist) {
                closestDist = dist;
                frontUnit = unit;
            }
        }
        
        return frontUnit ? { x: frontUnit.x, y: frontUnit.y } : this.calculateCenterOfMass(myUnits);
    }
    
    /**
     * 计算后方位置
     */
    calculateRearPosition(generalUnit, frontLine, targetDist) {
        // 计算敌军方向
        const enemyUnits = this.game.units.filter(u => u.faction !== this.faction && u.hp > 0);
        const enemyCenter = this.calculateCenterOfMass(enemyUnits);
        
        // 从前线向后退targetDist距离
        const dx = frontLine.x - enemyCenter.x;
        const dy = frontLine.y - enemyCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) {
            // 如果无法确定方向，保持当前位置
            return null;
        }
        
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        const targetX = Math.round(frontLine.x + ndx * targetDist);
        const targetY = Math.round(frontLine.y + ndy * targetDist);
        
        const finalX = Math.max(0, Math.min(this.game.gridWidth - 1, targetX));
        const finalY = Math.max(0, Math.min(this.game.gridHeight - 1, targetY));
        
        return { x: finalX, y: finalY };
    }
    
    /**
     * 检查位置是否有效
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.game.gridWidth && y >= 0 && y < this.game.gridHeight;
    }
    
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


