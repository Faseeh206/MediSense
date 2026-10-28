from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictStr, ValidationError, field_validator, model_validator


class ExtractedModel(BaseModel):
    model_config = ConfigDict(extra='ignore', coerce_numbers_to_str=True)

    @field_validator('*', mode='before')
    @classmethod
    def absent_text(cls, value, info):
        field = cls.model_fields.get(info.field_name)
        if value is None and field and field.annotation is str:
            return ''
        return value


class Biomarker(ExtractedModel):
    test_name: str = Field(min_length=1)
    observed_value: str | None = None
    unit: str = ''
    reference_range: str = ''
    status: str = 'UNKNOWN'
    clinical_meaning: str = ''

    @field_validator('status', mode='before')
    @classmethod
    def normalize_status(cls, value):
        status = str(value or 'UNKNOWN').strip().upper().replace(' ', '_').replace('-', '_')
        aliases = {'H': 'HIGH', 'L': 'LOW', 'N': 'NORMAL', 'ELEVATED': 'HIGH', 'WITHIN_RANGE': 'NORMAL', 'ABOVE_RANGE': 'HIGH', 'BELOW_RANGE': 'LOW', 'OUT_OF_RANGE': 'ABNORMAL'}
        normalized = aliases.get(status, status)
        return normalized if normalized in {'NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL', 'UNKNOWN'} else 'UNKNOWN'


class MedicineInformation(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)
    identification: Literal['recognized', 'uncertain'] = 'uncertain'
    uses: StrictStr = Field(default='', max_length=650)
    important_warnings: StrictStr = Field(default='', max_length=900)
    common_side_effects: StrictStr = Field(default='', max_length=500)
    when_to_seek_help: StrictStr = Field(default='', max_length=650)
    uncertainty: StrictStr = Field(default='', max_length=350)

    @model_validator(mode='after')
    def concise_and_identified(self):
        fields = ('uses', 'important_warnings', 'common_side_effects', 'when_to_seek_help')
        if self.identification == 'uncertain':
            for field in fields:
                setattr(self, field, '')
        elif not any(getattr(self, field) for field in fields) or sum(len(getattr(self, field).split()) for field in fields) > 160:
            raise ValueError('Medicine information must be concise and nonempty')
        return self


class Medicine(ExtractedModel):
    brand_name: str = ''
    generic_name: str = ''
    dosage: str = ''
    form: str = ''
    frequency_instructions: str = ''
    indication_summary: str = ''
    patient_information: MedicineInformation | None = None

    @field_validator('patient_information', mode='before')
    @classmethod
    def optional_information_does_not_discard_the_prescription(cls, value):
        try:
            return MedicineInformation.model_validate(value) if value is not None else None
        except (ValidationError, TypeError):
            return None

    @model_validator(mode='after')
    def identified(self):
        if not (self.brand_name.strip() or self.generic_name.strip()):
            raise ValueError('A medicine must have an identified name')
        return self


class DocumentAnalysis(ExtractedModel):
    is_clear_readable: StrictBool
    unreadable_reason: str | None = None
    document_type: Literal['LAB_REPORT', 'PRESCRIPTION'] | None = None
    document_title: str = ''
    laboratory_or_clinic: str = ''
    biomarkers: list[Biomarker] = Field(default_factory=list, max_length=200)
    medicines: list[Medicine] = Field(default_factory=list, max_length=20)
    simple_explanation: str = ''
    recommended_specialist: str | None = None
    specialist_reason: str = ''

    @model_validator(mode='before')
    @classmethod
    def unreadable_document_has_no_extractable_payload(cls, value):
        if isinstance(value, dict) and value.get('is_clear_readable') is False:
            reason = value.get('unreadable_reason')
            return {'is_clear_readable': False, 'unreadable_reason': reason if isinstance(reason, str) else None}
        return value

    @field_validator('document_type', mode='before')
    @classmethod
    def normalize_type(cls, value):
        return value.strip().upper() if isinstance(value, str) else value

    @model_validator(mode='after')
    def complete_readable_analysis(self):
        if self.is_clear_readable:
            if not self.document_type or not (self.biomarkers or self.medicines) or not self.simple_explanation.strip():
                raise ValueError('A readable analysis must include document type, extracted details, and explanation')
        return self


class AnalysisServiceError(RuntimeError):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code
