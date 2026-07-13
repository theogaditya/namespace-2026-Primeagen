import * as dotenv from "dotenv";
dotenv.config();

import { categorizeComplaint } from "./agents/categorizationAI";

async function runTest() {
  const testCases = [
    "pothole on main road near bus stop",
    "street light not working and sparking",
    "broken public toilet near market place",
    "garbage dumped on the side of the road and not cleaned for a week",
    "very low water pressure in our locality",
    "teachers are absent from school"
  ];

  console.log("Running categorization test cases...\n");
  for (const testCase of testCases) {
    console.log(`Input: "${testCase}"`);
    try {
      const result = await categorizeComplaint(testCase);
      console.log(`Output: "${result.label}" (Cached: ${result.fromCache})`);
    } catch (e: any) {
      console.error(`Error:`, e.message);
    }
    console.log("-".repeat(50));
  }
}

runTest();
