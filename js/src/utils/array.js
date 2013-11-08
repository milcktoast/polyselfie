var root = this;
var types = {
	i8: "Int8Array",
	ui8: "Uint8Array",
	ui8c: "Uint8ClampedArray",
	i16: "Int16Array",
	ui16: "Uint16Array",
	i32: "Int32Array",
	ui32: "Uint32Array",
	f32: "Float32Array",
	f64: "Float64Array"
};

module.exports = {
	create: function (type, size) {
		var ArrayCtor = (root[types[type] || type] || Array);
		return new ArrayCtor(size);
	},

	range: function (type, size) {
		var array = this.create(type, size);
		for (var i = 0; i < size; i ++) { array[i] = i; }
		return array;
	}
};
