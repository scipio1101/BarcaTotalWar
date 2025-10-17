// ==================== 增加军团功能 ====================
// 增加军团的状态
const addArmyState = {
    selectedFaction: null,
    selectedRegion: null,
    selectedCity: null
};

// 增加资金的状态
const addFundsState = {
    selectedFaction: null
};

// 修改将领属性的状态
const modifyCommanderState = {
    selectedFaction: null,
    selectedArmy: null
};

// 打开增加军团弹窗
function showAddArmyModal() {
    // 重置状态
    addArmyState.selectedFaction = null;
    addArmyState.selectedRegion = null;
    addArmyState.selectedCity = null;
    
    // 显示第一步
    document.getElementById('addArmyStep1').style.display = 'block';
    document.getElementById('addArmyStep2').style.display = 'none';
    document.getElementById('addArmyStep3').style.display = 'none';
    document.getElementById('addArmyStep4').style.display = 'none';
    
    // 重置输入框
    document.getElementById('addArmyCommanderName').value = '';
    document.getElementById('addArmyMilitary').value = '';
    document.getElementById('addArmyPolitical').value = '';
    document.getElementById('addArmyDiplomatic').value = '';
    
    // 显示弹窗
    document.getElementById('addArmyModal').style.display = 'flex';
}

// 关闭增加军团弹窗
function closeAddArmyModal() {
    document.getElementById('addArmyModal').style.display = 'none';
}

// 选择派系
function selectAddArmyFaction(faction) {
    addArmyState.selectedFaction = faction;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    document.getElementById('addArmySituation').textContent = `已选择：${factionNames[faction]}`;
    
    // 显示第二步
    document.getElementById('addArmyStep1').style.display = 'none';
    document.getElementById('addArmyStep2').style.display = 'block';
}

// 返回第一步
function backToAddArmyStep1() {
    addArmyState.selectedFaction = null;
    addArmyState.selectedRegion = null;
    document.getElementById('addArmySituation').textContent = '选择派系和位置';
    document.getElementById('addArmyStep1').style.display = 'block';
    document.getElementById('addArmyStep2').style.display = 'none';
}

// 选择地区（或选择默认首都）
function selectAddArmyRegion(region) {
    // 如果选择默认，直接跳到首都
    if (region === 'default') {
        selectCapitalCity();
        return;
    }
    
    addArmyState.selectedRegion = region;
    
    const regionNames = {
        'spain': '西班牙',
        'gaul': '高卢',
        'italy': '意大利',
        'sicily': '西西里',
        'north_africa': '北非',
        'balkans': '巴尔干',
        'greece': '希腊',
        'asia_minor': '小亚细亚',
        'levant': '黎凡特',
        'egypt': '埃及'
    };
    
    // 获取该地区的所有城市
    const citiesInRegion = cities.filter(city => city.region === region);
    
    if (citiesInRegion.length === 0) {
        alert('该地区没有城市！');
        return;
    }
    
    // 更新提示文本
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    document.getElementById('addArmySituation').textContent = 
        `已选择：${factionNames[addArmyState.selectedFaction]} - ${regionNames[region]}`;
    
    // 生成城市列表
    const cityList = document.getElementById('addArmyCityList');
    cityList.innerHTML = '';
    
    // 获取该派系的首都
    const capitalCities = {
        'rome': 'rome',
        'carthage': 'carthage',
        'macedonia': 'pella',
        'seleucid': 'antioch',
        'ptolemy': 'alexandria'
    };
    const capitalId = capitalCities[addArmyState.selectedFaction];
    
    citiesInRegion.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.fontSize = '12px';
        btn.style.padding = '8px';
        
        // 如果是首都，标记为默认
        if (city.id === capitalId) {
            btn.innerHTML = `${city.name} ⭐`;
            btn.style.backgroundColor = '#27ae60';
        } else {
            btn.textContent = city.name;
            btn.style.backgroundColor = '#95a5a6';
        }
        
        btn.onclick = () => selectAddArmyCity(city.id);
        cityList.appendChild(btn);
    });
    
    // 显示第三步
    document.getElementById('addArmyStep2').style.display = 'none';
    document.getElementById('addArmyStep3').style.display = 'block';
}

// 返回第二步
function backToAddArmyStep2() {
    addArmyState.selectedRegion = null;
    addArmyState.selectedCity = null;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    document.getElementById('addArmySituation').textContent = `已选择：${factionNames[addArmyState.selectedFaction]}`;
    
    document.getElementById('addArmyStep2').style.display = 'block';
    document.getElementById('addArmyStep3').style.display = 'none';
}

// 选择首都城市
function selectCapitalCity() {
    const capitalCities = {
        'rome': 'rome',
        'carthage': 'carthage',
        'macedonia': 'pella',
        'seleucid': 'antioch',
        'ptolemy': 'alexandria'
    };
    
    const capitalId = capitalCities[addArmyState.selectedFaction];
    const city = cities.find(c => c.id === capitalId);
    
    if (!city) {
        alert('找不到首都城市！');
        return;
    }
    
    addArmyState.selectedCity = capitalId;
    addArmyState.selectedRegion = city.region;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    document.getElementById('addArmySituation').textContent = 
        `已选择：${factionNames[addArmyState.selectedFaction]} - ${city.name}（首都）`;
    
    // 跳转到第四步
    document.getElementById('addArmyStep2').style.display = 'none';
    document.getElementById('addArmyStep4').style.display = 'block';
}

// 选择城市
function selectAddArmyCity(cityId) {
    addArmyState.selectedCity = cityId;
    
    const city = cities.find(c => c.id === cityId);
    
    if (!city) {
        alert('城市不存在！');
        return;
    }
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    document.getElementById('addArmySituation').textContent = 
        `已选择：${factionNames[addArmyState.selectedFaction]} - ${city.name}`;
    
    // 显示第四步：设置将领信息
    document.getElementById('addArmyStep3').style.display = 'none';
    document.getElementById('addArmyStep4').style.display = 'block';
}

// 返回第三步
function backToAddArmyStep3() {
    document.getElementById('addArmyStep4').style.display = 'none';
    document.getElementById('addArmyStep3').style.display = 'block';
}

// 确认创建军队
function confirmAddArmy() {
    const faction = addArmyState.selectedFaction;
    const cityId = addArmyState.selectedCity;
    
    // 获取自定义将领信息
    const commanderName = document.getElementById('addArmyCommanderName').value.trim();
    const military = parseInt(document.getElementById('addArmyMilitary').value) || null;
    const political = parseInt(document.getElementById('addArmyPolitical').value) || null;
    const diplomatic = parseInt(document.getElementById('addArmyDiplomatic').value) || null;
    
    // 创建新军团
    createNewArmy(faction, cityId, commanderName, military, political, diplomatic);
    
    // 关闭弹窗
    closeAddArmyModal();
}

// 创建新军团
function createNewArmy(faction, cityId, customCommanderName = null, customMilitary = null, customPolitical = null, customDiplomatic = null) {
    const city = cities.find(c => c.id === cityId);
    
    if (!city) {
        console.error('城市不存在:', cityId);
        return;
    }
    
    // 获取当前派系的军队数量（用于编号）
    const currentArmyCount = armies[faction].length;
    const armyNumber = currentArmyCount + 1;
    
    // 确定将领名字（使用与原有组军相同的命名规则）
    let commanderName;
    if (customCommanderName) {
        commanderName = customCommanderName;
    } else {
        // 使用与原有组军功能相同的命名规则
        const factionNames = {
            'rome': '罗马',
            'carthage': '迦太基',
            'macedonia': '马其顿',
            'seleucid': '塞琉古',
            'ptolemy': '托勒密'
        };
        commanderName = `${factionNames[faction]}leader${armyNumber}`;
    }
    
    const armyId = `${faction}_${commanderName}_${Date.now()}`;
    
    // 确定将领属性（如果未提供则使用默认值7）
    const military = (customMilitary !== null && customMilitary >= 1 && customMilitary <= 10) ? customMilitary : 7;
    const political = (customPolitical !== null && customPolitical >= 1 && customPolitical <= 10) ? customPolitical : 7;
    const diplomatic = (customDiplomatic !== null && customDiplomatic >= 1 && customDiplomatic <= 10) ? customDiplomatic : 7;
    
    // 创建新军团数据（使用commander字段而不是commanderName）
    const newArmy = {
        id: armyId,
        commander: commanderName,  // 使用commander字段以保持一致性
        location: cityId,
        lastLocation: null,
        faction: faction,
        military: military,
        political: political,
        diplomatic: diplomatic,
        troops: toRomanNumeral(armyNumber), // 军团标记（罗马数字）
        lightCavalry: 1000,
        heavyCavalry: 500,
        heavyInfantry: 3000,
        lightInfantry: 1000,
        morale: 5.0,
        isRaisedArmy: true // 标记为手动组建的军队
    };
    
    // 添加到军队列表
    armies[faction].push(newArmy);
    
    // 刷新地图显示
    placeArmies();
    
    // 添加日志
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    addLog(`✨ ${factionNames[faction]}在${city.name}手动组建了新军团：${commanderName}（军${military}/政${political}/外${diplomatic}）`, faction);
    
    console.log(`✨ 手动创建新军团:`, newArmy);
}

// ==================== 增加资金功能 ====================

// 打开增加资金弹窗
function showAddFundsModal() {
    // 重置状态
    addFundsState.selectedFaction = null;
    
    // 隐藏金额输入和按钮区域
    document.getElementById('addFundsAmountSection').style.display = 'none';
    document.getElementById('addFundsCurrentDisplay').style.display = 'none';
    document.getElementById('addFundsButtons').style.display = 'none';
    
    // 重置输入框
    document.getElementById('addFundsAmount').value = '2000';
    
    // 更新提示文本
    document.getElementById('addFundsSituation').textContent = '选择派系并输入金额';
    
    // 显示弹窗
    document.getElementById('addFundsModal').style.display = 'flex';
}

// 关闭增加资金弹窗
function closeAddFundsModal() {
    document.getElementById('addFundsModal').style.display = 'none';
}

// 重置增加资金弹窗
function resetAddFundsModal() {
    addFundsState.selectedFaction = null;
    document.getElementById('addFundsAmountSection').style.display = 'none';
    document.getElementById('addFundsCurrentDisplay').style.display = 'none';
    document.getElementById('addFundsButtons').style.display = 'none';
    document.getElementById('addFundsSituation').textContent = '选择派系并输入金额';
}

// 选择资金目标派系
function selectFundsTarget(faction) {
    addFundsState.selectedFaction = faction;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    // 获取当前资金
    let currentFunds = 0;
    if (faction === 'rome') currentFunds = gameState.romeFunds;
    else if (faction === 'carthage') currentFunds = gameState.carthageFunds;
    else if (faction === 'macedonia') currentFunds = gameState.macedoniaFunds;
    else if (faction === 'seleucid') currentFunds = gameState.seleucidFunds;
    else if (faction === 'ptolemy') currentFunds = gameState.ptolemyFunds;
    
    // 更新提示文本
    document.getElementById('addFundsSituation').textContent = `已选择：${factionNames[faction]}`;
    
    // 显示当前资金
    document.getElementById('addFundsTargetName').textContent = factionNames[faction];
    document.getElementById('addFundsCurrentAmount').textContent = currentFunds;
    
    // 显示金额输入和按钮区域
    document.getElementById('addFundsAmountSection').style.display = 'block';
    document.getElementById('addFundsCurrentDisplay').style.display = 'block';
    document.getElementById('addFundsButtons').style.display = 'block';
}

// 确认增加资金
function confirmAddFunds() {
    const faction = addFundsState.selectedFaction;
    const amount = parseInt(document.getElementById('addFundsAmount').value) || 2000;
    
    if (!faction) {
        alert('请先选择派系！');
        return;
    }
    
    if (amount <= 0) {
        alert('金额必须大于0！');
        return;
    }
    
    // 增加资金
    if (faction === 'rome') {
        gameState.romeFunds += amount;
    } else if (faction === 'carthage') {
        gameState.carthageFunds += amount;
    } else if (faction === 'macedonia') {
        gameState.macedoniaFunds += amount;
    } else if (faction === 'seleucid') {
        gameState.seleucidFunds += amount;
    } else if (faction === 'ptolemy') {
        gameState.ptolemyFunds += amount;
    }
    
    // 更新资金显示
    updateFactionFunds();
    
    // 添加日志
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    addLog(`💰 ${factionNames[faction]}手动增加了${amount}资金`, faction);
    
    console.log(`💰 手动增加资金: ${factionNames[faction]} +${amount}`);
    
    // 关闭弹窗
    closeAddFundsModal();
}

// ==================== 修改将领属性功能 ====================

// 打开修改将领属性弹窗
function showModifyCommanderModal() {
    // 重置状态
    modifyCommanderState.selectedFaction = null;
    modifyCommanderState.selectedArmy = null;
    
    // 显示第一步
    document.getElementById('modifyCommanderStep1').style.display = 'block';
    document.getElementById('modifyCommanderStep2').style.display = 'none';
    document.getElementById('modifyCommanderStep3').style.display = 'none';
    
    // 重置输入框
    document.getElementById('modifyMilitary').value = '';
    document.getElementById('modifyPolitical').value = '';
    document.getElementById('modifyDiplomatic').value = '';
    
    // 更新提示文本
    document.getElementById('modifyCommanderSituation').textContent = '选择派系和军队';
    
    // 显示弹窗
    document.getElementById('modifyCommanderModal').style.display = 'flex';
}

// 关闭修改将领属性弹窗
function closeModifyCommanderModal() {
    document.getElementById('modifyCommanderModal').style.display = 'none';
}

// 选择要修改的派系
function selectModifyFaction(faction) {
    modifyCommanderState.selectedFaction = faction;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    // 更新提示文本
    document.getElementById('modifyCommanderSituation').textContent = `已选择：${factionNames[faction]}`;
    
    // 获取该派系的所有军队
    const factionArmies = armies[faction] || [];
    
    if (factionArmies.length === 0) {
        alert('该派系当前没有军队！');
        return;
    }
    
    // 生成军队列表
    const armyList = document.getElementById('modifyCommanderArmyList');
    armyList.innerHTML = '';
    
    factionArmies.forEach(army => {
        const armyDiv = document.createElement('div');
        armyDiv.style.cssText = 'background: rgba(52, 73, 94, 0.3); padding: 10px; border-radius: 5px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s;';
        armyDiv.onmouseover = () => armyDiv.style.background = 'rgba(52, 73, 94, 0.5)';
        armyDiv.onmouseout = () => armyDiv.style.background = 'rgba(52, 73, 94, 0.3)';
        
        const commanderName = army.commander || '未知将领';
        const military = army.military || 0;
        const political = army.political || 0;
        const diplomatic = army.diplomatic || 0;
        const cityName = cities.find(c => c.id === army.location)?.name || '未知';
        
        armyDiv.innerHTML = `
            <div style="font-size: 13px; color: #ecf0f1; margin-bottom: 5px;">
                <strong>${commanderName}</strong> - ${cityName}
            </div>
            <div style="font-size: 11px; color: #bdc3c7; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                <div>军事: ${military}</div>
                <div>政治: ${political}</div>
                <div>外交: ${diplomatic}</div>
            </div>
        `;
        
        armyDiv.onclick = () => selectModifyArmy(army);
        armyList.appendChild(armyDiv);
    });
    
    // 显示第二步
    document.getElementById('modifyCommanderStep1').style.display = 'none';
    document.getElementById('modifyCommanderStep2').style.display = 'block';
}

// 返回第一步
function backToModifyStep1() {
    modifyCommanderState.selectedFaction = null;
    document.getElementById('modifyCommanderSituation').textContent = '选择派系和军队';
    document.getElementById('modifyCommanderStep1').style.display = 'block';
    document.getElementById('modifyCommanderStep2').style.display = 'none';
}

// 选择要修改的军队
function selectModifyArmy(army) {
    modifyCommanderState.selectedArmy = army;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    const commanderName = army.commander || '未知将领';
    const military = army.military || 0;
    const political = army.political || 0;
    const diplomatic = army.diplomatic || 0;
    
    // 更新提示文本
    document.getElementById('modifyCommanderSituation').textContent = 
        `已选择：${factionNames[modifyCommanderState.selectedFaction]} - ${commanderName}`;
    
    // 显示当前属性
    document.getElementById('modifyCommanderName').textContent = commanderName;
    document.getElementById('modifyCurrentMilitary').textContent = military;
    document.getElementById('modifyCurrentPolitical').textContent = political;
    document.getElementById('modifyCurrentDiplomatic').textContent = diplomatic;
    
    // 重置输入框
    document.getElementById('modifyMilitary').value = '';
    document.getElementById('modifyPolitical').value = '';
    document.getElementById('modifyDiplomatic').value = '';
    
    // 显示第三步
    document.getElementById('modifyCommanderStep2').style.display = 'none';
    document.getElementById('modifyCommanderStep3').style.display = 'block';
}

// 返回第二步
function backToModifyStep2() {
    modifyCommanderState.selectedArmy = null;
    
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    document.getElementById('modifyCommanderSituation').textContent = 
        `已选择：${factionNames[modifyCommanderState.selectedFaction]}`;
    
    document.getElementById('modifyCommanderStep2').style.display = 'block';
    document.getElementById('modifyCommanderStep3').style.display = 'none';
}

// 确认修改将领属性
function confirmModifyCommander() {
    const army = modifyCommanderState.selectedArmy;
    
    if (!army) {
        alert('请先选择军队！');
        return;
    }
    
    // 获取输入的新属性值
    const inputMilitary = document.getElementById('modifyMilitary').value;
    const inputPolitical = document.getElementById('modifyPolitical').value;
    const inputDiplomatic = document.getElementById('modifyDiplomatic').value;
    
    // 获取当前属性
    const currentMilitary = army.military || 0;
    const currentPolitical = army.political || 0;
    const currentDiplomatic = army.diplomatic || 0;
    
    // 确定新属性值（留空则+1，但不超过10）
    let newMilitary, newPolitical, newDiplomatic;
    
    if (inputMilitary) {
        newMilitary = Math.min(10, Math.max(1, parseInt(inputMilitary)));
    } else {
        newMilitary = Math.min(10, currentMilitary + 1);
    }
    
    if (inputPolitical) {
        newPolitical = Math.min(10, Math.max(1, parseInt(inputPolitical)));
    } else {
        newPolitical = Math.min(10, currentPolitical + 1);
    }
    
    if (inputDiplomatic) {
        newDiplomatic = Math.min(10, Math.max(1, parseInt(inputDiplomatic)));
    } else {
        newDiplomatic = Math.min(10, currentDiplomatic + 1);
    }
    
    // 更新军队属性
    army.military = newMilitary;
    army.political = newPolitical;
    army.diplomatic = newDiplomatic;
    
    // 添加日志
    const factionNames = {
        'rome': '罗马',
        'carthage': '迦太基',
        'macedonia': '马其顿',
        'seleucid': '塞琉古',
        'ptolemy': '托勒密'
    };
    
    const commanderName = army.commander || '未知将领';
    const faction = modifyCommanderState.selectedFaction;
    
    addLog(`⚔️ ${factionNames[faction]}修改了${commanderName}的属性：军${newMilitary}/政${newPolitical}/外${newDiplomatic}`, faction);
    
    console.log(`⚔️ 修改将领属性: ${commanderName}`, {
        old: { military: currentMilitary, political: currentPolitical, diplomatic: currentDiplomatic },
        new: { military: newMilitary, political: newPolitical, diplomatic: newDiplomatic }
    });
    
    // 关闭弹窗
    closeModifyCommanderModal();
}
