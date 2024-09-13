class Euler_Fluid_Config
{
    constructor()
    {
        this.density = 1.0;

        this.grid_size = Vector2.from_components();
        this.grid_length = 1.0;
        this.relexation = 0.9;

        this.default_x_weights = undefined;
        this.default_y_weights = undefined;
        this.default_grid_weights = undefined;

        this.initial_smokes = undefined;
        this.initial_x_velocities = undefined;
        this.initial_y_velocities = undefined;

        this.obstacle_smoke = 1.0;
        this.dynamic_obstacle_smoke = false;
        this.enable_obstacle_overlap_smoke = false;

        this.show_smoke = false;
        this.colorful_smoke = false;

        this.show_pressure = false;

        this.show_velocity = false;
        this.velocity_line_width = 0.001;
        this.velocity_line_step_length = 0.02;

        this.show_streamline = false;
        this.streamline_gap = 5;
        this.streamline_width = 0.001;
        this.num_streamline_segments = 15;
        this.streamline_step_length = 0.01;

        this.mode = "tank";
    }
};

class Euler_Fluid
{
    constructor()
    {
        this.config = undefined;

        this.x_weights = undefined;
        this.y_weights = undefined;
        this.x_velocities = undefined;
        this.y_velocities = undefined;
        this.acceleration = undefined;

        this.num_grids = undefined;
        this.smokes = undefined;
        this.pressures = undefined;

        this.obstacles = undefined;

        this.scratch = undefined;
    }

    static from(config = new Euler_Fluid_Config())
    {

        let result = new Euler_Fluid();

        config.grid_size.x = Math.max(config.grid_size.x, 0);
        config.grid_size.y = Math.max(config.grid_size.y, 0);
        config.relexation = Math.max(Math.min(config.relexation, 1.0), 0.0);
        result.config = config;

        let grid_size = config.grid_size;
        result.x_weights = new Uint8Array((grid_size.x + 1) * grid_size.y);
        result.y_weights = new Uint8Array(grid_size.x * (grid_size.y + 1));
        if (config.default_x_weights == undefined) {
            config.default_x_weights = new Uint8Array(result.x_weights.length);
            config.default_x_weights.fill(1);
        }
        if (config.default_y_weights == undefined) {
            config.default_y_weights = new Uint8Array(result.y_weights.length);
            config.default_y_weights.fill(1);
        }
        result.num_grids = grid_size.x * grid_size.y;
        result.grid_weights = new Uint8Array(result.num_grids);
        if (config.default_grid_weights == undefined) {
            config.default_grid_weights = new Uint8Array(result.grid_weights.length);
            config.default_grid_weights.fill(1);
        }
        result._reset_weights();

        result.smokes = new Float32Array(result.num_grids);
        if (config.initial_smokes != undefined) result.smokes.set(config.initial_smokes);

        result.acceleration = Vector2.from_components();
        result.x_velocities = new Float32Array(result.x_weights.length);
        result.y_velocities = new Float32Array(result.y_weights.length);
        if (config.initial_x_velocities != undefined) result.x_velocities.set(config.initial_x_velocities);
        if (config.initial_y_velocities != undefined) result.y_velocities.set(config.initial_y_velocities);

        result.pressures = new Float32Array(result.num_grids);

        result.obstacles = [];

        result.scratch = {};
        result.scratch.next_smokes = new Float32Array(result.smokes.length);
        result.scratch.next_x_velocities = new Float32Array(result.x_velocities.length);
        result.scratch.next_y_velocities = new Float32Array(result.y_velocities.length);

        return result;
    }

    prepare(delta_time)
    {
        this._apply_acceleration(delta_time);

        this._reset_weights();
        let obstacles = this.obstacles;
        for (let i = 0; i < obstacles.length; i++) this._apply_obstacle(obstacles[i]);

        this.pressures.fill(0.0);
    }

    apply(delta_time)
    {
        this._apply_imcompressibility(delta_time);
    }

    finalize(delta_time)
    {
        this._apply_advection(delta_time);
    }

    render(canvas)
    {
        this._render_grid(canvas);
        this._render_velocity(canvas);
        this._render_streamline(canvas);
    }

    _reset_weights()
    {
        let config = this.config;
        this.x_weights.set(config.default_x_weights);
        this.y_weights.set(config.default_y_weights);
        this.grid_weights.set(config.default_grid_weights);
    }

    _apply_obstacle(obstacle)
    {
        let config = this.config;
        let grid_size = config.grid_size;

        let grid_length = config.grid_length;
        let radius = obstacle.body.radius - grid_length;
        let radius_squared = radius * radius;
        let center = obstacle.body.center;
        let velocity = obstacle.velocity;
        let x_weights = this.x_weights;
        let y_weights = this.y_weights;
        let grid_weights = this.grid_weights;
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;
        let smokes = this.smokes;
        let obstacle_smoke = config.obstacle_smoke;
        for (let i = 0; i < grid_size.x; i++) {
            for (let j = 0; j < grid_size.y; j++) {
                let particle_position = Vector2.from_components(i + 0.5, j + 0.5).scale(grid_length);
                let distance_squared = particle_position.distance_squared_from(center);
                if (distance_squared < radius_squared) {
                    let index_left = i + j * (grid_size.x + 1);
                    let index_right = index_left + 1;
                    let index_down = i + j * grid_size.x;
                    let index_up = index_down + grid_size.x;

                    let weight_left = x_weights[index_left];
                    let weight_right = x_weights[index_right];
                    let weight_down = y_weights[index_down];
                    let weight_up = y_weights[index_up];
                    x_velocities[index_left] = velocity.x * weight_left + x_velocities[index_left] * (1 - weight_left);
                    x_velocities[index_right] = velocity.x * weight_right + x_velocities[index_right] * (1 - weight_right);
                    y_velocities[index_down] = velocity.y * weight_down + y_velocities[index_down] * (1 - weight_down);
                    y_velocities[index_up] = velocity.y * weight_up + y_velocities[index_up] * (1 - weight_up);

                    x_weights[index_left] = 0;
                    x_weights[index_right] = 0;
                    y_weights[index_down] = 0;
                    y_weights[index_up] = 0;

                    let index = i + j * grid_size.x;
                    if (config.enable_obstacle_overlap_smoke) {
                        let weight = grid_weights[index];
                        smokes[index] = obstacle_smoke * weight + smokes[index] * (1 - weight);
                    }
                    grid_weights[index] = 0;
                }
            }
        }
        config.enable_obstacle_overlap_smoke = false;
    }

    _apply_acceleration(delta_time)
    {
        let acceleration = this.acceleration;
        let x_weights = this.x_weights
        let x_velocities = this.x_velocities;
        let delta_x_velocity = acceleration.x * delta_time;
        for (let i = 0; i < x_velocities.length; i++) {
            x_velocities[i] += delta_x_velocity * x_weights[i];
        }
        let y_weights = this.y_weights
        let y_velocities = this.y_velocities;
        let delta_y_velocity = acceleration.y * delta_time;
        for (let i = 0; i < y_velocities.length; i++) {
            y_velocities[i] += delta_y_velocity * y_weights[i];
        }
    }

    _apply_imcompressibility(delta_time)
    {
        let scale = 1.0 + this.config.relexation;
        let density = this.config.density;
        let grid_size = this.config.grid_size;
        let grid_length = this.config.grid_length;
        let x_weights = this.x_weights;
        let y_weights = this.y_weights;
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;

        let pressures = this.pressures;
        let unit_pressure = density * grid_length / delta_time;

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
                let weights_sum = weight_left + weight_right + weight_down + weight_up;
                if (weights_sum == 0) continue;

                let inflow = x_velocities[index_left] - x_velocities[index_right] + y_velocities[index_down] - y_velocities[index_up];
                let average_inflow = scale * inflow / weights_sum;
                x_velocities[index_left] -= average_inflow * weight_left;
                x_velocities[index_right] += average_inflow * weight_right;
                y_velocities[index_down] -= average_inflow * weight_down;
                y_velocities[index_up] += average_inflow * weight_up;

                let index = i + j * grid_size.x;
                pressures[index] += average_inflow * unit_pressure;
            }
        }
    }

    _apply_advection(delta_time)
    {
        let grid_size = this.config.grid_size;
        let grid_length = this.config.grid_length;
        let smokes = this.smokes;
        let x_weights = this.x_weights;
        let y_weights = this.y_weights;
        let grid_weights = this.grid_weights;
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;

        let scratch = this.scratch;
        let next_smokes = scratch.next_smokes;
        let next_x_velocities = scratch.next_x_velocities;
        let next_y_velocities = scratch.next_y_velocities;

        next_x_velocities.fill(0.0);
        next_y_velocities.fill(0.0);
        for (let i = 0; i < grid_size.x; i++) {
            for (let j = 0; j < grid_size.y; j++) {
                let index_left = i + j * (grid_size.x + 1);
                let index_right = index_left + 1;
                let index_down = i + j * grid_size.x;
                let index_up = index_down + grid_size.x;

                let grid_velocity = Vector2.from_components(
                    (x_velocities[index_left] + x_velocities[index_right]) * 0.5 / grid_length,
                    (y_velocities[index_down] + y_velocities[index_up]) * 0.5 / grid_length,
                );
                let grid_position = Vector2.from_components(i, j);
                grid_position.subtract(grid_velocity, delta_time);
                let next_velocity = this._interpolate_velocity(grid_position);

                let index = i + j * grid_size.x;
                let weight = grid_weights[index];
                next_smokes[index] = this._interpolate_smoke(grid_position) * weight + smokes[index] * (1 - weight);

                let weight_left = x_weights[index_left];
                let weight_right = x_weights[index_right];
                let weight_down = y_weights[index_down];
                let weight_up = y_weights[index_up];
                next_x_velocities[index_left] += next_velocity.left * weight_left + x_velocities[index_left] * (1 - weight_left);
                next_x_velocities[index_right] += next_velocity.right * weight_right + x_velocities[index_right] * (1 - weight_right);
                next_y_velocities[index_down] += next_velocity.down * weight_down + y_velocities[index_down] * (1 - weight_down);
                next_y_velocities[index_up] += next_velocity.up * weight_up + y_velocities[index_up] * (1 - weight_up);
            }
        }
        for (let i = 1; i < grid_size.x; i++) {
            let index = i;
            for (let j = 0; j < grid_size.y; j++, index += grid_size.x + 1) {
                next_x_velocities[index] *= 0.5;
            }
        }
        for (let i = 0; i < grid_size.x; i++) {
            let index = i + grid_size.x;
            for (let j = 1; j < grid_size.y; j++, index += grid_size.x) {
                next_y_velocities[index] *= 0.5;
            }
        }

        smokes.set(next_smokes);
        x_velocities.set(next_x_velocities);
        y_velocities.set(next_y_velocities);
    }

    _interpolate_velocity(grid_position)
    {
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;
        let grid_size = this.config.grid_size;
        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);

        grid_position.clamp(grid_min, grid_max);

        let i = Math.floor(grid_position.x);
        let j = Math.floor(grid_position.y);
        let s = grid_position.x - i;
        let t = grid_position.y - j;
        if (i == grid_max.x) {
            i--;
            s = 1.0;
        }
        if (j == grid_max.y) {
            j--;
            t = 1.0;
        }

        let index_x = i + j * (grid_size.x + 1);
        let x_velocity_00 = x_velocities[index_x];
        let x_velocity_10 = x_velocities[index_x + 1];
        let x_velocity_20 = x_velocities[index_x + 2];
        index_x += grid_size.x + 1;
        let x_velocity_01 = x_velocities[index_x];
        let x_velocity_11 = x_velocities[index_x + 1];
        let x_velocity_21 = x_velocities[index_x + 2];

        let index_y = i + j * grid_size.x;
        let y_velocity_00 = y_velocities[index_y];
        let y_velocity_10 = y_velocities[index_y + 1];
        index_y += grid_size.x;
        let y_velocity_01 = y_velocities[index_y];
        let y_velocity_11 = y_velocities[index_y + 1];
        index_y += grid_size.x;
        let y_velocity_02 = y_velocities[index_y];
        let y_velocity_12 = y_velocities[index_y + 1];

        return {
            left:   this._grid_interpolate(x_velocity_00, x_velocity_10, x_velocity_01, x_velocity_11, s, t),
            right:  this._grid_interpolate(x_velocity_10, x_velocity_20, x_velocity_11, x_velocity_21, s, t),
            down:   this._grid_interpolate(y_velocity_00, y_velocity_10, y_velocity_01, y_velocity_11, s, t),
            up:     this._grid_interpolate(y_velocity_01, y_velocity_11, y_velocity_02, y_velocity_12, s, t),
        }
    }

    _interpolate_smoke(grid_position)
    {
        let smokes = this.smokes;
        let grid_size = this.config.grid_size;
        let grid_min = Vector2.from_components();
        let grid_max = Vector2.from_components(grid_size.x - 1, grid_size.y - 1);

        grid_position.clamp(grid_min, grid_max);

        let i = Math.floor(grid_position.x);
        let j = Math.floor(grid_position.y);
        let s = grid_position.x - i;
        let t = grid_position.y - j;
        if (i == grid_max.x) {
            i--;
            s = 1.0;
        }
        if (j == grid_max.y) {
            j--;
            t = 1.0;
        }

        let index = i + j * grid_size.x;
        let smoke_00 = smokes[index];
        let smoke_10 = smokes[index + 1];
        let smoke_01 = smokes[index + grid_size.x];
        let smoke_11 = smokes[index + grid_size.x + 1];

        return this._grid_interpolate(smoke_00, smoke_10, smoke_01, smoke_11, s, t);
    }

    _grid_interpolate(value_00, value_01, value_10, value_11, s, t)
    {
        let one_minus_s = 1.0 - s;
        let one_minus_t = 1.0 - t;
        return one_minus_s * one_minus_t * value_00 + s * one_minus_t * value_01 + one_minus_s * t * value_10 + s * t * value_11;
    }

    _render_grid(canvas)
    {
        let config = this.config;
        if (!config.show_smoke && !config.show_pressure) return;

        let grid_size = config.grid_size;
        let grid_length = config.grid_length;
        let i = 0;
        let j = 0;
        let index = 0;
        let grid_drawer = (color) => {
            let result = {};
            let x = i * grid_length;
            let y = j * grid_length;
            result.point0 = Vector2.from_components(x, y);
            result.point1 = Vector2.from_components(x + grid_length, y + grid_length);
            result.color = color;

            i++;
            index++;
            if (i >= grid_size.x) {
                i = 0;
                j++;
            }

            return result;
        };
        if (config.show_pressure) {
            let pressures = this.pressures;
            let min_pressure = +Infinity;
            let max_pressure = -Infinity;
            for (let p = 0; p < pressures.length; p++) {
                min_pressure = Math.min(min_pressure, pressures[p]);
                max_pressure = Math.max(max_pressure, pressures[p]);
            }
            let text = "Pressure: " + min_pressure.toFixed(0) + " ~ " + max_pressure.toFixed(0) + " N/m";
            let text_position = Vector2.from_components(0.005, grid_size.y * grid_length - 0.02);
            if (config.show_smoke) {
                let smokes = this.smokes;
                canvas.render_grid(() => {
                    if (j >= grid_size.y) return undefined;

                    let color = this._value_to_sci_color(pressures[index], min_pressure, max_pressure);
                    let smoke = 255 * smokes[index];
                    color[0] = Math.max(0, color[0] - smoke);
                    color[1] = Math.max(0, color[1] - smoke);
                    color[2] = Math.max(0, color[2] - smoke);
                    return grid_drawer(color);
                });
                canvas.render_text(text, text_position,"#FFFFFF");
            } else {
                canvas.render_grid(() => {
                    return (
                        j >= grid_size.y
                        ? undefined
                        : grid_drawer(this._value_to_sci_color(pressures[index], min_pressure, max_pressure))
                    );
                });
                canvas.render_text(text, text_position, "#000000");
            }
        } else {
            let smokes = this.smokes;
            if (config.colorful_smoke) {
                canvas.render_grid(() => {
                    return (
                        j >= grid_size.y
                        ? undefined
                        : grid_drawer(this._value_to_sci_color(smokes[index], 0.0, 1.0))
                    );
                });
            } else {
                canvas.render_grid(() => {
                    if (j >= grid_size.y) return undefined;

                    let smoke = 255 * smokes[index];
                    let color = [smoke, smoke, smoke, 255];
                    return grid_drawer(color);
                });
            }
        }
    }

    _render_velocity(canvas)
    {
        let config = this.config;
        if (!config.show_velocity) return;

        let grid_size = config.grid_size;
        let grid_length = config.grid_length;
        let velocity_line_width = config.velocity_line_width;
        let velocity_line_step_length = config.velocity_line_step_length;
        let x_velocities = this.x_velocities;
        let y_velocities = this.y_velocities;

        let x_of_line_x = 0.0;
        let x_of_line_y = 0.5 * grid_length;
        for (let i = 0 ; i < grid_size.x; i++, x_of_line_y += grid_length, x_of_line_x += grid_length) {
            let y_of_line_x = 0.5 * grid_length;
            let y_of_line_y = 0.0;
            for (let j = 0; j < grid_size.y; j++, y_of_line_x += grid_length, y_of_line_y += grid_length) {
                let index_left = i + j * (grid_size.x + 1);
                let index_down = i + j * grid_size.x;

                let line_x = Line.from_point0_point1(
                    Vector2.from_components(x_of_line_x, y_of_line_x),
                    Vector2.from_components(x_of_line_x + x_velocities[index_left] * velocity_line_step_length, y_of_line_x),
                );
                canvas.render_line(line_x, velocity_line_width);

                let line_y = Line.from_point0_point1(
                    Vector2.from_components(x_of_line_y, y_of_line_y),
                    Vector2.from_components(x_of_line_y, y_of_line_y + y_velocities[index_down] * velocity_line_step_length),
                );
                canvas.render_line(line_y, velocity_line_width);
            }
        }

        let x_of_line = grid_size.x * grid_length;
        let y_of_line = 0.5 * grid_length;
        for (let index = grid_size.x; index < x_velocities.length; index += grid_size.x + 1, y_of_line += grid_length) {
            let line = Line.from_point0_point1(
                Vector2.from_components(x_of_line, y_of_line),
                Vector2.from_components(x_of_line + x_velocities[index] * velocity_line_step_length, y_of_line),
            );
            canvas.render_line(line, velocity_line_width);
        }

        x_of_line = 0.5 * grid_length;
        y_of_line = grid_size.y * grid_length;
        for (let index = y_velocities.length - grid_size.x; index < y_velocities.length; index++, x_of_line += grid_length) {
            let line = Line.from_point0_point1(
                Vector2.from_components(x_of_line, y_of_line),
                Vector2.from_components(x_of_line, y_of_line + y_velocities[index] * velocity_line_step_length),
            );
            canvas.render_line(line, velocity_line_width);
        }
    }

    _render_streamline(canvas)
    {
        let config = this.config;
        if (!config.show_streamline) return;

        let grid_size = config.grid_size;
        let grid_length = config.grid_length;
        let streamline_gap = config.streamline_gap;
        let streamline_width = config.streamline_width;
        let num_streamline_segments = config.num_streamline_segments;
        let streamline_step_length = config.streamline_step_length;
        for (let i = 0; i < grid_size.x; i += streamline_gap) {
            for (let j = 0; j < grid_size.y; j += streamline_gap) {
                let points = [];

                let grid_position = Vector2.from_components(i, j);
                points.push(grid_position.clone().add_components(0.5, 0.5).scale(grid_length));
                for (let k = 0; k < num_streamline_segments; k++) {
                    let sample_velocity = this._interpolate_velocity(grid_position);
                    let grid_velocity = Vector2.from_components(
                        (sample_velocity.left + sample_velocity.right) * 0.5 / grid_length,
                        (sample_velocity.down + sample_velocity.up) * 0.5 / grid_length,
                    );
                    grid_position.add(grid_velocity, streamline_step_length);
                    points.push(grid_position.clone().add_components(0.5, 0.5).scale(grid_length));
                }

                canvas.render_line_strip(points, streamline_width);
            }
        }
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

        return [255 * r, 255 * g, 255 * b, 255];
    }
};

