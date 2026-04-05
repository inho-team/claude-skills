# Standard Comment Formats by Language

A comprehensive reference for documentation and comment conventions across 13 programming languages. Each entry includes function-level, class-level, and module/file-level examples with their standard tools.

---

## JavaScript / TypeScript

**Format**: JSDoc (`/** */`)  
**Tool**: eslint-plugin-jsdoc

### Function-level
```javascript
/**
 * Calculates the sum of two numbers.
 * @param {number} a - The first number
 * @param {number} b - The second number
 * @returns {number} The sum of a and b
 * @throws {TypeError} If parameters are not numbers
 */
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Parameters must be numbers');
  }
  return a + b;
}
```

### Class-level
```javascript
/**
 * Represents a User account.
 * @class
 * @classdesc Manages user authentication and profile data.
 * @example
 * const user = new User('john@example.com');
 * user.authenticate(password);
 */
class User {
  /**
   * Creates a new User instance.
   * @param {string} email - The user's email address
   */
  constructor(email) {
    this.email = email;
  }
}
```

### Module/File-level
```javascript
/**
 * @fileoverview User authentication and management module.
 * Provides utilities for user registration, login, and session management.
 * @author John Doe <john@example.com>
 * @version 2.0.0
 * @module auth/userManager
 */
```

---

## Python

**Format**: Docstring (`"""..."""`, Google/NumPy style)  
**Tool**: pydocstyle

### Function-level (Google style)
```python
def calculate_average(values):
    """Calculate the arithmetic mean of a list of numbers.
    
    Args:
        values (list): A list of numeric values.
    
    Returns:
        float: The average of the provided values.
    
    Raises:
        ValueError: If the list is empty.
        TypeError: If non-numeric values are provided.
    
    Example:
        >>> calculate_average([1, 2, 3, 4, 5])
        3.0
    """
    if not values:
        raise ValueError("Cannot calculate average of empty list")
    return sum(values) / len(values)
```

### Class-level
```python
class DatabaseConnection:
    """Manages connections to a PostgreSQL database.
    
    This class handles connection pooling, query execution, and transaction
    management. It provides context manager support for safe resource cleanup.
    
    Attributes:
        host (str): The database server hostname.
        port (int): The database server port number.
    """
    
    def __init__(self, host, port=5432):
        """Initialize a new database connection."""
        self.host = host
        self.port = port
```

### Module/File-level
```python
"""User authentication module.

This module provides functions and classes for user authentication, password
hashing, and session management. It integrates with bcrypt for secure password
storage and JWT for token-based authentication.

Module Functions:
    hash_password: Securely hash a password using bcrypt.
    verify_password: Verify a password against a hash.

Classes:
    User: Represents a system user.
    Session: Manages user sessions.
"""
```

---

## Java / Kotlin

**Format**: Javadoc/KDoc (`/** */`)  
**Tool**: checkstyle

### Function-level (Java)
```java
/**
 * Retrieves a user by their unique identifier.
 *
 * @param userId the unique identifier of the user to retrieve
 * @return an Optional containing the user if found, or empty if not found
 * @throws IllegalArgumentException if userId is negative
 * @since 1.0
 */
public Optional<User> getUserById(long userId) {
    if (userId < 0) {
        throw new IllegalArgumentException("User ID cannot be negative");
    }
    return userRepository.findById(userId);
}
```

### Class-level (Kotlin)
```kotlin
/**
 * Service for managing user accounts.
 *
 * Provides methods for creating, updating, and deleting users.
 * All operations are transaction-safe.
 *
 * @param repository The user repository to use for data persistence
 * @property repository The underlying repository instance
 */
class UserService(val repository: UserRepository) {
    /**
     * Creates a new user with the given credentials.
     */
    fun createUser(email: String, password: String): User = TODO()
}
```

### Module/File-level
```java
/**
 * User management package.
 *
 * <p>Provides classes and interfaces for managing user accounts, authentication,
 * and authorization. The main entry point is the {@link UserService} class.
 *
 * @author John Doe
 * @version 1.2.0
 * @since 1.0
 */
package com.example.user;
```

---

## Go

**Format**: GoDoc (line comments `//`)  
**Tool**: golint

### Function-level
```go
// Add returns the sum of two integers.
// 
// Parameters:
//   - a: the first number
//   - b: the second number
//
// Returns the sum of a and b. Panics if the result overflows.
func Add(a, b int) int {
    return a + b
}
```

### Struct/Interface-level
```go
// User represents a system user with authentication credentials.
//
// Fields are unexported to enforce encapsulation. Use the New constructor
// to create instances.
type User struct {
    id    int
    email string
    name  string
}

// NewUser creates a new User with the given email and name.
func NewUser(email, name string) *User {
    return &User{email: email, name: name}
}
```

### Package-level
```go
// Package auth provides user authentication and authorization utilities.
//
// The primary entry point is the Authenticator interface, which concrete
// implementations (e.g., JWTAuthenticator) must satisfy.
//
// Example usage:
//
//     auth := NewJWTAuthenticator(secret)
//     token, err := auth.GenerateToken(userID)
package auth
```

---

## Rust

**Format**: rustdoc (`///`, `//!`)  
**Tool**: cargo doc

### Function-level
```rust
/// Computes the factorial of a non-negative integer.
///
/// # Arguments
///
/// * `n` - A non-negative integer
///
/// # Returns
///
/// The factorial of `n`. Returns 1 if `n` is 0.
///
/// # Panics
///
/// Panics if `n` is negative.
///
/// # Example
///
/// ```
/// assert_eq!(factorial(5), 120);
/// ```
pub fn factorial(n: u32) -> u32 {
    match n {
        0 | 1 => 1,
        _ => n * factorial(n - 1),
    }
}
```

### Struct/Impl-level
```rust
/// Represents a user account with associated metadata.
///
/// # Fields
///
/// * `id` - Unique identifier
/// * `email` - User's email address
/// * `created_at` - Timestamp of account creation
#[derive(Debug, Clone)]
pub struct User {
    pub id: u64,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

impl User {
    /// Creates a new User with the given email.
    pub fn new(email: String) -> Self {
        Self {
            id: generate_id(),
            email,
            created_at: Utc::now(),
        }
    }
}
```

### Crate/Module-level
```rust
//! User authentication and session management.
//!
//! This crate provides traits and implementations for authenticating users
//! and managing their sessions securely using JWT tokens.
//!
//! # Examples
//!
//! ```
//! let auth = JwtAuthenticator::new(secret);
//! let token = auth.sign_token(user_id)?;
//! ```
```

---

## C++

**Format**: Doxygen (`///`, `/** */`)  
**Tool**: doxygen

### Function-level
```cpp
/// Calculates the greatest common divisor of two integers.
///
/// @param a First integer (must be positive)
/// @param b Second integer (must be positive)
/// @return The greatest common divisor of a and b
/// @throws std::invalid_argument if either parameter is <= 0
int gcd(int a, int b) {
    if (a <= 0 || b <= 0) {
        throw std::invalid_argument("Both parameters must be positive");
    }
    return b == 0 ? a : gcd(b, a % b);
}
```

### Class-level
```cpp
/**
 * @class Database
 * @brief Manages database connections and query execution.
 * 
 * @details Provides thread-safe connection pooling and prepared statement
 * caching for efficient query execution.
 * 
 * @author John Doe
 * @version 1.0
 */
class Database {
public:
    /// Creates a new database connection.
    /// @param connectionString The database connection string
    Database(const std::string& connectionString);
};
```

### File-level
```cpp
/**
 * @file auth.h
 * @brief Authentication module for user login and session management.
 * 
 * @details This module provides utilities for password hashing, token
 * generation, and session validation using bcrypt and JWT.
 * 
 * @author John Doe
 * @date 2025-04-04
 * @version 2.1.0
 */
```

---

## C#

**Format**: XML documentation (`///`)  
**Tool**: StyleCop

### Function-level
```csharp
/// <summary>
/// Calculates the Fibonacci number at the specified index.
/// </summary>
/// <param name="index">The position in the Fibonacci sequence (must be >= 0)</param>
/// <returns>The Fibonacci number at the given index</returns>
/// <exception cref="ArgumentException">Thrown if index is negative</exception>
/// <example>
/// <code>
/// int result = Fibonacci(10); // Returns 55
/// </code>
/// </example>
public int Fibonacci(int index) {
    if (index < 0) throw new ArgumentException("Index must be non-negative");
    if (index <= 1) return index;
    return Fibonacci(index - 1) + Fibonacci(index - 2);
}
```

### Class-level
```csharp
/// <summary>
/// Manages user accounts and authentication operations.
/// </summary>
/// <remarks>
/// This class is thread-safe and suitable for concurrent access.
/// All operations are transactional.
/// </remarks>
public class UserManager {
    /// <summary>
    /// Initializes a new instance of the <see cref="UserManager"/> class.
    /// </summary>
    /// <param name="repository">The user data repository</param>
    public UserManager(IUserRepository repository) { }
}
```

### File-level
```csharp
/// <summary>
/// Authentication and authorization module.
/// </summary>
/// <remarks>
/// Provides classes for user authentication, role-based access control,
/// and session management. Built on OAuth 2.0 and JWT standards.
/// </remarks>
/// <example>
/// See <see cref="AuthenticationService"/> for usage examples.
/// </example>
namespace MyApp.Authentication { }
```

---

## Swift

**Format**: Swift markup (`///`, `/** */`)  
**Tool**: swiftlint

### Function-level
```swift
/// Merges two sorted arrays into a single sorted array.
///
/// - Parameters:
///   - array1: The first sorted array
///   - array2: The second sorted array
/// - Returns: A new sorted array containing all elements from both arrays
/// - Complexity: O(n + m) where n and m are the array lengths
///
/// - Example:
/// ```swift
/// let result = merge([1, 3, 5], [2, 4, 6])
/// // result is [1, 2, 3, 4, 5, 6]
/// ```
func merge(_ array1: [Int], _ array2: [Int]) -> [Int] {
    var result = [Int]()
    var i = 0, j = 0
    while i < array1.count && j < array2.count {
        result.append(array1[i] < array2[j] ? array1[i] : array2[j])
        array1[i] < array2[j] ? (i += 1) : (j += 1)
    }
    result += i < array1.count ? Array(array1[i...]) : Array(array2[j...])
    return result
}
```

### Class/Struct-level
```swift
/// Represents an authenticated user session.
///
/// - Properties:
///   - id: Unique user identifier
///   - token: JWT authentication token
///   - expiresAt: Session expiration timestamp
struct UserSession {
    let id: UUID
    let token: String
    let expiresAt: Date
    
    /// Determines whether the session is still valid.
    /// - Returns: `true` if the session has not expired, `false` otherwise
    func isValid() -> Bool {
        return Date() < expiresAt
    }
}
```

### File-level
```swift
/// # User Authentication Module
///
/// Provides secure user authentication and session management.
///
/// ## Overview
/// This module handles login, token generation, and session validation
/// using JWT and bcrypt for password security.
///
/// ## Topics
/// - ``AuthenticationService``
/// - ``UserSession``
/// - ``PasswordHasher``
```

---

## PHP

**Format**: PHPDoc (`/** */`)  
**Tool**: phpcs (PHP_CodeSniffer)

### Function-level
```php
/**
 * Encrypts a plaintext string using AES-256-CBC encryption.
 *
 * @param string $plaintext The text to encrypt
 * @param string $key The encryption key (must be 32 bytes for AES-256)
 * @return string The encrypted ciphertext (base64 encoded)
 * @throws InvalidArgumentException If the key length is incorrect
 * @since 1.0.0
 */
function encrypt($plaintext, $key) {
    if (strlen($key) !== 32) {
        throw new InvalidArgumentException('Key must be 32 bytes');
    }
    $iv = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt($plaintext, 'aes-256-cbc', $key, 0, $iv);
    return base64_encode($iv . $encrypted);
}
```

### Class-level
```php
/**
 * Manages user authentication and session handling.
 *
 * @package Auth
 * @author John Doe <john@example.com>
 * @version 2.0.0
 */
class AuthenticationService {
    /**
     * Validates user credentials against the database.
     *
     * @param string $email The user's email address
     * @param string $password The plaintext password
     * @return bool True if credentials are valid, false otherwise
     */
    public function authenticate($email, $password) {
        // Implementation
    }
}
```

### File-level
```php
<?php
/**
 * User management and authentication module.
 *
 * Provides classes for user registration, login, password reset,
 * and session management.
 *
 * @package Auth
 * @author John Doe
 * @copyright 2025 Example Corp
 * @version 1.0.0
 * @license MIT
 */
```

---

## SQL

**Format**: Block comments (`-- ` for single-line, `/* */` for multi-line)

### Function/Procedure-level
```sql
-- ============================================================================
-- Procedure: sp_GetUserByEmail
-- Purpose: Retrieves a user record by email address
-- Parameters:
--   @Email NVARCHAR(255) - The user's email address
-- Returns:
--   Result set with columns: UserID, Email, FirstName, LastName, CreatedAt
-- ============================================================================
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, FirstName, LastName, CreatedAt
    FROM Users
    WHERE Email = @Email;
END;
```

### Table/Schema-level
```sql
-- ============================================================================
-- Table: users
-- Purpose: Stores user account information
-- Notes: Email is unique and indexed for fast lookups
--        Created timestamps are automatically set to current time
-- ============================================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash CHAR(60) NOT NULL,  -- bcrypt hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### File/Script-level
```sql
/*
 * User Authentication Database Schema
 * ====================================
 * 
 * This script initializes the authentication database with tables for users,
 * sessions, password reset tokens, and audit logs.
 * 
 * Author: John Doe
 * Date: 2025-04-04
 * Version: 1.0
 */
```

---

## Ruby

**Format**: YARD (`# @param`, `# @return`)  
**Tool**: yard

### Function-level
```ruby
# Calculates the sum of two integers.
#
# @param a [Integer] the first number
# @param b [Integer] the second number
# @return [Integer] the sum of a and b
# @raise [TypeError] if either parameter is not an Integer
# @example
#   add(2, 3) #=> 5
def add(a, b)
  raise TypeError, 'Parameters must be integers' unless a.is_a?(Integer) && b.is_a?(Integer)
  a + b
end
```

### Class-level
```ruby
# Represents a user account with email and password authentication.
#
# @example Creating a new user
#   user = User.new(email: 'john@example.com')
#   user.authenticate('password123')
class User
  # @return [String] the user's email address
  attr_accessor :email
  
  # Creates a new User instance.
  #
  # @param email [String] the user's email address
  # @param password [String] the plaintext password
  # @return [User] a new User instance
  # @raise [ArgumentError] if email is invalid
  def initialize(email, password)
    @email = email
    @password = password
  end
end
```

### Module/File-level
```ruby
# User authentication and session management module.
#
# Provides utilities for user login, session tracking, and password reset.
# Integrates with bcrypt for secure password storage.
#
# @author John Doe
# @version 2.0.0
# @since 1.0.0
module Authentication
end
```

---

## Dart

**Format**: dartdoc (`///`)  
**Tool**: dart doc

### Function-level
```dart
/// Validates an email address format.
///
/// Returns `true` if the email matches standard RFC 5322 patterns,
/// `false` otherwise.
///
/// Throws [FormatException] if the email is null or empty.
///
/// Example:
/// ```dart
/// bool isValid = validateEmail('user@example.com');
/// ```
bool validateEmail(String email) {
  if (email == null || email.isEmpty) {
    throw FormatException('Email cannot be null or empty');
  }
  final regex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
  return regex.hasMatch(email);
}
```

### Class-level
```dart
/// Manages user authentication and JWT token generation.
///
/// This class provides methods for user login, token validation,
/// and session management. All operations are asynchronous.
///
/// Example:
/// ```dart
/// final auth = AuthService();
/// final token = await auth.login('email@example.com', 'password');
/// ```
class AuthService {
  /// Creates a new AuthService instance.
  /// 
  /// The [secret] parameter is used for token signing.
  AuthService({required String secret}) {
    _secret = secret;
  }
  
  late String _secret;
}
```

### Library/File-level
```dart
/// User authentication and authorization library.
///
/// Provides services for user registration, login, and session management
/// with support for JWT tokens and role-based access control.
///
/// Example usage:
/// ```dart
/// import 'package:myapp/auth.dart';
///
/// void main() async {
///   final auth = AuthService(secret: 'your-secret-key');
///   final user = await auth.login('user@example.com', 'password');
/// }
/// ```
library auth;
```

---

## Summary

- **Compiled languages** (Java, C++, C#, Go) favor robust, structured documentation
- **Dynamic languages** (Python, Ruby, PHP) use more flexible docstring formats
- **Functional languages** (Rust, Dart) emphasize clarity on error cases and examples
- **Frontend languages** (JavaScript, TypeScript, Swift) prioritize developer ergonomics
- **SQL** uses pragmatic block comments within procedural logic

Use these patterns as templates, adapting to your team's documentation standards and lint configuration.
