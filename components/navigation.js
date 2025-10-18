import React from 'react'

import Script from 'dangerous-html/react'
import { useTranslations } from 'next-intl'

const Navigation = (props) => {
  return (
    <>
      <div className="navigation-container1">
        <div className="navigation-container2">
          <div className="navigation-container3">
            <Script
              html={`<style>
        @keyframes navigationGlow {0%,100% {box-shadow: 0 0 15px
        color-mix(in srgb, var(--color-accent) 20%, transparent);}
50% {box-shadow: 0 0 25px
        color-mix(in srgb, var(--color-accent) 40%, transparent);}}
        </style> `}
            ></Script>
          </div>
        </div>
        <div className="navigation-container4">
          <div className="navigation-container5">
            <Script
              html={`<style>
@media (prefers-reduced-motion: reduce) {
.navigation, .navigation__link, .navigation__mobile-link, .navigation__toggle-icon, .navigation__mobile-menu {
  transition: none;
}
}
</style>`}
            ></Script>
          </div>
        </div>
        <div className="navigation-container6">
          <div className="navigation-container7">
            <Script
              html={`<script defer data-name="navigation">
(function(){
  const navigation = document.getElementById("navigation")
  const navigationToggle = document.getElementById("navigationToggle")
  const navigationMobileMenu = document.getElementById("navigationMobileMenu")
  const mobileLinks = document.querySelectorAll(".navigation__mobile-link")

  // Handle mobile menu toggle
  if (navigationToggle && navigationMobileMenu) {
    navigationToggle.addEventListener("click", () => {
      const isExpanded =
        navigationToggle.getAttribute("aria-expanded") === "true"
      navigationToggle.setAttribute("aria-expanded", !isExpanded)
      navigationMobileMenu.classList.toggle("navigation__mobile-menu--active")

      // Prevent body scroll when menu is open
      if (!isExpanded) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = ""
      }
    })

    // Close menu when clicking on a link
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navigationToggle.setAttribute("aria-expanded", "false")
        navigationMobileMenu.classList.remove("navigation__mobile-menu--active")
        document.body.style.overflow = ""
      })
    })

    // Close menu when clicking outside
    navigationMobileMenu.addEventListener("click", (e) => {
      if (e.target === navigationMobileMenu) {
        navigationToggle.setAttribute("aria-expanded", "false")
        navigationMobileMenu.classList.remove("navigation__mobile-menu--active")
        document.body.style.overflow = ""
      }
    })
  }

  // Handle scroll effect
  let lastScroll = 0
  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset

    if (currentScroll > 50) {
      navigation.classList.add("navigation--scrolled")
    } else {
      navigation.classList.remove("navigation--scrolled")
    }

    lastScroll = currentScroll
  })

  // Handle smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href")
      if (href === "#" || href === "") return

      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        const offsetTop = target.offsetTop - 80
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        })
      }
    })
  })
})()
</script>`}
            ></Script>
          </div>
        </div>
        <nav id="navigation" className="navigation">
          <div className="navigation__container">
            <a href="/" id="navigationLogo">
              <div className="navigation__logo">
                <span className="navigation-navigationlogo-text navigation__logo-text">
                  VEXTR
                </span>
              </div>
            </a>
            <div id="navigationLinks" className="navigation__links">
              <a href="/">
                <div className="navigation__link">
                  <span>Главная</span>
                </div>
              </a>
              <a href="/docs">
                <div className="navigation__link">
                  <span>Документация</span>
                </div>
              </a>
              <a href="/faq">
                <div className="navigation__link">
                  <span>FAQ</span>
                </div>
              </a>
              <a href="/about">
                <div className="navigation__link">
                  <span>О нас</span>
                </div>
              </a>
              <a href="/security">
                <div className="navigation__link">
                  <span>Безопасность</span>
                </div>
              </a>
            </div>
            
            <div className="navigation__actions">
              {/* Primary header CTA - starts the bot (same as other CTAs) */}
              <a href="https://t.me/vextr_bot" target="_blank" rel="noopener noreferrer" className="navigation__cta-link">
                <div className="btn-primary btn navigation__cta">Начать сейчас</div>
              </a>
            </div>
            <button
              id="navigationToggle"
              aria-label="Toggle navigation menu"
              aria-expanded="false"
              className="navigation__toggle"
            >
              <span className="navigation-navigationtoggle-icon1">
                <svg
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 5h16M4 12h16M4 19h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </span>
              <span className="navigation-navigationtoggle-icon2">
                <svg
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </span>
            </button>
          </div>
          <div id="navigationMobileMenu" className="navigation__mobile-menu">
            <div className="navigation__mobile-content">
              <a href="/">
                <div className="navigation__mobile-link">
                  <span className="navigation__mobile-link-text">
                    Главная
                  </span>
                </div>
              </a>
              <a href="/docs">
                <div className="navigation__mobile-link">
                  <span className="navigation__mobile-link-text">
                    Документация
                  </span>
                </div>
              </a>
              <a href="/faq">
                <div className="navigation__mobile-link">
                  <span className="navigation__mobile-link-text">FAQ</span>
                </div>
              </a>
              <a href="/about">
                <div className="navigation__mobile-link">
                  <span className="navigation__mobile-link-text">
                    О нас
                  </span>
                </div>
              </a>
              <a href="/security">
                <div className="navigation__mobile-link">
                  <span className="navigation__mobile-link-text">Безопасность</span>
                </div>
              </a>
              <a href="https://t.me/vextr_bot" target="_blank" rel="noopener noreferrer">
                <div className="navigation__mobile-link">
                  <span className="navigation__mobile-link-text">Начать сейчас</span>
                </div>
              </a>
              
            </div>
          </div>
        </nav>

        
      </div>
      <style jsx>
        {`
          .navigation-container1 {
            display: contents;
          }
          .navigation-container2 {
            display: none;
          }
          .navigation-container3 {
            display: contents;
          }
          .navigation-container4 {
            display: none;
          }
          .navigation-container5 {
            display: contents;
          }
          .navigation-container6 {
            display: none;
          }
          .navigation-container7 {
            display: contents;
          }
          .navigation-navigationlogo-text {
            text-transform: uppercase;
          }
          .navigation-navigationtoggle-icon1 {
            display: flex;
            opacity: 1;
            position: absolute;
            transform: rotate(0deg) scale(1);
            transition: all 0.3s var(--animation-curve-primary);
            align-items: center;
            justify-content: center;
          }
          .navigation-navigationtoggle-icon2 {
            display: flex;
            opacity: 0;
            position: absolute;
            transform: rotate(90deg) scale(0.5);
            transition: all 0.3s var(--animation-curve-primary);
            align-items: center;
            justify-content: center;
          }

          :global(.nav-modal) {
            position: fixed;
            inset: 0;
            z-index: 2000;
          }
          :global(.nav-modal__backdrop) {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.5);
            -webkit-backdrop-filter: blur(4px);
            backdrop-filter: blur(4px);
          }
          :global(.nav-modal__content) {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: calc(min(92vw, 440px));
            border: 1px solid var(--glass-border);
            background: var(--glass-bg);
            -webkit-box-shadow: var(--shadow-level-3);
            box-shadow: var(--shadow-level-3);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-2xl);
            max-width: 92vw;
            box-sizing: border-box;
          }
        `}
      </style>
    </>
  )
}

export default Navigation
