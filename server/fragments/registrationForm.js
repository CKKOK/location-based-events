function nameValidate(e) {
    var obj = {
        name: e.target.value
    };
    function dataHandler(response) {
        if (response === true) {
            document.querySelector('#regnameerror').textContent = 'Name already in use'
        } else {
            document.querySelector('#regnameerror').textContent = ''
        };
    };
    JSONSend(obj, '/api/namevalidate', 'POST', dataHandler);
}

function emailValidate(e) {
    var obj = {
        email: e.target.value
    };
    function dataHandler(response) {
        if (response === true) {
            document.querySelector('#regemailerror').textContent = 'Email already in use'
        } else {
            document.querySelector('#regemailerror').textContent = ''
        };
    };
    JSONSend(obj, '/api/emailvalidate', 'POST', dataHandler);
}

function onRegister(e) {
    e.preventDefault();
    var password = document.querySelector('#regpass').value;
    var confirmedpassword = document.querySelector('#regconfirmpass').value;

    if (document.querySelector('#regnameerror').textContent !== '' || document.querySelector('#regemailerror').textContent !== '') {
        return;
    };

    if (password !== confirmedpassword) {
        document.querySelector('#regpasserror').textContent = 'Passwords do not match!';
        return;
    };

    var regInfo = {
        name: document.querySelector('#regname').value,
        email: document.querySelector('#regemail').value,
        password: password,
        confirmedpassword: confirmedpassword
    };

    function dataHandler(data) {
        console.log(data);
        if (data.success === true) {
            UIElements['mobile']['login'].hide();
            UIElements['mobile']['register'].hide();
            UIElements['desktop']['login'].hide();
            UIElements['desktop']['register'].hide();
            UIElements['mobile']['logout'].show();
            UIElements['desktop']['logout'].show();
            showInfo('Welcome', 'loremstuffagain', true);
            UIDisplayPaneComponents['about'].show();
        }
    }

    JSONSend(regInfo, '/user/register', 'POST', dataHandler);
}

document.querySelector('#registerbutton').addEventListener('click', onRegister);
document.querySelector('#regname').addEventListener('input', nameValidate);
document.querySelector('#regemail').addEventListener('input', emailValidate);
