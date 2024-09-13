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

        this.fill_color = "#00FFFF";
        this.edge_color = "#000000";
        this.edge_width = 0.0;
    }

    static from(body_circle, density, velocity, restitution, fill_color = "#DDDDDD", edge_color = "#000000", edge_width = 0.0)
    {
        let result = new Disk();
        result.body.copy(body_circle);
        result.mass.set_density(density);
        result.velocity.copy(velocity);
        result.restitution = restitution;
        result.fill_color = fill_color;
        result.edge_color = edge_color;
        result.edge_width = edge_width;
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

        this.fill_color = a.fill_color;
        this.edge_color = a.edge_color;
        this.edge_width = a.edge_width;

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
        canvas.render_circle(this.body, this.fill_color);
        if (this.edge_width > 0.0) {
            canvas.render_wireframe_circle(this.body, this.edge_width, this.edge_color);
        }
    }
};

