import { describe, it, expect } from "bun:test";
import { Grammar, ruleType } from "./grammar";

describe("grammarBuilder", () => {
  describe("sequence", () => {
    it("should create a sequence rule with string literals", () => {
      const grammar = new Grammar().define("testSequence", (r) => r.sequence("a", "b", "c"));
      expect(grammar).toEqual(
        expect.objectContaining({
          rules: {
            testSequence: {
              [ruleType]: "sequence",
              parts: ["a", "b", "c"],
            },
          },
        })
      );
    });
    it("should parse a sequence rule with string literals", () => {
      const grammar = new Grammar().root((r) => r.sequence("a", "b", "c")).build();
      expect(grammar).toEqual(`root ::= "a" "b" "c"`);
    });
    it("should create a sequence rule with a nested sequence rule", () => {
      const grammar = new Grammar().define("testSequence", (r) => r.sequence("a", r.sequence("b", "c"), "d"));

      expect(grammar).toEqual(
        expect.objectContaining({
          rules: {
            testSequence: {
              [ruleType]: "sequence",
              parts: ["a", { [ruleType]: "sequence", parts: ["b", "c"] }, "d"],
            },
          },
        })
      );
    });
    it("should parse a sequence rule with a nested sequence rule", () => {
      const grammar = new Grammar().root((r) => r.sequence("a", r.sequence("b", "c"), "d")).build();
      expect(grammar).toEqual(`root ::= "a" "b" "c" "d"`);
    });
    it("should parse a sequence rule with a nested oneOf rule", () => {
      const grammar = new Grammar().root((r) => r.sequence("a", r.oneOf("b", "c"), "d")).build();
      expect(grammar).toEqual(`root ::= "a" ("b" | "c") "d"`);
    });
  });
  describe("oneOf", () => {
    it("should create a oneOf rule with string literals", () => {
      const grammar = new Grammar().define("testOneOf", (r) => r.oneOf("a", "b", "c"));
      expect(grammar).toEqual(
        expect.objectContaining({
          rules: {
            testOneOf: {
              [ruleType]: "oneOf",
              parts: ["a", "b", "c"],
            },
          },
        })
      );
    });
    it("should parse a oneOf rule with string literals", () => {
      const grammar = new Grammar().root((r) => r.oneOf("a", "b", "c")).build();
      expect(grammar).toEqual(`root ::= ("a" | "b" | "c")`);
    });
    it("should create a oneOf rule with rule objects", () => {
      const grammar = new Grammar().define("testOneOf", (r) => r.oneOf("a", r.sequence("b", "c"), "d"));

      expect(grammar).toEqual(
        expect.objectContaining({
          rules: {
            testOneOf: {
              [ruleType]: "oneOf",
              parts: ["a", { [ruleType]: "sequence", parts: ["b", "c"] }, "d"],
            },
          },
        })
      );
    });
    it("should parse a oneOf rule with a sequence rule", () => {
      const grammar = new Grammar().root((r) => r.oneOf("a", r.sequence("b", "c"), "d")).build();
      expect(grammar).toEqual(`root ::= ("a" | "b" "c" | "d")`);
    });
    it("should parse a oneOf rule with a nested oneOf rule", () => {
      const grammar = new Grammar().root((r) => r.oneOf("a", r.oneOf("b", "c"), "d")).build();
      expect(grammar).toEqual(`root ::= ("a" | ("b" | "c") | "d")`);
    });
  });
  describe("ref", () => {
    it("should create a ref rule", () => {
      const grammar = new Grammar()
        .define("sequenceA", (r) => r.sequence("a", "b"))
        .define("sequenceB", (r) => r.sequence(r.ref("sequenceA"), "c"));
      expect(grammar).toEqual(
        expect.objectContaining({
          rules: {
            sequenceA: {
              [ruleType]: "sequence",
              parts: ["a", "b"],
            },
            sequenceB: {
              [ruleType]: "sequence",
              parts: [{ [ruleType]: "ref", id: "sequenceA" }, "c"],
            },
          },
        })
      );
    });
    it("should parse a ref rule", () => {
      const grammar = new Grammar()
        .define("sequenceA", (r) => r.sequence("a", "b"))
        .root((r) => r.sequence(r.ref("sequenceA"), "c"))
        .build();
      expect(grammar).toEqual(`sequence-a ::= "a" "b"\nroot ::= sequence-a "c"`);
    });
    it("should allow a ref to point to a sequence rule", () => {
      const grammar = new Grammar()
        .define("sequence", (r) => r.sequence("a", "b"))
        .define("ref", (r) => r.ref("sequence"))
        .root((r) => r.ref("ref"))
        .build();
      expect(grammar).toEqual(`sequence ::= "a" "b"\nref ::= sequence\nroot ::= ref`);
    });
    it("should allow a ref to point to a oneOf rule", () => {
      const grammar = new Grammar()
        .define("oneOf", (r) => r.oneOf("a", "b"))
        .define("ref", (r) => r.ref("oneOf"))
        .root((r) => r.ref("ref"))
        .build();
      expect(grammar).toEqual(`one-of ::= ("a" | "b")\nref ::= one-of\nroot ::= ref`);
    });
    it("should allow a ref to point to a range rule", () => {
      const grammar = new Grammar()
        .define("range", (r) => r.range("[0-9]"))
        .define("ref", (r) => r.ref("range"))
        .root((r) => r.ref("ref"))
        .build();
      expect(grammar).toEqual(`range ::= [0-9]\nref ::= range\nroot ::= ref`);
    });
  });
  describe("range", () => {
    it("should create a range rule", () => {
      const grammar = new Grammar().define("testRange", (r) => r.range("[0-9]"));
      expect(grammar).toEqual(
        expect.objectContaining({
          rules: {
            testRange: {
              [ruleType]: "range",
              range: "[0-9]",
            },
          },
        })
      );
    });
    it.each([["[0-9]"], ["[0-9]?"], ["[0-9]*"], ["[0-9]+"]])("should parse a range rule (%s)", (rangeStr) => {
      const grammar = new Grammar().root((r) => r.range(rangeStr)).build();
      expect(grammar).toEqual(`root ::= ${rangeStr}`);
    });
    it("should throw an error if the range is not in the correct format", () => {
      expect(() => new Grammar().define("testRange", (r) => r.range("0-9"))).toThrowError(
        `Range must be in the form of a range literal (e.g. [0-9]), received: 0-9`
      );
    });
  });

  describe("cardinality", () => {
    describe.each([
      ["zeroOrMore", "*"],
      ["oneOrMore", "+"],
      ["optional", "?"],
    ])("%s", (cardinalityName, cardinalityChar) => {
      it(`should augment a oneOf rule with the "${cardinalityName}" cardinality`, () => {
        const grammar = new Grammar().root((r) => r[cardinalityName](r.oneOf("a", "b"))).build();
        expect(grammar).toEqual(`root ::= ("a" | "b")${cardinalityChar}`);
      });
      it(`should augment a sequence rule with the "${cardinalityName}" cardinality`, () => {
        const grammar = new Grammar().root((r) => r[cardinalityName](r.sequence("a", "b"))).build();
        expect(grammar).toEqual(`root ::= ("a" "b")${cardinalityChar}`);
      });
      it(`should augment a range rule with the "${cardinalityName}" cardinality`, () => {
        const grammar = new Grammar().root((r) => r[cardinalityName](r.range("[0-9]"))).build();
        expect(grammar).toEqual(`root ::= [0-9]${cardinalityChar}`);
      });
      it(`should augment a ref rule with the "${cardinalityName}" cardinality`, () => {
        const grammar = new Grammar()
          .define("testRef", (r) => r.sequence("a"))
          .root((r) => r[cardinalityName](r.ref("testRef")))
          .build();
        expect(grammar).toEqual(`test-ref ::= "a"\nroot ::= test-ref${cardinalityChar}`);
      });
    });
  });

  describe("root", () => {
    it("should allow building after defining a root rule", () => {
      const grammar = new Grammar().root((r) => r.sequence("a", "b")).build();
      expect(grammar).toEqual(`root ::= "a" "b"`);
    });
    it("should throw an error when trying to add a root rule via define", () => {
      expect(() => new Grammar().define("root", (r) => r.sequence("c", "d"))).toThrowError(
        "Cannot define a root rule, use root() instead"
      );
    });
    it("should throw an error when trying to build() without a root rule", () => {
      expect(() => new Grammar().define("test", (r) => r.sequence("c", "d")).build()).toThrowError(
        "No root rule defined"
      );
    });
    it("should throw an error when trying to extend a grammar with a root rule", () => {
      expect(() =>
        new Grammar()
          .root((r) => r.sequence("c", "d"))
          .define("test", (r) => r.sequence("c", "d"))
          .build()
      ).toThrowError("Cannot extend a grammar with a root rule");
    });
  });
});
