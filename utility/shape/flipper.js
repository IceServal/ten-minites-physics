class Flipper
{
    constructor(radius, position, length, rest_angle, max_rotation, angular_velocity, restitution)
    {
        this.radius = Math.abs(radius);
        this.position = position.clone();
        this.length = Math.abs(length);
        this.rest_angle = rest_angle;
        this.max_rotation = Math.abs(max_rotation);
        this.act_angular_velocity = Math.abs(angular_velocity);
        this.sign_of_angular_velocity = Math.sign(angular_velocity);
        this.restitution = restitution;

        this.rotation = 0.0;
        this.angular_velocity = 0.0;

        this.selected = false;
        this.touch_identifier = -1;
    }

    end_point()
    {
        let angle = this.rest_angle + this.sign_of_angular_velocity * this.rotation;
        let direction = new Vector2(Math.cos(angle), Math.sin(angle));
        return direction.scale(this.length).add(this.position);
    }

    act()
    {
        let old_rotation = this.rotation;
        let delta_angular_velocity = this.act_angular_velocity * world.planck_time;
        if (this.selected) {
            this.rotation = Math.min(this.rotation + delta_angular_velocity, this.max_rotation);
        } else {
            this.rotation = Math.max(this.rotation - delta_angular_velocity, 0.0);
        }
        this.angular_velocity = this.sign_of_angular_velocity * (this.rotation - old_rotation) / world.planck_time;
    }

    is_in_response_area(position)
    {
        if (this.position.distance_from(position) <= this.length) {
            return true;
        } else {
            return false;
        }
    }

    try_to_be_selected_by(identifier = 0)
    {
        if (!this.selected) {
            this.selected = true;
            this.identifier = identifier;
        }
    }

    try_to_be_unselected_by(identifier = 0)
    {
        if (this.selected && this.identifier == identifier) {
            this.selected = false;
            this.identifier = -1;
        }
    }
};

