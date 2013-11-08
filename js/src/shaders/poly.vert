attribute float opacity;
attribute vec2 vertices;

varying float vOpacity;

void main() {
	vOpacity = opacity;
	gl_Position = vec4(vertices.x, vertices.y, 1.0, 1.0);
}
