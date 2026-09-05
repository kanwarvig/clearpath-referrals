import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yml", ".yaml", ".css", ".toml"]);
const patterns = [
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
  { name: "Vercel token", regex: /(?:VERCEL_TOKEN\s*[=:]\s*)["']?[A-Za-z0-9]{20,}/i },
];
const findings = [];
for (const file of tracked) {
  const extension = file.slice(file.lastIndexOf("."));
  if (!textExtensions.has(extension) || file === "package-lock.json") continue;
  const value = readFileSync(file, "utf8");
  for (const pattern of patterns) if (pattern.regex.test(value)) findings.push(`${file}: ${pattern.name}`);
}
if (findings.length) {
  console.error(`Potential secrets found:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log(`Secret scan passed across ${tracked.length} tracked files.`);
