class Raytracing_Body
{
    constructor()
    {
        this.bounding_volume_hierarchy_tree = undefined;
        this.num_of_maximum_hitting_points = 32;
        this.color0 = new THREE.Color(0xFF0000);
        this.color1 = new THREE.Color(0x00FF00);
    }

    static from(skin)
    {
        let result = new Raytracing_Body();
        result.bounding_volume_hierarchy_tree = Bounding_Volume_Hierarchy_Tree.from(skin);

        {
            let geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(skin.vertices), 3));
            geometry.setIndex(skin.triangle_indices);
            let material = new THREE.MeshPhongMaterial({color: 0xFFFFFF});
            material.flatShading = true;
            result.skin_mesh = new THREE.Mesh(geometry, material);
            result.skin_mesh.geometry.computeVertexNormals();
            result.skin_mesh.castShadow = true;
        }

        {
            let geometry = new THREE.SphereGeometry(0.05, 8, 8);
            let material = new THREE.MeshPhongMaterial();
            result.point_mesh = new THREE.InstancedMesh(geometry, material, result.num_of_maximum_hitting_points);
            result.point_mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            let colors = Compact_Vector3.from_size(result.num_of_maximum_hitting_points);
            result.point_mesh.instanceColor = new THREE.InstancedBufferAttribute(colors.data, 3, false, 1);
            for (let i = 0; i < result.num_of_maximum_hitting_points; i++) result.point_mesh.setColorAt(i, result.color1);
        }

        return result;
    }

    add_to(scene)
    {
        scene.add(this.skin_mesh);
        scene.add(this.point_mesh);
    }

    hit_by(beginning, direction)
    {
        let tracing_ray = Tracing_Ray.from(beginning, direction);
        this.bounding_volume_hierarchy_tree.hit_by(tracing_ray);
        tracing_ray.normalize_hitting_hints();
        this._update_mesh(tracing_ray);
    }

    update(delta_time)
    {
    }

    render(delta_time)
    {
    }

    _update_mesh(tracing_ray)
    {
        let color = (this.bounding_volume_hierarchy_tree.is_point_inside(tracing_ray.beginning) ? this.color0 : this.color1);
        let scratch = new THREE.Matrix4();
        let actual_hitting_points = Math.min(tracing_ray.hitting_hints.length, this.num_of_maximum_hitting_points);
        for (let i = 0; i < actual_hitting_points; i++) {
            let point = tracing_ray.hitting_hints[i].point;
            scratch.makeTranslation(point.x, point.y, point.z);
            this.point_mesh.setColorAt(i, color);
            this.point_mesh.setMatrixAt(i, scratch);
        }
        this.point_mesh.count = actual_hitting_points;
        this.point_mesh.instanceColor.needsUpdate = true;
        this.point_mesh.instanceMatrix.needsUpdate = true;
    }
};

