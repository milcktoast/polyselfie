#define ITERATIONS 10.0

#ifdef GL_ES
	precision highp float;
#endif

// uniform float offset;
// uniform float darkness;
uniform float blur;
uniform sampler2D tDiffuse;

varying vec2 uv;

float random(vec3 scale, float seed) {
	// use the fragment position for a different seed per-pixel
	return fract( sin( dot( gl_FragCoord.xyz + seed, scale ) ) * 43758.5453 + seed );
}

void main() {
	// vec4 texel = texture2D(tDiffuse, uv);
	// vec2 vuv = (uv - vec2(0.5)) * vec2(offset);
	// gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(vuv, vuv)), texel.a);

	vec4 color = vec4(0.0);
	float total = 0.0;
	vec2 delta = vec2(blur);

	// randomize the lookup values to hide the fixed number of samples
	float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);

	for (float t = -ITERATIONS; t <= ITERATIONS; t ++) {
		float percent = (t + offset - 0.5) / ITERATIONS;
		float weight = 1.0 - abs(percent);

		color += texture2D(tDiffuse, uv + delta * percent) * weight;
		total += weight;
	}

	gl_FragColor = color / total;
}
