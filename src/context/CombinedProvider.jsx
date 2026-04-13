import { ThemeProvider } from './ThemeContext';
import { UnifiedStateProvider } from './UnifiedStateContext';
import { UIStateProvider } from './UIStateContext';
import { SettingsStateProvider } from './SettingsStateContext';

export const CombinedProvider = ({ children }) => (
    <ThemeProvider>
        <UnifiedStateProvider>
            <UIStateProvider>
                <SettingsStateProvider>
                    {children}
                </SettingsStateProvider>
            </UIStateProvider>
        </UnifiedStateProvider>
    </ThemeProvider>
);