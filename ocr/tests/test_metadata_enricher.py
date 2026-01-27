import pytest
from datetime import datetime, timezone
from unittest.mock import Mock

from ocr_pipeline.stages.base import FormSection, FormField, PipelineContext
from ocr_pipeline.stages.metadata_enricher import MetadataEnricherStage, _extract_date
from ocr_pipeline.services import MockClassificationService, MockNameService


class TestMetadataEnricherStage:
    def test_name_property(self):
        stage = MetadataEnricherStage()
        assert stage.name == "MetadataEnricher"

    def test_uses_default_services(self):
        stage = MetadataEnricherStage()
        assert isinstance(stage.classification_service, MockClassificationService)
        assert isinstance(stage.name_service, MockNameService)

    def test_uses_provided_services(self):
        mock_class = Mock()
        mock_name = Mock()
        stage = MetadataEnricherStage(
            classification_service=mock_class,
            name_service=mock_name,
        )
        assert stage.classification_service is mock_class
        assert stage.name_service is mock_name

    def test_enriches_metadata(self):
        mock_class = Mock()
        mock_class.get_classification.return_value = "CAHMS"
        mock_name = Mock()
        mock_name.get_name.return_value = "referral"

        stage = MetadataEnricherStage(
            classification_service=mock_class,
            name_service=mock_name,
        )
        context = PipelineContext()
        result = stage.process(context)

        assert result.metadata["name"] == "referral"
        assert result.metadata["classification"] == "CAHMS"
        assert "upload_date" in result.metadata

    def test_extracts_date_from_sections(self):
        mock_class = Mock()
        mock_class.get_classification.return_value = "SPA"
        mock_name = Mock()
        mock_name.get_name.return_value = "appointment"

        stage = MetadataEnricherStage(
            classification_service=mock_class,
            name_service=mock_name,
        )
        context = PipelineContext(
            sections=[
                FormSection(
                    name="Info",
                    fields=[
                        FormField(key="Date:", value="15/03/2024", field_type="text"),
                    ],
                ),
            ],
        )
        result = stage.process(context)
        assert result.metadata["date"] == "15/03/2024"

    def test_upload_date_is_iso_format(self):
        stage = MetadataEnricherStage()
        context = PipelineContext()
        result = stage.process(context)
        upload_date = result.metadata["upload_date"]
        datetime.fromisoformat(upload_date)


class TestExtractDate:
    def test_extracts_date_from_date_field(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="Date:", value="25/12/2023", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result == "25/12/2023"

    def test_extracts_date_with_dob_keyword(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="DOB:", value="01-01-1990", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result == "01-01-1990"

    def test_extracts_iso_format_date(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="Date:", value="2024-03-15", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result is not None
        assert "03" in result and "15" in result

    def test_extracts_date_with_text_month(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="Date:", value="15 March 2024", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result == "15 March 2024"

    def test_extracts_date_from_any_field(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="Name:", value="Jane", field_type="text"),
                    FormField(key="Info:", value="Created on 10/05/2023", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result == "10/05/2023"

    def test_returns_none_when_no_date(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="Name:", value="Jane", field_type="text"),
                    FormField(key="City:", value="London", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result is None

    def test_handles_empty_sections(self):
        result = _extract_date([])
        assert result is None

    def test_finds_first_date_in_order(self):
        sections = [
            FormSection(
                name="Form",
                fields=[
                    FormField(key="Reference:", value="REF-01/01/2020", field_type="text"),
                    FormField(key="Other:", value="No date here", field_type="text"),
                ],
            ),
        ]
        result = _extract_date(sections)
        assert result == "01/01/2020"
