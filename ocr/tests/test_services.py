import pytest
from concurrent.futures import ThreadPoolExecutor

from ocr_pipeline.services import MockClassificationService, MockNameService


class TestMockClassificationService:
    def test_returns_valid_classification(self):
        service = MockClassificationService()
        result = service.get_classification()
        assert result in MockClassificationService.CLASSIFICATIONS

    def test_returns_string(self):
        service = MockClassificationService()
        result = service.get_classification()
        assert isinstance(result, str)

    def test_multiple_calls_return_valid_values(self):
        service = MockClassificationService()
        for _ in range(10):
            result = service.get_classification()
            assert result in MockClassificationService.CLASSIFICATIONS

    def test_thread_safety(self):
        service = MockClassificationService()
        results = []

        def get_classification():
            return service.get_classification()

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(get_classification) for _ in range(100)]
            results = [f.result() for f in futures]

        for result in results:
            assert result in MockClassificationService.CLASSIFICATIONS


class TestMockNameService:
    def test_returns_valid_name(self):
        service = MockNameService()
        result = service.get_name()
        assert result in MockNameService.NAMES

    def test_returns_string(self):
        service = MockNameService()
        result = service.get_name()
        assert isinstance(result, str)

    def test_multiple_calls_return_valid_values(self):
        service = MockNameService()
        for _ in range(10):
            result = service.get_name()
            assert result in MockNameService.NAMES

    def test_thread_safety(self):
        service = MockNameService()
        results = []

        def get_name():
            return service.get_name()

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(get_name) for _ in range(100)]
            results = [f.result() for f in futures]

        for result in results:
            assert result in MockNameService.NAMES

    def test_separate_instances_independent(self):
        service1 = MockNameService()
        service2 = MockNameService()

        service1._rng.seed(42)
        service2._rng.seed(42)

        result1 = service1.get_name()
        result2 = service2.get_name()

        assert result1 == result2
