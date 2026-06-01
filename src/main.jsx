import React from 'react'
import ReactDOM from 'react-dom/client'
import ArmorApp from './ArmorApp.jsx'
import { ArmorDataProvider } from './context/ArmorDataContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initAnalytics } from './utils/analytics.js'
import './index.css'

initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ArmorDataProvider>
                <ArmorApp />
            </ArmorDataProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
