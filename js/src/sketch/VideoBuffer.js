// Video buffer
// ------------

var createArray = require("../utils/array").create;

module.exports = VideoBuffer;

function VideoBuffer(width, height) {
	this.el = document.createElement("video");
	this.buffer = document.createElement("canvas");
	this.bufferDisplay = document.createElement("canvas");
	this.ctx = this.buffer.getContext("2d");
	this.ctxDisplay = this.bufferDisplay.getContext("2d");

	this.setSize(width, height);
	this.pixels = createArray("f32", this.size * 4);
	this.el.addEventListener("ended", this.onVideoEnd.bind(this));
}

VideoBuffer.prototype = {

	request: function (cb) {
		var that = this;
		navigator.mediaDevices.getUserMedia({video: true})
			.then(function (stream) {
				that.hasDiff = false;
				that.isStreaming = true;
				that.stream = stream;
				that.pause();
				that.setSource(stream);
				that.play();
				cb(null);
			}).catch(function (error) {
				console.error(error);
				cb(error);
			});
	},

	setSize: function (w, h) {
		var el = this.el;
		var buffer = this.buffer;
		var bufferDisplay = this.bufferDisplay;

		this.width = el.width = buffer.width = bufferDisplay.width = w;
		this.height = el.height = buffer.height = bufferDisplay.height = h;
		this.size = w * h;
	},

	setSource: function (source, formats) {
		if (!formats) {
			this.el.srcObject = source;
			return;
		}

		var hasSupport = this.formats;
		var format;

		for (var i = 0, il = formats.length; i < il; i ++) {
			format = formats[i];
			if (hasSupport[format]) {
				this.el.src = source + "." + format;
				break;
			}
		}
	},

	formats: (function () {
		var el = document.createElement("video");
		if (!(el && el.canPlayType)) { return null; }

		var canPlay = el.canPlayType.bind(el);
		return {
			mp4: !!canPlay('video/mp4; codecs="mp4v.20.8"'),
			h264: !!(canPlay('video/mp4; codecs="avc1.42E01E"') ||
				canPlay('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')),
			ogv: !!canPlay('video/ogg; codecs="theora"'),
			webm: !!canPlay('video/webm; codecs="vp8, vorbis"')
		};
	}()),

	seek: function (to) {
		this.el.currentTime = to;
	},

	play: function () {
		this.isPlaying = true;
		return this.el.play();
	},

	pause: function () {
		this.isPlaying = false;
		return this.el.pause();
	},

	toggle: function () {
		if (this.isPlaying) { this.pause(); }
		else { this.play(); }
	},

	onVideoEnd: function (event) {
		this.seek(0);
		this.play();
	},

	readPixels: function () {
		var ctx = this.ctx;
		var w = this.width;
		var h = this.height;

		ctx.drawImage(this.el, 0, 0, w, h);
		return ctx.getImageData(0, 0, w, h);
	},

	forFrameDiff: function (imageData, range, map) {
		var pixels = imageData.data;
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

		if (movement > 0) {
			this.ctxDisplay.putImageData(imageData, 0, 0);
			this.hasDiff = true;
		}
	}

};
