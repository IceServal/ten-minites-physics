if (shapes.cube == undefined) {
    shapes.cube = {};
}

shapes.cube.skin = {};
shapes.cube.bone = {};

shapes.cube.skin.type = "triangle";
shapes.cube.skin.vertices = [
    -0.5, -0.5, +0.5,
    +0.5, -0.5, +0.5,
    +0.5, +0.5, +0.5,
    -0.5, +0.5, +0.5,

    -0.5, -0.5, -0.5,
    +0.5, -0.5, -0.5,
    +0.5, +0.5, -0.5,
    -0.5, +0.5, -0.5,
];
shapes.cube.skin.indices = [
    0, 1, 2,
    0, 2, 3,

    1, 5, 6,
    1, 6, 2,

    5, 4, 7,
    5, 7, 6,

    4, 0, 3,
    4, 3, 7,

    4, 5, 1,
    4, 1, 0,

    3, 2, 6,
    3, 6, 7,
];

shapes.cube.bone.type = "tetrahedron";
shapes.cube.bone.vertices = shapes.cube.skin.vertices;
shapes.cube.bone.solid_indices = [
    0, 1, 5, 3,
    3, 1, 5, 2,
    0, 5, 4, 3,
    3, 2, 5, 6,
    3, 5, 4, 6,
    3, 6, 4, 7,
];
shapes.cube.bone.edge_indices = [
    0, 1, 0, 3, 0, 4, 0, 5,
    1, 2, 1, 3, 1, 5,
    2, 3, 2, 5, 2, 6,
    3, 4, 3, 5, 3, 6, 3, 7,
    4, 5, 4, 6, 4, 7,
    5, 6,
    6, 7,
];

