import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock OpenAI - the factory is hoisted, so everything must be inside
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  
  class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  }
  
  // Expose mockCreate for tests to access
  (MockOpenAI as any).mockCreate = mockCreate;
  
  return {
    default: MockOpenAI,
  };
});

// Get reference to mockCreate after mock is set up
import OpenAI from 'openai';
const mockCreate = (OpenAI as any).mockCreate;

// Now import the routers
import { chatRouter } from '../routes/chat';
import { imageRouter } from '../routes/image';
import { matchRouter } from '../routes/match';

let app: express.Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Health Endpoint', () => {
  it('returns health status', async () => {
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
      });
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toBe('Server is running');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Chat Router', () => {
  beforeEach(() => {
    app.use('/api', chatRouter);
  });

  describe('POST /api/chat', () => {
    it('returns 400 when message is not provided', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Message is required and must be a string');
    });

    it('returns 400 when message is not a string', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 123 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Message is required and must be a string');
    });

    it('returns 400 when message is an empty string', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns successful response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?',
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Hello! How can I help you today?');
      expect(res.body.model).toBe('gpt-4o-mini');
    });

    it('handles empty response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('No response');
    });

    it('returns 500 when OpenAI API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('API rate limit exceeded');
    });

    it('handles unknown error types', async () => {
      mockCreate.mockRejectedValue('Unknown error');

      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Image Router', () => {
  beforeEach(() => {
    app.use('/api', imageRouter);
  });

  describe('POST /api/image', () => {
    it('returns 400 when no image or imageUrl is provided', async () => {
      const res = await request(app)
        .post('/api/image')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Either an image file or imageUrl must be provided');
    });

    it('returns 400 when imageUrl is invalid', async () => {
      const res = await request(app)
        .post('/api/image')
        .send({ imageUrl: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid URL format');
    });

    it('analyzes image from valid URL', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'Infrastructure',
                complaint: 'There is a large pothole on my street that needs immediate repair.',
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/image')
        .send({ imageUrl: 'https://example.com/pothole.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBe('Infrastructure');
      expect(res.body.complaint).toContain('pothole');
      expect(res.body.model).toBe('gpt-4o-mini');
    });

    it('handles file upload with valid image', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'Water Supply & Sanitation',
                complaint: 'There is a water leak in my area.',
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      // Create a simple buffer to simulate image upload
      const imageBuffer = Buffer.from('fake-image-content');

      const res = await request(app)
        .post('/api/image')
        .attach('image', imageBuffer, {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBe('Water Supply & Sanitation');
    });

    it('returns 500 when OpenAI Vision API fails', async () => {
      mockCreate.mockRejectedValue(new Error('Vision API error'));

      const res = await request(app)
        .post('/api/image')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Vision API error');
    });

    it('handles malformed JSON response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/image')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBe('Public Grievances'); // Default category
    });

    it('handles empty response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/image')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('Public Grievances');
    });
  });
});

describe('Match Router', () => {
  beforeEach(() => {
    app.use('/api', matchRouter);
  });

  describe('POST /api/match', () => {
    it('returns 400 when neither images nor URLs provided', async () => {
      const res = await request(app)
        .post('/api/match')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Provide image1 and image2');
    });

    it('returns 400 when only one image URL is provided', async () => {
      const res = await request(app)
        .post('/api/match')
        .send({ imageUrl1: 'https://example.com/image1.jpg' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when URL is invalid', async () => {
      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'invalid-url',
          imageUrl2: 'https://example.com/image2.jpg',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('One or both image URLs are invalid');
    });

    it('short-circuits when both images are identical', async () => {
      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'https://example.com/same-image.jpg',
          imageUrl2: 'https://example.com/same-image.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match).toBe(true);
      expect(res.body.confidence).toBe(1);
      expect(res.body.reason).toBe('Exact same content provided');
    });

    it('compares two different images successfully', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                match: true,
                confidence: 0.85,
                reason: 'Both images show the same street corner with identical damage pattern',
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'https://example.com/image1.jpg',
          imageUrl2: 'https://example.com/image2.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match).toBe(true);
      expect(res.body.confidence).toBe(0.85);
      expect(res.body.reason).toContain('same street corner');
    });

    it('returns no match when images are different', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                match: false,
                confidence: 0.9,
                reason: 'Different locations - one shows a park, other shows a road',
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'https://example.com/park.jpg',
          imageUrl2: 'https://example.com/road.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match).toBe(false);
      expect(res.body.confidence).toBe(0.9);
    });

    it('handles malformed JSON response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Not valid JSON response',
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'https://example.com/image1.jpg',
          imageUrl2: 'https://example.com/image2.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fallback).toBe(true);
      expect(res.body.match).toBe(false);
      expect(res.body.confidence).toBe(0);
      expect(res.body.reason).toBe('Could not parse model response');
    });

    it('handles empty response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'https://example.com/image1.jpg',
          imageUrl2: 'https://example.com/image2.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
    });

    it('returns 500 when OpenAI API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API connection failed'));

      const res = await request(app)
        .post('/api/match')
        .send({
          imageUrl1: 'https://example.com/image1.jpg',
          imageUrl2: 'https://example.com/image2.jpg',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('API connection failed');
    });

    it('handles file uploads for comparison', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                match: true,
                confidence: 0.95,
                reason: 'Same location from different angles',
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const imageBuffer1 = Buffer.from('fake-image-1');
      const imageBuffer2 = Buffer.from('fake-image-2');

      const res = await request(app)
        .post('/api/match')
        .attach('image1', imageBuffer1, {
          filename: 'image1.jpg',
          contentType: 'image/jpeg',
        })
        .attach('image2', imageBuffer2, {
          filename: 'image2.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match).toBe(true);
    });

    it('handles mixed input: file upload and URL', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                match: false,
                confidence: 0.7,
                reason: 'Different subjects',
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const imageBuffer = Buffer.from('fake-image');

      const res = await request(app)
        .post('/api/match')
        .attach('image1', imageBuffer, {
          filename: 'image1.jpg',
          contentType: 'image/jpeg',
        })
        .field('imageUrl2', 'https://example.com/image2.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

describe('Error Handling', () => {
  it('handles non-Error exceptions in chat route', async () => {
    app.use('/api', chatRouter);
    mockCreate.mockRejectedValue({ code: 'UNKNOWN' });

    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'test' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('handles non-Error exceptions in match route', async () => {
    app.use('/api', matchRouter);
    mockCreate.mockRejectedValue('string error');

    const res = await request(app)
      .post('/api/match')
      .send({
        imageUrl1: 'https://example.com/1.jpg',
        imageUrl2: 'https://example.com/2.jpg',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('Content Type Validation', () => {
  beforeEach(() => {
    app.use('/api', imageRouter);
  });

  it('accepts JPEG images', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"category":"Infrastructure","complaint":"Test"}' } }],
      model: 'gpt-4o-mini',
    });

    const res = await request(app)
      .post('/api/image')
      .attach('image', Buffer.from('fake'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
  });

  it('accepts PNG images', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"category":"Infrastructure","complaint":"Test"}' } }],
      model: 'gpt-4o-mini',
    });

    const res = await request(app)
      .post('/api/image')
      .attach('image', Buffer.from('fake'), { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
  });

  it('accepts WebP images', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"category":"Infrastructure","complaint":"Test"}' } }],
      model: 'gpt-4o-mini',
    });

    const res = await request(app)
      .post('/api/image')
      .attach('image', Buffer.from('fake'), { filename: 'test.webp', contentType: 'image/webp' });

    expect(res.status).toBe(200);
  });

  it('accepts GIF images', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"category":"Infrastructure","complaint":"Test"}' } }],
      model: 'gpt-4o-mini',
    });

    const res = await request(app)
      .post('/api/image')
      .attach('image', Buffer.from('fake'), { filename: 'test.gif', contentType: 'image/gif' });

    expect(res.status).toBe(200);
  });
});

describe('Category Classification', () => {
  beforeEach(() => {
    app.use('/api', imageRouter);
  });

  const categories = [
    'Infrastructure',
    'Education',
    'Revenue',
    'Health',
    'Water Supply & Sanitation',
    'Electricity & Power',
    'Transportation',
    'Municipal Services',
    'Police Services',
    'Environment',
    'Housing & Urban Development',
    'Social Welfare',
    'Public Grievances',
  ];

  categories.forEach((category) => {
    it(`can classify image as ${category}`, async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: category,
                complaint: `Test complaint for ${category}`,
              }),
            },
          },
        ],
        model: 'gpt-4o-mini',
      });

      const res = await request(app)
        .post('/api/image')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.category).toBe(category);
    });
  });
});
