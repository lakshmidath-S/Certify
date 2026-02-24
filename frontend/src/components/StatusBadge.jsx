export const StatusBadge = ({ status }) => {
    const styles = {
        VALID: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        INVALID: 'bg-red-500/10 border-red-500/20 text-red-400',
        REVOKED: 'bg-red-500/10 border-red-500/20 text-red-400', // Making revoked look like invalid for high contrast
        PENDING: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold tracking-wide ${styles[status] || 'bg-white/[0.04] border-white/[0.08] text-[#A1A1A1]'}`}>
            {status}
        </span>
    );
};
