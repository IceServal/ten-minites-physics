let Pendulum_Simulation_Mode =
{
    position_based_dynamic: "position_based_dynamic",
    analytic: "analytic",
};

class Pendulum
{
    constructor()
    {
        this.constrain = new Circle();
        this.subjects = [];
        this.mode = "";
        this.act_on = function (kinematic_body, delta_time) { return 0.0; };
    }

    static from(circle, mode)
    {
        let result = new Pendulum();
        result.constrain.copy(circle);
        result.set_mode(mode);
        return result;
    }

    clone()
    {
        let result = new Pendulum().copy(this);
        return result;
    }

    copy(a)
    {
        this.constrain.copy(a.constrain);
        this.set_mode(a.mode);
    }

    set_mode(mode)
    {
        this.mode = mode;
        switch (mode) {
            case Pendulum_Simulation_Mode.position_based_dynamic: this.act_on = this._position_based_dynamic_simulate; return;
            case Pendulum_Simulation_Mode.analytic: this.act_on = this._analytic_simulate; return;
        }

        console.log("Unsupported simulation mode of bead.");
    }

    apply(delta_time)
    {
        for (let i = 0; i < this.subjects.length; i++) {
            this.act_on(this.subjects[i], delta_time);
        }
    }

    _position_based_dynamic_simulate(kinematic_body, delta_time)
    {
        let last_position = kinematic_body.position.clone();
        let position = kinematic_body.position;

        kinematic_body.velocity.add(kinematic_body.acceleration, delta_time);
        position.add(kinematic_body.velocity, delta_time);

        let wire_center = this.constrain.center;
        let direction = Vector2.from_difference_of(position, wire_center);
        let length = direction.normalize();
        if (length == 0.0) return;

        let wire_radius = this.constrain.radius;
        position.copy(wire_center).add(direction, wire_radius);
        kinematic_body.velocity.copy(position).subtract(last_position).scale(1.0 / delta_time);

        let correction = length - wire_radius;
        let acceleration_intensity = correction / delta_time / delta_time;
        return acceleration_intensity;
    }

    _analytic_simulate(kinematic_body, delta_time)
    {
        let wire_center = this.constrain.center;
        let wire_radius = this.constrain.radius;
        let normal_direction = Vector2.from_difference_of(kinematic_body.position, wire_center); normal_direction.normalize();
        let tangent_direction = normal_direction.perpendicular_one();
        let normal_acceleration = kinematic_body.acceleration.dot(normal_direction);
        let tangent_acceleration = kinematic_body.acceleration.dot(tangent_direction);
        let angular_acceleration = tangent_acceleration / wire_radius;
        let angular_velocity = kinematic_body.velocity.dot(tangent_direction) / wire_radius;
        let angle = normal_direction.angle();
        angular_velocity += angular_acceleration * delta_time;
        angle += angular_velocity * delta_time;
        kinematic_body.position.x = wire_center.x + Math.cos(angle) * wire_radius;
        kinematic_body.position.y = wire_center.y + Math.sin(angle) * wire_radius;
        kinematic_body.velocity.copy(tangent_direction).scale(angular_velocity * wire_radius);

        let acceleration_intensity = angular_velocity * angular_velocity * wire_radius + normal_acceleration;
        return acceleration_intensity;
    }
};

