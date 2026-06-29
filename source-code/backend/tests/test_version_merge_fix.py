"""
测试版本要求合并逻辑修复
"""

from packaging.specifiers import SpecifierSet, Specifier
from packaging.version import parse as parse_version

def get_strictest_requirement(requirements):
    """
    从多个版本要求中选择最严格的一个
    """
    if not requirements:
        return ''
    
    if len(requirements) == 1:
        return requirements[0]
    
    try:
        # 尝试合并所有要求
        combined = ','.join(requirements)
        spec_set = SpecifierSet(combined)
        
        # 智能简化：对于同类型的要求，选择最严格的
        # 分类所有 specifier
        ge_specs = []  # >=
        gt_specs = []  # >
        le_specs = []  # <=
        lt_specs = []  # <
        eq_specs = []  # ==
        ne_specs = []  # !=
        other_specs = []  # 其他（如 ~=）
        
        for spec in spec_set:
            if spec.operator == '>=':
                ge_specs.append(spec)
            elif spec.operator == '>':
                gt_specs.append(spec)
            elif spec.operator == '<=':
                le_specs.append(spec)
            elif spec.operator == '<':
                lt_specs.append(spec)
            elif spec.operator == '==':
                eq_specs.append(spec)
            elif spec.operator == '!=':
                ne_specs.append(spec)
            else:
                other_specs.append(spec)
        
        # 简化同类型的要求
        simplified_specs = []
        
        # >= 要求：选择最大的版本
        if ge_specs:
            max_spec = max(ge_specs, key=lambda s: parse_version(s.version))
            simplified_specs.append(str(max_spec))
        
        # > 要求：选择最大的版本
        if gt_specs:
            max_spec = max(gt_specs, key=lambda s: parse_version(s.version))
            simplified_specs.append(str(max_spec))
        
        # <= 要求：选择最小的版本
        if le_specs:
            min_spec = min(le_specs, key=lambda s: parse_version(s.version))
            simplified_specs.append(str(min_spec))
        
        # < 要求：选择最小的版本
        if lt_specs:
            min_spec = min(lt_specs, key=lambda s: parse_version(s.version))
            simplified_specs.append(str(min_spec))
        
        # == 要求：保留
        if eq_specs:
            simplified_specs.extend(str(s) for s in eq_specs)
        
        # != 要求：保留所有
        if ne_specs:
            simplified_specs.extend(str(s) for s in ne_specs)
        
        # 其他要求：保留所有
        if other_specs:
            simplified_specs.extend(str(s) for s in other_specs)
        
        # 合并简化后的要求
        result = ','.join(simplified_specs)
        return result
    
    except Exception as e:
        print(f"合并失败: {e}")
        return requirements[0]


# 测试用例
test_cases = [
    # 测试 1: 多个 >= 要求，应该选择最大的
    (['>=1.10.0', '>=2.0.0', '>=1.5.0', '>=1.6.0'], '>=2.0.0'),
    
    # 测试 2: 混合 >= 和 < 要求
    (['>=1.17', '<2.0.0'], '>=1.17,<2.0.0'),
    
    # 测试 3: 多个 >= 和多个 <，应该选择最大的 >= 和最小的 <
    (['>=1.17', '<2.0.0', '>=1.17', '<2.0'], '>=1.17,<2.0'),
    
    # 测试 4: 单个要求
    (['>=1.10.0'], '>=1.10.0'),
    
    # 测试 5: 多个 <= 要求，应该选择最小的
    (['<=3.0.0', '<=2.0.0', '<=4.0.0'], '<=2.0.0'),
]

print("测试版本要求合并逻辑：\n")

for i, (input_reqs, expected) in enumerate(test_cases, 1):
    result = get_strictest_requirement(input_reqs)
    status = "✓" if result == expected else "✗"
    print(f"测试 {i}: {status}")
    print(f"  输入: {input_reqs}")
    print(f"  期望: {expected}")
    print(f"  实际: {result}")
    print()
