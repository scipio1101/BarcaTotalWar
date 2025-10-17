# 🤖 战棋界面迦太基AI - 快速使用指南

## ⚡ 5秒上手

1. **打开游戏**：在浏览器中打开 `battlegame/index-modular.html`
2. **选择模式**：点击"默认战斗"或"自定义战斗"
3. **启用AI**：点击右侧的 **"🤖 启用迦太基AI"** 按钮（变红表示已启用）
4. **开始游戏**：罗马部署完成后，AI会自动接管迦太基方

## 🎮 完整流程

### Step 1: 启动游戏
```
浏览器 → 打开 battlegame/index-modular.html → 看到游戏模式选择弹窗
```

### Step 2: 选择模式
- **默认战斗**：快速开始，使用预设兵力
- **自定义战斗**：自定义双方兵力和将领能力

### Step 3: 罗马方部署
- 拖拽罗马单位到合适位置
- 点击"确认部署"按钮

### Step 4: 启用迦太基AI
- 点击右侧控制面板的 **"🤖 启用迦太基AI"** 按钮
- 按钮颜色从绿色变为红色 = AI已启用

### Step 5: 观看AI战斗
AI会自动：
- ✅ 部署所有单位（合理阵型）
- ✅ 规划并执行移动（接近敌人）
- ✅ 调整朝向（面对敌人）
- ✅ 选择射击目标（弓箭手）
- ✅ 发起近战冲锋（骑兵/战象）
- ✅ 选择支援单位

### Step 6: 切换控制
- 想手动控制？再次点击按钮 **"🤖 禁用迦太基AI"**
- 按钮变回绿色 = AI已禁用，可以手动操作

## 📊 AI能看懂什么？

### 在控制台可以看到AI的思考过程：
```
[战棋AI] 🤖 AI开始思考 - 阶段: deployment
[战棋AI] 📦 开始自动部署...
[战棋AI] └─ 部署 迦太基将领 到 (50, 43)
[战棋AI] └─ 部署 迦太基战象 到 (50, 40)
[战棋AI] └─ 部署 迦太基骑兵 到 (20, 41)
[战棋AI] ✓ 所有单位部署完成
[战棋AI] ✓ 已确认部署
```

### 在游戏日志也能看到关键操作：
```
🤖 AI开始思考 - 阶段: deployment
✓ 所有单位部署完成
✓ 已确认部署
```

## 🎯 AI战术一览

### 部署阶段
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  敌方罗马（顶部）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         ...空地...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
40线: 🐘战象  🛡️步兵  🛡️步兵
41线: 🐎骑兵           🐎骑兵
43线:      👑将领
44线: 🏹弓手  🏹弓手  🏹弓手
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  我方迦太基（底部）
```

### 移动策略
- 🐎 骑兵 → 快速接近敌方弓箭手/将领
- 🐘 战象 → 直冲敌方前排
- 🛡️ 步兵 → 稳步推进
- 🏹 弓手 → 保持射程优势
- 👑 将领 → 跟随主力，保持安全

### 射击优先级
1. **已受损敌人**（集火！）
2. **敌方将领**（高价值目标）
3. **敌方弓手**（消除威胁）
4. **距离最近的敌人**

### 近战优先级
**谁来冲锋？**
- 首选：🐘 战象、🐎 骑兵
- 备选：👑 将领、🛡️ 步兵

**攻击谁？**
1. 敌方将领（斩首行动）
2. 已受损单位（快速击杀）
3. 低防御单位（容易击破）

**谁来支援？**
- 选择附近3个最强单位
- 优先：攻击高、HP满、距离近

## 🎛️ 高级操作

### 手动触发AI（调试用）
打开浏览器控制台（F12），输入：
```javascript
window.triggerBattleAI()
```

### 查看AI状态
```javascript
console.log(window.battleAI)
```

### 调整AI个性
```javascript
// 让AI更激进
window.battleAI.config.aggressiveness = 0.9

// 让AI更喜欢集火
window.battleAI.config.focusFire = 1.0

// 减慢AI操作速度（毫秒）
window.battleAI.autoDelay = 1500
```

### 启用详细日志
```javascript
window.battleAI.debugMode = true
```

## ❓ 常见问题

### Q: AI为什么不动？
**A:** 检查：
1. AI是否已启用（按钮是红色）？
2. 是否轮到迦太基回合？
3. 控制台是否有错误信息？

### Q: 怎么让AI操作快一点/慢一点？
**A:** 在控制台输入：
```javascript
window.battleAI.autoDelay = 500  // 快速模式
window.battleAI.autoDelay = 1500 // 慢速模式（方便观察）
```

### Q: AI能控制罗马吗？
**A:** 当前版本只支持迦太基。如需罗马AI，需要修改代码：
```javascript
window.battleAI.faction = 'rome'
```

### Q: 如何让AI更聪明？
**A:** 修改配置参数：
```javascript
window.battleAI.config.aggressiveness = 0.8  // 更激进
window.battleAI.config.focusFire = 0.9       // 更集火
window.battleAI.config.riskTaking = 0.7      // 更冒险
```

### Q: AI会自动战斗到结束吗？
**A:** 会的！只要AI保持启用状态，会一直执行到战斗结束。

### Q: 能中途接管AI的操作吗？
**A:** 可以！随时点击"禁用AI"按钮即可手动接管。

## 🐛 遇到问题？

### 检查清单
1. ✅ 游戏是否正常加载？
2. ✅ 控制台是否有报错？（按F12打开）
3. ✅ AI按钮是否存在？
4. ✅ 是否在正确的阶段？

### 调试步骤
```javascript
// 1. 检查游戏状态
window.checkGameState()

// 2. 检查AI状态
console.log('AI启用:', window.battleAI.enabled)
console.log('AI控制阵营:', window.battleAI.faction)
console.log('当前玩家:', window.game.currentPlayer)
console.log('当前阶段:', window.game.currentPhase)

// 3. 查看单位状态
console.log('所有单位:', window.game.units)
console.log('迦太基单位:', window.game.units.filter(u => u.faction === 'carthage'))

// 4. 手动触发AI
window.triggerBattleAI()
```

## 💡 使用技巧

### 1. 观察学习模式
启用AI后，观察它的决策：
- 部署阵型
- 移动路线
- 目标选择
- 支援策略

学习后禁用AI，尝试自己操作！

### 2. 对战测试
- 罗马手动 vs 迦太基AI
- 看看能否战胜AI

### 3. 录制战斗
- 使用屏幕录制软件
- 记录AI的精彩战斗
- 分析改进点

### 4. 自定义挑战
- 使用"自定义战斗"模式
- 给AI劣势兵力
- 测试AI能否翻盘

## 📚 更多信息

详细文档：`战棋AI控制系统说明.md`

---

**祝游戏愉快！🎮**

