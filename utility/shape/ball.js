class Ball
{
    constructor(radius, mass, position, velocity, restitution)
    {
        this.radius = radius;
        this.mass = mass;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.restitution = restitution;
    }

    act(dt)
    {
        this.position.add(this.velocity, dt);
    }
};

class Obstacle
{
    constructor(radius, position, restitution)
    {
        this.radius = radius;
        this.position = position.clone();
        this.restitution = restitution;
    }

    act(dt) {}
};

