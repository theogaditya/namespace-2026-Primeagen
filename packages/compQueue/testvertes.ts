import { VertexAI } from '@google-cloud/vertexai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function test() {
    const GCRED_JSON = process.env.GCP_CREDENTIALS_JSON;
    if (GCRED_JSON) {
        const credPath = path.join('/tmp', 'gcp-test-creds.json');
        fs.writeFileSync(credPath, GCRED_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    }

    const PROJECT_ID = process.env.GCP_PROJECT_ID!;
    const LOCATION = process.env.GCP_LOCATION!;
    const ENDPOINT_ID = process.env.ENDPOINT_ID!;

    console.log('Project:', PROJECT_ID);
    console.log('Location:', LOCATION);
    console.log('Endpoint:', ENDPOINT_ID);

    const vertex_ai = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    const modelEndpointPath = `projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/${ENDPOINT_ID}`;
    const model = vertex_ai.getGenerativeModel({ model: modelEndpointPath });

    console.log('Sending test request...');
    const resp = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'pothole on main road near bus stop' }] }],
    });

    const text = resp.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Status: SUCCESS');
    console.log('Response:', text);
}

test().catch(e => {
    console.log('❌ Status: FAILED');
    console.log('Error:', e.message?.substring(0, 500));
});
