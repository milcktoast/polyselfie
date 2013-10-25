(function () {
	"use strict";

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

	var extend = function (o, attrs) {
		for (var prop in attrs) {
			if (attrs.hasOwnProperty(prop)) {
				o[prop] = attrs[prop];
			}
		}
	};

	var createArray = (function () {
		var root = this;
		var types = {
			i8: "Int8Array",
			f32: "Float32Array"
		};

		return function (type, size) {
			var ArrayCtor = (root[types[type] || type] || Array);
			return new ArrayCtor(size);
		};
	}).call(this);

	// Maths
	// -----

	var distanceSq = function (x0, y0, x1, y1) {
		var x = x1 - x0;
		var y = y1 - y0;
		return x * x + y * y;
	};

	var quadtree = window.d3.geom.quadtree;
	var createQuadtree = quadtree()
		.x(function (d) { return d[0]; })
		.y(function (d) { return d[1]; });

	// Video buffer
	// ------------

	function VideoBuffer(width, height) {
		this.el = document.createElement("video");
		this.buffer = document.createElement("canvas");
		this.ctx = this.buffer.getContext("2d");

		this.setSize(width, height);
		this.pixels = createArray("f32", this.size * 4);
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
		this.range = createArray("f32", 2);
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

			if (!node) { node = pool[index] = createArray("f32", 3); }
			this._nodePoolIndex ++;
			return node;
		},

		addNode: function (i, diff) {
			var node = this.getNodeFromPool();
			var width = this.video.width;
			var height = this.video.height;

			// x, y, d
			// x, y mapped from [0, 1] and mirrored
			node[0] = Math.abs((i % width) / width - 1);
			node[1] = Math.floor(i / width) / height;
			node[2] = diff;

			this.nodes.push(node);
		},

		updateQuadtree: function () {
			this.quadtree = createQuadtree(this.nodes);
		},

		draw: function () {
			var video = this.video;
			if (!video.isStreaming) { return; }

			var nodes = this.nodes;
			var imageData = video.readPixels();

			this.reset();
			video.forFrameDiff(imageData.data, this.range, this.addNode);

			if (nodes.length) {
				this.updateQuadtree();
				if (DEBUG_POOL) {
					console.log(nodes.length, this._nodePool.length);
				}
			}

			var ctx = this.ctx;
			var i, il;

			// Clear
			ctx.fillStyle = "white";
			ctx.globalAlpha = 0.1;
			ctx.fillRect(0, 0, this.width, this.height);

			// Draw connections
			ctx.fillStyle = "#222222";
			ctx.globalAlpha = 0.25;

			for (i = 0, il = nodes.length; i < il; i ++) {
				this.drawConnections(ctx, nodes[i]);
			}

			// Draw nodes
			ctx.fillStyle = "#fafafafa";
			ctx.globalAlpha = 0.15;

			for (i = 0, il = nodes.length; i < il; i ++) {
				this.drawNode(ctx, nodes[i]);
			}
		},

		drawNode: function (ctx, node) {
			var x = node[0] * this.width;
			var y = node[1] * this.height;
			var radius = node[2] / 100;

			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2, false);
			ctx.fill();

			ctx.beginPath();
			ctx.arc(x, y, radius * 4, 0, Math.PI * 2, false);
			ctx.stroke();
		},

		drawConnections: function (ctx, node) {
			var w = this.width;
			var h = this.height;
			var x0 = node[0] * w;
			var y0 = node[1] * h;
			var radius = node[2] / 10000;

			var nodes = this.search(this.quadtree, node[0], node[1], radius);
			var i, il, n, x1, y1;

			ctx.beginPath();

			for (i = 0, il = nodes.length; i < il; i ++) {
				n = nodes[i];
				x1 = n[0] * w;
				y1 = n[1] * h;

				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
			}

			ctx.stroke();
		},

		search: function (quadtree, x, y, radius) {
			var x0 = x - radius;
			var y0 = y - radius;
			var x3 = x + radius;
			var y3 = y + radius;
			var radiusSq = radius * radius;
			var matches = [];

			quadtree.visit(function(node, x1, y1, x2, y2) {
				var p = node.point;
				if (p && distanceSq(x, y, p[0], p[1]) <= radiusSq) {
					matches.push(p);
				}

				return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
			});

			return matches;
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

	(function setup() {
		var scale = 32;
		var body = document.body;
		var video = new VideoBuffer(4 * scale, 3 * scale);
		var sketch = new VideoSketch(video);
		var loop = new Looper(function () {
			sketch.draw();
		});

		sketch.setSize(window.innerWidth, window.innerHeight);
		sketch.setRange(200, 400);

		extend(sketch.el.style, {
			position: "absolute",
			top: "0",
			left: "0"
		});

		extend(video.el.style, {
			position: "absolute",
			top: "10px",
			left: "10px",
			webkitTransform: "scaleX(-1)"
		});

		body.appendChild(sketch.el);
		body.appendChild(video.el);

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
	
}).call(this);
