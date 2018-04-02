var output = document.querySelector('#output');
var btnGetLocationOnce = document.querySelector('#getLocationOnce');
var btnToggleLocationWatch = document.querySelector('#toggleLocationWatch');
var btnShowMap = document.querySelector('#showMap');
var mapOutput = document.querySelector('#mapOutput');
var mapInitOptions = {
    center: {lat: 1.3036158, lng: 103.8274339},
    zoom: 16
};
var map = null, infoWindow = null;
var locationWatcher = null;

function pos(lat, long) {
    return {lat: lat, lng: long};
}

function showMap() {
    map = new google.maps.Map(mapOutput, mapInitOptions);
    infoWindow = new google.maps.InfoWindow;
    infoWindow.setPosition(map.getCenter());
    infoWindow.open(map);
};

function setMapPosition(lat, long) {
    infoWindow.setPosition(pos(lat, long));
};

function setMarkerAtPosition(lat, long) {
    var markerData = {
        position: pos(lat, long),
        map: map
    };
    new google.maps.Marker(markerData);
};

window.onload = function() {
    function log(msg) {
        output.innerHTML += msg;
    };

    function showPosition(location) {
        var output = 'Time: ' + location.timestamp + ', latitude: ' + location.coords.latitude + ', longitude: ' + location.coords.longitude + '<br>';
        log(output);
    }

    function getLocationOnce() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition);
        } else {
            log('This browser does not support geolocation.');
        }
    }

    function watchLocationToggle() {
        if (locationWatcher === null) {
            if (navigator.geolocation) {
                locationWatcher = navigator.geolocation.watchPosition(showPosition);
                btnToggleLocationWatch.textContent = 'Stop Location Watch';
            } else {
                log('This browser does not support geolocation.');
            }
        } else {
            navigator.geolocation.clearWatch(locationWatcher);
            locationWatcher = null;
            btnToggleLocationWatch.textContent = 'Start Location Watch';
        }
    }

    btnGetLocationOnce.addEventListener('click', getLocationOnce);
    btnToggleLocationWatch.addEventListener('click', watchLocationToggle);
    btnShowMap.addEventListener('click', showMap);

    google.maps.event.addListener(map, 'click', function(e){
        var latLng = e.latLng;
        setMarkerAtPosition(latLng.lat(), latLng.lng());
        console.log('Latitude: ' + latLng.lat() + ', Longitude: ' + latLng.lng());
    })
};