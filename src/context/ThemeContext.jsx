import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Assuming 'theme' is a simple string. storage.load/save handles serialization.
    const [theme, setTheme] = useState(() => storage.load('theme', 'dark'));

    useEffect(() => {
        storage.save('theme', theme);
        // Apply theme to DOM
        document.documentElement.className = theme;
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
