const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const executableRoots = ['src', 'tests', 'scripts'];
const routeRoot = path.join(projectRoot, 'src', 'routes');

function listFiles(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return listFiles(target, predicate);
        return entry.isFile() && predicate(target) ? [target] : [];
    });
}

function relative(file) {
    return path.relative(projectRoot, file).replaceAll('\\', '/');
}

function fail(errors, message) {
    errors.push(message);
}

function verify() {
    const errors = [];
    const jsFiles = executableRoots.flatMap((root) => listFiles(
        path.join(projectRoot, root), (file) => file.endsWith('.js')
    ));
    const mjsFiles = executableRoots.flatMap((root) => listFiles(
        path.join(projectRoot, root), (file) => file.endsWith('.mjs')
    ));
    if (mjsFiles.length) fail(errors, `Forbidden .mjs files: ${mjsFiles.map(relative).join(', ')}`);

    const staticImport = new RegExp('^\\s*' + 'im' + 'port' + '\\s', 'm');
    const esmExport = new RegExp('^\\s*' + 'ex' + 'port' + '(?:\\s|\\{)', 'm');
    const importMeta = new RegExp('im' + 'port' + '\\.meta');
    const dynamicImport = new RegExp('\\b' + 'im' + 'port' + '\\s*\\(');
    for (const file of jsFiles) {
        const source = fs.readFileSync(file, 'utf8');
        if (staticImport.test(source)) fail(errors, `${relative(file)} uses ESM import syntax`);
        if (esmExport.test(source)) fail(errors, `${relative(file)} uses ESM export syntax`);
        if (importMeta.test(source)) fail(errors, relative(file) + ' uses im' + 'port.meta');
        if (dynamicImport.test(source)) fail(errors, `${relative(file)} uses dynamic import`);
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    if (packageJson.type !== 'commonjs') fail(errors, 'package.json must declare type=commonjs');
    if (packageJson.engines?.node !== '>=22.12.0') fail(errors, 'package.json must require Node >=22.12.0');

    const routePattern = /\b(?:router|app)\.(?:get|post|put|patch|delete)\s*\(/;
    const routeDefinitionFiles = jsFiles.filter((file) => relative(file).startsWith('src/') && routePattern.test(fs.readFileSync(file, 'utf8')));
    for (const file of routeDefinitionFiles) {
        if (path.dirname(file) !== routeRoot) fail(errors, `HTTP route outside src/routes: ${relative(file)}`);
    }

    const appSource = fs.readFileSync(path.join(projectRoot, 'src', 'app.js'), 'utf8');
    const centralMounts = [...appSource.matchAll(/app\.use\(['"]\/api['"]/g)];
    if (centralMounts.length !== 1) fail(errors, 'app.js must mount exactly one central /api router');
    if (/app\.(?:get|post|put|patch|delete)\s*\(/.test(appSource)) fail(errors, 'app.js contains endpoint definitions');

    const registrySource = fs.readFileSync(path.join(routeRoot, 'index.js'), 'utf8');
    const messageMount = registrySource.lastIndexOf("createTicketMessageRoutes");
    const transferMount = registrySource.lastIndexOf("createTicketTransferRoutes");
    const assignmentMount = registrySource.lastIndexOf("createTicketAssignmentRoutes");
    const ticketMount = registrySource.lastIndexOf("createTicketRoutes");
    if (messageMount < 0 || transferMount < 0 || assignmentMount < 0 || ticketMount < 0
        || messageMount >= transferMount || transferMount >= assignmentMount || assignmentMount >= ticketMount) {
        fail(errors, 'Message, Transfer and Assignment routes must precede parameterized Ticket routes');
    }

    const assignmentSource = fs.readFileSync(path.join(routeRoot, 'ticketAssignments.routes.js'), 'utf8');
    if (!assignmentSource.includes("router.post('/bulk/assignees'")) fail(errors, 'Canonical bulk assignment route is missing');
    const sourceTree = jsFiles.filter((file) => relative(file).startsWith('src/'))
        .map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    if (sourceTree.includes("'/assignees/bulk'") || sourceTree.includes('"/assignees/bulk"')) {
        fail(errors, 'Obsolete bulk assignment route remains mounted');
    }
    if (/assign-me|\/transfer|\/messages|\/attachments|\/categories|\/reopen/.test(assignmentSource)) {
        fail(errors, 'Future Phase routes are present in assignment routes');
    }

    const transferSource = fs.readFileSync(path.join(routeRoot, 'ticketTransfers.routes.js'), 'utf8');
    const requiredTransferRoutes = [
        "router.post('/tickets/:id/transfers'",
        "router.get('/tickets/:id/transfers'",
        "router.get('/tickets/:id/transfer-targets'",
        "router.get('/ticket-transfers'",
        "router.get('/ticket-transfers/:id'",
        "router.post('/ticket-transfers/:id/accept'",
        "router.post('/ticket-transfers/:id/cancel'"
    ];
    for (const route of requiredTransferRoutes) {
        if ((transferSource.split(route).length - 1) !== 1) fail(errors, `Missing or duplicate Transfer route: ${route}`);
    }

    const messageSource = fs.readFileSync(path.join(routeRoot, 'ticketMessages.routes.js'), 'utf8');
    const requiredMessageRoutes = [
        "router.get('/tickets/:id/messages'",
        "router.post('/tickets/:id/messages'",
        "router.patch('/tickets/:id/messages/:messageId'",
        "router.delete('/tickets/:id/messages/:messageId'"
    ];
    for (const route of requiredMessageRoutes) {
        if ((messageSource.split(route).length - 1) !== 1) fail(errors, `Missing or duplicate Message route: ${route}`);
    }
    if (/attachment|upload|download|internal.?note|private.?message|hidden.?message|reaction|read.?receipt/i.test(messageSource)) {
        fail(errors, 'Forbidden later-phase surface is present in Message routes');
    }
    const boardSource = fs.readFileSync(path.join(routeRoot, 'ticketBoards.routes.js'), 'utf8');
    const requiredBoardRoutes = [
        "router.get(`${board}/items`",
        "router.get(`${board}/categories`",
        "router.post(`${board}/categories`",
        "router.patch(`${board}/categories/:categoryId`",
        "router.post(`${board}/categories/:categoryId/archive`",
        "router.get(`${board}/items/:itemId/state`",
        "router.patch(`${board}/items/:itemId/state`"
    ];
    for (const route of requiredBoardRoutes) {
        if ((boardSource.split(route).length - 1) !== 1) fail(errors, `Missing or duplicate Board route: ${route}`);
    }
    if (/personalOrder|userOrder|dragOrder|sortIndex|userBoardPreference|attachments|notifications/i.test(boardSource)) {
        fail(errors, 'Forbidden later-phase or personal Board surface is present');
    }
    const boardRouteDefinitions = routeDefinitionFiles.filter((file) =>
        fs.readFileSync(file, 'utf8').includes('/boards/'));
    if (boardRouteDefinitions.some((file) => relative(file) !== 'src/routes/ticketBoards.routes.js')) {
        fail(errors, 'Board route is defined outside src/routes/ticketBoards.routes.js');
    }
    for (const model of ['TicketBoardCategory.js', 'TicketBoardItemState.js']) {
        if (!fs.existsSync(path.join(projectRoot, 'src', 'modules', 'tickets', 'boards', 'models', model))) {
            fail(errors, `Missing canonical Board model: ${model}`);
        }
    }
    const ticketModelSource = fs.readFileSync(path.join(projectRoot, 'src', 'modules', 'tickets', 'models', 'Ticket.js'), 'utf8');
    if (/\b(?:categoryId|isPinned|pinnedAt|pinnedBy)\s*:/.test(ticketModelSource)) {
        fail(errors, 'Global Board metadata was added to Ticket');
    }
    if (/PersonalBoard|UserBoard|BoardPreference/.test(sourceTree)) {
        fail(errors, 'Personal Board model or service exists');
    }
    const messageRouteDefinitions = routeDefinitionFiles.flatMap((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return [...source.matchAll(/router\.(?:get|post|patch|delete)\('([^']*\/messages[^']*)'/g)]
            .map((match) => ({ file: relative(file), route: match[1] }));
    });
    if (messageRouteDefinitions.some((definition) => definition.file !== 'src/routes/ticketMessages.routes.js')) {
        fail(errors, 'Message route is defined outside src/routes/ticketMessages.routes.js');
    }
    const routeSources = routeDefinitionFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    if (/\/messages\/(?:attachments|uploads|download|internal|private|hidden)/i.test(routeSources)) {
        fail(errors, 'Forbidden later-phase Message endpoint exists in the central route registry');
    }
    if (!fs.existsSync(path.join(projectRoot, 'docs', 'phase7a-verification-matrix.md'))) {
        fail(errors, 'Phase 7A verification matrix is missing');
    }
    if (jsFiles.some((file) => relative(file).includes('.local-backups/'))) {
        fail(errors, 'Immutable local backups must be excluded from architecture scanning');
    }

    const requiredRouteFiles = [
        'index.js', 'health.routes.js', 'auth.routes.js', 'accessRequestOptions.routes.js',
        'accessRequests.routes.js', 'organizationHierarchy.routes.js', 'tickets.routes.js', 'ticketAssignments.routes.js', 'ticketTransfers.routes.js',
        'ticketMessages.routes.js', 'ticketBoards.routes.js'
    ];
    for (const file of requiredRouteFiles) {
        if (!fs.existsSync(path.join(routeRoot, file))) fail(errors, `Missing central route file: src/routes/${file}`);
    }

    const nestedRouteFiles = jsFiles.filter((file) => {
        const rel = relative(file);
        return rel.startsWith('src/') && rel.includes('/routes/') && path.dirname(file) !== routeRoot;
    });
    if (nestedRouteFiles.length) fail(errors, `Nested route files remain: ${nestedRouteFiles.map(relative).join(', ')}`);

    if (errors.length) {
        const error = new Error(errors.map((item) => `- ${item}`).join('\n'));
        error.architectureErrors = errors;
        throw error;
    }
    return {
        result: 'PASS',
        commonJsFiles: jsFiles.length,
        routeDefinitionFiles: routeDefinitionFiles.map(relative).sort(),
        centralRegistry: 'src/routes/index.js',
        canonicalBulkRoute: '/api/tickets/bulk/assignees'
    };
}

if (require.main === module) {
    try {
        console.log(JSON.stringify(verify()));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = verify;
