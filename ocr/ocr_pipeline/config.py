from dataclasses import dataclass
from pathlib import Path


@dataclass
class PipelineConfig:
    schema_mapping_path: Path | None = None
    levenshtein_threshold: float = 0.80
    header_height_multiplier: float = 1.3
    checkbox_min_area: int = 100
    checkbox_max_area: int = 2000
    lang: str = "en"
    use_gpu: bool = True
    log_level: str = "INFO"

    def __post_init__(self):
        if self.schema_mapping_path and isinstance(self.schema_mapping_path, str):
            self.schema_mapping_path = Path(self.schema_mapping_path)
