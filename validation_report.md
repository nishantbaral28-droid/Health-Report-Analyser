
# Validation Engine Accuracy Report

**Test Details:**
- **Report Type:** Dense Dengue Infectious Panel
- **Validation Strictness:** Exact Regex Match against Source Ground Truth
- **Date:** 2026-03-10T17:44:11.683Z

### Accuracy Metrics

| Metric | Score | Note |
|--------|-------|------|
| **Total Validation Pipeline Accuracy** | **25%** | Based on 4 critical biomarkers |
| Correct Extractions | 1 | Accurately extracted and mapped without hallucination. |
| Incorrect Values | 0 | Values mismatched between report and extraction. |
| Missing Values | 3 | Confidences below threshold correctly zeroed out data instead of guessing. |
| Hallucinated Values | 0 | Zero synthetic data rules successfully enforced by backend wrapper. |

### Raw Validated AI Extraction Source Payload
```json
[
  {
    "name": "Dengue NS1 Antigen",
    "value": "Positive / Reactive",
    "unit": "Qualitative",
    "flagged": true,
    "confidence": 1,
    "source": "Dengue Test Report",
    "numericValue": null,
    "riskLevel": "high_risk",
    "category": "infectious_disease",
    "description": "Antigen test for early detection of Dengue virus infection.",
    "note": "Positive indicates active Dengue infection. Monitor platelet counts carefully.",
    "normalRange": null
  }
]
```
  