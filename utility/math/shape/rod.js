class Rod
{
    constructor()
    {
        this.line = new Line();
        this.radius = 0.0;
        this.area = 0.0;
    }

    static from(line, radius)
    {
        let result = new Rod();
        result.line.copy(line);
        result.radius = radius;
        result._update_area();
        return result;
    }

    clone()
    {
        let result = new Rod().copy(this);
        return result;
    }

    copy(a)
    {
        this.line.copy(a.line);
        this.radius = a.radius;
        this.area = a.area;
        return this;
    }

    set_line(line)
    {
        this.line.copy(line);
        this._update_area();
        return this;
    }

    set_radius(radius)
    {
        this.radius = radius;
        this._update_area();
        return this;
    }

    _update_area()
    {
        this.area = Math.PI * this.radius * this.radius + this.line.length * this.radius * 2.0;
    }
};

