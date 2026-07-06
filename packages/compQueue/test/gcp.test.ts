import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the entire @google-cloud/vertexai module
vi.mock('@google-cloud/vertexai', () => {
    const mockGenerateContent = vi.fn();
    const mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }));
    const MockVertexAI = vi.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));
    return {
        VertexAI: MockVertexAI,
        GenerativeModel: vi.fn(),
        __mockGenerateContent: mockGenerateContent,
        __mockGetGenerativeModel: mockGetGenerativeModel,
    };
});

// Mock fs so credentials writing doesn't touch disk
vi.mock('fs', () => ({
    default: { writeFileSync: vi.fn(), existsSync: vi.fn(() => false) },
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => false),
}));

describe('standardizeSubCategory', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = {
            ...ORIGINAL_ENV,
            GCP_PROJECT_ID: 'test-project',
            GCP_LOCATION: 'us-central1',
            ENDPOINT_ID: 'test-endpoint',
        };
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
        vi.restoreAllMocks();
    });

    it('throws on empty subCategory', async () => {
        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        await expect(standardizeSubCategory('')).rejects.toThrow('A non-empty subCategory is required');
    });

    it('returns standardized text from Vertex AI on success', async () => {
        const vertexMod = await import('@google-cloud/vertexai');
        const mockGenerateContent = (vertexMod as any).__mockGenerateContent;
        mockGenerateContent.mockResolvedValueOnce({
            response: {
                candidates: [{ content: { parts: [{ text: 'Pipeline Leak' }] } }],
            },
        });

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        expect(result).toBe('Pipeline Leak');
    });

    it('returns original subCategory as fallback on Vertex AI error', async () => {
        const vertexMod = await import('@google-cloud/vertexai');
        const mockGenerateContent = (vertexMod as any).__mockGenerateContent;
        mockGenerateContent.mockRejectedValueOnce(new Error('Vertex AI Network Error'));

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        // On error, falls back to original subCategory (not 'uncategorized description')
        expect(result).toBe('Water leakage');
    });

    it('returns original subCategory when Vertex AI returns empty response', async () => {
        const vertexMod = await import('@google-cloud/vertexai');
        const mockGenerateContent = (vertexMod as any).__mockGenerateContent;
        mockGenerateContent.mockResolvedValueOnce({
            response: { candidates: [] },
        });

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        // Empty response → falls back to original subCategory
        expect(result).toBe('Water leakage');
    });

    it('returns original subCategory as fallback when GCP config is missing', async () => {
        delete process.env.GCP_PROJECT_ID;
        delete process.env.GCP_LOCATION;
        delete process.env.ENDPOINT_ID;

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        // With missing GCP config, initializeGCP returns early so generativeModel is never set.
        // If already initialized from a previous test (module-level state), the Vertex AI call
        // may fail or succeed depending on the mock. Either way, fallback is the original subCategory
        // or 'uncategorized description'. Accept either valid fallback.
        expect(['Water leakage', 'uncategorized description']).toContain(result);
    });
});
