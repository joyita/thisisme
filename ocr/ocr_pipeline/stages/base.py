from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

import numpy as np

FieldType = Literal["text", "checkbox"]
FieldValue = str | dict[str, str]


@dataclass
class OCRResult:
    text: str
    bbox: list[list[int]]
    confidence: float

    @property
    def x_min(self) -> int:
        return min(p[0] for p in self.bbox)

    @property
    def y_min(self) -> int:
        return min(p[1] for p in self.bbox)

    @property
    def x_max(self) -> int:
        return max(p[0] for p in self.bbox)

    @property
    def y_max(self) -> int:
        return max(p[1] for p in self.bbox)

    @property
    def height(self) -> int:
        return self.y_max - self.y_min

    @property
    def width(self) -> int:
        return self.x_max - self.x_min

    @property
    def center_y(self) -> float:
        return (self.y_min + self.y_max) / 2


@dataclass
class FormField:
    key: str
    value: FieldValue
    field_type: FieldType
    bbox: list[list[int]] | None = None


@dataclass
class FormSection:
    name: str
    fields: list[FormField] = field(default_factory=list)
    y_start: int = 0
    y_end: int = 0


@dataclass
class PipelineContext:
    image_path: Path | None = None
    image: np.ndarray | None = None
    ocr_results: list[OCRResult] = field(default_factory=list)
    sections: list[FormSection] = field(default_factory=list)
    form_data: dict[str, list] = field(default_factory=dict)
    metadata: dict[str, str | None] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


class PipelineStage(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def process(self, context: PipelineContext) -> PipelineContext:
        pass
