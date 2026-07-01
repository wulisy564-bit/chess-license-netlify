const fs = require("fs");
const path = require("path");
const { getAuth, requireAccessResponse } = require("./lib/auth");

exports.handler = async (event) => {
  const auth = await getAuth(event);
  const blocked = requireAccessResponse(event, auth);
  if (blocked) return blocked;

  const gamePath = path.join(__dirname, "..", "..", "protected-game", "index.html");
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
