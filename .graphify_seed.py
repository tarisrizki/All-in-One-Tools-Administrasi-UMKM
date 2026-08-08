import json
import re
from pathlib import Path

ROOT = Path.cwd()
DOCS = [
    Path('CHANGELOG.md'), Path('DEAD_CODE_REPORT.md'), Path('DEPLOY.md'),
    Path('DEPLOYMENT_GUIDE.md'), Path('FAQ.md'), Path('MARKETING.md'),
    Path('MIGRATION-NOTES.md'), Path('README.md'), Path('RELEASE_NOTES.md'),
    Path('ROLLBACK.md'), Path('.github/ISSUE_TEMPLATES/bug_report.md'),
    Path('.github/ISSUE_TEMPLATES/feature_request.md'), Path('docs/ARCHITECTURE.md'),
    Path('docs/FRONTEND_COVERAGE.md'), Path('backend-workers/.github/DEPENDENCY_AUDIT.md'),
    Path('backend-workers/REFACTOR_PLAN.md'), Path('frontend/README.md'),
    Path('frontend/tests/INTEGRATION_CHECKLIST.md'),
]
CONCEPTS = [
    ('stack_sveltekit', 'SvelteKit 5 frontend', ['sveltekit', 'svelte 5']),
    ('stack_hono', 'Hono API framework', ['hono']),
    ('stack_workers', 'Cloudflare Workers runtime', ['cloudflare workers', 'workers']),
    ('stack_supabase', 'Supabase PostgreSQL', ['supabase', 'postgresql']),
    ('security_rls', 'Row Level Security', ['row level security', 'rls']),
    ('security_jwt', 'JWT authentication', ['jwt', 'refresh token']),
    ('offline_dexie', 'Dexie IndexedDB offline sync', ['dexie', 'indexeddb', 'offline-first', 'offline']),
    ('domain_pos', 'Sistem Kasir POS', ['kasir', 'pos']),
    ('domain_qris', 'Pembayaran QRIS', ['qris']),
    ('domain_receipt', 'Cetak struk dan tiket pesanan', ['struk', 'tiket pesanan']),
    ('domain_inventory', 'Inventori produk dan stok', ['inventori', 'stok']),
    ('domain_reports', 'Laporan penjualan dan perputaran stok', ['laporan penjualan', 'perputaran stok']),
    ('domain_debt', 'Kasbon dan cicilan piutang', ['kasbon', 'piutang', 'cicilan']),
    ('domain_loyalty', 'Poin loyalitas pelanggan', ['loyalitas', 'poin loyalitas']),
    ('domain_tax', 'Pajak per produk', ['pajak per produk']),
    ('domain_order_types', 'Tipe order dan biaya layanan', ['tipe order', 'biaya layanan']),
    ('domain_preorder', 'Pre-order dengan uang muka', ['pre-order', 'pre order', 'uang muka']),
    ('domain_ingredients', 'Bahan baku dan resep', ['bahan baku']),
    ('domain_wholesale', 'Harga grosir', ['harga grosir']),
    ('domain_expiry', 'Pengingat kedaluarsa produk', ['kedaluarsa']),
    ('domain_outlets', 'Outlet utama dan cabang', ['outlet cabang', 'multi-outlet', 'outlet']),
    ('domain_staff', 'Pegawai dan otorisasi', ['pegawai', 'otorisasi']),
    ('domain_attendance', 'Absensi pegawai', ['absensi']),
    ('domain_discounts', 'Diskon bisnis', ['diskon']),
    ('deploy_proxmox', 'Self-host Proxmox/VPS', ['proxmox', 'self-host', 'self host']),
    ('deploy_nginx', 'Nginx static frontend', ['nginx', 'adapter-static']),
    ('security_rate_limit', 'Rate limiting anti brute-force', ['rate limit', 'brute-force']),
]

def sid(path):
    return 'doc_' + re.sub(r'[^a-z0-9]+', '_', str(path).lower()).strip('_')

nodes = []
edges = []
seen = set()
for path in DOCS:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8', errors='ignore').lower()
    doc_id = sid(path)
    nodes.append({'id': doc_id, 'label': path.name, 'file_type': 'document', 'source_file': str(path).replace('\\', '/'), 'source_location': None, 'source_url': None, 'captured_at': None, 'author': None, 'contributor': None})
    for cid, label, terms in CONCEPTS:
        if any(term in text for term in terms):
            if cid not in seen:
                nodes.append({'id': cid, 'label': label, 'file_type': 'document', 'source_file': str(path).replace('\\', '/'), 'source_location': None, 'source_url': None, 'captured_at': None, 'author': None, 'contributor': None})
                seen.add(cid)
            edges.append({'source': doc_id, 'target': cid, 'relation': 'references', 'confidence': 'EXTRACTED', 'source_file': str(path).replace('\\', '/'), 'source_location': None, 'weight': 1.0})

for source, target, relation in [
    ('stack_sveltekit', 'deploy_nginx', 'supports'),
    ('stack_hono', 'deploy_proxmox', 'supports'),
    ('stack_supabase', 'security_rls', 'implements'),
    ('domain_pos', 'domain_inventory', 'shares_data_with'),
    ('domain_pos', 'domain_qris', 'supports'),
    ('domain_pos', 'domain_receipt', 'supports'),
    ('domain_pos', 'domain_debt', 'supports'),
    ('domain_inventory', 'domain_reports', 'feeds'),
    ('domain_pos', 'domain_loyalty', 'supports'),
    ('domain_order_types', 'domain_pos', 'configures'),
    ('domain_preorder', 'domain_debt', 'creates'),
    ('domain_staff', 'security_rls', 'is_scoped_by'),
]:
    if source in seen and target in seen:
        edges.append({'source': source, 'target': target, 'relation': relation, 'confidence': 'INFERRED', 'source_file': 'README.md', 'source_location': None, 'weight': 0.8})

Path('.graphify_semantic.json').write_text(json.dumps({'nodes': nodes, 'edges': edges, 'input_tokens': 0, 'output_tokens': 0}, indent=2), encoding='utf-8')
print(f'Semantic seed: {len(nodes)} nodes, {len(edges)} edges')
