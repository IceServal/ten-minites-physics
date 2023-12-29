class Free_Movement
{
    constructor()
    {
        this.subjects = [];
    }

    clone()
    {
        let result = new Free_Movement().copy(this);
        return result;
    }

    copy(a)
    {
        return this;
    }

    act_on(kinematic_body, delta_time)
    {
        kinematic_body.velocity.add(kinematic_body.acceleration, delta_time);
        kinematic_body.position.add(kinematic_body.velocity, delta_time);
    }

    apply(delta_time)
    {
        let subjects = this.subjects;
        for (let i = 0; i < subjects.length; i++) {
            this.act_on(subjects[i], delta_time);
        }
    }
};

