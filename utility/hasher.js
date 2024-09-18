class Hasher
{
    constructor()
    {
        this.spacing = 0.0;
        this.borrowed_positions = [];
        this.num_objects = 0;
        this.table_size = 0;
        this.cell_starts = new Int32Array(1);
        this.cell_entries = new Int32Array();
        this.concern_entries = new Int32Array();
        this.concern_count = 0;
    }

    static from(spacing, positions)
    {
        let result = new Hasher();
        result.spacing = spacing;
        result.borrowed_positions = positions;

        let num_objects = result.borrowed_positions.length / 2;
        result.num_objects = num_objects;
        result.table_size = 2 * num_objects;
        result.cell_starts = new Int32Array(result.table_size + 1);
        result.cell_entries = new Int32Array(num_objects);
        result.concern_entries = new Int32Array(num_objects);

        return result;
    }

    rehash()
    {
        let scratch = this.concern_entries;
        let positions = this.borrowed_positions;
        let num_objects = this.num_objects;
        let cell_starts = this.cell_starts;
        let cell_entries = this.cell_entries;
        cell_starts.fill(0);
        for (let i = 0, index = 0; i < num_objects; i++) {
            let x = positions[index++];
            let y = positions[index++];
            let hash = this._hash_grid_indices(this._grid_index_of(x), this._grid_index_of(y));
            cell_starts[hash]++;
            scratch[i] = hash;
        }
        let partial_sum = 0;
        for (let i = 0; i < cell_starts.length; i++) {
            partial_sum += cell_starts[i];
            cell_starts[i] = partial_sum;
        }
        for (let i = 0; i < cell_entries.length; i++) {
            let index = --cell_starts[scratch[i]];
            cell_entries[index] = i * 2;
        }

        return this;
    }

    concern_on(x, y)
    {
        let cell_starts = this.cell_starts;
        let cell_entries = this.cell_entries;
        let concern_entries = this.concern_entries;
        let grid_x = this._grid_index_of(x);
        let grid_y = this._grid_index_of(y);
        let hash = this._hash_grid_indices(grid_x, grid_y);
        this.concern_count = 0;
        for (let k = cell_starts[hash]; k < cell_starts[hash + 1]; k++) {
            concern_entries[this.concern_count++] = cell_entries[k];
        }
    }

    concern_around(x, y, radius)
    {
        let cell_starts = this.cell_starts;
        let cell_entries = this.cell_entries;
        let concern_entries = this.concern_entries;
        let grid_x = this._grid_index_of(x);
        let grid_y = this._grid_index_of(y);
        this.concern_count = 0;
        for (let i = grid_x - radius; i <= grid_x + radius; i++) {
            for (let j = grid_y - radius; j <= grid_y + radius; j++) {
                let hash = this._hash_grid_indices(i, j);
                for (let k = cell_starts[hash]; k < cell_starts[hash + 1]; k++) {
                    concern_entries[this.concern_count++] = cell_entries[k];
                }
            }
        }
    }

    self_inspect_with_radius(radius)
    {
        let positions = this.borrowed_positions;
        let num_objects = this.num_objects;
        let next_offset = 0;
        let indices = new Int32Array(num_objects * 2);
        let offsets = new Int32Array(num_objects + 1);
        let concern_entries = this.concern_entries;
        for (let i = 0, k = 0; i < num_objects; i++, k += 2) {
            offsets[i] = next_offset;

            let l = k + 1;
            this.concern_around(positions[k], positions[l], radius);
            for (let j = 0; j < this.concern_count; j++) {
                let entry = concern_entries[j];
                if (entry <= k) continue;

                if (next_offset >= indices.length) {
                    let double_sized_indices = new Int32Array(indices.length * 2);
                    double_sized_indices.set(indices);
                    indices = double_sized_indices;
                }

                indices[next_offset++] = entry;
            }
        }
        offsets[num_objects] = next_offset;

        return {
            indices: indices,
            offsets: offsets,
        };
    }

    self_inspect_with_distance(distance)
    {
        let positions = this.borrowed_positions;
        let num_objects = this.num_objects;
        let indices = new Int32Array(num_objects * 2);
        let offsets = new Int32Array(num_objects + 1);
        let next_offset = 0;
        let distance_square = distance * distance;
        let distance_radius = Math.ceil(distance / this.spacing);
        let concern_entries = this.concern_entries;
        for (let i = 0, k = 0; i < num_objects; i++, k += 2) {
            offsets[i] = next_offset;

            let l = k + 1;
            let x_0 = positions[k];
            let y_0 = positions[l];
            this.concern_around(x_0, y_0, distance_radius);
            for (let j = 0; j < this.concern_count; j++) {
                let entry_x = concern_entries[j];
                if (entry_x <= k) continue;

                let entry_y = entry_x + 1;
                let x_1 = positions[entry_x];
                let y_1 = positions[entry_y];
                let delta_x = x_1 - x_0;
                let delta_y = y_1 - y_0;
                let current_distance_square = delta_x * delta_x + delta_y * delta_y;
                if (current_distance_square >= distance_square) continue;

                if (next_offset >= indices.length) {
                    let double_sized_indices = new Int32Array(indices.length * 2);
                    double_sized_indices.set(indices);
                    indices = double_sized_indices;
                }

                indices[next_offset++] = entry_x;
            }
        }
        offsets[num_objects] = next_offset;

        return {
            indices: indices,
            offsets: offsets,
        };
    }

    _grid_index_of(a)
    {
        return Math.floor(a / this.spacing);
    }

    _hash_grid_indices(x, y)
    {
        let magic = (x * 92837111) ^ (y * 689287499);
        return Math.abs(magic) % this.table_size;
    }
};

