# AI移动规划冲突修复说明

## 问题描述

AI在移动阶段规划多个单位的移动时，出现"目标位置被其他单位占用"的错误，导致移动规划失败。

### 错误日志示例
```
❌ └─ [超时] 等待15次循环(1500ms)后仍未更新
❌ └─ [最终状态] moveState=unit_selected, planLength=0
❌ └─ ❌ 第1步添加失败
❌ 位置: (47, 35)
❌ 起点: (48, 39)
❌ 距离: 4.12格 (移动力:6)
❌ 状态: unit_selected
❌ movePlan长度: 0
⚠️ 无法移动到该位置: 目标位置被其他单位占用
```

## 根本原因

AI在为多个单位依次规划移动时：

1. **第一个单位**规划移动到位置A，规划保存到 `game.allUnitPlans`
2. **第二个单位**开始规划时，AI的位置检查逻辑只检查了**当前已部署单位的实际位置**
3. 由于第一个单位还在原位（移动还未执行），位置A看起来是空的
4. **第二个单位**也选择移动到位置A
5. 当点击位置A时，游戏的 `checkPlannedOccupationConflict()` 检测到冲突
6. 游戏返回错误："目标位置与已规划的移动冲突"或"目标位置被其他单位占用"

**关键问题**：AI没有考虑其他单位**已规划但还未执行**的移动目标位置。

## 解决方案

修改AI的位置检查逻辑，使其同时考虑：
- ✅ 当前已部署单位的**实际位置**
- ✅ 已规划单位的**目标位置**（从 `game.allUnitPlans` 中获取）

### 修改的函数

#### 1. `isPositionOccupied(x, y, excludeUnitId, size)`

**原始逻辑**：
```javascript
// 只检查当前已部署单位的位置
if (typeof this.game.isAreaOccupiedByOthers === 'function') {
    return this.game.isAreaOccupiedByOthers(x, y, size, 1, excludeUnitId);
}
```

**修复后**：
```javascript
// 1. 检查当前已部署单位的位置
if (typeof this.game.isAreaOccupiedByOthers === 'function') {
    if (this.game.isAreaOccupiedByOthers(x, y, size, 1, excludeUnitId)) {
        return true;
    }
}

// 2. 检查已规划但未执行的移动目标位置
if (this.game.allUnitPlans && this.game.allUnitPlans.size > 0) {
    for (const [unitId, planData] of this.game.allUnitPlans) {
        if (unitId === excludeUnitId) continue;
        
        const { unit, plan } = planData;
        if (!plan || plan.length === 0) continue;
        
        // 获取该单位的目标位置（移动计划的最后一步）
        const lastStep = plan[plan.length - 1];
        const targetX = lastStep.endX;
        const targetY = lastStep.endY;
        
        // 检查是否与目标位置重叠
        if (this.isAreaOverlap(x, y, size, 1, targetX, targetY, unitSize.width, unitSize.height)) {
            return true;
        }
    }
}

return false;
```

**新增辅助函数**：
```javascript
isAreaOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
}
```

#### 2. `generateStepCandidates()` 中使用游戏原生验证

在生成移动候选位置时，优先使用游戏的 `checkMoveValidity()` 函数：

**修复前**：
```javascript
// 严格验证每个位置
for (const pos of positions) {
    if (!this.isValidPosition(pos.x, pos.y)) {
        continue;
    }
    
    // 只检查当前实际位置是否被占用
    if (this.isPositionOccupied(pos.x, pos.y, unit.id, unitSize)) {
        continue;
    }
    
    // 距离验证...
    candidates.push(pos);
}
```

**修复后（使用游戏原生验证）**：
```javascript
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
    
    // 距离验证...
    candidates.push(pos);
}
```

**优势**：
- ✅ 使用游戏的权威验证方法
- ✅ 自动利用游戏已实现的所有检查逻辑
- ✅ 避免AI和游戏之间的判断不一致
- ✅ 减少重复检查，避免过度过滤

## 修复策略

采用**双层验证机制**：

### 1. 游戏原生验证（主要）
优先使用游戏的 `checkMoveValidity()` 函数，它包含了所有权威检查：
- ✅ 距离验证
- ✅ 区域占用检查  
- ✅ **已规划位置冲突检查**（关键！）
- ✅ 路径阻挡检查

### 2. AI增强验证（辅助）
`isPositionOccupied()` 函数增强检查：
- ✅ 检查当前已部署单位的实际位置
- ✅ **检查其他单位已规划但未执行的目标位置**
- ✅ 作为降级方案，当游戏方法不可用时使用

## 修复效果

修复后，AI在规划移动时：

1. ✅ **避免冲突**：不会选择其他单位已规划的目标位置
2. ✅ **提高成功率**：消除"目标位置被其他单位占用"错误
3. ✅ **更智能的路径规划**：考虑移动后的战场布局，而不仅仅是当前布局
4. ✅ **与游戏一致**：使用游戏原生验证方法，确保AI判断与游戏完全一致
5. ✅ **更多可用路径**：优化后减少了重复检查，避免过度过滤候选位置

## 测试建议

1. 启动游戏，让罗马AI进入移动阶段
2. 观察AI为多个单位规划移动时的日志
3. 确认没有出现"目标位置被其他单位占用"或"movePlan长度为0"的错误
4. 验证所有单位都能成功规划移动路径

## 文件修改

- **文件**：`battlegame/js/battle-ai-controller-rome.js`
- **修改日期**：2025-10-16
- **修改行数**：约70行（2个函数，1个新增函数）

## 技术要点

### 区域重叠检测
使用标准的矩形碰撞检测算法：
```javascript
// 两个矩形不重叠的条件：
// 1. A在B的左边：x1 + w1 <= x2
// 2. B在A的左边：x2 + w2 <= x1
// 3. A在B的上边：y1 + h1 <= y2
// 4. B在A的上边：y2 + h2 <= y1
// 重叠 = !(不重叠)
```

### 数据结构
- `game.allUnitPlans`：Map<unitId, {unit, plan}>
- `plan`：Array<{startX, startY, endX, endY}>
- 使用 `plan[plan.length - 1]` 获取最终目标位置

## 相关文件
- `battlegame/js/game-core.js`：游戏核心的位置验证逻辑
- `AI移动规划机制总结.md`：AI移动规划的整体机制说明

