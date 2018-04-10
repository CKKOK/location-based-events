function messageSubmit(e) {
    e.preventDefault();

    var title = document.querySelector('#messageTitle').value;
    
    var messagebody = document.querySelector('#messageBody').value;
    
    var obj = {
        title: title,
        origin: {lat: currentLat, lng: currentLng},
        messagebody: messagebody
    };

    function dataHandler(data) {
        if (data.success === true) {
            
        } else {

        };
    };

    JSONSend(obj, '/api/createmessage', 'POST', dataHandler);
}

document.querySelector('#messageSubmit').addEventListener('click', messageSubmit);