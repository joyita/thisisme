import pytest
import tempfile
from pathlib import Path

from ocr_pipeline.utils.schema_mapper import SchemaMapper


@pytest.fixture
def mapping_csv():
    content = """ocr_text,standard_key
patient name,patient_name
patiant name,patient_name
date of birth,date_of_birth
dob,date_of_birth
address,address
phone number,phone_number
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(content)
        return Path(f.name)


class TestSchemaMapper:
    def test_init_without_mapping_file(self):
        mapper = SchemaMapper()
        assert mapper.mappings == {}
        assert mapper.threshold == 0.80

    def test_init_with_custom_threshold(self):
        mapper = SchemaMapper(threshold=0.90)
        assert mapper.threshold == 0.90

    def test_load_mappings_from_file(self, mapping_csv):
        mapper = SchemaMapper(mapping_path=mapping_csv)
        assert "patient name" in mapper.mappings
        assert mapper.mappings["patient name"] == "patient_name"

    def test_map_key_exact_match(self, mapping_csv):
        mapper = SchemaMapper(mapping_path=mapping_csv)
        assert mapper.map_key("patient name") == "patient_name"
        assert mapper.map_key("Patient Name") == "patient_name"

    def test_map_key_fuzzy_match(self, mapping_csv):
        mapper = SchemaMapper(mapping_path=mapping_csv)
        result = mapper.map_key("patiant name")
        assert result == "patient_name"

    def test_map_key_no_match_returns_cleaned(self):
        mapper = SchemaMapper()
        result = mapper.map_key("  unknown field  ")
        assert result == "unknown field"

    def test_map_key_empty_string(self):
        mapper = SchemaMapper()
        assert mapper.map_key("") == ""

    def test_map_key_caching(self, mapping_csv):
        mapper = SchemaMapper(mapping_path=mapping_csv)
        mapper.map_key("patient name")
        assert "patient name" in mapper._cache
        mapper.map_key("patient name")
        assert mapper._cache["patient name"] == "patient_name"

    def test_map_key_below_threshold(self, mapping_csv):
        mapper = SchemaMapper(mapping_path=mapping_csv, threshold=0.99)
        result = mapper.map_key("completely different")
        assert result == "completely different"

    def test_nonexistent_mapping_file(self):
        mapper = SchemaMapper(mapping_path=Path("/nonexistent/path.csv"))
        assert mapper.mappings == {}
