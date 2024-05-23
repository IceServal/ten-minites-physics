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

class Sphere
{
    constructor()
    {
        this.center = undefined;
        this.radius = undefined;
    }

    static from(center, radius)
    {
        let result = new Sphere();
        result.center = center;
        result.radius = radius;
        return result;
    }

    clone()
    {
        return new Sphere().copy(this);
    }

    copy(a)
    {
        this.center = a.center;
        this.radius = a.radius;
        return this;
    }
};

function tetrahedron_circumsphere(point0, point1, point2, point3)
{
    let v01 = point1.clone().sub(point0);
    let v02 = point2.clone().sub(point0);
    let v03 = point3.clone().sub(point0);
    let l01 = v01.lengthSq();
    let l02 = v02.lengthSq();
    let l03 = v03.lengthSq();
    let cross102 = v01.clone().cross(v02);
    let cross203 = v02.clone().cross(v03);
    let cross301 = v03.clone().cross(v01);
    let volume = v01.dot(cross203);
    if (volume == 0.0) {
        return Sphere.from(point0.clone(), 0.0);
    } else {
        let offset = new THREE.Vector3().addScaledVector(cross203, l01).addScaledVector(cross301, l02).addScaledVector(cross102, l03).divideScalar(2.0 * volume);
        return Sphere.from(point0.clone().add(offset), offset.length());
    }
}

function tetrahedron_quality(point0, point1, point2, point3)
{
    let v01 = point1.clone().sub(point0);
    let v02 = point2.clone().sub(point0);
    let v03 = point3.clone().sub(point0);
    let v12 = point2.clone().sub(point1);
    let v23 = point3.clone().sub(point2);
    let v31 = point1.clone().sub(point3);
    let square_sum = v01.lengthSq() + v02.lengthSq() + v03.lengthSq() + v12.lengthSq() + v23.lengthSq() + v31.lengthSq();
    let square_root_of_square_sum = Math.sqrt(square_sum);
    let volume = v01.dot(v02.clone().cross(v03));
    return 12.0 * Math.sqrt(3) * volume / (square_root_of_square_sum * square_root_of_square_sum * square_root_of_square_sum);
}

function random_epsilon(epsilon = 1e-3)
{
    return (Math.random() - 0.5) * 2 * epsilon;
}

