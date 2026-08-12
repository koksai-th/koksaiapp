const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceRoots = ["src", "public"].map((name) => path.join(root, name));
const problems = [];
const conflictPattern = /^(<{7}|={7}|>{7})/m;
const secretPattern = /(SUPABASE_SERVICE_ROLE_KEY|FIREBASE_PRIVATE_KEY)\s*=\s*[^\s"']+/;

function walk(target) {
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!/\.(?:js|jsx|ts|tsx|css|html|json|webmanifest)$/.test(entry.name)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    const relative = path.relative(root, fullPath);
    if (conflictPattern.test(content)) problems.push(`${relative}: พบ merge conflict marker`);
    if (secretPattern.test(content)) problems.push(`${relative}: อาจมี secret ฝังอยู่ใน source`);
  }
}

sourceRoots.forEach(walk);

if (problems.length) {
  console.error("Source audit failed:\n" + problems.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Source audit passed");
