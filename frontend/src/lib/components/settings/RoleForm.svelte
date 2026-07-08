<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { X } from 'lucide-svelte';

	let { 
		role = null, 
		onsave, 
		oncancel 
	} = $props<{
		role?: { id?: string; name: string; description: string; permissions: string[] } | null;
		onsave: (data: { id?: string; name: string; description: string; permissions: string[] }) => void;
		oncancel: () => void;
	}>();

	let name = $state('');
	let description = $state('');
	let permissions = $state<string[]>([]);

	$effect(() => {
		if (role) {
			name = role.name || '';
			description = role.description || '';
			permissions = role.permissions ? [...role.permissions] : [];
		} else {
			name = '';
			description = '';
			permissions = [];
		}
	});

	const PERMISSION_GROUPS = [
		{
			title: 'Produk & Kategori',
			options: [
				{ id: 'products.read', label: 'Lihat' },
				{ id: 'products.write', label: 'Tambah / Ubah' },
				{ id: 'products.delete', label: 'Hapus' },
			]
		},
		{
			title: 'Kasir & Penjualan',
			options: [
				{ id: 'pos.read', label: 'Lihat Riwayat' },
				{ id: 'pos.write', label: 'Buat Transaksi' },
			]
		},
		{
			title: 'Pelanggan',
			options: [
				{ id: 'customers.read', label: 'Lihat' },
				{ id: 'customers.write', label: 'Tambah / Ubah' },
				{ id: 'customers.delete', label: 'Hapus' },
			]
		},
		{
			title: 'Pembelian & Supplier',
			options: [
				{ id: 'purchases.read', label: 'Lihat' },
				{ id: 'purchases.manage', label: 'Kelola Penuh' },
			]
		},
		{
			title: 'Keuangan',
			options: [
				{ id: 'cashbook.read', label: 'Lihat Kas' },
				{ id: 'cashbook.write', label: 'Kelola Kas' },
				{ id: 'debts.read', label: 'Lihat Hutang Piutang' },
				{ id: 'debts.manage', label: 'Kelola Hutang Piutang' },
			]
		},
		{
			title: 'Operasional',
			options: [
				{ id: 'reports.read', label: 'Lihat Laporan' },
				{ id: 'employees.manage', label: 'Kelola Karyawan' },
				{ id: 'roles.manage', label: 'Kelola Hak Akses' },
				{ id: 'settings.manage', label: 'Pengaturan & Backup' },
			]
		}
	];

	function togglePermission(id: string) {
		if (permissions.includes(id)) {
			permissions = permissions.filter(p => p !== id);
		} else {
			permissions = [...permissions, id];
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		onsave({
			id: role?.id,
			name,
			description,
			permissions
		});
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
	<div class="bg-surface w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
		<!-- Header -->
		<div class="px-6 py-4 border-b flex justify-between items-center bg-surface">
			<h3 class="text-xl font-bold font-sans">
				{role?.id ? 'Ubah Hak Akses (Role)' : 'Tambah Role Baru'}
			</h3>
			<button class="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted" onclick={oncancel}>
				<X class="w-5 h-5" />
			</button>
		</div>

		<!-- Form Content -->
		<div class="p-6 overflow-y-auto flex-1 space-y-6">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label class="text-sm font-semibold" for="role-name">Nama Role <span class="text-danger">*</span></label>
					<Input id="role-name" bind:value={name} placeholder="Misal: Staff Gudang" required />
				</div>
				<div class="space-y-2">
					<label class="text-sm font-semibold" for="role-desc">Deskripsi</label>
					<Input id="role-desc" bind:value={description} placeholder="Misal: Hanya bisa mengelola stok" />
				</div>
			</div>

			<div class="space-y-4">
				<h4 class="font-bold text-lg border-b pb-2">Matriks Hak Akses</h4>
				<p class="text-sm text-muted-foreground -mt-2">Pilih menu dan aksi apa saja yang boleh dilakukan oleh role ini.</p>
				
				<div class="grid gap-6 sm:grid-cols-2">
					{#each PERMISSION_GROUPS as group}
						<div class="bg-muted/30 p-4 rounded-xl border">
							<h5 class="font-bold mb-3">{group.title}</h5>
							<div class="space-y-3">
								{#each group.options as opt}
									<label class="flex items-center space-x-3 cursor-pointer">
										<input 
											type="checkbox"
											class="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
											checked={permissions.includes(opt.id) || permissions.includes('*')}
											disabled={permissions.includes('*')}
											onchange={() => togglePermission(opt.id)}
										/>
										<span class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
											{opt.label}
										</span>
									</label>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-b border-t flex justify-end gap-3 bg-surface mt-auto">
			<Button variant="outline" onclick={oncancel}>Batal</Button>
			<Button onclick={handleSubmit} disabled={!name}>Simpan Role</Button>
		</div>
	</div>
</div>
