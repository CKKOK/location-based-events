var btnAbout = document.querySelector('#btn-about');
var btnLogin = document.querySelector('#btn-login');
var btnLogout = document.querySelector('#btn-logout');
var btnRegister = document.querySelector('#btn-register');
var btnCreate = document.querySelector('#btn-create');

var topPane = document.querySelector("#topPane");
var mapOutput = document.querySelector("#mapOutput");
var displayPane = document.querySelector(".displaypane");
var displayPaneTitle = document.querySelector('.displaypane-title');
var displayPaneContent = document.querySelector('.displaypane-content');
var displayPaneInfo = document.querySelector('#info');
var formLogin = document.querySelector('#formLogin');
var formRegister = document.querySelector('#formRegister');
var locationWatcher = null;
var mapInitOptions = {
  center: { lat: 1.3036158, lng: 103.8274339 },
  zoom: 17,
  gestureHandling: "auto"
};
var map = null,
  infoWindow = null;
var geolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 600000
};
var directionsService, directionsDisplay;
var lastMarker = 0;
var refPoint = null;
var markers = [];

// Credit to stackoverflow and MDN for shortcutting this painful implementation of client-side cookie-parsing. To be swapped out for the js.cookies library before deployment.
var Cookie = {
  get: function(name) {
    let c = document.cookie.match(
      `(?:(?:^|.*; *)${name} *= *([^;]*).*$)|^.*$`
    )[1];
    if (c) return decodeURIComponent(c);
  },

  set: function(name, value, opts = {}) {
    if (opts.days) opts["max-age"] = opts.days * 60 * 60 * 24;
    opts = Object.entries(opts).reduce(
      (str, [k, v]) => str + `; ${k}=${v}`,
      ""
    );
    document.cookie = `${name}=${encodeURIComponent(value)}` + opts;
  },

  delete: function(name, path) {
    Cookie.set(name, "", -1, path);
  }
};

function log(msg) {
  topPane.innerHTML += msg;
}

function pos(lat, long) {
  return new google.maps.LatLng(lat, long);
}

function centerMapOn(lat, long) {
  // infoWindow.setPosition(new google.maps.LatLng(lat, long));
  map.setCenter({lat: lat, lng: long});
}

function clearMap() {
  directionsDisplay.setMap(null);
}

function initMap() {
  map = new google.maps.Map(mapOutput, mapInitOptions);
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsDisplay.setMap(map);
  infoWindow = new google.maps.InfoWindow({
    content: '<h1>You!</h1>'
  });
  infoWindow.setPosition(map.getCenter());
  infoWindow.open(map);
}

function setMapPosition(lat, long) {
  // infoWindow.setPosition(pos(lat, long));
  map.setCenter({lat: lat, lng: long});
}


function setMarkerAtPosition(lat, lng, iconImgURL, routeDetails) {
  lastMarker++;
  var markerTitle = lastMarker.toString();
  var info = routeDetails || '';
  var markerData = {
    position: {lat: lat, lng: lng},
    map: map,
    title: markerTitle,
    routeTag: "test",
    icon: iconImgURL,
    routeDetails: info
  };
  var marker = new google.maps.Marker(markerData);
  google.maps.event.addListener(marker, "click", function() {
    // do something with this marker ...
    if (routeDetails !== '') {
      displayRoute(routeDetails);
    };
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
      showPosition,
      geolocationErrorHandler,
      geolocationOptions
    );
  } else {
    log("This browser does not support geolocation.");
  }
}

function watchLocationToggle() {
  if (locationWatcher === null) {
    if (navigator.geolocation) {
      locationWatcher = navigator.geolocation.watchPosition(
        showPosition,
        geolocationErrorHandler,
        geolocationOptions
      );
      // btnToggleLocationWatch.textContent = "Stop Location Watch";
    } else {
      log("This browser does not support geolocation.");
    }
  } else {
    navigator.geolocation.clearWatch(locationWatcher);
    locationWatcher = null;
    // btnToggleLocationWatch.textContent = "Start Location Watch";
  }
}

function geolocationErrorHandler(error) {
  console.log(error);
}

function calculateRouteDistance(route) {
  var legs = route.legs;
  return legs.reduce(function(acc, cur) {
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
        location: {lat: route[tmp].lat, lng: route[tmp].lng},
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
      travelMode: "WALKING"
    },
    function(response, status) {
      if (status === "OK") {
        console.log(
          "Distance = " +
            calculateRouteDistance(response.routes[0]) / 1000 +
            " km"
        );
        directionsDisplay.setDirections(response);
      } else {
        console.log(status);
        console.log(response);
      }
    }
  );
}

function showInfo(title, text, flyout = false) {
  displayPaneTitle.textContent = (typeof(title) === 'string') ? title : 'About';
  displayPaneInfo.textContent = text || 'Lorem stuffs';
  formLogin.style.display = 'none';
  formRegister.style.display = 'none';
  displayPaneInfo.style.display = 'block';
  if (flyout === true) {
    showDisplayPane();
  };
};

function showLoginForm() {
  displayPaneTitle.textContent = 'Login';
  formLogin.style.display = 'block';
  formRegister.style.display = 'none';
  displayPaneInfo.style.display = 'none';
  showDisplayPane();
};

function showRegistrationForm() {
  displayPaneTitle.textContent = 'Register';
  formLogin.style.display = 'none';
  formRegister.style.display = 'block';
  displayPaneInfo.style.display = 'none';
  showDisplayPane();
};

function JSONSend(obj, url, method, callback) {
  var params = JSON.stringify(obj);
  var xhr = new XMLHttpRequest();
  var data = null;

  xhr.open(method, url);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      data = JSON.parse(xhr.response);
      callback(data);
    }
  };
  xhr.send(params);
}

function sendLocation(location) {
  var route = null;

  console.log("Sending location");
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
  console.log(dist + " km ");

  var obj = { time: time, lat: lat, lng: long };
  JSONSend(obj, '/', function(data) {
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
    handleswipe = callback || function(swipedir) {};

  touchsurface.addEventListener(
    "touchstart",
    function(e) {
      var touchobj = e.changedTouches[0];
      swipedir = "none";
      dist = 0;
      startX = touchobj.pageX;
      startY = touchobj.pageY;
      startTime = new Date().getTime(); // record time when finger first makes contact with surface
    },
    false
  );


  touchsurface.addEventListener(
    "touchend",
    function(e) {
      var touchobj = e.changedTouches[0];
      distX = touchobj.pageX - startX;
      distY = touchobj.pageY - startY;
      elapsedTime = new Date().getTime() - startTime;
      if (elapsedTime <= allowedTime) {
        if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
          // 2nd condition for horizontal swipe met
          swipedir = distX < 0 ? "left" : "right"; // if dist traveled is negative, it indicates left swipe
        } else if (
          Math.abs(distY) >= threshold &&
          Math.abs(distX) <= restraint
        ) {
          // 2nd condition for vertical swipe met
          swipedir = distY < 0 ? "up" : "down"; // if dist traveled is negative, it indicates up swipe
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
  displayPaneTitle.style.visibility = 'visible';
  displayPaneContent.style.visibility = 'visible';
  if (window.innerWidth < 768) {
    displayPane.style.top = '10%';
  } else {
    displayPane.style.width = '250px';
  };
};

function hideDisplayPane() {
  displayPaneTitle.style.visibility = 'hidden';
  displayPaneContent.style.visibility = 'hidden';
  if (window.innerWidth < 768) {
    displayPane.style.top = '95%';
  } else {
    displayPane.style.width = '10px';
  };
};

function toggleDisplayPane(){
  if (window.innerWidth < 768) {
    if (!displayPane.style.top || displayPane.style.top === '95%') {
      displayPane.style.top = '10%';
    } else {
      displayPane.style.top = '95%';
    };
  };

  if (window.innerWidth >= 768) {
    if (!displayPane.style.width || displayPane.style.width === '10px') {
      displayPaneTitle.style.visibility = 'visible';
      displayPaneContent.style.visibility = 'visible';
      displayPane.style.width = '250px';
    } else {
      displayPaneTitle.style.visibility = 'hidden';
      displayPaneContent.style.visibility = 'hidden';
      displayPane.style.width = '10px';
    }
  };
};

function submitLoginForm(e) {
  // submit the form, in the callback, if it's a success, set the session info (cookies for now), hide the login and register buttons and show the logout button
  e.preventDefault();
  var loginInfo = {
    name: document.querySelector('#loginname').value,
    password: document.querySelector('#loginpass').value
  };
  JSONSend(loginInfo, '/user/login', 'POST', function(data) {
    if (data.success === true) {
      btnLogin.style.display = 'none';
      btnRegister.style.display = 'none';
      btnLogout.style.display = 'inline-block';
    } else {
      console.log('nope');
    }
  })
}

function submitRegistrationForm(e) {
  // submit the form, in the callback, if it's a success, set the session info (cookies for now), hide the login and register buttons and show the logout button
  e.preventDefault();
  var regInfo = {
    name: document.querySelector('#regname').value,
    email: document.querySelector('#regemail').value,
    password: document.querySelector('#regpass').value,
    confirmedpassword: document.querySelector('#regconfirmpass').value
  };
  JSONSend(regInfo, '/user/register', 'POST', function(data) {
    console.log(data)
  })
}

window.onload = function() {
  displayPane.addEventListener('click', function(e){
    if (e.target.tagName !== 'INPUT') {
      toggleDisplayPane();
    };
  });

  google.maps.event.addListener(map, "click", function(e) {
    var latLng = e.latLng;
    var lat = latLng.lat();
    var lng = latLng.lng();
    setMarkerAtPosition(lat, lng, "img/runnerIcon.png");
  });

  refPoint = new google.maps.LatLng(1.31162, 103.771597);

  swipedetect(displayPane, function(swipedir) {
    if (swipedir === "up") {
      displayPane.style.top = "10%";
    } else if (swipedir === "down") {
      displayPane.style.top = "95%";
    }
  });

  showInfo('Run2', 'Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum, aspernatur?', false);
  btnAbout.addEventListener('click', showInfo);
  btnLogin.addEventListener('click', showLoginForm);
  btnRegister.addEventListener('click', showRegistrationForm);

  document.querySelector('#loginbutton').addEventListener('click', submitLoginForm);
  document.querySelector('#registerbutton').addEventListener('click', submitRegistrationForm);
};