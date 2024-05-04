import { describe, it, expect } from "bun:test";
import { Grammar } from "./";

describe("grammarBuilder", () => {
  it("basic diarization grammar", () => {
    const grammar = new Grammar()
      .define("charName", (r) => r.range('[^\\n"]+'))
      .define("charAction", (r) => r.oneOf("Dialogue", "Action", "Internal Monologue"))
      .define("identifier", (r) =>
        r.oneOf("Author", "Narrator", r.sequence("Character(", r.ref("charName"), ") / ", r.ref("charAction")))
      )
      .root("identifier");

    expect(grammar).toEqual(
      `root ::= identifier
char-name ::= [^\\n"]+
char-action ::= ("Dialogue" | "Action" | "Internal Monologue")
identifier ::= ("Author" | "Narrator" | "Character(" char-name ") / " char-action)`
    );
  });
  it("scene grammar", () => {
    const grammar = new Grammar()
      .define("considerations", (r) => r.sequence("CONSIDERATIONS: ", r.range(`[^\\n]*`), "\\n"))
      .define("timeChange", (r) => r.sequence("TIME CHANGE: ", r.oneOf("Yes", "No"), "\\n"))
      .define("conditionsChange", (r) => r.sequence("CONDITIONS CHANGE: ", r.oneOf("Yes", "No"), "\\n"))
      .define("perspectiveChange", (r) => r.sequence("PERSPECTIVE CHANGE: ", r.oneOf("Yes", "No"), "\\n"))
      .define("locationChange", (r) => r.sequence("LOCATION CHANGE: ", r.oneOf("Yes", "No"), "\\n"))
      .define("conclusion", (r) => r.sequence("CONCLUSION: ", r.oneOf("CONTINUE", "NEW BACKGROUND"), "\\n"))
      .define("analysis", (r) =>
        r.sequence(
          r.ref("considerations"),
          r.ref("timeChange"),
          r.ref("conditionsChange"),
          r.ref("perspectiveChange"),
          r.ref("locationChange"),
          r.ref("conclusion")
        )
      )
      .root("analysis");

    console.log(grammar);
    // expect(grammar).toEqual(
    //   `root ::= location\nlocation-name ::= [^\\n\"]+\nlocation ::= location-name \">\" location-name`
    //   );
  });
});
