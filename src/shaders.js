export const vertexShader = /* glsl */ `
  // Time uniform passed from JavaScript to animate the grass
  uniform float uTime;
  uniform vec3 uObjectPosition; // Position of the controllable object

  // Variables passed from vertex shader to fragment shader
  varying vec3 vPosition; // Position of the vertex
  varying vec2 vUv;       // UV coordinates for texturing
  varying vec3 vNormal;   // Normal vector for lighting

  // Function to create a wave effect for grass blades
  float wave(float waveSize, float tipDistance, float centerDistance) {
    bool isTip = (gl_VertexID + 1) % 5 == 0;
    float waveDistance = isTip ? tipDistance : centerDistance;
    return sin((uTime / 500.0) + waveSize) * waveDistance;
  }

  void main() {
    // Pass values to fragment shader
    vPosition = position;
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Keep vertices at or above ground level
    if (vPosition.y < 0.0) {
      vPosition.y = 0.0;
    } else {
      // Add horizontal wave movement
      vPosition.x += wave(uv.x * 10.0, 0.3, 0.1);

      // Grass Flattening and Bending effect based on object position
      float distanceToObject = distance(vPosition.xz, uObjectPosition.xz);
      float flatteningRadius = 1.0;
      float flatteningFactor = 1.6; // Increased flattening factor for more visible bend
      float bendFactor = 1.4;      // Factor to control the bending strength

      if (distanceToObject < flatteningRadius) {
        float flattenAmount = 1.0 - smoothstep(0.0, flatteningRadius, distanceToObject);

        // Calculate bend direction - vector from grass to object
        vec2 bendDirection = normalize(uObjectPosition.xz - vPosition.xz);

        // Apply bending in XZ plane
        vPosition.x += bendDirection.x * flattenAmount * bendFactor;
        vPosition.z += bendDirection.y * flattenAmount * bendFactor;

        // Flatten grass vertically
        vPosition.y = max(0.0, vPosition.y - flattenAmount * flatteningFactor);
      }
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  // Cloud texture sampler for adding subtle variation to grass color
  uniform sampler2D uCloud;

  // Values received from vertex shader
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vNormal;

  // Base grass color
  //vec3 green = vec3(0.2, 0.6, 0.3); //original green
  //vec3 green = vec3(0.5, 0.4, 0.8); //purple
  //vec3 green = vec3(0.8, 0.0, 0.1); //red
  //vec3 green = vec3(1.0, 1.0, 0.8); //cream/yellow
  //vec3 green = vec3(0.36, 0.62, 0.76); //blue
  vec3 green = vec3(0.5, 0.8, 0.2); //green

  void main() {
    // Vary color based on blade height - darker at base, brighter at tips
    vec3 color = mix(green * 1.7, green, vPosition.y); //original value 0.7

    // Mix in cloud texture for natural color variation
    color = mix(color, texture2D(uCloud, vUv).rgb, 0.4);

    // Add simple lighting based on normal direction
    float lighting = dot(vNormal, normalize(vec3(1, 1, 0))); // Directional light from top-right
    color += lighting * 0.1; // Slightly increase brightness based on lighting

    // Set pixel color with lighting effect
    gl_FragColor = vec4(color, 1.0);
  }
`