let origin_circle = new Circle();

class Mass
{
    constructor()
    {
        this.borrowed_body = origin_circle;
        this.density = 0.0;
        this.value = 0.0;
    }

    static from(body, density)
    {
        let result = new Mass();
        result.borrowed_body = body;
        result.density = density;
        result.update();
        return result;
    }

    reborrow(body)
    {
        this.borrowed_body = body;
        this.update();
        return this;
    }

    set_density(density)
    {
        this.density = density;
        this.update();
        return this;
    }

    update()
    {
        this.value = this.borrowed_body.area * this.density;
    }
};

