import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let PROJECT_ID: string | undefined;
let LOCATION: string | undefined;
let ENDPOINT_ID: string | undefined;
let generativeModel: GenerativeModel;

export async function initializeGCP(): Promise<{ projectId: string | undefined; location: string | undefined; endpointId: string | undefined }> {
  // Authentication setup (runtime)
  const GCRED_JSON = process.env.GCP_CREDENTIALS_JSON;
  if (GCRED_JSON) {
    const credPath = path.join(__dirname, 'gcp-credentials.json');
    fs.writeFileSync(credPath, GCRED_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  }

  // Load configuration from environment variables
  PROJECT_ID = process.env.GCP_PROJECT_ID;
  LOCATION = process.env.GCP_LOCATION;
  ENDPOINT_ID = process.env.ENDPOINT_ID;

  if (!PROJECT_ID || !LOCATION || !ENDPOINT_ID) {
    console.error("Missing GCP configuration in environment variables.", new Error("Missing GCP configuration"));
  }

  // VertexAI constructor
  const vertex_ai = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
  });

  // Full resource name of tuned model's endpoint
  const modelEndpointPath = `projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/${ENDPOINT_ID}`;

  // Instantiate the generative model with the endpoint path
  generativeModel = vertex_ai.getGenerativeModel({
    model: modelEndpointPath,
  });

  return { projectId: PROJECT_ID, location: LOCATION, endpointId: ENDPOINT_ID };
}

export async function standardizeSubCategory(subCategory: string): Promise<string> {
  if (!subCategory) {
    throw new Error("A non-empty subCategory is required");
  }

  const prompt = subCategory;

  console.log(`Received prompt: "${prompt}"`);
  console.log(`Sending request to endpoint: ${ENDPOINT_ID}`);

  try {
    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    const resp = await generativeModel.generateContent(request);

    const modelResponseText =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (modelResponseText) {
      console.log("Successfully received response from model endpoint.");
      return modelResponseText;
    } else {
      console.warn("AI returned empty; falling back to original.");
      return subCategory;
    }
  } catch (error) {
    console.error("Error calling Vertex AI API:", error);
    throw new Error(
      "An internal server error occurred while contacting the Vertex AI model"
    );
  }
}
