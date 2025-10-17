// 将数字转换为罗马数字
function toRomanNumeral(num) {
    const romanNumerals = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
    return num > 0 && num < romanNumerals.length ? romanNumerals[num] : 'Ⅰ';
}

// 初始化游戏
function initGame() {
    // 清理地图容器的变换样式
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.style.transform = '';
    mapContainer.className = 'map-container';
    
    // 加载指挥官数据
    const commanderLoaded = CommanderSystem.loadCommanderData();
    if (commanderLoaded) {
        console.log('开始更新军队...');
        // 根据当前年份更新罗马军团
        const romeUpdated = CommanderSystem.updateRomanLegions(gameState.currentYear);
        // 更新迦太基军团
        const carthageUpdated = CommanderSystem.updateCarthageLegions();
        addLog('指挥官数据已加载', 'system');
    }
    
    // 初始化马其顿军队
    if (armies.macedonia.length === 0) {
        const philipV = {
            id: 'macedonia_philip_v',
            commander: '菲力五世',
            military: 7,
            political: 8,
            diplomatic: 7,
            faction: 'macedonia',
            location: 'pella',
            event: 'BC218 马其顿国王',
            troops: toRomanNumeral(1),
            lightCavalry: 2000,
            heavyCavalry: 1000,
            heavyInfantry: 30000,
            lightInfantry: 2000,
            morale: 5.0
        };
        armies.macedonia.push(philipV);
        console.log('马其顿军队已初始化:', armies.macedonia);
        addLog('马其顿指挥官菲力五世已就位', 'system');
    }
    
    // 初始化塞琉古军队
    if (armies.seleucid.length === 0) {
        const antiochus = {
            id: 'seleucid_antiochus_i',
            commander: '安条克一世',
            military: 7,
            political: 8,
            diplomatic: 7,
            faction: 'seleucid',
            location: 'antioch',
            event: 'BC218 塞琉古国王',
            troops: toRomanNumeral(1),
            lightCavalry: 2000,
            heavyCavalry: 1000,
            heavyInfantry: 20000,
            lightInfantry: 2000,
            morale: 5.0
        };
        armies.seleucid.push(antiochus);
        console.log('塞琉古军队已初始化:', armies.seleucid);
        addLog('塞琉古指挥官安条克一世已就位', 'system');
    }
    
    // 初始化托勒密军队
    if (armies.ptolemy.length === 0) {
        const ptolemiiv = {
            id: 'ptolemiiv',
            commander: '托勒密四世',
            military: 6,
            political: 7,
            diplomatic: 8,
            faction: 'ptolemy',
            location: 'alexandria',
            event: 'BC218 托勒密国王',
            troops: toRomanNumeral(1),
            lightCavalry: 2000,
            heavyCavalry: 1000,
            heavyInfantry: 18000,
            lightInfantry: 2000,
            morale: 5.0
        };
        armies.ptolemy.push(ptolemiiv);
        console.log('托勒密军队已初始化:', armies.ptolemy);
        addLog('托勒密指挥官托勒密四世已就位', 'system');
    }
    
    // 初始化城市工事等级和态度
    cities.forEach(city => {
        if (city.fortificationLevel === undefined) {
            city.fortificationLevel = city.important ? 1 : 0;
        }
        
        // 初始化态度属性
        if (city.romeAttitude === undefined) {
            if (city.faction === 'rome') {
                city.romeAttitude = 5;
                city.carthageAttitude = -2;
                city.macedoniaAttitude = 0;
                city.seleucidAttitude = 0;
                city.ptolemyAttitude = 0;
            } else if (city.faction === 'carthage') {
                city.romeAttitude = 0;
                city.carthageAttitude = 3;
                city.macedoniaAttitude = 0;
                city.seleucidAttitude = 0;
                city.ptolemyAttitude = 0;
            } else if (city.faction === 'macedonia') {
                city.romeAttitude = 0;
                city.carthageAttitude = 0;
                // 佩拉特殊设置：对马其顿态度为3
                city.macedoniaAttitude = (city.id === 'pella') ? 3 : 5;
                city.seleucidAttitude = 0;
                city.ptolemyAttitude = 0;
            } else if (city.faction === 'seleucid') {
                city.romeAttitude = 0;
                city.carthageAttitude = 0;
                city.macedoniaAttitude = 0;
                // 塞琉古城市对塞琉古的态度（安条克为3，其他为1，已在gameData.js中设置为politicalScore）
                city.seleucidAttitude = city.politicalScore;
                city.ptolemyAttitude = 0;
            } else if (city.faction === 'ptolemy') {
                city.romeAttitude = 0;
                city.carthageAttitude = 0;
                city.macedoniaAttitude = 0;
                city.seleucidAttitude = 0;
                // 托勒密城市对托勒密的态度（亚历山大为3，其他为1，已在gameData.js中设置为politicalScore）
                city.ptolemyAttitude = city.politicalScore;
            } else {
                city.romeAttitude = 0;
                city.carthageAttitude = 0;
                city.macedoniaAttitude = 0;
                city.seleucidAttitude = 0;
                city.ptolemyAttitude = 0;
            }
        }
    });
    
    // 初始化时间系统
    TimeSystem.updateSeason();
    
    // 初始化城市状态追踪
    gameState.citiesBesiegedThisTurn = [];
    gameState.citiesHarassedThisTurn = [];
    
    generateMap();
    drawRoutes();
    
    // 自动执行绝对修复，确保城市位置正确
    absoluteFix();
    
    updateUI();
    
    addLog('游戏开始 - ' + TimeSystem.getFullTimeDisplay());
    addLog('第二次布匿战争爆发！汉尼拔准备进攻罗马...');
    
    // 初始化军队行动管理系统
    ArmyActionManager.initializeTurn();
}

// 获取城市中心点坐标
function getCityCenter(city) {
    // 城市坐标现在直接表示中心点
    return {
        x: city.x,
        y: city.y
    };
}

// 生成地图
function generateMap() {
    const mapContainer = document.getElementById('mapContainer');
    
    // 清除现有城市
    const existingCities = mapContainer.querySelectorAll('.city');
    existingCities.forEach(city => city.remove());
    
    cities.forEach(city => {
        const cityElement = document.createElement('div');
        cityElement.className = `city ${city.faction}${city.important ? ' important' : ''}`;
        cityElement.id = city.id;
        
        // 使用简单的中心对齐，基于基础尺寸
        const width = 12;  // 基础宽度
        const height = 14; // 基础高度
        
        cityElement.style.left = (city.x - width / 2) + 'px';
        cityElement.style.top = (city.y - height / 2) + 'px';
        
        // 重要城市使用CSS缩放
        if (city.important) {
            cityElement.style.transform = 'scale(1.2)';
            cityElement.style.transformOrigin = 'center center';
        }
        cityElement.onclick = () => selectCity(city.id);
        
        // 添加鼠标悬停事件
        cityElement.onmouseenter = (e) => showCityTooltip(city, e);
        cityElement.onmouseleave = () => hideCityTooltip();
        cityElement.onmousemove = (e) => updateTooltipPosition(e);
        
        // 添加城市标签
        const label = document.createElement('div');
        label.className = 'city-label';
        label.textContent = city.name;
        cityElement.appendChild(label);
        
        mapContainer.appendChild(cityElement);
    });
    
    // 放置军队
    placeArmies();
}

// 绘制路径
function drawRoutes() {
    const mapContainer = document.getElementById('mapContainer');
    
    // 清除现有路径
    const existingRoutes = mapContainer.querySelectorAll('.route');
    existingRoutes.forEach(route => route.remove());
    
    routes.forEach((route, index) => {
        // 支持两种格式：数组 [city1, city2] 或对象 {from, to, type}
        let city1Id, city2Id, routeType = 'land';
        if (Array.isArray(route)) {
            city1Id = route[0];
            city2Id = route[1];
        } else {
            city1Id = route.from;
            city2Id = route.to;
            routeType = route.type || 'land';
        }
        
        const city1 = cities.find(c => c.id === city1Id);
        const city2 = cities.find(c => c.id === city2Id);
        
        if (city1 && city2) {
            const routeElement = document.createElement('div');
            routeElement.className = 'route';
            // 如果是海路，添加sea-route类
            if (routeType === 'sea') {
                routeElement.classList.add('sea-route');
            }
            routeElement.setAttribute('data-route', `${city1Id}-${city2Id}`);
            routeElement.setAttribute('data-route-type', routeType);
            
            // 使用统一的中心点计算
            const center1 = getCityCenter(city1);
            const center2 = getCityCenter(city2);
            
            // 计算路径位置和角度
            const dx = center2.x - center1.x;
            const dy = center2.y - center1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // 设置路径样式和位置
            routeElement.style.left = center1.x + 'px';
            routeElement.style.top = center1.y + 'px';
            routeElement.style.width = distance + 'px';
            routeElement.style.transform = `rotate(${angle}deg)`;
            routeElement.style.zIndex = '2';
            
            mapContainer.appendChild(routeElement);
        }
    });
    
    // addLog(`绘制${routes.length} 条路径`); // 隐藏路径绘制日志
    
    // 调试：在控制台显示路径信息
    console.log('绘制的路径:', routes.map(route => {
        const city1 = cities.find(c => c.id === route[0]);
        const city2 = cities.find(c => c.id === route[1]);
        if (city1 && city2) {
            const center1 = getCityCenter(city1);
            const center2 = getCityCenter(city2);
            return `${city1.name} (${center1.x},${center1.y}) -> ${city2.name} (${center2.x},${center2.y})`;
        }
        return `路径错误: ${route[0]} -> ${route[1]}`;
    }));
}

// 放置军队标记
function placeArmies() {
    // 清除所有军队标记
    document.querySelectorAll('.army-marker').forEach(marker => {
        marker.remove();
    });
    
    console.log('放置军队 - 罗马军队数量:', armies.rome.length);
    console.log('放置军队 - 迦太基军队数量:', armies.carthage.length);
    
    // 放置罗马军队
    const mapContainer = document.getElementById('mapContainer');
    
    // 统计每个城市的罗马军队数量，用于计算正确的偏移
    const romeCityArmyCounts = {};
    armies.rome.forEach((army) => {
        const cityId = army.location;
        if (!romeCityArmyCounts[cityId]) {
            romeCityArmyCounts[cityId] = 0;
        }
    });
    
    armies.rome.forEach((army) => {
        const city = cities.find(c => c.id === army.location);
        if (city && mapContainer) {
            // 获取该军队在此城市中的索引（第几支军队）
            const cityArmyIndex = romeCityArmyCounts[army.location];
            romeCityArmyCounts[army.location]++;
            
            const armyMarker = document.createElement('div');
            armyMarker.className = 'army-marker rome';
            armyMarker.setAttribute('data-army-id', army.id);
            armyMarker.innerHTML = army.troops || 'I';
            armyMarker.title = `${army.commander} - 军事:${army.military} 政治:${army.political} 外交:${army.diplomatic || army.political}`;
            armyMarker.style.position = 'absolute';
            
            // 使用城市的实际坐标，将军队标记放在城市右侧
            // 城市宽度12px，中心在city.x，右边缘在city.x+6
            // 军队标记宽度10px，紧贴城市右侧放置，多个军队紧凑排列
            // 使用城市内的索引而不是全局索引
            armyMarker.style.left = (city.x + 8 + (cityArmyIndex * 8)) + 'px';
            armyMarker.style.top = (city.y - 5) + 'px';
            armyMarker.style.zIndex = '99999';  // 确保军队标记在所有元素之上
            
            armyMarker.onclick = (e) => {
                e.stopPropagation();
                selectArmy(army.id);
            };
            
            // 添加鼠标悬停事件
            armyMarker.onmouseenter = (e) => {
                showArmyTooltip(army, e);
            };
            armyMarker.onmouseleave = () => {
                hideArmyTooltip();
            };
            armyMarker.onmousemove = (e) => {
                updateArmyTooltipPosition(e);
            };
            
            // 如果这是当前选中的军队，添加选中样式
            if (gameState.selectedArmy === army.id) {
                armyMarker.classList.add('selected');
                armyMarker.style.zIndex = '100000';  // 选中的军队z-index更高
            }
            mapContainer.appendChild(armyMarker);
        }
    });
    
    // 放置迦太基军队
    // 统计每个城市的迦太基军队数量，用于计算正确的偏移
    const carthageCityArmyCounts = {};
    armies.carthage.forEach((army) => {
        const cityId = army.location;
        if (!carthageCityArmyCounts[cityId]) {
            carthageCityArmyCounts[cityId] = 0;
        }
    });
    
    armies.carthage.forEach((army) => {
        const city = cities.find(c => c.id === army.location);
        if (city && mapContainer) {
            // 获取该军队在此城市中的索引（第几支军队）
            const cityArmyIndex = carthageCityArmyCounts[army.location];
            carthageCityArmyCounts[army.location]++;
            
            const armyMarker = document.createElement('div');
            armyMarker.className = 'army-marker carthage';
            armyMarker.setAttribute('data-army-id', army.id);
            armyMarker.innerHTML = army.troops || 'I';
            armyMarker.title = `${army.commander} - 军事:${army.military} 政治:${army.political} 外交:${army.diplomatic || army.political}`;
            armyMarker.style.position = 'absolute';
            
            // 使用城市的实际坐标，将军队标记放在城市左侧
            // 城市宽度12px，中心在city.x，左边缘在city.x-6
            // 军队标记宽度10px，紧贴城市左侧放置，多个军队紧凑排列
            // 使用城市内的索引而不是全局索引
            armyMarker.style.left = (city.x - 18 - (cityArmyIndex * 8)) + 'px';
            armyMarker.style.top = (city.y - 5) + 'px';
            armyMarker.style.zIndex = '99999';  // 确保军队标记在所有元素之上
            
            armyMarker.onclick = (e) => {
                e.stopPropagation();
                selectArmy(army.id);
            };
            
            // 添加鼠标悬停事件
            armyMarker.onmouseenter = (e) => {
                showArmyTooltip(army, e);
            };
            armyMarker.onmouseleave = () => {
                hideArmyTooltip();
            };
            armyMarker.onmousemove = (e) => {
                updateArmyTooltipPosition(e);
            };
            
            // 如果这是当前选中的军队，添加选中样式
            if (gameState.selectedArmy === army.id) {
                armyMarker.classList.add('selected');
                armyMarker.style.zIndex = '100000';  // 选中的军队z-index更高
            }
            mapContainer.appendChild(armyMarker);
        }
    });
    
    // 放置马其顿军队
    console.log('放置军队 - 马其顿军队数量:', armies.macedonia ? armies.macedonia.length : 'undefined');
    console.log('放置军队 - armies对象keys:', Object.keys(armies));
    console.log('放置军队 - armies.macedonia详情:', armies.macedonia);
    
    if (armies.macedonia && armies.macedonia.length > 0) {
        // 统计每个城市的马其顿军队数量，用于计算正确的偏移
        const macedoniaCityArmyCounts = {};
        armies.macedonia.forEach((army) => {
            const cityId = army.location;
            if (!macedoniaCityArmyCounts[cityId]) {
                macedoniaCityArmyCounts[cityId] = 0;
            }
        });
        
        armies.macedonia.forEach((army) => {
            const city = cities.find(c => c.id === army.location);
            if (city && mapContainer) {
                // 获取该军队在此城市中的索引（第几支军队）
                const cityArmyIndex = macedoniaCityArmyCounts[army.location];
                macedoniaCityArmyCounts[army.location]++;
                
                const armyMarker = document.createElement('div');
                armyMarker.className = 'army-marker macedonia';
                armyMarker.setAttribute('data-army-id', army.id);
                armyMarker.innerHTML = army.troops || 'I';
                armyMarker.title = `${army.commander} - 军事:${army.military} 政治:${army.political} 外交:${army.diplomatic || army.political}`;
                armyMarker.style.position = 'absolute';
                
                // 马其顿军队放在城市下方
                armyMarker.style.left = (city.x - 5 + (cityArmyIndex * 8)) + 'px';
                armyMarker.style.top = (city.y + 10) + 'px';
                armyMarker.style.zIndex = '99999';  // 确保军队标记在所有元素之上
                
                armyMarker.onclick = (e) => {
                    e.stopPropagation();
                    selectArmy(army.id);
                };
                
                // 添加鼠标悬停事件
                armyMarker.onmouseenter = (e) => {
                    showArmyTooltip(army, e);
                };
                armyMarker.onmouseleave = () => {
                    hideArmyTooltip();
                };
                armyMarker.onmousemove = (e) => {
                    updateArmyTooltipPosition(e);
                };
                
                // 如果这是当前选中的军队，添加选中样式
                if (gameState.selectedArmy === army.id) {
                    armyMarker.classList.add('selected');
                    armyMarker.style.zIndex = '100000';  // 选中的军队z-index更高
                }
                mapContainer.appendChild(armyMarker);
            }
        });
    }
    
    // 放置塞琉古军队
    console.log('放置军队 - 塞琉古军队数量:', armies.seleucid ? armies.seleucid.length : 'undefined');
    console.log('放置军队 - armies.seleucid详情:', armies.seleucid);
    
    if (armies.seleucid && armies.seleucid.length > 0) {
        // 统计每个城市的塞琉古军队数量，用于计算正确的偏移
        const seleucidCityArmyCounts = {};
        armies.seleucid.forEach((army) => {
            const cityId = army.location;
            if (!seleucidCityArmyCounts[cityId]) {
                seleucidCityArmyCounts[cityId] = 0;
            }
        });
        
        armies.seleucid.forEach((army) => {
            const city = cities.find(c => c.id === army.location);
            if (city && mapContainer) {
                // 获取该军队在此城市中的索引（第几支军队）
                const cityArmyIndex = seleucidCityArmyCounts[army.location];
                seleucidCityArmyCounts[army.location]++;
                
                const armyMarker = document.createElement('div');
                armyMarker.className = 'army-marker seleucid';
                armyMarker.setAttribute('data-army-id', army.id);
                armyMarker.innerHTML = army.troops || 'I';
                armyMarker.title = `${army.commander} - 军事:${army.military} 政治:${army.political} 外交:${army.diplomatic || army.political}`;
                armyMarker.style.position = 'absolute';
                
                // 塞琉古军队放在城市左上方
                armyMarker.style.left = (city.x - 18 - (cityArmyIndex * 8)) + 'px';
                armyMarker.style.top = (city.y - 15) + 'px';
                armyMarker.style.zIndex = '99999';  // 确保军队标记在所有元素之上
                
                armyMarker.onclick = (e) => {
                    e.stopPropagation();
                    selectArmy(army.id);
                };
                
                // 添加鼠标悬停事件
                armyMarker.onmouseenter = (e) => {
                    showArmyTooltip(army, e);
                };
                armyMarker.onmouseleave = () => {
                    hideArmyTooltip();
                };
                armyMarker.onmousemove = (e) => {
                    updateArmyTooltipPosition(e);
                };
                
                // 如果这是当前选中的军队，添加选中样式
                if (gameState.selectedArmy === army.id) {
                    armyMarker.classList.add('selected');
                    armyMarker.style.zIndex = '100000';  // 选中的军队z-index更高
                }
                mapContainer.appendChild(armyMarker);
            }
        });
    }
    
    // 放置托勒密军队
    console.log('放置军队 - 托勒密军队数量:', armies.ptolemy ? armies.ptolemy.length : 'undefined');
    console.log('放置军队 - armies.ptolemy详情:', armies.ptolemy);
    
    if (armies.ptolemy && armies.ptolemy.length > 0) {
        // 统计每个城市的托勒密军队数量，用于计算正确的偏移
        const ptolemyCityArmyCounts = {};
        armies.ptolemy.forEach((army) => {
            const cityId = army.location;
            if (!ptolemyCityArmyCounts[cityId]) {
                ptolemyCityArmyCounts[cityId] = 0;
            }
        });
        
        armies.ptolemy.forEach((army) => {
            const city = cities.find(c => c.id === army.location);
            if (city && mapContainer) {
                // 获取该军队在此城市中的索引（第几支军队）
                const cityArmyIndex = ptolemyCityArmyCounts[army.location];
                ptolemyCityArmyCounts[army.location]++;
                
                const armyMarker = document.createElement('div');
                armyMarker.className = 'army-marker ptolemy';
                armyMarker.setAttribute('data-army-id', army.id);
                armyMarker.innerHTML = army.troops || 'I';
                armyMarker.title = `${army.commander} - 军事:${army.military} 政治:${army.political} 外交:${army.diplomatic || army.political}`;
                armyMarker.style.position = 'absolute';
                
                // 托勒密军队放在城市右上方
                armyMarker.style.left = (city.x + 8 + (cityArmyIndex * 8)) + 'px';
                armyMarker.style.top = (city.y - 15) + 'px';
                armyMarker.style.zIndex = '99999';  // 确保军队标记在所有元素之上
                
                armyMarker.onclick = (e) => {
                    e.stopPropagation();
                    selectArmy(army.id);
                };
                
                // 添加鼠标悬停事件
                armyMarker.onmouseenter = (e) => {
                    showArmyTooltip(army, e);
                };
                armyMarker.onmouseleave = () => {
                    hideArmyTooltip();
                };
                armyMarker.onmousemove = (e) => {
                    updateArmyTooltipPosition(e);
                };
                
                // 如果这是当前选中的军队，添加选中样式
                if (gameState.selectedArmy === army.id) {
                    armyMarker.classList.add('selected');
                    armyMarker.style.zIndex = '100000';  // 选中的军队z-index更高
                }
                mapContainer.appendChild(armyMarker);
            }
        });
    }
}

// 选择城市
function selectCity(cityId) {
    if (gameState.editMode) {
        return; // 编辑模式下不处理选择
    }
    
    // 移除之前的选择
    document.querySelectorAll('.city').forEach(c => c.classList.remove('selected'));
    
    // 选择新城市
    const city = document.getElementById(cityId);
    city.classList.add('selected');
    gameState.selectedRegion = cityId;
    
    const cityData = cities.find(c => c.id === cityId);
    // addLog(`选择了城市 ${cityData.name}`); // 隐藏城市选择日志
    
    // 检查是否有当前应该行动的军队
    const currentActionArmy = ArmyActionManager.getCurrentActionArmy();
    
    if (currentActionArmy) {
        // 如果有当前行动的军队，保持选中状态，不清除
        gameState.selectedArmy = currentActionArmy.id;
        
        // 更新军队标记选中状态
        document.querySelectorAll('.army-marker').forEach(marker => {
            marker.classList.remove('selected');
        });
        const currentMarker = document.querySelector(`[data-army-id="${currentActionArmy.id}"]`);
        if (currentMarker) {
            currentMarker.classList.add('selected');
            currentMarker.style.zIndex = '100000';
        }
        
        // 显示当前军队的详情
        showArmyDetails(currentActionArmy);
    } else {
        // 没有当前行动的军队时，清除军队选择
        gameState.selectedArmy = null;
        document.querySelectorAll('.army-marker').forEach(marker => {
            marker.classList.remove('selected');
        });
        hideArmyDetails();
        
        // 显示城市详情
        showCityDetails(cityData);
    }
    
    // 如果有选中的军队，显示可移动路线
    if (gameState.selectedArmy) {
        highlightPossibleMoves(cityId);
    }
}

// 计算军队战斗力
function calculateCombatPower(army) {
    const lightCavalryPower = (army.lightCavalry || 0) * 3;
    const heavyCavalryPower = (army.heavyCavalry || 0) * 5;
    const heavyInfantryPower = (army.heavyInfantry || 0) * 2;
    const lightInfantryPower = (army.lightInfantry || 0) * 1;
    const morale = army.morale || 5;
    const militarySkill = army.military; // 使用实际的军事能力
    const totalPower = (lightCavalryPower + heavyCavalryPower + heavyInfantryPower + lightInfantryPower) * morale / 3000 * militarySkill;
    return Math.floor(totalPower);
}

// 检查并处理部队消灭
function checkAndHandleArmyDestruction(army) {
    // 如果军队已经被标记为消灭，避免重复处理
    if (army.destroyed) {
        return true;
    }
    
    const combatPower = calculateCombatPower(army);
    
    // 罗马军队战斗力50以下被消灭，迦太基和马其顿军队战斗力20以下被消灭
    const destructionThreshold = 5;
    if (combatPower < destructionThreshold) {
        // 标记军队为已消灭，避免重复处理
        army.destroyed = true;
        
        addLog(`${army.commander} 的部队战斗力降至 ${combatPower}，部队被消灭！`, army.faction);
        
        
        // 从游戏中移除原军队
        const faction = army.faction;
        const armyLocation = army.location;
        const armyIndex = armies[faction].findIndex(a => a.id === army.id);
        if (armyIndex >= 0) {
            armies[faction].splice(armyIndex, 1);
        }
        
        // 检查军队被消灭后是否需要解除围城
        checkAllSiegesAfterArmyRemoval();
        
        // 重新生成地图以反映变化
        generateMap();
        placeArmies();
        
        return true; // 返回true表示部队被消灭
    }
    
    return false; // 返回false表示部队存活
}


// 显示部队详情
function showArmyDetails(army) {
    const panel = document.getElementById('armyDetailsPanel');
    const cityName = cities.find(c => c.id === army.location).name || '未知位置';
    
    // 更新显示内容
    document.getElementById('detailCommanderName').textContent = army.commander;
    document.getElementById('detailLocation').textContent = cityName;
    document.getElementById('detailLightCavalry').textContent = army.lightCavalry || 2000;
    document.getElementById('detailHeavyCavalry').textContent = army.heavyCavalry || 1000;
    document.getElementById('detailHeavyInfantry').textContent = army.heavyInfantry || 20000;
    document.getElementById('detailLightInfantry').textContent = army.lightInfantry || 2000;
    
    // 将领能力值（显示实际CSV数据中的值）
    document.getElementById('detailMilitary').textContent = army.military;
    document.getElementById('detailPolitical').textContent = army.political;
    document.getElementById('detailDiplomatic').textContent = army.diplomatic || army.political;
    
    // 士气和战斗力
    document.getElementById('detailMorale').textContent = army.morale || 5;
    document.getElementById('detailCombatPower').textContent = calculateCombatPower(army);
    
    // 显示面板
    panel.style.display = 'block';
}

// 隐藏部队详情
function hideArmyDetails() {
    const panel = document.getElementById('armyDetailsPanel');
    panel.style.display = 'none';
}

// 显示城市详情（主页面板）
function showCityDetails(city) {
    const panel = document.getElementById('cityDetailsPanel');
    
    // 更新显示内容
    document.getElementById('detailCityName').textContent = city.name;
    document.getElementById('detailCityImportance').textContent = city.important ? '重要城市' : '普通城市';
    document.getElementById('detailCityPolitical').textContent = city.politicalScore + ' ';
    document.getElementById('detailCityEconomic').textContent = city.economicScore + ' ';
    document.getElementById('detailCityFortification').textContent = (city.fortificationLevel || 0) + ' ';
    document.getElementById('detailCityRomeAttitude').textContent = (city.romeAttitude || 0);

    // 更新围城状态
    const siegeElement = document.getElementById('detailCitySiege');
    if (city.isUnderSiege) {
        let besiegingName = '未知';
        if (city.besiegingFaction === 'rome') besiegingName = '罗马';
        else if (city.besiegingFaction === 'carthage') besiegingName = '迦太基';
        else if (city.besiegingFaction === 'macedonia') besiegingName = '马其顿';
        else if (city.besiegingFaction === 'seleucid') besiegingName = '塞琉古';
        else if (city.besiegingFaction === 'ptolemy') besiegingName = '托勒密';
        siegeElement.textContent = `${besiegingName}围城 (${city.siegeCount}回合)`;
        siegeElement.style.color = '#e74c3c';
    } else {
        siegeElement.textContent = '无围城';
        siegeElement.style.color = '#27ae60';
    }
    document.getElementById('detailCityCarthageAttitude').textContent = (city.carthageAttitude || 0);
    document.getElementById('detailCityMacedoniaAttitude').textContent = (city.macedoniaAttitude || 0);
    document.getElementById('detailCitySeleucidAttitude').textContent = (city.seleucidAttitude || 0);
    document.getElementById('detailCityPtolemyAttitude').textContent = (city.ptolemyAttitude || 0);
    

    
    // 更新势力归属
    const factionElement = document.getElementById('detailCityFaction');
    let factionName = '中立';
    if (city.faction === 'rome') {
        factionName = '罗马';
    } else if (city.faction === 'carthage') {
        factionName = '迦太基';
    } else if (city.faction === 'macedonia') {
        factionName = '马其顿';
    } else if (city.faction === 'seleucid') {
        factionName = '塞琉古';
    } else if (city.faction === 'ptolemy') {
        factionName = '托勒密';
    }
    factionElement.textContent = factionName;
    factionElement.className = `faction-value ${city.faction}`;
    
    // 更新分数颜色
    const politicalElement = document.getElementById('detailCityPolitical');
    politicalElement.style.color = city.politicalScore >= 5 ? '#f39c12' : '#ecf0f1';
    
    const economicElement = document.getElementById('detailCityEconomic');
    economicElement.style.color = city.economicScore >= 4 ? '#27ae60' : city.economicScore >= 3 ? '#f39c12' : '#ecf0f1';
    
    // 显示面板
    panel.style.display = 'block';
}

// 隐藏城市详情
function hideCityDetails() {
    const panel = document.getElementById('cityDetailsPanel');
    panel.style.display = 'none';
}

// 选择军队
function selectArmy(armyId) {
    const army = getAllArmies().find(a => a.id === armyId);
    
    if (!army) {
        return;
    }
    
    // 检查是否是当前应该行动的军队
    const currentActionArmy = ArmyActionManager.getCurrentActionArmy();
    
    // 如果有当前应该行动的军队，且选择的不是该军队
    if (currentActionArmy && currentActionArmy.id !== armyId) {
        // 检查是否是同阵营的军队
        if (army.faction === gameState.currentPlayer) {
            addLog(`当前轮到 ${currentActionArmy.commander} 行动，请先完成该军队的行动或跳过`, 'warning');
            return;
        }
    }
    
    // 清除之前选中的军队样式
    document.querySelectorAll('.army-marker').forEach(marker => {
        marker.classList.remove('selected');
    });
    
    gameState.selectedArmy = armyId;
    // addLog(`选择了军队 ${army.commander}`); // 隐藏军队选择日志
    
    // 为选中的军队添加选中样式
    const selectedArmyMarker = document.querySelector(`[data-army-id="${armyId}"]`);
    if (selectedArmyMarker) {
        selectedArmyMarker.classList.add('selected');
    }
    
    // 隐藏城市详情并显示部队详情
    hideCityDetails();
    showArmyDetails(army);
    
    // 高亮显示可移动的城市
    highlightPossibleMoves(army.location);
}

// 高亮显示可能的移动路线
function highlightPossibleMoves(fromCityId) {   
    // 清除之前的高亮样式
    document.querySelectorAll('.route.active').forEach(r => r.classList.remove('active'));
    
    // 找到所有连接的城市
    const connectedCities = getConnectedCities(fromCityId);
    
    // 使用data属性来精确匹配路径
    routes.forEach(route => {
        // 支持两种格式：数组 [city1, city2] 或对象 {from, to, type}
        let city1Id, city2Id;
        if (Array.isArray(route)) {
            city1Id = route[0];
            city2Id = route[1];
        } else {
            city1Id = route.from;
            city2Id = route.to;
        }
        
        if (city1Id === fromCityId || city2Id === fromCityId) {
            const routeId1 = `${city1Id}-${city2Id}`;
            const routeId2 = `${city2Id}-${city1Id}`;
            
            const routeElement = document.querySelector(`[data-route="${routeId1}"]`) || 
                               document.querySelector(`[data-route="${routeId2}"]`);
            
            if (routeElement) {
                routeElement.classList.add('active');
            }
        }
    });
}

// 获取连接的城市
/**
 * 检查两个城市之间是否是海路连接
 */
function isSeaRoute(cityId1, cityId2) {
    for (const route of routes) {
        if (Array.isArray(route)) {
            // 普通陆路连接：['city1', 'city2']
            continue;
        } else if (route.type === 'sea') {
            // 海路连接：{from: 'city1', to: 'city2', type: 'sea'}
            if ((route.from === cityId1 && route.to === cityId2) ||
                (route.from === cityId2 && route.to === cityId1)) {
                return true;
            }
        }
    }
    return false;
}

function getConnectedCities(cityId) {
    const connected = [];
    routes.forEach(route => {
        // 支持两种格式：数组 [city1, city2] 或对象 {from, to, type}
        let city1Id, city2Id;
        if (Array.isArray(route)) {
            city1Id = route[0];
            city2Id = route[1];
        } else {
            city1Id = route.from;
            city2Id = route.to;
        }
        
        if (city1Id === cityId) {
            connected.push(city2Id);
        } else if (city2Id === cityId) {
            connected.push(city1Id);
        }
    });
    return connected;
}

// 获取所有军队
function getAllArmies() {
    return [...armies.rome, ...armies.carthage, ...(armies.macedonia || []), ...(armies.seleucid || []), ...(armies.ptolemy || [])];
}

// 执行行动
function executeAction(action) {
    if (action === 'move') {
        executeMove();
        return;
    }
    
    if (action === 'attack') {
        executeAttack();
        return;
    }

    // 借款和还款是阵营行动，不需要选择城市或军队，也不消耗当前军队行动机会
    if (action === 'borrow') {
        executeBorrow();
        return;
    }
    if (action === 'repay') {
        executeRepay();
        return;
    }
    
    // 组军也是阵营行动，不消耗当前军队行动机会
    if (action === 'raise_army') {
        executeRaiseArmy();
        return;
    }
    
    // 解散是针对当前军队的特殊行动
    if (action === 'disband') {
        executeDisband();
        return;
    }

    // 获取当前应该行动的军队
    const currentActionArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentActionArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return;
    }
    
    // 强制使用当前应该行动的军队
    gameState.selectedArmy = currentActionArmy.id;

    // 对于不需要选择目标城市的动作，自动使用军队当前所在城市
    const actionsWithoutTarget = ['siege', 'recruit', 'reorganize', 'fortify'];
    if (actionsWithoutTarget.includes(action)) {
        gameState.selectedRegion = currentActionArmy.location;
    }

    // 对于需要选择目标的动作，检查是否已选择城市
    const actionsNeedTarget = ['harass', 'diplomacy'];
    if (actionsNeedTarget.includes(action) && !gameState.selectedRegion) {
        addLog('请先选择一个目标城市', 'error');
        return;
    }

    // 围城行动有自己的判定逻辑，直接处理
    if (action === 'siege') {
        const actionResult = processActionResult(action, true); // 围城不需要这里的骰子判定
        
        // 围城行动的标记逻辑：
        // - 如果actionResult为false（前置条件检查失败），不标记，让玩家重新选择
        // - 如果actionResult为true（围城执行）：
        //   * 围城失败：在 executeSiegeWithStateChange/executeSiege 内部 500ms 后标记
        //   * 围城成功：在 handleCityDestroy 内部 1000ms 后标记
        
        if (actionResult === false) {
            addLog('行动失败，请重新选择行动', 'error');
        }
        return;
    }

    let diceCount, targetNumber, skillType;
    
    switch (action) {
        case 'harass':
            // 骚扰使用特殊处理，不在这里设置骰子参数
            return executeHarass();
            break;
        case 'diplomacy':
            // 游说使用特殊处理，不在这里设置骰子参数
            return executeDiplomacy();
            break;
        case 'recruit':
            // 征召使用特殊处理，不在这里设置骰子参数
            return executeRecruit();
            break;
        case 'reorganize':
            // 整编使用特殊处理，不在这里设置骰子参数
            return executeReorganize();
            break;
        case 'fortify':
            // 修筑使用特殊处理，不在这里设置骰子参数
            return executeFortify();
            break;
        case 'raise_army':
            // 组军使用特殊处理，不在这里设置骰子参数
            return executeRaiseArmy();
            break;
        case 'borrow':
            // 借款使用特殊处理，不在这里设置骰子参数
            return executeBorrow();
            break;
        case 'repay':
            // 还款使用特殊处理，不在这里设置骰子参数
            return executeRepay();
            break;
    }

    const result = rollDice(diceCount);
    const success = result <= targetNumber;
    
    showDiceResult(diceCount, result, targetNumber, success);
    const actionResult = processActionResult(action, success);
    
    // 只有在行动完全成功时才标记军队已行动
    if (actionResult !== false) {
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 2000);
    } else {
        addLog('行动失败，请重新选择行动', 'error');
    }
}

// 执行骚扰
function executeHarass() {
    // 获取当前应该行动的军队
    const currentArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return false;
    }

    const targetCity = cities.find(c => c.id === gameState.selectedRegion);
    if (!targetCity) {
        addLog('找不到目标城市', 'error');
        return false;
    }

    // 检查是否在军队所在地区或相邻地区
    const isAtSameLocation = currentArmy.location === gameState.selectedRegion;
    const connectedCities = getConnectedCities(currentArmy.location);
    const isAdjacent = connectedCities.includes(gameState.selectedRegion);
    
    if (!isAtSameLocation && !isAdjacent) {
        addLog(`${currentArmy.commander} 不在 ${targetCity.name} 或其相邻地区，无法骚扰`, 'error');
        return false;
    }

    // 骚扰不再消耗资金    
    const harassCost = 0;

    // 执行骚扰判定：投掷D6，小于将领军事能力则成功
    const diceResult = rollDice(2);
    const targetNumber = currentArmy.military;
    const success = diceResult < targetNumber;
    
    showDiceResult(2, diceResult, targetNumber, success);
    
    // 记录本回合被骚扰的城市（无论成功失败）
    if (!gameState.citiesHarassedThisTurn.includes(targetCity.id)) {
        gameState.citiesHarassedThisTurn.push(targetCity.id);
    }
    
    if (success) {
        // 骚扰成功的效果
        // 1. 该地区对本阵营态度设为-2
        if (gameState.currentPlayer === 'rome') {
            targetCity.romeAttitude = -2;
        } else if (gameState.currentPlayer === 'carthage') {
            targetCity.carthageAttitude = -2;
        } else if (gameState.currentPlayer === 'macedonia') {
            targetCity.macedoniaAttitude = -2;
        } else if (gameState.currentPlayer === 'seleucid') {
            targetCity.seleucidAttitude = -2;
        } else if (gameState.currentPlayer === 'ptolemy') {
            targetCity.ptolemyAttitude = -2;
        }   
        
        // 2. 该地区经济分-1（最低不低于0）
        targetCity.economicScore = Math.max(0, (targetCity.economicScore || 0) - 1);
        
        // 3. 若该地区有敌对阵营驻军，该敌军士气-0.5
        let enemyFactions = [];
        if (gameState.currentPlayer === 'rome') {
            enemyFactions = ['carthage', 'macedonia', 'seleucid', 'ptolemy'];
        } else if (gameState.currentPlayer === 'carthage') {
            enemyFactions = ['rome', 'macedonia', 'seleucid', 'ptolemy'];
        } else if (gameState.currentPlayer === 'macedonia') {
            enemyFactions = ['rome', 'carthage', 'seleucid', 'ptolemy'];
        } else if (gameState.currentPlayer === 'seleucid') {
            enemyFactions = ['rome', 'carthage', 'macedonia', 'ptolemy'];
        } else if (gameState.currentPlayer === 'ptolemy') {
            enemyFactions = ['rome', 'carthage', 'macedonia', 'seleucid'];
        }   
        
        let moraleEffectMsg = '';
        enemyFactions.forEach(enemyFaction => {
            const enemyArmiesAtCity = CityArmyManager.getArmiesAtCityByFaction(targetCity.id, enemyFaction);
            if (enemyArmiesAtCity.length > 0) {
                enemyArmiesAtCity.forEach(army => {
                    const originalArmy = armies[enemyFaction].find(a => a.id === army.id);
                    if (originalArmy) {
                        const oldMorale = originalArmy.morale;
                        originalArmy.morale = Math.max(1, originalArmy.morale - 0.5);
                        moraleEffectMsg += ` ${originalArmy.commander}士气${oldMorale}降至${originalArmy.morale}`;
                    }
                });
            }
        });
        
        // 4. 投掷D6获得资金奖励
        const goldDice = rollDice(1);
        const goldReward = goldDice * 10;
        if (gameState.currentPlayer === 'rome') {
            gameState.romeFunds += goldReward;
        } else if (gameState.currentPlayer === 'carthage') {
            gameState.carthageFunds += goldReward;
        } else if (gameState.currentPlayer === 'macedonia') {
            gameState.macedoniaFunds += goldReward;
        } else if (gameState.currentPlayer === 'seleucid') {
            gameState.seleucidFunds += goldReward;
        } else if (gameState.currentPlayer === 'ptolemy') {
            gameState.ptolemyFunds += goldReward;
        }
        
        let attitudeCurrentValue;
        if (gameState.currentPlayer === 'rome') {
            attitudeCurrentValue = targetCity.romeAttitude;
        } else if (gameState.currentPlayer === 'carthage') {
            attitudeCurrentValue = targetCity.carthageAttitude;
        } else if (gameState.currentPlayer === 'macedonia') {
            attitudeCurrentValue = targetCity.macedoniaAttitude;
        } else if (gameState.currentPlayer === 'seleucid') {
            attitudeCurrentValue = targetCity.seleucidAttitude;
        } else if (gameState.currentPlayer === 'ptolemy') {
            attitudeCurrentValue = targetCity.ptolemyAttitude;
        }
        
        addLog(`${currentArmy.commander} 成功骚扰 ${targetCity.name}，该地区对己方态度设为-2，经济分-1(当前:${targetCity.economicScore})${moraleEffectMsg}，投掷${goldDice}获得${goldReward}资金`, gameState.currentPlayer);
        
        // 记录行动结果
        recordArmyAction(currentArmy, '骚扰', 'success', `骚扰${targetCity.name}成功，获得${goldReward}资金`);
        
        // 更新城市显示和资金显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
        updateFactionScores();
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    } else {
        addLog(`${currentArmy.commander} 骚扰 ${targetCity.name} 失败`, gameState.currentPlayer);
        
        // 记录行动结果
        recordArmyAction(currentArmy, '骚扰', 'failed', `骚扰${targetCity.name}失败`);
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    }
}

// 执行游说
function executeDiplomacy() {
    // 获取当前应该行动的军队
    const currentArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return false;
    }

    const targetCity = cities.find(c => c.id === gameState.selectedRegion);
    if (!targetCity) {
        addLog('找不到目标城市', 'error');
        return false;
    }

    // 检查游说前置条件
    if (!canPersuadeCity(currentArmy, targetCity)) {
        return false;
    }

        // 检查资金是否足够
    const diplomacyCost = 20;
    let currentFunds;
    if (gameState.currentPlayer === 'rome') {
        currentFunds = gameState.romeFunds;
    } else if (gameState.currentPlayer === 'carthage') {
        currentFunds = gameState.carthageFunds;
    } else if (gameState.currentPlayer === 'macedonia') {
        currentFunds = gameState.macedoniaFunds;
    } else if (gameState.currentPlayer === 'seleucid') {
        currentFunds = gameState.seleucidFunds;
    } else if (gameState.currentPlayer === 'ptolemy') {
        currentFunds = gameState.ptolemyFunds;
    }
    
    if (currentFunds < diplomacyCost) {
        addLog(`资金不足，无法游说（需${diplomacyCost}资金）`, 'error');
        return false;
    }       

    // 先扣除游说资金
    if (gameState.currentPlayer === 'rome') {
        gameState.romeFunds -= diplomacyCost;
    } else if (gameState.currentPlayer === 'carthage') {
        gameState.carthageFunds -= diplomacyCost;
    } else if (gameState.currentPlayer === 'macedonia') {
        gameState.macedoniaFunds -= diplomacyCost;
    } else if (gameState.currentPlayer === 'seleucid') {
        gameState.seleucidFunds -= diplomacyCost;
    } else if (gameState.currentPlayer === 'ptolemy') {
        gameState.ptolemyFunds -= diplomacyCost;
    }

    // 执行游说判定
    const diceResult = rollDice(2);
    const diplomaticSkill = currentArmy.diplomatic || currentArmy.political; // 使用外交能力，如果没有则用政治能力
    const success = diceResult < diplomaticSkill;
    
    showDiceResult(2, diceResult, diplomaticSkill, success);
    
    if (success) {
        // 游说成功，增加对本阵营的态度
        if (gameState.currentPlayer === 'rome') {
            targetCity.romeAttitude = (targetCity.romeAttitude || 0) + 1;
            addLog(`${currentArmy.commander} 成功游说 ${targetCity.name}，该城市对罗马态度 +1 (当前: ${targetCity.romeAttitude})，消耗${diplomacyCost}资金`, gameState.currentPlayer);
        } else if (gameState.currentPlayer === 'carthage') {
            targetCity.carthageAttitude = (targetCity.carthageAttitude || 0) + 1;
            addLog(`${currentArmy.commander} 成功游说 ${targetCity.name}，该城市对迦太基态度 +1 (当前: ${targetCity.carthageAttitude})，消耗${diplomacyCost}资金`, gameState.currentPlayer);
        } else if (gameState.currentPlayer === 'macedonia') {
            targetCity.macedoniaAttitude = (targetCity.macedoniaAttitude || 0) + 1;
            addLog(`${currentArmy.commander} 成功游说 ${targetCity.name}，该城市对马其顿态度 +1 (当前: ${targetCity.macedoniaAttitude})，消耗${diplomacyCost}资金`, gameState.currentPlayer);
        } else if (gameState.currentPlayer === 'seleucid') {
            targetCity.seleucidAttitude = (targetCity.seleucidAttitude || 0) + 1;
            addLog(`${currentArmy.commander} 成功游说 ${targetCity.name}，该城市对塞琉古态度 +1 (当前: ${targetCity.seleucidAttitude})，消耗${diplomacyCost}资金`, gameState.currentPlayer);
        } else if (gameState.currentPlayer === 'ptolemy') {
            targetCity.ptolemyAttitude = (targetCity.ptolemyAttitude || 0) + 1;
            addLog(`${currentArmy.commander} 成功游说 ${targetCity.name}，该城市对托勒密态度 +1 (当前: ${targetCity.ptolemyAttitude})，消耗${diplomacyCost}资金`, gameState.currentPlayer);
        }
        
        // 检查并更新城市阵营
        const newFaction = checkCityFactionByAttitude(targetCity);
        if (newFaction !== targetCity.faction) {
            const getFactionName = (faction) => {
                if (faction === 'rome') return '罗马';
                if (faction === 'carthage') return '迦太基';
                if (faction === 'macedonia') return '马其顿';
                if (faction === 'seleucid') return '塞琉古';
                if (faction === 'ptolemy') return '托勒密';
                return '中立';
            };
            const oldFactionName = getFactionName(targetCity.faction);
            const newFactionName = getFactionName(newFaction);
            changeFaction(gameState.selectedRegion, newFaction);
            addLog(`${targetCity.name} 由于态度变化，阵营从${oldFactionName}转为${newFactionName}`, 'system');
        }
        
        // 清除围城状态（如果有）
        if (targetCity.isUnderSiege) {
            SiegeSystem.liftSiege(gameState.selectedRegion, '游说成功');
        }
        
        // 记录行动结果
        recordArmyAction(currentArmy, '游说', 'success', `游说${targetCity.name}成功，态度+1`);
        
        // 更新资金显示
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    } else {
        // 记录行动结果
        recordArmyAction(currentArmy, '游说', 'failed', `游说${targetCity.name}失败`);
        
        // 随机选择一个戏剧性理由
        const diplomacyFailureReasons = [
            '给当地议员的行贿礼物被送错了门',
            '得罪了当地议员的小妾被吹枕头风',
            '游说当地议会前食用大蒜导致口臭',
            '行贿当地议员的礼金被中介漂没',
            '使者在当地赌博被黑帮打死',
            '使者在当地嫖娼拒不付款被淹死在厕所',
            '在议会演讲时放屁被认为不尊重该城市',
            '昏了头！竟然没带翻译'
        ];
        const randomReason = diplomacyFailureReasons[Math.floor(Math.random() * diplomacyFailureReasons.length)];
        
        addLog(`${currentArmy.commander} 游说 ${targetCity.name} 失败（${randomReason}！），消耗${diplomacyCost}资金`, gameState.currentPlayer);
        // 更新资金显示
        updateFactionFunds();
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    }
}

// 执行修筑
function executeFortify() {
    // 获取当前应该行动的军队
    const currentArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return false;
    }

    const targetCity = cities.find(c => c.id === gameState.selectedRegion);
    if (!targetCity) {
        addLog('找不到目标城市', 'error');
        return false;
    }

    // 检查军队是否在该城市
    if (currentArmy.location !== gameState.selectedRegion) {
        addLog(`${currentArmy.commander} 不在 ${targetCity.name}，无法进行修筑`, 'error');
        return false;
    }

    // 检查是否为本阵营城市
    if (targetCity.faction !== gameState.currentPlayer) {
        addLog(`${targetCity.name} 不是己方城市，无法进行修筑`, 'error');
        return false;
    }

    // 检查资金是否足够（至少需20资金用于失败情况）
    let currentFunds;
    if (gameState.currentPlayer === 'rome') {
        currentFunds = gameState.romeFunds;
    } else if (gameState.currentPlayer === 'carthage') {
        currentFunds = gameState.carthageFunds;
    } else if (gameState.currentPlayer === 'macedonia') {
        currentFunds = gameState.macedoniaFunds;
    } else if (gameState.currentPlayer === 'seleucid') {
        currentFunds = gameState.seleucidFunds;
    } else if (gameState.currentPlayer === 'ptolemy') {
        currentFunds = gameState.ptolemyFunds;
    }
    
    if (currentFunds < 20) {
        addLog(`资金不足，无法进行修筑（至少需20资金）`, 'error');
        return false;
    }

    // 执行修筑判定：投掷D6，小于将领政治能力则成功
    const diceResult = rollDice(2);
    const targetNumber = currentArmy.political;
    const success = diceResult < targetNumber;
    
    showDiceResult(2, diceResult, targetNumber, success);
    
    if (success) {
        // 修筑成功，工事等级+1（最高5级），经济分+5，消100资金
        const cost = 100;
        if (gameState.currentPlayer === 'rome') {
            gameState.romeFunds -= cost;
        } else if (gameState.currentPlayer === 'carthage') {
            gameState.carthageFunds -= cost;
        } else if (gameState.currentPlayer === 'macedonia') {
            gameState.macedoniaFunds -= cost;
        } else if (gameState.currentPlayer === 'seleucid') {
            gameState.seleucidFunds -= cost;
        } else if (gameState.currentPlayer === 'ptolemy') {
            gameState.ptolemyFunds -= cost;
        }
        
        const currentFortLevel = targetCity.fortificationLevel || 0;
        const maxFortLevel = 5; // 最高工事等级
        
        // 检查工事等级是否已达上限
        if (currentFortLevel < maxFortLevel) {
            // 未达上限，工事等级+1，经济分+5
            targetCity.fortificationLevel = currentFortLevel + 1;
            targetCity.economicScore = (targetCity.economicScore || 0) + 5;
            addLog(`${currentArmy.commander} 修筑成功，工事等级提升至 ${targetCity.fortificationLevel}，经济分数提升至 ${targetCity.economicScore}，消${cost}资金`, gameState.currentPlayer);
        } else {
            // 已达上限，只增加经济分
            targetCity.economicScore = (targetCity.economicScore || 0) + 5;
            addLog(`${currentArmy.commander} 修筑成功，工事已达最高等级(${maxFortLevel})，经济分数提升至 ${targetCity.economicScore}，消${cost}资金`, gameState.currentPlayer);
        }
        
        // 修筑成功，该城市对本阵营态度+1
        if (gameState.currentPlayer === 'rome') {
            const oldAttitude = targetCity.romeAttitude || 0;
            targetCity.romeAttitude = oldAttitude + 1;
            addLog(`${targetCity.name} 对罗马态度 +1 (修筑提升，当前 ${targetCity.romeAttitude})`, 'system');
        } else if (gameState.currentPlayer === 'carthage') {
            const oldAttitude = targetCity.carthageAttitude || 0;
            targetCity.carthageAttitude = oldAttitude + 1;
            addLog(`${targetCity.name} 对迦太基态度 +1 (修筑提升，当前 ${targetCity.carthageAttitude})`, 'system');
        } else if (gameState.currentPlayer === 'macedonia') {
            const oldAttitude = targetCity.macedoniaAttitude || 0;
            targetCity.macedoniaAttitude = oldAttitude + 1;
            addLog(`${targetCity.name} 对马其顿态度 +1 (修筑提升，当前 ${targetCity.macedoniaAttitude})`, 'system');
        } else if (gameState.currentPlayer === 'seleucid') {
            const oldAttitude = targetCity.seleucidAttitude || 0;
            targetCity.seleucidAttitude = oldAttitude + 1;
            addLog(`${targetCity.name} 对塞琉古态度 +1 (修筑提升，当前 ${targetCity.seleucidAttitude})`, 'system');
        } else if (gameState.currentPlayer === 'ptolemy') {
            const oldAttitude = targetCity.ptolemyAttitude || 0;
            targetCity.ptolemyAttitude = oldAttitude + 1;
            addLog(`${targetCity.name} 对托勒密态度 +1 (修筑提升，当前 ${targetCity.ptolemyAttitude})`, 'system');
        }
        
        // 记录行动结果
        const fortDetail = currentFortLevel < maxFortLevel ? 
            `修筑${targetCity.name}成功，工事等级提升至${targetCity.fortificationLevel}` :
            `修筑${targetCity.name}成功，工事已达最高等级`;
        recordArmyAction(currentArmy, '修筑', 'success', fortDetail);
        
        // 更新城市显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
        updateFactionScores();
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    } else {
        // 记录行动结果
        recordArmyAction(currentArmy, '修筑', 'failed', `修筑${targetCity.name}失败`);
        
        // 修筑失败，消20资金
        const cost = 20;
        if (gameState.currentPlayer === 'rome') {
            gameState.romeFunds -= cost;
        } else if (gameState.currentPlayer === 'carthage') {
            gameState.carthageFunds -= cost;
        } else if (gameState.currentPlayer === 'macedonia') {
            gameState.macedoniaFunds -= cost;
        } else if (gameState.currentPlayer === 'seleucid') {
            gameState.seleucidFunds -= cost;
        } else if (gameState.currentPlayer === 'ptolemy') {
            gameState.ptolemyFunds -= cost;
        }
        
        // 随机选择一个戏剧性理由
        const fortifyFailureReasons = [
            '后勤官员贪污受贿，建筑材料以次充好',
            '遭遇暴雨导致山洪暴发',
            '建筑师房间失火导致图纸被烧毁',
            '修筑行动被当地百姓认为破坏风水',
            '修筑资金因不明原因被盗',
            '建筑仓库因不可言说的理由失火',
            '修筑地基勘察出问题导致塌方',
            '当地举行淫趴节庆，工人罢工'
        ];
        const randomReason = fortifyFailureReasons[Math.floor(Math.random() * fortifyFailureReasons.length)];
        
        addLog(`${currentArmy.commander} 修筑失败（${randomReason}！），消${cost}资金`, gameState.currentPlayer);
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    }
}

// 执行征召
function executeRecruit() {
    // 获取当前应该行动的军队
    const currentArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return false;
    }

    // 检查资金是否足够（最低需50资金）
    let currentFunds;
    if (gameState.currentPlayer === 'rome') {
        currentFunds = gameState.romeFunds;
    } else if (gameState.currentPlayer === 'carthage') {
        currentFunds = gameState.carthageFunds;
    } else if (gameState.currentPlayer === 'macedonia') {
        currentFunds = gameState.macedoniaFunds;
    } else if (gameState.currentPlayer === 'seleucid') {
        currentFunds = gameState.seleucidFunds;
    } else if (gameState.currentPlayer === 'ptolemy') {
        currentFunds = gameState.ptolemyFunds;
    }
    
    if (currentFunds < 150) {
        addLog(`资金不足，无法征召（至少需50资金）`, 'error');
        return false;
    }

    // 执行征召判定：投掷D6，小于将领政治能力则成功
    const diceResult = rollDice(2);
    const targetNumber = currentArmy.political;
    const success = diceResult < targetNumber;
    
    showDiceResult(2, diceResult, targetNumber, success);
    
    if (success) {
        // 征召成功：增5%士兵，减少资200，减少士气
        const cost = 200;
        const troopIncrease = 0.15;
        const moraleDecrease = 1;
        
        // 扣除资金
        if (gameState.currentPlayer === 'rome') {
            gameState.romeFunds = Math.max(0, gameState.romeFunds - cost);
        } else if (gameState.currentPlayer === 'carthage') {
            gameState.carthageFunds = Math.max(0, gameState.carthageFunds - cost);
        } else if (gameState.currentPlayer === 'macedonia') {
            gameState.macedoniaFunds = Math.max(0, gameState.macedoniaFunds - cost);
        } else if (gameState.currentPlayer === 'seleucid') {
            gameState.seleucidFunds = Math.max(0, gameState.seleucidFunds - cost);
        } else if (gameState.currentPlayer === 'ptolemy') {
            gameState.ptolemyFunds = Math.max(0, gameState.ptolemyFunds - cost);
        }
        
        // 增加部队
        const oldTroops = {
            lightCavalry: currentArmy.lightCavalry,
            heavyCavalry: currentArmy.heavyCavalry,
            heavyInfantry: currentArmy.heavyInfantry,
            lightInfantry: currentArmy.lightInfantry
        };
        
        currentArmy.lightCavalry = Math.round(currentArmy.lightCavalry * (1 + troopIncrease));
        currentArmy.heavyCavalry = Math.round(currentArmy.heavyCavalry * (1 + troopIncrease));
        currentArmy.heavyInfantry = Math.round(currentArmy.heavyInfantry * (1 + troopIncrease));
        currentArmy.lightInfantry = Math.round(currentArmy.lightInfantry * (1 + troopIncrease));
        
        // 减少士气
        const oldMorale = currentArmy.morale;
        currentArmy.morale = Math.max(1, currentArmy.morale - moraleDecrease);
        
        addLog(`${currentArmy.commander} 征召成功！部队规模增5%，士气从${oldMorale}降至${currentArmy.morale}，消${cost}资金`, gameState.currentPlayer);
        
        // 记录行动结果
        recordArmyAction(currentArmy, '征召', 'success', `征召成功，部队规模增15%`);
        
        // 更新部队详情显示
        if (gameState.selectedArmy === currentArmy.id) {
            showArmyDetails(currentArmy);
        }
        
        // 更新资金显示
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    } else {
        // 记录行动结果
        recordArmyAction(currentArmy, '征召', 'failed', `征召失败，部队规模仅增5%`);
        
                // 征召失败：增5%士兵，减少资50，减少士气0.5
        const cost = 150;
        const troopIncrease = 0.05;
        const moraleDecrease = 0.5;
        
        // 扣除资金
        if (gameState.currentPlayer === 'rome') {
            gameState.romeFunds -= cost;
        } else if (gameState.currentPlayer === 'carthage') {
            gameState.carthageFunds -= cost;
        } else if (gameState.currentPlayer === 'macedonia') {
            gameState.macedoniaFunds -= cost;
        } else if (gameState.currentPlayer === 'seleucid') {
            gameState.seleucidFunds -= cost;
        } else if (gameState.currentPlayer === 'ptolemy') {
            gameState.ptolemyFunds -= cost;
        }
        
        // 增加部队
        currentArmy.lightCavalry = Math.round(currentArmy.lightCavalry * (1 + troopIncrease));
        currentArmy.heavyCavalry = Math.round(currentArmy.heavyCavalry * (1 + troopIncrease));
        currentArmy.heavyInfantry = Math.round(currentArmy.heavyInfantry * (1 + troopIncrease));
        currentArmy.lightInfantry = Math.round(currentArmy.lightInfantry * (1 + troopIncrease));
        
        // 减少士气
        const oldMorale = currentArmy.morale;
        currentArmy.morale = Math.max(1, currentArmy.morale - moraleDecrease);

        addLog(`${currentArmy.commander} 征召失败，但仍有收获：部队规模增5%，士气从${oldMorale}降至${currentArmy.morale}，消${cost}资金`, gameState.currentPlayer);
        
        // 更新部队详情显示
        if (gameState.selectedArmy === currentArmy.id) {
            showArmyDetails(currentArmy);
        }
        
        // 更新资金显示
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    }
}

// 执行组军
function executeRaiseArmy() {
    const currentPlayer = gameState.currentPlayer;
    let capitalCity, capitalName;
    if (currentPlayer === 'rome') {
        capitalCity = 'rome';
        capitalName = '罗马';
    } else if (currentPlayer === 'carthage') {
        capitalCity = 'carthage';
        capitalName = '迦太基';
    } else if (currentPlayer === 'macedonia') {
        capitalCity = 'pella';
        capitalName = '佩拉';
    } else if (currentPlayer === 'seleucid') {
        capitalCity = 'antioch';
        capitalName = '安条克';
    } else if (currentPlayer === 'ptolemy') {
        capitalCity = 'alexandria';
        capitalName = '亚历山大';
    }
    const cost = 500;
    
    // 检查部队数量限制（如果启用）
    const currentArmyCount = armies[currentPlayer].length;
    if (gameState.armyLimitEnabled && currentArmyCount >= 5) {
        addLog(`部队数量已达上限（${currentArmyCount}/5），无法组建新军`, 'error');
        return false;
    }
    
    // 检查资金是否足够
    let currentFunds = 0;
    if (currentPlayer === 'rome') currentFunds = gameState.romeFunds;
    else if (currentPlayer === 'carthage') currentFunds = gameState.carthageFunds;
    else if (currentPlayer === 'macedonia') currentFunds = gameState.macedoniaFunds;
    else if (currentPlayer === 'seleucid') currentFunds = gameState.seleucidFunds;
    else if (currentPlayer === 'ptolemy') currentFunds = gameState.ptolemyFunds;
    if (currentFunds <= 500) {
        addLog(`资金不足，无法组军（需要500资金，当前${currentFunds}）`, 'error');
        return false;
    }
    
    // 检查首都是否有军队驻扎
    const armiesAtCapital = CityArmyManager.getArmiesAtCity(capitalCity);
    if (armiesAtCapital.length > 0) {
        addLog(`${capitalName}有军队驻扎，无法组军`, 'error');
        return false;
    }
    
    // 确定新指挥官名称和属性
    let newCommanderName, military, political, diplomatic;
    
    if (currentPlayer === 'carthage') {
        // 迦太基使用预定义的将领列表（按顺序）
        const carthageRecruitCommanders = [
            { name: '马戈·巴卡', military: 8, political: 8, diplomatic: 8 },
            { name: '马哈巴尔', military: 8, political: 7, diplomatic: 7 },
            { name: '大汉诺', military: 8, political: 7, diplomatic: 7 }
        ];
        
        // 计算已经组建的新军数量（排除初始将领）
        const initialCommanders = ['汉尼拔·巴卡', '哈斯德鲁巴·巴卡', '西斯法克'];
        const recruitedCount = armies.carthage.filter(a => !initialCommanders.includes(a.commander)).length;
        
        if (recruitedCount < carthageRecruitCommanders.length) {
            const commander = carthageRecruitCommanders[recruitedCount];
            newCommanderName = commander.name;
            military = commander.military;
            political = commander.political;
            diplomatic = commander.diplomatic;
        } else {
            // 超出预定义列表，使用默认将领
            newCommanderName = `迦太基leader${currentArmyCount + 1}`;
            military = 7;
            political = 7;
            diplomatic = 7;
        }
    } else if (currentPlayer === 'macedonia') {
        // 马其顿使用默认将领
        newCommanderName = `马其顿leader${currentArmyCount + 1}`;
        military = 7;
        political = 7;
        diplomatic = 7;
    } else if (currentPlayer === 'seleucid') {
        // 塞琉古使用默认将领
        newCommanderName = `塞琉古leader${currentArmyCount + 1}`;
        military = 7;
        political = 7;
        diplomatic = 7;
    } else if (currentPlayer === 'ptolemy') {
        // 托勒密使用默认将领
        newCommanderName = `托勒密leader${currentArmyCount + 1}`;
        military = 7;
        political = 7;
        diplomatic = 7;
    } else {
        // 罗马使用默认将领
        newCommanderName = `罗马leader${currentArmyCount + 1}`;
        military = 7;
        political = 7;
        diplomatic = 7;
    }
    
    // 扣除资金
    if (currentPlayer === 'rome') {
        gameState.romeFunds -= cost;
    } else if (currentPlayer === 'carthage') {
        gameState.carthageFunds -= cost;
    } else if (currentPlayer === 'macedonia') {
        gameState.macedoniaFunds -= cost;
    } else if (currentPlayer === 'seleucid') {
        gameState.seleucidFunds -= cost;
    } else if (currentPlayer === 'ptolemy') {
        gameState.ptolemyFunds -= cost;
    }
    
    // 创建新军
    const newArmy = {
        id: `${currentPlayer}_${newCommanderName}_${Date.now()}`, // 唯一ID
        commander: newCommanderName,
        military: military,
        political: political,
        diplomatic: diplomatic,
        faction: currentPlayer,
        location: capitalCity,
        event: `组建${capitalName}`,
        troops: toRomanNumeral(currentArmyCount + 1), // 军团标记（根据当前军队数量+1）
        lightCavalry: 1000,
        heavyCavalry: 500,
        heavyInfantry: 10000,
        lightInfantry: 2000,
        morale: 5.0,
        isRaisedArmy: true // 标记为组军，年份切换时不删除
    };
    
    // 添加到对应阵营的军队列表
    armies[currentPlayer].push(newArmy);
    
    // 更新地图显示
    generateMap();
    drawRoutes();
    absoluteFix();
    placeArmies();
    
    // 更新资金显示
    updateFactionFunds();
    
    addLog(`${capitalName}成功组建新军队：${newCommanderName}，消${cost}资金`, currentPlayer);
    
    // 组军是阵营行动，不消耗当前军队的行动机会
    // 但需要更新军队列表显示
    ArmyActionManager.updateArmyActionUI();
    
    return true;
}

// 显示国债管理弹窗
function showDebtModal() {
    const currentPlayer = gameState.currentPlayer;
    let currentFunds = 0;
    let currentDebt = 0;
    let playerName = '未知';
    
    if (currentPlayer === 'rome') {
        currentFunds = gameState.romeFunds;
        currentDebt = gameState.romeDebt;
        playerName = '罗马';
    } else if (currentPlayer === 'carthage') {
        currentFunds = gameState.carthageFunds;
        currentDebt = gameState.carthageDebt;
        playerName = '迦太基';
    } else if (currentPlayer === 'macedonia') {
        currentFunds = gameState.macedoniaFunds;
        currentDebt = gameState.macedoniaDebt;
        playerName = '马其顿';
    } else if (currentPlayer === 'seleucid') {
        currentFunds = gameState.seleucidFunds;
        currentDebt = gameState.seleucidDebt;
        playerName = '塞琉古';
    } else if (currentPlayer === 'ptolemy') {
        currentFunds = gameState.ptolemyFunds;
        currentDebt = gameState.ptolemyDebt;
        playerName = '托勒密';
    }
    
    // 更新弹窗信息
    document.getElementById('debtTitle').textContent = `${playerName} - 国债管理`;
    document.getElementById('debtCurrentFunds').textContent = currentFunds;
    document.getElementById('debtCurrentDebt').textContent = currentDebt;
    
    // 显示弹窗
    document.getElementById('debtModal').style.display = 'flex';
}

// 关闭国债管理弹窗
function closeDebtModal() {
    document.getElementById('debtModal').style.display = 'none';
}

// 执行国债操作
function executeDebtAction(action) {
    if (action === 'borrow') {
        executeBorrow();
    } else if (action === 'repay') {
        executeRepay();
    }
    closeDebtModal();
}

// 执行借款
function executeBorrow() {
    const currentPlayer = gameState.currentPlayer;
    let currentPlayerName = '未知';
    let oldFunds = 0;
    let oldDebt = 0;
    
    if (currentPlayer === 'rome') {
        currentPlayerName = '罗马';
        oldFunds = gameState.romeFunds;
        oldDebt = gameState.romeDebt;
    } else if (currentPlayer === 'carthage') {
        currentPlayerName = '迦太基';
        oldFunds = gameState.carthageFunds;
        oldDebt = gameState.carthageDebt;
    } else if (currentPlayer === 'macedonia') {
        currentPlayerName = '马其顿';
        oldFunds = gameState.macedoniaFunds;
        oldDebt = gameState.macedoniaDebt;
    } else if (currentPlayer === 'seleucid') {
        currentPlayerName = '塞琉古';
        oldFunds = gameState.seleucidFunds;
        oldDebt = gameState.seleucidDebt;
    } else if (currentPlayer === 'ptolemy') {
        currentPlayerName = '托勒密';
        oldFunds = gameState.ptolemyFunds;
        oldDebt = gameState.ptolemyDebt;
    }
    const borrowAmount = 2000;
    
    // 增加资金和债务
    if (currentPlayer === 'rome') {
        gameState.romeFunds += borrowAmount;
        gameState.romeDebt += borrowAmount;
    } else if (currentPlayer === 'carthage') {
        gameState.carthageFunds += borrowAmount;
        gameState.carthageDebt += borrowAmount;
    } else if (currentPlayer === 'macedonia') {
        gameState.macedoniaFunds += borrowAmount;
        gameState.macedoniaDebt += borrowAmount;
    } else if (currentPlayer === 'seleucid') {
        gameState.seleucidFunds += borrowAmount;
        gameState.seleucidDebt += borrowAmount;
    } else if (currentPlayer === 'ptolemy') {
        gameState.ptolemyFunds += borrowAmount;
        gameState.ptolemyDebt += borrowAmount;
    }
    
    let newFunds = 0;
    let newDebt = 0;
    if (currentPlayer === 'rome') {
        newFunds = gameState.romeFunds;
        newDebt = gameState.romeDebt;
    } else if (currentPlayer === 'carthage') {
        newFunds = gameState.carthageFunds;
        newDebt = gameState.carthageDebt;
    } else if (currentPlayer === 'macedonia') {
        newFunds = gameState.macedoniaFunds;
        newDebt = gameState.macedoniaDebt;
    } else if (currentPlayer === 'seleucid') {
        newFunds = gameState.seleucidFunds;
        newDebt = gameState.seleucidDebt;
    } else if (currentPlayer === 'ptolemy') {
        newFunds = gameState.ptolemyFunds;
        newDebt = gameState.ptolemyDebt;
    }
    
    // 更新资金显示
    updateFactionFunds();
    
    addLog(`💳 【${currentPlayerName}借款】+${borrowAmount} | 资金: ${oldFunds} → ${newFunds} | 债务: ${oldDebt} → ${newDebt}`, currentPlayer);
    
    // 借款是阵营行动，不消耗当前军队行动机会
    return true;
}

// 执行还款
function executeRepay() {
    const currentPlayer = gameState.currentPlayer;
    let currentPlayerName = '未知';
    let currentFunds = 0;
    let currentDebt = 0;
    
    if (currentPlayer === 'rome') {
        currentPlayerName = '罗马';
        currentFunds = gameState.romeFunds;
        currentDebt = gameState.romeDebt;
    } else if (currentPlayer === 'carthage') {
        currentPlayerName = '迦太基';
        currentFunds = gameState.carthageFunds;
        currentDebt = gameState.carthageDebt;
    } else if (currentPlayer === 'macedonia') {
        currentPlayerName = '马其顿';
        currentFunds = gameState.macedoniaFunds;
        currentDebt = gameState.macedoniaDebt;
    } else if (currentPlayer === 'seleucid') {
        currentPlayerName = '塞琉古';
        currentFunds = gameState.seleucidFunds;
        currentDebt = gameState.seleucidDebt;
    } else if (currentPlayer === 'ptolemy') {
        currentPlayerName = '托勒密';
        currentFunds = gameState.ptolemyFunds;
        currentDebt = gameState.ptolemyDebt;
    }
    
    // 检查是否有债务
    if (currentDebt <= 0) {
        addLog(`❌ ${currentPlayerName}当前没有债务，无需还款`, 'error');
        return false;
    }
    
    // 检查资金是否足够还
    if (currentFunds <= currentDebt) {
        addLog(`❌ ${currentPlayerName}资金不足以偿还全部债务 | 资金: ${currentFunds} | 债务: ${currentDebt}`, 'error');
        return false;
    }
    
    // 计算还款金额（全部债务）
    const repayAmount = currentDebt;
    
    // 执行还款
    if (currentPlayer === 'rome') {
        gameState.romeFunds -= repayAmount;
        gameState.romeDebt = 0;
    } else if (currentPlayer === 'carthage') {
        gameState.carthageFunds -= repayAmount;
        gameState.carthageDebt = 0;
    } else if (currentPlayer === 'macedonia') {
        gameState.macedoniaFunds -= repayAmount;
        gameState.macedoniaDebt = 0;
    } else if (currentPlayer === 'seleucid') {
        gameState.seleucidFunds -= repayAmount;
        gameState.seleucidDebt = 0;
    } else if (currentPlayer === 'ptolemy') {
        gameState.ptolemyFunds -= repayAmount;
        gameState.ptolemyDebt = 0;
    }
    
    let newFunds = 0;
    if (currentPlayer === 'rome') newFunds = gameState.romeFunds;
    else if (currentPlayer === 'carthage') newFunds = gameState.carthageFunds;
    else if (currentPlayer === 'macedonia') newFunds = gameState.macedoniaFunds;
    else if (currentPlayer === 'seleucid') newFunds = gameState.seleucidFunds;
    else if (currentPlayer === 'ptolemy') newFunds = gameState.ptolemyFunds;
    
    // 更新资金显示
    updateFactionFunds();
    
    addLog(`💵 【${currentPlayerName}还款】-${repayAmount} | 资金: ${currentFunds} → ${newFunds} | 债务已清零 ✓`, currentPlayer);
    
    // 还款是阵营行动，不消耗当前军队行动机会
    return true;
}

// 执行整编
function executeReorganize() {
    // 获取当前应该行动的军队
    const currentArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return false;
    }

    // 检查资金是否足够
    const cost = 50;
    let currentFunds;
    if (gameState.currentPlayer === 'rome') {
        currentFunds = gameState.romeFunds;
    } else if (gameState.currentPlayer === 'carthage') {
        currentFunds = gameState.carthageFunds;
    } else if (gameState.currentPlayer === 'macedonia') {
        currentFunds = gameState.macedoniaFunds;
    } else if (gameState.currentPlayer === 'seleucid') {
        currentFunds = gameState.seleucidFunds;
    } else if (gameState.currentPlayer === 'ptolemy') {
        currentFunds = gameState.ptolemyFunds;
    }
    
    if (currentFunds < cost) {
        addLog(`资金不足，无法进行整编（需${cost}资金）`, 'error');
        return false;
    }

    // 先扣除资金
    if (gameState.currentPlayer === 'rome') {
        gameState.romeFunds -= cost;
    } else if (gameState.currentPlayer === 'carthage') {
        gameState.carthageFunds -= cost;
    } else if (gameState.currentPlayer === 'macedonia') {
        gameState.macedoniaFunds -= cost;
    } else if (gameState.currentPlayer === 'seleucid') {
        gameState.seleucidFunds -= cost;
    } else if (gameState.currentPlayer === 'ptolemy') {
        gameState.ptolemyFunds -= cost;
    }

    // 执行整编判定：投掷D6，小于将领政治能力则成功
    const diceResult = rollDice(2);
    const targetNumber = currentArmy.political;
    const success = diceResult < targetNumber;
    
    showDiceResult(2, diceResult, targetNumber, success);
    
    if (success) {
        // 整编成功：士气+1（最大不超过5），部队增加5%
        const oldMorale = currentArmy.morale;
        currentArmy.morale = Math.min(5, currentArmy.morale + 1);
        
        // 计算部队增加5%
        const increaseRate = 0.05;
        currentArmy.lightCavalry = Math.round(currentArmy.lightCavalry * (1 + increaseRate));
        currentArmy.heavyCavalry = Math.round(currentArmy.heavyCavalry * (1 + increaseRate));
        currentArmy.heavyInfantry = Math.round(currentArmy.heavyInfantry * (1 + increaseRate));
        currentArmy.lightInfantry = Math.round(currentArmy.lightInfantry * (1 + increaseRate));
        
        addLog(`${currentArmy.commander} 整编成功！士气从${oldMorale}提升${currentArmy.morale}，部队规模增5%，消${cost}资金`, gameState.currentPlayer);
        
        // 记录行动结果
        recordArmyAction(currentArmy, '整编', 'success', `整编成功，士气提升至${currentArmy.morale}，部队增5%`);
        
        // 更新部队详情显示
        if (gameState.selectedArmy === currentArmy.id) {
            showArmyDetails(currentArmy);
        }
        
        // 更新资金显示
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    } else {
        // 记录行动结果
        recordArmyAction(currentArmy, '整编', 'failed', `整编失败，士气提升至${currentArmy.morale}，部队增2%`);
        
        // 整编失败：士气+0.5（最大不超过5），部队增加2%
        const oldMorale = currentArmy.morale;
        currentArmy.morale = Math.min(5, currentArmy.morale + 0.5);
        
        // 计算部队增加2%
        const increaseRate = 0.02;
        currentArmy.lightCavalry = Math.round(currentArmy.lightCavalry * (1 + increaseRate));
        currentArmy.heavyCavalry = Math.round(currentArmy.heavyCavalry * (1 + increaseRate));
        currentArmy.heavyInfantry = Math.round(currentArmy.heavyInfantry * (1 + increaseRate));
        currentArmy.lightInfantry = Math.round(currentArmy.lightInfantry * (1 + increaseRate));
        
        addLog(`${currentArmy.commander} 整编失败，但仍有收获：士气从${oldMorale}提升${currentArmy.morale}，部队规模增2%，消${cost}资金`, gameState.currentPlayer);
        
        // 更新部队详情显示
        if (gameState.selectedArmy === currentArmy.id) {
            showArmyDetails(currentArmy);
        }
        
        // 更新资金显示
        updateFactionFunds();
        
        setTimeout(() => {
            ArmyActionManager.markCurrentArmyActed();
        }, 100);
        return true;
    }
}

// 解散部队
function executeDisband() {
    // 获取当前应该行动的军队
    const currentArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return false;
    }
    
    const currentFaction = gameState.currentPlayer;
    let factionName = '未知';
    if (currentFaction === 'rome') {
        factionName = '罗马';
    } else if (currentFaction === 'carthage') {
        factionName = '迦太基';
    } else if (currentFaction === 'macedonia') {
        factionName = '马其顿';
    } else if (currentFaction === 'seleucid') {
        factionName = '塞琉古';
    } else if (currentFaction === 'ptolemy') {
        factionName = '托勒密';
    }
    
    // 获取部队信息用于显示
    const totalTroops = (currentArmy.lightCavalry || 0) + 
                       (currentArmy.heavyCavalry || 0) + 
                       (currentArmy.heavyInfantry || 0) + 
                       (currentArmy.lightInfantry || 0);
    const cityName = cities.find(c => c.id === currentArmy.location)?.name || '未知位置';
    
    // 确认解散
    const confirmMsg = `确定要解散 ${currentArmy.commander} 的部队吗？\n\n` +
                      `位置：${cityName}\n` +
                      `总兵力：${totalTroops}\n` +
                      `士气：${currentArmy.morale}\n\n` +
                      `解散后该部队将永久消失，且不会返还任何资源！`;
    
    if (!confirm(confirmMsg)) {
        addLog(`${currentArmy.commander} 取消解散`, currentFaction);
        return false;
    }
    
    // 记录日志
    addLog(`🗡️ ${factionName}解散了 ${currentArmy.commander} 的部队（${cityName}，${totalTroops}人）`, currentFaction);
    
    // 标记部队待删除
    currentArmy.toBeRemoved = true;
    
    // 从对应阵营数组中移除
    if (currentFaction === 'rome') {
        armies.rome = armies.rome.filter(army => !army.toBeRemoved);
    } else if (currentFaction === 'carthage') {
        armies.carthage = armies.carthage.filter(army => !army.toBeRemoved);
    } else if (currentFaction === 'macedonia') {
        armies.macedonia = armies.macedonia.filter(army => !army.toBeRemoved);
    } else if (currentFaction === 'seleucid') {
        armies.seleucid = armies.seleucid.filter(army => !army.toBeRemoved);
    } else if (currentFaction === 'ptolemy') {
        armies.ptolemy = armies.ptolemy.filter(army => !army.toBeRemoved);
    }
    
    // 检查并更新围城状态
    checkAllSiegesAfterArmyRemoval();
    
    // 更新地图显示
    placeArmies();
    
    // 更新UI
    updateUI();
    
    // 清除选中状态
    gameState.selectedArmy = null;
    document.getElementById('armyDetailsPanel').style.display = 'none';
    
    // 标记行动完成（部队已不存在，自动进入下一个）
    setTimeout(() => {
        ArmyActionManager.markCurrentArmyActed();
    }, 1000);
    
    return true;
}

// 根据态度检查城市应该属于哪个阵营
function checkCityFactionByAttitude(city) {
    const romeAttitude = city.romeAttitude || 0;
    const carthageAttitude = city.carthageAttitude || 0;
    const macedoniaAttitude = city.macedoniaAttitude || 0;
    const seleucidAttitude = city.seleucidAttitude || 0;
    const ptolemyAttitude = city.ptolemyAttitude || 0;
    
    // 找出最高态度
    const maxAttitude = Math.max(romeAttitude, carthageAttitude, macedoniaAttitude, seleucidAttitude, ptolemyAttitude);
    
    // 必须态度>=3且比其他阵营高至少2点才能转变阵营
    if (romeAttitude >= 3 && romeAttitude === maxAttitude) {
        if (romeAttitude - carthageAttitude >= 2 && romeAttitude - macedoniaAttitude >= 2 && romeAttitude - seleucidAttitude >= 2 && romeAttitude - ptolemyAttitude >= 2) {
            return 'rome';
        }
    }
    
    if (carthageAttitude >= 3 && carthageAttitude === maxAttitude) {
        if (carthageAttitude - romeAttitude >= 2 && carthageAttitude - macedoniaAttitude >= 2 && carthageAttitude - seleucidAttitude >= 2 && carthageAttitude - ptolemyAttitude >= 2) {
            return 'carthage';
        }
    }
    
    if (macedoniaAttitude >= 3 && macedoniaAttitude === maxAttitude) {
        if (macedoniaAttitude - romeAttitude >= 2 && macedoniaAttitude - carthageAttitude >= 2 && macedoniaAttitude - seleucidAttitude >= 2 && macedoniaAttitude - ptolemyAttitude >= 2) {
            return 'macedonia';
        }
    }
    
    if (seleucidAttitude >= 3 && seleucidAttitude === maxAttitude) {
        if (seleucidAttitude - romeAttitude >= 2 && seleucidAttitude - carthageAttitude >= 2 && seleucidAttitude - macedoniaAttitude >= 2 && seleucidAttitude - ptolemyAttitude >= 2) {
            return 'seleucid';
        }
    }
    
    if (ptolemyAttitude >= 3 && ptolemyAttitude === maxAttitude) {
        if (ptolemyAttitude - romeAttitude >= 2 && ptolemyAttitude - carthageAttitude >= 2 && ptolemyAttitude - macedoniaAttitude >= 2 && ptolemyAttitude - seleucidAttitude >= 2) {
            return 'ptolemy';
        }
    }
    
    // 否则属于中立
    return 'neutral';
}

// 检查是否可以游说城市
function canPersuadeCity(army, targetCity) {
    // 条件1：军队位于被游说城市或相邻城市
    const isAtTarget = army.location === targetCity.id;
    const connectedCities = getConnectedCities(army.location);
    const isAdjacent = connectedCities.includes(targetCity.id);
    
    if (!isAtTarget && !isAdjacent) {
        addLog(`${army.commander} 不在 ${targetCity.name} 或其相邻城市，无法游说`, 'error');
        return false;
    }

    // 条件2：被游说城市无敌对军队存在
    const allFactions = ['rome', 'carthage', 'macedonia', 'seleucid', 'ptolemy'];
    const enemyFactions = allFactions.filter(f => f !== gameState.currentPlayer);
    
    let hasEnemyArmies = false;
    for (const enemyFaction of enemyFactions) {
        const enemyArmiesAtCity = CityArmyManager.getArmiesAtCityByFaction(targetCity.id, enemyFaction);
        if (enemyArmiesAtCity.length > 0) {
            hasEnemyArmies = true;
            break;
        }
    }
    
    if (hasEnemyArmies) {
        addLog(`${targetCity.name} 有敌方军队存在，无法游说`, 'error');
        return false;
    }
    
    // 注释：现在可以游说己方城市来进一步增加态度
    
    return true;
}

// 执行移动
function executeMove() {
    // 获取当前应该行动的军队
    const currentActionArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentActionArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return;
    }
    
    // 强制使用当前应该行动的军队
    const army = currentActionArmy;
    gameState.selectedArmy = army.id;  // 确保selectedArmy被正确设置
    
    if (!gameState.selectedRegion) {
        addLog('请选择目标城市', 'error');
        return;
    }
    
    if (!army) {
        addLog('找不到选中的军队', 'error');
        return;
    }

    // 检查目标城市是否相邻
    const connectedCities = getConnectedCities(army.location);
    if (!connectedCities.includes(gameState.selectedRegion)) {
        const currentCity = cities.find(c => c.id === army.location);
        const targetCity = cities.find(c => c.id === gameState.selectedRegion);
        const currentCityName = currentCity ? currentCity.name : army.location;
        const targetCityName = targetCity ? targetCity.name : gameState.selectedRegion;
        
        // 调试信息：显示相邻城市列表
        const connectedCityNames = connectedCities.map(id => {
            const city = cities.find(c => c.id === id);
            return city ? city.name : id;
        }).join('、');
        
        addLog(`❌ 军队【${army.commander}】无法从${currentCityName}移动到${targetCityName}：目标城市不相邻`, 'error');
        addLog(`   🔍 调试：当前位置=${army.location}，目标=${gameState.selectedRegion}，相邻城市=[${connectedCityNames}]`, 'warning');
        return;
    }

    // 检查是否为海路移动
    let isSeaRoute = false;
    const targetRoute = routes.find(route => {
        let city1Id, city2Id, routeType;
        if (Array.isArray(route)) {
            city1Id = route[0];
            city2Id = route[1];
            routeType = 'land';
        } else {
            city1Id = route.from;
            city2Id = route.to;
            routeType = route.type || 'land';
        }
        return (city1Id === army.location && city2Id === gameState.selectedRegion) ||
               (city2Id === army.location && city1Id === gameState.selectedRegion);
    });
    
    if (targetRoute && !Array.isArray(targetRoute) && targetRoute.type === 'sea') {
        isSeaRoute = true;
        // 海路移动需要先投D6判定是否能够出海
        const seaRouteRoll = rollDice(1);
        const targetCity = cities.find(c => c.id === gameState.selectedRegion);
        addLog(`🌊 ${army.commander} 尝试经海路前往 ${targetCity.name}，投骰判定...`, gameState.currentPlayer);
        showDiceResult(1, seaRouteRoll, 5, seaRouteRoll >= 5);
        
        if (seaRouteRoll < 5) {
            addLog(`🌊 海路移动失败！（投出 ${seaRouteRoll}，需要≥5）风浪太大无法出海`, gameState.currentPlayer);
            recordArmyAction(army, '移动', 'failed', `海路移动失败，无法前往${targetCity.name}`);
            
            // 清除选择
            gameState.selectedArmy = null;
            gameState.selectedRegion = null;
            document.querySelectorAll('.city.selected').forEach(c => c.classList.remove('selected'));
            document.querySelectorAll('.army-marker').forEach(marker => marker.classList.remove('selected'));
            document.querySelectorAll('.route.active').forEach(r => r.classList.remove('active'));
            
            // 标记军队已行动
            ArmyActionManager.markArmyActed(army.id);
            return;
        } else {
            addLog(`🌊 成功出海！（投出 ${seaRouteRoll}）继续进行移动检定...`, gameState.currentPlayer);
        }
    }

    // 移动消耗资金，即使负债也可以执行
    const moveCost = 10;
    if (gameState.currentPlayer === 'rome') {
        gameState.romeFunds -= moveCost;
    } else if (gameState.currentPlayer === 'carthage') {
        gameState.carthageFunds -= moveCost;
    } else if (gameState.currentPlayer === 'macedonia') {
        gameState.macedoniaFunds -= moveCost;
    } else if (gameState.currentPlayer === 'seleucid') {
        gameState.seleucidFunds -= moveCost;
    } else if (gameState.currentPlayer === 'ptolemy') {
        gameState.ptolemyFunds -= moveCost;
    }
    

    // 执行移动骰子检定
    const result = rollDice(2);
    const success = result-2 <= army.military;
    
    showDiceResult(2, result, army.military, success);
    
    if (success) {
        const oldLocation = army.location;
        
        // 移动军队
        army.lastLocation = army.location;  // 保存上回合位置
        army.location = gameState.selectedRegion;
        const targetCity = cities.find(c => c.id === gameState.selectedRegion);
        addLog(`${army.commander} 成功移动到 ${targetCity.name}，消耗 ${moveCost} 资金`, gameState.currentPlayer);
        
        // 记录行动结果
        const oldCity = cities.find(c => c.id === oldLocation);
        recordArmyAction(army, '移动', 'success', `从${oldCity ? oldCity.name : '未知'}移动到${targetCity.name}`);
        
        placeArmies();
        
        // 检查旧位置是否需要解除围城
        SiegeSystem.checkAutoLiftSiege(oldLocation);
        
        // [已禁用] 检查是否触发会战 - 移动后不再自动触发会战，必须点击攻击按钮
        // const battleTriggered = BattleSystem.checkForBattle(gameState.selectedRegion);
        
        // 清除选择
        gameState.selectedArmy = null;
        gameState.selectedRegion = null;
        document.querySelectorAll('.city.selected').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.army-marker').forEach(marker => marker.classList.remove('selected'));
        document.querySelectorAll('.route.active').forEach(r => r.classList.remove('active'));
        
        // 更新资金显示
        updateFactionFunds();
        
        // [已禁用] 如果触发会战，不要立即结束回合
        // if (battleTriggered) {
        //     return; // 会战结束后会处理回合结束
        // }
    } else {
        // 随机选择一个戏剧性理由
        const movementFailureReasons = [
            '昏了头，忘记架设浮桥',
            '遭遇暴雨导致山洪暴发',
            '沉迷于开淫趴延误行动',
            '接受地方接待延误行动',
            '部队与当地民众发生斗殴',
            '打猎迷失道路',
            '行军向导误食毒蘑菇昏迷',
            '在城市中寻找妓女延误行动',
            '后勤官员怠于职守未做好准备'
        ];
        const randomReason = movementFailureReasons[Math.floor(Math.random() * movementFailureReasons.length)];
        
        addLog(`${army.commander} 移动失败（${randomReason}！），消耗 ${moveCost} 资金`, gameState.currentPlayer);
        
        // 记录行动结果
        const targetCity = cities.find(c => c.id === gameState.selectedRegion);
        recordArmyAction(army, '移动', 'failed', `尝试移动到${targetCity ? targetCity.name : '未知'}失败`);
        
        // 更新资金显示
        updateFactionFunds();
    }
    
    // 移动行动完成后标记军队已行动（无论成功失败）
    setTimeout(() => {
        ArmyActionManager.markCurrentArmyActed();
    }, 100);
}

// 执行攻击
function executeAttack() {
    // 获取当前应该行动的军队
    const currentActionArmy = ArmyActionManager.getCurrentActionArmy();
    if (!currentActionArmy) {
        addLog('当前没有可行动的军队，请结束回合', 'error');
        return;
    }
    
    const attackerArmy = currentActionArmy;
    const currentLocation = attackerArmy.location;
    const currentCity = cities.find(c => c.id === currentLocation);
    
    // 获取所有敌方军队（非己方阵营的所有军队）
    const allEnemyArmies = getAllArmies().filter(a => a.faction !== attackerArmy.faction);
    
    // 只查找当前城市的敌军
    const targetableEnemies = [];
    
    allEnemyArmies.forEach(enemy => {
        if (enemy.location === currentLocation) {
            targetableEnemies.push({
                army: enemy,
                city: currentCity
            });
        }
    });
    
    // 检查是否有可攻击的敌军
    if (targetableEnemies.length === 0) {
        addLog(`${attackerArmy.commander} 所在的 ${currentCity.name} 没有敌军可以攻击`, 'error');
        return;
    }
    
    // 选择目标敌军（如果有多个，选择第一个）
    const target = targetableEnemies[0];
    
    // 显示攻击准备弹窗，让攻击方选择是否请求支援
    showAttackerChoiceModal(attackerArmy, target.army, target.city);
}

// 显示攻击准备弹窗
function showAttackerChoiceModal(attackerArmy, defenderArmy, battleCity) {
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    const attackerFactionName = getFactionName(attackerArmy.faction);
    const defenderFactionName = getFactionName(defenderArmy.faction);
    
    // 保存攻击数据供后续使用
    window.currentAttackData = {
        attacker: attackerArmy,
        defender: defenderArmy,
        city: battleCity
    };
    
    // 设置临时的defenseChoice用于支援系统
    BattleSystem.defenseChoice = {
        cityId: battleCity.id,
        attacker: attackerArmy, // 这里的attacker实际上是请求支援的一方
        defender: defenderArmy,
        isActiveAttack: true,
        isAttackerRequestingSupport: true // 标记为攻击方请求支援
    };
    
    // 更新弹窗内容
    document.getElementById('defenseChoiceTitle').textContent = `准备进攻！`;
    document.getElementById('defenseSituation').textContent = 
        `${attackerArmy.commander} 准备进攻 ${battleCity.name} 的 ${defenderArmy.commander}（${defenderFactionName}）`;
    
    // 更新选择标签为攻击方
    const choiceLabel = document.getElementById('defenseChoiceLabel');
    if (choiceLabel) {
        choiceLabel.textContent = '攻击方可选择';
    }
    
    // 更新军队信息
    document.getElementById('defenseAttackerInfo').textContent = `己方指挥官：${attackerArmy.commander}`;
    document.getElementById('defenseDefenderInfo').textContent = `敌方指挥官：${defenderArmy.commander}`;
    
    // 计算战斗力
    const attackerPower = calculateCombatPower(attackerArmy);
    const defenderPower = calculateCombatPower(defenderArmy);
    document.getElementById('defenseAttackerPower').textContent = `战斗力：${attackerPower}`;
    document.getElementById('defenseDefenderPower').textContent = `战斗力：${defenderPower}`;
    
    // 隐藏守城按钮和撤退按钮，因为是攻击方
    document.getElementById('siegeChoiceBtn').style.display = 'none';
    const retreatBtn = document.querySelector('.retreat-choice');
    if (retreatBtn) retreatBtn.style.display = 'none';
    
    // 修改按钮文字
    const battleBtn = document.querySelector('.battle-choice');
    if (battleBtn) battleBtn.textContent = '直接进攻';
    
    // 检查是否是AI攻击
    const isAIAttacker = (typeof AIController !== 'undefined' && AIController.shouldControl() && 
        attackerArmy.faction === AIController.config.controlledFaction) ||
        (typeof CarthageAIController !== 'undefined' && CarthageAIController.shouldControl() &&
        attackerArmy.faction === 'carthage') ||
        (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.shouldControl() &&
        attackerArmy.faction === 'macedonia') ||
        (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.shouldControl() &&
        attackerArmy.faction === 'seleucid') ||
        (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.shouldControl() &&
        attackerArmy.faction === 'ptolemy');
    
    // 如果是AI攻击，禁用"请求支援"按钮
    const supportBtn = document.querySelector('button[onclick="requestReinforcements()"]');
    if (supportBtn) {
        if (isAIAttacker) {
            supportBtn.disabled = true;
            supportBtn.style.backgroundColor = '#95a5a6';
            supportBtn.style.cursor = 'not-allowed';
            supportBtn.style.opacity = '0.6';
            supportBtn.textContent = '请求支援（AI已自动请求）';
        } else {
            // 恢复玩家控制时的按钮状态
            supportBtn.disabled = false;
            supportBtn.style.backgroundColor = '#3498db';
            supportBtn.style.cursor = 'pointer';
            supportBtn.style.opacity = '1';
            supportBtn.textContent = '请求支援';
        }
    }
    
    // 显示弹窗
    document.getElementById('defenseChoiceModal').style.display = 'flex';
    
    // 如果是AI攻击，立即暂停AI执行（防止其他军队继续执行）
    if (isAIAttacker) {
        if (typeof AIController !== 'undefined' && AIController.config.enabled) {
            AIController.pause();
        }
        if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
            CarthageAIController.pause();
        }
        if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
            MacedoniaAIController.pause();
        }
        if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
            SeleucidAIController.pause();
        }
        if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
            PtolemyAIController.pause();
        }
    }
    
    // AI自动攻击决策（请求援军后给玩家防御选择）
    if (isAIAttacker) {
        // addLog(`🤖 AI控制的${attackerArmy.commander}正在准备进攻...`, attackerArmy.faction);
        
        // 异步执行AI决策
        (async () => {
            // 延迟0.5秒让玩家看到弹窗
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 调用AI攻击决策（请求援军）- 根据阵营选择对应的AI控制器
            let shouldAttack = false;
            if (attackerArmy.faction === 'rome' && typeof AIController !== 'undefined') {
                shouldAttack = await AIController.handleAttackDecision(attackerArmy, defenderArmy, battleCity);
            } else if (attackerArmy.faction === 'carthage' && typeof CarthageAIController !== 'undefined') {
                shouldAttack = await CarthageAIController.handleAttackDecision(attackerArmy, defenderArmy, battleCity);
            } else if (attackerArmy.faction === 'macedonia' && typeof MacedoniaAIController !== 'undefined') {
                shouldAttack = await MacedoniaAIController.handleAttackDecision(attackerArmy, defenderArmy, battleCity);
            } else if (attackerArmy.faction === 'seleucid' && typeof SeleucidAIController !== 'undefined') {
                shouldAttack = await SeleucidAIController.handleAttackDecision(attackerArmy, defenderArmy, battleCity);
            } else if (attackerArmy.faction === 'ptolemy' && typeof PtolemyAIController !== 'undefined') {
                shouldAttack = await PtolemyAIController.handleAttackDecision(attackerArmy, defenderArmy, battleCity);
            }
            
            if (shouldAttack) {
                // addLog(`🎯 AI决策：请求援军完毕，发起进攻`, attackerArmy.faction);
                
                // 延迟0.5秒后关闭攻击准备弹窗
                await new Promise(resolve => setTimeout(resolve, 500));
                document.getElementById('defenseChoiceModal').style.display = 'none';
                
                // 调用initiateAttack显示防御方选择界面（不再需要重复暂停，因为已经暂停了）
                initiateAttack(attackerArmy, defenderArmy, battleCity);
            }
        })();
    }
}

// 发起攻击
function initiateAttack(attackerArmy, defenderArmy, battleCity) {
    const getFactionName = (faction) => {
        if (faction === 'rome') return '罗马';
        if (faction === 'carthage') return '迦太基';
        if (faction === 'macedonia') return '马其顿';
        if (faction === 'seleucid') return '塞琉古';
        if (faction === 'ptolemy') return '托勒密';
        return '未知';
    };
    const attackerFactionName = getFactionName(attackerArmy.faction);
    const defenderFactionName = getFactionName(defenderArmy.faction);
    
    addLog(`${attackerArmy.commander}（${attackerFactionName}）向 ${defenderArmy.commander}（${defenderFactionName}）在 ${battleCity.name} 发起攻击！`, attackerArmy.faction);
    
    console.log('[initiateAttack] 设置 BattleSystem.defenseChoice，isActiveAttack = true');
    
    // 暂停AI执行（如果还没暂停的话，pause()有防重复检查）
    if (typeof AIController !== 'undefined' && AIController.config.enabled) {
        AIController.pause();
    }
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
        CarthageAIController.pause();
    }
    if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
        MacedoniaAIController.pause();
    }
    if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
        SeleucidAIController.pause();
    }
    if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
        PtolemyAIController.pause();
    }
    
    // 设置防御选择（复用BattleSystem的逻辑）
    BattleSystem.defenseChoice = {
        cityId: battleCity.id,
        attacker: attackerArmy,
        defender: defenderArmy,
        isActiveAttack: true // 标记为主动攻击
    };
    
    console.log('[initiateAttack] BattleSystem.defenseChoice =', BattleSystem.defenseChoice);
    
    // 更新弹窗内容
    document.getElementById('defenseChoiceTitle').textContent = `${attackerFactionName}军队来袭！`;
    document.getElementById('defenseSituation').textContent = 
        `${attackerArmy.commander} 的${attackerFactionName}军队进攻 ${battleCity.name}，${defenderArmy.commander} 如何应对？`;
    
    // 更新选择标签为防御方
    const choiceLabel = document.getElementById('defenseChoiceLabel');
    if (choiceLabel) {
        choiceLabel.textContent = '防御方可选择';
    }
    
    // 更新军队信息
    document.getElementById('defenseAttackerInfo').textContent = `指挥官：${attackerArmy.commander}`;
    document.getElementById('defenseDefenderInfo').textContent = `指挥官：${defenderArmy.commander}`;
    
    // 计算包含联盟支援的战斗力
    const attackerResult = calculateAllianceCombatPower(attackerArmy, battleCity.id, true);
    const defenderResult = calculateAllianceCombatPower(defenderArmy, battleCity.id, true);
    
    // 显示战斗力（包含支援）
    let attackerPowerText = `战斗力：${attackerResult.mainPower}`;
    if (attackerResult.totalPower > attackerResult.mainPower) {
        const supportPower = attackerResult.totalPower - attackerResult.mainPower;
        attackerPowerText += ` (+${supportPower.toFixed(0)} 支援)`;
    }
    
    let defenderPowerText = `战斗力：${defenderResult.mainPower}`;
    if (defenderResult.totalPower > defenderResult.mainPower) {
        const supportPower = defenderResult.totalPower - defenderResult.mainPower;
        defenderPowerText += ` (+${supportPower.toFixed(0)} 支援)`;
    }
    
    document.getElementById('defenseAttackerPower').textContent = attackerPowerText;
    document.getElementById('defenseDefenderPower').textContent = defenderPowerText;
    
    // 在日志中显示详细支援信息
    if (attackerResult.totalPower > attackerResult.mainPower) {
        addLog(`📊 ${attackerArmy.commander}获得支援：总战力${attackerResult.totalPower.toFixed(0)}`, attackerArmy.faction);
    }
    if (defenderResult.totalPower > defenderResult.mainPower) {
        addLog(`📊 ${defenderArmy.commander}获得支援：总战力${defenderResult.totalPower.toFixed(0)}`, defenderArmy.faction);
    }
    
    // 检查是否可以守城（防御方在己方城市）
    const siegeBtn = document.getElementById('siegeChoiceBtn');
    if (battleCity.faction === defenderArmy.faction) {
        siegeBtn.style.display = 'block';
    } else {
        siegeBtn.style.display = 'none';
    }
    
    // 重置按钮状态为防御方
    const battleBtn = document.querySelector('.battle-choice');
    if (battleBtn) battleBtn.textContent = '进行会战';
    
    const retreatBtn = document.querySelector('.retreat-choice');
    if (retreatBtn) retreatBtn.style.display = 'block';
    
    // 检查防御方是否是AI控制（注意：不能用shouldControl，因为当前可能是攻击方回合）
    const isDefenderAI = (typeof AIController !== 'undefined' && 
        AIController.config.enabled &&
        defenderArmy.faction === AIController.config.controlledFaction) ||
        (typeof CarthageAIController !== 'undefined' &&
        CarthageAIController.config.enabled &&
        defenderArmy.faction === 'carthage') ||
        (typeof MacedoniaAIController !== 'undefined' &&
        MacedoniaAIController.config.enabled &&
        defenderArmy.faction === 'macedonia') ||
        (typeof SeleucidAIController !== 'undefined' &&
        SeleucidAIController.config.enabled &&
        defenderArmy.faction === 'seleucid') ||
        (typeof PtolemyAIController !== 'undefined' &&
        PtolemyAIController.config.enabled &&
        defenderArmy.faction === 'ptolemy');
    
    // 显示防御选择弹窗
    document.getElementById('defenseChoiceModal').style.display = 'flex';
    
    // 获取按钮元素
    const requestSupportBtn = document.querySelector('#defenseChoiceModal button[onclick="requestReinforcements()"]');
    
    // 如果防御方是玩家，确保按钮可用
    if (!isDefenderAI) {
        if (battleBtn) {
            battleBtn.disabled = false;
            battleBtn.style.opacity = '1';
            battleBtn.style.cursor = 'pointer';
        }
        if (retreatBtn) {
            retreatBtn.disabled = false;
            retreatBtn.style.opacity = '1';
            retreatBtn.style.cursor = 'pointer';
        }
        if (siegeBtn) {
            siegeBtn.disabled = false;
            siegeBtn.style.opacity = '1';
            siegeBtn.style.cursor = 'pointer';
        }
        if (requestSupportBtn) {
            requestSupportBtn.disabled = false;
            requestSupportBtn.style.backgroundColor = '#3498db';
            requestSupportBtn.style.cursor = 'pointer';
            requestSupportBtn.style.opacity = '1';
            requestSupportBtn.textContent = '请求支援';
        }
    }
    
    // 如果防御方是AI，禁用所有按钮
    if (isDefenderAI) {
        if (battleBtn) {
            battleBtn.disabled = true;
            battleBtn.style.opacity = '0.5';
            battleBtn.style.cursor = 'not-allowed';
        }
        if (retreatBtn) {
            retreatBtn.disabled = true;
            retreatBtn.style.opacity = '0.5';
            retreatBtn.style.cursor = 'not-allowed';
        }
        if (siegeBtn) {
            siegeBtn.disabled = true;
            siegeBtn.style.opacity = '0.5';
            siegeBtn.style.cursor = 'not-allowed';
        }
        if (requestSupportBtn) {
            requestSupportBtn.disabled = true;
            requestSupportBtn.style.backgroundColor = '#95a5a6';
            requestSupportBtn.style.cursor = 'not-allowed';
            requestSupportBtn.style.opacity = '0.5';
            requestSupportBtn.textContent = '请求支援（AI已自动请求）';
        }
    }
    
    // 清除攻击目标列表
    gameState.attackTargets = null;
    
    // AI自动防御决策
    if (isDefenderAI) {
        // 更新提示文本
        const situationElement = document.getElementById('defenseSituation');
        const originalText = situationElement.textContent;
        situationElement.innerHTML = `${originalText}<br><br><span style="color: #3498db; font-weight: bold;">🤖 AI正在评估战场态势...</span>`;
        
        // addLog(`🤖 AI控制的${defenderArmy.commander}正在做出防御决策...`, defenderArmy.faction);
        
        // 异步执行AI决策
        (async () => {
            // 延迟1秒让玩家看到弹窗
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 调用AI防御决策 - 根据阵营选择对应的AI控制器
            let decision = null;
            if (defenderArmy.faction === 'rome' && typeof AIController !== 'undefined') {
                decision = await AIController.handleDefenseDecision(defenderArmy, attackerArmy, battleCity);
            } else if (defenderArmy.faction === 'carthage' && typeof CarthageAIController !== 'undefined') {
                decision = await CarthageAIController.handleDefenseDecision(defenderArmy, attackerArmy, battleCity);
            } else if (defenderArmy.faction === 'macedonia' && typeof MacedoniaAIController !== 'undefined') {
                decision = await MacedoniaAIController.handleDefenseDecision(defenderArmy, attackerArmy, battleCity);
            } else if (defenderArmy.faction === 'seleucid' && typeof SeleucidAIController !== 'undefined') {
                decision = await SeleucidAIController.handleDefenseDecision(defenderArmy, attackerArmy, battleCity);
            } else if (defenderArmy.faction === 'ptolemy' && typeof PtolemyAIController !== 'undefined') {
                decision = await PtolemyAIController.handleDefenseDecision(defenderArmy, attackerArmy, battleCity);
            }
            
            if (decision) {
                // 更新提示为AI决策结果
                situationElement.innerHTML = `${originalText}<br><br><span style="color: #27ae60; font-weight: bold;">🎯 AI决策：${decision.reason}</span>`;
                // addLog(`🎯 AI决策：${decision.reason}`, defenderArmy.faction);
                
                // 延迟1秒后自动执行决策
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 自动执行决策
                chooseDefenseAction(decision.action);
            }
        })();
    }
}

// 显示城市提示框
function showCityTooltip(city, event) {
    const tooltip = document.getElementById('cityTooltip');
    
    // 更新提示框内容
    document.getElementById('tooltipCityName').textContent = city.name;
    
    // 更新阵营显示
    const factionElement = document.getElementById('tooltipFaction');
    let factionText = '中立';
    if (city.faction === 'rome') {
        factionText = '罗马';
    } else if (city.faction === 'carthage') {
        factionText = '迦太基';
    } else if (city.faction === 'macedonia') {
        factionText = '马其顿';
    } else if (city.faction === 'seleucid') {
        factionText = '塞琉古';
    } else if (city.faction === 'ptolemy') {
        factionText = '托勒密';
    }
    factionElement.textContent = factionText;
    factionElement.className = 'tooltip-faction ' + city.faction;
    
    // 更新城市属性
    document.getElementById('tooltipPolitical').textContent = city.politicalScore || 0;
    document.getElementById('tooltipEconomic').textContent = city.economicScore || 0;
    document.getElementById('tooltipFortification').textContent = city.fortificationLevel || 0;
    document.getElementById('tooltipRomeAttitude').textContent = city.romeAttitude || 0;
    document.getElementById('tooltipCarthageAttitude').textContent = city.carthageAttitude || 0;
    document.getElementById('tooltipMacedoniaAttitude').textContent = city.macedoniaAttitude || 0;
    document.getElementById('tooltipSeleucidAttitude').textContent = city.seleucidAttitude || 0;
    document.getElementById('tooltipPtolemyAttitude').textContent = city.ptolemyAttitude || 0;
    
    // 更新围城状态
    const siegeElement = document.getElementById('tooltipSiege');
    if (city.isUnderSiege) {
        siegeElement.style.display = 'block';
        let besiegingFaction = '未知';
        if (city.besiegingFaction === 'rome') besiegingFaction = '罗马';
        else if (city.besiegingFaction === 'carthage') besiegingFaction = '迦太基';
        else if (city.besiegingFaction === 'macedonia') besiegingFaction = '马其顿';
        else if (city.besiegingFaction === 'seleucid') besiegingFaction = '塞琉古';
        else if (city.besiegingFaction === 'ptolemy') besiegingFaction = '托勒密';
        document.getElementById('tooltipSiegeInfo').textContent = 
            `被${besiegingFaction}围城 (${city.siegeCount}回合)`;
    } else {
        siegeElement.style.display = 'none';
    }
    
    // 显示提示框
    tooltip.style.display = 'block';
    updateTooltipPosition(event);
}

// 隐藏城市提示框
function hideCityTooltip() {
    const tooltip = document.getElementById('cityTooltip');
    tooltip.style.display = 'none';
}

// 更新提示框位置
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('cityTooltip');
    const offsetX = 15;
    const offsetY = 15;
    
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取提示框尺寸
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = event.clientX + offsetX;
    let top = event.clientY + offsetY;
    
    // 检查是否超出右边界
    if (left + tooltipRect.width > viewportWidth) {
        left = event.clientX - tooltipRect.width - offsetX;
    }
    
    // 检查是否超出下边界
    if (top + tooltipRect.height > viewportHeight) {
        top = event.clientY - tooltipRect.height - offsetY;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// ==================== 部队行动记录功能 ====================

// 记录部队行动结果
function recordArmyAction(army, actionName, result, details = '') {
    if (!army) return;
    
    const timestamp = `${TimeSystem.getFullTimeDisplay()} 回合${gameState.currentTurn}`;
    const actionRecord = {
        turn: gameState.currentTurn,
        time: timestamp,
        action: actionName,
        result: result, // 'success', 'failed', 'completed'
        details: details
    };
    
    // 如果部队没有actionHistory数组，创建一个
    if (!army.actionHistory) {
        army.actionHistory = [];
    }
    
    // 添加新的行动记录
    army.actionHistory.push(actionRecord);
    
    // 只保留最近的一次记录用于tooltip显示
    army.lastAction = actionRecord;
}

// 清空指定阵营所有部队的行动记录
function clearFactionActionRecords(faction) {
    const factionArmies = armies[faction] || [];
    factionArmies.forEach(army => {
        army.lastAction = null;
        // 可以选择是否清空历史记录，这里保留历史但清空当前显示
        // army.actionHistory = [];
    });
}

// ==================== 部队悬停提示框功能 ====================

// 显示部队提示框
function showArmyTooltip(army, event) {
    const tooltip = document.getElementById('armyTooltip');
    
    // 更新指挥官名称
    document.getElementById('tooltipArmyCommander').textContent = army.commander;
    
    // 更新阵营标签
    const factionElement = document.getElementById('tooltipArmyFaction');
    let factionText = '未知';
    if (army.faction === 'rome') {
        factionText = '罗马';
    } else if (army.faction === 'carthage') {
        factionText = '迦太基';
    } else if (army.faction === 'macedonia') {
        factionText = '马其顿';
    } else if (army.faction === 'seleucid') {
        factionText = '塞琉古';
    } else if (army.faction === 'ptolemy') {
        factionText = '托勒密';
    }
    factionElement.textContent = factionText;
    factionElement.className = 'tooltip-faction ' + army.faction;
    
    // 更新将领能力
    document.getElementById('tooltipArmyMilitary').textContent = army.military || 0;
    document.getElementById('tooltipArmyPolitical').textContent = army.political || 0;
    document.getElementById('tooltipArmyDiplomatic').textContent = army.diplomatic || army.political || 0;
    
    // 更新兵力构成
    document.getElementById('tooltipArmyLightCav').textContent = army.lightCavalry || 0;
    document.getElementById('tooltipArmyHeavyCav').textContent = army.heavyCavalry || 0;
    document.getElementById('tooltipArmyHeavyInf').textContent = army.heavyInfantry || 0;
    document.getElementById('tooltipArmyLightInf').textContent = army.lightInfantry || 0;
    
    // 计算总兵力
    const totalTroops = (army.lightCavalry || 0) + (army.heavyCavalry || 0) + 
                        (army.heavyInfantry || 0) + (army.lightInfantry || 0);
    document.getElementById('tooltipArmyTotal').textContent = totalTroops;
    
    // 更新士气
    document.getElementById('tooltipArmyMorale').textContent = (army.morale || 5).toFixed(1);
    
    // 计算战斗力
    const combatPower = calculateCombatPower(army);
    document.getElementById('tooltipArmyCombatPower').textContent = combatPower;
    
    // 更新位置
    const city = cities.find(c => c.id === army.location);
    document.getElementById('tooltipArmyLocation').textContent = city ? city.name : '未知';
    
    // 更新上回合位置
    if (army.lastLocation) {
        const lastCity = cities.find(c => c.id === army.lastLocation);
        document.getElementById('tooltipArmyLastLocation').textContent = lastCity ? lastCity.name : '未知';
    } else {
        document.getElementById('tooltipArmyLastLocation').textContent = '-';
    }
    
    // 显示AI决策信息（罗马AI、迦太基AI、马其顿AI和塞琉古AI）
    const decisionDivider = document.getElementById('tooltipArmyDecision');
    const decisionSection = document.getElementById('tooltipArmyDecisionSection');
    
    // 检查是否显示AI决策信息
    // 罗马阵营：检查AIController
    // 迦太基阵营：检查CarthageAIController
    // 马其顿阵营：检查MacedoniaAIController
    // 塞琉古阵营：检查SeleucidAIController
    // 托勒密阵营：检查PtolemyAIController
    let shouldShowAIDecision = false;
    
    if (army.faction === 'rome' && army.aiDecision && 
        typeof AIController !== 'undefined' && AIController.config.enabled && 
        AIController.config.controlledFaction === 'rome') {
        shouldShowAIDecision = true;
    } else if (army.faction === 'carthage' && army.aiDecision && 
               typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled) {
        shouldShowAIDecision = true;
    } else if (army.faction === 'macedonia' && army.aiDecision && 
               typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled) {
        shouldShowAIDecision = true;
    } else if (army.faction === 'seleucid' && army.aiDecision && 
               typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled) {
        shouldShowAIDecision = true;
    } else if (army.faction === 'ptolemy' && army.aiDecision && 
               typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled) {
        shouldShowAIDecision = true;
    }
    
    if (shouldShowAIDecision) {
        // 显示AI决策部分
        decisionDivider.style.display = 'block';
        decisionSection.style.display = 'block';
        
        // 更新决策内容
        document.getElementById('tooltipArmyDecisionAction').textContent = army.aiDecision.actionName || '-';
        document.getElementById('tooltipArmyDecisionReason').textContent = army.aiDecision.reason || '-';
        document.getElementById('tooltipArmyDecisionPriority').textContent = army.aiDecision.priority ? army.aiDecision.priority.toFixed(1) : '-';
    } else {
        // 隐藏AI决策部分
        decisionDivider.style.display = 'none';
        decisionSection.style.display = 'none';
    }
    
    // 显示本回合行动结果（双方都显示）
    const actionResultDivider = document.getElementById('tooltipArmyActionResult');
    const actionResultSection = document.getElementById('tooltipArmyActionResultSection');
    const actionResultContent = document.getElementById('tooltipArmyActionResultContent');
    
    if (army.lastAction) {
        // 显示行动结果部分
        actionResultDivider.style.display = 'block';
        actionResultSection.style.display = 'block';
        
        // 根据结果类型设置图标和颜色
        let resultIcon = '📝';
        let resultColor = '#ecf0f1';
        if (army.lastAction.result === 'success') {
            resultIcon = '✅';
            resultColor = '#2ecc71';
        } else if (army.lastAction.result === 'failed') {
            resultIcon = '❌';
            resultColor = '#e74c3c';
        } else if (army.lastAction.result === 'completed') {
            resultIcon = '✔️';
            resultColor = '#3498db';
        }
        
        // 更新行动结果内容
        actionResultContent.innerHTML = `
            <div style="color: ${resultColor}; font-weight: bold; margin-bottom: 1px;">
                ${resultIcon} ${army.lastAction.action}
            </div>
            <div style="color: #bdc3c7;">
                ${army.lastAction.details || '已完成'}
            </div>
        `;
    } else {
        // 隐藏行动结果部分
        actionResultDivider.style.display = 'none';
        actionResultSection.style.display = 'none';
    }
    
    // 显示提示框
    tooltip.style.display = 'block';
    updateArmyTooltipPosition(event);
}

// 隐藏部队提示框
function hideArmyTooltip() {
    const tooltip = document.getElementById('armyTooltip');
    tooltip.style.display = 'none';
}

// 更新部队提示框位置
function updateArmyTooltipPosition(event) {
    const tooltip = document.getElementById('armyTooltip');
    const offsetX = 15;
    const offsetY = 15;
    
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取提示框尺寸
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = event.clientX + offsetX;
    let top = event.clientY + offsetY;
    
    // 检查是否超出右边界
    if (left + tooltipRect.width > viewportWidth) {
        left = event.clientX - tooltipRect.width - offsetX;
    }
    
    // 检查是否超出下边界
    if (top + tooltipRect.height > viewportHeight) {
        top = event.clientY - tooltipRect.height - offsetY;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}
