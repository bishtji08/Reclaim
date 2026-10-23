# Database Setup Guide

1. Configure Supabase project or PostgreSQL database with PostGIS.
2. Set `DATABASE_URL` in `backend/.env`.
3. Apply migration:
```bash
cd backend
npm run migrate
```
4. Seed initial data:
```bash
npm run seed
```
