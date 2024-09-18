class FLIP_Fluid_Config
{
    constructor()
    {
        this.grid_size = Vector2.from_components(1, 1);
        this.grid_length = 1.0;
        this.world_min = Vector2.from_components();
        this.world_max = Vector2.from_components();
        this.acceleration = Vector2.from_components();

        this.default_x_weights = undefined;
        this.default_y_weights = undefined;

        this.compensation = 0.0;
        this.stiffness = 1.0;
        this.relexation = 0.9;
        this.method_mix_ratio = 0.9;

        this.num_imcompressibility_substeps = 50;
        this.num_collision_substeps = 2;

        this.show_grids = false;

        this.show_particles = true;
        this.particle_diffusion = 0.001;

        this.show_obstacle = true;
        this.num_obstacle_segments = 50;

        this.compensate_drift = true;
        this.separate_particles = true;
    }
};

class FLIP_Fluid
{
    static shader_sources = {
        point: {
            vertex: `
                attribute vec2 in_position;
                attribute vec3 in_color;

                uniform vec4 world_to_clip;
                uniform float point_size;
                uniform float point_shape;

                varying vec3 vertex_color;
                varying float vertex_point_shape;

                void main()
                {
                    vertex_color = in_color;
                    vertex_point_shape = point_shape;

                    gl_PointSize = point_size;
                    gl_Position = vec4(in_position * world_to_clip.xy + world_to_clip.zw, 0.0, 1.0);
                }
            `,
            fragment: `
                precision mediump float;

                varying vec3 vertex_color;
                varying float vertex_point_shape;

                float grid = 0.0;
                float circle = 1.0;

                void main()
                {
                    if (false) {}
                    else if (vertex_point_shape == grid) {
                        // Nothing to  do.
                    }
                    else if (vertex_point_shape == circle) {
                        vec2 grid_coordinate = vec2(gl_PointCoord.x - 0.5, gl_PointCoord.y - 0.5);
                        float squared_radius = grid_coordinate.x * grid_coordinate.x + grid_coordinate.y * grid_coordinate.y;
                        if (squared_radius > 0.25) discard;
                    }
                    else {
                        // Nothing to  do.
                    }
                    gl_FragColor = vec4(vertex_color, 1.0);
                }
            `,
        },
        mesh: {
            vertex: `
                attribute vec2 in_position;

                uniform vec3 color;
                uniform vec4 local_to_world;
                uniform vec4 world_to_clip;

                varying vec3 vertex_color;

                void main()
                {
                    vertex_color = color;

                    vec2 world_position = in_position * local_to_world.xy + local_to_world.zw;
                    gl_Position = vec4(world_position * world_to_clip.xy + world_to_clip.zw, 0.0, 1.0);
                }
            `,
            fragment: `
                precision mediump float;

                varying vec3 vertex_color;

                void main()
                {
                    gl_FragColor = vec4(vertex_color, 1.0);
                }
            `,
        }
    };

    constructor()
    {
        this.grid_size = Vector2.from_components();
        this.grid_length = 0.0;
        this.world_min = Vector2.from_components();
        this.world_max = Vector2.from_components();
        this.acceleration = Vector2.from_components();

        this.num_grids = 0;

        this.compensation = 0.0;
        this.stiffness = 0.0;
        this.relexation = 0.0;
        this.method_mix_ratio = 0.0;

        this.particles = {
            radius: 0.0,
            grid_density: 0.0,
            num_particles: 0,
            diffusion: 0.001,

            colors: new Float32Array(0),
            positions: new Float32Array(0),
            velocities: new Float32Array(0),

            search_offsets: new Uint32Array(1),
            search_indices: new Uint32Array(0),
            search_grid_positions: new Uint32Array(0),
        };

        this.x_weights = new Uint8Array();
        this.y_weights = new Uint8Array();
        this.default_x_weights = new Uint8Array();
        this.default_y_weights = new Uint8Array();
        this.x_velocities = new Float32Array();
        this.y_velocities = new Float32Array();
        this.grid_velocities = new Float32Array();
        this.old_x_velocities = new Float32Array();
        this.old_y_velocities = new Float32Array();
        this.old_grid_velocities = new Float32Array();
        this.decompose_x_weights = new Float32Array();
        this.decompose_y_weights = new Float32Array();
        this.num_particles_of_grids = new Float32Array();
        this.pressures = new Float32Array();

        this.obstacle = {
            radius: 0.0,
            position: Vector2.from_components(),
            velocity: Vector2.from_components(),
        };

        this.num_imcompressibility_substeps = 50;
        this.num_collision_substeps = 2;

        this.show_grids = false;
        this.show_particles = false;

        this.show_obstacle = false;
        this.num_obstacle_segments = 50;

        this.compensate_drift = false;
        this.separate_particles = false;

        this.grid_colors = new Float32Array();

        this.point_shading_program = undefined;
        this.mesh_shading_program = undefined;

        this.grid_vertex_buffer = undefined;
        this.grid_color_buffer = undefined;
        this.point_vertex_buffer = undefined;
        this.point_color_buffer = undefined;
        this.obstacle_index_buffer = undefined;
        this.obstacle_vertex_buffer = undefined;
    }

    static from(config = new FLIP_Fluid_Config())
    {
        let result = new FLIP_Fluid();

        result.grid_size = Vector2.from_components().elementwise_max(config.grid_size);
        result.grid_length = Math.max(config.grid_length, 0.0);
        result.num_grids = result.grid_size.x * result.grid_size.y;
        result.grid_colors = new Float32Array(result.num_grids * 3);

        let world_min = config.world_min;
        let world_max = config.world_max;
        result.world_min = Vector2.from_components(
            Math.min(world_min.x, world_max.x),
            Math.min(world_min.y, world_max.y),
        );
        result.world_max = Vector2.from_components(
            Math.max(world_min.x, world_max.x),
            Math.max(world_min.y, world_max.y),
        );

        result.acceleration = config.acceleration;

        result.compensation = Math.max(config.compensation, 0.0);
        result.stiffness = Math.max(config.stiffness, 0.0);
        result.method_mix_ratio = Math.max(config.method_mix_ratio, 0.0);
        result.imcompressibility_scaling = 1.0 + Math.max(Math.min(config.relexation, 1.0), 0.0);

        result.x_velocities = new Float32Array((result.grid_size.x + 1) * result.grid_size.y);
        result.y_velocities = new Float32Array(result.grid_size.x * (result.grid_size.y + 1));
        result.grid_velocities = new Float32Array(result.num_grids * 2);
        result.old_x_velocities = new Float32Array(result.x_velocities.length);
        result.old_y_velocities = new Float32Array(result.y_velocities.length);
        result.old_grid_velocities = new Float32Array(result.num_grids * 2);
        result.decompose_x_weights = new Float32Array(result.y_velocities.length);
        result.decompose_y_weights = new Float32Array(result.y_velocities.length);
        result.num_particles_of_grids = new Float32Array(result.num_grids);
        result.pressures = new Float32Array(result.num_grids);

        result.x_weights = new Uint8Array(result.x_velocities.length);
        result.y_weights = new Uint8Array(result.y_velocities.length);
        result.default_x_weights = new Uint8Array(result.x_weights.length);
        result.default_y_weights = new Uint8Array(result.y_weights.length);
        if (config.default_x_weights == undefined) {
            result.default_x_weights.fill(1);
        } else {
            result.default_x_weights.set(config.default_x_weights);
        }
        if (config.default_y_weights == undefined) {
            result.default_y_weights.fill(1);
        } else{
            result.default_y_weights.set(config.default_y_weights);
        }

        result.particles.search_offsets = new Uint32Array(result.num_grids + 1);
        result.particles.diffusion = config.particle_diffusion;

        result.num_imcompressibility_substeps = config.num_imcompressibility_substeps;
        result.num_collision_substeps = config.num_collision_substeps;

        result.show_grids = config.show_grids;
        result.show_particles = config.show_particles;

        result.show_obstacle = config.show_obstacle;
        result.num_obstacle_segments = config.num_obstacle_segments;

        result.compensate_drift = config.compensate_drift;
        result.separate_particles = config.separate_particles;

        return result;
    }

    load_obstacle(radius, position, velocity)
    {
        let obstacle = this.obstacle;
        obstacle.radius = radius;
        obstacle.position.copy(position);
        obstacle.velocity.copy(velocity);
    }

    load_particles(radius, positions, velocities)
    {
        if (positions.length <= 0) return;
        if (positions.length % 2 != 0) return;
        if (positions.length != velocities.length) return;

        let grid_size = this.grid_size;
        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);
        let inverse_grid_length = 1.0 / this.grid_length;
        let num_particles_of_grids = this.num_particles_of_grids;
        num_particles_of_grids.fill(0.0);
        for (let k = 0; k < positions.length; k += 2) {
            let l = k + 1;
            let x_grid_position = Math.min(Math.max(positions[k] * inverse_grid_length, grid_min.x), grid_max.x);
            let y_grid_position = Math.min(Math.max(positions[l] * inverse_grid_length, grid_min.y), grid_max.y);
            let i = Math.floor(x_grid_position);
            let j = Math.floor(y_grid_position);
            let s = x_grid_position - i;
            let t = y_grid_position - j;
            if (i == grid_max.x) {
                i--;
                s = 1.0;
            }
            if (j == grid_max.y) {
                j--;
                t = 1.0;
            }
            let one_minus_s = 1.0 - s;
            let one_minus_t = 1.0 - t;

            let index_00 = i + j * grid_size.x;
            let index_10 = index_00 + 1;
            let index_01 = index_00 + grid_size.x;
            let index_11 = index_01 + 1;
            num_particles_of_grids[index_00] += one_minus_s * one_minus_t;
            num_particles_of_grids[index_10] +=           s * one_minus_t;
            num_particles_of_grids[index_01] += one_minus_s *           t;
            num_particles_of_grids[index_11] +=           s *           t;
        }

        let num_grids_which_contains_particles = 0;
        for (let i = 0; i < num_particles_of_grids.length; i++) {
            num_grids_which_contains_particles += (num_particles_of_grids[i] > 0.0 ? 1 : 0);
        }

        let particles = this.particles;
        let num_particles = positions.length / 2;
        particles.radius = radius;
        particles.grid_density = (num_grids_which_contains_particles > 0 ? num_particles / num_grids_which_contains_particles : 0.0);
        particles.num_particles = num_particles;
        particles.colors = new Float32Array(num_particles * 3);
        particles.positions = new Float32Array(num_particles * 2),
        particles.velocities = new Float32Array(num_particles * 2),
        particles.search_indices = new Uint32Array(num_particles);
        particles.search_grid_positions = new Uint32Array(num_particles * 2);

        let colors = particles.colors;
        for (let i = 2; i < colors.length; i += 3) {
            colors[i] = 1.0;
        }
        particles.positions.set(positions);
        particles.velocities.set(velocities);
    }

    load_shading_resources(canvas)
    {
        canvas.focus();

        let context = canvas.context;

        this.point_shading_program = this._load_shading_program(
            context,
            FLIP_Fluid.shader_sources.point.vertex,
            FLIP_Fluid.shader_sources.point.fragment,
        );
        this.mesh_shading_program = this._load_shading_program(
            context,
            FLIP_Fluid.shader_sources.mesh.vertex,
            FLIP_Fluid.shader_sources.mesh.fragment,
        );

        let grid_positions = new Float32Array(2 * this.num_grids);
        let grid_size = this.grid_size;
        let grid_length = this.grid_length;
        for (let i = 0; i < grid_size.x; i++) {
            for (let j = 0; j < grid_size.y; j++) {
                let index = (i + j * grid_size.x) * 2;
                grid_positions[index++] = (i + 0.5) * grid_length;
                grid_positions[index++] = (j + 0.5) * grid_length;
            }
        }
        this.grid_vertex_buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, this.grid_vertex_buffer);
        context.bufferData(context.ARRAY_BUFFER, grid_positions, context.DYNAMIC_DRAW);

        this.grid_color_buffer = context.createBuffer();
        this.point_vertex_buffer = context.createBuffer();
        this.point_color_buffer = context.createBuffer();

        let num_obstacle_segments = this.num_obstacle_segments;
        let obstacle_indices = new Uint16Array(3 * this.num_obstacle_segments);
        let obstacle_vertices = new Float32Array(2 * this.num_obstacle_segments + 2);

        obstacle_vertices[0] = 0.0;
        obstacle_vertices[1] = 0.0;
        let delta_phi = 2.0 * Math.PI / num_obstacle_segments;
        for (let i = 0, index = 2; i < num_obstacle_segments; i++) {
            obstacle_vertices[index++] = Math.cos(i * delta_phi);
            obstacle_vertices[index++] = Math.sin(i * delta_phi);
        }
        this.obstacle_vertex_buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, this.obstacle_vertex_buffer);
        context.bufferData(context.ARRAY_BUFFER, obstacle_vertices, context.STATIC_DRAW);

        for (let i = 0, index = 0; i < num_obstacle_segments; i++) {
            obstacle_indices[index++] = 0;
            obstacle_indices[index++] = i + 1;
            obstacle_indices[index++] = i + 2;
        }
        obstacle_indices[obstacle_indices.length - 1] = 1;
        this.obstacle_index_buffer = context.createBuffer();
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.obstacle_index_buffer);
        context.bufferData(context.ELEMENT_ARRAY_BUFFER, obstacle_indices, context.STATIC_DRAW);

        context.bindBuffer(context.ARRAY_BUFFER, null);
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, null);
    }

    update(delta_time)
    {
        this._reset();
        this._integrate(delta_time);
        if (this.separate_particles) this._collide_with_each_other();
        this._collide_with_obstacle();
        this._collide_with_wall();
        this._transfer_velocity_to_grids();
        this._apply_imcompressibility(delta_time);
        this._transfer_velocity_to_particles();
    }

    render(canvas)
    {
        let context = canvas.context;

        context.clearColor(0.0, 0.0, 0.0, 1.0);
        context.clear(context.COLOR_BUFFER_BIT);

        context.viewport(0, 0, context.canvas.width, context.canvas.height);

        let plotting_scale = canvas.plotting_scale;
        if (this.show_grids) this._render_grids(context, plotting_scale);
        if (this.show_particles) this._render_particles(context, plotting_scale);
        if (this.show_obstacle) this._render_obstacle(context, plotting_scale);
    }

    _reset()
    {
        this.x_weights.set(this.default_x_weights);
        this.y_weights.set(this.default_y_weights);
    }

    _integrate(delta_time)
    {
        let particles = this.particles;
        let positions = particles.positions;
        let velocities = particles.velocities;
        let x_delta_velocity = this.acceleration.x * delta_time;
        let y_delta_velocity = this.acceleration.y * delta_time;
        for (let i = 0; i < positions.length; i += 2) {
            let j = i + 1;
            velocities[i] += x_delta_velocity;
            velocities[j] += y_delta_velocity;
            positions[i] += velocities[i] * delta_time;
            positions[j] += velocities[j] * delta_time;
        }
    }

    _collide_with_each_other()
    {
        let grid_size = this.grid_size;
        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);
        let inverse_grid_length = 1.0 / this.grid_length;
        let particles = this.particles;
        let positions = particles.positions;
        let indices = particles.search_indices;
        let offsets = particles.search_offsets;
        let grid_positions = particles.search_grid_positions;
        offsets.fill(0);
        for (let i = 0; i < positions.length; i += 2) {
            let j = i + 1;
            let grid_x = Math.min(Math.max(Math.floor(positions[i] * inverse_grid_length), grid_min.x), grid_max.x);
            let grid_y = Math.min(Math.max(Math.floor(positions[j] * inverse_grid_length), grid_min.y), grid_max.y);
            grid_positions[i] = grid_x;
            grid_positions[j] = grid_y;
            let grid_index = grid_x + grid_size.x * grid_y;
            offsets[grid_index]++;
        }
        let partial_sum = 0;
        for (let i = 0; i < offsets.length; i++) {
            partial_sum += offsets[i];
            offsets[i] = partial_sum;
        }
        for (let k = 0; k < indices.length; k++) {
            let i = k * 2;
            let j = i + 1;
            let grid_x = grid_positions[i];
            let grid_y = grid_positions[j];
            let grid_index = grid_x + grid_y * grid_size.x;
            let index = --offsets[grid_index];
            indices[index] = i;
        }

        let colors = particles.colors;
        let diffusion = particles.diffusion;
        let min_distance = 2.0 * particles.radius;
        let min_distance_squared = min_distance * min_distance;
        for (let s = 0; s < this.num_collision_substeps; s++) {
            for (let i = 0; i < positions.length; i += 2) {
                let j = i + 1;
                let x_0 = positions[i];
                let y_0 = positions[j];
                let grid_x = grid_positions[i];
                let grid_y = grid_positions[j];
                let grid_min_x = Math.max(grid_x - 1, grid_min.x);
                let grid_max_x = Math.min(grid_x + 1, grid_max.x);
                let grid_min_y = Math.max(grid_y - 1, grid_min.y);
                let grid_max_y = Math.min(grid_y + 1, grid_max.y);
                for (let k = grid_min_x; k <= grid_max_x; k++) {
                    for (let l = grid_min_y; l <= grid_max_y; l++) {
                        let grid_index = k + l * grid_size.x;
                        let start = offsets[grid_index++];
                        for (let o = start; o < offsets[grid_index]; o++) {
                            let m = indices[o];
                            let n = m + 1;
                            let x_1 = positions[m];
                            let y_1 = positions[n];
                            let delta_x = x_1 - x_0;
                            let delta_y = y_1 - y_0;
                            let distance_squared = delta_x * delta_x + delta_y * delta_y;
                            if (distance_squared > 0.0 && distance_squared <= min_distance_squared) {
                                let distance = Math.sqrt(distance_squared);
                                let direction_x = delta_x / distance;
                                let direction_y = delta_y / distance;

                                let correction = (min_distance - distance) * 0.5;
                                let correction_x = correction * direction_x;
                                let correction_y = correction * direction_y;
                                positions[i] -= correction_x;
                                positions[j] -= correction_y;
                                positions[m] += correction_x;
                                positions[n] += correction_y;

                                let color_index_0 = i / 2;
                                let color_index_1 = m / 2;
                                for (let c = 0; c < 3; c++) {
                                    let color_0 = colors[color_index_0 + c];
                                    let color_1 = colors[color_index_1 + c];
                                    let color = (color_0 + color_1) / 2;
                                    colors[color_index_0 + c] = color_0 + (color - color_0) * diffusion;
                                    colors[color_index_1 + c] = color_1 + (color - color_1) * diffusion;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    _collide_with_obstacle()
    {
        let obstacle = this.obstacle;
        let min_distance = obstacle.radius;
        let min_distance_squared = min_distance * min_distance;
        let obstacle_position = obstacle.position;
        let obstacle_velocity = obstacle.velocity;
        let particles = this.particles;
        let positions = particles.positions;
        let velocities = particles.velocities;
        for (let i = 0; i < positions.length; i += 2) {
            let j = i + 1;
            let delta_x = positions[i] - obstacle_position.x;
            let delta_y = positions[j] - obstacle_position.y;
            let distance_squared = delta_x * delta_x + delta_y * delta_y;
            if (distance_squared >= 0.0 && distance_squared <= min_distance_squared) {
                velocities[i] = obstacle_velocity.x;
                velocities[j] = obstacle_velocity.y;
            }
        }
        obstacle_velocity.set_components(0.0, 0.0);
    }

    _collide_with_wall()
    {
        let world_min = this.world_min;
        let world_max = this.world_max;
        let particles = this.particles;
        let positions = particles.positions;
        let velocities = particles.velocities;
        let compensation = this.compensation;
        for (let i = 0; i < positions.length; i += 2) {
            let j = i + 1;
            if (false) {}
            else if (positions[i] < world_min.x) {
                positions[i] = world_min.x;
                velocities[i] = compensation * +Math.abs(velocities[i]);
            }
            else if (positions[i] > world_max.x) {
                positions[i] = world_max.x;
                velocities[i] = compensation * -Math.abs(velocities[i]);
            }
            if (false) {}
            else if (positions[j] < world_min.y) {
                positions[j] = world_min.y;
                velocities[j] = compensation * +Math.abs(velocities[j]);
            }
            else if (positions[j] > world_max.y) {
                positions[j] = world_max.y;
                velocities[j] = compensation * -Math.abs(velocities[j]);
            }
        }
    }

    _transfer_velocity_to_grids()
    {
        let grid_size = this.grid_size;
        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);
        let inverse_grid_length = 1.0 / this.grid_length;
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;
        let decompose_x_weights = this.decompose_x_weights;
        let decompose_y_weights = this.decompose_y_weights;
        let num_particles_of_grids = this.num_particles_of_grids;
        let particles = this.particles;
        let positions = particles.positions;
        let velocities = particles.velocities;
        this.x_velocities.fill(0.0);
        this.y_velocities.fill(0.0);
        this.decompose_x_weights.fill(0.0);
        this.decompose_y_weights.fill(0.0);
        this.num_particles_of_grids.fill(0.0);
        for (let k = 0; k < positions.length; k += 2) {
            let l = k + 1;
            let x_grid_position = Math.min(Math.max(positions[k] * inverse_grid_length, grid_min.x), grid_max.x);
            let y_grid_position = Math.min(Math.max(positions[l] * inverse_grid_length, grid_min.y), grid_max.y);
            let i = Math.floor(x_grid_position);
            let j = Math.floor(y_grid_position);
            let s = x_grid_position - i;
            let t = y_grid_position - j;
            if (i == grid_max.x) {
                i--;
                s = 1.0;
            }
            if (j == grid_max.y) {
                j--;
                t = 1.0;
            }
            let one_minus_s = 1.0 - s;
            let one_minus_t = 1.0 - t;
            let weight_00 = one_minus_s * one_minus_t;
            let weight_10 =           s * one_minus_t;
            let weight_01 = one_minus_s *           t;
            let weight_11 =           s *           t;

            let index_00 = i + j * grid_size.x;
            let index_10 = index_00 + 1;
            let index_01 = index_00 + grid_size.x;
            let index_11 = index_01 + 1;
            num_particles_of_grids[index_00] += weight_00;
            num_particles_of_grids[index_10] += weight_10;
            num_particles_of_grids[index_01] += weight_01;
            num_particles_of_grids[index_11] += weight_11;

            let index_x_00 = i + j * (grid_size.x + 1);
            let index_x_10 = index_x_00 + 1;
            let index_x_20 = index_x_10 + 1;
            let index_x_01 = index_x_00 + (grid_size.x + 1);
            let index_x_11 = index_x_01 + 1;
            let index_x_21 = index_x_11 + 1;
            let index_y_00 = i + j * grid_size.x;
            let index_y_10 = index_y_00 + 1;
            let index_y_01 = index_y_00 + grid_size.x;
            let index_y_11 = index_y_01 + 1;
            let index_y_02 = index_y_01 + grid_size.x;
            let index_y_12 = index_y_02 + 1;
            let x_velocity = velocities[k];
            let y_velocity = velocities[l]
            let x_velocity_00 = x_velocity * weight_00;
            let x_velocity_10 = x_velocity * weight_10;
            let x_velocity_01 = x_velocity * weight_01;
            let x_velocity_11 = x_velocity * weight_11;
            let y_velocity_00 = y_velocity * weight_00;
            let y_velocity_10 = y_velocity * weight_10;
            let y_velocity_01 = y_velocity * weight_01;
            let y_velocity_11 = y_velocity * weight_11;
            x_velocities[index_x_00] += x_velocity_00;
            x_velocities[index_x_10] += x_velocity_00;
            x_velocities[index_x_10] += x_velocity_10;
            x_velocities[index_x_20] += x_velocity_10;
            x_velocities[index_x_01] += x_velocity_01;
            x_velocities[index_x_11] += x_velocity_01;
            x_velocities[index_x_11] += x_velocity_11;
            x_velocities[index_x_21] += x_velocity_11;
            decompose_x_weights[index_x_00] += weight_00;
            decompose_x_weights[index_x_10] += weight_00;
            decompose_x_weights[index_x_10] += weight_10;
            decompose_x_weights[index_x_20] += weight_10;
            decompose_x_weights[index_x_01] += weight_01;
            decompose_x_weights[index_x_11] += weight_01;
            decompose_x_weights[index_x_11] += weight_11;
            decompose_x_weights[index_x_21] += weight_11;
            y_velocities[index_y_00] += y_velocity_00;
            y_velocities[index_y_01] += y_velocity_00;
            y_velocities[index_y_10] += y_velocity_10;
            y_velocities[index_y_11] += y_velocity_10;
            y_velocities[index_y_01] += y_velocity_01;
            y_velocities[index_y_02] += y_velocity_01;
            y_velocities[index_y_11] += y_velocity_11;
            y_velocities[index_y_12] += y_velocity_11;
            decompose_y_weights[index_y_00] += weight_00;
            decompose_y_weights[index_y_01] += weight_00;
            decompose_y_weights[index_y_10] += weight_10;
            decompose_y_weights[index_y_11] += weight_10;
            decompose_y_weights[index_y_01] += weight_01;
            decompose_y_weights[index_y_02] += weight_01;
            decompose_y_weights[index_y_11] += weight_11;
            decompose_y_weights[index_y_12] += weight_11;
        }
        let x_weights = this.x_weights;
        let y_weights = this.y_weights;
        for (let i = 0; i < grid_size.x; i++) {
            for (let j = 0; j < grid_size.y; j++) {
                let index = i + j * grid_size.x;
                let num_particles_of_grid = num_particles_of_grids[index];
                if (num_particles_of_grid <= 0.0) continue;

                let index_left = i + j * (grid_size.x + 1);
                let index_right = index_left + 1;
                let index_down = i + j * grid_size.x;
                let index_up = index_down + grid_size.x;

                let weight_left = x_weights[index_left];
                let weight_right = x_weights[index_right];
                let weight_down = y_weights[index_down];
                let weight_up = y_weights[index_up];
                if (weight_left == 0) {
                    let sum = weight_down + weight_up;
                    if (sum > 0) {
                        let inverse_sum = 1.0 / sum;
                        let velocity_segment = x_velocities[index_left] * inverse_sum;
                        let decompose_weight_segment = decompose_x_weights[index_left] * inverse_sum;
                        y_velocities[index_down] += weight_down * velocity_segment;
                        decompose_y_weights[index_down] += weight_down * decompose_weight_segment;
                        y_velocities[index_up] -= weight_up * velocity_segment;
                        decompose_y_weights[index_up] -= weight_up * decompose_weight_segment;
                    }
                    x_velocities[index_left] = 0.0;
                    decompose_x_weights[index_left] = 0.0;
                }
                if (weight_right == 0) {
                    let sum = weight_down + weight_up;
                    if (sum > 0) {
                        let inverse_sum = 1.0 / sum;
                        let velocity_segment = x_velocities[index_right] * inverse_sum;
                        let decompose_weight_segment = decompose_x_weights[index_right] * inverse_sum;
                        y_velocities[index_down] -= weight_down * velocity_segment;
                        decompose_y_weights[index_down] -= weight_down * decompose_weight_segment;
                        y_velocities[index_up] += weight_up * velocity_segment;
                        decompose_y_weights[index_up] += weight_up * decompose_weight_segment;
                    }
                    x_velocities[index_right] = 0.0;
                    decompose_x_weights[index_right] = 0.0;
                }
                if (weight_down == 0) {
                    let sum = weight_left + weight_right;
                    if (sum > 0) {
                        let inverse_sum = 1.0 / sum;
                        let velocity_segment = y_velocities[index_down] * inverse_sum;
                        let decompose_weight_segment = decompose_y_weights[index_down] * inverse_sum;
                        x_velocities[index_left] += weight_left * velocity_segment;
                        decompose_x_weights[index_left] += weight_left * decompose_weight_segment;
                        x_velocities[index_right] -= weight_right * velocity_segment;
                        decompose_x_weights[index_right] -= weight_right * decompose_weight_segment;
                    }
                    y_velocities[index_down] = 0.0;
                    decompose_y_weights[index_down] = 0.0;
                }
                if (weight_up == 0) {
                    let sum = weight_left + weight_right;
                    if (sum > 0) {
                        let inverse_sum = 1.0 / sum;
                        let velocity_segment = y_velocities[index_up] * inverse_sum;
                        let decompose_weight_segment = decompose_y_weights[index_up] * inverse_sum;
                        x_velocities[index_left] -= weight_left * velocity_segment;
                        decompose_x_weights[index_left] -= weight_left * decompose_weight_segment;
                        x_velocities[index_right] += weight_right * velocity_segment;
                        decompose_x_weights[index_right] += weight_right * decompose_weight_segment;
                    }
                    y_velocities[index_up] = 0.0;
                    decompose_y_weights[index_up] = 0.0;
                }
            }
        }
        for (let i = 0; i < x_velocities.length; i++) {
            if (decompose_x_weights[i] > 0.0) {
                x_velocities[i] /= decompose_x_weights[i];
            }
        }
        for (let i = 0; i < y_velocities.length; i++) {
            if (decompose_y_weights[i] > 0.0) {
                y_velocities[i] /= decompose_y_weights[i];
            }
        }
    }

    _apply_imcompressibility(delta_time)
    {
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;
        let old_x_velocities = this.old_x_velocities;
        let old_y_velocities = this.old_y_velocities;
        old_x_velocities.set(x_velocities);
        old_y_velocities.set(y_velocities);

        let stiffness = (this.compensate_drift ? this.stiffness : 0.0);
        let imcompressibility_scaling = this.imcompressibility_scaling;
        let grid_size = this.grid_size;
        let grid_length = this.grid_length;
        let num_particles_of_grids = this.num_particles_of_grids;
        let grid_density = this.particles.grid_density;
        let unit_pressure = grid_density * grid_length / delta_time;
        let pressures = this.pressures;
        let x_weights = this.x_weights;
        let y_weights = this.y_weights;
        let num_imcompressibility_substeps = this.num_imcompressibility_substeps;
        pressures.fill(0.0);
        for (let s = 0; s < num_imcompressibility_substeps; s++) {
            for (let i = 0; i < grid_size.x; i++) {
                for (let j = 0; j < grid_size.y; j++) {
                    let index = i + j * grid_size.x;
                    let num_particles_of_grid = num_particles_of_grids[index];
                    if (num_particles_of_grid <= 0.0) continue;

                    let index_left = i + j * (grid_size.x + 1);
                    let index_right = index_left + 1;
                    let index_down = i + j * grid_size.x;
                    let index_up = index_down + grid_size.x;

                    let weight_left = x_weights[index_left];
                    let weight_right = x_weights[index_right];
                    let weight_down = y_weights[index_down];
                    let weight_up = y_weights[index_up];
                    let weight_sum = weight_left + weight_right + weight_down + weight_up;
                    if (weight_sum <= 0) continue;

                    let inflow = x_velocities[index_left] - x_velocities[index_right] + y_velocities[index_down] - y_velocities[index_up];
                    let overcrowding = Math.min(Math.max(num_particles_of_grid - grid_density, 0.0), grid_density) / grid_density;
                    let average_inflow = imcompressibility_scaling * (inflow + stiffness * overcrowding) / weight_sum;
                    x_velocities[index_left]  -= weight_left  * average_inflow;
                    x_velocities[index_right] += weight_right * average_inflow;
                    y_velocities[index_down]  -= weight_down  * average_inflow;
                    y_velocities[index_up]    += weight_up    * average_inflow;

                    pressures[index] += average_inflow * unit_pressure;
                }
            }
        }
    }

    _transfer_velocity_to_particles()
    {
        let grid_size = this.grid_size;
        let x_weights = this.x_weights;
        let y_weights = this.y_weights;
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;
        let old_x_velocities = this.old_x_velocities;
        let old_y_velocities = this.old_y_velocities;
        let grid_velocities = this.grid_velocities;
        let old_grid_velocities = this.old_grid_velocities;
        for (let i = 0; i < grid_size.x; i++) {
            for (let j = 0; j < grid_size.y; j++) {
                let index_left = i + j * (grid_size.x + 1);
                let index_right = index_left + 1;
                let index_down = i + j * grid_size.x;
                let index_up = index_down + grid_size.x;

                let weight_left = x_weights[index_left];
                let weight_right = x_weights[index_right];
                let weight_down = y_weights[index_down];
                let weight_up = y_weights[index_up];
                let velocity_left = x_velocities[index_left];
                let velocity_right = x_velocities[index_right];
                let velocity_down = y_velocities[index_down];
                let velocity_up = y_velocities[index_up];
                let old_velocity_left = old_x_velocities[index_left];
                let old_velocity_right = old_x_velocities[index_right];
                let old_velocity_down = old_y_velocities[index_down];
                let old_velocity_up = old_y_velocities[index_up];

                let index = i + j * grid_size.x;
                let k = index * 2;
                let l = k + 1;
                let x_weight_sum = weight_left + weight_right;
                let y_weight_sum = weight_down + weight_up;
                let x_weight_sum_inverse = (x_weight_sum > 0 ? 1.0 / x_weight_sum : 0.0);
                let y_weight_sum_inverse = (y_weight_sum > 0 ? 1.0 / y_weight_sum : 0.0);
                grid_velocities[k] = (weight_left * velocity_left + weight_right * velocity_right) * x_weight_sum_inverse;
                grid_velocities[l] = (weight_down * velocity_down + weight_up * velocity_up) * y_weight_sum_inverse;
                old_grid_velocities[k] = (weight_left * old_velocity_left + weight_right * old_velocity_right) * x_weight_sum_inverse;
                old_grid_velocities[l] = (weight_down * old_velocity_down + weight_up * old_velocity_up) * y_weight_sum_inverse;
            }
        }

        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);
        let inverse_grid_length = 1.0 / this.grid_length;
        let particles = this.particles;
        let positions = particles.positions;
        let velocities = particles.velocities;
        let method_mix_ratio = this.method_mix_ratio;
        let one_minus_method_mix_ratio = 1.0 - method_mix_ratio;
        for (let k = 0; k < positions.length; k += 2) {
            let l = k + 1;
            let x_grid_position = Math.min(Math.max(positions[k] * inverse_grid_length, grid_min.x), grid_max.x);
            let y_grid_position = Math.min(Math.max(positions[l] * inverse_grid_length, grid_min.y), grid_max.y);
            let i = Math.floor(x_grid_position);
            let j = Math.floor(y_grid_position);
            let s = x_grid_position - i;
            let t = y_grid_position - j;
            if (i == grid_max.x) {
                i--;
                s = 1.0;
            }
            if (j == grid_max.y) {
                j--;
                t = 1.0;
            }
            let one_minus_s = 1.0 - s;
            let one_minus_t = 1.0 - t;
            let weight_00 = one_minus_s * one_minus_t;
            let weight_10 =           s * one_minus_t;
            let weight_01 = one_minus_s *           t;
            let weight_11 =           s *           t;

            let index_00 = i + j * grid_size.x;
            let index_10 = index_00 + 1;
            let index_01 = index_00 + grid_size.x;
            let index_11 = index_01 + 1;
            let index_x_00 = index_00 * 2;
            let index_x_10 = index_10 * 2;
            let index_x_01 = index_01 * 2;
            let index_x_11 = index_11 * 2;
            let index_y_00 = index_x_00 + 1;
            let index_y_10 = index_x_10 + 1;
            let index_y_01 = index_x_01 + 1;
            let index_y_11 = index_x_11 + 1;
            let grid_velocity_x_00 = grid_velocities[index_x_00];
            let grid_velocity_x_10 = grid_velocities[index_x_10];
            let grid_velocity_x_01 = grid_velocities[index_x_01];
            let grid_velocity_x_11 = grid_velocities[index_x_11];
            let grid_velocity_y_00 = grid_velocities[index_y_00];
            let grid_velocity_y_10 = grid_velocities[index_y_10];
            let grid_velocity_y_01 = grid_velocities[index_y_01];
            let grid_velocity_y_11 = grid_velocities[index_y_11];
            let old_grid_velocity_x_00 = old_grid_velocities[index_x_00];
            let old_grid_velocity_x_10 = old_grid_velocities[index_x_10];
            let old_grid_velocity_x_01 = old_grid_velocities[index_x_01];
            let old_grid_velocity_x_11 = old_grid_velocities[index_x_11];
            let old_grid_velocity_y_00 = old_grid_velocities[index_y_00];
            let old_grid_velocity_y_10 = old_grid_velocities[index_y_10];
            let old_grid_velocity_y_01 = old_grid_velocities[index_y_01];
            let old_grid_velocity_y_11 = old_grid_velocities[index_y_11];

            // PIC method.
            let x_pic_velocity = (
                0.0
                + weight_00 * grid_velocity_x_00
                + weight_10 * grid_velocity_x_10
                + weight_01 * grid_velocity_x_01
                + weight_11 * grid_velocity_x_11
            );
            let y_pic_velocity = (
                0.0
                + weight_00 * grid_velocity_y_00
                + weight_10 * grid_velocity_y_10
                + weight_01 * grid_velocity_y_01
                + weight_11 * grid_velocity_y_11
            );

            // FLIP method.
            let old_x_pic_velocity = (
                0.0
                + weight_00 * old_grid_velocity_x_00
                + weight_10 * old_grid_velocity_x_10
                + weight_01 * old_grid_velocity_x_01
                + weight_11 * old_grid_velocity_x_11
            );
            let old_y_pic_velocity = (
                0.0
                + weight_00 * old_grid_velocity_y_00
                + weight_10 * old_grid_velocity_y_10
                + weight_01 * old_grid_velocity_y_01
                + weight_11 * old_grid_velocity_y_11
            );
            let x_flip_velocity = velocities[k] + (x_pic_velocity - old_x_pic_velocity);
            let y_flip_velocity = velocities[l] + (y_pic_velocity - old_y_pic_velocity);

            // Mix methods' results.
            velocities[k] = one_minus_method_mix_ratio * x_pic_velocity + method_mix_ratio * x_flip_velocity;
            velocities[l] = one_minus_method_mix_ratio * y_pic_velocity + method_mix_ratio * y_flip_velocity;
        }
    }

    _type_to_string(context, type)
    {
        switch (type) {
            case context.VERTEX_SHADER: return "vertex shader";
            case context.FRAGMENT_SHADER: return "fragment shader";

            default: {
                console.log("Cannot convert type to string, unknown type: ", type);
                return "";
            }
        }
    }

    _load_shader(context, type, source)
    {
        let shader = context.createShader(type);
        context.shaderSource(shader, source);
        context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            console.log("Failed to compile ", this._type_to_string(context, type), ", error: ", context.getShaderInfoLog(shader));
        }
        return shader;
    }

    _load_shading_program(context, vertex_shader_source, fragment_shader_source)
    {
        let vertex_shader = this._load_shader(context, context.VERTEX_SHADER, vertex_shader_source);
        let fragment_shader = this._load_shader(context, context.FRAGMENT_SHADER, fragment_shader_source);
        let program = context.createProgram();
        context.attachShader(program, vertex_shader);
        context.attachShader(program, fragment_shader);
        context.linkProgram(program);
        return program;
    }

    _set_uniform(context, program, name, size, a, b, c, d)
    {
        switch (size) {
            case 1: context.uniform1f(context.getUniformLocation(program, name), a); return;
            case 2: context.uniform2f(context.getUniformLocation(program, name), a, b); return;
            case 3: context.uniform3f(context.getUniformLocation(program, name), a, b, c); return;
            case 4: context.uniform4f(context.getUniformLocation(program, name), a, b, c, d); return;

            default: {
                console.log("Unsupported uniform size: ", size);
                return;
            }
        }
    }

    _render_grids(context, plotting_scale)
    {
        context.clearDepth(1.0);
        context.clear(context.DEPTH_BUFFER_BIT);

        let program = this.point_shading_program;
        context.useProgram(program);

        let world_size = plotting_scale.world_size;
        this._set_uniform(context, program, "world_to_clip", 4, 2.0 / world_size.x, 2.0 / world_size.y, -1.0, -1.0);
        this._set_uniform(context, program, "point_size", 1, 0.95 * this.grid_length * plotting_scale.scale);
        this._set_uniform(context, program, "point_shape", 1, 0.0);

        context.bindBuffer(context.ARRAY_BUFFER, this.grid_vertex_buffer);
        let position_attribute_location = context.getAttribLocation(program, "in_position");
        context.enableVertexAttribArray(position_attribute_location);
        context.vertexAttribPointer(position_attribute_location, 2, context.FLOAT, false, 0, 0);

        let pressures = this.pressures;
        let num_particles_of_grids = this.num_particles_of_grids;
        let min_pressure = +Infinity;
        let max_pressure = -Infinity;
        for (let i = 0; i < pressures.length; i++) {
            if (num_particles_of_grids[i] <= 0) continue;

            let pressure = pressures[i];
            min_pressure = Math.min(pressure, min_pressure);
            max_pressure = Math.max(pressure, max_pressure);
        }
        let grid_size = this.grid_size;
        let grid_colors = this.grid_colors;
        for (let i = 0; i < grid_size.x; i++) {
            for (let j = 0; j < grid_size.y; j++) {
                let index = i + j * grid_size.x;
                if (num_particles_of_grids[index] <= 0) {
                    index *= 3;
                    grid_colors[index++] = 0.0;
                    grid_colors[index++] = 0.0;
                    grid_colors[index++] = 0.0;
                } else {
                    let color = this._value_to_sci_color(pressures[index], min_pressure, max_pressure);
                    index *= 3;
                    grid_colors[index++] = color[0];
                    grid_colors[index++] = color[1];
                    grid_colors[index++] = color[2];
                }
            }
        }

        context.bindBuffer(context.ARRAY_BUFFER, this.grid_color_buffer);
        context.bufferData(context.ARRAY_BUFFER, grid_colors, context.DYNAMIC_DRAW);
        let color_attribute_location = context.getAttribLocation(program, "in_color");
        context.enableVertexAttribArray(color_attribute_location);
        context.vertexAttribPointer(color_attribute_location, 3, context.FLOAT, false, 0, 0);

        context.drawArrays(context.POINTS, 0, this.num_grids);

        context.disableVertexAttribArray(position_attribute_location);
        context.disableVertexAttribArray(color_attribute_location);
        context.bindBuffer(context.ARRAY_BUFFER, null);
    }

    _render_particles(context, plotting_scale)
    {
        context.clearDepth(1.0);
        context.clear(context.DEPTH_BUFFER_BIT);

        let program = this.point_shading_program;
        context.useProgram(program);

        let particles = this.particles;
        let world_size = plotting_scale.world_size;
        this._set_uniform(context, program, "world_to_clip", 4, 2.0 / world_size.x, 2.0 / world_size.y, -1.0, -1.0);
        this._set_uniform(context, program, "point_size", 1, 2.0 * particles.radius * plotting_scale.scale);
        this._set_uniform(context, program, "point_shape", 1, 1.0);

        context.bindBuffer(context.ARRAY_BUFFER, this.point_vertex_buffer);
        context.bufferData(context.ARRAY_BUFFER, particles.positions, context.DYNAMIC_DRAW);
        let position_attribute_location = context.getAttribLocation(program, "in_position");
        context.enableVertexAttribArray(position_attribute_location);
        context.vertexAttribPointer(position_attribute_location, 2, context.FLOAT, false, 0, 0);

        this._dye_particles();

        context.bindBuffer(context.ARRAY_BUFFER, this.point_color_buffer);
        context.bufferData(context.ARRAY_BUFFER, particles.colors, context.DYNAMIC_DRAW);
        let color_attribute_location = context.getAttribLocation(program, "in_color");
        context.enableVertexAttribArray(color_attribute_location);
        context.vertexAttribPointer(color_attribute_location, 3, context.FLOAT, false, 0, 0);

        context.drawArrays(context.POINTS, 0, particles.num_particles);

        context.disableVertexAttribArray(position_attribute_location);
        context.disableVertexAttribArray(color_attribute_location);
        context.bindBuffer(context.ARRAY_BUFFER, null);
    }

    _dye_particles()
    {
        let grid_size = this.grid_size;
        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);
        let inverse_grid_length = 1.0 / this.grid_length;
        let particles = this.particles;
        let grid_density = particles.grid_density;
        let positions = particles.positions;
        let colors = particles.colors;
        let num_particles = particles.num_particles;
        let inverse_grid_density = 1.0 / grid_density;
        let num_particles_of_grids = this.num_particles_of_grids;
        let blue_step = 0.01;
        let white_threshold = 0.7;
        let white_color = 0.8;
        for (let p = 0; p < num_particles; p++) {
            let c = p * 3;
            let d = c + 1;
            let e = d + 1;
            colors[c] = Math.min(Math.max(colors[c] - blue_step, 0.0), 1.0);
            colors[d] = Math.min(Math.max(colors[d] - blue_step, 0.0), 1.0);
            colors[e] = Math.min(Math.max(colors[e] + blue_step, 0.0), 1.0);

            let k = p * 2;
            let l = k + 1;
            let x_grid_position = Math.min(Math.max(positions[k] * inverse_grid_length, grid_min.x), grid_max.x);
            let y_grid_position = Math.min(Math.max(positions[l] * inverse_grid_length, grid_min.y), grid_max.y);
            let i = Math.floor(x_grid_position);
            let j = Math.floor(y_grid_position);
            let index = i + j * grid_size.x;
            let relative_density = num_particles_of_grids[index] * inverse_grid_density;
            if (relative_density < white_threshold) {
                colors[c] = white_color;
                colors[d] = white_color;
                colors[e] = 1.0;
            }
        }
    }

    _render_obstacle(context, plotting_scale)
    {
        context.clearDepth(1.0);
        context.clear(context.DEPTH_BUFFER_BIT);

        let program = this.mesh_shading_program;
        context.useProgram(program);

        let obstacle = this.obstacle;
        let world_size = plotting_scale.world_size;
        this._set_uniform(context, program, "color", 3, 1.0, 0.0, 0.0);
        this._set_uniform(context, program, "local_to_world", 4, obstacle.radius, obstacle.radius, obstacle.position.x, obstacle.position.y);
        this._set_uniform(context, program, "world_to_clip", 4, 2.0 / world_size.x, 2.0 / world_size.y, -1.0, -1.0);

        let position_attribute_location = context.getAttribLocation(program, "in_position");
        context.enableVertexAttribArray(position_attribute_location);
        context.bindBuffer(context.ARRAY_BUFFER, this.obstacle_vertex_buffer);
        context.vertexAttribPointer(position_attribute_location, 2, context.FLOAT, false, 0, 0);

        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.obstacle_index_buffer);
        context.drawElements(context.TRIANGLES, 3 * this.num_obstacle_segments, context.UNSIGNED_SHORT, 0);

        context.disableVertexAttribArray(position_attribute_location);
        context.bindBuffer(context.ARRAY_BUFFER, null);
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, null);
    }

    _value_to_sci_color(value, min, max)
    {
        value = Math.min(Math.max(value, min), max);
        let range = max - min;
        let normalized_value = (range == 0.0 ? 0.5 : (value - min) / range);
        let discretized_value = normalized_value / 0.25;
        let level = Math.floor(discretized_value);
        let score = discretized_value - level;

        let r = 0.0;
        let g = 0.0;
        let b = 0.0;
        switch (level) {
            case 0: r = 0.0;   g = score;       b = 1.0;         break;
            case 1: r = 0.0;   g = 1.0;         b = 1.0 - score; break;
            case 2: r = score; g = 1.0;         b = 0.0;         break;
            case 3: r = 1.0;   g = 1.0 - score; b = 0.0;         break;
            case 4: r = 1.0;   g = 0.0;         b = 0.0;         break;
            default: console.log("Bad sci color conversion: (", value, ", ", min, ", ", max, ")");
        }

        return [r, g, b];
    }
};

