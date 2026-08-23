// supabase/functions/gemini/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

serve(async (req) => {
  try {
    const { content, imageUrl } = await req.json()
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build prompt untuk Gemini
    let prompt = `
Anda adalah asisten AI yang membantu merapikan catatan.

TUGAS:
Rapikan catatan berikut tanpa mengubah makna atau informasi asli.

CATATAN YANG HARUS DIRAPIKAN:
---
${content}
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

${imageUrl ? `\nCATATAN TAMBAHAN: Ada gambar yang dilampirkan. Jika gambar berisi teks, integrasikan informasinya ke dalam catatan.` : ''}

HASIL AKHIR harus dalam format JSON:
{
  "title": "judul yang sesuai",
  "content": "isi catatan yang sudah dirapikan dalam format HTML",
  "category": "kategori yang sesuai",
  "color": "rekomendasi warna hex (contoh: #f28b82)",
  "is_important": true/false
}

Keluarkan HANYA JSON, tanpa teks lain.
`

    // Panggil Gemini API
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini')
    }
    
    const resultText = data.candidates[0].content.parts[0].text
    
    // Parse JSON dari response
    let parsed;
    try {
      // Coba ekstrak JSON dari teks (mungkin ada markdown)
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = JSON.parse(resultText)
      }
    } catch (e) {
      console.error('Failed to parse Gemini response:', resultText)
      throw new Error('Invalid JSON response from Gemini')
    }
    
    // Validasi dan set default
    const result = {
      title: parsed.title || 'Catatan',
      content: parsed.content || content,
      category: parsed.category || 'Umum',
      color: parsed.color || '#ffffff',
      is_important: parsed.is_important || false
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})