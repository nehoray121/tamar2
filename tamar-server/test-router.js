const { loadEnvironment } = require('./src/config/env.js');
const createServiceContainer = require('./src/services/createServiceContainer.js');
const createApp = require('./src/app.js');
const request = require('http');

const config = loadEnvironment();
const services = createServiceContainer({ config, logger: { info: () => {}, warn: () => {}, error: () => {} } });

console.log('Is auth defined?', !!services.auth);

const app = createApp({ config, logger: { info: () => {}, warn: () => {}, error: () => {} }, services });

// test route matching
const req = { method: 'GET', url: '/api/dashboard', headers: {} };
const res = { 
    setHeader: () => {}, 
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => console.log('JSON:', data),
    end: () => console.log('End called')
};
const next = (err) => {
    if (err) console.log('Next called with err:', err.statusCode || err);
    else console.log('Next called without error');
};

app(req, res, next);
