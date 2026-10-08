document.addEventListener("DOMContentLoaded", () => {
  const STUDENTS_KEY = "iset-stage-student-accounts";
  const SESSION_KEY = "iset-stage-current-student";
  const currentPage = document.body.dataset.page;

  const getAccounts = () => {
    try {
      return JSON.parse(localStorage.getItem(STUDENTS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const saveAccounts = (accounts) => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(accounts));
  };

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  };

  const setMessage = (element, message, type = "error") => {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
  };

  const togglePasswordButtons = () => {
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        button.textContent = isPassword ? "Masquer" : "Afficher";
        button.setAttribute("aria-pressed", String(isPassword));
      });
    });
  };

  const protectDashboard = () => {
    if (currentPage === "dashboard" && !getSession()) {
      window.location.replace("login.html");
      return false;
    }
    return true;
  };

  const setupAuthForms = () => {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const identifier = loginForm.elements.identifier.value
          .trim()
          .toLowerCase();
        const password = loginForm.elements.password.value;
        const message = document.getElementById("login-message");
        if (!identifier) {
          setMessage(
            message,
            "Veuillez saisir votre matricule ou votre email.",
          );
          return;
        }
        if (!password) {
          setMessage(message, "Veuillez saisir votre mot de passe.");
          return;
        }
        const account = getAccounts().find(
          (student) =>
            (student.matricule || "").toLowerCase() === identifier ||
            (student.email || "").toLowerCase() === identifier,
        );
        if (!account || account.password !== password) {
          setMessage(message, "Identifiants incorrects.");
          return;
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(account));
        window.location.href = "dashboard.html";
      });
    }

    const registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());
        const message = document.getElementById("register-message");
        const requiredFields = [
          "nom",
          "prenom",
          "matricule",
          "email",
          "classe",
          "specialite",
          "password",
          "passwordConfirm",
        ];
        if (requiredFields.some((field) => !String(data[field] || "").trim())) {
          setMessage(message, "Veuillez remplir tous les champs obligatoires.");
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          setMessage(message, "Veuillez saisir une adresse email valide.");
          return;
        }
        if (data.password.length < 6) {
          setMessage(
            message,
            "Le mot de passe doit contenir au moins 6 caractères.",
          );
          return;
        }
        if (data.password !== data.passwordConfirm) {
          setMessage(
            message,
            "Les deux mots de passe doivent être identiques.",
          );
          return;
        }
        const accounts = getAccounts();
        if (
          accounts.some(
            (student) =>
              student.matricule.toLowerCase() === data.matricule.toLowerCase(),
          )
        ) {
          setMessage(message, "Un compte existe déjà avec ce matricule.");
          return;
        }
        if (
          accounts.some(
            (student) =>
              student.email.toLowerCase() === data.email.toLowerCase(),
          )
        ) {
          setMessage(message, "Un compte existe déjà avec cet email.");
          return;
        }
        try {
          const authorizedStudents = await fetch("data/students.json").then(
            (response) => {
              if (!response.ok) throw new Error("students.json indisponible");
              return response.json();
            },
          );
          const authorizedStudent = authorizedStudents.find(
            (student) =>
              student.matricule.toLowerCase() === data.matricule.toLowerCase(),
          );
          if (!authorizedStudent) {
            setMessage(
              message,
              "Ce matricule étudiant n'est pas reconnu. Veuillez vérifier vos informations ou contacter l'administration.",
            );
            return;
          }
          const account = {
            ...authorizedStudent,
            ...data,
            phone: data.phone || "",
            password: data.password,
          };
          delete account.passwordConfirm;
          const registrationResponse = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(account),
          });
          if (!registrationResponse.ok) {
            const result = await registrationResponse.json().catch(() => ({}));
            throw new Error(result.message || "Inscription indisponible");
          }
          accounts.push(account);
          saveAccounts(accounts);
          setMessage(
            message,
            "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
            "success",
          );
          registerForm.reset();
        } catch {
          setMessage(
            message,
            "La vérification des étudiants est momentanément indisponible.",
          );
        }
      });
    }

    const forgotForm = document.getElementById("forgot-form");
    if (forgotForm) {
      forgotForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const identifier = forgotForm.elements.identifier.value
          .trim()
          .toLowerCase();
        const message = document.getElementById("forgot-message");
        const account = getAccounts().find(
          (student) =>
            student.matricule.toLowerCase() === identifier ||
            student.email.toLowerCase() === identifier,
        );
        if (!account) {
          setMessage(message, "Aucun compte correspondant n'a été trouvé.");
          document.getElementById("reset-fields")?.classList.add("hidden");
          return;
        }
        document.getElementById("reset-fields")?.classList.remove("hidden");
        forgotForm.dataset.matricule = account.matricule;
        setMessage(
          message,
          "Compte trouvé. Vous pouvez réinitialiser votre mot de passe.",
          "success",
        );
      });
      document
        .getElementById("reset-password-button")
        ?.addEventListener("click", () => {
          const newPassword = document.getElementById("new-password").value;
          const confirmPassword = document.getElementById(
            "new-password-confirm",
          ).value;
          const message = document.getElementById("forgot-message");
          if (newPassword.length < 6) {
            setMessage(
              message,
              "Le mot de passe doit contenir au moins 6 caractères.",
            );
            return;
          }
          if (newPassword !== confirmPassword) {
            setMessage(
              message,
              "Les deux mots de passe doivent être identiques.",
            );
            return;
          }
          const accounts = getAccounts();
          const account = accounts.find(
            (student) => student.matricule === forgotForm.dataset.matricule,
          );
          account.password = newPassword;
          saveAccounts(accounts);
          setMessage(
            message,
            "Mot de passe mis à jour. Vous pouvez vous connecter.",
            "success",
          );
          document.getElementById("reset-fields")?.classList.add("hidden");
        });
    }
  };

  if (!protectDashboard()) return;
  togglePasswordButtons();
  setupAuthForms();

  const session = getSession();
  if (currentPage === "dashboard" && session) {
    document.querySelectorAll("[data-student-name]").forEach((node) => {
      node.textContent = `${session.prenom} ${session.nom}`;
    });
    document.querySelectorAll("[data-student-field]").forEach((node) => {
      node.textContent = session[node.dataset.studentField] || "Non renseigné";
    });
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "login.html";
      });
    });
  }

  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const faqItems = document.querySelectorAll(".faq-item");
  const progressBar = document.querySelector(".progress-bar-fill");
  const revealItems = document.querySelectorAll(".reveal");
  const scrollTopButton = document.querySelector(".scroll-top");
  const yearNode = document.getElementById("year");

  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    if (!question || !answer) return;

    const showAnswer = () => {
      faqItems.forEach((faqItem) => {
        if (faqItem !== item) {
          faqItem.classList.remove("active");
          faqItem
            .querySelector(".faq-question")
            ?.setAttribute("aria-expanded", "false");
          const otherAnswer = faqItem.querySelector(".faq-answer");
          if (otherAnswer) {
            otherAnswer.style.maxHeight = null;
          }
        }
      });

      const isActive = item.classList.contains("active");
      item.classList.toggle("active", !isActive);
      question.setAttribute("aria-expanded", String(!isActive));
      answer.style.maxHeight = isActive ? null : `${answer.scrollHeight}px`;
    };

    question.addEventListener("click", showAnswer);

    if (item.classList.contains("active")) {
      answer.style.maxHeight = `${answer.scrollHeight}px`;
    }
  });

  if (progressBar) {
    const value = progressBar.dataset.progress || "65";
    requestAnimationFrame(() => {
      progressBar.style.width = `${value}%`;
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  revealItems.forEach((item) => observer.observe(item));

  const toggleScrollButton = () => {
    if (!scrollTopButton) return;

    if (window.scrollY > 300) {
      scrollTopButton.classList.add("visible");
    } else {
      scrollTopButton.classList.remove("visible");
    }
  };

  toggleScrollButton();
  window.addEventListener("scroll", toggleScrollButton);

  if (scrollTopButton) {
    scrollTopButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (header && window.scrollY > 12) {
    header.classList.add("scrolled");
  }
});
