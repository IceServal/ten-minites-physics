class World
{
    constructor()
    {
        this.paused = true;
        this.num_steps = 1;
        this.planck_time = 1.0 / 60.0;
        this.size = new Vector2();

        this.subjects = [];
        this.fields = [];
        this.constrains = [];
    }

    static from(size, num_steps = 1, planck_time = 1.0 / 60.0)
    {
        let result = new World();
        result.size.copy(size);
        result.num_steps = num_steps;
        result.planck_time = planck_time;
        return result;
    }

    clone()
    {
        let result = new World().copy(this);
        return result;
    }

    copy(a)
    {
        this.paused = a.paused;
        this.num_steps = a.num_steps;
        this.planck_time = a.planck_time;
        this.size.copy(size);
        return this;
    }

    update()
    {
        if (this.paused) return;

        let planck_time = this.planck_time;
        for (let i = 0; i < this.fields.length; i++) this.fields[i].prepare(planck_time);
        for (let i = 0; i < this.constrains.length; i++) this.constrains[i].prepare(planck_time);

        let delta_time = planck_time / this.num_steps;
        for (let i = 0; i < this.num_steps; i++) {
            for (let j = 0; j < this.fields.length; j++) this.fields[j].apply(delta_time);
            for (let j = 0; j < this.constrains.length; j++) this.constrains[j].apply(delta_time);
        }

        for (let i = 0; i < this.fields.length; i++) this.fields[i].finalize(planck_time);
        for (let i = 0; i < this.constrains.length; i++) this.constrains[i].finalize(planck_time);
    }

    render(canvas)
    {
        canvas.clear();
        for (let i = 0; i < this.fields.length; i++) this.fields[i].render(canvas);
        for (let i = 0; i < this.constrains.length; i++) this.constrains[i].render(canvas);
        for (let i = 0; i < this.subjects.length; i++) this.subjects[i].render(canvas);
    }

    pause_or_resume()
    {
        this.paused = !this.paused;
    }

    step()
    {
        this.paused = false;
        this.update();
        this.paused = true;
    }
};

