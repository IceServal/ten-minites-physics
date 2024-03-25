class Ray_Drawer
{
    constructor()
    {
        this.beginning = new THREE.Vector3();
        this.direction = new THREE.Vector3(1.0, 0.0, 0.0);

        {
            let points = [this.beginning, this.beginning.clone().addScaledVector(this.direction, 100.0)];
            let geometry = new THREE.BufferGeometry();
            geometry.setFromPoints(points);
            let material = new THREE.LineBasicMaterial({color: 0xFFFF00});
            this.line_mesh = new THREE.Line(geometry, material);
        }

        {
            let geometry = new THREE.SphereGeometry(0.02, 8, 8);
            let material = new THREE.MeshPhongMaterial({color: 0xFFFFAA});
            material.flatShading = true;
            this.sphere_mesh = new THREE.Mesh(geometry, material);
        }
    }

    static from(beginning, direction)
    {
        return new Ray_Drawer()._update_mesh(beginning, direction);
    }

    add_to(scene)
    {
        scene.add(this.line_mesh);
        scene.add(this.sphere_mesh);
    }

    hit_by(beginning, direction)
    {
        this._update_mesh(beginning, direction);
    }

    update(delta_time)
    {
    }

    render(delta_time)
    {
    }

    _update_mesh(beginning, direction)
    {
        {
            let ending = beginning.clone().addScaledVector(direction, 100.0);
            let positions = this.line_mesh.geometry.attributes.position.array;
            positions[0] = beginning.x;
            positions[1] = beginning.y;
            positions[2] = beginning.z;
            positions[3] = ending.x;
            positions[4] = ending.y;
            positions[5] = ending.z;
            this.line_mesh.geometry.attributes.position.needsUpdate = true;
        }

        {
            this.sphere_mesh.geometry.translate(-this.beginning.x, -this.beginning.y, -this.beginning.z);
            this.sphere_mesh.geometry.translate(beginning.x, beginning.y, beginning.z);
        }

        this.beginning = beginning;
        this.direction = direction;

        return this;
    }
};

