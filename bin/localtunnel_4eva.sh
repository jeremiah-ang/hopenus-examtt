#!/bin/bash

function localtunnel {
	lt --port 3000 --subdomain hope-nusexamtt
}

until localtunnel; do
	echo "localtunnel server crashed"
	sleep 2
done
