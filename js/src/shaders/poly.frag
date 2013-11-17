#ifdef GL_ES
	precision highp float;
#endif

uniform	float screenWidth;
uniform	float screenHeight;

varying float vOpacity;

float c = 1.0;

void main() {
	float x = gl_FragCoord.x / screenWidth;
	float y = gl_FragCoord.y / screenHeight;

	gl_FragColor = vec4(x, 0.4, y, vOpacity * 0.03);
}
