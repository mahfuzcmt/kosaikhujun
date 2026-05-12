package com.kosaibari.security;

import com.kosaibari.domain.User;

import java.util.UUID;

public class UserContext {

    private static final ThreadLocal<User> CURRENT_USER = new ThreadLocal<>();

    public static void set(User user) {
        CURRENT_USER.set(user);
    }

    public static User get() {
        return CURRENT_USER.get();
    }

    public static UUID getUserId() {
        User user = get();
        return user != null ? user.getId() : null;
    }

    public static User.UserType getUserType() {
        User user = get();
        return user != null ? user.getUserType() : null;
    }

    public static boolean isAdmin() {
        return getUserType() == User.UserType.ADMIN;
    }

    public static boolean isButcher() {
        return getUserType() == User.UserType.BUTCHER;
    }

    public static boolean isCustomer() {
        return getUserType() == User.UserType.CUSTOMER;
    }

    public static User require() {
        User user = get();
        if (user == null) {
            throw new IllegalStateException("No authenticated user");
        }
        return user;
    }

    public static void clear() {
        CURRENT_USER.remove();
    }
}
