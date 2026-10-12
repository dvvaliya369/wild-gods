import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'dist/index.html',
  'dist/assets/images/hero-combat.png',
  'dist/assets/images/hero-portrait.png',
  'dist/assets/images/moon-stag.png',
  'dist/assets/images/ember-boar.png',
  'dist/assets/images/tide-serpent.png',
  'dist/assets/images/shadow-hunter.png',
  'dist/assets/images/moonwood-ground.png',
  'dist/assets/images/ashen-ground.png',
  'dist/assets/images/drowned-ground.png',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) {
  throw new Error(`Production build is missing: ${missingFiles.join(', ')}`);
}

const index = readFileSync('dist/index.html', 'utf8');
if (index.includes('src="/assets/') || index.includes('href="/assets/')) {
  throw new Error('Production build contains absolute asset paths.');
}

console.log(`Production build verified: ${requiredFiles.length} required files found.`);
