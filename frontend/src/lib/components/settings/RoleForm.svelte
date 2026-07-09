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

<div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
	<div class="bg-paper w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
		<!-- Header -->
		<div class="px-6 py-4 border-b border-border flex justify-between items-center bg-paper">
			<h3 class="text-xl font-bold font-grotesk text-ink">
				{role?.id ? 'Ubah Hak Akses (Role)' : 'Tambah Role Baru'}
			</h3>
			<button class="text-ink-faint hover:text-ink p-2 rounded-full hover:bg-paper-alt" onclick={oncancel}>
				<X class="w-5 h-5" />
			</button>
		</div>

		<!-- Form Content -->
		<div class="p-6 overflow-y-auto flex-1 space-y-6 bg-paper">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono" for="role-name">Nama Role <span class="text-cta">*</span></label>
					<Input id="role-name" bind:value={name} placeholder="Misal: Staff Gudang" required class="h-12 rounded-xl border-border bg-paper-alt font-medium" />
				</div>
				<div class="space-y-2">
					<label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono" for="role-desc">Deskripsi</label>
					<Input id="role-desc" bind:value={description} placeholder="Misal: Hanya bisa mengelola stok" class="h-12 rounded-xl border-border bg-paper-alt font-medium" />
				</div>
			</div>

			<div class="space-y-4">
				<h4 class="font-bold font-grotesk text-lg border-b border-border pb-2 text-ink">Matriks Hak Akses</h4>
				<p class="text-sm text-ink-soft -mt-2">Pilih menu dan aksi apa saja yang boleh dilakukan oleh role ini.</p>
				
				<div class="grid gap-4 sm:grid-cols-2">
					{#each PERMISSION_GROUPS as group}
						<div class="bg-paper-alt p-4 rounded-2xl border border-border">
							<h5 class="font-bold font-grotesk mb-3 text-ink text-sm">{group.title}</h5>
							<div class="space-y-3">
								{#each group.options as opt}
									<label class="flex items-center space-x-3 cursor-pointer">
										<input 
											type="checkbox"
											class="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand"
											checked={permissions.includes(opt.id) || permissions.includes('*')}
											disabled={permissions.includes('*')}
											onchange={() => togglePermission(opt.id)}
										/>
										<span class="text-sm leading-none font-medium text-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
		<div class="px-6 py-4 border-t border-border flex justify-end gap-3 bg-paper mt-auto">
			<Button variant="outline" onclick={oncancel} class="rounded-xl h-11 font-bold border-border">Batal</Button>
			<Button variant="cta" onclick={handleSubmit} disabled={!name} class="rounded-xl h-11 font-bold">Simpan Role</Button>
		</div>
	</div>
</div>
