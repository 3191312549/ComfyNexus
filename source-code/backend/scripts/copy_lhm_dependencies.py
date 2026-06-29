"""
LibreHardwareMonitorLib 依赖项复制脚本

将 LibreHardwareMonitor 目录中的依赖 DLL 复制到 NuGet 包的 net8.0 目录，
确保 .NET 8 coreclr 运行时能正确加载所有依赖项。

使用方法:
    python backend/scripts/copy_lhm_dependencies.py
"""

import shutil
import sys
from pathlib import Path


def get_project_root() -> Path:
    """获取项目根目录"""
    script_dir = Path(__file__).resolve().parent
    return script_dir.parent.parent


def copy_dependencies():
    """复制依赖 DLL 到 net8.0 目录"""
    project_root = get_project_root()
    
    source_dir = project_root / "backend" / "lib" / "LibreHardwareMonitor"
    target_dir = project_root / "backend" / "lib" / "librehardwaremonitorlib" / "runtimes" / "win-x64" / "lib" / "net8.0"
    
    if not source_dir.exists():
        print(f"错误: 源目录不存在: {source_dir}")
        return False
    
    if not target_dir.exists():
        print(f"创建目标目录: {target_dir}")
        target_dir.mkdir(parents=True, exist_ok=True)
    
    dependencies = [
        "System.Threading.AccessControl.dll",
        "System.Security.AccessControl.dll",
        "System.Security.Principal.Windows.dll",
        "System.Memory.dll",
        "System.Buffers.dll",
        "System.Numerics.Vectors.dll",
        "System.Runtime.CompilerServices.Unsafe.dll",
        "System.Threading.Tasks.Extensions.dll",
        "Microsoft.Bcl.AsyncInterfaces.dll",
        "Microsoft.Bcl.HashCode.dll",
        "HidSharp.dll",
        "DiskInfoToolkit.dll",
        "RAMSPDToolkit-NDD.dll",
        "BlackSharp.Core.dll",
        "Microsoft.Win32.TaskScheduler.dll",
    ]
    
    copied = 0
    skipped = 0
    
    for dll in dependencies:
        src = source_dir / dll
        dst = target_dir / dll
        
        if src.exists():
            if dst.exists():
                src_size = src.stat().st_size
                dst_size = dst.stat().st_size
                if src_size == dst_size:
                    print(f"  跳过 (已存在): {dll}")
                    skipped += 1
                    continue
            
            shutil.copy2(src, dst)
            print(f"  已复制: {dll}")
            copied += 1
        else:
            print(f"  未找到: {dll}")
    
    print(f"\n完成: 复制 {copied} 个文件, 跳过 {skipped} 个文件")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("LibreHardwareMonitorLib 依赖项复制脚本")
    print("=" * 60)
    print()
    
    success = copy_dependencies()
    
    if not success:
        sys.exit(1)
