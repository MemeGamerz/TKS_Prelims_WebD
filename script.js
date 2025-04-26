document.addEventListener('DOMContentLoaded', () => {
    AOS.init({
        duration: 800,
        once: true,
        offset: 50,
        delay: 100,
        easing: 'ease-out-cubic',
        disable: 'mobile', // Optionally disable AOS on mobile if it causes issues
    });

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const nav = document.getElementById('navbar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navLinksMobile = document.getElementById('nav-links-mobile');
    const menuIconOpen = document.getElementById('menu-icon-open');
    const menuIconClose = document.getElementById('menu-icon-close');
    const scrollToTopButton = document.getElementById('scroll-to-top');
    const contactForm = document.getElementById('contact-form');
    const formFeedback = document.getElementById('form-feedback');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalDynamicContent = document.getElementById('modal-dynamic-content');
    const modalTitleElement = document.getElementById('modal-title-content');
    const modalBodyContent = document.getElementById('modal-body-content');
    const applicationFeedback = document.getElementById('application-feedback');

    const allNavLinks = document.querySelectorAll('#nav-links-desktop .nav-link, #nav-links-mobile .nav-link');
    const sections = document.querySelectorAll('section[id]');

    const accessibilityWidget = document.getElementById('accessibility-widget');
    const accessibilityToggleBtn = document.getElementById('accessibility-toggle');
    const accessibilityPanel = document.getElementById('accessibility-panel');
    const increaseFontBtn = document.getElementById('increase-font');
    const decreaseFontBtn = document.getElementById('decrease-font');
    const toggleContrastBtn = document.getElementById('toggle-contrast');
    const toggleGrayscaleBtn = document.getElementById('toggle-grayscale');
    const resetAccessibilityBtn = document.getElementById('reset-accessibility');

    const scrollThreshold = 50;
    const MODAL_TRANSITION_DURATION = 350;
    const DEFAULT_FONT_SIZE = 16;
    const FONT_SIZE_STEP = 1;
    const MAX_FONT_SIZE = 24;
    const MIN_FONT_SIZE = 12;
    const ACTIVE_LINK_BUFFER = 70;

    let modalTriggerElement = null;
    let currentActiveSectionId = null;
    let feedbackTimeout = null;

    function handleNavbarScroll() {
        if (!nav || !htmlEl) return;

        const isScrolled = window.scrollY > scrollThreshold;
        nav.classList.toggle('navbar-scrolled', isScrolled);
        htmlEl.classList.toggle('navbar-scrolled', isScrolled);

        const isMobileMenuOpen = navLinksMobile && !navLinksMobile.classList.contains('hidden');
        nav.classList.toggle('mobile-menu-open', isMobileMenuOpen);

        if (!htmlEl.classList.contains('high-contrast')) {
            nav.style.backgroundColor = '';
            nav.style.backdropFilter = '';
            nav.style.webkitBackdropFilter = '';
        } else {
            nav.style.backgroundColor = '';
            nav.style.backdropFilter = '';
            nav.style.webkitBackdropFilter = '';
             if(isMobileMenuOpen || isScrolled) {
                 nav.style.backgroundColor = getComputedStyle(htmlEl).getPropertyValue('--bg-color-secondary').trim();
             }
        }
    }

    function handleScrollTopVisibility() {
        if (!scrollToTopButton) return;
        scrollToTopButton.classList.toggle('visible', window.scrollY > 300);
    }

    function handleScroll() {
        handleNavbarScroll();
        handleScrollTopVisibility();
        updateActiveNavLink();
    }

    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetIdRaw = this.getAttribute('href');

                if (targetIdRaw && targetIdRaw.length > 1 && targetIdRaw.startsWith('#')) {
                    const targetId = targetIdRaw;
                    try {
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            e.preventDefault();

                            let offset = 0;
                            const navHeight = nav.offsetHeight;
                            const navMarginTop = nav.classList.contains('navbar-scrolled') ? parseFloat(getComputedStyle(htmlEl).getPropertyValue('--navbar-margin-top-scrolled')) : 0;
                            const basePadding = 16;
                            offset = navHeight + navMarginTop + basePadding;

                            const elementPosition = targetElement.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - offset;

                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });

                            if (navLinksMobile && !navLinksMobile.classList.contains('hidden') && this.closest('#nav-links-mobile')) {
                                toggleMobileMenu(false);
                            }
                            updateActiveNavLink(targetId.substring(1));

                        }
                    } catch (error) {
                        console.error("Smooth scroll target error:", error);
                        e.preventDefault();
                    }
                } else if (targetIdRaw === '#') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    if (navLinksMobile && !navLinksMobile.classList.contains('hidden') && this.closest('#nav-links-mobile')) {
                        toggleMobileMenu(false);
                    }
                    updateActiveNavLink('home');
                }
            });
        });
    }

    function toggleMobileMenu(forceOpen = null) {
        if (!mobileMenuButton || !navLinksMobile || !menuIconOpen || !menuIconClose || !nav) return;

        const isCurrentlyExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
        const openMenu = forceOpen === true || (forceOpen === null && !isCurrentlyExpanded);

        mobileMenuButton.setAttribute('aria-expanded', String(openMenu));
        menuIconOpen.classList.toggle('hidden', openMenu);
        menuIconClose.classList.toggle('hidden', !openMenu);
        nav.classList.toggle('mobile-menu-open', openMenu);

        if (openMenu) {
            navLinksMobile.classList.remove('hidden');
            // No need to refresh AOS if disabled on mobile
            // setTimeout(() => AOS.refreshHard(), 50);
        } else {
            // Add a delay before hiding to allow potential transitions
             setTimeout(() => {
                 // Check again if it should be hidden, in case state changed rapidly
                 if (mobileMenuButton.getAttribute('aria-expanded') === 'false') {
                     navLinksMobile.classList.add('hidden');
                 }
             }, 300); // Match AOS duration or slightly longer
        }
        setTimeout(handleNavbarScroll, 0);
    }


    function setupScrollToTop() {
        if (!scrollToTopButton) return;
        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updateActiveNavLink('home');
        });
    }

    function openModal(targetContentElement, triggerElement) {
        if (!modalOverlay || !modalBodyContent || !modalTitleElement || !targetContentElement) return;

        modalTriggerElement = triggerElement;

        modalBodyContent.innerHTML = '';
        clearFeedback(applicationFeedback);

        const contentClone = targetContentElement.cloneNode(true);

        let title = "Information";
        const titleInContent = contentClone.querySelector('h3.dynamic-modal-title');
        if (titleInContent) {
            title = titleInContent.textContent;
            titleInContent.remove();
        } else if (targetContentElement.id === 'modal-content-application') {
             title = "Application Form - FA 2050 Intake";
        }
        modalTitleElement.textContent = title;
        modalTitleElement.setAttribute('id', 'modal-title-content'); // Ensure ID is set for aria-labelledby
        modalDynamicContent.setAttribute('aria-labelledby', 'modal-title-content');

        while (contentClone.firstChild) {
            modalBodyContent.appendChild(contentClone.firstChild);
        }

         if (targetContentElement.id === 'modal-content-application') {
            const newAppForm = modalBodyContent.querySelector('#application-form');
            if (newAppForm) {
                setupApplicationFormValidation(newAppForm);
            }
         }

        modalOverlay.classList.remove('hidden');
        bodyEl.classList.add('modal-open');
        void modalOverlay.offsetWidth; // Trigger reflow to ensure transition plays
        modalOverlay.classList.add('modal-active');

        setTimeout(() => {
             const firstFocusable = modalDynamicContent.querySelector(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            (firstFocusable || modalCloseButton || modalDynamicContent)?.focus();
        }, 100); // Short delay for focus management
    }

    function closeModal() {
        if (!modalOverlay || !modalOverlay.classList.contains('modal-active')) return; // Prevent closing if not active

        modalOverlay.classList.remove('modal-active');
        bodyEl.classList.remove('modal-open');

        setTimeout(() => {
            modalOverlay.classList.add('hidden');
            modalBodyContent.innerHTML = ''; // Clear content after transition
            clearFeedback(applicationFeedback);

            if (modalTriggerElement && typeof modalTriggerElement.focus === 'function') {
                 try {
                    modalTriggerElement.focus();
                 } catch (e) {
                     console.warn("Could not focus modal trigger element:", e);
                 }
                 modalTriggerElement = null;
            }
        }, MODAL_TRANSITION_DURATION);
    }

    bodyEl.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-modal-target]');
        if (trigger) {
            e.preventDefault();
            const targetId = trigger.getAttribute('data-modal-target');
            const targetContentElement = document.querySelector(targetId);
            if (targetContentElement) {
                openModal(targetContentElement, trigger);
            } else {
                console.error(`Modal target content not found for selector: ${targetId}`);
            }
        }
    });

    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal(); // Close only if clicking the overlay itself
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('modal-active')) {
            closeModal();
        }
    });

    function showFeedback(element, message, isError = false, duration = 5000) {
        if (!element) return;
        clearTimeout(feedbackTimeout);

        element.textContent = message;
        element.style.color = isError ? '#f87171' : 'var(--primary-accent)'; // Use direct color for error
        element.classList.add('visible');

        if (duration > 0) {
            feedbackTimeout = setTimeout(() => clearFeedback(element), duration);
        }
    }

    function clearFeedback(element) {
        if (!element) return;
        clearTimeout(feedbackTimeout);
        element.classList.remove('visible');
        // Delay clearing text content until after fade out
        setTimeout(() => {
             if (!element.classList.contains('visible')) { // Check if still hidden
                 element.textContent = '';
             }
        }, 300);
    }

    function setupContactFormValidation() {
        if (!contactForm || !formFeedback) return;

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFeedback(formFeedback);
            // Reset styles on previously invalid fields
            contactForm.querySelectorAll('.form-input[style*="border-color"]').forEach(field => field.style.borderColor = '');

            if (contactForm.checkValidity()) {
                showFeedback(formFeedback, 'Message sent successfully. (Demo)');
                contactForm.reset();
            } else {
                showFeedback(formFeedback, 'Please fill out all required fields correctly.', true, 6000);
                 const firstInvalid = contactForm.querySelector(':invalid');
                 if (firstInvalid) {
                     firstInvalid.focus();
                     firstInvalid.style.borderColor = '#f87171'; // Apply error style directly
                 }
                 // Optionally highlight all invalid fields
                 // contactForm.querySelectorAll(':invalid').forEach(field => field.style.borderColor = '#f87171');
            }
        });
    }

    function setupApplicationFormValidation(formElement) {
         if (!formElement || !applicationFeedback) return;
         // Ensure previous listeners are removed if modal content is reused (though cloneNode should prevent this)
         formElement.removeEventListener('submit', handleApplicationSubmit);
         formElement.addEventListener('submit', handleApplicationSubmit);
    }

    function handleApplicationSubmit(e) {
        e.preventDefault();
        const form = e.target;
        clearFeedback(applicationFeedback);
        form.querySelectorAll('.form-input[style*="border-color"]').forEach(field => field.style.borderColor = '');

        if (!form.checkValidity()) {
             const firstInvalidField = form.querySelector(':invalid');
            showFeedback(applicationFeedback, 'Please complete all required (*) fields.', true, 6000);
            if (firstInvalidField) {
                firstInvalidField.focus();
                 // Scroll into view might be jarring in a modal, consider just focusing
                 // firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 firstInvalidField.style.borderColor = '#f87171';
             }
             // Optionally highlight all invalid fields
             // form.querySelectorAll(':invalid').forEach(field => field.style.borderColor = '#f87171');
            return;
        }

        showFeedback(applicationFeedback, 'Application Submitted Successfully! (Demo Only)', false, 0); // Keep success message until close
        setTimeout(() => closeModal(), 2500);
    }

    function updateActiveNavLink(targetId = null) {
        if (!sections.length || !allNavLinks.length) return;

        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        let newActiveId = targetId;

        if (!newActiveId) {
            let bestMatch = { id: null, position: -Infinity };

            const navHeight = nav.offsetHeight;
            // Use CSS variable directly
            const navMarginTop = nav.classList.contains('navbar-scrolled') ? parseFloat(getComputedStyle(htmlEl).getPropertyValue('--navbar-margin-top-scrolled')) : 0;
            const activationPoint = navHeight + navMarginTop + ACTIVE_LINK_BUFFER;

            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const sectionTopAbsolute = rect.top + scrollY;
                const sectionBottomAbsolute = sectionTopAbsolute + rect.height;

                // Check if the top of the section is within the activation zone
                if (sectionTopAbsolute <= scrollY + activationPoint && sectionBottomAbsolute > scrollY + activationPoint) {
                    // If multiple sections are in view, prioritize the one closest to the top
                    if (sectionTopAbsolute > bestMatch.position) {
                        bestMatch = { id: section.id, position: sectionTopAbsolute };
                    }
                }
            });

            // Handle edge case: Scrolled near top
            if (scrollY < sections[0].offsetTop / 2) {
                bestMatch.id = 'home';
            }

            // Handle edge case: Scrolled near bottom
            if (scrollY + viewportHeight >= bodyEl.scrollHeight - 20) {
                 bestMatch.id = sections[sections.length - 1].id;
            }

            newActiveId = bestMatch.id;
        }

        // Update classes only if the active section changed
        if (newActiveId && newActiveId !== currentActiveSectionId) {
            currentActiveSectionId = newActiveId;

            allNavLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentActiveSectionId}`) {
                    link.classList.add('active');
                }
            });
        } else if (!newActiveId && currentActiveSectionId) {
            // No section is active (e.g., scrolled way past the last section)
            currentActiveSectionId = null;
            allNavLinks.forEach(link => link.classList.remove('active'));
        }
    }

    function toggleAccessibilityPanel(forceClose = false) {
        if (!accessibilityWidget || !accessibilityToggleBtn || !accessibilityPanel) return;

        const isExpanded = accessibilityToggleBtn.getAttribute('aria-expanded') === 'true';
        const newState = forceClose ? false : !isExpanded;

        accessibilityToggleBtn.setAttribute('aria-expanded', String(newState));
        accessibilityPanel.classList.toggle('visible', newState);

        if (newState) {
            setTimeout(() => accessibilityPanel.querySelector('button:not([disabled])')?.focus(), 100);
        } else {
            // Return focus only if the focus was inside the panel
            if (document.activeElement && accessibilityPanel.contains(document.activeElement)) {
                 try {
                    accessibilityToggleBtn.focus();
                 } catch (e) {
                     console.warn("Could not focus accessibility toggle button:", e);
                 }
            }
        }
    }

    function applyFontSize(size) {
        const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
        htmlEl.style.fontSize = `${clampedSize}px`;
        localStorage.setItem('accessibilityFontSize', clampedSize);
        // Recalculate layout dependent things after font size change
        setTimeout(() => {
             handleNavbarScroll();
             updateActiveNavLink();
             // No need to refresh AOS if disabled on mobile
             // AOS.refresh();
        }, 150);
    }

    function increaseFontSize() {
        applyFontSize(parseFloat(getComputedStyle(htmlEl).fontSize) + FONT_SIZE_STEP);
    }

    function decreaseFontSize() {
        applyFontSize(parseFloat(getComputedStyle(htmlEl).fontSize) - FONT_SIZE_STEP);
    }

    function toggleHighContrast() {
        const isContrast = htmlEl.classList.toggle('high-contrast');
        localStorage.setItem('accessibilityHighContrast', isContrast);
        // Recalculate navbar style after contrast change
        setTimeout(() => {
             handleNavbarScroll();
             updateActiveNavLink();
        }, 50);
    }

    function toggleGrayscale() {
        const isGrayscale = htmlEl.classList.toggle('grayscale');
        localStorage.setItem('accessibilityGrayscale', isGrayscale);
    }

    function resetAccessibility() {
        applyFontSize(DEFAULT_FONT_SIZE);
        htmlEl.classList.remove('high-contrast');
        localStorage.removeItem('accessibilityHighContrast');
        htmlEl.classList.remove('grayscale');
        localStorage.removeItem('accessibilityGrayscale');
        setTimeout(() => {
             handleNavbarScroll();
             updateActiveNavLink();
        }, 50);
        toggleAccessibilityPanel(true); // Close the panel after reset
    }

    function loadAccessibilityPreferences() {
        const savedFontSize = localStorage.getItem('accessibilityFontSize');
        if (savedFontSize) {
            const initialSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, parseInt(savedFontSize)));
            if (initialSize !== DEFAULT_FONT_SIZE) {
                // Apply initial font size without transition jarring
                htmlEl.style.transition = 'none';
                htmlEl.style.fontSize = `${initialSize}px`;
                // Force reflow
                void htmlEl.offsetWidth;
                htmlEl.style.transition = ''; // Re-enable transitions
            }
        }

        if (localStorage.getItem('accessibilityHighContrast') === 'true') {
            htmlEl.classList.add('high-contrast');
        }
        if (localStorage.getItem('accessibilityGrayscale') === 'true') {
            htmlEl.classList.add('grayscale');
        }

        // Ensure panel starts closed
        if(accessibilityPanel) accessibilityPanel.classList.remove('visible');
        if(accessibilityToggleBtn) accessibilityToggleBtn.setAttribute('aria-expanded', 'false');
    }

    // --- Initialize ---
    loadAccessibilityPreferences();
    handleScroll(); // Initial check for navbar state and active link
    setupSmoothScrolling();
    setupScrollToTop();
    setupContactFormValidation();

    // --- Event Listeners ---
    if (accessibilityToggleBtn) accessibilityToggleBtn.addEventListener('click', () => toggleAccessibilityPanel());
    if (increaseFontBtn) increaseFontBtn.addEventListener('click', increaseFontSize);
    if (decreaseFontBtn) decreaseFontBtn.addEventListener('click', decreaseFontSize);
    if (toggleContrastBtn) toggleContrastBtn.addEventListener('click', toggleHighContrast);
    if (toggleGrayscaleBtn) toggleGrayscaleBtn.addEventListener('click', toggleGrayscale);
    if (resetAccessibilityBtn) resetAccessibilityBtn.addEventListener('click', resetAccessibility);

    // Click outside accessibility panel closes it
    document.addEventListener('click', (e) => {
        if (accessibilityPanel?.classList.contains('visible') &&
            !accessibilityPanel.contains(e.target) &&
            !accessibilityToggleBtn?.contains(e.target))
        {
            toggleAccessibilityPanel(true);
        }
    });

    // Escape key closes accessibility panel
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && accessibilityPanel?.classList.contains('visible')) {
            toggleAccessibilityPanel(true);
        }
    });

    // Mobile menu toggle button
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => toggleMobileMenu());
    }

    // Scroll and resize listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial active link update after potential layout shifts
    setTimeout(() => updateActiveNavLink(), 150);

});
