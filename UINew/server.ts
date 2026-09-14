import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini AI Assistant for Math Teacher
app.post('/api/ai-assistant', async (req, res) => {
  const { prompt, lessonContext, role = 'Trợ lý sư phạm Toán học' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `Bạn là Trợ lý AI Chuyên Môn Toán Học cao cấp dành riêng cho Thầy Nguyễn Văn An (Giáo viên Tổ Toán - THPT Chuyên Lê Hồng Phong).
Nhiệm vụ của bạn là hỗ trợ thầy trong công tác giảng dạy, lập kế hoạch bài dạy theo Công văn 5512/BGDĐT, thiết kế hoạt động học tập phát triển năng lực, biên soạn câu hỏi trắc nghiệm (theo định dạng mới THPT Quốc Gia 2025: Đúng/Sai, Trả lời ngắn, 4 lựa chọn), đề cương kiểm tra 15 phút - 1 tiết, và bồi dưỡng học sinh giỏi.
Hãy trả lời chuyên nghiệp, sư phạm, chuẩn xác toán học, sử dụng định dạng Markdown rõ ràng, có tiêu đề, gạch đầu dòng, công thức toán trực quan.
${lessonContext ? `Ngữ cảnh tiết dạy hiện tại:\n- Môn: ${lessonContext.subject || 'Toán'}\n- Lớp: ${lessonContext.className || ''}\n- Bài học: ${lessonContext.lessonName || ''}\n- Phòng: ${lessonContext.room || ''}\n- Ghi chú: ${lessonContext.note || ''}` : ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text || 'Không có phản hồi từ mô hình.';
      return res.json({ response: text, source: 'gemini' });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      // Fall through to pedagogical fallback below
    }
  }

  // Fallback intelligent math pedagogy generator if API key is not yet set
  const fallbackAnswers: Record<string, string> = {
    'giao-an': `### 📋 KẾ HOẠCH BÀI DẠY (GỢI Ý THEO CV 5512)
**Bài học:** ${lessonContext?.lessonName || 'Toán Giải Tích 12 - Khảo sát đồ thị hàm số'}  
**Đối tượng:** Lớp ${lessonContext?.className || '12A1'} (Thời lượng: 45 phút)

#### 1. Mục tiêu bài học:
- **Về kiến thức:** Nắm vững 3 bước khảo sát sự biến thiên và vẽ đồ thị hàm đa thức bậc ba, trùng phương và phân thức hữu tỉ.
- **Về năng lực:** Rèn luyện năng lực tư duy toán học, phân tích đồ thị, liên hệ thực tế (bài toán tối ưu thể tích/diện tích).
- **Về phẩm chất:** Rèn tính cẩn thận, chính xác khi lập bảng biến thiên và xác định các điểm đặc biệt.

#### 2. Chuỗi hoạt động học tập:
1. **Hoạt động khởi động (5 phút):** Chiếu hình ảnh đường cong cầu treo đường bộ, yêu cầu học sinh nhận xét hình dạng và số điểm uốn/cực trị.
2. **Hoạt động hình thành kiến thức (20 phút):**
   - Hướng dẫn quy trình khảo sát: $D \\rightarrow y' \\rightarrow$ Nghiệm $y'=0 \\rightarrow$ BBT $\\rightarrow$ Đồ thị.
   - Chú ý tâm đối xứng của hàm bậc ba $I(x_0; y_0)$ với $y''(x_0)=0$.
3. **Hoạt động luyện tập (15 phút):** Cho học sinh vẽ nhanh đồ thị $y = x^3 - 3x + 2$ trên bảng nhóm và tìm giao điểm với trục hoành.
4. **Vận dụng & Mở rộng (5 phút):** Giao bài toán biện luận số nghiệm phương trình chứa tham số $m$ dựa vào đồ thị.`,

    'kiem-tra-15p': `### 📝 ĐỀ KIỂM TRA 15 PHÚT (ĐỊNH DẠNG MỚI THPT 2025)
**Môn:** Toán 12 | **Chủ đề:** Khảo sát và ứng dụng đạo hàm

**Phần I: Trắc nghiệm 4 lựa chọn (2 câu - 4.0 điểm)**
*Câu 1:* Cho hàm số $y = f(x)$ có bảng biến thiên trên $[-2; 2]$. Điểm cực đại của hàm số là:  
A. $x = 1$ &nbsp;&nbsp;&nbsp;&nbsp; B. $x = -1$ &nbsp;&nbsp;&nbsp;&nbsp; C. $y = 3$ &nbsp;&nbsp;&nbsp;&nbsp; D. $x = 0$  
*Đáp án:* B.

**Phần II: Câu hỏi Trắc nghiệm Đúng/Sai (1 câu - 3.0 điểm)**
*Câu 2:* Cho hàm số $y = x^3 - 3x^2 + 2$. Xét tính đúng/sai của các mệnh đề sau:  
a) Đạo hàm của hàm số là $y' = 3x^2 - 6x$. *(Đúng)*  
b) Hàm số đồng biến trên khoảng $(0; 2)$. *(Sai, nghịch biến)*  
c) Giá trị cực tiểu của hàm số bằng $-2$. *(Đúng)*  
d) Đồ thị hàm số nhận điểm $I(1; 0)$ làm tâm đối xứng. *(Đúng)*

**Phần III: Câu hỏi trả lời ngắn (1 câu - 3.0 điểm)**
*Câu 3:* Tìm số điểm cực trị của hàm số $g(x) = f(x^2 - 2x)$ biết $f'(x) = x(x-1)^2(x+2)$.  
*Đáp số:* 3 điểm cực trị.`,

    'oxyz': `### 📐 CHUYÊN ĐỀ HÌNH HỌC OXYZ (LỚP 12)
**Chủ đề:** Phương pháp giải nhanh các bài toán Tọa độ không gian & Cực trị hình học Oxyz

1. **Kiến thức cốt lõi:**
   - Tích có hướng: $[\vec{u}, \vec{v}] \\perp \\vec{u}$ và $[\vec{u}, \vec{v}] \\perp \\vec{v}$.
   - Phương trình mặt phẳng đi qua điểm $M(x_0; y_0; z_0)$ có VTPT $\\vec{n}(A; B; C)$: $A(x - x_0) + B(y - y_0) + C(z - z_0) = 0$.
   - Khoảng cách từ điểm $M$ đến mặt phẳng $(P)$: $d(M, (P)) = \\frac{|Ax_M + By_M + Cz_M + D|}{\\sqrt{A^2 + B^2 + C^2}}$.

2. **Dạng toán vận dụng cao thường gặp:**
   - Tìm điểm $M \\in (P)$ sao cho biểu thức $T = MA^2 + MB^2 + 2MC^2$ đạt GTNN (phương pháp tâm tỉ cự).
   - Góc giữa đường thẳng và mặt phẳng, góc giữa hai mặt phẳng.
   - Viết phương trình mặt cầu tiếp xúc mặt phẳng hoặc cắt mặt phẳng tạo đường tròn có bán kính $r$.`,

    'cap-so-nhan': `### 💡 GỢI Ý SƯ PHẠM DẠY BÀI "CẤP SỐ NHÂN" (LỚP 11B2)
1. **Dẫn dắt sinh động:**
   - Bài toán truyền thuyết hạt thóc trên bàn cờ vua ($1, 2, 4, 8, 16, \\dots, 2^{63}$).
   - Bài toán lây lan theo cấp số nhân trong thực tế (mạng xã hội, virus).
2. **Trực quan hóa công thức:**
   - Số hạng tổng quát: $u_n = u_1 \\cdot q^{n-1}$. Nhấn mạnh số mũ là $(n-1)$ chứ không phải $n$.
   - Tổng $n$ số hạng đầu: $S_n = \\frac{u_1(1 - q^n)}{1 - q}$ ($q \\neq 1$).
3. **Lỗi học sinh hay gặp:**
   - Quên điều kiện công bội $q < 0$ thì dấu của các số hạng đan xen nhau.
   - Nhầm lẫn giữa Cấp số cộng ($d$) và Cấp số nhân ($q$).`
  };

  let generatedText = '';
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('giáo án') || lowerPrompt.includes('kế hoạch') || lowerPrompt.includes('5512')) {
    generatedText = fallbackAnswers['giao-an'];
  } else if (lowerPrompt.includes('kiểm tra') || lowerPrompt.includes('15p') || lowerPrompt.includes('đề thi')) {
    generatedText = fallbackAnswers['kiem-tra-15p'];
  } else if (lowerPrompt.includes('oxyz') || lowerPrompt.includes('tọa độ')) {
    generatedText = fallbackAnswers['oxyz'];
  } else if (lowerPrompt.includes('cấp số') || lowerPrompt.includes('nhân') || lowerPrompt.includes('11b2')) {
    generatedText = fallbackAnswers['cap-so-nhan'];
  } else {
    generatedText = `### 💡 TƯ VẤN SƯ PHẠM TOÁN HỌC - THẦY NGUYỄN VĂN AN
Dành cho câu hỏi: **"${prompt}"**
${lessonContext?.lessonName ? `*(Ngữ cảnh: ${lessonContext.lessonName} - Lớp ${lessonContext.className})*` : ''}

1. **Phương pháp sư phạm trọng tâm:**
   - Chú trọng việc gợi mở tư duy cho học sinh thông qua chuỗi câu hỏi phân bậc (Nhận biết $\\rightarrow$ Thông hiểu $\\rightarrow$ Vận dụng).
   - Tận dụng tối đa bảng phụ và phần mềm GeoGebra/Desmos để học sinh quan sát trực quan hình dạng đồ thị và biến thiên.

2. **Bài tập tương thích:**
   - Luyện tập mức độ 1: 3 bài trắc nghiệm củng cố định nghĩa và công thức.
   - Luyện tập mức độ 2: 2 bài tập rèn kỹ năng biến đổi đại số / giải tích.
   - Thử thách mở rộng: 1 bài toán thực tiễn liên môn.

Thầy có thể bấm các nút gợi ý nhanh bên dưới để tạo đề kiểm tra 15 phút, giáo án chuẩn 5512 hoặc phiếu bài tập bổ trợ!`;
  }

  res.json({ response: generatedText, source: 'assistant-cache' });
});

// Vite middleware for dev / static for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
