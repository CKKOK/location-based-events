var topPane = document.querySelector('#topPane');
// var btnGetLocationOnce = document.querySelector('#getLocationOnce');
// var btnToggleLocationWatch = document.querySelector('#toggleLocationWatch');
// var btnShowMap = document.querySelector('#showMap');
// var btnClearMap = document.querySelector('#clearMap');
var mapOutput = document.querySelector('#mapOutput');
var displayPane = document.querySelector('.displaypane');
var mapInitOptions = {
    center: { lat: 1.3036158, lng: 103.8274339 },
    zoom: 17,
    gestureHandling: 'auto'
};
var map = null, infoWindow = null;
var locationWatcher = null;
var geolocationOptions = {
    enableHighAccuracy: true,
    maximumAge: 600000
}
var directionsService, directionsDisplay;
var lastMarker = 0;
var refPoint = null;

// Credit to stackoverflow and MDN for shortcutting this painful implementation of client-side cookie-parsing...
var Cookie = {
    get: function (name) {
        let c = document.cookie.match(`(?:(?:^|.*; *)${name} *= *([^;]*).*$)|^.*$`)[1]
        if (c) return decodeURIComponent(c)
    },
    
    set: function (name, value, opts = {}) {
        if (opts.days) opts['max-age'] = opts.days * 60 * 60 * 24
        opts = Object.entries(opts).reduce((str, [k, v]) => str + `; ${k}=${v}`, '')
        document.cookie = `${name}=${encodeURIComponent(value)}` + opts
    },

    delete: function (name, path) {
        Cookie.set(name, '', -1, path)
    }
};

function log(msg) {
    topPane.innerHTML += msg;
};

function pos(lat, long) {
    return new google.maps.LatLng(lat, long);
};

function centerMapOn(lat, long) {
    infoWindow.setPosition(new google.maps.LatLng(lat, long));
};

function clearMap() {
    directionsDisplay.setMap(null);
}

function initMap() {
    map = new google.maps.Map(mapOutput, mapInitOptions);
    directionsService = new google.maps.DirectionsService;
    directionsDisplay = new google.maps.DirectionsRenderer;
    directionsDisplay.setMap(map);
    infoWindow = new google.maps.InfoWindow;
    infoWindow.setPosition(map.getCenter());
    infoWindow.open(map);
};

function setMapPosition(lat, long) {
    infoWindow.setPosition(pos(lat, long));
};

function setMarkerAtPosition(lat, long, iconImgURL) {
    lastMarker++;
    var markerTitle = lastMarker.toString();
    var markerData = {
        position: pos(lat, long),
        map: map,
        title: markerTitle,
        routeTag: 'test',
        icon: iconImgURL
    };
    var marker = new google.maps.Marker(markerData);
    google.maps.event.addListener(marker, 'click', function () {
        // do something with this marker ...
        alert(this.routeTag);
    });
};

function showPosition(location) {
    var time = new Date(location.timestamp).toLocaleString();
    var lat = location.coords.latitude;
    var long = location.coords.longitude;
    var output = 'Time: ' + time + ', latitude: ' + lat + ', longitude: ' + long + '<br>';
    centerMapOn(lat, long);
    log(output);
};

function getLocationOnce() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, geolocationErrorHandler, geolocationOptions);
    } else {
        log('This browser does not support geolocation.');
    };
};

function watchLocationToggle() {
    if (locationWatcher === null) {
        if (navigator.geolocation) {
            locationWatcher = navigator.geolocation.watchPosition(showPosition, geolocationErrorHandler, geolocationOptions);
            btnToggleLocationWatch.textContent = 'Stop Location Watch';
        } else {
            log('This browser does not support geolocation.');
        };
    } else {
        navigator.geolocation.clearWatch(locationWatcher);
        locationWatcher = null;
        btnToggleLocationWatch.textContent = 'Start Location Watch';
    };
};

function geolocationErrorHandler(error) {
    console.log(error);
    log(error + '<br>');
};

function calculateRouteDistance(route) {
    var legs = route.legs;
    return legs.reduce(function (acc, cur) { return acc + cur.distance.value }, 0);
}

function displayRoute(route) {
    // route is an object. each key refers to another object with lat and lng properties.
    var waypoints = [];
    var tmp = null;
    for (var pt in route) {
        tmp = pt.toString();
        if (route.hasOwnProperty(tmp)) {
            waypoints.push({
                location: pos(route[tmp].lat, route[tmp].lng),
                stopover: true
            });
        };
    };
    var origin = waypoints[0].location;
    var destination = waypoints[waypoints.length - 1].location;
    waypoints.shift();
    waypoints.pop();
    directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: 'WALKING'
    }, function (response, status) {
        if (status === 'OK') {
            log('Distance = ' + calculateRouteDistance(response.routes[0]) / 1000 + ' km');
            directionsDisplay.setDirections(response);
        } else {
            console.log(status);
            console.log(response);
        }
    })
}

function JSONSend(obj, callback) {
    var params = JSON.stringify(obj);
    var xhr = new XMLHttpRequest();
    var url = '/';
    var data = null;

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            data = JSON.parse(xhr.response);
            callback(data);
        };
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
    var dist = Math.round(google.maps.geometry.spherical.computeDistanceBetween(currentLocation, refPoint)) / 1000;
    log(dist + ' km ');

    var obj = { time: time, lat: lat, lng: long };
    JSONSend(obj, function(data){displayRoute(date)});
    
    showPosition(location);
}

// Plain JS Swipe Detection (single swipe only)
function swipedetect(elem, callback){
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
    handleswipe = callback || function(swipedir){}
  
    touchsurface.addEventListener('touchstart', function(e){
        var touchobj = e.changedTouches[0]
        swipedir = 'none'
        dist = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime() // record time when finger first makes contact with surface
        // e.preventDefault()
    }, false)
  
    // touchsurface.addEventListener('touchmove', function(e){
    //     e.preventDefault() // prevent scrolling when inside DIV
    // }, false)
  
    touchsurface.addEventListener('touchend', function(e){
        var touchobj = e.changedTouches[0]
        distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
        distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
        elapsedTime = new Date().getTime() - startTime // get time elapsed
        if (elapsedTime <= allowedTime){ // first condition for swipe met
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
                swipedir = (distX < 0)? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
            }
            else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
                swipedir = (distY < 0)? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
            }
        }
        handleswipe(swipedir);
        // e.preventDefault()
    }, false)
}
  
//USAGE:

// var el = document.getElementById('swipezone');
// swipedetect(el, function(swipedir){
//     // swipedir contains either "none", "left", "right", "top", or "down"
//     el.innerHTML = 'Swiped <span style="color:yellow">' + swipedir +'</span>';
// });

window.onload = function () {
    // btnGetLocationOnce.addEventListener('click', getLocationOnce);
    // btnToggleLocationWatch.addEventListener('click', watchLocationToggle);
    // btnShowMap.addEventListener('click', initMap);
    // btnClearMap.addEventListener('click', clearMap);

    google.maps.event.addListener(map, 'click', function (e) {
        var latLng = e.latLng;
        setMarkerAtPosition(latLng.lat(), latLng.lng(), 'img/runnerIcon.png');
    });

    refPoint = new google.maps.LatLng(1.31162, 103.771597);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(sendLocation, geolocationErrorHandler, geolocationOptions);
        console.log('Getting location');
    } else {
        log('This browser does not support geolocation.');
    };

    swipedetect(displayPane, function(swipedir) {
        if (swipedir === 'up') {
            displayPane.style.top = '10%';
        } else if (swipedir === 'down') {
            displayPane.style.top = '95%';
        };
    });

    document.requestFullScreen();
};