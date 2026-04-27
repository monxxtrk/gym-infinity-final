document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navBar = document.querySelector('.nav-bar');

  if (navToggle && navBar) {
    const closeNav = () => {
      navBar.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navBar.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
      if (!navBar.classList.contains('nav-open')) {
        return;
      }

      if (navBar.contains(event.target) || navToggle.contains(event.target)) {
        return;
      }

      closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeNav();
      }
    });

    navBar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeNav);
    });
  }

  const heroCarousel = document.querySelector('[data-carousel]');
  if (heroCarousel) {
    const heroImage = heroCarousel.querySelector('img');
    const dots = Array.from(heroCarousel.querySelectorAll('.carousel-dot'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = dots.findIndex((dot) => dot.classList.contains('active'));
    let intervalId = null;

    const showSlide = (index) => {
      const nextIndex = (index + dots.length) % dots.length;
      const activeDot = dots[nextIndex];
      if (!activeDot || !heroImage) {
        return;
      }

      activeIndex = nextIndex;
      heroImage.src = activeDot.dataset.imageSrc;
      heroImage.alt = activeDot.dataset.imageAlt;

      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    };

    const startRotation = () => {
      if (prefersReducedMotion || dots.length <= 1) {
        return;
      }

      intervalId = window.setInterval(() => {
        showSlide(activeIndex + 1);
      }, 6000);
    };

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        showSlide(index);
        if (intervalId) {
          window.clearInterval(intervalId);
        }
        startRotation();
      });
    });

    if (activeIndex < 0) {
      activeIndex = 0;
    }

    showSlide(activeIndex);
    startRotation();
  }

  const setupTabs = (buttonSelector, panelSelector, dataKey) => {
    const buttons = Array.from(document.querySelectorAll(buttonSelector));
    const panels = Array.from(document.querySelectorAll(panelSelector));

    if (!buttons.length || !panels.length) {
      return;
    }

    const showPanel = (panelId) => {
      buttons.forEach((button) => {
        const isActive = button.dataset[dataKey] === panelId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });

      panels.forEach((panel) => {
        panel.hidden = panel.id !== panelId;
      });
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        showPanel(button.dataset[dataKey]);
      });
    });

    const initialButton = buttons.find((button) => button.classList.contains('active')) || buttons[0];
    showPanel(initialButton.dataset[dataKey]);
  };

  setupTabs('[data-plan-target]', '.plan-panel', 'planTarget');
  setupTabs('[data-diet-target]', '.diet-panel', 'dietTarget');
  setupTabs('[data-routine-target]', '.routine-panel', 'routineTarget');

  document.querySelectorAll('[data-payment-form]').forEach((form) => {
    const methodInputs = Array.from(form.querySelectorAll('input[name="paymentMethod"]'));
    const sections = Array.from(form.querySelectorAll('[data-payment-section]'));

    const syncPaymentFields = () => {
      const activeMethod = methodInputs.find((input) => input.checked)?.value || 'card';

      sections.forEach((section) => {
        const isActive = section.dataset.paymentSection === activeMethod;
        section.hidden = !isActive;

        section.querySelectorAll('input, textarea, select').forEach((field) => {
          const needsValue = isActive && ['cardHolder', 'cardNumber', 'cardExpiry', 'cardCvv'].includes(field.name);
          field.required = needsValue;
          field.disabled = !isActive;
        });
      });
    };

    methodInputs.forEach((input) => {
      input.addEventListener('change', syncPaymentFields);
    });

    syncPaymentFields();
  });
});
