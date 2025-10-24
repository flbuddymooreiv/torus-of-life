let mat4 = window.mat4 || (window.glMatrix ? window.glMatrix.mat4 : undefined);
if (typeof mat4 === 'undefined') {
    console.error("glMatrix.mat4 is still undefined after loading gl-matrix-min.js");
    alert("Error: glMatrix.mat4 is not defined. WebGL rendering will not work.");
}

const R = 2.0; // Major radius for the torus
const r = 1.0;  // Minor radius for the torus
const grid_size = 100; // N x N grid for Game of Life

let gl;
let program;
let positionBuffer;
let colorBuffer;
let indexBuffer;
let numVertices;
let numIndices;
let cameraZ = -15.0;
let generation = 0; // Add generation counter

function updateGenerationDisplay() {
    const generationSpan = document.getElementById('generationDisplay');
    if (generationSpan) {
        generationSpan.textContent = generation;
    }
}

let uModelViewMatrixLocation;
let uProjectionMatrixLocation;
let aVertexPositionLocation;
let aVertexColorLocation;

let currentSeed = 1; // Default seed
function seedRNG(seed) {
    currentSeed = seed;
}

function getRandom() {
    // Simple LCG: https://en.wikipedia.org/wiki/Linear_congruential_generator
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
}

let grid = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));
let next_grid = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));

function initializeGrid() {
    for (let row_index = 0; row_index < grid_size; row_index++) {
        for (let col_index = 0; col_index < grid_size; col_index++) {
            grid[row_index][col_index] = getRandom() < 0.2 ? 1 : 0; // 20% chance of being alive
        }
    }
}

// Initial call to set up the grid
// This will be called again from index.html after parsing the URL seed
initializeGrid();

function countNeighbors(row_index, col_index) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const neighbor_r = (row_index + i + grid_size) % grid_size;
            const neighbor_c = (col_index + j + grid_size) % grid_size;
            count += grid[neighbor_r][neighbor_c];
        }
    }
    return count;
}

function nextGeneration() {
    generation++;
    updateGenerationDisplay();
    for (let row_index = 0; row_index < grid_size; row_index++) {
        for (let col_index = 0; col_index < grid_size; col_index++) {
            const state = grid[row_index][col_index];
            const neighbors = countNeighbors(row_index, col_index);

            if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                next_grid[row_index][col_index] = 0; // Dies
            } else if (state === 0 && neighbors === 3) {
                next_grid[row_index][col_index] = 1; // Lives
            } else {
                next_grid[row_index][col_index] = state; // Stays the same
            }
        }
    }
    grid = next_grid.map(arr => arr.slice()); // Copy next_grid to grid
}

function restartGame() {
    generation = 0;
    updateGenerationDisplay();
    // Clear the existing grid and re-initialize
    grid = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));
    next_grid = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));
    initializeGrid();
    // Re-render the first frame with the new grid
    updateFrame(0); // Pass 0 for time to reset animation
}

function checkGLError() {
    let error = gl.getError();
    while (error !== gl.NO_ERROR) {
        let errorStr = "UNKNOWN_ERROR";
        switch (error) {
            case gl.INVALID_ENUM: errorStr = "INVALID_ENUM"; break;
            case gl.INVALID_VALUE: errorStr = "INVALID_VALUE"; break;
            case gl.INVALID_OPERATION: errorStr = "INVALID_OPERATION"; break;
            case gl.OUT_OF_MEMORY: errorStr = "OUT_OF_MEMORY"; break;
            case gl.INVALID_FRAMEBUFFER_OPERATION: errorStr = "INVALID_FRAMEBUFFER_OPERATION"; break;
        }
        console.error("WebGL Error: " + errorStr + " (" + error + ")");
        error = gl.getError();
    }
}

function initWebGL() {
    const canvas = document.getElementById('torusCanvas');
    gl = canvas.getContext('webgl');
    checkGLError(); // Check for errors after getting context

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    const vsSource = `
        precision mediump float; // Add precision qualifier
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;
        attribute float aCellState; // New attribute for cell state

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;

        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            gl_PointSize = aCellState > 0.5 ? 8.0 : 2.0; // Bigger for live, smaller for dead
            vColor = aVertexColor;
        }
    `;

    const fsSource = `
        precision mediump float; // Add precision qualifier
        varying lowp vec4 vColor;

        void main(void) {
            // Create a spherical appearance for points
            float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
            if (dist > 0.5) {
                discard;
            }
            // Apply a simple radial gradient for a 3D look
            gl_FragColor = vColor * (1.0 - dist * 0.5);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    program = shaderProgram;
    checkGLError();

    aVertexPositionLocation = gl.getAttribLocation(program, 'aVertexPosition');
    aVertexColorLocation = gl.getAttribLocation(program, 'aVertexColor');
    aCellStateLocation = gl.getAttribLocation(program, 'aCellState'); // Get location for new attribute
    uProjectionMatrixLocation = gl.getUniformLocation(program, 'uProjectionMatrix');
    uModelViewMatrixLocation = gl.getUniformLocation(program, 'uModelViewMatrix');
    checkGLError();

    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    cellStateBuffer = gl.createBuffer(); // New buffer for cell states
    indexBuffer = gl.createBuffer();
    checkGLError();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    checkGLError();
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    checkGLError();
    gl.linkProgram(shaderProgram);
    checkGLError();

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    checkGLError();
    gl.compileShader(shader);
    checkGLError();

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initTorusGeometry() {
    const positions = [];
    const colors = [];

    const num_segments_u = grid_size;
    const num_segments_v = grid_size;

    for (let i = 0; i <= num_segments_u; i++) {
        const u_angle = i * 2 * Math.PI / num_segments_u;
        for (let j = 0; j <= num_segments_v; j++) {
            const v_angle = j * 2 * Math.PI / num_segments_v;

            const x = (R + r * Math.cos(v_angle)) * Math.cos(u_angle);
            const y = (R + r * Math.cos(v_angle)) * Math.sin(u_angle);
            const z = r * Math.sin(v_angle);

            positions.push(x, y, z);
            colors.push(0.5, 0.5, 0.5, 1.0); // Default gray color
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    checkGLError();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    checkGLError();

    numVertices = positions.length / 3;
}

function updateFrame(time) {
    nextGeneration();

    const angle_x = time * 0.00005;
    const angle_y = time * 0.0001;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    checkGLError();

    const colors = [];
    for (let row_index = 0; row_index <= grid_size; row_index++) {
        for (let col_index = 0; col_index <= grid_size; col_index++) {
            const grid_row = row_index % grid_size;
            const grid_col = col_index % grid_size;

            const hue_base = (time * 0.005) % 360;
            const u = 2 * Math.PI * (col_index % grid_size) / grid_size;
            const v = 2 * Math.PI * (row_index % grid_size) / grid_size;
            const hue_offset_u = (u / (2 * Math.PI)) * 180;
            const hue_offset_v = (v / (2 * Math.PI)) * 180;
            const pulse_effect = Math.sin(time * 0.002 + u * 3 + v * 2) * 20;
            const final_hue = (hue_base + hue_offset_u + hue_offset_v + pulse_effect) % 360;

            let r_color, g_color, b_color;
            if (grid[grid_row][grid_col] === 1) {
                const h = final_hue / 60;
                const s = 1;
                const l = 0.8;
                const c_val = (1 - Math.abs(2 * l - 1)) * s;
                const x_val = c_val * (1 - Math.abs(h % 2 - 1));
                const m_val = l - c_val / 2;

                if (0 <= h && h < 1) { r_color = c_val; g_color = x_val; b_color = 0; }
                else if (1 <= h && h < 2) { r_color = x_val; g_color = c_val; b_color = 0; }
                else if (2 <= h && h < 3) { r_color = 0; g_color = c_val; b_color = x_val; }
                else if (3 <= h && h < 4) { r_color = 0; g_color = x_val; b_color = c_val; }
                else if (4 <= h && h < 5) { r_color = x_val; g_color = 0; b_color = c_val; }
                else if (5 <= h && h < 6) { r_color = c_val; g_color = 0; b_color = x_val; }
                else { r_color = 0; g_color = 0; b_color = 0; }

                colors.push(r_color + m_val, g_color + m_val, b_color + m_val, 0.6); // Made translucent
            } else {
                colors.push(0.3, 0.3, 0.3, 0.8); // Increased alpha for dead cells
            }
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

    // Populate and bind cellStateBuffer
    const cellStates = [];
    for (let row_index = 0; row_index <= grid_size; row_index++) {
        for (let col_index = 0; col_index <= grid_size; col_index++) {
            const grid_row = row_index % grid_size;
            const grid_col = col_index % grid_size;
            cellStates.push(grid[grid_row][grid_col]); // 1.0 for alive, 0.0 for dead
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, cellStateBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cellStates), gl.DYNAMIC_DRAW);

    let modelViewMatrix = glMatrix.mat4.create();
    modelViewMatrix = glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, cameraZ]);
    modelViewMatrix = glMatrix.mat4.rotate(modelViewMatrix, modelViewMatrix, angle_x, [1, 0, 0]);
    modelViewMatrix = glMatrix.mat4.rotate(modelViewMatrix, modelViewMatrix, angle_y, [0, 1, 0]);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelViewMatrix'), false, modelViewMatrix);

    gl.drawArrays(gl.POINTS, 0, numVertices);
    checkGLError();
}

function mainLoop(time) {
    updateFrame(time);
    requestAnimationFrame(mainLoop);
}

function resize() {
    const canvas = document.getElementById('torusCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 45 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 1000.0);
    gl.uniformMatrix4fv(uProjectionMatrixLocation, false, projectionMatrix);
}

function init() {
    initWebGL();
    checkGLError();
    initTorusGeometry();
    checkGLError();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
        aVertexPositionLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(aVertexPositionLocation);
    checkGLError();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(
        aVertexColorLocation,
        4,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(aVertexColorLocation);
    checkGLError();

    gl.bindBuffer(gl.ARRAY_BUFFER, cellStateBuffer);
    gl.vertexAttribPointer(
        aCellStateLocation,
        1, // It's a single float
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(aCellStateLocation);
    checkGLError();

    gl.useProgram(program);
    checkGLError();

    resize();
    window.onresize = resize;

    const canvas = document.getElementById('torusCanvas');
    canvas.addEventListener('wheel', event => {
        event.preventDefault();
        cameraZ -= event.deltaY * 0.01;
        cameraZ = Math.max(-20, Math.min(-2, cameraZ));
    });

    requestAnimationFrame(mainLoop);
}

window.onload = init;