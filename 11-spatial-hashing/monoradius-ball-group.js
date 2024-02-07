class Hasher
{
    constructor()
    {
        this.spacing = 0.0;
        this.num_objects = 0;
        this.positions = Compact_Vector3.from_size(this.num_objects);
        this.table_size = 2 * this.num_objects;
        this.cell_starts = new Int32Array(this.table_size + 1);
        this.cell_entries = new Int32Array(this.num_objects);
        this.concern_entries = new Int32Array(this.num_objects);
        this.concern_count = 0;
    }

    static from(spacing, positions)
    {
        let result = new Hasher();
        result.spacing = spacing;
        result.positions = positions;
        result.num_objects = positions.size;
        result.table_size = 2 * result.num_objects;
        result.cell_starts = new Int32Array(result.table_size + 1);
        result.cell_entries = new Int32Array(result.num_objects);
        result.concern_entries = new Int32Array(result.num_objects);

        return result;
    }

    rehash()
    {
        let positions = this.positions;
        let scratch = this.concern_entries;
        let cell_starts = this.cell_starts;
        let cell_entries = this.cell_entries;
        cell_starts.fill(0);
        for (let i = 0, j = 0; i < this.num_objects; i++) {
            let x = positions.data[j++];
            let y = positions.data[j++];
            let z = positions.data[j++];
            let hash = this._hash_grid_indices(this._grid_index_of(x), this._grid_index_of(y), this._grid_index_of(z));
            cell_starts[hash]++;
            scratch[i] = hash;
        }
        let partial_sum = 0;
        for (let i = 0; i < cell_starts.length; i++) {
            partial_sum += cell_starts[i];
            cell_starts[i] = partial_sum;
        }
        for (let i = 0; i < this.num_objects; i++) {
            let index = --cell_starts[scratch[i]];
            cell_entries[index] = i;
        }
    }

    concern_about(x, y, z, radius)
    {
        let cell_starts = this.cell_starts;
        let cell_entries = this.cell_entries;
        let concern_entries = this.concern_entries;

        this.concern_count = 0;
        let grid_x = this._grid_index_of(x);
        let grid_y = this._grid_index_of(y);
        let grid_z = this._grid_index_of(z);
        for (let i = grid_x - radius; i <= grid_x + radius; i++) {
            for (let j = grid_y - radius; j <= grid_y + radius; j++) {
                for (let k = grid_z - radius; k <= grid_z + radius; k++) {
                    let hash = this._hash_grid_indices(i, j, k);
                    for (let l = cell_starts[hash]; l < cell_starts[hash + 1]; l++) {
                        concern_entries[this.concern_count++] = cell_entries[l];
                    }
                }
            }
        }
    }

    _grid_index_of(a)
    {
        return Math.floor(a / this.spacing);
    }

    _hash_grid_indices(x, y, z)
    {
        let magic = (x * 92837111) ^ (y * 689287499) ^ (z * 283923481);
        return Math.abs(magic) % this.table_size;
    }
};

class Monoradius_Ball_Group
{
    constructor()
    {
        this.radius = 0.0;
        this.num_balls = 0;

        this.positions = Compact_Vector3.from_size(this.num_balls);
        this.velocities = Compact_Vector3.from_size(this.num_balls);
        this.hasher = new Hasher();

        this.normal_ball_color = new THREE.Color(0xFF0000);
        this.bounced_ball_color = new THREE.Color(0x00FF00);
        this.collided_ball_color = new THREE.Color(0x0000FF);
        this.matrix_scratch = new THREE.Matrix4();
        this.collision_scratch = Compact_Vector3.from_size(3);

        this.colorful = false;
    }

    static from(radius, positions, velocities)
    {
        let result = new Monoradius_Ball_Group();
        if (positions.size != velocities.size) {
            console.log("Mismatched size between positions and velocities.");
            return result;
        }

        result.radius = radius;
        result.positions = positions.clone();
        result.velocities = velocities.clone();
        result.num_balls = result.positions.size;
        result.hasher = Hasher.from(2.0 * result.radius, result.positions);

        let geometry = new THREE.SphereGeometry(result.radius, 8, 8);
        let material = new THREE.MeshPhongMaterial();
        result.mesh = new THREE.InstancedMesh(geometry, material, result.num_balls);
        result.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        let colors = Compact_Vector3.from_size(result.num_balls);
        result.mesh.instanceColor = new THREE.InstancedBufferAttribute(colors.data, 3, false, 1);
        for (let i = 0; i < result.num_balls; i++) result.mesh.setColorAt(i, result.normal_ball_color);
        result._update_mesh();

        return result;
    }

    act(delta_time)
    {
        let positions = this.positions;
        let velocities = this.velocities;

        let gravity = world.gravity;
        velocities.translate(gravity.x, gravity.y, gravity.z, delta_time);
        positions.add(velocities, 0, 0, delta_time, this.num_balls);

        for (let i = 0; i < this.num_balls; i++) this.mesh.setColorAt(i, this.normal_ball_color);

        let radius = this.radius;
        let colorful = this.colorful;
        for (let i = 0; i < this.num_balls; i++) {
            for (let dimention = 0; dimention < 3; dimention++) {
                let bound = world.bounds[dimention];
                let index = i * 3 + dimention;
                if (false) {}
                else if (positions.data[index] < bound[0] + radius) {
                    positions.data[index] = bound[0] + radius;
                    velocities.data[index] *= -1.0;
                    if (colorful) this.mesh.setColorAt(i, this.bounced_ball_color);
                }
                else if (positions.data[index] > bound[1] - radius) {
                    positions.data[index] = bound[1] - radius;
                    velocities.data[index] *= -1.0;
                    if (colorful) this.mesh.setColorAt(i, this.bounced_ball_color);
                }
            }
        }

        let hasher = this.hasher;
        let min_distance = 2 * this.radius;
        let scratch = this.collision_scratch;
        hasher.rehash();
        for (let i = 0; i < this.num_balls; i++) {
            scratch.assign(positions, 0, i);
            hasher.concern_about(scratch.data[0], scratch.data[1], scratch.data[2], 1);
            for (let j = 0; j < hasher.concern_count; j++) {
                let entry = hasher.concern_entries[j];
                scratch.assign(positions, 1, entry);
                scratch.assign_difference_of(scratch, scratch, 2, 1, 0);
                let distance = Math.sqrt(scratch.length_square(2));
                if (distance > 0.0 && distance < min_distance) {
                    scratch.scale(1.0 / distance, 2);

                    let correction = (min_distance - distance) * 0.5;
                    positions.add(scratch, i,     2, -correction);
                    positions.add(scratch, entry, 2, +correction);

                    let projection_length0 = velocities.dot(scratch, i, 2);
                    let projection_length1 = velocities.dot(scratch, entry, 2);
                    velocities.add(scratch, i,     2, projection_length1 - projection_length0);
                    velocities.add(scratch, entry, 2, projection_length0 - projection_length1);

                    if (colorful) {
                        this.mesh.setColorAt(i,     this.collided_ball_color);
                        this.mesh.setColorAt(entry, this.collided_ball_color);
                    }
                }
            }
        }

        this._update_mesh();
    }

    _update_mesh()
    {
        let positions = this.positions;
        let scratch = this.matrix_scratch;
        for (let i = 0, j = 0; i < this.num_balls; i++) {
            let x = positions.data[j++];
            let y = positions.data[j++];
            let z = positions.data[j++];
            scratch.makeTranslation(x, y, z);
            this.mesh.setMatrixAt(i, scratch);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor.needsUpdate = true;
    }
};

