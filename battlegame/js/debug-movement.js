/**
 * 移动系统诊断脚本
 * 在浏览器控制台运行此脚本来诊断移动执行问题
 */

window.debugMovement = function() {
    console.log('=== 移动系统诊断 ===');
    
    // 1. 检查游戏对象
    if (!window.game) {
        console.error('❌ window.game 不存在');
        return;
    }
    console.log('✅ game对象存在');
    
    // 2. 检查移动计划
    if (!window.game.allUnitPlans) {
        console.error('❌ allUnitPlans 不存在');
        return;
    }
    console.log(`✅ allUnitPlans存在，大小: ${window.game.allUnitPlans.size}`);
    
    // 3. 检查DOM元素
    const board = document.getElementById('battlefield');
    if (!board) {
        console.error('❌ battlefield元素不存在');
        return;
    }
    console.log('✅ battlefield元素存在');
    
    // 4. 列出所有单位计划
    let index = 0;
    for (const [unitId, planData] of window.game.allUnitPlans.entries()) {
        const unit = window.game.units.find(u => u.id === unitId);
        if (unit) {
            console.log(`单位 ${index++}: ${unit.name} (${unitId})`);
            console.log(`  - 位置: (${unit.x}, ${unit.y})`);
            console.log(`  - 计划步数: ${planData.plan ? planData.plan.length : 0}`);
            if (planData.plan && planData.plan.length > 0) {
                console.log(`  - 第一步: (${unit.x}, ${unit.y}) → (${planData.plan[0].endX}, ${planData.plan[0].endY})`);
            }
        } else {
            console.warn(`⚠️ 找不到单位: ${unitId}`);
        }
    }
    
    // 5. 检查是否有动画正在进行
    const animatingUnits = window.game.units.filter(u => u.isAnimating);
    if (animatingUnits.length > 0) {
        console.warn(`⚠️ 有${animatingUnits.length}个单位正在动画中，可能已卡住`);
        animatingUnits.forEach(u => {
            console.log(`  - ${u.name}: isAnimating=${u.isAnimating}`);
            u.isAnimating = false; // 清除标志
        });
    }
    
    // 6. 检查动画元素
    const animElements = document.querySelectorAll('[id^="unit-anim-"]');
    if (animElements.length > 0) {
        console.warn(`⚠️ 发现${animElements.length}个残留的动画元素`);
        animElements.forEach(el => {
            console.log(`  - 移除: ${el.id}`);
            el.remove();
        });
    }
    
    console.log('=== 诊断完成 ===');
    console.log('💡 提示：如果移动卡住，可以运行 window.forceNextPhase() 强制进入下一阶段');
};

// 强制进入下一阶段的函数
window.forceNextPhase = function() {
    if (!window.game) {
        console.error('❌ game对象不存在');
        return;
    }
    
    // 清理所有动画
    window.game.units.forEach(u => u.isAnimating = false);
    document.querySelectorAll('[id^="unit-anim-"]').forEach(el => el.remove());
    
    // 进入下一阶段
    console.log('🚀 强制进入下一阶段...');
    window.game.nextPhase();
};

console.log('💡 移动诊断工具已加载');
console.log('💡 运行 window.debugMovement() 进行诊断');
console.log('💡 运行 window.forceNextPhase() 强制进入下一阶段');

