class Self_Collided_Cloth_Config
{
    constructor()
    {
        this.spacing = 0.01;
        this.epsilon = 1e-3 * this.spacing;
        this.num_particles_x = 30;
        this.num_particles_y = 200;

        this.thickness = 0.01
        this.unit_distance = 0.2 * this.thickness;
        this.num_substeps = 10;
        this.stretching_compliance = 1.0;
        this.shear_compliance = 1e-3;
        this.bending_compliance = 1.0;
        this.cloth_cloth_damping = 0.95;
        this.cloth_ground_damping = 0.53;

        this.handle_collision = true;
        this.pin_top_left_and_top_right = false;
    }

    static from()
    {
        return new Self_Collided_Cloth_Config();
    }
};

class Self_Collided_Cloth
{
    constructor()
    {
        this.config = undefined;

        this.positions = undefined;
        this.last_positions = undefined;
        this.rest_positions = undefined;
        this.velocities = undefined;
        this.inverse_masses = undefined;

        this.yarn_edges = undefined;
        this.cross_edges = undefined;
        this.hinge_edges = undefined;

        this.num_particles = undefined;
        this.num_yarn_edges = undefined;
        this.num_cross_edges = undefined;
        this.num_hinge_edges = undefined;
        this.num_edges = undefined;
        this.num_triangles = undefined;

        this.hasher = undefined;
        this.neighbors = undefined;

        this.edges_meshes = undefined;
        this.cloth_meshes = undefined;

        this.grabbed_vertex_index = undefined;
        this.grabbed_vertex_inverse_mass = undefined;
    }

    static from(config = Self_Collided_Cloth_Config.from())
    {
        let create_particles = (num_particles_x, num_particles_y, spacing, epsilon, pin_top_left_and_top_right) => {
            let num_particles = num_particles_x * num_particles_y;
            let result = {
                positions: Compact_Vector3.from_size(num_particles),
                inverse_masses: new Float32Array(num_particles),
            };
            let index = 0;
            for (let i = 0; i < num_particles_x; i++) {
                let x = i * spacing;
                for (let j = 0; j < num_particles_y; j++) {
                    let y = j * spacing + 0.2;
                    result.positions.assign_components_of(x, y, 0.0, 1.0, index, 1);
                    result.positions.translate(random_epsilon(epsilon), random_epsilon(epsilon), random_epsilon(epsilon), 1.0, index, 1);
                    index++;
                }
            }
            result.inverse_masses.fill(1.0);
            if (pin_top_left_and_top_right) {
                result.inverse_masses[num_particles_y - 1] = 0.0;
                result.inverse_masses[num_particles - 1] = 0.0;
            }
            return result;
        };

        let push_edges = (container, base, offset, count, stride = offset) => {
            for (let i = 0; i < count; i++) {
                let index_0 = base;
                let index_1 = base + offset;
                container.edges.push(_Edge.from(index_0, index_1, undefined));
                container.indices.push(index_0, index_1);
                base += stride;
            }
        };

        let fill_lengths = (edges, positions) => {
            for (let i = 0; i < edges.length; i++) {
                let edge = edges[i];
                edge.length = positions.distance_from(positions, edge.index_0, edge.index_1);
            }
        }

        let find_yarn_edges = (positions, num_particles_x, num_particles_y) => {
            let result = {
                edges: [],
                indices: [],
            };
            for (let i = 0; i < num_particles_x; i++) {
                let base = i * num_particles_y;
                push_edges(result, base, 1, num_particles_y - 1);
            }
            for (let i = 0; i < num_particles_y; i++) {
                push_edges(result, i, num_particles_y, num_particles_x - 1);
            }
            fill_lengths(result.edges, positions);
            return result;
        };

        let find_cross_edges = (positions, num_particles_x, num_particles_y) => {
            let result = {
                edges: [],
                indices: [],
            };
            for (let i = 0; i < num_particles_x - 1; i++) {
                let base = i * num_particles_y;
                push_edges(result, base, num_particles_y + 1, num_particles_y - 1, 1);
                base++;
                push_edges(result, base, num_particles_y - 1, num_particles_y - 1, 1);
            }
            fill_lengths(result.edges, positions);
            return result;
        };

        let find_hinge_edges = (positions, num_particles_x, num_particles_y) => {
            let result = {
                edges: [],
                indices: [],
            };
            for (let i = 0; i < num_particles_x; i++) {
                let base = i * num_particles_y;
                push_edges(result, base, 2, num_particles_y - 2, 1);
            }
            for (let i = 0; i < num_particles_y; i++) {
                push_edges(result, i, num_particles_y * 2, num_particles_x - 2, num_particles_y);
            }
            fill_lengths(result.edges, positions);
            return result;
        };

        let find_triangles = (num_particles_x, num_particles_y) => {
            let indices = [];
            for (let i = 0; i < num_particles_x - 1; i++) {
                let base = i * num_particles_y;
                for (let j = 0; j < num_particles_y - 1; j++) {
                    let index_0 = base + j;
                    let index_1 = index_0 + num_particles_y;
                    let index_2 = index_1 + 1;
                    let index_3 = index_0 + 1;
                    indices.push(index_0, index_1, index_2);
                    indices.push(index_0, index_2, index_3);
                }
            }
            return indices;
        }

        let create_edge_mesh = (positions, indices, color) => {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(positions.data, 3));
            geometry.setIndex(indices);
            let material = new THREE.LineBasicMaterial({color: color, linewidth: 2});
            let mesh = new THREE.LineSegments(geometry, material);
            mesh.visible = false;
            return mesh;
        };

        let create_cloth_mesh = (positions, indices, color_front, color_back, user_data) => {
            let result = {};
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(positions.data, 3));
            geometry.setIndex(indices);

            let create_mesh = (color, side) => {
                let material = new THREE.MeshPhongMaterial({color: color, side: side});
                let mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.userData = user_data;
                mesh.layers.enable(1);
                return mesh;
            };
            result.front = create_mesh(color_front, THREE.FrontSide);
            result.back = create_mesh(color_back, THREE.BackSide);
            return result;
        };

        let result = new Self_Collided_Cloth();
        result.config = config;

        let particles = create_particles(
            result.config.num_particles_x,
            result.config.num_particles_y,
            result.config.spacing,
            result.config.epsilon,
            result.config.pin_top_left_and_top_right
        );
        result.positions = particles.positions;
        result.inverse_masses = particles.inverse_masses;

        result.num_particles = particles.positions.num_items();
        result.last_positions = Compact_Vector3.from_size(result.num_particles);
        result.rest_positions = result.positions.clone();
        result.velocities = Compact_Vector3.from_size(result.num_particles);

        let yarn_edges = find_yarn_edges(result.positions, config.num_particles_x, config.num_particles_y);
        result.yarn_edges = yarn_edges.edges;
        result.num_yarn_edges = yarn_edges.edges.length;
        let cross_edges = find_cross_edges(result.positions, config.num_particles_x, config.num_particles_y);
        result.cross_edges = cross_edges.edges;
        result.num_cross_edges = cross_edges.edges.length;
        let hinge_edges = find_hinge_edges(result.positions, config.num_particles_x, config.num_particles_y);
        result.hinge_edges = hinge_edges.edges;
        result.num_hinge_edges = hinge_edges.edges.length;
        result.num_edges = result.num_yarn_edges + result.num_cross_edges + result.num_hinge_edges;

        result.hasher = Hasher.from(result.config.spacing, result.positions);

        let triangles_indices = find_triangles(config.num_particles_x, config.num_particles_y);
        result.num_triangles = triangles_indices.length / 3;

        result.edges_meshes = {};
        result.edges_meshes.yarn = create_edge_mesh(result.positions, yarn_edges.indices, 0xFFAA00);
        result.edges_meshes.cross = create_edge_mesh(result.positions, cross_edges.indices, 0xAAFF00);
        result.edges_meshes.hinge = create_edge_mesh(result.positions, hinge_edges.indices, 0xAAAAFF);
        result.cloth_meshes = create_cloth_mesh(result.positions, triangles_indices, 0xFF0000, 0x00FF00, result);
        result._update_meshes();

        return result;
    }

    pre_update(delta_time)
    {
        if (this.config.handle_collision) {
            this.hasher.rehash();
            this.neighbors = this.hasher.self_inspect(this.config.unit_distance * this.config.num_substeps);
            console.log(this.neighbors.offsets[this.num_particles]);
        }
    }

    update(delta_time)
    {
        delta_time /= this.config.num_substeps;
        for (let step = 0; step < this.config.num_substeps; step++) {
            this.last_positions.assign(this.positions, 0, 0, this.positions.num_items());

            if (this.config.handle_collision) {
                this._solve_collision(delta_time);
            }

            this._solve_gravity(delta_time);

            let max_speed = this.config.unit_distance / delta_time;
            let max_speed_square = max_speed * max_speed;
            for (let i = 0; i < this.positions.num_items(); i++) {
                let speed_square = this.velocities.length_square(i);
                if (speed_square > max_speed_square) {
                    this.velocities.scale(max_speed / Math.sqrt(speed_square), i);
                }
                this.positions.add(this.velocities, i, i, delta_time);
            }

            this._solve_collision_with_floor(delta_time);
            this._solve_stretching(delta_time);
            this._solve_shearing(delta_time);
            this._solve_bending(delta_time);

            let inverse_delta_time = 1.0 / delta_time;
            for (let i = 0; i < this.velocities.num_items(); i++) {
                if (this.inverse_masses[i] > 0.0) {
                    this.velocities.assign_difference_of(this.positions, this.last_positions, i, i, i, inverse_delta_time);
                }
            }
        }
    }

    post_update(delta_time)
    {
        this._update_meshes();
    }

    switch_mode(mode)
    {
        this.edges_meshes.yarn.visible = (mode == "yarn-edges" || mode == "all-edges");
        this.edges_meshes.cross.visible = (mode == "cross-edges" || mode == "all-edges");
        this.edges_meshes.hinge.visible = (mode == "hinge-edges" || mode == "all-edges");
        this.cloth_meshes.front.visible = (mode == "cloth-front" || mode == "cloth");
        this.cloth_meshes.back.visible = (mode == "cloth-back" || mode == "cloth");
    }

    add_to(scene)
    {
        scene.add(this.edges_meshes.yarn);
        scene.add(this.edges_meshes.cross);
        scene.add(this.edges_meshes.hinge);
        scene.add(this.cloth_meshes.front);
        scene.add(this.cloth_meshes.back);
    }

    grab(position, velocity)
    {
        let nearest_distance = Infinity;
        for (let i = 0; i < this.inverse_masses.length; i++) {
            let distance = this.positions.distance_square_from(position, i, 0);
            if (distance < nearest_distance) {
                nearest_distance = distance;
                this.grabbed_particle_index = i;
            }
        }
        if (this.grabbed_particle_index >= 0) {
            this.grabbed_particle_inverse_mass = this.inverse_masses[this.grabbed_particle_index];
            this.inverse_masses[this.grabbed_particle_index] = 0.0;
            this.positions.assign(position, this.grabbed_particle_index, 0);
            this.velocities.assign_components_of(0.0, 0.0, 0.0, 1.0, this.grabbed_particle_index, 1);
        }
    }

    move(position, velocity)
    {
        if (this.grabbed_particle_index >= 0) {
            this.positions.assign(position, this.grabbed_particle_index, 0);
        }
    }

    drop(position, velocity)
    {
        if (this.grabbed_particle_index >= 0) {
            this.inverse_masses[this.grabbed_particle_index] = this.grabbed_particle_inverse_mass;
            this.positions.assign(position, this.grabbed_particle_index, 0);
            this.grabbed_particle_index = -1;
        }
    }

    _solve_gravity(delta_time)
    {
        let gravity = world.gravity;
        for (let i = 0; i < this.velocities.num_items(); i++) {
            if (this.inverse_masses[i] > 0.0) {
                this.velocities.translate(gravity.x, gravity.y, gravity.z, delta_time, i, 1);
            }
        }
    }

    _solve_collision_with_floor(delta_time)
    {
        let half_thickness = this.config.thickness * 0.5;
        for (let i = 0; i < this.positions.num_items(); i++) {
            if (this.positions.y(i) < half_thickness) {
                this.positions.subtract(this.velocities, i, i, this.config.cloth_ground_damping * delta_time);
                this.positions.assign_y(i, half_thickness);
            }
        }
    }

    _solve_stretching(delta_time)
    {
        let edges = this.yarn_edges;
        let scratch = Compact_Vector3.from_size(1);
        for (let i = 0; i < edges.length; i++) {
            let edge = edges[i];
            let length = this.positions.distance_from(this.positions, edge.index_0, edge.index_1);
            if (length == 0.0) continue;

            let compliance = (length > edge.length * 1.02 || length < edge.length * 0.98 ? 0.0 : this.config.stretching_compliance) / delta_time / delta_time;
            let inverse_mass_0 = this.inverse_masses[edge.index_0];
            let inverse_mass_1 = this.inverse_masses[edge.index_1];
            let inverse_mass_sum = inverse_mass_0 + inverse_mass_1;
            if (inverse_mass_sum == 0.0) continue;

            let loss = length - edge.length;
            let lambda = -loss / (inverse_mass_sum + compliance);
            scratch.assign_difference_of(this.positions, this.positions, 0, edge.index_1, edge.index_0, lambda / length);
            this.positions.subtract(scratch, edge.index_0, 0, inverse_mass_0);
            this.positions.add(scratch, edge.index_1, 0, inverse_mass_1);
        }
    }

    _solve_shearing(delta_time)
    {
        let edges = this.cross_edges;
        let scratch = Compact_Vector3.from_size(1);
        for (let i = 0; i < edges.length; i++) {
            let edge = edges[i];
            let length = this.positions.distance_from(this.positions, edge.index_0, edge.index_1);
            if (length == 0.0) continue;

            let compliance = this.config.shear_compliance / delta_time / delta_time;
            let inverse_mass_0 = this.inverse_masses[edge.index_0];
            let inverse_mass_1 = this.inverse_masses[edge.index_1];
            let inverse_mass_sum = inverse_mass_0 + inverse_mass_1;
            if (inverse_mass_sum == 0.0) continue;

            let loss = length - edge.length;
            let lambda = -loss / (inverse_mass_sum + compliance);
            scratch.assign_difference_of(this.positions, this.positions, 0, edge.index_1, edge.index_0, lambda / length);
            this.positions.subtract(scratch, edge.index_0, 0, inverse_mass_0);
            this.positions.add(scratch, edge.index_1, 0, inverse_mass_1);
        }
    }

    _solve_bending(delta_time)
    {
        let edges = this.hinge_edges;
        let scratch = Compact_Vector3.from_size(1);
        for (let i = 0; i < edges.length; i++) {
            let edge = edges[i];
            let length = this.positions.distance_from(this.positions, edge.index_0, edge.index_1);
            if (length == 0.0 || length > edge.length) continue;

            let compliance = this.config.bending_compliance / delta_time / delta_time;
            let inverse_mass_0 = this.inverse_masses[edge.index_0];
            let inverse_mass_1 = this.inverse_masses[edge.index_1];
            let inverse_mass_sum = inverse_mass_0 + inverse_mass_1;
            if (inverse_mass_sum == 0.0) continue;

            let loss = length - edge.length;
            let lambda = -loss / (inverse_mass_sum + compliance);
            scratch.assign_difference_of(this.positions, this.positions, 0, edge.index_1, edge.index_0, lambda / length);
            this.positions.subtract(scratch, edge.index_0, 0, inverse_mass_0);
            this.positions.add(scratch, edge.index_1, 0, inverse_mass_1);
        }
    }

    _solve_collision(delta_time)
    {
        let scratch0 = Compact_Vector3.from_size(3);
        let scratch1 = Compact_Vector3.from_size(3);
        let positions = this.positions;
        let neighbors = this.neighbors;
        let velocities = this.velocities;
        let rest_positions = this.rest_positions;
        let thickness_squared = this.config.thickness * this.config.thickness;
        for (let i = 0; i < this.num_particles; i++) {
            scratch0.assign(positions, 0, i);
            scratch1.assign(rest_positions, 0, i);
            for (let j = neighbors.offsets[i]; j < neighbors.offsets[i + 1]; j++) {
                let entry = neighbors.indices[j];
                if (entry <= i) continue;

                let inverse_mass_0 = this.inverse_masses[i];
                let inverse_mass_1 = this.inverse_masses[entry];
                let inverse_mass_sum = inverse_mass_0 + inverse_mass_1;
                if (inverse_mass_sum == 0.0) continue;

                scratch0.assign(positions, 1, entry);
                scratch0.assign_difference_of(scratch0, scratch0, 2, 1, 0);
                let distance_squared = scratch0.length_square(2)
                if (distance_squared == 0.0 ) continue;

                scratch1.assign(rest_positions, 1, entry);
                scratch1.assign_difference_of(scratch1, scratch1, 2, 1, 0);
                let rest_distance_squared = Math.min(scratch1.length_square(2), thickness_squared);
                if (distance_squared >= rest_distance_squared) continue;

                let distance = Math.sqrt(distance_squared);
                let rest_distance = Math.sqrt(rest_distance_squared);
                let loss = distance - rest_distance;
                let lambda = -loss / inverse_mass_sum;

                scratch0.scale(1.0 / distance, 2);
                positions.add(scratch0, i,     2, -inverse_mass_0 * lambda);
                positions.add(scratch0, entry, 2, +inverse_mass_1 * lambda);

                let projection_length0 = velocities.dot(scratch0, i, 2);
                let projection_length1 = velocities.dot(scratch0, entry, 2);
                loss = projection_length1 - projection_length0;
                lambda = -loss / inverse_mass_sum;
                velocities.add(scratch0, i,     2, -inverse_mass_0 * lambda);
                velocities.add(scratch0, entry, 2, +inverse_mass_1 * lambda);
            }
        }
    }

    _update_meshes()
    {
        this.edges_meshes.yarn.geometry.attributes.position.needsUpdate = true;
        this.edges_meshes.cross.geometry.attributes.position.needsUpdate = true;
        this.edges_meshes.hinge.geometry.attributes.position.needsUpdate = true;

        let geometry = this.cloth_meshes.front.geometry;    // Back side mesh use the same geometry with front side mesh.
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
    }
};

class _Edge
{
    constructor()
    {
        this.index_0 = undefined;
        this.index_1 = undefined;
        this.length = undefined;
    }

    static from(index_0, index_1, length)
    {
        let result = new _Edge();
        if (index_0 < index_1) {
            result.index_0 = index_0;
            result.index_1 = index_1;
        } else {
            result.index_0 = index_1;
            result.index_1 = index_0;
        }
        result.length = length;
        return result;
    }
};

