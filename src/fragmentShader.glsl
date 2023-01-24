precision highp float;

uniform vec2 u_size;

const int dataCount = 32;
uniform vec4 u_FrequencyData[dataCount];

vec3 hsl2rgb(in vec3 c) { // © 2014 Inigo Quilez, MIT license, see https://www.shadertoy.com/view/lsS3Wc
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

vec3 getColor(in vec2 uv, in float i, in float val) {
    vec2 lighPosition = vec2(i, val);
    vec3 lightColour = hsl2rgb(vec3(val / u_size.y, 1.0, 0.5));
    return 3.0 / abs(length(uv - lighPosition)) * lightColour;
}

void main(void) {
    vec2 uv = gl_FragCoord.xy;

    // Background colour
    vec3 colour = vec3(0, 0.1, 0.2);

    float xStep = u_size.x / (float(dataCount));
    for(int i = 0; i < dataCount; i++) {

        vec4 pos = u_FrequencyData[i] / 255.0 * u_size.y;
        float index = float(i) * 4.0;
        colour += getColor(uv, (index + .0) * xStep, pos.x);
        colour += getColor(uv, (index + 1.0) * xStep, pos.y);
        colour += getColor(uv, (index + 2.0) * xStep, pos.z);
        colour += getColor(uv, (index + 3.0) * xStep, pos.w);
    }

    gl_FragColor = vec4(colour, 1.0);
}