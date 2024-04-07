class Raytracing_Testing
{
    constructor()
    {
        this.testing = undefined;
    }

    static from()
    {
        let result = new Raytracing_Testing();
        result.testing = Testing.from();
        return result;
    }

    test_bounding_box(node, min, max, name)
    {
        let axis_aligned_bounding_box = node.axis_aligned_bounding_box;
        this.testing.watch(axis_aligned_bounding_box.min.equals(min), name + ": min", axis_aligned_bounding_box.min);
        this.testing.watch(axis_aligned_bounding_box.max.equals(max), name + ": max", axis_aligned_bounding_box.max);
    }

    test_triangle_points(node, point0, point1, point2, name)
    {
        let min = point0.clone().min(point1).min(point2);
        let max = point0.clone().max(point1).max(point2);
        this.test_bounding_box(node, min, max, name);

        this.testing.watch(node.point0.equals(point0), name + ": point0", point0);
        this.testing.watch(node.point1.equals(point1), name + ": point1", point1);
        this.testing.watch(node.point2.equals(point2), name + ": point2", point2);
    }

    report()
    {
        this.testing.report();
    }
};

function test()
{
    let raytracing_testing = Raytracing_Testing.from();

    let bounding_volume_hierarchy_tree = Bounding_Volume_Hierarchy_Tree.from(shapes.cube);
    let root_node = bounding_volume_hierarchy_tree.root_node;
    raytracing_testing.test_bounding_box(root_node, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@");

    let child0 = root_node.child0;
    raytracing_testing.test_bounding_box(child0, _vector3(-0.5, -0.5, -0.5), _vector3(-0.5, +0.5, +0.5), "@.child0");
    let child0_child0 = child0.child0;
    raytracing_testing.test_triangle_points(
        child0_child0,
        _vector3(-0.5, -0.5, -0.5),
        _vector3(-0.5, -0.5, +0.5),
        _vector3(-0.5, +0.5, +0.5),
        "@.child0.child0",
    );
    let child0_child1 = child0.child1;
    raytracing_testing.test_triangle_points(
        child0_child1,
        _vector3(-0.5, -0.5, -0.5),
        _vector3(-0.5, +0.5, +0.5),
        _vector3(-0.5, +0.5, -0.5),
        "@.child0.child1",
    );

    let child1 = root_node.child1;
    raytracing_testing.test_bounding_box(child1, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@.child1");

    let child1_child0 = child1.child0;
    raytracing_testing.test_bounding_box(child1_child0, _vector3(-0.5, -0.5, +0.5), _vector3(+0.5, +0.5, +0.5), "@.child1.child0");
    let child1_child0_child0 = child1_child0.child0;
    raytracing_testing.test_triangle_points(
        child1_child0_child0,
        _vector3(-0.5, -0.5, +0.5),
        _vector3(+0.5, -0.5, +0.5),
        _vector3(+0.5, +0.5, +0.5),
        "@.child1.child0.child0",
    );
    let child1_child0_child1 = child1_child0.child1;
    raytracing_testing.test_triangle_points(
        child1_child0_child1,
        _vector3(-0.5, -0.5, +0.5),
        _vector3(+0.5, +0.5, +0.5),
        _vector3(-0.5, +0.5, +0.5),
        "@.child1.child0.child1",
    );

    let child1_child1 = child1.child1;
    raytracing_testing.test_bounding_box(child1_child1, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@.child1.child1");

    let child1_child1_child0 = child1_child1.child0;
    raytracing_testing.test_bounding_box(child1_child1_child0, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, +0.5, -0.5), "@.child1.child1.child0");
    let child1_child1_child0_child0 = child1_child1_child0.child0;
    raytracing_testing.test_triangle_points(
        child1_child1_child0_child0,
        _vector3(+0.5, -0.5, -0.5),
        _vector3(-0.5, -0.5, -0.5),
        _vector3(-0.5, +0.5, -0.5),
        "@.child1.child1.child0.child0",
    );
    let child1_child1_child0_child1 = child1_child1_child0.child1;
    raytracing_testing.test_triangle_points(
        child1_child1_child0_child1,
        _vector3(+0.5, -0.5, -0.5),
        _vector3(-0.5, +0.5, -0.5),
        _vector3(+0.5, +0.5, -0.5),
        "@.child1.child1.child0.child1",
    );

    let child1_child1_child1 = child1_child1.child1
    raytracing_testing.test_bounding_box(child1_child1_child1, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@.child1.child1.child1");

    let child1_child1_child1_child0 = child1_child1_child1.child0
    raytracing_testing.test_bounding_box(child1_child1_child1_child0, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, -0.5, +0.5), "@.child1.child1.child1.child0");
    let child1_child1_child1_child0_child0 = child1_child1_child1_child0.child0;
    raytracing_testing.test_triangle_points(
        child1_child1_child1_child0_child0,
        _vector3(-0.5, -0.5, -0.5),
        _vector3(+0.5, -0.5, -0.5),
        _vector3(+0.5, -0.5, +0.5),
        "@.child1.child1.child1.child0.child0",
    );
    let child1_child1_child1_child0_child1 = child1_child1_child1_child0.child1;
    raytracing_testing.test_triangle_points(
        child1_child1_child1_child0_child1,
        _vector3(-0.5, -0.5, -0.5),
        _vector3(+0.5, -0.5, +0.5),
        _vector3(-0.5, -0.5, +0.5),
        "@.child1.child1.child1.child0.child1",
    );

    let child1_child1_child1_child1 = child1_child1_child1.child1;
    raytracing_testing.test_bounding_box(child1_child1_child1_child1, _vector3(-0.5, -0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@.child1.child1.child1.child1");

    let child1_child1_child1_child1_child1_child0 = child1_child1_child1_child1.child0;
    raytracing_testing.test_bounding_box(child1_child1_child1_child1_child1_child0, _vector3(-0.5, +0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@.child1.child1.child1.child1.child1.child0");
    let child1_child1_child1_child1_child1_child0_child0 = child1_child1_child1_child1_child1_child0.child0;
    raytracing_testing.test_triangle_points(
        child1_child1_child1_child1_child1_child0_child0,
        _vector3(-0.5, +0.5, +0.5),
        _vector3(+0.5, +0.5, +0.5),
        _vector3(+0.5, +0.5, -0.5),
        "@.child1.child1.child1.child1.child1.child0.child0",
    );
    let child1_child1_child1_child1_child1_child0_child1 = child1_child1_child1_child1_child1_child0.child1;
    raytracing_testing.test_triangle_points(
        child1_child1_child1_child1_child1_child0_child1,
        _vector3(-0.5, +0.5, +0.5),
        _vector3(+0.5, +0.5, -0.5),
        _vector3(-0.5, +0.5, -0.5),
        "@.child1.child1.child1.child1.child1.child0.child1",
    );

    let child1_child1_child1_child1_child1_child1 = child1_child1_child1_child1.child1;
    raytracing_testing.test_bounding_box(child1_child1_child1_child1_child1_child1, _vector3(+0.5, -0.5, -0.5), _vector3(+0.5, +0.5, +0.5), "@.child1.child1.child1.child1.child1.child1");
    let child1_child1_child1_child1_child1_child1_child0 = child1_child1_child1_child1_child1_child1.child0;
    raytracing_testing.test_triangle_points(
        child1_child1_child1_child1_child1_child1_child0,
        _vector3(+0.5, -0.5, +0.5),
        _vector3(+0.5, -0.5, -0.5),
        _vector3(+0.5, +0.5, -0.5),
        "@.child1.child1.child1.child1.child1.child1.child0",
    );
    let child1_child1_child1_child1_child1_child1_child1 = child1_child1_child1_child1_child1_child1.child1;
    raytracing_testing.test_triangle_points(
        child1_child1_child1_child1_child1_child1_child1,
        _vector3(+0.5, -0.5, +0.5),
        _vector3(+0.5, +0.5, -0.5),
        _vector3(+0.5, +0.5, +0.5),
        "@.child1.child1.child1.child1.child1.child1.child1",
    );

    raytracing_testing.report();
}

function _vector3(x, y, z) { return new THREE.Vector3(x, y, z); }

