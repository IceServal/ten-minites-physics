class Testing_Case
{
    constructor()
    {
        this.name = undefined;
        this.serial_number = undefined;
        this.passed = undefined;
    }

    static from(name, serial_number, passed)
    {
        let result = new Testing_Case();
        result.name = name;
        result.serial_number = serial_number;
        result.passed = passed;
        return result;
    }

    report()
    {
        console.log("\t· Test case ", this.serial_number, " [", this.name, "] ", (this.passed ? "passed" : "failed"), ".");
    }
};

class Testing
{
    constructor()
    {
        this.result = false;
        this.num_cases = 0;
        this.all_cases = []
        this.failed_cases = [];
    }

    static from()
    {
        return new Testing();
    }

    watch(assertion, name = "unnamed")
    {
        this.num_cases++;
        let testing_case = Testing_Case.from(name, this.num_cases, assertion);
        this.all_cases.push(testing_case);
        if (!assertion) this.failed_cases.push(testing_case);
    }

    report()
    {
        console.log("Test Result:");
        console.log("\t· Totally tested ", this.num_cases, " cases.");
        console.log("\t· ", this.num_cases - this.failed_cases.length, " passed.");
        console.log("\t· ", this.failed_cases.length, " failed.");
        console.log("\t· Pass rate: ", (this.num_cases - this.failed_cases) / this.num_cases * 100.0, "% which is (", this.num_cases - this.failed_cases, "/", this.num_cases, ").");
        console.log("Testing Cases:");
        for (let i = 0; i < this.num_cases; i++) this.all_cases[i].report();
        if (this.failed_cases.length != 0) {
            console.log("Here are failed cases reported again:");
            for (let i = 0; i < this.failed_cases.length; i++) this.failed_cases[i].report();
        } else {
            console.log("All test cases passed!");
        }
    }
};

function test()
{
    let testing = Testing.from();

    let bounding_volume_hierarchy_tree = Bounding_Volume_Hierarchy_Tree.from(cube_skin);
    let root_node = bounding_volume_hierarchy_tree.root_node;
    let axis_aligned_bounding_box = root_node.axis_aligned_bounding_box;
    testing.watch(axis_aligned_bounding_box.min.equals(new THREE.Vector3(-0.5, -0.5, -0.5)));
    testing.watch(axis_aligned_bounding_box.max.equals(new THREE.Vector3(+0.5, +0.5, +0.5)));
    let child0 = root_node.child0;
    axis_aligned_bounding_box = child0.axis_aligned_bounding_box;
    testing.watch(axis_aligned_bounding_box.min.equals(new THREE.Vector3(-0.5, -0.5, -0.5)));
    testing.watch(axis_aligned_bounding_box.max.equals(new THREE.Vector3(-0.5, +0.5, +0.5)));

    testing.report();
}

