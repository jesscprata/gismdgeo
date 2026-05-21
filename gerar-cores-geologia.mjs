import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sld = fs.readFileSync(path.join(root, 'data', 'geologia_brasil.sld'), 'utf8');
const colors = {};
const ruleRe = /<se:Rule>[\s\S]*?<\/se:Rule>/g;

for (const rule of sld.match(ruleRe) || []) {
    const nameM = rule.match(/<se:Name>([^<]+)<\/se:Name>/);
    const fillM = rule.match(/name="fill">([^<]+)</);
    if (nameM && fillM) colors[nameM[1]] = fillM[1];
}

const out = path.join(root, 'data', 'geologia_cores.json');
fs.writeFileSync(out, JSON.stringify(colors));
console.log(`OK: ${Object.keys(colors).length} cores -> ${out}`);
