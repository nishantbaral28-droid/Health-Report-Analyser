import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  BIOMARKER_REFERENCES,
  computeFlag,
  applyClinicalRules,
  getDirectionalNote,
  getReference,
  isCompatibleUnit,
  type NumericStatus,
  type ClinicalStatus
} from '@/lib/biomarkers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SUPPORTED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const SUPPORTED_UPLOAD_LABEL = 'PDF, PNG, JPG, or WEBP';
const SUPPORTED_CANONICAL_MARKERS = BIOMARKER_REFERENCES.map((reference) => reference.name).join(', ');

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

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const PDFParser = require('pdf2json');
    const pdfParser = new PDFParser(null, 1);

    const extractedText = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', () => {
        resolve(pdfParser.getRawTextContent().replace(/\\r\\n|\\r|\\n/g, '\n'));
      });
      pdfParser.parseBuffer(buffer);
    });

    return extractedText.replace(/\s+/g, ' ').trim();
  } catch (error: any) {
    console.warn('PDF text assist unavailable:', error?.message || error);
    return '';
  }
}

function buildExtractionPrompt({
  fileName,
  fileType,
  extractedText,
}: {
  fileName: string;
  fileType: string;
  extractedText?: string;
}) {
  const supplementalText = extractedText ? extractedText.slice(0, 24000) : '';

  return `You are an expert medical report OCR parser and safety-first biomarker extraction engine.

Analyze the ATTACHED REPORT FILE directly. It may be:
- a text-based PDF,
- a scanned PDF,
- or a lab report image/photo.

Use the attached file as the source of truth. If supplemental OCR text is included below, use it only as a helper. If the file and supplemental text conflict, trust the visual file.

SUPPORTED CANONICAL BIOMARKERS:
${SUPPORTED_CANONICAL_MARKERS}

CRITICAL SAFETY RULES:
1. STRICT VISUAL EXTRACTION ONLY: Every extracted value must be visibly present in the attached file. Never invent values, units, ranges, or markers.
2. TABLE-FIRST PARSING: If results appear in a table, extract test name, result, unit, and range from the same row only.
3. LAYOUT AMBIGUITY DETECTION: If two nearby rows could share the same value because of bleed, set the same conflict_group_id and needs_verification=true.
4. QUALITATIVE SAFETY: For qualitative tests like POSITIVE/NEGATIVE, only assign the result if it is clearly aligned with the correct test row.
5. REFERENCE RANGE SAFETY: If the report does not show a reference range, leave ref_low/ref_high null. Never synthesize a range.
6. SUBTYPE SAFETY:
- percentage results stay percentage
- absolute counts stay absolute_count
- qualitative stays qualitative
- panel_value is for direct numeric analytes like glucose, HbA1c, MCV, cholesterol
7. CONFIDENCE SCORE:
Populate confidence_score from 0 to 1 based on:
- 0.35 exact row-label match
- 0.25 stable row structure
- 0.15 explicit unit
- 0.15 explicit reference range
- 0.10 clear section mapping
8. OUTPUT ONLY SUPPORTED BIOMARKERS from the supported list above. Ignore unsupported rows instead of guessing.

FILE CONTEXT:
- filename: ${fileName}
- media type: ${fileType}

${supplementalText ? `SUPPLEMENTAL OCR TEXT FROM PDF PARSER:
${supplementalText}
` : 'No supplemental OCR text available. Use the attached file only.'}`;
}

async function runStructuredExtraction({
  buffer,
  file,
  extractedText,
}: {
  buffer: Buffer;
  file: File;
  extractedText?: string;
}) {
  const model = google(process.env.GEMINI_EXTRACTION_MODEL || 'gemini-2.5-flash');
  const prompt = buildExtractionPrompt({
    fileName: file.name,
    fileType: file.type,
    extractedText,
  });

  const multimodalContent =
    file.type === 'application/pdf'
      ? [
          { type: 'text' as const, text: prompt },
          { type: 'file' as const, data: buffer, mediaType: file.type },
        ]
      : [
          { type: 'text' as const, text: prompt },
          { type: 'image' as const, image: buffer },
        ];

  const attempts: Array<{
    label: string;
    content: typeof multimodalContent;
  }> = [
    {
      label: 'multimodal-primary',
      content: multimodalContent,
    },
  ];

  if (extractedText && extractedText.length >= 80) {
    attempts.push({
      label: 'pdf-text-fallback',
      content: [{ type: 'text' as const, text: buildExtractionPrompt({ fileName: file.name, fileType: file.type, extractedText }) }],
    });
  }

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const { object } = await generateObject({
        model,
        schema: extractionSchema,
        temperature: 0,
        providerOptions: {
          google: {
            mediaResolution: 'HIGH',
          },
        },
        messages: [
          {
            role: 'user',
            content: attempt.content,
          },
        ],
      });

      if (object?.biomarkers?.length) {
        return object;
      }

      lastError = new Error(`No biomarkers extracted during ${attempt.label}.`);
    } catch (error) {
      console.warn(`Structured extraction attempt failed (${attempt.label}):`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('Structured extraction failed.');
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!SUPPORTED_UPLOAD_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Please upload a supported report file (${SUPPORTED_UPLOAD_LABEL}).` }, { status: 400 });
    }

    // Keep uploads under the hosted request-size limit on Vercel.
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large. Please upload a PDF or image under 4MB.' }, { status: 400 });
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
      const buffer = Buffer.from(await file.arrayBuffer());
      const extractedText = file.type === 'application/pdf' ? await extractPdfText(buffer) : '';

      extraction = await runStructuredExtraction({
        buffer,
        file,
        extractedText,
      });
    } catch (aiError: any) {
      console.warn('AI extraction failed:', aiError.message);
      return NextResponse.json({
        error: 'We could not confidently read supported biomarkers from this file. Try a clearer PDF export or a straight, readable photo that includes the result and reference range columns.'
      }, { status: 422 });
    }

    if (!extraction?.biomarkers?.length) {
      return NextResponse.json({
        error: 'No supported biomarkers were detected in this file.'
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
        error: 'We could not verify any supported biomarkers from this file. Please upload a clearer export or report image.'
      }, { status: 422 });
    }

    const trustedBiomarkerCount = verifiedBiomarkers.filter((biomarker) => biomarker.clinicalStatus !== 'UNVERIFIED').length;
    if (trustedBiomarkerCount === 0) {
      return NextResponse.json({
        error: 'The extracted rows were too uncertain to build a reliable dashboard. Please upload a clearer export or report image with readable rows and ranges.'
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
