# notion

노션에서 사용자가 지정한 페이지를 찾고, 요청한 작업을 수행합니다.

## 실행 프로세스

### 1. Claude Code Rules 확인
- 반드시 'Claude Code Rules' 페이지의 내용을 먼저 읽고 확인
- 해당 페이지의 모든 규칙을 엄수한 후에만 작업 수행
- 규칙 페이지를 찾을 수 없는 경우 작업 중단하고 사용자에게 알림

### 2. 페이지 검색
- $ARGUMENTS에서 페이지 이름 추출
- notion_search 도구를 사용하여 페이지 검색
- 여러 결과가 있을 경우 사용자에게 확인 요청

### 3. 작업 수행
사용자가 요청한 작업에 따라:

#### 읽기 작업
- notion_retrieve_page로 페이지 내용 읽기
- notion_retrieve_block_children으로 하위 블록 확인
- markdown 형식으로 내용 표시

#### 수정 작업
- 기존 내용 백업 (Claude Code Logs에 기록)
- notion_update_block 또는 notion_update_page_properties 사용
- 변경사항 요약 제공

#### 추가 작업  
- notion_append_block_children으로 콘텐츠 추가
- 적절한 블록 타입 선택 (paragraph, heading, bulleted_list_item 등)

#### 데이터베이스 작업
- notion_query_database로 항목 조회
- notion_create_database_item으로 새 항목 추가
- 필터링 및 정렬 옵션 적용

### 4. 작업 완료 보고
- 수행한 작업 요약
- 변경사항이 있을 경우 Claude Code Logs에 기록
- 추가 작업이 필요한지 확인

## 주의사항

### 절대 금지사항
- 삭제 작업 (Archive만 허용)
- 데이터베이스 속성 변경
- Claude Code Rules 무시

### 필수 작업
- 모든 수정 시 Claude Code Logs에 이전/이후 내용 기록
- 작업 전 반드시 Claude Code Rules 페이지 확인
- 페이지 ID 형식 검증 (8-4-4-4-12 형식)

### 오류 처리
- 페이지를 찾을 수 없는 경우: 검색어 변경 제안
- 권한 오류: 권한 확인 요청
- 네트워크 오류: 재시도 후 실패 시 보고

## 사용 예시
```
/notion "프로젝트 계획" 읽어줘
/notion "회의록" 에 오늘 날짜로 새 섹션 추가해줘  
/notion "할 일" 데이터베이스에서 오늘 마감인 항목 보여줘
/notion "Claude Code Rules" 확인하고 "문서 A" 수정해줘
```

## 플래그 옵션
- --format json: JSON 형식으로 결과 반환
- --format markdown: Markdown 형식으로 결과 반환 (기본값)
- --verbose: 상세한 작업 로그 표시
- --dry-run: 실제 수정 없이 작업 계획만 표시