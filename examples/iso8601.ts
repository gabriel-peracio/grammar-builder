import { Grammar } from "..";

export const iso8601 = new Grammar()
  .define("singleDigit", (r) => r.range("[0-9]"))
  .define("nonZeroDigit", (r) => r.range("[1-9]"))
  .define("dateYear", (r) => r.sequence(r.oneOf("19", "20"), r.ref("singleDigit"), r.ref("singleDigit")))
  .define("dateMonth", (r) => r.oneOf(r.sequence("0", r.ref("singleDigit")), "11", "12"))
  .define("dateDay", (r) =>
    r.oneOf(r.sequence("0", r.ref("nonZeroDigit")), r.sequence(r.oneOf("1", "2"), r.ref("singleDigit")), "30", "31")
  )
  .define("date", (r) => r.sequence(r.ref("dateYear"), "-", r.ref("dateMonth"), "-", r.ref("dateDay")));
