# -*- coding: utf-8 -*-
"""
将罗马AI转换为马其顿AI
"""

import re

print("开始转换罗马AI到马其顿AI...")

# 读取罗马AI文件
print("读取文件：js/ai-controller.js")
try:
    with open('js/ai-controller.js', 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"文件读取成功，共{len(content)}字符")
except Exception as e:
    print(f"读取文件失败：{e}")
    exit(1)

# 战略配置替换
strategies_config = '''
    // 马其顿战略目标配置（5种战略）
    macedoniaStrategicGoals: {
        // 亚历山大战略配置
        alexander: {
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 1,
                description: '保卫佩拉'
            },
            offensiveTargets: [
                { cityId: 'rome', priority: 900, description: '攻陷罗马城' },
                { cityId: 'carthage', priority: 900, description: '攻陷迦太基城' },
                { cityId: 'syracuse', priority: 850, description: '占领叙拉古' },
                { cityId: 'newcarthage', priority: 800, description: '占领新迦太基' },
            ]
        },
        // 叙拉古战略配置
        syracuse: {
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            offensiveTargets: [
                { cityId: 'syracuse', priority: 950, description: '占领叙拉古（首要）' },
                { cityId: 'messana', priority: 900, description: '占领墨西拿' },
                { cityId: 'lilybaeum', priority: 850, description: '占领利利拜' },
            ]
        },
        // 罗马战略配置
        rome: {
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            offensiveTargets: [
                { cityId: 'rome', priority: 950, description: '攻陷罗马城（首要）' },
                { cityId: 'brundisium', priority: 900, description: '占领布林迪西' },
                { cityId: 'tarentum', priority: 850, description: '占领塔兰托' },
            ]
        },
        // 安条克战略配置
        antiochus: {
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 3,
                description: '保卫佩拉'
            },
            offensiveTargets: [
                { cityId: 'rome', priority: 600, description: '伺机攻罗马' },
                { cityId: 'carthage', priority: 600, description: '伺机攻迦太基' },
            ]
        },
        // 迦太基战略配置
        carthage: {
            defenseCapital: {
                cityId: 'pella',
                priority: 1000,
                defensiveRadius: 2,
                description: '保卫佩拉'
            },
            offensiveTargets: [
                { cityId: 'carthage', priority: 950, description: '攻陷迦太基城（最终目标）' },
                { cityId: 'syracuse', priority: 900, description: '占领叙拉古（必经）' },
                { cityId: 'lilybaeum', priority: 850, description: '占领利利拜' },
            ]
        }
    },'''

# 基础替换
replacements = [
    ('const AIController = {', 'const MacedoniaAIController = {'),
    ('AIController', 'MacedoniaAIController'),
    ("controlledFaction: null,  // AI控制的阵营 ('rome' 或 'carthage')", 
     "controlledFaction: 'macedonia',  // AI控制的阵营（马其顿）"),
    ("faction === 'rome' ? '罗马' : '迦太基'", "'马其顿'"),
    ('romeStrategicGoals:', 'macedoniaStrategicGoals:'),
    ("lostCities: {\n        rome: {},      // { cityId: { lostTurn: number, lostTo: faction, importance: number, cityData: {} } }\n        carthage: {}\n    },",
     "lostCities: {\n        macedonia: {}  // { cityId: { lostTurn: number, lostTo: faction, importance: number, cityData: {} } }\n    },"),
    ("recaptureWeights: {\n        rome: {},      // { armyId: { cityId: weight } }\n        carthage: {}\n    },",
     "recaptureWeights: {\n        macedonia: {}  // { armyId: { cityId: weight } }\n    },"),
]

# 执行基础替换
for old, new in replacements:
    content = content.replace(old, new)

# 替换战略配置
content = re.sub(
    r'// 罗马战略目标配置\s+romeStrategicGoals: \{[^\}]+\},',
    strategies_config,
    content,
    flags=re.DOTALL
)

# 函数名替换（罗马相关）
function_replacements = [
    ('isClosestToNewCarthage', 'isClosestToFirstTarget'),
    ('isClosestToSyracuse', 'isClosestToSecondTarget'),
    ('evaluateNewCarthageStrategy', 'evaluateFirstTargetStrategy'),
    ('evaluateSyracuseStrategy', 'evaluateSecondTargetStrategy'),
    ('evaluateRomeStrategicValue', 'evaluateMacedoniaStrategicValue'),
    ('needDefendRome', 'needDefendPella'),
    ('handleRomeSieged', 'handlePellaSieged'),
    ('evaluateThreatsToRome', 'evaluateThreatsToPella'),
]

for old, new in function_replacements:
    content = content.replace(old, new)

# 条件替换：rome faction
content = re.sub(
    r"if \(this\.config\.controlledFaction !== 'rome'\)",
    "if (this.config.controlledFaction !== 'macedonia')",
    content
)

content = re.sub(
    r"this\.config\.controlledFaction === 'rome'",
    "this.config.controlledFaction === 'macedonia'",
    content
)

# 写入马其顿AI文件
print("写入文件：js/ai-controller-macedonia-new.js")
try:
    with open('js/ai-controller-macedonia-new.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"文件写入成功，共{len(content)}字符")
except Exception as e:
    print(f"写入文件失败：{e}")
    exit(1)

print("\n转换完成！生成文件：js/ai-controller-macedonia-new.js")
print("请手工检查并调整以下内容：")
print("1. 所有cityId引用（rome城市 → pella等）")
print("2. 敌对阵营逻辑（carthage → rome/carthage视情况而定）")
print("3. 战略配置和目标城市")
print("4. 所有faction判断")

