// Fails if an em dash or en dash appears in user-facing source.
// String and template contents are scanned. Comments and regexes are skipped.
// Ordinary hyphens and middle dots are fine.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const roots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".svg", ".css", ".md"]);
const dash = /[—–]/;

function filesIn(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) filesIn(path, out);
    else if (extensions.has(extname(name))) out.push(path);
  }
  return out;
}

/** True when a `/` here would start a regex, not a comment, a division, or a JSX close. */
function regexCanStart(out) {
  let j = out.length - 1;
  while (j >= 0 && /\s/.test(out[j])) j--;
  if (j < 0) return true;
  // Identifier, number, closing bracket or a finished string means division. `<` is a JSX close.
  return !/[0-9A-Za-z_)\]'"`<]/.test(out[j]);
}

/** Source with comments removed, so a dash in a comment does not fail the check. */
function withoutComments(src) {
  let out = "";
  let i = 0;
  let state = "code";
  // Brace depth of the ${} expression currently being read, and depths of outer ones.
  let brace = 0;
  const braces = [];
  let regexClass = false;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += "\n";
      }
      i++;
      continue;
    }
    if (state === "regex") {
      if (c === "\n") out += "\n";
      if (c === "\\" && next) {
        if (next === "\n") out += "\n";
        i += 2;
        continue;
      }
      if (regexClass) {
        if (c === "]") regexClass = false;
      } else if (c === "[") regexClass = true;
      else if (c === "/") state = "code";
      i++;
      continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") {
        state = "code";
        i += 2;
        continue;
      }
      if (c === "\n") out += "\n";
      i++;
      continue;
    }

    if (state === "code") {
      if (c === "/" && next === "/") {
        state = "line";
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        state = "block";
        i += 2;
        continue;
      }
      if (c === "/" && regexCanStart(out)) {
        state = "regex";
        regexClass = false;
        out += c;
        i++;
        continue;
      }
      if (c === "'") state = "sq";
      else if (c === '"') state = "dq";
      else if (c === "`") state = "tpl";
      else if (brace > 0 && c === "{") brace++;
      else if (brace > 0 && c === "}") {
        brace--;
        if (brace === 0) {
          state = "tpl";
          brace = braces.pop() ?? 0;
        }
      }
      out += c;
      i++;
      continue;
    }

    out += c;
    if (c === "\\" && next) {
      out += next;
      i += 2;
      continue;
    }
    if (state === "sq" && c === "'") state = "code";
    else if (state === "dq" && c === '"') state = "code";
    else if (state === "tpl" && c === "`") state = "code";
    else if (state === "tpl" && c === "$" && next === "{") {
      out += next;
      i += 2;
      braces.push(brace);
      brace = 1;
      state = "code";
      continue;
    }
    i++;
  }
  return out;
}

const hits = [];
for (const root of roots) {
  for (const path of filesIn(root)) {
    const lines = withoutComments(readFileSync(path, "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (dash.test(line)) hits.push(`${path}:${index + 1}: ${line.trim()}`);
    });
  }
}

if (hits.length) {
  console.error("Em dashes or en dashes in user-facing source:\n" + hits.join("\n"));
  process.exit(1);
}
