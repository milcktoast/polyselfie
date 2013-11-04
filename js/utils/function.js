var slice = Array.prototype.slice;
module.exports = {
	bindAll: function () {
		var scope = arguments[0];
		var methods = slice.call(arguments, 1);
		var m;

		for (var i = 0, il = methods.length; i < il; i ++) {
			m = methods[i];
			scope[m] = scope[m].bind(scope);
		}
	}
};
