# Gamja MCP Server

jcg-gamza 교육 콘텐츠에 접근하기 위한 MCP(Model Context Protocol) 서버입니다.

## 기능

| Tool | 설명 |
|------|------|
| `list_subjects` | 이론 과목 목록 조회 |
| `list_theory_files` | 특정 과목의 이론 파일 목록 조회 |
| `read_theory` | 특정 이론 파일의 전체 MDX 내용 조회 |
| `search_content` | 콘텐츠에서 키워드 검색 |
| `extract_patterns` | 키워드 표 패턴 추출 (에이전트 개발용) |
| `list_exam_registration_files` | 시험 응시(접수) 파일 목록 조회 |
| `read_exam_registration` | 시험 응시(접수) 파일 내용 조회 |

## 설치 및 설정

### 방법 1: Remote MCP (Cloudflare Workers) - 권장

URL과 토큰만으로 어디서든 사용할 수 있습니다.

#### Claude Code에서 설정

`~/.claude/settings.json` 또는 프로젝트의 `.claude/settings.json`:

```json
{
  "mcpServers": {
    "gamja-mcp": {
      "type": "url",
      "url": "https://gamja-mcp-server.<your-subdomain>.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_AUTH_TOKEN>"
      }
    }
  }
}
```

#### Claude Desktop에서 설정

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gamja-mcp": {
      "url": "https://gamja-mcp-server.<your-subdomain>.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_AUTH_TOKEN>"
      }
    }
  }
}
```

## 사용 예시

MCP 서버 설정 후 Claude에서:

```
> db 과목 이론 목록 보여줘
> sql-basics 내용 읽어줘
> "정규화" 키워드로 검색해줘
> 시험 접수 관련 파일 보여줘
```

## 개발 및 배포

이 플러그인에는 Cloudflare Workers로 배포 가능한 MCP 서버 소스코드가 포함되어 있습니다.

### 로컬 개발

```bash
cd plugins/gamja-mcp

# 의존성 설치
npm install

# 로컬 테스트
npm run dev
```

### Cloudflare Workers 배포

```bash
# 1. Cloudflare 로그인
npx wrangler login

# 2. 시크릿 설정
# 인증 토큰 생성
openssl rand -base64 32
npx wrangler secret put MCP_AUTH_TOKEN

# API 키 설정
npx wrangler secret put MCP_API_KEY

# 3. 배포
npm run deploy

# Preview 환경 배포
npm run deploy:preview
```

배포 후 URL: `https://gamja-mcp-server.<your-subdomain>.workers.dev`

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `JCG_GAMJA_API_URL` | jcg-gamza API 기본 URL | `https://jeongcheogi.edugamja.com` |
| `MCP_AUTH_TOKEN` | Bearer 토큰 인증용 (시크릿) | - |
| `MCP_API_KEY` | jcg-gamza API 인증 키 (시크릿) | - |

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│              jcg-gamza (Vercel 배포)                 │
│  └── /api/content/* (콘텐츠 API)                    │
└─────────────────────────────────────────────────────┘
                    ▲
                    │ HTTP API 호출
                    │
┌─────────────────────────────────────────────────────┐
│       gamja-mcp-server (Cloudflare Workers)         │
│  └── MCP Tools + Bearer Token 인증                  │
│  └── /mcp 엔드포인트                                │
└─────────────────────────────────────────────────────┘
                    ▲
                    │ HTTPS + Bearer Token
                    │
    ┌───────────┬───────────┬───────────┐
    │  Claude   │  Cursor   │ Claude    │
    │  Desktop  │           │ Code      │
    └───────────┴───────────┴───────────┘
```

## 라이선스

MIT
