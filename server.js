const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDirectory = __dirname;
const studentsPath = path.join(rootDirectory, "data", "students.json");
const port = 8000;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const writeJson = (filePath, data) =>
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": contentTypes[".json"] });
  response.end(JSON.stringify(payload));
};

const collectBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) reject(new Error("Requête trop volumineuse"));
    });
    request.on("end", () => resolve(JSON.parse(body || "{}")));
    request.on("error", reject);
  });

const registerStudent = async (request, response) => {
  try {
    const data = await collectBody(request);
    const students = readJson(studentsPath);
    if (
      students.some(
        (student) =>
          String(student.cin || "").trim().toLowerCase() ===
          String(data.cin || "").trim().toLowerCase(),
      )
    ) {
      sendJson(response, 409, {
        message: "Un compte existe déjà avec ce CIN.",
      });
      return;
    }
    if (
      students.some(
        (student) =>
          String(student.email || "").toLowerCase() ===
          String(data.email).trim().toLowerCase(),
      )
    ) {
      sendJson(response, 409, {
        message: "Un compte existe déjà avec cet email.",
      });
      return;
    }

    const profile = {
      cin: String(data.cin).trim(),
      nom: String(data.nom).trim(),
      prenom: String(data.prenom).trim(),
      email: String(data.email).trim(),
      phone: String(data.phone || "").trim(),
      classe: String(data.classe).trim(),
      specialite: String(data.specialite).trim(),
    };
    students.push({ ...profile, password: data.password });
    writeJson(studentsPath, students);
    sendJson(response, 201, {
      message: "Compte enregistré dans les fichiers JSON.",
    });
  } catch (error) {
    sendJson(response, 400, { message: error.message });
  }
};

const serveStaticFile = (request, response) => {
  const requestedPath = decodeURIComponent(request.url.split("?")[0]);
  const relativePath = requestedPath === "/" ? "/index.html" : requestedPath;
  const filePath = path.resolve(rootDirectory, `.${relativePath}`);
  if (!filePath.startsWith(rootDirectory)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type":
        contentTypes[path.extname(filePath)] || "text/plain; charset=utf-8",
    });
    response.end(content);
  });
};

http
  .createServer((request, response) => {
    if (request.method === "POST" && request.url === "/api/register") {
      registerStudent(request, response);
      return;
    }
    if (request.method === "GET") {
      serveStaticFile(request, response);
      return;
    }
    response.writeHead(405);
    response.end("Method not allowed");
  })
  .listen(port, () => {
    console.log(`ISET Stage disponible sur http://localhost:${port}`);
  });
