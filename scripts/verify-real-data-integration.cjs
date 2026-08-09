const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceRoots = [
    path.join(root, 'src'),
    path.join(root, 'tamar-server', 'src')
];
const requiredDocs = [
    'docs/real-data-integration.md',
    'docs/real-data-verification-matrix.md'
];
const requiredDocumentationMarkers = new Map([
    ['docs/real-data-integration.md', ['GET /api/dashboard', 'GET /api/control-center']],
    ['docs/real-data-verification-matrix.md', ['GET /api/dashboard', 'GET /api/control-center']]
]);
const allowedBrowserStorage = new Set([
    'src/features/dashboard/utils/dashboard.utils.js',
    'src/features/inquiries/services/inquiryDraftRepository.js',
    'src/features/theme/ThemeContext.jsx',
    'src/store/session.store.js'
]);
const allowedDateNow = new Set([
    'src/features/inquiries/hooks/useInquiryForm.js',
    'src/features/inquiries/services/inquiryDraftRepository.js',
    'tamar-server/src/services/accessRequests/IdentityRequestThrottle.js',
    'tamar-server/src/socket/initializeSocket.js'
]);
const forbiddenFiles = [
    'src/features/dashboard/data/dashboard.mock.js',
    'src/features/users/data/mockUserManagementData.js',
    'src/features/users/data/mockUserDirectory.js',
    'src/features/tickets/data/tickets.mock.js',
    'src/features/tickets/data/mockRoomUsers.js',
    'src/features/tickets/data/mockInquiryOrganizationData.js',
    'src/features/tickets/services/legacyMyTasksService.js',
    'src/features/tickets/services/inquiryOrganizationService.js',
    'src/features/rooms/data/roomHierarchy.mock.js'
];

const normalize = (value) => value.split(path.sep).join('/');
const relative = (value) => normalize(path.relative(root, value));
const failures = [];

const walk = (directory) => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (['__tests__', 'fixtures', 'node_modules', 'coverage', '.local-backups'].includes(entry.name)) return [];
            return walk(fullPath);
        }
        return /\.(?:c?js|jsx)$/u.test(entry.name) ? [fullPath] : [];
    });
};

for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(root, file))) failures.push(`${file}: forbidden production mock/prototype file exists`);
}

for (const fullPath of sourceRoots.flatMap(walk)) {
    const file = relative(fullPath);
    const source = fs.readFileSync(fullPath, 'utf8');
    const imports = [...source.matchAll(/(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu)].map((match) => match[1]);

    for (const specifier of imports) {
        if (/(?:^|\/)(?:__tests__|fixtures?)(?:\/|$)/iu.test(specifier)) {
            failures.push(`${file}: production import references a test fixture (${specifier})`);
        }
        if (/(?:mock|fake|dummy|legacyMyTasksService|inquiryOrganizationService)/iu.test(specifier)) {
            failures.push(`${file}: production import references a mock/prototype source (${specifier})`);
        }
    }

    if (/\bMath\.random\s*\(/u.test(source)) failures.push(`${file}: Math.random is forbidden for production business records`);
    if (/\bDate\.now\s*\(/u.test(source) && !allowedDateNow.has(file)) {
        failures.push(`${file}: Date.now is not approved as a production business identity`);
    }
    if (/\b(?:localStorage|sessionStorage)\b/u.test(source) && !allowedBrowserStorage.has(file)) {
        failures.push(`${file}: browser storage is not approved as a business source of truth`);
    }
    if (/(?:050-\d{7}|מנדיי|generateDashboardMockData|initialTickets|initialInquiryCategories|mockUserDirectory|mockRoomUsers|mockTasks)/u.test(source)) {
        failures.push(`${file}: known hardcoded business-data marker found`);
    }
    if (/catch\s*(?:\([^)]*\))?\s*\{[\s\S]{0,500}(?:mock|sampleTickets|fakeUsers|initialTickets)/iu.test(source)) {
        failures.push(`${file}: API failure path appears to activate mock fallback data`);
    }
}

for (const file of requiredDocs) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) failures.push(`${file}: required real-data document is missing`);
    else {
        const source = fs.readFileSync(fullPath, 'utf8');
        for (const marker of requiredDocumentationMarkers.get(file) || []) {
            if (!source.includes(marker)) failures.push(`${file}: canonical route marker is missing (${marker})`);
        }
    }
}

if (failures.length) {
    console.error('Real-data integration verification failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Real-data integration verification passed.');
}
