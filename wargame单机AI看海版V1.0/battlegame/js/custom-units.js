/**
 * 自定义单位生成和部署逻辑
 * 这个文件包含根据玩家输入生成自定义军队的逻辑
 */

window.initializeCustomUnitsImpl = function(config) {
    // 定义单位尺寸（朝向为north时的尺寸）
    this.unitBaseSizes = {
        'infantry': { width: 3, height: 2 },
        'cavalry': { width: 2, height: 1 },
        'archer': { width: 3, height: 1 },
        'legionary': { width: 3, height: 2 },
        'centurion': { width: 2, height: 1 },
        'hastati': { width: 3, height: 2 },
        'elephant': { width: 3, height: 2 },
        'general': { width: 2, height: 1 }
    };
    this.unitSizes = this.unitBaseSizes;

    // 定义单位分值
    this.unitValues = {
        'legionary': 5,
        'hastati': 7,
        'cavalry': 12,
        'general': 15,
        'archer': 3,
        'infantry': 5,
        'elephant': 20,
        'centurion': 15
    };

    this.units = [];
    let unitId = 1;

    // 生成罗马单位
    const romeConfig = config.rome;
    const romeUnits = [];

    // 1. 步兵单位
    const romeInfantryCount = Math.round(romeConfig.infantry / 2000);
    const romeLegionaryCount = Math.ceil(romeInfantryCount * 2 / 3);
    const romeHastatiCount = Math.floor(romeInfantryCount * 1 / 3);

    // 2. 轻骑兵单位 (Allied Cavalry stats)
    const romeLightCavCount = Math.round(romeConfig.lightCavalry / 500);

    // 3. 重骑兵单位 (Roman Noble Cavalry stats)
    const romeHeavyCavCount = Math.round(romeConfig.heavyCavalry / 500);

    // 4. 弓箭兵单位
    const romeArcherCount = Math.round(romeConfig.archers / 1000);

    // 创建罗马军团步兵
    for (let i = 0; i < romeLegionaryCount; i++) {
        romeUnits.push({
            id: unitId++,
            name: '军团步兵',
            type: 'legionary',
            faction: 'rome',
            chargeAttack: 5,
            sustainedMelee: 5,
            supportMelee: 2,
            throwingAttack: 2,
            rangedAttack: 2,
            defense: 4,
            casualtyTolerance: 4,
            specialSkills: ['盾墙', '投掷标枪'],
            range: 6,
            movement: 6,
            leadership: 0,
            hasMoved: false,
            direction: 'north',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 5
        });
    }

    // 创建罗马后备兵
    for (let i = 0; i < romeHastatiCount; i++) {
        romeUnits.push({
            id: unitId++,
            name: '罗马后备兵',
            type: 'hastati',
            faction: 'rome',
            chargeAttack: 6,
            sustainedMelee: 6,
            supportMelee: 3,
            throwingAttack: 0,
            rangedAttack: 0,
            defense: 4,
            casualtyTolerance: 4,
            specialSkills: ['指挥', '激励'],
            range: 1,
            movement: 6,
            leadership: 3,
            hasMoved: false,
            direction: 'north',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 7
        });
    }

    // 创建罗马轻骑兵 (同盟骑兵数值)
    for (let i = 0; i < romeLightCavCount; i++) {
        romeUnits.push({
            id: unitId++,
            name: '同盟骑兵',
            type: 'cavalry',
            faction: 'rome',
            chargeAttack: 5,
            sustainedMelee: 3,
            supportMelee: 2,
            throwingAttack: 0,
            rangedAttack: 0,
            defense: 5,
            casualtyTolerance: 5,
            specialSkills: ['游击战术', '快速撤退'],
            range: 1,
            movement: 9,
            leadership: 0,
            hasMoved: false,
            direction: 'north',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 12
        });
    }

    // 创建罗马重骑兵 (贵族骑兵数值)
    for (let i = 0; i < romeHeavyCavCount; i++) {
        romeUnits.push({
            id: unitId++,
            name: '罗马贵族骑兵',
            type: 'cavalry',
            faction: 'rome',
            chargeAttack: 6,
            sustainedMelee: 3,
            supportMelee: 2,
            throwingAttack: 0,
            rangedAttack: 0,
            defense: 5,
            casualtyTolerance: 5,
            specialSkills: ['冲锋', '快速机动'],
            range: 1,
            movement: 9,
            leadership: 0,
            hasMoved: false,
            direction: 'north',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 12
        });
    }

    // 创建罗马弓箭兵 (同盟弓箭手数值)
    for (let i = 0; i < romeArcherCount; i++) {
        romeUnits.push({
            id: unitId++,
            name: '同盟的弓箭手',
            type: 'archer',
            faction: 'rome',
            chargeAttack: 3,
            sustainedMelee: 2,
            supportMelee: 1,
            throwingAttack: 2,
            rangedAttack: 2,
            defense: 6,
            casualtyTolerance: 4,
            specialSkills: ['精准射击'],
            range: 12,
            movement: 6,
            leadership: 0,
            hasMoved: false,
            direction: 'north',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 3
        });
    }

    // 创建罗马将军
    romeUnits.push({
        id: unitId++,
        name: '罗马执政官',
        type: 'general',
        faction: 'rome',
        chargeAttack: 6,
        sustainedMelee: 3,
        supportMelee: 2,
        throwingAttack: 0,
        rangedAttack: 0,
        defense: 5,
        casualtyTolerance: 8,
        specialSkills: ['高级指挥', '战术大师', '鼓舞士气'],
        range: 1,
        movement: 9,
        leadership: romeConfig.generalLeadership,
        hasMoved: false,
        direction: 'north',
        hp: 40,
        maxHp: 40,
        morale: 'good',
        order: 'good',
        combatStatus: 'not_engaged',
        hasRangedAttacked: false,
        hasMeleeAttacked: false,
        lastMeleeResult: 'none',
        value: 15
    });

    // 自动部署罗马单位
    autoDeployRome.call(this, romeUnits);

    // 生成迦太基单位
    const carthageConfig = config.carthage;
    const carthageUnits = [];

    // 1. 步兵单位
    const carthageInfantryCount = Math.round(carthageConfig.infantry / 2000);

    // 2. 轻骑兵单位 (Numidian Cavalry stats)
    const carthageLightCavCount = Math.round(carthageConfig.lightCavalry / 500);

    // 3. 重骑兵单位 (其中一个是战象)
    const carthageHeavyCavCount = Math.round(carthageConfig.heavyCavalry / 500);

    // 4. 弓箭兵单位
    const carthageArcherCount = Math.round(carthageConfig.archers / 1000);

    // 创建迦太基步兵
    for (let i = 0; i < carthageInfantryCount; i++) {
        carthageUnits.push({
            id: unitId++,
            name: '迦太基步兵',
            type: 'infantry',
            faction: 'carthage',
            chargeAttack: 6,
            sustainedMelee: 6,
            supportMelee: 3,
            throwingAttack: 0,
            rangedAttack: 0,
            defense: 4,
            casualtyTolerance: 5,
            specialSkills: ['狂热冲锋'],
            range: 1,
            movement: 6,
            leadership: 0,
            hasMoved: false,
            direction: 'south',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 5
        });
    }

    // 创建迦太基战象（如果有重骑兵）
    if (carthageHeavyCavCount > 0) {
        carthageUnits.push({
            id: unitId++,
            name: '迦太基战象',
            type: 'elephant',
            faction: 'carthage',
            chargeAttack: 4,
            sustainedMelee: 3,
            supportMelee: 1,
            throwingAttack: 1,
            rangedAttack: 1,
            defense: 4,
            casualtyTolerance: 9,
            specialSkills: ['践踏', '恐怖冲击', '巨兽威慑'],
            range: 6,
            movement: 6,
            leadership: 0,
            hasMoved: false,
            direction: 'south',
            hp: 60,
            maxHp: 60,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 20
        });
    }

    // 创建迦太基骑兵（重骑兵-1，因为有1个战象）
    for (let i = 0; i < Math.max(0, carthageHeavyCavCount - 1); i++) {
        carthageUnits.push({
            id: unitId++,
            name: '迦太基骑兵',
            type: 'cavalry',
            faction: 'carthage',
            chargeAttack: 5,
            sustainedMelee: 3,
            supportMelee: 2,
            throwingAttack: 0,
            rangedAttack: 0,
            defense: 5,
            casualtyTolerance: 5,
            specialSkills: ['游击战术', '快速撤退'],
            range: 1,
            movement: 9,
            leadership: 0,
            hasMoved: false,
            direction: 'south',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 12
        });
    }

    // 创建迦太基轻骑兵 (努米底亚骑兵数值)
    for (let i = 0; i < carthageLightCavCount; i++) {
        carthageUnits.push({
            id: unitId++,
            name: '努米底亚骑兵',
            type: 'cavalry',
            faction: 'carthage',
            chargeAttack: 5,
            sustainedMelee: 3,
            supportMelee: 2,
            throwingAttack: 0,
            rangedAttack: 0,
            defense: 5,
            casualtyTolerance: 5,
            specialSkills: ['游击战术', '快速撤退'],
            range: 1,
            movement: 9,
            leadership: 0,
            hasMoved: false,
            direction: 'south',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 12
        });
    }

    // 创建迦太基弓箭兵
    for (let i = 0; i < carthageArcherCount; i++) {
        carthageUnits.push({
            id: unitId++,
            name: '迦太基弓箭手',
            type: 'archer',
            faction: 'carthage',
            chargeAttack: 3,
            sustainedMelee: 2,
            supportMelee: 2,
            throwingAttack: 2,
            rangedAttack: 2,
            defense: 6,
            casualtyTolerance: 4,
            specialSkills: ['连续射击'],
            range: 12,
            movement: 6,
            leadership: 0,
            hasMoved: false,
            direction: 'south',
            hp: 40,
            maxHp: 40,
            morale: 'good',
            order: 'good',
            combatStatus: 'not_engaged',
            hasRangedAttacked: false,
            hasMeleeAttacked: false,
            lastMeleeResult: 'none',
            value: 3
        });
    }

    // 创建迦太基将军
    carthageUnits.push({
        id: unitId++,
        name: '迦太基将军',
        type: 'general',
        faction: 'carthage',
        chargeAttack: 6,
        sustainedMelee: 4,
        supportMelee: 2,
        throwingAttack: 0,
        rangedAttack: 0,
        defense: 5,
        casualtyTolerance: 5,
        specialSkills: ['高级指挥', '战术大师', '鼓舞士气'],
        range: 1,
        movement: 9,
        leadership: carthageConfig.generalLeadership,
        hasMoved: false,
        direction: 'south',
        hp: 40,
        maxHp: 40,
        morale: 'good',
        order: 'good',
        combatStatus: 'not_engaged',
        hasRangedAttacked: false,
        hasMeleeAttacked: false,
        lastMeleeResult: 'none',
        value: 15
    });

    // 自动部署迦太基单位
    autoDeployCarthage.call(this, carthageUnits);

    // 添加所有单位到游戏
    this.units = [...romeUnits, ...carthageUnits];

    // 为所有单位添加额外属性
    this.units.forEach(unit => {
        if (!unit.hasOwnProperty('lastBattleDamage')) {
            unit.lastBattleDamage = 0;
        }
        if (!unit.hasOwnProperty('engagedWith')) {
            unit.engagedWith = null;
        }
        if (!unit.hasOwnProperty('supportingUnit')) {
            unit.supportingUnit = null;
        }
    });

    // 计算并存储初始总分值
    this.initialRomeValue = this.units
        .filter(u => u.faction === 'rome')
        .reduce((sum, u) => sum + (u.value || 0), 0);
    this.initialCarthageValue = this.units
        .filter(u => u.faction === 'carthage')
        .reduce((sum, u) => sum + (u.value || 0), 0);

    console.log(`[自定义战斗] 初始分值 - 罗马: ${this.initialRomeValue}, 迦太基: ${this.initialCarthageValue}`);
    console.log(`[自定义战斗] 罗马单位: ${romeUnits.length}个, 迦太基单位: ${carthageUnits.length}个`);
};

function autoDeployRome(units) {
    // 罗马部署：弓箭兵第一排，军团兵1-2排，后备兵一排，骑兵两侧
    const archers = units.filter(u => u.type === 'archer');
    const legionaries = units.filter(u => u.type === 'legionary');
    const hastati = units.filter(u => u.type === 'hastati');
    const cavalry = units.filter(u => u.type === 'cavalry');
    const general = units.find(u => u.type === 'general');

    let currentX = 20;
    let currentY = 30;
    const spacing = 4;

    // 部署弓箭兵（第一排）
    archers.forEach((unit, index) => {
        unit.x = currentX;
        unit.y = currentY;
        currentX += this.unitBaseSizes['archer'].width + spacing + 5;
    });

    // 部署军团兵（1-2排）
    currentX = 20;
    currentY = 34;
    const legionariesPerRow = Math.ceil(legionaries.length / 2);
    legionaries.forEach((unit, index) => {
        unit.x = currentX;
        unit.y = currentY;
        currentX += this.unitBaseSizes['legionary'].width + spacing + 2;
        if ((index + 1) % legionariesPerRow === 0) {
            currentX = 20;
            currentY += this.unitBaseSizes['legionary'].height + 1;
        }
    });

    // 部署后备兵（一排）
    currentX = 20;
    currentY = 39;
    hastati.forEach((unit, index) => {
        unit.x = currentX;
        unit.y = currentY;
        currentX += this.unitBaseSizes['hastati'].width + spacing + 3;
    });

    // 部署骑兵（左右两侧）
    const halfCav = Math.ceil(cavalry.length / 2);
    currentY = 33;
    cavalry.forEach((unit, index) => {
        if (index < halfCav) {
            // 左侧
            unit.x = 10 + index * (this.unitBaseSizes['cavalry'].width + 2);
            unit.y = currentY;
        } else {
            // 右侧
            unit.x = 70 + (index - halfCav) * (this.unitBaseSizes['cavalry'].width + 2);
            unit.y = currentY;
        }
    });

    // 部署将军（左侧骑兵旁）
    if (general) {
        general.x = 15;
        general.y = 33;
    }
}

function autoDeployCarthage(units) {
    // 迦太基部署：弓箭兵第一排，步兵1-2排，骑兵两侧
    const archers = units.filter(u => u.type === 'archer');
    const infantry = units.filter(u => u.type === 'infantry');
    const cavalry = units.filter(u => u.type === 'cavalry');
    const elephant = units.find(u => u.type === 'elephant');
    const general = units.find(u => u.type === 'general');

    let currentX = 20;
    let currentY = 13;
    const spacing = 4;

    // 部署弓箭兵（第一排）
    archers.forEach((unit, index) => {
        unit.x = currentX;
        unit.y = currentY;
        currentX += this.unitBaseSizes['archer'].width + spacing + 5;
    });

    // 部署步兵（1-2排）
    currentX = 20;
    currentY = 7;
    const infantryPerRow = Math.ceil(infantry.length / 2);
    infantry.forEach((unit, index) => {
        unit.x = currentX;
        unit.y = currentY;
        currentX += this.unitBaseSizes['infantry'].width + spacing + 2;
        if ((index + 1) % infantryPerRow === 0) {
            currentX = 20;
            currentY += this.unitBaseSizes['infantry'].height + 1;
        }
    });

    // 部署骑兵（左右两侧）
    const halfCav = Math.ceil(cavalry.length / 2);
    currentY = 10;
    cavalry.forEach((unit, index) => {
        if (index < halfCav) {
            // 左侧
            unit.x = 10 + index * (this.unitBaseSizes['cavalry'].width + 2);
            unit.y = currentY;
        } else {
            // 右侧
            unit.x = 70 + (index - halfCav) * (this.unitBaseSizes['cavalry'].width + 2);
            unit.y = currentY;
        }
    });

    // 部署战象（左侧）
    if (elephant) {
        elephant.x = 15;
        elephant.y = 8;
    }

    // 部署将军（战象旁或左侧）
    if (general) {
        general.x = elephant ? 20 : 15;
        general.y = 8;
    }
} 