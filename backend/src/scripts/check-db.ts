import 'dotenv/config';
import { db } from '../plugins/drizzle.js';
import { sql } from 'drizzle-orm';
import { users, roles, products, customers, purchaseOrders, sales } from '../db/schema.js';

async function run() {
	try {
		const u = await db.select({
			name: users.name,
			phone: users.phone,
			role: roles.name,
			permissions: roles.permissions
		}).from(users).leftJoin(roles, sql`users.role_id = roles.id`);
		console.log("USERS:", u);

		const p = await db.select({ count: sql`count(*)` }).from(products);
		const c = await db.select({ count: sql`count(*)` }).from(customers);
		const pu = await db.select({ count: sql`count(*)` }).from(purchaseOrders);
		const s = await db.select({ count: sql`count(*)` }).from(sales);
		
		console.log("PRODUCTS:", p[0].count);
		console.log("CUSTOMERS:", c[0].count);
		console.log("PURCHASES:", pu[0].count);
		console.log("SALES:", s[0].count);
	} catch (e) {
		console.error(e);
	}
	process.exit(0);
}
run();
