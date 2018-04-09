function ProfileEdit(e) {
    e.preventDefault();
    getFragment('Update Profile', '/updateForm', function(data){
		document.querySelector('#profname').value = data.values.name;
		document.querySelector('#profemail').value = data.values.email;
		document.querySelector('#profpic').value = data.values.profilepic;
		UIDisplayPaneComponents.form.show();
        showDisplayPane();
    });
}

document.querySelector('#profileedit').addEventListener('click', ProfileEdit);

var pic = document.querySelector('#profilepic');
pic.style.width = '120px';
pic.style.clipPath = 'circle(60px at center)';
