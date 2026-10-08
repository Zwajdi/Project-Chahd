const fs = require("fs");
const path = require("path");
const { get } = require("@vercel/blob");

const getBlobToken = () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token || !/^vercel_blob_rw_[^_]+(?:_.+)?$/.test(token)) {
    const error = new Error("BLOB_READ_WRITE_TOKEN is not configured.");
    error.code = "BLOB_NOT_CONFIGURED";
    throw error;
  }
  return token;
};

const readStudents = async () => {
  const result = await get("students.json", {
    access: "private",
    token: getBlobToken(),
  });
  if (!result) {
    return JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "students.json"),
        "utf8",
      ),
    );
  }
  return JSON.parse(await new Response(result.stream).text());
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ message: "Méthode non autorisée." });
    return;
  }

  try {
    const data = request.body || {};
    const identifier = String(data.identifier || "").trim().toLowerCase();
    const password = String(data.password || "");
    const students = await readStudents();
    const student = students.find(
      (entry) =>
        (String(entry.cin || "").trim().toLowerCase() === identifier ||
          String(entry.email || "").trim().toLowerCase() === identifier) &&
        String(entry.password || "") === password,
    );

    if (!student) {
      response.status(401).json({ message: "Identifiants incorrects." });
      return;
    }

    const { password: storedPassword, ...profile } = student;
    response.status(200).json({ account: profile });
  } catch (error) {
    const isBlobConfigurationError =
      error.code === "BLOB_NOT_CONFIGURED" ||
      error.message?.includes("Invalid token") ||
      error.message?.includes("No blob credentials");
    console.error("Login storage error", {
      code: error.code,
      message: error.message,
    });
    response.status(isBlobConfigurationError ? 503 : 500).json({
      message: isBlobConfigurationError
        ? "Le stockage Vercel n'est pas configuré."
        : "La connexion est momentanément indisponible.",
    });
  }
};
