const express = require('express');
const forceSSL = require('express-force-ssl');
const https = require('https');
const http = require('http');
const fs = require('fs');

const options = {
    key: fs.readFileSync('./encryption/client-key.pem'),
    cert: fs.readFileSync('./encryption/client-cert.pem')
};

const app = express();

app.use(forceSSL);
app.use(express.static('../client'));

http.createServer(app).listen(3000);
https.createServer(options, app).listen(5000);
