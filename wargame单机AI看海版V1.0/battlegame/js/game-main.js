/**
 * 巴卡：全面战争 - 主入口文件
 * 
 * 这个文件作为游戏的启动点，负责：
 * 1. 加载核心游戏代码
 * 2. 初始化游戏实例
 * 3. 全局错误处理
 */

// 加载核心游戏代码
// 注意：由于 game-core.js 很大且包含完整的 HexGame 类，
// 我们使用传统的 script 标签加载方式

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 巴卡：全面战争 - 游戏启动中...');
    
    // 检查 HexGame 类是否已加载
    if (typeof HexGame === 'undefined') {
        console.error('❌ HexGame 类未加载！请确保 game-core.js 已正确加载。');
        alert('游戏加载失败！请刷新页面重试。');
        return;
    }
    
    // 检查是否已经有游戏正在运行（防止重复初始化）
    if (window.gameStarted && window.game) {
        console.log('🎮 游戏已在运行，跳过模式选择');
        const gameModeModal = document.getElementById('game-mode-modal');
        gameModeModal.classList.remove('show');
        return;
    }
    
    // 🔗 检查是否为外部战斗模式
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('external') === 'true' || (window.BattleBridge && window.BattleBridge.isExternalMode)) {
        console.log('🔗 外部战斗模式，跳过模式选择');
        const gameModeModal = document.getElementById('game-mode-modal');
        gameModeModal.classList.remove('show');
        // BattleBridge会自动处理战斗启动
        return;
    }
    
    // 设置模式选择按钮事件
    setupModeSelectionListeners();
});

// 设置游戏模式选择监听器
function setupModeSelectionListeners() {
    const gameModeModal = document.getElementById('game-mode-modal');
    const customBattleModal = document.getElementById('custom-battle-modal');
    const defaultBattleBtn = document.getElementById('default-battle-btn');
    const customBattleBtn = document.getElementById('custom-battle-btn');
    const startCustomBattleBtn = document.getElementById('start-custom-battle-btn');
    const cancelCustomBattleBtn = document.getElementById('cancel-custom-battle-btn');
    
    // 默认战斗按钮
    defaultBattleBtn.addEventListener('click', function() {
        console.log('🎮 选择默认战斗模式');
        gameModeModal.classList.remove('show');
        startDefaultBattle();
    });
    
    // 自定义战斗按钮
    customBattleBtn.addEventListener('click', function() {
        console.log('⚙️ 选择自定义战斗模式');
        gameModeModal.classList.remove('show');
        customBattleModal.classList.add('show');
    });
    
    // 开始自定义战斗
    startCustomBattleBtn.addEventListener('click', function() {
        console.log('⚔️ 开始自定义战斗');
        const customConfig = getCustomBattleConfig();
        customBattleModal.classList.remove('show');
        startCustomBattle(customConfig);
    });
    
    // 取消自定义战斗
    cancelCustomBattleBtn.addEventListener('click', function() {
        customBattleModal.classList.remove('show');
        gameModeModal.classList.add('show');
    });
}

// 获取自定义战斗配置
function getCustomBattleConfig() {
    return {
        rome: {
            infantry: parseInt(document.getElementById('rome-infantry').value) || 0,
            lightCavalry: parseInt(document.getElementById('rome-light-cavalry').value) || 0,
            heavyCavalry: parseInt(document.getElementById('rome-heavy-cavalry').value) || 0,
            archers: parseInt(document.getElementById('rome-archers').value) || 0,
            generalLeadership: parseInt(document.getElementById('rome-general-leadership').value) || 9
        },
        carthage: {
            infantry: parseInt(document.getElementById('carthage-infantry').value) || 0,
            lightCavalry: parseInt(document.getElementById('carthage-light-cavalry').value) || 0,
            heavyCavalry: parseInt(document.getElementById('carthage-heavy-cavalry').value) || 0,
            archers: parseInt(document.getElementById('carthage-archers').value) || 0,
            generalLeadership: parseInt(document.getElementById('carthage-general-leadership').value) || 9
        }
    };
}

// 启动默认战斗
function startDefaultBattle() {
    try {
        window.game = new HexGame();
        window.gameStarted = true; // 标记游戏已开始
        console.log('✅ 默认游戏实例创建成功');
        console.log('📊 游戏状态:', {
            玩家: window.game.currentPlayer,
            阶段: window.game.currentPhase,
            网格尺寸: `${window.game.gridWidth}x${window.game.gridHeight}`
        });
        
        // 初始化AI控制器
        initializeBattleAI();
    } catch (error) {
        console.error('❌ 游戏初始化失败:', error);
        alert('游戏初始化失败！\n\n错误信息：' + error.message);
    }
}

// 启动自定义战斗
function startCustomBattle(config) {
    try {
        window.game = new HexGame(config);
        window.gameStarted = true; // 标记游戏已开始
        window.customBattleMode = true; // 标记为自定义模式
        console.log('✅ 自定义游戏实例创建成功');
        console.log('📊 自定义配置:', config);
        console.log('📊 游戏状态:', {
            玩家: window.game.currentPlayer,
            阶段: window.game.currentPhase,
            网格尺寸: `${window.game.gridWidth}x${window.game.gridHeight}`
        });
        
        // 初始化AI控制器
        initializeBattleAI();
    } catch (error) {
        console.error('❌ 自定义游戏初始化失败:', error);
        alert('游戏初始化失败！\n\n错误信息：' + error.message);
    }
}

// 全局错误处理
window.addEventListener('error', function(e) {
    console.error('🔥 全局错误:', {
        消息: e.message,
        文件: e.filename,
        行号: e.lineno,
        列号: e.colno,
        错误对象: e.error
    });
});

// 未处理的 Promise 错误
window.addEventListener('unhandledrejection', function(e) {
    console.error('🔥 未处理的 Promise 错误:', e.reason);
});

// 游戏实例可通过 window.game 访问
window.getGameInstance = function() {
    return window.game;
};

// 调试工具：检查游戏状态
window.checkGameState = function() {
    if (!window.game) {
        console.log('❌ 游戏未初始化');
        return;
    }
    console.log('🎮 游戏状态检查:');
    console.log('  - 当前玩家:', window.game.currentPlayer);
    console.log('  - 当前阶段:', window.game.currentPhase);
    console.log('  - 自定义配置:', window.game.customConfig ? '是' : '否');
    console.log('  - 单位数量:', window.game.units.length);
    console.log('  - 罗马单位:', window.game.units.filter(u => u.faction === 'rome').length);
    console.log('  - 迦太基单位:', window.game.units.filter(u => u.faction === 'carthage').length);
    if (window.game.customConfig) {
        console.log('  - 自定义配置详情:', window.game.customConfig);
    }
};

// 初始化战棋AI控制器
function initializeBattleAI() {
    // 初始化迦太基AI
    if (typeof BattleAIController === 'undefined') {
        console.warn('⚠️ BattleAIController 未加载');
    } else {
        // 创建迦太基AI实例
        window.battleAI = new BattleAIController(window.game);
        console.log('🤖 战棋AI控制器（迦太基）已初始化');
        
        // 设置迦太基AI切换按钮
        const aiToggleBtn = document.getElementById('ai-toggle-btn');
        if (aiToggleBtn) {
            aiToggleBtn.addEventListener('click', () => {
                window.battleAI.toggle();
            });
            console.log('✅ 迦太基AI切换按钮已绑定');
        }
    }
    
    // 初始化罗马AI
    if (typeof BattleAIControllerRome === 'undefined') {
        console.warn('⚠️ BattleAIControllerRome 未加载');
    } else {
        // 创建罗马AI实例
        window.battleAIRome = new BattleAIControllerRome(window.game);
        console.log('🤖 战棋AI控制器（罗马）已初始化');
        
        // 设置罗马AI切换按钮
        const aiToggleBtnRome = document.getElementById('ai-toggle-btn-rome');
        if (aiToggleBtnRome) {
            aiToggleBtnRome.addEventListener('click', () => {
                window.battleAIRome.toggle();
            });
            console.log('✅ 罗马AI切换按钮已绑定');
        }
    }
    
    // 监听阶段变化，在对应阵营回合自动执行AI
    const originalNextPhase = window.game.nextPhase;
    if (originalNextPhase) {
        window.game.nextPhase = function() {
            // 先执行原始的nextPhase
            const result = originalNextPhase.call(window.game);
            
            // 延迟后检查是否需要AI接管
            setTimeout(() => {
                if (window.battleAI && window.battleAI.shouldControl()) {
                    window.battleAI.takeTurn();
                }
                if (window.battleAIRome && window.battleAIRome.shouldControl()) {
                    window.battleAIRome.takeTurn();
                }
            }, 500);
            
            return result;
        };
        console.log('✅ AI自动执行已挂接到阶段切换');
    }
    
    // 在部署阶段确认后也触发AI
    const originalConfirmDeployment = window.game.confirmDeployment;
    if (originalConfirmDeployment) {
        window.game.confirmDeployment = function() {
            const result = originalConfirmDeployment.call(window.game);
            
            // 确认部署后触发AI（可能仍在部署阶段，也可能已进入移动阶段）
            setTimeout(() => {
                if (window.battleAI && window.battleAI.shouldControl()) {
                    window.battleAI.takeTurn();
                }
                if (window.battleAIRome && window.battleAIRome.shouldControl()) {
                    window.battleAIRome.takeTurn();
                }
            }, 500);
            
            return result;
        };
        console.log('✅ AI自动部署已挂接到确认部署');
    }
}

// 全局函数：手动触发AI
window.triggerBattleAI = function() {
    let triggered = false;
    
    if (window.battleAI && window.battleAI.enabled) {
        console.log('🎮 手动触发迦太基AI...');
        window.battleAI.takeTurn();
        triggered = true;
    }
    
    if (window.battleAIRome && window.battleAIRome.enabled) {
        console.log('🎮 手动触发罗马AI...');
        window.battleAIRome.takeTurn();
        triggered = true;
    }
    
    if (!triggered) {
        console.log('⚠️ AI未启用或未初始化');
    }
};

console.log('📦 game-main.js 已加载');
console.log('💡 提示: 使用 window.checkGameState() 检查游戏状态');
console.log('💡 提示: 使用 window.triggerBattleAI() 手动触发AI'); 