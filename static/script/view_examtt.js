var schedule = {}
var months = {"MAY": 4, "APR": 3}


function handle_button (today, tomorrow, everyday, timetable_target, loading_target) {
	loading = document.getElementById(loading_target)
	document.getElementById(today).addEventListener("click", handleExamTTClick(0, timetable_target, loading))
	document.getElementById(tomorrow).addEventListener("click", handleExamTTClick(1, timetable_target, loading))
	document.getElementById(everyday).addEventListener("click", handleExamTTClick(2, timetable_target, loading))
}

function handleExamTTClick (level, timetable_target) {
	today = new Date()
	tomorrow = new Date()
	tomorrow.setDate(today.getDate()+1)

	return function (e) {
		loading.classList.add("start")
		load_schedule().then((schedule) => {
			var timetable = document.getElementById(timetable_target)
			timetable.innerHTML = ""
			var schedule_dom = load_timetable (schedule, timetable, level)

			var noExam = document.createElement("h1")
			noExam.id = "no-exam"
			noExam.innerHTML = "<center>No Exam! :)</center>"
			added = false

			ordered_dates = []
			for (var date in schedule_dom) {
				console.log(schedule_dom[date]['datetime'])
				ordered_dates.push([schedule_dom[date]['datetime'], date])
			}
			ordered_dates.sort((a,b)=>a[0].getTime()-b[0].getTime())

			for (var idx in ordered_dates) {
				date = ordered_dates[idx][1]
				if (level == 0 && !sameday(schedule_dom[date]['datetime'], today)){
					continue
				} else if (level == 1 && !sameday(schedule_dom[date]['datetime'], tomorrow)){
					continue
				} else if (schedule_dom[date]['datetime'].getTime() < today.getTime()) {
					continue
				}
				added = true
				timetable.appendChild(schedule_dom[date]['dom'])
			}
			if (!added) {
				timetable.appendChild(noExam)
			}
			loading.classList.remove("start")
		})
	}
}

function sameday (d1, d2) {
	return d1.getFullYear() === d2.getFullYear() &&
	    d1.getMonth() === d2.getMonth() &&
	    d1.getDate() === d2.getDate();
}


function load_timetable (schedule, timetable, level) {
	var schedule_dom = create_schedule_dom(schedule)
	return schedule_dom
}

function create_schedule_dom (schedule) {
	var days = {}
	for (var module_code in schedule) {
		var module_info = schedule[module_code]
		var date = module_info['date']
		if (!days.hasOwnProperty(date)) {
			var dategroup = document.createElement("div")
			dategroup.className = "date-group"
			var datedom = document.createElement("p")
			datedom.className = 'date'
			datedom.innerHTML = date
			dategroup.appendChild(datedom)
			days[date] = {"datetime": module_info['datetime'], "dom": dategroup, "modules": {}}
		}

		modulestudentgroup = document.createElement("div")
		modulestudentgroup.className = 'module-student-group'
		modulegroup = null
		var modulegroup = document.createElement("div")
		modulegroup.className = "module-group"
		var module = document.createElement("p")
		module.className = 'module'
		module.innerHTML = module_code
		modulegroup.appendChild(module)

		var time = document.createElement("p")
		time.className = "time"
		time.innerHTML = module_info["time"]
		modulegroup.appendChild(time) 

		var venue = document.createElement("p")
		venue.className = "venue"
		venue.innerHTML = module_info["venue"]
		modulegroup.appendChild(venue) 

		modulestudentgroup.appendChild(modulegroup)
		days[date]["dom"].appendChild(modulestudentgroup)
		days[date]["modules"]['dom'] = modulestudentgroup

		var people_ul = document.createElement("ul")
		people = module_info["people"]
		for (var i = 0; i < people.length; i++) {
			var people_li = document.createElement("li")
			p = people[i]
			var name_dom = document.createElement("p")
			name_dom.className = "people name"
			name_dom.innerHTML = p['name'].toLowerCase()
			people_li.appendChild(name_dom)

			var lg_dom = document.createElement("p")
			lg_dom.className = "people lg"
			lg_dom.innerHTML = p['lg']
			people_li.appendChild(lg_dom)

			people_ul.appendChild(people_li)
		}

		days[date]['modules']['people'] = people_ul
		modulestudentgroup.appendChild(people_ul)
	}

	return days
}

function load_schedule () {
	if (Object.keys(schedule).length === 0 && schedule.constructor === Object) {
		return fetch_schedule()
			.then(process_schedule)
	} else {
		return Promise.resolve(schedule)
	}
}

function process_schedule (schedule_json) {
	for (var user in schedule_json) {
		lifegroup = schedule_json[user].lifegroup
		user_schedule = schedule_json[user].modules
		for (var module_code in user_schedule) {
			module_info = user_schedule[module_code]
			if (!schedule.hasOwnProperty(module_code)) {
				datetime = process_date_time (module_info.date)
				schedule[module_code] = {
					"datetime": datetime,
					"date": module_info.date,
					"venue": module_info.venue,
					"time": module_info.time,
					"people": []
				}
			}
			schedule[module_code].people.push({
				"name": user,
				"lg": lifegroup
			})
		}
	}

	return Promise.resolve(schedule)
}

function process_date_time (date) {
	year = (new Date()).getFullYear()
	month = months[date.substring(2,5)]
	day = date.substring(0,2)
	date = new Date(year, month, day)
	return date
}

function fetch_schedule () {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest()
		var url = "schedule"
		xhr.open("GET", url, true)
		xhr.setRequestHeader("Content-type", "application/json")
		xhr.onreadystatechange = function () {
		    if (xhr.readyState === 4 && xhr.status === 200) {
		    	resolve(JSON.parse(xhr.responseText))
		    }
		};
		xhr.send()
	})
}