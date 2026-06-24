import { describe, it, expect } from 'vitest';
import {
    userSignupSchema,
    userLoginSchema,
    userLocationSchema,
} from '../lib/validations/validation.user';

describe('User Validation Schemas', () => {
    describe('userLocationSchema', () => {
        const validLocation = {
            pin: '834001',
            district: 'Ranchi',
            city: 'Ranchi',
            locality: 'Main Road',
            municipal: 'Ranchi Municipal',
            state: 'Jharkhand',
        };

        it('validates correct location', () => {
            expect(userLocationSchema.safeParse(validLocation).success).toBe(true);
        });

        it('rejects invalid PIN (not 6 digits)', () => {
            expect(userLocationSchema.safeParse({ ...validLocation, pin: '123' }).success).toBe(false);
            expect(userLocationSchema.safeParse({ ...validLocation, pin: '1234567' }).success).toBe(false);
            expect(userLocationSchema.safeParse({ ...validLocation, pin: 'abcdef' }).success).toBe(false);
        });

        it('rejects empty district', () => {
            expect(userLocationSchema.safeParse({ ...validLocation, district: '' }).success).toBe(false);
        });

        it('allows optional street', () => {
            const withoutStreet = { ...validLocation };
            expect(userLocationSchema.safeParse(withoutStreet).success).toBe(true);
        });

        it('rejects empty state', () => {
            expect(userLocationSchema.safeParse({ ...validLocation, state: '' }).success).toBe(false);
        });
    });

    describe('userSignupSchema', () => {
        const validSignup = {
            email: 'test@example.com',
            phoneNumber: '9876543210',
            name: 'Test User',
            password: 'securepass123',
            dateOfBirth: '2000-01-15',
            aadhaarId: '123456789012',
            preferredLanguage: 'en',
            location: {
                pin: '834001',
                district: 'Ranchi',
                city: 'Ranchi',
                locality: 'Main Road',
                municipal: 'Ranchi Municipal',
                state: 'Jharkhand',
            },
        };

        it('validates correct signup data', () => {
            expect(userSignupSchema.safeParse(validSignup).success).toBe(true);
        });

        it('rejects invalid email', () => {
            expect(userSignupSchema.safeParse({ ...validSignup, email: 'not-email' }).success).toBe(false);
        });

        it('rejects invalid phone number', () => {
            expect(userSignupSchema.safeParse({ ...validSignup, phoneNumber: '123' }).success).toBe(false);
        });

        it('rejects name shorter than 2 characters', () => {
            expect(userSignupSchema.safeParse({ ...validSignup, name: 'A' }).success).toBe(false);
        });

        it('rejects password shorter than 8 characters', () => {
            expect(userSignupSchema.safeParse({ ...validSignup, password: '1234567' }).success).toBe(false);
        });

        it('rejects underage user (under 18)', () => {
            const result = userSignupSchema.safeParse({
                ...validSignup,
                dateOfBirth: '2020-01-01',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid aadhaar (not 12 digits)', () => {
            expect(userSignupSchema.safeParse({ ...validSignup, aadhaarId: '12345' }).success).toBe(false);
            expect(userSignupSchema.safeParse({ ...validSignup, aadhaarId: '1234567890123' }).success).toBe(false);
        });

        it('allows optional disability field', () => {
            const withDisability = { ...validSignup, disability: 'Visual Impairment' };
            expect(userSignupSchema.safeParse(withDisability).success).toBe(true);
        });

        it('rejects missing required fields', () => {
            expect(userSignupSchema.safeParse({}).success).toBe(false);
            expect(userSignupSchema.safeParse({ email: 'test@test.com' }).success).toBe(false);
        });

        // Security edge cases
        it('accepts but does not break on XSS payload in name', () => {
            const result = userSignupSchema.safeParse({
                ...validSignup,
                name: '<script>alert("xss")</script>',
            });
            // Schema validates structure, not content — should pass
            expect(result.success).toBe(true);
        });

        it('accepts extremely long description-like strings', () => {
            const result = userSignupSchema.safeParse({
                ...validSignup,
                name: 'A'.repeat(1000),
            });
            // Schema doesn't limit max length for name — passes validation
            expect(result.success).toBe(true);
        });
    });

    describe('userLoginSchema', () => {
        it('validates correct login data', () => {
            const result = userLoginSchema.safeParse({
                email: 'test@example.com',
                password: 'password123',
                captchaToken: 'valid-token',
            });
            expect(result.success).toBe(true);
        });

        it('rejects invalid email', () => {
            expect(userLoginSchema.safeParse({ email: 'invalid', password: 'pass', captchaToken: 'token' }).success).toBe(false);
        });

        it('rejects empty password', () => {
            expect(userLoginSchema.safeParse({ email: 'test@test.com', password: '', captchaToken: 'token' }).success).toBe(false);
        });

        it('rejects missing email', () => {
            expect(userLoginSchema.safeParse({ password: 'pass', captchaToken: 'token' }).success).toBe(false);
        });

        it('rejects missing password', () => {
            expect(userLoginSchema.safeParse({ email: 'test@test.com', captchaToken: 'token' }).success).toBe(false);
        });

        it('rejects missing captchaToken', () => {
            expect(userLoginSchema.safeParse({ email: 'test@test.com', password: 'pass' }).success).toBe(false);
        });
    });
});
