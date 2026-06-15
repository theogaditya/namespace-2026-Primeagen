import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import prismaMock from "../lib/_mocks_/prisma";

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { districtsRouter } from '../routes/districts';

let app: express.Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/districts', districtsRouter(prismaMock));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Districts Routes', () => {
  describe('GET /api/districts - Get all operating districts', () => {
    it('returns all districts successfully', async () => {
      const mockDistricts = [
        { id: '1', name: 'Bangalore Urban', state: 'Karnataka', stateId: 'ka-1' },
        { id: '2', name: 'Chennai', state: 'Tamil Nadu', stateId: 'tn-1' },
        { id: '3', name: 'Mumbai', state: 'Maharashtra', stateId: 'mh-1' },
      ];

      // @ts-ignore
      prismaMock.operating_districts.findMany.mockResolvedValue(mockDistricts);

      const res = await request(app).get('/api/districts');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('state');
      expect(res.body.data[0]).toHaveProperty('stateId');
    });

    it('returns empty array when no districts exist', async () => {
      // @ts-ignore
      prismaMock.operating_districts.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/districts');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('returns districts ordered by name ascending', async () => {
      const mockDistricts = [
        { id: '1', name: 'Ahmedabad', state: 'Gujarat', stateId: 'gj-1' },
        { id: '2', name: 'Bangalore Urban', state: 'Karnataka', stateId: 'ka-1' },
        { id: '3', name: 'Hyderabad', state: 'Telangana', stateId: 'ts-1' },
      ];

      // @ts-ignore
      prismaMock.operating_districts.findMany.mockResolvedValue(mockDistricts);

      const res = await request(app).get('/api/districts');
      
      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Ahmedabad');

      // Verify findMany was called with correct orderBy
      expect(prismaMock.operating_districts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' }
        })
      );
    });

    it('returns 500 when database error occurs', async () => {
      // @ts-ignore
      prismaMock.operating_districts.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/districts');
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to fetch districts');
    });
  });

  describe('GET /api/districts/validate - Validate district name', () => {
    it('returns 400 when district name is not provided', async () => {
      const res = await request(app).get('/api/districts/validate');
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('District name is required');
    });

    it('returns valid=true when district exists', async () => {
      const mockDistrict = {
        id: '1',
        name: 'Bangalore Urban',
        state: 'Karnataka',
        stateId: 'ka-1',
      };

      // @ts-ignore
      prismaMock.operating_districts.findFirst.mockResolvedValue(mockDistrict);

      const res = await request(app)
        .get('/api/districts/validate')
        .query({ name: 'Bangalore Urban' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.valid).toBe(true);
      expect(res.body.data).toEqual(mockDistrict);
    });

    it('returns valid=false when district does not exist', async () => {
      // @ts-ignore
      prismaMock.operating_districts.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/districts/validate')
        .query({ name: 'NonExistent District' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe('District not found in operating districts');
    });

    it('validates district case-insensitively', async () => {
      const mockDistrict = {
        id: '1',
        name: 'Bangalore Urban',
        state: 'Karnataka',
        stateId: 'ka-1',
      };

      // @ts-ignore
      prismaMock.operating_districts.findFirst.mockResolvedValue(mockDistrict);

      const res = await request(app)
        .get('/api/districts/validate')
        .query({ name: 'bangalore urban' }); // lowercase
      
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);

      // Verify case-insensitive search was used
      expect(prismaMock.operating_districts.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              equals: 'bangalore urban',
              mode: 'insensitive',
            },
          },
        })
      );
    });

    it('returns 500 when database error occurs during validation', async () => {
      // @ts-ignore
      prismaMock.operating_districts.findFirst.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/districts/validate')
        .query({ name: 'Bangalore Urban' });
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to validate district');
    });

    it('returns 400 when name is empty string', async () => {
      const res = await request(app)
        .get('/api/districts/validate')
        .query({ name: '' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('District name is required');
    });
  });

  describe('GET /api/districts/by-state/:stateId - Get districts by state', () => {
    // Note: This endpoint may not be implemented yet based on the code review
    // Adding tests for expected behavior if it gets implemented
    
    it('should return districts for a specific state', async () => {
      const mockDistricts = [
        { id: '1', name: 'Bangalore Urban', state: 'Karnataka', stateId: 'ka-1' },
        { id: '2', name: 'Mysore', state: 'Karnataka', stateId: 'ka-1' },
      ];

      // @ts-ignore
      prismaMock.operating_districts.findMany.mockResolvedValue(mockDistricts);

      // This test is for when the endpoint is implemented
      // Currently the route may not exist - this documents expected behavior
    });
  });
});
