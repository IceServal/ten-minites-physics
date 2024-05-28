if (shapes.tetrahedron == undefined) {
    shapes.tetrahedron = {};
}

shapes.tetrahedron.skin = {};
shapes.tetrahedron.bone = {};

shapes.tetrahedron.skin.type = "triangle";
shapes.tetrahedron.skin.vertices = [
    +0.00, +0.00, +0.95,
    +0.85, +0.00, -0.43,
    -0.85, +0.00, -0.43,
    +0.00, +1.31, +0.00,
];
shapes.tetrahedron.skin.indices = [
    0, 2, 1,
    0, 1, 3,
    1, 2, 3,
    2, 0, 3,
];

shapes.tetrahedron.bone.type = "tetrahedron";
shapes.tetrahedron.bone.vertices = shapes.tetrahedron.skin.vertices;
shapes.tetrahedron.bone.solid_indices = [
    0, 1, 2, 3,
];
shapes.tetrahedron.bone.edge_indices = [
    0, 1,
    1, 2,
    2, 0,
    0, 3,
    1, 3,
    2, 3,
];

