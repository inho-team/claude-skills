# Lint & Typecheck Commands Reference

Quick mapping of file extensions to linting, type-checking, and formatting commands with auto-fix options.

## Extension → Lint Command Mapping

| Extension | Language | Lint Command | Auto-fix Command | Type Check | Config File |
|-----------|----------|-------------|-----------------|------------|-------------|
| .js | JavaScript | `npx eslint {file}` | `npx eslint --fix {file}` | — | .eslintrc* |
| .ts/.tsx | TypeScript | `npx eslint {file}` | `npx eslint --fix {file}` | `npx tsc --noEmit` | tsconfig.json |
| .py | Python | `ruff check {file}` | `ruff check --fix {file}` | `mypy --strict {file}` | pyproject.toml |
| .java | Java | `checkstyle -c /sun_checks.xml {file}` | — | `javac {file}` | .checkstyle.xml |
| .go | Go | `golangci-lint run {file}` | `gofmt -w {file}` | `go vet ./...` | .golangci.yml |
| .rs | Rust | `cargo clippy` | `cargo clippy --fix` | `cargo check` | clippy.toml |
| .cpp/.h | C++ | `clang-tidy {file}` | `clang-tidy --fix-errors {file}` | — | .clang-tidy |
| .cs | C# | `dotnet format {file}` | `dotnet format {file}` | `dotnet build` | .editorconfig |
| .kt | Kotlin | `ktlint {file}` | `ktlint -F {file}` | — | .editorconfig |
| .swift | Swift | `swiftlint lint {file}` | `swiftlint --fix` | `swiftc -typecheck {file}` | .swiftlint.yml |
| .php | PHP | `phpcs {file}` | `phpcbf {file}` | `phpstan analyse {file}` | phpcs.xml |
| .rb | Ruby | `rubocop {file}` | `rubocop -a {file}` | `sorbet tc` | .rubocop.yml |
| .dart | Dart | `dart analyze {file}` | `dart fix --apply` | — | analysis_options.yaml |
| .sql | SQL | `sqlfluff lint {file}` | `sqlfluff fix {file}` | — | .sqlfluff |
| .css/.scss | CSS/SCSS | `npx stylelint {file}` | `npx stylelint --fix {file}` | — | .stylelintrc* |
| .vue | Vue | `npx eslint {file}` | `npx eslint --fix {file}` | `vue-tsc --noEmit` | .eslintrc* |
| .json | JSON | `npx jsonlint {file}` | `npx prettier --write {file}` | — | .prettierrc |
| .yaml/.yml | YAML | `yamllint {file}` | — | — | .yamllint |

## Formatter Mapping (Separate from Linter)

| Language | Formatter | Command | Config File |
|----------|-----------|---------|-------------|
| JS/TS | Prettier | `npx prettier --write {file}` | .prettierrc, .prettierrc.json |
| Python | Black | `black {file}` | pyproject.toml |
| Go | gofmt | `gofmt -w {file}` | — |
| Rust | rustfmt | `rustfmt {file}` | rustfmt.toml |
| Java | google-java-format | `google-java-format -i {file}` | — |
| C++ | clang-format | `clang-format -i {file}` | .clang-format |
| Dart | dart format | `dart format {file}` | — |
| Kotlin | ktlint | `ktlint -F {file}` | .editorconfig |

## Project Config Detection

How to detect if a project uses a specific tool (check file existence):

**JavaScript/TypeScript:**
- ESLint: `.eslintrc`, `.eslintrc.js`, `.eslintrc.json`, `.eslintrc.yml`, `eslint.config.js`
- Prettier: `.prettierrc`, `.prettierrc.js`, `.prettierrc.json`, `prettier.config.js`, `package.json` (`prettier` key)

**Python:**
- Ruff: `pyproject.toml`, `.ruff.toml`, `ruff.toml`
- Black: `pyproject.toml`, `setup.cfg`
- MyPy: `mypy.ini`, `pyproject.toml`, `setup.cfg`

**Go:**
- Golangci-lint: `.golangci.yml`, `.golangci.yaml`, `.golangci.json`

**Rust:**
- Clippy: `Cargo.toml`, `clippy.toml`

**Java:**
- Checkstyle: `.checkstyle.xml`, `checkstyle.xml`

**C++:**
- Clang-tidy: `.clang-tidy`
- Clang-format: `.clang-format`

**CSS/SCSS:**
- Stylelint: `.stylelintrc`, `.stylelintrc.js`, `.stylelintrc.json`, `.stylelintrc.yml`

**Ruby:**
- Rubocop: `.rubocop.yml`, `rubocop.yml`

**SQL:**
- SQLFluff: `.sqlfluff`, `setup.cfg`

**YAML:**
- Yamllint: `.yamllint`, `.yamllint.yaml`, `.yamllint.yml`

## Usage Notes

- Replace `{file}` with the target file path when running commands
- Most linters support glob patterns: `eslint src/**/*.ts`
- Use `--fix` or equivalent auto-fix flag to automatically correct issues
- Type-check commands typically run on the entire project, not individual files
- For monorepos, adjust paths relative to the workspace root
- Check `package.json` or project root for tool configuration before assuming defaults
