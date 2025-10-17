
// 处理城市经济自然增长（每回合）
function processCityEconomicGrowth() {
    let grownCities = [];
    
    cities.forEach(city => {
        // 检查城市是否符合经济增长条件：
        // 1. 本回合未被围城
        // 2. 当前未处于围城状态
        // 3. 本回合未被骚扰
        const notBesiegedThisTurn = !gameState.citiesBesiegedThisTurn.includes(city.id);
        const notUnderSiege = !city.isUnderSiege;
        const notHarassedThisTurn = !gameState.citiesHarassedThisTurn.includes(city.id);
        
        if (notBesiegedThisTurn && notUnderSiege && notHarassedThisTurn) {
            const oldEconomicScore = city.economicScore || 1;
            city.economicScore = (city.economicScore || 1) + 1;
            grownCities.push({
                name: city.name,
                oldScore: oldEconomicScore,
                newScore: city.economicScore
            });
        }
    });
    
    // 输出增长日志
    if (grownCities.length > 0) {
        const cityNames = grownCities.map(c => `${c.name}(${c.oldScore}→${c.newScore})`).join('、');
        addLog(`🌾 城市经济增长：${cityNames}`, 'system');
        addLog(`共 ${grownCities.length} 座城市经济分+1（未被围城、未处于围城状态、未被骚扰）`, 'system');
    }
    
    // 更新分数显示
    updateFactionScores();
}

// 检查首都陷落导致全国态度下降（每回合开始时）
function checkCapitalFallAndNeutralize() {
    // 初始化首都陷落标记（如果不存在）
    if (!gameState.capitalFallFlags) {
        gameState.capitalFallFlags = {
            carthage: false,
            rome: false,
            macedonia: false,
            seleucid: false,
            ptolemy: false
        };
    }
    
    // 检查迦太基阵营：新迦太基和迦太基城同时不属于迦太基
    const newCarthage = cities.find(c => c.id === 'newcarthage');
    const carthageCity = cities.find(c => c.id === 'carthage');
    const carthageCapitalFallen = newCarthage && carthageCity && 
        newCarthage.faction !== 'carthage' && carthageCity.faction !== 'carthage';
    
    if (carthageCapitalFallen && !gameState.capitalFallFlags.carthage) {
        // 首次陷落，所有城市对迦太基态度-1
        let affectedCount = 0;
        cities.forEach(city => {
            if (city.carthageAttitude !== undefined) {
                city.carthageAttitude = Math.max(-3, city.carthageAttitude - 1);
                affectedCount++;
            }
        });
        
        // 资金减少50%
        const oldFunds = gameState.carthageFunds;
        const lostFunds = Math.floor(oldFunds * 0.5);
        gameState.carthageFunds = oldFunds - lostFunds;
        
        gameState.capitalFallFlags.carthage = true;
        addLog(`⚠️ 新迦太基与迦太基城同时沦陷！迦太基威望大损，所有城市对迦太基态度-1`, 'system');
        addLog(`💰 首都陷落导致财政崩溃！迦太基资金损失 ${lostFunds}（${oldFunds} → ${gameState.carthageFunds}）`, 'carthage');
    } else if (!carthageCapitalFallen && gameState.capitalFallFlags.carthage) {
        // 首都被夺回，清除标记
        gameState.capitalFallFlags.carthage = false;
        addLog(`✅ 迦太基夺回首都！`, 'carthage');
    }
    
    // 检查罗马阵营：罗马城不属于罗马
    const romeCity = cities.find(c => c.id === 'rome');
    const romeCapitalFallen = romeCity && romeCity.faction !== 'rome';
    
    if (romeCapitalFallen && !gameState.capitalFallFlags.rome) {
        // 首次陷落，所有城市对罗马态度-1
        let affectedCount = 0;
        cities.forEach(city => {
            if (city.romeAttitude !== undefined) {
                city.romeAttitude = Math.max(-3, city.romeAttitude - 1);
                affectedCount++;
            }
        });
        
        // 资金减少50%
        const oldFunds = gameState.romeFunds;
        const lostFunds = Math.floor(oldFunds * 0.5);
        gameState.romeFunds = oldFunds - lostFunds;
        
        gameState.capitalFallFlags.rome = true;
        addLog(`⚠️ 罗马城陷落！罗马威望大损，所有城市对罗马态度-1`, 'system');
        addLog(`💰 首都陷落导致财政崩溃！罗马资金损失 ${lostFunds}（${oldFunds} → ${gameState.romeFunds}）`, 'rome');
    } else if (!romeCapitalFallen && gameState.capitalFallFlags.rome) {
        // 首都被夺回，清除标记
        gameState.capitalFallFlags.rome = false;
        addLog(`✅ 罗马夺回首都！`, 'rome');
    }
    
    // 检查马其顿阵营：亚历山大、安条克、雅典、佩拉同时不属于马其顿
    const alexandria = cities.find(c => c.id === 'alexandria');
    const antioch = cities.find(c => c.id === 'antioch');
    const athens = cities.find(c => c.id === 'athens');
    const pella = cities.find(c => c.id === 'pella');
    const macedoniaCapitalFallen = alexandria && antioch && athens && pella &&
        alexandria.faction !== 'macedonia' && 
        antioch.faction !== 'macedonia' && 
        athens.faction !== 'macedonia' && 
        pella.faction !== 'macedonia';
    
    if (macedoniaCapitalFallen && !gameState.capitalFallFlags.macedonia) {
        // 首次陷落，所有城市对马其顿态度-1
        let affectedCount = 0;
        cities.forEach(city => {
            if (city.macedoniaAttitude !== undefined) {
                city.macedoniaAttitude = Math.max(-3, city.macedoniaAttitude - 1);
                affectedCount++;
            }
        });
        
        // 资金减少50%
        const oldFunds = gameState.macedoniaFunds;
        const lostFunds = Math.floor(oldFunds * 0.5);
        gameState.macedoniaFunds = oldFunds - lostFunds;
        
        gameState.capitalFallFlags.macedonia = true;
        addLog(`⚠️ 亚历山大、安条克、雅典、佩拉同时沦陷！马其顿威望大损，所有城市对马其顿态度-1`, 'system');
        addLog(`💰 首都陷落导致财政崩溃！马其顿资金损失 ${lostFunds}（${oldFunds} → ${gameState.macedoniaFunds}）`, 'macedonia');
    } else if (!macedoniaCapitalFallen && gameState.capitalFallFlags.macedonia) {
        // 首都被夺回，清除标记
        gameState.capitalFallFlags.macedonia = false;
        addLog(`✅ 马其顿夺回关键城市！`, 'macedonia');
    }
    
    // 检查塞琉古阵营：亚历山大、安条克、雅典、佩拉同时不属于塞琉古
    const seleucidCapitalFallen = alexandria && antioch && athens && pella &&
        alexandria.faction !== 'seleucid' && 
        antioch.faction !== 'seleucid' && 
        athens.faction !== 'seleucid' && 
        pella.faction !== 'seleucid';
    
    if (seleucidCapitalFallen && !gameState.capitalFallFlags.seleucid) {
        // 首次陷落，所有城市对塞琉古态度-1
        let affectedCount = 0;
        cities.forEach(city => {
            if (city.seleucidAttitude !== undefined) {
                city.seleucidAttitude = Math.max(-3, city.seleucidAttitude - 1);
                affectedCount++;
            }
        });
        
        // 资金减少50%
        const oldFunds = gameState.seleucidFunds;
        const lostFunds = Math.floor(oldFunds * 0.5);
        gameState.seleucidFunds = oldFunds - lostFunds;
        
        gameState.capitalFallFlags.seleucid = true;
        addLog(`⚠️ 亚历山大、安条克、雅典、佩拉同时沦陷！塞琉古威望大损，所有城市对塞琉古态度-1`, 'system');
        addLog(`💰 首都陷落导致财政崩溃！塞琉古资金损失 ${lostFunds}（${oldFunds} → ${gameState.seleucidFunds}）`, 'seleucid');
    } else if (!seleucidCapitalFallen && gameState.capitalFallFlags.seleucid) {
        // 首都被夺回，清除标记
        gameState.capitalFallFlags.seleucid = false;
        addLog(`✅ 塞琉古夺回关键城市！`, 'seleucid');
    }
    
    // 检查托勒密阵营：亚历山大、安条克、雅典、佩拉同时不属于托勒密
    const ptolemyCapitalFallen = alexandria && antioch && athens && pella &&
        alexandria.faction !== 'ptolemy' && 
        antioch.faction !== 'ptolemy' && 
        athens.faction !== 'ptolemy' && 
        pella.faction !== 'ptolemy';
    
    if (ptolemyCapitalFallen && !gameState.capitalFallFlags.ptolemy) {
        // 首次陷落，所有城市对托勒密态度-1
        let affectedCount = 0;
        cities.forEach(city => {
            if (city.ptolemyAttitude !== undefined) {
                city.ptolemyAttitude = Math.max(-3, city.ptolemyAttitude - 1);
                affectedCount++;
            }
        });
        
        // 资金减少50%
        const oldFunds = gameState.ptolemyFunds;
        const lostFunds = Math.floor(oldFunds * 0.5);
        gameState.ptolemyFunds = oldFunds - lostFunds;
        
        gameState.capitalFallFlags.ptolemy = true;
        addLog(`⚠️ 亚历山大城陷落！托勒密威望大损，所有城市对托勒密态度-1`, 'system');
        addLog(`💰 首都陷落导致财政崩溃！托勒密资金损失 ${lostFunds}（${oldFunds} → ${gameState.ptolemyFunds}）`, 'ptolemy');
    } else if (!ptolemyCapitalFallen && gameState.capitalFallFlags.ptolemy) {
        // 首都被夺回，清除标记
        gameState.capitalFallFlags.ptolemy = false;
        addLog(`✅ 托勒密夺回亚历山大城！`, 'ptolemy');
    }
}

// 检查城市态度和阵营变化（每回合开始时）
function checkCityAttitudeAndFaction() {
    cities.forEach(city => {
        const romeAttitude = city.romeAttitude || 0;
        const carthageAttitude = city.carthageAttitude || 0;
        const macedoniaAttitude = city.macedoniaAttitude || 0;
        const seleucidAttitude = city.seleucidAttitude || 0;
        const ptolemyAttitude = city.ptolemyAttitude || 0;
        let factionChanged = false;
        
        // 对于每个属于罗马阵营的城市
        if (city.faction === 'rome') {
            // 若其对罗马态度在-2到0之间，则D6，若<2，则其阵营改为中立
            if (romeAttitude >= -2 && romeAttitude <= 0) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对罗马态度降低(${romeAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
            // 若其对罗马态度在-5到-2之间，则D6，若<2，则其阵营改为迦太基
            else if (romeAttitude >= -5 && romeAttitude < -2) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'carthage');
                    addLog(`${city.name} 由于对罗马态度极低(${romeAttitude})，投${diceRoll}，阵营转为迦太基`, 'system');
                    factionChanged = true;
                }
            }
        }
        
        // 对于每个属于迦太基阵营的城市
        else if (city.faction === 'carthage') {
            // 若其对迦太基态度在-2到0之间，则D6，若<2，则其阵营改为中立
            if (carthageAttitude >= -2 && carthageAttitude <= 0) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对迦太基态度降低(${carthageAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
            // 若其对迦太基态度小于-2，则D6，若<2，则其阵营改为罗马
            else if (carthageAttitude < -2) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'rome');
                    addLog(`${city.name} 由于对迦太基态度极低(${carthageAttitude})，投${diceRoll}，阵营转为罗马`, 'system');
                    factionChanged = true;
                }
            }
        }
        
        // 对于每个属于马其顿阵营的城市
        else if (city.faction === 'macedonia') {
            // 若其对马其顿态度在-2到0之间，则D6，若<2，则其阵营改为中立
            if (macedoniaAttitude >= -2 && macedoniaAttitude <= 0) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对马其顿态度降低(${macedoniaAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
            // 若其对马其顿态度小于-2，则D6，若<2，则其阵营改为罗马
            else if (macedoniaAttitude < -2) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对马其顿态度极低(${macedoniaAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
        }
        
        // 对于每个属于塞琉古阵营的城市
        else if (city.faction === 'seleucid') {
            // 若其对塞琉古态度在-2到0之间，则D6，若<2，则其阵营改为中立
            if (seleucidAttitude >= -2 && seleucidAttitude <= 0) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对塞琉古态度降低(${seleucidAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
            // 若其对塞琉古态度小于-2，则D6，若<2，则其阵营改为中立
            else if (seleucidAttitude < -2) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对塞琉古态度极低(${seleucidAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
        }
        
        // 对于每个属于托勒密阵营的城市
        else if (city.faction === 'ptolemy') {
            // 若其对托勒密态度在-2到0之间，则D6，若<2，则其阵营改为中立
            if (ptolemyAttitude >= -2 && ptolemyAttitude <= 0) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对托勒密态度降低(${ptolemyAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
            // 若其对托勒密态度小于-2，则D6，若<2，则其阵营改为中立
            else if (ptolemyAttitude < -2) {
                const diceRoll = rollDice(2);
                if (diceRoll === 12) {
                    changeFaction(city.id, 'neutral');
                    addLog(`${city.name} 由于对托勒密态度极低(${ptolemyAttitude})，投${diceRoll}，阵营转为中立`, 'system');
                    factionChanged = true;
                }
            }
        }
        
        // 注释：基于态度的自然阵营变化现在只在游说成功后进行判定，不在每回合检查
    });
}

// 计算经济收入
function calculateEconomicIncome() {
    let romeIncome = 0;
    let carthageIncome = 0;
    let macedoniaIncome = 0;
    let seleucidIncome = 0;
    let ptolemyIncome = 0;
    const romeIncomeDetails = [];
    const carthageIncomeDetails = [];
    const macedoniaIncomeDetails = [];
    const seleucidIncomeDetails = [];
    const ptolemyIncomeDetails = [];
    
    cities.forEach(city => {
        // 只有未被围城的城市才产生经济收入
        if (!city.isUnderSiege) {
            if (city.faction === 'rome') {
                romeIncome += city.economicScore || 0;
                romeIncomeDetails.push(`${city.name}(${city.economicScore || 0})`);
            } else if (city.faction === 'carthage') {
                carthageIncome += city.economicScore || 0;
                carthageIncomeDetails.push(`${city.name}(${city.economicScore || 0})`);
            } else if (city.faction === 'macedonia') {
                macedoniaIncome += city.economicScore || 0;
                macedoniaIncomeDetails.push(`${city.name}(${city.economicScore || 0})`);
            } else if (city.faction === 'seleucid') {
                seleucidIncome += city.economicScore || 0;
                seleucidIncomeDetails.push(`${city.name}(${city.economicScore || 0})`);
            } else if (city.faction === 'ptolemy') {
                ptolemyIncome += city.economicScore || 0;
                ptolemyIncomeDetails.push(`${city.name}(${city.economicScore || 0})`);
            }
        }
    });
    
    // 记录旧资金用于显示
    const oldRomeFunds = gameState.romeFunds;
    const oldCarthageFunds = gameState.carthageFunds;
    const oldMacedoniaFunds = gameState.macedoniaFunds;
    const oldSeleucidFunds = gameState.seleucidFunds;
    const oldPtolemyFunds = gameState.ptolemyFunds;
    
    // 更新资金
    gameState.romeFunds += romeIncome;
    gameState.carthageFunds += carthageIncome;
    gameState.macedoniaFunds += macedoniaIncome;
    gameState.seleucidFunds += seleucidIncome;
    gameState.ptolemyFunds += ptolemyIncome;
    
    // 记录日志
    if (romeIncome > 0) {
        addLog(`💰 【罗马经济收入】+${romeIncome} | 来源: ${romeIncomeDetails.join(', ')} | 资金: ${oldRomeFunds} → ${gameState.romeFunds}`, 'rome');
    } else {
        addLog(`💰 【罗马经济收入】+0 | 当前无收入城市 | 资金: ${gameState.romeFunds}`, 'rome');
    }
    
    if (carthageIncome > 0) {
        addLog(`💰 【迦太基经济收入】+${carthageIncome} | 来源: ${carthageIncomeDetails.join(', ')} | 资金: ${oldCarthageFunds} → ${gameState.carthageFunds}`, 'carthage');
    } else {
        addLog(`💰 【迦太基经济收入】+0 | 当前无收入城市 | 资金: ${gameState.carthageFunds}`, 'carthage');
    }
    
    if (macedoniaIncome > 0) {
        addLog(`💰 【马其顿经济收入】+${macedoniaIncome} | 来源: ${macedoniaIncomeDetails.join(', ')} | 资金: ${oldMacedoniaFunds} → ${gameState.macedoniaFunds}`, 'macedonia');
    } else {
        addLog(`💰 【马其顿经济收入】+0 | 当前无收入城市 | 资金: ${gameState.macedoniaFunds}`, 'macedonia');
    }
    
    if (seleucidIncome > 0) {
        addLog(`💰 【塞琉古经济收入】+${seleucidIncome} | 来源: ${seleucidIncomeDetails.join(', ')} | 资金: ${oldSeleucidFunds} → ${gameState.seleucidFunds}`, 'seleucid');
    } else {
        addLog(`💰 【塞琉古经济收入】+0 | 当前无收入城市 | 资金: ${gameState.seleucidFunds}`, 'seleucid');
    }
    
    if (ptolemyIncome > 0) {
        addLog(`💰 【托勒密经济收入】+${ptolemyIncome} | 来源: ${ptolemyIncomeDetails.join(', ')} | 资金: ${oldPtolemyFunds} → ${gameState.ptolemyFunds}`, 'ptolemy');
    } else {
        addLog(`💰 【托勒密经济收入】+0 | 当前无收入城市 | 资金: ${gameState.ptolemyFunds}`, 'ptolemy');
    }
    
    // 更新UI显示
    updateFactionFunds();
}

// 计算军饷支出
function calculateMilitaryPayroll() {
    let romePayroll = 0;
    let carthagePayroll = 0;
    let macedoniaPayroll = 0;
    let seleucidPayroll = 0;
    let ptolemyPayroll = 0;
    const romePayrollDetails = [];
    const carthagePayrollDetails = [];
    const macedoniaPayrollDetails = [];
    const seleucidPayrollDetails = [];
    const ptolemyPayrollDetails = [];
    
    // 计算罗马军队军饷
    armies.rome.forEach(army => {
        const lightCavCost = (army.lightCavalry || 0) / 100;
        const heavyCavCost = (army.heavyCavalry || 0) / 50;
        const heavyInfCost = (army.heavyInfantry || 0) / 200;
        const lightInfCost = (army.lightInfantry || 0) / 3000;
        
        const armyTotal = lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        romePayroll += armyTotal;
        
        romePayrollDetails.push(`${army.commander}(${Math.round(armyTotal)})`);
    });
    
    // 计算迦太基军队军饷
    armies.carthage.forEach(army => {
        const lightCavCost = (army.lightCavalry || 0) / 100;
        const heavyCavCost = (army.heavyCavalry || 0) / 50;
        const heavyInfCost = (army.heavyInfantry || 0) / 200;
        const lightInfCost = (army.lightInfantry || 0) / 3000;
        
        const armyTotal = lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        carthagePayroll += armyTotal;
        
        carthagePayrollDetails.push(`${army.commander}(${Math.round(armyTotal)})`);
    });
    
    // 计算马其顿军队军饷
    if (armies.macedonia) {
        armies.macedonia.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            
            const armyTotal = lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
            macedoniaPayroll += armyTotal;
            
            macedoniaPayrollDetails.push(`${army.commander}(${Math.round(armyTotal)})`);
        });
    }
    
    // 计算塞琉古军队军饷

    if (armies.seleucid) {
        armies.seleucid.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            
            const armyTotal = lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
            seleucidPayroll += armyTotal;
            
            seleucidPayrollDetails.push(`${army.commander}(${Math.round(armyTotal)})`);
        });
    }
    
    // 计算托勒密军队军饷
    if (armies.ptolemy) {
        armies.ptolemy.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            
            const armyTotal = lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
            ptolemyPayroll += armyTotal;
            
            ptolemyPayrollDetails.push(`${army.commander}(${Math.round(armyTotal)})`);
        });
    }
    
    // 四舍五入到整数
    romePayroll = Math.round(romePayroll);
    carthagePayroll = Math.round(carthagePayroll);
    macedoniaPayroll = Math.round(macedoniaPayroll);
    seleucidPayroll = Math.round(seleucidPayroll);
    ptolemyPayroll = Math.round(ptolemyPayroll);
    
    // 记录旧资金用于显示
    const oldRomeFunds = gameState.romeFunds;
    const oldCarthageFunds = gameState.carthageFunds;
    const oldMacedoniaFunds = gameState.macedoniaFunds;
    const oldSeleucidFunds = gameState.seleucidFunds;
    const oldPtolemyFunds = gameState.ptolemyFunds;
    
    // 扣除资金
    gameState.romeFunds -= romePayroll;
    gameState.carthageFunds -= carthagePayroll;
    gameState.macedoniaFunds -= macedoniaPayroll;
    gameState.seleucidFunds -= seleucidPayroll;
    gameState.ptolemyFunds -= ptolemyPayroll;
    
    // 记录日志
    if (romePayroll > 0) {
        addLog(`⚔️ 【罗马军饷支出】-${romePayroll} | 军队: ${romePayrollDetails.join(', ')} | 资金: ${oldRomeFunds} → ${gameState.romeFunds}`, 'rome');
    } else {
        addLog(`⚔️ 【罗马军饷支出】-0 | 当前无军队 | 资金: ${gameState.romeFunds}`, 'rome');
    }
    
    if (carthagePayroll > 0) {
        addLog(`⚔️ 【迦太基军饷支出】-${carthagePayroll} | 军队: ${carthagePayrollDetails.join(', ')} | 资金: ${oldCarthageFunds} → ${gameState.carthageFunds}`, 'carthage');
    } else {
        addLog(`⚔️ 【迦太基军饷支出】-0 | 当前无军队 | 资金: ${gameState.carthageFunds}`, 'carthage');
    }
    
    if (macedoniaPayroll > 0) {
        addLog(`⚔️ 【马其顿军饷支出】-${macedoniaPayroll} | 军队: ${macedoniaPayrollDetails.join(', ')} | 资金: ${oldMacedoniaFunds} → ${gameState.macedoniaFunds}`, 'macedonia');
    } else {
        addLog(`⚔️ 【马其顿军饷支出】-0 | 当前无军队 | 资金: ${gameState.macedoniaFunds}`, 'macedonia');
    }
    
    if (seleucidPayroll > 0) {
        addLog(`⚔️ 【塞琉古军饷支出】-${seleucidPayroll} | 军队: ${seleucidPayrollDetails.join(', ')} | 资金: ${oldSeleucidFunds} → ${gameState.seleucidFunds}`, 'seleucid');
    } else {
        addLog(`⚔️ 【塞琉古军饷支出】-0 | 当前无军队 | 资金: ${gameState.seleucidFunds}`, 'seleucid');
    }
    
    if (ptolemyPayroll > 0) {
        addLog(`⚔️ 【托勒密军饷支出】-${ptolemyPayroll} | 军队: ${ptolemyPayrollDetails.join(', ')} | 资金: ${oldPtolemyFunds} → ${gameState.ptolemyFunds}`, 'ptolemy');
    } else {
        addLog(`⚔️ 【托勒密军饷支出】-0 | 当前无军队 | 资金: ${gameState.ptolemyFunds}`, 'ptolemy');
    }
    
    // 更新UI显示
    updateFactionFunds();
}

// 处理债务惩罚
function handleDebtPenalties() {
    // 处理罗马债务
    if (gameState.romeDebt > 0) {
        // 计算利息（债务5%）
        const romeInterest = Math.round(gameState.romeDebt * 0.05);
        const oldRomeFunds = gameState.romeFunds;
        gameState.romeFunds -= romeInterest;
        
        // 只有当资金<0或负债>6000时，所有罗马军队士气-0.5
        let moralePenaltyApplied = false;
        if (gameState.romeFunds < 0 || gameState.romeDebt > 6000) {
            armies.rome.forEach(army => {
                const oldMorale = army.morale;
                army.morale = Math.max(1, army.morale - 0.5);
            });
            moralePenaltyApplied = true;
        }
        
        const moralePenaltyMsg = moralePenaltyApplied ? ' | 全军士气-0.5' : '';
        const penaltyReason = gameState.romeFunds < 0 ? '(资金不足)' : gameState.romeDebt > 6000 ? '(负债过高)' : '';
        addLog(`📉 【罗马债务利息】-${romeInterest} | 债务总额: ${gameState.romeDebt} (利率5%) | 资金: ${oldRomeFunds} → ${gameState.romeFunds}${moralePenaltyMsg}${penaltyReason}`, 'rome');
    }
    
    // 处理迦太基债务
    if (gameState.carthageDebt > 0) {
        // 计算利息（债务5%）
        const carthageInterest = Math.round(gameState.carthageDebt * 0.05);
        const oldCarthageFunds = gameState.carthageFunds;
        gameState.carthageFunds -= carthageInterest;
        
        // 只有当资金<0或负债>6000时，所有迦太基军队士气-0.5
        let moralePenaltyApplied = false;
        if (gameState.carthageFunds < 0 || gameState.carthageDebt > 6000) {
            armies.carthage.forEach(army => {
                const oldMorale = army.morale;
                army.morale = Math.max(1, army.morale - 0.5);
            });
            moralePenaltyApplied = true;
        }
        
        const moralePenaltyMsg = moralePenaltyApplied ? ' | 全军士气-0.5' : '';
        const penaltyReason = gameState.carthageFunds < 0 ? '(资金不足)' : gameState.carthageDebt > 6000 ? '(负债过高)' : '';
        addLog(`📉 【迦太基债务利息】-${carthageInterest} | 债务总额: ${gameState.carthageDebt} (利率5%) | 资金: ${oldCarthageFunds} → ${gameState.carthageFunds}${moralePenaltyMsg}${penaltyReason}`, 'carthage');
    }
    
    // 处理马其顿债务
    if (gameState.macedoniaDebt > 0) {
        // 计算利息（债务5%）
        const macedoniaInterest = Math.round(gameState.macedoniaDebt * 0.05);
        const oldMacedoniaFunds = gameState.macedoniaFunds;
        gameState.macedoniaFunds -= macedoniaInterest;
        
        // 只有当资金<0或负债>6000时，所有马其顿军队士气-0.5
        let moralePenaltyApplied = false;
        if (gameState.macedoniaFunds < 0 || gameState.macedoniaDebt > 6000) {
            if (armies.macedonia) {
                armies.macedonia.forEach(army => {
                const oldMorale = army.morale;
                army.morale = Math.max(1, army.morale - 0.5);
            });
            }
            moralePenaltyApplied = true;
        }
        
        const moralePenaltyMsg = moralePenaltyApplied ? ' | 全军士气-0.5' : '';
        const penaltyReason = gameState.macedoniaFunds < 0 ? '(资金不足)' : gameState.macedoniaDebt > 6000 ? '(负债过高)' : '';
        addLog(`📉 【马其顿债务利息】-${macedoniaInterest} | 债务总额: ${gameState.macedoniaDebt} (利率5%) | 资金: ${oldMacedoniaFunds} → ${gameState.macedoniaFunds}${moralePenaltyMsg}${penaltyReason}`, 'macedonia');
    }
    
    // 处理塞琉古债务
    if (gameState.seleucidDebt > 0) {
        // 计算利息（债务5%）
        const seleucidInterest = Math.round(gameState.seleucidDebt * 0.05);
        const oldSeleucidFunds = gameState.seleucidFunds;
        gameState.seleucidFunds -= seleucidInterest;
        
        // 只有当资金<0或负债>6000时，所有塞琉古军队士气-0.5
        let moralePenaltyApplied = false;
        if (gameState.seleucidFunds < 0 || gameState.seleucidDebt > 6000) {
            if (armies.seleucid) {
                armies.seleucid.forEach(army => {
                    const oldMorale = army.morale;
                    army.morale = Math.max(1, army.morale - 0.5);
                });
            }
            moralePenaltyApplied = true;
        }
        
        const moralePenaltyMsg = moralePenaltyApplied ? ' | 全军士气-0.5' : '';
        const penaltyReason = gameState.seleucidFunds < 0 ? '(资金不足)' : gameState.seleucidDebt > 6000 ? '(负债过高)' : '';
        addLog(`📉 【塞琉古债务利息】-${seleucidInterest} | 债务总额: ${gameState.seleucidDebt} (利率5%) | 资金: ${oldSeleucidFunds} → ${gameState.seleucidFunds}${moralePenaltyMsg}${penaltyReason}`, 'seleucid');
    }
    
    // 处理托勒密债务
    if (gameState.ptolemyDebt > 0) {
        // 计算利息（债务5%）
        const ptolemyInterest = Math.round(gameState.ptolemyDebt * 0.05);
        const oldPtolemyFunds = gameState.ptolemyFunds;
        gameState.ptolemyFunds -= ptolemyInterest;
        
        // 只有当资金<0或负债>6000时，所有托勒密军队士气-0.5
        let moralePenaltyApplied = false;
        if (gameState.ptolemyFunds < 0 || gameState.ptolemyDebt > 6000) {
            if (armies.ptolemy) {
                armies.ptolemy.forEach(army => {
                    const oldMorale = army.morale;
                    army.morale = Math.max(1, army.morale - 0.5);
                });
            }
            moralePenaltyApplied = true;
        }
        
        const moralePenaltyMsg = moralePenaltyApplied ? ' | 全军士气-0.5' : '';
        const penaltyReason = gameState.ptolemyFunds < 0 ? '(资金不足)' : gameState.ptolemyDebt > 6000 ? '(负债过高)' : '';
        addLog(`📉 【托勒密债务利息】-${ptolemyInterest} | 债务总额: ${gameState.ptolemyDebt} (利率5%) | 资金: ${oldPtolemyFunds} → ${gameState.ptolemyFunds}${moralePenaltyMsg}${penaltyReason}`, 'ptolemy');
    }
    
    // 更新资金显示
    updateFactionFunds();
}

// 显示回合经济汇总
function displayEconomicSummary() {
    // 计算罗马收支
    let romeIncome = 0;
    cities.forEach(city => {
        if (city.faction === 'rome' && !city.isUnderSiege) {
            romeIncome += city.economicScore || 0;
        }
    });
    
    let romeExpense = 0;
    armies.rome.forEach(army => {
        const lightCavCost = (army.lightCavalry || 0) / 100;
        const heavyCavCost = (army.heavyCavalry || 0) / 50;
        const heavyInfCost = (army.heavyInfantry || 0) / 200;
        const lightInfCost = (army.lightInfantry || 0) / 3000;
        romeExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
    });
    romeExpense = Math.round(romeExpense);
    
    const romeInterest = gameState.romeDebt > 0 ? Math.round(gameState.romeDebt * 0.05) : 0;
    const romeTotalExpense = romeExpense + romeInterest;
    const romeNet = romeIncome - romeTotalExpense;
    const romeNetSign = romeNet >= 0 ? '+' : '';
    
    // 计算迦太基收支
    let carthageIncome = 0;
    cities.forEach(city => {
        if (city.faction === 'carthage' && !city.isUnderSiege) {
            carthageIncome += city.economicScore || 0;
        }
    });
    
    let carthageExpense = 0;
    armies.carthage.forEach(army => {
        const lightCavCost = (army.lightCavalry || 0) / 100;
        const heavyCavCost = (army.heavyCavalry || 0) / 50;
        const heavyInfCost = (army.heavyInfantry || 0) / 200;
        const lightInfCost = (army.lightInfantry || 0) / 3000;
        carthageExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
    });
    carthageExpense = Math.round(carthageExpense);
    
    const carthageInterest = gameState.carthageDebt > 0 ? Math.round(gameState.carthageDebt * 0.05) : 0;
    const carthageTotalExpense = carthageExpense + carthageInterest;
    const carthageNet = carthageIncome - carthageTotalExpense;
    const carthageNetSign = carthageNet >= 0 ? '+' : '';
    
    // 计算马其顿收支
    let macedoniaIncome = 0;
    cities.forEach(city => {
        if (city.faction === 'macedonia' && !city.isUnderSiege) {
            macedoniaIncome += city.economicScore || 0;
        }
    });
    
    let macedoniaExpense = 0;
    if (armies.macedonia) {
        armies.macedonia.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            macedoniaExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        });
    }
    macedoniaExpense = Math.round(macedoniaExpense);
    
    const macedoniaInterest = gameState.macedoniaDebt > 0 ? Math.round(gameState.macedoniaDebt * 0.05) : 0;
    const macedoniaTotalExpense = macedoniaExpense + macedoniaInterest;
    const macedoniaNet = macedoniaIncome - macedoniaTotalExpense;
    const macedoniaNetSign = macedoniaNet >= 0 ? '+' : '';
    
    // 计算塞琉古收支
    let seleucidIncome = 0;
    cities.forEach(city => {
        if (city.faction === 'seleucid' && !city.isUnderSiege) {
            seleucidIncome += city.economicScore || 0;
        }
    });
    
    let seleucidExpense = 0;
    if (armies.seleucid) {
        armies.seleucid.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            seleucidExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        });
    }
    seleucidExpense = Math.round(seleucidExpense);
    
    const seleucidInterest = gameState.seleucidDebt > 0 ? Math.round(gameState.seleucidDebt * 0.05) : 0;
    const seleucidTotalExpense = seleucidExpense + seleucidInterest;
    const seleucidNet = seleucidIncome - seleucidTotalExpense;
    const seleucidNetSign = seleucidNet >= 0 ? '+' : '';
    
    // 计算托勒密收支
    let ptolemyIncome = 0;
    cities.forEach(city => {
        if (city.faction === 'ptolemy' && !city.isUnderSiege) {
            ptolemyIncome += city.economicScore || 0;
        }
    });
    
    let ptolemyExpense = 0;
    if (armies.ptolemy) {
        armies.ptolemy.forEach(army => {
            const lightCavCost = (army.lightCavalry || 0) / 100;
            const heavyCavCost = (army.heavyCavalry || 0) / 50;
            const heavyInfCost = (army.heavyInfantry || 0) / 200;
            const lightInfCost = (army.lightInfantry || 0) / 3000;
            ptolemyExpense += lightCavCost + heavyCavCost + heavyInfCost + lightInfCost;
        });
    }
    ptolemyExpense = Math.round(ptolemyExpense);
    
    const ptolemyInterest = gameState.ptolemyDebt > 0 ? Math.round(gameState.ptolemyDebt * 0.05) : 0;
    const ptolemyTotalExpense = ptolemyExpense + ptolemyInterest;
    const ptolemyNet = ptolemyIncome - ptolemyTotalExpense;
    const ptolemyNetSign = ptolemyNet >= 0 ? '+' : '';
    
    // 保存本回合军费到gameState（只保存军饷，不包括利息）
    gameState.romeLastTurnExpense = romeExpense;
    gameState.carthageLastTurnExpense = carthageExpense;
    gameState.macedoniaLastTurnExpense = macedoniaExpense;
    gameState.seleucidLastTurnExpense = seleucidExpense;
    gameState.ptolemyLastTurnExpense = ptolemyExpense;
    
    // 输出汇总日志
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'system');
    addLog(`📊 【罗马回合经济汇总】收入: +${romeIncome} | 支出: -${romeTotalExpense} (军饷${romeExpense}${romeInterest > 0 ? '+利息' + romeInterest : ''}) | 净收益: ${romeNetSign}${romeNet} | 当前资金: ${gameState.romeFunds}`, 'rome');
    addLog(`📊 【迦太基回合经济汇总】收入: +${carthageIncome} | 支出: -${carthageTotalExpense} (军饷${carthageExpense}${carthageInterest > 0 ? '+利息' + carthageInterest : ''}) | 净收益: ${carthageNetSign}${carthageNet} | 当前资金: ${gameState.carthageFunds}`, 'carthage');
    addLog(`📊 【马其顿回合经济汇总】收入: +${macedoniaIncome} | 支出: -${macedoniaTotalExpense} (军饷${macedoniaExpense}${macedoniaInterest > 0 ? '+利息' + macedoniaInterest : ''}) | 净收益: ${macedoniaNetSign}${macedoniaNet} | 当前资金: ${gameState.macedoniaFunds}`, 'macedonia');
    addLog(`📊 【塞琉古回合经济汇总】收入: +${seleucidIncome} | 支出: -${seleucidTotalExpense} (军饷${seleucidExpense}${seleucidInterest > 0 ? '+利息' + seleucidInterest : ''}) | 净收益: ${seleucidNetSign}${seleucidNet} | 当前资金: ${gameState.seleucidFunds}`, 'seleucid');
    addLog(`📊 【托勒密回合经济汇总】收入: +${ptolemyIncome} | 支出: -${ptolemyTotalExpense} (军饷${ptolemyExpense}${ptolemyInterest > 0 ? '+利息' + ptolemyInterest : ''}) | 净收益: ${ptolemyNetSign}${ptolemyNet} | 当前资金: ${gameState.ptolemyFunds}`, 'ptolemy');
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'system');
    
    // 如果罗马AI控制且净收益为负，解散距离敌军最远的军队
    if (typeof AIController !== 'undefined' && AIController.config.controlledFaction === 'rome' && romeNet < 0) {
        handleRomeDeficitDisbanding(romeNet);
    }
    
    // 如果迦太基AI控制且净收益为负，解散距离敌军最远的军队
    if (typeof CarthageAIController !== 'undefined' && CarthageAIController.config.enabled && carthageNet < 0) {
        handleCarthageDeficitDisbanding(carthageNet);
    }
    
    // 如果马其顿AI控制且净收益为负，解散距离敌军最远的军队
    if (typeof MacedoniaAIController !== 'undefined' && MacedoniaAIController.config.enabled && macedoniaNet < 0) {
        handleMacedoniaDeficitDisbanding(macedoniaNet);
    }
    
    // 如果塞琉古AI控制且净收益为负，解散距离敌军最远的军队
    if (typeof SeleucidAIController !== 'undefined' && SeleucidAIController.config.enabled && seleucidNet < 0) {
        handleSeleucidDeficitDisbanding(seleucidNet);
    }
    
    // 如果托勒密AI控制且净收益为负，解散距离敌军最远的军队
    if (typeof PtolemyAIController !== 'undefined' && PtolemyAIController.config.enabled && ptolemyNet < 0) {
        handlePtolemyDeficitDisbanding(ptolemyNet);
    }
}

// 处理罗马赤字时解散军队
function handleRomeDeficitDisbanding(deficit) {
    if (armies.rome.length === 0) return;
    
    // 如果只有一支军队（主将），不解散
    if (armies.rome.length <= 1) {
        addLog(`💰 【罗马财政危机】净收益${deficit}，但只剩主将，无法解散`, 'rome');
        return;
    }
    
    // 找到距离所有敌军最远的罗马军队（排除第一支军队）
    let farthestArmy = null;
    let maxMinDistance = -1;
    
    armies.rome.forEach((romeArmy, index) => {
        // 跳过第一支军队（主将）
        if (index === 0) return;
        
        // 计算该军队到所有敌军的最小距离
        let minDistanceToEnemy = Infinity;
        
        armies.carthage.forEach(enemyArmy => {
            const distance = AIController.calculateDistance(romeArmy.location, enemyArmy.location);
            if (distance < minDistanceToEnemy) {
                minDistanceToEnemy = distance;
            }
        });
        
        // 如果没有敌军，距离设为一个很大的值
        if (minDistanceToEnemy === Infinity) {
            minDistanceToEnemy = 999;
        }
        
        // 找到距离最近敌军最远的军队
        if (minDistanceToEnemy > maxMinDistance) {
            maxMinDistance = minDistanceToEnemy;
            farthestArmy = romeArmy;
        }
    });
    
    // 解散该军队
    if (farthestArmy) {
        const cityName = cities.find(c => c.id === farthestArmy.location)?.name || '未知位置';
        const totalTroops = (farthestArmy.lightCavalry || 0) + 
                           (farthestArmy.heavyCavalry || 0) + 
                           (farthestArmy.heavyInfantry || 0) + 
                           (farthestArmy.lightInfantry || 0);
        
        addLog(`💰 【罗马财政危机】净收益${deficit}，无法维持军队`, 'rome');
        // addLog(`🗡️ 罗马AI决定解散 ${farthestArmy.commander} 的部队（位于${cityName}，${totalTroops}人，距敌军最远${maxMinDistance}步）`, 'rome');
        
        // 从军队列表中移除
        const index = armies.rome.findIndex(a => a.id === farthestArmy.id);
        if (index !== -1) {
            armies.rome.splice(index, 1);
        }
        
        // 更新地图显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
    }
}

// 处理迦太基赤字时解散军队
function handleCarthageDeficitDisbanding(deficit) {
    if (armies.carthage.length === 0) return;
    
    // 如果只有一支军队（主将），不解散
    if (armies.carthage.length <= 1) {
        addLog(`💰 【迦太基财政危机】净收益${deficit}，但只剩主将，无法解散`, 'carthage');
        return;
    }
    
    // 找到距离所有敌军最远的迦太基军队（排除第一支军队）
    let farthestArmy = null;
    let maxMinDistance = -1;
    
    armies.carthage.forEach((carthageArmy, index) => {
        // 跳过第一支军队（主将）
        if (index === 0) return;
        
        // 计算该军队到所有敌军的最小距离
        let minDistanceToEnemy = Infinity;
        
        armies.rome.forEach(enemyArmy => {
            const distance = CarthageAIController.calculateDistance(carthageArmy.location, enemyArmy.location);
            if (distance < minDistanceToEnemy) {
                minDistanceToEnemy = distance;
            }
        });
        
        // 如果没有敌军，距离设为一个很大的值
        if (minDistanceToEnemy === Infinity) {
            minDistanceToEnemy = 999;
        }
        
        // 找到距离最近敌军最远的军队
        if (minDistanceToEnemy > maxMinDistance) {
            maxMinDistance = minDistanceToEnemy;
            farthestArmy = carthageArmy;
        }
    });
    
    // 解散该军队
    if (farthestArmy) {
        const cityName = cities.find(c => c.id === farthestArmy.location)?.name || '未知位置';
        const totalTroops = (farthestArmy.lightCavalry || 0) + 
                           (farthestArmy.heavyCavalry || 0) + 
                           (farthestArmy.heavyInfantry || 0) + 
                           (farthestArmy.lightInfantry || 0);
        
        addLog(`💰 【迦太基财政危机】净收益${deficit}，无法维持军队`, 'carthage');
        // addLog(`🗡️ 迦太基AI决定解散 ${farthestArmy.commander} 的部队（位于${cityName}，${totalTroops}人，距敌军最远${maxMinDistance}步）`, 'carthage');
        
        // 从军队列表中移除
        const index = armies.carthage.findIndex(a => a.id === farthestArmy.id);
        if (index !== -1) {
            armies.carthage.splice(index, 1);
        }
        
        // 更新地图显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
    }
}

// 处理马其顿赤字时解散军队
function handleMacedoniaDeficitDisbanding(deficit) {
    if (armies.macedonia.length === 0) return;
    
    // 如果只有一支军队（主将），不解散
    if (armies.macedonia.length <= 1) {
        addLog(`💰 【马其顿财政危机】净收益${deficit}，但只剩主将，无法解散`, 'macedonia');
        return;
    }
    
    // 找到距离所有敌军最远的马其顿军队（排除第一支军队）
    let farthestArmy = null;
    let maxMinDistance = -1;
    
    armies.macedonia.forEach((macedoniaArmy, index) => {
        // 跳过第一支军队（主将）
        if (index === 0) return;
        
        // 计算该军队到所有敌军的最小距离
        let minDistanceToEnemy = Infinity;
        
        armies.rome.forEach(enemyArmy => {
            const distance = MacedoniaAIController.calculateDistance(macedoniaArmy.location, enemyArmy.location);
            if (distance < minDistanceToEnemy) {
                minDistanceToEnemy = distance;
            }
        });
        
        // 如果没有敌军，距离设为一个很大的值
        if (minDistanceToEnemy === Infinity) {
            minDistanceToEnemy = 999;
        }
        
        // 找到距离最近敌军最远的军队
        if (minDistanceToEnemy > maxMinDistance) {
            maxMinDistance = minDistanceToEnemy;
            farthestArmy = macedoniaArmy;
        }
    });
    
    // 解散该军队
    if (farthestArmy) {
        const cityName = cities.find(c => c.id === farthestArmy.location)?.name || '未知位置';
        const totalTroops = (farthestArmy.lightCavalry || 0) + 
                           (farthestArmy.heavyCavalry || 0) + 
                           (farthestArmy.heavyInfantry || 0) + 
                           (farthestArmy.lightInfantry || 0);
        
        addLog(`💰 【马其顿财政危机】净收益${deficit}，无法维持军队`, 'macedonia');
        // addLog(`🗡️ 马其顿AI决定解散 ${farthestArmy.commander} 的部队（位于${cityName}，${totalTroops}人，距敌军最远${maxMinDistance}步）`, 'macedonia');
        
        // 从军队列表中移除
        const index = armies.macedonia.findIndex(a => a.id === farthestArmy.id);
        if (index !== -1) {
            armies.macedonia.splice(index, 1);
        }
        
        // 更新地图显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
    }
}

// 处理塞琉古赤字时解散军队
function handleSeleucidDeficitDisbanding(deficit) {
    if (armies.seleucid.length === 0) return;
    
    // 如果只有一支军队（主将），不解散
    if (armies.seleucid.length <= 1) {
        addLog(`💰 【塞琉古财政危机】净收益${deficit}，但只剩主将，无法解散`, 'seleucid');
        return;
    }
    
    // 找到距离所有敌军最远的塞琉古军队（排除第一支军队）
    let farthestArmy = null;
    let maxMinDistance = -1;
    
    armies.seleucid.forEach((seleucidArmy, index) => {
        // 跳过第一支军队（主将）
        if (index === 0) return;
        
        // 计算该军队到所有敌军的最小距离
        let minDistanceToEnemy = Infinity;
        
        armies.rome.forEach(enemyArmy => {
            const distance = SeleucidAIController.calculateDistance(seleucidArmy.location, enemyArmy.location);
            if (distance < minDistanceToEnemy) {
                minDistanceToEnemy = distance;
            }
        });
        
        // 如果没有敌军，距离设为一个很大的值
        if (minDistanceToEnemy === Infinity) {
            minDistanceToEnemy = 999;
        }
        
        // 找到距离最近敌军最远的军队
        if (minDistanceToEnemy > maxMinDistance) {
            maxMinDistance = minDistanceToEnemy;
            farthestArmy = seleucidArmy;
        }
    });
    
    // 解散该军队
    if (farthestArmy) {
        const cityName = cities.find(c => c.id === farthestArmy.location)?.name || '未知位置';
        const totalTroops = (farthestArmy.lightCavalry || 0) + 
                           (farthestArmy.heavyCavalry || 0) + 
                           (farthestArmy.heavyInfantry || 0) + 
                           (farthestArmy.lightInfantry || 0);
        
        addLog(`💰 【塞琉古财政危机】净收益${deficit}，无法维持军队`, 'seleucid');
        // addLog(`🗡️ 塞琉古AI决定解散 ${farthestArmy.commander} 的部队（位于${cityName}，${totalTroops}人，距敌军最远${maxMinDistance}步）`, 'seleucid');
        
        // 从军队列表中移除
        const index = armies.seleucid.findIndex(a => a.id === farthestArmy.id);
        if (index !== -1) {
            armies.seleucid.splice(index, 1);
        }
        
        // 更新地图显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
    }
}

// 处理托勒密财政危机时的自动解散
function handlePtolemyDeficitDisbanding(deficit) {
    let farthestArmy = null;
    let maxMinDistance = -1;
    if (armies.ptolemy.length === 0) return;
    
    // 如果只有一支军队（主将），不解散
    if (armies.ptolemy.length <= 1) {
        addLog(`💰 【托勒密财政危机】净收益${deficit}，但只剩主将，无法解散`, 'ptolemy');
        return;
    }
    // 遍历托勒密所有军队，找到距离敌军最远的军队
    armies.ptolemy.forEach(ptolemyArmy => {
        let minDistanceToEnemy = Infinity;
        
        // 计算该军队到所有敌军的最小距离
        getAllArmies().forEach(enemyArmy => {
            if (enemyArmy.faction !== 'ptolemy') {
                // 使用AI控制器的距离计算函数
                const distance = typeof PtolemyAIController !== 'undefined' && PtolemyAIController.calculateDistance
                    ? PtolemyAIController.calculateDistance(ptolemyArmy.location, enemyArmy.location)
                    : (ptolemyArmy.location === enemyArmy.location ? 0 : 1);
                if (distance < minDistanceToEnemy) {
                    minDistanceToEnemy = distance;
                }
            }
        });
        
        // 如果没有敌军，距离设为一个很大的值
        if (minDistanceToEnemy === Infinity) {
            minDistanceToEnemy = 999;
        }
        
        // 找到距离最近敌军最远的军队
        if (minDistanceToEnemy > maxMinDistance) {
            maxMinDistance = minDistanceToEnemy;
            farthestArmy = ptolemyArmy;
        }
    });
    
    // 解散该军队
    if (farthestArmy) {
        const cityName = cities.find(c => c.id === farthestArmy.location)?.name || '未知位置';
        const totalTroops = (farthestArmy.lightCavalry || 0) + 
                           (farthestArmy.heavyCavalry || 0) + 
                           (farthestArmy.heavyInfantry || 0) + 
                           (farthestArmy.lightInfantry || 0);
        
        addLog(`💰 【托勒密财政危机】净收益${deficit}，无法维持军队`, 'ptolemy');
        // addLog(`🗡️ 托勒密AI决定解散 ${farthestArmy.commander} 的部队（位于${cityName}，${totalTroops}人，距敌军最远${maxMinDistance}步）`, 'ptolemy');
        
        // 从军队列表中移除
        const index = armies.ptolemy.findIndex(a => a.id === farthestArmy.id);
        if (index !== -1) {
            armies.ptolemy.splice(index, 1);
        }
        
        // 更新地图显示
        generateMap();
        drawRoutes();
        absoluteFix();
        placeArmies();
    }
}

// 处理被围攻城市中军队的士气惩罚
function handleSiegedArmiesMoralePenalty() {
    let romeAffectedArmies = [];
    let carthageAffectedArmies = [];
    let macedoniaAffectedArmies = [];
    let seleucidAffectedArmies = [];
    let ptolemyAffectedArmies = [];
    
    // 检查所有被围攻的城市
    cities.forEach(city => {
        if (city.isUnderSiege && city.besiegingFaction) {
            // 检查该城市是否有己方军队
            const armiesAtCity = CityArmyManager.getArmiesAtCity(city.id);
            
            armiesAtCity.forEach(armyInfo => {
                // 如果军队阵营与城市阵营相同，且城市被敌方围攻
                if (armyInfo.faction === city.faction && city.besiegingFaction !== city.faction) {
                    const army = armies[armyInfo.faction].find(a => a.id === armyInfo.id);
                    if (army) {
                        const oldMorale = army.morale;
                        army.morale = Math.max(1, army.morale - 0.5);
                        
                        if (armyInfo.faction === 'rome') {
                            romeAffectedArmies.push(`${army.commander}(${city.name})`);
                        } else if (armyInfo.faction === 'carthage') {
                            carthageAffectedArmies.push(`${army.commander}(${city.name})`);
                        } else if (armyInfo.faction === 'macedonia') {
                            macedoniaAffectedArmies.push(`${army.commander}(${city.name})`);
                        } else if (armyInfo.faction === 'seleucid') {
                            seleucidAffectedArmies.push(`${army.commander}(${city.name})`);
                        } else if (armyInfo.faction === 'ptolemy') {
                            ptolemyAffectedArmies.push(`${army.commander}(${city.name})`);
                        }
                    }
                }
            });
        }
    });
    
    // 记录日志
    if (romeAffectedArmies.length > 0) {
        addLog(`罗马军队在被围攻城市中士气-0.5：${romeAffectedArmies.join(', ')}`, 'rome');
    }
    if (carthageAffectedArmies.length > 0) {
        addLog(`迦太基军队在被围攻城市中士气-0.5：${carthageAffectedArmies.join(', ')}`, 'carthage');
    }
    if (macedoniaAffectedArmies.length > 0) {
        addLog(`马其顿军队在被围攻城市中士气-0.5：${macedoniaAffectedArmies.join(', ')}`, 'macedonia');
    }
    if (seleucidAffectedArmies.length > 0) {
        addLog(`塞琉古军队在被围攻城市中士气-0.5：${seleucidAffectedArmies.join(', ')}`, 'seleucid');
    }
    if (ptolemyAffectedArmies.length > 0) {
        addLog(`托勒密军队在被围攻城市中士气-0.5：${ptolemyAffectedArmies.join(', ')}`, 'ptolemy');
    }
}

// 更新资金显示
function updateFactionFunds() {
    document.getElementById('romeFunds').textContent = gameState.romeFunds;
    document.getElementById('carthageFunds').textContent = gameState.carthageFunds;
    document.getElementById('macedoniaFunds').textContent = gameState.macedoniaFunds;
    document.getElementById('seleucidFunds').textContent = gameState.seleucidFunds;
    document.getElementById('ptolemyFunds').textContent = gameState.ptolemyFunds;
    document.getElementById('romeDebt').textContent = gameState.romeDebt;
    document.getElementById('carthageDebt').textContent = gameState.carthageDebt;
    document.getElementById('macedoniaDebt').textContent = gameState.macedoniaDebt;
    document.getElementById('seleucidDebt').textContent = gameState.seleucidDebt;
    document.getElementById('ptolemyDebt').textContent = gameState.ptolemyDebt;
}

// 计算阵营分数
function calculateFactionScores() {
    const scores = {
        rome: { political: 0, economic: 0, total: 0 },
        carthage: { political: 0, economic: 0, total: 0 },
        macedonia: { political: 0, economic: 0, total: 0 },
        seleucid: { political: 0, economic: 0, total: 0 },
        ptolemy: { political: 0, economic: 0, total: 0 }
    };
    
    cities.forEach(city => {
        if (city.faction === 'rome') {
            scores.rome.political += city.politicalScore || 0;
            scores.rome.economic += city.economicScore || 0;
        } else if (city.faction === 'carthage') {
            scores.carthage.political += city.politicalScore || 0;
            scores.carthage.economic += city.economicScore || 0;
        } else if (city.faction === 'macedonia') {
            scores.macedonia.political += city.politicalScore || 0;
            scores.macedonia.economic += city.economicScore || 0;
        } else if (city.faction === 'seleucid') {
            scores.seleucid.political += city.politicalScore || 0;
            scores.seleucid.economic += city.economicScore || 0;
        } else if (city.faction === 'ptolemy') {
            scores.ptolemy.political += city.politicalScore || 0;
            scores.ptolemy.economic += city.economicScore || 0;
        }
    });
    
    scores.rome.total = scores.rome.political + scores.rome.economic;
    scores.carthage.total = scores.carthage.political + scores.carthage.economic;
    scores.macedonia.total = scores.macedonia.political + scores.macedonia.economic;
    scores.seleucid.total = scores.seleucid.political + scores.seleucid.economic;
    scores.ptolemy.total = scores.ptolemy.political + scores.ptolemy.economic;
    
    return scores;
}

// 计算单个阵营的总分
function calculateFactionScore(faction) {
    let political = 0;
    let economic = 0;
    
    cities.forEach(city => {
        if (city.faction === faction) {
            political += city.politicalScore || 0;
            economic += city.economicScore || 0;
        }
    });
    
    return political + economic;
}

// 更新阵营分数显示
function updateFactionScores() {
    const scores = calculateFactionScores();
    
    // 更新罗马分数
    document.getElementById('romePoliticalScore').textContent = scores.rome.political;
    document.getElementById('romeEconomicScore').textContent = scores.rome.economic;
    document.getElementById('romeTotalScore').textContent = scores.rome.total;
    document.getElementById('romeLastExpense').textContent = gameState.romeLastTurnExpense;
    
    // 更新迦太基分数
    document.getElementById('carthagePoliticalScore').textContent = scores.carthage.political;
    document.getElementById('carthageEconomicScore').textContent = scores.carthage.economic;
    document.getElementById('carthageTotalScore').textContent = scores.carthage.total;
    document.getElementById('carthageLastExpense').textContent = gameState.carthageLastTurnExpense;
    
    // 更新马其顿分数（不包含政治分）
    document.getElementById('macedoniaEconomicScore').textContent = scores.macedonia.economic;
    document.getElementById('macedoniaTotalScore').textContent = scores.macedonia.total;
    document.getElementById('macedoniaLastExpense').textContent = gameState.macedoniaLastTurnExpense;
    
    // 更新塞琉古分数（不包含政治分）
    document.getElementById('seleucidEconomicScore').textContent = scores.seleucid.economic;
    document.getElementById('seleucidTotalScore').textContent = scores.seleucid.total;
    document.getElementById('seleucidLastExpense').textContent = gameState.seleucidLastTurnExpense;
    
    // 更新托勒密分数（不包含政治分）
    document.getElementById('ptolemyEconomicScore').textContent = scores.ptolemy.economic;
    document.getElementById('ptolemyTotalScore').textContent = scores.ptolemy.total;
    document.getElementById('ptolemyLastExpense').textContent = gameState.ptolemyLastTurnExpense;
    
    // 更新优势指示
    const dominanceElement = document.getElementById('dominanceIndicator');
    const totalDiff = scores.rome.total - scores.carthage.total;
    
    dominanceElement.className = 'dominance-indicator';
    
    if (totalDiff > 5) {
        dominanceElement.textContent = `罗马优势 (+${totalDiff})`;
        dominanceElement.classList.add('rome-dominance');
    } else if (totalDiff < -5) {
        dominanceElement.textContent = `迦太基优势(+${Math.abs(totalDiff)})`;
        dominanceElement.classList.add('carthage-dominance');
    } else if (Math.abs(totalDiff) > 2) {
        dominanceElement.textContent = `${totalDiff > 0 ? '罗马' : '迦太基'}小幅领先 (+${Math.abs(totalDiff)})`;
        dominanceElement.classList.add('balanced');
    } else {
        dominanceElement.textContent = '势均力敌';
    }
}

// 更新UI
function updateUI() {
    // 更新时间显示
    document.getElementById('timeDisplay').textContent = TimeSystem.getFullTimeDisplay();
    let playerName = '未知';
    if (gameState.currentPlayer === 'rome') {
        playerName = '罗马';
    } else if (gameState.currentPlayer === 'carthage') {
        playerName = '迦太基';
    } else if (gameState.currentPlayer === 'macedonia') {
        playerName = '马其顿';
    } else if (gameState.currentPlayer === 'seleucid') {
        playerName = '塞琉古';
    } else if (gameState.currentPlayer === 'ptolemy') {
        playerName = '托勒密';
    }
    document.getElementById('turnDisplay').textContent = `回合 ${gameState.currentTurn} - ${playerName}回合`;
    document.getElementById('warDuration').textContent = `战争进行: ${TimeSystem.getWarDuration()}`;
    
    // 更新阵营分数
    updateFactionScores();
    
    // 更新资金显示
    updateFactionFunds();
    
    // 更新联盟状态显示
    updateAllianceStatusUI();
    
    // 重绘军队标记
    placeArmies();
}

/**
 * 更新马其顿和塞琉古联盟状态显示
 */
function updateAllianceStatusUI() {
    // 更新马其顿联盟状态
    if (typeof MacedoniaAIController !== 'undefined') {
        const macedoniaAlliance = MacedoniaAIController.config.alliance;
        const macedoniaStatusElement = document.getElementById('macedoniaAllianceStatus');
        const macedoniaTextElement = document.getElementById('macedoniaAllianceText');
        
        if (macedoniaStatusElement && macedoniaTextElement) {
            // 移除所有联盟类
            macedoniaStatusElement.classList.remove('allied-rome', 'allied-carthage', 'neutral');
            
            if (macedoniaAlliance === 'rome') {
                macedoniaStatusElement.classList.add('allied-rome');
                macedoniaTextElement.textContent = '罗马结盟';
                macedoniaTextElement.style.color = '#ff6b6b';
                macedoniaTextElement.style.fontSize = '8px';
            } else if (macedoniaAlliance === 'carthage') {
                macedoniaStatusElement.classList.add('allied-carthage');
                macedoniaTextElement.textContent = '迦太基盟';
                macedoniaTextElement.style.color = '#a56cc1';
                macedoniaTextElement.style.fontSize = '8px';
            } else {
                macedoniaStatusElement.classList.add('neutral');
                macedoniaTextElement.textContent = '保持中立';
                macedoniaTextElement.style.color = '#4ecdc4';
                macedoniaTextElement.style.fontSize = '8px';
            }
        }
    }
    
    // 更新塞琉古联盟状态
    if (typeof SeleucidAIController !== 'undefined') {
        const seleucidAlliance = SeleucidAIController.config.alliance;
        const seleucidStatusElement = document.getElementById('seleucidAllianceStatus');
        const seleucidTextElement = document.getElementById('seleucidAllianceText');
        
        if (seleucidStatusElement && seleucidTextElement) {
            // 移除所有联盟类
            seleucidStatusElement.classList.remove('allied-rome', 'allied-carthage', 'neutral');
            
            if (seleucidAlliance === 'rome') {
                seleucidStatusElement.classList.add('allied-rome');
                seleucidTextElement.textContent = '罗马结盟';
                seleucidTextElement.style.color = '#ff6b6b';
                seleucidTextElement.style.fontSize = '8px';
            } else if (seleucidAlliance === 'carthage') {
                seleucidStatusElement.classList.add('allied-carthage');
                seleucidTextElement.textContent = '迦太基盟';
                seleucidTextElement.style.color = '#a56cc1';
                seleucidTextElement.style.fontSize = '8px';
            } else {
                seleucidStatusElement.classList.add('neutral');
                seleucidTextElement.textContent = '保持中立';
                seleucidTextElement.style.color = '#4ecdc4';
                seleucidTextElement.style.fontSize = '8px';
            }
        }
    }
    
    // 更新托勒密联盟状态
    if (typeof PtolemyAIController !== 'undefined') {
        const ptolemyAlliance = PtolemyAIController.config.alliance;
        const ptolemyStatusElement = document.getElementById('ptolemyAllianceStatus');
        const ptolemyTextElement = document.getElementById('ptolemyAllianceText');
        
        if (ptolemyStatusElement && ptolemyTextElement) {
            // 移除所有联盟类
            ptolemyStatusElement.classList.remove('allied-rome', 'allied-carthage', 'neutral');
            
            if (ptolemyAlliance === 'rome') {
                ptolemyStatusElement.classList.add('allied-rome');
                ptolemyTextElement.textContent = '罗马结盟';
                ptolemyTextElement.style.color = '#ff6b6b';
                ptolemyTextElement.style.fontSize = '8px';
            } else if (ptolemyAlliance === 'carthage') {
                ptolemyStatusElement.classList.add('allied-carthage');
                ptolemyTextElement.textContent = '迦太基盟';
                ptolemyTextElement.style.color = '#a56cc1';
                ptolemyTextElement.style.fontSize = '8px';
            } else {
                ptolemyStatusElement.classList.add('neutral');
                ptolemyTextElement.textContent = '保持中立';
                ptolemyTextElement.style.color = '#4ecdc4';
                ptolemyTextElement.style.fontSize = '8px';
            }
        }
    }
}

// 添加日志
function addLog(message, player = null) {
    const gameLog = document.getElementById('gameLog');
    
    // 检查日志是否暂停
    if (window.gameLogPaused) {
        // 如果暂停，将日志缓存起来
        if (!window.pausedLogBuffer) {
            window.pausedLogBuffer = [];
        }
        window.pausedLogBuffer.push({ message, player });
        return;
    }
    
    const logEntry = document.createElement('div');
    
    // 处理特殊的日志类
    if (player === 'error') {
        logEntry.className = 'log-entry error';
    } else if (player === 'system') {
        logEntry.className = 'log-entry system';
    } else if (player === 'historical') {
        logEntry.className = 'log-entry historical-event';
    } else {
        logEntry.className = `log-entry${player ? ' ' + player : ''}`;
    }
    
    logEntry.textContent = message;
    gameLog.appendChild(logEntry);
    
    // 只在未暂停时自动滚动
    if (!window.gameLogPaused) {
        gameLog.scrollTop = gameLog.scrollHeight;
    }
}

// 动态指挥官系统
class CommanderSystem {
    static romanCommanderData = null;
    static carthageCommanderData = null;
    
    // 内嵌的罗马CSV数据
    static romanCsvData = `阵营,时间,姓名,历史重大事件,军事,政治,外交
罗马,BC218,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",汉尼拔翻越阿尔卑斯山；提契诺战役 & 特拉比亚战役,8,9,8
,,"提比略·森普罗尼乌斯·隆古斯
(Tiberius Sempronius Longus)",,7,8,7
,BC217,"盖乌斯·弗拉米尼乌斯(Gaius Flaminius)",弗拉米尼乌斯殁于特拉西梅诺湖惨败；随后任命费边·马克西姆斯为独裁官,7,8,8
,,"格奈乌斯·塞尔维利乌斯·格米努斯
(Gnaeus Servilius Geminus)",,7,8,8
,,"昆图斯·法比乌斯·马克西穆斯
(Q. Fabius Maximus)",,9,8,9
,BC216,"卢基乌斯·埃米利乌斯·保卢斯
(Lucius Aemilius Paullus)",坎尼会战万罗马军覆灭，保卢斯战死6,8,8
,,"盖乌斯·特伦提乌斯·瓦罗
(Gaius Terentius Varro)",,7,8,8
,BC215,"提比略·森普罗尼乌斯·格拉古
(Ti. Sempronius Gracchus) ",元老院任命三人执政团稳定局7,8,8
,,"马尔库斯·克劳狄乌斯·马尔凯鲁斯
(M. Claudius Marcellus)",,7,8,8
,BC214,"昆图斯·法比乌斯·马克西穆斯
(Q. Fabius Maximus)",围攻叙拉古古古（阿基米德之死9,8,9
,,"马尔库斯·克劳狄乌斯·马尔凯鲁斯
(M. Claudius Marcellus)",,7,8,8
,BC213,"提比略·森普罗尼乌斯·格拉古
(Ti. Sempronius Gracchus) ",格拉古在卢卡尼亚战死,7,8,8
,,"昆图斯·富尔维乌斯·弗拉库斯
(Q. Fulvius Flaccus)",,7,8,8
,BC212,"昆图斯·富尔维乌斯·弗拉库斯
(Q. Fulvius Flaccus)",汉尼拔攻陷卡普阿,7,7,8
,,"阿庇乌斯·克劳狄乌斯·普尔喀
(Appius Claudius Pulcher)",,7,8,8
,BC211,"普布利乌斯·苏尔皮基乌斯·加尔巴
(P. Sulpicius Galba)",汉尼拔兵临罗马城7,8,8
,,"格奈乌斯·富尔维乌斯·森图马卢斯
(Cn. Fulvius Centumalus)",,7,8,7
,BC210,"马尔库斯·瓦莱里乌斯·莱维努斯(M. Valerius Laevinus)",年轻的大西庇阿赴西班牙7,8,8
,,"马尔库斯·克劳狄乌斯·马尔凯鲁斯
(M. Claudius Marcellus)",,7,8,8
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC209,"昆图斯·法比乌斯·马克西穆斯
(Q. Fabius Maximus)",汉尼拔攻占他林敦（塔伦图姆）,7,8,8
,,"昆图斯·富尔维乌斯·弗拉库斯
(Q. Fulvius Flaccus)",,7,8,8
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC208,"马尔库斯·克劳狄乌斯·马尔凯鲁斯
(M. Claudius Marcellus)",马尔凯鲁斯在伏击战中阵亡,7,7,7
,,"提图斯·昆克提乌斯·克里斯皮努斯
(T. Quinctius Crispinus)",,7,8,8
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC207,"盖乌斯·克劳狄乌斯·尼禄
(Gaius Claudius Nero)",梅陶罗战役（歼灭哈斯德鲁巴军队）,7,7,7
,,"马尔库斯·利维乌斯·萨利纳托(Marcus Livius Salinator)",,7,8,8
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC206,"卢基乌斯·维提乌斯·菲洛
(L. Veturius Philo)",大西庇阿在伊利帕战役决胜,7,8,8
,,"昆图斯·凯基利乌斯·梅特卢斯
(Q. Caecilius Metellus)",,7,7,8
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC205,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",筹划入侵北非,7,7,8
,,"普布利乌斯·利基尼乌斯·克拉苏(P. Licinius Crassus)",,7,8,8
,BC204,"马尔库斯·科尔内利乌斯·凯特古斯
(M. Cornelius Cethegus)",西庇阿登陆乌提卡,7,8,8
,,"普布利乌斯·森普罗尼乌斯·图狄塔努斯
(P. Sempronius Tuditanus)",,7,8,7
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC203,"格奈乌斯·塞尔维利乌斯·格庇(Gn. Servilius Caepio)",召回汉尼拔回援迦太基,7,8,8
,,"盖乌斯·塞尔维利乌斯·格米努斯(C. Servilius Geminus)",,7,7,7
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8
,BC202,"马尔库斯·塞尔维利乌斯·普利克斯
(M. Servilius Pulex Geminus)",扎马战役（西庇阿击败汉尼拔）,7,8,8
,,"提比略·克劳狄乌斯·尼禄
(Ti. Claudius Nero)",,7,7,8
,,"普布利乌斯·科尔内利乌斯·西庇阿
(Publius Cornelius Scipio)",,10,8,8`;

    // 内嵌的迦太基CSV数据
    static carthageCsvData = `阵营,时间,姓名,历史重大事件,军事,政治,外交
迦太基,BC218-BC201,汉尼拔·巴卡,"BC217 特拉西梅诺湖战役，BC216 坎尼会战，BC207 梅陶罗战役，BC202 扎马战役",10,8,7
,,马戈·巴卡,,8,8,8
,,哈斯德鲁巴·巴卡,,9,9,8
,,西斯法克,,7,7,7
,,马哈巴尔,,8,7,7
,,大汉诺,,8,7,7`;
    
    // 加载指挥官数据
    static loadCommanderData() {
        try {
            this.romanCommanderData = this.parseCSV(this.romanCsvData, 'rome');
            this.carthageCommanderData = this.parseCSV(this.carthageCsvData, 'carthage');
            console.log('罗马指挥官数据已加载:', this.romanCommanderData);
            console.log('迦太基指挥官数据已加载', this.carthageCommanderData);
            console.log('迦太基指挥官数量:', this.carthageCommanderData.length);
            return true;
        } catch (error) {
            console.error('加载指挥官数据失败', error);
            return false;
        }
    }
    
    // 解析CSV数据
    static parseCSV(csvText, faction) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const commanders = [];
        
        for (let i = 1; i < lines.length; i++) { // 跳过标题
            const line = lines[i].trim();
            if (!line) continue;
            
            // 处理跨行的指挥官名称
            let fullLine = line;
            let nextIndex = i + 1;
            
            // 检查是否有跨行的名称（以中文开头但没有时间信息
            while (nextIndex < lines.length) {
                const nextLine = lines[nextIndex].trim();
                if (nextLine && !nextLine.includes('BC') && !nextLine.startsWith(',BC')) {
                    fullLine += ' ' + nextLine;
                    i = nextIndex; // 跳过已处理的
                    nextIndex++;
                } else {
                    break;
                }
            }
            
            const parts = this.parseCSVLine(fullLine);
            if (parts.length >= 6) {
                const csvFaction = parts[0];
                const year = parts[1];
                const name = parts[2];
                const event = parts[3];
                const military = parseInt(parts[4]) || 0;
                const political = parseInt(parts[5]) || 0;
                const diplomatic = parseInt(parts[6]) || 0;
                
                // 根据阵营参数判断
                if (faction === 'rome' && (csvFaction === '罗马' || csvFaction === '')) {
                    // 罗马指挥官按年份分组
                    commanders.push({
                        year: year,
                        name: name.trim(),
                        event: event,
                        military: military,
                        political: political,
                        diplomatic: diplomatic
                    });
                } else if (faction === 'carthage' && (csvFaction === '迦太基' || csvFaction === '')) {
                    // 迦太基指挥官整个战争期间都存在
                    console.log('解析迦太基指挥官:', name.trim(), '军事:', military, '政治:', political, '外交:', diplomatic);
                    commanders.push({
                        name: name.trim(),
                        event: event,
                        military: military,
                        political: political,
                        diplomatic: diplomatic,
                        timeRange: year || 'BC218-BC201' // 整个战争期间
                    });
                }
            }
        }
        
        return commanders;
    }
    
    // 解析CSV行（处理包含逗号的引号字段）
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }
    
    // 获取指定年份的指挥官
    static getCommandersForYear(year, faction = 'rome') {
        if (faction === 'rome') {
            if (!this.romanCommanderData) return [];
            const yearStr = `BC${Math.abs(year)}`;
            return this.romanCommanderData.filter(commander => commander.year === yearStr);
        } else if (faction === 'carthage') {
            if (!this.carthageCommanderData) {
                console.log('迦太基指挥官数据为空');
                return [];
            }
            console.log('迦太基指挥官原始数据:', this.carthageCommanderData);
            // 迦太基指挥官在整个战争期间都可用
            return this.carthageCommanderData.slice(); // 返回副本
        }
        return [];
    }
    
    // 更新当前年份的罗马军队
    static updateRomanLegions(year, savedPositions = {}) {
        const commanders = this.getCommandersForYear(year, 'rome');
        if (commanders.length === 0) return false;
        
        // 保留所有现有军队，只更新指挥官数据
        commanders.forEach((commander, index) => {
            const armyId = `rome_${index + 1}`;
            const existingArmy = armies.rome.find(army => army.id === armyId);
            
            if (existingArmy) {
                // 军队已存在，只更新指挥官的名字和能力数据
                existingArmy.commander = commander.name;
                existingArmy.military = commander.military;
                existingArmy.political = commander.political;
                existingArmy.diplomatic = commander.diplomatic;
                existingArmy.event = commander.event;
                console.log(`✅ 更新执政官 ${armyId}: ${commander.name}，保留军队数据`);
            } else {
                // 新增军队
                let location;
                let troopData = {
                    lightCavalry: 2000,
                    heavyCavalry: 1000,
                    heavyInfantry: 20000,
                    lightInfantry: 2000,
                    morale: 5
                };
                
                // 如果有保存的位置信息，使用保存的位置和兵种数据
                if (savedPositions[armyId]) {
                    location = savedPositions[armyId].location;
                    troopData = {
                        lightCavalry: savedPositions[armyId].lightCavalry || 2000,
                        heavyCavalry: savedPositions[armyId].heavyCavalry || 1000,
                        heavyInfantry: savedPositions[armyId].heavyInfantry || 20000,
                        lightInfantry: savedPositions[armyId].lightInfantry || 2000,
                        morale: savedPositions[armyId].morale || 5
                    };
                } else {
                    // 第三支部队（如果存在）部署在罗马
                    if (index === 2) {
                        location = 'rome';
                    } else {
                        // 前两支部队部署在传统位置
                        location = index === 0 ? 'rome' : 'capua';
                    }
                }
                
                armies.rome.push({
                    id: armyId,
                    commander: commander.name,
                    military: commander.military,
                    political: commander.political,
                    diplomatic: commander.diplomatic,
                    faction: 'rome',
                    location: location,
                    event: commander.event,
                    troops: toRomanNumeral(index + 1),
                    lightCavalry: troopData.lightCavalry,
                    heavyCavalry: troopData.heavyCavalry,
                    heavyInfantry: troopData.heavyInfantry,
                    lightInfantry: troopData.lightInfantry,
                    morale: troopData.morale
                });
                console.log(`🆕 新增军队 ${armyId}: ${commander.name}`);
            }
        });
        
        // 更新额外的罗马军队（第四支）- 指挥官按年份变化
        if (commanders.length > 0) {
            const extraCommanderName = this.getExtraRomanCommander(year);
            const extraArmyId = 'rome_extra_1';
            const existingExtraArmy = armies.rome.find(army => army.id === extraArmyId);
            
            if (existingExtraArmy) {
                // 军队已存在，只更新指挥官名字
                existingExtraArmy.commander = extraCommanderName;
                console.log(`✅ 更新额外军队 ${extraArmyId}: ${extraCommanderName}，保留军队数据`);
            } else {
                // 新增额外军队
                let extraLocation = 'brundisium';
                let extraTroopData = {
                    lightCavalry: 2000,
                    heavyCavalry: 1000,
                    heavyInfantry: 20000,
                    lightInfantry: 2000,
                    morale: 5
                };
                
                // 如果有保存的位置信息，使用保存的位置和兵种数据
                if (savedPositions[extraArmyId]) {
                    extraLocation = savedPositions[extraArmyId].location;
                    extraTroopData = {
                        lightCavalry: savedPositions[extraArmyId].lightCavalry || 2000,
                        heavyCavalry: savedPositions[extraArmyId].heavyCavalry || 1000,
                        heavyInfantry: savedPositions[extraArmyId].heavyInfantry || 20000,
                        lightInfantry: savedPositions[extraArmyId].lightInfantry || 2000,
                        morale: savedPositions[extraArmyId].morale || 5
                    };
                }
                
                armies.rome.push({
                    id: extraArmyId,
                    commander: extraCommanderName,
                    military: 6,
                    political: 7,
                    diplomatic: 6,
                    faction: 'rome',
                    location: extraLocation,
                    event: '南意大利防务',
                    troops: toRomanNumeral(commanders.length + 1),
                    lightCavalry: extraTroopData.lightCavalry,
                    heavyCavalry: extraTroopData.heavyCavalry,
                    heavyInfantry: extraTroopData.heavyInfantry,
                    lightInfantry: extraTroopData.lightInfantry,
                    morale: extraTroopData.morale
                });
                console.log(`🆕 新增额外军队 ${extraArmyId}: ${extraCommanderName}`);
            }
        }
        
        
        // 记录历史事件
        if (commanders[0] && commanders[0].event) {
            addLog(`历史事件：${commanders[0].event}`, 'historical');
        }
        
        console.log(`${year}年罗马军团已更新:`, armies.rome);
        return true;
    }
    
    // 更新迦太基军队
    static updateCarthageLegions(savedPositions = {}) {
        const commanders = this.getCommandersForYear(gameState.currentYear, 'carthage');
        console.log('迦太基指挥官数据:', commanders);
        if (commanders.length === 0) {
            console.log('没有找到迦太基指挥官数据');
            return false;
        }
        
        // 保留所有现有军队，只更新指挥官数据
        commanders.forEach((commander, index) => {
            const armyId = `carthage_${index + 1}`;
            const existingArmy = armies.carthage.find(army => army.id === armyId);
            
            if (existingArmy) {
                // 军队已存在，只更新指挥官的名字和能力数据
                existingArmy.commander = commander.name;
                existingArmy.military = commander.military;
                existingArmy.political = commander.political;
                existingArmy.diplomatic = commander.diplomatic;
                existingArmy.event = commander.event;
                console.log(`✅ 更新迦太基指挥官 ${armyId}: ${commander.name}，保留军队数据`);
            } else {
                // 新增军队
                let location;
                let troopData = {
                    lightCavalry: 2000,
                    heavyCavalry: 1000,
                    heavyInfantry: 20000,
                    lightInfantry: 2000,
                    morale: 5
                };
                
                // 如果有保存的位置信息，使用保存的位置和兵种数据
                if (savedPositions[armyId]) {
                    location = savedPositions[armyId].location;
                    troopData = {
                        lightCavalry: savedPositions[armyId].lightCavalry || 2000,
                        heavyCavalry: savedPositions[armyId].heavyCavalry || 1000,
                        heavyInfantry: savedPositions[armyId].heavyInfantry || 20000,
                        lightInfantry: savedPositions[armyId].lightInfantry || 2000,
                        morale: savedPositions[armyId].morale || 5
                    };
                } else {
                    // 汉尼拔开始在新迦太基，其他将领在迦太基本
                    if (commander.name.includes('汉尼拔')) {
                        location = 'newcarthage';
                    } else if (commander.name.includes('哈斯德鲁巴')) {
                        location = 'carthage';
                    } else {
                        location = index === 0 ? 'newcarthage' : 'carthage';
                    }
                }
                
                armies.carthage.push({
                    id: armyId,
                    commander: commander.name,
                    military: commander.military,
                    political: commander.political,
                    diplomatic: commander.diplomatic,
                    faction: 'carthage',
                    location: location,
                    event: commander.event,
                    troops: toRomanNumeral(index + 1),
                    lightCavalry: troopData.lightCavalry,
                    heavyCavalry: troopData.heavyCavalry,
                    heavyInfantry: troopData.heavyInfantry,
                    lightInfantry: troopData.lightInfantry,
                    morale: troopData.morale
                });
                console.log(`🆕 新增迦太基军队 ${armyId}: ${commander.name}`);
            }
        });
        
        // 更新额外的迦太基军队
        const extraArmyId = 'carthage_extra_1';
        const existingExtraArmy = armies.carthage.find(army => army.id === extraArmyId);
        
        if (existingExtraArmy) {
            // 军队已存在，保持不变（哈斯德鲁巴·巴卡不会变）
            console.log(`✅ 保留迦太基额外军队 ${extraArmyId}: ${existingExtraArmy.commander}`);
        } else {
            // 新增额外军队
            let extraLocation = 'corduba';
            let extraTroopData = {
                lightCavalry: 2000,
                heavyCavalry: 1000,
                heavyInfantry: 20000,
                lightInfantry: 2000,
                morale: 5
            };
            
            // 如果有保存的位置信息，使用保存的位置和兵种数据
            if (savedPositions[extraArmyId]) {
                extraLocation = savedPositions[extraArmyId].location;
                extraTroopData = {
                    lightCavalry: savedPositions[extraArmyId].lightCavalry || 2000,
                    heavyCavalry: savedPositions[extraArmyId].heavyCavalry || 1000,
                    heavyInfantry: savedPositions[extraArmyId].heavyInfantry || 20000,
                    lightInfantry: savedPositions[extraArmyId].lightInfantry || 2000,
                    morale: savedPositions[extraArmyId].morale || 5
                };
            }
            
            armies.carthage.push({
                id: extraArmyId,
                commander: '哈斯德鲁巴·巴卡',
                military: 9,
                political: 8,
                diplomatic: 7,
                faction: 'carthage',
                location: extraLocation,
                event: '伊比利亚银矿防务',
                troops: toRomanNumeral(commanders.length + 1),
                lightCavalry: extraTroopData.lightCavalry,
                heavyCavalry: extraTroopData.heavyCavalry,
                heavyInfantry: extraTroopData.heavyInfantry,
                lightInfantry: extraTroopData.lightInfantry,
                morale: extraTroopData.morale
            });
            console.log(`🆕 新增迦太基额外军队 ${extraArmyId}: 哈斯德鲁巴·巴卡`);
        }
        
        
        console.log('迦太基军团已更新:', armies.carthage);
        return true;
    }
    
    // 获取额外的罗马指挥官（按年份变化）
    static getExtraRomanCommander(year) {
        const commandersByYear = {
            '-218': '马尔库斯·尤尼乌斯·布鲁图斯',
            '-217': '盖乌斯·塞尔维利乌斯·格米努斯',
            '-216': '马尔库斯·阿提利乌斯·雷古卢斯',
            '-215': '提图斯·马尼利乌斯·托尔夸图斯',
            '-214': '马尔库斯·瓦莱里乌斯·莱维努斯',
            '-213': '普布利乌斯·科尔内利乌斯·苏拉',
            '-212': '马尔库斯·尤尼乌斯·西拉努斯',
            '-211': '普布利乌斯·苏尔皮基乌斯·加尔巴·马克西穆斯',
            '-210': '马尔库斯·瓦莱里乌斯·马克西穆斯',
            '-209': '昆图斯·法比乌斯·马克西穆斯·维鲁科苏斯',
            '-208': '提图斯·昆克提乌斯·克里斯皮努斯',
            '-207': '马尔库斯·利维乌斯·德鲁苏斯',
            '-206': '卢基乌斯·维提乌斯·菲洛',
            '-205': '普布利乌斯·利基尼乌斯·瓦鲁斯',
            '-204': '马尔库斯·科尔内利乌斯·凯特古斯',
            '-203': '格奈乌斯·塞尔维利乌斯·凯皮奥',
            '-202': '马尔库斯·塞尔维利乌斯·普利克斯'
        };
        
        return commandersByYear[year.toString()] || '马尔库斯·尤尼乌斯·布鲁图斯';
    }
    
    // 获取当前年份的历史事件
    static getHistoricalEvents(year) {
        const romeCommanders = this.getCommandersForYear(year, 'rome');
        const carthageCommanders = this.getCommandersForYear(year, 'carthage');
        const allCommanders = [...romeCommanders, ...carthageCommanders];
        
        const events = allCommanders
            .filter(c => c.event && c.event.trim())
            .map(c => c.event);
        return [...new Set(events)]; // 去重
    }
}

// 时间系统功能
class TimeSystem {
    static monthNames = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    
    static seasonNames = {
        spring: '春季',
        summer: '夏季', 
        autumn: '秋季',
        winter: '冬季'
    };
    
    // 获取当前月份名称
    static getCurrentMonthName() {
        return this.monthNames[gameState.currentMonth - 1];
    }
    
    // 获取当前季节名称
    static getCurrentSeasonName() {
        return this.seasonNames[gameState.currentSeason];
    }
    
    // 获取年份显示（公元前/公元后）
    static getYearDisplay() {
        if (gameState.currentYear < 0) {
            return `公元前${Math.abs(gameState.currentYear)}年`;
        } else if (gameState.currentYear > 0) {
            return `公元${gameState.currentYear}年`;
        } else {
            return '公元1年'; // 没有公元0年
        }
    }
    
    // 获取完整时间显示
    static getFullTimeDisplay() {
        return `${this.getYearDisplay()} ${this.getCurrentMonthName()} (${this.getCurrentSeasonName()})`;
    }
    
    // 推进时间到下个月
    static advanceMonth() {
        gameState.currentMonth++;
        
        if (gameState.currentMonth > 12) {
            gameState.currentMonth = 1;
            const oldYear = gameState.currentYear;
            gameState.currentYear++;
            
            // 跳过公元0年
            if (gameState.currentYear === 0) {
                gameState.currentYear = 1;
            }
            
            // 年份变化时更新军队
            if (CommanderSystem.romanCommanderData && CommanderSystem.carthageCommanderData) {
                // 保存当前军队位置
                const currentRomePositions = {};
                const currentCarthagePositions = {};
                
                armies.rome.forEach(army => {
                    currentRomePositions[army.id] = {
                        location: army.location,
                        lightCavalry: army.lightCavalry,
                        heavyCavalry: army.heavyCavalry,
                        heavyInfantry: army.heavyInfantry,
                        lightInfantry: army.lightInfantry,
                        morale: army.morale
                    };
                });
                
                armies.carthage.forEach(army => {
                    currentCarthagePositions[army.id] = {
                        location: army.location,
                        lightCavalry: army.lightCavalry,
                        heavyCavalry: army.heavyCavalry,
                        heavyInfantry: army.heavyInfantry,
                        lightInfantry: army.lightInfantry,
                        morale: army.morale
                    };
                });
                
                const romeUpdated = CommanderSystem.updateRomanLegions(gameState.currentYear, currentRomePositions);
                const carthageUpdated = CommanderSystem.updateCarthageLegions(currentCarthagePositions);
                
                if (romeUpdated || carthageUpdated) {
                    // 重新生成地图并执行绝对坐标修复
                    generateMap();
                    drawRoutes();
                    absoluteFix();
                    placeArmies();
                    addLog(`进入${Math.abs(gameState.currentYear)}年，军团指挥官已更新`, 'system');
                }
            }
        }
        
        // 更新季节
        this.updateSeason();
    }
    
    // 更新当前季节
    static updateSeason() {
        if (gameState.currentMonth >= 3 && gameState.currentMonth <= 5) {
            gameState.currentSeason = 'spring';
        } else if (gameState.currentMonth >= 6 && gameState.currentMonth <= 8) {
            gameState.currentSeason = 'summer';
        } else if (gameState.currentMonth >= 9 && gameState.currentMonth <= 11) {
            gameState.currentSeason = 'autumn';
        } else {
            gameState.currentSeason = 'winter';
        }
    }
    
    // 获取战争进行的时长
    static getWarDuration() {
        const startDate = new Date(-218, 0); // 公元前218年
        const currentDate = new Date(gameState.currentYear, gameState.currentMonth - 1);
        
        let totalMonths = 0;
        if (gameState.currentYear < 0) {
            totalMonths = (Math.abs(gameState.startYear) - Math.abs(gameState.currentYear)) * 12 + (gameState.currentMonth - 1);
        } else {
            totalMonths = Math.abs(gameState.startYear) * 12 + (gameState.currentYear * 12) + (gameState.currentMonth - 1);
        }
        
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        
        if (years > 0) {
            return months > 0 ? `${years}年${months}个月` : `${years}年`;
        } else {
            return `${months}个月`;
        }
    }
    
    // 检查是否是特殊的历史事件
    static checkHistoricalEvents() {
        const events = [];
        
        // 从指挥官数据中获取历史事件（年度变化时）
        if (CommanderSystem.commanderData && gameState.currentMonth === 1) {
            const historicalEvents = CommanderSystem.getHistoricalEvents(gameState.currentYear);
            events.push(...historicalEvents);
        }
        
        // 添加一些特定月份的历史事件
        if (gameState.currentYear === -218 && gameState.currentMonth === 5) {
            events.push('汉尼拔围攻萨贡托');
        }
        if (gameState.currentYear === -218 && gameState.currentMonth === 11) {
            events.push('汉尼拔开始穿越阿尔卑斯山');
        }
        if (gameState.currentYear === -217 && gameState.currentMonth === 6) {
            events.push('特拉西美诺湖战役时期');
        }
        if (gameState.currentYear === -216 && gameState.currentMonth === 8) {
            events.push('坎尼会战时期');
        }
        if (gameState.currentYear === -202 && gameState.currentMonth === 10) {
            events.push('扎马会战时期');
        }
        
        return events;
    }
    
    // 获取年月显示（带年份和月份参数）
    static getYearMonthDisplay(year, month) {
        let yearDisplay;
        if (year < 0) {
            yearDisplay = `公元前${Math.abs(year)}年`;
        } else if (year > 0) {
            yearDisplay = `公元${year}年`;
        } else {
            yearDisplay = '公元1年'; // 没有公元0年
        }
        
        const monthName = this.monthNames[month - 1] || '一月';
        return `${yearDisplay}${monthName}`;
    }
}

// 胜利条件系统
class VictorySystem {
    // 检查胜利条件
    static checkVictoryConditions() {
        // 检查是否游戏已经结束
        if (gameState.gameEnded) {
            return;
        }
        
        const rome = cities.find(c => c.id === 'rome');
        const carthage = cities.find(c => c.id === 'carthage');
        const newcarthage = cities.find(c => c.id === 'newcarthage');
        const syracuse = cities.find(c => c.id === 'syracuse');
        const pella = cities.find(c => c.id === 'pella');
        
        // 罗马胜利条件：占领迦太基城、新迦太基城、叙拉古城
        if (carthage.faction === 'rome' && 
            newcarthage.faction === 'rome' && 
            syracuse.faction === 'rome') {
            this.showVictory('rome');
            return;
        }
        
        // 迦太基胜利条件：占领罗马城
        if (rome.faction === 'carthage') {
            this.showVictory('carthage');
            return;
        }
        
        // 马其顿胜利条件：占领罗马城和迦太基城
        if (rome.faction === 'macedonia' && carthage.faction === 'macedonia') {
            this.showVictory('macedonia');
            return;
        }
        
        // 塞琉古胜利条件：占领罗马城和迦太基城
        if (rome.faction === 'seleucid' && carthage.faction === 'seleucid') {
            this.showVictory('seleucid');
            return;
        }
        // 托勒密胜利条件：占领罗马城和迦太基城
        if (rome.faction === 'ptolemy' && carthage.faction === 'ptolemy') {
            this.showVictory('ptolemy');
            return;
        }
    }
    
    // 显示胜利弹窗
    static showVictory(winner) {
        console.log(`🏆 ${winner} 获得胜利！`);
        
        // 标记游戏已结束
        gameState.gameEnded = true;
        
        let winnerName = '未知';
        let winnerColor = '#95a5a6';
        if (winner === 'rome') {
            winnerName = '罗马共和国';
            winnerColor = '#e74c3c';
        } else if (winner === 'carthage') {
            winnerName = '迦太基';
            winnerColor = '#9b59b6';
        } else if (winner === 'macedonia') {
            winnerName = '马其顿王国';
            winnerColor = '#3498db';
        } else if (winner === 'seleucid') {
            winnerName = '塞琉古王国';
            winnerColor = '#16a085';
        } else if (winner === 'ptolemy') {
            winnerName = '托勒密王国';
            winnerColor = '#9575cd';
        }
        
        // 更新弹窗标题
        document.getElementById('victoryTitle').textContent = '🏆 胜利！';
        document.getElementById('victorySituation').textContent = `${winnerName}赢得了第二次布匿战争！`;
        
        // 更新胜利阵营显示
        const factionDiv = document.getElementById('victoryFaction');
        factionDiv.textContent = winnerName;
        factionDiv.style.color = winnerColor;
        
        // 更新胜利条件显示
        let conditions = '';
        if (winner === 'rome') {
            conditions = `
                ✓ 占领迦太基城<br>
                ✓ 占领新迦太基城<br>
                ✓ 占领叙拉古城
            `;
        } else if (winner === 'carthage') {
            conditions = '✓ 占领罗马城';
        } else if (winner === 'macedonia') {
            conditions = `
                ✓ 占领罗马城<br>
                ✓ 占领迦太基城
            `;
        } else if (winner === 'seleucid') {
            conditions = `
                ✓ 占领罗马城<br>
                ✓ 占领迦太基城
            `;
        }
        else if (winner === 'ptolemy') {
            conditions = `
                ✓ 占领罗马城<br>
                ✓ 占领迦太基城
            `;
        }
        document.getElementById('victoryConditions').innerHTML = conditions;
        
        // 计算战争统计
        const startYear = Math.abs(gameState.startYear);
        const endYear = Math.abs(gameState.currentYear);
        const warYears = startYear - endYear;
        const warDuration = TimeSystem.getYearMonthDisplay(gameState.currentYear, gameState.currentMonth);
        
        // 计算最终得分
        const romeScore = calculateFactionScore('rome');
        const carthageScore = calculateFactionScore('carthage');
        const macedoniaScore = calculateFactionScore('macedonia');
        const seleucidScore = calculateFactionScore('seleucid');
        const ptolemyScore = calculateFactionScore('ptolemy');
        let winnerScore = 0;
        if (winner === 'rome') winnerScore = romeScore;
        else if (winner === 'carthage') winnerScore = carthageScore;
        else if (winner === 'macedonia') winnerScore = macedoniaScore;
        else if (winner === 'seleucid') winnerScore = seleucidScore;
        else if (winner === 'ptolemy') winnerScore = ptolemyScore;
        
        document.getElementById('victoryDuration').textContent = `${warDuration} (${warYears}年)`;
        document.getElementById('victoryTurns').textContent = `${gameState.currentTurn} 回合`;
        document.getElementById('victoryScore').textContent = `${winnerScore} 分 (罗马: ${romeScore} | 迦太基: ${carthageScore} | 马其顿: ${macedoniaScore} | 塞琉古: ${seleucidScore}) | 托勒密: ${ptolemyScore})`;
        
        // 显示弹窗
        document.getElementById('victoryModal').style.display = 'flex';
        
        // 添加游戏日志
        addLog(`🏆 游戏结束！${winnerName}获得胜利！`, winner);
        addLog(`战争时长：${warDuration} (${warYears}年)，回合数：${gameState.currentTurn}`, 'system');
        addLog(`最终得分 - 罗马: ${romeScore}，迦太基: ${carthageScore}，马其顿: ${macedoniaScore}，塞琉古: ${seleucidScore}，托勒密: ${ptolemyScore}`, 'system');
    }
}

// 士气损失系统
function processMoraleLoss() {
    // 遍历所有军队，检查士气并处理损失
    ['rome', 'carthage', 'macedonia', 'seleucid','ptolemy'].forEach(faction => {
        if (!armies[faction]) return;
        
        armies[faction].forEach(army => {
            const morale = army.morale || 5;
            
            // 只有士气低于5时才有损失
            if (morale >= 5) return;
            
            let lossPercentage = 0;
            let lossDescription = '';
            
            if (morale === 4) {
                // 士气=4：固定损失0.5%
                lossPercentage = 0.5;
                lossDescription = '固定0.5%';
            } else if (morale === 3) {
                // 士气=3：0.5% × D6
                const dice = rollD6();
                lossPercentage = 0.5 * dice;
                lossDescription = `0.5% × D6(${dice}) = ${lossPercentage.toFixed(1)}%`;
            } else if (morale === 2) {
                // 士气=2：1.0% × D6
                const dice = rollD6();
                lossPercentage = 1.0 * dice;
                lossDescription = `1.0% × D6(${dice}) = ${lossPercentage.toFixed(1)}%`;
            } else if (morale === 1) {
                // 士气=1：1.5% × D6
                const dice = rollD6();
                lossPercentage = 1.5 * dice;
                lossDescription = `1.5% × D6(${dice}) = ${lossPercentage.toFixed(1)}%`;
            }
            
            // 计算损失前的总兵力
            const totalTroopsBefore = 
                (army.lightCavalry || 0) + 
                (army.heavyCavalry || 0) + 
                (army.heavyInfantry || 0) + 
                (army.lightInfantry || 0);
            
            if (totalTroopsBefore === 0) return; // 没有部队，跳过
            
            // 应用损失到各兵种
            const retainRatio = 1 - (lossPercentage / 100);
            
            army.lightCavalry = Math.floor((army.lightCavalry || 0) * retainRatio);
            army.heavyCavalry = Math.floor((army.heavyCavalry || 0) * retainRatio);
            army.heavyInfantry = Math.floor((army.heavyInfantry || 0) * retainRatio);
            army.lightInfantry = Math.floor((army.lightInfantry || 0) * retainRatio);
            
            // 计算损失后的总兵力
            const totalTroopsAfter = 
                army.lightCavalry + 
                army.heavyCavalry + 
                army.heavyInfantry + 
                army.lightInfantry;
            
            const actualLoss = totalTroopsBefore - totalTroopsAfter;
            
            // 记录日志
            if (actualLoss > 0) {
                addLog(
                    `${army.commander} 因士气低下(${morale})损失 ${actualLoss} 兵力 (${lossDescription})`,
                    faction
                );
            }
            
            // 检查是否全军覆没
            if (totalTroopsAfter === 0) {
                addLog(`${army.commander} 部队因士气崩溃而全军覆没！`, faction);
                // 标记待删除（不在遍历中直接删除）
                army.toBeRemoved = true;
            }
        });
        
        // 移除全军覆没的部队
        armies[faction] = armies[faction].filter(army => !army.toBeRemoved);
    });
    
    // 检查所有围城状态（如果有军队被移除）
    checkAllSiegesAfterArmyRemoval();
}

// 检查所有军队的战斗力是否低于消灭阈值
function checkAllArmiesCombatPower() {
    ['rome', 'carthage', 'macedonia', 'seleucid','ptolemy'].forEach(faction => {
        if (!armies[faction]) return;
        
        // 创建待处理列表（避免在遍历中直接修改数组）
        const armiesToCheck = [...armies[faction]];
        
        armiesToCheck.forEach(army => {
            // 计算战斗力
            const combatPower = calculateCombatPower(army);
            
            // 消灭阈值：双方都是5
            const destructionThreshold = 5;
            
            if (combatPower < destructionThreshold) {
                addLog(`⚠️ ${army.commander} 战斗力${combatPower}低于阈值${destructionThreshold}，部队被消灭`, faction);
                
                // 标记为已消灭
                army.destroyed = true;
                
                // 从军队列表中移除
                const index = armies[faction].findIndex(a => a.id === army.id);
                if (index !== -1) {
                    armies[faction].splice(index, 1);
                }
            }
        });
    });
    
    // 检查所有围城状态（如果有军队被移除）
    checkAllSiegesAfterArmyRemoval();
    
    // 更新地图显示
    generateMap();
    drawRoutes();
    absoluteFix();
    placeArmies();
}

// 关闭胜利弹窗
function closeVictoryModal() {
    document.getElementById('victoryModal').style.display = 'none';
    // 弹窗关闭后可以继续游戏，但通常此时游戏应该结束
}
