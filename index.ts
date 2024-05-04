import chalk from "chalk";
import { kebabCase, snakeCase } from "lodash";

const ruleType = Symbol("ruleType");

type refType = { [ruleType]: "ref"; id: string };
type sequenceType = { [ruleType]: "sequence"; str: string };
type oneOfType = { [ruleType]: "oneOf"; str: string };

type RuleBuilder<T> = {
  range: (range: string) => string;
  oneOf: (...options: Array<string | refType | sequenceType | ((r: RuleBuilder<T>) => string)>) => oneOfType;
  sequence: (
    ...parts: Array<string | refType | sequenceType | oneOfType | ((r: RuleBuilder<T>) => sequenceType)>
  ) => sequenceType;
  zeroOrMore: (rule: string | sequenceType | refType) => sequenceType;
  oneOrMore: (rule: string | sequenceType | refType) => sequenceType;
  optional: (rule: string | sequenceType | refType) => sequenceType;
  ref: <K extends keyof T>(key: K) => refType;
};

export class Grammar<T extends Record<string, any> = {}> {
  private rules: Partial<T> = {};
  private ruleStructs: Record<string, any> = {};
  mode: "GBNF" | "EBNF" = "GBNF";
  debug: boolean = false;

  constructor(options?: { mode?: "GBNF" | "EBNF"; debug?: boolean }) {
    this.mode = options?.mode ?? "GBNF";
    this.debug = options?.debug ?? false;
  }

  define<RuleIdentifier extends string, R>(
    key: RuleIdentifier,
    rule: (r: RuleBuilder<T>) => ReturnType<RuleBuilder<T>[keyof RuleBuilder<T>]>
  ): Grammar<T & Record<RuleIdentifier, R>> {
    const cardinalityRule = (
      rule: string | sequenceType | refType,
      cardinality: "zeroOrMore" | "oneOrMore" | "optional"
    ): sequenceType => {
      const cardinalityMap = {
        zeroOrMore: "*",
        oneOrMore: "+",
        optional: "?",
      } as const;
      const normalizedStr = (() => {
        if (typeof rule === "string") return rule;
        switch (rule[ruleType]) {
          case "sequence":
            return rule.str;
          case "ref":
            return rule.id;
        }
      })();

      return {
        [ruleType]: "sequence",
        str: `(${normalizedStr})${cardinalityMap[cardinality]}`,
      };
    };

    const builder: RuleBuilder<T & Record<RuleIdentifier, R>> = {
      range: (range) => {
        switch (this.mode) {
          case "GBNF":
            return range;
          case "EBNF":
            return `/${range}/`;
        }
      },
      oneOf: (...options) => {
        return {
          [ruleType]: "oneOf",
          str: `(${options
            .map((option) => {
              if (typeof option === "function") {
                return option(builder);
              }
              if (typeof option === "string") {
                return `"${option.replaceAll('"', '\\"')}"`;
              }
              if (option[ruleType] === "sequence") {
                return option.str;
              }
              if (option[ruleType] === "ref") {
                return option.id;
              }
            })
            .join(" | ")})`,
        };
      },
      sequence: (...parts) => {
        const str = parts
          .map((part) => {
            if (typeof part === "function") {
              return {
                [ruleType]: "sequence",
                parts: part(builder).str,
              };
            }
            if (typeof part === "string") {
              return `"${part.replaceAll('"', '\\"')}"`;
            }
            if (part[ruleType] === "ref") {
              return part.id;
            }
            if (part[ruleType] === "sequence") {
              return part.str;
            }
            if (part[ruleType] === "oneOf") {
              return part.str;
            }
          })
          .join(" ");
        return {
          [ruleType]: "sequence",
          str,
        };
      },
      zeroOrMore: (rule) => cardinalityRule(rule, "zeroOrMore"),
      oneOrMore: (rule) => cardinalityRule(rule, "oneOrMore"),
      optional: (rule) => cardinalityRule(rule, "optional"),
      ref: (key: any) => ({
        [ruleType]: "ref",
        id: (() => {
          switch (this.mode) {
            case "GBNF":
              return kebabCase(key);
            case "EBNF":
              return snakeCase(key);
          }
        })(),
      }),
    };
    const result = rule(builder);
    if (typeof result === "string") {
      this.ruleStructs[key] = { [ruleType]: "hardcodedString", str: result };
      (this.rules as any)[key] = result;
    } else if (result[ruleType] === "sequence") {
      this.ruleStructs[key] = result;
      (this.rules as any)[key] = result.str;
    } else if (result[ruleType] === "oneOf") {
      (this.rules as any)[key] = result.str;
    }
    return this as Grammar<T & Record<RuleIdentifier, R>>;
  }

  root<K extends keyof T>(key: K): string {
    switch (this.mode) {
      case "GBNF":
        return `${this.keyToRuleName("root", `${kebabCase(key as string)}\n${this.build()}`)}`;
      case "EBNF":
        return `${this.keyToRuleName("start", `${snakeCase(key as string)}\n${this.build()}`)}`;
    }
  }

  private keyToRuleName(ruleIdent: string, ruleValueString: string): string {
    switch (this.mode) {
      case "GBNF":
        return `${kebabCase(ruleIdent)} ::= ${ruleValueString}`;
      case "EBNF":
        return `${snakeCase(ruleIdent)} : ${ruleValueString}`;
    }
  }

  private debugColors() {
    console.log(`[Grammar] Grammar Output:`);
    const debugStr = Object.keys(this.rules)
      .map((key) => {
        const ident = (() => {
          switch (this.mode) {
            case "GBNF":
              return chalk.magenta(`${kebabCase(key as string)} ::= `);
            case "EBNF":
              return chalk.magenta(`${snakeCase(key as string)} : `);
          }
        })();
        return `${ident}${this.rules[key as keyof T]}`;
      })
      .join("\n");
    return debugStr;
  }

  private build(): string {
    const grammarOutput = Object.keys(this.rules)
      .map((key) => this.keyToRuleName(key, `${this.rules[key as keyof T]}`))
      .join("\n");

    if (this.debug) {
      console.log(this.debugColors());
    }
    return grammarOutput;
  }
}
