"""测试版本要求合并逻辑"""

from packaging.specifiers import SpecifierSet
from packaging.version import parse as parse_version

def test_version_requirements():
    """测试版本要求合并"""
    
    # 测试用例 1: numpy 的实际要求
    requirements = ['>=1.17,<2.0.0', '>=1.17,<2.0', '>=1.17']
    
    print(f"测试要求: {requirements}")
    
    # 合并要求
    combined = ','.join(requirements)
    print(f"合并后: {combined}")
    
    spec_set = SpecifierSet(combined)
    print(f"SpecifierSet: {spec_set}")
    
    # 测试一些版本
    test_versions = ['1.16.0', '1.17.0', '1.18.0', '1.99.0', '2.0.0', '2.1.0']
    
    print("\n版本测试:")
    for ver in test_versions:
        v = parse_version(ver)
        result = v in spec_set
        print(f"  {ver}: {'✓' if result else '✗'}")
    
    # 检查是否有满足条件的版本
    has_valid = any(parse_version(v) in spec_set for v in test_versions)
    print(f"\n是否有满足条件的版本: {has_valid}")
    
    # 测试用例 2: 真正冲突的要求
    print("\n" + "="*50)
    print("测试冲突的要求:")
    conflict_reqs = ['>=2.0.0', '==1.0.0']
    print(f"要求: {conflict_reqs}")
    
    combined2 = ','.join(conflict_reqs)
    spec_set2 = SpecifierSet(combined2)
    print(f"SpecifierSet: {spec_set2}")
    
    test_versions2 = ['0.9.0', '1.0.0', '1.5.0', '2.0.0', '2.5.0']
    print("\n版本测试:")
    for ver in test_versions2:
        v = parse_version(ver)
        result = v in spec_set2
        print(f"  {ver}: {'✓' if result else '✗'}")
    
    has_valid2 = any(parse_version(v) in spec_set2 for v in test_versions2)
    print(f"\n是否有满足条件的版本: {has_valid2}")

if __name__ == '__main__':
    test_version_requirements()
