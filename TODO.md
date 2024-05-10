## TODO

- [x] Add `root` rule
- [ ] Add support for imports (e.g. define a "iso8601" reference, and then use it in a "date" field in another rule)
- [x] Add cardinality support (`oneOrMore`, `zeroOrMore`, `optional`)
- [ ] Add sugar:
  - [ ] `list` allows "listItem, listItem, listItem" or "- listItem\n- listItem\n- listItem", etc.
        unrolls to `"- " listItem ('\n- ' listItem)*`
  - [ ] `premades` for things like `digit`, `letter`, `whitespace`, etc.
  - [ ] allow ranges to be numeric, e.g. `"a"{2,5}` desugars to `"a" "a" ("a" ("a" ("a")?)?)?`
- [ ] Add composability types:
  - [ ] `grammar.root(r=>r.oneOf('a', 'b'))` finalizes the grammar
  - [ ] `grammar.extend(otherGrammar)` merges two grammars, as long as `otherGrammar` doesn't have a root, and there are no rule conflicts (in which case, throw). Make sure that when extending, the references of `otherGrammar` become available for use in the new grammar.
- [x] Add JSDoc explanations for each rule and method
- [x] Ensure coverage is up to snuff
- [ ] Add husky to lint and prettify on commit
- [x] Add CI
- [x] Package and publish on npm
- [ ] Add more examples

## Research

- [ ] Check if we can have a `grammar.test(someString)` method that returns a boolean if the string matches the grammar
