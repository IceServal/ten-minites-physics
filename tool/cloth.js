class Cloth
{
    constructor()
    {
        this.vertices = undefined;
        this.edges = undefined;
        this.hinges = undefined;

        this.num_edges = undefined;
        this.num_hinges = undefined;
        this.num_triangles = undefined;

        this.positions = undefined;
        this.last_positions = undefined;
        this.velocities = undefined;
        this.compliance = undefined;
        this.inverse_masses = undefined;

        this.line_mesh = undefined;
        this.triangle_mesh = undefined;

        this.grabbed_vertex_index = undefined;
        this.grabbed_vertex_inverse_mass = undefined;
    }

    static from(shape, compliance = 1.0)
    {
        let create_edges = (vertices, indices) => {
            let result = {
                edges: [],
                triangle_edges: [],
            };
            for (let i = 0; i < indices.length;) {
                let index_0 = indices[i++];
                let index_1 = indices[i++];
                let index_2 = indices[i++];
                let edge_0 = _Edge.from(index_0, index_1, vertices.distance_from(vertices, index_0, index_1));
                let edge_1 = _Edge.from(index_1, index_2, vertices.distance_from(vertices, index_1, index_2));
                let edge_2 = _Edge.from(index_2, index_0, vertices.distance_from(vertices, index_2, index_0));
                let triangle_edge_0 = _Triangle_Edge.from(edge_0, index_2);
                let triangle_edge_1 = _Triangle_Edge.from(edge_1, index_0);
                let triangle_edge_2 = _Triangle_Edge.from(edge_2, index_1);
                result.edges.push(edge_0);
                result.edges.push(edge_1);
                result.edges.push(edge_2);
                result.triangle_edges.push(triangle_edge_0);
                result.triangle_edges.push(triangle_edge_1);
                result.triangle_edges.push(triangle_edge_2);
            }
            return result;
        };

        let find_hinges = (vertices, triangle_edges) => {
            let hinges = [];
            if (triangle_edges.length < 1) return hinges;

            let hinge_group = [];
            let enumerate_hinges = () => {
                for (let i = 0; i < hinge_group.length; i++) {
                    for (let j = i + 1; j < hinge_group.length; j++) {
                        let index_0 = hinge_group[i];
                        let index_1 = hinge_group[j];
                        hinges.push(_Edge.from(index_0, index_1, vertices.distance_from(vertices, index_0, index_1)));
                    }
                }
            };

            triangle_edges.sort(_Triangle_Edge.compare);
            hinge_group = [triangle_edges[0].apex];
            let last_triangle_edge = triangle_edges[0];
            for (let i = 1; i < triangle_edges.length; i++) {
                let triangle_edge = triangle_edges[i];
                if (_Triangle_Edge.compare(last_triangle_edge, triangle_edge)) {
                    enumerate_hinges();
                    hinge_group = [triangle_edge.apex];
                    last_triangle_edge = triangle_edge;
                } else {
                    hinge_group.push(triangle_edge.apex);
                }
            }
            enumerate_hinges();
            return hinges;
        };

        let precompute_inverse_masses = (vertices, indices) => {
            let inverse_masses = new Float32Array(vertices.num_items());
            let scratch = Compact_Vector3.from_size(3);
            for (let i = 0; i < indices.length;) {
                let index_0 = indices[i++];
                let index_1 = indices[i++];
                let index_2 = indices[i++];
                scratch.assign_difference_of(vertices, vertices, 0, index_1, index_0);
                scratch.assign_difference_of(vertices, vertices, 1, index_2, index_0);
                scratch.assign_cross_of(scratch, scratch, 2, 1, 0);
                let mass = scratch.length(2) / 2;
                let mass_per_vertex = mass / 3.0;
                inverse_masses[index_0] += mass_per_vertex;
                inverse_masses[index_1] += mass_per_vertex;
                inverse_masses[index_2] += mass_per_vertex;
            }
            for (let i = 0; i < inverse_masses.length; i++) {
                let mass = inverse_masses[i];
                inverse_masses[i] = (mass > 0.0 ? 1.0 / mass : 0.0);
            }
            return inverse_masses;
        };

        let pin_top_left_and_top_right = (inverse_masses, vertices) => {
            let max_x = -Infinity;
            let min_x = +Infinity;
            let max_y = -Infinity;
            for (let i = 0; i < inverse_masses.length; i++) {
                let x = vertices.x(i);
                let y = vertices.y(i);
                max_x = Math.max(max_x, x);
                min_x = Math.min(min_x, x);
                max_y = Math.max(max_y, y);
            }
            let epsilon = 1e-3;
            max_x -= epsilon;
            min_x += epsilon;
            max_y -= epsilon;
            for (let i = 0; i < inverse_masses.length; i++) {
                let x = vertices.x(i);
                let y = vertices.y(i);
                if (
                    true
                    && (x < min_x || x > max_x)
                    && y > max_y
                ) {
                    inverse_masses[i] = 0.0;
                }
            }
        };

        let create_edge_mesh = (vertices, edges) => {
            let edge_indices = [];
            for (let i = 0; i < edges.length; i++) {
                let edge = edges[i];
                edge_indices.push(edge.index_0);
                edge_indices.push(edge.index_1);
            }
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(vertices.data, 3));
            geometry.setIndex(edge_indices);
            let material = new THREE.LineBasicMaterial({color: 0xFF0000, linewidth: 2});
            let mesh = new THREE.LineSegments(geometry, material);
            mesh.visible = false;
            return mesh;
        };

        let create_triangle_mesh = (vertices, indices) => {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(vertices.data, 3));
            geometry.setIndex(indices);
            let material = new THREE.MeshPhongMaterial({color: 0xFF0000, side: THREE.DoubleSide});
            let mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            return mesh;
        };

        let enable_ray_tracing = (instance) => {
            instance.triangle_mesh.userData = instance;
            instance.triangle_mesh.layers.enable(1);
        };

        let result = new Cloth();
        result.vertices = Compact_Vector3.from_array(shape.skin.vertices);
        let data = create_edges(result.vertices, shape.skin.indices);
        result.edges = data.edges;
        result.hinges = find_hinges(result.vertices, data.triangle_edges);
        result.num_edges = result.edges.length;
        result.num_hinges = result.hinges.length;
        result.num_triangles = result.vertices.num_items();
        result.positions = result.vertices;
        result.last_positions = Compact_Vector3.from_size(result.positions.num_items());
        result.velocities = Compact_Vector3.from_size(result.vertices.num_items());
        result.compliance = compliance;
        result.inverse_masses = precompute_inverse_masses(result.vertices, shape.skin.indices);
        pin_top_left_and_top_right(result.inverse_masses, result.vertices);
        result.line_mesh = create_edge_mesh(result.vertices, result.edges);
        result.triangle_mesh = create_triangle_mesh(result.vertices, shape.skin.indices);
        enable_ray_tracing(result);
        result._update_meshes();
        return result;
    }

    update(delta_time)
    {
        for (let i = 0; i < this.positions.num_items(); i++) {
            this.last_positions.assign(this.positions, i, i);
        }

        this._solve_gravity(delta_time);

        for (let i = 0; i < this.positions.num_items(); i++) {
            this.positions.add(this.velocities, i, i, delta_time);
        }

        this._solve_collision_with_floor(delta_time);
        this._solve_stretching(delta_time);
        this._solve_bending(delta_time);

        let inverse_delta_time = 1.0 / delta_time;
        for (let i = 0; i < this.velocities.num_items(); i++) {
            if (this.inverse_masses[i] > 0.0) {
                this.velocities.assign_difference_of(this.positions, this.last_positions, i, i, i, inverse_delta_time);
            }
        }
    }

    render(delta_time)
    {
        this._update_meshes();
    }

    switch_mode(mode)
    {
        this.line_mesh.visible = (mode == "line");
        this.triangle_mesh.visible = (mode == "triangle");
    }

    add_to(scene)
    {
        scene.add(this.line_mesh);
        scene.add(this.triangle_mesh);
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
        for (let i = 0; i < this.positions.num_items(); i++) {
            if (this.positions.y(i) < 0.0) {
                this.positions.assign_y(i, 0.0);
            }
        }
    }

    _solve_stretching(delta_time)
    {
        let scratch = Compact_Vector3.from_size(1);
        for (let i = 0; i < this.edges.length; i++) {
            let edge = this.edges[i];
            let length = this.positions.distance_from(this.positions, edge.index_0, edge.index_1);
            if (length == 0.0) continue;

            let compliance = (length > edge.length * 1.02 || length < edge.length * 0.98 ? 0.0 : this.compliance) / delta_time / delta_time;
            let inverse_mass_0 = this.inverse_masses[edge.index_0];
            let inverse_mass_1 = this.inverse_masses[edge.index_1];
            let inverse_mass_sum = inverse_mass_0 + inverse_mass_1;
            if (inverse_mass_sum == 0.0) continue;

            let stretching_length = length - edge.length;
            let lambda = -stretching_length / (inverse_mass_sum + compliance);
            scratch.assign_difference_of(this.positions, this.positions, 0, edge.index_1, edge.index_0, lambda / length);
            this.positions.subtract(scratch, edge.index_0, 0, inverse_mass_0);
            this.positions.add(scratch, edge.index_1, 0, inverse_mass_1);
        }
    }

    _solve_bending(delta_time)
    {
        let scratch = Compact_Vector3.from_size(1);
        for (let i = 0; i < this.hinges.length; i++) {
            let hinge = this.hinges[i];
            let length = this.positions.distance_from(this.positions, hinge.index_0, hinge.index_1);
            if (length == 0.0 || length > hinge.length) continue;

            let compliance = this.compliance / delta_time / delta_time;
            let inverse_mass_0 = this.inverse_masses[hinge.index_0];
            let inverse_mass_1 = this.inverse_masses[hinge.index_1];
            let inverse_mass_sum = inverse_mass_0 + inverse_mass_1;
            if (inverse_mass_sum == 0.0) continue;

            let bending_length = length - hinge.length;
            let lambda = -bending_length / (inverse_mass_sum + compliance);
            scratch.assign_difference_of(this.positions, this.positions, 0, hinge.index_1, hinge.index_0, lambda / length);
            this.positions.subtract(scratch, hinge.index_0, 0, inverse_mass_0);
            this.positions.add(scratch, hinge.index_1, 0, inverse_mass_1);
        }
    }

    _update_meshes()
    {
        this.line_mesh.geometry.attributes.position.needsUpdate = true;

        this.triangle_mesh.geometry.attributes.position.needsUpdate = true;
        this.triangle_mesh.geometry.computeVertexNormals();
        this.triangle_mesh.geometry.computeBoundingSphere();
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

class _Triangle_Edge
{
    constructor()
    {
        this.edge = undefined;
        this.apex = undefined;
    }

    static from(edge, apex)
    {
        let result = new _Triangle_Edge();
        result.edge = edge;
        result.apex = apex;
        return result;
    }

    static compare(a, b)
    {
        if (a.edge.index_0 != b.edge.index_0) {
            return a.edge.index_0 - b.edge.index_0;
        } else {
            return a.edge.index_1 - b.edge.index_1;
        }
    }
};

