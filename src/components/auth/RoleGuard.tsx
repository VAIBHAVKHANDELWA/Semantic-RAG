import React from 'react';
import { useApp } from '../../context/AppContext';
import type { RbacRole } from '../../types';
import { Unauthorized403 } from './Unauthorized403';

interface RoleGuardProps {
  allowedRoles: RbacRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, navigate } = useApp();

  // If no user is logged in, redirect to login
  if (!isAuthenticated || !user) {
    navigate('/login');
    return null;
  }

  // If user role is not allowed, render 403 Forbidden
  if (!allowedRoles.includes(user.role)) {
    return <Unauthorized403 allowedRoles={allowedRoles} />;
  }

  // Allowed
  return <>{children}</>;
};
