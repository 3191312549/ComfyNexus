"""
依赖分析器

负责调用 pipdeptree 工具并解析依赖树数据。
"""

import json
import re
from typing import Dict, List, Optional

from .models import DependencyNode
from ...utils.python_command import PythonCommandBuilder
from ...utils.logger import app_logger as logger


class DependencyAnalyzer:
    """依赖分析器
    
    负责调用 pipdeptree 工具并解析依赖树数据。
    """
    
    def __init__(self, python_path: str):
        """初始化依赖分析器
        
        Args:
            python_path: Python 解释器路径
        """
        self._builder = PythonCommandBuilder(python_path)
        logger.info(f"初始化 DependencyAnalyzer，Python 路径: {python_path}")
    
    def check_pipdeptree_installed(self) -> bool:
        """检查 pipdeptree 是否已安装
        
        通过执行 'pip show pipdeptree' 命令检查工具是否已安装。
        
        Returns:
            bool: 如果已安装返回 True，否则返回 False
        """
        try:
            cmd = self._builder.pip_show('pipdeptree')
            result = self._builder.run(cmd, timeout=10, use_proxy=True)
            
            if result.returncode == 0:
                version_match = re.search(r'Version: (.+)', result.stdout)
                version = version_match.group(1) if version_match else 'unknown'
                logger.info(f"pipdeptree 已安装，版本: {version}")
                return True
            else:
                logger.warning("pipdeptree 未安装")
                return False
                
        except Exception as e:
            logger.error(f"检查 pipdeptree 时出错: {str(e)}")
            return False
    
    def install_pipdeptree(self) -> Dict:
        """安装 pipdeptree 工具
        
        通过执行 'pip install pipdeptree' 命令自动安装工具。
        
        Returns:
            Dict: 包含安装结果的字典
                - success (bool): 安装是否成功
                - message (str): 成功消息（仅在成功时）
                - error_message (str): 错误消息（仅在失败时）
        """
        try:
            logger.info("开始安装 pipdeptree...")
            
            # 获取 PyPI 镜像配置
            index_url = None
            try:
                from ...utils.pypi_mirror import pypi_mirror_manager
                if pypi_mirror_manager.is_enabled():
                    source = pypi_mirror_manager.get_current_source()
                    if source:
                        index_url = source.get('pip_index')
                        logger.dev(f"[PyPI Mirror] pipdeptree 安装使用镜像: {index_url}")
                else:
                    logger.dev(f"[PyPI Mirror] pipdeptree 安装镜像加速未启用，使用官方源")
            except Exception as e:
                logger.dev(f"[PyPI Mirror] 获取镜像配置失败: {e}，使用官方源")
            
            cmd = self._builder.pip_install('pipdeptree', index_url=index_url)
            result = self._builder.run(cmd, timeout=60, use_proxy=True)
            
            if result.returncode == 0:
                logger.info("pipdeptree 安装成功")
                return {
                    'success': True,
                    'message': 'pipdeptree 安装成功'
                }
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"pipdeptree 安装失败: {error_msg}")
                return {
                    'success': False,
                    'error_message': f'安装失败: {error_msg}'
                }
                
        except Exception as e:
            logger.error(f"安装 pipdeptree 时出错: {str(e)}")
            return {
                'success': False,
                'error_message': f'安装时出错: {str(e)}'
            }

    def get_dependency_tree(self, timeout: int = 30) -> Dict:
        """获取依赖树数据
        
        通过执行 'python -m pipdeptree --json-tree' 命令获取依赖树的 JSON 数据。
        同时执行 'python -m pipdeptree' 获取警告信息（因为 --json-tree 不输出警告）。
        
        如果 pipdeptree 不可用，将自动回退到使用 pip show 的简化方案。
        
        Args:
            timeout: 命令执行超时时间（秒），默认 30 秒
            
        Returns:
            Dict: 包含依赖树数据的字典
                - success (bool): 是否成功
                - data (dict): 依赖树数据（仅在成功时）
                - warnings (str): 警告信息（来自 pipdeptree 的 stdout，可选）
                - error_message (str): 错误消息（仅在失败时）
                - fallback (bool): 是否使用了备用方案（可选）
        """
        try:
            logger.info(f"开始获取依赖树数据，超时时间: {timeout}秒")
            
            if not self.check_pipdeptree_installed():
                logger.warning("pipdeptree 未安装，尝试安装...")
                install_result = self.install_pipdeptree()
                if not install_result.get('success'):
                    logger.warning("pipdeptree 安装失败，使用备用方案")
                    return self._fallback_dependency_analysis(timeout)
            
            cmd = self._builder.python_module('pipdeptree', '--json-tree')
            result = self._builder.run(cmd, timeout=timeout, use_proxy=False)
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout
                logger.error(f"pipdeptree 执行失败: {error_msg}")
                logger.warning("pipdeptree 执行失败，使用备用方案")
                return self._fallback_dependency_analysis(timeout)
            
            logger.info("依赖树数据获取成功")
            
            parse_result = self._parse_pipdeptree_output(result.stdout)
            
            if not parse_result.get('success'):
                logger.warning("pipdeptree 输出解析失败，使用备用方案")
                return self._fallback_dependency_analysis(timeout)
            
            try:
                logger.debug("获取 pipdeptree 警告信息...")
                warning_cmd = self._builder.python_module('pipdeptree')
                warning_result = self._builder.run(warning_cmd, timeout=timeout, use_proxy=False)
                
                if warning_result.returncode == 0 and warning_result.stderr:
                    if 'Warning!!!' in warning_result.stderr:
                        logger.info("检测到 pipdeptree 警告信息")
                        parse_result['warnings'] = warning_result.stderr
                        logger.debug(f"警告信息长度: {len(warning_result.stderr)} 字符")
                    else:
                        logger.debug("未检测到警告信息")
                else:
                    logger.debug("未检测到警告信息")
                
            except Exception as e:
                logger.warning(f"获取警告信息时出错: {str(e)}，跳过")
            
            return parse_result
                
        except FileNotFoundError:
            logger.error(f"Python 解释器未找到")
            return {
                'success': False,
                'error_message': f'Python 解释器未找到'
            }
        except Exception as e:
            logger.error(f"执行 pipdeptree 时出错: {str(e)}")
            logger.warning("尝试使用备用方案")
            try:
                return self._fallback_dependency_analysis(timeout)
            except Exception as fallback_e:
                return {
                    'success': False,
                    'error_message': f'执行 pipdeptree 时出错: {str(e)}，备用方案也失败: {str(fallback_e)}'
                }
    
    def _fallback_dependency_analysis(self, timeout: int = 30) -> Dict:
        """
        备用依赖分析方案
        
        当 pipdeptree 不可用时，使用 pip list 和 pip show 获取基本的依赖信息。
        注意：此方案无法获取完整的依赖树，只能获取已安装包的列表。
        
        Args:
            timeout: 命令执行超时时间（秒）
            
        Returns:
            Dict: 包含依赖数据的字典
        """
        logger.info("使用备用方案获取依赖信息")
        
        try:
            cmd = self._builder.pip_list(format='json')
            result = self._builder.run(cmd, timeout=timeout, use_proxy=True)
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout
                logger.error(f"pip list 执行失败: {error_msg}")
                return {
                    'success': False,
                    'error_message': f'获取包列表失败: {error_msg}',
                    'fallback': True
                }
            
            packages = json.loads(result.stdout)
            
            tree = []
            for pkg in packages:
                node = DependencyNode(
                    id=f"{pkg['name']}-{pkg['version']}",
                    package_name=pkg['name'],
                    installed_version=pkg['version'],
                    required_version=None,
                    depth=0,
                    parent_id=None
                )
                tree.append(node)
            
            logger.info(f"备用方案成功获取 {len(tree)} 个包")
            
            return {
                'success': True,
                'tree': [node.to_dict() for node in tree],
                'stats': {
                    'total_packages': len(tree),
                    'max_depth': 0,
                    'note': '使用备用方案，无法获取依赖关系'
                },
                'fallback': True,
                'fallback_message': 'pipdeptree 不可用，使用简化方案。无法显示包之间的依赖关系。'
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"解析 pip list 输出失败: {str(e)}")
            return {
                'success': False,
                'error_message': f'解析包列表失败: {str(e)}',
                'fallback': True
            }
        except Exception as e:
            logger.error(f"备用方案执行失败: {str(e)}")
            return {
                'success': False,
                'error_message': f'备用方案执行失败: {str(e)}',
                'fallback': True
            }
    
    def _parse_pipdeptree_output(self, json_str: str) -> Dict:
        """解析 pipdeptree 的 JSON 输出
        
        Args:
            json_str: pipdeptree 输出的 JSON 字符串
            
        Returns:
            Dict: 包含解析结果的字典
                - success (bool): 是否成功
                - tree (list): DependencyNode 列表（仅在成功时）
                - stats (dict): 统计信息（仅在成功时）
                - error_message (str): 错误消息（仅在失败时）
        """
        try:
            raw_data = json.loads(json_str)
            
            if not isinstance(raw_data, list):
                raise ValueError('pipdeptree 输出格式错误：期望数组类型')
            
            tree = []
            for item in raw_data:
                try:
                    node = self._parse_dependency_node(item, depth=0)
                    tree.append(node)
                except KeyError as e:
                    logger.warning(f'跳过无效节点：缺少字段 {e}')
                    continue
            
            return {
                'success': True,
                'tree': [node.to_dict() for node in tree],
                'stats': self._calculate_tree_stats(tree)
            }
            
        except json.JSONDecodeError as e:
            logger.error(f'JSON 解析失败: {str(e)}')
            logger.debug(f'原始输出: {json_str[:500]}...')
            
            return {
                'success': False,
                'error_message': f'依赖数据解析失败：JSON 格式错误 ({str(e)})'
            }
        except Exception as e:
            logger.error(f'解析依赖树时出错: {str(e)}')
            
            return {
                'success': False,
                'error_message': f'依赖数据解析失败：{str(e)}'
            }
    
    def _parse_dependency_node(self, item: dict, depth: int, parent_id: Optional[str] = None) -> DependencyNode:
        """解析单个依赖节点
        
        Args:
            item: pipdeptree 输出的节点数据
            depth: 节点深度
            parent_id: 父节点 ID
            
        Returns:
            DependencyNode: 解析后的依赖节点
        """
        if 'package' in item:
            package = item['package']
            package_name = package['package_name']
            installed_version = package['installed_version']
            required_version = item.get('required_version')
        else:
            package_name = item['package_name']
            installed_version = item['installed_version']
            required_version = item.get('required_version')
        
        node_id = f"{package_name}-{installed_version}"
        
        node = DependencyNode(
            id=node_id,
            package_name=package_name,
            installed_version=installed_version,
            required_version=required_version,
            depth=depth,
            parent_id=parent_id
        )
        
        dependencies = item.get('dependencies', [])
        for dep in dependencies:
            child_node = self._parse_dependency_node(dep, depth + 1, node_id)
            node.dependencies.append(child_node)
        
        return node
    
    def _calculate_tree_stats(self, tree: List[DependencyNode]) -> Dict:
        """计算依赖树统计信息
        
        Args:
            tree: 依赖树
            
        Returns:
            Dict: 统计信息
                - total_packages (int): 总包数
                - max_depth (int): 最大深度
        """
        total_packages = 0
        max_depth = 0
        
        def count_nodes(node: DependencyNode):
            nonlocal total_packages, max_depth
            total_packages += 1
            max_depth = max(max_depth, node.depth)
            
            for dep in node.dependencies:
                count_nodes(dep)
        
        for node in tree:
            count_nodes(node)
        
        return {
            'total_packages': total_packages,
            'max_depth': max_depth
        }
