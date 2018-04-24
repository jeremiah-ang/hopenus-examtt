function generate_module_list (module_list, target, preview) {
	var dom = document.getElementById(target);
	var preview = document.getElementById(preview);
	var module_lists = {}

	for (var i = 0; i < module_list.length; i++) {
		var module = module_list[i]
		var module_dom = generate_module(module)
		module_lists[module] = module_dom
		dom.appendChild(module_dom)

		var preview_dom = generate_preview(module)
		preview.appendChild(preview_dom)

		module_dom.addEventListener("click", handleModuleClick(module_dom, preview_dom));
		preview_dom.addEventListener("click", handleModuleClick(module_dom, preview_dom));
	}

	return module_lists
}

function handleModuleClick(module, preview_module) {
	return function (e) {
		module.classList.toggle("selected");
		preview_module.classList.toggle("selected");
	}
}

function generate_module (module) {
	var div = document.createElement("div")
	div.className = "module"

	var p = document.createElement("p")
	p.innerHTML = module
	div.appendChild(p)

	return div
}

function generate_preview (module) {
	var dom = generate_module(module)
	dom.className = "preview"

	var x = document.createElement("div")
	x.className = "cancel"
	x.innerHTML = 'X'

	dom.appendChild(x)
	return dom
}

function enable_search (module_list, input_target) {
	var input = document.getElementById(input_target)
	var timeout = null
	input.addEventListener("keyup", function (e) {
		clearTimeout(timeout)
		timeout = setTimeout(function () {
			console.log(input.value)
			filter_module_list(module_list, input.value)
		}, 500)
	})
}

function filter_module_list (module_list, match) {
	var match = match.toUpperCase()
	for (var module_code in module_list) {
		var module = module_list[module_code]
		module.classList.add("filtered")
		if (module_code.includes(match)) {
			module.classList.remove("filtered")
		}
	}
}

function handle_submit (module_list, info_target, submit_target) {
	var submit_btn = document.getElementById(submit_target)
	submit_btn.addEventListener("click", submit(module_list, info_target))
	
}

function submit (module_list, info_target) {
	return function (e) {
		var info_form = document.getElementById(info_target)

		var info = get_info(info_form)
		var modules = get_selected_modules(module_list)
		info["modules"] = modules
		info_json = JSON.stringify(info)
		send_JSON(info_json)

		return false
	}
}

function get_info (info_div) {
	var info = {
		"name": "",
		"nusnet": "",
		"lifegroup": ""
	}

	for (var key in info) {
		info[key] = info_div.elements.namedItem(key).value
	}

	return info
}

function get_selected_modules (module_list) {
	var selected_modules = []
	for (var module_code in module_list) {
		if (module_list[module_code].classList.contains("selected"))
			selected_modules.push(module_code)
	}
	return selected_modules
}

function send_JSON (json) {
	var xhr = new XMLHttpRequest()
	var url = "add"
	xhr.open("POST", url, true)
	xhr.setRequestHeader("Content-type", "application/json")
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
	    	console.log (xhr.responseText)
	    }
	};
	xhr.send(json)

}
