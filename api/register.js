const fs = require("fs");
const path = require("path");
const { get, put } = require("@vercel/blob");

const getBlobToken = () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token || !/^vercel_blob_rw_[^_]+(?:_.+)?$/.test(token)) {
    const error = new Error("BLOB_READ_WRITE_TOKEN is not configured.");
    error.code = "BLOB_NOT_CONFIGURED";
    throw error;
  }
  return token;
};

const readLocalStudents = () => {
  const filePath = path.join(process.cwd(), "data", "students.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const readBlobJson = async (fileName, fallback) => {
  const result = await get(fileName, {
    access: "private",
    token: getBlobToken(),
  });
  if (!result) return fallback;
  return JSON.parse(await new Response(result.stream).text());
};

const writeBlobJson = async (fileName, data) => {
  await put(fileName, JSON.stringify(data, null, 2), {
    token: getBlobToken(),
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ message: "Méthode non autorisée." });
    return;
  }

  try {
    const data = request.body || {};
    const students = await readBlobJson("students.json", readLocalStudents());
    const accounts = await readBlobJson("accounts.json", []);
    const cin = String(data.cin || "")
      .trim()
      .toLowerCase();
    const email = String(data.email || "")
      .trim()
      .toLowerCase();
    const studentIndex = students.findIndex(
      (student) => String(student.cin || "").trim().toLowerCase() === cin,
    );

    if (studentIndex === -1) {
      response.status(400).json({
        message: "Ce CIN n'est pas reconnu.",
      });
      return;
    }
    if (
      accounts.some((account) => String(account.cin || "").trim().toLowerCase() === cin)
    ) {
      response.status(409).json({
        message: "Un compte existe déjà avec ce CIN.",
      });
      return;
    }
    if (accounts.some((account) => account.email.toLowerCase() === email)) {
      response.status(409).json({
        message: "Un compte existe déjà avec cet email.",
      });
      return;
    }

    const profile = {
      cin: students[studentIndex].cin,
      nom: String(data.nom || "").trim(),
      prenom: String(data.prenom || "").trim(),
      email: String(data.email || "").trim(),
      phone: String(data.phone || "").trim(),
      classe: String(data.classe || "").trim(),
      specialite: String(data.specialite || "").trim(),
    };
    students[studentIndex] = profile;
    accounts.push({
      cin: profile.cin,
      email: profile.email,
      password: String(data.password || ""),
    });

    await writeBlobJson("students.json", students);
    await writeBlobJson("accounts.json", accounts);
    response.status(201).json({
      message: "Compte enregistré dans Vercel Blob.",
    });
  } catch (error) {
    const isBlobConfigurationError =
      error.code === "BLOB_NOT_CONFIGURED" ||
      error.message?.includes("Invalid token") ||
      error.message?.includes("No blob credentials");
    console.error("Registration storage error", {
      code: error.code,
      message: error.message,
    });
    response.status(isBlobConfigurationError ? 503 : 500).json({
      message: isBlobConfigurationError
        ? "Le stockage Vercel n'est pas configuré. Ajoutez BLOB_READ_WRITE_TOKEN dans les variables Vercel, puis redéployez."
        : "Le stockage des comptes est momentanément indisponible.",
    });
  }
};
