// Looper
// ------

module.exports = Looper;

function Looper(onFrame) {
	var isLooping = false;

	// TODO: Implement requestAnimationFrame polyfill
	function animate() {
		if (!isLooping) { return; }
		onFrame();
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
