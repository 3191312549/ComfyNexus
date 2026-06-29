"""
系统监控 API 手动测试脚本

用于验证系统监控 API 的实际运行效果
"""

import json
from src.bridge.controllers.system_monitor_controller import SystemMonitorController


def print_section(title):
    """打印分隔线"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def format_value(value, unit=""):
    """格式化显示值"""
    if value is None:
        return "N/A"
    return f"{value}{unit}"


def main():
    """主测试函数"""
    print_section("系统监控 API 手动测试")
    
    # 创建控制器
    controller = SystemMonitorController()
    
    # 获取监控数据
    print("\n📊 正在获取系统监控数据...")
    data = controller.get_system_monitor_data()
    
    # 显示原始 JSON
    print_section("原始 JSON 数据")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    # 格式化显示
    print_section("格式化显示")
    
    # VRAM
    print("\n🎮 GPU 显存 (VRAM)")
    vram = data.get("vram", {})
    print(f"  使用率: {format_value(vram.get('used'), '%')}")
    print(f"  总容量: {format_value(vram.get('total'), ' GB')}")
    print(f"  已使用: {format_value(vram.get('used_gb'), ' GB')}")
    
    # 内存
    print("\n💾 系统内存 (RAM)")
    memory = data.get("memory", {})
    print(f"  使用率: {format_value(memory.get('used'), '%')}")
    print(f"  总容量: {format_value(memory.get('total'), ' GB')}")
    print(f"  已使用: {format_value(memory.get('used_gb'), ' GB')}")
    
    # 虚拟内存
    print("\n💿 虚拟内存 (Swap)")
    virtual_memory = data.get("virtual_memory", {})
    print(f"  使用率: {format_value(virtual_memory.get('used'), '%')}")
    print(f"  总容量: {format_value(virtual_memory.get('total'), ' GB')}")
    print(f"  已使用: {format_value(virtual_memory.get('used_gb'), ' GB')}")
    
    # CPU
    print("\n🔥 CPU")
    cpu = data.get("cpu", {})
    print(f"  占用率: {format_value(cpu.get('usage'), '%')}")
    print(f"  温度: {format_value(cpu.get('temperature'), '°C')}")
    print(f"  功率: {format_value(cpu.get('power'), 'W')}")
    
    # GPU
    print("\n⚡ GPU")
    gpu = data.get("gpu", {})
    print(f"  占用率: {format_value(gpu.get('usage'), '%')}")
    print(f"  温度: {format_value(gpu.get('temperature'), '°C')}")
    print(f"  功率: {format_value(gpu.get('power'), 'W')}")
    
    # 验收检查
    print_section("验收检查")
    
    checks = []
    
    # 检查数据结构
    required_keys = ["vram", "memory", "virtual_memory", "cpu", "gpu"]
    for key in required_keys:
        if key in data:
            checks.append(f"✅ 包含 '{key}' 字段")
        else:
            checks.append(f"❌ 缺少 '{key}' 字段")
    
    # 检查内存数据
    if memory.get("used") is not None:
        checks.append("✅ 内存使用率获取成功")
    else:
        checks.append("⚠️  内存使用率不可用")
    
    # 检查 CPU 数据
    if cpu.get("usage") is not None:
        checks.append("✅ CPU 占用率获取成功")
    else:
        checks.append("❌ CPU 占用率获取失败")
    
    # 检查 GPU 可用性
    if gpu.get("usage") is not None:
        checks.append("✅ GPU 数据获取成功（检测到 GPU）")
    else:
        checks.append("ℹ️  GPU 数据不可用（可能无 GPU 或驱动问题）")
    
    # 打印检查结果
    for check in checks:
        print(f"  {check}")
    
    print_section("测试完成")
    print("\n✨ 系统监控 API 测试完成！\n")


if __name__ == "__main__":
    main()
