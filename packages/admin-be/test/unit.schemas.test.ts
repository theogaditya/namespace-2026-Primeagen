import { vi, describe, it, expect } from 'vitest';
import {
  unifiedLoginSchema,
  adminTypeEnum,
} from '../lib/schemas/authSchema';
import {
  agentSchema,
  loginSchema,
} from '../lib/schemas/agentSchema';
import {
  superAdminLoginSchema,
  createSuperAdminSchema,
  createStateAdminSchema,
  createMunicipalAdminSchema,
  deleteAdminSchema,
  changePasswordSchema,
} from '../lib/schemas/superAdminSchema';

describe('Auth Schemas', () => {
  describe('adminTypeEnum', () => {
    it('should accept valid admin types', () => {
      expect(adminTypeEnum.parse('SUPER_ADMIN')).toBe('SUPER_ADMIN');
      expect(adminTypeEnum.parse('STATE_ADMIN')).toBe('STATE_ADMIN');
      expect(adminTypeEnum.parse('MUNICIPAL_ADMIN')).toBe('MUNICIPAL_ADMIN');
      expect(adminTypeEnum.parse('AGENT')).toBe('AGENT');
    });

    it('should reject invalid admin types', () => {
      expect(() => adminTypeEnum.parse('INVALID')).toThrow();
      expect(() => adminTypeEnum.parse('')).toThrow();
      expect(() => adminTypeEnum.parse(123)).toThrow();
    });
  });

  describe('unifiedLoginSchema', () => {
    it('should validate correct login data', () => {
      const result = unifiedLoginSchema.safeParse({
        officialEmail: 'admin@test.com',
        password: 'password123',
        adminType: 'SUPER_ADMIN',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = unifiedLoginSchema.safeParse({
        officialEmail: 'not-an-email',
        password: 'password123',
        adminType: 'SUPER_ADMIN',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = unifiedLoginSchema.safeParse({
        officialEmail: 'admin@test.com',
        password: '12345', // less than 6 chars
        adminType: 'SUPER_ADMIN',
      });

      expect(result.success).toBe(false);
    });

    it('should reject too long password', () => {
      const result = unifiedLoginSchema.safeParse({
        officialEmail: 'admin@test.com',
        password: 'a'.repeat(101), // more than 100 chars
        adminType: 'SUPER_ADMIN',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing adminType', () => {
      const result = unifiedLoginSchema.safeParse({
        officialEmail: 'admin@test.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Agent Schemas', () => {
  describe('agentSchema', () => {
    it('should validate correct agent data', () => {
      const result = agentSchema.safeParse({
        email: 'agent@test.com',
        fullName: 'Test Agent',
        password: 'password123',
        phoneNumber: '9876543210',
        officialEmail: 'agent.official@gov.in',
        department: 'WATER_SUPPLY_SANITATION',
        municipality: 'Test City',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid department', () => {
      const result = agentSchema.safeParse({
        email: 'agent@test.com',
        fullName: 'Test Agent',
        password: 'password123',
        phoneNumber: '9876543210',
        officialEmail: 'agent.official@gov.in',
        department: 'INVALID_DEPARTMENT',
        municipality: 'Test City',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = agentSchema.safeParse({
        email: 'agent@test.com',
        fullName: 'Test Agent',
        password: '12345',
        phoneNumber: '9876543210',
        officialEmail: 'agent.official@gov.in',
        department: 'WATER_SUPPLY_SANITATION',
        municipality: 'Test City',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid email formats', () => {
      const result = agentSchema.safeParse({
        email: 'not-an-email',
        fullName: 'Test Agent',
        password: 'password123',
        phoneNumber: '9876543210',
        officialEmail: 'also-not-an-email',
        department: 'WATER_SUPPLY_SANITATION',
        municipality: 'Test City',
      });

      expect(result.success).toBe(false);
    });

    it('should accept all valid department values', () => {
      const departments = [
        'INFRASTRUCTURE',
        'EDUCATION',
        'REVENUE',
        'HEALTH',
        'WATER_SUPPLY_SANITATION',
        'ELECTRICITY_POWER',
        'TRANSPORTATION',
        'MUNICIPAL_SERVICES',
        'POLICE_SERVICES',
        'ENVIRONMENT',
        'HOUSING_URBAN_DEVELOPMENT',
        'SOCIAL_WELFARE',
        'PUBLIC_GRIEVANCES',
      ];

      departments.forEach((dept) => {
        const result = agentSchema.safeParse({
          email: 'agent@test.com',
          fullName: 'Test Agent',
          password: 'password123',
          phoneNumber: '9876543210',
          officialEmail: 'agent.official@gov.in',
          department: dept,
          municipality: 'Test City',
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        officialEmail: 'agent@test.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        officialEmail: 'agent@test.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        officialEmail: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Super Admin Schemas', () => {
  describe('superAdminLoginSchema', () => {
    it('should validate correct login data', () => {
      const result = superAdminLoginSchema.safeParse({
        officialEmail: 'super@admin.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = superAdminLoginSchema.safeParse({
        officialEmail: 'invalid-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = superAdminLoginSchema.safeParse({
        officialEmail: 'super@admin.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createSuperAdminSchema', () => {
    it('should validate correct super admin data', () => {
      const result = createSuperAdminSchema.safeParse({
        fullName: 'Super Admin',
        officialEmail: 'super@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
      });

      expect(result.success).toBe(true);
    });

    it('should allow optional phoneNumber', () => {
      const result = createSuperAdminSchema.safeParse({
        fullName: 'Super Admin',
        officialEmail: 'super@admin.com',
        password: 'password12345',
      });

      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const result = createSuperAdminSchema.safeParse({
        fullName: 'A',
        officialEmail: 'super@admin.com',
        password: 'password12345',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = createSuperAdminSchema.safeParse({
        fullName: 'Super Admin',
        officialEmail: 'super@admin.com',
        password: '1234567', // less than 8 chars
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createStateAdminSchema', () => {
    it('should validate correct state admin data', () => {
      const result = createStateAdminSchema.safeParse({
        fullName: 'State Admin',
        officialEmail: 'state@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
        department: 'WATER_SUPPLY_SANITATION',
        state: 'Karnataka',
      });

      expect(result.success).toBe(true);
    });

    it('should default managedMunicipalities to empty array', () => {
      const result = createStateAdminSchema.safeParse({
        fullName: 'State Admin',
        officialEmail: 'state@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
        department: 'WATER_SUPPLY_SANITATION',
        state: 'Karnataka',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.managedMunicipalities).toEqual([]);
      }
    });

    it('should reject short phone number', () => {
      const result = createStateAdminSchema.safeParse({
        fullName: 'State Admin',
        officialEmail: 'state@admin.com',
        phoneNumber: '123456789', // less than 10 digits
        password: 'password12345',
        department: 'WATER_SUPPLY_SANITATION',
        state: 'Karnataka',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid department', () => {
      const result = createStateAdminSchema.safeParse({
        fullName: 'State Admin',
        officialEmail: 'state@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
        department: 'INVALID_DEPARTMENT',
        state: 'Karnataka',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createMunicipalAdminSchema', () => {
    it('should validate correct municipal admin data', () => {
      const result = createMunicipalAdminSchema.safeParse({
        fullName: 'Municipal Admin',
        officialEmail: 'municipal@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
        department: 'Water Supply',
        municipality: 'Bangalore',
      });

      expect(result.success).toBe(true);
    });

    it('should allow optional managedByStateAdminId', () => {
      const result = createMunicipalAdminSchema.safeParse({
        fullName: 'Municipal Admin',
        officialEmail: 'municipal@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
        department: 'Water Supply',
        municipality: 'Bangalore',
        managedByStateAdminId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for managedByStateAdminId', () => {
      const result = createMunicipalAdminSchema.safeParse({
        fullName: 'Municipal Admin',
        officialEmail: 'municipal@admin.com',
        phoneNumber: '9876543210',
        password: 'password12345',
        department: 'Water Supply',
        municipality: 'Bangalore',
        managedByStateAdminId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('deleteAdminSchema', () => {
    it('should validate correct UUID', () => {
      const result = deleteAdminSchema.safeParse({
        adminId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = deleteAdminSchema.safeParse({
        adminId: 'not-a-valid-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate matching passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject non-matching passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: '1234567', // less than 8 chars
        confirmPassword: '1234567',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(false);
    });
  });
});
