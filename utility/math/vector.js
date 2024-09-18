class Vector2
{
    constructor()
    {
        this.x = 0.0;
        this.y = 0.0;
    }

    static from_components(x = 0.0, y = 0.0)
    {
        let result = new Vector2().set_components(x, y);
        return result;
    }

    static from_sum_of(a, b)
    {
        let result = Vector2.from_components(a.x + b.x, a.y + b.y);
        return result;
    }

    static from_difference_of(a, b)
    {
        let result = Vector2.from_components(a.x - b.x, a.y - b.y);
        return result;
    }

    static from_mix_of(a, b, ratio)
    {
        let one_minus_ratio = 1.0 - ratio;
        let result = Vector2.from_components(
            one_minus_ratio * a.x + ratio * b.x,
            one_minus_ratio * a.y + ratio * b.y,
        );
        return result;
    }

    clone()
    {
        let result = new Vector2().copy(this);
        return result;
    }

    perpendicular_one()
    {
        let result = Vector2.from_components(-this.y, this.x);
        return result;
    }

    copy(a)
    {
        this.set_components(a.x, a.y);
        return this;
    }

    set_components(x, y)
    {
        this.x = x;
        this.y = y;
        return this;
    }

    add(a, scaling = 1.0)
    {
        this.x += scaling * a.x;
        this.y += scaling * a.y;
        return this;
    }

    add_components(x, y, scaling = 1.0)
    {
        this.x += scaling * x;
        this.y += scaling * y;
        return this;
    }

    subtract(a, scaling = 1.0)
    {
        this.x -= scaling * a.x;
        this.y -= scaling * a.y;
        return this;
    }

    scale(scaling)
    {
        this.x *= scaling;
        this.y *= scaling;
        return this;
    }

    elementwise_min(a)
    {
        this.x = Math.min(this.x, a.x);
        this.y = Math.min(this.y, a.y);
        return this;
    }

    elementwise_max(a)
    {
        this.x = Math.max(this.x, a.x);
        this.y = Math.max(this.y, a.y);
        return this;
    }

    floor()
    {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    ceil()
    {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }

    round()
    {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    clamp(min = Vector2.from_components(), max = Vector2.from_components(1.0, 1.0))
    {
        this.x = Math.min(Math.max(this.x, min.x), max.x);
        this.y = Math.min(Math.max(this.y, min.y), max.y);
        return this;
    }

    mix_with(a, ratio)
    {
        let one_minus_ratio = 1.0 - ratio;
        this.x = one_minus_ratio * this.x + ratio * a.x;
        this.y = one_minus_ratio * this.y + ratio * a.y;
        return this;
    }

    normalize()
    {
        let length = this.length();
        if (length != 0.0) this.scale(1.0 / length);
        return length;
    }

    dot(a)
    {
        let result = this.x * a.x + this.y * a.y;
        return result;
    }

    length()
    {
        return Math.sqrt(this.length_squared());
    }

    length_squared()
    {
        return this.dot(this);
    }

    distance_from(a)
    {
        return Math.sqrt(this.distance_squared_from(a));
    }

    distance_squared_from(a)
    {
        return Vector2.from_difference_of(this, a).length_squared();
    }

    angle()
    {
        let angle = Math.atan2(this.y, this.x);
        return angle;
    }
};

