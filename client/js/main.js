var output = document.querySelector('#output');
var btnGetLocationOnce = document.querySelector('#getLocationOnce');
var btnToggleLocationWatch = document.querySelector('#toggleLocationWatch');
var btnShowMap = document.querySelector('#showMap');
var btnClearMap = document.querySelector('#clearMap');
var mapOutput = document.querySelector('#mapOutput');
var mapInitOptions = {
    center: { lat: 1.3036158, lng: 103.8274339 },
    zoom: 17
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

function log(msg) {
    output.innerHTML += msg;
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

function setMarkerAtPosition(lat, long) {
    lastMarker++;
    var markerTitle = lastMarker.toString();
    var markerData = {
        position: pos(lat, long),
        map: map,
        title: markerTitle,
        routeTag: 'test',
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

function sendLocation(location) {
    var route = null;

    console.log('Sending location');
    var time = new Date(location.timestamp).toLocaleString();
    var lat = location.coords.latitude;
    var long = location.coords.longitude;
    var currentLocation = pos(lat, long);

    log(google.maps.geometry.spherical.computeDistanceBetween(currentLocation, refPoint) + ' m');

    var http = new XMLHttpRequest();
    var url = "/";
    var obj = {time: time, lat: lat, lng: long};
    var obj = { time: 1, lat: 1, long: 1 };
    var params = JSON.stringify(obj);
    http.open("POST", url);

    http.setRequestHeader("Content-type", "application/json");

    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            route = JSON.parse(http.response);
            displayRoute(route);
        };
    };
    http.send(params);
    showPosition(location);
}

window.onload = function () {
    btnGetLocationOnce.addEventListener('click', getLocationOnce);
    btnToggleLocationWatch.addEventListener('click', watchLocationToggle);
    btnShowMap.addEventListener('click', initMap);
    btnClearMap.addEventListener('click', clearMap);

    google.maps.event.addListener(map, 'click', function (e) {
        var latLng = e.latLng;
        setMarkerAtPosition(latLng.lat(), latLng.lng());
        // console.log('Latitude: ' + latLng.lat() + ', Longitude: ' + latLng.lng());
    });

    refPoint = new google.maps.LatLng(1.31162, 103.771597);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(sendLocation, geolocationErrorHandler, geolocationOptions);
        console.log('Getting location');
    } else {
        log('This browser does not support geolocation.');
    };
};