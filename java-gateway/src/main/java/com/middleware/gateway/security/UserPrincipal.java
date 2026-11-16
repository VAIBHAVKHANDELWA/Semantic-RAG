package com.middleware.gateway.security;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
@AllArgsConstructor
public class UserPrincipal implements UserDetails {

    private final String userId;
    private final String role;
    private final String tenant;
    private final boolean mustChangePassword;
    private final boolean isSuperAdmin;
    private final Collection<? extends GrantedAuthority> authorities;

    public static UserPrincipal create(String userId, String role, String tenant, boolean mustChangePassword, boolean isSuperAdmin) {
        String formattedRole = role != null && !role.toUpperCase().startsWith("ROLE_")
                ? "ROLE_" + role.toUpperCase()
                : (role != null ? role.toUpperCase() : "ROLE_USER");

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(formattedRole));
        return new UserPrincipal(userId, role, tenant, mustChangePassword, isSuperAdmin, authorities);
    }

    public static UserPrincipal create(String userId, String role, String tenant) {
        return create(userId, role, tenant, false, false);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return userId;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
