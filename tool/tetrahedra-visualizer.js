class Tetrahedra_Visualizer
{
    constructor()
    {
        this.display_scale = 0.8;
        this.solid_color = 0x0000FF;
        this.edge_color = 0xFFFFFF;
        this.num_tetrahedra = 0;
        this.num_triangles = 0;
        this.num_vertices = 0;

        this.tetrahedron_faces = [[2, 1, 0], [0, 1, 3], [1, 2, 3], [2, 0, 3]];
    }

    static from(shape, display_scale, solid_color, edge_color)
    {
        let result = new Tetrahedra_Visualizer();
        if (display_scale != undefined) result.display_scale = display_scale;
        if (solid_color != undefined) result.solid_color = solid_color;
        if (edge_color != undefined) result.edge_color = edge_color;

        let bone = shape.bone;
        let points = [];
        for (let i = 0; i < bone.vertices.length;) {
            let x = bone.vertices[i++];
            let y = bone.vertices[i++];
            let z = bone.vertices[i++];
            points.push(new THREE.Vector3(x, y, z));
        }

        result.vertices = [];
        result.indices = [];
        for (let offset = 0; offset < bone.solid_indices.length;) {
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 3; j++) {
                    result.indices.push(offset + result.tetrahedron_faces[i][j]);
                }
            }

            let tetrahedron_points = [];
            let center = new THREE.Vector3();
            for (let i = 0; i < 4; i++) {
                let point = points[shape.bone.solid_indices[offset++]];
                tetrahedron_points.push(point);
                center.addScaledVector(point, 0.25)
            }
            for (let i = 0; i < 4; i++) {
                let scaled_point = center.clone().addScaledVector(tetrahedron_points[i].clone().sub(center), result.display_scale);
                result.vertices.push(scaled_point.x);
                result.vertices.push(scaled_point.y);
                result.vertices.push(scaled_point.z);
            }
        }
        result.num_tetrahedra = result.vertices.length / 12;
        result.num_triangles = result.indices.length / 3;
        result.num_vertices = result.vertices.length / 3;

        {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(result.vertices), 3));
            geometry.setIndex(result.indices);
            let material = new THREE.MeshPhongMaterial({color: result.solid_color});
            material.flatShading = true;
            result.solid_mesh = new THREE.Mesh(geometry, material);
            result.solid_mesh.castShadow = true;
            result.solid_mesh.geometry.computeVertexNormals();
            result.solid_mesh.userData = result;
            result.solid_mesh.layers.enable(1);
            result.solid_mesh.visible = true;
        }

        {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bone.vertices), 3));
            geometry.setIndex(bone.edge_indices);
            let material = new THREE.LineBasicMaterial({color: result.edge_color, linewidth: 2.0});
            result.edge_mesh = new THREE.LineSegments(geometry, material);
            result.edge_mesh.visible = false;
        }

        return result;
    }

    add_to(scene)
    {
        scene.add(this.solid_mesh);
        scene.add(this.edge_mesh);
    }

    switch_mode(mode)
    {
        if (false) {}
        else if (mode == "solid") {
            this.solid_mesh.visible = true;
            this.edge_mesh.visible = false;
        }
        else if (mode == "edge") {
            this.solid_mesh.visible = false;
            this.edge_mesh.visible = true;
        }
        else {
            console.log("Got unsupported mode: ", mode, ", no switching occured.");
        }
    }

    update(delta_time) {}
    render(delta_time) {}
};

