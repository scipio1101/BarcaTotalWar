# AI移动规划调试增强说明

## 问题描述

AI在规划移动时出现步骤添加失败的问题：
- 第1步就添加失败，显示"没有成功添加任何步骤"
- moveState变为none导致失败
- 有"目标位置与已规划的移动冲突"的警告

## 添加的调试功能

### 1. Console输出捕获系统

在AI控制器中添加了console日志捕获功能：

```javascript
// 在constructor中初始化
this.capturedLogs = [];
this.setupConsoleCapture();

// 捕获console.log输出
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
```

**作用**：捕获游戏内部的console.log输出，特别是那些说明移动失败原因的日志。

### 2. 点击前状态诊断

在点击每个移动目标格子之前，记录完整的状态信息：

```javascript
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

this.log(`[点击前] 第${i+1}步: pos=${diagInfo.pos}, moveState=${diagInfo.moveState}, phase=${diagInfo.currentPhase}, 目标有单位=${diagInfo.hasUnitAtTarget}`, 'info');
```

**输出信息**：
- 目标位置坐标
- 单位当前位置
- moveState状态
- currentPhase阶段
- 目标位置是否有单位
- 如果有单位，显示单位名称

### 3. 点击后状态追踪

点击后立即记录状态变化：

```javascript
if (waitCount === 0) {
    this.log(`[点击后] moveState=${currentMoveState}, planLength=${currentPlanLength}`, 'info');
}
```

并追踪状态变化：

```javascript
if (currentMoveState !== previousState) {
    if (!stateChangeDetected) {
        this.log(`[状态变化] moveState: ${previousState} → ${currentMoveState}`, 'info');
        stateChangeDetected = true;
    }
}
```

### 4. 失败时的详细诊断

当移动步骤添加失败时，输出完整的诊断信息：

```javascript
this.log(`[超时] 等待${waitCount}次循环(${waitCount*100}ms)后仍未更新`, 'error');
this.log(`[最终状态] moveState=${this.game.moveState}, planLength=${this.game.movePlan ? this.game.movePlan.length : 'null'}`, 'error');
this.log(`❌ 第${i+1}步添加失败`, 'error');
this.log(`位置: (${step.x}, ${step.y})`, 'error');
this.log(`起点: ${i === 0 ? diagInfo.unitPos : `(${steps[i-1].x}, ${steps[i-1].y})`}`, 'error');
this.log(`距离: ${currentDist.toFixed(2)}格 (移动力:${this.getUnitMoveDistance(unit)})`, 'error');
this.log(`状态: ${this.game.moveState}`, 'error');
this.log(`movePlan长度: ${this.game.movePlan ? this.game.movePlan.length : 'null'}`, 'error');

// 输出游戏console的最近日志
const recentLogs = this.getRecentConsoleLogs(8);
if (recentLogs.length > 0) {
    this.log(`[游戏Console输出]:`, 'error');
    recentLogs.forEach(logMsg => {
        this.log(`  ${logMsg}`, 'error');
    });
}
```

**关键新增**：输出游戏内部console.log的最近8条日志，这些日志通常包含游戏拒绝移动的具体原因。

## 使用方法

### 运行游戏并观察日志

启动游戏后，在AI执行移动阶段时，浏览器控制台会输出详细的诊断信息。

### 日志格式示例

**成功的情况**：
```
└─ [点击前] 第1步: pos=(50, 35), moveState=unit_selected, phase=movement, 目标有单位=false
└─ [点击后] moveState=planning, planLength=1
└─ [成功] movePlan已更新: 0 → 1
└─ 第1步已添加 (50, 35)
```

**失败的情况**：
```
└─ [点击前] 第1步: pos=(50, 35), moveState=unit_selected, phase=movement, 目标有单位=true(罗马步兵)
└─ [点击后] moveState=unit_selected, planLength=0
└─ [超时] 等待15次循环(1500ms)后仍未更新
└─ [最终状态] moveState=unit_selected, planLength=0
└─ ❌ 第1步添加失败
   位置: (50, 35)
   起点: (48, 39)
   距离: 4.47格 (移动力:6)
   状态: unit_selected
   movePlan长度: 0
   [游戏Console输出]:
     点击位置: (50, 35), 当前阶段: movement
     点击位置的单位: 罗马步兵
```

## 问题定位

根据日志输出，可以快速定位问题：

### 1. 目标位置有单位

如果日志显示`目标有单位=true`，说明AI计算的目标位置上已经有单位了（可能是己方单位或敌方单位）。

**原因**：路径规划算法没有正确避开已占用的位置。

**解决方案**：修改`calculateThreeStepPath`函数，确保不选择已被占用的位置。

### 2. moveState没有变化

如果点击后`moveState`保持为`unit_selected`，没有变为`planning`，说明游戏拒绝了这次移动。

**原因**：查看游戏Console输出，通常会显示拒绝原因，如：
- "无法移动到该位置: 距离超出移动力"
- "无法移动到该位置: 位置已被占用"
- "无法移动到该位置: 目标位置与已规划的移动冲突"

### 3. currentPhase不是movement

如果`currentPhase`不是`movement`，点击不会触发移动规划。

**原因**：AI可能在错误的阶段尝试移动，或者阶段已经切换了。

## 下一步排查

根据新增的调试信息，你可以：

1. **检查游戏Console输出**：最重要的是看游戏内部输出的拒绝原因
2. **验证目标位置**：确认计算的目标位置是否合理
3. **检查状态转换**：确认moveState的变化是否符合预期
4. **分析时序问题**：如果状态变化太快，可能需要调整等待时间

## 技术细节

### handleSquareClick逻辑（game-core.js）

游戏处理点击的逻辑：

```javascript
case 'unit_selected':
    if (clickedUnit && clickedUnit.faction === this.currentPlayer) {
        // 重新选择己方单位
        this.selectUnit(clickedUnit);
    } else if (clickedUnit && clickedUnit.faction !== this.currentPlayer) {
        // 选择攻击目标
        this.selectAttackTarget(clickedUnit);
    } else if (!clickedUnit && this.currentPhase === 'movement') {
        // 开始移动规划（仅在移动阶段且没有单位时）
        this.startMovePlanning(x, y);
    }
    break;
```

**关键条件**：
- `!clickedUnit`：目标位置没有单位
- `this.currentPhase === 'movement'`：当前是移动阶段

只有同时满足这两个条件，才会调用`startMovePlanning`开始移动规划。

### startMovePlanning逻辑

```javascript
startMovePlanning(x, y) {
    const validityCheck = this.checkMoveValidity(this.selectedUnit, x, y, 0);
    if (!validityCheck.valid) {
        console.log('无法移动到该位置:', validityCheck.reason);
        this.addGameLog(`⚠️ 无法移动到该位置: ${validityCheck.reason}`);
        return;
    }
    
    this.movePlan = [{
        startX: this.selectedUnit.x,
        startY: this.selectedUnit.y,
        endX: x,
        endY: y
    }];
    this.currentPlanStep = 0;
    this.moveState = 'planning';
    // ...
}
```

如果`checkMoveValidity`返回`valid: false`，会通过console.log输出拒绝原因，我们的调试系统会捕获这个输出。

## 总结

新增的调试功能可以：
1. ✅ 捕获游戏内部console输出，看到拒绝移动的具体原因
2. ✅ 记录点击前后的完整状态
3. ✅ 追踪moveState的变化
4. ✅ 检测目标位置是否有单位
5. ✅ 提供详细的失败诊断信息

通过这些信息，应该能够快速定位移动规划失败的根本原因。

