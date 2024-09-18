class Tank
{
    constructor()
    {
        this.x_bounds = Vector2.from_components(0.0, 1.0);
        this.y_bounds = Vector2.from_components(0.0, 1.0);
        this.subjects = [];
    }

    static from(x_bounds, y_bounds)
    {
        let result = new Tank();
        result.x_bounds = Vector2.from_components(
            Math.min(x_bounds.x, x_bounds.y),
            Math.max(x_bounds.x, x_bounds.y),
        );
        result.y_bounds = Vector2.from_components(
            Math.min(y_bounds.x, y_bounds.y),
            Math.max(y_bounds.x, y_bounds.y),
        );
        return result;
    }

    clone()
    {
        let result = new Tank().copy(this);
        return result;
    }

    copy(a)
    {
        this.x_bounds = a.x_bounds.clone();
        this.y_bounds = a.y_bounds.clone();
        return this;
    }

    act_on(kinematic_body, delta_time)
    {
        let x_bounds = this.x_bounds;
        let y_bounds = this.y_bounds;
        let position = kinematic_body.position;
        let velocity = kinematic_body.velocity;
        if (false) {}
        else if (position.x <= x_bounds.x) {
            position.x = x_bounds.x;
            velocity.x = +Math.abs(velocity.x);
        }
        else if (position.x >= x_bounds.y) {
            position.x = x_bounds.y;
            velocity.x = -Math.abs(velocity.x);
        }
        if (false) {}
        else if (position.y <= y_bounds.x) {
            position.y = y_bounds.x;
            velocity.y = +Math.abs(velocity.y);
        }
        else if (position.y >= y_bounds.y) {
            position.y = y_bounds.y;
            velocity.y = -Math.abs(velocity.y);
        }
    }

    prepare(delta_time) {}

    apply(delta_time)
    {
        let subjects = this.subjects;
        for (let i = 0; i < subjects.length; i++) {
            this.act_on(subjects[i], delta_time);
        }
    }

    finalize(delta_time) {}

    render(canvas) {}
};

