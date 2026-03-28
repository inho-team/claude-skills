# Terminal Encoding Notes

## Why CJK Text Can Look Broken On Windows

On Windows PowerShell 5.1, UTF-8 files without a BOM are often interpreted with the active ANSI code page instead of UTF-8.

In this environment:
- PowerShell: `5.1`
- Active code page: `949`

That combination can make Korean, Japanese, and Chinese Markdown files appear corrupted even when the file bytes are correct UTF-8.

## Repository Policy

QE uses:
- `utf-8` for general text files
- `utf-8-bom` for translated landing pages that are often opened with Windows PowerShell 5.1

Current BOM-protected files:
- `docs/README.ko.md`
- `docs/README.ja.md`
- `docs/README.zh.md`

This rule is documented in [../.editorconfig](../.editorconfig).

## Recommended Windows Commands

If you want Unicode-safe terminal output in older PowerShell sessions, run:

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

Then reopen the file:

```powershell
Get-Content docs/README.ko.md
Get-Content docs/README.ja.md
Get-Content docs/README.zh.md
```

## Scope

This does not change framework logic.
It only makes multilingual documentation more reliable across Windows terminal environments.
