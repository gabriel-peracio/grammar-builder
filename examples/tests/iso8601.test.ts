import { describe, it, expect } from "bun:test";
import { iso8601 } from "../iso8601";

describe("iso8601", () => {
  it("should output a correct date grammar", () => {
    expect(iso8601.root((r) => r.ref("date")).build()).toEqual(`single-digit ::= [0-9]
non-zero-digit ::= [1-9]
date-year ::= ("19" | "20") single-digit single-digit
date-month ::= ("0" single-digit | "11" | "12")
date-day ::= ("0" non-zero-digit | ("1" | "2") single-digit | "30" | "31")
date ::= date-year "-" date-month "-" date-day
root ::= date`);
  });
});
