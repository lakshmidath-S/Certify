export const StatusBadge = ({ status }) => {
    const colors = {
        VALID: 'bg-green-100 text-green-800',
        INVALID: 'bg-red-100 text-red-800',
        REVOKED: 'bg-yellow-100 text-yellow-800',
        PENDING: 'bg-blue-100 text-blue-800',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};
