import 'dotenv/config';
import { db } from '../plugins/drizzle.js';
import { users, roles, businesses, warehouses, categories, products, customers, suppliers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function main() {
	try {
		console.log('Seeding demo data...');

		// 1. Dapatkan user pertama yang ada di database (akun demo yang sedang dipakai)
		const allUsers = await db.select().from(users).limit(1);
		if (allUsers.length === 0) {
			console.error('Tidak ada user di database! Silakan register akun demo terlebih dahulu.');
			process.exit(1);
		}
		
		const demoUser = allUsers[0];
		const businessId = demoUser.businessId;
		const roleId = demoUser.roleId;

		console.log(`Menggunakan Business ID: ${businessId}`);
		console.log(`Menggunakan Role ID: ${roleId}`);

		// 2. Beri izin 'Full Access' [*] ke role yang sedang dipakai user ini
		await db.update(roles).set({ permissions: ['*'] }).where(eq(roles.id, roleId));
		console.log('✅ Akses Full [*] diberikan ke role user (Akses ditolak diperbaiki)');

		// 3. Pastikan ada warehouse
		let defaultWarehouseId = '';
		const wRes = await db.select().from(warehouses).where(eq(warehouses.businessId, businessId)).limit(1);
		if (wRes.length > 0) {
			defaultWarehouseId = wRes[0].id;
		} else {
			const [w] = await db.insert(warehouses).values({
				businessId,
				name: 'Gudang Utama (Demo)',
				isDefault: true
			}).returning({ id: warehouses.id });
			defaultWarehouseId = w.id;
		}

		// 4. Inject Kategori
		console.log('Menginjeksi kategori...');
		await db.delete(categories).where(eq(categories.businessId, businessId));
		const [cat1, cat2] = await db.insert(categories).values([
			{ businessId, name: 'Minuman Kopi', description: 'Kopi susu, espresso, dll' },
			{ businessId, name: 'Makanan Ringan', description: 'Camilan dan gorengan' }
		]).returning({ id: categories.id });

		// 5. Inject Produk
		console.log('Menginjeksi produk...');
		await db.delete(products).where(eq(products.businessId, businessId));
		await db.insert(products).values([
			{
				businessId,
				categoryId: cat1.id,
				sku: 'KP-001',
				name: 'Kopi Susu Gula Aren',
				description: 'Kopi susu manis dengan gula aren asli',
				price: '18000',
				cost: '10000',
				stock: 50,
				minStock: 10,
				unit: 'Cup',
				barcode: '8991234567890'
			},
			{
				businessId,
				categoryId: cat1.id,
				sku: 'KP-002',
				name: 'Americano Dingin',
				description: 'Espresso dengan es batu',
				price: '15000',
				cost: '8000',
				stock: 100,
				minStock: 20,
				unit: 'Cup'
			},
			{
				businessId,
				categoryId: cat2.id,
				sku: 'MK-001',
				name: 'Kentang Goreng',
				description: 'Kentang goreng renyah',
				price: '12000',
				cost: '6000',
				stock: 30,
				minStock: 5,
				unit: 'Porsi'
			}
		]);

		// 6. Inject Customers
		console.log('Menginjeksi pelanggan...');
		await db.delete(customers).where(eq(customers.businessId, businessId));
		await db.insert(customers).values([
			{ businessId, name: 'Budi Santoso', phone: '081234567890', points: 1500, status: 'active' },
			{ businessId, name: 'Siti Aminah', phone: '089876543210', points: 500, status: 'active' },
			{ businessId, name: 'Andi Pratama', phone: '085611223344', points: 0, status: 'active' }
		]);

		// 7. Inject Suppliers
		console.log('Menginjeksi supplier...');
		await db.delete(suppliers).where(eq(suppliers.businessId, businessId));
		await db.insert(suppliers).values([
			{ businessId, name: 'Distributor Kopi Nusantara', phone: '02199887766', address: 'Jl. Sudirman No. 10', status: 'active' },
			{ businessId, name: 'Toko Kemasan Plastik', phone: '02155443322', address: 'Pasar Baru', status: 'active' }
		]);

		console.log('✅ Demo data berhasil diinjeksi!');
		process.exit(0);
	} catch (error) {
		console.error('Error seeding demo data:', error);
		process.exit(1);
	}
}

main();
