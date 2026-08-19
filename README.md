Inventory Management API — PostgreSQL + Authentication

A REST API for managing inventory items, built with Node.js, Express, and PostgreSQL (via Drizzle ORM), with JWT-based authentication and role-based access control. Built for Codveda Technology's Full-Stack Development Internship — Level 2, Task 2 (Authentication and Authorization) and Task 3 (Database Integration).

Branch structure: main (Level 1, in-memory) → feature/postgresql-database (Level 2, database only) → feature/authentication (this branch — database + auth combined).

What this branch includes
Full CRUD on inventory items, backed by a real PostgreSQL database (not an in-memory array — data persists across restarts)
User signup and login
Passwords hashed with bcrypt — never stored or returned in plain text
JWT issued on login, required for write operations on items
Role-based access control: staff (default, read + write) vs admin (also allowed to delete)
Tech stack
Node.js + Express
PostgreSQL
Drizzle ORM + drizzle-kit (migrations)
pg (PostgreSQL driver, connection pooling)
bcrypt (password hashing)
jsonwebtoken (JWT signing/verification)
dotenv for environment configuration
Setup

1. Install dependencies

bash
npm install

2. Set up PostgreSQL

sql
CREATE DATABASE stockly_inventory;

(Or via pgAdmin: right-click Databases → Create → Database.)

3. Configure .env

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/stockly_inventory"
JWT_SECRET="a-long-random-string"

Generate a secret with:

bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

.env is gitignored — never commit real credentials.

4. Run migrations (creates both items and users tables)

bash
npx drizzle-kit generate
npx drizzle-kit migrate

5. Start the server

bash
npm run dev     # with nodemon (auto-restart)
# or
npm start

Server runs at http://localhost:5000.

Data model

items

Field	Type	Notes
id	serial, primary key	Auto-generated
name	varchar(255), not null	
sku	varchar(100), not null, unique	
category	varchar(100), not null	Defaults to "Uncategorized"
quantity	integer, not null	
price	numeric(10,2), not null	Stored as a string on insert/update
low_stock_threshold	integer, not null	Defaults to 5

users

Field	Type	Notes
id	serial, primary key	Auto-generated
email	varchar(255), unique, not null	Login identifier
password	varchar(255), not null	bcrypt hash — never the real password
role	varchar(50), not null	"staff" (default) or "admin"
created_at	timestamp, default now	
Auth endpoints
Method	URL	Description	Auth required
POST	/api/auth/signup	Create a new account	No
POST	/api/auth/login	Log in, receive a JWT	No

Signup

json
POST /api/auth/signup
{ "email": "user@example.com", "password": "at-least-8-chars", "role": "admin" }

role is optional, defaults to "staff". Returns 201 with { id, email, role } — password never included in the response.

Login

json
POST /api/auth/login
{ "email": "user@example.com", "password": "at-least-8-chars" }

Returns 200 with { token, user: { id, email, role } }. Token expires after 2 hours.

Item endpoints
Method	URL	Description	Auth required	Role required
GET	/	Health check	No	—
GET	/api/items	Get all items	No	—
GET	/api/items/low-stock	Get items at/below their threshold	No	—
GET	/api/items/:id	Get one item	No	—
POST	/api/items	Create an item	Yes	Any logged-in user
PUT	/api/items/:id	Update an item (partial updates ok)	Yes	Any logged-in user
DELETE	/api/items/:id	Delete an item	Yes	admin only

To call a protected route, include the token from login:

Authorization: Bearer <token>
Error responses
Status	Meaning	Example
400	Invalid input (missing fields, duplicate SKU/email, weak password, negative numbers)	{ "error": "An item with SKU \"...\" already exists" }
401	No token provided, or invalid login credentials	{ "error": "No token provided" }
403	Invalid/expired token, or insufficient role	{ "error": "Only admins can delete items" }
404	Item or route not found	{ "error": "Item not found" }
500	Unexpected server error	{ "error": "Failed to fetch items" }

Login returns the same generic "Invalid email or password" message whether the email doesn't exist or the password is wrong, to avoid revealing which emails have registered accounts.

Verifying persistence
Create an item via POST /api/items (with a valid token)
Stop the server (Ctrl+C), restart it (npm run dev)
GET /api/items — the item is still there
Known limitation

Signup currently allows the client to set their own role, including "admin", directly in the request body. Left open deliberately for testing purposes in this project — a production system would default every signup to the lowest-privilege role and only allow role elevation through a separate, already-authenticated admin action.

Project structure
├── db/
│   ├── schema.js     # items + users table definitions
│   └── index.js       # live database connection (Drizzle + pg pool)
├── drizzle/            # generated migration files
├── drizzle.config.js   # config for the drizzle-kit CLI
├── server.js           # Express app: routes, auth middleware
└── .env                # local secrets (gitignored)