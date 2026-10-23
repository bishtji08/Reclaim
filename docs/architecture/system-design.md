# System Design Architecture

## Overview
REclaim is a full-stack campus Lost and Found Management System built with:
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite, Lucide Icons, Leaflet.
- **Backend**: Express.js (Node.js), modular 3-tier architecture (Controllers, Services, Repositories).
- **Database**: PostgreSQL with PostGIS extension hosted on Supabase.
- **Authentication**: Supabase Auth (`auth.users`) with application profiles in `public.users`.

## Architectural Tiers
1. **Presentation Layer**: React Single Page Application (SPA) structured by features (`features/auth`, `features/items`, etc.).
2. **API & Controller Layer**: Express router delegating to controllers with input validation.
3. **Service Layer**: Business logic, domain rules, and security enforcement.
4. **Repository Layer**: Data persistence and database queries via PostgreSQL connection pool.
5. **Database Layer**: PostgreSQL with Row-Level Security, automated triggers, and spatial indexing.
