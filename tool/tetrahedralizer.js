class Tetrahedralization_Config
{
    constructor()
    {
        this.resolution = 10;
        this.subdivide_mesh = true;
        this.sort_indexed_points = false;

        this.min_quality = undefined;
        this.min_quality_exponent = -3;
        this.exclude_low_quality_tetrahedron = true;

        this.epsilon = undefined;
        this.epsilon_base = 1e-3;
        this.randomly_float_coordinates = true;
        this.automatically_scale_epsilon = true;

        this.bounding_radius_scale = 5.0;

        this.num_subdivision = Infinity;
        this.return_max_subdivision = false;
        this.exclude_outside_tetrahedron = true;
    }

    clone()
    {
        return new Tetrahedralization_Config().copy(this);
    }

    copy(a)
    {
        this.resolution = a.resolution;
        this.subdivide_mesh = a.subdivide_mesh;
        this.sort_indexed_points = a.sort_indexed_points;

        this.min_quality = a.min_quality;
        this.min_quality_exponent = a.min_quality_exponent;
        this.exclude_low_quality_tetrahedron = a.exclude_low_quality_tetrahedron;

        this.epsilon = a.epsilon;
        this.epsilon_base = a.epsilon_base;
        this.randomly_float_coordinates = a.randomly_float_coordinates;
        this.automatically_scale_epsilon = a.automatically_scale_epsilon;

        this.bounding_radius_scale = a.bounding_radius_scale;

        this.num_subdivision = a.num_subdivision;
        this.return_max_subdivision = a.return_max_subdivision;
        this.exclude_outside_tetrahedron = a.exclude_outside_tetrahedron;

        return this;
    }
};

function tetrahedralize(shape, config)
{
    if (config.min_quality_exponent != undefined) {
        config.min_quality = 10 ** Math.min(config.min_quality_exponent, 0);    // The regular tetrahedron has 1.0 quality.
    } else {
        if (typeof(config.min_quality) != "number" && config.exclude_low_quality_tetrahedron) {
            throw new Error("ERROR: Missing min quality for excluding low quality tetrahedron.");
        }
    }

    let prepare_data = (shape, config) => {
        let indexed_points = [];
        let center = new THREE.Vector3();
        let tree = Bounding_Volume_Hierarchy_Tree.from(shape);

        let vertices = shape.skin.vertices;
        let aabb = new Axis_Aligned_Bounding_Box();
        let center_divisor = 1.0 / (vertices.length / 3);
        for (let i = 0; i < vertices.length;) {
            let x = vertices[i++];
            let y = vertices[i++];
            let z = vertices[i++];
            let indexed_point = _Indexed_Point.from(x, y, z);
            indexed_points.push(indexed_point);
            aabb.merge_point(indexed_point.point);
            center.addScaledVector(indexed_point.point, center_divisor);
        }
        if (config.subdivide_mesh) {
            if (config.resolution == undefined) {
                throw new Error("ERROR: Missing resolution for subdivide mesh.");
            }
            let span = aabb.max.clone().sub(aabb.min);
            let step = Math.max(span.x, span.y, span.z) / config.resolution;
            if (config.automatically_scale_epsilon) {
                if (typeof(config.epsilon_base) != "number") {
                    throw new Error("ERROR: Missing epsilon base for automatically scaling epsilon.");
                } else {
                    config.epsilon = step * config.epsilon_base;
                }
            }
            if (config.randomly_float_coordinates && typeof(config.epsilon) != "number") {
                throw new Error("ERROR: Missing epsilon for randomly floating coordinates.");
            }
            for (let x = aabb.min.x; x <= aabb.max.x; x += step) {
                for (let y = aabb.min.y; y <= aabb.max.y; y += step) {
                    for (let z = aabb.min.z; z <= aabb.max.z; z += step) {
                        let indexed_point = undefined;
                        if (config.randomly_float_coordinates) {
                            indexed_point = _Indexed_Point.from(
                                x + random_epsilon(config.epsilon),
                                y + random_epsilon(config.epsilon),
                                z + random_epsilon(config.epsilon),
                            );
                        } else {
                            indexed_point = _Indexed_Point.from(x, y, z);
                        }
                        if (tree.is_point_inside(indexed_point.point)) {
                            indexed_points.push(indexed_point);
                        } else {
                            // Nothing need to be done.
                        }
                    }
                }
            }
        }

        return {
            tree: tree,
            center: center,
            indexed_points: indexed_points,
        };
    };

    let create_bounding_tetrahedron = (indexed_points, center, config) => {
        let squared_radius = -Infinity;
        for (let i = 0; i < indexed_points.length; i++) {
            squared_radius = Math.max(squared_radius, indexed_points[i].point.distanceToSquared(center));
        }
        if (typeof(config.bounding_radius_scale) != "number") {
            throw new Error("ERROR: Missing bounding radius for creating bounding tetrahedron.");
        }
        let safe_radius = config.bounding_radius_scale * Math.sqrt(squared_radius);
        return _Tetrahedron.from(
            _Indexed_Point.from(center.x - safe_radius, center.y, center.z - safe_radius),
            _Indexed_Point.from(center.x + safe_radius, center.y, center.z - safe_radius),
            _Indexed_Point.from(center.x, center.y + safe_radius, center.z + safe_radius),
            _Indexed_Point.from(center.x, center.y - safe_radius, center.z + safe_radius),
        );
    };

    let sort_indexed_points = (indexed_points, center) => {
        let mapped = indexed_points.map((value, index) => {
            let recentered_point = value.point.clone().sub(center);
            let discrete_distance = Math.max(Math.abs(recentered_point.x), Math.abs(recentered_point.y), Math.abs(recentered_point.z));
            return {
                index,
                discrete_distance,
            };
        });
        mapped.sort((a, b) => {
            return a.discrete_distance - b.discrete_distance;
        });
        return mapped.map((mapped_value) => indexed_points[mapped_value.index]);
    };

    let create_bone = (bounding_tetrahedron, indexed_points, tree, config) => {
        let bone = {};
        bone.type = "tetrahedron";
        bone.vertices = [];
        bone.solid_indices = [];
        bone.edge_indices = [];

        let cluster = _Tetrahedron_Cluster.from(bounding_tetrahedron, indexed_points, tree, config);
        let tetrahedra = cluster.tetrahedra;
        if (tetrahedra.length == 0) return bone;

        let next_point_index = 0;
        for (let i = 0; i < tetrahedra.length; i++) {
            let tetrahedron = tetrahedra[i];
            for (let j = 0; j < 4; j++) {   // A tetrahedron has 4 indexed points.
                let indexed_point = tetrahedron.indexed_points[j];
                if (indexed_point.index == undefined) {
                    let point = indexed_point.point;
                    bone.vertices.push(point.x, point.y, point.z);
                    indexed_point.index = next_point_index++;
                } else {
                    // The indexed points has been added to bone's vertices, nothing need to be done.
                }
                bone.solid_indices.push(indexed_point.index);
            }
        }

        let indexed_edges = [];
        for (let i = 0; i < tetrahedra.length; i++) {
            let tetrahedron = tetrahedra[i];
            for (let j = 0; j < 3; j++) {   // Traverse edges unrepeatedly.
                let index0 = tetrahedron.indexed_points[j].index;
                for (let k = j + 1; k < 4; k++) {
                    let index1 = tetrahedron.indexed_points[k].index;
                    indexed_edges.push(_Indexed_Edge.from(index0, index1));
                }
            }
        }
        if (indexed_edges.length == 0) return bone;

        indexed_edges.sort(_Indexed_Edge.compare);
        let old_indexed_edge = indexed_edges[0];
        let new_indexed_edge = undefined;
        bone.edge_indices.push(old_indexed_edge.index0, old_indexed_edge.index1);
        for (let i = 1; i < indexed_edges.length; i++) {
            new_indexed_edge = indexed_edges[i];
            if (_Indexed_Edge.compare(new_indexed_edge, old_indexed_edge) != 0) {
                old_indexed_edge = new_indexed_edge;
                bone.edge_indices.push(new_indexed_edge.index0, new_indexed_edge.index1);
            }
        }

        return bone;
    }

    let data = prepare_data(shape, config);
    if (config.return_max_subdivision) {
        return data.indexed_points.length;
    } else {
        let bounding_tetrahedron = create_bounding_tetrahedron(data.indexed_points, data.center, config);
        if (config.sort_indexed_points) data.indexed_points = sort_indexed_points(data.indexed_points, data.center);
        return create_bone(bounding_tetrahedron, data.indexed_points, data.tree, config);
    }
}

class _Indexed_Point
{
    constructor()
    {
        this.point = undefined;
        this.index = undefined;
    }

    static from(x, y, z)
    {
        let result = new _Indexed_Point();
        result.point = new THREE.Vector3(x, y, z);
        return result;
    }
};

class _Tetrahedron
{
    // Indices ensure that, when looking from outside of tetrahedron into inside,
    // the order of triangle vertices are counterclockwise. Notice that I assume
    // the vertices of the base triangle of the tetrahedron are the 1st, 2nd, 3rd
    // points, the apex vertex of the tetrahedron is the 4th point, and, if looks
    // from the apex to the base, the 1st, 2nd, 3rd points are in counterclockwise
    // order. Whenever I create a tetrahedron, I will observe the assumptions
    // described above.
    static triangles_indices = [
        [2, 1, 0],
        [0, 1, 3],
        [1, 2, 3],
        [2, 0, 3],
    ];

    constructor()
    {
        this.indexed_points = undefined;
        this.triangles_normals = undefined;
        this.neighbors = undefined; // Neighboring tetrahedra, indices order are consistent with normals and distance.

        this.mask = undefined;      // Use a monotonically increasing int to avoid repeatedly visited in traversing.

        this.absorbed = undefined;  // A tetrahedron may be absorbed into a big crystal and it's vertices are used to create new tetrahedra.
        this.surfaces = undefined;  // Crystal triangle neighbors, to avoid ambiguity, I use "surfaces" since "neighbors" is used.
    }

    static from(indexed_point0, indexed_point1, indexed_point2, indexed_point3)
    {
        return _Tetrahedron.from_points([indexed_point0, indexed_point1, indexed_point2, indexed_point3]);
    }

    static from_points(indexed_points)
    {
        let result = new _Tetrahedron();
        result.indexed_points = indexed_points;
        result.triangles_normals = [];
        let indices = _Tetrahedron.triangles_indices;
        for (let i = 0; i < 4; i++) {   // A tetrahedron is composed of 4 triangles.
            let p0 = indexed_points[indices[i][0]].point;
            let p1 = indexed_points[indices[i][1]].point;
            let p2 = indexed_points[indices[i][2]].point;
            let v01 = p1.clone().sub(p0);
            let v02 = p2.clone().sub(p0);
            let normal = v01.cross(v02).normalize();
            result.triangles_normals.push(normal);
        }
        result.neighbors = [null, null, null, null];
        result.mask = 0;
        result.absorbed = false;
        result.surfaces = [null, null, null, null];
        return result;
    }
};

class _Tetrahedron_Cluster
{
    constructor()
    {
        this.tetrahedra = undefined;                // No absorbed, out-of-bound, low quality tetrahedra included in the final result.
        this.visit_mask = undefined;                // A monotonically increasing int for marking the tetrahedra which were visited in this iteration.
        this.heuristic_tetrahedron = undefined;     // A tetrahedron which might be close to the located tetrahedron of next indexed point.
        this.num_absorbed_tetrahedra = undefined;   // Totally clearing absorbed tetrahedra in each iteration is unnecessary, we clear them only when there are too much except in the final iteration.
        this.num_bad_searching = undefined;         // If we can not find the locating tetrahedron of the new indexed point with the last heuristic tetrahedron, we use the first tetrahedron which has not been visited as the heuristic tetrahedon and try searching again. we call this kind of searching as bad searching.
    }

    static from(bounding_tetrahedron, indexed_points, bounding_volume_hierarchy_tree, config)
    {
        let result = new _Tetrahedron_Cluster();
        result.tetrahedra = [bounding_tetrahedron];
        result.visit_mask = 0;
        result.heuristic_tetrahedron = bounding_tetrahedron;
        result.num_absorbed_tetrahedra = 0;
        result.num_bad_searching = 0;
        for (let i = 0; i < Math.min(indexed_points.length, config.num_subdivision); i++) {
            result._subdivide_with(indexed_points[i], config);
        }
        result._beneficiate(bounding_volume_hierarchy_tree, config);
        return result;
    }

    _subdivide_with(indexed_point, config)
    {
        let seed_tetrahedron = this._try_locate(indexed_point.point);
        if (seed_tetrahedron) {
            let crystal = _Crystal.from(seed_tetrahedron, indexed_point, this);     // Crystal will update the attributes of tetrahedron cluster.
            crystal.grow(config.epsilon);
            crystal.fracture();
            this._clear_absorbed_tetrahedra(0.2);
        } else {
            throw new Error("ERROR: Failed to find a seed tetrahedron, something bad happened.");
        }
    }

    _beneficiate(tree, config)
    {
        this._clear_absorbed_tetrahedra(0.0);

        if (config.exclude_outside_tetrahedron) {
            this._clear_outside_tetrahedra(tree);
        } else {
            // Nothing need to be done.
        }

        if (config.exclude_low_quality_tetrahedron) {
            this._clear_low_quality_tetrahedra(config.min_quality);
        } else {
            // Nothing need to be done.
        }
    }

    _try_locate(point)
    {
        let do_try_locate = (point, beginning_tetrahedron, visit_mask) => {
            let pending0 = beginning_tetrahedron;
            let pending1 = null;
            while (true) {
                pending0.mask = visit_mask;

                let found_hint = 0;
                let max_distance = -Infinity;
                for (let i = 0; i < 4; i++) {   // A tetrahedron is composed of 4 triangles.
                    let distance = point.clone().sub(pending0.indexed_points[i].point).dot(pending0.triangles_normals[i]);
                    if (distance > 0.0) {
                        let neighbor = pending0.neighbors[i];
                        if (distance > max_distance && neighbor.mask < visit_mask) {
                            max_distance = distance;
                            pending1 = neighbor;
                        }
                    } else {
                        found_hint++;
                    }
                }
                if (found_hint == 4) {
                    return pending0;
                }
                if (pending1) {
                    pending0 = pending1;
                    pending1 = null;
                } else {
                    return null;    // Failed to find a seed tetrahedron from beginning tetrahedron.
                }
            }
        };

        this.visit_mask++;
        let locating_tetrahedron = do_try_locate(point, this.heuristic_tetrahedron, this.visit_mask);
        for (let i = 0; !locating_tetrahedron && i < this.tetrahedra.length; i++) {
            let tetrahedron = this.tetrahedra[i];
            if (tetrahedron.mask < this.visit_mask && !tetrahedron.absorbed) {
                this.num_bad_searching++;
                locating_tetrahedron = do_try_locate(point, tetrahedron, this.visit_mask);
            } else {
                // This tetrahedron has been visited or absorbed, skip it.
            }
        }

        return locating_tetrahedron;
    }

    _clear_absorbed_tetrahedra(max_absorbed_rate)
    {
        let absorbed_rate = this.num_absorbed_tetrahedra / this.tetrahedra.length;
        if (absorbed_rate <= max_absorbed_rate) return;

        let pending = this.tetrahedra;
        this.tetrahedra = [];
        for (let i = 0; i < pending.length; i++) {
            let tetrahedron = pending[i];
            if (tetrahedron.absorbed == false) {
                this.tetrahedra.push(tetrahedron);
            }
        }
        this.num_absorbed_tetrahedra = 0;
    }

    _clear_outside_tetrahedra(tree)
    {
        let pending = this.tetrahedra;
        this.tetrahedra = [];
        for (let i = 0; i < pending.length; i++) {
            let tetrahedron = pending[i];
            let center = new THREE.Vector3();
            for (let j = 0; j < 4; j++) {   // A tetrahedron has 4 indexed points.
                center.addScaledVector(tetrahedron.indexed_points[j].point, 0.25);
            }
            if (!tree.is_point_inside(center)) continue;

            this.tetrahedra.push(tetrahedron);
        }
    }

    _clear_low_quality_tetrahedra(min_quality)
    {
        let pending = this.tetrahedra;
        this.tetrahedra = [];
        for (let i = 0; i < pending.length; i++) {
            let tetrahedron = pending[i];
            if (tetrahedron_quality(
                tetrahedron.indexed_points[0].point,
                tetrahedron.indexed_points[1].point,
                tetrahedron.indexed_points[2].point,
                tetrahedron.indexed_points[3].point,
            ) < min_quality) {
                continue;
            }

            this.tetrahedra.push(tetrahedron);
        }
    }
};

class _Crystal_Triangle
{
    constructor()
    {
        this.indexed_points = undefined;        // Will be the vertices of the base triangle of generated tetrahedron.
        this.neighbors = undefined;             // Neighboring crystal triangles.
        this.from_tetrahedron = undefined;      // The absorbed tetrahedron which the crystal triangle comes from.
        this.adjacent_tetrahedron = undefined;  // The adjacent tetrahedron which next to the crystal triangle and in the outside of crystal.
        this.fracture_tetrahedron = undefined;  // The newly created tetrahedron.

        this.absorbed = undefined;  // A crystal triangle may be absorbed when the tetrahedron in it's both side are absorbed.
    }

    static from(indexed_point0, indexed_point1, indexed_point2, from_tetrahedron, adjacent_tetrahedron)
    {
        return _Crystal_Triangle.from_points([indexed_point0, indexed_point1, indexed_point2], from_tetrahedron, adjacent_tetrahedron);
    }

    static from_points(indexed_points, from_tetrahedron, adjacent_tetrahedron)
    {
        let result = new _Crystal_Triangle();
        result.indexed_points = indexed_points;
        result.neighbors = [null, null, null];
        result.from_tetrahedron = from_tetrahedron;
        result.adjacent_tetrahedron = adjacent_tetrahedron;
        result.fracture_tetrahedron = null;
        result.absorbed = false;
        return result;
    }

    create_tetrahedron(apex_indexed_point)
    {
        if (this.fracture_tetrahedron) return;

        this.fracture_tetrahedron = _Tetrahedron.from(
            this.indexed_points[0],
            this.indexed_points[1],
            this.indexed_points[2],
            apex_indexed_point,
        );
        this.fracture_tetrahedron.neighbors[0] = this.adjacent_tetrahedron;     // The neighboring tetrahedron of the base triangle is the adjacent tetrahedron of crystal triangle.
    }

    neighbor_tetrahedron()
    {
        if (this.adjacent_tetrahedron) {    // Re-neighbor adjacent tetrahedron to newly created tetrahedron of this crystal triangle.
            for (let i = 0; i < 4; i++) {   // A tetrahedron has 4 neighboring tetrahedra.
                if (this.adjacent_tetrahedron.neighbors[i] == this.from_tetrahedron) {
                    this.adjacent_tetrahedron.neighbors[i] = this.fracture_tetrahedron;
                }
            }
        }
        for (let i = 0; i < 3; i++) {   // A crystal triangle has 3 neighboring crystal triangles.
            this.fracture_tetrahedron.neighbors[i + 1] = this.neighbors[i].fracture_tetrahedron;
        }
    }
};

class _Crystal
{
    // Since the nucleus indexed point is located inside of the seed tetrahedron,
    // for the reason that we must ensure the vertices order of crystal triangles
    // is counterclockwise when looking from the nucleus indexed point, we have
    // following crystal triangle vertices indices to initialize a crystal from
    // the seed tetrahedron.
    static triangles_indices = [
        [0, 1, 2],
        [0, 3, 1],
        [1, 3, 2],
        [2, 3, 0],
    ];

    // The neighboring crystal triangles indices of the newly created crystal
    // triangles of initial crystal which indexing from the crystal triangle
    // array. For example, the neighboring crystal triangle of the first edge
    // of the first crystal triangle is the second crystal triangle.
    static neighbors_indices = [
        [1, 2, 3],
        [3, 2, 0],
        [1, 3, 0],
        [2, 1, 0],
    ];

    constructor()
    {
        this.nucleus = undefined;               // The nucleus indexed point which is the beginning of crystal growing.
        this.material = undefined;              // The tetrahedron cluster which is the material for crystal growing.
        this.crystal_triangles = undefined;     // The boundary of crystal, which is composed of many crystal griangles.
    }

    static from(seed_tetrahedron, nucleus_indexed_point, material_tetrahedron_cluster)
    {
        let result = new _Crystal();
        result.nucleus = nucleus_indexed_point;
        result.material = material_tetrahedron_cluster;
        result.crystal_triangles = [];
        for (let i = 0; i < 4; i++) {   // An initial crystal has 4 crystal triangles created from seed tetrahedron.
            let indices = _Crystal.triangles_indices[i];
            result.crystal_triangles.push(_Crystal_Triangle.from(
                seed_tetrahedron.indexed_points[indices[0]],
                seed_tetrahedron.indexed_points[indices[1]],
                seed_tetrahedron.indexed_points[indices[2]],
                seed_tetrahedron,
                seed_tetrahedron.neighbors[i],
            ));
        }
        for (let i = 0; i < 4; i++) {   // Neighbor the newly created 4 crystal triangles.
            let crystal_triangle = result.crystal_triangles[i];
            seed_tetrahedron.surfaces[i] = crystal_triangle;
            let indices = _Crystal.neighbors_indices[i];
            for (let j = 0; j < 3; j++) {   // A crystal triangle has 3 neighboring crystal triangles.
                crystal_triangle.neighbors[j] = result.crystal_triangles[indices[j]];
            }
        }
        seed_tetrahedron.absorbed = true;
        material_tetrahedron_cluster.num_absorbed_tetrahedra++;
        return result;
    }

    grow(epsilon)
    {
        if (typeof(epsilon) != "number") {
            throw new Error("ERROR: Missing epsilon for checking violating tetrahedron.");
        }

        let pending0 = this.crystal_triangles;
        let pending1 = [];
        this.crystal_triangles = [];
        while (pending0.length != 0) {
            for (let i = 0; i < pending0.length; i++) {
                let crystal_triangle = pending0[i];

                // If the adjacent tetrahedron of a crystal triangle is absorbed,
                // that crystal triangle will be absorbed in next iteration. Once
                // the crystal triangle is absorbed, we can omit it.
                if (crystal_triangle.absorbed) continue;

                let adjacent_tetrahedron = crystal_triangle.adjacent_tetrahedron;
                if (adjacent_tetrahedron == null) {     // The crystal triangle is on the boundray of material tetrahedron cluster.
                    this.crystal_triangles.push(crystal_triangle);  // Crystal growing stops here.
                    continue;
                }
                if (adjacent_tetrahedron.absorbed) {    // The adjacent tetrahedron has been crystalized.
                    let merging0 = crystal_triangle;    // The crystal triangle from current crystal to be merged.
                    let merging1 = undefined;           // The crystal triangle from the free crystal initialized from adjacent tetrahedron to be merged.
                    let surfaces = adjacent_tetrahedron.surfaces;
                    for (let j = 0; j < 4; j++) {   // A tetrahedron has 4 crystal triangle surfaces.
                        if (surfaces[j].adjacent_tetrahedron == merging0.from_tetrahedron) {
                            merging1 = surfaces[j];
                        }
                    }
                    if (merging1.absorbed) {
                        console.log("[Crystal Grow] Try to merging a merged triangle.");
                    }
                    let offset = undefined;     // Find the beginning offset for triangle vertices traversing.
                    for (let j = 0; j < 3; j++) {   // A crystal triangle has 3 indexed points.
                        if (merging0.indexed_points[j] == merging1.indexed_points[0]) {
                            offset = j;
                        }
                    }
                    if (offset == undefined) {
                        console.log("[Crystal Grow] Failed to find index offset, the merging triangles are mismatched.");
                    } else {
                        if (
                            false
                            || merging0.indexed_points[(offset + 3) % 3] != merging1.indexed_points[0]
                            || merging0.indexed_points[(offset + 2) % 3] != merging1.indexed_points[1]
                            || merging0.indexed_points[(offset + 1) % 3] != merging1.indexed_points[2]
                        ) {
                            console.log("[Crystal Grow] Same order merging triangle.");
                        }
                    }
                    // If the neighboring crystal triangle of the neighboring crystal triangle
                    // of the merging crystal triangle is the merging crystal triangle, then we
                    // set it to the correspongding neighboring crystal triangle of another
                    // merging crystal triangle, and repeatedly do so on all the neighboring
                    // crstal triangles of merging crystal triangles to finally merge them.
                    for (let j = offset - 1, k = 0; k < 3; j--, k++) {
                        let neighboring0 = merging0.neighbors[(j + 3) % 3];
                        let neighboring1 = merging1.neighbors[k];
                        for (let l = 0; l < 3; l++) {
                            if (neighboring0.neighbors[l] == merging0) {
                                neighboring0.neighbors[l] = neighboring1;
                            }
                            if (neighboring1.neighbors[l] == merging1) {
                                neighboring1.neighbors[l] = neighboring0;
                            }
                        }
                    }
                    merging0.absorbed = true;
                    merging1.absorbed = true;
                } else {
                    let circumsphere = tetrahedron_circumsphere(
                        adjacent_tetrahedron.indexed_points[0].point,
                        adjacent_tetrahedron.indexed_points[1].point,
                        adjacent_tetrahedron.indexed_points[2].point,
                        adjacent_tetrahedron.indexed_points[3].point,
                    );
                    if (
                        false
                        || circumsphere == null
                        || circumsphere.radius < epsilon
                        || this.nucleus.point.distanceTo(circumsphere.center) <= circumsphere.radius
                    ) {
                        // Create a free crystal which will be dropped immediately but it's crystal
                        // triangles will be pushed into pending crystal triangles and be checked in
                        // the next iteration. Notice that the nucleus indexed point is not inside
                        // the newly created crystal, but since it finally will be absorbed into the
                        // crystal which has the nucleus inside, all the crystal triangles whose
                        // order of vertices are wrong will be absorbed and removed from the crystal
                        // boundary triangles.
                        let new_crystal = _Crystal.from(adjacent_tetrahedron, this.nucleus, this.material);
                        let new_crystal_triangles = new_crystal.crystal_triangles;
                        for (let j = 0; j < 4; j++) {   // A new crystal has 4 crystal triangles.
                            pending1.push(new_crystal_triangles[j]);
                        }
                        pending1.push(crystal_triangle);    // Currently the old crystal triangle has not been absorbed.
                    } else {
                        this.crystal_triangles.push(crystal_triangle);  // Crystal growing stops here.
                    }
                }
            }
            pending0 = pending1;
            pending1 = [];
        }
    }

    fracture()
    {
        let crystal_triangles = this.crystal_triangles;
        let num_crystal_triangles = crystal_triangles.length;
        for (let i = 0; i < num_crystal_triangles; i++) {
            for (let j = 0; j < 3; j++) {
                if (crystal_triangles[i].neighbors[j].absorbed) {
                    console.log("[Fracture] There are absorbed neighbors crystal triangles in the neighbors of final crystal triangles.");
                }
            }
            crystal_triangles[i].create_tetrahedron(this.nucleus);
        }
        for (let i = 0; i < num_crystal_triangles; i++) {
            crystal_triangles[i].neighbor_tetrahedron();
        }
        for (let i = 0; i < num_crystal_triangles; i++) {
            this.material.tetrahedra.push(crystal_triangles[i].fracture_tetrahedron);
        }
        this.material.heuristic_tetrahedron = crystal_triangles[num_crystal_triangles - 1].fracture_tetrahedron;
    }
};

class _Indexed_Edge
{
    constructor()
    {
        this.index0 = undefined;
        this.index1 = undefined;
    }

    static from(index0, index1)
    {
        let result = new _Indexed_Edge();
        result.index0 = Math.min(index0, index1);   // For comparison, I ensure that the first index is not greater than the second index.
        result.index1 = Math.max(index0, index1);
        return result;
    }

    static compare(a, b)
    {
        if (a.index0 == b.index0) {
            return a.index1 - b.index1;
        } else {
            return a.index0 - b.index0;
        }
    }
};

