// Scene
// -----

var bindAll = require("./utils/function").bindAll;
var extend = require("./utils/object").extend;

var Looper = require("./utils/Looper");
var VideoBuffer = require("./sketch/VideoBuffer");
var VideoSketch = require("./sketch/VideoSketch");

var DEBUG = true;

(function setup() {
	var scale = 16;
	var body = document.body;
	var startButton = document.getElementById("start");

	var video = new VideoBuffer(4 * scale, 3 * scale);

	var sketch = new VideoSketch(video, {
		nodesMax: 300,
		nodesRemove: 10,
		clearStyle: {
			fillStyle: "#444444",
			globalAlpha: 0.1,
			globalCompositeOperation: "source-over"
		},
		connectionStyle: {
			fillStyle: "#fafafa",
			globalAlpha: 0.01,
			globalCompositeOperation: "lighter"
		}
	});

	var loop = new Looper(function (frame) {
		sketch.draw();
	});

	var onRequest = function (err) {
		if (!err) { body.className += "is-recording"; }
	};

	video.setSource("/video/selfie", ["ogv", "mp4"]);
	sketch.setSize(window.innerWidth, window.innerHeight);
	sketch.setRange(200, 400);

	body.appendChild(sketch.el);
	extend(sketch.el.style, {
		position: "absolute",
		top: "0",
		left: "0"
	});

	if (DEBUG) {
		body.appendChild(video.el);
		extend(video.el.style, {
			position: "absolute",
			top: "10px",
			left: "10px",
			webkitTransform: "scaleX(-1)"
		});

		document.addEventListener("keyup", function (event) {
			switch (event.which) {
			case 82: // [r]
				video.request(onRequest);
				break;
			case 32: // [space]
				video.toggle();
				loop.toggle();
				break;
			}
		});
	}

	startButton.addEventListener("click", function (event) {
		video.request(onRequest);
	});

	window.addEventListener("resize", function (event) {
		sketch.setSize(window.innerWidth, window.innerHeight);
	});

	video.play();
	loop.play();
}());
