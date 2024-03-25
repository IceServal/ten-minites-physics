function tetrahedron_circumcenter(p0, p1, p2, p3)
{
    let v01 = new THREE.Vector3().subVectors(p1, p0);
    let v02 = new THREE.Vector3().subVectors(p2, p0);
    let v03 = new THREE.Vector3().subVectors(p3, p0);
    let l01 = v01.lengthSq();
    let l02 = v02.lengthSq();
    let l03 = v03.lengthSq();
    let cross102 = new THREE.Vector3().crossVectors(v01, v02);
    let cross203 = new THREE.Vector3().crossVectors(v02, v03);
    let cross301 = new THREE.Vector3().crossVectors(v03, v01);
    let volume = v01.dot(cross203);
    if (volume == 0.0) {
        return p0.clone();
    } else {
        let offset = new THREE.Vector3().addScaledVector(cross203, l01).addScaledVector(cross301, l02).addScaledVector(cross102, l03).divideScalar(2.0 * volume);
        return p0.clone().add(offset);
    }
}

function tetrahedron_quality(p0, p1, p2, p3)
{
    let v01 = new THREE.Vector3().subVectors(p1, p0);
    let v02 = new THREE.Vector3().subVectors(p2, p0);
    let v03 = new THREE.Vector3().subVectors(p3, p0);
    let v12 = new THREE.Vector3().subVectors(p2, p1);
    let v23 = new THREE.Vector3().subVectors(p3, p2);
    let v31 = new THREE.Vector3().subVectors(p1, p3);
    let l01 = v01.lengthSq();
    let l02 = v02.lengthSq();
    let l03 = v03.lengthSq();
    let l12 = v12.lengthSq();
    let l23 = v23.lengthSq();
    let l31 = v31.lengthSq();
    let square_sum = l01 * l01 + l02 * l02 + l03 * l03 + l12 * l12 + l23 * l23 + l31 * l31;
    let square_root_of_square_sum = Math.sqrt(square_sum);
    let volume = v01.dot(new THREE.Vector3().crossVectors(v02, v03));
    return 12.0 * Math.sqrt(3) * volume / (square_root_of_square_sum * square_root_of_square_sum * square_root_of_square_sum);
}

function barycentric_coordinate_of_triangle(point, point0, point1, point2)
{
}

function barycentric_coordinate_of_tetrahedron(point, point0, point1, point2)
{
}

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
    return (direction0.dot(direction1) >= 0 && direction0.dot(direction2) >= 0);
}

