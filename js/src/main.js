// Scene
// -----

var bindAll = require("./utils/function").bindAll;
var extend = require("./utils/object").extend;

var Looper = require("./utils/Looper");
var VideoBuffer = require("./sketch/VideoBuffer");
var VideoSketch = require("./sketch/VideoSketch");

var DEBUG = true;
var VIDEO_SCALE = 16;

// Sketch setup

var video = new VideoBuffer(4 * VIDEO_SCALE, 3 * VIDEO_SCALE);
var sketch = new VideoSketch(video, {
	nodesMax: 80,
	nodesRemove: 10
});

var loop = new Looper(function (frame) {
	sketch.draw();
});

// video.setSource("/video/selfie", ["ogv", "mp4"]);
sketch.setSize(window.innerWidth, window.innerHeight);
sketch.setRange(200, 400);

// Elements / events

var body = document.body;
var startButton = document.getElementById("start");

body.appendChild(sketch.el);
extend(sketch.el.style, {
	position: "absolute",
	top: "0",
	left: "0"
});

var onRequest = function (err) {
	if (!err) { body.className += "is-recording"; }
};

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

// Start

video.play();
loop.play();
