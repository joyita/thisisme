import random


class MockClassificationService:
    CLASSIFICATIONS = ["CAHMS", "SPA", "DLA"]

    def __init__(self) -> None:
        self._rng = random.Random()

    def get_classification(self) -> str:
        return self._rng.choice(self.CLASSIFICATIONS)
