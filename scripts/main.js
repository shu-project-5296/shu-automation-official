(() => {
  const config = window.SHU_CONFIG || { links: {} };
  document.querySelectorAll("[data-link]").forEach((link) => {
    const url = config.links[link.dataset.link];
    if (url) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });

  const button = document.querySelector("[data-menu-button]");
  const menu = document.querySelector("[data-menu]");
  if (button && menu) {
    button.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
      button.querySelector(".sr-only").textContent = open ? "メニューを閉じる" : "メニューを開く";
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    }));
  }
})();
