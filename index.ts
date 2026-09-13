// supabase/functions/gemini/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-3.8-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Header CORS: mengizinkan browser memanggil function ini dari domain manapun.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Skema JSON yang WAJIB diikuti Gemini. Dengan ini, hasilnya dijamin
// JSON valid -> tidak perlu lagi regex untuk "mencari" JSON di teks.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    content: { type: "STRING" },
    category: {
      type: "STRING",
      enum: ["Pekerjaan", "Pribadi", "Belajar", "Proyek", "Lainnya"]
    },
    color: { type: "STRING" },
    is_important: { type: "BOOLEAN" }
  },
  required: ["title", "content", "category", "color", "is_important"],
  propertyOrdering: ["title", "content", "category", "color", "is_important"]
}

// Ambil gambar dari URL dan ubah jadi base64, supaya bisa dikirim
// langsung ke Gemini sebagai "inlineData" (Gemini beneran bisa membacanya).
async function fetchImageAsBase64(imageUrl: string) {
  const res = await fetch(imageUrl)
  if (!res.ok) {
    throw new Error(`Gagal mengambil gambar: ${res.status}`)
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return { mimeType: contentType, data: btoa(binary) }
}

// Panggil Gemini dengan retry otomatis kalau server sibuk (503)
// atau kena rate limit (429), dengan jeda yang makin lama tiap percobaan.
async function callGeminiWithRetry(body: unknown, maxRetries = 3) {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY ?? ''
      },
      body: JSON.stringify(body)
    })

    if (response.ok) {
      return response.json()
    }

    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const errorText = await response.text()
      lastError = new Error(`Gemini API error: ${response.status} - ${errorText}`)
      const delayMs = 500 * Math.pow(2, attempt) // 500ms, 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      continue
    }

    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  throw lastError ?? new Error('Gemini API gagal setelah beberapa percobaan')
}

serve(async (req) => {
  // Browser selalu mengirim request "OPTIONS" dulu sebagai pengecekan izin CORS
  // sebelum request POST yang asli. Kalau ini tidak dijawab, request asli diblokir browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY belum di-set di environment variable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { content, imageUrl } = await req.json()

    if (!content && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Content atau imageUrl wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `
Anda adalah asisten AI yang membantu merapikan catatan.

TUGAS:
Rapikan catatan berikut tanpa mengubah makna atau informasi asli.

CATATAN YANG HARUS DIRAPIKAN:
---
${content || '(tidak ada teks, lihat gambar yang dilampirkan)'}
---

INSTRUKSI:
1. Buat judul yang sesuai dari isi catatan
2. Susun paragraf menjadi lebih rapi dan terstruktur
3. Jika ada daftar, ubah menjadi bullet point (ul)
4. Jika ada tugas/action items, ubah menjadi checklist
5. Kelompokkan informasi yang saling berkaitan
6. Temukan tanggal atau deadline jika ada
7. Tentukan kategori yang sesuai (Pekerjaan/Pribadi/Belajar/Proyek/Lainnya)
8. Berikan rekomendasi warna (hex) yang cocok

ATURAN PENTING:
- JANGAN mengarang informasi baru
- JANGAN menghapus informasi penting
- JANGAN mengubah angka, tanggal, atau nama
- JANGAN mengubah maksud pengguna
- Jika informasi tidak tersedia, jangan dibuat-buat
${imageUrl ? '- Ada gambar yang dilampirkan di bawah ini. Baca semua teks di dalamnya (OCR) dan gabungkan isinya ke dalam catatan.' : ''}
`.trim()

    const parts: Record<string, unknown>[] = [{ text: prompt }]

    if (imageUrl) {
      const image = await fetchImageAsBase64(imageUrl)
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      })
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: 'low'
        }
      }
    }

    const data = await callGeminiWithRetry(requestBody)

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Tidak ada respons dari Gemini')
    }

    const resultText = data.candidates[0].content.parts[0].text

    // Sudah pakai responseSchema -> resultText dijamin JSON valid,
    // tidak perlu regex lagi untuk mencari "{...}" di tengah teks.
    const parsed = JSON.parse(resultText)

    const result = {
      title: parsed.title || 'Catatan',
      content: parsed.content || content || '',
      category: parsed.category || 'Lainnya',
      color: parsed.color || '#ffffff',
      is_important: parsed.is_important ?? false
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})