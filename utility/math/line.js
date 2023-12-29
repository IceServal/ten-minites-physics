class Line
{
    constructor()
    {
        this.point0 = new Vector2();
        this.point1 = new Vector2(1.0, 0.0);
        this.direction = new Vector2(1.0, 0.0);
        this.length = 0.0;
        this.angle = 0.0;
    }

    static from_point0_point1(point0, point1)
    {
        let result = new Line().set_point0_point1(point0, point1);
        return result;
    }

    static from_point0_angle_length(point0, angle, length)
    {
        let result = new Line();
        result.point0.copy(point0);
        result.length = length;
        result.rotate_around_point0(angle);
        return result;
    }

    clone()
    {
        let result = new Line().copy(this);
        return result;
    }

    copy(line)
    {
        this.point0.copy(line.point0);
        this.point1.copy(line.point1);
        this.direction.copy(line.direction);
        this.length = line.length;
        this.angle = line.angle;
        return this;
    }

    set_point0(point0)
    {
        this.point0.copy(point0);
        this._update_direction_length_angle();
        return this;
    }

    set_point1(point1)
    {
        this.point1.copy(point1);
        this._update_direction_length_angle();
        return this;
    }

    set_point0_point1(point0, point1)
    {
        this.point0.copy(point0);
        this.point1.copy(point1);
        this._update_direction_length_angle();
        return this;
    }

    set_angle(angle)
    {
        this.angle = angle;
        this.direction.set_components(Math.cos(this.angle), Math.sin(this.angle));
        this.point1.copy(this.point0).add(this.direction, this.length);
        return this;
    }

    rotate_around_point0(angle)
    {
        this.angle += angle;
        this.direction.set_components(Math.cos(this.angle), Math.sin(this.angle));
        this.point1.copy(this.point0).add(this.direction, this.length);
        return this;
    }

    rotate_around_point1(angle)
    {
        this.angle -= angle;
        this.direction.set_components(Math.cos(this.angle), Math.sin(this.angle));
        this.point0.copy(this.point1).subtract(this.direction, this.length);
        return this;
    }

    rotate_around_point(point, angle)
    {
        let line0 = Line.from_point0_point1(point, this.point0);
        let line1 = Line.from_point0_point1(point, this.point1);
        line0.rotate_around_point0(angle);
        line1.rotate_around_point0(angle);
        this.set_point0_point1(line0.point1, line1.point1);
        return this;
    }

    closest_point_of(point)
    {
        if (this.length == 0.0) return this.point0.clone();

        let scaling = Math.min(this.length, Math.max(0.0, point.dot(this.direction) - this.point0.dot(this.direction)));
        let closet_point = this.point0.clone().add(this.direction, scaling);
        return closet_point;
    }

    _update_direction_length_angle()
    {
        // TODO: Handle the cases that `point0` is equivalent to `point1`.
        this.direction = Vector2.from_difference_of(this.point1, this.point0);
        this.length = this.direction.normalize();
        this.angle = this.direction.angle();
    }
};

