class Soft_Body
{
    constructor()
    {
        this.num_particles = 0;
        this.num_tetrahedra = 0;
        this.positions = Compact_Vector3.from_size(0);
        this.last_positions = this.positions.clone();
        this.velocities = Compact_Vector3.from_size(this.num_particles);
        this.solid_indices = [];
        this.edge_indices = [];
        this.inverse_mass = new Float32Array(this.num_particles);
        this.rest_volumes = new Float32Array(this.num_tetrahedra);
        this.rest_lengths = new Float32Array(this.edge_indices.length / 2);
        this.length_compliance = 100.0;
        this.volume_compliance = 0.0;
        this.bounce_compliance = 0.0;
        this.color = 0xF02000;

        this.gradient_scratch = Compact_Vector3.from_size(4);
        this.volume_scratch = Compact_Vector3.from_size(4);
        this.index_scratch = new Int32Array(4);
        this.inverse_mass_scratch = new Float32Array(4);
        this.volume_indices_order = [
            [1, 3, 2],
            [0, 2, 3],
            [0, 3, 1],
            [0, 1, 2],
        ];

        this.grabbed_particle_index = -1;
        this.grabbed_particle_inverse_mass = 0.0;

        this.surface_mesh = null;
    }

    static from(shape, length_compliance = 0.0, volume_compliance = 0.0, color = 0xF02000)
    {
        let result = new Soft_Body();
        if (shape.skin.vertices != shape.bone.vertices) {
            console.log("Soft body simulator can not simulate with the model of which bone vertices are not identical with skin vertices, please use skinned soft body simulator.");
        }

        result.num_particles = shape.bone.vertices.length / 3;
        result.num_tetrahedra = shape.bone.solid_indices.length / 4;
        result.positions = Compact_Vector3.from_array(shape.bone.vertices);
        result.last_positions = result.positions.clone();
        result.velocities = Compact_Vector3.from_size(result.num_particles);

        result.solid_indices = shape.bone.solid_indices;
        result.edge_indices = shape.bone.edge_indices;
        result.inverse_mass = new Float32Array(result.num_particles);
        result.rest_volumes = new Float32Array(result.num_tetrahedra);
        result.rest_lengths = new Float32Array(result.edge_indices.length / 2);

        result.length_compliance = length_compliance;
        result.volume_compliance = volume_compliance;
        result.color = color;

        result.inverse_mass.fill(0.0);
        for (let i = 0; i < result.num_tetrahedra; i++) {
            let volume = result._tetrahedron_volume_of(i);
            result.rest_volumes[i] = volume;

            let inverse_average_mass = (volume > 0.0 ? 1.0 / (volume / 4.0) : 0.0);
            for (let j = i * 4; j < i * 4 + 4; j++) {
                result.inverse_mass[result.solid_indices[j]] += inverse_average_mass;
            }
        }
        for (let i = 0; i < result.rest_lengths.length; i++) {
            result.rest_lengths[i] = result._edge_length_of(i);
        }

        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(result.positions.data, 3));
        geometry.setIndex(shape.skin.indices);
        let material = new THREE.MeshPhongMaterial({color: color});
        material.flatShading = true;
        result.surface_mesh = new THREE.Mesh(geometry, material);
        result.surface_mesh.geometry.computeVertexNormals();
        result.surface_mesh.userData = result;
        result.surface_mesh.layers.enable(1);

        return result;
    }

    translate(x, y, z)
    {
        this.positions.translate(x, y, z);
        this.last_positions.translate(x, y, z);
        this._update_surface_mesh();
        return this;
    }

    act(delta_time)
    {
        this._solve_gravity(delta_time);
        this._solve_lengths(delta_time);
        this._solve_volumes(delta_time);
        this._update_surface_mesh();

        this.velocities.assign_difference_of(this.positions, this.last_positions, 0, 0, 0, 1.0 / delta_time, this.num_particles);
    }

    squash()
    {
        for (let i = 0; i < this.num_particles; i++) {
            this.positions.data[i * 3 + 1] = 0.5;
        }
        this._update_surface_mesh();
    }

    grab(position, velocity)
    {
        let nearest_distance = Number.MAX_VALUE;
        for (let i = 0; i < this.num_particles; i++) {
            let distance = this.positions.distance_square_from(position, i, 0);
            if (distance < nearest_distance) {
                nearest_distance = distance;
                this.grabbed_particle_index = i;
            }
        }
        if (this.grabbed_particle_index >= 0) {
            this.grabbed_particle_inverse_mass = this.inverse_mass[this.grabbed_particle_index];
            this.inverse_mass[this.grabbed_particle_index] = 0.0;
            this.positions.assign(position, this.grabbed_particle_index, 0);
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
            this.inverse_mass[this.grabbed_particle_index] = this.grabbed_particle_inverse_mass;
            this.positions.assign(position, this.grabbed_particle_index, 0);
            this.velocities.assign(velocity, this.grabbed_particle_index, 0);
            this.grabbed_particle_index = -1;
        }
    }

    _tetrahedron_volume_of(index)
    {
        index *= 4;
        let index0 = this.solid_indices[index++];
        let index1 = this.solid_indices[index++];
        let index2 = this.solid_indices[index++];
        let index3 = this.solid_indices[index++];
        this.volume_scratch.assign_difference_of(this.positions, this.positions, 0, index1, index0);
        this.volume_scratch.assign_difference_of(this.positions, this.positions, 1, index2, index0);
        this.volume_scratch.assign_difference_of(this.positions, this.positions, 2, index3, index0);
        this.volume_scratch.assign_cross_of(this.volume_scratch, this.volume_scratch, 3, 0, 1);
        return this.volume_scratch.dot(this.volume_scratch, 2, 3) / 6.0;
    }

    _edge_length_of(index)
    {
        index *= 2;
        let index0 = this.edge_indices[index++];
        let index1 = this.edge_indices[index++];
        return Math.sqrt(this.positions.distance_square_from(this.positions, index0, index1));
    }

    _solve_gravity(delta_time)
    {
        let gravity = world.gravity;
        for (let i = 0; i < this.num_particles; i++) {
            if (this.inverse_mass[i] == 0.0) continue;

            this.velocities.translate(gravity.x, gravity.y, gravity.z, delta_time, i, 1);
            this.last_positions.assign(this.positions, i, i);
            this.positions.add(this.velocities, i, i, delta_time);
            let y_component_index = i * 3 + 1;
            if (this.positions.data[y_component_index] < 0.0) {
                this.positions.assign(this.last_positions, i, i);
                this.positions.data[y_component_index] = 0.0;
            }
        }
    }

    _solve_lengths(delta_time)
    {
        let index_scratch = this.index_scratch;
        let inverse_mass_scratch = this.inverse_mass_scratch;
        let gradient_scratch = this.gradient_scratch;

        let alpha = this.length_compliance / delta_time / delta_time;
        for (let i = 0, j = 0; i < this.edge_indices.length;) {
            index_scratch[0] = this.edge_indices[i++];
            index_scratch[1] = this.edge_indices[i++];
            inverse_mass_scratch[0] = this.inverse_mass[index_scratch[0]];
            inverse_mass_scratch[1] = this.inverse_mass[index_scratch[1]];

            let lambda = inverse_mass_scratch[0] + inverse_mass_scratch[1];
            if (lambda == 0.0) continue;

            gradient_scratch.assign_difference_of(this.positions, this.positions, 0, index_scratch[0], index_scratch[1]);
            let length = Math.sqrt(gradient_scratch.length_square(0));
            if (length == 0.0) continue;

            lambda = -(length - this.rest_lengths[j++]) / (lambda + alpha);
            gradient_scratch.scale(1.0 / length, 0);
            this.positions.add(gradient_scratch, index_scratch[0], 0, lambda * inverse_mass_scratch[0]);
            this.positions.subtract(gradient_scratch, index_scratch[1], 0, lambda * inverse_mass_scratch[1]);
        }
    }

    _solve_volumes(delta_time)
    {
        let index_scratch = this.index_scratch;
        let inverse_mass_scratch = this.inverse_mass_scratch;
        let volume_scratch = this.volume_scratch;
        let gradient_scratch = this.gradient_scratch;

        let alpha = this.volume_compliance / delta_time / delta_time;
        for (let i = 0, j = 0; i < this.solid_indices.length;) {
            for (let k = 0; k < 4; k++) {
                index_scratch[k] = this.solid_indices[i++];
                inverse_mass_scratch[k] = this.inverse_mass[index_scratch[k]];
            }

            let lambda = 0.0;
            for (let k = 0; k < 4; k++) {
                let order = this.volume_indices_order[k];
                volume_scratch.assign_difference_of(this.positions, this.positions, 0, index_scratch[order[1]], index_scratch[order[0]]);
                volume_scratch.assign_difference_of(this.positions, this.positions, 1, index_scratch[order[2]], index_scratch[order[0]]);
                gradient_scratch.assign_cross_of(volume_scratch, volume_scratch, k, 0, 1);
                lambda += inverse_mass_scratch[k] * gradient_scratch.length_square(k);
            }
            if (lambda == 0.0) continue;

            lambda = -(this._tetrahedron_volume_of(j) - this.rest_volumes[j]) / (lambda + alpha); j++;
            for (let k = 0; k < 4; k++) {
                this.positions.add(gradient_scratch, index_scratch[k], k, lambda * inverse_mass_scratch[k]);
            }
        }
    }

    _update_surface_mesh()
    {
        this.surface_mesh.geometry.computeVertexNormals();
        this.surface_mesh.geometry.computeBoundingSphere();
        this.surface_mesh.geometry.attributes.position.needsUpdate = true;
    }
};

