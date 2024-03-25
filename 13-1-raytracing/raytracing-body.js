class Raytracing_Body
{
    construct()
    {
        this.bounding_volume_hierarchy_tree = undefined;
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
            result.point_mesh = new THREE.InstancedMesh(geometry, material, 20);
            result.point_mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            let colors = Compact_Vector3.from_size(20);
            result.point_mesh.instanceColor = new THREE.InstancedBufferAttribute(colors.data, 3, false, 1);
            for (let i = 0; i < 20; i++) result.point_mesh.setColorAt(i, new THREE.Color(0xFF0000));
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
        let scratch = new THREE.Matrix4();
        for (let i = 0; i < tracing_ray.hitting_points.length; i++) {
            let point = tracing_ray.hitting_points[i];
            scratch.makeTranslation(point.x, point.y, point.z);
            this.point_mesh.setMatrixAt(i, scratch);
        }
        for (let i = tracing_ray.hitting_points.length; i < 20; i++) {
            scratch.makeTranslation(0.0, 0.0, 0.0);
            this.point_mesh.setMatrixAt(i, scratch);
        }
        this.point_mesh.instanceMatrix.needsUpdate = true;
    }
};

