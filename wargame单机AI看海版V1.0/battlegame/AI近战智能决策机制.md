# 🤖 AI近战智能决策机制

## 📋 **概述**

AI的近战决策系统现在包含两层智能评估：
1. **冲锋前评估**：决定是否发起冲锋（战力比 ≥ 0.8）
2. **防御时评估**：决定是撤退还是坚守（战力比 < 0.6 撤退）

这确保AI只在有利的情况下发起冲锋，并在劣势时选择撤退。

---

## ⚔️ **一、冲锋决策机制**

### **1.1 决策流程**

```
检测所有己方单位
    ↓
对每个单位：
    ├─ 查找3格内的敌人
    │
    ├─ 对每个敌人进行战力评估
    │  ├─ 计算己方战力（自己+支援）
    │  ├─ 计算对方战力（敌人+支援）
    │  └─ 计算战力比
    │
    ├─ 战力比 >= 0.8？
    │  ├─ 是 → 这是合格的冲锋目标
    │  └─ 否 → 跳过这个敌人
    │
    └─ 有合格目标？
       ├─ 是 → 加入候选列表
       └─ 否 → 记录"不冲锋"
    
排序候选列表（优先级：战力比、兵种、HP、攻击力）
    ↓
选择优先级最高的单位发起冲锋
```

### **1.2 战力计算公式**

#### **攻击方战力**
```javascript
evaluateChargeDecision(attacker, target) {
    // 1. 攻击者基础战力
    attackerPower = chargeAttack + (HP/MaxHP) × 10
    
    // 2. 攻击方支援战力（3格内的己方单位）
    attackerSupports = 筛选己方3格内未支援单位
    attackerSupportPower = Σ(supportMelee + defense)
    
    // 3. 总攻击战力
    totalAttackerPower = attackerPower + attackerSupportPower
    
    // 4. 目标防御战力
    targetPower = defense + (HP/MaxHP) × 10
    
    // 5. 目标方支援战力（3格内的敌方单位）
    targetSupports = 筛选敌方3格内未支援单位
    targetSupportPower = Σ(supportMelee + defense)
    
    // 6. 总防御战力
    totalTargetPower = targetPower + targetSupportPower
    
    // 7. 战力比
    powerRatio = totalAttackerPower / totalTargetPower
    
    return powerRatio;
}
```

### **1.3 冲锋决策规则**

| 战力比 | 决策 | 说明 |
|--------|------|------|
| **< 0.8** | 不冲锋 | 敌人过强，避免损失 |
| **≥ 0.8** | 可冲锋 | 有优势或势均力敌，值得一战 |
| **≥ 1.2** | 优先冲锋 | 优势明显，积极进攻 |

### **1.4 优先级计算**

```javascript
// 对通过战力评估的单位计算优先级
priority = 0;

// 1. 战力比越高，优先级越高（主要因素）
priority += powerRatio × 100;

// 2. 兵种加成
if (type === 'cavalry')  priority += 100;  // 骑兵适合冲锋
if (type === 'elephant') priority += 120;  // 战象冲击力强
if (type === 'general')  priority += 80;   // 将领领导力

// 3. HP越高优先级越高
priority += (HP / MaxHP) × 50;

// 4. 冲锋攻击力越高优先级越高
priority += chargeAttack × 10;
```

---

## 🛡️ **二、防御决策机制**

### **2.1 防御时评估**

当己方单位被敌人选为冲锋目标时，AI会评估是否撤退：

```javascript
evaluateRetreatDecision(attacker, defender) {
    // 1. 计算双方基础战力
    attackerPower = chargeAttack + (HP/MaxHP) × 10
    defenderPower = defense + (HP/MaxHP) × 10
    
    // 2. 计算双方支援战力
    defenderSupportPower = Σ(supportMelee + defense)
    attackerSupportPower = Σ(supportMelee + defense)
    
    // 3. 综合战力比
    powerRatio = (defenderPower + defenderSupportPower) / 
                 (attackerPower + attackerSupportPower)
    
    // 4. 决策
    if (powerRatio < 0.6) {
        return true;  // 撤退（显著劣势）
    } else {
        return false; // 坚守（有一战之力）
    }
}
```

### **2.2 防御决策规则**

| 战力比 | 决策 | 说明 |
|--------|------|------|
| **< 0.6** | 撤退 | 显著劣势，保存实力 |
| **≥ 0.6** | 坚守 | 有一战之力，选择战斗 |

---

## 🔄 **三、完整近战循环**

### **3.1 循环处理流程**

```
进入近战阶段
    ↓
┌─────────────────────────┐
│  1. 检查可冲锋单位      │
│     └─ 0个？→ 结束近战  │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  2. 逐个评估单位        │
│     对每个单位：         │
│     ├─ 找3格内敌人      │
│     ├─ 评估战力比       │
│     └─ 战力比 ≥ 0.8？   │
│        ├─ 是 → 可冲锋   │
│        └─ 否 → 跳过     │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  3. 选择最佳攻击者      │
│     └─ 战力比最高的单位 │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  4. 选择最佳目标        │
│     └─ 对该攻击者最优   │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  5. 防御方评估          │
│     ├─ 战力比 < 0.6     │
│     │  └─ 撤退（后退6格）│
│     └─ 战力比 ≥ 0.6     │
│        └─ 坚守战斗      │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  6. 支援单位选择        │
│     ├─ 攻击方选3个支援  │
│     └─ 防御方选3个支援  │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  7. 执行近战战斗        │
│     └─ 骰子、伤亡、测试 │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│  8. 重置状态            │
│     └─ resetChargeState │
└─────────────────────────┘
    ↓
回到步骤1（检查下一个可冲锋单位）
```

### **3.2 循环终止条件**

```javascript
// 终止条件1：没有可冲锋单位
if (myUnits.filter(u => !u.hasCharged).length === 0) {
    // 所有单位都冲锋过了
    进入持续近战检查;
}

// 终止条件2：所有单位3格内都没有敌人
if (findBestMeleeAttacker() === null) {
    // 没有单位能找到3格内的敌人
    进入持续近战检查;
}

// 终止条件3：所有单位的战力比都 < 0.8
if (所有单位的战力比 < 0.8) {
    // 所有单位对所有敌人都不占优势
    进入持续近战检查;
}
```

---

## 📊 **四、实战案例**

### **案例1：有利冲锋**

**战场情况：**
```
罗马骑兵A（攻击6, HP 15/15）
    3格内敌人：迦太基弓箭手（防御2, HP 8/10）
    己方支援：2个步兵（supportMelee=2, defense=4）
    敌方支援：0个
```

**战力评估：**
```javascript
attackerPower = 6 + (15/15)×10 = 16
targetPower = 2 + (8/10)×10 = 10
attackerSupportPower = 2×(2+4) = 12
targetSupportPower = 0

powerRatio = (16+12) / (10+0) = 28/10 = 2.8
```

**决策：** 2.8 ≥ 0.8 → **发起冲锋** ✅

---

### **案例2：不利冲锋（拒绝）**

**战场情况：**
```
罗马步兵B（攻击5, HP 10/20）
    3格内敌人：迦太基战象（防御7, HP 30/30）
    己方支援：0个
    敌方支援：3个骑兵（supportMelee=3, defense=3）
```

**战力评估：**
```javascript
attackerPower = 5 + (10/20)×10 = 10
targetPower = 7 + (30/30)×10 = 17
attackerSupportPower = 0
targetSupportPower = 3×(3+3) = 18

powerRatio = (10+0) / (17+18) = 10/35 = 0.29
```

**决策：** 0.29 < 0.8 → **不冲锋，跳过该单位** ❌

---

### **案例3：撤退决策**

**战场情况：**
```
罗马骑兵冲锋迦太基步兵
    攻击方：骑兵（6）+ 1个步兵支援（6）= 12
    防御方：步兵（5）+ 0个支援 = 5
```

**防御方评估：**
```javascript
powerRatio = 5 / 12 = 0.42
```

**决策：** 0.42 < 0.6 → **选择撤退** ✅

---

## 🎯 **五、关键改进点**

### **5.1 冲锋前战力评估**

**修改前：**
```javascript
// 只要3格内有敌人就冲锋 ❌
const targets = enemyUnits.filter(enemy => distance <= 3);
if (targets.length > 0) {
    发起冲锋; // 不管强弱都冲
}
```

**修改后：**
```javascript
// 评估每个敌人，只冲锋有利的目标 ✅
for (const target of targets) {
    const powerRatio = evaluateChargeDecision(unit, target);
    if (powerRatio >= 0.8) {
        可以考虑冲锋这个目标;
    } else {
        跳过这个敌人（太强了）;
    }
}
```

### **5.2 智能防御决策**

**修改前：**
```javascript
// 总是选择撤退 ❌
this.game.defenderChooseRetreat();
```

**修改后：**
```javascript
// 根据战力比决策 ✅
const shouldRetreat = evaluateRetreatDecision(attacker, defender);
if (shouldRetreat) {
    this.game.defenderChooseRetreat(); // 劣势撤退
} else {
    this.game.defenderChooseStand();   // 优势坚守
}
```

### **5.3 循环处理所有可冲锋单位**

**修改前：**
```javascript
// 只冲锋一次就结束 ❌
const bestAttacker = findBestMeleeAttacker();
await executeCharge(bestAttacker);
this.nextPhase(); // 直接进入下一阶段
```

**修改后：**
```javascript
// 循环处理所有可冲锋单位 ✅
冲锋完成后 → resetChargeState() → 触发AI继续
    ↓
AI再次调用 selectMeleeAttacker()
    ↓
检查是否还有可冲锋单位
    ├─ 有 → 继续冲锋
    └─ 无 → 进入下一阶段
```

---

## 📈 **六、决策阈值对比**

| 阶段 | 阈值 | 决策 | 说明 |
|------|------|------|------|
| **冲锋评估** | ≥ 0.8 | 发起冲锋 | 攻击方需要80%的战力优势 |
| **冲锋评估** | < 0.8 | 不冲锋 | 敌人过强，避免无谓损失 |
| **防御评估** | < 0.6 | 撤退 | 防御方劣势60%以上才撤退 |
| **防御评估** | ≥ 0.6 | 坚守 | 有一战之力就坚守 |

### **设计理念**

- **攻击谨慎**：需要0.8以上战力比才冲锋（避免冒险）
- **防守坚韧**：只有劣势40%以上才撤退（不轻易放弃）
- **结果**：AI倾向于在有利时进攻，劣势时坚守阵地

---

## 🔍 **七、技术细节**

### **7.1 单位属性使用**

```javascript
// 游戏系统的单位属性
unit = {
    chargeAttack: 6,      // 冲锋近战值
    sustainedMelee: 5,    // 持续近战值
    supportMelee: 2,      // 支援近战值
    defense: 4,           // 防御能力
    hp: 15,               // 当前HP
    maxHp: 20,            // 最大HP
    hasCharged: false,    // 是否已冲锋
    hasSupported: false   // 是否已支援
};

// AI冲锋评估使用
attackerPower = chargeAttack + (hp/maxHp)×10  ✅
supportPower = supportMelee + defense         ✅

// 不使用（已废弃或不存在）
unit.attack  ❌ undefined
```

### **7.2 支援单位筛选**

```javascript
// 支援单位必须满足：
const supports = this.game.units.filter(unit =>
    unit.faction === attacker.faction &&  // 同阵营
    unit.hp > 0 &&                        // 存活
    unit.id !== attacker.id &&            // 不是攻击者自己
    !unit.hasSupported &&                 // 本回合未支援过
    this.getDistance(...) <= 3            // 3格范围内（游戏规则）
);
```

### **7.3 循环触发机制**

```javascript
// 游戏核心：冲锋完成后
setTimeout(() => {
    resetChargeState();  // 重置状态
    
    setTimeout(() => {
        // 触发AI继续处理
        if (window.battleAI && window.battleAI.shouldControl()) {
            window.battleAI.takeTurn();  // AI会再次调用selectMeleeAttacker
        }
    }, 500);
}, totalTestDelay);
```

---

## ✅ **八、修复效果**

### **修复前的问题**
❌ 只要3格内有敌人就冲锋（不管强弱）  
❌ 每回合只冲锋一次  
❌ 总是选择撤退（不智能）  
❌ 使用错误的单位属性（unit.attack）  
❌ 使用错误的方向名称（up/down）  
❌ 支援距离错误（10格）

### **修复后的改进**
✅ 评估战力比 ≥ 0.8 才冲锋  
✅ 循环处理所有可冲锋单位  
✅ 根据战力比智能决定撤退或坚守  
✅ 使用正确的单位属性（chargeAttack, supportMelee, defense）  
✅ 使用正确的方向名称（north/south/east/west）  
✅ 支援距离修正为3格（游戏规则）

---

## 🎮 **九、实战效果**

### **场景1：优势冲锋**
```
罗马3个骑兵（攻6, HP满），迦太基2个弓箭手（防2, HP低）
战力比：约2.5 ≥ 0.8
决策：3个骑兵逐一发起冲锋 ✅
```

### **场景2：劣势放弃**
```
罗马1个步兵（攻5, HP低），迦太基1个战象（防7, HP满）+2个骑兵支援
战力比：约0.4 < 0.8
决策：步兵不冲锋，保持阵地 ✅
```

### **场景3：智能撤退**
```
迦太基弓箭手被罗马骑兵冲锋
防御方战力比：0.5 < 0.6
决策：弓箭手撤退6格 ✅
```

### **场景4：坚守战斗**
```
迦太基步兵被罗马步兵冲锋，但迦太基有2个支援单位
防御方战力比：1.2 ≥ 0.6
决策：步兵坚守，选择支援，执行战斗 ✅
```

---

## 🧠 **十、AI战术特点**

### **进攻策略**
- **谨慎评估**：需要80%战力优势才冲锋
- **优先骑兵**：骑兵、战象优先冲锋
- **集中打击**：优先攻击弱小和已受损单位
- **充分利用**：所有满足条件的单位都会冲锋

### **防守策略**
- **坚韧防守**：只有劣势40%以上才撤退
- **智能支援**：自动选择3个最强支援单位
- **保存实力**：显著劣势时及时撤退
- **战术撤退**：撤退6格，重新组织防线

---

## 📝 **十一、调试日志**

AI会输出详细的决策日志：

```
[战棋AI] 🎯 选择近战攻击者...
[战棋AI] ℹ └─ 检测到 3 个可冲锋单位
[战棋AI] ℹ └─ 罗马骑兵A 周围敌人过强（战力比 < 0.8），不冲锋
[战棋AI] ℹ └─ 罗马骑兵B 周围敌人过强（战力比 < 0.8），不冲锋
[战棋AI] ℹ └─ 最佳攻击者: 罗马骑兵C, 目标: 迦太基弓箭手, 战力比: 2.15
[战棋AI] ▶ └─ 选择 罗马骑兵C 发起冲锋
[战棋AI] ℹ └─ 继续选择攻击目标...
[战棋AI] ▶ └─ 选择 迦太基弓箭手 作为目标 (距离3格)
[战棋AI] ℹ └─ 战力评估: 防守10.0 vs 攻击28.0, 比率=0.36
[战棋AI] ℹ └─ 支援情况: 防守0个 vs 攻击2个
[战棋AI] ℹ └─ 战力比0.36 < 0.6，选择撤退
[战棋AI] ▶ └─ 迦太基弓箭手 评估劣势，选择撤退
```

---

## 🚀 **十二、总结**

### **核心价值**
1. **智能评估**：双重战力评估机制（冲锋前+防御时）
2. **谨慎进攻**：只在有利时发起冲锋
3. **坚韧防守**：不轻易撤退，充分利用支援
4. **循环处理**：所有可冲锋单位都会被评估和利用

### **适用场景**
- ✅ 复杂战场形势（多单位、多支援）
- ✅ 战力对比复杂（需要评估）
- ✅ 自动化战斗（无需人工干预）
- ✅ 战术智能化（避免愚蠢冲锋）

### **战术效果**
- 🎯 避免无谓损失
- 🎯 最大化战斗效率
- 🎯 充分利用支援优势
- 🎯 智能化战术决策

---

*本文档详细说明了AI近战阶段的双重智能评估机制，确保AI做出最优战术决策。*

