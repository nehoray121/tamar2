const express = require('express');
const app = express();
const router = express.Router();
try {
    router.get('/test', undefined, (req, res) => res.send('ok'));
    console.log('NO THROW!');
} catch (e) {
    console.log('THREW:', e.message);
}
