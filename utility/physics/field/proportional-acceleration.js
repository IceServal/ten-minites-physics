class Proportional_Acceleration_Field
{
    constructor()
    {
        this.acceleration = new Vector2();
        this.subjects = [];
    }

    static from(acceleration)
    {
        let result = new Proportional_Acceleration_Field();
        result.acceleration.copy(acceleration);
        return result;
    }

    clone()
    {
        let result = new Proportional_Acceleration_Field().copy(this);
        return result;
    }

    copy(a)
    {
        this.acceleration.copy(a.acceleration);
        return this;
    }

    act_on(kinematic_body)
    {
        kinematic_body.acceleration.add(this.acceleration);
    }

    prepare() {}

    apply()
    {
        for (let i = 0; i < this.subjects.length; i++) {
            this.act_on(this.subjects[i]);
        }
    }

    finalize() {}

    render(canvas) {}
};

