import { ThemeProvider } from './ThemeContext';
import { WorkoutStateProvider } from './WorkoutStateContext';
import { UIStateProvider } from './UIStateContext';
import { SettingsStateProvider } from './SettingsStateContext';
import { GymStateProvider } from './GymStateContext';

export const CombinedProvider = ({ children }) => (
    <ThemeProvider>
        <WorkoutStateProvider>
            <UIStateProvider>
                <SettingsStateProvider>
                    <GymStateProvider>
                        {children}
                    </GymStateProvider>
                </SettingsStateProvider>
            </UIStateProvider>
        </WorkoutStateProvider>
    </ThemeProvider>
);
