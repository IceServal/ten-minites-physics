class Vector2
{
    constructor()
    {
        this.x = 0.0;
        this.y = 0.0;
    }

    static from_components(x, y)
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
        let length = Math.sqrt(this.dot(this));
        return length;
    }

    angle()
    {
        let angle = Math.atan2(this.y, this.x);
        return angle;
    }
};

