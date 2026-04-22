# Contract Validator

계약 파서의 출력을 검증하는 모듈의 동작을 정의합니다.

---

## Signature

```ts
type ValidationResult = {
  valid: boolean;
  missing: string[]; // ordered subset of ['signature','purpose','constraints','invariants','errorModes']
};

function validateContract(parsed: unknown): ValidationResult;
```

## Purpose

`validateContract`는 `parseContract`의 출력을 검증합니다. 필수 5개 섹션(signature, purpose, constraints, invariants, errorModes)이 모두 존재하고 비어있지 않은지 확인합니다. `flow` 섹션은 선택사항이며 `missing` 배열에 절대 포함되지 않습니다.

## Constraints

- 필수 키(비어있지 않은 문자열이어야 함): `signature`, `purpose`, `constraints`, `invariants`, `errorModes`
- 선택사항 키: `flow` (null/공백은 가능)
- null, undefined, 또는 공백만 있는 문자열은 누락된 것으로 처리됨
- `missing` 배열은 필수 섹션 선언 순서대로 정렬됨 (결정론적)
- null/undefined/non-object 입력을 받아도 예외를 던지지 않고 "모든 필수 섹션 누락"으로 처리함

## Invariants

- `valid === (missing.length === 0)`
- `flow`는 절대 `missing` 배열에 포함되지 않음
- 공백만 있는 문자열 body는 null과 동등하게 누락으로 감지됨
- 함수는 total: 어떤 입력에도 예외를 던지지 않음
- `missing`의 순서는 실행 간 안정적 (결정론적)

## Error Modes

```ts
// validateContract는 total이며 절대 예외를 던지지 않음
never: Error;
```
