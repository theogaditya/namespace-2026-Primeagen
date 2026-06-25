-- AlterEnum
-- This must run in its own committed transaction before the CivicPartner table
-- uses 'CIVIC_PARTNER' as a default. PostgreSQL requires new enum values to be
-- committed before they can be referenced by DDL in the same session.
ALTER TYPE "AccessLevel" ADD VALUE 'CIVIC_PARTNER';
