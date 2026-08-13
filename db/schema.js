const { pgTable, serial, varchar, integer, numeric } = require('drizzle-orm/pg-core');

const items = pgTable('items', {
    id: serial('id').primaryKey(),
    name: varchar('name', {length: 255 }).notNull(),
    sku: varchar('sku', {length: 100}).notNull().unique(),
    category: varchar('category', {length: 100}).notNull().default('Uncategorized'),
    quantity: integer('quantity').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
});

const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('staff'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

module.exports = { items, users };
