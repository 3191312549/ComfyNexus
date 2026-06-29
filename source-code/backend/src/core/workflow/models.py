"""
工作流数据模型

定义工作流管理所需的数据结构
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class WorkflowMetadata:
    """工作流扩展元数据（存储在 metadata.json 中）"""
    name: str = ""
    description: str = ""
    tags: List[str] = field(default_factory=list)
    is_favorite: bool = False
    folder_id: Optional[str] = None
    previews: List[str] = field(default_factory=list)
    has_auto_preview: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "WorkflowMetadata":
        return cls(
            name=data.get("name", ""),
            description=data.get("description", ""),
            tags=data.get("tags", []),
            is_favorite=data.get("isFavorite", data.get("is_favorite", False)),
            folder_id=data.get("folderId", data.get("folder_id")),
            previews=data.get("previews", []),
            has_auto_preview=data.get("hasAutoPreview", data.get("has_auto_preview", False)),
        )


@dataclass
class WorkflowFolder:
    """虚拟文件夹结构（用于分类管理工作流）"""
    id: str
    name: str
    parent_id: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "parentId": self.parent_id,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "WorkflowFolder":
        return cls(
            id=data.get("id", ""),
            name=data.get("name", ""),
            parent_id=data.get("parentId", data.get("parent_id")),
            created_at=data.get("createdAt", data.get("created_at", "")),
            updated_at=data.get("updatedAt", data.get("updated_at", "")),
        )


@dataclass
class WorkflowMetadataStore:
    """工作流元数据存储结构"""
    version: int = 1
    workflows: Dict[str, WorkflowMetadata] = field(default_factory=dict)
    folders: List[WorkflowFolder] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "workflows": {
                k: v.to_dict() for k, v in self.workflows.items()
            },
            "folders": [f.to_dict() for f in self.folders],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "WorkflowMetadataStore":
        workflows_data = data.get("workflows", {})
        workflows = {
            k: WorkflowMetadata.from_dict(v) for k, v in workflows_data.items()
        }
        folders_data = data.get("folders", [])
        folders = [WorkflowFolder.from_dict(f) for f in folders_data]
        return cls(
            version=data.get("version", 1),
            workflows=workflows,
            folders=folders,
        )


@dataclass
class Workflow:
    """工作流完整数据结构（返回给前端）"""
    id: str
    name: str
    description: str
    preview: Optional[str]
    previews: List[str]
    nodes: int
    tags: List[str]
    is_favorite: bool
    folder_id: Optional[str]
    raw_data: Dict[str, Any]
    created_at: str
    updated_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "preview": self.preview,
            "previews": self.previews,
            "nodes": self.nodes,
            "tags": self.tags,
            "isFavorite": self.is_favorite,
            "folderId": self.folder_id,
            "rawData": self.raw_data,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


@dataclass
class PluginDependency:
    """插件依赖信息"""
    github_url: str
    name: str
    color: str
    node_count: int
    nodes: List[str]
    install_status: str = "unknown"

    def to_dict(self) -> dict:
        return {
            "githubUrl": self.github_url,
            "name": self.name,
            "color": self.color,
            "nodeCount": self.node_count,
            "nodes": self.nodes,
            "installStatus": self.install_status,
        }


COMFY_CORE_URL = "https://github.com/comfyanonymous/ComfyUI"

PLUGIN_COLORS: Dict[str, str] = {
    COMFY_CORE_URL: "#4CAF50",
    "unknown": "#9E9E9E",
}


def get_plugin_color(github_url: str) -> str:
    if not github_url:
        return PLUGIN_COLORS["unknown"]
    if github_url == COMFY_CORE_URL:
        return PLUGIN_COLORS[COMFY_CORE_URL]
    import hashlib
    import colorsys
    hash_val = int(hashlib.md5(github_url.encode()).hexdigest()[:6], 16)
    hue = (hash_val % 360) / 360.0  # 转换为 0-1 范围
    # HSL to RGB to Hex
    r, g, b = colorsys.hls_to_rgb(hue, 0.5, 0.7)  # H, L, S
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"


def get_plugin_name(github_url: str, plugin_info: Optional[Dict] = None) -> str:
    if plugin_info and plugin_info.get("name"):
        return plugin_info["name"]
    if not github_url:
        return "Unknown"
    if github_url == COMFY_CORE_URL:
        return "ComfyUI Core"
    parts = github_url.rstrip("/").split("/")
    if len(parts) >= 1:
        return parts[-1]
    return "Unknown"


def get_plugin_github_url(github_url: str) -> Optional[str]:
    return github_url if github_url else None


@dataclass
class LocalNodeInfo:
    """本地节点信息"""
    node_type: str  # "v1" | "v3" | "frontend"
    github_url: str
    plugin_name: str

    def to_dict(self) -> dict:
        return {
            "nodeType": self.node_type,
            "githubUrl": self.github_url,
            "pluginName": self.plugin_name,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LocalNodeInfo":
        return cls(
            node_type=data.get("nodeType", data.get("node_type", "")),
            github_url=data.get("githubUrl", data.get("github_url", "")),
            plugin_name=data.get("pluginName", data.get("plugin_name", "")),
        )


@dataclass
class LocalPluginInfo:
    """本地插件信息"""
    github_url: Optional[str]
    v1_count: int
    v3_count: int
    frontend_count: int
    v1_nodes: List[str] = field(default_factory=list)
    v3_nodes: List[str] = field(default_factory=list)
    frontend_nodes: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "githubUrl": self.github_url,
            "v1Count": self.v1_count,
            "v3Count": self.v3_count,
            "frontendCount": self.frontend_count,
            "v1Nodes": self.v1_nodes,
            "v3Nodes": self.v3_nodes,
            "frontendNodes": self.frontend_nodes,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LocalPluginInfo":
        return cls(
            github_url=data.get("githubUrl", data.get("github_url")),
            v1_count=data.get("v1Count", data.get("v1_count", 0)),
            v3_count=data.get("v3Count", data.get("v3_count", 0)),
            frontend_count=data.get("frontendCount", data.get("frontend_count", 0)),
            v1_nodes=data.get("v1Nodes", data.get("v1_nodes", [])),
            v3_nodes=data.get("v3Nodes", data.get("v3_nodes", [])),
            frontend_nodes=data.get("frontendNodes", data.get("frontend_nodes", [])),
        )

    @property
    def total_count(self) -> int:
        return self.v1_count + self.v3_count + self.frontend_count


LOCAL_NODE_MAP_VERSION = 1
LOCAL_NODE_MAP_CACHE_EXPIRE_HOURS = 24


@dataclass
class LocalNodeMap:
    """本地节点映射表"""
    version: int = LOCAL_NODE_MAP_VERSION
    timestamp: float = 0.0
    comfyui_path: str = ""
    nodes: Dict[str, LocalNodeInfo] = field(default_factory=dict)
    plugins: Dict[str, LocalPluginInfo] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "timestamp": self.timestamp,
            "comfyuiPath": self.comfyui_path,
            "nodes": {k: v.to_dict() for k, v in self.nodes.items()},
            "plugins": {k: v.to_dict() for k, v in self.plugins.items()},
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LocalNodeMap":
        nodes_data = data.get("nodes", {})
        nodes = {k: LocalNodeInfo.from_dict(v) for k, v in nodes_data.items()}
        plugins_data = data.get("plugins", {})
        plugins = {k: LocalPluginInfo.from_dict(v) for k, v in plugins_data.items()}
        return cls(
            version=data.get("version", LOCAL_NODE_MAP_VERSION),
            timestamp=data.get("timestamp", 0.0),
            comfyui_path=data.get("comfyuiPath", data.get("comfyui_path", "")),
            nodes=nodes,
            plugins=plugins,
        )

    def is_expired(self) -> bool:
        """检查缓存是否过期"""
        import time
        if self.timestamp <= 0:
            return True
        elapsed_hours = (time.time() - self.timestamp) / 3600
        return elapsed_hours > LOCAL_NODE_MAP_CACHE_EXPIRE_HOURS


@dataclass
class ScanResult:
    """扫描结果"""
    success: bool
    plugin_count: int
    node_count: int
    v1_count: int
    v3_count: int
    frontend_count: int
    elapsed_seconds: float
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "pluginCount": self.plugin_count,
            "nodeCount": self.node_count,
            "v1Count": self.v1_count,
            "v3Count": self.v3_count,
            "frontendCount": self.frontend_count,
            "elapsedSeconds": self.elapsed_seconds,
            "error": self.error,
        }
