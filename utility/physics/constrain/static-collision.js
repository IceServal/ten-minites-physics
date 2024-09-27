class Static_Collision
{
    constructor()
    {
        this.static_disks = [];
        this.static_capsules = [];
        this.subjects = [];
    }

    static from()
    {
        let result = new Static_Collision();
        return result;
    }

    clone()
    {
        let result = new Static_Collision().copy(this);
        return result;
    }

    copy(a)
    {
        this.static_disks = [];
        for (let i = 0; i < a.static_disks.length; i++) {
            this.static_disks.push(a.static_disks[i]);
        }
        this.static_capsules = [];
        for (let i = 0; i < a.static_capsules.length; i++) {
            this.static_capsules.push(a.static_capsules[i]);
        }
        return this;
    }

    act_on(kinematic_body)
    {
        this._collide_with_static_disks(kinematic_body);
        this._collide_with_static_capsules(kinematic_body);
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

    _collide_with_static_disks(kinematic_body)
    {
        // TODO: Handle the cases that collision position located on the back half part of disk.
        let disks = this.static_disks;
        for (let i = 0; i < disks.length; i++) {
            let disk = disks[i];

            let direction = Vector2.from_difference_of(disk.position, kinematic_body.position);
            let distance = direction.normalize();
            let collide_distance = kinematic_body.body.radius + disk.body.radius;
            if (distance > collide_distance) continue;

            let correction = collide_distance - distance;
            kinematic_body.position.subtract(direction, correction);

            let collide_velocity = kinematic_body.velocity.dot(direction);
            let restitution = Math.min(kinematic_body.restitution, disk.restitution);
            kinematic_body.velocity.subtract(direction, collide_velocity * (1.0 + restitution));
        }
    }

    _collide_with_static_capsules(kinematic_body)
    {
        // TODO: Handle the cases that collision position located on the back half part of capsule.
        let capsules = this.static_capsules;
        for (let i = 0; i < capsules.length; i++) {
            let capsule = capsules[i];

            let closest_point = capsule.body.line.closest_point_of(kinematic_body.position);
            let direction = Vector2.from_difference_of(closest_point, kinematic_body.position);
            let distance = direction.normalize();
            let collide_distance = kinematic_body.body.radius + capsule.body.radius;
            if (distance > collide_distance) continue;

            let correction = collide_distance - distance;
            kinematic_body.position.subtract(direction, correction);

            let collide_velocity = kinematic_body.velocity.dot(direction);
            let restitution = Math.min(kinematic_body.restitution, capsule.restitution);
            kinematic_body.velocity.subtract(direction, collide_velocity * (1.0 + restitution));
        }
    }
};

