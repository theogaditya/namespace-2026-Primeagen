import { createAbuseAI } from "./agents/abuseAI";
import { getToxicityDetector } from "./lib/toxicity/robertaToxicityDetector";

async function testAbuseDetection() {
  const abuseAI = createAbuseAI();
  const toxicityDetector = getToxicityDetector();

  console.log("=".repeat(70));
  console.log("Testing Integrated Abuse AI Detection");
  console.log("=".repeat(70));
  console.log(`RoBERTa Detector Available: ${toxicityDetector.available()}`);
  console.log("=".repeat(70) + "\n");

  const testCases = [
    {
      name: "Legitimate complaint",
      text: "I noticed a large pothole on the road in my area, which is dangerous for pedestrians alike. I hope this can be addressed soon to prevent any accidents.",
    },
    {
      name: "Complaint with profanity at end",
      text: "I noticed a large pothole on the road in my area, which is dangerous for pedestrians alike. I hope this can be addressed soon to prevent any accidents. fuck u ass",
    },
    {
      name: "Complaint with profanity in middle",
      text: "The fucking road is full of potholes and nobody gives a shit about fixing it.",
    },
    {
      name: "Hindi profanity",
      text: "Yeh road bahut kharab hai, saala koi nahi sudharta. Madarchod department.",
    },
    {
      name: "Strong criticism (not toxic)",
      text: "The road department has been negligent and incompetent. They have failed to address this issue for months despite multiple complaints.",
    },
    {
      name: "Personal attack",
      text: "The officer is an idiot and doesn't know how to do his job properly.",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log(`Input: "${testCase.text}"\n`);

    try {
      const result = await abuseAI({ text: testCase.text });

      console.log(`Has Abuse: ${result.has_abuse}`);
      console.log(`Severity: ${result.severity}`);
      console.log(`Clean Text: "${result.clean_text}"`);
      console.log(`Flagged Phrases: ${result.flagged_phrases.length}`);
      
      if (result.flagged_phrases.length > 0) {
        console.log("Flagged:");
        result.flagged_phrases.forEach((phrase, i) => {
          console.log(`  ${i + 1}. "${phrase.original}" → "${phrase.masked}" (${phrase.category}, ${phrase.severity})`);
        });
      }
      
      console.log(`Explanation (EN): ${result.explanation_en}`);
    } catch (error) {
      console.error(`Error: ${error}`);
    }

    console.log("-".repeat(70));
  }

  console.log("\n" + "=".repeat(70));
  console.log("Testing Complete");
  console.log("=".repeat(70));
}

testAbuseDetection().catch(console.error);
