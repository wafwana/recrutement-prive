-- Add a dedicated platform Owner role without changing existing users.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';
