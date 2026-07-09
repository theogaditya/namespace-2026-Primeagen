/**
 * Test script for unitary/unbiased-toxic-roberta toxicity detection model
 * 
 * This model is specifically trained to detect toxic content and is more reliable
 * than general-purpose LLMs for abuse detection.
 * 
 * Model: https://huggingface.co/unitary/unbiased-toxic-roberta 
 */

import { HfInference } from '@huggingface/inference';

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error('Error: HUGGINGFACE_API_KEY or HF_TOKEN environment variable is required');
  console.log('Get your token from: https://huggingface.co/settings/tokens');
  process.exit(1);
}

const hf = new HfInference(HF_TOKEN);

interface ToxicityResult {
  label: string;
  score: number;
}

async function detectToxicity(text: string): Promise<ToxicityResult[]> {
  try {
    const result = await hf.textClassification({
      model: 'unitary/unbiased-toxic-roberta',
      inputs: text,
    });

    return result as ToxicityResult[];
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    throw error;
  }
}

async function testToxicityDetection() {
  const testCases = [
    {
      name: "Clean complaint",
      text: "I noticed a large pothole on the road in my area, which is dangerous for pedestrians alike. I hope this can be addressed soon to prevent any accidents.",
      expectedToxic: false,
    },
    {
      name: "Complaint with profanity at end",
      text: "I noticed a large pothole on the road in my area, which is dangerous for pedestrians alike. I hope this can be addressed soon to prevent any accidents. fuck u ass",
      expectedToxic: true,
    },
    {
      name: "Complaint with profanity in middle",
      text: "The fucking road is full of potholes and nobody gives a shit about fixing it.",
      expectedToxic: true,
    },
    {
      name: "Strong criticism (not toxic)",
      text: "The road department has been negligent and incompetent. They have failed to address this issue for months.",
      expectedToxic: false,
    },
    {
      name: "Personal attack",
      text: "The officer is an idiot and doesn't know how to do his job.",
      expectedToxic: true,
    },
    {
      name: "Threat",
      text: "If you don't fix this road, I will make sure you regret it.",
      expectedToxic: true,
    },
  ];

  console.log("Testing Toxicity Detection with unitary/unbiased-toxic-roberta\n");
  console.log("=".repeat(70) + "\n");

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Input: "${testCase.text}"`);
    console.log(`Expected Toxic: ${testCase.expectedToxic}\n`);

    try {
      const results = await detectToxicity(testCase.text);
      
      console.log("Results:");
      results.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.label}: ${(result.score * 100).toFixed(2)}%`);
      });

      // Find the toxic label with highest score
      const toxicResult = results.find(r => r.label.toLowerCase() === 'toxic');
      const isToxic = toxicResult && toxicResult.score > 0.5;
      
      console.log(`\nDetected as Toxic: ${isToxic}`);
      console.log(`Match Expected: ${isToxic === testCase.expectedToxic ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`Error: ${error}`);
    }

    console.log("-".repeat(70) + "\n");
  }
}

// Run tests
testToxicityDetection().catch(console.error);
