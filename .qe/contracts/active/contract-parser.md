# Contract Parser

계약 마크다운 문서를 파싱하여 6개의 시맨틱 섹션으로 추출하는 모듈의 동작을 정의합니다.

---

## Signature

```ts
type ParsedContract = {
  signature: string | null;
  purpose: string | null;
  constraints: string | null;
  flow: string | null;
  invariants: string | null;
  errorModes: string | null;
};

function parseContract(text: unknown): ParsedContract;
```

## Purpose

계약 마크다운 문서를 파싱하여 6개의 시맨틱 섹션으로 추출합니다.
섹션 헤더(`## Signature`, `## Purpose`, `## Constraints`, `## Flow`, `## Invariants`, `## Error Modes`)는 줄의 시작에서 대소문자를 무시하고 인식되며, 알 수 없는 `##` 섹션은 무시됩니다.

## Constraints

- 섹션 헤더는 줄의 시작(`^## ` 정규식, 멀티라인 모드)에 위치해야 함
- 펜스 코드 블록(```) 내의 `## ` 시퀀스는 헤더로 처리되지 않음
- 섹션 이름은 공백 제거 후 대소문자를 무시하고 매칭됨
- 중복 섹션 — 첫 번째 발생이 우선, 이후는 무시됨
- 입력 타입이 비문자열 또는 빈 문자열 → 6개 키 모두 null (절대 throw 없음)

## Flow

선택사항 — 건너뜀.

## Invariants

- 정확히 `{ signature, purpose, constraints, flow, invariants, errorModes }` 형태 반환 — 항상 6개 키
- 각 값은 트림된 비어있지 않은 문자열 또는 null
- 파서는 전체(total): 어떤 입력(null, undefined, 숫자, 객체 포함)에서도 throw 없음
- 본문은 자신의 헤더 라인과 다음 `##` 헤더 라인 제외
- 대소문자 무시: `## SIGNATURE`와 `## Signature`는 동일한 키 생성

## Error Modes

```ts
// parseContract은 전체(total); 절대 throw 없음.
// 잘못된 입력은 모두 null 결과 생성.
never: Error;
```

---

## Notes

- 섹션 추출 순서와 상관없이 항상 6개 키가 반환됨 (누락된 섹션은 null)
- 헤더 라인 자체는 본문에 포함되지 않음
- 다음 헤더 이전의 공백 라인과 마지막 섹션 이후의 콘텐츠는 포함되지 않음
