class Clear_Velocity_Field
{
    constructor()
    {
        this.velocity = undefined;
        this.subjects = undefined;
    }

    static from(velocity = Vector2.from_components())
    {
        let result = new Clear_Velocity_Field();
        result.velocity = velocity;
        result.subjects = [];
        return result;
    }

    clone()
    {
        let result = new Clear_Velocity_Field().copy(this);
        return result;
    }

    copy(a)
    {
        this.velocity.copy(a.velocity);
        return this;
    }

    act_on(kinematic_body)
    {
        kinematic_body.velocity.copy(this.velocity);
    }

    prepare() {}

    apply()
    {
        let subjects = this.subjects;
        for (let i = 0; i < subjects.length; i++) {
            this.act_on(subjects[i]);
        }
    }

    finalize() {}

    render(canvas) {}
};

