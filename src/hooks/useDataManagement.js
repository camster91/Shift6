import { useCallback } from 'react';
import { EXERCISE_PLANS } from '../data/exercises.jsx';

/**
 * Export, import, and factory reset handlers.
 */
export function useDataManagement({
    completedDays, setCompletedDays,
    sessionHistory, setSessionHistory,
    setPendingConfirm,
}) {
    const handleExport = useCallback(() => {
        const data = {
            progress: completedDays,
            introDismissed: localStorage.getItem('shift6_intro_dismissed'),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift6_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [completedDays]);

    const handleExportCSV = useCallback(() => {
        if (sessionHistory.length === 0) {
            alert('No workout history to export.');
            return;
        }
        const headers = ['Date', 'Exercise', 'Day', 'Volume', 'Unit', 'Notes'];
        const rows = sessionHistory.map(s => [
            new Date(s.date).toLocaleString(),
            EXERCISE_PLANS[s.exerciseKey]?.name || s.exerciseKey,
            s.dayId,
            s.volume,
            s.unit,
            s.notes ? `"${s.notes.replace(/"/g, '""')}"` : ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift6_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [sessionHistory]);

    const handleImport = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.progress) setCompletedDays(data.progress);
                if (data.introDismissed) {
                    try { localStorage.setItem('shift6_intro_dismissed', data.introDismissed); } catch {}
                }
                alert('Data restored successfully!');
            } catch (err) {
                console.error("Import failed", err);
                alert('Failed to import data. Invalid file format.');
            }
        };
        reader.readAsText(file);
    }, [setCompletedDays]);

    const handleFactoryReset = useCallback(() => {
        setPendingConfirm({
            title: 'Factory Reset',
            message: 'WARNING: This will permanently delete ALL workout history and progress. This cannot be undone. Are you absolutely sure?',
            danger: true,
            confirmText: 'Reset Everything',
            onConfirm: () => {
                setCompletedDays({});
                setSessionHistory([]);
                localStorage.clear();
                setPendingConfirm(null);
                window.location.reload();
            }
        });
    }, [setCompletedDays, setSessionHistory, setPendingConfirm]);

    return { handleExport, handleExportCSV, handleImport, handleFactoryReset };
}
