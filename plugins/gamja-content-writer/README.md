# Gamja Content Writer Plugin

SNS 콘텐츠 작성 및 MDX 콘텐츠 관리를 위한 Claude Code 플러그인입니다.

## 기능

### Skills (자동 적용)
Claude가 작업 컨텍스트에 따라 자동으로 사용합니다.

| Skill | 설명 |
|-------|------|
| `threads-writer` | Threads 게시물 작성 가이드. 어투, 킥 문장, 구조화 등 |
| `threads-to-instagram` | Threads → Instagram caption 변환 가이드 |

### Agents (Task 도구로 호출)
서브에이전트로 실행됩니다. 플러그인 설치 후 네임스페이스 접두사가 붙습니다.

| Agent | 설명 | 비고 |
|-------|------|------|
| `mdx-content-refiner` | MDX 파일 개선 및 다듬기 | 프로젝트별 커스터마이징 권장 |
| `linear-mdx-writer` | Linear 이슈 기반 MDX 작성 | 프로젝트별 커스터마이징 권장 |
| `image-to-problem` | 시험 문제 이미지 → MDX 변환 | 프로젝트별 커스터마이징 권장 |

## 설치

### 마켓플레이스에서 설치
```shell
# 마켓플레이스 추가
/plugin marketplace add oooo12-git/claude-gamja-marketplace

# 플러그인 설치
/plugin install gamja-content-writer@gamja-marketplace
```

### 로컬 테스트
```bash
claude --plugin-dir ./plugins/gamja-content-writer
```

## 사용 예시

### Threads 작성 (자동)
쓰레드 작성 요청 시 Claude가 threads-writer 스킬을 자동으로 활용합니다.

```
> 정보처리기사 원서접수 안내 쓰레드 작성해줘
```

### Instagram 변환 (자동)
인스타그램 변환 요청 시 threads-to-instagram 스킬을 자동으로 활용합니다.

```
> 이 쓰레드를 인스타그램 캡션으로 바꿔줘
```

### MDX 개선 (에이전트)
MDX 파일 개선 시 mdx-content-refiner 에이전트가 호출됩니다.

```
> 이 MDX 파일 다듬어줘
```

## 프로젝트별 커스터마이징

MDX 관련 에이전트들(`mdx-content-refiner`, `linear-mdx-writer`, `image-to-problem`)은
특정 프로젝트 구조에 맞춰 작성되어 있습니다.

다른 프로젝트에서 사용하려면 다음 부분을 수정하세요:

1. **mdx-content-refiner.md**: 강조 계층, 컴포넌트 규칙, metadata 형식
2. **linear-mdx-writer.md**: 디렉토리 구조, MDX 패턴
3. **image-to-problem.md**: 컴포넌트 형식, ID 규칙, 파일 위치

## 디렉토리 구조

```
gamja-content-writer/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── threads-writer/
│   │   ├── SKILL.md
│   │   └── references.md
│   └── threads-to-instagram/
│       ├── SKILL.md
│       └── references.md
├── agents/
│   ├── mdx-content-refiner.md
│   ├── linear-mdx-writer.md
│   └── image-to-problem.md
└── README.md
```

## 라이선스

MIT
