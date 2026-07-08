const fs = require('fs');
const path = require('path');

function findSvelteFiles(dir, fileList = []) {
	const files = fs.readdirSync(dir);
	for (const file of files) {
		const filePath = path.join(dir, file);
		if (fs.statSync(filePath).isDirectory()) {
			findSvelteFiles(filePath, fileList);
		} else if (filePath.endsWith('.svelte')) {
			fileList.push(filePath);
		}
	}
	return fileList;
}

const files = findSvelteFiles('c:\\Users\\Dragon\\Portofolio\\UMKM\\frontend\\src');
let changed = 0;

for (const file of files) {
	let content = fs.readFileSync(file, 'utf8');
	if (content.includes('http://localhost:3001')) {
		// Add import { env } if not present
		if (!content.includes(`import { env } from '$env/dynamic/public';`)) {
			content = content.replace(
				/<script[^>]*>/,
				`$&
    import { env } from '$env/dynamic/public';
    const API_URL = env.PUBLIC_API_URL || 'http://localhost:3001';`
			);
		}
		// Replace all instances
		// Because some are inside string literals and some inside template literals
		// e.g. fetch('http://localhost:3001/v1/auth') -> fetch(`${API_URL}/v1/auth`)
		// fetch(`http://localhost:3001/v1/reports/profit-loss?${query.toString()}`) -> fetch(`${API_URL}/v1/reports/profit-loss?${query.toString()}`)
		content = content.replace(/'http:\/\/localhost:3001([^']*)'/g, '`${API_URL}$1`');
		content = content.replace(/`http:\/\/localhost:3001([^`]*)`/g, '`${API_URL}$1`');

		fs.writeFileSync(file, content, 'utf8');
		changed++;
		console.log(`Updated ${file}`);
	}
}

console.log(`Updated ${changed} files.`);
