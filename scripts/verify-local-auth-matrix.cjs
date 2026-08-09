const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'docs', 'local-auth-verification-matrix.md');
const matrix = fs.readFileSync(matrixPath, 'utf8');
const rows = matrix.split(/\r?\n/).filter((line) => /^\| AUTH-\d+ /.test(line));
const errors = [];
if (rows.length < 15) errors.push('Expected at least 15 executable requirement rows');
for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    const [id, requirement, production, tooling, testFile, exactTestName, type, baseline, resolution, finalStatus] = cells;
    if (![id, requirement, production, tooling, testFile, exactTestName, type, baseline, resolution].every(Boolean)) {
        errors.push(id + ': missing required matrix cell');
        continue;
    }
    if (finalStatus !== 'PASS') errors.push(id + ': final status is not PASS');
    const resolved = path.join(root, testFile);
    if (!fs.existsSync(resolved)) {
        errors.push(id + ': missing test file ' + testFile);
        continue;
    }
    const source = fs.readFileSync(resolved, 'utf8');
    if (!source.includes(exactTestName)) errors.push(id + ': exact test name is not executable evidence');
}
if (errors.length) {
    console.error(errors.map((error) => '- ' + error).join('\n'));
    process.exitCode = 1;
} else {
    console.log(JSON.stringify({ result: 'PASS', requirements: rows.length }));
}
