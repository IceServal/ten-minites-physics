function ray_distance_to_triangle(beginning, direction, point0, point1, point2)
{
    let v01 = new THREE.Vector3().subVectors(point1, point0);
    let v02 = new THREE.Vector3().subVectors(point2, point0);
    let surface_normal = new THREE.Vector3().crossVectors(v01, v02).normalize();
    let perpendicularity = direction.dot(surface_normal);
    return point0.clone().sub(beginning).dot(surface_normal) / perpendicularity;
}

function is_point_inside_triangle(point, point0, point1, point2)
{
    let v01 = new THREE.Vector3().subVectors(point1, point0);
    let v12 = new THREE.Vector3().subVectors(point2, point1);
    let v20 = new THREE.Vector3().subVectors(point0, point2);
    let direction0 = new THREE.Vector3().subVectors(point, point0).cross(v01);
    let direction1 = new THREE.Vector3().subVectors(point, point1).cross(v12);
    let direction2 = new THREE.Vector3().subVectors(point, point2).cross(v20);
    return (
        true
        && direction0.dot(direction1) >= -1e-3
        && direction1.dot(direction2) >= -1e-3
        && direction2.dot(direction0) >= -1e-3
    );
}

