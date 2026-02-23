// src/hooks/useUsername.ts
import { useState, useEffect } from "react";
import { getOrCreateUsername } from "../utils/usernameGenerator";

// Store username in a module-level cache to avoid multiple localStorage reads
let cachedUsername: string | null = null;

export function useUsername() {
  const [username, setUsername] = useState<string>(() => {
    // Initialize from cache or generate new one
    if (cachedUsername) {
      return cachedUsername;
    }
    const newUsername = getOrCreateUsername();
    cachedUsername = newUsername;
    return newUsername;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Username is immutable - once generated, it never changes
  // But if you ever need to regenerate (rare), you could add a function for it
  const regenerateUsername = () => {
    // Clear from localStorage
    localStorage.removeItem("sudorace_username");
    // Generate new one
    const newUsername = getOrCreateUsername();
    cachedUsername = newUsername;
    setUsername(newUsername);
  };

  return {
    username,
    isLoading,
    regenerateUsername, // Optional: useful for testing or if user wants to change
  };
}

// Direct access for non-hook contexts (like socket handlers)
export function getUsername(): string {
  if (cachedUsername) {
    return cachedUsername;
  }
  const username = getOrCreateUsername();
  cachedUsername = username;
  return username;
}
