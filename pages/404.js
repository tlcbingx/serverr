import React from 'react'
import Head from 'next/head'

import { useTranslations } from 'next-intl'

const NotFound = (props) => {
  return (
    <>
      <div className="not-found-container1">
        <Head>
          <title>404 - Not Found</title>
        </Head>
        <h3>OOPS! PAGE NOT FOUND</h3>
        <div className="not-found-container2">
          <h1 className="not-found-text2">404</h1>
        </div>
        <div className="not-found-container3">
          <h2 className="not-found-text3">
            WE ARE SORRY, BUT THE PAGE YOU REQUESTED WAS NOT FOUND
          </h2>
        </div>
      </div>
      {/* styles moved to pages/style.css (global) */}
    </>
  )
}

export default NotFound
