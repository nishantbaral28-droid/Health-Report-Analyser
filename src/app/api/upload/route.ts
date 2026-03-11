import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  computeFlag,
  applyClinicalRules,
  getDirectionalNote,
  getReference,
  isCompatibleUnit,
  type NumericStatus,
  type ClinicalStatus
} from '@/lib/biomarkers';

// Check if AI key is configured
function isAIConfigured(): boolean {
  const key = process.env.AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  return key.length > 10 && !key.includes('your_');
}

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return url.startsWith('http://') || url.startsWith('https://');
}

const extractionSchema = z.object({
  summary: z.string().describe('Rule-based compliant summary. Do not diagnose.'),
  biomarkers: z.array(z.object({
    id: z.string().describe('Unique ID for this extracted row (UUID).'),
    section: z.string().describe('Section of the report (e.g., Complete Blood Count, Liver Function, Infectious Diseases).'),
    raw_name: z.string().describe('Exact, original name of the test explicitly written in the report.'),
    canonical_name: z.string().describe('Normalized standard medical name (e.g., instead of "W.B.C", "White Blood Cells").'),
    subtype: z.enum(['percentage', 'absolute_count', 'qualitative', 'ratio', 'panel_value']).describe('Strict clinical subtype of the test.'),
    value_text: z.string().describe('The extracted result text.'),
    value_num: z.number().nullable().describe('Numeric value of the result, if parseable, otherwise null.'),
    unit: z.string().describe('The strict unit of measurement for this result.'),
    ref_low: z.number().nullable().describe('The lower bound of the reference range, if provided.'),
    ref_high: z.number().nullable().describe('The upper bound of the reference range, if provided.'),
    ref_text: z.string().describe('The exact string representing the reference range.'),
    qualitative: z.string().nullable().describe('Specific qualitative result if present, explicitly like POSITIVE, NEGATIVE, REACTIVE, NON-REACTIVE. Null if purely numeric.'),
    flag: z.enum(['LOW', 'HIGH', 'NORMAL', 'UNKNOWN']).describe('The flag provided by the lab report, NOT your interpretation.'),
    extraction_method: z.enum(['table_row', 'row_block', 'labeled_pair', 'heuristic']).describe('How did you extract this? table_row is strongly preferred. Use heuristic only as fallback.'),
    source_anchor: z.string().describe('Visual page location (e.g., Page 1, Row 5, Table: Hematology).'),
    evidence_snippet: z.string().describe('A 5-10 word exact text snippet from the document proving this value matches this test name.'),
    confidence_score: z.number().min(0).max(1).describe('Row consistency score: 0.35 label + 0.25 structure + 0.15 unit + 0.15 ref + 0.10 section.'),
    conflict_group_id: z.string().nullable().describe('If a layout bleed causes ambiguity, assign SAME conflict UUID to both markers.'),
    needs_verification: z.boolean().describe('Set to true if there is any layout ambiguity or bleed.'),
  })),
  recommendations: z.array(z.string()).describe('Actionable recommendations based purely on factual findings. No medical diagnosis.'),
});

function generateDemoExtraction() {
  return {
    summary: 'Mock health markers generated for demo mode.',
    biomarkers: [
      { id: '1', section: 'CBC', raw_name: 'Neutrophils %', canonical_name: 'Neutrophils %', subtype: 'percentage', value_text: '60', value_num: 60, unit: '%', ref_low: 40, ref_high: 80, ref_text: '40 - 80', qualitative: null, flag: 'NORMAL', extraction_method: 'table_row', source_anchor: 'Page 1, Differential', evidence_snippet: 'Neutrophils 60 % 40-80', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '2', section: 'CBC', raw_name: 'Lymphocytes %', canonical_name: 'Lymphocytes %', subtype: 'percentage', value_text: '15', value_num: 15, unit: '%', ref_low: 20, ref_high: 40, ref_text: '20 - 40', qualitative: null, flag: 'LOW', extraction_method: 'table_row', source_anchor: 'Page 1, Differential', evidence_snippet: 'Lymphocytes 15 % 20-40', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '3', section: 'CBC', raw_name: 'MCV', canonical_name: 'MCV', subtype: 'panel_value', value_text: '70', value_num: 70, unit: 'fL', ref_low: 80, ref_high: 100, ref_text: '80 - 100', qualitative: null, flag: 'LOW', extraction_method: 'table_row', source_anchor: 'Page 1, Hematology', evidence_snippet: 'MCV 70 fL 80-100', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '4', section: 'CBC', raw_name: 'MCH', canonical_name: 'MCH', subtype: 'panel_value', value_text: '24', value_num: 24, unit: 'pg', ref_low: 27, ref_high: 33, ref_text: '27 - 33', qualitative: null, flag: 'LOW', extraction_method: 'table_row', source_anchor: 'Page 1, Hematology', evidence_snippet: 'MCH 24 pg 27-33', confidence_score: 0.98, conflict_group_id: null, needs_verification: false },
      { id: '5', section: 'CBC', raw_name: 'Monocytes %', canonical_name: 'Monocytes %', subtype: 'percentage', value_text: '12', value_num: 12, unit: '%', ref_low: 2, ref_high: 10, ref_text: '2 - 10', qualitative: null, flag: 'HIGH', extraction_method: 'table_row', source_anchor: 'Page 1, Differential', evidence_snippet: 'Monocytes 12 % 2-10', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '6', section: 'CBC', raw_name: 'Eosinophils %', canonical_name: 'Eosinophils %', subtype: 'percentage', value_text: '0.5', value_num: 0.5, unit: '%', ref_low: 1, ref_high: 6, ref_text: '1 - 6', qualitative: null, flag: 'LOW', extraction_method: 'table_row', source_anchor: 'Page 1, Differential', evidence_snippet: 'Eosinophils 0.5 % 1-6', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '7', section: 'CBC', raw_name: 'Basophils %', canonical_name: 'Basophils %', subtype: 'percentage', value_text: '0', value_num: 0, unit: '%', ref_low: 0, ref_high: 2, ref_text: '0 - 2', qualitative: null, flag: 'NORMAL', extraction_method: 'table_row', source_anchor: 'Page 1, Differential', evidence_snippet: 'Basophils 0 % 0-2', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '8', section: 'CBC', raw_name: 'Platelets', canonical_name: 'Platelets', subtype: 'absolute_count', value_text: '250000', value_num: 250000, unit: 'cells/cumm', ref_low: 150000, ref_high: 450000, ref_text: '150k - 450k', qualitative: null, flag: 'NORMAL', extraction_method: 'table_row', source_anchor: 'Page 1, Hematology', evidence_snippet: 'Platelets 250000 150k-450k', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '8a',section: 'CBC', raw_name: 'Absolute Neutrophil Count', canonical_name: 'Absolute Neutrophil Count', subtype: 'absolute_count', value_text: '6500', value_num: 6500, unit: 'cells/cumm', ref_low: 2000, ref_high: 7000, ref_text: '2000 - 7000', qualitative: null, flag: 'NORMAL', extraction_method: 'table_row', source_anchor: 'Page 1, Hematology', evidence_snippet: 'ANC 6500', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '9', section: 'Infectious', raw_name: 'Dengue NS1 Antigen', canonical_name: 'Dengue NS1 Antigen', subtype: 'qualitative', value_text: 'NEGATIVE', value_num: null, unit: '', ref_low: null, ref_high: null, ref_text: 'Negative', qualitative: 'NEGATIVE', flag: 'NORMAL', extraction_method: 'table_row', source_anchor: 'Page 2, Serology', evidence_snippet: 'Dengue NS1 Antigen Negative', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '10', section: 'Infectious', raw_name: 'Dengue IgM', canonical_name: 'Dengue IgM', subtype: 'qualitative', value_text: 'NEGATIVE', value_num: null, unit: '', ref_low: null, ref_high: null, ref_text: 'Negative', qualitative: 'NEGATIVE', flag: 'NORMAL', extraction_method: 'table_row', source_anchor: 'Page 2, Serology', evidence_snippet: 'Dengue IgM Negative', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
      { id: '11', section: 'Infectious', raw_name: 'Typhi Dot', canonical_name: 'Typhi Dot', subtype: 'qualitative', value_text: 'POSITIVE', value_num: null, unit: '', ref_low: null, ref_high: null, ref_text: 'Negative', qualitative: 'POSITIVE', flag: 'HIGH', extraction_method: 'table_row', source_anchor: 'Page 2, Serology', evidence_snippet: 'Typhi Dot POSITIVE', confidence_score: 0.99, conflict_group_id: null, needs_verification: false },
    ],
    recommendations: ['Demo mode active.'],
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload a text-based PDF report. Image and scanned report uploads are not supported yet.' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // 1. Optionally upload to Supabase Storage
    let fileUrl: string | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = await createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: storageError } = await supabase.storage
          .from('reports')
          .upload(filePath, file, { contentType: file.type });

        if (!storageError) {
          const { data: publicUrlData } = supabase.storage.from('reports').getPublicUrl(filePath);
          fileUrl = publicUrlData.publicUrl;
        }
      } catch (e: any) {
        console.warn('Supabase storage skipped:', e.message);
      }
    }

    // 2. AI Extraction — real report analysis only
    let extraction;

    if (!isAIConfigured()) {
      return NextResponse.json({
        error: 'Report analysis is temporarily unavailable because the AI extraction service is not configured.'
      }, { status: 503 });
    }

    try {
      const googleModel = google('gemini-2.5-flash');

      const buffer = Buffer.from(await file.arrayBuffer());

      // Parse PDF text locally to bypass AI SDK Buffer schema errors
      let extractedText = '';
      const rawText = buffer.toString('utf8');
      if (rawText.startsWith('%PDF-')) {
        try {
          const PDFParser = require('pdf2json');
          const pdfParser = new PDFParser(null, 1);

          extractedText = await new Promise((resolve, reject) => {
            pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
            pdfParser.on('pdfParser_dataReady', () => {
              resolve(pdfParser.getRawTextContent().replace(/\\r\\n|\\r|\\n/g, '\n'));
            });
            pdfParser.parseBuffer(buffer);
          });
        } catch (pdfErr: any) {
          console.warn('PDF parsing failed:', pdfErr);
          return NextResponse.json({
            error: 'This PDF could not be parsed as structured text. Please upload a text-based PDF export from the lab portal.'
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          error: 'Only text-based PDF reports are supported right now.'
        }, { status: 400 });
      }

      const normalizedExtractedText = extractedText.replace(/\s+/g, ' ').trim();
      if (normalizedExtractedText.length < 80 || !/[a-zA-Z]{3,}/.test(normalizedExtractedText)) {
        return NextResponse.json({
          error: 'This looks like a scanned or image-based PDF. Please upload a text-based PDF export from the lab portal.'
        }, { status: 400 });
      }

      const { object } = await generateObject({
        model: googleModel,
        schema: extractionSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert OCR parser and clinical intelligence safety validation engine.
CRITICAL SAFETY RULES:
1. STRICT OCR ONLY: Extracted values must physically exist in the document text exactly as you extract them. Zero hallucinations.
2. TABLE-FIRST PARSING (CRITICAL): If data looks tabular, you MUST extract (TestName, Result, Unit, Range) from the SAME ROW. Disallow token-nearness across rows.
3. CONFLICT DETECTOR: If a layout is ambiguous (e.g., the same numeric value "31.25" could belong to Dengue NS1 or Typhi Dot because of column bleeding), assign the SAME \`conflict_group_id\` (e.g., "conflict-1") to BOTH candidates and set \`needs_verification\` to true.
4. MISPRINT DETECTION: If you see qualitative labels like "NEGATIVE" sitting next to a test named "Typhi Dot", this is a layout bleed. Mark \`needs_verification\` true.
5. NO SYNTHETIC VALUES: Never invent a value, a unit, or a range that isn't written on the page.
6. SUBTYPES (CRITICAL):
- Explicitly map each test to 'percentage', 'absolute_count', 'qualitative', 'ratio', or 'panel_value'.
- DIFFERENTIAL WBC: "Neutrophils %" (subtype: percentage, unit: %) MUST NOT BE MERGED WITH "Neutrophils Abs" (subtype: absolute_count, unit: cells/cumm).
- If a row text contains "Eosinophils" and a % sign, its subtype is percentage. Do not cross-assign ranges.
7. ROW CONSISTENCY SCORE:
Populate \`confidence_score\` mathematically (0.0 to 1.0) based on:
- 0.35 if row label matches exactly.
- 0.25 if table structure is unbroken text string.
- 0.15 if unit is explicitly present.
- 0.15 if reference bounds exist.
- 0.10 if section mapping seems solid.

=== RAW ADJACENT TEXT EXTRACTED FROM REPORT ===
${extractedText}
===============================================`
              }
            ]
          }
        ]
      });
      extraction = object;
    } catch (aiError: any) {
      console.warn('AI extraction failed:', aiError.message);
      return NextResponse.json({
        error: 'We could not extract structured biomarkers from this report. Please try another text-based PDF export.'
      }, { status: 422 });
    }

    if (!extraction?.biomarkers?.length) {
      return NextResponse.json({
        error: 'No supported biomarkers were detected in this PDF.'
      }, { status: 422 });
    }

    // 3. Layer 3 — Strict Anti-Hallucination & Conflict Validation
    const verifiedBiomarkers: any[] = [];
    const blockedBiomarkers: any[] = [];

    // Grouping for conflict resolution
    const conflictGroups = new Set<string>();

    extraction.biomarkers.forEach((b: any) => {
      // Collect conflict group IDs
      if (b.conflict_group_id && b.needs_verification) {
         conflictGroups.add(b.conflict_group_id);
      }
    });

    extraction.biomarkers.forEach((b: any) => {
      // Rule 1: Confidence Display Threshold Policy
      // < 0.70 = Blocked completely
      if (b.confidence_score < 0.70) {
        blockedBiomarkers.push({ ...b, blocked_reason: 'Low Confidence Score (<0.70)' });
        return;
      }

      let isConfirmatoryZone = b.confidence_score >= 0.70 && b.confidence_score < 0.88;

      const rigidPanels = ['hba1c', 'total cholesterol', 'hdl cholesterol', 'ldl cholesterol', 'triglycerides', 'crp', 'c-reactive protein'];
      const isRigid = rigidPanels.some(m => b.raw_name?.toLowerCase().includes(m) || (b.canonical_name && b.canonical_name?.toLowerCase().includes(m)));

      // Fix 1: Specific exemptions for clearly structured panels without conflicts
      if (isRigid && !b.needs_verification && !b.conflict_group_id && b.value_num !== null && (b.ref_low !== null || b.ref_high !== null)) {
         isConfirmatoryZone = false;
         // Ensure it functionally behaves as >= 0.88 for down-stream UI logic
         b.confidence_score = Math.max(b.confidence_score, 0.88);
      }

      // Rule 2: Incomplete extraction
      if (!b.raw_name || b.raw_name.trim() === '' || !b.value_text || b.value_text.trim() === '') {
        blockedBiomarkers.push({ ...b, blocked_reason: 'Incomplete Extraction' });
        return;
      }

      // Rule 3: Map canonical names against strict reference dictionary
      const ref = getReference(b.canonical_name || b.raw_name);

      if (!ref) {
        // Unverified fallback
        blockedBiomarkers.push({ ...b, blocked_reason: 'Cannot Verifiably Map Value to Safe Dictionary Bounds' });
        return;
      }

      // Rule 4: Subtype Mismatch Rejection
      // If AI extracted a percentage cell but matched it to an absolute count dictionary entry (or vice versa), reject it.
      if (ref.subtype === 'percentage' && b.subtype !== 'percentage') {
         // Some OCR engines might miss the %, let's double check the raw string
         if (!b.unit.includes('%') && !b.value_text.includes('%')) {
           blockedBiomarkers.push({ ...b, blocked_reason: 'Subtype Mismatch: Expected Percentage but unit is absolute' });
           return;
         }
      }
      if (ref.subtype === 'absolute_count' && (b.subtype === 'percentage' || b.unit.includes('%'))) {
         blockedBiomarkers.push({ ...b, blocked_reason: 'Subtype Mismatch: Expected Absolute Count but unit is %' });
         return;
      }

      if (!isCompatibleUnit(b.unit, ref.unit, ref.subtype)) {
        blockedBiomarkers.push({
          ...b,
          blocked_reason: `Unsupported Unit: expected ${ref.unit || 'qualitative'} but found ${b.unit || 'blank'}`
        });
        return;
      }

      // Rule 5: Pass 1 - Recompute strict numeric flag
      const { numeric: pass1Numeric, clinical: pass1Clinical } = computeFlag(
        b.value_num,
        b.ref_low,
        b.ref_high,
        b.qualitative,
        ref.isQualitative
      );

      // Handle needs verification and conflicts
      const isConflicted = b.conflict_group_id ? conflictGroups.has(b.conflict_group_id) : false;
      const needsVerificationProp = Boolean(b.needs_verification) || isConflicted || pass1Numeric === 'UNVERIFIED' || isConfirmatoryZone;

      // Pass 2 - Clinical Rule Engine Override
      let finalNumeric: NumericStatus = pass1Numeric;
      let finalClinical: ClinicalStatus = pass1Clinical;

      if (needsVerificationProp) {
        finalNumeric = 'UNVERIFIED';
        finalClinical = 'UNVERIFIED';
      } else {
         finalClinical = applyClinicalRules(ref, finalNumeric, finalClinical, b.value_num);
      }

      // Direction-Aware Interpretation
      const note = getDirectionalNote(
        ref.name,
        b.value_num,
        finalNumeric,
        finalClinical,
        b.qualitative,
        needsVerificationProp
      );

      verifiedBiomarkers.push({
        ...b,
        name: ref.name, // Force UI to use normalized dictionary name
        value: b.value_text, // the actual extracted text
        numericValue: b.value_num,
        numericStatus: finalNumeric,
        clinicalStatus: finalClinical,
        riskLevel: finalClinical === 'HIGH_PRIORITY' || finalClinical === 'CLINICALLY_NOTABLE' ? 'high_risk' : finalClinical === 'BORDERLINE' ? 'borderline' : finalClinical === 'NORMAL' || finalClinical === 'FAVORABLE' ? 'normal' : 'unverified', // Preserving backwards compatible mapping just for initial UI load, but true logic powered by statuses
        category: ref.category,
        description: ref.description,
        note,
        normalRange: b.ref_low !== null && b.ref_high !== null ? { min: b.ref_low, max: b.ref_high } : ref.normalRange || null,
      });
    });

    // 3.5 Deduplicate markers by canonical name (Keep highest confidence)
    const nameMap = new Map<string, any>();

    verifiedBiomarkers.forEach(b => {
      if (nameMap.has(b.name)) {
         const existing = nameMap.get(b.name);
         if (b.confidence_score > existing.confidence_score) {
             blockedBiomarkers.push({ ...existing, blocked_reason: 'Duplicate Marker (Lower Confidence)' });
             nameMap.set(b.name, b);
         } else {
             blockedBiomarkers.push({ ...b, blocked_reason: 'Duplicate Marker (Lower Confidence)' });
         }
      } else {
         nameMap.set(b.name, b);
      }
    });

    // Safely reassign for the rest of the application
    const finalVerified = Array.from(nameMap.values());
    verifiedBiomarkers.length = 0;
    verifiedBiomarkers.push(...finalVerified);

    if (verifiedBiomarkers.length < extraction.biomarkers.length) {
       console.warn(`Validation Engine dropped ${blockedBiomarkers.length} biomarkers.`);
    }

    if (verifiedBiomarkers.length === 0) {
      return NextResponse.json({
        error: 'We could not verify any supported biomarkers from this PDF. Please upload a clearer text-based lab export.'
      }, { status: 422 });
    }

    const trustedBiomarkerCount = verifiedBiomarkers.filter((biomarker) => biomarker.clinicalStatus !== 'UNVERIFIED').length;
    if (trustedBiomarkerCount === 0) {
      return NextResponse.json({
        error: 'The extracted rows were too uncertain to build a reliable dashboard. Please upload a clearer text-based PDF export.'
      }, { status: 422 });
    }

    // 5. Generate Safe, Mathematical Summary and Recommendations
    let finalSummary = "";
    const recsP1: string[] = []; // Priority 1
    const recsP2: string[] = []; // Priority 2

    // Only use confirmed anomalies (strict CLINICALLY_NOTABLE or HIGH_PRIORITY)
    const confirmedAbnormalities = verifiedBiomarkers.filter((b: any) =>
       b.clinicalStatus === 'CLINICALLY_NOTABLE' || b.clinicalStatus === 'HIGH_PRIORITY'
    );

    if (confirmedAbnormalities.length === 0) {
      finalSummary = "No significant, high-confidence abnormalities were detected in this extraction panel.";
    } else {
      const summaryLines: string[] = [];
      const synthesisGroup: string[] = [];

      if (blockedBiomarkers.length > 0) {
         summaryLines.push("Among the displayed high-confidence biomarkers,");
      }

      const hasLowHb = confirmedAbnormalities.some((b: any) => b.numericStatus === 'BELOW_RANGE' && (b.name?.toLowerCase() === 'hemoglobin'));
      const hasHighHb = confirmedAbnormalities.some((b: any) => b.numericStatus === 'ABOVE_RANGE' && (b.name?.toLowerCase() === 'hemoglobin'));
      const hasHighHct = confirmedAbnormalities.some((b: any) => b.numericStatus === 'ABOVE_RANGE' && (b.name?.toLowerCase() === 'hematocrit'));
      const hasLowMcv = confirmedAbnormalities.some((b: any) => b.numericStatus === 'BELOW_RANGE' && b.name?.toLowerCase() === 'mcv');
      const hasLowMch = confirmedAbnormalities.some((b: any) => b.numericStatus === 'BELOW_RANGE' && b.name?.toLowerCase() === 'mch');

      // Synthesis 1: Erythrocytosis pattern
      if (hasHighHb && hasHighHct) {
         synthesisGroup.push("Hemoglobin and hematocrit are above the report reference range, which may be seen with hemoconcentration or erythrocytosis-pattern states; clinical correlation is advised.");
      } else if (hasHighHb) {
         synthesisGroup.push("Hemoglobin is above the reference range.");
      } else if (hasHighHct) {
         synthesisGroup.push("Hematocrit is above the reference range.");
      }

      // Synthesis 2: Microcytic anemia pattern
      if (hasLowHb || hasLowMcv || hasLowMch) {
         if (hasLowHb && hasLowMcv && hasLowMch) {
             synthesisGroup.push("Hemoglobin, MCV, and MCH values are below the reference range. This combination may suggest a microcytic anemia pattern.");
         } else if (hasLowMcv && hasLowMch) {
             synthesisGroup.push("MCV and MCH values are below the reference range, which may suggest a microcytic pattern.");
         } else if (hasLowHb && !hasHighHct) {
             synthesisGroup.push("Hemoglobin is below the reference range.");
         } else if (hasLowMcv) {
             synthesisGroup.push("MCV is below the reference range.");
         } else if (hasLowMch) {
             synthesisGroup.push("MCH is below the reference range.");
         }
      }

      if (synthesisGroup.length > 0) {
         summaryLines.push(...synthesisGroup);
      }

      // Individual Markers (excluding those handled in synthesis)
      const handledSynthetics = ['hemoglobin', 'hematocrit', 'mcv', 'mch'];
      confirmedAbnormalities.forEach((b: any) => {
         const name = b.name?.toLowerCase() || '';
         if (handledSynthetics.includes(name)) return;

         if (b.category === 'infectious_disease') {
             summaryLines.push(`The ${b.name} screening indicator is positive or reactive. Immediate clinical review is recommended.`);
             recsP1.push(`Discuss the positive ${b.name} result with a physician.`);
         } else if (b.category === 'blood_sugar') {
             summaryLines.push(`The ${b.name} value is above the report reference range.`);
             recsP1.push(`Discuss the elevated ${b.name} with your clinician to evaluate glycemic control.`);
         } else if (b.category === 'inflammatory') {
             summaryLines.push(`An elevated ${b.name} was detected.`);
             recsP1.push(`Monitor the elevated ${b.name} (inflammation marker) in clinical context.`);
         } else if (name.includes('platelet')) {
             summaryLines.push(`${b.name} count is ${b.numericStatus === 'BELOW_RANGE' ? 'below' : 'above'} the reference range.`);
             recsP1.push(`Clinical evaluation recommended for abnormal ${b.name} count.`);
         } else if (name.includes('white blood')) {
             summaryLines.push(`Total ${b.name} is ${b.numericStatus === 'BELOW_RANGE' ? 'below' : 'above'} the reference bounds.`);
             recsP1.push(`Discuss total white cell count deviation with your doctor.`);
         } else {
             // Mild deviations
             const dirText = b.numericStatus === 'BELOW_RANGE' ? 'below' : 'above';
             summaryLines.push(`${b.name} is ${dirText} the reference range.`);

             if (!recsP2.includes(`Monitor abnormal ${b.name} in your next clinical checkup.`)) {
                recsP2.push(`Monitor abnormal ${b.name} in your next clinical checkup.`);
             }
         }
      });

      finalSummary = summaryLines.join(" ");
    }

    const hasVerificationNeeds = verifiedBiomarkers.some(b => b.riskLevel === 'unverified');
    if (hasVerificationNeeds) {
       finalSummary += "\n\nNOTICE: Some extracted markers had structural uncertainty. Please verify tests explicitly marked with 'Verify PDF' directly in the original document.";
    }

    // Combine recommendations (cap at 5)
    const uniqueP1 = Array.from(new Set(recsP1));
    const uniqueP2 = Array.from(new Set(recsP2));
    const safeRecommendations = [...uniqueP1, ...uniqueP2].slice(0, 5);
    if (safeRecommendations.length === 0 && confirmedAbnormalities.length === 0) {
      safeRecommendations.push("Maintain a healthy lifestyle and continue routine checkups.");
    }

    // QA Validation Mode Console Output
    // 7. QA Validation Output
    console.log("=== CLINICAL QA VALIDATION OUTPUT ===");
    console.log(`Total Handled: ${verifiedBiomarkers.length + blockedBiomarkers.length}`);
    console.log(`Verified & Displayed: ${verifiedBiomarkers.length}`);
    console.log(`Blocked: ${blockedBiomarkers.length}`);
    verifiedBiomarkers.forEach((b: any) => {
       console.log(`[PASS] ${b.name}: ${b.value} ${b.unit || ''} (Range: ${b.ref_low}-${b.ref_high}) -> Numeric: ${b.numericStatus} | Clinical: ${b.clinicalStatus} | Conf: ${b.confidence_score}`);
    });
    console.log("BLOCKED BIOMARKERS:");
    blockedBiomarkers.forEach(b => console.log(`[REJECTED] ${b.canonical_name || b.raw_name} | reason: ${b.blocked_reason}`));
    console.log("=====================================");

    // 6. Store parsed biomarker data in the backend database for debugging and validation.
    if (isSupabaseConfigured()) {
       try {
          const { createClient } = await import('@/lib/supabase-server');
          const supabase = await createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
             // Future: log to extraction_logs
          }
       } catch (err: any) {
          console.warn('Logging to Supabase failed:', err.message);
       }
    }

    // 7. Build the strict insights payload
    const insights = {
      summary: finalSummary,
      biomarkers: verifiedBiomarkers,
      blocked: blockedBiomarkers, // Exposed for Developer Trust Mode
      recommendations: safeRecommendations,
      stats: {
        totalParsed: extraction.biomarkers.length,
        totalVerified: verifiedBiomarkers.length,
        totalBlocked: blockedBiomarkers.length,
        normal: verifiedBiomarkers.filter(b => b.riskLevel === 'normal').length,
        borderline: verifiedBiomarkers.filter(b => b.riskLevel === 'borderline').length,
        highRisk: verifiedBiomarkers.filter(b => b.riskLevel === 'high_risk').length,
      },
      isDemo: false,
    };

    return NextResponse.json({
      success: true,
      reportId: `report-${Date.now()}`,
      fileUrl,
      insights,
    });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
