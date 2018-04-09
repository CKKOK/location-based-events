/**
 * State check
 */
if (typeof (__loggedIn) !== 'undefined' && __loggedIn === true) {
	console.log('Yeah we\'re logged in');
};
var creationMode = 'run';
var __editInProgress = false;

/**
 * Constants (Pseudo)
 */
var iconRun = 'img/runnerIcon.png';
var iconMsg = 'img/comment-alt.svg';
var iconSelf = '';
var markerSelf = null;
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
var UIInfoBoxContent = document.querySelector('#infoPanel');
var UIFormPanel = document.querySelector('#formPanel');
var UIChatPanel = document.querySelector('#chatPanel');
var UIDisplayPaneCurrentDisplay = '';

function showInfo(title, content, flyout) {
	UIDisplayPaneComponents['about'].title = title;
	UIInfoBoxContent.innerHTML = content;
	if (flyout === true) {
		UIBtnAboutHandler();
	};
};

// For forms
var formComponents = [];

// For Messages
var messageToPost = {
	location: {},
	message: ''
};

// Linked List for Route Markers
function LinkedListNode(data) {
	this.data = data;
	this.prev = null;
	this.next = null;
};

function LinkedList() {
	this.__length = 0;
	this.head = null;
	this.tail = null;
};

LinkedList.prototype.addNode = function (data) {
	var node = new LinkedListNode(data);
	if (this.head === null) {
		this.head = node;
		this.tail = node;
	} else {
		this.tail.next = node;
		node.prev = this.tail;
		this.tail = node;
	};
	this.__length++;
	return node;
};

LinkedList.prototype.removeNode = function (data) {
	var x = this.head;
	while(x !== null && x.data !== data) {
		x = x.next;
	};
	if (x !== null) {
		this.deleteNode(x);
	};
};

LinkedList.prototype.deleteNode = function (node) {
	if (node.prev !== null) {
		node.prev.next = node.next;
	} else {
		this.head = node.next;
	}
	if (node.next !== null) {
		node.next.prev = node.prev;
	} else {
		this.tail = node.prev;
	}
	node.prev = null;
	node.next = null;
	this.__length--;
	return node;
};

LinkedList.prototype.forEach = function (handler) {
	var node = this.head;
	while (node !== null) {
		handler(node.data);
		node = node.next;
	};
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
		UIDisplayPane.style.width = '80%';
		if (!UIDisplayPane.style.top || UIDisplayPane.style.top === '96%') {
			UIDisplayPane.style.top = '15%';
		} else {
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
	showDisplayPane();
};

function UIBtnLoginHandler() {
	getFragment('Login', '/loginForm', function(data){
		UIDisplayPaneComponents.form.show();
		showDisplayPane();
	});
};

function UIBtnRegisterHandler() {
	getFragment('Come Join Us!', '/registrationForm', function(){
		UIDisplayPaneComponents.form.show();
		showDisplayPane();
	});
};

function UIBtnChatHandler() {
	UIDisplayPaneComponents.chat.show();
	showDisplayPane();
};

function UIBtnShowUpcomingEventsHandler() {

}

function UIBtnShowMessagesHandler() {
	
}

function UIBtnProfileHandler() {
	getFragment('User Profile', '/user/profile', function(data){
		document.querySelector('#profilepic').setAttribute('src', data.values.profilepic);
		document.querySelector('.profilename').innerHTML = data.values.name;
		document.querySelector('.profileemail').innerHTML = data.values.email;
		UIDisplayPaneComponents.form.show();
		showDisplayPane();
	});
};

function UIBtnCreateModeToggleHandler(e) {
	if (!__editInProgress) {
		if (e.target.innerHTML === '@Runs' || e.target.innerHTML === '') {
			e.target.innerHTML = '@Message';
			creationMode = 'message';
		} else {
			e.target.innerHTML = '@Runs'
			creationMode = 'run';
		};
	};
};

function UIBtnShowSubmitFormHandler() {

}

function UIBtnFinalSubmissionHandler() {
	// For runs, obj needs: title, waypoints
	// For messages, obj needs: title, origin, messagebody
	var obj = {
		title: '',
	};
	switch (creationMode) {
		case 'run':
			obj.waypoints = [];
		case 'message':
			obj.origin = {lat: currentLat, lng: currentLng};
			obj.messagebody = '';
			break;
		default:
			break;
	}
	function responseHandler(data) {
		if (data.success === true) {

		} else {

		};
	};
	JSONSend(obj, '/api/createmessage', 'POST', responseHandler);
}

function UIBtnClearRoutesHandler() {
	clearMap();
	UIElements['mobile']['clear'].hide();
	UIElements['desktop']['clear'].hide();
	showAllHiddenMarkers();
};

/**
 * Form Functions
 */

function getFragment(name, url, callback) {
	var form = '';
	var script = '';

	function dataHandler(data){
		form = data.form;
		script = data.script;
		var scriptElement = document.createElement('script');
		scriptElement.innerHTML = script;
		UIDisplayPaneComponents['form'].title = name;
		UIDisplayPaneComponents['form'].element.innerHTML = form;
		UIDisplayPaneComponents['form'].element.appendChild(scriptElement);
		if (callback) {
			callback(data);
		}
	};

	JSONSend({}, url, 'GET', dataHandler);
}

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
			// Should hide the upcoming events / messages buttons
		};
	};

	JSONSend(logoutInfo, '/user/logout', 'GET', dataHandler);
};

/**
 * Front-End Setup
 */

//====Google Maps Functions===================
var mapOutput = document.querySelector('#mapOutput');
var locationWatcher = null;
var mapInitOptions = {
	center: { lat: 1.3084210699192511, lng: 103.83052816337477 },
	zoom: 17,
	scrollwheel: false,
	gestureHandling: 'auto',
	zoomControl: true,
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
var eventMarkers = [];
var currentCreatedRoute = null;
var currentDisplayedRoute = null;
var hiddenMarkers = null;
var nearby = [];
var nearbypointer = [];
var currentLat = null;
var currentLng = null;

function requestLocationPermission() { }

function centerMapOn(lat, long) {
	map.setCenter({ lat: lat, lng: long });
}

function clearMap() {
	directionsDisplay.setMap(null);
	directionsDisplay = new google.maps.DirectionsRenderer();
	directionsDisplay.setMap(map);
}

function createInfoWindowContentForEvent(id, title, time, owner, attendees) {
	var contentString = '<div class="infoWindowContent">';
	contentString += 'Title: ';
	contentString += 'Time: ';
	contentString += 'Owner: ';
	contentString += 'Attendees: ';
	contentString += 'buttonJoin, buttonFave';
	contentString += '</div>';
	return contentString;
};

function createInfoWindowContentForMessage(title, time, owner, message) {
	var contentString = '<div class="infoWindowContent">';
	contentString += 'Title: ' + title + '<br>';
	contentString += 'Time: ' + time + '<br>';
	contentString += 'From: ' + owner + '<br>';
	contentString += 'Message: <span style="white-space:pre-line">' + message + '</span><br>';
	contentString += '</div>';
	return contentString;
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
	map.setCenter({ lat: lat, lng: long });
}

var messageIconURL = 'https://use.fontawesome.com/releases/v5.0.9/svgs/regular/envelope.svg';
var runningIconURL = 'https://png.icons8.com/ios/50/000000/exercise.png';

function setEventMarkerAtPosition(lat, lng, type, title, iconImgURL, owner, details) {
	var runningMarkerIcon = {
		url: runningIconURL,
		scaledSize: new google.maps.Size(45, 45),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(20, 50)
	};
	
	var messageMarkerIcon = {
		url: messageIconURL,
		scaledSize: new google.maps.Size(45, 45),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(20, 50)
	};

	lastMarker++;
	var markerTitle = title || lastMarker.toString();
	var info = details || '';
	var eventType = type || 'run';
	var markerData = {
		position: { lat: lat, lng: lng },
		map: map,
		title: markerTitle,
		routeTag: 'test',
		type: eventType,
		icon: runningMarkerIcon,
		details: info,
		owner: owner,
		animation: google.maps.Animation.DROP,
		labelAnchor: new google.maps.Point(18, 12),
		labelInBackground: true
	};
	var marker = new google.maps.Marker(markerData);

	google.maps.event.addListener(marker, 'click', function (e) {
		if (this.type === 'run' && this.details !== '') {
			this.setMap(null);
			hiddenMarkers.addNode(this);
			displayRoute(this.details);
		} else if (this.type === 'message' && this.details !== '') {
			var tmpWindow = new google.maps.InfoWindow({
				content: createInfoWindowContentForMessage(this.details.title, this.details.time, this.owner, this.details.messageBody)
			});
			tmpWindow.open(map, this);
		};
	});
	eventMarkers.push(marker);
}

function createEventMarkerAtPosition(lat, lng, type, title, iconImgURL, owner, details) {
	var runningMarkerIcon = {
		url: runningIconURL,
		scaledSize: new google.maps.Size(45, 45),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(20, 50)
	};
	
	var messageMarkerIcon = {
		url: messageIconURL,
		scaledSize: new google.maps.Size(45, 45),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(20, 50)
	};

	lastMarker++;
	var markerTitle = title || lastMarker.toString();
	var info = details || '';
	var eventType = type || 'run';
	var markerData = {
		node: {},
		position: { lat: lat, lng: lng },
		map: map,
		title: markerTitle,
		routeTag: 'test',
		type: eventType,
		icon: runningMarkerIcon,
		details: info,
		owner: owner,
		animation: google.maps.Animation.DROP,
		labelAnchor: new google.maps.Point(18, 12),
		labelInBackground: true
	};
	var marker = new google.maps.Marker(markerData);
	var node = currentCreatedRoute.addNode(marker);
	marker.node = node;

	google.maps.event.addListener(marker, 'click', function (e) {
		if (this.type === 'run' && this.details !== '') {
			this.setMap(null);
			currentCreatedRoute.deleteNode(this.node);
		} else if (this.type === 'message' && this.details !== '') {
			var tmpWindow = new google.maps.InfoWindow({
				content: createInfoWindowContentForMessage(this.details.title, this.details.time, this.owner, this.details.messageBody)
			});
			tmpWindow.open(map, this);
		};
	});
	__editInProgress = true;
}

function hideMarker(marker) {
	marker.setMap(null);
	hiddenMarkers.addNode(marker);
};

function showMarker(marker) {
	marker.setMap(map);
	hiddenMarkers.removeNode(marker);
}

function showAllHiddenMarkers() {
	hiddenMarkers.forEach(function(marker){
		marker.setMap(map);
	})
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
	currentLat = lat;
	currentLng = lng;
	var obj = { time: time, lat: lat, lng: lng };
	var tmp = null;

	function dataHandler(data) {
		data.forEach(function (point) {
			if (nearbypointer.indexOf(point._id) === -1) {
				tmp = point.details.waypoints;
				tmp.unshift(point.origin);
				tmp.push(point.details.destination);
				setEventMarkerAtPosition(point.origin.lat, point.origin.lng, 'run', 'title', iconRun, 'Lala', tmp);
				nearbypointer.push(point._id);
				nearby.push(point);
			}
		});

		nearbypointer.forEach(function (pointID) {
			if (data.indexOf(pointID) === -1) {
				console.log('This needs to go');
			};
		});
	};

	JSONSend(obj, '/api/getnearbyupcoming', 'POST', dataHandler);
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
				console.log(response);
				console.log(
					'Distance = ' +
					calculateRouteDistance(response.routes[0]) / 1000 +
					' km'
				);
				directionsDisplay.setDirections(response);
				UIElements['mobile']['clear'].show();
				UIElements['desktop']['clear'].show();
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

window.onload = function () {
	new UIButton('about', '.navMobile > .btn-about', UIBtnAboutHandler, 'inline-block', true);
	new UIButton('login', '.navMobile > .btn-login', UIBtnLoginHandler, 'inline-block', true);
	new UIButton('register', '.navMobile > .btn-register', UIBtnRegisterHandler, 'inline-block', true);
	new UIButton('profile', '.navMobile > .btn-profile', UIBtnProfileHandler, 'inline-block', true);
	new UIButton('createMode', '.navMobile > .btn-creationMode', UIBtnCreateModeToggleHandler, 'inline-block', true);
	new UIButton('clear', '.navMobile > .btn-clear', UIBtnClearRoutesHandler, 'inline-block', true);
	new UIButton('finish', '.navMobile > .btn-finish', UIBtnShowSubmitFormHandler, 'inline-block', true);
	new UIButton('logout', '.navMobile > .btn-logout', function (){}, 'inline-block', true);
	

	new UIButton('about', '.navDesktop > .btn-about', UIBtnAboutHandler, 'inline-block', false);
	new UIButton('login', '.navDesktop > .btn-login', UIBtnLoginHandler, 'inline-block', false);
	new UIButton('register', '.navDesktop > .btn-register', UIBtnRegisterHandler, 'inline-block', false);
	new UIButton('profile', '.navDesktop > .btn-profile', UIBtnProfileHandler, 'inline-block', false);
	new UIButton('createMode', '.navDesktop > .btn-creationMode', UIBtnCreateModeToggleHandler, 'inline-block', false);
	new UIButton('clear', '.navDesktop > .btn-clear', UIBtnClearRoutesHandler, 'inline-block', false);
	new UIButton('finish', '.navDesktop > .btn-finish', UIBtnShowSubmitFormHandler, 'inline-block', false);
	new UIButton('logout', '.navDesktop > .btn-logout', function (){}, 'inline-block', false);

	new DisplayPaneComponent('about', 'Title', '#infoPanel');
	new DisplayPaneComponent('form', 'Form Title', '#formPanel');
	new DisplayPaneComponent('chat', 'Nearby Chat', '#chatPanel');

	if (window.innerWidth < mobileBreakpoint) {
		UIDisplayPane.style.top = '96%';
		UIDisplayPane.style.width = '80%';
	} else {
		UIDisplayPane.style.top = '0px';
		UIDisplayPane.style.width = '10px';
	};

	UIDisplayPane.addEventListener('click', function (e) {
		if (e.target.tagName !== 'INPUT') {
			toggleDisplayPane();
		}
	});

	setInterval(getLocationOnce, 3000);

	currentCreatedRoute = new LinkedList();
	currentDisplayedRoute = new LinkedList();
	hiddenMarkers = new LinkedList();

	if ('ontouchstart' in document.documentElement) {
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

		swipedetect(UIDisplayPane, function (swipedir) {
			if (swipedir === 'up') {
				UIDisplayPane.style.top = '15%';
			} else if (swipedir === 'down') {
				UIDisplayPane.style.top = '96%';
			}
		});
	};

};
