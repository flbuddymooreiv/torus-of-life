// Removed polling variables
const width = 600;
const height = 600;
const R = 275; // Major radius for the torus
const r = 225;  // Minor radius for the torus
const grid_size = 100; // N x N grid for Game of Life
// Removed focal_length and distance for orthographic projection
const cell_base_size = 12; // Base size for the projected cell

console.log("Game of Life script loaded and running!");

let grid = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));
let next_grid = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));

// --- Game of Life Initialization (Persistent Critters) ---


// Random initialization
for (let r = 0; r < grid_size; r++) {
    for (let c = 0; c < grid_size; c++) {
        grid[r][c] = Math.random() < 0.2 ? 1 : 0; // 20% chance of being alive
    }
}


// --- Game of Life Logic ---
function countNeighbors(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const neighbor_r = (r + i + grid_size) % grid_size;
            const neighbor_c = (c + j + grid_size) % grid_size;
            count += grid[neighbor_r][neighbor_c];
        }
    }
    return count;
}

// Removed pollServerStatus function

function nextGeneration() {
    for (let r = 0; r < grid_size; r++) {
        for (let c = 0; c < grid_size; c++) {
            const state = grid[r][c];
            const neighbors = countNeighbors(r, c);

            if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                next_grid[r][c] = 0; // Dies
            } else if (state === 0 && neighbors === 3) {
                next_grid[r][c] = 1; // Lives
            } else {
                next_grid[r][c] = state; // Stays the same
            }
        }
    }
    grid = next_grid.map(arr => arr.slice()); // Copy next_grid to grid
}

// --- Animation and Rendering ---
function updateFrame(time) {
    nextGeneration(); // Advance Game of Life

    const angle_x = time * 0.00005; // Slower rotation
    const angle_y = time * 0.0001; // Slower rotation

    for (let r = 0; r < grid_size; r++) {
        for (let c = 0; c < grid_size; c++) {
            const cell_element = document.getElementById(`cell_${r}_${c}`);
            if (!cell_element) continue;

            const u = 2 * Math.PI * c / grid_size;
            const v = 2 * Math.PI * r / grid_size;
            
            // Base torus equations
            const x0 = (R + r * Math.cos(v)) * Math.cos(u);
            const y0 = (R + r * Math.cos(v)) * Math.sin(u);
            const z0 = r * Math.sin(v);

            // Rotate for a better view (around X and Y axes)
            const x1 = x0 * Math.cos(angle_y) - z0 * Math.sin(angle_y);
            const y1 = y0;
            const z1 = x0 * Math.sin(angle_y) + z0 * Math.cos(angle_y);

            const x2 = x1;
            const y2 = y1 * Math.cos(angle_x) - z1 * Math.sin(angle_x);
            const z2 = y1 * Math.sin(angle_x) + z1 * Math.cos(angle_x);

            // Orthographic projection
            const scale_factor = 0.5; // Adjust this to fit the torus on screen
            const sx = width / 2 + x2 * scale_factor;
            const sy = height / 2 + y2 * scale_factor;

            // Calculate projected cell size
            const projected_cell_size = cell_base_size * scale_factor;

            // Update cell position and color
            cell_element.setAttribute('x', sx - projected_cell_size / 2);
            cell_element.setAttribute('y', sy - projected_cell_size / 2);
            cell_element.setAttribute('width', projected_cell_size);
            cell_element.setAttribute('height', projected_cell_size);

            const hue_base = (time * 0.005) % 360; // Slower hue shift
            const hue_offset_u = (u / (2 * Math.PI)) * 180; 
            const hue_offset_v = (v / (2 * Math.PI)) * 180; 
            const pulse_effect = Math.sin(time * 0.002 + u * 3 + v * 2) * 20; // Slower wave-like pulse
            const final_hue = (hue_base + hue_offset_u + hue_offset_v + pulse_effect) % 360;

            if (grid[r][c] === 1) {
                cell_element.setAttribute('fill', `hsl(${final_hue}, 100%, 70%)`);
                cell_element.setAttribute('fill-opacity', 0.8);
                cell_element.setAttribute('width', projected_cell_size);
                cell_element.setAttribute('height', projected_cell_size);
            } else {
                // Small medium gray dot for dead cells
                const dead_cell_size = projected_cell_size * 0.3; // Make it smaller
                cell_element.setAttribute('fill', '#888'); // Medium gray
                cell_element.setAttribute('fill-opacity', 0.3); // Slightly less opaque
                cell_element.setAttribute('width', dead_cell_size);
                cell_element.setAttribute('height', dead_cell_size);
            }
        }
    }
}

function mainLoop(time) {
    updateFrame(time);
    requestAnimationFrame(mainLoop);
}

function init() {
    // Dynamically create SVG rect elements for each cell
    const game_of_life_cells_group = document.getElementById('game-of-life-cells');
    for (let r = 0; r < grid_size; r++) {
        for (let c = 0; c < grid_size; c++) {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute('id', `cell_${r}_${c}`);
            rect.setAttribute('width', '1');
            rect.setAttribute('height', '1');
            rect.setAttribute('fill', '#333');
            rect.setAttribute('stroke', 'none');
            game_of_life_cells_group.appendChild(rect);
        }
    }
    requestAnimationFrame(mainLoop);
}

window.onload = init;