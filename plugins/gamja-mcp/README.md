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

## 설치 후 설정 필요

이 플러그인은 MCP 서버 설정 가이드입니다. 플러그인 설치 후 아래 설정을 직접 추가해야 합니다.

### 방법 1: Remote MCP (Cloudflare Workers) - 권장

#### Claude Code에서 설정

`~/.claude/settings.json` 또는 프로젝트의 `.claude/settings.json`에 추가:

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

**필요 정보:**
- `<your-subdomain>`: Cloudflare Workers subdomain
- `<YOUR_AUTH_TOKEN>`: MCP 인증 토큰

### 방법 2: 로컬 설치 (stdio)

#### 1. 레포 클론 및 빌드

```bash
git clone https://github.com/oooo12-git/gamja-mcp-server.git
cd gamja-mcp-server
npm install
npm run build
```

#### 2. Claude Code에서 설정

`~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "gamja-mcp": {
      "command": "node",
      "args": ["/path/to/gamja-mcp-server/build/index.js"]
    }
  }
}
```

## 사용 예시

MCP 서버 설정 후 Claude Code에서:

```
> db 과목 이론 목록 보여줘
> sql-basics 내용 읽어줘
> "정규화" 키워드로 검색해줘
```

## 저장소

- GitHub: https://github.com/oooo12-git/gamja-mcp-server

## 라이선스

MIT
