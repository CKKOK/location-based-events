const PORT = process.env.PORT || 3000;
const SECURE_PORT = 5000;
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

/**
 * Google Maps Functions for Server Side Processing
 */
const googleMapsClient = require('@google/maps').createClient({
	key: 'AIzaSyAeK4QLXB-YzLK6PwKHr5y4NPAquQXPBrU',
	Promise: Promise
});

const testRoute = {
	'1': { lat: 1.3083994842109146, lng: 103.83030169050608 },
	'2': { lat: 1.3067905778813913, lng: 103.82873528044138 },
	'3': { lat: 1.3056965209885705, lng: 103.83060209791574 },
	'4': { lat: 1.3095793481968057, lng: 103.83214705030832 },
	'5': { lat: 1.3098153209273449, lng: 103.83161060850534 },
	'6': { lat: 1.3097509647303103, lng: 103.83131020109568 },
	'7': { lat: 1.3093648275133956, lng: 103.83053772489939 }
};

function calculateRouteDistance(route) {
	return new Promise(function(resolve, reject) {
		googleMapsClient
			.directions({
				origin: route.origin,
				destination: route.destination,
				waypoints: route.waypoints,
				mode: route.mode
			})
			.asPromise()
			.then(function(response) {
				let legs = response.json.routes[0].legs;
				let result = legs.reduce((acc, cur) => {
					return acc + cur.distance.value;
				}, 0);
				resolve(result / 1000);
			})
			.catch(function(error) {
				reject(error);
			});
	});
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
		}
	}
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

/**
 * Database Setup
 */
const mongoose = require('mongoose');
const mongodb = 'mongodb://127.0.0.1/run2';
const autoIncrement = require('mongoose-auto-increment');
mongoose.connect(mongodb);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
autoIncrement.initialize(db);

db.on('error', console.error.bind(console, 'MongoDB connection error: '));

const Schema = mongoose.Schema;

const sessionSchema = new Schema({
	sessionID: {
		type: String,
		require: true
	},
	ip: {
		type: String,
		required: true
	},
	userid: Number,
	state: Object
});

const userSchema = new Schema({
	name: {
		type: String,
		required: [true, 'A name is required!']
	},
	email: {
		type: String,
		required: [true, 'Please provide an e-mail address!']
	},
	profilepic: {
		type: String
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
		type: [
			{
				eventID: Number,
				start: Date,
				end: Date
			}
		],
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
});

const eventSchema = new Schema({
	type: {
		type: String,
		required: [true, 'What type of event is this?']
	},
	title: {
		type: String,
		required: [true, 'What event is this called?']
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
});

const upcomingSchema = new Schema({
	eventID: {
		type: Number,
		required: [true, 'Which event id?']
	},
	type: {
		type: String,
		required: [true, 'What type of event?']
	},
	title: {
		type: String,
		required: [true, 'Upcoming event title?']
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
});

userSchema.plugin(autoIncrement.plugin, 'users');
eventSchema.plugin(autoIncrement.plugin, 'events');
upcomingSchema.plugin(autoIncrement.plugin, 'upcoming');
sessionSchema.plugin(autoIncrement.plugin, 'sessions');

const userModel = mongoose.model('users', userSchema);
const eventModel = mongoose.model('events', eventSchema);
const upcomingModel = mongoose.model('upcoming', upcomingSchema);
const sessionModel = mongoose.model('sessions', sessionSchema)

//CRUD: Events
//==General===
async function dbEventFindNearLatLng(type, lat, lng, threshold) {
	let result = await eventModel.find({
		type: type,
		'origin.lat': { $lt: lat + threshold },
		'origin.lat': { $gt: lat - threshold },
		'origin.lng': { $lt: lng + threshold },
		'origin.lng': { $gt: lng - threshold }
	});
	return result;
}

async function dbEventCreate(type, title, creator, origin, details) {
	let newEvent = new eventModel({
		type: type,
		title: title,
		creator: creator,
		origin: origin,
		details: details
	});
	let result = await newEvent.save();
	return result;
};

async function dbEventUpdate(id, newDetails) {

};

async function dbUpcomingEventsCreateFromEventID(userID, eventID, start, expiry) {
	let event = await eventModel.findOne({ _id: eventID });
	if (!expiry) {
		expiry = start.setDate(start.getDate() + 7); // Default of 1 day
	}
	let newUpcomingEvent = new upcomingModel({
		eventID: eventID,
		origin: event.origin,
		type: event.type,
		title: event.title,
		organizer: userID,
		start: start,
		expiry: expiry
	});
	let result = await newUpcomingEvent.save();
	await userModel.update(
		{ _id: userID },
		{ $push: { upcoming: result._id } }
	);
}

async function dbUpcomingEventsFindNearLatLng(type, lat, lng, threshold) {
	let now = new Date();
	let result = await upcomingModel.find({
		type: type,
		'origin.lat': { $lt: lat + threshold },
		'origin.lat': { $gt: lat - threshold },
		'origin.lng': { $lt: lng + threshold },
		'origin.lng': { $gt: lng - threshold },
		start: { $gte: now }
	});
	return result;
}
// dbUpcomingEventsFindNearLatLng(('', 1.30, 103.83, 0.02);

async function dbUpcomingEventAddUser(userID, eventID) {
	let upcomingEventID = await upcomingModel.findOne({ eventID: eventID });
	if (!upcomingEventID) {
		throw new Error('Upcoming event does not exist');
		return false;
	} else {
		await userModel.update(
			{ _id: userID },
			{ $push: { upcoming: eventID } }
		);
		await upcomingModel.findOneAndUpdate(
			{ _id: upcomingEventID },
			{ $push: { attendees: userID } }
		);
		return true;
	}
}

async function dbUpcomingEventRemoveUser(userID, upcomingEventID) {
	// To work - prevent a user from removing an event that he/she created!
	await upcomingModel.findOneAndUpdate(
		{ _id: upcomingEventID, organizer: { $ne: userID } },
		{ $pull: { attendees: userID } }
	);
	await userModel.findOneAndUpdate(
		{ _id: userID }, { $pull: { upcoming : upcomingEventID }}
	);
}

async function dbEventAddToUserHistory(userID, eventID) {
	await userModel.findOneAndUpdate(
		{ _id: userID }, { $push: { history : eventID }}
	);
}

async function dbUpcomingEventComplete(eventID) {
	// remove the upcoming event from the database, and 
}

async function dbHelperGetEventsFromArray(arr) {
	let result = await eventModel.find({ _id: { $in: arr } });
	return result;
}

async function dbHelperGetUpcomingEventsFromArray(arr) {
	let result = await upcomingModel.find({ _id: { $in: arr } });
	return result;
}

//==Running Routes====
async function dbRunningRouteCreate(userid, title, route) {
	let details = {
		destination: route.destination,
		waypoints: route.waypoints,
		distance: route.distance
	};
	let result = await dbEventCreate('run', title, userid, route.origin, details);
	return result;
}

//==Messages==
async function dbLocationMessageCreate(userid, title, time, messagebody, origin) {
	let details = {
		title: title,
		time: time,
		messageBody: messagebody
	};
	let result = await dbEventCreate('message', title, userid, origin, details);
	return result;
}


//==Users===
async function dbUserCreate(user, role = 'user', level = 1) {
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
	}
}

async function dbUserFindByName(name) {
	let result = await userModel.findOne({ name: name });
	return result;
}

async function dbUserFindById(id) {
	let result = await userModel.findOne({ _id: id });
	return result;
}

async function dbUserFindByEmail(email) {
	let result = await userModel.findOne({ email: email });
	return result;
}

async function dbUserUpdate(id, newUserData) {	
	try {
		let user = await dbUserFindById(id);
		let oldPassCheck = await bcrypt.compare(newUserData.oldpassword, user.password);
		if (oldPassCheck === false) {
			return false;
		}
		let hashedPassword = await bcrypt.hash(newUserData.password, bcryptSalt);
		newUserData.password = hashedPassword;
		let result = await userModel.findOneAndUpdate(
			{ _id: id },
			newUserData,
			{
				new: true
			}
		);
		return result;
	} catch (error) {
		throw new Error(error);
		return error;
	}
}

async function dbUserDelete(id) {
	try {
		let result = await userModel.findOneAndRemove({ _id: id });
		return result;
	} catch (error) {
		throw new Error(error);
		return error;
	}
}

async function dbUserGetFavourites(id) {
	let result = await userModel.findOne({ _id: id }, 'favourites');
	return result.favourites;
}

async function dbUserGetUpcoming(id) {
	let result = await userModel.findOne({ _id: id }, 'upcoming');
	return result.upcoming;
}

async function dbUserGetHistory(id) {
	let result = await userModel.findOne({ _id: id }, 'history');
	return result.history;
}

async function dbUserGetCreatedEvents(id) {
	let result = await userModel.findOne({ _id: id }, 'created');
	return result.created;
}

async function dbUserInsertFavourite(userID, eventID) {
	await userModel.update({ _id: userID }, { $push: { favourites: eventID } });
}

async function dbUserInsertUpcoming(userID, eventID) {
	await userModel.update({ _id: userID }, { $push: { upcoming: eventID } });
}

async function dbUserInsertCreatedEvent(userID, eventID) {
	await userModel.update({ _id: userID }, { $push: { created: eventID } });
}

async function dbUserInsertHistory(userID, eventID) {
	await userModel.update({ _id: userID }, { $push: { history: eventID } });
}

async function dbUserCheckIfNameExists(name) {
	let result = await userModel.findOne({ name: name });
	return !!result;
}

async function dbUserCheckIfEmailExists(email) {
	let result = await userModel.findOne({ email: email });
	return !!result;
}

//==Sessions===
async function dbSessionCreate(sid, userid, ip, state) {
	// sessionID, ip, userid, state
}

async function dbSessionFindBySID(sid) {

}

async function dbSessionDelete(sid) {

}

async function dbSessionUpdate(sid, userid, ip, state) {

}


async function createTestData() {
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
}
// createTestData();

/**
 * Server Creation
 */
const https = require('https');
const http = require('http');
const fs = require('fs');

const options = {
	key: fs.readFileSync('./encryption/server.key'),
	cert: fs.readFileSync('./encryption/server.crt')
};

const app = express();

/**
 * Middleware Setup
 */
app.engine('handlebars', exphbs.create().engine);
app.set('view engine', 'handlebars');

// For application/x-www-form-urlencoded
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
// For application/json
app.use(bodyParser.json());
app.use(cookieParser());
app.use(forceSSL);
app.use(
	session({
		secret: 'abcdefg',
		resave: true,
		cookie: {maxAge: 28800000},
		saveUninitialized: true,
		cookie: { expires: false, secure: true },
		store: new MemcachedStore({
			hosts: ['127.0.0.1:11211'],
			secret: 'zxcvb'
		}),
	})
);

app.use(express.static('../client'));

async function getRoot(request, response) {
	let context = {};
	if (request.session.hasOwnProperty('userid')) {
		// also, check the user's role. an admin should have a black header.
		let user = await dbUserFindById(parseInt(request.session.userid));
		if (user.role === 'admin') {
			context['admin'] = true;
		};
		response.render('home', context);
	} else {
		response.render('home', context);
	};
}

function postRoot(request, response) {
	let stuff = request.body;
	response.send(testRoute);
}



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
			});
		}
		let emailCheck = await dbCheckIfUserEmailExists(request.body.email);
		if (emailCheck) {
			response.send({
				emailerror: 'Email address is already in use'
			});
		}
		let result = await dbUserCreate(request.body);
		result.password = undefined;
		result = JSON.parse(JSON.stringify(result));
		let toSend = {
			success: true,
			result: result
		};
		response.send(toSend);
	}
}

async function userlogin(request, response) {
	// get the user to login here. For now, we just do a database lookup to see if the user password matches, then store the user in the database.
	let userInput = request.body;
	let result = await dbUserFindByName(userInput.name);
	if (!result) {
		response.send({
			nameerror: 'User not found'
		});
		return;
	}
	let check = await bcrypt.compare(userInput.password, result.password);
	if (check) {
		result.password = undefined;
		result = JSON.parse(JSON.stringify(result));
		result.success = true;
		request.session.userid = result._id;
		if (result.role === 'admin') {
			request.session.admin = true;
		}
		request.session.save(function(){
			if (result.role === 'admin') {
				result.script = adminFragment;
			}	
			response.send(result);
		});
	} else {
		response.send({
			passerror: 'Invalid password'
		});
	}
}

function userlogout(request, response) {
	request.session.userid = undefined;
	if (request.session.admin) {
		request.session.admin = undefined;
	};
	request.session.save();
	response.redirect('/');
};

async function usergetprofile(request, response) {
	// This request is going to come in via XHR. Get the user's email address and pull out the profile via a DB query, then send it back as a JSON object and let the UI handle the rest.
	if (request.session && request.session.userid) {
		let result = await dbUserFindById(request.session.userid);
		response.send(result);
	};
};

function userupdateprofile(request, response) {
	// This request is going to come in via XHR. Run a DB query based on the user's id
}

async function usergetNearbyUpcoming(request, response) {
	let data = request.body;
	let result = await dbUpcomingEventsFindNearLatLng(
		'run',
		data.lat,
		data.lng,
		0.004
	);
	let tmp = null,
		tmp2 = null,
		tmpArr = [];
	for (let i = 0; i < result.length; i++) {
		tmp = await eventModel.findOne({ _id: result[i].eventID });
		tmp = tmp.toJSON();
		tmp2 = await dbUserFindById(tmp.creator);
		tmp.creator = tmp2.name;
		tmpArr.push(tmp);
	}
	response.send(tmpArr);
}

async function usergetNearbyMessages(request, response) {
	let data = request.body;
	let result = await dbUpcomingEventsFindNearLatLng(
		'message',
		data.lat,
		data.lng,
		0.004
	);
	let tmp = null,
		tmp2 = null,
		tmpArr = [];
	for (let i = 0; i < result.length; i++) {
		tmp = await eventModel.findOne({ _id: result[i].eventID });
		tmp = tmp.toJSON();
		tmp2 = await dbUserFindById(tmp.creator);
		tmp.creator = tmp2.name;
		tmp.details.time = tmp.details.time.toLocaleString();
		tmpArr.push(tmp);
	}
	response.send(tmpArr);
}

async function routeCreate(request, response) {
	if (request.sessionID && request.session.userid) {
		let userid = request.session.userid;
		let route = await newRouteFromWaypointList(request.body.waypoints);
		let title = request.body.title;
		let result = await dbRunningRouteCreate(userid, title, route);
		response.send({result: result});
	};
};

async function routeEdit(request, response) {
	// DECIDE: How to handle editing of routes? Timestamp the thing!!!
};

async function routeDelete(request, response) {
	// This one's simple - we just run a database query to flag the route as disabled.
};

async function messageCreate(request, response) {
	if (request.sessionID && request.session.hasOwnProperty('userid')) {
		let userid = request.session.userid;
		let obj = request.body;
		let title = obj.title;
		let origin = obj.origin;
		let time = new Date();
		let messagebody = obj.messagebody;
		let result = await dbLocationMessageCreate(userid, title, time, messagebody, origin);
		await dbUpcomingEventsCreateFromEventID(userid, result._id, time);
		response.send({success: true});
	};
};

async function messageEdit(request, response) {

};

async function messageDelete(request, response) {

};

async function usernameCheck(request, response) {
	let result = await dbUserCheckIfNameExists(request.body.name);
	response.send(result);
}

async function usernameCheck2(request, response) {
	let tmp = await userModel.findOne({_id: request.session.userid}, 'name');
	let result = await userModel.findOne({$and: [{name: request.body.name}, {name: {$ne: tmp.name}}]});
	response.send(!!result);
}

async function useremailCheck2(request, response) {
	let tmp = await userModel.findOne({_id: request.session.userid}, 'email');
	let result = await userModel.findOne({$and: [{email: request.body.email}, {email: {$ne: tmp.email}}]});
	response.send(!!result);
}

async function useremailCheck(request, response) {
	let result = await dbUserCheckIfEmailExists(request.body.email);
	response.send(result);
}

async function userupdate(request, response) {
	let result = await dbUserUpdate(request.session.userid, request.body);
	if (result) {
		response.send({success: true});
	} else {
		response.send({success: false, error: 'Old password does not match'})
	};
}

async function usergetUpcoming(request, response) {
	// get userid from the session database, then 
}

async function usergetMessages(request, response) {

}

async function userWithdrawFromUpcomingEvent(request, response) {
	// get userid from the session database, then withdraw from upcoming event
}

async function userJoinUpcomingEvent(request, response) {
	// get userid from the session database, then join the upcoming event
}

function getLoginForm(request, response) {
	let result = {form: loginForm, script: loginScript};
	response.send(JSON.stringify(result));
}

function getRegistrationForm(request, response) {
	let result = {form: registrationForm, script: registrationScript};
	response.send(JSON.stringify(result));
}

async function getUserProfile(request, response) {
	let tmp = await dbUserFindById(request.session.userid);
	tmp.password = undefined;
	tmp = JSON.parse(JSON.stringify(tmp));
	let result = {form: profilePage, script: profilePageScript, values: tmp};
	response.send(JSON.stringify(result));
}

async function getUpdateForm(request, response) {
	let user = await dbUserFindById(request.session.userid);
	let values = {
		name: user.name,
		email: user.email,
		profilepic: user.profilepic
	};
	let result = {form: profileForm, script: profileScript, values: values};
	response.send(JSON.stringify(result));
}

function getMessageCreateForm(request, response) {
	let result = {form: createMessagePage, script: createMessageScript};
	response.send(JSON.stringify(result));
}

app.get('/', getRoot);
app.get('/loginForm', getLoginForm);
app.get('/registrationForm', getRegistrationForm);
app.get('/updateForm', getUpdateForm);
app.post('/user/login', userlogin);
app.get('/user/logout', userlogout);
app.post('/user/register', userregister);
app.get('/user/profile', getUserProfile);
app.put('/user/update', userupdate);
app.get('/api/getmessagecreateform', getMessageCreateForm);
app.post('/api/getuserupcoming', usergetUpcoming);
app.post('/api/getusermessages', usergetMessages);
app.post('/api/getnearbyupcoming', usergetNearbyUpcoming);
app.post('/api/getnearbymessages', usergetNearbyMessages);
app.post('/api/joinevent', userJoinUpcomingEvent);
app.post('/api/withdrawevent', userWithdrawFromUpcomingEvent);
app.post('/api/createmessage', messageCreate);
app.post('/api/createrun', routeCreate);
app.post('/api/namevalidate2', usernameCheck2);
app.post('/api/emailvalidate2', useremailCheck2);
app.post('/api/namevalidate', usernameCheck);
app.post('/api/emailvalidate', useremailCheck);
app.post('/', postRoot);

let loginForm = fs.readFileSync('./fragments/loginForm.html','utf8');
let loginScript = fs.readFileSync('./fragments/loginForm.js','utf8');
let registrationForm = fs.readFileSync('./fragments/registrationForm.html','utf8');
let registrationScript = fs.readFileSync('./fragments/registrationForm.js','utf8');
let adminFragment = fs.readFileSync('./fragments/adminFragment.js','utf8');
let profileForm = fs.readFileSync('./fragments/profileUpdateForm.html','utf8');
let profileScript = fs.readFileSync('./fragments/profileUpdateForm.js','utf8');
let profilePage = fs.readFileSync('./fragments/profile.html','utf8');
let profilePageScript = fs.readFileSync('./fragments/profile.js','utf8');
let createMessagePage = fs.readFileSync('./fragments/createMessage.html','utf8');
let createMessageScript = fs.readFileSync('./fragments/createMessage.js','utf8');

http.createServer(app).listen(PORT, () => {console.log(`Setting sail from port ${PORT}...`) });
https.createServer(options, app).listen(SECURE_PORT, () => {
	console.log(`.. with Fort Knox Armada at ${SECURE_PORT}`);
});
