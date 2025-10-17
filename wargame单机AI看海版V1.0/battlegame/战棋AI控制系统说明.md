# 战棋界面迦太基AI控制系统说明

## 📋 概述

为战棋界面（`index-modular.html`）创建了完整的迦太基AI控制系统，实现了全自动的战斗AI，能够在各个战斗阶段做出智能决策。

## 🎯 主要功能

### 1. AI控制的战斗阶段

AI系统覆盖了战棋游戏的所有战斗阶段：

#### 📦 部署阶段 (Deployment Phase)
- **自动部署策略**：
  - 将领部署在中后方 (43线)
  - 战象部署在前排中央 (40线)
  - 骑兵部署在两翼 (左右20和80位置)
  - 步兵部署在前排中央区域 (40线)
  - 弓箭手部署在后排 (44线)
- **智能避让**：自动检测位置冲突，螺旋搜索空位
- **优先级排序**：将领 > 战象 > 重骑兵 > 步兵 > 弓箭手

#### 🚶 移动阶段 (Movement Phase)
- **目标识别**：为每个单位找到最近的敌人
- **路径规划**：根据单位类型计算最优移动距离
  - 将领：3格
  - 骑兵：5格
  - 战象：3格
  - 步兵：2格
  - 弓箭手：2格
- **避障处理**：检测并避开已占用位置
- **统一执行**：规划完所有单位后统一执行移动

#### 🔄 转向阶段 (Turning Phase)
- **朝向优化**：每个单位自动面向最近的敌人
- **方向计算**：使用角度计算最优朝向（上/下/左/右）
- **最短旋转**：选择最短旋转路径调整方向

#### 🏹 远程阶段 (Ranged Phase)
- **目标选择策略**：
  - 优先集火受损单位（集火倾向 80%）
  - 优先攻击弓箭手和将领（高价值目标）
  - 优先攻击距离近的敌人
- **射程检查**：自动判断10格射程内的有效目标
- **连续射击**：所有弓箭手依次选择最优目标射击

#### ⚔️ 近战阶段 (Melee Phase)
- **攻击者选择**：
  - 优先选择骑兵和战象发起冲锋
  - 考虑单位HP和攻击力
  - 确保攻击者在6格冲锋距离内
- **目标选择**：
  - 优先攻击已受损的敌人（集火策略）
  - 优先攻击将领、战象等高价值目标
  - 优先攻击防御力低的单位
- **支援选择**：
  - 自动选择最多3个最强支援单位
  - 考虑支援单位的攻击力、HP和距离
  - 优化支援价值计算

## 🛠️ 技术实现

### 文件结构

```
battlegame/
├── js/
│   ├── battle-ai-controller.js  [新建] AI控制器核心逻辑
│   ├── game-core.js              游戏核心代码
│   ├── game-main.js              [修改] 添加AI初始化
│   ├── battle-bridge.js          战斗桥接模块
│   └── custom-units.js           自定义单位
└── index-modular.html            [修改] 添加AI按钮
```

### 核心类：BattleAIController

```javascript
class BattleAIController {
    constructor(game)           // 初始化AI控制器
    enable()                    // 启用AI
    disable()                   // 禁用AI
    toggle()                    // 切换AI状态
    takeTurn()                  // 主控制循环
    
    // 各阶段处理方法
    handleDeploymentPhase()     // 部署阶段
    handleMovementPhase()       // 移动阶段
    handleTurningPhase()        // 转向阶段
    handleRangedPhase()         // 远程阶段
    handleMeleePhase()          // 近战阶段
}
```

### AI配置参数

```javascript
config: {
    aggressiveness: 0.7,    // 进攻倾向 (0-1)
    defensiveness: 0.3,     // 防守倾向 (0-1)
    riskTaking: 0.6,        // 冒险倾向 (0-1)
    focusFire: 0.8,         // 集火倾向 (0-1) - 优先攻击已受损单位
    flankBonus: 0.9,        // 侧翼包抄加成
}
```

## 🎮 使用方法

### 1. 启动游戏
1. 打开 `battlegame/index-modular.html`
2. 选择"默认战斗"或"自定义战斗"模式
3. 罗马方先部署

### 2. 启用AI
- 点击右侧控制面板的 **"🤖 启用迦太基AI"** 按钮
- 按钮变红表示AI已启用

### 3. AI自动运行
- 当轮到迦太基回合时，AI自动接管
- AI会在每个阶段做出决策并执行操作
- 控制台和游戏日志会显示AI的思考过程

### 4. 禁用AI
- 再次点击按钮 **"🤖 禁用迦太基AI"** 即可恢复手动控制

### 5. 手动触发（调试用）
- 在浏览器控制台输入：`window.triggerBattleAI()`
- 可以手动触发AI执行当前阶段

## 🎯 AI决策逻辑详解

### 部署策略
```
后排 (44线): 🏹 弓箭手 [保护后方，提供火力支援]
中线 (43线): 👑 将领   [指挥中心，安全位置]
中线 (41线): 🐎 骑兵   [两翼待命，准备突击]
前排 (40线): 🐘 战象 + 🛡️ 步兵 [前线坦克，吸收伤害]
```

### 移动策略
1. **优先接近敌人**：每个单位向最近的敌人移动
2. **保持阵型**：避免单位过度分散
3. **防止卡位**：自动检测并避开障碍物

### 射击策略
- **目标优先级** = 受损程度 × 80% + 目标价值 + 距离因素
- 将领目标：+80分
- 弓箭手目标：+50分
- 距离越近：+5分/格

### 近战策略
- **冲锋优先级**：骑兵 > 战象 > 将领 > 其他
- **目标优先级**：将领 > 战象 > 弓箭手 > 步兵
- **支援选择**：攻击力 × 10 + HP状态 × 30 + 距离因素 × 5

## 🔧 调试功能

### 控制台命令

```javascript
// 检查游戏状态
window.checkGameState()

// 手动触发AI
window.triggerBattleAI()

// 查看AI状态
console.log(window.battleAI)

// 启用/禁用AI
window.battleAI.toggle()

// 修改AI配置
window.battleAI.config.aggressiveness = 0.9  // 更激进
window.battleAI.config.focusFire = 1.0       // 完全集火
```

### 调试模式

AI控制器内置调试模式，会在控制台输出详细日志：

```javascript
window.battleAI.debugMode = true   // 启用详细日志
window.battleAI.debugMode = false  // 只显示关键信息
```

## ⚙️ 自动触发机制

AI系统通过钩子函数自动触发：

1. **阶段切换触发**：
   - 拦截 `game.nextPhase()` 方法
   - 每次切换阶段后检查是否轮到迦太基
   - 自动调用 `battleAI.takeTurn()`

2. **部署完成触发**：
   - 拦截 `game.confirmDeployment()` 方法
   - 罗马部署完成后自动触发迦太基AI部署

3. **延迟执行**：
   - 每个操作之间有延迟（默认800ms）
   - 让玩家能看清AI的决策过程

## 📊 性能优化

- **螺旋搜索**：高效的空位查找算法
- **距离缓存**：避免重复计算距离
- **优先级排序**：快速决策最优目标
- **异步执行**：使用 async/await 避免阻塞

## 🐛 已知限制

1. **部署区域固定**：AI固定在底部区域部署（40-45线）
2. **简单路径规划**：只考虑直线距离，不考虑地形
3. **无战术变化**：每次使用相同的部署策略
4. **无学习能力**：不会根据战局调整策略

## 🚀 未来改进方向

1. **动态战术**：根据敌方部署调整策略
2. **包抄战术**：实现侧翼包围
3. **撤退机制**：劣势时自动撤退
4. **协同作战**：多单位配合攻击
5. **地形利用**：考虑地形优势
6. **难度等级**：可调节的AI难度

## 📝 更新日志

### v1.0.0 (2025-10-11)
- ✅ 创建基础AI控制器框架
- ✅ 实现部署阶段自动部署
- ✅ 实现移动阶段智能移动
- ✅ 实现转向阶段朝向优化
- ✅ 实现远程阶段目标选择
- ✅ 实现近战阶段攻击决策
- ✅ 集成到游戏主界面
- ✅ 添加UI控制按钮
- ✅ 实现自动触发机制

## 🎓 开发说明

### 添加新的AI策略

```javascript
// 在 BattleAIController 类中添加新方法
async handleCustomPhase() {
    this.log('🎯 自定义阶段...', 'phase');
    
    // 1. 获取相关单位
    const units = this.game.units.filter(...);
    
    // 2. 制定策略
    for (const unit of units) {
        const decision = this.makeDecision(unit);
        await this.executeDecision(decision);
        await this.delay(this.autoDelay);
    }
    
    // 3. 完成阶段
    this.nextPhase();
}
```

### 修改决策参数

在 `battle-ai-controller.js` 中修改 `config` 对象：

```javascript
this.config = {
    aggressiveness: 0.7,    // 提高此值使AI更激进
    defensiveness: 0.3,     // 提高此值使AI更保守
    riskTaking: 0.6,        // 提高此值使AI更冒险
    focusFire: 0.8,         // 提高此值强化集火策略
    flankBonus: 0.9,        // 侧翼包抄权重
};
```

## 🤝 贡献

如需改进AI系统，请：
1. 修改 `battlegame/js/battle-ai-controller.js`
2. 测试各个战斗阶段
3. 更新本文档

## 📞 支持

如遇问题：
1. 检查浏览器控制台的错误信息
2. 使用 `window.checkGameState()` 检查游戏状态
3. 使用 `window.battleAI.debugMode = true` 启用详细日志

---

**最后更新：2025年10月11日**

