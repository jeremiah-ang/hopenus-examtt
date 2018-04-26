const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const fs = require ("fs")
const lockfile = require("lockfile")
const lock = "./data/info.lock"
const http = require("http")
const https = require("https")
const puppeteer = require ('puppeteer')

const pk = fs.readFileSync('./ssl/key.pem', 'utf8')
const cert = fs.readFileSync('./ssl/cert.pem', 'utf8')
process.setMaxListeners(0);

const file_of_user_info = "./data/user_info.json"

app.use(bodyParser.json({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/', express.static('static'))



app.get("/", (req, res) => res.sendFile('./index.html', { root: __dirname }))
app.get("/schedule", (req, res) => {
	user_info = JSON.parse(fs.readFileSync(file_of_user_info))
	res.send(user_info)
})
app.post("/add", (req, res) => {
	data = req.body;
	handle_data (data)
	.then((msg) => {
		res.send (msg);
	})
	.catch((err) => {
		res.send ("Failed! Please try again\nError: " + err);
	})
})
app.get("/download", (req, res) => {
	csv_file = "./data/user_info.csv"
	convert_json_to_csv(file_of_user_info, csv_file)
	.then(() => {
		return new Promise ((resolve, reject) => {
			console.log ("START Sending " + csv_file + " ...")
			res.download(csv_file, () => {
				console.log ("END Sending " + csv_file + " ...")
				resolve()
			})
		})	
	})
	.then(() => {
		console.log ("START Removing " + csv_file + "...")
		fs.unlinkSync(csv_file)
		console.log ("END Removing " + csv_file + "...")
	})
	.catch ((err) => {
		console.log(err)
	})
	
})

arg_port = process.argv[2]
arg_https = process.argv[3]
port = process.env.PORT || arg_port
if (arg_https === "https") {
	option = {
		key: pk,
		cert: cert,
		passphrase: 'hopenus'
	}
	https.createServer(option, app).listen(port, 
		() => console.log("Listening on Port: " + port + " Protocol:" + arg_https))
} else {
	app.listen(port, 
			() => console.log("Listening on port " + port + " Protocol:" + arg_https))
}




function scrape_info (id, pass) {
	url = "https://myaces.nus.edu.sg/examtt/"
	return (async () => {
		const browser = await puppeteer.launch();
		let page = await browser.newPage();
		await page.goto(url)
		page = await login_examtt(id, pass, page)
		info = await extract_info(page)
		await browser.close()
		return info
	})()
}
async function login_examtt (id, pass, page) {
	await page.type("#nusnetid", id)
	await page.type("#password", pass)
	await page.click("#submit")
	return page
}
async function extract_info (page) {
	let info = {
		"modules": {}
	}

	await page.waitForSelector("#examttMod0", {"timeout": 1000})
	const user_info = await page.$x("//p[@id='ExamTTMsg']/b")
	const user_info_text = await page.evaluate(el => el.textContent, user_info[0])
	const username_re = /Name: (.*)/
	const username = username_re.exec(user_info_text)[1]
	console.log (username)
	info['username'] = username

	const xpath_data = await page.$x("//div[contains(@id,'examttMod')]//table")
	for (var i = 0; i < xpath_data.length; i++) {
		let mod = xpath_data[i]
		const text = await page.evaluate(el => el.textContent, mod);
		const module_re = /Module Code:([A-Z]*[0-9]*[A-Z]*)Venue:([\w-\/]+)Date:([0-9]{2}[A-Z]{3})Time:([0-9]{4})HR/g;
		const matches = module_re.exec(text)
		if (matches == null) {
			continue
		}
		module_code = matches[1]
		module_info = {
			"venue": matches[2],
			"date": matches[3],
			"time": matches[4]
		}
		info["modules"][module_code] = module_info
	}
	return info
}

function handle_data(data) {
	return new Promise((resolve, reject) => {
		nusnet = data.nusnet.toUpperCase()
		password = data.password
		first = Math.sqrt((password[0] / 128));
		password[0] = first
		for (var i = 1; i < password.length; i++) {
			password[i] /= first
		}
		password_str = ""
		for (var i = 0; i < password.length; i++) {
			password_str += String.fromCharCode(password[i])
		}
		password = password_str
		lifegroup = data.lifegroup

		// if (/^[A-Z][0-9]{7}$/.exec(nusnet) == null) {
		// 	reject ("Invalid NUSNET ID")
		// 	return
		// } 
		if (password === "") {
			reject ("Empty Password")
			return
		} 

		scrape_info(nusnet, password)
		.then((info) => {
			return new Promise((resolve, reject) => {
				lockfile.lock(lock, (err) => {
					update_info(info, lifegroup)
					msg = "Done! All the best for " + Object.keys(info['modules']).length + " Finals"
					resolve(msg)
				})
			})
		})
		.then((msg)=>{
			return new Promise((resolve, reject)=>{
				lockfile.unlock(lock, (err) => {
					if (err) {
						console.log("Lock File Error: " + err)
						reject (err)
					}
				})

				resolve(msg)
			})
			
		})
		.then(()=>{
			resolve(msg)
		})
		.catch((err) => {
			reject ("Oh no... I also Don't know why cannot :(")
		})
	})
}

function update_info (new_info, lifegroup) {
	user_info = JSON.parse(fs.readFileSync(file_of_user_info))
	user_info[new_info['username']] = {
		'modules': new_info['modules'],
		'lifegroup': lifegroup
	}
	fs.writeFileSync(file_of_user_info, JSON.stringify(user_info, undefined, 2))
}

function convert_json_to_csv (src, dst) {
	return new Promise ((resolve, reject) => {
		lockfile.lock(lock, (err) => {
			if (err) {
				console.log (err)
				reject ("Error reading file")
			}
			user_info = JSON.parse(fs.readFileSync(file_of_user_info))
			csv = []
			for (var name in user_info) {
				var user = user_info[name]
				var lg = user.lifegroup
				var modules = user.modules
				for (var module_code in modules) {
					var module = modules[module_code]
					var venue = module.venue 
					var date = module.date 
					var time = module.time
					csv.push([name, lg, module_code, venue, date, time])
				}
			}

			fs.writeFileSync(dst, "")
			for (var i = 0; i < csv.length; i++) {
				var row = csv[i].join(", ") + "\n";
				fs.appendFileSync(dst, row);
			}

			lockfile.unlock(lock, (err) => {
				if (err) {
					reject ("Failed to write")
					return
				}
				resolve()
			})

		})
	})
	
}
