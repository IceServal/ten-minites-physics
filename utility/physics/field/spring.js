class Spring
{
    constructor()
    {
        this.constrain0 = null;
        this.constrain1 = null;
        this.length = 0.0;
        this.elasticity = 1.0;
    }

    static from(length, elasticity)
    {
        let result = new Spring();
        result.length = length;
        result.elasticity = elasticity;
        return result;
    }

    act()
    {
        let direction = Vector2.from_difference_of(this.constrain1.position, this.constrain0.position);
        let distance = direction.normalize();
        let strain = this.elasticity * (distance - this.length);
        this.constrain0.acceleration.add(direction, strain / this.constrain0.mass.value);
        this.constrain1.acceleration.subtract(direction, strain / this.constrain1.mass.value);
    }

    render(canvas)
    {
        let line = Line.from_point0_point1(this.constrain0.position, this.constrain1.position);
        canvas.render_line(line, 0.01, "#000000");
    }
};

class Spring_System
{
    constructor()
    {
        this.springs = [];
    }

    static from(springs)
    {
        let result = new Spring_System();
        for (let i = 0; i < springs.length; i++) {
            result.springs.push(springs[i]);
        }
        return result;
    }

    apply()
    {
        let springs = this.springs;
        for (let i = 0; i < springs.length; i++) {
            springs[i].act();
        }
    }

    render(canvas)
    {
        let springs = this.springs;
        for (let i = 0; i < springs.length; i++) {
            springs[i].render(canvas);
        }
    }
};

