// src/utils/scrollUtils.ts

/**
 * Scroll to a specific element with smooth animation
 * @param element - The element to scroll to
 * @param offset - Optional offset from the top (default: 100px)
 */
export const scrollToElement = (
  element: HTMLElement | null,
  offset: number = 100,
): void => {
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
};

/**
 * Scroll to a specific section by ID or class selector
 * @param selector - CSS selector for the section
 * @param offset - Optional offset from the top (default: 100px)
 */
export const scrollToSection = (
  selector: string,
  offset: number = 100,
): void => {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    scrollToElement(element, offset);
  }
};

/**
 * Scroll to the top of the registration section
 */
export const scrollToRegistration = (): void => {
  // Try multiple possible selectors for the registration section
  const selectors = [
    '.hp-section--reg',
    '.tournament-registration-form',
    '.tryout-registration-form',
    '.training-registration-form',
    '.reg-hub-single',
    '.reg-hub-grid',
    '.reg-hub-multi',
    '.registration-hub',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      scrollToElement(element, 80);
      return;
    }
  }

  // Fallback: scroll to the main content
  const mainContent = document.querySelector(
    '.hp-main__content',
  ) as HTMLElement;
  if (mainContent) {
    scrollToElement(mainContent, 80);
  }
};
