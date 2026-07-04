import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ─── Old CATEGORIZATION_API_URL approach (kept for reference) ───
// const CATEGORIZATION_API_URL = process.env.CATEGORIZATION_API_URL;
//
// export async function standardizeSubCategory_viaCatAPI(subCategory: string): Promise<string> {
//   if (!subCategory) {
//     throw new Error("A non-empty subCategory is required");
//   }
//   try {
//     if (!CATEGORIZATION_API_URL) {
//       console.warn('[standardizeSubCategory] CATEGORIZATION_API_URL is not set, returning fallback');
//       return "uncategorized description";
//     }
//     const response = await axios.post(
//       CATEGORIZATION_API_URL,
//       { complaint: subCategory },
//       { timeout: 10000 }
//     );
//     const issueType = response.data?.data?.issue_type;
//     if (issueType && typeof issueType === 'string') {
//       const formattedIssueType = issueType.replace(/_/g, ' ');
//       console.log(`[standardizeSubCategory] "${subCategory}" → "${formattedIssueType}"`);
//       return formattedIssueType;
//     }
//     console.warn('[standardizeSubCategory] Unexpected response format, returning fallback');
//     return "uncategorized description";
//   } catch (error: any) {
//     console.warn(`[standardizeSubCategory] API call failed: ${error.message}, returning fallback`);
//     return "uncategorized description";
//   }
// }

// ─── Vertex AI approach (direct GCP call) ───

let PROJECT_ID: string | undefined;
let LOCATION: string | undefined;
let ENDPOINT_ID: string | undefined;
let generativeModel: GenerativeModel;
let gcpInitialized = false;

export async function initializeGCP(): Promise<{ projectId: string | undefined; location: string | undefined; endpointId: string | undefined }> {
    // Authentication setup (runtime)
    const GCRED_JSON = process.env.GCP_CREDENTIALS_JSON;
    if (GCRED_JSON) {
        const credPath = path.join(__dirname, 'gcp-credentials.json');
        fs.writeFileSync(credPath, GCRED_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    } else if (process.env.CLIENT_EMAIL && process.env.PRIVATE_KEY) {
        // Build credentials JSON from individual env vars
        const creds = JSON.stringify({
            type: 'service_account',
            project_id: process.env.GCP_PROJECT_ID,
            client_email: process.env.CLIENT_EMAIL,
            private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        const credPath = path.join(__dirname, 'gcp-credentials.json');
        fs.writeFileSync(credPath, creds);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    }

    // Load configuration from environment variables
    PROJECT_ID = process.env.GCP_PROJECT_ID;
    LOCATION = process.env.GCP_LOCATION;
    ENDPOINT_ID = process.env.ENDPOINT_ID;

    if (!PROJECT_ID || !LOCATION || !ENDPOINT_ID) {
        console.error("[GCP] Missing GCP configuration in environment variables (GCP_PROJECT_ID, GCP_LOCATION, ENDPOINT_ID).");
        return { projectId: PROJECT_ID, location: LOCATION, endpointId: ENDPOINT_ID };
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

    gcpInitialized = true;
    console.log(`[GCP] Vertex AI initialized — project=${PROJECT_ID}, location=${LOCATION}, endpoint=${ENDPOINT_ID}`);
    return { projectId: PROJECT_ID, location: LOCATION, endpointId: ENDPOINT_ID };
}

export async function standardizeSubCategory(subCategory: string): Promise<string> {
    if (!subCategory) {
        throw new Error("A non-empty subCategory is required");
    }

    // Lazy-init GCP on first call
    if (!gcpInitialized) {
        try {
            await initializeGCP();
        } catch (initErr) {
            console.warn("[standardizeSubCategory] GCP initialization failed, returning fallback:", initErr);
            return "uncategorized description";
        }
    }

    if (!generativeModel) {
        console.warn("[standardizeSubCategory] Vertex AI model not available (missing GCP config?), returning fallback");
        return "uncategorized description";
    }

    const prompt = subCategory;

    console.log(`[standardizeSubCategory] Received prompt: "${prompt}"`);
    console.log(`[standardizeSubCategory] Sending request to endpoint: ${ENDPOINT_ID}`);

    try {
        const request = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        };

        const resp = await generativeModel.generateContent(request);

        const modelResponseText =
            resp.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (modelResponseText) {
            console.log(`[standardizeSubCategory] Vertex AI response: "${subCategory}" → "${modelResponseText}"`);
            return modelResponseText;
        } else {
            console.warn("[standardizeSubCategory] AI returned empty; falling back to original.");
            return subCategory;
        }
    } catch (err) {
        // Do not throw — make standardization a best-effort call and fall back to original
        const msg = err && (err as any).message ? (err as any).message : String(err);
        console.warn("[standardizeSubCategory] Vertex AI standardization failed, falling back to original subCategory:", msg);
        return subCategory;
    }
}
