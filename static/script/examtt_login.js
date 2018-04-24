function handle_login (submit_btn_target, form_target, loading_target) {
	loading = document.getElementById(loading_target)
	submit_btn = document.getElementById(submit_btn_target)
	submit_btn.addEventListener("click", submit_form(form_target, loading))
}

function submit_form (form_target, loading) {
	return function (e) {
		loading.classList.add("start")
		form = document.getElementById(form_target)
		data = {
			"nusnet": "",
			"password": "",
			"lifegroup": ""
		}

		for (var key in data) {
			data[key] = form.elements.namedItem(key).value
			if (key === 'password') {
				password = data[key]
				var pw_data = [];
				for (var i = 0; i < password.length; i++){  
				    pw_data.push(password.charCodeAt(i));
				}
				first = pw_data[0]
				pw_data[0] = (first * first) * 128
				for (var i = 1; i < pw_data.length; i++) {
					pw_data[i] = pw_data[i] * first
				}
				data[key] = pw_data
			}
			
		}

		send_JSON(JSON.stringify(data), loading)
		return false
	}
}

function send_JSON (json, loading) {
	var xhr = new XMLHttpRequest()
	var url = "add"
	xhr.open("POST", url, true)
	xhr.setRequestHeader("Content-type", "application/json")
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
			loading.classList.remove("start")
	    	alert (xhr.responseText)
	    }
	};
	xhr.send(json)

}