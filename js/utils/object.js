module.exports = {
	extend: function (o, attrs) {
		for (var prop in attrs) {
			if (attrs.hasOwnProperty(prop)) {
				o[prop] = attrs[prop];
			}
		}
	}
};
