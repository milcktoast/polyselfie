#ifdef GL_ES
	precision highp float;
#endif

uniform vec2 screenSize;
uniform	float screenWidth;
uniform	float screenHeight;

varying vec3 vColor;
varying float vOpacity;

void main() {
	// float x = gl_FragCoord.x / screenSize.x;
	// float y = gl_FragCoord.y / screenSize.y;
	gl_FragColor = vec4(vColor / 255.0, vOpacity * 0.03);
}
