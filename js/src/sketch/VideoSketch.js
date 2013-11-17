
// Sketch
// ------

var fs = require("fs");
var bindAll = require("../utils/function").bindAll;
var object = require("../utils/object");
var array = require("../utils/array");

var vec2 = require("../math/vec2");
var quadtree = require("d3Quadtree");
var createQuadtree = quadtree()
	.x(function (d) { return d[0]; })
	.y(function (d) { return d[1]; });

var Glow = require("GlowCore");
var Plane = require("GlowPlaneGeometry");
var Float = require("GlowFloat");

var DEBUG_POOL = false;

module.exports = VideoSketch;

function VideoSketch(video, opts) {
	bindAll(this, "addNode");
	object.extend(this, opts);

	this._nodePoolIndex = 0;
	this._nodePool = [];
	this.nodes = [];

	this.quadtree = null;
	this.range = array.create("f32", 2);

	this.context = new Glow.Context({
		// preserveDrawingBuffer: true,
		clear: {
			red: 0.1,
			green: 0.1,
			blue: 0.1,
			alpha: 1.0
		}
	});

	this.gl = this.context.GL;
	this.el = this.context.domElement;
	this.video = video;

	this.context.enableBlend(true, {
		equation: this.gl.FUNC_ADD,
		src: this.gl.SRC_ALPHA,
		dst: this.gl.ONE
	});

	this.initShader(5000);
	this.initPostShader();
}

VideoSketch.prototype = {

	polyShaderConfig: {
		vertexShader: fs.readFileSync(__dirname + "/../shaders/poly.vert"),
		fragmentShader: fs.readFileSync(__dirname + "/../shaders/poly.frag")
	},

	postFxShaderConfig: {
		vertexShader: fs.readFileSync(__dirname + "/../shaders/postFx.vert"),
		fragmentShader: fs.readFileSync(__dirname + "/../shaders/postFx.frag")
	},

	initShader: function (polys) {
		var shaderConfig = object.extend({
			data: {
				screenWidth: new Float(1.0),
				screenHeight: new Float(1.0),

				opacity: array.create("f32", polys * 3),
				vertices: array.create("f32", polys * 3 * 2)
			},

			indices: array.range("ui8", polys * 3),
			primitives: this.gl.TRIANGLES,

			interleave: {
				opacity: false,
				vertices: false
			},

			usage: {
				opacity: this.gl.DYNAMIC_DRAW,
				vertices: this.gl.DYNAMIC_DRAW,
				primitives: this.gl.DYNAMIC_DRAW
			}
		}, this.polyShaderConfig);

		this.polys = new Glow.Shader(shaderConfig);
	},

	initPostShader: function () {
		var fbo = new Glow.FBO({
			depth: true,
			stencil: false
		});

		var postEffectShader = object.extend({
			data: {
				offset: new Float(0.25),
				darkness: new Float(5.0),

				time: new Float(0),
				blur: new Float(0.03),

				nIntensity: new Float(0.5),
				sIntensity: new Float(0.5),
				sCount: new Float(4096),

				tDiffuse: fbo,

				vertices: Plane.vertices(),
				uvs: Plane.uvs()
			},

			indices: Plane.indices(),
			primitives: this.gl.TRIANGLES
		}, this.postFxShaderConfig);

		this.fbo = fbo;
		this.postEffect = new Glow.Shader(postEffectShader);
	},

	setSize: function (w, h) {
		var el = this.el;
		var polys = this.polys;

		this.width = el.width = polys.screenWidth.value[0] = w;
		this.height = el.height = polys.screenHeight.value[0] = h;

		this.context.resize(w, h);
		this.fbo.resize(w, h);

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

		if (!node) { node = pool[index] = array.create("f32", 3); }
		this._nodePoolIndex ++;
		return node;
	},

	// Shift elements from beginning of pool to end
	shiftNodePool: function (n) {
		var pool = this._nodePool;
		var removed = pool.splice(0, n);

		this._nodePool = pool.concat(removed);
		this._nodePoolIndex -= n;

		if (DEBUG_POOL) { console.log(this._nodePool.length); }
	},

	addNode: function (i, diff) {
		var node = this.getNodeFromPool();
		var width = this.video.width;
		var height = this.video.height;

		// x, y, d
		// x, y mapped from [0, 1] and mirrored
		node[0] = Math.abs((i % width) / width - 1);
		node[1] = Math.abs(Math.floor(i / width) / height - 1);
		node[2] = diff;

		this.nodes.push(node);
	},

	updateQuadtree: function () {
		this.quadtree = createQuadtree(this.nodes);
	},

	draw: function () {
		var video = this.video;
		if (!(video.isStreaming || video.isPlaying)) { return; }

		var nodes = this.nodes;
		var context = this.context;
		var fbo = this.fbo;
		var polys = this.polys;
		var postEffect = this.postEffect;
		var imageData = video.readPixels();

		// Push nodes from video frame diff
		video.forFrameDiff(imageData.data, this.range, this.addNode);

		// Index nodes in quad-tree
		if (nodes.length) {
			this.updateQuadtree();
			if (DEBUG_POOL) {
				console.log(nodes.length, this._nodePool.length);
			}
		}

		var vertAttr = polys.attributes.vertices;
		var opacAttr = polys.attributes.opacity;
		var opacity = opacAttr.data;
		var i, il;

		// Time
		postEffect.time.add(0.1);

		// Update geometry
		for (i = 0, il = nodes.length; i < il; i ++) {
			this.updateNode(vertAttr, opacAttr, nodes[i], i);
		}

		// Fade
		for (i = 0, il = opacity.length; i < il; i ++) {
			opacity[i] = Math.max(0, opacity[i] - 0.1);
		}

		vertAttr.bufferData();
		opacAttr.bufferData();

		context.cache.clear();
		fbo.bind();
		context.clear();

		polys.draw();
		fbo.unbind();

		postEffect.draw();
		polys.draw();

		if (nodes.length) {
			this.reset();
		}
	},

	updateNode: (function () {
		function angleRel(a, b) {
			return Math.atan2(b[1] - a[1], b[0] - a[0]);
		}

		function angleSort(n) {
			return function (a, b) {
				return angleRel(n, a) - angleRel(n, b);
			};
		}

		function pushVert(verts, opacity, n) {
			var index = verts._index;
			if (!index || index * 2 + 1 > verts.length) {
				index = verts._index = 0;
			}

			verts[index * 2] = n[0] * 2 - 1;
			verts[index * 2 + 1] = n[1] * 2 - 1;
			opacity[index] = 1;
			verts._index ++;
		}

		return function (vertAttr, opacAttr, node, index) {
			var vertices = vertAttr.data;
			var opacity = opacAttr.data;

			var radius = node[2] / (1000 * 3);
			var nodes = this.search(this.quadtree, node[0], node[1], radius);
			var i, il, n0, n1;

			nodes.sort(angleSort(node));

			for (i = 1, il = nodes.length; i < il; i ++) {
				n0 = nodes[i - 1];
				n1 = nodes[i];

				pushVert(vertices, opacity, node);
				pushVert(vertices, opacity, n0);
				pushVert(vertices, opacity, n1);
			}
		};
	}()),

	search: function (quadtree, x, y, radius) {
		var x0 = x - radius;
		var y0 = y - radius;
		var x3 = x + radius;
		var y3 = y + radius;
		var radiusSq = radius * radius;
		var matches = [];

		quadtree.visit(function searchVisit(node, x1, y1, x2, y2) {
			var p = node.point;
			if (p && vec2.distanceSq(x, y, p[0], p[1]) <= radiusSq) {
				matches.push(p);
			}

			return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
		});

		return matches;
	},

	reset: function () {
		var nodes = this.nodes;
		var diff = Math.max(nodes.length - this.nodesMax, this.nodesRemove);

		nodes.splice(0, diff);
		this.shiftNodePool(diff);
	}

};
