"""
插件备注存储模块

以单文件 JSON 形式存储插件备注信息。
文件路径：data/plugin_notes.json
数据格式：{ "plugin_folder_name": "备注内容", ... }

注意：插件的文件夹名作为 ID，禁用时会加 .disabled 后缀，
识别时需要去掉该后缀。
"""

import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Optional, Dict

from backend.src.utils.paths import get_data_dir
from backend.src.utils.logger import get_logger

logger = get_logger()


_NOTES_FILE_NAME = "plugin_notes.json"


def _get_notes_file_path() -> Path:
    return get_data_dir() / _NOTES_FILE_NAME


def _normalize_plugin_id(plugin_name: str) -> str:
    if plugin_name.endswith(".disabled"):
        return plugin_name[: -len(".disabled")]
    if plugin_name.endswith(".disable"):
        return plugin_name[: -len(".disable")]
    return plugin_name


def _read_all_notes() -> Dict[str, str]:
    notes_file = _get_notes_file_path()
    if not notes_file.exists():
        return {}
    try:
        with open(notes_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return {str(k): str(v) for k, v in data.items()}
        return {}
    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"[PluginNotes] 读取备注文件失败: {e}")
        return {}


def _write_all_notes(notes: Dict[str, str]) -> bool:
    notes_file = _get_notes_file_path()
    try:
        notes_file.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(
            dir=str(notes_file.parent), suffix=".tmp", prefix=".notes_"
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(notes, f, ensure_ascii=False, indent=2)
            Path(tmp_path).replace(notes_file)
        except BaseException:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise
        return True
    except OSError as e:
        logger.error(f"[PluginNotes] 写入备注文件失败: {e}")
        return False


_lock = threading.Lock()


def get_plugin_note(plugin_name: str) -> Optional[str]:
    plugin_id = _normalize_plugin_id(plugin_name)
    with _lock:
        notes = _read_all_notes()
    return notes.get(plugin_id)


def get_all_plugin_notes() -> Dict[str, str]:
    with _lock:
        return _read_all_notes()


def save_plugin_note(plugin_name: str, note: str) -> bool:
    plugin_id = _normalize_plugin_id(plugin_name)
    with _lock:
        notes = _read_all_notes()
        if note.strip():
            notes[plugin_id] = note
        else:
            notes.pop(plugin_id, None)
        return _write_all_notes(notes)
