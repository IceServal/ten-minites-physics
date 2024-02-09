class Skinned_Soft_Body
{
    constructor()
    {
        this.gradient_scratch = Compact_Vector3.from_size(4);
        this.volume_scratch = Compact_Vector3.from_size(4);
        this.index_scratch = new Int32Array(4);
        this.inverse_mass_scratch = new Float32Array(4);
        this.skinning_scratch = Compact_Vector3.from_size(4);
        this.barycentric_scratch = new Matrix3x3();
        this.volume_indices_order = [
            [1, 3, 2],
            [0, 2, 3],
            [0, 3, 1],
            [0, 1, 2],
        ];

        this.grabbed_particle_index = -1;
        this.grabbed_particle_inverse_mass = 0.0;
    }

    static from(skin, bone, length_compliance = 0.0, volume_compliance = 0.0, skin_color = 0xF78A1D, bone_color = 0xFFFFFF)
    {
        let result = new Skinned_Soft_Body();

        result.num_particles = bone.vertices.length / 3;
        result.num_tetrahedra = bone.tetrahedron_indices.length / 4;
        result.positions = Compact_Vector3.from_array(bone.vertices);
        result.last_positions = result.positions.clone();
        result.velocities = Compact_Vector3.from_size(result.num_particles);

        result.tetrahedron_indices = bone.tetrahedron_indices;
        result.tetrahedron_edge_indices = bone.tetrahedron_edge_indices;
        result.inverse_mass = new Float32Array(result.num_particles);
        result.rest_volumes = new Float32Array(result.num_tetrahedra);
        result.rest_lengths = new Float32Array(result.tetrahedron_edge_indices.length / 2);

        result.length_compliance = length_compliance;
        result.volume_compliance = volume_compliance;
        result.skin_color = skin_color;
        result.bone_color = bone_color;

        result.inverse_mass.fill(0.0);
        for (let i = 0; i < result.num_tetrahedra; i++) {
            let volume = result._tetrahedron_volume_of(i);
            result.rest_volumes[i] = volume;

            let inverse_average_mass = (volume > 0.0 ? 1.0 / (volume / 4.0) : 0.0);
            for (let j = i * 4; j < i * 4 + 4; j++) {
                result.inverse_mass[result.tetrahedron_indices[j]] += inverse_average_mass;
            }
        }
        for (let i = 0; i < result.rest_lengths.length; i++) {
            result.rest_lengths[i] = result._edge_length_of(i);
        }

        {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(result.positions.data, 3));
            geometry.setIndex(result.tetrahedron_edge_indices);
            let material = new THREE.LineBasicMaterial({color: result.bone_color, linewidth: 2.0});
            result.bone_mesh = new THREE.LineSegments(geometry, material);
            result.bone_mesh.visible = false;
            result._update_bone_mesh();
        }

        result.num_vertices = skin.vertices.length / 3;
        result.num_triangles = skin.triangle_indices.length / 3;
        result.skin_attachment = new Float32Array(result.num_vertices);
        result.skin_coordinates = new Float32Array(4 * result.num_vertices);
        result._skinning(skin);

        {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * result.num_vertices), 3));
            geometry.setIndex(skin.triangle_indices);
            let material = new THREE.MeshPhongMaterial({color: result.skin_color});
            result.skin_mesh = new THREE.Mesh(geometry, material);
            result.skin_mesh.castShadow = true;
            result.skin_mesh.userData = result;
            result.skin_mesh.layers.enable(1);
            result._update_skin_mesh();
        }

        return result;
    }

    translate(x, y, z)
    {
        this.positions.translate(x, y, z);
        this.last_positions.translate(x, y, z);
        this._update_bone_mesh();
        return this;
    }

    update(delta_time)
    {
        this._solve_gravity(delta_time);
        this._solve_lengths(delta_time);
        this._solve_volumes(delta_time);
        this._update_bone_mesh();

        this.velocities.assign_difference_of(this.positions, this.last_positions, 0, 0, 0, 1.0 / delta_time, this.num_particles);
    }

    render(delta_time)
    {
        this._update_skin_mesh();
    }

    squash()
    {
        for (let i = 0; i < this.num_particles; i++) {
            this.positions.data[i * 3 + 1] = 0.5;
        }
        this._update_bone_mesh();
    }

    visualize_bone(showing = true)
    {
        this.bone_mesh.visible = showing;
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
        let index0 = this.tetrahedron_indices[index++];
        let index1 = this.tetrahedron_indices[index++];
        let index2 = this.tetrahedron_indices[index++];
        let index3 = this.tetrahedron_indices[index++];
        this.volume_scratch.assign_difference_of(this.positions, this.positions, 0, index1, index0);
        this.volume_scratch.assign_difference_of(this.positions, this.positions, 1, index2, index0);
        this.volume_scratch.assign_difference_of(this.positions, this.positions, 2, index3, index0);
        this.volume_scratch.assign_cross_of(this.volume_scratch, this.volume_scratch, 3, 0, 1);
        return this.volume_scratch.dot(this.volume_scratch, 2, 3) / 6.0;
    }

    _edge_length_of(index)
    {
        index *= 2;
        let index0 = this.tetrahedron_edge_indices[index++];
        let index1 = this.tetrahedron_edge_indices[index++];
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
        for (let i = 0, j = 0; i < this.tetrahedron_edge_indices.length;) {
            index_scratch[0] = this.tetrahedron_edge_indices[i++];
            index_scratch[1] = this.tetrahedron_edge_indices[i++];
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
        for (let i = 0, j = 0; i < this.tetrahedron_indices.length;) {
            for (let k = 0; k < 4; k++) {
                index_scratch[k] = this.tetrahedron_indices[i++];
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

    _skinning(skin)
    {
        let spacing = 0.05;
        let skin_positions = Compact_Vector3.from_array(skin.vertices);
        let hasher = Hasher.from(spacing, skin_positions);
        hasher.rehash();

        let bloating_radius = 1;
        let skinning_scratch = this.skinning_scratch;
        let barycentric_scratch = this.barycentric_scratch;
        let barycentric_distances = new Float32Array(skin_positions.size);
        barycentric_distances.fill(Number.MAX_VALUE);
        for (let i = 0, j = 0; i < this.num_tetrahedra; i++) {
            skinning_scratch.clear(0, skinning_scratch.size);

            let index0 = this.tetrahedron_indices[j++];
            let index1 = this.tetrahedron_indices[j++];
            let index2 = this.tetrahedron_indices[j++];
            let index3 = this.tetrahedron_indices[j++];
            skinning_scratch.add(this.positions, 3, index0, 0.25);
            skinning_scratch.add(this.positions, 3, index1, 0.25);
            skinning_scratch.add(this.positions, 3, index2, 0.25);
            skinning_scratch.add(this.positions, 3, index3, 0.25);

            let radius_square = 0.0;
            radius_square = Math.max(radius_square, skinning_scratch.distance_square_from(this.positions, 3, index0));
            radius_square = Math.max(radius_square, skinning_scratch.distance_square_from(this.positions, 3, index1));
            radius_square = Math.max(radius_square, skinning_scratch.distance_square_from(this.positions, 3, index2));
            radius_square = Math.max(radius_square, skinning_scratch.distance_square_from(this.positions, 3, index3));
            let concern_radius = Math.floor(Math.sqrt(radius_square) / spacing) + bloating_radius;

            skinning_scratch.assign_difference_of(this.positions, this.positions, 0, index0, index3);
            skinning_scratch.assign_difference_of(this.positions, this.positions, 1, index1, index3);
            skinning_scratch.assign_difference_of(this.positions, this.positions, 2, index2, index3);
            barycentric_scratch.copy(skinning_scratch).transpose().inverse();

            hasher.concern_about(skinning_scratch.data[9], skinning_scratch.data[10], skinning_scratch.data[11], concern_radius);
            for (let k = 0; k < hasher.concern_count; k++) {
                let index = hasher.concern_entries[k];
                if (barycentric_distances[index] <= 0.0) continue;
                if (skin_positions.distance_square_from(skinning_scratch, index, 3) > radius_square) continue;

                skinning_scratch.assign_difference_of(skin_positions, this.positions, 1, index, index3);
                barycentric_scratch.multiply(skinning_scratch, skinning_scratch, 1, 0);
                let b1 = skinning_scratch.data[0];
                let b2 = skinning_scratch.data[1];
                let b3 = skinning_scratch.data[2];
                let b4 = 1.0 - b1 - b2 - b3;
                let barycentric_distance = Math.max(-b1, Math.max(-b2, Math.max(-b3, Math.max(-b4))));
                if (barycentric_distance < barycentric_distances[index]) {
                    barycentric_distances[index] = barycentric_distance;
                    this.skin_attachment[index] = i;

                    index *= 4;
                    this.skin_coordinates[index++] = b1;
                    this.skin_coordinates[index++] = b2;
                    this.skin_coordinates[index++] = b3;
                    this.skin_coordinates[index++] = b4;
                }
            }
        }
    }

    _update_bone_mesh()
    {
        this.bone_mesh.geometry.attributes.position.needsUpdate = true;
        this.bone_mesh.geometry.computeBoundingSphere();
    }

    _update_skin_mesh()
    {
        let skin_positions = Compact_Vector3.from_float32_array(this.skin_mesh.geometry.attributes.position.array);
        skin_positions.clear(0, skin_positions.size);
        for (let i = 0, j = 0; i < this.num_vertices; i++) {
            let tetrahedron_index_index = this.skin_attachment[i] * 4;
            let index0 = this.tetrahedron_indices[tetrahedron_index_index++];
            let index1 = this.tetrahedron_indices[tetrahedron_index_index++];
            let index2 = this.tetrahedron_indices[tetrahedron_index_index++];
            let index3 = this.tetrahedron_indices[tetrahedron_index_index++];
            let b1 = this.skin_coordinates[j++];
            let b2 = this.skin_coordinates[j++];
            let b3 = this.skin_coordinates[j++];
            let b4 = this.skin_coordinates[j++];
            skin_positions.add(this.positions, i, index0, b1);
            skin_positions.add(this.positions, i, index1, b2);
            skin_positions.add(this.positions, i, index2, b3);
            skin_positions.add(this.positions, i, index3, b4);
        }

        this.skin_mesh.geometry.attributes.position.needsUpdate = true;
        this.skin_mesh.geometry.computeVertexNormals();
        this.skin_mesh.geometry.computeBoundingSphere();
    }
};

