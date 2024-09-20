uniform	float screenWidth;
uniform	float screenHeight;

attribute vec2 vertices;
attribute vec3 color;
attribute float opacity;

varying vec3 vColor;
varying float vOpacity;

void main() {
	// vec2 size = vec2(screenWidth, screenHeight);
	vColor = color;
	vOpacity = opacity;
	gl_Position = vec4(vertices.x, vertices.y, 1.0, 1.0);
}
