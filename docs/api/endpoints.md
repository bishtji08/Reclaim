# ReClaim API Endpoints Reference

Base URL: `http://localhost:5000/api`

---

## 1. Authentication & Profile (`/api/auth`)
- `POST /api/auth/register`: Register a new student/staff account (hashes password with bcrypt, creates `auth.users` + `public.users` UUID link, creates audit log, returns JWT token & user object).
- `POST /api/auth/login`: Authenticate credentials, verifies active and non-blacklisted status, returns JWT token and sets HttpOnly session cookie `lf_session`.
- `GET /api/auth/profile`: Fetch current authenticated profile details and role.
- `PUT /api/auth/profile`: Update profile information (name, phone, avatar).
- `PUT /api/auth/change-password`: Update password securely (rate-limited).
- `POST /api/auth/logout`: Invalidate session and clear session cookies.

---

## 2. Items & Reports (`/api/items`)
- `GET /api/items`: Search and browse reports.
  - Query params: `q` (full-text search), `type` (lost/found), `category_id`, `location_id`, `status`, `color`, `is_urgent`, `date_from`, `date_to`, `lat`, `lng`, `radius` (km), `page`, `limit`, `sort_by`, `sort_order`.
- `POST /api/items`: Report a lost or found item (supports multipart form data with up to 5 image uploads, tags, specific location, and PostGIS coordinates).
- `GET /api/items/:id`: Get detailed report. Automatically redacts private reporter contact and serial numbers from non-staff/non-owner viewers.
- `PUT /api/items/:id`: Update item details (authorized to owner or admin).
- `DELETE /api/items/:id`: Delete report (authorized to owner or admin).
- `GET /api/items/:id/matches`: Returns top multi-criteria candidate matches using PostgreSQL `find_potential_matches` stored procedure (score and explainable match reasons).
- `PATCH /api/items/:id/status`: Update item lifecycle state (`reported`, `matched`, `claimed`, `returned`, `closed`).
- `POST /api/items/:id/flag`: Flag report as suspicious or inaccurate (authenticated students/staff).
- `PATCH /api/items/:id/suspicious`: Admin moderation to update suspicious status and reason.

---

## 3. Claims & Recovery Workflow (`/api/claims`)
- `GET /api/claims`: List claims with pagination and status filters (admin/finder).
- `GET /api/claims/my-claims`: List authenticated user's submitted claims.
- `GET /api/claims/:id`: Fetch single claim details and uploaded proof images.
- `POST /api/claims`: Submit proof-of-ownership claim for a found item (enforces `prevent_self_claim` trigger).
- `PATCH /api/claims/:id/review`: Approve or reject claim (authorized to item reporter, finder, or administrator). Automatically transitions item status to `claimed` upon approval.
- `PATCH /api/claims/:id/withdraw`: Claimant withdraws their pending claim.

---

## 4. Item Moderation & Flags (`/api/flags`)
- `GET /api/flags`: List all reported suspicious flags with status filter (`pending`, `reviewed`, `dismissed`, `resolved`) and pagination (admin only).
- `PATCH /api/flags/:id`: Admin reviews flag, sets admin notes, updates status, and optionally clears item suspicion.

---

## 5. Reviews & Community Feedback (`/api/reviews`)
- `GET /api/reviews/recent`: Get recent community recovery testimonials, ratings, and aggregate trust score.
- `GET /api/reviews/item/:itemId`: Get feedback reviews for a specific recovered item.
- `POST /api/reviews`: Submit feedback review and 1-5 star rating for a completed item return.

---

## 6. Categories Management (`/api/categories`)
- `GET /api/categories`: List all item categories with nested subcategories.
- `GET /api/categories/:id`: Get single category with subcategories.
- `POST /api/categories`: Create new category with name, description, icon (admin only).
- `PUT /api/categories/:id`: Update category (admin only).
- `DELETE /api/categories/:id`: Delete category (protected against deleting categories with active items, admin only).
- `POST /api/categories/:id/subcategories`: Add subcategory (admin only).
- `DELETE /api/categories/subcategories/:subId`: Delete subcategory (admin only).

---

## 7. Campus Locations & GIS (`/api/locations`)
- `GET /api/locations`: List university buildings and facilities with PostGIS spatial coordinates (`geometry(point, 4326)`).
- `GET /api/locations/:id`: Fetch location details and items reported at this building.
- `GET /api/locations/nearby`: Query locations within radius using PostGIS `ST_DWithin`.

---

## 8. Notifications (`/api/notifications`)
- `GET /api/notifications`: Get user notifications with unread count and pagination.
- `PATCH /api/notifications/:id/read`: Mark notification as read.
- `PATCH /api/notifications/mark-all-read`: Mark all notifications as read.

---

## 9. User Governance & Blacklisting (`/api/users`)
- `GET /api/users`: List users with role and status filters (admin only).
- `GET /api/users/:id`: Get user profile and report statistics.
- `PUT /api/users/:id`: Update user profile and role assignment.
- `PATCH /api/users/:id/activate`: Activate user account.
- `PATCH /api/users/:id/deactivate`: Deactivate user account.
- `PATCH /api/users/:id/blacklist`: Enforce moderation blacklist with reason (blocks login and access, logs to audit trail).
- `PATCH /api/users/:id/unblacklist`: Restore blacklisted user account.

---

## 10. Analytics & Telemetry (`/api/analytics`)
- `GET /api/analytics/dashboard`: System metrics: total lost/found split, resolution rate, top categories, location hotspots, monthly trends, moderation flags, and user counts.
- `GET /api/analytics/reports`: Extended time-series reporting.

---

## 11. Media Uploads (`/api/media`)
- `POST /api/media/upload`: Upload image attachment (multipart/form-data, validated MIME types).
- `GET /api/media/:filename`: Retrieve stored image file.
