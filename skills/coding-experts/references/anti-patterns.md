# Anti-patterns Catalog

Reference guide for common anti-patterns across programming languages and frameworks. Each entry includes detection strategies and corrected approaches.

## Category 1: Structure

### 1. God Object / God Function
**Why bad**: Single class/function handling too many responsibilities violates SRP; harder to test, reuse, and maintain.

**Wrong**:
```python
class User:
    def authenticate(self): pass
    def validate_email(self): pass
    def save_to_db(self): pass
    def send_email(self): pass
    def generate_report(self): pass
    def cache_result(self): pass
```

**Correct**:
```python
class User:
    def authenticate(self): pass

class EmailValidator:
    def validate(self, email): pass

class UserRepository:
    def save(self, user): pass
```

**Detect**: Classes/functions with 5+ responsibilities; names with "and" or "Manager"; test fixtures requiring 10+ mocks.

---

### 2. Deep Nesting
**Why bad**: Nesting >4 levels reduces readability and increases cognitive load; harder to follow control flow.

**Wrong**:
```javascript
function processData(items) {
  if (items) {
    for (let item of items) {
      if (item.valid) {
        if (item.priority > 5) {
          if (item.status === 'active') {
            return transform(item);
          }
        }
      }
    }
  }
}
```

**Correct**:
```javascript
function processData(items) {
  return items
    .filter(i => i.valid && i.priority > 5 && i.status === 'active')
    .map(transform);
}
```

**Detect**: Indentation depth >4; large code blocks inside nested blocks; use linter rule `max-depth`.

---

### 3. Magic Numbers
**Why bad**: Unexplained literal values obscure intent; changing one requires finding all occurrences.

**Wrong**:
```python
def calculate_discount(amount):
    if amount > 100:
        return amount * 0.15
    elif amount > 50:
        return amount * 0.1
    return 0
```

**Correct**:
```python
MIN_TIER_1_AMOUNT = 100
TIER_1_DISCOUNT = 0.15
MIN_TIER_2_AMOUNT = 50
TIER_2_DISCOUNT = 0.1

def calculate_discount(amount):
    if amount > MIN_TIER_1_AMOUNT:
        return amount * TIER_1_DISCOUNT
    elif amount > MIN_TIER_2_AMOUNT:
        return amount * TIER_2_DISCOUNT
    return 0
```

**Detect**: Literal numbers in calculations; inconsistent representations of same value; `0`, `1`, `2` used as status flags.

---

### 4. Copy-Paste Code
**Why bad**: Duplication creates maintenance burden; bug fixes must be replicated; increases bundle size.

**Wrong**:
```javascript
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validateUsername(username) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username); // Wrong regex!
}
```

**Correct**:
```javascript
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,20}$/
};

function validate(value, type) {
  return PATTERNS[type].test(value);
}
```

**Detect**: Identical code blocks in >2 places; similar variable names; git blame showing same author for similar logic.

---

## Category 2: Error Handling

### 5. Silent Catch
**Why bad**: Swallowing errors masks bugs; application silently fails, making debugging impossible.

**Wrong**:
```python
try:
    result = risky_operation()
except Exception:
    pass  # Swallowed!
```

**Correct**:
```python
try:
    result = risky_operation()
except SpecificException as e:
    logger.error("Operation failed", exc_info=True)
    raise  # Re-raise or handle explicitly
```

**Detect**: Empty except blocks; catch blocks with only `pass`; `# ignore` comments in exception handlers.

---

### 6. Pokemon Exception (Catch 'em All)
**Why bad**: Catching generic `Exception` or `Error` hides unexpected failures; can't distinguish expected from unexpected errors.

**Wrong**:
```javascript
try {
  await database.query(sql);
} catch (e) {
  console.log("Query failed");
  return null;
}
```

**Correct**:
```javascript
try {
  await database.query(sql);
} catch (e) {
  if (e instanceof ValidationError) {
    logger.warn("Invalid query", { error: e.message });
    return null;
  }
  logger.error("Database error", { error: e });
  throw e;
}
```

**Detect**: `except Exception`, `catch (e)` without type checking; no differentiation between error types.

---

### 7. Error as Control Flow
**Why bad**: Using exceptions for normal logic (not exceptional) is slow and confusing; exceptions are for exceptional cases.

**Wrong**:
```python
def find_user(user_id):
    try:
        return users[user_id]
    except KeyError:
        return None
```

**Correct**:
```python
def find_user(user_id):
    return users.get(user_id)
```

**Detect**: Try-catch blocks expected to execute normally; exception handling for predictable flows; performance issues in tight loops with exceptions.

---

## Category 3: Performance

### 8. N+1 Query
**Why bad**: Database query in a loop causes exponential queries (1 parent + N children = N+1); massive performance penalty.

**Wrong**:
```python
users = User.query.all()
for user in users:
    print(user.posts.count())  # Query in loop!
```

**Correct**:
```python
users = User.query.options(
    selectinload(User.posts)
).all()
for user in users:
    print(len(user.posts))  # No query
```

**Detect**: Database query inside `for` or `map`; lazy-loaded relationships used in loops; query count = expected rows + 1.

---

### 9. Premature Optimization
**Why bad**: Optimizing without profiling wastes effort on non-bottlenecks; complex code without measurable gain.

**Wrong**:
```javascript
const result = new Map();  // "Maps are faster"
for (const item of items) {
  result.set(item.id, item);
}
```

**Correct**:
```javascript
// Profile first, use simple approach
const result = items.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
// If profiling shows bottleneck, then optimize
```

**Detect**: Micro-optimizations without benchmarks; complex algorithms used for tiny datasets; comments like "performance hack".

---

### 10. Memory Leak
**Why bad**: Unclosed resources or lingering references prevent garbage collection; memory grows unbounded.

**Wrong**:
```javascript
function setupListener() {
  element.addEventListener('click', callback);
  // Never removed!
}
```

**Correct**:
```javascript
function setupListener() {
  element.addEventListener('click', callback);
  return () => element.removeEventListener('click', callback);
}
```

**Detect**: Event listeners without cleanup; circular references; growing memory in heap snapshots; resources opened in try without finally/with.

---

## Category 4: Security

### 11. Hardcoded Secrets
**Why bad**: API keys, passwords in source code are exposed in repositories, logs, and backups.

**Wrong**:
```python
API_KEY = "sk-abc123xyz"
DATABASE_PASSWORD = "super_secret"
```

**Correct**:
```python
import os
API_KEY = os.getenv("API_KEY")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")
```

**Detect**: String literals matching secret patterns (`sk-`, Bearer tokens); `config.py` or `.env` in git history; credentials in comments.

---

### 12. Unsanitized Input
**Why bad**: User input used directly in queries/HTML allows SQL injection, XSS, command injection.

**Wrong**:
```javascript
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
db.query(query);
```

**Correct**:
```javascript
const query = `SELECT * FROM users WHERE email = ?`;
db.query(query, [userInput]);  // Parameterized
```

**Detect**: Template strings in SQL/HTML queries; concatenation of user input; regex patterns with unescaped user values.

---

### 13. Insecure Defaults
**Why bad**: Debug mode or verbose errors in production expose internals; weak default credentials.

**Wrong**:
```python
DEBUG = True  # In production!
VERBOSE_ERRORS = True  # Stack traces to users
SECRET_KEY = "changeme"
```

**Correct**:
```python
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
VERBOSE_ERRORS = DEBUG
SECRET_KEY = os.getenv("SECRET_KEY")
```

**Detect**: `DEBUG=True` in config files; stack traces in error responses; default passwords; overly permissive CORS.

---

## Category 5: Maintainability

### 14. Boolean Blindness
**Why bad**: Multiple boolean parameters are hard to read at call site; unclear which is which without looking at function signature.

**Wrong**:
```typescript
function createUser(name: string, isAdmin: boolean, isActive: boolean, sendEmail: boolean) {
  // Call site: createUser("Alice", true, false, true) — unclear!
}
```

**Correct**:
```typescript
interface UserOptions {
  isAdmin: boolean;
  isActive: boolean;
  sendEmail: boolean;
}
function createUser(name: string, options: UserOptions) {
  // Call site: createUser("Alice", { isAdmin: true, isActive: false, sendEmail: true })
}
```

**Detect**: Functions with 2+ boolean parameters; call sites with naked `true`/`false`; difficulty inferring intent.

---

### 15. Primitive Obsession
**Why bad**: Using strings/ints for domain concepts loses type safety; validation scattered across codebase.

**Wrong**:
```java
String status = "PENDING";  // What are valid values?
String userId = "usr_123";  // Is this really a string?
```

**Correct**:
```java
enum UserStatus { PENDING, ACTIVE, INACTIVE }
record UserId(String value) {
  public UserId {
    if (!value.startsWith("usr_")) throw new IllegalArgumentException();
  }
}
```

**Detect**: Validation logic in multiple functions; strings representing enums; no type safety for domain IDs.

---

### 16. Feature Envy
**Why bad**: Method uses another object's data/methods more than its own; indicates misplaced logic.

**Wrong**:
```python
class OrderService:
    def calculate_total(self, order):
        total = 0
        for item in order.items:
            total += item.price * item.quantity
            total -= item.discount
        return total
```

**Correct**:
```python
class Order:
    def calculate_total(self):
        return sum(item.calculate_subtotal() for item in self.items)

class OrderService:
    def process(self, order):
        return order.calculate_total()
```

**Detect**: Methods accessing other objects' fields more than own; excessive parameter chaining; `obj1.obj2.obj3.field`.

---

## Framework-Specific Extensions

### React
- **Prop Drilling**: Passing props through multiple levels instead of context/state management
- **useEffect Dependency Issues**: Missing dependencies causing stale closures; dependencies that change too often
- **Inline Components**: Defining components inside render causing re-mounts and lost state

### Python
- **Mutable Default Arguments**: `def func(items=[]):` causes shared state across calls
- **Global State Abuse**: Excessive module-level globals instead of dependency injection
- **Bare Except**: `except:` catching system exits and interrupts

### Java
- **Checked Exception Abuse**: Wrapping checked exceptions without adding value
- **God Service Classes**: Single service handling all domain logic
- **Tight Coupling to Frameworks**: Leaking framework specifics into domain logic

### Go
- **Ignoring Errors with `_`**: Swallowing errors as `_ = operation()`
- **Goroutine Leaks**: Background goroutines never terminated; channels never closed
- **Defer in Loops**: Deferring cleanup inside loops causes unbounded memory growth
