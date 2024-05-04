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
      const grammar = new Grammar().define("testSequence", (r) => r.sequence("a", "b", "c")).build();
      expect(grammar).toEqual(`test-sequence ::= "a" "b" "c"`);
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
      const grammar = new Grammar().define("testSequence", (r) => r.sequence("a", r.sequence("b", "c"), "d")).build();
      expect(grammar).toEqual(`test-sequence ::= "a" "b" "c" "d"`);
    });
    it("should parse a sequence rule with a nested oneOf rule", () => {
      const grammar = new Grammar().define("testSequence", (r) => r.sequence("a", r.oneOf("b", "c"), "d")).build();
      expect(grammar).toEqual(`test-sequence ::= "a" ("b" | "c") "d"`);
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
      const grammar = new Grammar().define("testOneOf", (r) => r.oneOf("a", "b", "c")).build();
      expect(grammar).toEqual(`test-one-of ::= ("a" | "b" | "c")`);
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
      const grammar = new Grammar().define("testOneOf", (r) => r.oneOf("a", r.sequence("b", "c"), "d")).build();
      expect(grammar).toEqual(`test-one-of ::= ("a" | "b" "c" | "d")`);
    });
    it("should parse a oneOf rule with a nested oneOf rule", () => {
      const grammar = new Grammar().define("testOneOf", (r) => r.oneOf("a", r.oneOf("b", "c"), "d")).build();
      expect(grammar).toEqual(`test-one-of ::= ("a" | ("b" | "c") | "d")`);
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
        .define("sequenceB", (r) => r.sequence(r.ref("sequenceA"), "c"))
        .build();
      expect(grammar).toEqual(`sequence-a ::= "a" "b"\nsequence-b ::= sequence-a "c"`);
    });
    it("should allow a ref to point to a sequence rule", () => {
      const grammar = new Grammar()
        .define("sequence", (r) => r.sequence("a", "b"))
        .define("ref", (r) => r.ref("sequence"))
        .build();
      expect(grammar).toEqual(`sequence ::= "a" "b"\nref ::= sequence`);
    });
    it("should allow a ref to point to a oneOf rule", () => {
      const grammar = new Grammar()
        .define("oneOf", (r) => r.oneOf("a", "b"))
        .define("ref", (r) => r.ref("oneOf"))
        .build();
      expect(grammar).toEqual(`one-of ::= ("a" | "b")\nref ::= one-of`);
    });
    it("should allow a ref to point to a range rule", () => {
      const grammar = new Grammar()
        .define("range", (r) => r.range("[0-9]"))
        .define("ref", (r) => r.ref("range"))
        .build();
      expect(grammar).toEqual(`range ::= [0-9]\nref ::= range`);
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
      const grammar = new Grammar().define("testRange", (r) => r.range(rangeStr)).build();
      expect(grammar).toEqual(`test-range ::= ${rangeStr}`);
    });
    it("should throw an error if the range is not in the correct format", () => {
      expect(() => new Grammar().define("testRange", (r) => r.range("0-9"))).toThrowError(
        `Range must be in the form of a range literal (e.g. [0-9]), received: 0-9`
      );
    });
  });
});
