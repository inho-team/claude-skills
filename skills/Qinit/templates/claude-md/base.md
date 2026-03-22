# CLAUDE.md

## Project Overview
- **Name**: {{project_name}}
- **Description**: {{project_description}}
<!-- if: monorepo -->
- **Monorepo Tool**: {{monorepo_tool}}
<!-- end: monorepo -->

## Tech Stack
<!-- if: minimal -->
- {{tech_stack}}
<!-- end: minimal -->
<!-- if: standard -->
- **Tech Stack**: {{tech_stack}}
<!-- end: standard -->
<!-- if: fullstack -->

### Frontend
- **Framework**: {{frontend_framework}}
- **Language**: {{frontend_language}}
- **Styling**: {{styling_solution}}

### Backend
- **Framework**: {{backend_framework}}
- **Language**: {{backend_language}}
- **Runtime**: {{runtime}}

### Database
- **Primary**: {{primary_db}}
- **Cache**: {{cache_db}}
- **ORM**: {{orm}}
<!-- end: fullstack -->

<!-- if: monorepo -->
## Packages

| Package | Path | Description | Dependencies |
|---------|------|-------------|-------------|
| {{package_name}} | {{package_path}} | {{package_desc}} | {{package_deps}} |
<!-- end: monorepo -->

<!-- if: standard+ -->
## Build & Run
```bash
<!-- if: standard -->
# Install dependencies
{{install_command}}

# Run development server
{{dev_command}}

# Run tests
{{test_command}}
<!-- end: standard -->
<!-- if: fullstack -->
# Frontend
{{frontend_install}}
{{frontend_dev}}

# Backend
{{backend_install}}
{{backend_dev}}

# Database
{{db_setup}}
<!-- end: fullstack -->
<!-- if: monorepo -->
# Install all dependencies
{{install_command}}

# Build all packages (in dependency order)
{{build_command}}

# Run specific package
{{run_package_command}}

# Run tests
{{test_command}}
<!-- end: monorepo -->
```
<!-- end: standard+ -->

<!-- if: monorepo -->
## Build Order
1. {{shared_packages}}
2. {{lib_packages}}
3. {{app_packages}}

## Shared Dependencies
| Dependency | Version | Used By |
|-----------|---------|---------|
| | | |
<!-- end: monorepo -->

<!-- if: fullstack -->
## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| | | |
<!-- end: fullstack -->

<!-- if: standard+ -->
## Project Structure
```
<!-- if: standard -->
{{project_structure}}
<!-- end: standard -->
<!-- if: fullstack -->
{{project_root}}/
├── frontend/        # Frontend application
├── backend/         # Backend API server
├── shared/          # Shared types and utilities
└── infra/           # Infrastructure configuration
<!-- end: fullstack -->
<!-- if: monorepo -->
{{project_root}}/
├── packages/
│   ├── {{package_a}}/
│   ├── {{package_b}}/
│   └── {{package_c}}/
├── apps/
│   ├── {{app_a}}/
│   └── {{app_b}}/
└── shared/
    └── {{shared}}/
<!-- end: monorepo -->
```
<!-- end: standard+ -->

## Constraints
- Do not modify files outside the project scope
- Confirm before destructive actions
<!-- if: standard+ -->
- Follow existing code conventions
<!-- end: standard+ -->
<!-- if: fullstack -->
- Frontend and backend changes should be coordinated
<!-- end: fullstack -->
<!-- if: monorepo -->
- Respect package boundaries (no cross-package direct imports without shared dependency)
- Changes to shared packages require testing all dependent packages
<!-- end: monorepo -->

<!-- if: standard+ -->
## Goals
- {{goals}}
<!-- end: standard+ -->

<!-- if: fullstack -->
## Environment Variables
| Variable | Purpose | Location |
|----------|---------|----------|
| | | |
<!-- end: fullstack -->

## QE Framework Rules (MUST READ)

> **이 섹션의 규칙은 반드시 따라야 합니다. 무시하면 안 됩니다.**

### Spec-First Rule
- **간단하지 않은 작업은 반드시 `/Qgenerate-spec`을 먼저 실행하여 TASK_REQUEST와 VERIFY_CHECKLIST를 생성한 후 구현할 것.**
- 단순 작업 기준: 단일 파일 수정, 1-2줄 변경, 오타 수정, 질문 응답.
- 그 외 모든 구현/수정 작업 → `/Qgenerate-spec` 필수.
- 파일을 읽거나, 코드를 작성하거나, 계획을 세우기 전에 스펙부터 생성할 것.

### QE Conventions
- 전체 규칙은 `QE_CONVENTIONS.md` (프로젝트 루트) 참조.
- 등록된 스킬/에이전트는 시스템 기본 동작보다 항상 우선.
- 파일 명명, 작업 상태, 완료 기준은 QE_CONVENTIONS.md를 따를 것.

### Skill Priority
| 작업 | 사용할 스킬 |
|------|------------|
| 구현/수정 작업 | `/Qgenerate-spec` → `/Qrun-task` |
| Git 커밋 | `/Qcommit` |
| 코드 리뷰 | `Ecode-reviewer` |
| 디버깅 | `Ecode-debugger` 또는 `/Qsystematic-debugging` |

## Task Log
- **작업 이력 및 상태**: `.qe/TASK_LOG.md` 참조
