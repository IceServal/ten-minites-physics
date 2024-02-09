class Matrix3x3
{
    constructor()
    {
        this.data = new Float32Array(9);
    }

    static from_array(array)
    {
        let result = new Matrix3x3();
        switch (array.length) {
            case 1: {
                result.data[0] = array[0];
                result.data[4] = array[0];
                result.data[8] = array[0];
            }
            case 3: {
                result.data[0] = array[0];
                result.data[4] = array[1];
                result.data[8] = array[2];
            }
            default: {
                let length = Math.min(array.length, 9);
                for (let i = 0; i < length; i++) {
                    result.data[i] = array[i];
                }
            }
        }

        return result;
    }

    static from_compact_vector3(compact_vector3)
    {
        return Matrix3x3.from_array(compact_vector3.data);
    }

    clone()
    {
        let result = new Matrix3x3().copy(this);
        return result;
    }

    copy(a)
    {
        this.data = a.data.slice();
        return this;
    }

    clear()
    {
        for (let i = 0; i < 9; i++) this.data[i] = 0.0;
        return this;
    }

    scale(scaling)
    {
        for (let i = 0; i < 9; i++) this.data[i] *= scaling;
        return this;
    }

    assign_sum_of(a, b)
    {
        for (let i = 0; i < 9; i++) this.data[i] = a.data[i] + b.data[i];
        return this;
    }

    assign_difference_of(a, b)
    {
        for (let i = 0; i < 9; i++) this.data[i] = a.data[i] - b.data[i];
        return this;
    }

    inverse()
    {
        let determinant = this.determinant();
        if (determinant == 0.0) {
            this.clear();
            return this;
        }

        let a11 = this.data[0];
        let a12 = this.data[1];
        let a13 = this.data[2];
        let a21 = this.data[3];
        let a22 = this.data[4];
        let a23 = this.data[5];
        let a31 = this.data[6];
        let a32 = this.data[7];
        let a33 = this.data[8];
        this.data[0] = +(a22 * a33 - a23 * a32);
        this.data[1] = -(a12 * a33 - a13 * a32);
        this.data[2] = +(a12 * a23 - a13 * a22);
        this.data[3] = -(a21 * a33 - a23 * a31);
        this.data[4] = +(a11 * a33 - a13 * a31);
        this.data[5] = -(a11 * a23 - a13 * a21);
        this.data[6] = +(a21 * a32 - a22 * a31);
        this.data[7] = -(a11 * a32 - a12 * a31);
        this.data[8] = +(a11 * a22 - a12 * a21);

        this.scale(1.0 / determinant);
        return this;
    }

    add(a, scaling = 1.0)
    {
        for (let i = 0; i < 9; i++) this.data[i] += a.data[i] * scaling;
        return this;
    }

    subtract(a, scaling = 1.0)
    {
        for (let i = 0; i < 9; i++) this.data[i] -= a.data[i] * scaling;
        return this;
    }

    multiply(vector, result, index0, index1)
    {
        result.clear(index1);
        result.assign_components_of(
            vector.dot(this, index0, 0),
            vector.dot(this, index0, 1),
            vector.dot(this, index0, 2),
            1.0,
            index1,
            1,
        );
        return this;
    }

    transpose()
    {
        let a12 = this.data[1];
        let a13 = this.data[2];
        let a21 = this.data[3];
        let a23 = this.data[5];
        let a31 = this.data[6];
        let a32 = this.data[7];
        this.data[1] = a21;
        this.data[2] = a31;
        this.data[3] = a12;
        this.data[5] = a32;
        this.data[6] = a13;
        this.data[7] = a23;
        return this;
    }

    determinant()
    {
        let a11 = this.data[0];
        let a12 = this.data[1];
        let a13 = this.data[2];
        let a21 = this.data[3];
        let a22 = this.data[4];
        let a23 = this.data[5];
        let a31 = this.data[6];
        let a32 = this.data[7];
        let a33 = this.data[8];
        return a11 * (a22 * a33 - a23 * a32) - a12 * (a21 * a33 - a23 * a31) + a13 * (a21 * a32 - a22 * a31);
    }
};

