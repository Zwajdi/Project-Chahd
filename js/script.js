document.addEventListener("DOMContentLoaded", () => {
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
