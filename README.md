# grammar-builder

This is a simple helper library to facilitate building [GBNF grammars](https://github.com/ggerganov/llama.cpp/blob/master/grammars/README.md) manually (as opposed to automatically generating them from something like a `JSONSchema` file)

## Why

While the GBNF language is simple, it is not very easy to programatically build. Many of the constructs require double-escaping (wich becomes quadruple escaping when converting to JSON, for example), and having long lists makes the grammar hard to read.

This library adds some minimal type and error checking and allows for a more readable and less error-prone grammar inside your typescript files.

## Example

```typescript
import { Grammar } from "grammar-builder";

const myGrammar = new Grammar().define("myRule", (r) => r.oneOf("this", "that").root((r) => r.ref("myRule")));

const grammarString = myGrammar.build();
/* grammarString:
 * root ::= my-rule
 * my-rule ::= ("this" | "that")
 */
```

### Constructs

- **define**: Allows you to define a new rule and store it in a variable
- **root**: Define the root rule of the grammar
- **build**: Outputs the grammar as a string

### Rules

- **oneOf**: Pick one item from a list:
  ```typescript
  r.oneOf("this", "that");
  // ("this" | "that")
  ```
- **sequence**: Output the list in order
  ```typescript
  r.sequence("this", "that");
  // "this" "that"
  ```
- **ref**: Reference another rule
  ```typescript
  r.define("myRule", (r) => r.oneOf("this", "that")).define("otherRule", (r) =>
    r.sequence("choice: ", r.ref("myRule"))
  );
  // my-rule ::= ("this" | "that")
  // other-rule ::= "choice: " my-rule
  ```
- **range**: Output a range of characters
  ```typescript
  r.range("[A-Z]+");
  // [A-Z]+
  ```
