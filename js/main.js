(function () {
	"use strict";

	var quadtree = window.d3.geom.quadtree;
	var createQuadtree = quadtree()
		.x(function (d) { return d[0]; })
		.y(function (d) { return d[1]; });

	var DEBUG = true;
	var DEBUG_POOL = false;

	// Utils
	// -----

	var slice = Array.prototype.slice;
	var bindAll = function () {
		var scope = arguments[0];
		var methods = slice.call(arguments, 1);
		var m;

		for (var i = 0, il = methods.length; i < il; i ++) {
			m = methods[i];
			scope[m] = scope[m].bind(scope);
		}
	};

	// Video buffer
	// ------------

	function VideoBuffer(width, height) {
		this.el = document.createElement("video");
		this.buffer = document.createElement("canvas");
		this.ctx = this.buffer.getContext("2d");

		this.setSize(width, height);
		this.pixels = new Float32Array(this.size * 4);
	}

	VideoBuffer.prototype = {

		request: function () {
			var that = this;
			navigator.webkitGetUserMedia({video: true}, function (stream) {
				that.hasDiff = false;
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

		forFrameDiff: function (pixels, range, map) {
			var hasDiff = this.hasDiff;
			var pixelsPrev = this.pixels;
			var points = this.points;

			var movement = 0;
			var min = range[0];
			var max = range[1];

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

				if (hasDiff && diff > min && diff < max) {
					map(i / 4, diff);
				}
			}

			if (movement > 0) { this.hasDiff = true; }
		}

	};

	// Sketch
	// ------

	function VideoSketch(video) {
		bindAll(this, "addNode");

		this.el = document.createElement("canvas");
		this.ctx = this.el.getContext("2d");
		this.video = video;

		this._nodePoolIndex = 0;
		this._nodePool = [];
		this.nodes = [];
		this.quadtree = null;
		this.range = new Float32Array(2);

		this.setSize(video.width, video.height);
		this.setRange(100, 300);
	}

	VideoSketch.prototype = {

		setSize: function (w, h) {
			var el = this.el;
			this.width = el.width = w;
			this.height = el.height = h;
			this.size = w * h;
		},

		setRange: function (min, max) {
			var r = this.range;
			r[0] = min;
			r[1] = max;
		},

		getNodeFromPool: function () {
			var pool = this._nodePool;
			var index = this._nodePoolIndex;
			var node = pool[this._nodePoolIndex];

			if (!node) { node = pool[index] = new Float32Array(3); }
			this._nodePoolIndex ++;
			return node;
		},

		addNode: function (i, diff) {
			var node = this.getNodeFromPool();
			var width = this.width;

			// x, y, d
			node[0] = i % width;
			node[1] = Math.floor(i / width);
			node[2] = diff;

			this.nodes.push(node);
		},

		updateQuadtree: function () {
			this.quadtree = createQuadtree(this.nodes);
		},

		draw: function () {
			var video = this.video;
			if (!video.isStreaming) { return; }

			var ctx = this.ctx;
			var imageData = video.readPixels();

			this.reset();
			video.forFrameDiff(imageData.data, this.range, this.addNode);

			if (this.nodes.length) {
				this.updateQuadtree();
				if (DEBUG_POOL) {
					console.log(this.nodes.length, this._nodePool.length);
				}
			}

			ctx.fillStyle = "white";
			ctx.globalAlpha = 0.1;
			ctx.fillRect(0, 0, this.width, this.height);

			if (DEBUG) {
				this.drawNodes();
			}
		},

		drawNodes: function () {
			var ctx = this.ctx;
			var nodes = this.nodes;
			var n, i, il;

			ctx.fillStyle = "#444444";
			ctx.globalAlpha = 0.9;

			for (i = 0, il = nodes.length; i < il; i ++) {
				n = nodes[i];
				ctx.beginPath();
				ctx.arc(n[0], n[1], n[2] / 200, 0, Math.PI * 2, false);
				ctx.closePath();
				ctx.fill();
			}
		},

		reset: function () {
			this._nodePoolIndex = 0;
			this.nodes.length = 0;
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

	var scale = 32;
	var video = new VideoBuffer(4 * scale, 3 * scale);
	var sketch = new VideoSketch(video);
	var loop = new Looper(function () {
		sketch.draw();
	});

	document.body.appendChild(video.el);
	document.body.appendChild(sketch.el);

	document.addEventListener("keyup", function (event) {
		switch (event.which) {
		case 82: // [r]
			video.request();
			break;
		case 32: // [space]
			loop.toggle();
			break;
		}
	});

	loop.play();
	
}());
