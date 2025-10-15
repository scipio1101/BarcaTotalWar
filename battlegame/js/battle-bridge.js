/**
 * 战斗系统桥接模块
 * 用于连接主游戏和战斗系统
 */

// 战斗桥接对象
window.BattleBridge = {
    // 外部传入的战斗配置
    externalBattleData: null,
    
    // 是否为外部调用模式
    isExternalMode: false,
    
    // 父窗口引用
    parentWindow: null,
    
    /**
     * 初始化外部战斗模式
     * @param {Object} battleData - 战斗数据
     * @param {Object} battleData.attacker - 攻击方数据
     * @param {Object} battleData.defender - 防御方数据
     * @param {string} battleData.cityName - 战斗城市名称
     */
    initExternalBattle: function(battleData) {
        console.log('🔗 战斗桥接：接收外部战斗数据', battleData);
        this.externalBattleData = battleData;
        this.isExternalMode = true;
        
        // 转换为战斗系统格式
        const config = this.convertToBattleConfig(battleData);
        
        // 启动自定义战斗
        if (typeof startCustomBattle === 'function') {
            startCustomBattle(config);
        } else {
            console.error('❌ startCustomBattle 函数未定义');
        }
    },
    
    /**
     * 将主游戏军队数据转换为战斗系统配置
     */
    convertToBattleConfig: function(battleData) {
        const attacker = battleData.attacker;
        const defender = battleData.defender;
        
        // 确定罗马和迦太基方
        let romeData, carthageData;
        if (attacker.faction === 'rome') {
            romeData = attacker;
            carthageData = defender;
        } else {
            romeData = defender;
            carthageData = attacker;
        }
        
        const config = {
            rome: {
                // 步兵 = 重步兵
                infantry: romeData.heavyInfantry || 0,
                // 轻骑兵
                lightCavalry: romeData.lightCavalry || 0,
                // 重骑兵
                heavyCavalry: romeData.heavyCavalry || 0,
                // 弓箭兵 = 轻装步兵
                archers: romeData.lightInfantry || 0,
                // 将领军事值
                generalLeadership: romeData.military || 7
            },
            carthage: {
                infantry: carthageData.heavyInfantry || 0,
                lightCavalry: carthageData.lightCavalry || 0,
                heavyCavalry: carthageData.heavyCavalry || 0,
                archers: carthageData.lightInfantry || 0,
                generalLeadership: carthageData.military || 7
            },
            cityName: battleData.cityName || '未知城市',
            isExternalMode: true
        };
        
        console.log('📊 转换后的战斗配置:', config);
        return config;
    },
    
    /**
     * 战斗结束，返回结果
     */
    returnBattleResult: function(winner, romePoints, carthagePoints, romePercentage, carthagePercentage) {
        console.log('🏆 战斗结束，准备返回结果:', {
            winner,
            romePoints,
            carthagePoints,
            romePercentage,
            carthagePercentage
        });
        
        if (!this.isExternalMode) {
            console.log('ℹ️ 非外部模式，不返回结果');
            return;
        }
        
        // 检查外部战斗数据是否存在
        if (!this.externalBattleData) {
            console.warn('⚠️ 外部战斗数据不存在，无法返回结果');
            console.log('ℹ️ 这可能是独立战斗模式，跳过结果返回');
            return;
        }
        
        const battleResult = {
            winner: winner,
            romePoints: romePoints,
            carthagePoints: carthagePoints,
            romePercentage: romePercentage,
            carthagePercentage: carthagePercentage,
            // 包含原始军队数据用于主游戏识别
            attackerData: this.externalBattleData.attacker,
            defenderData: this.externalBattleData.defender,
            timestamp: new Date().toISOString()
        };
        
        // 如果在iframe中，向父窗口发送消息
        if (window.parent && window.parent !== window) {
            console.log('📤 向父窗口发送战斗结果');
            window.parent.postMessage({
                type: 'BATTLE_RESULT',
                result: battleResult
            }, '*');
        }
        
        // 如果在新窗口中，使用opener
        if (window.opener) {
            console.log('📤 向opener窗口发送战斗结果');
            window.opener.postMessage({
                type: 'BATTLE_RESULT',
                result: battleResult
            }, '*');
        }
        
        return battleResult;
    }
};

// 监听来自父窗口的消息
window.addEventListener('message', function(event) {
    console.log('📨 收到消息:', event.data);
    
    if (event.data.type === 'START_BATTLE') {
        // 接收战斗数据并启动战斗
        window.BattleBridge.initExternalBattle(event.data.battleData);
    }
});

// URL参数检测
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const externalMode = urlParams.get('external');
    
    if (externalMode === 'true') {
        console.log('🔗 检测到外部模式参数');
        
        // 尝试从sessionStorage获取战斗数据
        const battleDataStr = sessionStorage.getItem('pendingBattle');
        if (battleDataStr) {
            try {
                const battleData = JSON.parse(battleDataStr);
                console.log('📦 从sessionStorage加载战斗数据');
                sessionStorage.removeItem('pendingBattle'); // 清除数据
                // 只有在成功加载战斗数据后才设置外部模式
                window.BattleBridge.initExternalBattle(battleData);
            } catch (e) {
                console.error('❌ 解析战斗数据失败:', e);
                console.warn('⚠️ 将继续以独立模式运行');
            }
        } else {
            console.warn('⚠️ 未找到战斗数据，将以独立模式运行');
        }
    }
});

console.log('🔗 battle-bridge.js 已加载'); 