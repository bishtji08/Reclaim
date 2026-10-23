# Authentication & Authorization

## Supabase Auth Integration
- All authentication credentials (passwords, tokens) reside in `auth.users`.
- Passwords never enter `public.users`.
- Users are linked by their unique UUID (`id`).

## Role-Based Access Control
- Three roles: `user`, `finder`, `admin`.
- Role escalation is blocked by database trigger `enforce_user_role_security`.
- Non-admin API requests cannot alter user roles.
