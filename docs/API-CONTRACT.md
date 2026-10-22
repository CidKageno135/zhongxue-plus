# ZhongXue V2 — Shared API Contract & Architecture Specification

> **Version:** 2.0.0  
> **Date:** 2026-10-21  
> **Status:** APPROVED & LOCKED  
> **Integration Architect:** Subagent A01  
> **Affected Agents:** A01 (Integration), A02 (Server), A03 (Security), A04 (Validation & Errors), A05 (AI Connector), A06 (Dictionary Engine), A07 (Normalization), A08 (Client Adapter), A16 (QA API Security)

---

## 1. Kiến trúc tổng thể & Nguyên tắc không phân kỳ (Zero-Divergence)

### 1.1 Vấn đề kiến trúc ở phiên bản trước
Ở phiên bản v1, toàn bộ API (`/api/health`, `/api/dictionary`, `/api/conversation`, `/api/handwriting`) chỉ được đăng ký trong hook `configureServer` của `src/viteApiPlugin.ts`. Do đó:
1. Khi chạy preview của bản build (`vite preview`) hoặc môi trường production độc lập, mọi request `/api/*` trả về HTTP 200 nhưng nội dung là HTML của ứng dụng Single Page App (SPA fallback).
2. Tồn tại rủi ro bảo mật nghiêm trọng: request từ client có thể gửi `baseUrl` tùy ý và server tự động gắn `Authorization: Bearer <SERVER_API_KEY>` vào header gửi tới đích đó.
3. Không có cơ chế timeout nhất quán, dẫn đến treo spinner trên giao diện quá 15 giây.

### 1.2 Kiến trúc hợp nhất v2 (Zero-Divergence Architecture)
Hệ thống v2 chuẩn hóa một Request Router duy nhất tại `server/app.ts`, được tái sử dụng 100% giữa hai môi trường:
- **Production (`npm run start`):** Standalone HTTP server (`server/index.ts`) nạp cấu hình, khởi tạo từ điển, gắn middleware router `server/app.ts`, và phục vụ các tệp tĩnh từ thư mục `dist/` trên cùng origin (`127.0.0.1:3000` hoặc `$PORT`).
- **Development (`npm run dev`):** Vite Plugin (`src/viteApiPlugin.ts`) chỉ đóng vai trò là một adapter mỏng, chuyển tiếp mọi request `/api/*` vào chính router `server/app.ts`.
- **Tuyệt đối không nhân đôi logic xử lý giữa dev và production.**

```
+-------------------------------------------------------------+
|                     Client Web App                          |
|         (src/services/api.ts - Subagent A08)                |
+-------------------------------------------------------------+
                              |
               Same-Origin HTTP Request (/api/*)
                              |
        +---------------------+---------------------+
        | (Development)                             | (Production)
        v                                           v
+-----------------------+               +-----------------------+
|  src/viteApiPlugin.ts |               |    server/index.ts    |
|   (Vite Dev Adapter)  |               | (Node.js Prod Server) |
+-----------------------+               +-----------------------+
        \                                           /
         \                                         /
          v                                       v
    +---------------------------------------------------+
    |                   server/app.ts                   |
    |            (Unified Request Dispatcher)           |
    +---------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+     +---------------+     +---------------+
| server/       |     | server/       |     | server/       |
| security.ts   |     | validation.ts |     | errors.ts     |
| (A03 Security)|     | (A04 Validate)|     | (A04 Errors)  |
+---------------+     +---------------+     +---------------+
        |                     |                     |
        +---------------------+---------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+     +---------------+     +---------------+
| /api/health   |     | /api/dict...  |     | /api/conv...  |
| /api/routes.ts|     | server/       |     | server/ai.ts  |
| (A02 Server)  |     | dictionary.ts |     | server/       |
|               |     | (A06 Engine)  |     | aiFallback.ts |
|               |     |       +       |     | (A05 Upstream)|
|               |     | searchNormal- |     +---------------+
|               |     | ization.ts    |             |
|               |     | (A07 Normal.) |     +---------------+
+---------------+     +---------------+     | /api/handw... |
                                            | (Handwriting) |
                                            +---------------+
```

---

## 2. Phân định trách nhiệm module & Quyền sở hữu tệp (File Ownership)

| Đường dẫn Module | Subagent Sở Hữu | Nhiệm vụ chính & Hợp đồng giao tiếp |
|---|---|---|
| `docs/API-CONTRACT.md` | **A01** (Integration) | Văn bản hợp đồng chuẩn, quy định DTO, HTTP status, timeout, security. |
| `package.json`, `tsconfig*.json`, `vite.config.ts`, `playwright*.config.ts` | **A01** (Integration) | Hạ tầng build, scripts kiểm thử (`test:security`, `test:integration`, `test:e2e:prod`, `start`), khai báo typecheck server. |
| `src/types.ts` | **A01** (Integration) | Khai báo canonical TypeScript interfaces/types dùng chung cho frontend và backend. |
| `src/viteApiPlugin.ts` | **A01** (Integration) | Vite plugin dev adapter mỏng nạp `server/app.ts`. |
| `server/index.ts` | **A02** (Prod Server) | Entry point production Node.js; bind loopback `127.0.0.1:3000`; phục vụ static `dist/`; graceful shutdown. |
| `server/app.ts` | **A02** (Prod Server) | Dispatcher request dùng chung; mount middleware router. |
| `server/routes.ts` | **A02** (Prod Server) | Định nghĩa routes cho 4 endpoint `/api/*`. Route lạ trả JSON 404. |
| `server/security.ts` | **A03** (Security) | Kiểm định URL, chặn rò rỉ khóa môi trường cho `baseUrl` lạ, kiểm định Origin/CORS. |
| `server/validation.ts` | **A04** (Validation) | Kiểm định JSON body, types, bounds, string length, query params, stroke coordinates. |
| `server/errors.ts` | **A04** (Errors) | Hàm chuẩn hóa phản hồi lỗi HTTP (`sendError`); mã hóa lỗi, giấu stack traces/secrets. |
| `server/ai.ts` | **A05** (AI Provider) | Kết nối upstream AI (AgentRouter, OpenRouter); quản lý AbortSignal; deadline 12s. |
| `server/aiFallback.ts` | **A05** (AI Fallback) | Bộ tạo phản hồi hướng dẫn cục bộ (guided fallback) thông minh cho 8 chủ đề Đài Loan; nhãn `guided` rõ ràng. |
| `server/dictionary.ts` | **A06** (Dictionary) | Động cơ tìm kiếm từ điển 122k (CVDICT); nạp gzip; lập chỉ mục; phân trang chuẩn; trả đúng tổng số kết quả. |
| `src/domain/searchNormalization.ts` | **A07** (Normalization)| Hàm thuần TypeScript: bỏ dấu tiếng Việt, chuẩn hóa Pinyin (`xuéshēng` -> `xuesheng`, `ü` -> `v`), bỏ khoảng trắng. Chạy được trên cả Node và Browser. |
| `src/services/api.ts` | **A08** (Client API) | Client adapter frontend: Same-origin `/api/*` (bỏ hardcode `:3001` ở prod), timeout/cancel, fallback offline, handwriting helper. |

---

## 3. Tiêu chuẩn mã lỗi HTTP & Định dạng Error Response (Envelope)

Mọi phản hồi lỗi từ tất cả các endpoint `/api/*` **bắt buộc** phải tuân theo cấu trúc JSON sau:

```typescript
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_JSON'
  | 'UNAUTHORIZED_BASE_URL'
  | 'FORBIDDEN_ORIGIN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';
```

### Bảng tra cứu mã trạng thái HTTP:
| Mã HTTP | Tên chuẩn | Khi nào sử dụng |
|---|---|---|
| `200 OK` | OK | Xử lý thành công (kể cả khi AI trả về guided fallback do upstream chậm). |
| `400 Bad Request` | Bad Request | Dữ liệu đầu vào sai schema, query rỗng/quá dài, offset âm, số nét viết tay bất thường, hoặc client truyền `baseUrl` tùy biến nhưng thiếu `apiKey`. |
| `403 Forbidden` | Forbidden | Yêu cầu vi phạm chính sách Origin/CORS hoặc cố tình truy cập tài nguyên bị cấm. |
| `404 Not Found` | Not Found | Route `/api/*` không tồn tại, hoặc tra cứu từ điển bằng `id` không tìm thấy bản ghi. *(Lưu ý: Không bao giờ trả về trang HTML 200 cho API không tồn tại).* |
| `405 Method Not Allowed`| Method Not Allowed | Dùng sai phương thức (ví dụ: `GET /api/conversation` hoặc `POST /api/health`). |
| `413 Payload Too Large` | Payload Too Large | Request body vượt quá giới hạn (ví dụ: conversation > 100KB, handwriting > 256KB). |
| `415 Unsupported Media` | Unsupported Media Type | Request POST thiếu header `Content-Type: application/json`. |
| `429 Too Many Requests` | Too Many Requests | Vượt quá tần suất gửi yêu cầu an toàn. |
| `502 Bad Gateway` | Bad Gateway | Upstream AI hoặc Upstream Handwriting trả về lỗi không thể khôi phục (nếu không áp dụng guided fallback). |
| `503 Service Unavailable`| Service Unavailable | Động cơ từ điển chưa tải xong hoặc tệp từ điển bị lỗi. |
| `504 Gateway Timeout` | Gateway Timeout | Upstream AI hoặc upstream handwriting không phản hồi trong deadline cho phép và client không chấp nhận fallback. |

> **Quy tắc an ninh nghiêm ngặt:** Không bao giờ trả về stack trace, đường dẫn tệp hệ thống trên đĩa, hoặc giá trị khóa API (`API_KEY`) trong phản hồi lỗi.

---

## 4. Chi tiết Hợp đồng từng Endpoint

### 4.1 Endpoint: `GET /api/health`

Kiểm tra trạng thái sẵn sàng của máy chủ, động cơ từ điển và kết nối AI.

- **Phương thức:** `GET`
- **Headers yêu cầu:** `Accept: application/json`
- **Mã HTTP:**
  - `200 OK`: Máy chủ hoạt động tốt, từ điển đã nạp thành công.
  - `503 Service Unavailable`: Máy chủ đang chạy nhưng từ điển chưa nạp xong hoặc nạp thất bại.
- **DTO Phản hồi (`HealthResponse`):**
```typescript
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  uptime: number; // Thời gian chạy tính theo giây
  timestamp: string; // ISO 8601 (ví dụ: "2026-10-21T12:00:00.000Z")
  dictionary: {
    loaded: boolean;
    totalEntries: number; // Số lượng bản ghi thực tế đã nạp (ví dụ: 122596), KHÔNG ĐƯỢC HARDCODE
    loadTimeMs?: number; // Thời gian nạp tệp từ điển tính bằng ms
  };
  ai: {
    configured: boolean; // true nếu server có khóa môi trường
    provider: string; // "agentrouter" | "openrouter" | "custom" | "none"
    model: string; // Tên model mặc định (ví dụ: "gpt-6.1-sol" hoặc "deepseek-v4-flash")
  };
  version: string; // Phiên bản ứng dụng (ví dụ: "2.0.0")
}
```

---

### 4.2 Endpoint: `GET /api/dictionary`

Tra cứu từ điển tiếng Hoa - tiếng Việt 122.000 bản ghi với hỗ trợ phân trang trung thực và xếp hạng ưu tiên khớp chính xác.

- **Phương thức:** `GET`
- **Tham số Query (Query Parameters):**
  - `q` *(string, tùy chọn nếu có `id`)*: Từ khóa tìm kiếm. Hỗ trợ Hán tự phồn thể/giản thể, Pinyin có dấu (`xuéshēng`), Pinyin không dấu (`xuesheng`), Pinyin số thanh (`xue2 sheng1`), tiếng Việt có dấu (`học sinh`), tiếng Việt không dấu (`hoc sinh`). Tối đa 100 ký tự.
  - `mode` *(string, tùy chọn, mặc định: `'all'`)*: Phạm vi tìm kiếm: `'all' | 'hanzi' | 'pinyin' | 'vi'`.
  - `offset` *(integer, tùy chọn, mặc định: `0`)*: Số thứ tự bản ghi bắt đầu, phải `>= 0`.
  - `limit` *(integer, tùy chọn, mặc định: `20`, tối đa `100`)*: Số lượng kết quả mỗi trang.
  - `id` *(string, tùy chọn)*: Tra cứu chi tiết một bản ghi cụ thể theo mã định danh (ví dụ: `?id=dict-1234` hoặc `?id=1234`).
- **Mã HTTP:**
  - `200 OK`: Tra cứu thành công.
  - `400 Bad Request`: `offset < 0`, `limit <= 0`, `limit > 100`, hoặc thiếu cả `q` lẫn `id`.
  - `404 Not Found`: Khi tra cứu theo `id` nhưng không tìm thấy bản ghi.
  - `503 Service Unavailable`: Động cơ từ điển chưa khởi tạo xong.

- **DTO Bản ghi từ điển (`DbDictionaryResult`):**
```typescript
export interface DbDictionaryResult {
  id: string; // Mã định danh duy nhất (string, ví dụ "dict-1024" hoặc "1024")
  traditional: string; // Chữ Hán phồn thể (ví dụ: "學生")
  simplified: string; // Chữ Hán giản thể (ví dụ: "学生")
  pinyin: string; // Phiên âm Pinyin chuẩn có dấu (ví dụ: "xué sheng")
  definitions: string[]; // Mảng các nét nghĩa tiếng Việt
}
```

- **DTO Phản hồi danh sách tìm kiếm (`DictionarySearchResponse`):**
```typescript
export interface DictionarySearchResponse {
  results: DbDictionaryResult[];
  total: number; // Tổng số bản ghi khớp TRÊN TOÀN BỘ CƠ SỞ DỮ LIỆU (KHÔNG DỪNG SỚM)
  count: number; // Số lượng bản ghi trong mảng results hiện tại (results.length)
  offset: number; // Offset đã yêu cầu
  limit: number; // Limit đã áp dụng
  query: string; // Từ khóa tìm kiếm gốc đã trim
  mode: 'all' | 'hanzi' | 'pinyin' | 'vi';
  source: 'database';
}
```

- **Quy tắc xếp hạng kết quả (A06 & A07):**
  1. **Hạng 1 (Exact Hanzi):** Khớp chính xác 100% với `traditional` hoặc `simplified`.
  2. **Hạng 2 (Exact Pinyin):** Khớp chính xác với chuỗi Pinyin chuẩn hóa (ví dụ: `xuesheng` khớp `xué sheng`).
  3. **Hạng 3 (Prefix Match):** Bắt đầu bằng từ khóa tìm kiếm.
  4. **Hạng 4 (Partial Match):** Xuất hiện trong giải nghĩa tiếng Việt hoặc cụm từ.

---

### 4.3 Endpoint: `POST /api/conversation`

Trợ lý gia sư hội thoại tiếng Hoa Đài Loan, kết nối mô hình ngôn ngữ lớn upstream với cơ chế phòng vệ chống rò rỉ khóa bảo mật và tự động kích hoạt gia sư thông minh cục bộ khi mất kết nối/quá hạn.

- **Phương thức:** `POST`
- **Headers yêu cầu:**
  - `Content-Type: application/json`
  - `Origin` / `Referer`: Được kiểm định bởi chính sách bảo mật A03.
- **Giới hạn Payload:** Tối đa `100 KB`.

- **DTO Yêu cầu (`ConversationRequestBody`):**
```typescript
export type ConversationAction = 'chat' | 'ping' | 'health';

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string; // Tối đa 2000 ký tự mỗi tin nhắn
}

export interface ConversationRequestBody {
  action?: ConversationAction; // Mặc định: 'chat'
  unitId?: number; // Mã bài học (1-16)
  threadId?: number; // Mã phiên đối thoại
  roleId?: string; // Tình huống nhập vai: 'factory' | 'tax' | 'tech' | 'scooter' | 'interview' | ...
  messages?: ConversationTurn[]; // Danh sách tối đa 20 tin nhắn gần nhất
  model?: string; // Ứng viên mô hình (ví dụ: 'gpt-6.1-sol', 'deepseek-v4-flash')
  baseUrl?: string; // URL endpoint tùy biến (ÁP DỤNG CHÍNH SÁCH BẢO MẬT A03)
  apiKey?: string; // Khóa cá nhân do người dùng nhập trên máy khách (tùy chọn)
  timeoutMs?: number; // Giới hạn thời gian mong muốn của client (server ép trần tối đa 15000ms)
}
```

#### Quy tắc bảo mật upstream & ranh giới ủy quyền khóa (Subagent A03):
1. **Cô lập khóa môi trường máy chủ (Server Key Isolation):**  
   Khóa API được cấu hình trong biến môi trường máy chủ (`AI_SOL_KEY`, `AI_DEEPSEEK_KEY`, `AI_API_KEY`) **CHỈ ĐƯỢC PHÉP GỬI** tới các endpoint thuộc danh sách tin cậy được cấu hình cứng trên server:
   - `https://agentrouter.org/v1`
   - `https://openrouter.ai/api/v1`
2. **Chặn tấn công chiếm dụng khóa qua baseUrl (Credential Hijacking Defense):**  
   Nếu request từ client chỉ định một `baseUrl` không thuộc danh sách tin cậy (ví dụ: `https://attacker.evil.com/v1`), máy chủ **TUYỆT ĐỐI KHÔNG** chèn khóa API của server vào request.  
   - Nếu client có cung cấp `apiKey` riêng trong payload, máy chủ chỉ dùng `apiKey` đó gửi tới `baseUrl`.
   - Nếu client không cung cấp `apiKey`, máy chủ lập tức từ chối với HTTP `400 Bad Request` (`UNAUTHORIZED_BASE_URL`) hoặc chuyển sang chế độ `guided` fallback cục bộ.
3. **Phân tích URL nghiêm ngặt:**  
   Dùng `new URL(baseUrl)` để kiểm tra protocol (`https:` bắt buộc trong production, cho phép `http:` trên `127.0.0.1` khi test), cấm userinfo (`user:pass@`), chặn bypass kiểm tra bằng hostname giả mạo hoặc redirect không an toàn.
4. **Kiểm soát Origin/CORS:**  
   Chỉ chấp nhận các yêu cầu đến từ cùng origin hoặc origin được cấu hình cho ứng dụng. Không cấu hình wildcard `Access-Control-Allow-Origin: *`.

#### Quy tắc thời gian chờ (Timeout) & Hủy yêu cầu (Cancellation) (Subagent A05):
1. **Server-side Deadline:**  
   Thời hạn chờ phản hồi từ upstream mặc định là **12.000 ms (12 giây)**. Trần tối đa không quá **15.000 ms**.
2. **Hủy yêu cầu chủ động (AbortController):**  
   Nếu client ngắt kết nối (đóng tab, chuyển bài học, hoặc bấm nút Hủy trên giao diện), `req.on('close')` kích hoạt `AbortController.abort()` trên server để lập tức hủy request đang gửi tới upstream, tránh lãng phí chi phí token và tài nguyên mạng.
3. **Phản ứng khi quá hạn hoặc lỗi upstream:**  
   Khi upstream trả về mã `401`, `403`, `429`, `5xx` hoặc không phản hồi sau 12 giây:
   - Máy chủ **KHÔNG ĐƯỢC TREO REQUEST**.
   - Máy chủ tự động kích hoạt `server/aiFallback.ts` và trả về phản hồi với `mode: 'guided'` kèm ngữ cảnh TOCFL Đài Loan chuẩn xác và nhãn chú thích rõ ràng.

#### Hợp đồng 4 trạng thái AI (AI States Contract):
| Trạng thái | Thuộc tính `mode` / `status` | Ý nghĩa & Quy tắc hiển thị trên giao diện |
|---|---|---|
| **AI Live** | `mode: 'ai'` | Phản hồi trực tiếp từ mô hình upstream qua mạng. Giao diện hiển thị nhãn nhà cung cấp/mô hình thật. |
| **Guided** | `mode: 'guided'` | Phản hồi thông minh từ động cơ Hán học cục bộ (`aiFallback.ts`), chứa đầy đủ Hán tự phồn thể, Pinyin, Tiếng Việt và mẹo phản xạ TOCFL. Giao diện hiển thị rõ nhãn **"Gia sư hướng dẫn cục bộ"** (không giả mạo là AI trực tuyến). |
| **Offline** | `status: 'offline'` | Mất kết nối mạng hoàn toàn hoặc máy chủ ngoại tuyến. Client kích hoạt trực tiếp `fallbackClientAi` mà không làm đứt đoạn bài học. |
| **Error** | `status: 'error'` | Lỗi định dạng nghiêm trọng hoặc tài khoản cạn hạn mức, giao diện hiển thị thông báo lỗi rõ ràng và nút "Thử lại". |

- **DTO Phản hồi Trò chuyện (`ConversationReply`):**
```typescript
export interface ConversationReply {
  mode: 'ai' | 'guided'; // Live AI hoặc Guided Local Fallback
  content: string; // Nội dung câu trả lời
  model?: string; // Tên model đã xử lý
  provider?: string; // Tên provider đã xử lý
  thread?: {
    id: number;
    messages: ConversationTurn[];
  };
  meta?: {
    latencyMs?: number; // Độ trễ tính bằng mili-giây
    fallbackReason?: 'timeout' | 'upstream_error' | 'no_key' | 'offline';
    guidanceNote?: string; // Ghi chú hiển thị cho học viên khi dùng guided fallback
  };
}
```

- **DTO Phản hồi Ping / Kiểm tra kết nối AI (`ConversationPingResponse`):**
```typescript
export interface ConversationPingResponse {
  ok: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
}
```

---

### 4.4 Endpoint: `POST /api/handwriting`

Nhận diện nét vẽ chữ Hán từ tọa độ người học vẽ trên Canvas, kết hợp nhận diện trực tuyến và dự phòng động cơ hình học nét vẽ ngoại tuyến.

- **Phương thức:** `POST`
- **Headers yêu cầu:** `Content-Type: application/json`
- **Giới hạn Payload:** Tối đa `256 KB`.

- **DTO Yêu cầu (`HandwritingRequestBody`):**
```typescript
// Một nét vẽ gồm 3 mảng số nguyên: [tọa độ X, tọa độ Y, mốc thời gian T]
export type HandwritingStroke = [number[], number[], number[]];

export interface HandwritingRequestBody {
  strokes: HandwritingStroke[]; // Mảng từ 1 đến 50 nét vẽ
  width?: number; // Chiều rộng khung vẽ (ví dụ: 300)
  height?: number; // Chiều cao khung vẽ (ví dụ: 300)
  language?: string; // Mặc định: 'zh-TW'
}
```

- **Quy tắc kiểm định (Subagent A04):**
  - `strokes` bắt buộc là mảng không rỗng, chứa tối đa 50 nét vẽ.
  - Mỗi nét vẽ chứa mảng tọa độ X, Y có độ dài bằng nhau, tối đa 1000 điểm mỗi nét.
  - Tọa độ phải là số hữu hạn (`Number.isFinite`), nằm trong khoảng hợp lý (`-500` đến `2000`).

- **DTO Phản hồi (`HandwritingResponse`):**
```typescript
export interface HandwritingResponse {
  candidates: string[]; // Mảng tối đa 8 chữ Hán dự đoán, xếp theo độ tin cậy từ cao xuống thấp
  source: 'google' | 'local_fallback'; // Nguồn nhận diện thực tế
}
```

- **Mã HTTP:**
  - `200 OK`: Nhận diện thành công và trả về danh sách ứng viên chữ Hán.
  - `400 Bad Request`: Định dạng nét vẽ sai hoặc mảng nét vẽ rỗng.
  - `413 Payload Too Large`: Dữ liệu nét vẽ vượt quá 256KB.
  - `502 / 504`: Lỗi upstream nhận diện (khi đó client tự động gọi `fallbackClientHandwriting` cục bộ).

---

## 5. Danh mục Script và Cổng Kiểm định (Verification Gates)

A01 đã cấu hình hệ thống script trong `package.json` và cấu hình Vitest / Playwright để hỗ trợ kiểm thử tự động toàn diện:

```json
{
  "scripts": {
    "dev": "vite --configLoader runner --host 127.0.0.1",
    "build": "tsc -b && vite build --configLoader runner",
    "start": "vite-node server/index.ts",
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run --configLoader runner",
    "test:coverage": "vitest run --configLoader runner --coverage",
    "test:security": "vitest run --configLoader runner --passWithNoTests tests/security-policy.test.ts tests/integration/api-security.test.ts",
    "test:integration": "vitest run --configLoader runner --passWithNoTests tests/integration/**/*.test.ts",
    "test:e2e": "playwright test",
    "test:e2e:prod": "playwright test --config=playwright.prod.config.ts"
  }
}
```

### Tiêu chuẩn Test Coverage (Cổng số 5):
Vitest coverage trong `vite.config.ts` được mở rộng phạm vi đo lường cho:
- `src/domain/**` (SM-2, learning, searchNormalization)
- `src/services/**` (api client, speech)
- `server/**` (app, routes, security, validation, errors, ai, dictionary)

Ngưỡng nghiệm thu tối thiểu cho domain và logic backend: **>= 80%** lines/statements/functions/branches.

---

## 6. Hướng dẫn bàn giao cho các Subagent (Handoff Instructions)

### Handoff cho A02 (Production Server & Router):
- Tạo `server/index.ts` làm entry point standalone trên Node.js.
- Tạo `server/app.ts` xuất hàm xử lý request `handleApiRequest(req, res)` có thể gắn vào Node HTTP server và Vite plugin.
- Phục vụ tệp tĩnh `dist/` cùng origin trên cổng 3000 khi chạy production.
- Mount `/api/*` trước SPA fallback; các route `/api/*` không tồn tại phải trả về JSON 404 (`NOT_FOUND`), tuyệt đối không rơi vào SPA HTML.

### Handoff cho A03 (Upstream Security Boundary):
- Tạo `server/security.ts` và bộ test `tests/security-policy.test.ts`.
- Triển khai hàm kiểm tra URL `validateUpstreamUrl(url: string)` và hàm xác định khóa an toàn `resolveSafeApiKey(model, requestedBaseUrl, clientApiKey)`.
- Đảm bảo các bài test dùng sentinel key chứng minh khóa môi trường máy chủ không bao giờ bị lộ tới URL không tin cậy.

### Handoff cho A04 (Data Validation & HTTP Errors):
- Tạo `server/validation.ts` và `server/errors.ts`, bộ test `tests/api-validation.test.ts`.
- Xuất các helper: `sendJson(res, statusCode, data)` và `sendError(res, statusCode, code, message)`.
- Kiểm định nghiêm ngặt toàn bộ payload trước khi chuyển tới A05 hoặc A06.

### Handoff cho A05 (AI Connector & Guided Fallback):
- Tạo `server/ai.ts` và `server/aiFallback.ts`, bộ test `tests/ai-provider.test.ts`.
- Thiết lập deadline 12 giây qua `AbortSignal.timeout(12000)`.
- Nếu upstream chậm hoặc lỗi, tự động sinh phản hồi `mode: 'guided'` kèm đầy đủ Hán tự, Pinyin, Tiếng Việt và gợi ý phản xạ thực hành.

### Handoff cho A06 (Dictionary Engine):
- Tạo `server/dictionary.ts`, bộ test `tests/dictionary-engine.test.ts`.
- Nhận diện đúng số lượng bản ghi thực tế (122.596 bản ghi) từ `data/dictionary/`.
- Tích hợp hàm chuẩn hóa từ A07 (`src/domain/searchNormalization.ts`).
- Trả về `total` trung thực theo toàn bộ kho dữ liệu, không cắt ngắn.

### Handoff cho A07 (Vietnamese & Pinyin Search Normalization):
- Tạo `src/domain/searchNormalization.ts`, bộ test `tests/search-normalization.test.ts`.
- Đảm bảo các biến thể: `學生`, `xuesheng`, `xuéshēng`, `xue2 sheng1`, `học sinh`, `hoc sinh` đều chuẩn hóa về cùng định dạng đối sánh.
- Module phải là pure TypeScript, không phụ thuộc DOM hoặc thư viện ngoài.

### Handoff cho A08 (API Client Adapter):
- Cập nhật `src/services/api.ts` loại bỏ hardcode `http://127.0.0.1:3001` trong production.
- Kiểm tra status và `Content-Type: application/json` trước khi phân tích cú pháp. Không coi HTML 200 là backend sẵn sàng.
- Hỗ trợ timeout, hủy request qua `AbortController`, và kết nối với các DTO chuẩn từ `src/types.ts`.
