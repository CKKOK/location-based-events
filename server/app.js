const express = require('express');
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
const exphbs = require('express-handlebars');
const forceSSL = require('express-force-ssl');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const MemcachedStore = require('connect-memcached')(session);

const googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyAeK4QLXB-YzLK6PwKHr5y4NPAquQXPBrU'
});

const testRoute = {
    "1": { lat: 1.3083994842109146, lng: 103.83030169050608 },
    "2": { lat: 1.3067905778813913, lng: 103.82873528044138 },
    "3": { lat: 1.3056965209885705, lng: 103.83060209791574 },
    "4": { lat: 1.3095793481968057, lng: 103.83214705030832 },
    "5": { lat: 1.3098153209273449, lng: 103.83161060850534 },
    "6": { lat: 1.3097509647303103, lng: 103.83131020109568 },
    "7": { lat: 1.3093648275133956, lng: 103.83053772489939 }
}

const https = require('https');
const http = require('http');
const fs = require('fs');

const options = {
    key: fs.readFileSync('./encryption/server.key'),
    cert: fs.readFileSync('./encryption/server.crt')
};

const app = express();

app.engine('handlebars', exphbs.create().engine);
app.set('view engine', 'handlebars');

// For application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// For application/json
app.use(bodyParser.json())
app.use(forceSSL);

app.use(express.static('../client'));

function getRoot(request, response) {
    // check cookies
    response.render('home');
};

function postRoot(request, response) {
    let stuff = request.body;
    response.send(testRoute);
};

app.get('/', getRoot);
app.post('/', postRoot);

http.createServer(app).listen(3000, () => {console.log('Listening on 3000')});
https.createServer(options, app).listen(5000, () => {console.log('Also on 5000')});
