// Replaces the old sitetest4.robloxlabs.com hostnames with moblox.xyz in the source tree
// before the TypeScript build runs. Safe to run more than once.
const fs = require('fs');
const path = require('path');

const OLD = /sitetest4\.robloxlabs\.com/g;
const NEW = 'moblox.xyz';
const ROOTS = ['Source', 'Views', 'StaticPages', 'TestViews', 'Default', 'InternalCDN'];
const EXTENSIONS = new Set(['.ts', '.js', '.html', '.htm', '.json', '.lua', '.css', '.txt']);
const SKIP_DIRS = new Set(['node_modules', 'Bin', '.git']);

let filesChanged = 0;
let replacements = 0;

function walk(dir) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (e) {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walk(full);
		} else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
			const text = fs.readFileSync(full, 'utf8');
			const matches = text.match(OLD);
			if (matches) {
				fs.writeFileSync(full, text.replace(OLD, NEW));
				filesChanged++;
				replacements += matches.length;
			}
		}
	}
}

for (const root of ROOTS) walk(path.join(__dirname, root));
console.log(`rename-hosts: ${replacements} replacements in ${filesChanged} files`);
