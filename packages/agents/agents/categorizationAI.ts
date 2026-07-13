/**
 * Categorization AI Agent
 *
 * Replaces the Vertex AI fine-tuned endpoint for complaint sub-category
 * standardization. Uses the existing LLM provider (OpenAI / Google) with
 * the full label set from NEWdataset/training_data.jsonl embedded as a
 * system prompt, plus a handful of few-shot examples for accuracy.
 *
 * The agent receives a raw complaint text and returns the single best-match
 * standardized label string — exactly the same contract as the old
 * Vertex AI `standardizeSubCategory` function.
 */

import { getChatModel } from "../lib/models/provider";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";

// ── All 200 canonical labels from the training data ──────────────────────
const CANONICAL_LABELS = [
  "ASHA Worker Absence","ASHA Worker Corruption Report","Aadhaar-Pension Linking Issue",
  "Abandoned Senior Shelter Denial","Addiction Rehabilitation Services Gap",
  "Affordable Housing Rent Surge","Air Pollution","Anganwadi Center Absence",
  "Anganwadi Center Services Complaint","Animal Control","Aquatic Life Contamination",
  "Billing Errors","Bridge Repair","Building Code Violation Report","Building Maintenance",
  "Building Plan Approval Delay","Bus Route Request","Bus Stop Maintenance",
  "Caste-based Hostel Discrimination","Certificate Issuance","Child Adoption Process Complaint",
  "Child Begging Reporting","Child Labor Reporting","Child Malnutrition Follow-up Missing",
  "Child Marriage Reporting Lapse","Classroom Infrastructure","Commercial Tax Inquiry",
  "Community Kitchen Service Lapse","Community Shelter Hygiene Issue",
  "Community Toilet Maintenance Issue","Construction Debris Environmental Dumping",
  "Corruption Allegation Tender","Creche Facility Unavailable","Crosswalk Maintenance",
  "Cybercrime Report","Damaged Infrastructure","Disability Benefits Application Process",
  "Disability Certificate Issuance Delay","Discriminatory Welfare Access",
  "Domestic Disturbance Report","Domestic Violence Counseling Gap",
  "Drainage Improvement Request","Drainage Maintenance","Driving License Issues",
  "Educational Infrastructure Deficiency","Educational Resources","Emergency Services",
  "Equipment Maintenance","Event Security Police Request","Facility Maintenance",
  "Fare Meter Issues","Forest Land Encroachment","Free Medicine Stock-Out",
  "General Dissatisfaction with Public Office","Girl Child Education Campaign Absence",
  "Government Hostel Admission Denial","Government Online Portal Outage",
  "Government Orphanage Hygiene Issue","Hand Pump Repair","Hazardous Waste Dumping",
  "Homeless Mental Health Support Gap","Housing Colony Amenities Deficit",
  "Housing Scheme Allotment Delay","Hygiene Standards",
  "Illegal Charges for Welfare Services","Illegal Deforestation","Illegal Encroachment",
  "Illegal Parking","Inclusive Education Implementation Issue","Industrial Emissions Impact",
  "Infrastructure Issues","Laborer Social Security Exclusion","Land Ownership Updates",
  "Land Record Discrepancies","Land Use Violation Report","Leprosy Patient Welfare Delay",
  "License Application Delays","Low Water Pressure","Manual Scavenger Rehabilitation Gap",
  "Maternal Nutrition Support Issue","Maternal Welfare Scheme Assistance","Medical Staff",
  "Medical Supplies","Meter Reading Dispute","Midday Meal Irregularity",
  "Midday Meal Program Quality","Migrant Worker Welfare Awareness Gap",
  "Misinformation by Government Official","Missing Health Camps in Slums",
  "Missing Person Report","Mobile Health Unit Unavailability","Municipal Certificate Issuance",
  "Municipal Drainage Issues","Municipal Property Tax","New Connection Delay",
  "New Water Connection","Noise Complaint","Noise Pollution Environment",
  "Occupancy Certificate Problem","Old Age Home Admission Issues",
  "Old Age Home Medical Staff Shortage","Open Defecation Site Report",
  "Open Waste Burning Health Hazard","Orphan School Admission Issue",
  "Orphan Welfare Scheme Complaint","Park Maintenance","Pension Distribution Harassment",
  "Pest Control Services","Pipe Leakage","Playground Maintenance","Police Conduct Complaint",
  "Police Patrolling Request","Policy Implementation Grievance",
  "Post-Natal Care Scheme Access Issue","Power Line Maintenance","Power Outages",
  "Power Theft","Property Mutation Delays","Property Tax Issues",
  "Property Valuation Disputes","Public Amenities","Public Bus Service",
  "Public Health Programs","Public Housing Construction Quality",
  "Public Housing Elevator Malfunction","Public Information Access Issue",
  "Public Land Encroachment Complaint","Public Space Maintenance Issue",
  "Public Toilet Maintenance","Public Utility Service Failure",
  "Ration Card Application Rejection","Ration Shop Accessibility Issue","Road Maintenance",
  "Road Obstruction","Road Safety","Road Safety Measures","Road Signage",
  "Rural Health Insurance Exclusion","Rural School Sanitation Dropout",
  "Rural Senior Citizen Recreation Gap","Sanitary Napkin Distribution Failure",
  "Sanitation Facilities","Scholarship List Exclusion Complaint","School Facilities",
  "Senior Citizen Pension Disbursement","Senior Citizen Travel Concession Issue",
  "Senior Citizen Welfare Visit Request","Senior Day Care Center Closure",
  "Service Delivery Improvement Suggestion","Service Efficiency",
  "Severe Malnutrition Medical Neglect","Sewage Overflow","Shelter Home Overcrowding",
  "Sidewalk Construction","Single Mother Aid Delay","Slum Rehabilitation Project Delay",
  "Slum Youth Skill Training Exclusion","Staff Behavior","Staff Management",
  "Stamp Duty Concerns","Street Children Education Neglect","Street Cleaning",
  "Street Lighting","Street Lighting Power","Student Scholarship Delay",
  "Subsidized LPG Access Issue","Suspicious Activity Report","Tax Refund Issues",
  "Technology Infrastructure","Theft Report","Traffic Management","Traffic Signal Repair",
  "Traffic Violation Enforcement","Transformer Issues","Transgender Welfare Scheme Denial",
  "Transport Road Signage","Transportation Services","Unauthorized Construction Negligence",
  "Unfair Taxation Grievance","Unresolved Prior Grievance",
  "Unsafe Building Inspection Request","Urban Drainage Infrastructure Issue",
  "Urban Green Space Deficiency","Urban Planning Information Request",
  "Urban Property Boundary Dispute","Urban Street Lighting Request","Utility Services",
  "Vehicle Overloading","Vital Document Issuance Delay",
  "Vocational Training Access for Differently-Abled","Waste Collection Irregularity",
  "Waste Disposal Service Request","Waste Management","Water Pollution",
  "Water Quality Issues","Water Supply Outage","Welfare Housing Project Delay",
  "Widow Housing Scheme Denial","Widow Pension Scheme Delay",
  "Winter Relief Kit Distribution Issue",
];

// Build a lowercase lookup set for exact-match validation
const LABEL_SET = new Set(CANONICAL_LABELS.map((l) => l.toLowerCase()));

// ── System prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a complaint categorization engine for an Indian civic grievance platform (SwarajDesk).

Your ONLY job: given a complaint description, output the single best-matching standardized label from the list below. Output ONLY the label text — nothing else. No explanation, no quotes, no punctuation, no prefix.

CANONICAL LABELS (pick exactly one):
${CANONICAL_LABELS.join("\n")}

RULES:
1. Output MUST be one of the labels above, verbatim (case-sensitive).
2. If the complaint doesn't clearly match any label, pick the closest one.
3. Never output anything besides the label itself.

FEW-SHOT EXAMPLES:
Input: "pothole on main road needs fixing"
Output: Road Maintenance

Input: "broken streetlight near school"
Output: Street Lighting

Input: "overflowing sewage drain"
Output: Sewage Overflow

Input: "garbage not collected for a week"
Output: Waste Management

Input: "traffic signal not working properly"
Output: Traffic Signal Repair

Input: "no water supply for three days"
Output: Water Supply Outage

Input: "hospital staff is rude to patients"
Output: Staff Behavior

Input: "unauthorized encroachment on public land by vendors"
Output: Public Land Encroachment Complaint

Input: "delay in property tax assessment"
Output: Property Tax Issues

Input: "senior citizens not receiving winter relief kits"
Output: Winter Relief Kit Distribution Issue

Input: "street children not enrolled in any school"
Output: Street Children Education Neglect

Input: "ASHA workers demanding bribes for maternal healthcare services"
Output: ASHA Worker Corruption Report

Input: "suggestion for improving public service delivery at Tehsil office"
Output: Service Delivery Improvement Suggestion

Input: "no action taken on previous complaint submitted 3 months ago"
Output: Unresolved Prior Grievance`;

// ── Lazy-loaded few-shot examples from training JSONL ────────────────────
let fewShotExamplesLoaded = false;
let additionalFewShot = "";

function loadFewShotIfNeeded(): void {
  if (fewShotExamplesLoaded) return;
  fewShotExamplesLoaded = true;

  try {
    // Try to load a random subset from the training data for richer few-shot
    const dataPath = path.resolve(__dirname, "../NEWdataset/training_data.jsonl");
    if (fs.existsSync(dataPath)) {
      const lines = fs.readFileSync(dataPath, "utf-8").trim().split("\n");
      // Sample ~30 diverse examples (every ~100th line)
      const step = Math.max(1, Math.floor(lines.length / 30));
      const sampled: string[] = [];
      for (let i = 0; i < lines.length && sampled.length < 30; i += step) {
        try {
          const line = lines[i];
          if (line) {
            const d = JSON.parse(line);
            sampled.push(`Input: "${d.text}"\nOutput: ${d.label}`);
          }
        } catch { /* skip malformed lines */ }
      }
      if (sampled.length > 0) {
        additionalFewShot = "\n\nADDITIONAL EXAMPLES:\n" + sampled.join("\n\n");
      }
    }
  } catch (e) {
    console.warn("[CategorizationAI] Could not load training data for few-shot:", e);
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export interface CategorizationResult {
  label: string;
  fromCache: boolean;
}

// Simple in-memory cache (LRU-ish) to avoid re-classifying identical texts
const cache = new Map<string, string>();
const MAX_CACHE = 500;

/**
 * Classify a complaint sub-category text into a standardized label.
 * Returns the label string (same contract as the old Vertex AI endpoint).
 */
export async function categorizeComplaint(text: string): Promise<CategorizationResult> {
  if (!text || text.trim().length === 0) {
    return { label: "uncategorized description", fromCache: false };
  }

  const cacheKey = text.trim().toLowerCase();

  // Check cache first
  if (cache.has(cacheKey)) {
    return { label: cache.get(cacheKey)!, fromCache: true };
  }

  loadFewShotIfNeeded();

  const model = getChatModel("fast", { temperature: 0, maxTokens: 60 });

  const fullSystemPrompt = SYSTEM_PROMPT + additionalFewShot;

  try {
    const response = await model.invoke([
      new SystemMessage(fullSystemPrompt),
      new HumanMessage(text.trim()),
    ]);

    let label =
      typeof response.content === "string"
        ? response.content.trim()
        : Array.isArray(response.content)
          ? response.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("")
              .trim()
          : String(response.content ?? "").trim();

    // Strip any accidental quotes or periods
    label = label.replace(/^["']|["']$/g, "").replace(/\.$/, "").trim();

    // Validate the label is in our canonical set
    if (!LABEL_SET.has(label.toLowerCase())) {
      // Try fuzzy match — find closest label
      const lowerLabel = label.toLowerCase();
      let bestMatch = "";
      let bestScore = 0;
      for (const canonical of CANONICAL_LABELS) {
        const canonicalLower = canonical.toLowerCase();
        // Simple substring match scoring
        if (canonicalLower === lowerLabel) {
          bestMatch = canonical;
          bestScore = 1;
          break;
        }
        if (canonicalLower.includes(lowerLabel) || lowerLabel.includes(canonicalLower)) {
          const score = Math.min(canonicalLower.length, lowerLabel.length) / Math.max(canonicalLower.length, lowerLabel.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = canonical;
          }
        }
      }
      if (bestMatch && bestScore > 0.4) {
        console.log(`[CategorizationAI] Fuzzy-matched "${label}" → "${bestMatch}"`);
        label = bestMatch;
      } else {
        console.warn(`[CategorizationAI] LLM returned unknown label "${label}", using as-is`);
      }
    }

    // Cache the result
    if (cache.size >= MAX_CACHE) {
      // Delete oldest entry
      const firstKey: string | undefined = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(cacheKey, label);

    return { label, fromCache: false };
  } catch (err) {
    console.error("[CategorizationAI] Classification failed:", err);
    return { label: text, fromCache: false }; // fallback to original text
  }
}
