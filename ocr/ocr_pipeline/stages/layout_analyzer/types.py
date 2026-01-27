from dataclasses import dataclass


@dataclass
class DetectedBox:
    x: int
    y: int
    width: int
    height: int
    name: str = ""

    @property
    def y_end(self) -> int:
        return self.y + self.height


@dataclass
class Checkbox:
    x: int
    y: int
    width: int
    height: int
    filled: bool

    @property
    def center(self) -> tuple[int, int]:
        return (self.x + self.width // 2, self.y + self.height // 2)

    @property
    def bbox(self) -> list[list[int]]:
        return [
            [self.x, self.y],
            [self.x + self.width, self.y],
            [self.x + self.width, self.y + self.height],
            [self.x, self.y + self.height],
        ]
