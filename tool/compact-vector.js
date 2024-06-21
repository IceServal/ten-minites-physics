class Compact_Vector3
{
    constructor()
    {
        this.data = null;
        this.size = 0;
    }

    static from_size(size)
    {
        let result = new Compact_Vector3();
        result.data = new Float32Array(size * 3);
        result.size = size;
        return result;
    }

    static from_array(array)
    {
        if (array.length % 3 != 0) {
            console.log("Cannot initialize compact vector3 with an array of which size is not the multiple of 3.");
            return new Compact_Vector3();
        }

        let result = new Compact_Vector3();
        result.data = new Float32Array(array);
        result.size = array.length / 3;
        return result;
    }

    static from_float32_array(array)
    {
        if (array.length % 3 != 0) {
            console.log("Cannot initialize compact vector3 with a float32 array of which size is not the multiple of 3.");
            return new Compact_Vector3();
        }

        let result = new Compact_Vector3();
        result.data = array;
        result.size = array.length / 3;
        return result;
    }

    clone()
    {
        let result = new Compact_Vector3().copy(this);
        return result;
    }

    copy(a)
    {
        this.data = a.data.slice();
        this.size = a.size;
        return this;
    }

    num_floats()
    {
        return this.size * 3;
    }

    num_items()
    {
        return this.size;
    }

    clear(index, count = 1)
    {
        for (let i = index * 3; i < (index + count) * 3; i++) this.data[i] = 0.0;
        return this;
    }

    scale(scaling, index, count = 1)
    {
        for (let i = index * 3; i < (index + count) * 3; i++) this.data[i] *= scaling;
        return this;
    }

    assign(a, index0, index1, count = 1)
    {
        index0 *= 3;
        index1 *= 3;
        for (let i = 0; i < count * 3; i++) this.data[index0 + i] = a.data[index1 + i];
        return this;
    }

    assign_components_of(x, y, z, scaling = 1.0, offset = 0, count = 0)
    {
        count = (count == 0 ? this.size : count);
        for (let i = offset * 3; i < (offset + count) * 3;) {
            this.data[i++] = x * scaling;
            this.data[i++] = y * scaling;
            this.data[i++] = z * scaling;
        }
    }

    assign_difference_of(a, b, index0, index1, index2, scaling = 1.0, count = 1)
    {
        index0 *= 3;
        index1 *= 3;
        index2 *= 3;
        for (let i = 0; i < count * 3; i++) this.data[index0 + i] = (a.data[index1 + i] - b.data[index2 + i]) * scaling;
        return this;
    }

    assign_cross_of(a, b, index0, index1, index2, count = 1)
    {
        index0 *= 3;
        index1 *= 3;
        index2 *= 3;
        for (let i = 0; i < count; i++) {
            let x1 = a.data[index1++];
            let y1 = a.data[index1++];
            let z1 = a.data[index1++];
            let x2 = b.data[index2++];
            let y2 = b.data[index2++];
            let z2 = b.data[index2++];
            this.data[index0++] = y1 * z2 - y2 * z1;
            this.data[index0++] = z1 * x2 - x1 * z2;
            this.data[index0++] = x1 * y2 - x2 * y1;
        }
        return this;
    }

    x(index)
    {
        return this.data[index * 3];
    }

    y(index)
    {
        return this.data[index * 3 + 1];
    }

    z(index)
    {
        return this.data[index * 3 + 2];
    }

    assign_x(index, value)
    {
        this.data[index * 3] = value;
    }

    assign_y(index, value)
    {
        this.data[index * 3 + 1] = value;
    }

    assign_z(index, value)
    {
        this.data[index * 3 + 2] = value;
    }

    add(a, index0, index1, scaling = 1.0, count = 1)
    {
        index0 *= 3;
        index1 *= 3;
        for (let i = 0; i < count * 3; i++) this.data[index0 + i] += a.data[index1 + i] * scaling;
        return this;
    }

    subtract(a, index0, index1, scaling = 1.0, count = 1)
    {
        index0 *= 3;
        index1 *= 3;
        for (let i = 0; i < count * 3; i++) this.data[index0 + i] -= a.data[index1 + i] * scaling;
        return this;
    }

    translate(x, y, z, scaling = 1.0, offset = 0, count = 0)
    {
        count = (count == 0 ? this.size : count);
        for (let i = offset * 3; i < (offset + count) * 3;) {
            this.data[i++] += x * scaling;
            this.data[i++] += y * scaling;
            this.data[i++] += z * scaling;
        }

        return this;
    }

    length(index)
    {
        return Math.sqrt(this.length_square(index));
    }

    length_square(index)
    {
        index *= 3;
        let x = this.data[index];
        let y = this.data[index + 1];
        let z = this.data[index + 2];
        return x * x + y * y + z * z;
    }

    distance_from(a, index0, index1)
    {
        return Math.sqrt(this.distance_square_from(a, index0, index1));
    }

    distance_square_from(a, index0, index1)
    {
        index0 *= 3;
        index1 *= 3;
        let x = a.data[index1] - this.data[index0];
        let y = a.data[index1 + 1] - this.data[index0 + 1];
        let z = a.data[index1 + 2] - this.data[index0 + 2];
        return x * x + y * y + z * z;
    }

    dot(a, index0, index1)
    {
        index0 *= 3;
        index1 *= 3;
        let result0 = this.data[index0] * a.data[index1];
        let result1 = this.data[index0 + 1] * a.data[index1 + 1];
        let result2 = this.data[index0 + 2] * a.data[index1 + 2];
        return result0 + result1 + result2;
    }
};

