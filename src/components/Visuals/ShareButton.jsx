import { memo, useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'
import { shareContent, canShare } from '../../utils/sharing'

/**
 * ShareButton - Reusable share button that uses Web Share API
 * with clipboard fallback and success feedback.
 */
const ShareButton = memo(({ shareData, className = '', size = 'md', theme = 'dark' }) => {
    const [copied, setCopied] = useState(false)

    const handleShare = async () => {
        const success = await shareContent(shareData)
        if (success && !canShare()) {
            // Show copied feedback for clipboard fallback
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const sizeClasses = {
        sm: 'p-1.5 text-xs gap-1',
        md: 'p-2 px-3 text-sm gap-1.5',
        lg: 'p-3 px-4 text-base gap-2'
    }

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16

    const baseClasses = theme === 'light'
        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'

    return (
        <button
            onClick={handleShare}
            className={`inline-flex items-center rounded-lg font-medium transition-all ${sizeClasses[size]} ${baseClasses} ${className}`}
            aria-label={copied ? 'Copied to clipboard' : 'Share'}
            title={canShare() ? 'Share' : 'Copy to clipboard'}
        >
            {copied ? (
                <>
                    <Check size={iconSize} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                </>
            ) : (
                <>
                    {canShare() ? <Share2 size={iconSize} /> : <Copy size={iconSize} />}
                    <span>{canShare() ? 'Share' : 'Copy'}</span>
                </>
            )}
        </button>
    )
})

ShareButton.displayName = 'ShareButton'

export default ShareButton
