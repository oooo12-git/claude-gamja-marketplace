# Gamja Marketplace

Claude Code 플러그인 마켓플레이스입니다.

## 설치 방법

### 1. 마켓플레이스 추가
```shell
/plugin marketplace add oooo12-git/claude-gamja-marketplace
```

### 2. 플러그인 설치
```shell
# 콘텐츠 작성 플러그인
/plugin install gamja-content-writer@gamja-marketplace

# MCP 서버 가이드
/plugin install gamja-mcp@gamja-marketplace
```

## 플러그인 목록

### gamja-content-writer

SNS 콘텐츠 작성 및 MDX 콘텐츠 관리를 위한 플러그인

**Skills (자동 적용)**
| Skill | 설명 |
|-------|------|
| `threads-writer` | Threads 게시물 작성 가이드 |
| `threads-to-instagram` | Threads → Instagram 변환 |

**Agents**
| Agent | 설명 |
|-------|------|
| `mdx-content-refiner` | MDX 파일 개선 |
| `linear-mdx-writer` | Linear 이슈 기반 MDX 작성 |
| `image-to-problem` | 시험 문제 이미지 → MDX 변환 |

---

### gamja-mcp

jcg-gamza 교육 콘텐츠 접근을 위한 MCP 서버 설정 가이드

**MCP Tools**
| Tool | 설명 |
|------|------|
| `list_subjects` | 이론 과목 목록 조회 |
| `list_theory_files` | 이론 파일 목록 조회 |
| `read_theory` | 이론 내용 조회 |
| `search_content` | 콘텐츠 검색 |
| `extract_patterns` | 키워드 패턴 추출 |

> **Note**: 플러그인 설치 후 MCP 서버 설정을 직접 추가해야 합니다. 자세한 내용은 플러그인 README 참조.

## 로컬 테스트

```bash
# 마켓플레이스 검증
claude plugin validate ./claude-gamja-marketplace

# 로컬 마켓플레이스 추가
/plugin marketplace add ./claude-gamja-marketplace

# 플러그인 설치
/plugin install gamja-content-writer@gamja-marketplace
/plugin install gamja-mcp@gamja-marketplace
```

## 디렉토리 구조

```
claude-gamja-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   ├── gamja-content-writer/
│   │   ├── .claude-plugin/
│   │   ├── skills/
│   │   ├── agents/
│   │   └── README.md
│   └── gamja-mcp/
│       ├── .claude-plugin/
│       └── README.md
└── README.md
```

## 라이선스

MIT
