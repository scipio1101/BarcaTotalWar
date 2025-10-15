#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JavaScript模块提取工具
从index.html中提取JavaScript代码并分类到不同的模块文件
"""

import re
import os

def read_html():
    """读取HTML文件"""
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

def extract_js_content(html):
    """提取script标签中的JavaScript内容"""
    # 匹配 <script> 到 </script> 之间的内容
    pattern = r'<script>(.*?)</script>'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        return match.group(1)
    return ''

def extract_class_code(js_content, class_name):
    """提取指定class的完整代码"""
    # 匹配class定义到下一个class或函数之前
    pattern = rf'(// .*{class_name}.*\n)?class {class_name}.*?{{.*?^\s*}}'
    match = re.search(pattern, js_content, re.DOTALL | re.MULTILINE)
    if match:
        return match.group(0)
    return ''

def extract_function_code(js_content, function_name):
    """提取指定函数的完整代码"""
    pattern = rf'(// .*\n)?function {function_name}\([^)]*\).*?{{.*?^\s*}}'
    match = re.search(pattern, js_content, re.DOTALL | re.MULTILINE)
    if match:
        return match.group(0)
    return ''

def create_module_files():
    """创建模块文件"""
    html = read_html()
    js_content = extract_js_content(html)
    
    os.makedirs('js', exist_ok=True)
    
    # 定义模块和它们包含的代码
    modules = {
        'utils.js': {
            'functions': ['rollDice', 'showDiceResult', 'addLog', 'getCurrentPlayerArmy', 
                         'getAllArmies', 'getConnectedCities', 'getCityCenter']
        },
        'timeSystem.js': {
            'classes': ['TimeSystem']
        },
        'commanderSystem.js': {
            'classes': ['CommanderSystem', 'CommanderManager']
        },
        'battleSystem.js': {
            'classes': ['BattleSystem'],
            'functions': ['nextBattlePhase', 'closeBattle', 'chooseDefenseAction', 
                         'handleDefenderRetreat', 'handleDefenderSiege', 'closeDefenseChoice']
        },
        'siegeSystem.js': {
            'classes': ['SiegeSystem']
        },
        'cityArmyManager.js': {
            'classes': ['CityArmyManager']
        },
        'mapRenderer.js': {
            'functions': ['generateMap', 'drawRoutes', 'placeArmies', 'highlightPossibleMoves',
                         'getCityCenter']
        },
        'uiManager.js': {
            'functions': ['showArmyDetails', 'hideArmyDetails', 'showCityDetails', 
                         'hideCityDetails', 'showCityStatus', 'closeCityStatus',
                         'updateUI', 'updateFactionFunds', 'updateFactionScores']
        },
        'gameActions.js': {
            'functions': ['executeAction', 'executeMove', 'executeHarass', 'executeDiplomacy',
                         'executeFortify', 'executeRecruit', 'executeReorganize',
                         'executeRaiseArmy', 'executeBorrow', 'executeRepay']
        },
        'gameCore.js': {
            'functions': ['initGame', 'endTurn', 'selectCity', 'selectArmy',
                         'calculateCombatPower', 'checkAndHandleArmyDestruction',
                         'respawnRomanArmy', 'checkCityFactionByAttitude',
                         'canPersuadeCity', 'checkCityAttitudeAndFaction',
                         'calculateEconomicIncome', 'calculateMilitaryPayroll',
                         'handleDebtPenalties', 'handleSiegedArmiesMoralePenalty',
                         'calculateFactionScores', 'processActionResult',
                         'changeFaction', 'saveGame', 'loadGame', 'resetGame']
        },
        'editorTools.js': {
            'functions': ['toggleEditMode', 'toggleDebug', 'saveCoordinates',
                         'loadCoordinates', 'exportCoordinates', 'exportCityArray',
                         'absoluteFix', 'manualFixCoordinates', 'toggleMapControl']
        }
    }
    
    print("开始提取模块...")
    for module_name, content_def in modules.items():
        print(f"\n处理模块: {module_name}")
        module_content = []
        
        # 添加注释头
        module_content.append(f"// {module_name} - 自动提取生成\n")
        
        # 提取类
        if 'classes' in content_def:
            for class_name in content_def['classes']:
                code = extract_class_code(js_content, class_name)
                if code:
                    module_content.append(code)
                    module_content.append('\n')
                    print(f"  ✓ 提取类: {class_name}")
                else:
                    print(f"  ✗ 未找到类: {class_name}")
        
        # 提取函数
        if 'functions' in content_def:
            for func_name in content_def['functions']:
                code = extract_function_code(js_content, func_name)
                if code:
                    module_content.append(code)
                    module_content.append('\n')
                    print(f"  ✓ 提取函数: {func_name}")
                else:
                    print(f"  ✗ 未找到函数: {func_name}")
        
        # 写入文件
        if module_content:
            with open(f'js/{module_name}', 'w', encoding='utf-8') as f:
                f.write('\n'.join(module_content))
            print(f"  => 已保存: js/{module_name}")

def main():
    """主函数"""
    print("=" * 60)
    print("JavaScript模块提取工具")
    print("=" * 60)
    create_module_files()
    print("\n" + "=" * 60)
    print("提取完成！")
    print("=" * 60)
    print("\n请注意：")
    print("1. gameData.js 已手动创建")
    print("2. 请检查提取的代码是否完整")
    print("3. 根据需要调整HTML中的script引用")
    print("4. 测试所有功能是否正常")

if __name__ == '__main__':
    main() 