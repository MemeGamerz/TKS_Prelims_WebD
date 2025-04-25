document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS library
    AOS.init({
        duration: 800,
        once: true,
        offset: 50,
        delay: 100,
        easing: 'ease-out-cubic',
    });

    // --- DOM Element References ---
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

    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalDynamicContent = document.getElementById('modal-dynamic-content'); // The main modal container
    const modalTitleElement = document.getElementById('modal-title'); // The h3 title element
    const modalBodyContent = document.getElementById('modal-body-content'); // Where content is injected
    const applicationFeedback = document.getElementById('application-feedback'); // Feedback specifically for app form

    const allNavLinks = document.querySelectorAll('#nav-links-desktop .nav-link, #nav-links-mobile .nav-link');
    const sections = document.querySelectorAll('section[id]');

    // Accessibility Elements
    const accessibilityWidget = document.getElementById('accessibility-widget');
    const accessibilityToggleBtn = document.getElementById('accessibility-toggle');
    const accessibilityPanel = document.getElementById('accessibility-panel');
    const increaseFontBtn = document.getElementById('increase-font');
    const decreaseFontBtn = document.getElementById('decrease-font');
    const toggleContrastBtn = document.getElementById('toggle-contrast');
    const toggleGrayscaleBtn = document.getElementById('toggle-grayscale');
    const resetAccessibilityBtn = document.getElementById('reset-accessibility');

    // --- State Variables ---
    const scrollThreshold = 50;
    const MODAL_TRANSITION_DURATION = 350; // Match CSS transition
    const DEFAULT_FONT_SIZE = 16;
    const FONT_SIZE_STEP = 1;
    const MAX_FONT_SIZE = 24;
    const MIN_FONT_SIZE = 12;
    const ACTIVE_LINK_BUFFER = 70; // Pixels below the navbar to trigger activation

    let modalTriggerElement = null; // Keep track of which button opened the modal
    let currentActiveSectionId = null;
    let feedbackTimeout = null; // Timer for clearing feedback messages

    // --- Core Functions ---

    function handleNavbarScroll() {
        if (!nav || !htmlEl) return;

        const isScrolled = window.scrollY > scrollThreshold;
        nav.classList.toggle('navbar-scrolled', isScrolled);
        htmlEl.classList.toggle('navbar-scrolled', isScrolled); // Also add to html for global styling if needed

        const isMobileMenuOpen = navLinksMobile && !navLinksMobile.classList.contains('hidden');
        nav.classList.toggle('mobile-menu-open', isMobileMenuOpen);

        // Handle background styles - could be simplified using only CSS classes + variables potentially
        if (!htmlEl.classList.contains('high-contrast')) {
            if (isMobileMenuOpen) {
                nav.style.backgroundColor = getComputedStyle(htmlEl).getPropertyValue('--bg-color-secondary').trim();
                nav.style.backdropFilter = 'none';
                nav.style.webkitBackdropFilter = 'none';
            } else if (isScrolled) {
                // Semi-transparent dark background with blur when scrolled
                nav.style.backgroundColor = 'rgba(31, 41, 55, 0.9)'; // Example: dark slate gray
                nav.style.backdropFilter = 'blur(10px)';
                nav.style.webkitBackdropFilter = 'blur(10px)'; // For Safari
            } else {
                // Transparent when at top
                nav.style.backgroundColor = 'transparent';
                nav.style.backdropFilter = 'none';
                nav.style.webkitBackdropFilter = 'none';
            }
        } else {
             // Reset inline styles if high contrast is active (rely on CSS class styles)
            nav.style.backgroundColor = '';
            nav.style.backdropFilter = '';
            nav.style.webkitBackdropFilter = '';
            // Apply secondary background in high contrast if scrolled or menu open
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
                    const targetId = targetIdRaw; // e.g., "#about"
                    try {
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            e.preventDefault();

                            let offset = 0;
                            // Calculate offset based on navbar height and potential margin
                            const navHeight = nav.offsetHeight;
                            // Use CSS variable for margin if navbar position changes on scroll
                            const navMarginTop = nav.classList.contains('navbar-scrolled') ? parseFloat(getComputedStyle(htmlEl).getPropertyValue('--navbar-margin-top-scrolled')) : 0;
                            const basePadding = 16; // Add a little extra padding
                            offset = navHeight + navMarginTop + basePadding;

                            const elementPosition = targetElement.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - offset;

                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });

                            // Close mobile menu if a link inside it was clicked
                            if (navLinksMobile && !navLinksMobile.classList.contains('hidden') && this.closest('#nav-links-mobile')) {
                                toggleMobileMenu(false); // Pass false to force close
                            }
                            // Immediately update active link visually
                            updateActiveNavLink(targetId.substring(1)); // Pass ID without '#'

                        }
                    } catch (error) {
                        console.error("Smooth scroll target error:", error);
                        // Prevent default even if target isn't found to avoid jarring jump
                        e.preventDefault();
                    }
                } else if (targetIdRaw === '#') {
                    // Link is just "#", scroll to top
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                     // Close mobile menu if needed
                    if (navLinksMobile && !navLinksMobile.classList.contains('hidden') && this.closest('#nav-links-mobile')) {
                        toggleMobileMenu(false);
                    }
                    updateActiveNavLink('home'); // Assuming 'home' is the ID for the top section/body
                }
                // Let default behavior handle external links or non-hash links
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
        nav.classList.toggle('mobile-menu-open', openMenu); // Add class to nav for styling

        if (openMenu) {
            navLinksMobile.classList.remove('hidden');
            // Optional: Trigger layout/reflow if needed for transitions inside menu
             // navLinksMobile.offsetHeight;
             // Force AOS refresh for elements inside mobile menu if needed
             setTimeout(() => AOS.refreshHard(), 50);
        } else {
            // Optionally delay hiding for transition out effect defined in CSS
            setTimeout(() => navLinksMobile.classList.add('hidden'), 150); // Adjust timing to match CSS transition
        }
        // Update navbar style immediately after toggling state
        setTimeout(handleNavbarScroll, 0);
    }

    function setupScrollToTop() {
        if (!scrollToTopButton) return;
        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updateActiveNavLink('home'); // Set 'home' active when scrolling to top
        });
    }

    // --- Dynamic Modal Logic ---

    function openModal(targetContentElement, triggerElement) {
        if (!modalOverlay || !modalBodyContent || !modalTitleElement || !targetContentElement) return;

        modalTriggerElement = triggerElement; // Store the button that opened the modal

        // 1. Clear previous content & feedback
        modalBodyContent.innerHTML = '';
        clearFeedback(applicationFeedback); // Clear feedback from previous modal uses

        // 2. Clone and append new content
        const contentClone = targetContentElement.cloneNode(true); // True for deep clone

        // 3. Set Modal Title (Try finding a title within the cloned content)
        let title = "Information"; // Default title
        const titleInContent = contentClone.querySelector('h3.dynamic-modal-title');
        if (titleInContent) {
            title = titleInContent.textContent;
            titleInContent.remove(); // Remove title from content body if found
        } else if (targetContentElement.id === 'modal-content-application') {
             title = "Application Form - FA 2050 Intake"; // Specific title for application form
        }
        modalTitleElement.textContent = title;

        // 4. Append the rest of the content
        // Append child nodes one by one to handle script tags correctly if they existed (though unlikely here)
        while (contentClone.firstChild) {
            modalBodyContent.appendChild(contentClone.firstChild);
        }

        // 5. Handle Application Form Specific Setup
         if (targetContentElement.id === 'modal-content-application') {
            const newAppForm = modalBodyContent.querySelector('#application-form');
            if (newAppForm) {
                setupApplicationFormValidation(newAppForm); // Re-attach validation listener to the new form instance
            }
         }

        // 6. Show the modal
        modalOverlay.classList.remove('hidden');
        bodyEl.classList.add('modal-open'); // Prevent body scrolling
        void modalOverlay.offsetWidth; // Force reflow for transition
        modalOverlay.classList.add('modal-active');

        // 7. Focus management: Move focus inside the modal
        setTimeout(() => {
            // Find first focusable element: input, select, textarea, button, or element with tabindex >= 0
             const firstFocusable = modalDynamicContent.querySelector(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            // Prefer focusing the close button first if no form elements, otherwise the first element, fallback to container
            (firstFocusable || modalCloseButton || modalDynamicContent)?.focus();
        }, 100); // Delay slightly for transition
    }

    function closeModal() {
        if (!modalOverlay) return;

        modalOverlay.classList.remove('modal-active');
        bodyEl.classList.remove('modal-open'); // Re-enable body scrolling

        // Wait for CSS transition to complete before hiding and clearing
        setTimeout(() => {
            modalOverlay.classList.add('hidden');
            modalBodyContent.innerHTML = ''; // Clear content on close
            clearFeedback(applicationFeedback); // Clear any lingering feedback

            // Return focus to the element that opened the modal
            if (modalTriggerElement) {
                modalTriggerElement.focus();
                modalTriggerElement = null; // Clear reference
            }
        }, MODAL_TRANSITION_DURATION);
    }

    // Event listener for all modal triggers using event delegation
    bodyEl.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-modal-target]');
        if (trigger) {
            e.preventDefault();
            const targetId = trigger.getAttribute('data-modal-target'); // e.g., "#modal-content-about"
            const targetContentElement = document.querySelector(targetId);
            if (targetContentElement) {
                openModal(targetContentElement, trigger);
            } else {
                console.error(`Modal target content not found for selector: ${targetId}`);
            }
        }
    });

    // Attach listeners for static modal elements (close button, overlay click)
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        // Close only if the click is directly on the overlay, not its children
        if (e.target === modalOverlay) closeModal();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('modal-active')) {
            closeModal();
        }
    });

    // --- Form Handling ---

    function showFeedback(element, message, isError = false, duration = 5000) {
        if (!element) return;
        clearTimeout(feedbackTimeout); // Clear existing timer if any

        element.textContent = message;
        element.style.color = isError ? 'var(--text-red-400)' : 'var(--primary-accent)'; // Use CSS variables for colors
        element.classList.add('visible'); // Use class to control visibility (e.g., opacity transition)

        // Set a timer to hide the feedback message
        feedbackTimeout = setTimeout(() => clearFeedback(element), duration);
    }

    function clearFeedback(element) {
        if (!element) return;
        clearTimeout(feedbackTimeout);
        element.classList.remove('visible');
        // Optionally clear text after transition
        setTimeout(() => { element.textContent = ''; }, 300); // Match CSS transition duration
    }

    function setupContactFormValidation() {
        if (!contactForm || !formFeedback) return;

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent default form submission
            clearFeedback(formFeedback); // Clear previous feedback
             // Remove previous error borders
            contactForm.querySelectorAll('.border-red-400').forEach(field => field.classList.remove('border-red-400'));

            // Use HTML5 built-in validation
            if (contactForm.checkValidity()) {
                // Form is valid (Simulate success)
                showFeedback(formFeedback, 'Message sent successfully. (Demo)');
                contactForm.reset(); // Clear the form fields
            } else {
                // Form is invalid
                showFeedback(formFeedback, 'Please fill out all required fields correctly.', true, 6000); // Show error message
                // Find the first invalid field and focus it for accessibility
                 contactForm.querySelector(':invalid')?.focus();
                 // Add error styles to invalid fields
                 contactForm.querySelectorAll(':invalid').forEach(field => field.classList.add('border-red-400')); // Example error class
            }
        });
    }

    // Setup validation for the application form (needs to be called when form is added to modal)
    function setupApplicationFormValidation(formElement) {
         if (!formElement || !applicationFeedback) return;
         // Remove previous listener if any to prevent duplicates (important when modal reopens)
        formElement.removeEventListener('submit', handleApplicationSubmit);
         // Add the listener
         formElement.addEventListener('submit', handleApplicationSubmit);
    }

    // Handler function for application form submission (used as event listener)
    function handleApplicationSubmit(e) {
        e.preventDefault();
        const form = e.target; // Get the form that triggered the event
        clearFeedback(applicationFeedback);
        form.querySelectorAll('.border-red-400').forEach(field => field.classList.remove('border-red-400'));

        if (!form.checkValidity()) {
             const firstInvalidField = form.querySelector(':invalid');
            showFeedback(applicationFeedback, 'Please complete all required (*) fields.', true, 6000);
            if (firstInvalidField) {
                firstInvalidField.focus();
                // Scroll the invalid field into view within the modal if needed
                 firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 firstInvalidField.classList.add('border-red-400'); // Highlight the first invalid field
             }
             // Highlight all invalid fields
             form.querySelectorAll(':invalid').forEach(field => field.classList.add('border-red-400'));
            return; // Stop submission
        }

        // ---- If valid ----
        // In a real app, you would send data via fetch/axios here
        // fetch('/api/apply', { method: 'POST', body: new FormData(form) })
        //  .then(response => response.json())
        //  .then(data => { ... handle success ... })
        //  .catch(error => { ... handle error ... });

        // Simulate success for demo
        showFeedback(applicationFeedback, 'Application Submitted Successfully! (Demo Only)', false, 3000);
         // Close modal after a short delay on success
        setTimeout(() => closeModal(), 2500);
         // form.reset(); // Optionally reset form fields inside modal, or let closeModal clear it
    }

    // --- Active Nav Link Logic ---

    function updateActiveNavLink(targetId = null) {
        if (!sections.length || !allNavLinks.length) return;

        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        let newActiveId = targetId; // Use passed targetId if available (from click)

        if (!newActiveId) { // Determine active section based on scroll position
            let bestMatch = { id: null, position: -Infinity };

            // Calculate the point where a section should become active
            const navHeight = nav.offsetHeight;
            const navMarginTop = nav.classList.contains('navbar-scrolled') ? parseFloat(getComputedStyle(htmlEl).getPropertyValue('--navbar-margin-top-scrolled')) : 0;
            const activationPoint = navHeight + navMarginTop + ACTIVE_LINK_BUFFER; // Point below the fixed nav

            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const sectionTopAbsolute = rect.top + scrollY;
                const sectionBottomAbsolute = sectionTopAbsolute + rect.height;

                // Check if the activation point is within this section's bounds
                if (sectionTopAbsolute <= scrollY + activationPoint && sectionBottomAbsolute > scrollY + activationPoint) {
                    // If multiple sections match, choose the one starting highest on the page
                    if (sectionTopAbsolute > bestMatch.position) {
                        bestMatch = { id: section.id, position: sectionTopAbsolute };
                    }
                }
            });

             // Edge case: If very close to the top, activate 'home'
            if (scrollY < sections[0].offsetTop / 2) { // Or some threshold
                bestMatch.id = 'home'; // Assuming 'home' is the ID for the top/hero section
            }

             // Edge case: If scrolled to the very bottom of the page
            if (scrollY + viewportHeight >= bodyEl.scrollHeight - 20) { // Use a small buffer
                 bestMatch.id = sections[sections.length - 1].id; // Activate the last section
            }

            newActiveId = bestMatch.id;
        }

        if (newActiveId && newActiveId !== currentActiveSectionId) {
            currentActiveSectionId = newActiveId;

            allNavLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentActiveSectionId}`) {
                    link.classList.add('active');
                }
            });
        } else if (!newActiveId && currentActiveSectionId) {
            // Scrolled into an area with no matching section ID (e.g., footer)
            currentActiveSectionId = null;
            allNavLinks.forEach(link => link.classList.remove('active'));
        }
    }

    // --- Accessibility Functions ---

    function toggleAccessibilityPanel(forceClose = false) {
        if (!accessibilityWidget || !accessibilityToggleBtn || !accessibilityPanel) return;

        const isExpanded = accessibilityToggleBtn.getAttribute('aria-expanded') === 'true';
        const newState = forceClose ? false : !isExpanded;

        accessibilityToggleBtn.setAttribute('aria-expanded', String(newState));
        accessibilityPanel.classList.toggle('visible', newState); // Use class for visibility/transitions

        if (newState) {
            // Focus the first button inside the panel when opened
            setTimeout(() => accessibilityPanel.querySelector('button:not([disabled])')?.focus(), 100);
        } else {
            // If focus was inside the panel, return focus to the toggle button
            if (document.activeElement && accessibilityPanel.contains(document.activeElement)) {
                accessibilityToggleBtn.focus();
            }
        }
    }

    function applyFontSize(size) {
        // Clamp font size within defined limits
        const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
        htmlEl.style.fontSize = `${clampedSize}px`;
        localStorage.setItem('accessibilityFontSize', clampedSize);
        // Recalculate layout-dependent things after font size change
        setTimeout(() => {
             handleNavbarScroll(); // Navbar height might change
             updateActiveNavLink(); // Section positions relative to viewport might change
             AOS.refresh(); // Refresh animations based on new element positions
        }, 150); // Delay slightly for rendering
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
        // Update navbar style immediately as it depends on this class
        setTimeout(() => {
             handleNavbarScroll();
             updateActiveNavLink(); // Recalculate in case colors affect layout/perception
        }, 50);
    }

    function toggleGrayscale() {
        const isGrayscale = htmlEl.classList.toggle('grayscale');
        localStorage.setItem('accessibilityGrayscale', isGrayscale);
    }

    function resetAccessibility() {
        applyFontSize(DEFAULT_FONT_SIZE); // Reset font size first
        htmlEl.classList.remove('high-contrast');
        localStorage.removeItem('accessibilityHighContrast');
        htmlEl.classList.remove('grayscale');
        localStorage.removeItem('accessibilityGrayscale');
        // Update dependent styles
        setTimeout(() => {
             handleNavbarScroll();
             updateActiveNavLink();
        }, 50);
        toggleAccessibilityPanel(true); // Close the panel after resetting
    }

    function loadAccessibilityPreferences() {
        const savedFontSize = localStorage.getItem('accessibilityFontSize');
        if (savedFontSize) {
             // Apply saved font size on load, clamped to limits
            const initialSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, parseInt(savedFontSize)));
            if (initialSize !== DEFAULT_FONT_SIZE) htmlEl.style.fontSize = `${initialSize}px`;
        }

        if (localStorage.getItem('accessibilityHighContrast') === 'true') {
            htmlEl.classList.add('high-contrast');
        }
        if (localStorage.getItem('accessibilityGrayscale') === 'true') {
            htmlEl.classList.add('grayscale');
        }

        // Ensure panel is closed on load
        if(accessibilityPanel) accessibilityPanel.classList.remove('visible');
        if(accessibilityToggleBtn) accessibilityToggleBtn.setAttribute('aria-expanded', 'false');
    }

    // --- Initialization ---
    loadAccessibilityPreferences(); // Load preferences before initial calculations
    handleScroll(); // Run initial checks for navbar style, scroll-top visibility, and active link
    setupSmoothScrolling();
    setupScrollToTop();
    setupContactFormValidation(); // Setup main contact form validation

    // --- Accessibility Event Listeners ---
    if (accessibilityToggleBtn) accessibilityToggleBtn.addEventListener('click', () => toggleAccessibilityPanel());
    if (increaseFontBtn) increaseFontBtn.addEventListener('click', increaseFontSize);
    if (decreaseFontBtn) decreaseFontBtn.addEventListener('click', decreaseFontSize);
    if (toggleContrastBtn) toggleContrastBtn.addEventListener('click', toggleHighContrast);
    if (toggleGrayscaleBtn) toggleGrayscaleBtn.addEventListener('click', toggleGrayscale);
    if (resetAccessibilityBtn) resetAccessibilityBtn.addEventListener('click', resetAccessibility);

    // Close accessibility panel on click outside
    document.addEventListener('click', (e) => {
        if (accessibilityPanel?.classList.contains('visible') &&
            !accessibilityPanel.contains(e.target) && // Click is not inside the panel
            !accessibilityToggleBtn?.contains(e.target)) // Click is not the toggle button itself
        {
            toggleAccessibilityPanel(true); // Force close
        }
    });

    // Close accessibility panel on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && accessibilityPanel?.classList.contains('visible')) {
            toggleAccessibilityPanel(true); // Force close
        }
    });

    // Mobile Menu Toggle
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => toggleMobileMenu());
    }

    // Scroll/Resize Listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true }); // Recalculate on resize

    // Initial active link check after potential layout shifts from loading/AOS
    setTimeout(() => updateActiveNavLink(), 150);

}); // End DOMContentLoaded