let Connector_Simulation_Mode =
{
    position_based_dynamic: "position_based_dynamic",
    analytic: "analytic",
};

class Connector
{
    constructor()
    {
        this.constrain0 = null;
        this.constrain1 = null;
        this.length = 0.0;
        this.mode = Pendulum_Simulation_Mode.position_based_dynamic;
        this.act = this._position_based_dynamic_simulate;
    }

    static from(length)
    {
        let result = new Connector();
        result.length = length;
        return result;
    }

    set_mode(mode)
    {
        this.mode = mode;
        switch (mode) {
            case Pendulum_Simulation_Mode.position_based_dynamic: this.act = this._position_based_dynamic_simulate; return this;
            case Pendulum_Simulation_Mode.analytic: this.act = this._analytic_simulate; return this;
        }

        console.log("Unsupported pendulum simulation mode.");
    }

    render(canvas)
    {
        let line = Line.from_point0_point1(this.constrain0.position, this.constrain1.position);
        canvas.render_line(line, 0.01, "#000000");
    }

    _position_based_dynamic_simulate()
    {
        let direction = Vector2.from_difference_of(this.constrain1.position, this.constrain0.position);
        let length = direction.normalize();
        let correction = length - this.length;
        let m_inv0 = (this.constrain0.mass.value != 0.0 ? 1.0 / this.constrain0.mass.value : 0.0);
        let m_inv1 = (this.constrain1.mass.value != 0.0 ? 1.0 / this.constrain1.mass.value : 0.0);
        let correction0 = (m_inv0 / (m_inv0 + m_inv1)) * correction;
        let correction1 = (m_inv1 / (m_inv0 + m_inv1)) * correction;
        this.constrain0.position.add(direction, correction0);
        this.constrain1.position.subtract(direction, correction1);
    }

    _analytic_simulate(kinematic_body, delta_time)
    {
        console.log("Pendulum analytic simulation is NOT implemented yet.");
        return 0.0;
    }
};

class Connector_System
{
    constructor()
    {
        this.subjects = [];
        this.connectors = [];
    }

    apply(delta_time)
    {
        let last_positions = [];
        for (let i = 0; i < this.subjects.length; i++) {
            let subject = this.subjects[i];
            last_positions.push(subject.position.clone());
            subject.acceleration.scale(Math.min(Math.ceil(subject.mass.value), 1.0));
            subject.velocity.add(subject.acceleration, delta_time);
            subject.position.add(subject.velocity, delta_time);
        }
        for (let i = 0; i < this.connectors.length; i++) {
            let connector = this.connectors[i];
            connector.act(delta_time);
        }
        for (let i = 0; i < this.subjects.length; i++) {
            let subject = this.subjects[i];
            let last_position = last_positions[i];
            let position = subject.position;
            subject.velocity.copy(position).subtract(last_position).scale(1.0 / delta_time);
        }
    }

    render(canvas)
    {
        for (let i = 0; i < this.connectors.length; i++) {
            this.connectors[i].render(canvas);
        }
    }
}

