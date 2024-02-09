class Hasher
{
    constructor()
    {
        this.spacing = 0.0;
        this.num_objects = 0;
        this.table_size = 0;
        this.borrowed_positions = null;
        this.cell_starts = null;
        this.cell_entries = null;
        this.concern_entries = null;
        this.concern_count = 0;
    }

    static from(spacing, borrowed_positions)
    {
        let result = new Hasher();
        result.spacing = spacing;
        result.num_objects = borrowed_positions.size;
        result.table_size = 2 * result.num_objects;
        result.borrowed_positions = borrowed_positions;
        result.cell_starts = new Int32Array(result.table_size + 1);
        result.cell_entries = new Int32Array(result.num_objects);
        result.concern_entries = new Int32Array(result.num_objects);

        return result;
    }

    rehash()
    {
        let borrowed_positions = this.borrowed_positions;
        let scratch = this.concern_entries;
        let cell_starts = this.cell_starts;
        let cell_entries = this.cell_entries;
        cell_starts.fill(0);
        for (let i = 0, j = 0; i < this.num_objects; i++) {
            let x = borrowed_positions.data[j++];
            let y = borrowed_positions.data[j++];
            let z = borrowed_positions.data[j++];
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

