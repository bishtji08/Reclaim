# Lost and Found Management System - Backend

A backend API for campus lost-and-found reporting, protected claim review, matching, and geospatial search.

## Features

### Core Features
- **User Authentication & Authorization**: Supabase Auth (`auth.users`) with application roles held in `public.users`
- **Item Management**: CRUD operations for lost and found items with multimedia support
- **Advanced Search**: Full-text search with filtering by category, location, date, and geo-spatial queries
- **Smart Matching**: AI-assisted item matching based on multiple criteria
- **Claim Management**: Secure claim submission and review process
- **Notifications**: In-app notification centre with secure polling

### Advanced Features
- **Geo-spatial Queries**: PostGIS integration for location-based searches
- **Audit Trail**: Complete logging of all system activities
- **Fraud Prevention**: server-derived claim identity, private proof files, and audit logging
- **Analytics**: Comprehensive reporting and statistics
- **File Upload**: Secure image upload with validation

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with PostGIS extension
- **Authentication**: Supabase Auth sessions
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Inspect the existing Supabase schema**
   ```bash
   # Set DATABASE_URL and DATABASE_SSL_CA_PATH first, then run:
   npm run inspect:schema
   ```

   The inspection reads catalog metadata only. It does not read application
   data or modify the database. Download the project CA from Supabase Database
   Settings > SSL Configuration and save it as `backend/certs/prod-supabase.crt`.

5. **Apply an approved integration migration**

   Do not run the legacy `npm run migrate` command: it is intentionally
   disabled to protect an existing database. Review the inspected columns,
   foreign keys, triggers, and RLS policies first, then apply only a dedicated,
   idempotent migration from `supabase/migrations/`.

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lost_found_db
DB_USER=your_username
DB_PASSWORD=your_password

# Supabase Auth (use a publishable/anon key only; never a service-role key)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_publishable_or_anon_key

# Use the per-project Supabase CA for verified TLS to the database.
DATABASE_SSL_CA_PATH=./certs/prod-supabase.crt

# Rate limits
AUTH_RATE_LIMIT_MAX=10
API_RATE_LIMIT_MAX=100

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout

### Items
- `GET /api/items` - Get all items with filtering
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/items/:id/matches` - Get potential matches
- `PATCH /api/items/:id/status` - Update item status

### Claims
- `GET /api/claims` - Get all claims (admin/finder)
- `GET /api/claims/my-claims` - Get user's claims
- `GET /api/claims/:id` - Get single claim
- `POST /api/claims` - Submit new claim
- `PATCH /api/claims/:id/review` - Review claim (admin/finder)
- `PATCH /api/claims/:id/withdraw` - Withdraw claim

### Categories & Locations
- `GET /api/categories` - Get all categories
- `GET /api/locations` - Get all locations

### Analytics (Admin only)
- `GET /api/analytics/dashboard` - Get dashboard statistics
- `GET /api/analytics/reports` - Get detailed reports

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following main tables:

- **auth.users**: Supabase-owned credentials, authentication, and sessions
- **public.users**: Application profile and role data, linked by the same UUID
- **items**: Lost and found items with geo-spatial data
- **categories/subcategories**: Item classification system
- **locations**: Predefined locations with coordinates
- **claims**: Item claim requests; the server derives the claimer identity
- **notifications**: Per-user in-app notifications
- **audit_logs**: Complete activity tracking
- **tags**: Flexible tagging system

## Advanced Features

### Smart Matching Algorithm
The system includes a PostgreSQL function `find_potential_matches()` that scores potential matches based on:
- Category similarity (40% weight)
- Color matching (30% weight)
- Location proximity (20% weight)
- Time proximity (10% weight)

### Geo-spatial Queries
Using PostGIS extension for:
- Location-based item searches
- Distance calculations
- Coordinate storage and querying

### Security Features
- Supabase-managed authentication and sessions; passwords never enter `public.users`
- Role-based access control from server-controlled `public.users.role`
- Authentication and sensitive-action rate limiting
- Input validation, pagination limits, and safe sort allowlists
- SQL injection prevention
- Private authenticated media delivery for claim proof files
- Restricted CORS, security headers, and Supabase RLS/direct-access revocation

## Development

### Code Structure
```
backend/
├── config/          # Database and app configuration
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── utils/           # Utility functions
├── scripts/         # Database scripts
└── uploads/         # File upload directory
```

The integration contract is [../supabase/schema.sql](../supabase/schema.sql). It deliberately contains no bootstrap SQL for an existing project. Run `npm run inspect:schema` with a verified Supabase CA before creating a targeted migration.

### Adding New Features
1. Create route handlers in `routes/`
2. Add middleware if needed in `middleware/`
3. Add a reviewed, idempotent migration under `../supabase/migrations/`
4. Add validation rules in `middleware/validation.js`
5. Update API documentation

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy (Nginx)
4. Configure SSL certificates
5. Set up database backups
6. Configure monitoring and logging

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
