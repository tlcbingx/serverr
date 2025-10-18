import React from 'react'

import Script from 'dangerous-html/react'
import { useTranslations } from 'next-intl'

const Footer = (props) => {
  return (
    <>
      <div className="footer-container1">
        <div className="footer-container2">
          <div className="footer-container3">
            <Script
              html={`<style>
        @keyframes footer-float-particle {0%,100% {transform: translate(0, 0) scale(1);
opacity: 0.2;}
50% {transform: translate(20px, -30px) scale(1.5);
opacity: 0.6;}}
        </style> `}
            ></Script>
          </div>
        </div>
        <div className="footer-container4">
          <div className="footer-container5">
            <Script
              html={`<style>
@media (prefers-reduced-motion: reduce) {
.footer-particle {
  animation: none;
}
.footer-social-link, .footer-nav-link, .footer-trust-badge, .footer-logo-icon {
  transition: none;
}
.footer-social-link::before {
  transition: none;
}
}
</style>`}
            ></Script>
          </div>
        </div>
        <div className="footer-container6">
          <div className="footer-container7">
            <Script
              html={`<script defer data-name="footer">
(function(){
  // Intersection Observer for smooth reveal animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const footerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe footer elements
  const footerElements = document.querySelectorAll(
    ".footer-brand, .footer-nav-column, .footer-trust"
  )
  footerElements.forEach((el, index) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = \`opacity 0.6s ease-out \${
      index * 0.1
    }s, transform 0.6s ease-out \${index * 0.1}s\`
    footerObserver.observe(el)
  })

  // Enhanced hover effect for social links with ripple
  const socialLinks = document.querySelectorAll(".footer-social-link")
  socialLinks.forEach((link) => {
    link.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-3px) scale(1.05)"
    })

    link.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0) scale(1)"
    })
  })

  // Dynamic particle movement based on mouse position
  const footerSection = document.getElementById("footer")
  const particles = document.querySelectorAll(".footer-particle")

  let mouseX = 0
  let mouseY = 0

  footerSection.addEventListener("mousemove", (e) => {
    const rect = footerSection.getBoundingClientRect()
    mouseX = (e.clientX - rect.left) / rect.width
    mouseY = (e.clientY - rect.top) / rect.height

    particles.forEach((particle, index) => {
      const speed = (index + 1) * 10
      const x = (mouseX - 0.5) * speed
      const y = (mouseY - 0.5) * speed

      particle.style.transform = \`translate(\${x}px, \${y}px)\`
    })
  })

  footerSection.addEventListener("mouseleave", () => {
    particles.forEach((particle) => {
      particle.style.transform = "translate(0, 0)"
    })
  })

  // Smooth scroll for internal links
  const navLinks = document.querySelectorAll('.footer-nav-link[href^="#"]')
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href")
      const target = document.querySelector(href)

      if (target) {
        e.preventDefault()
        const headerOffset = 80
        const elementPosition = target.getBoundingClientRect().top
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
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
        <footer id="footer" className="footer-section">
          <div className="footer-glass-container">
            <div aria-hidden="true" className="footer-particles">
              <div className="footer-particle"></div>
              <div className="footer-particle"></div>
              <div className="footer-particle"></div>
              <div className="footer-particle"></div>
              <div className="footer-particle"></div>
            </div>
            <div className="footer-content">
              <div className="footer-brand">
                <div className="footer-logo">
                  <div aria-hidden="true" className="footer-logo-icon">
                    <svg
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  </div>
                  <span className="footer-logo-text">VEXTR</span>
                </div>
                <p className="footer-brand-tagline">
                  {' '}
                  Алгоритм вместо эмоций. Прибыль вместо стресса.
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </p>
                {/* footer social icons removed */}
              </div>
              <div className="footer-nav-group">
                <div className="footer-nav-column">
                  <h3 className="footer-nav-title">Продукт</h3>
                  <ul className="footer-nav-list">
                    <li>
                      <a href="/docs">
                        <div className="footer-nav-link">
                          <span>Документация</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/faq">
                        <div className="footer-nav-link">
                          <span>FAQ</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/terms">
                        <div className="footer-nav-link">
                          <span>Условия использования</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/privacy">
                        <div className="footer-nav-link">
                          <span>Политика конфиденциальности</span>
                        </div>
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="footer-nav-column">
                  <h3 className="footer-nav-title">Поддержка</h3>
                  <ul className="footer-nav-list">
                    <li>
                      <a href="/docs">
                        <div className="footer-nav-link">
                          <span>Документация</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/faq">
                        <div className="footer-nav-link">
                          <span>FAQ</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/contacts">
                        <div className="footer-nav-link">
                          <span>Контакты</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="https://t.me/vextr_auto" target="_blank" rel="noopener noreferrer">
                        <div className="footer-nav-link">
                          <span>Канал в Telegram</span>
                        </div>
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="footer-nav-column">
                  <h3 className="footer-nav-title">Компания</h3>
                  <ul className="footer-nav-list">
                    <li>
                      <a href="/about">
                        <div className="footer-nav-link">
                          <span>О нас</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/terms">
                        <div className="footer-nav-link">
                          <span>Условия использования</span>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a href="/security">
                        <div className="footer-nav-link">
                          <span>Безопасность</span>
                        </div>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="footer-trust">
                <div className="footer-trust-badge">
                  <svg
                    width="50"
                    xmlns="http://www.w3.org/2000/svg"
                    height="40"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                  <div className="footer-trust-text">
                    <span className="footer-trust-title">Безопасно</span>
                    <span className="footer-trust-subtitle">
                      Шифрование с использованием симметричного ключа
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="footer-divider"></div>
            <div className="footer-bottom">
              <div className="footer-bottom-content">
                <p className="footer-copyright">
                  © 2025 VEXTR. Все права защищены.
                </p>
                <div className="footer-disclaimer">
                  <p className="footer-disclaimer-text">
                    <svg
                      width="16"
                      xmlns="http://www.w3.org/2000/svg"
                      height="16"
                      viewBox="0 0 24 24"
                      className="footer-footer-disclaimer-icon"
                    >
                      <path
                        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <span>
                      {' '}
                      Торговля криптовалютой связана с рисками. Прошлые
                      результаты не гарантируют будущей прибыли.
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <style jsx>
        {`
          .footer-container1 {
            display: contents;
          }
          .footer-container2 {
            display: none;
          }
          .footer-container3 {
            display: contents;
          }
          .footer-container4 {
            display: none;
          }
          .footer-container5 {
            display: contents;
          }
          .footer-container6 {
            display: none;
          }
          .footer-container7 {
            display: contents;
          }
          .footer-footer-disclaimer-icon {
            color: var(--color-accent);
            opacity: 0.7;
            margin-top: 2px;
            flex-shrink: 0;
          }
        `}
      </style>
    </>
  )
}

export default Footer
