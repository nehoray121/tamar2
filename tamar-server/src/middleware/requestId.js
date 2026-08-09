const { randomUUID } = require('node:crypto');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

const requestId = (request, response, next) => {
    const incoming = request.get('X-Request-Id');
    const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
        ? incoming
        : randomUUID();

    request.id = id;
    response.setHeader('X-Request-Id', id);
    next();
};

module.exports = requestId;
