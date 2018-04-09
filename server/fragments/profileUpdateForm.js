function nameValidate(e) {
    var obj = {
        name: e.target.value
    };
    function dataHandler(response) {
        if (response === true) {
            document.querySelector('#profnameerror').textContent = 'Name already in use'
        } else {
            document.querySelector('#profnameerror').textContent = ''
        };
    };
    JSONSend(obj, '/api/namevalidate2', 'POST', dataHandler);
}

function emailValidate(e) {
    var obj = {
        email: e.target.value
    };
    function dataHandler(response) {
        if (response === true) {
            document.querySelector('#profemailerror').textContent = 'Email already in use'
        } else {
            document.querySelector('#profemailerror').textContent = ''
        };
    };
    JSONSend(obj, '/api/emailvalidate2', 'POST', dataHandler);
}

function onUpdate(e) {
    e.preventDefault();
    var password = document.querySelector('#profpass').value;
    var confirmedpassword = document.querySelector('#profconfirmpass').value;

    if (document.querySelector('#profnameerror').textContent !== '' || document.querySelector('#profemailerror').textContent !== '') {
        return;
    };

    if (password !== confirmedpassword) {
        document.querySelector('#profpasserror').textContent = 'Passwords do not match!';
        return;
    };

    var regInfo = {
        name: document.querySelector('#profname').value,
        email: document.querySelector('#profemail').value,
        profilepic: document.querySelector('#profpic').value,
        oldpassword: document.querySelector('#profoldpass').value,
        password: password,
        confirmedpassword: confirmedpassword
    };

    function dataHandler(data) {
        if (data.success === true) {
            UIBtnProfileHandler();
        } else {
            document.querySelector('#profoldpasserror').innerHTML = data.error;
        };
    };

    JSONSend(regInfo, '/user/update?_method=put', 'POST', dataHandler);
}

document.querySelector('#updatebutton').addEventListener('click', onUpdate);
document.querySelector('#profname').addEventListener('input', nameValidate);
document.querySelector('#profemail').addEventListener('input', emailValidate);
