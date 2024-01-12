class Disk
{
    constructor()
    {
        this.body = new Circle();
        this.mass = Mass.from(this.body, 0.0);
        this.position = this.body.center;   // Borrow the center of body as position.
        this.velocity = new Vector2();
        this.restitution = 0.0;
        this.acceleration = new Vector2();
    }

    static from(body_circle, density, velocity, restitution)
    {
        let result = new Disk();
        result.body.copy(body_circle);
        result.mass.set_density(density);
        result.velocity.copy(velocity);
        result.restitution = restitution;
        return result;
    }

    clone()
    {
        let result = new Disk().copy(this);
        return result;
    }

    copy(a)
    {
        this.body.copy(a.body);
        this.mass.set_density(a.density);
        this.velocity.copy(a.velocity);
        this.restitution = a.restitution;
        this.acceleration.copy(a.velocity);
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
        canvas.render_circle(this.body, "#00FFFF");
    }
};

