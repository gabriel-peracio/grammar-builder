import { kebabCase } from "lodash";

export const ruleType = Symbol("ruleType");

type sequenceRuleType = { [ruleType]: "sequence"; parts: (string | rule)[] };
type oneOfRuleType = { [ruleType]: "oneOf"; parts: (string | rule)[] };
type refRuleType = { [ruleType]: "ref"; id: string };
type rangeRuleType = { [ruleType]: "range"; range: string };

type rule = sequenceRuleType | oneOfRuleType | refRuleType | rangeRuleType;

type RuleBuilder<T> = {
  sequence: (...parts: Array<string | rule>) => sequenceRuleType;
  oneOf: (...options: Array<string | rule>) => oneOfRuleType;
  ref: <K extends keyof T>(key: K) => refRuleType;
  range: (range: string) => rangeRuleType;
};

export class Grammar<T extends Record<string, any> = {}> {
  private rules: Record<string, rule> = {};

  define<RuleIdentifier extends string, R>(
    key: RuleIdentifier,
    rule: (r: RuleBuilder<T>) => ReturnType<RuleBuilder<T>[keyof RuleBuilder<T>]>
  ) {
    if (key === "root") {
      throw new Error("Cannot define a root rule");
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

  build(): string {
    return Object.entries(this.rules)
      .map(([ruleName, rule]) => `${kebabCase(ruleName)} ::= ` + this.parser(rule))
      .join("\n");
  }
}
