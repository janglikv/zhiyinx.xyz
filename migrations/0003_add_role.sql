-- Add role column to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Set admin role for the built-in admin account
UPDATE users SET role = 'admin' WHERE email = 'admin@zhiyinx.xyz';
