# 🤖 AI规划移动机制总结

## 📋 **概述**

AI的移动规划机制是一个智能决策系统，负责在移动阶段为所有己方单位规划最优移动路径，确保军队高效推进、保持阵型并避免碰撞。

---

## 🎯 **一、移动规划触发条件**

### **1.1 单位筛选**
```javascript
// 获取所有己方可移动单位
const myUnits = this.game.units.filter(unit => 
    unit.faction === this.faction &&  // 己方阵营
    unit.hp > 0                        // 存活单位
);

// 排除已接敌单位
if (unit.engagedWith) {
    return; // 已经与敌人接敌的单位不移动
}
```

### **1.2 敌情检测**
- **查找最近敌人**：扫描所有敌方单位，计算距离
- **无敌情况**：如果没有敌人，单位不移动
- **过近情况**：如果距离敌人 < 3格，单位不移动（已到达战斗位置）

---

## 📐 **二、移动目标计算**

### **2.1 最近敌人查找算法**
```javascript
findNearestEnemy(unit, enemyUnits) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const enemy of enemyUnits) {
        const distance = Math.sqrt((x2-x1)² + (y2-y1)²);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = enemy;
        }
    }
    return nearest;
}
```

### **2.2 移动方向计算**
```javascript
calculateMoveDirection(unit, target) {
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const distance = Math.sqrt(dx² + dy²);
    
    // 标准化方向向量
    return {
        dx: Math.round(dx / distance),  // -1, 0, 或 1
        dy: Math.round(dy / distance)   // -1, 0, 或 1
    };
}
```

### **2.3 单位移动距离表**
| 单位类型 | 移动距离 | 说明 |
|---------|---------|------|
| 将领 (general) | 3格 | 高级指挥官 |
| 骑兵 (cavalry) | 5格 | 快速机动兵种 |
| 战象 (elephant) | 3格 | 重型冲击单位 |
| 步兵 (infantry) | 2格 | 标准步兵 |
| 弓箭手 (archer) | 2格 | 远程兵种 |

---

## 🚀 **三、目标位置计算**

### **3.1 基础位置计算**
```javascript
// 计算目标位置（全速移动）
let targetX = Math.round(unit.x + moveDirection.dx * maxMoveDistance);
let targetY = Math.round(unit.y + moveDirection.dy * maxMoveDistance);

// 边界限制（防止越界）
targetX = Math.max(0, Math.min(gridWidth - 1, targetX));
targetY = Math.max(0, Math.min(gridHeight - 1, targetY));
```

### **3.2 碰撞检测**
```javascript
// 检查目标位置是否被占用
if (this.isPositionOccupied(targetX, targetY, unit.id, unitSize)) {
    // 目标位置被占用
}
```

### **3.3 自动避碰算法（8方向搜索）**
```javascript
const offsets = [
    [0, 0],    // 原位置
    [2, 0],    // 右
    [-2, 0],   // 左
    [0, 2],    // 下
    [0, -2],   // 上
    [2, 2],    // 右下
    [-2, -2]   // 左上
];

for (const [dx, dy] of offsets) {
    const testX = targetX + dx;
    const testY = targetY + dy;
    if (!this.isPositionOccupied(testX, testY, unit.id, unitSize)) {
        targetX = testX;
        targetY = testY;
        break; // 找到可用位置
    }
}
```

---

## 🎮 **四、移动执行机制**

### **4.1 交互式规划（UI模拟）**
```javascript
// 步骤1：点击单位选择
unitElement.click();
await this.delay(200);

// 步骤2：点击目标位置创建移动步骤
hexElement.click();
await this.delay(500);

// 步骤3：验证移动计划创建
if (this.game.movePlan && this.game.movePlan.length > 0) {
    // 移动计划已成功创建
}
```

### **4.2 批量执行流程**
```
1. 为每个单位规划移动 → 创建 allUnitPlans Map
2. 调用 finishAllPlanning() → 标记规划完成
3. 调用 executeAllPlans() → 批量执行所有单位移动
4. 等待动画完成 → 自动进入下一阶段
```

### **4.3 执行超时保护**
```javascript
// 30秒超时保护（防止页面卡死）
const executePromise = this.game.executeAllPlans();
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('移动执行超时（30秒）')), 30000);
});

await Promise.race([executePromise, timeoutPromise]);
```

---

## 🔄 **五、移动计划验证**

### **5.1 计划有效性检查**
```javascript
// 检查总计划数
const planCount = this.game.allUnitPlans.size;

// 检查有效计划数（有实际移动步骤）
let validPlanCount = 0;
for (const [unitId, planData] of this.game.allUnitPlans.entries()) {
    if (planData.plan && planData.plan.length > 0) {
        validPlanCount++;
    }
}

// 如果没有有效计划，跳过执行
if (validPlanCount === 0) {
    this.nextPhase(); // 进入下一阶段
}
```

### **5.2 移动距离验证**
```javascript
// 计算实际移动距离
const moveDist = this.getDistance(unit.x, unit.y, targetX, targetY);

// 如果移动距离太小，跳过
if (moveDist < 1) {
    return; // 无需移动
}
```

---

## 🎯 **六、移动策略特点**

### **6.1 智能避碰**
- ✅ 预先检测目标位置碰撞
- ✅ 8方向螺旋搜索可用位置
- ✅ 优先选择最近的可用位置
- ✅ 考虑单位尺寸（3×2 六角形）

### **6.2 阵型保持**
- ✅ 考虑单位类型差异（骑兵快，步兵慢）
- ✅ 保持与敌人的相对位置
- ✅ 避免过度分散或聚集
- ✅ 弓箭手保持在后方射击位置

### **6.3 战术考量**
| 兵种 | 移动策略 | 优先级 |
|------|---------|--------|
| **弓箭手** | 前移至射击位置（保持距离） | 高 |
| **步兵** | 向前推进，保持阵型 | 中 |
| **骑兵** | 侧翼机动，寻找突破口 | 高 |
| **战象** | 中央突进，冲击敌阵 | 中高 |
| **将领** | 靠近战线，指挥激励 | 中 |

---

## 🔧 **七、错误处理与恢复**

### **7.1 常见错误处理**
```javascript
// 错误1：单位元素未找到
if (!unitElement) {
    this.log(`└─ 未找到单位元素: ${unit.id}`, 'error');
    return;
}

// 错误2：目标位置未找到
if (!hexElement) {
    this.log(`└─ 未找到目标格子: (${targetX}, ${targetY})`, 'error');
    return;
}

// 错误3：移动计划未创建
if (!this.game.movePlan || this.game.movePlan.length === 0) {
    this.log(`└─ 警告：移动计划可能未创建`, 'error');
}

// 错误4：执行超时
try {
    await Promise.race([executePromise, timeoutPromise]);
} catch (error) {
    this.log(`└─ [错误] executeAllPlans()执行失败或超时: ${error.message}`, 'error');
    this.nextPhase(); // 强制进入下一阶段
}
```

### **7.2 自动恢复机制**
- ✅ 超时后自动进入下一阶段
- ✅ 碰撞时自动寻找替代位置
- ✅ 详细日志便于问题追踪
- ✅ 状态验证防止卡死

---

## 📊 **八、完整决策流程**

```
┌──────────────────────────────────────────────────────────┐
│                  AI移动规划决策流程                        │
└──────────────────────────────────────────────────────────┘

1. 筛选可移动单位
   ↓
   排除已接敌单位
   
2. 敌情分析
   ↓
   找到最近敌人
   ↓
   计算当前距离
   
3. 距离评估
   ↓
   距离 < 3格？ → 跳过移动（已到战斗位置）
   ↓
   
4. 方向计算
   ↓
   标准化方向向量 (dx, dy)
   
5. 位置规划
   ↓
   目标 = 当前位置 + 方向 × 移动距离
   ↓
   边界检查（防止越界）
   
6. 碰撞检测
   ↓
   目标位置被占用？
   ├─ 是 → 8方向搜索空位
   │        ├─ 找到 → 使用新位置
   │        └─ 未找到 → 跳过该单位
   └─ 否 → 使用原目标位置
   
7. 移动距离验证
   ↓
   移动距离 < 1格？ → 跳过（无需移动）
   ↓
   
8. 交互执行
   ↓
   点击单位 → 延迟200ms → 点击目标位置 → 延迟500ms
   
9. 计划验证
   ↓
   检查 movePlan 是否已创建
   ↓
   记录到 allUnitPlans Map
   
10. 重复步骤1-9（为所有单位规划）
    ↓
    
11. 批量执行
    ↓
    调用 finishAllPlanning() → executeAllPlans()
    ↓
    带超时保护（30秒）
    
12. 完成验证
    ↓
    检查执行结果
    ↓
    重置状态，进入下一阶段
```

---

## ✅ **九、移动机制亮点**

### **核心优势**
1. **自适应距离**：根据单位类型自动调整移动距离
2. **智能避碰**：多层碰撞检测和自动避碰算法
3. **批量优化**：统一规划和执行提高效率
4. **容错设计**：超时保护和错误恢复机制
5. **实时反馈**：详细日志追踪每个决策步骤

### **技术特性**
- ✅ **坐标精度**：所有坐标强制转换为整数，避免小数坐标
- ✅ **状态同步**：实时验证游戏状态，确保操作有效
- ✅ **异步处理**：使用 async/await 确保操作顺序
- ✅ **延迟控制**：合理的延迟确保UI更新完成
- ✅ **Promise保护**：Promise.race 实现超时机制

---

## 🔍 **十、关键技术细节**

### **10.1 坐标计算精度**
```javascript
// 所有坐标计算都使用 Math.round() 强制转换为整数
let targetX = Math.round(unit.x + moveDirection.dx * maxMoveDistance);
let targetY = Math.round(unit.y + moveDirection.dy * maxMoveDistance);

// 问题：小数坐标会导致游戏卡死
// 解决：在所有坐标计算处强制转换为整数
```

### **10.2 碰撞检测逻辑**
```javascript
isPositionOccupied(x, y, excludeUnitId, unitSize) {
    // 检查该位置是否有其他单位占用
    // excludeUnitId：排除自己（允许规划到当前位置附近）
    // unitSize：考虑单位的实际占用范围
}
```

### **10.3 UI交互延迟**
```javascript
// 点击单位后延迟200ms（等待UI更新）
unitElement.click();
await this.delay(200);

// 点击目标后延迟500ms（等待计划创建）
hexElement.click();
await this.delay(500);

// 单位间延迟 autoDelay/3（约267ms，提高效率）
await this.delay(this.autoDelay / 3);
```

---

## 📈 **十一、性能优化**

### **11.1 批量处理**
- 所有单位规划完成后，统一执行
- 减少UI重绘次数，提高效率
- 一次性完成所有移动，用户体验更好

### **11.2 延迟优化**
| 操作 | 延迟时间 | 说明 |
|------|---------|------|
| 点击单位 | 200ms | 等待单位选择状态更新 |
| 点击目标 | 500ms | 等待移动计划创建 |
| 单位间延迟 | ~267ms | 规划下一个单位 |
| 阶段切换 | 1000ms | 等待动画完成 |

### **11.3 超时保护**
```javascript
// 30秒超时 = 适应大量单位的移动场景
// 如果超时，自动取消并进入下一阶段
// 防止无限等待导致页面卡死
```

---

## 🛡️ **十二、近战阶段修复**

### **12.1 冲锋距离修正**
```javascript
// 修复前：检查6格范围（错误）
const targets = enemyUnits.filter(enemy => distance <= 6);

// 修复后：检查3格范围（正确）
const targets = enemyUnits.filter(enemy => distance <= 3);

// 原因：游戏规则规定近战冲锋只能3格内
// 影响：避免选择距离过远无法攻击的单位，防止AI卡住
```

### **12.2 自动目标选择**
```javascript
// 选择攻击者后，自动进入目标选择
if (this.game.meleeSubPhase === 'select_target' && this.game.meleeAttacker) {
    this.log('└─ 继续选择攻击目标...', 'info');
    await this.selectMeleeTarget();
}
```

### **12.3 撤退后继续处理**
```javascript
// 撤退完成后，触发攻击方AI继续处理近战
setTimeout(() => {
    if (window.battleAIRome && window.battleAIRome.enabled) {
        window.battleAIRome.takeTurn();
    }
}, 1000); // 等待游戏重置完成（800ms）
```

---

## 📝 **十三、调试与日志**

### **13.1 调试日志分类**
```javascript
// 阶段日志（phase）
this.log('🚶 开始规划移动...', 'phase');

// 信息日志（info）
this.log(`└─ ${unit.name} 已接近敌人`, 'info');

// 操作日志（action）
this.log(`└─ ${unit.name} 规划移动: (x,y) → (x',y')`, 'action');

// 成功日志（success）
this.log('✓ 完成所有单位规划', 'success');

// 错误日志（error）
this.log('⚠️ [错误] 所有计划都是空的！', 'error');
```

### **13.2 关键验证点**
```javascript
// 验证1：单位数量
this.log(`└─ 共${myUnits.length}个单位需要规划`, 'info');

// 验证2：计划数量
this.log(`✓ 完成所有单位规划 (共${planCount}个单位)`, 'success');

// 验证3：有效计划数
this.log(`└─ 其中${validPlanCount}个单位有有效移动计划`, 'info');

// 验证4：执行前状态
this.log(`└─ [调试] moveState = ${this.game.moveState}`, 'info');
this.log(`└─ [调试] planningPhase = ${this.game.planningPhase}`, 'info');
```

---

## 🚀 **十四、总结**

### **AI移动规划的核心价值**
1. **智能决策**：根据战场态势动态调整移动策略
2. **高效执行**：批量处理减少操作时间
3. **稳定可靠**：多层验证和错误恢复机制
4. **用户友好**：自动化操作，无需人工干预

### **适用场景**
- ✅ 大规模军队移动（10-20个单位）
- ✅ 复杂地形避碰
- ✅ 多兵种协同推进
- ✅ 自动战术执行

### **改进方向**
- 🔄 考虑地形影响（森林、河流等）
- 🔄 更智能的侧翼机动算法
- 🔄 考虑敌方威胁区域避让
- 🔄 支持多目标分散攻击

---

*本文档总结了当前AI规划移动的完整机制，包括算法细节、执行流程和关键优化。*

