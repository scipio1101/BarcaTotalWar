
// 军队行动管理系统
class ArmyActionManager {
    // 保存军队行动结果（用于tooltip显示）
    static saveActionResult(army, action, success, description) {
        if (!army) return;
        
        army.actionResult = {
            action: action,           // 行动类型（中文）
            success: success,         // 是否成功
            description: description, // 详细描述
            timestamp: Date.now()     // 时间戳
        };
    }
    
    // 清除所有军队的行动结果（回合结束时调用）
    static clearAllActionResults() {
        ['rome', 'carthage', 'macedonia', 'seleucid', 'ptolemy'].forEach(faction => {
            if (armies[faction]) {
                armies[faction].forEach(army => {
                    delete army.actionResult;
                });
            }
        });
    }
    
    // 初始化回合，设置本回合可行动的军队
    static initializeTurn() {
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        
        // 重置行动状态
        gameState.actedArmies = [];
        gameState.availableArmies = currentArmies.map(army => army.id);
        gameState.currentArmyIndex = 0;
        
        // 重新渲染军队标记，显示正确的inactive状态
        placeArmies();
        
        // 更新UI显示
        this.updateArmyActionUI();
        
        // 如果没有军队，直接提示
        if (currentArmies.length === 0) {
            // addLog('当前阵营没有军队，请先组建军队或直接结束回合', 'warning');
        } else {
            // addLog(`本回合有 ${currentArmies.length} 支军队可以行动`, 'system');
            
            // 自动选中第一支军队
            const firstArmy = currentArmies[0];
            if (firstArmy) {
                gameState.selectedArmy = firstArmy.id;
                setTimeout(() => {
                    const armyMarker = document.querySelector(`.army-marker[data-army-id="${firstArmy.id}"]`);
                    if (armyMarker) {
                        armyMarker.classList.add('selected');
                        armyMarker.style.zIndex = '100000';
                    }
                }, 100);
            }
        }
    }
    
    // 标记当前军队已行动
    static markCurrentArmyActed() {
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        
        if (gameState.currentArmyIndex < currentArmies.length) {
            const army = currentArmies[gameState.currentArmyIndex];
            if (army && !gameState.actedArmies.includes(army.id)) {
                gameState.actedArmies.push(army.id);
                
            }
        }
        
        // 自动切换到下一支军队
        this.nextArmy();
    }
    
    // 标记指定军队已行动（用于延迟标记的情况，如围城）
    static markArmyActed(armyId) {
        if (!armyId) return;
        
        // 检查军队是否已经被标记
        if (gameState.actedArmies.includes(armyId)) {
            console.log(`[markArmyActed] 军队${armyId}已经被标记过了`);
            return;
        }
        
        // 查找军队对象
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        const army = currentArmies.find(a => a.id === armyId);
        
        if (army) {
            gameState.actedArmies.push(army.id);
            
            
            // 更新UI
            this.updateArmyActionUI();
            
            // 如果这是当前应该行动的军队，自动切换到下一支
            if (gameState.currentArmyIndex < currentArmies.length) {
                const currentArmy = currentArmies[gameState.currentArmyIndex];
                if (currentArmy && currentArmy.id === armyId) {
                    this.nextArmy();
                }
            }
        } else {
            console.log(`[markArmyActed] 找不到军队${armyId}`);
        }
    }
    
    // 跳过当前军队
    static skipCurrentArmy() {
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        
        if (gameState.currentArmyIndex < currentArmies.length) {
            const army = currentArmies[gameState.currentArmyIndex];
            if (army) {
                // 标记为已行动（跳过也算行动）
                if (!gameState.actedArmies.includes(army.id)) {
                    gameState.actedArmies.push(army.id);
                }
                addLog(`跳过 ${army.commander} 的行动`, 'system');
            }
        }
        
        this.nextArmy();
    }
    
    // 切换到下一支军队
    static nextArmy() {
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        
        gameState.currentArmyIndex++;
        
        // 清除当前选择
        gameState.selectedArmy = null;
        gameState.selectedRegion = null;
        document.querySelectorAll('.city.selected').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.army-marker.selected').forEach(marker => marker.classList.remove('selected'));
        document.querySelectorAll('.route.active').forEach(r => r.classList.remove('active'));
        
        // 检查是否所有军队都已行动
        if (gameState.currentArmyIndex >= currentArmies.length) {
           
            // 重新渲染军队标记，清除所有inactive状态
            placeArmies();
            this.updateArmyActionUI();
            return;
        }
        
        // 重新渲染军队标记，更新inactive状态
        placeArmies();
        
        // 高亮显示下一支可行动的军队
        const nextArmy = currentArmies[gameState.currentArmyIndex];
        if (nextArmy) {
            // addLog(`当前可操作军队: ${nextArmy.commander} (位于 ${cities.find(c => c.id === nextArmy.location)?.name || '未知'})`, 'info');
            
            // 自动选中这支军队
            gameState.selectedArmy = nextArmy.id;
            
            // 高亮显示这支军队
            setTimeout(() => {
                const armyMarker = document.querySelector(`.army-marker[data-army-id="${nextArmy.id}"]`);
                if (armyMarker) {
                    armyMarker.classList.add('selected');
                    armyMarker.style.zIndex = '100000';  // 确保选中的军队z-index最高
                    armyMarker.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
        
        this.updateArmyActionUI();
    }
    
    // 获取当前应该操作的军队
    static getCurrentActionArmy() {
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        
        if (gameState.currentArmyIndex < currentArmies.length) {
            return currentArmies[gameState.currentArmyIndex];
        }
        
        return null;
    }
    
    // 检查当前军队是否已行动
    static hasCurrentArmyActed() {
        const army = this.getCurrentActionArmy();
        return army ? gameState.actedArmies.includes(army.id) : true;
    }
    
    // 检查是否所有军队都已行动
    static allArmiesActed() {
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        return gameState.currentArmyIndex >= currentArmies.length;
    }
    
    // 更新军队行动状态UI
    static updateArmyActionUI() {
        const panel = document.getElementById('armyActionPanel');
        if (!panel) return;
        
        const currentPlayer = gameState.currentPlayer;
        const currentArmies = armies[currentPlayer] || [];
        let playerName = '未知';
        if (currentPlayer === 'rome') playerName = '罗马';
        else if (currentPlayer === 'carthage') playerName = '迦太基';
        else if (currentPlayer === 'macedonia') playerName = '马其顿';
        else if (currentPlayer === 'seleucid') playerName = '塞琉古';
        else if (currentPlayer === 'ptolemy') playerName = '托勒密';
        
        let html = `<h4>${playerName} 军队行动状态</h4>`;
        
        if (currentArmies.length === 0) {
            html += '<div class="no-armies">无可用军队</div>';
        } else {
            html += '<div class="army-action-list">';
            
            currentArmies.forEach((army, index) => {
                const acted = gameState.actedArmies.includes(army.id);
                const isCurrent = index === gameState.currentArmyIndex;
                const cityName = cities.find(c => c.id === army.location)?.name || '未知';
                
                const statusClass = acted ? 'acted' : (isCurrent ? 'current' : 'pending');
                const statusText = acted ? '✓ 已行动' : (isCurrent ? '► 当前' : '待命');
                
                html += `
                    <div class="army-action-item ${statusClass}">
                        <span class="army-name">${army.commander}</span>
                        <span class="army-location">${cityName}</span>
                        <span class="army-status">${statusText}</span>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // 显示进度
            const actedCount = gameState.actedArmies.length;
            const totalCount = currentArmies.length;
            html += `<div class="action-progress">进度: ${actedCount}/${totalCount}</div>`;
        }
        
        panel.innerHTML = html;
    }
}

// 编辑模式功能
function toggleEditMode() {
    gameState.editMode = !gameState.editMode;
    const mapContainer = document.getElementById('mapContainer');
    const editBtn = document.getElementById('editModeBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (gameState.editMode) {
        mapContainer.classList.add('edit-mode');
            editBtn.textContent = '退出编辑模式';
        editBtn.style.backgroundColor = '#e74c3c';
        saveBtn.disabled = false;
        addLog('进入坐标编辑模式 - 拖拽城市图标调整位置');
        
        // 显示编辑说明
        showEditInstructions();
        
        // 为所有城市添加拖拽功能
        enableCityDragging();
    } else {
        mapContainer.classList.remove('edit-mode');
        editBtn.textContent = '调整坐标';
        editBtn.style.backgroundColor = '#3498db';
        saveBtn.disabled = true;
        addLog('退出坐标编辑模式');
        
        // 移除编辑说明
        hideEditInstructions();
        
        // 移除拖拽功能
        disableCityDragging();
        
        // 自动保存坐标
        saveCoordinates(true);
    }
}

// 显示编辑说明
function showEditInstructions() {
    const controlPanel = document.querySelector('.control-panel');
    const instructions = document.createElement('div');
    instructions.id = 'editInstructions';
    instructions.className = 'edit-instructions';
    instructions.innerHTML = '🖱拖拽城市图标调整位置<br>📍 路径会自动更正<br>💾 完成后点击保存坐标';
    controlPanel.insertBefore(instructions, controlPanel.firstChild);
}

// 隐藏编辑说明
function hideEditInstructions() {
    const instructions = document.getElementById('editInstructions');
    if (instructions) {
        instructions.remove();
    }
}

// 调试模式切换
function toggleDebug() {
    gameState.debugMode = !gameState.debugMode;
    const mapContainer = document.getElementById('mapContainer');
    
    if (gameState.debugMode) {
        // 显示调试模式
        cities.forEach(city => {
            const center = getCityCenter(city);
            const debugPoint = document.createElement('div');
            debugPoint.className = 'debug-point';
            debugPoint.style.left = (center.x - 2) + 'px';
            debugPoint.style.top = (center.y - 2) + 'px';
            debugPoint.title = `${city.name} 中心(${center.x}, ${center.y})`;
            mapContainer.appendChild(debugPoint);
        });
        addLog('调试模式已开启 - 显示城市中心点');
    } else {
        // 移除调试模式
        mapContainer.querySelectorAll('.debug-point').forEach(point => point.remove());
        addLog('调试模式已关闭');
    }
}

// 重新校准所有位置
function recalibrate() {
    generateMap();
    drawRoutes();
    addLog('已重新校准城市位置和道路连接');
    
    // 如果调试模式开启，更新调试模式
    if (gameState.debugMode) {
        const mapContainer = document.getElementById('mapContainer');
        mapContainer.querySelectorAll('.debug-point').forEach(point => point.remove());
        cities.forEach(city => {
            const center = getCityCenter(city);
            const debugPoint = document.createElement('div');
            debugPoint.className = 'debug-point';
            debugPoint.style.left = (center.x - 2) + 'px';
            debugPoint.style.top = (center.y - 2) + 'px';
            debugPoint.title = `${city.name} 中心(${center.x}, ${center.y})`;
            mapContainer.appendChild(debugPoint);
        });
    }
}

// 测试城市和路径对齐
function testAlignment() {
    addLog('开始测试城市和路径对齐...');
    
    // 检查地图容器的状态
    const mapContainer = document.getElementById('mapContainer');
    const mapRect = mapContainer.getBoundingClientRect();
    const containerStyle = getComputedStyle(mapContainer);
    console.log('地图容器信息:', {
        width: mapRect.width,
        height: mapRect.height,
        transform: containerStyle.transform,
        backgroundSize: containerStyle.backgroundSize,
        backgroundPosition: containerStyle.backgroundPosition,
        overflow: containerStyle.overflow,
        position: containerStyle.position
    });
    
    // 检查几条主要路径
    const testRoutes = [
        ['rome', 'capua'],
        ['newcarthage', 'sagunto'],
        ['carthage', 'utica']
    ];
    
    testRoutes.forEach(route => {
        const city1 = cities.find(c => c.id === route[0]);
        const city2 = cities.find(c => c.id === route[1]);
        
        if (city1 && city2) {
            const center1 = getCityCenter(city1);
            const center2 = getCityCenter(city2);
            
            console.log(`路径 ${city1.name} -> ${city2.name}:`);
            console.log(`  ${city1.name} 中心: (${center1.x}, ${center1.y})`);
            console.log(`  ${city2.name} 中心: (${center2.x}, ${center2.y})`);
            
            // 检查城市图标实际位置
            const cityElement1 = document.getElementById(city1.id);
            const cityElement2 = document.getElementById(city2.id);
            
            if (cityElement1 && cityElement2) {
                const mapContainer = document.getElementById('mapContainer');
                const mapRect = mapContainer.getBoundingClientRect();
                
                const rect1 = cityElement1.getBoundingClientRect();
                const rect2 = cityElement2.getBoundingClientRect();
                
                // 计算相对于地图容器的位置
                const relativeX1 = rect1.left - mapRect.left + rect1.width/2;
                const relativeY1 = rect1.top - mapRect.top + rect1.height/2;
                const relativeX2 = rect2.left - mapRect.left + rect2.width/2;
                const relativeY2 = rect2.top - mapRect.top + rect2.height/2;
                
                console.log(`  ${city1.name} 图标中心: (${relativeX1}, ${relativeY1})`);
                console.log(`  ${city2.name} 图标中心: (${relativeX2}, ${relativeY2})`);
                
                // 显示CSS定位  
                console.log(`  ${city1.name} CSS位置: left=${cityElement1.style.left}, top=${cityElement1.style.top}`);
                console.log(`  ${city2.name} CSS位置: left=${cityElement2.style.left}, top=${cityElement2.style.top}`);
            }
        }
    });
    
    addLog('对齐测试完成，请查看控制台详细信息');
}

// 修复城市位置
function fixPositions() {
    addLog('正在修复城市位置...');
    
    cities.forEach(city => {
        const cityElement = document.getElementById(city.id);
        if (cityElement) {
            // 直接使用简单的中心对齐，不考虑缩放
            const width = 12;  // 基础宽度
            const height = 14; // 基础高度
            
            cityElement.style.left = (city.x - width / 2) + 'px';
            cityElement.style.top = (city.y - height / 2) + 'px';
            
            // 移除任何可能的变量
            if (city.important) {
                cityElement.style.transform = 'scale(1.2)';
                cityElement.style.transformOrigin = 'center center';
            } else {
                cityElement.style.transform = '';
            }
        }
    });
    
    // 重新绘制路径
    drawRoutes();
    addLog('城市位置已修复');
}

// 绝对修复 - 直接设置坐标，忽略所有变量
function absoluteFix() {
    // addLog('执行绝对坐标修复...'); // 隐藏坐标修复日志
    
    const mapContainer = document.getElementById('mapContainer');
    
    cities.forEach(city => {
        const cityElement = document.getElementById(city.id);
        if (cityElement) {
            // 完全重置所有样式
            cityElement.style.cssText = '';
            
            // 重新应用基础样式 
            cityElement.className = `city ${city.faction}${city.important ?  ' important' : ''}`;
            
            // 直接设置绝对位置，图标中心对准坐标
            cityElement.style.position = 'absolute';
            cityElement.style.left = (city.x - 6) + 'px';  // 12px/2 = 6px
            cityElement.style.top = (city.y - 7) + 'px';   // 14px/2 = 7px
            cityElement.style.width = '12px';
            cityElement.style.height = '14px';
            cityElement.style.zIndex = '10';
            
            // 重要城市特殊处理
            if (city.important) {
                cityElement.style.transform = 'scale(1.2)';
                cityElement.style.transformOrigin = 'center center';
            }
            
            cityElement.onclick = () => selectCity(city.id);
            
            // 重新添加标签
            const existingLabel = cityElement.querySelector('.city-label');
            if (existingLabel) {
                existingLabel.remove();
            }
            
            const label = document.createElement('div');
            label.className = 'city-label';
            label.textContent = city.name;
            cityElement.appendChild(label);
        }
    });
    
    // 重新绘制路径
    drawRoutes();
    // addLog('绝对修复完成'); // 隐藏绝对修复完成日志
    
    // 自动保存坐标，确保坐标修复后的状态不会丢失
    saveCoordinates(true);
}

// 深度诊断坐标问题
function diagnose() {
    addLog('开始深度诊断...');
    
    const testCity = cities.find(c => c.id === 'rome');
    const cityElement = document.getElementById('rome');
    const mapContainer = document.getElementById('mapContainer');
    
    if (testCity && cityElement && mapContainer) {
        console.log('=== 罗马城诊断 ===');
        console.log('预期中心坐标:', testCity.x, testCity.y);
        
        const mapRect = mapContainer.getBoundingClientRect();
        const cityRect = cityElement.getBoundingClientRect();
        
        console.log('地图容器位置:', {
            left: mapRect.left,
            top: mapRect.top,
            width: mapRect.width,
            height: mapRect.height
        });
        
        console.log('城市元素位置:', {
            left: cityRect.left,
            top: cityRect.top,
            width: cityRect.width,
            height: cityRect.height
        });
        
        console.log('相对位置:', {
            x: cityRect.left - mapRect.left,
            y: cityRect.top - mapRect.top
        });
        
        console.log('计算的中心坐标', {
            x: (cityRect.left - mapRect.left) + cityRect.width / 2,
            y: (cityRect.top - mapRect.top) + cityRect.height / 2
        });
        
        console.log('CSS样式:', {
            left: cityElement.style.left,
            top: cityElement.style.top,
            transform: cityElement.style.transform,
            position: getComputedStyle(cityElement).position
        });
        
        console.log('地图容器样式:', {
            transform: getComputedStyle(mapContainer).transform,
            backgroundSize: getComputedStyle(mapContainer).backgroundSize,
            position: getComputedStyle(mapContainer).position
        });
    }
    
    addLog('诊断完成，请查看控制台');
}

// 启用城市拖拽功能
function enableCityDragging() {
    cities.forEach(city => {
        const cityElement = document.getElementById(city.id);
        if (cityElement) {
            cityElement.addEventListener('mousedown', handleCityMouseDown);
        }
    });
    
    document.addEventListener('mousemove', handleCityMouseMove);
    document.addEventListener('mouseup', handleCityMouseUp);
}

// 禁用城市拖拽功能
function disableCityDragging() {
    cities.forEach(city => {
        const cityElement = document.getElementById(city.id);
        if (cityElement) {
            cityElement.removeEventListener('mousedown', handleCityMouseDown);
        }
    });
    
    document.removeEventListener('mousemove', handleCityMouseMove);
    document.removeEventListener('mouseup', handleCityMouseUp);
}

// 处理城市鼠标按下事件
function handleCityMouseDown(e) {
    if (!gameState.editMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const cityElement = e.target.closest('.city');
    const cityId = cityElement.id;
    const city = cities.find(c => c.id === cityId);
    
    if (city && cityElement) {
        gameState.isDragging = true;
        gameState.draggedCity = city;
        
        cityElement.classList.add('dragging');
        
        // 记录鼠标相对于城市元素的偏移
        const rect = cityElement.getBoundingClientRect();
        const mapRect = document.getElementById('mapContainer').getBoundingClientRect();
        
        gameState.dragOffset = {
            x: e.clientX - (rect.left - mapRect.left + rect.width / 2),
            y: e.clientY - (rect.top - mapRect.top + rect.height / 2)
        };

        addLog(`开始拖拽${city.name}`);
    }
}

// 处理鼠标移动事件
function handleCityMouseMove(e) {
    if (!gameState.isDragging || !gameState.draggedCity) return;
    
    e.preventDefault();
    
    const mapContainer = document.getElementById('mapContainer');
    const mapRect = mapContainer.getBoundingClientRect();
    const cityElement = document.getElementById(gameState.draggedCity.id);
    
    // 计算新的中心坐标
    const newX = e.clientX - mapRect.left - gameState.dragOffset.x;
    const newY = e.clientY - mapRect.top - gameState.dragOffset.y;
    
    // 限制在地图范围内
    const minX = 6;
    const maxX = mapRect.width - 6;
    const minY = 7;
    const maxY = mapRect.height - 7;
    
    const clampedX = Math.max(minX, Math.min(maxX, newX));
    const clampedY = Math.max(minY, Math.min(maxY, newY));
    
    // 更新城市坐标
    gameState.draggedCity.x = clampedX;
    gameState.draggedCity.y = clampedY;
    
    // 更新城市元素位置
    const width = 12;
    const height = 14;
    cityElement.style.left = (clampedX - width / 2) + 'px';
    cityElement.style.top = (clampedY - height / 2) + 'px';
    
    // 实时更新路径
    drawRoutes();
    
    // 更新调试点（如果开启）
    if (gameState.debugMode) {
        updateDebugPoints();
    }
}

// 处理鼠标松开事件
function handleCityMouseUp(e) {
    if (!gameState.isDragging || !gameState.draggedCity) return;
    
    const cityElement = document.getElementById(gameState.draggedCity.id);
    cityElement.classList.remove('dragging');

    addLog(`${gameState.draggedCity.name} 移动到(${Math.round(gameState.draggedCity.x)}, ${Math.round(gameState.draggedCity.y)})`);

    // 拖拽结束后自动保存坐标
    saveCoordinates(true);
    gameState.isDragging = false;
    gameState.draggedCity = null;
    gameState.dragOffset = null;
}

// 更新调试点位置
function updateDebugPoints() {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.querySelectorAll('.debug-point').forEach(point => point.remove());
    
    cities.forEach(city => {
        const center = getCityCenter(city);
        const debugPoint = document.createElement('div');
        debugPoint.className = 'debug-point';
        debugPoint.style.left = (center.x - 2) + 'px';
        debugPoint.style.top = (center.y - 2) + 'px';
        debugPoint.title = `${city.name} 中心(${center.x}, ${center.y})`;
        mapContainer.appendChild(debugPoint);
    });
}

// 保存坐标到本地存储
function saveCoordinates(isAutoSave = false) {
    try {
        const coordinateData = {
            timestamp: new Date().toISOString(),
            cities: cities.map(city => ({
                id: city.id,
                name: city.name,
                x: Math.round(city.x),
                y: Math.round(city.y),
                faction: city.faction,
                important: city.important,
                isUnderSiege: city.isUnderSiege,
                siegeCount: city.siegeCount,
                besiegingFaction: city.besiegingFaction
            }))
        };
        
        localStorage.setItem('punic_war_coordinates', JSON.stringify(coordinateData));
        
        if (!isAutoSave) {
            addLog(`坐标已保存 - ${cities.length}个城市`);
            
            // 显示保存成功的反馈（仅手动保存时显示）
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                const originalText = saveBtn.textContent;
                saveBtn.textContent = '已保存';
                saveBtn.style.backgroundColor = '#27ae60';
                
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.style.backgroundColor = '#3498db';
                }, 2000);
            }
        }
        
    } catch (error) {
        addLog('保存失败: ' + error.message);
        console.error('保存坐标失败:', error);
    }
}

// 加载保存的坐标
function loadCoordinates() {
    try {
        const savedData = localStorage.getItem('punic_war_coordinates');
        if (savedData) {
            const coordinateData = JSON.parse(savedData);
            
            // 更新城市数据
            coordinateData.cities.forEach(savedCity => {
                const city = cities.find(c => c.id === savedCity.id);
                if (city) {
                    city.x = savedCity.x;
                    city.y = savedCity.y;
                    if (savedCity.hasOwnProperty('isUnderSiege')) {
                        city.isUnderSiege = savedCity.isUnderSiege;
                        city.siegeCount = savedCity.siegeCount || 0;
                        city.besiegingFaction = savedCity.besiegingFaction || null;
                    }
                }   
            });
            
            // 更新围城显示
            cities.forEach(city => {
                if (city.isUnderSiege) {
                    SiegeSystem.updateCityDisplay(city);
                }
            });
            
            addLog(`已加载保存的坐标 - 更新时间: ${new Date(coordinateData.timestamp).toLocaleString()}`);
            return true;
        }
    } catch (error) {
        addLog('加载坐标失败: ' + error.message);
        console.error('加载坐标失败:', error);
    }
    return false;
}

// 导出坐标数据
function testCommanderSystem() {
    if (!CommanderSystem.romanCommanderData || !CommanderSystem.carthageCommanderData) {
        addLog('指挥官数据未加载', 'system');
        return;
    }
    
    const currentYear = gameState.currentYear;
    const romeCommanders = CommanderSystem.getCommandersForYear(currentYear, 'rome');
    const carthageCommanders = CommanderSystem.getCommandersForYear(currentYear, 'carthage');
    
    addLog(`=== ${Math.abs(currentYear)}年指挥官测试 ===`, 'system');
    
    addLog(`--- 罗马指挥官 ---`, 'system');
    if (romeCommanders.length === 0) {
        addLog(`${Math.abs(currentYear)}年无罗马指挥官数据`, 'system');
    } else {
        romeCommanders.forEach((commander, index) => {
            addLog(`${index + 1}军团: ${commander.name} (军事:${commander.military}, 政治:${commander.political}, 外交:${commander.diplomatic})`, 'system');
            if (commander.event) {
                addLog(`  历史事件: ${commander.event}`, 'system');
            }
        });
    }
    
    addLog(`--- 迦太基指挥官 ---`, 'system');
    if (carthageCommanders.length === 0) {
        addLog('无迦太基指挥官数据', 'system');
    } else {
        carthageCommanders.forEach((commander, index) => {
            addLog(`${index + 1}军团: ${commander.name} (军事:${commander.military}, 政治:${commander.political}, 外交:${commander.diplomatic})`, 'system');
            if (commander.event) {
                addLog(`  历史事件: ${commander.event}`, 'system');
            }
        });
    }
    
    addLog(`当前罗马军团数量: ${armies.rome.length}, 迦太基军队数量: ${armies.carthage.length}`, 'system');
}

function exportCoordinates() {
    const coordinateData = {
        timestamp: new Date().toISOString(),
        cities: cities.map(city => ({
            id: city.id,
            name: city.name,
            x: Math.round(city.x),
            y: Math.round(city.y),
            faction: city.faction,
            important: city.important
        }))
    };
    
    const dataStr = JSON.stringify(coordinateData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `punic_war_coordinates_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    addLog('坐标数据已导出');
}

// 导出城市数组（用于更新默认坐标）
function exportCityArray() {
    let output = '        const cities = [\n';
    
    // 按区域分组
    const regions = [
        { name: '西班牙- 伊比利亚半岛', ids: ['gades', 'emerita', 'asturica', 'corduba', 'toletum', 'newcarthage', 'sagunto', 'bilibilis', 'budilragus', 'taraco'] },
        { name: '高卢南部和北意大利', ids: ['narbo', 'massalia', 'lugdunum', 'cenabum', 'treveri', 'mediolanum', 'placentia', 'ravenna', 'aquileia', 'salona', 'sirmium'] },
        { name: '意大利半岛', ids: ['rome', 'casilinum', 'pontia', 'capua', 'brundisium', 'regium', 'messana', 'lilybaeum'] },
        { name: '西西里岛', ids: ['syracuse'] },
        { name: '北非', ids: ['utica', 'carthage', 'tacape', 'tubactus', 'cyrene', 'badias', 'aiomnium', 'sera', 'tingis'] },
        { name: '东地中海', ids: ['katabathmus', 'athens', 'sparta', 'corinth', 'ambracia', 'dyrrhachium', 'pella', 'serdica', 'helios', 'byzantium', 'nicomedia', 'pergamum', 'ephesus', 'perga', 'appia', 'tarsus', 'sinope', 'eusebeia'] },
        { name: '亚洲和东亚', ids: ['antioch', 'damascus', 'jerusalem', 'bereusia'] },
        { name: '埃及', ids: ['alexandria', 'memphis'] }
    ];
    
    for (const region of regions) {
        output += `            // ${region.name}\n`;
        
        const regionCities = cities.filter(city => region.ids.includes(city.id));
        
        for (const city of regionCities) {
            const x = Math.round(city.x);
            const y = Math.round(city.y);
            const faction = city.faction;
            const important = city.important;
            const siege = city.isUnderSiege ? 'true' : 'false';
            const siegeCount = city.siegeCount || 0;
            const besiegingFaction = city.besiegingFaction || 'null';
            const politicalScore = city.politicalScore || 1;
            const economicScore = city.economicScore || 1;
            const fortificationLevel = city.fortificationLevel || 0;
            const romeAttitude = city.romeAttitude || 0;
            const carthageAttitude = city.carthageAttitude || 0;
            const macedoniaAttitude = city.macedoniaAttitude || 0;
            const seleucidAttitude = city.seleucidAttitude || 0;
            const ptolemyAttitude = city.ptolemyAttitude || 0;
            
            output += `            { id: '${city.id}', name: '${city.name}', faction: '${faction}', important: ${important}, x: ${x}, y: ${y},\n`;
            output += `              isUnderSiege: ${siege}, siegeCount: ${siegeCount}, besiegingFaction: ${besiegingFaction === 'null' ? 'null' : "'" + besiegingFaction + "'"}, politicalScore: ${politicalScore}, economicScore: ${economicScore}, fortificationLevel: ${fortificationLevel}, romeAttitude: ${romeAttitude}, carthageAttitude: ${carthageAttitude}, macedoniaAttitude: ${macedoniaAttitude}, seleucidAttitude: ${seleucidAttitude}, ptolemyAttitude: ${ptolemyAttitude} },\n`;
        }
        
        output += '\n';
    }
    
    output += '        ];';
    
    // 创建一个文本文件下载
    const dataBlob = new Blob([output], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `cities_array_${new Date().toISOString().split('T')[0]}.js`;
    link.click();
    
    // 同时复制到剪贴板
    navigator.clipboard.writeText(output).then(() => {
        addLog('城市数组已复制到剪贴板并下载文件', 'system');
    }).catch(err => {
        addLog('城市数组已下载文件，但复制到剪贴板失败', 'system');
        console.error('复制失败:', err);
    });
}

// 保存游戏
function saveGame() {
    try {
        const gameData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            gameState: {
                currentTurn: gameState.currentTurn,
                currentPlayer: gameState.currentPlayer,
                currentYear: gameState.currentYear,
                currentMonth: gameState.currentMonth,
                currentSeason: gameState.currentSeason,
                startYear: gameState.startYear,
                romeFunds: gameState.romeFunds,
                carthageFunds: gameState.carthageFunds,
                macedoniaFunds: gameState.macedoniaFunds,
                seleucidFunds: gameState.seleucidFunds,
                ptolemyFunds: gameState.ptolemyFunds,
                romeDebt: gameState.romeDebt,
                carthageDebt: gameState.carthageDebt,
                macedoniaDebt: gameState.macedoniaDebt,
                seleucidDebt: gameState.seleucidDebt,
                ptolemyDebt: gameState.ptolemyDebt,
                romeLastTurnExpense: gameState.romeLastTurnExpense,
                carthageLastTurnExpense: gameState.carthageLastTurnExpense,
                macedoniaLastTurnExpense: gameState.macedoniaLastTurnExpense,
                seleucidLastTurnExpense: gameState.seleucidLastTurnExpense,
                ptolemyLastTurnExpense: gameState.ptolemyLastTurnExpense
            },
            cities: cities.map(city => ({
                id: city.id,
                faction: city.faction,
                isUnderSiege: city.isUnderSiege,
                siegeCount: city.siegeCount,
                besiegingFaction: city.besiegingFaction,
                fortificationLevel: city.fortificationLevel,
                romeAttitude: city.romeAttitude,
                carthageAttitude: city.carthageAttitude,
                macedoniaAttitude: city.macedoniaAttitude,
                seleucidAttitude: city.seleucidAttitude,
                ptolemyAttitude: city.ptolemyAttitude,
                politicalScore: city.politicalScore,
                economicScore: city.economicScore
            })),
            armies: {
                rome: armies.rome.map(army => ({
                    id: army.id,
                    commander: army.commander,
                    military: army.military,
                    political: army.political,
                    diplomatic: army.diplomatic,
                    location: army.location,
                    event: army.event,
                    troops: army.troops,
                    lightCavalry: army.lightCavalry,
                    heavyCavalry: army.heavyCavalry,
                    heavyInfantry: army.heavyInfantry,
                    lightInfantry: army.lightInfantry,
                    morale: army.morale
                })),
                carthage: armies.carthage.map(army => ({
                    id: army.id,
                    commander: army.commander,
                    military: army.military,
                    political: army.political,
                    diplomatic: army.diplomatic,
                    location: army.location,
                    event: army.event,
                    troops: army.troops,
                    lightCavalry: army.lightCavalry,
                    heavyCavalry: army.heavyCavalry,
                    heavyInfantry: army.heavyInfantry,
                    lightInfantry: army.lightInfantry,
                    morale: army.morale
                })),
                macedonia: armies.macedonia.map(army => ({
                    id: army.id,
                    commander: army.commander,
                    military: army.military,
                    political: army.political,
                    diplomatic: army.diplomatic,
                    location: army.location,
                    event: army.event,
                    troops: army.troops,
                    lightCavalry: army.lightCavalry,
                    heavyCavalry: army.heavyCavalry,
                    heavyInfantry: army.heavyInfantry,
                    lightInfantry: army.lightInfantry,
                    morale: army.morale
                })),
                seleucid: armies.seleucid.map(army => ({
                    id: army.id,
                    commander: army.commander,
                    military: army.military,
                    political: army.political,
                    diplomatic: army.diplomatic,
                    location: army.location,
                    event: army.event,
                    troops: army.troops,
                    lightCavalry: army.lightCavalry,
                    heavyCavalry: army.heavyCavalry,
                    heavyInfantry: army.heavyInfantry,
                    lightInfantry: army.lightInfantry,
                    morale: army.morale
                })),
                ptolemy: armies.ptolemy.map(army => ({
                    id: army.id,
                    commander: army.commander,
                    military: army.military,
                    political: army.political,
                    diplomatic: army.diplomatic,
                    location: army.location,
                    event: army.event,
                    troops: army.troops,
                    lightCavalry: army.lightCavalry,
                    heavyCavalry: army.heavyCavalry,
                    heavyInfantry: army.heavyInfantry,
                    lightInfantry: army.lightInfantry,
                    morale: army.morale
                }))
            }
        };
        
        localStorage.setItem('punic_war_save', JSON.stringify(gameData));
        addLog('游戏已保存到本地存储', 'system');
        
        // 同时保存坐标数据
        saveCoordinates(true);
        
        // 显示保存成功反馈
        const saveBtn = document.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '已保存';
        saveBtn.style.backgroundColor = '#2ecc71';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.backgroundColor = '#27ae60';
        }, 2000);
        
    } catch (error) {
        addLog('保存游戏失败: ' + error.message, 'error');
        console.error('保存游戏失败:', error);
    }
}

// 加载游戏
function loadGame() {
    try {
        const savedData = localStorage.getItem('punic_war_save');
        if (!savedData) {
            addLog('没有找到保存的游戏数据', 'error');
            return;
        }
        
        const gameData = JSON.parse(savedData);
        
        // 恢复游戏状态                
        //gameState.currentTurn = gameData.gameState.currentTurn;
        gameState.currentPlayer = gameData.gameState.currentPlayer;
        gameState.currentYear = gameData.gameState.currentYear;
        gameState.currentMonth = gameData.gameState.currentMonth;
        gameState.currentSeason = gameData.gameState.currentSeason;
        gameState.startYear = gameData.gameState.startYear;
        
            // 恢复资金和债务状态
        if (gameData.gameState.romeFunds !== undefined) {
            gameState.romeFunds = gameData.gameState.romeFunds;
        }
        if (gameData.gameState.carthageFunds !== undefined) {
            gameState.carthageFunds = gameData.gameState.carthageFunds;
        }
        if (gameData.gameState.romeDebt !== undefined) {
            gameState.romeDebt = gameData.gameState.romeDebt;
        }
        if (gameData.gameState.carthageDebt !== undefined) {
            gameState.carthageDebt = gameData.gameState.carthageDebt;
        }
        if (gameData.gameState.macedoniaFunds !== undefined) {
            gameState.macedoniaFunds = gameData.gameState.macedoniaFunds;
        }
        if (gameData.gameState.macedoniaDebt !== undefined) {
            gameState.macedoniaDebt = gameData.gameState.macedoniaDebt;
        }
        if (gameData.gameState.seleucidFunds !== undefined) {
            gameState.seleucidFunds = gameData.gameState.seleucidFunds;
        }
        if (gameData.gameState.seleucidDebt !== undefined) {
            gameState.seleucidDebt = gameData.gameState.seleucidDebt;
        }
        if (gameData.gameState.ptolemyFunds !== undefined) {
            gameState.ptolemyFunds = gameData.gameState.ptolemyFunds;
        }
        if (gameData.gameState.ptolemyDebt !== undefined) {
            gameState.ptolemyDebt = gameData.gameState.ptolemyDebt;
        }
        if (gameData.gameState.romeLastTurnExpense !== undefined) {
            gameState.romeLastTurnExpense = gameData.gameState.romeLastTurnExpense;
        }
        if (gameData.gameState.carthageLastTurnExpense !== undefined) {
            gameState.carthageLastTurnExpense = gameData.gameState.carthageLastTurnExpense;
        }
        if (gameData.gameState.macedoniaLastTurnExpense !== undefined) {
            gameState.macedoniaLastTurnExpense = gameData.gameState.macedoniaLastTurnExpense;
        }
        if (gameData.gameState.seleucidLastTurnExpense !== undefined) {
            gameState.seleucidLastTurnExpense = gameData.gameState.seleucidLastTurnExpense;
        }
        if (gameData.gameState.ptolemyLastTurnExpense !== undefined) {
            gameState.ptolemyLastTurnExpense = gameData.gameState.ptolemyLastTurnExpense;
        }
        
        // 恢复城市状态（只恢复游戏状态态，不修改坐标和固定属性）
        gameData.cities.forEach(savedCity => {
            const city = cities.find(c => c.id === savedCity.id);
            if (city) {
                city.faction = savedCity.faction;
                city.isUnderSiege = savedCity.isUnderSiege || false;
                city.siegeCount = savedCity.siegeCount || 0;
                city.besiegingFaction = savedCity.besiegingFaction || null;
                if (savedCity.fortificationLevel !== undefined) {
                    city.fortificationLevel = savedCity.fortificationLevel;
                }
                if (savedCity.romeAttitude !== undefined) {
                    city.romeAttitude = savedCity.romeAttitude;
                }
                if (savedCity.carthageAttitude !== undefined) {
                    city.carthageAttitude = savedCity.carthageAttitude;
                }
                if (savedCity.macedoniaAttitude !== undefined) {
                    city.macedoniaAttitude = savedCity.macedoniaAttitude;
                }
                if (savedCity.seleucidAttitude !== undefined) {
                    city.seleucidAttitude = savedCity.seleucidAttitude;
                }
                if (savedCity.ptolemyAttitude !== undefined) {
                    city.ptolemyAttitude = savedCity.ptolemyAttitude;
                }
                if (savedCity.politicalScore !== undefined) {
                    city.politicalScore = savedCity.politicalScore;
                }
                if (savedCity.economicScore !== undefined) {
                    city.economicScore = savedCity.economicScore;
                }
                // 保持原有的坐标、名称、重要性等游戏设计数据不变
            }
        });
        
        // 恢复军队状态                
        armies.rome = gameData.armies.rome.map(savedArmy => ({
            id: savedArmy.id,
            commander: savedArmy.commander,
            military: savedArmy.military,
            political: savedArmy.political,
            diplomatic: savedArmy.diplomatic,
            location: savedArmy.location,
            event: savedArmy.event,
            troops: savedArmy.troops,
            lightCavalry: savedArmy.lightCavalry || 2000,
            heavyCavalry: savedArmy.heavyCavalry || 1000,
            heavyInfantry: savedArmy.heavyInfantry || 20000,
            lightInfantry: savedArmy.lightInfantry || 2000,
            morale: savedArmy.morale || 5
        }));
        
        armies.carthage = gameData.armies.carthage.map(savedArmy => ({
            id: savedArmy.id,
            commander: savedArmy.commander,
            military: savedArmy.military,
            political: savedArmy.political,
            diplomatic: savedArmy.diplomatic,
            location: savedArmy.location,
            event: savedArmy.event,
            troops: savedArmy.troops,
            lightCavalry: savedArmy.lightCavalry || 2000,
            heavyCavalry: savedArmy.heavyCavalry || 1000,
            heavyInfantry: savedArmy.heavyInfantry || 20000,
            lightInfantry: savedArmy.lightInfantry || 2000,
            morale: savedArmy.morale || 5
        }));
        
        // 加载马其顿军队（如果存在）
        if (gameData.armies.macedonia) {
            armies.macedonia = gameData.armies.macedonia.map(savedArmy => ({
                id: savedArmy.id,
                commander: savedArmy.commander,
                military: savedArmy.military,
                political: savedArmy.political,
                diplomatic: savedArmy.diplomatic,
                location: savedArmy.location,
                event: savedArmy.event,
                troops: savedArmy.troops,
                lightCavalry: savedArmy.lightCavalry || 2000,
                heavyCavalry: savedArmy.heavyCavalry || 1000,
                heavyInfantry: savedArmy.heavyInfantry || 20000,
                lightInfantry: savedArmy.lightInfantry || 2000,
                morale: savedArmy.morale || 5
            }));
        }
        
        // 加载塞琉古军队（如果存在）
        if (gameData.armies.seleucid) {
            armies.seleucid = gameData.armies.seleucid.map(savedArmy => ({
                id: savedArmy.id,
                commander: savedArmy.commander,
                military: savedArmy.military,
                political: savedArmy.political,
                diplomatic: savedArmy.diplomatic,
                location: savedArmy.location,
                event: savedArmy.event,
                troops: savedArmy.troops,
                lightCavalry: savedArmy.lightCavalry || 2000,
                heavyCavalry: savedArmy.heavyCavalry || 1000,
                heavyInfantry: savedArmy.heavyInfantry || 20000,
                lightInfantry: savedArmy.lightInfantry || 2000,
                morale: savedArmy.morale || 5
            }));
        }
        
        // 加载托勒密军队（如果存在）
        if (gameData.armies.ptolemy) {
            armies.ptolemy = gameData.armies.ptolemy.map(savedArmy => ({
                id: savedArmy.id,
                commander: savedArmy.commander,
                military: savedArmy.military,
                political: savedArmy.political,
                diplomatic: savedArmy.diplomatic,
                location: savedArmy.location,
                event: savedArmy.event,
                troops: savedArmy.troops,
                lightCavalry: savedArmy.lightCavalry || 2000,
                heavyCavalry: savedArmy.heavyCavalry || 1000,
                heavyInfantry: savedArmy.heavyInfantry || 20000,
                lightInfantry: savedArmy.lightInfantry || 2000,
                morale: savedArmy.morale || 5
            }));
        }
        
        // 重新生成地图和UI
        generateMap();
        drawRoutes();
        
        // 执行绝对坐标修复，确保城市位置正确
        absoluteFix();
        
        placeArmies();
        updateUI();
        
        // 更新城市显示
        cities.forEach(city => {
            if (city.isUnderSiege) {
                SiegeSystem.updateCityDisplay(city);
            }
        });
        
        const saveTime = new Date(gameData.timestamp).toLocaleString();
        addLog(`游戏已加载 - 保存时间: ${saveTime}`, 'system');
        addLog(`--- ${TimeSystem.getFullTimeDisplay()} - ${gameState.currentTurn}回合 ${gameState.currentPlayer === 'rome' ? '罗马' : '迦太基'}行动 ---`);
        
    } catch (error) {
        addLog('加载游戏失败: ' + error.message, 'error');
        console.error('加载游戏失败:', error);
    }
}

// 重置游戏
function resetGame() {
    if (confirm('确定要重置游戏吗？这将丢失所有当前进度！')) {
        // 清除保存的游戏数据
        localStorage.removeItem('punic_war_save');
        
        // 重新加载页面以完全重置游戏
        location.reload();
    }
}

// 手动修复坐标
function manualFixCoordinates() {
    // addLog('正在执行手动坐标修复...', 'system'); // 隐藏手动坐标修复日志
    
    // 重新生成地图
    generateMap();
    drawRoutes();
    
    // 执行绝对坐标修复
    absoluteFix();
    
    // 重新放置军队
    placeArmies();
    
        // addLog('坐标修复完成', 'system'); // 隐藏坐标修复完成日志
    
    // 显示修复成功的反馈
    const fixBtn = document.querySelector('.fix-btn');
    const originalText = fixBtn.textContent;
    fixBtn.textContent = '修复完成';
    fixBtn.style.backgroundColor = '#27ae60';
    
    setTimeout(() => {
        fixBtn.textContent = originalText;
        fixBtn.style.backgroundColor = '#9b59b6';
    }, 2000);
}

// 切换地图控制面板显示/隐藏
function toggleMapControl() {
    const mapControlPanel = document.querySelector('.panel-section h3').parentNode;
    const isHidden = mapControlPanel.style.display === 'none';
    
    // 查找地图控制面板
    const panels = document.querySelectorAll('.panel-section');
    let mapPanel = null;
    
    for (const panel of panels) {
        const h3 = panel.querySelector('h3');
        if (h3 && h3.textContent === '地图控制') {
            mapPanel = panel;
            break;
        }
    }
    
    if (mapPanel) {
        const isCurrentlyHidden = mapPanel.style.display === 'none';
        
        if (isCurrentlyHidden) {
            mapPanel.style.display = 'block';
            addLog('地图控制面板已显示', 'system');
        } else {
            mapPanel.style.display = 'none';
            addLog('地图控制面板已隐藏', 'system');
        }
        
        // 更新按钮文本
        const btn = document.querySelector('.map-control-btn');
        btn.textContent = isCurrentlyHidden ? '隐藏控制' : '地图控制';
    }
}


