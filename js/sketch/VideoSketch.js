// Sketch
// ------

var bindAll = require("../utils/function").bindAll;
var extend = require("../utils/object").extend;
var vec2 = require("../math/vec2");
var createArray = require("../utils/typed-array").create;
var quadtree = require("../libs/d3/d3-quadtree");

var createQuadtree = quadtree()
	.x(function (d) { return d[0]; })
	.y(function (d) { return d[1]; });

var DEBUG_POOL = false;

module.exports = VideoSketch;

function VideoSketch(video, opts) {
	bindAll(this, "addNode");
	extend(this, opts);

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
		node[1] = Math.floor(i / width) / height;
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
		var imageData = video.readPixels();

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
		extend(ctx, this.clearStyle);
		ctx.fillRect(0, 0, this.width, this.height);
		// ctx.clearRect(0, 0, this.width, this.height);

		// Draw connections
		extend(ctx, this.connectionStyle);
		for (i = 0, il = nodes.length; i < il; i ++) {
			this.drawConnections(ctx, nodes[i]);
		}

		// Draw nodes
		/*
		ctx.strokeStyle = "#fafafa";
		ctx.globalAlpha = 0.25;

		for (i = 0, il = nodes.length; i < il; i ++) {
			this.drawNode(ctx, nodes[i]);
		}
		*/

		if (nodes.length) {
			this.reset();
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

	// TODO
	// Sort connection points by angle to improve quality of drawn polygons
	drawConnections: function (ctx, node) {
		var w = this.width;
		var h = this.height;
		var x0 = node[0] * w;
		var y0 = node[1] * h;
		var radius = node[2] / (1000 * 5);

		var nodes = this.search(this.quadtree, node[0], node[1], radius);
		var i, il, n, x1, y1;

		ctx.beginPath();
		ctx.moveTo(x0, y0);

		for (i = 0, il = nodes.length; i < il; i ++) {
			n = nodes[i];
			x1 = n[0] * w;
			y1 = n[1] * h;

			if (i % 2 === 0) { ctx.lineTo(x0, y0); }
			ctx.lineTo(x1, y1);
		}

		ctx.closePath();
		ctx.fill();
	},

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
