# main.js 待完成内容

## 当前进度

✅ **已添加到 main.js 的内容（约30个函数）：**

### 初始化和渲染
- initGame
- getCityCenter
- generateMap
- drawRoutes
- placeArmies

### 选择和交互
- selectCity
- selectArmy
- highlightPossibleMoves
- getConnectedCities

### 军队管理
- calculateCombatPower
- checkAndHandleArmyDestruction
- respawnRomanArmy
- getAllArmies
- getCurrentPlayerArmy

### UI显示
- showArmyDetails
- hideArmyDetails
- showCityDetails
- hideCityDetails

### 工具函数
- rollDice
- showDiceResult
- addLog
- updateUI
- updateFactionFunds
- calculateFactionScores
- updateFactionScores

### 游戏流程
- endTurn
- executeAction (占位)

---

## ⚠️ 还需要从 index.html 复制的代码

### 第1部分：游戏动作函数（约1500行）
从 index.html 的 `function executeMove()` 开始，复制以下所有函数到 main.js 末尾：

```
executeMove
executeHarass
executeDiplomacy
executeFortify
executeRecruit
executeReorganize
executeRaiseArmy
executeBorrow
executeRepay
```

### 第2部分：系统类（约2500行）
复制所有 class 定义：

```javascript
class BattleSystem { ... }
class CityArmyManager { ... }
class SiegeSystem { ... }
class CommanderManager { ... }
class CommanderSystem { ... }
class TimeSystem { ... }
```

### 第3部分：辅助函数（约500行）
复制剩余的辅助函数：

```
checkCityFactionByAttitude
canPersuadeCity
processActionResult
changeFaction
checkCityAttitudeAndFaction
calculateEconomicIncome
calculateMilitaryPayroll
handleDebtPenalties
handleSiegedArmiesMoralePenalty
checkAllSiegesAfterArmyRemoval
```

### 第4部分：会战和围城相关函数（约300行）
```
chooseDefenseAction
handleDefenderRetreat
handleDefenderSiege
closeDefenseChoice
chooseCityDestroy
nextBattlePhase
closeBattle
```

### 第5部分：城市状态和显示（约200行）
```
showCityStatus
closeCityStatus
```

### 第6部分：编辑器工具函数（约500行）
```
toggleEditMode
showEditInstructions
hideEditInstructions
toggleDebug
recalibrate
testAlignment
fixPositions
absoluteFix
diagnose
enableCityDragging
disableCityDragging
handleCityMouseDown
handleCityMouseMove
handleCityMouseUp
updateDebugPoints
saveCoordinates
loadCoordinates
exportCoordinates
exportCityArray
manualFixCoordinates
toggleMapControl
```

### 第7部分：游戏存储函数（约300行）
```
saveGame
loadGame
resetGame
testCommanderSystem
```

### 第8部分：页面卸载事件监听器
```javascript
// 在文件末尾添加
window.addEventListener('beforeunload', function() {
    // 自动保存坐标...
});
```

---

## 🚀 快速完成步骤

### 方法1：直接复制整个script内容（推荐）

1. 打开 `index.html`
2. 找到第692行（`// 初始化游戏`）
3. 选择从692行到5628行的所有内容
4. 复制并粘贴到 `js/main.js` 文件末尾
5. 删除 main.js 中重复的函数（已添加的30个函数）
6. 保存文件

### 方法2：逐部分复制

按照上面列出的8个部分，逐个从 index.html 复制到 main.js。

---

## ✅ 完成后的验证

复制完成后，main.js 应该包含：
- [ ] 所有game执行函数
- [ ] 所有System类定义
- [ ] 所有辅助和工具函数
- [ ] 编辑器工具函数
- [ ] 存储相关函数
- [ ] 事件监听器

文件大小约：**200KB+**

---

## 📝 注意事项

1. **不要**复制 gameState、cities、routes、armies 的定义（已在 gameData.js 中）
2. **确保**所有函数和类都完整复制
3. **保留**所有注释，方便理解代码
4. **检查**是否有语法错误 