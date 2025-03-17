export const vertexShader = /* glsl */ `
  // Time uniform passed from JavaScript to animate the grass
  uniform float uTime;
  uniform vec3 uObjectPosition; // Position of the controllable object
  
  // Cut areas information - IMPORTANT: this must match MAX_CUT_AREAS in the JS file
  uniform float uCutAreas[160]; // Array of cut areas data (x,y,z,radius,cutTime,0,0,0) - 8 values per area * 20 areas
  uniform int uCutAreasCount; // Number of cut areas
  uniform float uRegrowthTime; // Time for grass to fully regrow
  uniform float uCurrentTime; // Current time for regrowth calculation
  uniform int uGrowthStages; // Number of growth stages

  // Variables passed from vertex shader to fragment shader
  varying vec3 vPosition; // Position of the vertex
  varying vec2 vUv;       // UV coordinates for texturing
  varying vec3 vNormal;   // Normal vector for lighting
  varying float vGrowthStage; // Growth stage for color variation

  // Function to create a wave effect for grass blades
  float wave(float waveSize, float tipDistance, float centerDistance) {
    bool isTip = (gl_VertexID + 1) % 5 == 0;
    float waveDistance = isTip ? tipDistance : centerDistance;
    return sin((uTime / 500.0) + waveSize) * waveDistance;
  }
  
  // Function to check if a vertex is in a cut area
  // Returns growth stage (0.0 = fully cut, 1.0 = fully grown)
  float getGrowthStage(vec3 position) {
    float minGrowthStage = 1.0; // Start with fully grown
    
    // Check each cut area
    for (int i = 0; i < 20; i++) { // Hard-coded limit to match MAX_CUT_AREAS
      if (i >= uCutAreasCount) break; // Stop when we've checked all cut areas
      
      // Get cut area data
      vec3 cutPosition = vec3(uCutAreas[i*8], uCutAreas[i*8+1], uCutAreas[i*8+2]);
      float cutRadius = uCutAreas[i*8+3];
      float cutTime = uCutAreas[i*8+4];
      
      // Calculate distance to cut area center
      float distanceToCut = distance(position.xz, cutPosition.xz);
      
      // Check if this vertex is within the cut radius
      if (distanceToCut < cutRadius) {
        // Calculate time since cut
        float timeSinceCut = uCurrentTime - cutTime;
        
        // Calculate growth stage based on time using discrete stages
        float stageTime = uRegrowthTime / float(uGrowthStages);
        int currentStage = int(timeSinceCut / stageTime);
        float growthProgress = float(currentStage) / float(uGrowthStages - 1);
        
        // Clamp to ensure we don't exceed 1.0
        growthProgress = clamp(growthProgress, 0.0, 1.0);
        
        // Use the minimum growth stage (most recent cut takes precedence)
        minGrowthStage = min(minGrowthStage, growthProgress);
      }
    }
    
    return minGrowthStage;
  }

  void main() {
    // Pass values to fragment shader
    vPosition = position;
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Check if this blade is in a cut area and get its growth stage
    float growthStage = getGrowthStage(position);
    vGrowthStage = growthStage; // Pass to fragment shader for coloring
    
    // For vertices above ground level, scale height based on growth stage
    if (vPosition.y > 0.0) {
      // Adjust height based on growth stage
      // Tips (vertex index 4) and mid points (vertex indices 2,3) need to be scaled
      // Bottom vertices (indices 0,1) always stay at ground level
      bool isBottomVertex = (gl_VertexID % 5 == 0 || gl_VertexID % 5 == 1);
      
      if (!isBottomVertex) {
        vPosition.y *= growthStage;
      }
      
      // Only add wave effect to uncut or partially regrown grass
      if (growthStage > 0.1) {
        // Adjust wave amount based on growth stage
        float waveAmount = growthStage;
        vPosition.x += wave(uv.x * 10.0, 0.3 * waveAmount, 0.1 * waveAmount);
      }

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
`;

export const fragmentShader = /* glsl */ `
  // Cloud texture sampler for adding subtle variation to grass color
  uniform sampler2D uCloud;
  uniform int uGrowthStages; // Number of growth stages

  // Values received from vertex shader
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vGrowthStage; // Growth stage from vertex shader

  // Base grass color
  vec3 green = vec3(0.5, 0.7, 0.4); // green
  
  // Cut grass color (brownish)
  vec3 cutGreen = vec3(0.6, 0.5, 0.2); // Brownish color for freshly cut grass

  // Function to get color based on growth stage
  vec3 getGrowthColor(float growthStage) {
    // Define colors for each growth stage (from cut to fully grown)
    vec3 colors[5] = vec3[5](
      vec3(0.6, 0.5, 0.2),   // Stage 0: Freshly cut (brown)
      vec3(0.55, 0.55, 0.25), // Stage 1: Early growth (yellowish-brown)
      vec3(0.5, 0.6, 0.3),   // Stage 2: Mid growth (yellow-green)
      vec3(0.5, 0.65, 0.35), // Stage 3: Late growth (light green)
      vec3(0.5, 0.7, 0.4)    // Stage 4: Fully grown (green)
    );
    
    // Calculate which stage we're in and how far through it
    float stageSize = 1.0 / float(uGrowthStages - 1);
    int currentStage = int(growthStage / stageSize);
    int nextStage = min(currentStage + 1, uGrowthStages - 1);
    float stageProgress = (growthStage - float(currentStage) * stageSize) / stageSize;
    
    // Interpolate between current and next stage colors
    return mix(colors[currentStage], colors[nextStage], stageProgress);
  }

  void main() {
    // Get color based on growth stage
    vec3 growthColor = getGrowthColor(vGrowthStage);
    
    // Vary color based on blade height - darker at base, brighter at tips
    vec3 heightColor = mix(growthColor * 0.7, growthColor, vPosition.y);
    
    // Final grass color
    vec3 color = heightColor;

    // Mix in cloud texture for natural color variation
    color = mix(color, texture2D(uCloud, vUv).rgb, 0.4);

    // Add simple lighting based on normal direction
    float lighting = dot(vNormal, normalize(vec3(1, 1, 0))); // Directional light from top-right
    color += lighting * 0.1; // Slightly increase brightness based on lighting
    
    // Adjust alpha for very short cut grass to create patchy effect
    float alpha = 1.0;
    if (vGrowthStage < 0.15 && vPosition.y < 0.1) {
      alpha = vGrowthStage * 6.0; // Fade out completely cut grass near ground level
    }

    // Set pixel color with lighting effect
    gl_FragColor = vec4(color, alpha);
  }
`;