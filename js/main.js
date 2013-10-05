/*jshint bitwise:false*/
(function () {
	"use strict";

	var DEBUG = true;

	// Video buffer
	// ------------

	function VideoBuffer(width, height) {
		this.el = document.createElement("video");
		this.buffer = document.createElement("canvas");
		this.ctx = this.buffer.getContext("2d");

		this.setSize(width, height);
		this.pixels = new Float32Array(this.size * 4);

		this.initBuffer();
	}

	VideoBuffer.prototype = {

		initBuffer: function () {
			var that = this;
			navigator.webkitGetUserMedia({video: true}, function (stream) {
				that.isStreaming = true;
				that.stream = stream;
				that.el.src = window.URL.createObjectURL(stream);
				that.play();
			}, function (error) {
				console.error(error);
			});
		},

		setSize: function (w, h) {
			var el = this.el;
			var buffer = this.buffer;

			this.width = el.width = buffer.width = w;
			this.height = el.height = buffer.height = h;
			this.size = w * h;
		},

		play: function () {
			this.isPlaying = true;
			this.el.play();
		},

		pause: function () {
			this.isPlaying = false;
			this.el.pause();
		},

		readPixels: function () {
			var ctx = this.ctx;
			var w = this.width;
			var h = this.height;

			ctx.drawImage(this.el, 0, 0, w, h);
			return ctx.getImageData(0, 0, w, h);
		},

		getFrameDiff: function () {
			var imageData = this.readPixels();
			var pixels = imageData.data;
			var pixelsPrev = this.pixels;

			var movement = 0;
			var i, il, diff;
			var cr, cb, cg;
			var pr, pb, pg;
			var dr, db, dg;

			for (i = 0, il = pixels.length; i < il; i += 4) {
				cr = pixels[i];
				cg = pixels[i + 1];
				cb = pixels[i + 2];

				pr = pixelsPrev[i];
				pg = pixelsPrev[i + 1];
				pb = pixelsPrev[i + 2];

				dr = Math.abs(cr - pr);
				dg = Math.abs(cg - pg);
				db = Math.abs(cb - pb);

				pixels[i] = dr;
				pixels[i + 1] = dg;
				pixels[i + 2] = db;

				pixelsPrev[i] = cr;
				pixelsPrev[i + 1] = cg;
				pixelsPrev[i + 2] = cb;

				movement += (diff = dr + dg + db);
			}

			return {
				movement: movement,
				imageData: imageData
			};
		}

	};

	// Renderer
	// --------

	function VideoRenderer(video) {
		this.el = document.createElement("canvas");
		this.ctx = this.el.getContext("2d");
		this.video = video;

		this.setSize(video.width, video.height);
	}

	VideoRenderer.prototype = {

		setSize: function (w, h) {
			var el = this.el;
			this.width = el.width = w;
			this.height = el.height = h;
			this.size = w * h;
		},

		render: function () {
			var video = this.video;
			if (!video.isStreaming) { return; }

			var diff = video.getFrameDiff();
			if (diff.movement > 0) {
				this.ctx.putImageData(diff.imageData, 0, 0);
			}
		}

	};

	// Loop
	// ----

	function Looper(frame) {
		var isLooping = false;

		function animate() {
			if (!isLooping) { return; }
			frame();
			window.requestAnimationFrame(animate);
		}

		this.pause = function () {
			isLooping = false;
		};

		this.play = function () {
			isLooping = true;
			animate();
		};

		this.toggle = function () {
			isLooping = !isLooping;
			if (isLooping) { animate(); }
		};
	}

	// Setup
	// -----

	var video = new VideoBuffer(64 * 2, 48 * 2);
	var renderer = new VideoRenderer(video);
	var loop = new Looper(function () {
		renderer.render();
	});

	document.body.appendChild(video.el);
	document.body.appendChild(renderer.el);

	document.addEventListener("keyup", function (event) {
		if (event.which === 32) {
			loop.toggle();
		}
	});

	loop.play();
	
}());
