class Circle
{
    constructor()
    {
        this.center = new Vector2();
        this.radius = 0.0;
        this.area = 0.0;
    }

    static from(center, radius)
    {
        let result = new Circle();
        result.center.copy(center);
        result.set_radius(radius)
        return result;
    }

    clone()
    {
        let result = new Circle().copy(this);
        return result;
    }

    copy(a)
    {
        this.center.copy(a.center);
        this.radius = a.radius;
        this.area = a.area;
        return this;
    }

    set_radius(radius)
    {
        this.radius = radius;
        this.area = Math.PI * this.radius * this.radius;
        return this;
    }
};

