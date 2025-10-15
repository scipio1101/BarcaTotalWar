/**
 * 战斗系统集成模块
 * 用于启动外部战斗系统并接收战斗结果
 */

window.BattleSystemIntegration = {
    // 战斗窗口引用
    battleWindow: null,
    
    // 当前战斗数据
    currentBattleData: null,
    
    // 战斗结果回调
    battleResultCallback: null,
    
    /**
     * 启动战斗系统
     * @param {Object} attacker - 攻击方军队数据
     * @param {Object} defender - 防御方军队数据
     * @param {string} cityName - 战斗城市名称
     * @param {Function} callback - 战斗结束回调函数
     */
    startBattle: function(attacker, defender, cityName, callback) {
        console.log('⚔️ 启动战斗系统', { attacker, defender, cityName });
        
        // 保存战斗数据和回调
        this.currentBattleData = {
            attacker: this.convertArmyData(attacker),
            defender: this.convertArmyData(defender),
            cityName: cityName
        };
        this.battleResultCallback = callback;
        
        // 将战斗数据存储到sessionStorage
        sessionStorage.setItem('pendingBattle', JSON.stringify(this.currentBattleData));
        
        // 打开战斗系统窗口
        const battleUrl = 'battlegame/index-modular.html?external=true';
        this.battleWindow = window.open(battleUrl, 'BattleWindow', 'width=1400,height=900,resizable=yes,scrollbars=yes');
        
        if (!this.battleWindow) {
            alert('无法打开战斗窗口，请检查浏览器弹窗设置');
            console.error('❌ 无法打开战斗窗口');
            return false;
        }
        
        console.log('✅ 战斗窗口已打开');
        return true;
    },
    
    /**
     * 将军队数据转换为战斗系统格式
     */
    convertArmyData: function(army) {
        return {
            id: army.id,
            commander: army.commander,
            faction: army.faction,
            military: army.military || 7,
            political: army.political || 7,
            diplomatic: army.diplomatic || 7,
            lightCavalry: army.lightCavalry || 0,
            heavyCavalry: army.heavyCavalry || 0,
            heavyInfantry: army.heavyInfantry || 0,
            lightInfantry: army.lightInfantry || 0,
            morale: army.morale || 5.0
        };
    },
    
    /**
     * 接收战斗结果
     */
    receiveBattleResult: function(result) {
        console.log('🏆 收到战斗结果:', result);
        
        // 关闭战斗窗口
        if (this.battleWindow && !this.battleWindow.closed) {
            this.battleWindow.close();
        }
        
        // 调用回调函数
        if (this.battleResultCallback) {
            this.battleResultCallback(result);
        }
        
        // 清理数据
        this.currentBattleData = null;
        this.battleResultCallback = null;
        sessionStorage.removeItem('pendingBattle');
    }
};

// 监听来自战斗系统的消息
window.addEventListener('message', function(event) {
    console.log('📨 主游戏收到消息:', event.data);
    
    if (event.data.type === 'BATTLE_RESULT') {
        window.BattleSystemIntegration.receiveBattleResult(event.data.result);
    }
});

console.log('🔗 战斗系统集成模块已加载'); 