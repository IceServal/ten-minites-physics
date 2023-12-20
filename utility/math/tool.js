function closest_point_on_segment(a, s0, s1)
{
    let segment = new Vector2().from_difference_of_vector2(s1, s0);
    let length_square = segment.dot(segment);
    if (length_square == 0.0) return s0.clone();

    let ratio = Math.min(1.0, Math.max(0.0, (a.dot(segment) - s0.dot(segment)) / length_square));
    return s0.clone().add(segment, ratio);
}

