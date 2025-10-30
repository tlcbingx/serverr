import Document, { Html, Head, Main, NextScript } from 'next/document'
class CustomDocument extends Document {
  render() {
    return (
      <Html lang="ru">
        <Head>
          <meta charSet="utf-8"></meta>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          ></meta>
          
          {/* Favicon и иконки */}
          <link rel="icon" type="image/svg+xml" href="/icon0.svg"></link>
          <link rel="icon" type="image/x-icon" href="/favicon.ico"></link>
          <link rel="icon" type="image/png" sizes="32x32" href="/icon1.png"></link>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png"></link>
          
          {/* SEO Meta теги */}
          <meta name="description" content="VEXTR - умный Telegram-бот для управления торговой стратегией. Автоматическое управление ордерами и рисками 24/7."></meta>
          <meta name="keywords" content="VEXTR, торговый бот, Telegram бот, криптотрейдинг, автоматическая торговля"></meta>
          <meta name="author" content="VEXTR"></meta>
          
          {/* Open Graph для соцсетей */}
          <meta property="og:type" content="website"></meta>
          <meta property="og:site_name" content="VEXTR"></meta>
          <meta property="og:title" content="VEXTR - умный Telegram-бот для управления стратегией"></meta>
          <meta property="og:description" content="Запустите VEXTR одним нажатием - бот начнёт торговлю 24/7, автоматически управляя ордерами и рисками."></meta>
          <meta property="og:image" content="/og-image.png"></meta>
          <meta property="og:url" content="https://vextr.ru"></meta>
          
          {/* Twitter Card */}
          <meta property="twitter:card" content="summary_large_image"></meta>
          <meta property="twitter:title" content="VEXTR - умный Telegram-бот"></meta>
          <meta property="twitter:description" content="Автоматическое управление торговлей 24/7"></meta>
          <meta property="twitter:image" content="/og-image.png"></meta>
          
          {/* Дополнительные meta */}
          <meta name="theme-color" content="#000000"></meta>
          <meta name="msapplication-TileColor" content="#000000"></meta>
          
          {/* Google Site Verification */}
          <meta name="google-site-verification" content="kojHgnw8G_etQz4aYIUI2Oj2leSTADKf5ejzGhyLbrU" />
          <style
            dangerouslySetInnerHTML={{
              __html:
                'html {  line-height: 1.15;}body {  margin: 0;}* {  box-sizing: border-box;  border-width: 0;  border-style: solid;  -webkit-font-smoothing: antialiased;}p,li,ul,pre,div,h1,h2,h3,h4,h5,h6,figure,blockquote,figcaption {  margin: 0;  padding: 0;}button {  background-color: transparent;}button,input,optgroup,select,textarea {  font-family: inherit;  font-size: 100%;  line-height: 1.15;  margin: 0;}button,select {  text-transform: none;}button,[type="button"],[type="reset"],[type="submit"] {  -webkit-appearance: button;  color: inherit;}button::-moz-focus-inner,[type="button"]::-moz-focus-inner,[type="reset"]::-moz-focus-inner,[type="submit"]::-moz-focus-inner {  border-style: none;  padding: 0;}button:-moz-focus,[type="button"]:-moz-focus,[type="reset"]:-moz-focus,[type="submit"]:-moz-focus {  outline: 1px dotted ButtonText;}a {  color: inherit;  text-decoration: inherit;}pre {  white-space: normal;}input {  padding: 2px 4px;}img {  display: block;}details {  display: block;  margin: 0;  padding: 0;}summary::-webkit-details-marker {  display: none;}[data-thq="accordion"] [data-thq="accordion-content"] {  max-height: 0;  overflow: hidden;  transition: max-height 0.3s ease-in-out;  padding: 0;}[data-thq="accordion"] details[data-thq="accordion-trigger"][open] + [data-thq="accordion-content"] {  max-height: 1000vh;}details[data-thq="accordion-trigger"][open] summary [data-thq="accordion-icon"] {  transform: rotate(180deg);}html { scroll-behavior: smooth  }',
            }}
            data-tag="reset-style-sheet"
          ></style>
          <style
            dangerouslySetInnerHTML={{
              __html:
                '\n  html {\n    font-family: Inter;\n    font-size: 1rem;\n  }\n\n  body {\n    font-weight: 400;\n    font-style:normal;\n    text-decoration: undefined;\n    text-transform: undefined;\n    letter-spacing: normal;\n    line-height: 1.55;\n    color: var(--color-on-surface);\n    background: var(--color-surface);\n    \n    fill: var(--color-on-surface);\n  }\n\n  \n\n  ',
            }}
            data-tag="default-style-sheet"
          ></style>
          <link
            rel="stylesheet"
            href="https://unpkg.com/animate.css@4.1.1/animate.css"
          ></link>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&amp;display=swap"
            data-tag="font"
          ></link>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&amp;display=swap"
            data-tag="font"
          ></link>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&amp;display=swap"
            data-tag="font"
          ></link>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&amp;display=swap"
            data-tag="font"
          ></link>
          <link
            rel="stylesheet"
            href="https://unpkg.com/@teleporthq/teleport-custom-scripts/dist/style.css"
          ></link>
          {/* Yandex.Metrika counter */}
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=104979507", "ym");

                ym(104979507, "init", {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
              `
            }}
          />
          <noscript>
            <div>
              <img src="https://mc.yandex.ru/watch/104979507" style={{position: 'absolute', left: '-9999px'}} alt="" />
            </div>
          </noscript>
          {/* /Yandex.Metrika counter */}
        </Head>
        <body>
          <Main></Main>
          <NextScript></NextScript>
        </body>
      </Html>
    )
  }
}
export default CustomDocument
