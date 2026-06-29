"""
本地节点扫描器

扫描 ComfyUI custom_nodes 目录，提取所有节点信息：
- V1 节点: NODE_CLASS_MAPPINGS
- V3 节点: io.ComfyNode 子类
- 前端节点: app.registerExtension
"""

import ast
import re
import time
import warnings
import configparser
import concurrent.futures
from pathlib import Path
from typing import Set, Tuple, Optional, Dict, List, Any

from backend.src.core.workflow.models import (
    LocalNodeMap,
    LocalNodeInfo,
    LocalPluginInfo,
    ScanResult,
    COMFY_CORE_URL,
)
from backend.src.core.workflow.cache_manager import LocalNodeMapCacheManager
from backend.src.utils.logger import app_logger as logger

EXCLUDE_DIRS = {'__pycache__', '.git', 'tests', 'test', 'testing', 'examples', 'docs', 'scripts'}
EXCLUDE_FILE_PATTERNS_RAW = [
    r'_test\.py$', r'test_.*\.py$', r'_tests\.py$',
    r'setup\.py$', r'__main__\.py$',
]
EXCLUDE_FILE_PATTERNS = [re.compile(p) for p in EXCLUDE_FILE_PATTERNS_RAW]

QUICK_SCAN_PATTERNS = [
    re.compile(r'NODE_CLASS_MAPPINGS'),
    re.compile(r'NODE_CONFIG'),
    re.compile(r'io\.ComfyNode'),
    re.compile(r'class\s+\w+\(.*ComfyNode'),
    re.compile(r'@register_node'),
]

JS_QUICK_SCAN_PATTERNS = [
    re.compile(r'app\.registerExtension'),
    re.compile(r'registerExtension\s*\('),
    re.compile(r'ComfyWidgets\.registerWidget'),
]

JS_NODE_PATTERN = re.compile(
    r'app\.registerExtension\s*\(\s*\{[\s\S]*?name\s*:\s*["\']([^"\']+)["\']'
)


def _should_skip_file(py_file: Path) -> bool:
    for part in py_file.parts:
        if part in EXCLUDE_DIRS:
            return True
    filename = py_file.name
    for pattern in EXCLUDE_FILE_PATTERNS:
        if re.search(pattern, filename):
            return True
    return False


def _quick_scan_file(content: str) -> bool:
    for pattern in QUICK_SCAN_PATTERNS:
        if pattern.search(content):
            return True
    return False


def _quick_scan_js_file(content: str) -> bool:
    """快速筛选 JS 文件是否包含节点注册"""
    for pattern in JS_QUICK_SCAN_PATTERNS:
        if pattern.search(content):
            return True
    return False


def _has_comfy_node_base(class_node: ast.ClassDef) -> bool:
    for base in class_node.bases:
        if isinstance(base, ast.Name) and base.id == 'ComfyNode':
            return True
        elif isinstance(base, ast.Attribute):
            if base.attr == 'ComfyNode':
                return True
    return False


def _extract_keyword_value(call_node: ast.Call, keyword: str) -> Optional[str]:
    for kw in call_node.keywords:
        if kw.arg == keyword:
            if isinstance(kw.value, ast.Constant):
                if isinstance(kw.value.value, str):
                    return kw.value.value
            elif hasattr(ast, 'Str') and isinstance(kw.value, ast.Str):
                return kw.value.s
    return None


def _is_schema_call(call_node: ast.Call) -> bool:
    func = call_node.func
    if isinstance(func, ast.Name) and func.id == 'Schema':
        return True
    elif isinstance(func, ast.Attribute) and func.attr == 'Schema':
        return True
    return False


def _extract_node_id_from_schema(class_node: ast.ClassDef) -> Optional[str]:
    for item in class_node.body:
        if isinstance(item, ast.FunctionDef) and item.name == 'define_schema':
            for stmt in ast.walk(item):
                if isinstance(stmt, ast.Call):
                    if _is_schema_call(stmt):
                        node_id = _extract_keyword_value(stmt, 'node_id')
                        if node_id:
                            return node_id
    return None


def _extract_v3_nodes(code: str) -> Set[str]:
    nodes = set()
    try:
        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', category=SyntaxWarning)
            warnings.filterwarnings('ignore', category=DeprecationWarning)
            tree = ast.parse(code)
    except (SyntaxError, UnicodeDecodeError, MemoryError, RecursionError, ValueError):
        return nodes

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            if _has_comfy_node_base(node):
                node_id = _extract_node_id_from_schema(node)
                if node_id:
                    nodes.add(node_id)
                else:
                    nodes.add(node.name)
    return nodes


def _extract_class_name_attributes(tree: ast.AST) -> Dict[str, str]:
    """
    提取类定义中的 NAME 属性值
    
    处理模式:
    1. NAME = "LiteralString"
    2. NAME = get_name('Seed') - 需要解析函数调用
    
    Returns:
        {类名: NAME属性值} 字典
    """
    class_name_map: Dict[str, str] = {}
    func_defs: Dict[str, ast.FunctionDef] = {}
    global_vars: Dict[str, str] = {}
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if isinstance(node.value, ast.Constant):
                        global_vars[target.id] = node.value.value
        if isinstance(node, ast.FunctionDef):
            func_defs[node.name] = node
    
    def resolve_func_call(call_node: ast.Call) -> Optional[str]:
        """解析函数调用，返回字符串结果"""
        if isinstance(call_node.func, ast.Name):
            func_name = call_node.func.id
            
            if func_name == 'get_name':
                if call_node.args:
                    first_arg = call_node.args[0]
                    if isinstance(first_arg, ast.Constant):
                        name_arg = first_arg.value
                        namespace = global_vars.get('NAMESPACE', 'rgthree')
                        return f'{name_arg} ({namespace})'
            
            if func_name in func_defs:
                func_def = func_defs[func_name]
                for stmt in func_def.body:
                    if isinstance(stmt, ast.Return) and stmt.value:
                        return resolve_expr(stmt.value, call_node.args)
        
        return None
    
    def resolve_expr(expr: ast.expr, call_args: list = None) -> Optional[str]:
        """递归解析表达式"""
        if isinstance(expr, ast.Constant):
            return expr.value
        
        if isinstance(expr, ast.BinOp) and isinstance(expr.op, ast.Mod):
            left = resolve_expr(expr.left)
            right = resolve_expr(expr.right)
            if left and right:
                try:
                    return left % right
                except:
                    pass
        
        if isinstance(expr, ast.Call):
            if isinstance(expr.func, ast.Attribute):
                if expr.func.attr == 'format':
                    format_str = resolve_expr(expr.func.value)
                    if format_str and call_args:
                        resolved_args = []
                        for arg in expr.args:
                            if isinstance(arg, ast.Name):
                                if arg.id == 'name' and call_args:
                                    if call_args and isinstance(call_args[0], ast.Constant):
                                        resolved_args.append(call_args[0].value)
                                elif arg.id in global_vars:
                                    resolved_args.append(global_vars[arg.id])
                            elif isinstance(arg, ast.Constant):
                                resolved_args.append(arg.value)
                        if len(resolved_args) == len(expr.args):
                            try:
                                return format_str.format(*resolved_args)
                            except:
                                pass
        
        return None
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            class_name = node.name
            for item in node.body:
                if isinstance(item, ast.Assign):
                    for target in item.targets:
                        if isinstance(target, ast.Name) and target.id == 'NAME':
                            if isinstance(item.value, ast.Constant):
                                class_name_map[class_name] = item.value.value
                            elif isinstance(item.value, ast.Call):
                                resolved = resolve_func_call(item.value)
                                if resolved:
                                    class_name_map[class_name] = resolved
    
    return class_name_map


def _parse_python_file(py_file: Path) -> Tuple[Set[str], Set[str]]:
    v1_nodes = set()
    v3_nodes = set()

    try:
        content = py_file.read_text(encoding='utf-8', errors='ignore')

        if not _quick_scan_file(content):
            return v1_nodes, v3_nodes

        v3_nodes = _extract_v3_nodes(content)

        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', category=SyntaxWarning)
            tree = ast.parse(content)

        class_name_map = _extract_class_name_attributes(tree)

        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'NODE_CLASS_MAPPINGS':
                        if isinstance(node.value, ast.Dict):
                            for key in node.value.keys:
                                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                                    v1_nodes.add(key.value)
                                elif isinstance(key, ast.Attribute):
                                    if isinstance(key.value, ast.Name) and key.attr == 'NAME':
                                        class_name = key.value.id
                                        if class_name in class_name_map:
                                            v1_nodes.add(class_name_map[class_name])
                                        else:
                                            v1_nodes.add(class_name)

            elif isinstance(node, ast.Subscript):
                if isinstance(node.value, ast.Name) and node.value.id == 'NODE_CLASS_MAPPINGS':
                    if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
                        v1_nodes.add(node.slice.value)

        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'NODE_CONFIG':
                        if isinstance(node.value, ast.Dict):
                            for key in node.value.keys:
                                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                                    v1_nodes.add(key.value)

        # 检测动态注册模式
        # 模式: mappings = {...} 后续被添加到 NODE_CLASS_MAPPINGS
        DYNAMIC_MAPPING_VAR_NAMES = {'mappings', 'node_mappings', 'node_mapping', 'nodes_map'}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        var_name_lower = target.id.lower()
                        if var_name_lower in DYNAMIC_MAPPING_VAR_NAMES or 'mapping' in var_name_lower:
                            if isinstance(node.value, ast.Dict):
                                for key in node.value.keys:
                                    if isinstance(key, ast.Constant) and isinstance(key.value, str):
                                        v1_nodes.add(key.value)

    except Exception as e:
        logger.debug(f"解析文件失败: {py_file}, 错误: {e}")

    return v1_nodes, v3_nodes


def _parse_js_file(js_file: Path) -> Set[str]:
    nodes = set()
    try:
        content = js_file.read_text(encoding='utf-8', errors='ignore')
        
        # 快速筛选
        if not _quick_scan_js_file(content):
            return nodes
        
        # 提取节点名
        matches = JS_NODE_PATTERN.findall(content)
        nodes.update(matches)
    except Exception:
        pass
    return nodes


def _get_github_url(plugin_dir: Path) -> Optional[str]:
    # 方法 1: 从 .git/config 获取
    git_config = plugin_dir / '.git' / 'config'
    if git_config.exists():
        try:
            config = configparser.ConfigParser(strict=False)
            config.read(git_config)
            for section in config.sections():
                if section.startswith('remote '):
                    url = config.get(section, 'url', fallback=None)
                    if url:
                        return _normalize_git_url(url)
        except Exception:
            pass
    
    # 方法 2: 从 .git/FETCH_HEAD 获取
    fetch_head = plugin_dir / '.git' / 'FETCH_HEAD'
    if fetch_head.exists():
        try:
            content = fetch_head.read_text(encoding='utf-8', errors='ignore')
            for line in content.strip().split('\n'):
                if '\t' in line and line.count('\t') >= 3:
                    parts = line.split('\t')
                    if len(parts) >= 3:
                        url = parts[2]
                        if url and ('github.com' in url or 'git@' in url):
                            return _normalize_git_url(url)
        except Exception:
            pass
    
    return None


def _normalize_git_url(url: str) -> str:
    """标准化 Git URL"""
    if not url:
        return ""
    if url.endswith('.git'):
        url = url[:-4]
    return url.replace('git@github.com:', 'https://github.com/').rstrip('/')


def _collect_plugin_context(py_files: List[Path]) -> Dict[str, Any]:
    """
    收集插件级别的上下文信息（全局变量、函数定义、类名映射）
    
    用于解析跨文件的属性引用，如：
    - constants.py 定义 NAMESPACE='rgthree' 和 get_name 函数
    - seed.py 使用 NAME = get_name('Seed')
    - __init__.py 使用 RgthreeSeed.NAME
    
    Returns:
        {
            'global_vars': {变量名: 值},
            'func_defs': {函数名: 返回值模板},
            'class_name_map': {类名: NAME属性值}
        }
    """
    context = {
        'global_vars': {},
        'func_defs': {},
        'class_name_map': {}
    }
    
    for py_file in py_files:
        try:
            content = py_file.read_text(encoding='utf-8', errors='ignore')
            with warnings.catch_warnings():
                warnings.filterwarnings('ignore', category=SyntaxWarning)
                tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            if isinstance(node.value, ast.Constant):
                                context['global_vars'][target.id] = node.value.value
                
                if isinstance(node, ast.FunctionDef):
                    if node.name == 'get_name':
                        for stmt in node.body:
                            if isinstance(stmt, ast.Return) and stmt.value:
                                context['func_defs']['get_name'] = stmt.value
                
                if isinstance(node, ast.ClassDef):
                    class_name = node.name
                    for item in node.body:
                        if isinstance(item, ast.Assign):
                            for target in item.targets:
                                if isinstance(target, ast.Name) and target.id == 'NAME':
                                    resolved = _resolve_name_attribute(item.value, context)
                                    if resolved:
                                        context['class_name_map'][class_name] = resolved
                                
        except Exception:
            pass
    
    return context


def _resolve_name_attribute(value_node: ast.expr, context: Dict[str, Any]) -> Optional[str]:
    """
    解析 NAME 属性的实际值
    
    支持的模式：
    1. NAME = "LiteralString"
    2. NAME = get_name('Seed') -> "Seed (rgthree)"
    """
    if isinstance(value_node, ast.Constant):
        return value_node.value
    
    if isinstance(value_node, ast.Call):
        if isinstance(value_node.func, ast.Name):
            func_name = value_node.func.id
            
            if func_name == 'get_name':
                if value_node.args:
                    first_arg = value_node.args[0]
                    if isinstance(first_arg, ast.Constant):
                        name_arg = first_arg.value
                        namespace = context['global_vars'].get('NAMESPACE', 'rgthree')
                        return f'{name_arg} ({namespace})'
                
                if 'get_name' in context['func_defs']:
                    return_stmt = context['func_defs']['get_name']
                    return _resolve_format_call(return_stmt, value_node.args, context)
    
    return None


def _resolve_format_call(expr: ast.expr, call_args: list, context: Dict[str, Any]) -> Optional[str]:
    """解析 .format() 调用"""
    if isinstance(expr, ast.Call):
        if isinstance(expr.func, ast.Attribute) and expr.func.attr == 'format':
            if isinstance(expr.func.value, ast.Constant):
                format_str = expr.func.value.value
                resolved_args = []
                for arg in expr.args:
                    if isinstance(arg, ast.Name):
                        if arg.id == 'name' and call_args:
                            if call_args and isinstance(call_args[0], ast.Constant):
                                resolved_args.append(call_args[0].value)
                        elif arg.id in context['global_vars']:
                            resolved_args.append(context['global_vars'][arg.id])
                    elif isinstance(arg, ast.Constant):
                        resolved_args.append(arg.value)
                
                if len(resolved_args) == len(expr.args):
                    try:
                        return format_str.format(*resolved_args)
                    except:
                        pass
    
    return None


def _parse_python_file_with_context(py_file: Path, context: Dict[str, Any]) -> Tuple[Set[str], Set[str]]:
    """使用插件上下文解析 Python 文件"""
    v1_nodes = set()
    v3_nodes = set()

    try:
        content = py_file.read_text(encoding='utf-8', errors='ignore')

        if not _quick_scan_file(content):
            return v1_nodes, v3_nodes

        v3_nodes = _extract_v3_nodes(content)

        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', category=SyntaxWarning)
            tree = ast.parse(content)

        class_name_map: Dict[str, str] = dict(context.get('class_name_map', {}))
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_name = node.name
                if class_name in class_name_map:
                    continue
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name) and target.id == 'NAME':
                                resolved = _resolve_name_attribute(item.value, context)
                                if resolved:
                                    class_name_map[class_name] = resolved

        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'NODE_CLASS_MAPPINGS':
                        if isinstance(node.value, ast.Dict):
                            for key in node.value.keys:
                                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                                    v1_nodes.add(key.value)
                                elif isinstance(key, ast.Attribute):
                                    if isinstance(key.value, ast.Name) and key.attr == 'NAME':
                                        class_name = key.value.id
                                        if class_name in class_name_map:
                                            v1_nodes.add(class_name_map[class_name])
                                        else:
                                            v1_nodes.add(class_name)

            elif isinstance(node, ast.Subscript):
                if isinstance(node.value, ast.Name) and node.value.id == 'NODE_CLASS_MAPPINGS':
                    if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
                        v1_nodes.add(node.slice.value)

        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'NODE_CONFIG':
                        if isinstance(node.value, ast.Dict):
                            for key in node.value.keys:
                                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                                    v1_nodes.add(key.value)

    except Exception as e:
        logger.debug(f"解析文件失败: {py_file}, 错误: {e}")

    return v1_nodes, v3_nodes


def _scan_plugin(plugin_dir: Path) -> Tuple[str, Optional[str], Set[str], Set[str], Set[str], int]:
    plugin_name = plugin_dir.name
    github_url = _get_github_url(plugin_dir)

    py_files = [f for f in plugin_dir.glob("**/*.py") if not _should_skip_file(f)]

    v1_nodes = set()
    v3_nodes = set()
    scanned_count = 0

    context = _collect_plugin_context(py_files)

    for py_file in py_files:
        v1, v3 = _parse_python_file_with_context(py_file, context)
        v1_nodes.update(v1)
        v3_nodes.update(v3)
        scanned_count += 1

    frontend_nodes = set()
    # 扫描 web 目录
    web_dir = plugin_dir / "web"
    if web_dir.exists():
        for js_file in web_dir.glob("**/*.js"):
            frontend_nodes.update(_parse_js_file(js_file))
    
    # 扫描 js 目录
    js_dir = plugin_dir / "js"
    if js_dir.exists():
        for js_file in js_dir.glob("**/*.js"):
            frontend_nodes.update(_parse_js_file(js_file))
    
    return plugin_name, github_url, v1_nodes, v3_nodes, frontend_nodes, scanned_count


class LocalNodeScanner:
    """本地节点扫描器"""

    def __init__(self, comfyui_path: str):
        self.comfyui_path = Path(comfyui_path)
        self.cache_manager = LocalNodeMapCacheManager(comfyui_path)

    def scan(self, force: bool = False) -> Tuple[LocalNodeMap, ScanResult]:
        start_time = time.time()

        if not force and not self.cache_manager.needs_rescan():
            cached = self.cache_manager.load()
            if cached:
                elapsed = time.time() - start_time
                result = ScanResult(
                    success=True,
                    plugin_count=len(cached.plugins),
                    node_count=len(cached.nodes),
                    v1_count=sum(p.v1_count for p in cached.plugins.values()),
                    v3_count=sum(p.v3_count for p in cached.plugins.values()),
                    frontend_count=sum(p.frontend_count for p in cached.plugins.values()),
                    elapsed_seconds=elapsed,
                )
                logger.info(f"使用缓存，耗时 {elapsed:.2f}s")
                return cached, result

        return self._do_scan(start_time)

    def _do_scan(self, start_time: float) -> Tuple[LocalNodeMap, ScanResult]:
        custom_nodes_path = self.comfyui_path / "custom_nodes"

        if not custom_nodes_path.exists():
            elapsed = time.time() - start_time
            result = ScanResult(
                success=False,
                plugin_count=0,
                node_count=0,
                v1_count=0,
                v3_count=0,
                frontend_count=0,
                elapsed_seconds=elapsed,
                error=f"custom_nodes 目录不存在: {custom_nodes_path}",
            )
            return LocalNodeMap(comfyui_path=str(self.comfyui_path)), result

        plugin_dirs = [
            d for d in custom_nodes_path.iterdir()
            if d.is_dir()
            and d.name not in ('__pycache__', '.disabled')
            and not d.name.endswith('.disabled')
        ]

        logger.info(f"开始扫描 {len(plugin_dirs)} 个插件...")

        v1_nodes: Dict[str, str] = {}
        v3_nodes: Dict[str, str] = {}
        frontend_nodes: Dict[str, str] = {}
        plugins: Dict[str, LocalPluginInfo] = {}

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(_scan_plugin, d): d for d in plugin_dirs}

            for future in concurrent.futures.as_completed(futures):
                plugin_name, github_url, v1, v3, fe, _ = future.result()

                for node_name in v1:
                    v1_nodes[node_name] = plugin_name
                for node_name in v3:
                    v3_nodes[node_name] = plugin_name
                for node_name in fe:
                    frontend_nodes[node_name] = plugin_name

                plugins[plugin_name] = LocalPluginInfo(
                    github_url=github_url,
                    v1_count=len(v1),
                    v3_count=len(v3),
                    frontend_count=len(fe),
                    v1_nodes=list(v1),
                    v3_nodes=list(v3),
                    frontend_nodes=list(fe),
                )

        nodes: Dict[str, LocalNodeInfo] = {}
        for node_name, plugin_name in v1_nodes.items():
            nodes[node_name] = LocalNodeInfo(
                node_type="v1",
                github_url=plugins[plugin_name].github_url or "",
                plugin_name=plugin_name,
            )
        for node_name, plugin_name in v3_nodes.items():
            nodes[node_name] = LocalNodeInfo(
                node_type="v3",
                github_url=plugins[plugin_name].github_url or "",
                plugin_name=plugin_name,
            )
        for node_name, plugin_name in frontend_nodes.items():
            nodes[node_name] = LocalNodeInfo(
                node_type="frontend",
                github_url=plugins[plugin_name].github_url or "",
                plugin_name=plugin_name,
            )

        node_map = LocalNodeMap(
            comfyui_path=str(self.comfyui_path),
            nodes=nodes,
            plugins=plugins,
        )

        self.cache_manager.save(node_map)

        elapsed = time.time() - start_time
        result = ScanResult(
            success=True,
            plugin_count=len(plugins),
            node_count=len(nodes),
            v1_count=len(v1_nodes),
            v3_count=len(v3_nodes),
            frontend_count=len(frontend_nodes),
            elapsed_seconds=elapsed,
        )

        logger.info(f"扫描完成: {len(plugins)} 个插件, {len(nodes)} 个节点, 耗时 {elapsed:.2f}s")

        return node_map, result

    def get_cached(self) -> Optional[LocalNodeMap]:
        return self.cache_manager.load()

    def clear_cache(self) -> bool:
        return self.cache_manager.clear()

    def resolve_node(self, node_type: str) -> Optional[LocalNodeInfo]:
        node_map = self.cache_manager.load()
        if node_map:
            return node_map.nodes.get(node_type)
        return None
