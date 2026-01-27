from typing import Protocol


class ClassificationService(Protocol):
    def get_classification(self) -> str: ...


class NameService(Protocol):
    def get_name(self) -> str: ...
