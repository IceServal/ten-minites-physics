class Angle_Limits
{
    constructor()
    {
        this.min = 0.0;
        this.max = 0.0;
    }

    static from(min, max)
    {
        let result = new Angle_Limits();
        result.min = min;
        result.max = max;
        return result;
    }

    clone()
    {
        let result = new Angle_Limits().copy(this);
        return result;
    }

    copy(a)
    {
        this.min = a.min;
        this.max = a.max;
        return this;
    }
};

class Flipper
{
    constructor()
    {
        this.body = new Rod();
        this.angle_limits = new Angle_Limits();
        this.angular_velocity = 0.0;
        this.restitution = 0.0;

        this.selected = false;
        this.touch_identifier = -1;
        this.actual_angular_velocity = 0.0;

        let wrapper = this.event_wrapper();
        canvas.canvas.addEventListener("touchstart", wrapper.on_touch_start, false);
        canvas.canvas.addEventListener("touchend",   wrapper.on_touch_end,   false);
        canvas.canvas.addEventListener("mousedown",  wrapper.on_mouse_down,  false);
        canvas.canvas.addEventListener("mouseup",    wrapper.on_mouse_up,    false);
    }

    static from(body_rod, angle_limits, angular_velocity, restitution)
    {
        let result = new Flipper();
        result.body.copy(body_rod);
        result.angle_limits.copy(angle_limits);
        result.angular_velocity = -angular_velocity;
        result.restitution = restitution;
        return result;
    }

    clone()
    {
        let result = new Flipper().copy(this);
        return result;
    }

    copy(a)
    {
        this.body.copy(a.body_rod);
        this.angle_limits.copy(a.angle_limits);
        this.angular_velocity = a.angular_velocity;
        this.restitution = a.restitution;
        return this;
    }

    move(delta_time)
    {
        let line = this.body.line;
        let delta_angle = this.angular_velocity * delta_time;
        let old_angle = line.angle;
        let new_angle = Math.max(Math.min(old_angle + delta_angle, this.angle_limits.max), this.angle_limits.min);
        if (new_angle == old_angle) {
            this.actual_angular_velocity = 0.0;
        } else {
            this.actual_angular_velocity = this.angular_velocity;
            line.set_angle(new_angle);
        }
    }

    act_on(kinematic_body)
    {
        let line = this.body.line;
        let closest_point = line.closest_point_of(kinematic_body.position);
        let direction = Vector2.from_difference_of(closest_point, kinematic_body.position);
        let distance = direction.normalize();
        let collide_distance = kinematic_body.body.radius + this.body.radius;
        if (distance > collide_distance) return;

        let correction = collide_distance - distance;
        kinematic_body.position.subtract(direction, correction);

        let collide_velocity = kinematic_body.velocity.dot(direction);
        let surface_direction = closest_point.clone().subtract(direction, this.body.radius).subtract(line.point0);
        let surface_radius = surface_direction.normalize();
        let surface_speed = surface_radius * this.actual_angular_velocity;
        let surface_velocity = surface_direction.perpendicular_one().scale(surface_speed);
        let velocity_after = surface_velocity.dot(direction);
        let restitution = Math.min(kinematic_body.restitution, this.restitution);
        kinematic_body.velocity.subtract(direction, collide_velocity - velocity_after * restitution);
    }

    event_wrapper()
    {
        let wrapper = {flipper: this};
        wrapper.on_touch_start = function (event) {
            for (let i = 0; i < event.touches.length; i++) {
                let touch = event.touches[i];
                wrapper.flipper._try_to_be_selected_by_event(touch.clientX, touch.clientY, touch.identifier);
            }
        }
        wrapper.on_touch_end = function (event) {
            if (!wrapper.flipper.selected) return;

            for (let j = 0; j < event.touches.length; j++) {
                let touch = event.touches[j];
                wrapper.flipper._try_to_be_unselected_by(touch.identifier);
            }
        }
        wrapper.on_mouse_down = function (event) {
            wrapper.flipper._try_to_be_selected_by_event(event.clientX, event.clientY);
        }
        wrapper.on_mouse_up = function () {
            wrapper.flipper._try_to_be_unselected_by();
        }
        return wrapper;
    }

    _is_in_response_area(position)
    {
        let rod = this.body;
        let distance = Vector2.from_difference_of(position, rod.line.point0).length();
        return (distance <= rod.line.length + rod.radius ? true : false);
    }

    _try_to_be_selected_by(identifier = 0)
    {
        if (!this.selected) {
            this.selected = true;
            this.identifier = identifier;
            this.angular_velocity *= -1;
        }
    }

    _try_to_be_unselected_by(identifier = 0)
    {
        if (this.selected && this.identifier == identifier) {
            this.selected = false;
            this.identifier = -1;
            this.angular_velocity *= -1;
        }
    }

    _try_to_be_selected_by_event(event_x, event_y, identifier = 0)
    {
        let bounding_rect = canvas.canvas.getBoundingClientRect();
        let hit_position = plotting_scale.canvas_to_world(Vector2.from_components(
            event_x - bounding_rect.left,
            event_y - bounding_rect.top,
        ));
        if (this._is_in_response_area(hit_position)) this._try_to_be_selected_by(identifier);
    }
};

class Flipper_System
{
    constructor()
    {
        this.flippers = [];
        this.subjects = [];
    }

    clone()
    {
        let result = new Flipper_System().copy(this);
        return result;
    }

    copy(a)
    {
        this.flippers = [];
        for (let i = 0; i < a.flippers.length; i++) {
            this.flippers.push(a.flippers[i]);
        }
        return this;
    }

    act_on(kinematic_body)
    {
        let flippers = this.flippers;
        for (let i = 0; i < flippers.length; i++) {
            flippers[i].act_on(kinematic_body);
        }
    }

    apply(delta_time)
    {
        let flippers = this.flippers;
        for (let i = 0; i < flippers.length; i++) {
            flippers[i].move(delta_time);
        }
        let subjects = this.subjects;
        for (let i = 0; i < subjects.length; i++) {
            this.act_on(subjects[i]);
        }
    }
}

