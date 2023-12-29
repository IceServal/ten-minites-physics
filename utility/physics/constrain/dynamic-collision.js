class Dynamic_Collision
{
    constructor()
    {
        this.subjects = [];
    }

    clone()
    {
        let result = new Collision().copy(this);
        return result;
    }

    copy(a)
    {
        return this;
    }

    act_on(a, b)
    {
        // TODO: Handle the cases that collision position located on the back half part of disk.
        let direction = Vector2.from_difference_of(b.position, a.position);
        let distance = direction.normalize();
        let collide_distance = a.body.radius + b.body.radius;
        if (distance > collide_distance) return false;

        let correction = (collide_distance - distance) / 2.0;
        a.position.subtract(direction, correction);
        b.position.add(direction, correction);

        let v1 = a.velocity.dot(direction);
        let v2 = b.velocity.dot(direction);
        let m1 = a.mass.value;
        let m2 = b.mass.value;
        let r  = Math.min(a.restitution, b.restitution);
        let momentum = m1 * v1 + m2 * v2;
        let mass_sum = m1 + m2;
        let v1_after = (momentum - m2 * (v1 - v2) * r) / mass_sum;
        let v2_after = (momentum - m1 * (v2 - v1) * r) / mass_sum;
        a.velocity.add(direction, -v1 + v1_after);
        b.velocity.add(direction, -v2 + v2_after);

        return true;
    }

    apply()
    {
        let subjects = this.subjects;
        for (let i = 0; i < subjects.length; ++i) {
            for (let j = i + 1; j < subjects.length; ++j) {
                this.act_on(subjects[i], subjects[j]);
            }
        }
    }
}

