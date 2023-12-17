class Vector2
{
    constructor(x = 0.0, y = 0.0)
    {
        this.x = x;
        this.y = y;
    }

    clone()
    {
        return new Vector2(this.x, this.y);
    }

    perpendicular_one()
    {
        return new Vector2(-this.y, this.x);
    }

    from_vector2(a)
    {
        this.x = a.x;
        this.y = a.y;
        return this;
    }

    from_sum_of_vector2(a, b)
    {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        return this;
    }

    from_difference_of_vector2(a, b)
    {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        return this;
    }

    add(a, scale = 1.0)
    {
        this.x += scale * a.x;
        this.y += scale * a.y;
        return this;
    }

    subtract(a, scale = 1.0)
    {
        this.x -= scale * a.x;
        this.y -= scale * a.y;
        return this;
    }

    scale(scale_)
    {
        this.x *= scale_;
        this.y *= scale_;
        return this;
    }

    dot(a)
    {
        return this.x * a.x + this.y * a.y;
    }

    length()
    {
        return Math.sqrt(this.dot(this));
    }

    distance_from(a)
    {
        return this.clone().subtract(a).length();
    }

    normalize()
    {
        let length = this.length();
        if (length != 0) this.scale(1.0 / length);

        return length;
    }
};

