module.exports = {
	distanceSq: function (x0, y0, x1, y1) {
		var x = x1 - x0;
		var y = y1 - y0;
		return x * x + y * y;
	}
};
