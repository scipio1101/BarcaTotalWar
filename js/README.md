# JavaScript 模块化说明

## 模块结构

项目JavaScript代码已按功能模块化，分为以下文件：

### 1. 数据模块
- **gameData.js** - 游戏数据（游戏状态、城市、路线、军队）

### 2. 工具模块
- **utils.js** - 工具函数（骰子、日志、辅助函数）

### 3. 系统模块
- **timeSystem.js** - 时间系统
- **commanderSystem.js** - 指挥官系统
- **battleSystem.js** - 会战系统
- **siegeSystem.js** - 围城系统
- **cityArmyManager.js** - 城市军队管理系统

### 4. 渲染模块
- **mapRenderer.js** - 地图渲染
- **uiManager.js** - UI管理

### 5. 游戏逻辑模块
- **gameActions.js** - 游戏动作（移动、围城、骚扰、游说等）
- **gameCore.js** - 核心游戏逻辑（初始化、回合管理、分数计算）

### 6. 编辑器模块
- **editorTools.js** - 地图编辑工具

## 引入顺序

在HTML中按以下顺序引入模块：

```html
<!-- 1. 数据模块 -->
<script src="js/gameData.js"></script>

<!-- 2. 工具模块 -->
<script src="js/utils.js"></script>

<!-- 3. 系统模块 -->
<script src="js/timeSystem.js"></script>
<script src="js/commanderSystem.js"></script>
<script src="js/cityArmyManager.js"></script>
<script src="js/siegeSystem.js"></script>
<script src="js/battleSystem.js"></script>

<!-- 4. 渲染模块 -->
<script src="js/mapRenderer.js"></script>
<script src="js/uiManager.js"></script>

<!-- 5. 游戏逻辑模块 -->
<script src="js/gameActions.js"></script>
<script src="js/gameCore.js"></script>

<!-- 6. 编辑器模块 -->
<script src="js/editorTools.js"></script>

<!-- 7. 初始化 -->
<script>
    // 游戏初始化
    window.addEventListener('DOMContentLoaded', () => {
        initGame();
    });
</script>
```

## 模块依赖关系

- gameData.js - 无依赖
- utils.js - 依赖 gameData.js
- 系统模块 - 依赖 gameData.js, utils.js
- 渲染模块 - 依赖 gameData.js, utils.js, 系统模块
- 游戏逻辑模块 - 依赖所有上述模块
- 编辑器模块 - 依赖 gameData.js, mapRenderer.js

## 注意事项

1. 所有模块使用全局作用域，确保跨模块访问
2. 保持引入顺序，避免依赖问题
3. 系统类使用class声明，函数使用function声明 