import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import { CombinedProvider } from './context/CombinedProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <CombinedProvider>
                <App />
            </CombinedProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
