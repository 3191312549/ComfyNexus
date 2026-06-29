"""
清理后端代码中的调试日志
保留错误日志，移除信息和调试日志
"""

import re
from pathlib import Path

def clean_debug_logs(file_path):
    """清理文件中的调试日志"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 移除 PresetManager 初始化日志
    patterns_to_remove = [
        r'        print\("\[PresetManager\] 开始初始化\.\.\."\)\n',
        r'        print\(f"\[PresetManager\] 配置目录: \{config_dir\}"\)\n',
        r'        print\(f"\[PresetManager\] 预设目录: \{self\.presets_dir\}"\)\n',
        r'        print\(f"\[PresetManager\] 索引文件: \{self\.index_file\}"\)\n',
        r'        print\("\[PresetManager\] 创建 PresetFileManager\.\.\."\)\n',
        r'        print\("\[PresetManager\] 创建 PresetIndexManager\.\.\."\)\n',
        r'        print\("\[PresetManager\] 定义内置预设\.\.\."\)\n',
        r'        print\(f"\[PresetManager\] 内置预设定义完成，共 \{len\(self\._presets\)\} 个"\)\n',
        r'        print\("\[PresetManager\] 加载用户预设\.\.\."\)\n',
        r'        print\(f"\[PresetManager\] 用户预设加载完成，总计 \{len\(self\._presets\)\} 个预设"\)\n',
        r'        print\("\[PresetManager\] 初始化完成"\)\n',
        
        # _load_custom_presets 方法中的日志
        r'            print\("\[PresetManager\] _load_custom_presets: 开始执行"\)\n',
        r'            print\("\[PresetManager\] _load_custom_presets: 获取预设索引列表"\)\n',
        r'            print\(f"\[PresetManager\] _load_custom_presets: 获取到 \{len\(preset_list\)\} 个预设索引"\)\n',
        r'                print\(f"\[PresetManager\] _load_custom_presets: 处理预设 \{preset_info\.get\(\'id\'\)\}, type=\{preset_type\}"\)\n',
        r'                    print\(f"\[PresetManager\] _load_custom_presets: 加载用户预设 \{preset_id\}"\)\n',
        r'                    print\(f"\[PresetManager\] _load_custom_presets: 从文件加载 \{preset_id\}"\)\n',
        r'                        print\(f"\[PresetManager\] _load_custom_presets: 预设数据加载成功: \{preset_data\}"\)\n',
        r'                        print\(f"\[PresetManager\] _load_custom_presets: 创建 PresetConfig 对象"\)\n',
        r'                            print\(f"\[PresetManager\] _load_custom_presets: PresetConfig 创建成功"\)\n',
        r'                            print\(f"\[PresetManager\] _load_custom_presets: PresetConfig 创建失败"\)\n',
        r'                        print\(f"\[PresetManager\] _load_custom_presets: 预设数据加载失败（返回 None）"\)\n',
        r'            print\(f"\[PresetManager\] _load_custom_presets: 完成，加载了 \{custom_count\} 个用户预设"\)\n',
        
        # export_current_config 方法中的日志
        r'            print\(f"\[PresetManager\] export_current_config 接收参数:"\)\n',
        r'            print\(f"  - env_id: \{env_id\}"\)\n',
        r'            print\(f"  - name: \{name\}"\)\n',
        r'            print\(f"  - description: \{description\}"\)\n',
        r'            print\(f"  - vram_requirement_override: \{vram_requirement_override\}"\)\n',
        r'                print\(f"\[PresetManager\] 使用传入的显存需求: \{vram_requirement\}"\)\n',
        r'                print\(f"\[PresetManager\] 检测到的预设: \{matched_preset_id\}"\)\n',
        r'                        print\(f"\[PresetManager\] 使用预设的显存需求: \{vram_requirement\}"\)\n',
        r'                        print\(f"\[PresetManager\] 估算的显存需求: \{vram_requirement\}"\)\n',
        r'                    print\(f"\[PresetManager\] 估算的显存需求: \{vram_requirement\}"\)\n',
        r'            print\(f"\[PresetManager\] 导出完成，配置字段数: \{len\(config_with_doc\)\}"\)\n',
        r'            print\(f"\[PresetManager\] 预设 \'\{preset_id\}\' 已更新: \{new_preset_data\}"\)\n',
        
        # Api 类中的日志
        r'                print\("\[Api\] 开始异步更新所有环境的依赖信息"\)\n',
        r'                    print\(f"\[Api\] 获取环境列表失败: \{result\.get\(\'error_message\'\)\}"\)\n',
        r'                print\(f"\[Api\] 找到 \{len\(environments\)\} 个环境，开始更新依赖信息"\)\n',
        r'                        print\(f"\[Api\] 更新环境 \'\{env_name\}\' \(\{env_id\}\) 的依赖信息"\)\n',
        r'                            print\(f"\[Api\] 环境 \'\{env_name\}\' 依赖信息更新成功"\)\n',
        r'                            print\(f"\[Api\] 环境 \'\{env_name\}\' 依赖信息更新失败: \{update_result\.get\(\'error_message\'\)\}"\)\n',
        r'                        print\(f"\[Api\] 更新环境 \'\{env_name\}\' 依赖信息时出错: \{e\}"\)\n',
        r'                print\("\[Api\] 所有环境的依赖信息更新完成"\)\n',
        r'                print\(f"\[Api\] 异步更新依赖信息失败: \{e\}"\)\n',
        r'        print\(f"\[Api\] export_preset 接收参数:"\)\n',
        r'        print\(f"  - env_id: \{env_id\}"\)\n',
        r'        print\(f"  - name: \{name\}"\)\n',
        r'        print\(f"  - description: \{description\}"\)\n',
        r'        print\(f"  - vram_requirement: \{vram_requirement\}"\)\n',
        r'        print\(f"\[Api\] 参数类型检查:"\)\n',
        r'        print\(f"  - env_id type: \{type\(env_id\)\}"\)\n',
        r'        print\(f"  - name type: \{type\(name\)\}"\)\n',
        r'        print\(f"  - description type: \{type\(description\)\}"\)\n',
        r'        print\(f"  - vram_requirement type: \{type\(vram_requirement\)\}"\)\n',
        
        # EnvironmentController 中的日志
        r'            print\(f"\[EnvironmentController\] export_preset 接收参数:"\)\n',
        r'            print\(f"  - env_id: \{env_id\}"\)\n',
        r'            print\(f"  - name: \{name\}"\)\n',
        r'            print\(f"  - description: \{description\}"\)\n',
        r'            print\(f"  - vram_requirement: \{vram_requirement\}"\)\n',
        r'            print\(f"\[save_file_dialog\] 对话框结果: \{result\}"\)\n',
        r'            print\(f"\[save_preset_to_file\] 预设已保存到: \{file_path\}"\)\n',
    ]
    
    for pattern in patterns_to_remove:
        content = re.sub(pattern, '', content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """主函数"""
    backend_dir = Path(__file__).parent.parent
    
    files_to_clean = [
        backend_dir / "src" / "core" / "env" / "preset_manager.py",
        backend_dir / "src" / "bridge" / "api.py",
        backend_dir / "src" / "bridge" / "controllers" / "environment_controller.py",
    ]
    
    cleaned_count = 0
    for file_path in files_to_clean:
        if file_path.exists():
            if clean_debug_logs(file_path):
                print(f"✓ 已清理: {file_path.relative_to(backend_dir)}")
                cleaned_count += 1
            else:
                print(f"- 无需清理: {file_path.relative_to(backend_dir)}")
        else:
            print(f"✗ 文件不存在: {file_path.relative_to(backend_dir)}")
    
    print(f"\n清理完成！共清理 {cleaned_count} 个文件")

if __name__ == "__main__":
    main()
