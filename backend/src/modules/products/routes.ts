import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { products, productStock, categories, warehouses } from "../../db/schema.js";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";

const productSchema = z.object({
	name: z.string().min(1, "Nama produk wajib diisi").max(255),
	categoryId: z.string().uuid().nullable().optional(),
	sku: z.string().max(100).nullable().optional(),
	barcode: z.string().max(100).nullable().optional(),
	costPrice: z.number().min(0),
	sellPrice: z.number().min(0),
	minStock: z.number().min(0).default(5),
	initialStock: z.number().min(0).default(0),
});

export default async function productRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.get("/", { preHandler: [app.requirePermission('products.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const { search } = request.query as any;

			// Base conditions
			let conditions: any[] = [eq(products.businessId, businessId)];

			if (search) {
				conditions.push(or(
					ilike(products.name, `%${search}%`),
					ilike(products.sku, `%${search}%`),
					ilike(products.barcode, `%${search}%`)
				));
			}

			// Subquery for stock
			const stockSubquery = db.select({
				productId: productStock.productId,
				total: sql`SUM(${productStock.quantity})`.as('total')
			}).from(productStock).groupBy(productStock.productId).as('stockSubquery');

			const result = await db.select({
				id: products.id,
				businessId: products.businessId,
				categoryId: products.categoryId,
				name: products.name,
				sku: products.sku,
				barcode: products.barcode,
				costPrice: products.costPrice,
				sellPrice: products.sellPrice,
				minStock: products.minStock,
				createdAt: products.createdAt,
				updatedAt: products.updatedAt,
				categoryName: categories.name,
				stock: sql`COALESCE(${stockSubquery.total}, 0)`
			})
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
			.where(and(...conditions))
			.orderBy(desc(products.createdAt));

			return reply.send({ success: true, data: result });
		} catch (err: unknown) {
			app.log.error(err);
			return reply
				.status(500)
				.send({ success: false, error: { message: "Gagal mengambil produk" } });
		}
	});

	app.post("/", { preHandler: [app.requirePermission('products.write')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const data = productSchema.parse(request.body);

			const result = await db.transaction(async (tx) => {
				const whRes = await tx.select().from(warehouses).where(and(eq(warehouses.businessId, businessId), eq(warehouses.isDefault, true))).limit(1);
				if (whRes.length === 0) throw new Error("Gudang utama tidak ditemukan");
				const warehouseId = whRes[0].id;

				const [newProduct] = await tx.insert(products).values({
					businessId,
					categoryId: data.categoryId || null,
					sku: data.sku,
					barcode: data.barcode,
					name: data.name,
					costPrice: data.costPrice.toString(),
					sellPrice: data.sellPrice.toString(),
					minStock: data.minStock,
				}).returning();

				await tx.insert(productStock).values({
					productId: newProduct.id,
					warehouseId,
					quantity: data.initialStock,
				});

				return { ...newProduct, stock: data.initialStock };
			});

			return reply.status(201).send({ success: true, data: result });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal menyimpan produk";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});

	app.get("/:id/barcode", { preHandler: [app.requirePermission('products.read')] }, async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { businessId } = request.user;
			const p = await db.query.products.findFirst({
				where: and(eq(products.id, id), eq(products.businessId, businessId))
			});
			if (!p || (!p.barcode && !p.sku)) throw new Error("Produk tidak valid untuk barcode");
			
			const bwipjs = await import('bwip-js');
			const text = p.barcode || p.sku || p.id;
			const buffer = await bwipjs.toBuffer({
				bcid: 'code128',
				text: text,
				scale: 3,
				height: 10,
				includetext: true,
				textxalign: 'center',
			});
			reply.header('Content-Type', 'image/png');
			return reply.send(buffer);
		} catch (err: unknown) {
			return reply.status(400).send({ success: false, error: { message: "Gagal generate barcode" } });
		}
	});

	app.get("/:id/qrcode", { preHandler: [app.requirePermission('products.read')] }, async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { businessId } = request.user;
			const p = await db.query.products.findFirst({
				where: and(eq(products.id, id), eq(products.businessId, businessId))
			});
			if (!p) throw new Error("Produk tidak ditemukan");
			
			const bwipjs = await import('bwip-js');
			const text = JSON.stringify({ id: p.id, sku: p.sku, name: p.name });
			const buffer = await bwipjs.toBuffer({
				bcid: 'qrcode',
				text: text,
				scale: 5,
			});
			reply.header('Content-Type', 'image/png');
			return reply.send(buffer);
		} catch (err: unknown) {
			return reply.status(400).send({ success: false, error: { message: "Gagal generate QR Code" } });
		}
	});
}
