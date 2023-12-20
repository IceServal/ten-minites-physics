function ball_border_collide(ball, border_vertices)
{
    let num_vertices = border_vertices.length;
    if (num_vertices < 2) return false;

    let collide_p0 = undefined;
    let collide_p1 = undefined;
    let collide_distance = ball.radius;
    let collide_direction = undefined;

    let p0 = border_vertices[0];
    let p1 = undefined;
    for (let i = 1; i < num_vertices + 1; i++) {
        p1 = border_vertices[i % num_vertices];

        let closest_point = closest_point_on_segment(ball.position, p0, p1);
        let direction = new Vector2().from_difference_of_vector2(closest_point, ball.position);
        let distance = direction.normalize();
        if (distance <= collide_distance) {
            collide_p0 = p0;
            collide_p1 = p1;
            collide_distance = distance;
            collide_direction = direction;
        }

        p0 = p1;
    }

    if (collide_direction == undefined) return false;

    if (collide_distance == 0.0) {
        collide_direction.from_vector2(ball.velocity).normalize();
        let surface_direction = new Vector2().from_difference_of_vector2(collide_p1, collide_p0);
        if (surface_direction.normalize() != 0.0) {
            collide_direction.add(surface_direction, -surface_direction.dot(collide_direction)).normalize();
        }
    }

    let correction = ball.radius - collide_distance;
    if (collide_direction.dot(ball.velocity) < 0.0) {
        collide_direction.scale(-1);
        correction = collide_distance + ball.radius;
    }
    ball.position.subtract(collide_direction, correction);

    let collide_velocity = ball.velocity.dot(collide_direction);
    ball.velocity.subtract(collide_direction, (1.0 + ball.restitution) * collide_velocity);

    return true;
}

function ball_obstacle_collide(ball, obstacle)
{
    let direction = new Vector2().from_difference_of_vector2(obstacle.position, ball.position);
    let distance = direction.normalize();
    let collide_distance = ball.radius + obstacle.radius;
    if (distance == 0.0) {
        direction = ball.velocity.clone();
        direction.normalize();
    }
    if (distance > collide_distance) return false;

    let correction = collide_distance - distance;
    ball.position.subtract(direction, correction);

    let collide_velocity = ball.velocity.dot(direction);
    ball.velocity.add(direction, -collide_velocity - obstacle.restitution);

    return true;
}

function ball_flipper_collide(ball, flipper)
{
    let closest_point = closest_point_on_segment(ball.position, flipper.position, flipper.end_point());
    let direction = new Vector2().from_difference_of_vector2(closest_point, ball.position);
    let distance = direction.normalize();
    let collide_distance = flipper.radius + ball.radius;
    if (distance > collide_distance) return false;

    let correction = collide_distance - distance;
    ball.position.subtract(direction, correction);

    let collide_velocity = ball.velocity.dot(direction);
    let surface_direction = closest_point.clone().subtract(direction, flipper.radius).subtract(flipper.position);
    let surface_radius = surface_direction.normalize();
    let surface_speed = surface_radius * flipper.angular_velocity * 2 * Math.PI;
    let surface_velocity = surface_direction.perpendicular_one().scale(surface_speed);
    let velocity_after = surface_velocity.dot(direction);
    ball.velocity.add(direction, -collide_velocity + velocity_after * flipper.restitution);

    return true;
}

function ball_ball_collide(a, b)
{
    let direction = new Vector2().from_difference_of_vector2(b.position, a.position);
    let distance = direction.normalize();
    let collide_distance = a.radius + b.radius;
    if (distance == 0.0) {
        direction = new Vector2().from_sum_of_vector2(a.velocity + b.velocity);
        direction.normalize();
    }
    if (distance > collide_distance) return false;

    let correction = (collide_distance - distance) / 2.0;
    a.position.subtract(direction, correction);
    b.position.add(direction, correction);

    let v1 = a.velocity.dot(direction);
    let v2 = b.velocity.dot(direction);
    let m1 = a.mass;
    let m2 = b.mass;
    let r  = Math.min(a.restitution, b.restitution);
    let momentum = m1 * v1 + m2 * v2;
    let mass_sum = m1 + m2;
    let v1_after = (momentum - m2 * (v1 - v2) * r) / mass_sum;
    let v2_after = (momentum - m1 * (v2 - v1) * r) / mass_sum;
    a.velocity.add(direction, -v1 + v1_after);
    b.velocity.add(direction, -v2 + v2_after);

    return true;
}

