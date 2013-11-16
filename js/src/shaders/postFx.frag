#define ITERATIONS 10.0

#ifdef GL_ES
	precision highp float;
#endif

uniform float offset;
uniform float darkness;

uniform float time;
uniform float blur;

// noise intensity [0, 1]
uniform float nIntensity;
// scanlines intensity [0, 1]
uniform float sIntensity;
// scanlines count [0, 4096]
uniform float sCount;

uniform sampler2D tDiffuse;
varying vec2 uv;

float random(vec3 scale, float seed) {
	// use the fragment position for a different seed per-pixel
	return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {

	// Vignette
	// --------

	vec4 texel = texture2D(tDiffuse, uv);
	vec2 vuv = (uv - vec2(0.5)) * vec2(offset);
	texel = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(vuv, vuv)), texel.a);

	// Film grain
	// ----------

	// noise
	float dx = uv.x * uv.y * time *  1000.0;
	dx = mod(mod(dx, 13.0) * mod(dx, 123.0), 0.01);
	vec3 cResult = texel.rgb + texel.rgb * clamp(0.1 + dx * 100.0, 0.0, 1.0);

	// scanlines
	vec2 sc = vec2(sin(uv.y * sCount), cos(uv.y * sCount));
	cResult += texel.rgb * vec3(sc.x, sc.y, sc.x) * sIntensity;

	// interpolate between source and result by intensity
	cResult = texel.rgb + clamp(nIntensity, 0.0, 1.0) * (cResult - texel.rgb);

	// convert to grayscale
	// cResult = vec3(cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11);
	gl_FragColor = vec4(cResult, texel.a);

	// Blur
	// ----

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

	gl_FragColor += color / total;
}
