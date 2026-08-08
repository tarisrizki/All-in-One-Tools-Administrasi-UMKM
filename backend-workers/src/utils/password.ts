/**
 * Password hashing menggunakan Web Crypto API (PBKDF2-SHA256).
 * Native di Cloudflare Workers — tanpa dependency eksternal.
 * Lebih cepat & hemat CPU dibanding bcryptjs (pure JS).
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bit
const SALT_LENGTH = 16;

const encoder = new TextEncoder();

function bufToHex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex: string): Uint8Array {
	const arr = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return arr;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits',
	]);

	const derived = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations: ITERATIONS,
			hash: 'SHA-256',
		},
		keyMaterial,
		KEY_LENGTH * 8
	);

	// Format: pbkdf2$iterations$saltHex$hashHex
	return `pbkdf2$${ITERATIONS}$${bufToHex(salt.buffer)}$${bufToHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
		// Fallback: cek format bcrypt lama ($2a$ / $2b$)
		if (stored.startsWith('$2')) {
			// Compatibility: bcrypt hash lama — tidak bisa diverifikasi tanpa bcryptjs
			// Return false, user harus reset password
			return false;
		}
		return false;
	}

	const iterations = parseInt(parts[1], 10);
	const salt = hexToBuf(parts[2]);
	const storedHash = parts[3];

	const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits',
	]);

	const derived = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations,
			hash: 'SHA-256',
		},
		keyMaterial,
		KEY_LENGTH * 8
	);

	const derivedHex = bufToHex(derived);
	// Constant-time comparison
	if (derivedHex.length !== storedHash.length) return false;
	let diff = 0;
	for (let i = 0; i < derivedHex.length; i++) {
		diff |= derivedHex.charCodeAt(i) ^ storedHash.charCodeAt(i);
	}
	return diff === 0;
}
