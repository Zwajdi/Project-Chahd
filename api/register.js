const fs = require("fs");
const path = require("path");
const { list, put } = require("@vercel/blob");

const readLocalStudents = () => {
  const filePath = path.join(process.cwd(), "data", "students.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const readBlobJson = async (fileName, fallback) => {
  const result = await list({ prefix: fileName, limit: 1 });
  if (!result.blobs.length) return fallback;
  const response = await fetch(result.blobs[0].url);
  if (!response.ok) throw new Error(`${fileName} indisponible`);
  return response.json();
};

const writeBlobJson = async (fileName, data) => {
  await put(fileName, JSON.stringify(data, null, 2), {
    access: "public",
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
    const matricule = String(data.matricule || "")
      .trim()
      .toLowerCase();
    const email = String(data.email || "")
      .trim()
      .toLowerCase();
    const studentIndex = students.findIndex(
      (student) => student.matricule.toLowerCase() === matricule,
    );

    if (studentIndex === -1) {
      response.status(400).json({
        message: "Ce matricule étudiant n'est pas reconnu.",
      });
      return;
    }
    if (
      accounts.some((account) => account.matricule.toLowerCase() === matricule)
    ) {
      response.status(409).json({
        message: "Un compte existe déjà avec ce matricule.",
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
      matricule: students[studentIndex].matricule,
      nom: String(data.nom || "").trim(),
      prenom: String(data.prenom || "").trim(),
      email: String(data.email || "").trim(),
      phone: String(data.phone || "").trim(),
      classe: String(data.classe || "").trim(),
      specialite: String(data.specialite || "").trim(),
    };
    students[studentIndex] = profile;
    accounts.push({
      matricule: profile.matricule,
      email: profile.email,
      password: String(data.password || ""),
    });

    await writeBlobJson("students.json", students);
    await writeBlobJson("accounts.json", accounts);
    response.status(201).json({
      message: "Compte enregistré dans Vercel Blob.",
    });
  } catch (error) {
    response.status(500).json({
      message:
        "Le stockage Vercel n'est pas configuré. Ajoutez BLOB_READ_WRITE_TOKEN dans les variables Vercel.",
      detail: error.message,
    });
  }
};
