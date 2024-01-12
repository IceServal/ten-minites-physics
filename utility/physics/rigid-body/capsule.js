class Capsule
{
    constructor()
    {
        this.body = new Rod();
        this.mass = Mass.from(this.body, 0.0);
        this.velocity = new Vector2();
        this.restitution = 0.0;
        this.acceleration = new Vector2();
    }

    static from(body_rod, density, velocity, restitution)
    {
        let result = new Capsule();
        result.body.copy(body_rod);
        result.mass.set_density(density);
        result.velocity.copy(velocity);
        result.restitution = restitution;
        return result;
    }

    clone()
    {
        let result = new Capsule().copy(this);
        return result;
    }

    copy(a)
    {
        this.body.copy(a.body);
        this.mass.set_density(a.density);
        this.velocity.copy(a.velocity);
        this.restitution = a.restitution;
        this.acceleration.copy(a.acceleration);
        return this;
    }

    set_radius(radius)
    {
        this.body.set_radius(radius);
        this.mass.update();
    }

    set_density(density)
    {
        this.mass.set_density(density);
    }

    render(canvas)
    {
        canvas.render_rod(this.body, "#FF4477");
    }
};

