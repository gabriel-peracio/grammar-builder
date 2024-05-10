import { kebabCase } from "lodash-es";

export const ruleType = Symbol("ruleType");

type sequenceRuleType = { [ruleType]: "sequence"; parts: (string | rule)[] };
type oneOfRuleType = { [ruleType]: "oneOf"; parts: (string | rule)[] };
type refRuleType = { [ruleType]: "ref"; id: string };
type rangeRuleType = { [ruleType]: "range"; range: string };

type rule = sequenceRuleType | oneOfRuleType | refRuleType | rangeRuleType;

type RuleBuilder<T> = {
  /**
   * A `sequence` rule enforces that all `parts` must be present and in the correct order.
   * A `part` is either a string literal or another rule.
   * @param parts The rules or string literals that make up the sequence
   * @returns A `sequence` rule
   * @example
   * ```ts
   * r.sequence("a", r.oneOf("b","c"), "d");
   * // "a" ("b" | "c") "d"
   * ```
   */
  sequence: (...parts: Array<string | rule>) => sequenceRuleType;
  /**
   * A `oneOf` rule receives a list of options, and enforces that one of the options must be present.
   * An `option` is either a string literal or another rule.
   * @param options The rules or string literals to choose from
   * @returns A `oneOf` rule
   * @example
   * ```ts
   * r.oneOf("this", r.sequence("A", "B"), "that");
   * // ("this" | "A" "B" | "that")
   * // valid:
   * // - "this"
   * // - "AB"
   * // - "that"
   * ```
   */
  oneOf: (...options: Array<string | rule>) => oneOfRuleType;
  /**
   * A `ref` rule references another rule in the grammar. The referenced rule must be defined
   * before the `ref` rule is used, using the `define` method.
   * @param key The name of the rule to reference
   * @returns A `ref` rule
   * @example
   * ```ts
   * myGrammar
   *   .define("myRule", (r) => r.sequence("a", "b"))
   *   .root((r) => r.ref("myRule"));
   * // root ::= myRule
   * // myRule ::= "a" "b"
   * ```
   */
  ref: <K extends keyof T>(key: K) => refRuleType;
  /**
   * A `range` rule enforces that the string literal it is given is a valid range of characters.
   * It is used similar to a regular expression, with the common `[A-Z]` and `[0-9]` syntax, and
   * also allows escapes:
   * - 8-bit: `\x{00}` to `\x{FF}`
   * - 16-bit: `\u{0000}` to `\u{FFFF}`
   * - 32-bit: `\U{00000000}` to `\U{FFFFFFFF}`
   * - common escapes such as `\n`, `\t`, `\r` etc.
   * - cardinality: `[0-9]+`, `[0-9]*`, `[0-9]?` (explicit ranges are not supported)
   * - Negation: `[^\\n]` (not newline)
   * @param range The range of characters to match, surrounded by square brackets, with an optional cardinality suffix
   * @returns A `range` rule
   * @example
   * ```ts
   * r.range("[0-9]");
   * r.range("[A-Z]+");
   * r.range("[^\\n]*");
   * ```
   */
  range: (range: string) => rangeRuleType;
};

export class Grammar<T extends Record<string, any> = {}> {
  private rules: Record<string, rule> = {};

  /**
   * Defines a rule with the given name. The rule will be placed in the grammar as a variable, and
   * will be available for referencing in other rules.
   * @param key The name of the rule
   * @param rule A function that takes a RuleBuilder and returns a rule
   * @returns A chainable Grammar instance
   */
  define<RuleIdentifier extends string, R>(
    key: RuleIdentifier,
    rule: (r: RuleBuilder<T>) => ReturnType<RuleBuilder<T>[keyof RuleBuilder<T>]>
  ) {
    if (key === "root") {
      throw new Error("Cannot define a root rule, use root() instead");
    }
    if (Object.hasOwn(this.rules, "root")) {
      throw new Error("Cannot extend a grammar with a root rule");
    }
    this.rules[key] = rule(this.builder);
    return this as Grammar<T & Record<RuleIdentifier, R>>;
  }

  private builder: RuleBuilder<T> = {
    sequence: (...parts) => {
      return {
        [ruleType]: "sequence",
        parts,
      };
    },
    oneOf: (...options) => {
      return {
        [ruleType]: "oneOf",
        parts: options,
      };
    },
    ref: <K extends keyof T>(key: K) => {
      return {
        [ruleType]: "ref",
        id: key as string,
      };
    },
    range: (range) => {
      if (
        !(
          range.startsWith("[") &&
          (range.endsWith("]") || range.endsWith("]?") || range.endsWith("]*") || range.endsWith("]+"))
        )
      ) {
        throw new Error(`Range must be in the form of a range literal (e.g. [0-9]), received: ${range}`);
      }

      return {
        [ruleType]: "range",
        range,
      };
    },
  };

  private parser(rule: string | rule): string {
    if (typeof rule === "string") {
      return `"${rule}"`;
    }
    switch (rule[ruleType]) {
      case "sequence":
        return rule.parts.map((part) => this.parser(part)).join(" ");
      case "oneOf":
        return `(${rule.parts.map((part) => this.parser(part)).join(" | ")})`;
      case "ref":
        return kebabCase(rule.id);
      case "range":
        return rule.range;
    }
  }

  /**
   * Defines the root rule (entry point) of the grammar. Once defined, the grammar will lose the
   * ability to define new rules, but will be able to build (output as a GBNF string) the grammar.
   * @param rule The rule to define as the root rule
   * @returns A finalized Grammar instance
   */
  root(rule: (r: RuleBuilder<T>) => ReturnType<RuleBuilder<T>[keyof RuleBuilder<T>]>) {
    this.rules["root"] = rule(this.builder);
    return this;
  }

  /**
   * Builds the grammar into a string that can be parsed by grammar interpreters.
   * @returns A string representation of the grammar in GBNF format
   */
  build(): string {
    if (!Object.hasOwn(this.rules, "root")) {
      throw new Error("No root rule defined");
    }
    return Object.entries(this.rules)
      .map(([ruleName, rule]) => `${kebabCase(ruleName)} ::= ` + this.parser(rule))
      .join("\n");
  }
}
