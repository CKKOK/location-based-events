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
const bcrypt = require('bcrypt');
const bcryptSalt = 7;

const googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyAeK4QLXB-YzLK6PwKHr5y4NPAquQXPBrU',
    Promise: Promise
});

function calculateRouteDistance(route) {
    return new Promise(function(resolve, reject){
        googleMapsClient.directions({
            origin: route.origin,
            destination: route.destination,
            waypoints: route.waypoints,
            mode: route.mode
        }).asPromise().then(function(response) {
            let legs = response.json.routes[0].legs;
            let result = legs.reduce((acc, cur) => {return acc + cur.distance.value}, 0);
            resolve(result / 1000);
        }).catch(function(error){reject(error)});
    });
};

const mongoose = require('mongoose');
const mongodb = 'mongodb://127.0.0.1/run2';
const autoIncrement = require('mongoose-auto-increment');
mongoose.connect(mongodb);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
autoIncrement.initialize(db);

db.on('error', console.error.bind(console, 'MongoDB connection error: '));

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'A name is required!']
    },
    email: {
        type: String,
        required: [true, 'Please provide an e-mail address!']
    },
    password: {
        type: String,
        required: [true, "Can't do without a password!"]
    },
    upcoming: {
        type: Number,
        required: false
    },
    history: {
        type: Array,
        required: false
    },
    favourites: {
        type: Array,
        required: false
    },
    averagePace: {
        type: Number,
        required: false
    }
})

const eventSchema = new Schema({
    eventType: {
        type: String,
        required: [true, 'What type of event is this?']
    },
    origin: {
        type: Object,
        required: [true, 'A route needs a starting point.']
    },
    details: {
        type: Object,
        required: [true, 'Details needed!']
    }
})

const testRoute = {
    "1": { lat: 1.3083994842109146, lng: 103.83030169050608 },
    "2": { lat: 1.3067905778813913, lng: 103.82873528044138 },
    "3": { lat: 1.3056965209885705, lng: 103.83060209791574 },
    "4": { lat: 1.3095793481968057, lng: 103.83214705030832 },
    "5": { lat: 1.3098153209273449, lng: 103.83161060850534 },
    "6": { lat: 1.3097509647303103, lng: 103.83131020109568 },
    "7": { lat: 1.3093648275133956, lng: 103.83053772489939 }
}

async function newRouteFromWaypointList(route) {
    let waypoints = [];
    let tmp = null;
    for (let pt in route) {
        tmp = pt.toString();
        if (route.hasOwnProperty(tmp)) {
            waypoints.push({
                lat: route[tmp].lat,
                lng: route[tmp].lng
            });
        };
    };
    var origin = waypoints.shift();
    var destination = waypoints.pop();
    let protoRoute = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        mode: 'walking'
    };
    let distance = await calculateRouteDistance(protoRoute);
    let result = {
        type: 'run',
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        distance: distance
    };
    return result;
}


userSchema.plugin(autoIncrement.plugin, 'users');
let userModel = mongoose.model('users', userSchema);
eventSchema.plugin(autoIncrement.plugin, 'events');
let eventModel = mongoose.model('events', eventSchema);

async function dbCreateRoute(route) {
    try {
        let newRoute = new eventModel({
            eventType: 'run',
            origin: route.origin,
            details: {
                destination: route.destination,
                waypoints: route.waypoints,
                distance: route.distance
            }
        });
        await newRoute.save();
        return true;
    } catch (error) {
        console.log(error);
        return error;
    };
};

async function dbFindEventsNearLatLng(type, lat, lng, threshold) {
    let result = await eventModel.find({
        "eventType" : type,
        "origin.lat" : {$lt: lat+threshold},
        "origin.lat" : {$gt: lat-threshold},
        "origin.lng" : {$lt: lng+threshold},
        "origin.lng" : {$gt: lng-threshold},
    });
    return result;
}



async function dbFindUserByName(name) {
    let result = await userModel.findOne({ "name": name }, 'name email password');
    return result;
};

async function dbFindUserByEmail(email) {
    let result = await userModel.findOne({ "email": email }, 'name email password');
    return result;
}

async function dbCreateUser(user) {
    // if it does exist, an update should be triggered instead of a new user saved
    try {
        // if (!dbUserInputValidate(user)) { throw new Error('Invalid user input') };
        let hashedPassword = await bcrypt.hash(user.password, bcryptSalt);
        let newUser = new userModel({
            name: user.name,
            email: user.email,
            password: hashedPassword
        });
        let result = await newUser.save();
        return true;
    } catch (error) {
        console.log(error);
        return error;
    };
};

async function run() {
    // let route = await newRouteFromWaypointList(testRoute);
    // await dbCreateRoute(route);
    // let results = await dbFindEventsNearLatLng("run", 1.306, 103.829, 0.1);
    // console.log(results);
    // await dbCreateUser({
    //     name: 'CK',
    //     email: 'ckk912@gmail.com',
    //     password: '12345'
    // })
    let result = await dbFindUserByName('CK');
    console.log(result);
    let comparo = await bcrypt.compare('12345', result.password);
    console.log(comparo);
}
run();

async function dbUpdateUser(id, newUserData) {
    // attempt to update the info of a SINGLE record to avoid accidentally changing all records
    try {
        if (!dbUserInputValidate(newUserData)) { throw new Error('Invalid user input') };
        let result = await userModel.findOneAndUpdate({ "_id": id }, newUserData, { new: true });
        return result;
    } catch (error) {
        console.log(error);
        return error;
    };
};

async function dbDeleteUser(id) {
    try {
        let result = await userModel.findOneAndRemove({ "_id": id });
        return result;
    } catch (error) {
        console.log(error);
        return error;
    };
};



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

function userlogin(request, response) {
    // get the user to login here. For now, we just do a database lookup to see if the user password matches, then store the user in the database.
}

function userlogout(request, response) {
    // This request is going to come in via XHR. Clear the user from the logged in database here and send the appropriate JSON response {logout: true} and let the UI handle it.
}

function usergetprofile(request, response) {
    // This request is going to come in via XHR. Get the user's email address and pull out the profile via a DB query, then send it back as a JSON object and let the UI handle the rest.
}

function userupdateprofile(request, response) {
    // This request is going to come in via XHR. Run a DB query based on the user's id
}

function userLocationSubmit(request, response) {
    // This submission is going to come in via XHR upon opening the root document. Run a database query for points with latitude and longitude. Note that 0.01 ~ 1100m, 0.001 ~ 110m, and 0.0001 ~ 11m. Assuming a normal walking speed of 4km/h, we get about 67m/min. Assume also that a user would be willing to walk up to 5 min in either direction. So we want about 334m in either direction, i.e. lat/lng should be +- 0.003 from the user's own lat/lng. BUT, accounting for inaccuracies in the user's GPS (commercial GPS accuracy ) which can often be up to 100m or so in SG, we will go up to +- 0.004.

    // Return a JSON object as a response - {marker: [{lat, lng}, {lat, lng}, ... ], nearby: [route, route, ... ]}
}

function routeSubmit(request, response) {
    // DECIDE: How is the server going to handle the clicks on the map here? DB call? Timestamp the thing!!!!
}

function routeEdit(request, response) {
    // DECIDE: How to handle editing of routes? Timestamp the thing!!!
}

function routeDelete(request, response) {
    // This one's simple - we just run a database query to flag the route as disabled.

}

app.get('/', getRoot);
app.post('/user/login', userlogin);
app.post('/location', userLocationSubmit);
app.post('/', postRoot);

http.createServer(app).listen(3000, () => { console.log('Listening on 3000') });
https.createServer(options, app).listen(5000, () => { console.log('Also on 5000') });
