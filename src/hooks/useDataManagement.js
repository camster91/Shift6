import { useCallback } from 'react';
import { EXERCISE_PLANS } from '../data/exercises.jsx';
import { STORAGE_PREFIX } from './usePersistedState';

/**
 * Sanitize CSV cell values to prevent formula injection.
 * Prefixes cells starting with =, +, -, or @ with a single quote.
 */
const sanitizeCSVCell = (value) => {
    if (typeof value !== 'string') return value;
    if (/^[=+\-@]/.test(value)) return `'${value}`;
    return value;
};

/**
 * Validate imported data structure. Returns null if invalid.
 */
const validateImportData = (data) => {
    if (!data || typeof data !== 'object') return null;
    if (data.version && typeof data.version !== 'string') return null;
    // Validate top-level keys are objects/arrays where expected
    const validated = {};
    for (const [key, value] of Object.entries(data)) {
        if (key === 'version' || key === 'timestamp' || key === 'introDismissed') {
            validated[key] = value;
        } else if (typeof value === 'object' && value !== null) {
            validated[key] = value;
        }
    }
    return Object.keys(validated).length > 0 ? validated : null;
};

/**
 * Export, import, and factory reset handlers.
 */
export function useDataManagement({
    completedDays, setCompletedDays,
    sessionHistory, setSessionHistory,
    setPendingConfirm,
}) {
    const handleExport = useCallback(() => {
        // Export all shift6-prefixed keys from localStorage
        const exportData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                try {
                    const raw = localStorage.getItem(key);
                    // Try to parse as JSON, store as-is if not valid JSON
                    try {
                        exportData[key] = JSON.parse(raw);
                    } catch {
                        exportData[key] = raw;
                    }
                } catch { /* skip unreadable keys */ }
            }
        }
        exportData.timestamp = new Date().toISOString();
        exportData.version = '2.0';

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift6_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, []);

    const handleExportCSV = useCallback(() => {
        if (sessionHistory.length === 0) {
            alert('No workout history to export.');
            return;
        }
        const headers = ['Date', 'Exercise', 'Day', 'Volume', 'Unit', 'Notes'];
        const rows = sessionHistory.map(s => [
            new Date(s.date).toLocaleString(),
            sanitizeCSVCell(EXERCISE_PLANS[s.exerciseKey]?.name || s.exerciseKey),
            s.dayId,
            s.volume,
            s.unit,
            s.notes ? `"${sanitizeCSVCell(s.notes.replace(/"/g, '""'))}"` : ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift6_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [sessionHistory]);

    const handleImport = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = JSON.parse(e.target.result);
                const data = validateImportData(raw);
                if (!data) {
                    alert('Invalid backup file format.');
                    return;
                }
                // Restore all shift6-prefixed keys
                let restored = 0;
                for (const [key, value] of Object.entries(data)) {
                    if (key === 'version' || key === 'timestamp') continue;
                    if (key.startsWith(STORAGE_PREFIX)) {
                        try {
                            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                            restored++;
                        } catch { /* skip keys that fail to write */ }
                    }
                }
                // Reload to pick up all restored state
                if (restored > 0) {
                    alert(`Data restored successfully! ${restored} items recovered.`);
                    window.location.reload();
                } else {
                    alert('No Shift6 data found in backup file.');
                }
            } catch (err) {
                console.error("Import failed", err);
                alert('Failed to import data. Invalid file format.');
            }
        };
        reader.readAsText(file);
    }, []);

    const handleFactoryReset = useCallback(() => {
        setPendingConfirm({
            title: 'Factory Reset',
            message: 'WARNING: This will permanently delete ALL workout history and progress. This cannot be undone. Are you absolutely sure?',
            danger: true,
            confirmText: 'Reset Everything',
            onConfirm: () => {
                // Only remove shift6-prefixed keys, not all localStorage data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(STORAGE_PREFIX)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                setPendingConfirm(null);
                window.location.reload();
            }
        });
    }, [setPendingConfirm]);

    return { handleExport, handleExportCSV, handleImport, handleFactoryReset };
}
