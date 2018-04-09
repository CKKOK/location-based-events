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
            UIElements['mobile']['profile'].show();
            UIElements['desktop']['profile'].show();
			UIElements['mobile']['logout'].show();
			UIElements['desktop']['logout'].show();
			// Show welcome info. Should also show the upcoming events / messages toggle.
            showInfo('Welcome', 'Hello there ' + data.name, true);
            if (data.script) {
                var scriptElement = document.createElement('script');
                scriptElement.innerHTML = data.script;
                document.querySelector('body').appendChild(scriptElement);
            }
			UIDisplayPaneComponents['about'].show();
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

document.querySelector('#loginbutton').addEventListener('click', onLogin);