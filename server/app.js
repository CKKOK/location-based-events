const PORT = process.env.PORT || 3000;
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
    return new Promise(function (resolve, reject) {
        googleMapsClient.directions({
            origin: route.origin,
            destination: route.destination,
            waypoints: route.waypoints,
            mode: route.mode
        }).asPromise().then(function (response) {
            let legs = response.json.routes[0].legs;
            let result = legs.reduce((acc, cur) => { return acc + cur.distance.value }, 0);
            resolve(result / 1000);
        }).catch(function (error) { reject(error) });
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
    role: {
        type: String,
        enum: ['user', 'superuser', 'admin'],
        required: [true, 'User / superuser / admin?']
    },
    level: {
        type: Number,
        required: [true, 'What level (1-99)?']
    },
    upcoming: {
        type: [Number],
        required: false
    },
    history: {
        type: [{
            eventID: Number,
            start: Date,
            end: Date
        }],
        required: false
    },
    favourites: {
        type: [Number],
        required: false
    },
    created: {
        type: [Number],
        required: false
    },
    averagePace: {
        type: Number,
        required: false
    }
})

const eventSchema = new Schema({
    type: {
        type: String,
        required: [true, 'What type of event is this?']
    },
    creator: {
        type: Number,
        required: [true, 'Who owns this?']
    },
    origin: {
        type: { lat: Number, lng: Number },
        required: [true, 'A route needs a starting point.']
    },
    details: {
        type: Object,
        required: [true, 'Details needed!']
    }
})

const upcomingSchema = new Schema({
    eventID: {
        type: Number,
        required: [true, 'Which event id?']
    },
    type: {
        type: String,
        required: [true, 'What type of event?']
    },
    origin: {
        type: { lat: Number, lng: Number },
        require: [true, 'Need the location']
    },
    organizer: {
        type: Number,
        required: [true, 'Who is organizing this?']
    },
    attendees: {
        type: [Number],
        required: false // For the ids of the users joining this thing
    },
    start: {
        type: Date,
        required: true
    },
    expiry: {
        type: Date
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
eventSchema.plugin(autoIncrement.plugin, 'events');
upcomingSchema.plugin(autoIncrement.plugin, 'upcoming');

const userModel = mongoose.model('users', userSchema);
const eventModel = mongoose.model('events', eventSchema);
const upcomingModel = mongoose.model('upcoming', upcomingSchema);

async function dbCreateRunningRoute(userid, route) {
    try {
        let newRoute = new eventModel({
            type: 'run',
            creator: userid,
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
        throw new Error(error);
        return error;
    };
};

async function dbCreateMessageAtLocation(userid, messagebody, lat, lng) {
    try {
        let newMessage = new eventModel({
            type: 'message',
            creator: userid,
            origin: {
                lat: lat,
                lng: lng
            },
            details: {
                messageBody: messagebody
            }
        });
        await newMessage.save();
        return true;
    } catch (error) {
        throw new Error(error);
        return error;
    };
};

async function dbFindEventsNearLatLng(type, lat, lng, threshold) {
    let result = await eventModel.find({
        "type": type,
        "origin.lat": { $lt: lat + threshold },
        "origin.lat": { $gt: lat - threshold },
        "origin.lng": { $lt: lng + threshold },
        "origin.lng": { $gt: lng - threshold },
    });
    return result;
}

async function dbFindUserByName(name) {
    let result = await userModel.findOne({ "name": name });
    return result;
};

async function dbFindUserByEmail(email) {
    let result = await userModel.findOne({ "email": email });
    return result;
}

async function dbCreateUser(user, role = 'user', level = 1) {
    try {
        let hashedPassword = await bcrypt.hash(user.password, bcryptSalt);
        let newUser = new userModel({
            name: user.name,
            email: user.email,
            password: hashedPassword,
            role: user.role || 'user',
            level: user.level || 1
        });
        let result = await newUser.save();
        return result;
    } catch (error) {
        throw new Error(error);
        return error;
    };
};

async function someTestData() {
    let user = await dbCreateUser({
        name: 'CK',
        email: 'ckk912@gmail.com',
        password: '12345',
        role: 'admin',
        level: 99
    });
    await dbCreateUser({
        name: 'Haidere',
        email: 'abc@abc.com',
        password: '12345',
        role: 'user',
        level: 1
    });
    let route = await newRouteFromWaypointList(testRoute);
    let createdRoute = await dbCreateRunningRoute(user._id, route);
    // let results = await dbFindEventsNearLatLng("run", 1.306, 103.829, 0.1);
    // let result = await dbFindUserByName('CK');
    // console.log(result);
    // let comparo = await bcrypt.compare('12345', result.password);
    // console.log(comparo);
}
someTestData();

async function userJoinUpcomingEvent(userID, eventID) {
    let upcomingEventID = await upcomingModel.findOne({ 'eventID': eventID });
    if (!upcomingEventID) {
        throw new Error('Upcoming event does not exist');
        return false;
    } else {
        await userModel.update({ '_id': userID }, { $push: { upcoming: eventID } });
        await upcomingModel.findOneAndUpdate({ '_id': upcomingEventID }, { $push: { attendees: userID } });
        return true;
    };
};

async function createUpcomingEventFromEventID(userID, eventID, start, expiry) {
    let event = await eventModel.findOne({ '_id': eventID });
    if (!expiry) {
        expiry = start.setDate(start.getDate() + 7); // Default of 1 day
    };
    let newUpcomingEvent = new upcomingModel({
        eventID: eventID,
        origin: event.origin,
        type: event.type,
        organizer: userID,
        start: start,
        expiry: expiry
    });
    let result = await newUpcomingEvent.save();
    await userModel.update({ "_id": userID }, { $push: { upcoming: result._id } });
}
createUpcomingEventFromEventID(0, 0, new Date());

async function dbFindUpcomingEventsNearLatLng(type, lat, lng, threshold) {
    let now = new Date();
    let result = await upcomingModel.find({
        "type": type,
        "origin.lat": { $lt: lat + threshold },
        "origin.lat": { $gt: lat - threshold },
        "origin.lng": { $lt: lng + threshold },
        "origin.lng": { $gt: lng - threshold },
        "start": { $gte: now }
    });
    return result;
};
// dbFindUpcomingEventsNearLatLng('', 1.30, 103.83, 0.02);


async function userRemoveUpcomingEvent(userID, upcomingEventID) {
    await upcomingModel.findOneAndUpdate({ '_id': upcomingEventID, 'organizer': { $ne: userID } }, { $pull: { attendees: userID } });
}
// userRemoveUpcomingEvent(1,0);

async function userAddEventToHistory(userID, eventID) {

}

async function dbUpdateUser(id, newUserData) {
    // attempt to update the info of a SINGLE record to avoid accidentally changing all records
    try {
        let result = await userModel.findOneAndUpdate({ '_id': id }, newUserData, { new: true });
        return result;
    } catch (error) {
        throw new Error(error);
        return error;
    };
};

async function dbDeleteUser(id) {
    try {
        let result = await userModel.findOneAndRemove({ '_id': id });
        return result;
    } catch (error) {
        throw new Error(error);
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
app.use(bodyParser.urlencoded({extended: true}));
// For application/json
app.use(bodyParser.json())
app.use(cookieParser())
app.use(forceSSL);
app.use(session({
    secret: 'abcdefg',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));

app.use(express.static('../client'));

function getRoot(request, response) {
    // check cookies
    response.render('home');
};

function postRoot(request, response) {
    let stuff = request.body;
    response.send(testRoute);
};

async function getEventsFromArray(arr) {
    let result = await eventModel.find({ '_id': { $in: arr } });
    return result;
};

async function getUpcomingEventsFromArray(arr) {
    let result = await upcomingModel.find({ '_id': { $in: arr } });
    return result;
}


async function getUserFavourites(id) {
    let result = await userModel.findOne({ '_id': id }, 'favourites');
    return result.favourites;
};

async function getUserUpcoming(id) {
    let result = await userModel.findOne({ '_id': id }, 'upcoming');
    return result.upcoming;
};

async function getUserHistory(id) {
    let result = await userModel.findOne({ '_id': id }, 'history');
    return result.history;
};

async function getUserCreated(id) {
    let result = await userModel.findOne({ '_id': id }, 'created');
    return result.created;
};

async function insertFavouriteEventForUser(userID, eventID) {
    await userModel.update({ '_id': userID }, { $push: { favourites: eventID } });
};

async function insertUpcomingEventForUser(userID, eventID) {
    await userModel.update({ '_id': userID }, { $push: { upcoming: eventID } });
};

async function insertCreatedEventForUser(userID, eventID) {
    await userModel.update({ '_id': userID }, { $push: { created: eventID } });
};

async function insertHistoryEventForUser(userID, eventID) {
    await userModel.update({ '_id': userID }, { $push: { history: eventID } });
};

async function dbCheckIfUserNameExists(name) {
    let result = await userModel.findOne({ 'name': name });
    return (!(!result));
};

async function dbCheckIfUserEmailExists(email) {
    let result = await userModel.findOne({ 'email': email });
    return (!(!result));
};

async function userregister(request, response) {
    // get the db function to submit a user creation request here. pass the user's details into the database.
    if (request.body.password !== request.body.confirmedpassword) {
        response.send({
            passerror: 'Passwords do not match'
        });
        return;
    } else {
        let nameCheck = await dbCheckIfUserNameExists(request.body.name);
        if (nameCheck) {
            response.send({
                nameerror: 'Name is already taken'
            })
        };
        let emailCheck = await dbCheckIfUserEmailExists(request.body.email);
        if (emailCheck) {
            response.send({
                emailerror: 'Email address is already in use'
            })
        };
        let result = await dbCreateUser(request.body);
        result.password = undefined;
        result = JSON.parse(JSON.stringify(result));
        let toSend = {
            success: true,
            result: result
        };
        response.send(toSend);
    };
};

async function userlogin(request, response) {
    // get the user to login here. For now, we just do a database lookup to see if the user password matches, then store the user in the database.
    let userInput = request.body;
    let result = await dbFindUserByName(userInput.name);
    if (!result) {
        response.send({
            result: 'User not found'
        });
        return;
    };
    let check = bcrypt.compareSync(userInput.password, result.password);
    if (check) {
        result.password = undefined;
        result = JSON.parse(JSON.stringify(result));
        result.success = true;
        // if (result['created'].length > 0) {
        //     result['created'] = await getEventsFromArray(result['created']);
        // };
        // if (result['favourites'].length > 0) {
        //     result['favourites'] = await getEventsFromArray(result['favourites']);
        // };
        // if (result['history'].length > 0) {
        //     result['history'] = await getEventsFromArray(result['history']);
        // };
        // if (result['upcoming'].length > 0) {
        //     result['upcoming'] = await getEventsFromArray(result['upcoming']);
        // };
        response.cookie('test', 'yo');
        response.send(result);
    } else {
        response.send({
            result: 'Invalid password'
        });
    };
};

function userlogout(request, response) {
    // This request is going to come in via XHR. Clear the user from the logged in database here and send the appropriate JSON response {logout: true} and let the UI handle it.
    response.clearCookie('test');
    response.send({
        result: 'loggedOut'
    })
};

function usergetprofile(request, response) {
    // This request is going to come in via XHR. Get the user's email address and pull out the profile via a DB query, then send it back as a JSON object and let the UI handle the rest.
}

function userupdateprofile(request, response) {
    // This request is going to come in via XHR. Run a DB query based on the user's id
}

async function usergetNearbyUpcoming(request, response) {
    // This submission is going to come in via XHR upon opening the root document. Run a database query for points with latitude and longitude. Note that 0.01 ~ 1100m, 0.001 ~ 110m, and 0.0001 ~ 11m. Assuming a normal walking speed of 4km/h, we get about 67m/min. Assume also that a user would be willing to walk up to 5 min in either direction. So we want about 334m in either direction, i.e. lat/lng should be +- 0.003 from the user's own lat/lng. BUT, accounting for inaccuracies in the user's GPS (commercial GPS accuracy ) which can often be up to 100m or so in SG, we will go up to +- 0.004.

    // Return a JSON object as a response - {marker: [{lat, lng}, {lat, lng}, ... ], nearby: [route, route, ... ]}
    let data = request.body;
    let result = await dbFindUpcomingEventsNearLatLng('run', data.lat, data.lng, 0.004);
    let tmp = null, tmpArr = [];
    for (let i = 0; i < result.length; i++) {
        tmp = await eventModel.findOne({'_id': result[i].eventID});
        tmpArr.push(tmp);
    };
    response.send(tmpArr);
};

function usergetNearbyMessages(request, response) {
    // This submission is going to come in via XHR upon opening the root document. Run a database query for points with latitude and longitude. Note that 0.01 ~ 1100m, 0.001 ~ 110m, and 0.0001 ~ 11m. Assuming a normal walking speed of 4km/h, we get about 67m/min. Assume also that a user would be willing to walk up to 5 min in either direction. So we want about 334m in either direction, i.e. lat/lng should be +- 0.003 from the user's own lat/lng. BUT, accounting for inaccuracies in the user's GPS (commercial GPS accuracy ) which can often be up to 100m or so in SG, we will go up to +- 0.004.

    // Return a JSON object as a response - {marker: [{lat, lng}, {lat, lng}, ... ], nearby: [route, route, ... ]}
}

function usergetUpcoming(request, response) {

}

function usergetMessages(request, response) {

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
app.post('/user/logout', userlogout);
app.post('/user/register', userregister);
app.post('/api/getuserupcoming', usergetUpcoming);
app.post('/api/getusermessages', usergetMessages);
app.post('/api/getnearbyupcoming', usergetNearbyUpcoming);
app.post('/api/getnearbymessages', usergetNearbyMessages)
app.post('/', postRoot);

// http.createServer(app).listen(3000, () => { console.log('Listening on 3000') });
https.createServer(options, app).listen(PORT, () => { console.log(`Setting sail from ${PORT}`)});
