"""测试警告解析"""

from src.core.dependency.conflict_detector import ConflictDetector

# 你的实际警告信息
warnings = """Warning!!! Possibly conflicting dependencies found:
* accelerate==0.32.1
 - numpy [required: >=1.17,<2.0.0, installed: 2.4.2]
 - torch [required: >=1.10.0, installed: ?]
* kornia==0.8.2
 - torch [required: >=2.0.0, installed: ?]
* spandrel==0.4.2
 - torch [required: Any, installed: ?]
 - torchvision [required: Any, installed: ?]
* timm==1.0.15
 - torch [required: Any, installed: ?]
 - torchvision [required: Any, installed: ?]
* torchdiffeq==0.2.4
 - torch [required: >=1.5.0, installed: ?]
* torchsde==0.2.6
 - torch [required: >=1.6.0, installed: ?]
* transformers==4.42.3
 - numpy [required: >=1.17,<2.0, installed: 2.4.2]
"""

detector = ConflictDetector()
conflicts = detector.parse_pipdeptree_warnings(warnings)

print(f"解析出 {len(conflicts)} 个冲突：")
print()

for i, conflict in enumerate(conflicts, 1):
    print(f"{i}. {conflict.package_name}")
    print(f"   来源: {conflict.source}")
    print(f"   类型: {conflict.type}")
    print(f"   要求版本: {conflict.required_version}")
    print(f"   安装版本: {conflict.installed_version or '未安装'}")
    print(f"   描述: {conflict.description}")
    print()
