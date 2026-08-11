//"Load the variables from my .env file so my Node.js application can access them
require('dotenv').config();

module.exports = {
    schema: './db/schema.js',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
};