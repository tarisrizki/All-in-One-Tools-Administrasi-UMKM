/**
 * Shared formatting utilities
 * Centralized to avoid duplication across all pages
 */

export function formatRupiah(amount: number | string | null | undefined): string {
	const num = Number(amount) || 0;
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return 'Tanpa Batas Waktu';
	return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(dateStr));
}

export function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr);
	return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function formatDateTime(dateStr: string): string {
	return new Intl.DateTimeFormat('id-ID', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(dateStr));
}

export function formatTime(dateStr: string): string {
	return new Date(dateStr).toLocaleTimeString('id-ID', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function isOverdue(dateStr: string | null): boolean {
	if (!dateStr) return false;
	return new Date(dateStr).getTime() < new Date().getTime();
}
