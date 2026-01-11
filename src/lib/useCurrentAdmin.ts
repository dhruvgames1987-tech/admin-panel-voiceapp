/**
 * Hook to get the current logged-in admin from localStorage
 * and provide role-checking utilities.
 */

interface AdminUser {
    id: string;
    username: string;
    full_name: string;
    role: 'super_admin' | 'admin' | 'user';
}

interface CurrentAdmin extends AdminUser {
    isSuperAdmin: boolean;
    isAdmin: boolean;
}

export const useCurrentAdmin = (): CurrentAdmin | null => {
    const stored = localStorage.getItem('nexmeet_admin');
    if (!stored) return null;

    try {
        const admin = JSON.parse(stored) as AdminUser;
        return {
            ...admin,
            isSuperAdmin: admin.role === 'super_admin',
            isAdmin: admin.role === 'admin' || admin.role === 'super_admin'
        };
    } catch {
        return null;
    }
};

/**
 * Get current admin synchronously (for non-hook usage)
 */
export const getCurrentAdmin = (): CurrentAdmin | null => {
    const stored = localStorage.getItem('nexmeet_admin');
    if (!stored) return null;

    try {
        const admin = JSON.parse(stored) as AdminUser;
        return {
            ...admin,
            isSuperAdmin: admin.role === 'super_admin',
            isAdmin: admin.role === 'admin' || admin.role === 'super_admin'
        };
    } catch {
        return null;
    }
};
