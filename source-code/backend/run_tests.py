#!/usr/bin/env python
"""
测试运行脚本

此脚本提供统一的测试运行接口，支持运行不同类型的测试。

使用方法:
    python run_tests.py --all              # 运行所有测试
    python run_tests.py --unit             # 仅运行单元测试
    python run_tests.py --integration      # 仅运行集成测试
    python run_tests.py --properties       # 仅运行属性测试
    python run_tests.py --manual           # 仅运行手动测试
    python run_tests.py --diagnostic       # 仅运行诊断测试
    python run_tests.py --verbose          # 显示详细输出
    python run_tests.py --coverage         # 生成覆盖率报告
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
from typing import List, Optional


class TestRunner:
    """测试运行器"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.project_root = self.backend_dir.parent
        self.venv_path = self._detect_venv()
        self.pytest_path = self._get_pytest_path()
    
    def _detect_venv(self) -> Optional[Path]:
        """检测虚拟环境路径"""
        # 检查项目根目录的 .venv
        venv_paths = [
            self.project_root / ".venv",
            self.backend_dir / ".venv",
            self.backend_dir / "venv",
        ]
        
        for venv_path in venv_paths:
            if venv_path.exists():
                return venv_path
        
        return None
    
    def _get_pytest_path(self) -> str:
        """获取 pytest 可执行文件路径"""
        if self.venv_path:
            if sys.platform == "win32":
                pytest_exe = self.venv_path / "Scripts" / "pytest.exe"
            else:
                pytest_exe = self.venv_path / "bin" / "pytest"
            
            if pytest_exe.exists():
                return str(pytest_exe)
        
        # 回退到系统 pytest
        return "pytest"
    
    def check_venv(self) -> bool:
        """检查虚拟环境是否激活"""
        if not self.venv_path:
            print("⚠️  警告：未找到虚拟环境")
            print("建议：")
            print("  1. 创建独立的测试虚拟环境：python -m venv .venv-test")
            print("  2. 激活测试环境：")
            print("     Windows: .venv-test\\Scripts\\activate")
            print("     Linux/Mac: source .venv-test/bin/activate")
            print("  3. 安装依赖：")
            print("     pip install -r requirements.txt")
            print("     pip install -r requirements-test.txt")
            print()
            print("  或使用 tox 管理测试环境：")
            print("     pip install tox")
            print("     tox")
            print()
            return False
        
        # 检查是否是测试环境
        if ".venv-test" not in str(self.venv_path):
            print("⚠️  警告：当前使用的是开发环境，不是测试环境")
            print("建议使用独立的测试环境以避免污染开发环境")
            print("详见 TESTING.md 中的环境隔离说明")
            print()
        
        # 检查 pytest 是否安装
        try:
            result = subprocess.run(
                [self.pytest_path, "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✓ 使用 pytest: {result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("✗ pytest 未安装")
            print("请运行：pip install -r requirements-test.txt")
            return False
    
    def run_tests(
        self,
        test_type: str = "all",
        verbose: bool = False,
        coverage: bool = False
    ) -> int:
        """
        运行测试
        
        Args:
            test_type: 测试类型 (all, unit, integration, properties, manual, diagnostic)
            verbose: 是否显示详细输出
            coverage: 是否生成覆盖率报告
            
        Returns:
            退出码（0=成功，非0=失败）
        """
        args = self._build_pytest_args(test_type, verbose, coverage)
        
        print(f"运行测试: {test_type}")
        print(f"命令: {self.pytest_path} {' '.join(args)}")
        print("=" * 70)
        
        try:
            result = subprocess.run(
                [self.pytest_path] + args,
                cwd=self.backend_dir,
                check=False
            )
            
            print("=" * 70)
            self._display_summary(result.returncode, coverage)
            
            return result.returncode
        
        except KeyboardInterrupt:
            print("\n\n测试被用户中断")
            return 130
        except Exception as e:
            print(f"\n✗ 运行测试时出错: {e}")
            return 1
    
    def _build_pytest_args(
        self,
        test_type: str,
        verbose: bool,
        coverage: bool
    ) -> List[str]:
        """构建 pytest 命令参数"""
        args = []
        
        # 测试路径
        test_paths = {
            "all": "tests/",
            "unit": "tests/unit/",
            "integration": "tests/integration/",
            "properties": "tests/properties/",
            "manual": "tests/manual/",
            "diagnostic": "tests/diagnostic/",
        }
        
        if test_type in test_paths:
            args.append(test_paths[test_type])
        else:
            args.append("tests/")
        
        # 详细输出
        if verbose:
            args.append("-vv")
        else:
            args.append("-v")
        
        # 覆盖率
        if coverage:
            args.extend([
                "--cov=src",
                "--cov-report=html",
                "--cov-report=term",
            ])
        
        return args
    
    def _display_summary(self, exit_code: int, coverage: bool):
        """显示测试结果摘要"""
        if exit_code == 0:
            print("✓ 所有测试通过")
        else:
            print(f"✗ 测试失败 (退出码: {exit_code})")
        
        if coverage:
            htmlcov_path = self.backend_dir / "htmlcov" / "index.html"
            if htmlcov_path.exists():
                print(f"\n覆盖率报告: {htmlcov_path}")
                print("在浏览器中打开查看详细覆盖率信息")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="运行 Backend 测试",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python run_tests.py --all              # 运行所有测试
  python run_tests.py --unit --verbose   # 运行单元测试（详细输出）
  python run_tests.py --coverage         # 运行所有测试并生成覆盖率报告
        """
    )
    
    # 测试类型参数（互斥）
    test_group = parser.add_mutually_exclusive_group()
    test_group.add_argument(
        "--all",
        action="store_const",
        const="all",
        dest="test_type",
        help="运行所有测试（默认）"
    )
    test_group.add_argument(
        "--unit",
        action="store_const",
        const="unit",
        dest="test_type",
        help="仅运行单元测试"
    )
    test_group.add_argument(
        "--integration",
        action="store_const",
        const="integration",
        dest="test_type",
        help="仅运行集成测试"
    )
    test_group.add_argument(
        "--properties",
        action="store_const",
        const="properties",
        dest="test_type",
        help="仅运行属性测试"
    )
    test_group.add_argument(
        "--manual",
        action="store_const",
        const="manual",
        dest="test_type",
        help="仅运行手动测试"
    )
    test_group.add_argument(
        "--diagnostic",
        action="store_const",
        const="diagnostic",
        dest="test_type",
        help="仅运行诊断测试"
    )
    
    # 其他选项
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="显示详细输出"
    )
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="生成覆盖率报告"
    )
    
    args = parser.parse_args()
    
    # 默认运行所有测试
    if args.test_type is None:
        args.test_type = "all"
    
    # 创建测试运行器
    runner = TestRunner()
    
    # 检查环境
    if not runner.check_venv():
        print("\n继续运行测试...")
    
    print()
    
    # 运行测试
    exit_code = runner.run_tests(
        test_type=args.test_type,
        verbose=args.verbose,
        coverage=args.coverage
    )
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
