class Bounding_Volume_Hierarchy_Tree
{
    static heuristic_directions = [
        new THREE.Vector3(+1.0,  0.0,  0.0),
        new THREE.Vector3(-1.0,  0.0,  0.0),
        new THREE.Vector3( 0.0, +1.0,  0.0),
        new THREE.Vector3( 0.0, -1.0,  0.0),
        new THREE.Vector3( 0.0,  0.0, +1.0),
        new THREE.Vector3( 0.0,  0.0, -1.0),
    ];

    constructor()
    {
        this.root_node = null;
    }

    static from(skin)
    {
        let result = new Bounding_Volume_Hierarchy_Tree();
        let leaf_nodes = [];
        for (let i = 0; i < skin.triangle_indices.length;) {
            let index0 = skin.triangle_indices[i++];
            let index1 = skin.triangle_indices[i++];
            let index2 = skin.triangle_indices[i++];
            let leaf_node = _Leaf_Node.from(skin.vertices, index0, index1, index2);
            if (leaf_node.normal.x == 0 && leaf_node.normal.y == 0 && leaf_node.normal.z == 0) continue;
            leaf_nodes.push(leaf_node);
        }
        if (leaf_nodes.length < 2) {
            console.log("There should be at least two valid triangle face to construct a bounding bolume hierarchy tree, but given ", leaf_nodes.length, ".");
            return result;
        }
        result.root_node = this._create_bounding_volume_hierarchy_tree(leaf_nodes);
        return result;
    }

    hit_by(tracing_ray)
    {
        if (
            true
            && tracing_ray.direction.x == 0.0
            && tracing_ray.direction.y == 0.0
            && tracing_ray.direction.z == 0.0
        ) {
            console.log("[ERROR]: Tracing ray direction should not be zero vector.");
            return;
        }

        this.root_node.hit_by(tracing_ray);
    }

    is_point_inside(point)
    {
        let evidence = 0;
        let directions = Bounding_Volume_Hierarchy_Tree.heuristic_directions;
        for (let i = 0; i < directions.length; i++) {
            let tracing_ray = Tracing_Ray.from(point, directions[i]);
            this.hit_by(tracing_ray);
            tracing_ray.normalize_hitting_hints();
            if (tracing_ray.hitting_hints.length % 2 == 1) {
                if (++evidence >= 4) return true;
            } else {
                // Do nothing intentionally.
            }
        }
        return false;
    }

    static _create_bounding_volume_hierarchy_tree(leaf_nodes)
    {
        if (leaf_nodes.length == 1) return leaf_nodes[0];
        if (leaf_nodes.length == 2) return _Internal_Node.from(leaf_nodes[0], leaf_nodes[1]);

        let leaf_nodes_sorted_align_x_axis = leaf_nodes.sort(_Leaf_Node.sort_align_x_axis).slice();
        let leaf_nodes_sorted_align_y_axis = leaf_nodes.sort(_Leaf_Node.sort_align_y_axis).slice();
        let leaf_nodes_sorted_align_z_axis = leaf_nodes.sort(_Leaf_Node.sort_align_z_axis);

        let division = {
            cost: Infinity,
            dividing: undefined,
            axis_aligned_sorted_leaf_nodes: undefined,
        };
        this._divide_leaf_nodes(leaf_nodes_sorted_align_x_axis, division);
        this._divide_leaf_nodes(leaf_nodes_sorted_align_y_axis, division);
        this._divide_leaf_nodes(leaf_nodes_sorted_align_z_axis, division);

        let child0 = this._create_bounding_volume_hierarchy_tree(division.axis_aligned_sorted_leaf_nodes.slice(0, division.dividing));
        let child1 = this._create_bounding_volume_hierarchy_tree(division.axis_aligned_sorted_leaf_nodes.slice(division.dividing));
        return _Internal_Node.from(child0, child1);
    }

    static _divide_leaf_nodes(leaf_nodes, division)
    {
        let end = leaf_nodes.length - 1;
        let forward_continuously_merged_bounding_boxes = [];
        let backward_continuously_merged_bounding_boxes = [];
        let last_merged_bounding_box = undefined;

        last_merged_bounding_box = leaf_nodes[0].axis_aligned_bounding_box;
        for (let i = 0; i < end; i++) {
            last_merged_bounding_box = last_merged_bounding_box.clone().merge(leaf_nodes[i].axis_aligned_bounding_box);
            forward_continuously_merged_bounding_boxes.push(last_merged_bounding_box);
        }
        last_merged_bounding_box = leaf_nodes[end].axis_aligned_bounding_box;
        for (let i = end; i > 0; i--) {
            last_merged_bounding_box = last_merged_bounding_box.clone().merge(leaf_nodes[i].axis_aligned_bounding_box);
            backward_continuously_merged_bounding_boxes.push(last_merged_bounding_box);
        }

        let cost = Infinity;
        let dividing = undefined;
        for (let i = 0, j = end - 1; i < end; i++, j--) {
            let current_cost = forward_continuously_merged_bounding_boxes[i].volume() * (i + 1) + backward_continuously_merged_bounding_boxes[j].volume() * (j + 1);
            if (current_cost < cost) {
                cost = current_cost;
                dividing = i + 1;
            }
        }
        if (cost < division.cost) {
            division.cost = cost;
            division.dividing = dividing;
            division.axis_aligned_sorted_leaf_nodes = leaf_nodes;
        }
    }
};

class Hitting_Hint
{
    constructor()
    {
        this.point = undefined;
        this.normal = undefined;
        this.distance = undefined;
    }

    static from(point, normal, distance)
    {
        let result = new Hitting_Hint();
        result.point = point;
        result.normal = normal;
        result.distance = distance;
        return result;
    }

    static compare(a, b)
    {
        return a.distance - b.distance;
    }
};

class Tracing_Ray
{
    constructor()
    {
        this.beginning = undefined;
        this.direction = undefined;
        this.hitting_hints = undefined;
    }

    static from(beginning, direction)
    {
        let result = new Tracing_Ray();
        if (direction.x == 0.0 && direction.y == 0.0 && direction.z == 0.0) {
            console.log("[ERROR]: Tracing ray direction should not be zero vector.");
            result.beginning = new THREE.Vector3();
            result.beginning = new THREE.Vector3(1.0);
        } else {
            result.beginning = beginning.clone();
            result.direction = direction.clone().normalize();
        }
        result.hitting_hints = [];
        return result;
    }

    clone()
    {
        return new Tracing_Ray().copy(this);
    }

    copy(a)
    {
        this.beginning.copy(a.beginning);
        this.direction.copy(a.direction);
        this.hitting_hints = [];
        return this;
    }

    normalize_hitting_hints(tolerance = 1e-3)
    {
        if (this.hitting_hints.length < 2) return;

        let pending = this.hitting_hints;
        pending.sort(Hitting_Hint.compare);

        let last_hint = pending[0];
        this.hitting_hints = [last_hint];
        for (let i = 1; i < pending.length; i++) {
            let hint = pending[i];
            if (Math.abs(hint.distance - last_hint.distance) < tolerance) continue;

            this.hitting_hints.push(hint);
            last_hint = hint;
        }
    }
};

class _Internal_Node
{
    constructor()
    {
        this.axis_aligned_bounding_box = new Axis_Aligned_Bounding_Box();
        this.child0 = null;
        this.child1 = null;
    }

    static from(child0, child1)
    {
        let result = new _Internal_Node();
        result.axis_aligned_bounding_box.merge(child0.axis_aligned_bounding_box).merge(child1.axis_aligned_bounding_box);
        result.child0 = child0;
        result.child1 = child1;
        return result;
    }

    clone()
    {
        return new _Internal_Node().copy(this);
    }

    copy(a)
    {
        this.axis_aligned_bounding_box.copy(a.axis_aligned_bounding_box);
        this.child0 = a.child0;
        this.child1 = a.child1;
        return this;
    }

    hit_by(tracing_ray)
    {
        if (this.axis_aligned_bounding_box.hit_by(tracing_ray.beginning, tracing_ray.direction)) {
            this.child0.hit_by(tracing_ray);
            this.child1.hit_by(tracing_ray);
        }
    }
};

class _Leaf_Node
{
    constructor()
    {
        this.axis_aligned_bounding_box = new Axis_Aligned_Bounding_Box();
        this.center = new THREE.Vector3();
        this.point0 = new THREE.Vector3();
        this.point1 = new THREE.Vector3();
        this.point2 = new THREE.Vector3();
        this.normal = new THREE.Vector3();
    }

    static from(vertices, index0, index1, index2)
    {
        let result = new _Leaf_Node();
        index0 *= 3;
        index1 *= 3;
        index2 *= 3;
        result.point0.set(vertices[index0], vertices[index0 + 1], vertices[index0 + 2]);
        result.point1.set(vertices[index1], vertices[index1 + 1], vertices[index1 + 2]);
        result.point2.set(vertices[index2], vertices[index2 + 1], vertices[index2 + 2]);
        result.axis_aligned_bounding_box = Axis_Aligned_Bounding_Box.from_triangle_mesh(result.point0, result.point1, result.point2);
        result.center.addScaledVector(result.axis_aligned_bounding_box.min, 0.5).addScaledVector(result.axis_aligned_bounding_box.max, 0.5);

        let v01 = new THREE.Vector3().subVectors(result.point1, result.point0);
        let v02 = new THREE.Vector3().subVectors(result.point2, result.point0);
        result.normal = v01.cross(v02).normalize();

        return result;
    }

    clone()
    {
        return new _Leaf_Node().copy(this);
    }

    copy(a)
    {
        this.axis_aligned_bounding_box.copy(a.axis_aligned_bounding_box);
        this.center.copy(a.center);
        this.point0.copy(a.point0);
        this.point1.copy(a.point1);
        this.point2.copy(a.point2);
        this.normal.copy(a.normal);
        return this;
    }

    hit_by(tracing_ray)
    {
        if (this.axis_aligned_bounding_box.hit_by(tracing_ray.beginning, tracing_ray.direction)) {
            let t = ray_distance_to_triangle(tracing_ray.beginning, tracing_ray.direction, this.point0, this.point1, this.point2);
            if (t >= 0 && t != Infinity) {
                let intersaction = tracing_ray.beginning.clone().addScaledVector(tracing_ray.direction, t);
                let inside = is_point_inside_triangle(intersaction, this.point0, this.point1, this.point2);
                if (inside) {
                    tracing_ray.hitting_hints.push(Hitting_Hint.from(intersaction, this.normal, t));
                } else {
                    // Nothing needs to be done.
                }
            }
        }
    }

    static sort_align_x_axis(a, b)
    {
        return a.center.x - b.center.x;
    }

    static sort_align_y_axis(a, b)
    {
        return a.center.y - b.center.y;
    }

    static sort_align_z_axis(a, b)
    {
        return a.center.z - b.center.z;
    }
};

