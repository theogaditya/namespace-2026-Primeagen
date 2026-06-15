import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import prismaMock from "../lib/_mocks_/prisma";

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { categoriesRouter } from '../routes/categories';

let app: express.Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/categories', categoriesRouter(prismaMock));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Categories Routes', () => {
  describe('GET /api/categories - Get all categories', () => {
    it('returns all categories successfully', async () => {
      const mockCategories = [
        { 
          id: '1', 
          name: 'Infrastructure', 
          assignedDepartment: 'INFRASTRUCTURE',
          subCategories: ['Roads', 'Bridges', 'Public Buildings']
        },
        { 
          id: '2', 
          name: 'Health', 
          assignedDepartment: 'HEALTH',
          subCategories: ['Hospitals', 'Clinics', 'Public Health']
        },
        { 
          id: '3', 
          name: 'Transportation', 
          assignedDepartment: 'TRANSPORTATION',
          subCategories: ['Bus Services', 'Traffic', 'Parking']
        },
      ];

      // @ts-ignore
      prismaMock.category.findMany.mockResolvedValue(mockCategories);

      const res = await request(app).get('/api/categories');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('assignedDepartment');
      expect(res.body.data[0]).toHaveProperty('subCategories');
    });

    it('returns empty array when no categories exist', async () => {
      // @ts-ignore
      prismaMock.category.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/categories');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('returns categories ordered by name ascending', async () => {
      const mockCategories = [
        { id: '1', name: 'Education', assignedDepartment: 'EDUCATION', subCategories: [] },
        { id: '2', name: 'Health', assignedDepartment: 'HEALTH', subCategories: [] },
        { id: '3', name: 'Water Supply', assignedDepartment: 'WATER_SUPPLY_SANITATION', subCategories: [] },
      ];

      // @ts-ignore
      prismaMock.category.findMany.mockResolvedValue(mockCategories);

      const res = await request(app).get('/api/categories');
      
      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Education');
      expect(res.body.data[1].name).toBe('Health');
      expect(res.body.data[2].name).toBe('Water Supply');

      // Verify that findMany was called with correct orderBy
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' }
        })
      );
    });

    it('returns 500 when database error occurs', async () => {
      // @ts-ignore
      prismaMock.category.findMany.mockRejectedValue(new Error('Database connection failed'));

      const res = await request(app).get('/api/categories');
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Failed to fetch categories');
    });

    it('returns categories with correct subCategories structure', async () => {
      const mockCategories = [
        { 
          id: '1', 
          name: 'Municipal Services', 
          assignedDepartment: 'MUNICIPAL_SERVICES',
          subCategories: ['Garbage Collection', 'Street Cleaning', 'Park Maintenance', 'Public Toilets']
        },
      ];

      // @ts-ignore
      prismaMock.category.findMany.mockResolvedValue(mockCategories);

      const res = await request(app).get('/api/categories');
      
      expect(res.status).toBe(200);
      expect(res.body.data[0].subCategories).toBeInstanceOf(Array);
      expect(res.body.data[0].subCategories).toContain('Garbage Collection');
      expect(res.body.data[0].subCategories).toHaveLength(4);
    });
  });
});
