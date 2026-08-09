const fs = require('node:fs');
const path = require('node:path');

const dist = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(dist)) throw new Error('dist does not exist; run npm run build first');
const assetsDirectory = path.join(dist, 'assets');
const assetNames = fs.readdirSync(assetsDirectory).filter((name) => name.endsWith('.js'));
const localAssetNames = assetNames.filter((name) => /localDevelopmentAuth/i.test(name));
if (localAssetNames.length) {
    throw new Error('Production build emitted local-auth assets: ' + localAssetNames.join(', '));
}
const source = assetNames
    .map((name) => fs.readFileSync(path.join(assetsDirectory, name), 'utf8'))
    .join(String.fromCharCode(10));
const forbidden = [
    'כניסה מקומית לתמר',
    'סביבת פיתוח מקומית',
    'VITE_TAMAR_LOCAL_AUTH_URL',
    'api://tamar-local-development',
    '127.0.0.1:4100'
];
const matches = forbidden.filter((value) => source.includes(value));
if (matches.length) throw new Error('Production bundle contains local-auth markers: ' + matches.join(', '));
console.log(JSON.stringify({ result: 'PASS', javascriptAssets: assetNames.length }));
