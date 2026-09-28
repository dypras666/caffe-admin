import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [branchId, setBranchIdState] = useState(() => {
    if (!isAdmin) return String(user?.branch_id || '');
    return sessionStorage.getItem('admin_branch_id') || '';
  });

  const setBranchId = (id) => {
    setBranchIdState(id);
    if (isAdmin) {
      if (id) sessionStorage.setItem('admin_branch_id', String(id));
      else sessionStorage.removeItem('admin_branch_id');
    }
  };

  useEffect(() => {
    if (!isAdmin && user?.branch_id) setBranchIdState(String(user.branch_id));
  }, [isAdmin, user?.branch_id]);

  return (
    <BranchContext.Provider value={{ branchId, setBranchId, isAdmin }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useGlobalBranch() {
  return useContext(BranchContext);
}
