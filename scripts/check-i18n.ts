import fs from 'fs';
import path from 'path';

function getDeepKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getDeepKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enPath = path.join(process.cwd(), 'messages/en.json');
const idPath = path.join(process.cwd(), 'messages/id.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const id = JSON.parse(fs.readFileSync(idPath, 'utf8'));

const enKeys = new Set(getDeepKeys(en));
const idKeys = new Set(getDeepKeys(id));

const missingInId = [...enKeys].filter((k) => !idKeys.has(k));
const missingInEn = [...idKeys].filter((k) => !enKeys.has(k));

console.log(`Total EN keys: ${enKeys.size}`);
console.log(`Total ID keys: ${idKeys.size}`);

if (missingInId.length > 0) {
  console.error('\nMissing in id.json:\n', missingInId);
}
if (missingInEn.length > 0) {
  console.error('\nMissing in en.json:\n', missingInEn);
}

if (missingInId.length === 0 && missingInEn.length === 0) {
  console.log('\n✅ 100% i18n key parity between en.json and id.json!');
  process.exit(0);
} else {
  console.error('\n❌ i18n parity check failed.');
  process.exit(1);
}
