import random


class MockNameService:
    NAMES = ["referral", "appointment", "request"]

    def __init__(self) -> None:
        self._rng = random.Random()

    def get_name(self) -> str:
        return self._rng.choice(self.NAMES)
