import 'dotenv/config';
import { db } from '../plugins/drizzle.js';
import { roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
	try {
		console.log('Seeding role permissions...');
		
		// 1. Ensure Owner has wildcard
		const ownerRes = await db.select().from(roles).where(eq(roles.name, 'owner'));
		if (ownerRes.length > 0) {
			await db.update(roles).set({ permissions: ['*'] }).where(eq(roles.name, 'owner'));
			console.log('Updated owner permissions to [*]');
		} else {
			await db.insert(roles).values({ name: 'owner', description: 'Pemilik Toko (Full Access)', permissions: ['*'] });
			console.log('Inserted owner role with [*]');
		}

		// 2. Ensure Cashier has standard permissions
		const cashierPermissions = ['pos.read', 'pos.write', 'products.read', 'customers.read'];
		const cashierRes = await db.select().from(roles).where(eq(roles.name, 'cashier'));
		if (cashierRes.length > 0) {
			await db.update(roles).set({ permissions: cashierPermissions }).where(eq(roles.name, 'cashier'));
			console.log('Updated cashier permissions to', cashierPermissions);
		} else {
			await db.insert(roles).values({ name: 'cashier', description: 'Kasir', permissions: cashierPermissions });
			console.log('Inserted cashier role with', cashierPermissions);
		}

		console.log('Role permissions seeding completed successfully.');
		process.exit(0);
	} catch (error) {
		console.error('Error seeding roles:', error);
		process.exit(1);
	}
}

main();
