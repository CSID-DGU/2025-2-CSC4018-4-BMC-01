# src/config_loader.py
from pathlib import Path
from typing import Any, Dict

try:
    import yaml
except Exception:
    yaml = None

_CONFIG_CACHE: Dict[str, Any] = None

_CONFIG_PATHS = [
    Path("config.yaml"),
    Path("src/config.yaml"),
    Path("/mnt/src/config.yaml"),
]


def load_config() -> Dict[str, Any]:
    """
    Config 싱글톤: 최초 1회만 로딩, 이후 캐시 반환
    """
    global _CONFIG_CACHE

    if _CONFIG_CACHE is not None:
        return _CONFIG_CACHE

    cfg_path = next((p for p in _CONFIG_PATHS if p.exists()), None)
    if not cfg_path:
        raise FileNotFoundError("config.yaml을 찾을 수 없음: " + ", ".join(map(str, _CONFIG_PATHS)))

    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    _CONFIG_CACHE = cfg
    return cfg


def get_config() -> Dict[str, Any]:
    """
    load_config()의 alias
    """
    return load_config()
