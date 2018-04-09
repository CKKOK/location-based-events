document.querySelector('header').style.backgroundColor = 'black';
document.querySelector('header').style.color = 'white';

UIElements['mobile']['createMode'].show();
UIElements['desktop']['createMode'].show();

google.maps.event.addListener(map, 'click', function (e) {
    var latLng = e.latLng;
    var lat = latLng.lat();
    var lng = latLng.lng();
    console.log(lat + ', ' + lng);
    createEventMarkerAtPosition(lat, lng, creationMode, 'title', iconRun, 'owner', 'details');
});