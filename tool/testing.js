class Testing_Case
{
    constructor()
    {
        this.name = undefined;
        this.serial_number = undefined;
        this.passed = undefined;
        this.clue = undefined;
    }

    static from(name, serial_number, passed, clue)
    {
        let result = new Testing_Case();
        result.name = name;
        result.serial_number = serial_number;
        result.passed = passed;
        result.clue = clue;
        return result;
    }

    report()
    {
        console.log("\t· Test case ", this.serial_number, " [", this.name, "] ", (this.passed ? "passed" : "failed"), ".");
    }

    clued_report()
    {
        if (this.passed) {
            console.log("\t· Test case ", this.serial_number, " [", this.name, "] passed.");
        } else {
            if (this.clue) {
                console.log( "\t· Test case ", this.serial_number, " [", this.name, "] failed, clue is ", this.clue);
            } else {
                console.log( "\t· Test case ", this.serial_number, " [", this.name, "] failed, no clue provided.");
            }
        }
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

    watch(assertion, name = "unnamed", clue = null)
    {
        this.num_cases++;
        let testing_case = Testing_Case.from(name, this.num_cases, assertion, clue);
        this.all_cases.push(testing_case);
        if (!assertion) this.failed_cases.push(testing_case);
    }

    report()
    {
        console.log("Test Result:");
        console.log("\t· Totally tested ", this.num_cases, " cases.");
        console.log("\t· ", this.num_cases - this.failed_cases.length, " passed.");
        console.log("\t· ", this.failed_cases.length, " failed.");
        console.log("\t· Pass rate: ", (this.num_cases - this.failed_cases.length) / this.num_cases * 100.0, "% which is (", this.num_cases - this.failed_cases.length, "/", this.num_cases, ").");
        console.log("Testing Cases:");
        for (let i = 0; i < this.num_cases; i++) this.all_cases[i].report();
        if (this.failed_cases.length != 0) {
            console.log("Here are failed cases reported again:");
            for (let i = 0; i < this.failed_cases.length; i++) this.failed_cases[i].clued_report();
        } else {
            console.log("All test cases passed!");
        }
    }
};

