//imports values from .env so the url can be accessed
require('dotenv').config();
//Get the PostgreSQL-related tools from the Drizzle ORM package
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);
module.exports = { db };