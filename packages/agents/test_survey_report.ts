import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "my123";
const token = jwt.sign(
  { adminType: "SUPER", id: "admin-1", email: "test@test.com" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const CATEGORY = process.argv[2] || "Health";
const BASE_URL = "http://localhost:3040";

console.log(`\n🚀 Testing Report Generator Agent`);
console.log(`📋 Category: "${CATEGORY}"`);
console.log(`🔗 URL: ${BASE_URL}/api/survey-report-generate/generate\n`);
console.log("─".repeat(70));

const startTime = Date.now();

const resp = await fetch(`${BASE_URL}/api/survey-report-generate/generate`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ category: CATEGORY }),
});

if (!resp.ok) {
  console.error(`❌ HTTP ${resp.status}: ${await resp.text()}`);
  process.exit(1);
}

const reader = resp.body!.getReader();
const decoder = new TextDecoder();
let allText = "";

let surveyReport: any = null;
let backendReport: any = null;
let fusionReport: any = null;
let pipelineMetadata: any = null;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  allText += chunk;

  // Parse each SSE event
  const events = chunk.split("\n\n").filter((e) => e.trim());
  for (const evt of events) {
    const eventMatch = evt.match(/^event: (.+)/);
    const dataMatch = evt.match(/data: (.+)/);
    if (!eventMatch || !dataMatch) continue;

    const eventType = eventMatch[1]!;
    const data = JSON.parse(dataMatch[1]!);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    switch (eventType) {
      case "pipeline_start":
        console.log(`\n[${elapsed}s] 🟢 Pipeline started for: ${data.category}`);
        break;
      case "progress":
        console.log(`[${elapsed}s] ⏳ ${data.phase}: ${data.message}`);
        break;
      case "token":
        process.stdout.write(data.chunk);
        break;
      case "phase_complete":
        console.log(`[${elapsed}s] ✅ Phase complete: ${data.phase} (${(data.elapsed_ms / 1000).toFixed(1)}s)`);
        if (data.phase === "survey_report") surveyReport = data.report;
        if (data.phase === "backend_report") backendReport = data.report;
        if (data.phase === "fusion_report") fusionReport = data.report;
        break;
      case "complete":
        pipelineMetadata = data.pipeline_metadata;
        if (!surveyReport) surveyReport = data.survey_report;
        if (!backendReport) backendReport = data.backend_report;
        if (!fusionReport) fusionReport = data.fusion_report;
        console.log(`\n[${elapsed}s] 🎉 PIPELINE COMPLETE`);
        break;
      case "error":
        console.error(`\n[${elapsed}s] ❌ ERROR: ${data.message}`);
        break;
    }
  }
}

console.log("\n" + "═".repeat(70));
console.log("                       📊 FINAL RESULTS");
console.log("═".repeat(70));

if (pipelineMetadata) {
  console.log(`\n⏱️  Pipeline Metadata:`);
  console.log(`   Total time:      ${pipelineMetadata.total_time_seconds}s`);
  console.log(`   Phase 1+2 time:  ${pipelineMetadata.phase_1_2_time_seconds}s`);
  console.log(`   Phase 3 time:    ${pipelineMetadata.phase_3_time_seconds}s`);
  console.log(`   Survey docs:     ${pipelineMetadata.survey_docs_retrieved}`);
  console.log(`   Backend docs:    ${pipelineMetadata.backend_docs_retrieved}`);
}

if (surveyReport) {
  console.log("\n" + "─".repeat(70));
  console.log("📄 REPORT 1 — SURVEY REPORT (NGO/Field Data)");
  console.log("─".repeat(70));
  console.log(JSON.stringify(surveyReport, null, 2));
}

if (backendReport) {
  console.log("\n" + "─".repeat(70));
  console.log("📄 REPORT 2 — BACKEND REPORT (SwarajDesk Complaints)");
  console.log("─".repeat(70));
  console.log(JSON.stringify(backendReport, null, 2));
}

if (fusionReport) {
  console.log("\n" + "─".repeat(70));
  console.log("📄 REPORT 3 — FUSION REPORT (Combined Analysis)");
  console.log("─".repeat(70));
  console.log(JSON.stringify(fusionReport, null, 2));
}

console.log("\n" + "═".repeat(70));
console.log("✅ Done!");
