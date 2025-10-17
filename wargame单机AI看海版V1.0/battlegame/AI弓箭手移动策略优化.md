# AI弓箭手移动策略优化

## 优化目标

弓箭手作为远程单位，移动策略应该遵循两个原则：
1. **首要目标**：移动到能射击敌人的位置（在射程内）
2. **次要目标**：在满足第1点的基础上，尽可能远离敌人（保持安全距离）

## 修改前的问题 ❌

### 旧策略
```javascript
async planArcherMovement(unit, enemyUnits, myUnits) {
    const priorityTarget = this.selectPriorityTarget(unit, enemyUnits);
    const currentDist = this.getDistance(unit.x, unit.y, priorityTarget.x, priorityTarget.y);
    const optimalDist = 9; // 目标距离9格
    const minDist = 8;
    const maxDist = 10;
    
    // 尝试保持在8-10格距离
    if (currentDist >= minDist && currentDist <= maxDist) {
        return null; // 已在理想位置
    }
    
    if (currentDist < minDist) {
        return this.findBestSupportPosition(...); // 后退
    }
    
    return this.findBestSupportPosition(...); // 接近
}
```

### 问题分析
1. ❌ **固定距离**：强制要求8-10格距离，不够灵活
2. ❌ **单一目标**：只考虑一个优先目标，忽略其他敌人
3. ❌ **有限候选**：使用固定的候选生成方法，位置选择有限
4. ❌ **忽略射程**：没有充分利用12格的射程优势
5. ❌ **缺乏优先级**：未明确"射击优先"的原则

## 优化后的策略 ✅

### 新策略核心逻辑

```javascript
async planArcherMovement(unit, enemyUnits, myUnits) {
    const archerRange = unit.range || 12; // 弓箭手射程
    
    // 1. 获取所有可移动位置（使用游戏原生逻辑）
    const validMoves = this.getValidMovesForStep(unit, unit.x, unit.y, 0, []);
    
    // 2. 评估每个位置
    for (const pos of validMoves) {
        // 2.1 检查能否射击到敌人
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
        
        // 【关键】如果不能射击到任何敌人，跳过这个位置
        if (!canShootEnemy) {
            continue;
        }
        
        // 2.2 计算安全性（距离最近敌人越远越好）
        let safetyScore = minDistToEnemy;
        if (minDistToEnemy < 5) {
            safetyScore = minDistToEnemy - 10; // 危险距离，负分惩罚
        }
        
        // 2.3 综合评分：安全性×3 + 支援×2 + 目标数×0.5 - 阻挡惩罚
        const totalScore = safetyScore * 3 + supportScore * 2 + targetBonus - blockingPenalty;
    }
    
    // 3. 返回最高分的位置
    return bestPos;
}
```

## 评分系统详解

### 1. 首要条件：能否射击 (过滤条件)
```javascript
if (!canShootEnemy) {
    continue; // 直接跳过，不参与评分
}
```
- 如果不能射击到任何敌人，这个位置**直接淘汰**
- 确保弓箭手移动后一定能发挥作用

### 2. 安全性评分 (权重×3)
```javascript
let safetyScore = minDistToEnemy; // 基础分数 = 距离最近敌人的距离

if (minDistToEnemy < 5) {
    safetyScore = minDistToEnemy - 10; // 危险距离内，大幅扣分
}
```

**评分规则**：
- 距离12格：+12分（最安全，接近射程上限）
- 距离10格：+10分（很安全）
- 距离8格：+8分（安全）
- 距离5格：+5分（刚好安全）
- 距离4格：-6分（危险！）
- 距离3格：-7分（非常危险！）

### 3. 支援价值评分 (权重×2)
```javascript
const supportScore = this.evaluateSupportValue(pos, unit, myUnits);
```
- 评估该位置对己方单位的支援价值
- 考虑与友军的距离和位置关系

### 4. 目标数量加成 (权重×0.5)
```javascript
const targetBonus = enemiesInRange * 0.5;
```
- 能射击到的敌人越多越好
- 每多一个目标 +0.5分

### 5. 阻挡惩罚 (权重×1)
```javascript
if (infToArcher < infToEnemy && archerToEnemy < infToEnemy) {
    blockingPenalty += 5; // 阻挡一个步兵 -5分
}
```
- 避免弓箭手阻挡己方步兵前进
- 每阻挡一个步兵 -5分

### 综合评分公式
```javascript
totalScore = safetyScore × 3 + supportScore × 2 + targetBonus - blockingPenalty
```

## 示例对比

### 场景：弓箭手在(50, 30)，敌人在(50, 15)（距离15格）

#### 修改前
```
当前距离15格 > 10格
→ 尝试接近到9格
→ 移动到(50, 21)
→ 结果：距离9格（在射程内但较近）
```

#### 修改后
```
评估所有可移动位置：
  位置A(50, 26): 距离11格，能射击，安全分11×3=33 ✓
  位置B(50, 22): 距离7格，能射击，安全分7×3=21
  位置C(48, 24): 距离9格，能射击，安全分9×3=27，支援分4×2=8 ✓✓
  位置D(52, 24): 距离9格，能射击，但阻挡步兵，-5分
  位置E(50, 28): 距离13格，超出射程，跳过 ✗

→ 选择位置C(48, 24)
→ 结果：距离9格，支援好，不阻挡
```

### 场景：弓箭手在(50, 30)，敌人逼近到(50, 26)（距离4格）

#### 修改前
```
当前距离4格 < 5格
→ 判定为危险距离
→ 调用findSafeRetreatPosition
→ 尝试后退到8格
```

#### 修改后
```
评估所有可移动位置：
  位置A(50, 36): 距离10格，能射击，安全分10×3=30 ✓✓
  位置B(52, 34): 距离9格，能射击，安全分9×3=27 ✓
  位置C(48, 34): 距离9格，能射击，安全分9×3=27，支援分5×2=10 ✓✓✓
  位置D(50, 28): 距离2格，能射击，但危险！安全分(2-10)×3=-24 ✗

→ 选择位置C(48, 34)
→ 结果：后退到安全距离，保持射击能力，支援友军
```

## 技术亮点

### 1. 使用游戏原生可移动范围
```javascript
const validMoves = this.getValidMovesForStep(unit, unit.x, unit.y, 0, []);
```
- 获取所有真实可移动的位置（数百个）
- 不受固定候选方法的限制
- 灵活适应各种战场情况

### 2. 严格的射程检查
```javascript
for (const enemy of enemyUnits) {
    if (distToEnemy <= archerRange) {
        canShootEnemy = true;
        enemiesInRange++;
    }
}

if (!canShootEnemy) {
    continue; // 不能射击，直接跳过
}
```
- **确保移动有价值**：只考虑能射击敌人的位置
- **防止无效移动**：避免移动到射程外

### 3. 多维度评分系统
- ✅ 安全性（距离敌人）
- ✅ 支援价值（帮助友军）
- ✅ 目标数量（射击效率）
- ✅ 阻挡惩罚（战术协同）

### 4. 智能权重分配
```
安全性×3 > 支援×2 > 目标数×0.5
```
- **安全第一**：远离危险是最重要的
- **支援次之**：帮助友军也很重要
- **目标适度**：能射几个目标是加分项

## 修复效果

### 修改前
- ❌ 固定距离策略，不够灵活
- ❌ 有时移动到危险位置
- ❌ 忽略其他敌人
- ❌ 候选位置有限

### 修改后
- ✅ **射击优先**：保证移动后能发挥作用
- ✅ **安全第一**：在射程内尽可能远离敌人
- ✅ **灵活机动**：根据战场情况选择最优位置
- ✅ **考虑全局**：评估所有敌人，不阻挡友军
- ✅ **充分利用射程**：12格射程，可以保持8-12格的安全距离

## 预期行为

### 情况1：敌人较远（>12格）
```
结果：找不到射程内的位置 → 不移动或向前接近
```

### 情况2：敌人在射程内（8-12格）
```
结果：保持当前位置或微调到更安全/支援更好的位置
```

### 情况3：敌人较近（5-8格）
```
结果：选择射程内且更远的位置，增加安全距离
```

### 情况4：敌人太近（<5格）
```
结果：后退到安全距离，但仍保持在射程内
```

## 测试建议

1. **观察弓箭手移动**：
   - 移动后是否能射击到敌人
   - 是否保持了安全距离
   
2. **检查日志输出**：
   ```
   └─ [弓箭手] 同盟的弓箭手 有95个可移动位置
   └─ [弓箭手] 找到最优位置，射程内位置数: 42/95
   ```

3. **验证战术效果**：
   - 弓箭手不应该冲到敌人面前
   - 弓箭手应该在后方提供火力支援
   - 弓箭手不应该阻挡步兵前进

## 文件修改

- **文件**：`battlegame/js/battle-ai-controller-rome.js`
- **函数**：`planArcherMovement()`
- **修改日期**：2025-10-16
- **代码行数**：约100行（完全重写）

## 设计哲学

### 远程单位的作战原则
1. **射程优势**：利用远程攻击能力，无需近身
2. **安全距离**：保持在敌人近战范围外
3. **火力支援**：为前线友军提供远程火力
4. **灵活机动**：根据战场变化调整位置

### 评分权重的哲学
```
能否射击 > 安全性 > 支援价值 > 其他因素
```
- **价值基础**：能射击是弓箭手存在的意义
- **生存优先**：活着才能持续输出
- **团队协作**：配合友军取得胜利
- **适度优化**：其他因素作为微调

## 相关文件
- `AI移动规划使用游戏原生范围计算.md`：移动规划的基础改进
- `AI移动规划冲突修复说明.md`：冲突检测修复
- `AI移动规划机制总结.md`：整体移动机制

