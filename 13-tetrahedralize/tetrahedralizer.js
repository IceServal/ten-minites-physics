class Tetrahedralizer
{
    constructor()
    {
    }

    static from(resolution)
    {
        let result = new Tetrahedralizer();

        return result;
    }

    tetrahedralize(skin)
    {
        return {
            vertices: [],
            tetrahedron_indices: [],
            tetrahedron_edge_indices: [],
        };
    }
};

