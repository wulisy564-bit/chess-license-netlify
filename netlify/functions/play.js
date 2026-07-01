const fs = require("fs");
const path = require("path");
const { getAuth, requireAccessResponse } = require("./lib/auth");

function findGameFile() {
  const candidates = [
    path.join(process.cwd(), "protected-game", "index.html"),
    path.join(__dirname, "..", "..", "protected-game", "index.html"),
    path.join(__dirname, "protected-game", "index.html"),
    path.join("/var/task", "protected-game", "index.html")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Protected game file not found. Checked: ${candidates.join(", ")}`);
}

exports.handler = async (event) => {
  const auth = await getAuth(event);
  const blocked = requireAccessResponse(event, auth);
  if (blocked) {
    if (blocked.statusCode === 401) {
      return {
        statusCode: 302,
        headers: {
          location: "/"
        },
        body: ""
      };
    }
    return blocked;
  }

  const gamePath = findGameFile();
  const html = fs.readFileSync(gamePath, "utf8");

  return {
    statusCode: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    },
    body: html
  };
};
