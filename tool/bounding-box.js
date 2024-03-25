class Axis_Aligned_Bounding_Box
{
    constructor()
    {
        this.min = new THREE.Vector3(+Infinity);
        this.max = new THREE.Vector3(-Infinity);
    }

    static from(min, max)
    {
        let result = new Axis_Aligned_Bounding_Box();
        result.min.copy(min);
        result.max.copy(max);
        return result;
    }

    static from_triangle_mesh(point0, point1, point2)
    {
        let result = new Axis_Aligned_Bounding_Box();
        result.min.min(point0).min(point1).min(point2);
        result.max.max(point0).max(point1).max(point2);
        return result;
    }

    static from_merging_axis_aligned_bounding_boxes(a, b)
    {
        return new Axis_Aligned_Bounding_Box().merge(a).merge(b);
    }

    static from_crossing_axis_aligned_bounding_boxes(a, b)
    {
        return new Axis_Aligned_Bounding_Box().cross(a).cross(b);
    }

    clone()
    {
        return new Axis_Aligned_Bounding_Box().copy(this);
    }

    copy(a)
    {
        this.min.copy(a.min);
        this.max.copy(a.max);
        return this;
    }

    merge(a)
    {
        this.min.min(a.min);
        this.max.max(a.max);
        return this;
    }

    cross(a)
    {
        this.min.max(a.min);
        this.max.min(a.min);
        return this;
    }

    validate()
    {
        if (this.min.x > this.max.x) this.min.x = Infinity; this.max.x = -Infinity;
        if (this.min.y > this.max.y) this.min.y = Infinity; this.max.y = -Infinity;
        if (this.min.z > this.max.z) this.min.z = Infinity; this.max.z = -Infinity;
    }

    empty()
    {
        return !(this.min.x < this.max.x && this.min.y < this.max.y && this.min.z < this.max.z);
    }

    volume()
    {
        if (this.empty()) {
            return 0.0;
        } else {
            return (this.max.x - this.min.x) * (this.max.y - this.min.y) * (this.max.z - this.min.z);
        }
    }

    hit_by(beginning, direction)
    {
        let t_min = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        let t_max = new THREE.Vector3(+Infinity, +Infinity, +Infinity);
        if (direction.x != 0) {
            t_min.x = (this.min.x - beginning.x) / direction.x;
            t_max.x = (this.max.x - beginning.x) / direction.x;
        }
        if (direction.y != 0) {
            t_min.y = (this.min.y - beginning.y) / direction.y;
            t_max.y = (this.max.y - beginning.y) / direction.y;
        }
        if (direction.z != 0) {
            t_min.z = (this.min.z - beginning.z) / direction.z;
            t_max.z = (this.max.z - beginning.z) / direction.z;
        }
        let max_of_min = Math.max(t_min.x, t_min.y, t_min.z);
        let min_of_max = Math.min(t_max.x, t_max.y, t_max.z);
        return (max_of_min <= min_of_max && min_of_max >= 0);
    }
}

