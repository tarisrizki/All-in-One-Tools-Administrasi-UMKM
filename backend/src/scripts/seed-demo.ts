import 'dotenv/config';
import { db } from '../plugins/drizzle.js';
import { users, roles, businesses, warehouses, categories, products, customers, suppliers, productStock } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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
		let cats = await db.select().from(categories).where(eq(categories.businessId, businessId));
		if (cats.length === 0) {
			await db.insert(categories).values([
				{ businessId, name: 'Minuman Kopi', description: 'Kopi susu, espresso, dll' },
				{ businessId, name: 'Makanan Ringan', description: 'Camilan dan gorengan' }
			]);
			cats = await db.select().from(categories).where(eq(categories.businessId, businessId));
		}
		const cat1 = cats.find(c => c.name === 'Minuman Kopi') || cats[0];
		const cat2 = cats.find(c => c.name === 'Makanan Ringan') || cats[0];

		if (cat1 && cat2) {
			// 5. Inject Produk (harga & stok memakai nama kolom asli: sellPrice/costPrice,
			// stok disimpan terpisah di tabel productStock -- bukan kolom langsung di products)
			console.log('Menginjeksi produk...');
			const insertedProducts = await db.insert(products).values([
				{
					businessId,
					categoryId: cat1.id,
					sku: `KP-${Date.now().toString().slice(-4)}`,
					name: 'Kopi Susu Gula Aren',
					description: 'Kopi susu manis dengan gula aren asli',
					sellPrice: '18000',
					costPrice: '10000',
					minStock: 10,
					unit: 'Cup',
					barcode: `899${Date.now().toString().slice(-8)}`
				},
				{
					businessId,
					categoryId: cat1.id,
					sku: `KP-${Date.now().toString().slice(-4)}A`,
					name: 'Americano Dingin',
					description: 'Espresso dengan es batu',
					sellPrice: '15000',
					costPrice: '8000',
					minStock: 20,
					unit: 'Cup',
					barcode: `899${(Date.now() + 1).toString().slice(-8)}`
				},
				{
					businessId,
					categoryId: cat2.id,
					sku: `MK-${Date.now().toString().slice(-4)}`,
					name: 'Kentang Goreng',
					description: 'Kentang goreng renyah',
					sellPrice: '12000',
					costPrice: '6000',
					minStock: 5,
					unit: 'Porsi',
					barcode: `899${(Date.now() + 2).toString().slice(-8)}`
				}
			]).onConflictDoNothing().returning({ id: products.id });

			const stockByProduct = [50, 100, 30];
			if (insertedProducts.length > 0 && defaultWarehouseId) {
				await db.insert(productStock).values(
					insertedProducts.map((p, i) => ({
						productId: p.id,
						warehouseId: defaultWarehouseId,
						quantity: stockByProduct[i] ?? 20
					}))
				).onConflictDoNothing();
			}
		}

		// 6. Inject Customers
		console.log('Menginjeksi pelanggan...');
		await db.insert(customers).values([
			{ businessId, name: 'Budi Santoso', phone: `0812${Date.now().toString().slice(-8)}`, loyaltyPoints: 1500, createdBy: demoUser.id },
			{ businessId, name: 'Siti Aminah', phone: `0898${Date.now().toString().slice(-8)}`, loyaltyPoints: 500, createdBy: demoUser.id },
			{ businessId, name: 'Andi Pratama', phone: `0856${Date.now().toString().slice(-8)}`, loyaltyPoints: 0, createdBy: demoUser.id }
		]).onConflictDoNothing();

		// 7. Inject Suppliers (tabel suppliers tidak punya kolom createdBy)
		console.log('Menginjeksi supplier...');
		await db.insert(suppliers).values([
			{ businessId, name: 'Distributor Kopi Nusantara', phone: `02199${Date.now().toString().slice(-6)}`, address: 'Jl. Sudirman No. 10' },
			{ businessId, name: 'Toko Kemasan Plastik', phone: `02155${Date.now().toString().slice(-6)}`, address: 'Pasar Baru' }
		]).onConflictDoNothing();

		console.log('✅ Demo data berhasil diinjeksi!');
		process.exit(0);
	} catch (error) {
		console.error('Error seeding demo data:', error);
		process.exit(1);
	}
}

main();
