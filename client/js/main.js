/**
 * Constants (Pseudo)
 */
var iconRun = 'img/runnerIcon.png';
var iconMsg = 'img/comment-alt.svg';
var mobileBreakpoint = 700;

/**
 * Globals
 */
// For UI
var UIState = null;
var UIElements = {};
UIElements['common'] = {};
UIElements['mobile'] = {};
UIElements['desktop'] = {};
var UIDisplayPaneComponents = {};
var UIDisplayPane = document.querySelector('.displaypane');
var UIDisplayPaneTitle = document.querySelector('.displaypane-title');
var UIDisplayPaneContent = document.querySelector('.displaypane-content');

// For forms
var formComponents = [];

// For Routes
var currentRoute = [];

// For Messages
var messageToPost = {
	location: {},
	message: ''
};

//================= Logic starts here ==========================
/**
 * UI Functions
 */

// UI buttons and display components (for the display pane)
function UIButton(name, cssquery, handler, showStyle, isMobile) {
	this.element = document.querySelector(cssquery);
	this.enabled = true;
	this.showStyle = showStyle || 'inline-block';
	this.handlerFunc = handler;
	this.handlerFunc = this.handlerFunc.bind(this);
	this.element.addEventListener('click', this.handlerFunc);
	if (isMobile === true) {
		UIElements['mobile'][name] = this;
	} else {
		UIElements['desktop'][name] = this;
	}
}

UIButton.prototype.enable = function () {
	this.enabled = true;
};

UIButton.prototype.disable = function () {
	this.enabled = false;
};

UIButton.prototype.hide = function () {
	this.element.style.display = 'none';
};

UIButton.prototype.show = function () {
	if (this.enabled === true) {
		this.element.style.display = this.showStyle;
	}
};

function UIDisplay(version, toDisplay) {
	if (version === 'mobile' || version === 'desktop') {
		UIElements[version].forEach(function (uiElement) {
			if (uiElement.enabled === true) {
				toDisplay === true ? uiElement.show() : uiElement.hide();
			};
		});
	};
};

function Form(formElement, submitURL, method, handler) { }

function DisplayPaneComponent(name, title, cssquery) {
	this.title = title;
	this.element = document.querySelector(cssquery);
	this.enabled = true;
	UIDisplayPaneComponents[name] = this;
}

DisplayPaneComponent.prototype.enable = function () {
	this.enabled = true;
};

DisplayPaneComponent.prototype.disable = function () {
	this.enabled = false;
};

DisplayPaneComponent.prototype.hide = function () {
	this.element.style.display = 'none';
};

DisplayPaneComponent.prototype.show = function () {
	for (var name in UIDisplayPaneComponents) {
		if (
			UIDisplayPaneComponents[name] === this &&
			UIDisplayPaneComponents[name].enabled === true
		) {
			UIDisplayPaneTitle.textContent = this.title;
			UIDisplayPaneComponents[name].element.style.display = 'block';
		} else {
			UIDisplayPaneComponents[name].element.style.display = 'none';
		}
	}
};

/**
 * Form Functions
 */

function nameValidate(e) {

}

function emailValidate(e) {

}

function onLogin(e) {
	e.preventDefault();

	var loginInfo = {
		name: document.querySelector('#loginname').value,
		password: document.querySelector('#loginpass').value
	};

	function dataHandler(data) {
		if (data.success === true) {
			UIElements['mobile']['login'].hide();
			UIElements['mobile']['register'].hide();
			UIElements['desktop']['login'].hide();
			UIElements['desktop']['register'].hide();
			UIElements['mobile']['logout'].show();
			UIElements['desktop']['logout'].show();
			// Show welcome info;
		} else {
			if (data.hasOwnProperty('nameerror')) {
				document.querySelector('#loginnameerror').textContent = data.nameerror;
			};
			if (data.hasOwnProperty('passerror')) {
				document.querySelector('#loginpasserror').textContent = data.passerror;
			};
		};
	};

	JSONSend(loginInfo, '/user/login', 'POST', dataHandler);
};

function onLogout(e) {
	e.preventDefault();

	var logoutInfo = {
		temp: 'data'
	};

	function dataHandler(data) {
		if (data.success === true) {
			UIElements['mobile']['logout'].hide();
			UIElements['desktop']['logout'].hide();
			UIElements['mobile']['login'].show();
			UIElements['mobile']['register'].show();
			UIElements['desktop']['login'].show();
			UIElements['desktop']['register'].show();
		};
	};

	JSONSend(logoutInfo, '/user/logout', 'POST', dataHandler);
};

function onRegister(e) {
	e.preventDefault();

	if (password !== confirmedpassword) {
		document.querySelector('#regpasserror').textContent = 'Passwords do not match!';
		return;
	};

	var regInfo = {
		name: document.querySelector('#regname').value,
		email: document.querySelector('#regemail').value,
		password: document.querySelector('#regpass').value,
		confirmedpassword: document.querySelector('#regconfirmpass').value
	};

	function dataHandler(data) {
		if (data.success === true) {
			UIElements['mobile']['login'].hide();
			UIElements['mobile']['register'].hide();
			UIElements['desktop']['login'].hide();
			UIElements['desktop']['register'].hide();
			UIElements['mobile']['logout'].show();
			UIElements['desktop']['logout'].show();
		}
	}

	JSONSend(regInfo, '/user/register', 'POST', dataHandler);
}

/**
 * Front-End Setup
 */

function requestLocationPermission() { }

var topPane = document.querySelector('.topPane');

var mapOutput = document.querySelector('#mapOutput');
var locationWatcher = null;
var mapInitOptions = {
	center: { lat: 1.3036158, lng: 103.8274339 },
	zoom: 17,
	scrollwheel: false,
	gestureHandling: 'auto',
	zoomControl: false,
	mapTypeControl: false,
	scaleControl: false,
	streetViewControl: true,
	fullscreenControl: false
};
var map = null,
	infoWindow = null;
var geolocationOptions = {
	enableHighAccuracy: true
};
var directionsService, directionsDisplay;
var lastMarker = 0;
var refPoint = null;
var markers = [];
var nearby = [];
var nearbypointer = [];

// Credit to stackoverflow and MDN for shortcutting this painful implementation of client-side cookie-parsing. To be swapped out for the js.cookies library before deployment.
var Cookie = {
	get: function (name) {
		let c = document.cookie.match(
			`(?:(?:^|.*; *)${name} *= *([^;]*).*$)|^.*$`
		)[1];
		if (c) return decodeURIComponent(c);
	},

	set: function (name, value, opts = {}) {
		if (opts.days) opts['max-age'] = opts.days * 60 * 60 * 24;
		opts = Object.entries(opts).reduce(
			(str, [k, v]) => str + `; ${k}=${v}`,
			''
		);
		document.cookie = `${name}=${encodeURIComponent(value)}` + opts;
	},

	delete: function (name, path) {
		Cookie.set(name, '', -1, path);
	}
};

function announce(msg) {
	topPane.innerHTML += msg;
}

function pos(lat, long) {
	return new google.maps.LatLng(lat, long);
}

function centerMapOn(lat, long) {
	map.setCenter({ lat: lat, lng: long });
}

function clearMap() {
	directionsDisplay.setMap(null);
}

function showInfoWindowAtPosition(lat, lng, content) {
	var infoWindow = new google.maps.InfoWindow({
		content: content
	});
	infoWindow.setPosition({ lat: lat, lng: lng });
	infoWindow.open(map);
	return infoWindow;
}

function initMap() {
	map = new google.maps.Map(mapOutput, mapInitOptions);
	directionsService = new google.maps.DirectionsService();
	directionsDisplay = new google.maps.DirectionsRenderer();
	directionsDisplay.setMap(map);
}

function setMapPosition(lat, long) {
	// infoWindow.setPosition(pos(lat, long));
	map.setCenter({ lat: lat, lng: long });
}

function setMarkerAtPosition(lat, lng, title, iconImgURL, details) {
	lastMarker++;
	var markerTitle = title || lastMarker.toString();
	var info = details || '';
	var markerData = {
		position: { lat: lat, lng: lng },
		map: map,
		title: markerTitle,
		routeTag: 'test',
		icon: {
			path: google.maps.SymbolPath.CIRCLE,
			scale: 0
		},
		details: info,
		label: {
			fontFamily: 'Fontawesome',
			text: '\uf183',
			fontSize: '15px',
			color: 'red'
		}
	};
	var marker = new google.maps.Marker(markerData);
	google.maps.event.addListener(marker, 'click', function (e) {
		// do something with this marker ...
		console.log(this);
		this.setMap(null);
		if (this.details !== '') {
			displayRoute(this.details);
		}
	});
	markers.push(marker);
}

function showPosition(location) {
	var time = new Date(location.timestamp).toLocaleString();
	var lat = location.coords.latitude;
	var lng = location.coords.longitude;
	centerMapOn(lat, lng);
}

function getLocationOnce() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			eventUpdateHandler,
			geolocationErrorHandler,
			geolocationOptions
		);
	} else {
		log('This browser does not support geolocation.');
	}
}

function eventUpdateHandler(location) {
	var time = new Date(location.timestamp).toLocaleString();
	var lat = location.coords.latitude;
	var lng = location.coords.longitude;
	var obj = { time: time, lat: lat, lng: lng };
	var tmp = null;
	JSONSend(obj, '/api/getnearbyupcoming', 'POST', function (data) {
		data.forEach(function (point) {
			if (nearbypointer.indexOf(point._id) === -1) {
				tmp = point.details.waypoints;
				tmp.unshift(point.origin);
				tmp.push(point.details.destination);
				setMarkerAtPosition(
					point.origin.lat,
					point.origin.lng,
					'',
					iconRun,
					tmp
				);
				nearbypointer.push(point._id);
				nearby.push(point);
			}
		});
	});
}

function watchLocationToggle() {
	if (locationWatcher === null) {
		if (navigator.geolocation) {
			locationWatcher = navigator.geolocation.watchPosition(
				showPosition,
				geolocationErrorHandler,
				geolocationOptions
			);
		} else {
			log('This browser does not support geolocation.');
		}
	} else {
		navigator.geolocation.clearWatch(locationWatcher);
		locationWatcher = null;
	}
}

function geolocationErrorHandler(error) {
	console.log(error);
}

function calculateRouteDistance(route) {
	var legs = route.legs;
	return legs.reduce(function (acc, cur) {
		return acc + cur.distance.value;
	}, 0);
}

function displayRoute(route) {
	// example route: {
	//   1: {lat: 1, lng: 1},
	//   2: {lat: 2, lng: 2}
	// }
	var waypoints = [];
	var tmp = null;
	for (var pt in route) {
		tmp = pt.toString();
		if (route.hasOwnProperty(tmp)) {
			waypoints.push({
				location: { lat: route[tmp].lat, lng: route[tmp].lng },
				stopover: true
			});
		}
	}
	var origin = waypoints[0].location;
	var destination = waypoints[waypoints.length - 1].location;
	waypoints.shift();
	waypoints.pop();
	directionsService.route(
		{
			origin: origin,
			destination: destination,
			waypoints: waypoints,
			travelMode: 'WALKING'
		},
		function (response, status) {
			if (status === 'OK') {
				console.log(
					'Distance = ' +
					calculateRouteDistance(response.routes[0]) / 1000 +
					' km'
				);
				directionsDisplay.setDirections(response);
			} else {
				console.log(status);
				console.log(response);
			}
		}
	);
}

function JSONSend(obj, url, method, callback) {
	var params = JSON.stringify(obj);
	var xhr = new XMLHttpRequest();
	var data = null;

	xhr.open(method, url);
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4 && xhr.status == 200) {
			data = JSON.parse(xhr.response);
			callback(data);
		}
	};
	xhr.send(params);
}

function sendLocation(location) {
	var route = null;

	console.log('Sending location');
	var time = new Date(location.timestamp).toLocaleString();
	var lat = location.coords.latitude;
	var long = location.coords.longitude;
	var currentLocation = pos(lat, long);
	var dist =
		Math.round(
			google.maps.geometry.spherical.computeDistanceBetween(
				currentLocation,
				refPoint
			)
		) / 1000;
	console.log(dist + ' km ');

	var obj = { time: time, lat: lat, lng: long };
	JSONSend(obj, '/', function (data) {
		displayRoute(date);
	});

	showPosition(location);
}

// Plain JS Swipe Detection (single swipe only)
function swipedetect(elem, callback) {
	var touchsurface = elem,
		swipedir,
		startX,
		startY,
		distX,
		distY,
		threshold = 75, //required min distance traveled to be considered swipe
		restraint = 100, // maximum distance allowed at the same time in perpendicular direction
		allowedTime = 300, // maximum time allowed to travel that distance
		elapsedTime,
		startTime,
		handleswipe = callback || function (swipedir) { };

	touchsurface.addEventListener(
		'touchstart',
		function (e) {
			var touchobj = e.changedTouches[0];
			swipedir = 'none';
			dist = 0;
			startX = touchobj.pageX;
			startY = touchobj.pageY;
			startTime = new Date().getTime(); // record time when finger first makes contact with surface
		},
		false
	);

	touchsurface.addEventListener(
		'touchend',
		function (e) {
			var touchobj = e.changedTouches[0];
			distX = touchobj.pageX - startX;
			distY = touchobj.pageY - startY;
			elapsedTime = new Date().getTime() - startTime;
			if (elapsedTime <= allowedTime) {
				if (
					Math.abs(distX) >= threshold &&
					Math.abs(distY) <= restraint
				) {
					// 2nd condition for horizontal swipe met
					swipedir = distX < 0 ? 'left' : 'right'; // if dist traveled is negative, it indicates left swipe
				} else if (
					Math.abs(distY) >= threshold &&
					Math.abs(distX) <= restraint
				) {
					// 2nd condition for vertical swipe met
					swipedir = distY < 0 ? 'up' : 'down'; // if dist traveled is negative, it indicates up swipe
				}
			}
			handleswipe(swipedir);
			// e.preventDefault()
		},
		false
	);
}

//USAGE:

// var el = document.getElementById('swipezone');
// swipedetect(el, function(swipedir){
//     // swipedir contains either "none", "left", "right", "top", or "down"
//     el.innerHTML = 'Swiped <span style="color:yellow">' + swipedir +'</span>';
// });

function showDisplayPane() {
	if (window.innerWidth < mobileBreakpoint) {
		UIDisplayPane.style.top = '15%';
		UIDisplayPane.style.width = '80%';
	} else {
		UIDisplayPane.style.width = '250px';
	}
}

function hideDisplayPane() {
	if (window.innerWidth < mobileBreakpoint) {
		UIDisplayPane.style.top = '96%';
		UIDisplayPane.style.width = '80%';
	} else {
		UIDisplayPane.style.width = '10px';
	}
}

function toggleDisplayPane() {
	if (window.innerWidth < mobileBreakpoint) {
		if (!UIDisplayPane.style.top || UIDisplayPane.style.top === '96%') {
			UIDisplayPane.style.top = '15%';
			UIDisplayPane.style.width = '80%';
		} else {
			UIDisplayPane.style.width = '80%';
			UIDisplayPane.style.top = '96%';
		}
	} else {
		if (!UIDisplayPane.style.width || UIDisplayPane.style.width === '10px') {
			UIDisplayPane.style.width = '250px';
		} else {
			UIDisplayPane.style.width = '10px';
		}
	}
}



function UIBtnAboutHandler() {
	UIDisplayPaneComponents.about.show();
};

function UIBtnLoginHandler() {
	UIDisplayPaneComponents.login.show();
};

function UIBtnRegisterHandler() {
	UIDisplayPaneComponents.register.show();
};

function UIBtnChatHandler() {
	UIDisplayPaneComponents.chat.show();
};

window.onload = function () {
	new UIButton('about', '.navMobile > .btn-about', UIBtnAboutHandler, 'inline-block', true);
	new UIButton('login', '.navMobile > .btn-login', UIBtnLoginHandler, 'inline-block', true);
	new UIButton('register', '.navMobile > .btn-register', UIBtnRegisterHandler, 'inline-block',true);
	new UIButton('create', '.navMobile > .btn-create', function () {console.log(this);}, 'inline-block', true);
	new UIButton('logout', '.navMobile > .btn-logout', onLogout, 'inline-block', true);
	new UIButton('about', '.navDesktop > .btn-about', UIBtnAboutHandler, 'inline-block',	false);
	new UIButton('login', '.navDesktop > .btn-login', UIBtnLoginHandler,	'inline-block',	false);
	new UIButton('register', '.navDesktop > .btn-register', UIBtnRegisterHandler, 'inline-block',false);
	new UIButton('create', '.navDesktop > .btn-create', function () {console.log(this);}, 'inline-block', false);
	new UIButton('logout', '.navDesktop > .btn-logout', onLogout, 'inline-block', false);

	new DisplayPaneComponent('about', 'Title', '#info');
	new DisplayPaneComponent('login', 'Login', '#formLogin');
	new DisplayPaneComponent('register', 'Register', '#formRegister');
	new DisplayPaneComponent('chat', 'Nearby Chat', '#chat');

	if (window.innerWidth < mobileBreakpoint) {
		UIDisplayPane.style.top = '96%';
		UIDisplayPane.style.width = '80%';
	} else {
		UIDisplayPane.style.top = '0px';
		UIDisplayPane.style.width = '10px';
	}

	UIDisplayPane.addEventListener('click', function (e) {
		if (e.target.tagName !== 'INPUT') {
			toggleDisplayPane();
		}
	});

	setInterval(getLocationOnce, 3000);

	google.maps.event.addListener(map, 'click', function (e) {
		var latLng = e.latLng;
		var lat = latLng.lat();
		var lng = latLng.lng();
		setMarkerAtPosition(lat, lng, '', 'img/runnerIcon.png');
	});

	refPoint = new google.maps.LatLng(1.31162, 103.771597);

	swipedetect(UIDisplayPane, function (swipedir) {
		if (swipedir === 'up') {
			UIDisplayPane.style.top = '15%';
		} else if (swipedir === 'down') {
			UIDisplayPane.style.top = '96%';
		}
	});

	document
		.querySelector('#loginbutton')
		.addEventListener('click', onLogin);
	document
		.querySelector('#registerbutton')
		.addEventListener('click', onRegister);
};
