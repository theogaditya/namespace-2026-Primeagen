import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('standardizeSubCategory', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV, CATEGORIZATION_API_URL: 'http://test-api/predict' };
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
        vi.restoreAllMocks();
    });

    it('throws on empty subCategory', async () => {
        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        await expect(standardizeSubCategory('')).rejects.toThrow('A non-empty subCategory is required');
    });

    it('returns issue_type from API on success', async () => {
        mockedAxios.post.mockResolvedValue({
            data: { status: 'success', data: { category: 'water_supply', issue_type: 'water_pipeline_leak', confidence: 1.0 } },
        });

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        expect(result).toBe('water pipeline leak');
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'http://test-api/predict',
            { complaint: 'Water leakage' },
            { timeout: 10000 },
        );
    });

    it('returns fallback on API error', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Network Error'));

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        expect(result).toBe('uncategorized description');
    });

    it('returns fallback on unexpected response format', async () => {
        mockedAxios.post.mockResolvedValue({ data: { something: 'else' } });

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        expect(result).toBe('uncategorized description');
    });

    it('returns fallback when CATEGORIZATION_API_URL is not set', async () => {
        delete process.env.CATEGORIZATION_API_URL;

        const { standardizeSubCategory } = await import('../lib/gcp/gcp');
        const result = await standardizeSubCategory('Water leakage');

        expect(result).toBe('uncategorized description');
    });
});
